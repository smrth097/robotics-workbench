export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;
export function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
export function solve2x2(M, rhs) {
  const det = M[0][0] * M[1][1] - M[0][1] * M[1][0];
  const safeDet = Math.abs(det) < 1e-7 ? (det >= 0 ? 1e-7 : -1e-7) : det;
  return [(rhs[0] * M[1][1] - rhs[1] * M[0][1]) / safeDet, (M[0][0] * rhs[1] - M[1][0] * rhs[0]) / safeDet];
}
export function eye4() { return [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]]; }
export function multiply4(A, B) {
  const out = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      out[r][c] = A[r][0]*B[0][c] + A[r][1]*B[1][c] + A[r][2]*B[2][c] + A[r][3]*B[3][c];
  return out;
}
export function dhTransform(a, alphaDeg, d, thetaDeg) {
  const alpha = alphaDeg * DEG2RAD, theta = thetaDeg * DEG2RAD;
  const ca = Math.cos(alpha), sa = Math.sin(alpha), ct = Math.cos(theta), st = Math.sin(theta);
  return [[ct, -st*ca, st*sa, a*ct], [st, ct*ca, -ct*sa, a*st], [0, sa, ca, d], [0, 0, 0, 1]];
}
export function computeDHChain(joints, values) {
  const transforms = [eye4()];
  let cur = eye4();
  joints.forEach((j, idx) => {
    const val = values[idx] ?? 0;
    const thetaDeg = j.isPrismatic ? (j.thetaOffsetDeg || 0) : val + (j.thetaOffsetDeg || 0);
    const dVal = j.isPrismatic ? val : j.d;
    cur = multiply4(cur, dhTransform(j.a, j.alphaDeg, dVal, thetaDeg));
    transforms.push(cur);
  });
  return transforms;
}
export function eulerZYXToMatrix(yawDeg, pitchDeg, rollDeg) {
  const cz = Math.cos(yawDeg*DEG2RAD), sz = Math.sin(yawDeg*DEG2RAD);
  const cy = Math.cos(pitchDeg*DEG2RAD), sy = Math.sin(pitchDeg*DEG2RAD);
  const cx = Math.cos(rollDeg*DEG2RAD), sx = Math.sin(rollDeg*DEG2RAD);
  return [[cz*cy, cz*sy*sx - sz*cx, cz*sy*cx + sz*sx], [sz*cy, sz*sy*sx + cz*cx, sz*sy*cx - cz*sx], [-sy, cy*sx, cy*cx]];
}
export function matrixToQuaternion(R) {
  const trace = R[0][0] + R[1][1] + R[2][2];
  let w, x, y, z;
  if (trace > 0) { const s = 0.5 / Math.sqrt(trace + 1); w = 0.25/s; x = (R[2][1]-R[1][2])*s; y = (R[0][2]-R[2][0])*s; z = (R[1][0]-R[0][1])*s; }
  else if (R[0][0] > R[1][1] && R[0][0] > R[2][2]) { const s = 2*Math.sqrt(1+R[0][0]-R[1][1]-R[2][2]); w = (R[2][1]-R[1][2])/s; x = 0.25*s; y = (R[0][1]+R[1][0])/s; z = (R[0][2]+R[2][0])/s; }
  else if (R[1][1] > R[2][2]) { const s = 2*Math.sqrt(1+R[1][1]-R[0][0]-R[2][2]); w = (R[0][2]-R[2][0])/s; x = (R[0][1]+R[1][0])/s; y = 0.25*s; z = (R[1][2]+R[2][1])/s; }
  else { const s = 2*Math.sqrt(1+R[2][2]-R[0][0]-R[1][1]); w = (R[1][0]-R[0][1])/s; x = (R[0][2]+R[2][0])/s; y = (R[1][2]+R[2][1])/s; z = 0.25*s; }
  return { w, x, y, z };
}
export function quaternionToAxisAngle(q) {
  const angle = 2 * Math.acos(clamp(q.w, -1, 1)), s = Math.sqrt(1 - q.w * q.w);
  if (s < 1e-5) return { axis: [1, 0, 0], angleDeg: 0 };
  return { axis: [q.x / s, q.y / s, q.z / s], angleDeg: angle * RAD2DEG };
}
