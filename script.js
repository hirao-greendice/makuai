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
  updateFullscreenLabel();
}
