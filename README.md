# Robotics Workbench

An interactive **3D robotics simulation workbench** built with **Three.js** (ES modules), analytical rigid-body kinematics and **RK4** Lagrangian dynamics, Denavit–Hartenberg (**DH**) industrial manipulator models, a **PyTorch Neural IK** training and browser inference pipeline for the **ABB IRB 120**, a built-in beginner curriculum with one-click 3D demos, and automated **GitHub Actions** script execution.

---

## Key Features

### 1. 3D Mechanical Viewport (`js/workbench3d.js`)
- Interactive **Three.js** scene with orbit, pan, zoom, soft shadows, and coordinate axis triads (`X` red, `Y` green, `Z` blue).
- Multi-part mechanical link assemblies featuring base pedestals, joint drums oriented along joint axes, structural link beams with reinforcement rails, target beacons, and a tool flange/gripper assembly on DH chains.
- Click/tap on the 3D workspace floor to set planar `(x, y)` targets when in manual trajectory mode.

### 2. Kinematics, Dynamics & Control (`js/math.js`, `js/dynamics.js`, `js/controllers.js`, `js/trajectory.js`)
- **2-DOF Planar Arm:**
  - Forward kinematics, analytical 2-link inverse kinematics with **Elbow-Up / Elbow-Down** branch selection, and optional **3D obstacle** target deflection.
  - Analytical **Jacobian $J(q)$**, **manipulability ellipsoid**, manipulability index $w$, and condition number $\kappa(J)$.
  - Nonlinear equations of motion integrated via a 4th-order **Runge–Kutta (RK4)** solver:
    $$M(q)\ddot{q} + C(q,\dot{q})\dot{q} + G(q) + B\dot{q} = \tau$$
  - Real-time energy telemetry plot tracking kinetic energy ($K$), potential energy ($P$), and total energy ($E$).
  - Controllers: **Zero-Torque Free Fall**, **Pure PD Control**, **PD + Gravity Compensation**, and **Computed-Torque (Inverse Dynamics)**.
  - Trajectory modes: **Manual**, **Circular Path**, and **Figure-8 (Lissajous)**.
- **Spatial Frames & Transforms:**
  - **ZYX Euler angles**, **unit quaternions**, **axis-angle** representations, $4\times 4$ homogeneous transforms $T \in SE(3)$, and a **Gimbal Lock ($\theta = 90^\circ$)** demonstration.

### 3. Industrial & Spatial DH Manipulators (`js/robots.js`)
- **3-DOF Spatial Arm (Yaw–Pitch–Pitch)**
- **ABB IRB 120** (6-axis industrial arm with integrated **Neural IK** pose-to-joint prediction)
- **KUKA KR 6 R700** (6-axis Agilus preset)
- **Universal Robots UR5e** (6-axis collaborative arm preset)
- **Industrial SCARA (4-DOF RRPR)** (rotary joints, prismatic Z quill, and tool yaw)
- **Single SE(3) Coordinate Frame**

### 4. PyTorch Neural IK Pipeline (`ml/train_abb_irb120_ik.py`, `js/neural_ik.js`, `ml/abb_irb120_ik_weights.json`)
- Generates joint configurations within ABB IRB 120 limits and computes forward kinematics using a PyTorch DH chain.
- Predicts $(\sin q_i, \cos q_i)$ joint angle encodings via an MLP trained with angle, sine/cosine, and forward-kinematics 3D position losses, then exports weights and normalization statistics to `ml/abb_irb120_ik_weights.json`.
- Runs lightweight matrix-vector inference (`SiLU` activations) directly in the browser via `js/neural_ik.js` with live millimeter tip-error feedback.

### 5. Beginner Guide, Demos & Automation (`index.html`, `.github/workflows/run-update-script.yml`, `scripts/update.sh`)
- **Beginner Guide & Demos Tab:** Includes 8 one-click 3D workbench demos and foundational reference cards covering $SO(3)$, $SE(3)$ / gimbal lock, FK/IK/DH chains, and Jacobians / RK4 / Neural IK.
- **GitHub Actions Auto-Update Workflow:** Executes `scripts/update.sh` (or a specified script via `workflow_dispatch`) and commits/pushes changes back to `main`.

---

## Repository Structure

```text
robotics-workbench/
├── .github/workflows/
│   └── run-update-script.yml      # CI workflow to run update scripts & auto-commit
├── css/
│   └── styles.css                 # Dark workbench styling & responsive layout
├── js/
│   ├── controllers.js             # Free, PD, PD+G, and Computed-Torque control laws
│   ├── dynamics.js                # 2-DOF FK/IK, Jacobian, manipulability & RK4 solver
│   ├── main.js                    # Application state, UI bindings & animation loop
│   ├── math.js                    # DH transforms, SO(3)/SE(3), Euler, quat & axis-angle
│   ├── neural_ik.js               # Browser inference loader & MLP predictor for ABB IRB 120
│   ├── robots.js                  # DH joint tables & metadata for supported models
│   ├── trajectory.js              # Manual, circular, and Lissajous trajectory generators
│   └── workbench3d.js             # Three.js mechanical renderer & energy canvas plot
├── ml/
│   ├── abb_irb120_ik_weights.json # Exported Neural IK weights & normalization metadata
│   └── train_abb_irb120_ik.py     # PyTorch DH data generator & Neural IK trainer
├── scripts/
│   └── update.sh                  # Repository update script executed locally or in CI
├── .gitignore
├── index.html                     # 3D Workbench & Beginner Guide UI
├── LICENSE                        # MIT License
└── README.md

```

## Local Setup & Usage

### 1. Run the 3D Workbench Locally
From the repository root (`robotics-workbench`):

```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

Open `http://127.0.0.1:8080` in your browser.

### 2. Train the ABB IRB 120 Neural IK Model (Optional)
Requires Python with `torch` and `numpy` installed:

```bash
pip install torch numpy
python3 ml/train_abb_irb120_ik.py
```

This updates `ml/abb_irb120_ik_weights.json` with trained weights.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
