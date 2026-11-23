export const ROBOT_PRESETS = {
  "planar_2dof": {
    "kind": "planar_2dof",
    "label": "2-DOF Planar Arm (RK4 Dynamics & Control)",
    "color": "#38bdf8",
    "description": "Planar 2-link manipulator with Lagrangian dynamics, RK4 solver, control modes, manipulability & obstacle avoidance.",
    "joints": []
  },
  "spatial_3dof": {
    "kind": "dh",
    "label": "3-DOF Spatial Arm (Yaw-Pitch-Pitch)",
    "color": "#38bdf8",
    "description": "Three-axis spatial chain combining base yaw with two pitching links in a vertical plane.",
    "joints": [
      {
        "name": "q1 (Base Yaw)",
        "a": 0,
        "alphaDeg": 90,
        "d": 0.25,
        "thetaOffsetDeg": 0,
        "minDeg": -180,
        "maxDeg": 180
      },
      {
        "name": "q2 (Shoulder Pitch)",
        "a": 0.55,
        "alphaDeg": 0,
        "d": 0,
        "thetaOffsetDeg": 0,
        "minDeg": -135,
        "maxDeg": 135
      },
      {
        "name": "q3 (Elbow Pitch)",
        "a": 0.45,
        "alphaDeg": 0,
        "d": 0,
        "thetaOffsetDeg": 0,
        "minDeg": -150,
        "maxDeg": 150
      }
    ],
    "id": "spatial_3dof",
    "name": "3-DOF Spatial Arm (Yaw-Pitch-Pitch)",
    "parentCompany": "Generic Spatial Articulated",
    "trimColor": "#0f172a"
  },
  "abb_irb120": {
    "parentCompany": "ABB Robotics",
    "kind": "dh",
    "label": "ABB IRB 120 (6-Axis + Neural IK)",
    "color": "#ff6600",
    "description": "Compact 6-axis industrial arm from ABB Robotics with signature orange finish.",
    "joints": [
      {
        "name": "J1 Base",
        "a": 0,
        "alphaDeg": -90,
        "d": 0.29,
        "thetaOffsetDeg": 0,
        "minDeg": -165,
        "maxDeg": 165
      },
      {
        "name": "J2 Lower Arm",
        "a": 0.27,
        "alphaDeg": 0,
        "d": 0,
        "thetaOffsetDeg": -90,
        "minDeg": -110,
        "maxDeg": 110
      },
      {
        "name": "J3 Elbow",
        "a": 0.07,
        "alphaDeg": -90,
        "d": 0,
        "thetaOffsetDeg": 0,
        "minDeg": -110,
        "maxDeg": 70
      },
      {
        "name": "J4 Wrist Roll",
        "a": 0,
        "alphaDeg": 90,
        "d": 0.302,
        "thetaOffsetDeg": 0,
        "minDeg": -160,
        "maxDeg": 160
      },
      {
        "name": "J5 Wrist Bend",
        "a": 0,
        "alphaDeg": -90,
        "d": 0,
        "thetaOffsetDeg": 0,
        "minDeg": -120,
        "maxDeg": 120
      },
      {
        "name": "J6 Flange",
        "a": 0,
        "alphaDeg": 0,
        "d": 0.072,
        "thetaOffsetDeg": 0,
        "minDeg": -360,
        "maxDeg": 360
      }
    ],
    "id": "abb_irb120",
    "name": "ABB IRB 120 (6-Axis + Neural IK)",
    "trimColor": "#e2e8f0"
  },
  "kuka_kr6": {
    "kind": "dh",
    "label": "KUKA KR 6 R700 (6-Axis Agilus)",
    "color": "#f97316",
    "description": "Six-axis KUKA Agilus arm with KUKA orange and dark charcoal trim.",
    "joints": [
      {
        "name": "A1 Base",
        "a": 0.025,
        "alphaDeg": -90,
        "d": 0.4,
        "thetaOffsetDeg": 0,
        "minDeg": -170,
        "maxDeg": 170
      },
      {
        "name": "A2 Link Arm",
        "a": 0.315,
        "alphaDeg": 0,
        "d": 0,
        "thetaOffsetDeg": -90,
        "minDeg": -190,
        "maxDeg": 45
      },
      {
        "name": "A3 Arm",
        "a": 0.035,
        "alphaDeg": 90,
        "d": 0,
        "thetaOffsetDeg": 0,
        "minDeg": -120,
        "maxDeg": 156
      },
      {
        "name": "A4 Wrist Roll",
        "a": 0,
        "alphaDeg": -90,
        "d": 0.365,
        "thetaOffsetDeg": 0,
        "minDeg": -185,
        "maxDeg": 185
      },
      {
        "name": "A5 Wrist Pitch",
        "a": 0,
        "alphaDeg": 90,
        "d": 0,
        "thetaOffsetDeg": 0,
        "minDeg": -120,
        "maxDeg": 120
      },
      {
        "name": "A6 Flange",
        "a": 0,
        "alphaDeg": 0,
        "d": 0.08,
        "thetaOffsetDeg": 0,
        "minDeg": -350,
        "maxDeg": 350
      }
    ],
    "id": "kuka_kr6",
    "name": "KUKA KR 6 R700 (6-Axis Agilus)",
    "parentCompany": "KUKA",
    "trimColor": "#1e293b"
  },
  "ur5e": {
    "kind": "dh",
    "label": "Universal Robots UR5e (6-Axis Cobot)",
    "color": "#93c5fd",
    "description": "Six-axis collaborative cobot from Universal Robots with silver-blue joint barrels.",
    "joints": [
      {
        "name": "Base",
        "a": 0,
        "alphaDeg": 90,
        "d": 0.1625,
        "thetaOffsetDeg": 0,
        "minDeg": -360,
        "maxDeg": 360
      },
      {
        "name": "Shoulder",
        "a": -0.425,
        "alphaDeg": 0,
        "d": 0,
        "thetaOffsetDeg": 0,
        "minDeg": -360,
        "maxDeg": 360
      },
      {
        "name": "Elbow",
        "a": -0.3922,
        "alphaDeg": 0,
        "d": 0,
        "thetaOffsetDeg": 0,
        "minDeg": -180,
        "maxDeg": 180
      },
      {
        "name": "Wrist 1",
        "a": 0,
        "alphaDeg": 90,
        "d": 0.1333,
        "thetaOffsetDeg": 0,
        "minDeg": -360,
        "maxDeg": 360
      },
      {
        "name": "Wrist 2",
        "a": 0,
        "alphaDeg": -90,
        "d": 0.0997,
        "thetaOffsetDeg": 0,
        "minDeg": -360,
        "maxDeg": 360
      },
      {
        "name": "Wrist 3",
        "a": 0,
        "alphaDeg": 0,
        "d": 0.0996,
        "thetaOffsetDeg": 0,
        "minDeg": -360,
        "maxDeg": 360
      }
    ],
    "id": "ur5e",
    "name": "Universal Robots UR5e (6-Axis Cobot)",
    "parentCompany": "Universal Robots",
    "trimColor": "#cbd5e1"
  },
  "scara_rrpr": {
    "kind": "dh",
    "label": "Industrial SCARA (4-DOF RRPR)",
    "color": "#f8fafc",
    "description": "Four-axis selective compliance assembly arm with twin horizontal links, vertical quill, and blue trim.",
    "joints": [
      {
        "name": "J1 Shoulder",
        "a": 0.325,
        "alphaDeg": 0,
        "d": 0.28,
        "thetaOffsetDeg": 0,
        "minDeg": -135,
        "maxDeg": 135
      },
      {
        "name": "J2 Elbow",
        "a": 0.275,
        "alphaDeg": 180,
        "d": 0,
        "thetaOffsetDeg": 0,
        "minDeg": -150,
        "maxDeg": 150
      },
      {
        "name": "J3 Z Quill",
        "a": 0,
        "alphaDeg": 0,
        "d": -0.06,
        "thetaOffsetDeg": 0,
        "minDeg": -0.15,
        "maxDeg": 0,
        "isPrismatic": true
      },
      {
        "name": "J4 Tool Yaw",
        "a": 0,
        "alphaDeg": 0,
        "d": 0.05,
        "thetaOffsetDeg": 0,
        "minDeg": -360,
        "maxDeg": 360
      }
    ],
    "id": "scara_rrpr",
    "name": "Epson / Industrial SCARA (4-DOF RRPR)",
    "parentCompany": "Industrial SCARA (Epson / Fanuc style)",
    "trimColor": "#2563eb"
  },
  "frame": {
    "kind": "frame",
    "label": "Single SE(3) Coordinate Frame",
    "color": "#f59e0b",
    "description": "Standalone rigid-body pose in SE(3) with ZYX Euler angles, quaternion, and axis-angle inspection.",
    "joints": [],
    "id": "frame",
    "name": "Single SE(3) Coordinate Frame",
    "parentCompany": "Rigid Body Frame Reference",
    "trimColor": "#1e293b"
  }
};

export const ROBOT_MODELS = ROBOT_PRESETS;
