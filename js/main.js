import { RAD2DEG, eulerZYXToMatrix, matrixToQuaternion, quaternionToAxisAngle, computeDHChain } from "./math.js";
import { forwardKinematics, inverseKinematics, computeJacobian, computeManipulability, computeDynamicsMatrices, computeEnergies, stepRK4 } from "./dynamics.js";
import { computeControlTorque } from "./controllers.js";
import { sampleTrajectory } from "./trajectory.js";
import { renderWorkbench3D, renderEnergyPlot } from "./workbench3d.js";
import { ROBOT_PRESETS } from "./robots.js";
import { loadNeuralIK, predictABBJointsDeg } from "./neural_ik.js";

const app = { paused:false, elbowUp:false, showEllipse:true, showTrail:true, simTime:0, trajMode:"manual", params:{m1:1.5,m2:1.0,L1:1.0,L2:0.85,g:9.81,b:0.15}, ctrl:{mode:"pdg",kp:60,kd:14}, state:[0.5,0.6,0,0], manualTarget:{x:1.1,y:0.7}, target:{x:1.1,y:0.7}, obstacle:{enabled:false,x:0.95,y:0.45,r:0.24}, trail:[], energyHistory:[], lastTau:[0,0], modelKey:"planar_2dof", jointValues:[], neuralIKModel:null, nikTarget:[0.35,0.10,0.35], nikActive:false };
const canvas3D = document.getElementById("canvas-3d"), canvasPlot = document.getElementById("canvas-plot"), ctxPlot = canvasPlot.getContext("2d");
const onJointJog = (jointIdx, deltaPixels) => {
  const preset = ROBOT_PRESETS[app.modelKey];
  const joints = Array.isArray(preset?.joints) ? preset.joints : [];
  const joint = joints[jointIdx];
  if (!joint) return;
  if (!Array.isArray(app.jointValues) || app.jointValues.length !== joints.length) {
    app.jointValues = joints.map((j) => (j.isPrismatic ? Number(j.minDeg ?? 0) : 0));
  }
  const minV = Number(joint.minDeg ?? -180);
  const maxV = Number(joint.maxDeg ?? 180);
  const curV = Number(app.jointValues[jointIdx] ?? 0);
  const stepDelta = joint.isPrismatic ? deltaPixels * 0.003 : deltaPixels * 1.1;
  const nextVal = Math.min(maxV, Math.max(minV, curV + stepDelta));
  app.jointValues[jointIdx] = nextVal;
  app.nikActive = false;
  window.__jogDebug = { jointIdx, deltaPixels, nextVal, modelKey: app.modelKey, jointValues: [...app.jointValues] };
  const rows = document.querySelectorAll("#arm-sliders .slider-row");
  const row = rows[jointIdx];
  if (row) {
    const input = row.querySelector("input");
    const span = row.querySelector("span");
    if (input) {
      input.value = String(nextVal);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (span) span.textContent = joint.isPrismatic ? `${nextVal.toFixed(3)} m` : `${Math.round(nextVal)}°`;
  }
};
loadNeuralIK().then((m) => { app.neuralIKModel = m; document.getElementById("nik-status").textContent = `Loaded ${m.model}.`; }).catch(() => {});

function switchTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach((el) => el.classList.toggle("active", el.dataset.tab === tabName));
  document.querySelectorAll("main").forEach((el) => el.classList.remove("active"));
  document.getElementById(`tab-${tabName}`).classList.add("active");
}
document.querySelectorAll(".tab-btn").forEach((btn) => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));
document.getElementById("btn-pause").onclick = (e) => { app.paused = !app.paused; e.target.textContent = app.paused ? "Resume" : "Pause"; };
document.getElementById("btn-reset").onclick = () => { app.state = [0.6,-0.5,0,0]; app.simTime = 0; app.trail = []; app.energyHistory = []; app.nikActive = false; };
document.getElementById("btn-elbow").onclick = (e) => { app.elbowUp = !app.elbowUp; e.target.textContent = `Config: ${app.elbowUp ? "Elbow Up" : "Elbow Down"}`; };
document.getElementById("chk-ellipse").onchange = (e) => (app.showEllipse = e.target.checked);
document.getElementById("chk-trail").onchange = (e) => (app.showTrail = e.target.checked);
document.getElementById("chk-obstacle").onchange = (e) => (app.obstacle.enabled = e.target.checked);
document.getElementById("ctrl-mode").onchange = (e) => (app.ctrl.mode = e.target.value);
document.getElementById("traj-mode").onchange = (e) => { app.trajMode = e.target.value; app.trail = []; };

