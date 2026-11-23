import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { forwardKinematics, computeJacobian, computeManipulability } from "./dynamics.js";
import { getPerfConfig } from "./perf.js";

let vp = null;

function applyPerfToViewport(v, perf) {
  if (v.appliedTier === perf.tier) return;
  v.appliedTier = perf.tier;

  v.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, perf.maxDpr));
  v.renderer.shadowMap.enabled = perf.shadows;
  v.keyLight.castShadow = perf.shadows;
  v.keyLight.shadow.mapSize.set(perf.shadowMapSize, perf.shadowMapSize);
  v.floorShadow.visible = perf.shadows;
  v.scene.fog = perf.fog ? new THREE.FogExp2("#080c14", 0.08) : null;
  v.controls.enableDamping = perf.tier !== "low";
}

export function initWorkbench3D(canvas, onTargetPick3D, perf, onJointJog) {
  if (vp) {
    applyPerfToViewport(vp, perf);
    return vp;
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: perf.antialias,
    powerPreference: perf.tier === "low" ? "low-power" : "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, perf.maxDpr));
  renderer.shadowMap.enabled = perf.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    if (vp) vp.contextLost = true;
  }, false);
  canvas.addEventListener("webglcontextrestored", () => {
    if (vp) {
      vp.contextLost = false;
      vp.appliedTier = null;
      if (vp.controls) vp.controls.enabled = true;
    }
  }, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#080c14");
  if (perf.fog) {
    scene.fog = new THREE.FogExp2("#080c14", 0.08);
  }

  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 60);
  camera.up.set(0, 0, 1);
  camera.position.set(1.55, -2.05, 1.45);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = perf.tier !== "low";
  controls.dampingFactor = 0.08;
  controls.target.set(0.45, 0.15, 0.25);
  controls.update();

  scene.add(new THREE.AmbientLight(0xdbeafe, 0.65));

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.65);
  keyLight.position.set(2.4, -2.2, 4.2);
  keyLight.castShadow = perf.shadows;
  keyLight.shadow.mapSize.set(perf.shadowMapSize, perf.shadowMapSize);
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
  floorShadow.visible = perf.shadows;
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

  let activeJointIdx = null;
  let lastDragX = 0;
  let lastDragY = 0;

  canvas.addEventListener("pointerdown", (e) => {
    downPos = { x: e.clientX, y: e.clientY };
    lastDragX = e.clientX;
    lastDragY = e.clientY;
    if (e.button !== 0 || !vp?.onJointJog) return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(dynamicGroup.children, true);
    const jointHit = hits.find((h) => Number.isInteger(h.object?.userData?.jointIndex));
    if (jointHit) {
      activeJointIdx = jointHit.object.userData.jointIndex;
      controls.enabled = false;
      canvas.style.cursor = "grabbing";
      if (typeof canvas.setPointerCapture === "function") {
        try { canvas.setPointerCapture(e.pointerId); } catch {}
      }
      e.preventDefault();
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    if (document.hidden || vp?.contextLost) return;
    if (activeJointIdx !== null && vp?.onJointJog) {
      const dx = e.clientX - lastDragX;
      const dy = e.clientY - lastDragY;
      lastDragX = e.clientX;
      lastDragY = e.clientY;
      vp.onJointJog(activeJointIdx, dx - dy);
      return;
    }
    const now = performance.now();
    const minGap = vp?.raycastThrottleMs || 48;
    if (now - (vp?.lastHoverTime || 0) < minGap) return;
    if (vp) vp.lastHoverTime = now;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(dynamicGroup.children, true);
    const hoveringJoint = hits.some((h) => Number.isInteger(h.object?.userData?.jointIndex));
    canvas.style.cursor = hoveringJoint ? "grab" : "";
  });

  const finishJointDrag = (e) => {
      if (activeJointIdx !== null) {
        activeJointIdx = null;
        controls.enabled = true;
        canvas.style.cursor = "";
        if (e && typeof e.pointerId === "number" && typeof canvas.releasePointerCapture === "function") {
          try { canvas.releasePointerCapture(e.pointerId); } catch {}
        }
        return true;
      }
      return false;
    };

    canvas.addEventListener("pointercancel", (e) => {
      finishJointDrag(e);
    });

    canvas.addEventListener("pointerup", (e) => {
      if (finishJointDrag(e)) return;
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

  vp = { renderer, scene, camera, controls, dynamicGroup, keyLight, floorShadow, appliedTier: perf.tier, onJointJog, contextLost: false, lastHoverTime: 0, raycastThrottleMs: perf.raycastThrottleMs || 48 };
  return vp;
}

function disposeObject3D(obj) {
  if (!obj) return;
  if (obj.geometry && typeof obj.geometry.dispose === "function") {
    obj.geometry.dispose();
  }
  const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
  for (const m of mats) {
    if (!m || typeof m.dispose !== "function") continue;
    for (const k of Object.keys(m)) {
      const val = m[k];
      if (val && val.isTexture && typeof val.dispose === "function") {
        val.dispose();
      }
    }
    m.dispose();
  }
}

function clearGroup(group) {
  if (!group) return;
  for (let i = group.children.length - 1; i >= 0; i--) {
    const child = group.children[i];
    child.traverse(disposeObject3D);
    group.remove(child);
  }
}

function makeBodyMat(colorHex, metalness = 0.42, roughness = 0.32) {
  return new THREE.MeshStandardMaterial({ color: colorHex, roughness, metalness });
}

function makeDarkMetalMat(colorHex = 0x1e293b) {
  return new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.42, metalness: 0.78 });
}

