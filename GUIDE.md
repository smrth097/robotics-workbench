# Robotics Workbench — Beginner-to-Pro Guide

## 1. Setup & Local Preview
- Serve over HTTP (`python3 -m http.server 8080`) rather than `file://` because the project uses ES modules.
- Run `for f in js/*.js; do node --check "$f"; done` before committing to catch syntax errors early.

## 2. Viewport, Joint Jogging & Performance Tiers
- **Camera & Jogging:** Left-drag empty canvas to orbit, right-drag/two-finger drag to pan, scroll/pinch to zoom, and drag links or sliders to jog joints.
- **Performance Tiers (`Ultra` / `Balanced` / `Lite`):** Pick a tier from the **Perf** selector in the bottom-right bar to adjust pixel ratio and rendering load.

## 3. Kinematics, Motion, Exports & Bridge
- Switch robot presets, sample quintic waypoints, and inspect CoM support projection.
- Export URDF XML or DH JSON, copy URL hash states, and connect serial/WebSocket bridges where configured.

## 4. Console Debugging & GitHub Pages
- Open DevTools (`F12`) -> **Console** and **Network**, and inspect `window.__wbTools`.
- After pushing to `main`, wait for GitHub Actions Pages deploy and hard-refresh with `Ctrl + Shift + R` (**Disable cache** checked).