const bindSlider = (id, lblId, fmt, cb) => { const el = document.getElementById(id); el.addEventListener("input", () => { const val = parseFloat(el.value); document.getElementById(lblId).textContent = fmt(val); cb(val); }); };
bindSlider("sl-kp", "lbl-kp", (v) => v, (v) => (app.ctrl.kp = v));
bindSlider("sl-kd", "lbl-kd", (v) => v, (v) => (app.ctrl.kd = v));
bindSlider("sl-m2", "lbl-mass", (v) => `1.5 / ${v.toFixed(1)}`, (v) => (app.params.m2 = v));
bindSlider("sl-g", "lbl-g", (v) => v.toFixed(2), (v) => (app.params.g = v));
bindSlider("sl-b", "lbl-b", (v) => v.toFixed(2), (v) => (app.params.b = v));
["yaw","pitch","roll"].forEach((k) => document.getElementById(`sl-${k}`).addEventListener("input", (e) => { document.getElementById(`lbl-${k}`).textContent = `${e.target.value}°`; }));
["px","py","pz"].forEach((k) => document.getElementById(`sl-${k}`).addEventListener("input", (e) => { document.getElementById(`lbl-${k}`).textContent = parseFloat(e.target.value).toFixed(1); }));
["x","y","z"].forEach((axis, i) => document.getElementById(`sl-nik-${axis}`).addEventListener("input", (e) => { const val = parseFloat(e.target.value); app.nikTarget[i] = val; document.getElementById(`lbl-nik-${axis}`).textContent = val.toFixed(2); }));

document.getElementById("btn-run-neural-ik").onclick = () => {
  if (!app.neuralIKModel) return;
  app.jointValues = predictABBJointsDeg(app.neuralIKModel, app.nikTarget);
  app.nikActive = true;
  const inputs = document.querySelectorAll("#arm-sliders input"), spans = document.querySelectorAll("#arm-sliders label span");
  app.jointValues.forEach((v, idx) => { if (inputs[idx]) inputs[idx].value = v; if (spans[idx]) spans[idx].textContent = `${Math.round(v)}°`; });
};

function buildArmSliders(presetKey) {
  const preset = ROBOT_PRESETS[presetKey], container = document.getElementById("arm-sliders");
  container.innerHTML = "";
  app.jointValues = (Array.isArray(preset?.joints) ? preset.joints : []).map((j) => (j.isPrismatic ? j.minDeg : 0));
  (Array.isArray(preset?.joints) ? preset.joints : []).forEach((j, idx) => {
    const row = document.createElement("div"); row.className = "slider-row";
    const step = j.isPrismatic ? 0.005 : 1, initVal = app.jointValues[idx], fmtVal = (v) => (j.isPrismatic ? `${v.toFixed(3)} m` : `${Math.round(v)}°`);
    row.innerHTML = `<label>${j.name} <span>${fmtVal(initVal)}</span></label><input type="range" min="${j.minDeg}" max="${j.maxDeg}" step="${step}" value="${initVal}" />`;
    const input = row.querySelector("input"), span = row.querySelector("span");
    input.addEventListener("input", () => { const v = parseFloat(input.value); app.jointValues[idx] = v; app.nikActive = false; span.textContent = fmtVal(v); });
    container.appendChild(row);
  });
}

function applyModelUI(key) {
  app.modelKey = key; document.getElementById("robot-model").value = key;
  const preset = ROBOT_PRESETS[key], is2D = preset.kind === "planar_2dof", isDH = preset.kind === "dh", isFrame = preset.kind === "frame";
  document.getElementById("bench-title").textContent = `3D Workbench — ${preset.label}`;
  document.getElementById("model-desc").textContent = preset.description;
  document.getElementById("panel-2dof-controls").style.display = is2D ? "block" : "none";
  document.getElementById("panel-dh-controls").style.display = isDH ? "block" : "none";
  document.getElementById("panel-frame-controls").style.display = isFrame ? "block" : "none";
  document.getElementById("panel-neural-ik").style.display = key === "abb_irb120" ? "block" : "none";
  document.getElementById("btn-elbow").style.display = is2D ? "inline-block" : "none";
  document.getElementById("wrap-ellipse").style.display = is2D ? "inline-flex" : "none";
  document.getElementById("wrap-trail").style.display = is2D ? "inline-flex" : "none";
  document.getElementById("wrap-obstacle").style.display = is2D ? "inline-flex" : "none";
  document.getElementById("btn-gimbal").style.display = isFrame ? "inline-block" : "none";
  document.getElementById("btn-zero-pose").style.display = (isDH || isFrame) ? "inline-block" : "none";
  if (key !== "abb_irb120") app.nikActive = false;
  if (isDH) buildArmSliders(key);
}

