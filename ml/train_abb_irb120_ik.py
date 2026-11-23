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


def forward_kinematics_torch(q_rad: torch.Tensor):
    batch_size = q_rad.shape[0]
    device, dtype = q_rad.device, q_rad.dtype
    T = torch.eye(4, dtype=dtype, device=device).unsqueeze(0).repeat(batch_size, 1, 1)
    for idx, (a, alpha_deg, d, offset_deg, _, _) in enumerate(ABB_IRB120_DH):
        alpha = torch.tensor(math.radians(alpha_deg), dtype=dtype, device=device)
        offset = torch.tensor(math.radians(offset_deg), dtype=dtype, device=device)
        theta = q_rad[:, idx] + offset
        ca, sa = torch.cos(alpha), torch.sin(alpha)
        ct, st = torch.cos(theta), torch.sin(theta)
        a_t = torch.tensor(a, dtype=dtype, device=device)
        d_t = torch.tensor(d, dtype=dtype, device=device)
        z, o = torch.zeros_like(ct), torch.ones_like(ct)
        step_T = torch.stack([
            torch.stack([ct, -st * ca,  st * sa, a_t * ct], dim=-1),
            torch.stack([st,  ct * ca, -ct * sa, a_t * st], dim=-1),
            torch.stack([z, sa.expand_as(ct), ca.expand_as(ct), d_t.expand_as(ct)], dim=-1),
            torch.stack([z, z, z, o], dim=-1),
        ], dim=1)
        T = torch.bmm(T, step_T)
    return T[:, :3, 3], T[:, :3, :3]


class NeuralIKNet(nn.Module):
    def __init__(self, in_dim: int = 9, hidden_dim: int = 192, out_dim: int = 12):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, hidden_dim), nn.SiLU(),
            nn.Linear(hidden_dim, hidden_dim), nn.SiLU(),
            nn.Linear(hidden_dim, hidden_dim), nn.SiLU(),
            nn.Linear(hidden_dim, out_dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


def train_model(epochs: int = 20, batch_size: int = 256, lr: float = 1.2e-3, num_samples: int = 40000, out_json: str = "ml/abb_irb120_ik_weights.json"):
    np.random.seed(42)
    torch.manual_seed(42)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    mins_rad = np.array([math.radians(j[4]) for j in ABB_IRB120_DH], dtype=np.float32)
    maxs_rad = np.array([math.radians(j[5]) for j in ABB_IRB120_DH], dtype=np.float32)
    q_rad = torch.from_numpy(mins_rad + np.random.rand(num_samples, 6).astype(np.float32) * (maxs_rad - mins_rad)).to(device)

    with torch.no_grad():
        pos, rot = forward_kinematics_torch(q_rad)
        X = torch.cat([pos, rot[:, :, 0], rot[:, :, 2]], dim=-1)
        Y_sc = torch.cat([torch.sin(q_rad), torch.cos(q_rad)], dim=-1)

    split = int(0.9 * num_samples)
    X_train, X_val = X[:split], X[split:]
    Y_train = Y_sc[:split]
    Q_train = q_rad[:split]

    x_mean = X_train.mean(dim=0, keepdim=True)
    x_std = X_train.std(dim=0, keepdim=True).clamp_min(1e-6)
    loader = DataLoader(TensorDataset((X_train - x_mean) / x_std, Y_train, Q_train), batch_size=batch_size, shuffle=True)

    model = NeuralIKNet().to(device)
    opt = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=epochs)
    mse = nn.MSELoss()

    for epoch in range(1, epochs + 1):
        model.train()
        for bx, by_sc, bq_true in loader:
            opt.zero_grad()
            pred_sc = model(bx)
            pred_q = torch.atan2(pred_sc[:, :6], pred_sc[:, 6:])
            pred_pos, _ = forward_kinematics_torch(pred_q)
            true_pos = bx[:, :3] * x_std[:, :3] + x_mean[:, :3]
            loss = mse(pred_sc, by_sc) + 0.5 * mse(pred_q, bq_true) + 0.25 * mse(pred_pos * 100.0, true_pos * 100.0)
            loss.backward()
            opt.step()
        sched.step()

    sd = model.state_dict()
    exported = {
        "model": "ABB_IRB120_NeuralIK_MLP",
        "activation": "silu",
        "input_mean": x_mean.squeeze(0).cpu().numpy().tolist(),
        "input_std": x_std.squeeze(0).cpu().numpy().tolist(),
        "joint_limits_deg": [[j[4], j[5]] for j in ABB_IRB120_DH],
        "layers": [{"weight": sd[f"net.{i}.weight"].cpu().numpy().tolist(), "bias": sd[f"net.{i}.bias"].cpu().numpy().tolist()} for i in (0, 2, 4, 6)],
    }
    Path(out_json).write_text(json.dumps(exported), encoding="utf-8")
    print(f"Saved {out_json}")


if __name__ == "__main__":
    train_model()
