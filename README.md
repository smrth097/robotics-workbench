# Robotics Workbench

> **Live Demo:** https://smrth097.github.io/robotics-workbench/  
> **Beginner-to-Pro Guide:** https://smrth097.github.io/robotics-workbench/guide.html

Interactive 3D robotics kinematics, trajectory planning, and hardware-bridge workbench built with ES modules and Three.js.

## Robot Presets

| Preset | DOF | Kinematics / Reach | Typical Use Case |
| :--- | :---: | :--- | :--- |
| **ABB IRB-Style 6-Axis Arm** | 6 | Articulated spherical-wrist manipulator | Pick-and-place, orientation control, singularity inspection |
| **UR5e Collaborative Arm** | 6 | Non-spherical wrist cobot geometry | Smooth quintic waypoint trajectories, lab DH verification |
| **Planar / Articulated Lab Rig** | 3-4 | Reduced-DOF planar & spatial testbed | Forward/inverse kinematics verification and student labs |

## Key Features

- **3D Viewport & Joint Jogging:** Drag robot links directly in 3D via raycasting or adjust joint sliders.
- **Performance Mode Selector:** Switch between **Ultra**, **Balanced**, and **Lite** tiers from the bottom-right bar (`wb-perf-bar`).
- **Motion & Stability:** Quintic waypoint sampling and Center-of-Mass (CoM) support projection.
- **Exports & Bridge:** URDF XML and DH JSON exports, shareable URL hash state, and serial/WebSocket bridge hooks.
- **Beginner-to-Pro Guide:** Available on `guide.html` and in `GUIDE.md`.

## Repository Layout

```text
robotics-workbench/
├── index.html          # Main 3D workbench UI, canvas, controls & Perf/Guide bar
├── guide.html          # Beginner-to-pro interactive guide page
├── GUIDE.md            # Detailed technical reference
├── styles.css          # Layout and panel styles
└── js/                 # ES modules (main.js, workbench3d.js, perf.js, etc.)
```

## `window.__wbTools` Console Helpers

```js
console.log(window.__wbTools);
window.__wbTools?.setPerfTier?.("balanced");
window.__wbTools?.exportDH?.();
window.__wbTools?.exportURDF?.();
```

## Local Check & Server

```bash
for f in js/*.js; do echo "=== $f ==="; node --check "$f"; done
python3 -m http.server 8080
```