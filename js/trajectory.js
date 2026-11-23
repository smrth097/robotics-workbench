export function sampleTrajectory(mode, t, baseTarget, L1, L2) {
  if (mode === "circle") { const r = Math.min(0.45, (L1+L2)*0.25); return { x: 0.65 + r*Math.cos(1.2*t), y: 0.35 + r*Math.sin(1.2*t) }; }
  if (mode === "lissajous") { const ax = Math.min(0.55, (L1+L2)*0.3), ay = Math.min(0.35, (L1+L2)*0.18); return { x: 0.65 + ax*Math.sin(1.1*t), y: 0.35 + ay*Math.sin(2.2*t) }; }
  return { x: baseTarget.x, y: baseTarget.y };
}