document.getElementById("robot-model").addEventListener("change", (e) => applyModelUI(e.target.value));
document.getElementById("btn-gimbal").onclick = () => { document.getElementById("sl-pitch").value = 90; document.getElementById("lbl-pitch").textContent = "90°"; };
document.getElementById("btn-zero-pose").onclick = () => {
  if (app.modelKey === "frame") ["yaw","pitch","roll"].forEach((k) => { document.getElementById(`sl-${k}`).value = 0; document.getElementById(`lbl-${k}`).textContent = "0°"; });
  else if (ROBOT_PRESETS[app.modelKey].kind === "dh") { app.nikActive = false; buildArmSliders(app.modelKey); }
};

document.querySelectorAll("[data-demo]").forEach((btn) => btn.addEventListener("click", () => {
  const d = btn.dataset.demo;
  if (d === "free_fall") { applyModelUI("planar_2dof"); app.ctrl.mode = "free"; app.params.b = 0; app.state = [0.9,0.8,0,0]; document.getElementById("ctrl-mode").value = "free"; }
  else if (d === "gravity_sag") { applyModelUI("planar_2dof"); app.ctrl.mode = "pd"; app.ctrl.kp = 35; app.manualTarget = {x:1.2,y:0.4}; document.getElementById("ctrl-mode").value = "pd"; }
  else if (d === "elbow_branches") { applyModelUI("planar_2dof"); app.ctrl.mode = "pdg"; app.manualTarget = {x:0.9,y:0.7}; }
  else if (d === "singularity_demo") { applyModelUI("planar_2dof"); app.ctrl.mode = "pdg"; app.manualTarget = {x:1.84,y:0}; }
  else if (d === "spatial_3dof") applyModelUI("spatial_3dof");
  else if (d === "abb_demo") { applyModelUI("abb_irb120"); document.getElementById("btn-run-neural-ik").click(); }
  else if (d === "scara_demo") applyModelUI("scara_rrpr");
  else if (d === "gimbal_lock") { applyModelUI("frame"); document.getElementById("sl-pitch").value = 90; document.getElementById("lbl-pitch").textContent = "90°"; }
  switchTab("bench");
}));

function onTargetPick3D(x, y) { if (app.modelKey === "planar_2dof") { app.manualTarget = {x,y}; if (app.trajMode === "manual") app.target = {x,y}; } }
applyModelUI("planar_2dof");