function makeAccentMat(colorHex) {
  return new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.25, metalness: 0.65 });
}

function addTriad(group, originArr, R, length = 0.22, radius = 0.0055, segs = 16) {
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
      new THREE.CylinderGeometry(radius * 0.8, radius, length * 0.82, Math.max(8, Math.floor(segs * 0.75))).translate(0, length * 0.41, 0),
      new THREE.MeshBasicMaterial({ color })
    );
    shaft.quaternion.setFromUnitVectors(up, dir);

    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(radius * 2.1, length * 0.22, Math.max(8, Math.floor(segs * 0.75))).translate(0, length * 0.91, 0),
      new THREE.MeshBasicMaterial({ color })
    );
    tip.quaternion.setFromUnitVectors(up, dir);

    triad.add(shaft, tip);
  });
  group.add(triad);
}

function addMechanicalLink(group, a, b, radius, bodyMat, trimMat, style = "industrial", segs = 16, shadows = true) {
  const p0 = new THREE.Vector3(...a);
  const p1 = new THREE.Vector3(...b);
  const delta = new THREE.Vector3().subVectors(p1, p0);
  const len = delta.length();
  if (len < 1e-5) return;

  const dir = delta.clone().normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const mid = p0.clone().addScaledVector(delta, 0.5);

  if (style === "cobot") {
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.92, radius * 0.92, Math.max(0.01, len * 0.82), segs),
      bodyMat
    );
    tube.position.copy(mid);
    tube.quaternion.copy(quat);
    tube.castShadow = shadows;
    tube.receiveShadow = shadows;
    group.add(tube);
    return;
  }

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.72, radius * 0.95, Math.max(0.01, len * 0.78), segs),
    bodyMat
  );
  beam.position.copy(mid);
  beam.quaternion.copy(quat);
  beam.castShadow = shadows;
  beam.receiveShadow = shadows;
  group.add(beam);

  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(radius * 0.42, Math.max(0.01, len * 0.64), radius * 1.35),
    trimMat
  );
  rail.position.copy(mid);
  rail.quaternion.copy(quat);
  rail.castShadow = shadows;
  group.add(rail);
}

function addJointHousing(group, pos, axisVec, radius, length, bodyMat, capMat, segs = 16, shadows = true, jointIndex = null) {
  const jGroup = new THREE.Group();
  jGroup.position.set(...pos);
  const dir = new THREE.Vector3(...axisVec).normalize();
  jGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

  const drum = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, segs),
    bodyMat
  );
  drum.castShadow = shadows;
  drum.receiveShadow = shadows;

  const ringTop = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.72, radius * 0.72, length * 1.14, Math.max(10, Math.floor(segs * 0.8))),
    capMat
  );
  ringTop.castShadow = shadows;

  const hitMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.45, radius * 1.45, Math.max(0.06, length * 1.35), Math.max(10, Math.floor(segs * 0.75))),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  jGroup.add(drum, ringTop, hitMesh);
  if (jointIndex !== null && jointIndex !== undefined) {
    jGroup.traverse((obj) => { obj.userData.jointIndex = jointIndex; });
  }
  group.add(jGroup);
}

