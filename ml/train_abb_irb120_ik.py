import json
import math
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

ABB_IRB120_DH = [
    (0.000, -90.0, 0.290,   0.0, -165.0, 165.0),
    (0.270,   0.0, 0.000, -90.0, -110.0, 110.0),
    (0.070, -90.0, 0.000,   0.0, -110.0,  70.0),
    (0.000,  90.0, 0.302,   0.0, -160.0, 160.0),
    (0.000, -90.0, 0.000,   0.0, -120.0, 120.0),
    (0.000,   0.0, 0.072,   0.0, -180.0, 180.0),
]


def set_seed(seed: int = 42) -> None:
    np.random.seed(seed)
    torch.manual_seed(seed)


def forward_kinematics_torch(q_rad: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
    batch_size = q_rad.shape[0]
    device = q_rad.device
    dtype = q_rad.dtype

    T = torch.eye(4, dtype=dtype, device=device).unsqueeze(0).repeat(batch_size, 1, 1)

    for idx, (a, alpha_deg, d, offset_deg, _, _) in enumerate(ABB_IRB120_DH):
        alpha = torch.tensor(math.radians(alpha_deg), dtype=dtype, device=device)
        offset = torch.tensor(math.radians(offset_deg), dtype=dtype, device=device)
        theta = q_rad[:, idx] + offset

        ca, sa = torch.cos(alpha), torch.sin(alpha)
        ct, st = torch.cos(theta), torch.sin(theta)
        a_t = torch.tensor(a, dtype=dtype, device=device)
        d_t = torch.tensor(d, dtype=dtype, device=device)

        zeros = torch.zeros_like(ct)
        ones = torch.ones_like(ct)

        row0 = torch.stack([ct, -st * ca,  st * sa, a_t * ct], dim=-1)
        row1 = torch.stack([st,  ct * ca, -ct * sa, a_t * st], dim=-1)
        row2 = torch.stack([zeros, sa.expand_as(ct), ca.expand_as(ct), d_t.expand_as(ct)], dim=-1)
        row3 = torch.stack([zeros, zeros, zeros, ones], dim=-1)

        step_T = torch.stack([row0, row1, row2, row3], dim=1)
        T = torch.bmm(T, step_T)

    return T[:, :3, 3], T[:, :3, :3]


def generate_dataset(num_samples: int = 40000, device: torch.device = torch.device("cpu")):
    mins_rad = np.array([math.radians(j[4]) for j in ABB_IRB120_DH], dtype=np.float32)
    maxs_rad = np.array([math.radians(j[5]) for j in ABB_IRB120_DH], dtype=np.float32)

    u = np.random.rand(num_samples, 6).astype(np.float32)
    q_rad_np = mins_rad + u * (maxs_rad - mins_rad)
    q_rad = torch.from_numpy(q_rad_np).to(device)

    with torch.no_grad():
        pos, rot = forward_kinematics_torch(q_rad)
        features = torch.cat([pos, rot[:, :, 0], rot[:, :, 2]], dim=-1)
        targets_sincos = torch.cat([torch.sin(q_rad), torch.cos(q_rad)], dim=-1)

    return features, targets_sincos, q_rad


class NeuralIKNet(nn.Module):
    def __init__(self, in_dim: int = 9, hidden_dim: int = 192, out_dim: int = 12):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, hidden_dim),
            nn.SiLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.SiLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.SiLU(),
            nn.Linear(hidden_dim, out_dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


def sincos_to_q_rad(sincos: torch.Tensor) -> torch.Tensor:
    return torch.atan2(sincos[:, :6], sincos[:, 6:])


def train_model(
    epochs: int = 20,
    batch_size: int = 256,
    lr: float = 1.2e-3,
    num_samples: int = 40000,
    out_json: str = "ml/abb_irb120_ik_weights.json",
):
    set_seed(42)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    X, Y_sc, Q_true = generate_dataset(num_samples=num_samples, device=device)
    split = int(0.9 * num_samples)
    X_train, X_val = X[:split], X[split:]
    Y_train, Y_val = Y_sc[:split], Y_sc[split:]
    Q_train, Q_val = Q_true[:split], Q_true[split:]

    x_mean = X_train.mean(dim=0, keepdim=True)
    x_std = X_train.std(dim=0, keepdim=True).clamp_min(1e-6)

    X_train_norm = (X_train - x_mean) / x_std
    X_val_norm = (X_val - x_mean) / x_std

    loader = DataLoader(TensorDataset(X_train_norm, Y_train, Q_train), batch_size=batch_size, shuffle=True)
    model = NeuralIKNet(in_dim=9, hidden_dim=192, out_dim=12).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    mse = nn.MSELoss()

    for epoch in range(1, epochs + 1):
        model.train()
        total_loss = 0.0
        for bx, by_sc, bq_true in loader:
            optimizer.zero_grad()
            pred_sc = model(bx)
            pred_q = sincos_to_q_rad(pred_sc)
            pred_pos, _ = forward_kinematics_torch(pred_q)
            true_pos = bx[:, :3] * x_std[:, :3] + x_mean[:, :3]

            loss = mse(pred_sc, by_sc) + 0.5 * mse(pred_q, bq_true) + 0.25 * mse(pred_pos * 100.0, true_pos * 100.0)
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * bx.size(0)

        scheduler.step()
        if epoch % 5 == 0 or epoch == 1 or epoch == epochs:
            model.eval()
            with torch.no_grad():
                val_q = sincos_to_q_rad(model(X_val_norm))
                val_pos, _ = forward_kinematics_torch(val_q)
                err_mm = (torch.linalg.norm(val_pos - X_val[:, :3], dim=-1) * 1000.0).mean().item()
                print(f"Epoch {epoch:02d}/{epochs:02d} | Loss: {total_loss / len(X_train):.5f} | Val Tip Error: {err_mm:.2f} mm")

    out_path = Path(out_json)
    state_dict = model.state_dict()
    exported = {
        "model": "ABB_IRB120_NeuralIK_MLP",
        "activation": "silu",
        "input_mean": x_mean.squeeze(0).cpu().numpy().tolist(),
        "input_std": x_std.squeeze(0).cpu().numpy().tolist(),
        "joint_limits_deg": [[j[4], j[5]] for j in ABB_IRB120_DH],
        "layers": [
            {
                "weight": state_dict[f"net.{idx}.weight"].cpu().numpy().tolist(),
                "bias": state_dict[f"net.{idx}.bias"].cpu().numpy().tolist(),
            }
            for idx in (0, 2, 4, 6)
        ],
    }

    with out_path.open("w", encoding="utf-8") as f:
        json.dump(exported, f)
    print(f"Saved weights to {out_path.resolve()}")


if __name__ == "__main__":
    train_model()
