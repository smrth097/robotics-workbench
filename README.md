# Robotics Workbench

> **Live Demo:** https://smrth097.github.io/robotics-workbench/  
> **Interactive User & Lab Guide:** https://smrth097.github.io/robotics-workbench/guide.html

Interactive 3D robotics kinematics, trajectory planning, and hardware-bridge workbench built with vanilla ES modules and Three.js—running zero-build directly on GitHub Pages.

## Supported Robot Presets

| Preset | DOF | Kinematics / Reach | Typical Use Case |
| :--- | :---: | :--- | :--- |
| **ABB IRB-Style 6-Axis Arm** | 6 | Articulated spherical-wrist manipulator | Pick-and-place, orientation control, singularity inspection |
| **UR5e Collaborative Arm** | 6 | Non-spherical wrist cobot geometry | Smooth quintic waypoint trajectories, lab DH verification |
| **Planar / Articulated Lab Rig** | 3-4 | Reduced-DOF planar & spatial testbed | Forward/inverse kinematics verification and student labs |

## Key Features

- **Real-Time 3D Viewport & Direct Joint Jogging:** Click-and-drag robot links directly in the Three.js scene via raycasting or fine-tune joint angles using the control sliders.
- **Visible Performance Mode Selector:** Switch dynamically between **Ultra**, **Balanced**, and **Lite** modes from the top-right bar to scale pixel ratio and frame budget.
- **Motion & Stability Analysis:** Quintic polynomial waypoint sampling, joint-space interpolation, and Center-of-Mass (CoM) support-polygon projection.
- **Model & Hardware Exports:** Export **URDF** XML and **Denavit-Hartenberg (DH)** JSON definitions, shareable URL hash states, and serial/WebSocket bridge hooks.
- **Beginner-to-Pro Guide (`guide.html` & `GUIDE.md`):** Setup, joint jogging, trajectory planning, performance modes, exports, and browser console debugging.

## System Architecture

```text
robotics-workbench/
├── index.html          # Main 3D workbench UI, viewport canvas, controls & performance selector
├── guide.html          # Beginner-to-pro interactive documentation page
├── GUIDE.md            # Markdown technical reference
├── styles.css          # Layout, panel styling, responsive controls
└── js/
    ├── main.js         # UI bindings, preset switching, exports, URL hash & __wbTools API
    ├── workbench3d.js  # Three.js scene, camera rig, robot hierarchy & raycast joint dragging
    ├── perf.js         # Frame timing monitor & dynamic quality/DPR tier controller
    └── ...             # Kinematics, motion planner, and bridge helper modules
```

## `window.__wbTools` Console API

Open DevTools (`F12` -> **Console**) on the live workbench to inspect or control state via `window.__wbTools`:

```js
console.log(window.__wbTools);
window.__wbTools?.setPerfTier?.("balanced");
window.__wbTools?.exportDH?.();
window.__wbTools?.exportURDF?.();
```

## Local Development & Verification

Serve over HTTP rather than `file://` because the app uses `<script type="module">`:

```bash
for f in js/*.js; do echo "=== $f ==="; node --check "$f"; done
python3 -m http.server 8080
```