function addBasePedestal(group, pos, radius, height, baseMat, accentMat, segs = 20, shadows = true) {
  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.25, radius * 1.45, height * 0.35, segs).rotateX(Math.PI / 2),
    baseMat
  );
  plinth.position.set(pos[0], pos[1], pos[2] + height * 0.175);
  plinth.castShadow = shadows;
  plinth.receiveShadow = shadows;

  const turret = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.92, radius * 1.08, height * 0.68, segs).rotateX(Math.PI / 2),
    accentMat
  );
  turret.position.set(pos[0], pos[1], pos[2] + height * 0.65);
  turret.castShadow = shadows;
  turret.receiveShadow = shadows;

  group.add(plinth, turret);
}

function addEndEffectorTool(group, tipPos, R, trimMat, jawMat, segs = 16, shadows = true) {
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

  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.042, 0.024, segs).rotateX(Math.PI / 2),
    trimMat
  );
  collar.position.z = 0.012;
  collar.castShadow = shadows;

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.056, 0.026, 0.036),
    jawMat
  );
  body.position.z = 0.038;
  body.castShadow = shadows;

  const fingerGeo = new THREE.BoxGeometry(0.011, 0.016, 0.046);
  const leftFinger = new THREE.Mesh(fingerGeo, trimMat);
  leftFinger.position.set(-0.02, 0, 0.072);
  leftFinger.castShadow = shadows;

  const rightFinger = new THREE.Mesh(fingerGeo, trimMat);
  rightFinger.position.set(0.02, 0, 0.072);
  rightFinger.castShadow = shadows;

  tool.add(collar, body, leftFinger, rightFinger);
  group.add(tool);
}

function addTargetBeacon(group, pos, radius = 0.042, segs = 16) {
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.65, segs, Math.max(10, Math.floor(segs * 0.75))),
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.45,
      roughness: 0.25
    })
  );
  core.position.set(...pos);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 1.15, radius * 0.12, 10, Math.max(16, segs * 2)),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85 })
  );
  halo.position.set(...pos);

  group.add(core, halo);
}

