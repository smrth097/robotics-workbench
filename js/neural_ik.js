function silu(x) { return x / (1 + Math.exp(-x)); }
function matVecMul(W, b, x) { return W.map((row, i) => row.reduce((acc, w, j) => acc + w * x[j], b[i])); }
export async function loadNeuralIK(url = "./ml/abb_irb120_ik_weights.json") {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load Neural IK weights: ${res.status}`);
  return await res.json();
}
export function predictABBJointsDeg(modelJson, targetPos, xAxis = [1, 0, 0], zAxis = [0, 0, 1]) {
  const raw = [...targetPos, ...xAxis, ...zAxis];
  let h = raw.map((v, i) => (v - modelJson.input_mean[i]) / (modelJson.input_std[i] || 1));
  modelJson.layers.forEach((layer, idx) => {
    h = matVecMul(layer.weight, layer.bias, h);
    if (idx < modelJson.layers.length - 1) h = h.map(silu);
  });
  return Array.from({ length: 6 }, (_, i) => {
    const [minD, maxD] = modelJson.joint_limits_deg[i];
    return Math.max(minD, Math.min(maxD, Math.atan2(h[i], h[i + 6]) * (180 / Math.PI)));
  });
}
