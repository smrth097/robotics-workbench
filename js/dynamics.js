import { clamp, solve2x2 } from "./math.js";
export function forwardKinematics(q1, q2, L1, L2) {
  const x1 = L1 * Math.cos(q1), y1 = L1 * Math.sin(q1);
  return { x1, y1, x2: x1 + L2 * Math.cos(q1 + q2), y2: y1 + L2 * Math.sin(q1 + q2) };
}
export function inverseKinematics(tx, ty, L1, L2, elbowUp = false) {
  const r2 = tx*tx + ty*ty, r = clamp(Math.sqrt(r2), Math.abs(L1 - L2) + 0.001, (L1 + L2) * 0.999);
  const scale = r / (Math.sqrt(r2) || 1), x = tx * scale, y = ty * scale;
  const cosQ2 = clamp((x*x + y*y - L1*L1 - L2*L2) / (2 * L1 * L2), -1, 1);
  const q2 = (elbowUp ? -1 : 1) * Math.acos(cosQ2);
  return [Math.atan2(y, x) - Math.atan2(L2 * Math.sin(q2), L1 + L2 * Math.cos(q2)), q2];
}
export function computeJacobian(q1, q2, L1, L2) {
  const s1 = Math.sin(q1), c1 = Math.cos(q1), s12 = Math.sin(q1 + q2), c12 = Math.cos(q1 + q2);
  return [[-L1*s1 - L2*s12, -L2*s12], [L1*c1 + L2*c12, L2*c12]];
}
export function computeManipulability(J) {
  const A = [[J[0][0]**2 + J[0][1]**2, J[0][0]*J[1][0] + J[0][1]*J[1][1]], [J[1][0]*J[0][0] + J[1][1]*J[0][1], J[1][0]**2 + J[1][1]**2]];
  const trace = A[0][0] + A[1][1], det = Math.max(0, A[0][0]*A[1][1] - A[0][1]*A[1][0]);
  const disc = Math.sqrt(Math.max(0, (trace**2)/4 - det));
  const l1 = Math.sqrt(Math.max(0, trace/2 + disc)), l2 = Math.sqrt(Math.max(0, trace/2 - disc));
  const index = Math.abs(J[0][0]*J[1][1] - J[0][1]*J[1][0]);
  return { rx: l1, ry: l2, angle: 0.5*Math.atan2(2*A[0][1], A[0][0]-A[1][1]), index, cond: Math.max(l1,l2)/Math.max(1e-4, Math.min(l1,l2)) };
}
export function computeDynamicsMatrices(q1, q2, dq1, dq2, { m1, m2, L1, L2, g }) {
  const c2 = Math.cos(q2), s2 = Math.sin(q2);
  const M11 = (m1+m2)*L1*L1 + m2*L2*L2 + 2*m2*L1*L2*c2, M12 = m2*L2*L2 + m2*L1*L2*c2, M22 = m2*L2*L2;
  const h = -m2 * L1 * L2 * s2;
  return {
    M: [[M11, M12], [M12, M22]],
    C: [[h * dq2, h * (dq1 + dq2)], [-h * dq1, 0]],
    G: [(m1+m2)*g*L1*Math.cos(q1) + m2*g*L2*Math.cos(q1+q2), m2*g*L2*Math.cos(q1+q2)]
  };
}
export function computeEnergies(q1, q2, dq1, dq2, { m1, m2, L1, L2, g }) {
  const K = 0.5*m1*(L1*dq1)**2 + 0.5*m2*((L1*dq1)**2 + (L2*(dq1+dq2))**2 + 2*L1*L2*dq1*(dq1+dq2)*Math.cos(q2));
  const P = m1*g*L1*Math.sin(q1) + m2*g*(L1*Math.sin(q1) + L2*Math.sin(q1+q2)) + (m1*L1 + m2*(L1+L2))*g;
  return { K, P, E: K + P };
}
export function stepRK4(state, dt, params, torqueFn) {
  const accel = ([q1, q2, dq1, dq2]) => {
    const { M, C, G } = computeDynamicsMatrices(q1, q2, dq1, dq2, params);
    const tau = torqueFn(q1, q2, dq1, dq2, M, C, G);
    const ddq = solve2x2(M, [tau[0] - (C[0][0]*dq1 + C[0][1]*dq2) - G[0] - params.b*dq1, tau[1] - (C[1][0]*dq1 + C[1][1]*dq2) - G[1] - params.b*dq2]);
    return [dq1, dq2, ddq[0], ddq[1]];
  };
  const add = (a, b, k) => a.map((v, i) => v + b[i] * k);
  const k1 = accel(state), k2 = accel(add(state, k1, dt*0.5)), k3 = accel(add(state, k2, dt*0.5)), k4 = accel(add(state, k3, dt));
  return state.map((v, i) => v + (dt / 6) * (k1[i] + 2*k2[i] + 2*k3[i] + k4[i]));
}
