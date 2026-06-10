const DEFAULT_LANG = "es-AR";

export function speakFeedback(message) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return false;
  }

  const text = String(message || "").trim();
  if (!text) return false;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = DEFAULT_LANG;
  utterance.rate = 0.95;
  utterance.pitch = 1;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);

  return true;
}

export function stopFeedback() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return false;
  }

  window.speechSynthesis.cancel();
  return true;
}