function buildParentCompanyArm(group, modelId, transforms, mainMat, trimMat, steelCap, darkMetal, perf) {
  const pts = transforms.map((T) => [T[0][3], T[1][3], T[2][3]]);
  const segs = perf.curveSegments;
  const sh = perf.shadows;

  if (modelId === "ur5e") {
    addBasePedestal(group, pts[0], 0.075, Math.max(0.06, pts[1][2] * 0.4), darkMetal, steelCap, segs, sh);
    for (let i = 0; i < pts.length - 1; i++) {
      addMechanicalLink(group, pts[i], pts[i + 1], Math.max(0.022, 0.038 - i * 0.003), mainMat, trimMat, "cobot", segs, sh);
    }
    transforms.forEach((T, idx) => {
      const zAxis = [T[0][2], T[1][2], T[2][2]];
      const r = idx < 3 ? 0.048 : 0.036;
      const len = idx < 3 ? 0.082 : 0.055;
      addJointHousing(group, pts[idx], zAxis, r, len, mainMat, steelCap, segs, sh, idx);
    });
    return;
  }

  if (modelId === "scara_rrpr") {
    addBasePedestal(group, pts[0], 0.085, 0.07, darkMetal, trimMat, segs, sh);
    const columnTop = [pts[0][0], pts[0][1], pts[1][2]];
    addMechanicalLink(group, pts[0], columnTop, 0.052, mainMat, trimMat, "industrial", segs, sh);
    addJointHousing(group, pts[0], [0, 0, 1], 0.066, 0.08, trimMat, steelCap, segs, sh);

    addMechanicalLink(group, pts[1], pts[2], 0.038, mainMat, trimMat, "industrial", segs, sh);
    addJointHousing(group, pts[1], [0, 0, 1], 0.056, 0.07, mainMat, steelCap, segs, sh);

    addMechanicalLink(group, pts[2], [pts[3][0], pts[3][1], pts[2][2]], 0.03, mainMat, trimMat, "industrial", segs, sh);
    addJointHousing(group, pts[2], [0, 0, 1], 0.046, 0.06, mainMat, steelCap, segs, sh);

    addMechanicalLink(group, [pts[3][0], pts[3][1], pts[2][2]], pts[3], 0.016, steelCap, darkMetal, "cobot", segs, sh);
    return;
  }

  if (modelId === "abb_irb120" || modelId === "kuka_kr6") {
    const pedH = modelId === "kuka_kr6" ? 0.11 : 0.09;
    addBasePedestal(group, pts[0], 0.085, pedH, darkMetal, mainMat, segs, sh);

    for (let i = 0; i < pts.length - 1; i++) {
      const linkRadius = i === 1 ? 0.044 : i === 2 ? 0.036 : Math.max(0.018, 0.032 - i * 0.003);
      addMechanicalLink(
        group,
        pts[i],
        pts[i + 1],
        linkRadius,
        mainMat,
        modelId === "kuka_kr6" ? darkMetal : trimMat,
        "industrial",
        segs,
        sh
      );
    }

    transforms.forEach((T, idx) => {
      const isBase = idx === 0;
      const isTip = idx === transforms.length - 1;
      const zAxis = [T[0][2], T[1][2], T[2][2]];
      const jRadius = isBase ? 0.072 : idx === 1 ? 0.058 : idx === 2 ? 0.048 : isTip ? 0.036 : 0.032;
      const jLen = isBase ? 0.095 : idx <= 2 ? 0.082 : 0.048;
      addJointHousing(
        group,
        pts[idx],
        zAxis,
        jRadius,
        jLen,
        isTip ? makeAccentMat(0x10b981) : isBase ? darkMetal : mainMat,
        steelCap,
        segs,
        sh, idx);
    });
    return;
  }

  addBasePedestal(group, pts[0], 0.08, 0.07, darkMetal, mainMat, segs, sh);
  for (let i = 0; i < pts.length - 1; i++) {
    addMechanicalLink(group, pts[i], pts[i + 1], Math.max(0.018, 0.038 - i * 0.0035), mainMat, darkMetal, "industrial", segs, sh);
  }
  transforms.forEach((T, idx) => {
    const isTip = idx === transforms.length - 1;
    addJointHousing(
      group,
      pts[idx],
      [T[0][2], T[1][2], T[2][2]],
      isTip ? 0.038 : Math.max(0.026, 0.054 - idx * 0.004),
      isTip ? 0.035 : 0.07,
      isTip ? makeAccentMat(0x10b981) : mainMat,
      steelCap,
      segs,
      sh, idx);
  });
}

