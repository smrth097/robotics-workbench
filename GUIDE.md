# Beginners Guide & Demos — Robotics Workbench

## 1. Beginner: Scratch Setup, Camera & Joint Jogging
- **Serve over HTTP:** Run `python3 -m http.server 8080` and open `http://localhost:8080` so ES modules load cleanly.
- **Viewport controls:** Left-drag empty space to orbit, right-drag or two-finger drag to pan, and scroll or pinch to zoom.
- **Joint jogging:** Drag robot links directly in 3D or adjust joint sliders within mechanical limits.
- **Auto performance mode:** Runs in **Auto** mode with low-resource idle throttling and capped active DPR.

## 2. Intermediate: Kinematics, Trajectories & CoM Stability
- **Presets & reach:** Switch presets (ABB-style 6-axis, UR5e, or lab rigs) to compare joint frames, reach, and posture.
- **Quintic waypoint sampling:** Sample smooth joint trajectories with continuous position, velocity, and acceleration profiles.
- **CoM projection:** Check Center-of-Mass support projection for static balance across poses.

## 3. Advanced: Exports, URL Hash, Bridges & Console Tools
- **Exports & bridge:** Export URDF XML and Denavit-Hartenberg (DH) JSON, share pose states via URL hash, and connect serial/WebSocket bridges where configured.
- **DevTools & `window.__wbTools`:** Open DevTools (`F12`) -> **Console** to inspect `window.__wbTools`, and hard-refresh (`Ctrl + Shift + R` with **Disable cache** checked) after updates.

## 4. Demos & Interactive Examples
- **6-DOF Joint & Reach Demo:** Load a 6-axis preset, jog joints via sliders or direct 3D dragging, and inspect reach.
- **Quintic Trajectory Demo:** Sample multi-point joint trajectories and check smooth motion profiles.
- **CoM & Export Demo:** Check Center-of-Mass support projection and export URDF XML or DH parameter JSON.

## 5. 45-Minute Hands-On Lab Activity
- **00-10 min (Setup & Viewport):** Start `python3 -m http.server 8080`, test orbit/pan/zoom and joint jogging, and check **Perf: Auto** status.
- **10-22 min (Presets, Reach & CoM):** Switch presets, pose between extended and compact reaches, and verify joint limits and CoM projection.
- **22-34 min (Quintic Motion & Exports):** Run quintic waypoint sampling, then export URDF XML and DH JSON and inspect joint/link entries.
- **34-45 min (Console & Syntax Check):** Inspect `window.__wbTools` in Chrome DevTools Console (`F12`) and verify `node --check js/*.js` passes.