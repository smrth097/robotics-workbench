export function detectHardwareProfile() {
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  const reducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let autoTier = "balanced";
  if (reducedMotion || cores <= 2 || mem <= 2) {
    autoTier = "low";
  } else if (cores >= 8 && mem >= 8 && !reducedMotion) {
    autoTier = "high";
  }

  return { cores, mem, reducedMotion, autoTier };
}

export function getPerfConfig(mode = "auto") {
  const hw = detectHardwareProfile();
  const tier = mode === "auto" ? hw.autoTier : mode;

  if (tier === "low" || tier === "eco") {
    return {
      tier: "low",
      label: mode === "auto" ? `Auto (Eco · ${hw.cores}c)` : "Eco",
      maxDpr: 1.0,
      shadows: false,
      shadowMapSize: 512,
      fog: false,
      antialias: false,
      curveSegments: 12,
      trailMax: 60,
      targetFps: 30,
      plotEveryNFrames: 3
    };
  }

  if (tier === "high") {
    return {
      tier: "high",
      label: mode === "auto" ? `Auto (High · ${hw.cores}c)` : "High",
      maxDpr: Math.min(window.devicePixelRatio || 1, 2.0),
      shadows: true,
      shadowMapSize: 1024,
      fog: true,
      antialias: true,
      curveSegments: 24,
      trailMax: 220,
      targetFps: 60,
      plotEveryNFrames: 1
    };
  }

  return {
    tier: "balanced",
    label: mode === "auto" ? `Auto (Balanced · ${hw.cores}c)` : "Balanced",
    maxDpr: Math.min(window.devicePixelRatio || 1, 1.5),
    shadows: true,
    shadowMapSize: 512,
    fog: true,
    antialias: true,
    curveSegments: 16,
    trailMax: 120,
    targetFps: 60,
    plotEveryNFrames: 2
  };
}
