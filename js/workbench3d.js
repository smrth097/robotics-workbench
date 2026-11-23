import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { forwardKinematics, computeJacobian, computeManipulability } from "./dynamics.js";

let vp = null;

export function initWorkbench3D(canvas, onTargetPick3D) {
  if (vp) return vp;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#080c14");
  scene.fog = new THREE.FogExp2("#080c14", 0.08);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 60);
  camera.up.set(0, 0, 1);
  camera.position.set(1.55, -2.05, 1.45);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0.45, 0.15, 0.25);
  controls.update();

  scene.add(new THREE.AmbientLight(0xdbeafe, 0.65));

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.65);
  keyLight.position.set(2.4, -2.2, 4.2);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.65);
  rimLight.position.set(-2.5, 2.2, 2.0);
  scene.add(rimLight);

  const grid = new THREE.GridHelper(4.0, 20, 0x2a3b55, 0x121a28);
  grid.rotation.x = Math.PI / 2;
  scene.add(grid);

  const floorShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.0, 4.0),
    new THREE.ShadowMaterial({ opacity: 0.32 })
  );
  floorShadow.position.z = -0.002;
  floorShadow.receiveShadow = true;
  scene.add(floorShadow);

  const pickPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(4.0, 4.0),
    new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
  );
  scene.add(pickPlane);

  const dynamicGroup = new THREE.Group();
  scene.add(dynamicGroup);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downPos = { x: 0, y: 0 };

  canvas.addEventListener("pointerdown", (e) => {
    downPos = { x: e.clientX, y: e.clientY };
  });

  canvas.addEventListener("pointerup", (e) => {
    if (e.button !== 0 || Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 4) return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(pickPlane);
    if (hits.length > 0 && typeof onTargetPick3D === "function") {
      onTargetPick3D(hits[0].point.x, hits[0].point.y);
    }
  });

  vp = { renderer, scene, camera, controls, dynamicGroup };
  return vp;
}

function clearGroup(group) {
  while (group.children.length > 0) {
    const c = group.children[0];
    group.remove(c);
    if (c.geometry) c.geometry.dispose();
    if (c.material) {
      (Array.isArray(c.material) ? c.material : [c.material]).forEach((m) => m.dispose());
    }
  }
}

function makeBodyMat(colorHex) {
  return new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.32,
    metalness: 0.45
  });
}

function makeDarkMetalMat(colorHex = 0x1e293b) {
  return new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.42,
    metalness: 0.78
  });
}

function makeAccentMat(colorHex) {
  return new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.25,
    metalness: 0.65
  });
}

function addTriad(group, originArr, R, length = 0.22, radius = 0.0055) {
  const triad = new THREE.Group();
  triad.position.set(...originArr);
  triad.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().set(
      R[0][0], R[0][1], R[0][2], 0,
      R[1][0], R[1][1], R[1][2], 0,
      R[2][0], R[2][1], R[2][2], 0,
      0,       0,       0,       1
    )
  );
  const up = new THREE.Vector3(0, 1, 0);
  [
    [new THREE.Vector3(1, 0, 0), 0xf43f5e],
    [new THREE.Vector3(0, 1, 0), 0x34d399],
    [new THREE.Vector3(0, 0, 1), 0x38bdf8]
  ].forEach(([dir, color]) => {
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.8, radius, length * 0.82, 12).translate(0, length * 0.41, 0),
      new THREE.MeshBasicMaterial({ color })
    );
    shaft.quaternion.setFromUnitVectors(up, dir);

    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(radius * 2.1, length * 0.22, 12).translate(0, length * 0.91, 0),
      new THREE.MeshBasicMaterial({ color })
    );
    tip.quaternion.setFromUnitVectors(up, dir);

    triad.add(shaft, tip);
  });
  group.add(triad);
}

function addMechanicalLink(group, a, b, radius, bodyMat, trimMat) {
  const p0 = new THREE.Vector3(...a);
  const p1 = new THREE.Vector3(...b);
  const delta = new THREE.Vector3().subVectors(p1, p0);
  const len = delta.length();
  if (len < 1e-5) return;

  const dir = delta.clone().normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const mid = p0.clone().addScaledVector(delta, 0.5);

  // Main structural beam
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.72, radius * 0.95, Math.max(0.01, len * 0.78), 20),
    bodyMat
  );
  beam.position.copy(mid);
  beam.quaternion.copy(quat);
  beam.castShadow = true;
  beam.receiveShadow = true;
  group.add(beam);

  // Twin side reinforcement rails
  const railGeo = new THREE.BoxGeometry(radius * 0.42, Math.max(0.01, len * 0.64), radius * 1.35);
  const rail = new THREE.Mesh(railGeo, trimMat);
  rail.position.copy(mid);
  rail.quaternion.copy(quat);
  rail.castShadow = true;
  group.add(rail);
}

