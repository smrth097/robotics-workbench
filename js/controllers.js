function wrapAngle(a) { while (a > Math.PI) a -= 2*Math.PI; while (a < -Math.PI) a += 2*Math.PI; return a; }
export function computeControlTorque({ mode, q1, q2, dq1, dq2, qd1, qd2, kp, kd, M, C, G }) {
  if (mode === "free") return [0, 0];
  const e1 = wrapAngle(qd1 - q1), e2 = wrapAngle(qd2 - q2);
  if (mode === "pd") return [kp*e1 - kd*dq1, kp*e2 - kd*dq2];
  if (mode === "pdg") return [kp*e1 - kd*dq1 + G[0], kp*e2 - kd*dq2 + G[1]];
  const v1 = kp*e1 - kd*dq1, v2 = kp*e2 - kd*dq2;
  return [M[0][0]*v1 + M[0][1]*v2 + C[0][0]*dq1 + C[0][1]*dq2 + G[0], M[1][0]*v1 + M[1][1]*v2 + C[1][0]*dq1 + C[1][1]*dq2 + G[1]];
}
