/* ============================================================
   VOICE — riconoscimento vocale (STT), sintesi vocale (TTS),
   wake word "Jarvis" e interruzione della risposta parlata.
   Usa le Web Speech API native del browser (supporto migliore
   su Safari/iOS con webkitSpeechRecognition dove disponibile).
   ============================================================ */

const JarvisVoice = (() => {
  // Stesso Worker usato per la chat: gestisce anche l'endpoint TTS (Google TTS,
  // stessa voce del JARVIS desktop). Deve combaciare con AI_ENDPOINT in ai.js.
  const TTS_ENDPOINT = "https://jarvis-portatile.salvatorecaciopppo4000.workers.dev/api/chat";

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

  // ---- TTS: voce cloud (stessa del JARVIS desktop) con fallback alla voce di sistema ----
  let currentUtterance = null;
  let vociCaricate = false;
  let voceScelta = null;
  let audioQueue = [];
  let audioCorrente = null;
  let interrotto = false;

  function scegliVoceMigliore() {
    const voci = speechSynthesis.getVoices();
    if (!voci.length) return null;
    const italiane = voci.filter((v) => v.lang && v.lang.toLowerCase().startsWith("it"));
    const pool = italiane.length ? italiane : voci;
    const scarti = /compact|eloquence/i;
    const buone = pool.filter((v) => !scarti.test(v.name));
    const direzione = buone.length ? buone : pool;
    const premium = direzione.find((v) => /enhanced|premium|neural|siri/i.test(v.name));
    const nonLocali = direzione.find((v) => v.localService === false);
    return premium || nonLocali || direzione[0];
  }

  function caricaVoci() {
    if (!("speechSynthesis" in window)) return;
    voceScelta = scegliVoceMigliore();
    vociCaricate = !!voceScelta;
  }

  if ("speechSynthesis" in window) {
    caricaVoci();
    speechSynthesis.onvoiceschanged = caricaVoci;
  }

  function speakWebSpeech(testo, onEnd) {
    if (!("speechSynthesis" in window)) {
      onEnd && onEnd();
      return;
    }
    if (!vociCaricate) caricaVoci();
    const utter = new SpeechSynthesisUtterance(testo);
    utter.lang = "it-IT";
    if (voceScelta) utter.voice = voceScelta;
    utter.rate = 1.0;
    utter.pitch = 1.0;
    utter.onend = () => {
      currentUtterance = null;
      onEnd && onEnd();
    };
    currentUtterance = utter;
    speechSynthesis.speak(utter);
  }

  async function playQueue(onEnd) {
    for (const b64 of audioQueue) {
      if (interrotto) break;
      await new Promise((resolve) => {
        const audio = new Audio("data:audio/mpeg;base64," + b64);
        audioCorrente = audio;
        audio.onended = resolve;
        audio.onerror = resolve;
        audio.play().catch(resolve);
      });
    }
    audioQueue = [];
    audioCorrente = null;
    if (!interrotto) onEnd && onEnd();
  }

  async function speak(testo, onEnd) {
    interrupt();
    interrotto = false;

    if (!TTS_ENDPOINT || TTS_ENDPOINT.includes("TUO-WORKER")) {
      speakWebSpeech(testo, onEnd);
      return;
    }

    try {
      const res = await fetch(TTS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tts: testo }),
      });
      if (!res.ok) throw new Error("TTS HTTP " + res.status);
      const data = await res.json();
      if (!data.audio || !data.audio.length) throw new Error("Nessun audio ricevuto");
      audioQueue = data.audio;
      playQueue(onEnd);
    } catch (e) {
      speakWebSpeech(testo, onEnd); // fallback se il Worker/Google TTS non risponde
    }
  }

  function interrupt() {
    interrotto = true;
    if (audioCorrente) {
      audioCorrente.pause();
      audioCorrente = null;
    }
    audioQueue = [];
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