function loop() {
  if (!app.paused) {
    app.simTime += 1/60;
    app.target = sampleTrajectory(app.trajMode, app.simTime, app.manualTarget, app.params.L1, app.params.L2);
    let effX = app.target.x, effY = app.target.y;
    if (app.obstacle.enabled) {
      const dx = effX - app.obstacle.x, dy = effY - app.obstacle.y, dist = Math.hypot(dx, dy), safeR = app.obstacle.r + 0.08;
      if (dist < safeR && dist > 1e-5) { effX = app.obstacle.x + (dx/dist)*safeR; effY = app.obstacle.y + (dy/dist)*safeR; }
    }
    const [qd1, qd2] = inverseKinematics(effX, effY, app.params.L1, app.params.L2, app.elbowUp);
    for (let i = 0; i < 8; i++) {
      app.state = stepRK4(app.state, (1/60)/8, app.params, (q1, q2, dq1, dq2, M, C, G) => {
        const tau = computeControlTorque({ mode:app.ctrl.mode, q1, q2, dq1, dq2, qd1, qd2, kp:app.ctrl.kp, kd:app.ctrl.kd, M, C, G });
        app.lastTau = tau; return tau;
      });
    }
    const [q1, q2, dq1, dq2] = app.state, fk = forwardKinematics(q1, q2, app.params.L1, app.params.L2);
    app.trail.push({ x: fk.x2, y: fk.y2 }); if (app.trail.length > 140) app.trail.shift();
    app.energyHistory.push(computeEnergies(q1, q2, dq1, dq2, app.params)); if (app.energyHistory.length > 180) app.energyHistory.shift();
  }
  const preset = ROBOT_PRESETS[app.modelKey];
  if (preset.kind === "planar_2dof") {
    renderWorkbench3D(canvas3D, app, { kind: "planar_2dof", onTargetPick3D });
    renderEnergyPlot(ctxPlot, canvasPlot, app.energyHistory);
    const [q1, q2, dq1, dq2] = app.state, fk = forwardKinematics(q1, q2, app.params.L1, app.params.L2);
    const J = computeJacobian(q1, q2, app.params.L1, app.params.L2), manip = computeManipulability(J);
    const { M, G } = computeDynamicsMatrices(q1, q2, dq1, dq2, app.params);
    document.getElementById("st1-lbl").textContent = "Joints θ₁/θ₂"; document.getElementById("st1-val").textContent = `${(q1*RAD2DEG).toFixed(1)}° / ${(q2*RAD2DEG).toFixed(1)}°`;
    document.getElementById("st2-lbl").textContent = "Tip (x, y)"; document.getElementById("st2-val").textContent = `${fk.x2.toFixed(2)}, ${fk.y2.toFixed(2)} m`;
    document.getElementById("st3-lbl").textContent = "Torques"; document.getElementById("st3-val").textContent = `${app.lastTau[0].toFixed(2)}, ${app.lastTau[1].toFixed(2)} N·m`;
    document.getElementById("st4-lbl").textContent = "Manipulability"; document.getElementById("st4-val").textContent = `${manip.index.toFixed(3)}`;
    document.getElementById("st5-lbl").textContent = "Error"; document.getElementById("st5-val").textContent = `${Math.hypot(app.target.x-fk.x2, app.target.y-fk.y2).toFixed(3)} m`;
    document.getElementById("math-box").textContent = `M(θ)=[${M[0][0].toFixed(2)} ${M[0][1].toFixed(2)}; ${M[1][0].toFixed(2)} ${M[1][1].toFixed(2)}]\nG(θ)=[${G[0].toFixed(2)}, ${G[1].toFixed(2)}]\nκ(J)≈${manip.cond.toFixed(1)}`;
  } else if (preset.kind === "frame") {
    const yaw = +document.getElementById("sl-yaw").value, pitch = +document.getElementById("sl-pitch").value, roll = +document.getElementById("sl-roll").value;
    const p = [+document.getElementById("sl-px").value, +document.getElementById("sl-py").value, +document.getElementById("sl-pz").value];
    const R = eulerZYXToMatrix(yaw, pitch, roll), q = matrixToQuaternion(R), aa = quaternionToAxisAngle(q);
    renderWorkbench3D(canvas3D, app, { kind: "frame", R, p, onTargetPick3D });
    document.getElementById("st1-val").textContent = `${yaw}°, ${pitch}°, ${roll}°`;
    document.getElementById("st2-val").textContent = `${p[0].toFixed(2)}, ${p[1].toFixed(2)}, ${p[2].toFixed(2)} m`;
    document.getElementById("st3-val").textContent = `${aa.angleDeg.toFixed(1)}°`;
    document.getElementById("st4-val").textContent = `${q.w.toFixed(3)}`;
    document.getElementById("math-box").textContent = `Quat: [${q.w.toFixed(2)}, ${q.x.toFixed(2)}, ${q.y.toFixed(2)}, ${q.z.toFixed(2)}]${Math.abs(pitch)>=89?"\n⚠ GIMBAL LOCK":""}`;
  } else {
    document.getElementById("dh-table-box").textContent = (Array.isArray(preset?.joints) ? preset.joints : []).map((j,i) => `J${i+1}: a=${j.a} α=${j.alphaDeg}° d=${j.isPrismatic?(app.jointValues[i]||0):j.d} θ=${Math.round(j.isPrismatic?0:(app.jointValues[i]||0)+(j.thetaOffsetDeg||0))}°`).join("\n");
    const transforms = computeDHChain(preset.joints, app.jointValues), endT = transforms[transforms.length - 1];
    const p = [endT[0][3], endT[1][3], endT[2][3]], R = [[endT[0][0],endT[0][1],endT[0][2]],[endT[1][0],endT[1][1],endT[1][2]],[endT[2][0],endT[2][1],endT[2][2]]];
    renderWorkbench3D(canvas3D, app, { kind:"dh", R, p, transforms, armColor:preset.color, ikTargetPos:app.modelKey==="abb_irb120"&&app.nikActive?app.nikTarget:null, onTargetPick3D });
    document.getElementById("st1-val").textContent = `${(Array.isArray(preset?.joints) ? preset.joints.length : 0)}-DOF`;
    document.getElementById("st2-val").textContent = `${p[0].toFixed(2)}, ${p[1].toFixed(2)}, ${p[2].toFixed(2)} m`;
    document.getElementById("math-box").textContent = `Flange p = [${p[0].toFixed(3)}, ${p[1].toFixed(3)}, ${p[2].toFixed(3)}] m`;
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
