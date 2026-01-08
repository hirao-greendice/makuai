const ASSET_VERSION = "20260108-2";

const withCacheBuster = (path) => `${path}?v=${ASSET_VERSION}`;

const audioMap = {
  no: new Audio(withCacheBuster("no.mp3")),
  call: new Audio(withCacheBuster("call.mp3")),
  yes: new Audio(withCacheBuster("yes.mp3")),
};

const audioLevels = {
  no: 1.3,
  call: 0.8,
  yes: 1.1,
};

const audioMix = {
  context: null,
  nodes: new Map(),
};

// Use Web Audio to allow gain above 1.0.
const ensureAudioContext = () => {
  if (audioMix.context) {
    return audioMix.context;
  }
  const AudioContextRef = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextRef) {
    Object.entries(audioMap).forEach(([key, audio]) => {
      const level = audioLevels[key] ?? 1;
      audio.volume = Math.min(1, level);
    });
    return null;
  }
  const context = new AudioContextRef();
  audioMix.context = context;

  Object.entries(audioMap).forEach(([key, audio]) => {
    try {
      const source = context.createMediaElementSource(audio);
      const gain = context.createGain();
      gain.gain.value = audioLevels[key] ?? 1;
      source.connect(gain);
      gain.connect(context.destination);
      audioMix.nodes.set(audio, { source, gain });
    } catch (error) {
      const level = audioLevels[key] ?? 1;
      audio.volume = Math.min(1, level);
    }
  });

  return context;
};

let currentAudio = null;
let currentAudioTrigger = null;

const overlay = document.getElementById("judge-overlay");
const hiddenCloseButtons = document.querySelectorAll(".hidden-close");
const fullscreenToggle = document.getElementById("fullscreen-toggle");
const fullscreenRoot = document.documentElement;
const judgeImageLayer = document.querySelector(".judge-image-layer");
const judgeImage = document.querySelector(".judge-image");
const imageAnchors = document.querySelectorAll("[data-anchor]");
const hotspotButtons = document.querySelectorAll("[data-hotspot]");
const emergencyPanel = document.querySelector(".emergency-panel");
const emergencyUnlockButton = document.getElementById("emergency-unlock");
const emergencyButtons = document.querySelectorAll(
  "[data-emergency-screen], [data-emergency-sound]"
);

const screenImages = {
  judge: "hantei.png",
  no: "hantei1.png",
  yes: "hantei2.png",
};

const preloadedImages = new Map();

const preloadAssets = () => {
  Object.values(audioMap).forEach((audio) => {
    audio.preload = "auto";
    audio.load();
  });

  Object.values(screenImages).forEach((src) => {
    if (preloadedImages.has(src)) {
      return;
    }
    const image = new Image();
    image.src = src;
    preloadedImages.set(src, image);
    if (image.decode) {
      image.decode().catch(() => {});
    }
  });
};

preloadAssets();

const stopCurrentAudio = () => {
  if (!currentAudio) {
    return;
  }
  currentAudio.pause();
  currentAudio.currentTime = 0;
  currentAudio = null;
  currentAudioTrigger = null;
};

Object.values(audioMap).forEach((audio) => {
  audio.addEventListener("ended", () => {
    if (currentAudio === audio) {
      currentAudio = null;
      currentAudioTrigger = null;
    }
  });
});

const setOverlayMode = (mode) => {
  if (!overlay) {
    return;
  }
  overlay.dataset.mode = mode;
  if (!judgeImage) {
    return;
  }
  const nextSrc = screenImages[mode] || screenImages.judge;
  if (judgeImage.getAttribute("src") !== nextSrc) {
    judgeImage.setAttribute("src", nextSrc);
  } else if (judgeImage.complete) {
    updateAnchors();
  }
};

const openOverlay = (mode) => {
  if (!document.fullscreenElement && fullscreenRoot.requestFullscreen) {
    fullscreenRoot.requestFullscreen().catch(() => {});
  }
  setOverlayMode(mode);
  overlay.classList.add("is-visible");
  overlay.setAttribute("aria-hidden", "false");
  requestAnimationFrame(updateAnchors);
};

const closeOverlay = () => {
  overlay.classList.remove("is-visible");
  overlay.setAttribute("aria-hidden", "true");
};

const playAudio = (soundKey, trigger) => {
  const audio = audioMap[soundKey];
  if (!audio) {
    return;
  }
  const context = ensureAudioContext();
  if (context && context.state === "suspended") {
    context.resume().catch(() => {});
  }
  if (currentAudio === audio && currentAudioTrigger === trigger) {
    stopCurrentAudio();
    return;
  }
  if (currentAudio) {
    stopCurrentAudio();
  }
  currentAudio = audio;
  currentAudioTrigger = trigger;
  audio.currentTime = 0;
  audio.play();
};

document.querySelectorAll("[data-sound]").forEach((button) => {
  button.addEventListener("click", () => {
    const isActive = button.classList.contains("is-active");
    if (isActive) {
      if (currentAudioTrigger === button) {
        stopCurrentAudio();
      }
      button.classList.remove("is-active");
      return;
    }

    button.classList.add("is-active");
    const soundKey = button.dataset.sound;
    playAudio(soundKey, button);
  });
});

document.querySelectorAll("[data-judge]").forEach((button) => {
  button.addEventListener("click", () => {
    openOverlay("judge");
  });
});

document.querySelectorAll("[data-screen]").forEach((button) => {
  button.addEventListener("click", () => {
    const mode = button.dataset.screen || "judge";
    openOverlay(mode);
  });
});