export function renderWorkbench3D(canvas, app, opts) {
  const perf = getPerfConfig(app?.perfMode || "auto");
  const { kind, modelId, R, p, transforms, armColor, trimColor, ikTargetPos } = opts;
  const v = initWorkbench3D(canvas, opts.onTargetPick3D, perf, opts.onJointJog);
  if (vp) {
    vp.onJointJog = opts.onJointJog;
    vp.raycastThrottleMs = perf.raycastThrottleMs || 48;
  }
  if (v?.contextLost || document.hidden) return;
  const segs = perf.curveSegments;
  const sh = perf.shadows;

  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width));
  const h = Math.max(1, Math.floor(rect.height));
  if (canvas.width !== w || canvas.height !== h) {
    v.renderer.setSize(w, h, false);
    v.camera.aspect = w / h;
    v.camera.updateProjectionMatrix();
  }

  clearGroup(v.dynamicGroup);
  addTriad(v.dynamicGroup, [0, 0, 0], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], 0.28, 0.005, segs);

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
      new THREE.RingGeometry((L1 + L2) * 0.994, (L1 + L2) * 1.006, Math.max(36, segs * 3)),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.22 })
    );
    ring.position.z = -0.003;
    v.dynamicGroup.add(ring);

    if (app.obstacle.enabled) {
      const obs = new THREE.Mesh(
        new THREE.CylinderGeometry(app.obstacle.r, app.obstacle.r, 0.26, segs).rotateX(Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.4, metalness: 0.2, transparent: true, opacity: 0.45 })
      );
      obs.position.set(app.obstacle.x, app.obstacle.y, 0.13);
      obs.castShadow = sh;
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

    addTargetBeacon(v.dynamicGroup, [app.target.x, app.target.y, zPlane], 0.048, segs);

    addBasePedestal(v.dynamicGroup, [0, 0, 0], 0.075, 0.06, darkMetal, steelCap, segs, sh);
    addMechanicalLink(v.dynamicGroup, [0, 0, zPlane], [fk.x1, fk.y1, zPlane], 0.046, bodyA, darkMetal, "industrial", segs, sh);
    addMechanicalLink(v.dynamicGroup, [fk.x1, fk.y1, zPlane], [fk.x2, fk.y2, zPlane], 0.036, bodyB, darkMetal, "industrial", segs, sh);

    addJointHousing(v.dynamicGroup, [0, 0, zPlane], [0, 0, 1], 0.068, 0.095, darkMetal, steelCap, segs, sh);
    addJointHousing(v.dynamicGroup, [fk.x1, fk.y1, zPlane], [0, 0, 1], 0.056, 0.085, bodyA, steelCap, segs, sh);
    addJointHousing(v.dynamicGroup, [fk.x2, fk.y2, zPlane], [0, 0, 1], 0.044, 0.072, makeAccentMat(0x10b981), steelCap, segs, sh);

    if (app.showEllipse) {
      const ell = computeManipulability(computeJacobian(q1, q2, L1, L2));
      const ellGeom = new THREE.SphereGeometry(1, segs, Math.max(10, Math.floor(segs * 0.75)));
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
    addBasePedestal(v.dynamicGroup, [0, 0, 0], 0.055, 0.04, makeDarkMetalMat(), makeAccentMat(0xf59e0b), segs, sh);
    addMechanicalLink(v.dynamicGroup, [0, 0, 0.02], p, 0.016, makeBodyMat(0xf59e0b), makeDarkMetalMat(), "industrial", segs, sh);
    addJointHousing(v.dynamicGroup, p, [0, 0, 1], 0.032, 0.04, makeAccentMat(0xf59e0b), makeDarkMetalMat(), segs, sh);
    addTriad(v.dynamicGroup, p, R, 0.42, 0.0065, segs);
  } else if (kind === "dh" && Array.isArray(transforms) && transforms.length > 1) {
    const pts = transforms.map((T) => [T[0][3], T[1][3], T[2][3]]);
    const isCobot = modelId === "ur5e";
    const mainMat = makeBodyMat(armColor || "#ff6600", isCobot ? 0.65 : 0.42, isCobot ? 0.24 : 0.32);
    const trimMat = makeBodyMat(trimColor || "#1e293b", 0.55, 0.35);
    const darkMetal = makeDarkMetalMat(0x1e293b);
    const steelCap = makeAccentMat(0xdbeafe);

    if (Array.isArray(ikTargetPos)) {
      addTargetBeacon(v.dynamicGroup, ikTargetPos, 0.034, segs);
    }

    buildParentCompanyArm(v.dynamicGroup, modelId, transforms, mainMat, trimMat, steelCap, darkMetal, perf);

    const endT = transforms[transforms.length - 1];
    const endR = [
      [endT[0][0], endT[0][1], endT[0][2]],
      [endT[1][0], endT[1][1], endT[1][2]],
      [endT[2][0], endT[2][1], endT[2][2]]
    ];

    addEndEffectorTool(v.dynamicGroup, pts[pts.length - 1], endR, steelCap, darkMetal, segs, sh);
    addTriad(v.dynamicGroup, pts[pts.length - 1], endR, 0.18, 0.005, segs);
  }

  v.controls.update();
  v.renderer.render(v.scene, v.camera);
}

export function renderEnergyPlot(ctx, canvas, history) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
