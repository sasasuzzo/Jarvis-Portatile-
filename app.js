/* ============================================================
   APP — collega tutti i moduli: HUD, chat, voce, file, comandi,
   memoria. Gestisce il flusso di invio messaggio (testo o voce),
   il rilevamento della wake word "Jarvis" e l'interruzione TTS.
   ============================================================ */

const JarvisApp = (() => {
  const chatPanel = document.getElementById("chatPanel");
  const textInput = document.getElementById("textInput");
  const micBtn = document.getElementById("micBtn");

  function addMsg(role, testo, extraClass) {
    const div = document.createElement("div");
    div.className = "msg " + role + (extraClass ? " " + extraClass : "");
    const tag = role === "user" ? "TU" : role === "system" ? "" : "JARVIS";
    div.innerHTML = `${tag ? `<span class="tag">${tag}</span>` : ""}${escapeHtml(testo)}`;
    chatPanel.appendChild(div);
    chatPanel.scrollTop = chatPanel.scrollHeight;
    return div;
  }

  function addImageThumb(container, base64) {
    const img = document.createElement("img");
    img.src = base64;
    img.className = "thumb";
    container.appendChild(img);
  }

  function addSystemMessage(testo) {
    addMsg("system", testo);
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  async function inviaMessaggio(testo) {
    if (!testo || !testo.trim()) return;
    const allegato = JarvisFiles.getAttachment();

    const userMsg = addMsg("user", testo);
    if (allegato && allegato.isImage) addImageThumb(userMsg, allegato.base64);
    JarvisFiles.clearAttachment();
    textInput.value = "";

    // 1. prova prima un comando locale (ora, meteo, timer, ecc.)
    JarvisHUD.setState("thinking");
    const comando = allegato ? null : await JarvisCommands.tryHandle(testo);

    let risposta;
    if (comando) {
      risposta = comando.risposta;
    } else {
      risposta = await JarvisAI.chiedi(testo, allegato);
    }

    JarvisHUD.setState("speaking");
    addMsg("jarvis", risposta);
    JarvisVoice.speak(risposta, () => JarvisHUD.setState("standby"));

    // fallback nel caso TTS non sia disponibile
    if (!("speechSynthesis" in window)) {
      setTimeout(() => JarvisHUD.setState("standby"), 1200);
    }
  }

  function initTextInput() {
    textInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && textInput.value.trim()) {
        JarvisVoice.interrupt();
        inviaMessaggio(textInput.value.trim());
      }
    });
  }

  function initMic() {
    if (!JarvisVoice.supported()) {
      micBtn.style.opacity = "0.35";
      micBtn.title = "Riconoscimento vocale non supportato su questo browser";
      return;
    }
    micBtn.addEventListener("click", () => {
      JarvisVoice.interrupt();
      micBtn.classList.add("on");
      JarvisHUD.setState("listening");
      JarvisVoice.startListening((testo) => {
        micBtn.classList.remove("on");
        inviaMessaggio(testo);
      });
      // sblocca il pulsante anche se non arriva nessun risultato
      setTimeout(() => {
        if (JarvisHUD.state === "listening") {
          micBtn.classList.remove("on");
          JarvisVoice.stopListening();
          JarvisHUD.setState("standby");
        }
      }, 8000);
    });
  }

  async function initWakeWord() {
    // Wake word passiva: opzionale, va abilitata esplicitamente
    // (su iOS/Safari il riconoscimento continuo in background ha
    // limitazioni: qui resta disponibile ma non forzata all'avvio).
    const profile = await JarvisMemory.getProfile();
    if (profile.preferenze && profile.preferenze.wakeWord) {
      JarvisVoice.enableWakeWord(() => {
        JarvisHUD.setState("listening");
        JarvisVoice.startListening((testo) => inviaMessaggio(testo));
      });
    }
  }

  async function init() {
    initTextInput();
    initMic();
    await initWakeWord();
  }

  init();

  return { addSystemMessage };
})();

window.JarvisApp = JarvisApp;
