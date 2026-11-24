# Robotics Workbench — Complete Scratch-to-Advanced Guide

## 1. Beginner: Scratch Setup, Camera & Joint Jogging
- **Serve over HTTP:** Run `python3 -m http.server 8080` and open `http://localhost:8080` so ES modules load properly.
- **Viewport navigation:** Left-drag empty space to orbit, right-drag or two-finger drag to pan, and scroll or pinch to zoom.
- **Joint jogging:** Drag robot links directly in the 3D scene or adjust joint sliders within mechanical limits.
- **Performance selector:** Use the **Perf** dropdown (`Auto` (low-resource adaptive)) in the top-right bar to control rendering load.

## 2. Intermediate: Kinematics, Trajectories & CoM Stability
- **Robot presets:** Switch between presets (such as ABB-style 6-axis, UR5e, or reduced-DOF lab rigs) to compare link frames, reach, and joint behavior.
- **Quintic waypoint sampling:** Generate smooth joint trajectories with continuous position, velocity, and acceleration profiles.
- **Center-of-Mass (CoM) projection:** Check CoM support projection to inspect static stability across poses.

## 3. Advanced: Exports, URL Hash, Bridges & Console Tools
- **URDF & DH exports:** Export URDF XML and Denavit-Hartenberg (DH) parameter JSON, share pose states via URL hash, and connect serial/WebSocket bridges where configured.
- **DevTools & `window.__wbTools`:** Open DevTools (`F12`) -> **Console** to inspect `window.__wbTools`, and hard-refresh (`Ctrl + Shift + R` with **Disable cache** checked) after pushes.

## 4. 45-Minute Hands-On Lab Activity
- **00-10 min (Setup & Viewport):** Launch the local HTTP server, orbit/pan/zoom, jog joints via sliders and 3D drag, and test `Auto`, `Ultra`, `Balanced`, and `Lite` in **Perf**.
- **10-22 min (Presets, Reach & CoM):** Switch presets, pose the arm at full reach and compact configurations, and check joint limits and CoM stability.
- **22-34 min (Quintic Motion & Exports):** Sample quintic waypoints for smooth motion, then export URDF XML and DH JSON and inspect joint/link entries.
- **34-45 min (Console & Syntax Check):** Inspect `window.__wbTools` in Chrome DevTools Console (`F12`), call `window.__wbTools?.getPerfState?.()`, and confirm `node --check js/*.js` passes.