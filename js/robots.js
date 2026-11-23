export const ROBOT_PRESETS = {
  planar_2dof: { kind: "planar_2dof", label: "2-DOF Planar Arm (RK4 Dynamics & Control)", color: "#38bdf8", description: "Planar 2-link manipulator with Lagrangian dynamics, RK4 solver, control modes, manipulability & obstacle avoidance.", joints: [] },
  spatial_3dof: { kind: "dh", label: "3-DOF Spatial Arm (Yaw-Pitch-Pitch)", color: "#a78bfa", description: "True 3D workspace (x, y, z) with base yaw q1 + shoulder pitch q2 + elbow pitch q3 via DH transforms.", joints: [
    { name: "q1 (Base Yaw)", a: 0, alphaDeg: 90, d: 0.25, thetaOffsetDeg: 0, minDeg: -180, maxDeg: 180 },
    { name: "q2 (Shoulder Pitch)", a: 0.55, alphaDeg: 0, d: 0, thetaOffsetDeg: 0, minDeg: -135, maxDeg: 135 },
    { name: "q3 (Elbow Pitch)", a: 0.45, alphaDeg: 0, d: 0, thetaOffsetDeg: 0, minDeg: -150, maxDeg: 150 }
  ]},
  abb_irb120: {
    parentCompany: "ABB Robotics", kind: "dh", label: "ABB IRB 120 (6-Axis + Neural IK)", color: "#ff6600", description: "Compact 6-axis industrial robot (~0.58 m reach) with joint sliders and PyTorch Neural IK pose solver.", joints: [
    { name: "J1 (Base)", a: 0, alphaDeg: -90, d: 0.29, thetaOffsetDeg: 0, minDeg: -165, maxDeg: 165 },
    { name: "J2 (Shoulder)", a: 0.27, alphaDeg: 0, d: 0, thetaOffsetDeg: -90, minDeg: -110, maxDeg: 110 },
    { name: "J3 (Elbow)", a: 0.07, alphaDeg: -90, d: 0, thetaOffsetDeg: 0, minDeg: -110, maxDeg: 70 },
    { name: "J4 (Wrist 1)", a: 0, alphaDeg: 90, d: 0.302, thetaOffsetDeg: 0, minDeg: -160, maxDeg: 160 },
    { name: "J5 (Wrist 2)", a: 0, alphaDeg: -90, d: 0, thetaOffsetDeg: 0, minDeg: -120, maxDeg: 120 },
    { name: "J6 (Flange)", a: 0, alphaDeg: 0, d: 0.072, thetaOffsetDeg: 0, minDeg: -180, maxDeg: 180 }
  ]},
  kuka_kr6: { kind: "dh", label: "KUKA KR 6 R700 (6-Axis Agilus)", color: "#f97316", description: "High-speed 6-axis industrial arm (~0.706 m reach) with compact wrist.", joints: [
    { name: "A1 (Base)", a: 0.025, alphaDeg: -90, d: 0.4, thetaOffsetDeg: 0, minDeg: -170, maxDeg: 170 },
    { name: "A2 (Shoulder)", a: 0.315, alphaDeg: 0, d: 0, thetaOffsetDeg: -90, minDeg: -190, maxDeg: 45 },
    { name: "A3 (Elbow)", a: 0.035, alphaDeg: 90, d: 0, thetaOffsetDeg: 0, minDeg: -120, maxDeg: 156 },
    { name: "A4 (Wrist 1)", a: 0, alphaDeg: -90, d: 0.365, thetaOffsetDeg: 0, minDeg: -185, maxDeg: 185 },
    { name: "A5 (Wrist 2)", a: 0, alphaDeg: 90, d: 0, thetaOffsetDeg: 0, minDeg: -120, maxDeg: 120 },
    { name: "A6 (Flange)", a: 0, alphaDeg: 0, d: 0.08, thetaOffsetDeg: 0, minDeg: -180, maxDeg: 180 }
  ]},
  ur5e: { kind: "dh", label: "Universal Robots UR5e (6-Axis Cobot)", color: "#38bdf8", description: "6-axis collaborative manipulator (~0.85 m reach) with shoulder & wrist offsets.", joints: [
    { name: "Base", a: 0, alphaDeg: 90, d: 0.163, thetaOffsetDeg: 0, minDeg: -180, maxDeg: 180 },
    { name: "Shoulder", a: -0.425, alphaDeg: 0, d: 0, thetaOffsetDeg: 0, minDeg: -180, maxDeg: 180 },
    { name: "Elbow", a: -0.392, alphaDeg: 0, d: 0, thetaOffsetDeg: 0, minDeg: -180, maxDeg: 180 },
    { name: "Wrist 1", a: 0, alphaDeg: 90, d: 0.133, thetaOffsetDeg: 0, minDeg: -180, maxDeg: 180 },
    { name: "Wrist 2", a: 0, alphaDeg: -90, d: 0.1, thetaOffsetDeg: 0, minDeg: -180, maxDeg: 180 },
    { name: "Tool Flange", a: 0, alphaDeg: 0, d: 0.1, thetaOffsetDeg: 0, minDeg: -180, maxDeg: 180 }
  ]},
  scara_rrpr: { kind: "dh", label: "Industrial SCARA (4-DOF RRPR)", color: "#34d399", description: "High-speed horizontal pick-and-place arm with rotary joints + vertical Z quill.", joints: [
    { name: "J1 (Arm 1)", a: 0.325, alphaDeg: 0, d: 0.32, thetaOffsetDeg: 0, minDeg: -135, maxDeg: 135 },
    { name: "J2 (Arm 2)", a: 0.275, alphaDeg: 180, d: 0, thetaOffsetDeg: 0, minDeg: -150, maxDeg: 150 },
    { name: "J3 (Z Quill)", a: 0, alphaDeg: 0, d: 0.15, thetaOffsetDeg: 0, minDeg: 0, maxDeg: 0.15, isPrismatic: true },
    { name: "J4 (Tool Yaw)", a: 0, alphaDeg: 0, d: 0.05, thetaOffsetDeg: 0, minDeg: -180, maxDeg: 180 }
  ]},
  frame: { kind: "frame", label: "Single SE(3) Coordinate Frame", color: "#f59e0b", description: "Direct ZYX Euler / Quaternion / Axis-Angle rigid transform T ∈ SE(3) & Gimbal Lock lab.", joints: [] }
};
