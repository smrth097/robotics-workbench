import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { forwardKinematics, computeJacobian, computeManipulability } from "./dynamics.js";
let vp = null;

export function initWorkbench3D(canvas, onTargetPick3D) {
  if (vp) return vp;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#080c14");
  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 60);
  camera.up.set(0, 0, 1);
  camera.position.set(1.55, -2.05, 1.45);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.target.set(0.45, 0.15, 0.25); controls.update();
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.35); keyLight.position.set(2.5, -2.2, 4.5); scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.45); fillLight.position.set(-2.5, 2.0, 1.8); scene.add(fillLight);
  const grid = new THREE.GridHelper(4.0, 20, 0x26354d, 0x131b29); grid.rotation.x = Math.PI / 2; scene.add(grid);
  const pickPlane = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 4.0), new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }));
  scene.add(pickPlane);
  const dynamicGroup = new THREE.Group(); scene.add(dynamicGroup);
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  let downPos = { x: 0, y: 0 };
  canvas.addEventListener("pointerdown", (e) => { downPos = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener("pointerup", (e) => {
    if (e.button !== 0 || Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 4) return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(pickPlane);
    if (hits.length > 0 && typeof onTargetPick3D === "function") onTargetPick3D(hits[0].point.x, hits[0].point.y);
  });
  vp = { renderer, scene, camera, controls, dynamicGroup };
  return vp;
}

function clearGroup(g) {
  while (g.children.length > 0) {
    const c = g.children[0]; g.remove(c);
    if (c.geometry) c.geometry.dispose();
    if (c.material) (Array.isArray(c.material) ? c.material : [c.material]).forEach((m) => m.dispose());
  }
}

function addTriad(group, originArr, R, length = 0.24, radius = 0.006) {
  const triad = new THREE.Group(); triad.position.set(...originArr);
  triad.quaternion.setFromRotationMatrix(new THREE.Matrix4().set(R[0][0],R[0][1],R[0][2],0, R[1][0],R[1][1],R[1][2],0, R[2][0],R[2][1],R[2][2],0, 0,0,0,1));
  const up = new THREE.Vector3(0, 1, 0);
  [[new THREE.Vector3(1,0,0), 0xf43f5e], [new THREE.Vector3(0,1,0), 0x34d399], [new THREE.Vector3(0,0,1), 0x38bdf8]].forEach(([dir, color]) => {
    const geom = new THREE.CylinderGeometry(radius*0.75, radius, length, 10); geom.translate(0, length*0.5, 0);
    const mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color }));
    mesh.quaternion.setFromUnitVectors(up, dir); triad.add(mesh);
  });
  group.add(triad);
}

function addLinkCylinder(group, a, b, radius, colorHex) {
  const p0 = new THREE.Vector3(...a), p1 = new THREE.Vector3(...b), delta = new THREE.Vector3().subVectors(p1, p0), len = delta.length();
  if (len < 1e-5) return;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius*0.88, radius, len, 18), new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.35, metalness: 0.25 }));
  mesh.position.copy(p0).addScaledVector(delta, 0.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  group.add(mesh);
}

function addSphere(group, pos, radius, colorHex, opacity = 1.0) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 18), new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.3, metalness: 0.2, transparent: opacity < 1, opacity }));
  mesh.position.set(...pos); group.add(mesh);
}