function addJointHousing(group, pos, axisVec, radius, length, bodyMat, capMat) {
  const jGroup = new THREE.Group();
  jGroup.position.set(...pos);
  const dir = new THREE.Vector3(...axisVec).normalize();
  jGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

  const drum = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, 24),
    bodyMat
  );
  drum.castShadow = true;
  drum.receiveShadow = true;

  const ringTop = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.72, radius * 0.72, length * 1.14, 20),
    capMat
  );
  ringTop.castShadow = true;

  jGroup.add(drum, ringTop);
  group.add(jGroup);
}

function addBasePedestal(group, pos, radius, height, baseMat, accentMat) {
  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.25, radius * 1.45, height * 0.35, 28).rotateX(Math.PI / 2),
    baseMat
  );
  plinth.position.set(pos[0], pos[1], pos[2] + height * 0.175);
  plinth.castShadow = true;
  plinth.receiveShadow = true;

  const turret = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.92, radius * 1.08, height * 0.68, 28).rotateX(Math.PI / 2),
    accentMat
  );
  turret.position.set(pos[0], pos[1], pos[2] + height * 0.65);
  turret.castShadow = true;
  turret.receiveShadow = true;

  group.add(plinth, turret);
}

function addEndEffectorTool(group, tipPos, R, trimMat, jawMat) {
  const tool = new THREE.Group();
  tool.position.set(...tipPos);
  tool.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().set(
      R[0][0], R[0][1], R[0][2], 0,
      R[1][0], R[1][1], R[1][2], 0,
      R[2][0], R[2][1], R[2][2], 0,
      0,       0,       0,       1
    )
  );

  // Flange collar along local +Z
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.042, 0.024, 24).rotateX(Math.PI / 2),
    trimMat
  );
  collar.position.z = 0.012;
  collar.castShadow = true;

  // Gripper body block
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.056, 0.026, 0.036),
    jawMat
  );
  body.position.z = 0.038;
  body.castShadow = true;

  // Left & right fingers
  const fingerGeo = new THREE.BoxGeometry(0.011, 0.016, 0.046);
  const leftFinger = new THREE.Mesh(fingerGeo, trimMat);
  leftFinger.position.set(-0.02, 0, 0.072);
  leftFinger.castShadow = true;

  const rightFinger = new THREE.Mesh(fingerGeo, trimMat);
  rightFinger.position.set(0.02, 0, 0.072);
  rightFinger.castShadow = true;

  tool.add(collar, body, leftFinger, rightFinger);
  group.add(tool);
}

function addTargetBeacon(group, pos, radius = 0.042) {
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.65, 20, 20),
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.45,
      roughness: 0.25
    })
  );
  core.position.set(...pos);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 1.15, radius * 0.12, 12, 32),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85 })
  );
  halo.position.set(...pos);

  group.add(core, halo);
}