document.querySelectorAll("[data-emergency-screen]").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.disabled) {
      return;
    }
    const mode = button.dataset.emergencyScreen || "judge";
    openOverlay(mode);
  });
});

document.querySelectorAll("[data-emergency-sound]").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.disabled) {
      return;
    }
    const soundKey = button.dataset.emergencySound;
    playAudio(soundKey, button);
  });
});

const emergencyState = {
  lockTimeout: null,
};

const setEmergencyLocked = (locked) => {
  if (!emergencyPanel) {
    return;
  }
  if (locked && emergencyState.lockTimeout) {
    clearTimeout(emergencyState.lockTimeout);
    emergencyState.lockTimeout = null;
  }

  emergencyPanel.classList.toggle("is-unlocked", !locked);
  emergencyButtons.forEach((button) => {
    button.disabled = locked;
    button.setAttribute("aria-disabled", locked ? "true" : "false");
  });
};

const startEmergencyUnlock = () => {
  if (!emergencyPanel) {
    return;
  }
  if (emergencyState.lockTimeout) {
    clearTimeout(emergencyState.lockTimeout);
  }
  setEmergencyLocked(false);
  emergencyState.lockTimeout = setTimeout(() => {
    setEmergencyLocked(true);
  }, 10000);
};

if (emergencyUnlockButton) {
  emergencyUnlockButton.addEventListener("click", startEmergencyUnlock);
  setEmergencyLocked(true);
}

hiddenCloseButtons.forEach((button) => {
  button.addEventListener("click", () => {
    closeOverlay();
  });
});

const hotspotSoundMap = {
  "no-confirm": "no",
  "no-call": "call",
  "yes-confirm": "yes",
};

hotspotButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const key = hotspotSoundMap[button.dataset.hotspot];
    if (!key) {
      return;
    }
    playAudio(key, button);
  });
});

const parsePercent = (raw, fallback) => {
  if (!raw) {
    return fallback;
  }
  const value = raw.trim();
  if (value.endsWith("%")) {
    const num = parseFloat(value);
    return Number.isNaN(num) ? fallback : num / 100;
  }
  const num = parseFloat(value);
  if (Number.isNaN(num)) {
    return fallback;
  }
  return num <= 1 ? num : num / 100;
};

const parseLength = (raw, fallback) => {
  if (!raw) {
    return fallback;
  }
  const value = raw.trim();
  if (value.endsWith("%")) {
    const num = parseFloat(value);
    return Number.isNaN(num) ? fallback : { type: "percent", value: num / 100 };
  }
  const num = parseFloat(value);
  if (Number.isNaN(num)) {
    return fallback;
  }
  return { type: "px", value: num };
};

const updateAnchors = () => {
  if (!judgeImageLayer || !judgeImage || imageAnchors.length === 0) {
    return;
  }
  const layerRect = judgeImageLayer.getBoundingClientRect();
  if (layerRect.width === 0 || layerRect.height === 0) {
    return;
  }
  const naturalWidth = judgeImage.naturalWidth;
  const naturalHeight = judgeImage.naturalHeight;
  if (!naturalWidth || !naturalHeight) {
    return;
  }

  const scale = Math.min(
    layerRect.width / naturalWidth,
    layerRect.height / naturalHeight
  );
  const renderedWidth = naturalWidth * scale;
  const renderedHeight = naturalHeight * scale;
  const offsetX = (layerRect.width - renderedWidth) / 2;
  const offsetY = (layerRect.height - renderedHeight) / 2;

  imageAnchors.forEach((anchor) => {
    const styles = getComputedStyle(anchor);
    const anchorX = parsePercent(styles.getPropertyValue("--anchor-x"), 0);
    const anchorY = parsePercent(styles.getPropertyValue("--anchor-y"), 0);
    const anchorWidth = parseLength(styles.getPropertyValue("--anchor-width"), {
      type: "percent",
      value: 0,
    });
    const anchorHeight = parseLength(styles.getPropertyValue("--anchor-height"), {
      type: "percent",
      value: 0,
    });

    const left = offsetX + renderedWidth * anchorX;
    const top = offsetY + renderedHeight * anchorY;
    const widthPx =
      anchorWidth.type === "percent"
        ? renderedWidth * anchorWidth.value
        : anchorWidth.value;
    const heightPx =
      anchorHeight.type === "percent"
        ? renderedHeight * anchorHeight.value
        : anchorHeight.value;

    anchor.style.left = `${left}px`;
    anchor.style.top = `${top}px`;
    anchor.style.width = `${widthPx}px`;
    anchor.style.height = `${heightPx}px`;
  });
};

const updateFullscreenLabel = () => {
  if (!fullscreenToggle) {
    return;
  }
  fullscreenToggle.textContent = document.fullscreenElement
    ? "フルスクリーン解除"
    : "フルスクリーン";
};

if (fullscreenToggle) {
  fullscreenToggle.addEventListener("click", () => {
    if (!document.fullscreenElement && fullscreenRoot.requestFullscreen) {
      fullscreenRoot.requestFullscreen().catch(() => {});
      return;
    }
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  });
  document.addEventListener("fullscreenchange", updateFullscreenLabel);
  document.addEventListener("fullscreenchange", updateAnchors);
  updateFullscreenLabel();
} else {
  document.addEventListener("fullscreenchange", updateAnchors);
}

if (judgeImage) {
  if (judgeImage.complete) {
    updateAnchors();
  } else {
    judgeImage.addEventListener("load", updateAnchors);
  }
}

window.addEventListener("resize", updateAnchors);
