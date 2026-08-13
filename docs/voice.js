/* ============================================================
   VOICE — riconoscimento vocale (STT), sintesi vocale (TTS),
   wake word "Jarvis" e interruzione della risposta parlata.
   Usa le Web Speech API native del browser (supporto migliore
   su Safari/iOS con webkitSpeechRecognition dove disponibile).
   ============================================================ */

const JarvisVoice = (() => {
  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let listening = false;
  let wakeWordMode = false;
  let onResultCallback = null;
  let onWakeCallback = null;

  function supported() {
    return !!SpeechRecognitionAPI;
  }

  function initRecognition() {
    if (!supported() || recognition) return;
    recognition = new SpeechRecognitionAPI();
    recognition.lang = "it-IT";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const testo = event.results[event.results.length - 1][0].transcript.trim();
      if (wakeWordMode) {
        if (/\bjarvis\b/i.test(testo)) {
          wakeWordMode = false;
          onWakeCallback && onWakeCallback();
        } else {
          // resta in ascolto passivo della wake word
          restartWakeListening();
        }
        return;
      }
      onResultCallback && onResultCallback(testo);
    };

    recognition.onerror = () => {
      listening = false;
      if (wakeWordMode) restartWakeListening();
    };

    recognition.onend = () => {
      listening = false;
      if (wakeWordMode) restartWakeListening();
    };
  }

  function restartWakeListening() {
    setTimeout(() => {
      if (wakeWordMode && !listening) startListening();
    }, 400);
  }

  function startListening(callback) {
    if (!supported()) return false;
    initRecognition();
    if (callback) onResultCallback = callback;
    if (listening) return true;
    try {
      recognition.start();
      listening = true;
      return true;
    } catch (e) {
      return false;
    }
  }

  function stopListening() {
    if (recognition && listening) {
      recognition.stop();
      listening = false;
    }
  }

  function enableWakeWord(onWake) {
    if (!supported()) return false;
    wakeWordMode = true;
    onWakeCallback = onWake;
    initRecognition();
    startListening();
    return true;
  }

  function disableWakeWord() {
    wakeWordMode = false;
    stopListening();
  }

  // ---- TTS ----
  let currentUtterance = null;

  function speak(testo, onEnd) {
    if (!("speechSynthesis" in window)) return;
    interrupt();
    const utter = new SpeechSynthesisUtterance(testo);
    utter.lang = "it-IT";
    utter.rate = 1.02;
    utter.pitch = 0.9;
    utter.onend = () => {
      currentUtterance = null;
      onEnd && onEnd();
    };
    currentUtterance = utter;
    speechSynthesis.speak(utter);
  }

  function interrupt() {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    currentUtterance = null;
  }

  return {
    supported,
    startListening,
    stopListening,
    enableWakeWord,
    disableWakeWord,
    speak,
    interrupt,
    get listening() { return listening; },
  };
})();