export function renderWorkbench3D(canvas, app, opts) {
  const { kind, R, p, transforms, armColor, ikTargetPos } = opts;
  const v = initWorkbench3D(canvas, opts.onTargetPick3D);

  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width));
  const h = Math.max(1, Math.floor(rect.height));
  if (canvas.width !== w || canvas.height !== h) {
    v.renderer.setSize(w, h, false);
    v.camera.aspect = w / h;
    v.camera.updateProjectionMatrix();
  }

  clearGroup(v.dynamicGroup);
  addTriad(v.dynamicGroup, [0, 0, 0], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], 0.28, 0.005);

  if (kind === "planar_2dof") {
    const { L1, L2 } = app.params;
    const [q1, q2] = app.state;
    const fk = forwardKinematics(q1, q2, L1, L2);
    const zPlane = 0.06;

    const bodyA = makeBodyMat(0x0ea5e9);
    const bodyB = makeBodyMat(0x6366f1);
    const darkMetal = makeDarkMetalMat(0x1e293b);
    const steelCap = makeAccentMat(0xcbd5e1);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry((L1 + L2) * 0.994, (L1 + L2) * 1.006, 72),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.22 })
    );
    ring.position.z = -0.003;
    v.dynamicGroup.add(ring);

    if (app.obstacle.enabled) {
      const obs = new THREE.Mesh(
        new THREE.CylinderGeometry(app.obstacle.r, app.obstacle.r, 0.26, 28).rotateX(Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.4, metalness: 0.2, transparent: true, opacity: 0.45 })
      );
      obs.position.set(app.obstacle.x, app.obstacle.y, 0.13);
      obs.castShadow = true;
      v.dynamicGroup.add(obs);
    }

    if (app.showTrail && app.trail.length > 1) {
      v.dynamicGroup.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(app.trail.map((pt) => new THREE.Vector3(pt.x, pt.y, zPlane))),
          new THREE.LineBasicMaterial({ color: 0x34d399 })
        )
      );
    }

    addTargetBeacon(v.dynamicGroup, [app.target.x, app.target.y, zPlane], 0.048);

    addBasePedestal(v.dynamicGroup, [0, 0, 0], 0.075, 0.06, darkMetal, steelCap);
    addMechanicalLink(v.dynamicGroup, [0, 0, zPlane], [fk.x1, fk.y1, zPlane], 0.046, bodyA, darkMetal);
    addMechanicalLink(v.dynamicGroup, [fk.x1, fk.y1, zPlane], [fk.x2, fk.y2, zPlane], 0.036, bodyB, darkMetal);

    addJointHousing(v.dynamicGroup, [0, 0, zPlane], [0, 0, 1], 0.068, 0.095, darkMetal, steelCap);
    addJointHousing(v.dynamicGroup, [fk.x1, fk.y1, zPlane], [0, 0, 1], 0.056, 0.085, bodyA, steelCap);
    addJointHousing(v.dynamicGroup, [fk.x2, fk.y2, zPlane], [0, 0, 1], 0.044, 0.072, makeAccentMat(0x10b981), steelCap);

    if (app.showEllipse) {
      const ell = computeManipulability(computeJacobian(q1, q2, L1, L2));
      const ellGeom = new THREE.SphereGeometry(1, 24, 24);
      ellGeom.scale(Math.max(0.03, ell.rx * 0.28), Math.max(0.03, ell.ry * 0.28), 0.06);
      const ellMesh = new THREE.Mesh(
        ellGeom,
        new THREE.MeshStandardMaterial({
          color: ell.index < 0.15 ? 0xf43f5e : 0x34d399,
          transparent: true,
          opacity: 0.26
        })
      );
      ellMesh.position.set(fk.x2, fk.y2, zPlane + 0.02);
      ellMesh.rotation.z = -ell.angle;
      v.dynamicGroup.add(ellMesh);
    }
  } else if (kind === "frame") {
    addBasePedestal(v.dynamicGroup, [0, 0, 0], 0.055, 0.04, makeDarkMetalMat(), makeAccentMat(0xf59e0b));
    addMechanicalLink(v.dynamicGroup, [0, 0, 0.02], p, 0.016, makeBodyMat(0xf59e0b), makeDarkMetalMat());
    addJointHousing(v.dynamicGroup, p, [0, 0, 1], 0.032, 0.04, makeAccentMat(0xf59e0b), makeDarkMetalMat());
    addTriad(v.dynamicGroup, p, R, 0.42, 0.0065);
  } else if (kind === "dh" && Array.isArray(transforms) && transforms.length > 1) {
    const pts = transforms.map((T) => [T[0][3], T[1][3], T[2][3]]);
    const mainMat = makeBodyMat(armColor || "#ff6600");
    const darkMetal = makeDarkMetalMat(0x1e293b);
    const steelCap = makeAccentMat(0xdbeafe);

    if (Array.isArray(ikTargetPos)) {
      addTargetBeacon(v.dynamicGroup, ikTargetPos, 0.034);
    }

    // Grounded base pedestal
    addBasePedestal(v.dynamicGroup, pts[0], 0.085, Math.max(0.06, pts[1][2] * 0.45), darkMetal, mainMat);

    // Sculpted links between joint frames
    for (let i = 0; i < pts.length - 1; i++) {
      const linkRadius = Math.max(0.018, 0.038 - i * 0.0035);
      addMechanicalLink(v.dynamicGroup, pts[i], pts[i + 1], linkRadius, mainMat, darkMetal);
    }

    // Rotary joint drums oriented along local joint Z axis
    transforms.forEach((T, idx) => {
      const isBase = idx === 0;
      const isTip = idx === transforms.length - 1;
      const zAxis = [T[0][2], T[1][2], T[2][2]];
      const jRadius = isBase ? 0.068 : isTip ? 0.038 : Math.max(0.026, 0.052 - idx * 0.004);
      const jLen = isBase ? 0.09 : isTip ? 0.035 : Math.max(0.045, 0.075 - idx * 0.005);
      addJointHousing(
        v.dynamicGroup,
        pts[idx],
        zAxis,
        jRadius,
        jLen,
        isTip ? makeAccentMat(0x10b981) : isBase ? darkMetal : mainMat,
        steelCap
      );
    });

    const endT = transforms[transforms.length - 1];
    const endR = [
      [endT[0][0], endT[0][1], endT[0][2]],
      [endT[1][0], endT[1][1], endT[1][2]],
      [endT[2][0], endT[2][1], endT[2][2]]
    ];

    addEndEffectorTool(v.dynamicGroup, pts[pts.length - 1], endR, steelCap, darkMetal);
    addTriad(v.dynamicGroup, pts[pts.length - 1], endR, 0.18, 0.005);
  }

  v.controls.update();
  v.renderer.render(v.scene, v.camera);
}

export function renderEnergyPlot(ctx, canvas, history) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
  }
  const w = rect.width;
  const h = rect.height;
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);
  if (history.length < 2) {
    ctx.restore();
    return;
  }
  const maxE = Math.max(1, ...history.map((d) => d.E));
  [["K", "#38bdf8"], ["P", "#f59e0b"], ["E", "#34d399"]].forEach(([key, color]) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    history.forEach((pt, i) => {
      const x = (i / (history.length - 1)) * w;
      const y = h - 8 - (pt[key] / maxE) * (h - 16);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
  ctx.restore();
}
