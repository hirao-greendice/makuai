const audioMap = {
  no: new Audio("no.mp3"),
  call: new Audio("call.mp3"),
  yes: new Audio("yes.mp3"),
};

let currentAudio = null;
let currentAudioButton = null;
let currentJudgeButton = null;

const overlay = document.getElementById("judge-overlay");
const hiddenClose = document.querySelector(".hidden-close");
const fullscreenToggle = document.getElementById("fullscreen-toggle");
const fullscreenRoot = document.documentElement;
const judgeImageLayer = document.querySelector(".judge-image-layer");
const judgeImage = document.querySelector(".judge-image");
const imageCaret = document.querySelector(".image-caret");

const stopCurrentAudio = () => {
  if (!currentAudio) {
    return;
  }
  currentAudio.pause();
  currentAudio.currentTime = 0;
  currentAudio = null;
  currentAudioButton = null;
};

Object.values(audioMap).forEach((audio) => {
  audio.addEventListener("ended", () => {
    if (currentAudio === audio) {
      currentAudio = null;
      currentAudioButton = null;
    }
  });
});

const openJudgeOverlay = (button) => {
  if (!document.fullscreenElement && fullscreenRoot.requestFullscreen) {
    fullscreenRoot.requestFullscreen().catch(() => {});
  }
  overlay.classList.add("is-visible");
  overlay.setAttribute("aria-hidden", "false");
  button.classList.add("is-active");
  currentJudgeButton = button;
  requestAnimationFrame(updateCaretPosition);
};

const closeJudgeOverlay = () => {
  overlay.classList.remove("is-visible");
  overlay.setAttribute("aria-hidden", "true");
};

document.querySelectorAll("[data-sound]").forEach((button) => {
  button.addEventListener("click", () => {
    const isActive = button.classList.contains("is-active");
    if (isActive) {
      if (currentAudioButton === button) {
        stopCurrentAudio();
      }
      button.classList.remove("is-active");
      return;
    }

    button.classList.add("is-active");
    if (currentAudioButton && currentAudioButton !== button) {
      stopCurrentAudio();
    }

    const soundKey = button.dataset.sound;
    const audio = audioMap[soundKey];
    if (!audio) {
      return;
    }
    currentAudio = audio;
    currentAudioButton = button;
    audio.currentTime = 0;
    audio.play();
  });
});

document.querySelectorAll("[data-judge]").forEach((button) => {
  button.addEventListener("click", () => {
    const isActive = button.classList.contains("is-active");
    if (isActive) {
      button.classList.remove("is-active");
      if (currentJudgeButton === button && overlay.classList.contains("is-visible")) {
        closeJudgeOverlay();
      }
      if (currentJudgeButton === button) {
        currentJudgeButton = null;
      }
      return;
    }

    openJudgeOverlay(button);
  });
});

let closeTapCount = 0;
let closeTapTimer = null;

const resetCloseTap = () => {
  closeTapCount = 0;
  if (closeTapTimer) {
    clearTimeout(closeTapTimer);
    closeTapTimer = null;
  }
};

if (hiddenClose) {
  hiddenClose.addEventListener("click", () => {
    closeTapCount += 1;
    if (closeTapCount >= 2) {
      resetCloseTap();
      closeJudgeOverlay();
      return;
    }
    if (closeTapTimer) {
      clearTimeout(closeTapTimer);
    }
    closeTapTimer = setTimeout(resetCloseTap, 500);
  });
}

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

const updateCaretPosition = () => {
  if (!judgeImageLayer || !judgeImage || !imageCaret) {
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

  const styles = getComputedStyle(judgeImageLayer);
  const caretX = parsePercent(styles.getPropertyValue("--caret-x"), 0.3);
  const caretY = parsePercent(styles.getPropertyValue("--caret-y"), 0.45);
  const caretHeight = parseLength(styles.getPropertyValue("--caret-height"), {
    type: "percent",
    value: 0.18,
  });
  const caretWidth = parseLength(styles.getPropertyValue("--caret-width"), {
    type: "px",
    value: 2,
  });

  const left = offsetX + renderedWidth * caretX;
  const top = offsetY + renderedHeight * caretY;
  const heightPx =
    caretHeight.type === "percent"
      ? renderedHeight * caretHeight.value
      : caretHeight.value;
  const widthPx =
    caretWidth.type === "percent"
      ? renderedWidth * caretWidth.value
      : caretWidth.value;

  imageCaret.style.left = `${left}px`;
  imageCaret.style.top = `${top}px`;
  imageCaret.style.height = `${heightPx}px`;
  imageCaret.style.width = `${widthPx}px`;
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
  document.addEventListener("fullscreenchange", updateCaretPosition);
  updateFullscreenLabel();
}

if (judgeImage) {
  if (judgeImage.complete) {
    updateCaretPosition();
  } else {
    judgeImage.addEventListener("load", updateCaretPosition);
  }
}

window.addEventListener("resize", updateCaretPosition);