export function renderWorkbench3D(canvas, app, opts) {
  const { kind, R, p, transforms, armColor, ikTargetPos } = opts;
  const v = initWorkbench3D(canvas, opts.onTargetPick3D);
  const rect = canvas.getBoundingClientRect(), w = Math.max(1, Math.floor(rect.width)), h = Math.max(1, Math.floor(rect.height));
  if (canvas.width !== w || canvas.height !== h) { v.renderer.setSize(w, h, false); v.camera.aspect = w / h; v.camera.updateProjectionMatrix(); }
  clearGroup(v.dynamicGroup);
  addTriad(v.dynamicGroup, [0,0,0], [[1,0,0],[0,1,0],[0,0,1]], 0.32, 0.005);

  if (kind === "planar_2dof") {
    const { L1, L2 } = app.params, [q1, q2] = app.state, fk = forwardKinematics(q1, q2, L1, L2);
    const ring = new THREE.Mesh(new THREE.RingGeometry((L1+L2)*0.992, (L1+L2)*1.008, 64), new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.22 }));
    ring.position.z = -0.004; v.dynamicGroup.add(ring);
    if (app.obstacle.enabled) {
      const obsGeom = new THREE.CylinderGeometry(app.obstacle.r, app.obstacle.r, 0.28, 24); obsGeom.rotateX(Math.PI/2);
      const obs = new THREE.Mesh(obsGeom, new THREE.MeshStandardMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.45 }));
      obs.position.set(app.obstacle.x, app.obstacle.y, 0.14); v.dynamicGroup.add(obs);
    }
    if (app.showTrail && app.trail.length > 1) {
      v.dynamicGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(app.trail.map((pt) => new THREE.Vector3(pt.x, pt.y, 0.04))), new THREE.LineBasicMaterial({ color: 0x34d399 })));
    }
    addSphere(v.dynamicGroup, [app.target.x, app.target.y, 0.04], 0.055, 0xf59e0b);
    addLinkCylinder(v.dynamicGroup, [0,0,0.04], [fk.x1,fk.y1,0.04], 0.042, 0x38bdf8);
    addLinkCylinder(v.dynamicGroup, [fk.x1,fk.y1,0.04], [fk.x2,fk.y2,0.04], 0.034, 0x818cf8);
    addSphere(v.dynamicGroup, [0,0,0.04], 0.065, 0xe2e8f0);
    addSphere(v.dynamicGroup, [fk.x1,fk.y1,0.04], 0.055, 0x38bdf8);
    addSphere(v.dynamicGroup, [fk.x2,fk.y2,0.04], 0.048, 0x34d399);
    if (app.showEllipse) {
      const ell = computeManipulability(computeJacobian(q1, q2, L1, L2));
      const ellGeom = new THREE.SphereGeometry(1, 24, 24);
      ellGeom.scale(Math.max(0.03, ell.rx*0.28), Math.max(0.03, ell.ry*0.28), 0.08);
      const ellMesh = new THREE.Mesh(ellGeom, new THREE.MeshStandardMaterial({ color: ell.index < 0.15 ? 0xf43f5e : 0x34d399, transparent: true, opacity: 0.28 }));
      ellMesh.position.set(fk.x2, fk.y2, 0.06); ellMesh.rotation.z = -ell.angle; v.dynamicGroup.add(ellMesh);
    }
  } else if (kind === "frame") {
    addLinkCylinder(v.dynamicGroup, [0,0,0], p, 0xf59e0b, 0.008);
    addSphere(v.dynamicGroup, p, 0.028, 0xf59e0b);
    addTriad(v.dynamicGroup, p, R, 0.42, 0.007);
  } else if (kind === "dh" && Array.isArray(transforms) && transforms.length > 1) {
    const pts = transforms.map((T) => [T[0][3], T[1][3], T[2][3]]), hex = new THREE.Color(armColor || "#ff6600").getHex();
    if (Array.isArray(ikTargetPos)) addSphere(v.dynamicGroup, ikTargetPos, 0.032, 0xf59e0b, 0.85);
    for (let i = 0; i < pts.length - 1; i++) addLinkCylinder(v.dynamicGroup, pts[i], pts[i+1], 0.024, hex);
    pts.forEach((pt, idx) => addSphere(v.dynamicGroup, pt, idx === pts.length - 1 ? 0.038 : 0.028, idx === pts.length - 1 ? 0x34d399 : 0xe2e8f0));
    const endT = transforms[transforms.length - 1];
    addTriad(v.dynamicGroup, pts[pts.length - 1], [[endT[0][0],endT[0][1],endT[0][2]],[endT[1][0],endT[1][1],endT[1][2]],[endT[2][0],endT[2][1],endT[2][2]]], 0.18, 0.005);
  }
  v.controls.update(); v.renderer.render(v.scene, v.camera);
}

export function renderEnergyPlot(ctx, canvas, history) {
  const dpr = window.devicePixelRatio || 1, rect = canvas.getBoundingClientRect();
  if (canvas.width !== rect.width*dpr || canvas.height !== rect.height*dpr) { canvas.width = rect.width*dpr; canvas.height = rect.height*dpr; }
  const w = rect.width, h = rect.height;
  ctx.save(); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h);
  if (history.length < 2) { ctx.restore(); return; }
  const maxE = Math.max(1, ...history.map((d) => d.E));
  [["K","#38bdf8"],["P","#f59e0b"],["E","#34d399"]].forEach(([key, color]) => {
    ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.beginPath();
    history.forEach((pt, i) => {
      const x = (i / (history.length - 1)) * w, y = h - 8 - (pt[key] / maxE) * (h - 16);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
  ctx.restore();
}
