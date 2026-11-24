# Robotics Workbench — Detailed Guide

## 1. Setup & Local Server
- Requires a modern WebGL-capable browser (Chrome, Edge, Firefox), Python 3 for local HTTP serving, and Git/Node.
- Run `for f in js/*.js; do node --check "$f"; done` and `python3 -m http.server 8080`, then open `http://localhost:8080`.

## 2. Viewport, Joint Jogging & Performance Mode
- **Camera:** Left-drag empty canvas to orbit, right-drag/two-finger drag to pan, scroll/pinch to zoom.
- **Joint Jogging:** Drag links directly in 3D or use the joint sliders.
- **Performance Mode Selector:** Use the **Perf** dropdown in the top-right bar to switch between **Ultra**, **Balanced**, and **Lite**.

## 3. Trajectory, Exports & Bridge
- Switch presets, sample quintic waypoints, and inspect Center-of-Mass (CoM) support projection.
- Export URDF XML or DH JSON, copy shareable URL hashes, or connect serial/WebSocket bridges.

## 4. Browser Console Debugging
- Open DevTools (`F12`) -> **Console** and **Network**.
- Check `window.__wbTools` for runtime helpers, and hard-refresh with `Ctrl + Shift + R` (**Disable cache** checked) after GitHub Pages updates.