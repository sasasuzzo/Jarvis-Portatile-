/* ============================================================
   AI — comunicazione con il modello. NESSUNA API key qui dentro:
   il codice è pubblico su GitHub Pages, quindi ogni richiesta
   passa da un backend/proxy separato (es. lo stesso pattern
   Cloudflare Worker + Groq già usato negli altri tuoi progetti
   "jarvis-tascabile" e Modalità Macchina).

   Configura AI_ENDPOINT con l'URL del tuo Worker: lui tiene la
   chiave Groq lato server e inoltra la richiesta al modello.
   Il Worker si aspetta un body { messages, image? } e deve
   rispondere { reply: "testo" }.
   ============================================================ */

const JarvisAI = (() => {
  // <-- SOSTITUISCI con l'URL del tuo Cloudflare Worker proxy -->
  const AI_ENDPOINT = "https://jarvis-portatile.salvatorecaciopppo4000.workers.dev/";

  const SYSTEM_PROMPT =
    "Sei J.A.R.V.I.S, l'assistente AI personale di Salvo. Rispondi in italiano, " +
    "in modo conciso, elegante e leggermente formale (come Jarvis in Iron Man), " +
    "rivolgendoti a lui come 'signore' quando ha senso. Questa è la versione " +
    "tascabile (PWA), indipendente dal JARVIS desktop.";

  async function chiedi(testoUtente, allegato) {
    const history = await JarvisMemory.getHistory();
    const profile = await JarvisMemory.getProfile();

    const messages = [
      { role: "system", content: SYSTEM_PROMPT + (profile.nome ? ` L'utente si chiama ${profile.nome}.` : "") },
      ...history.map((h) => ({ role: h.ruolo, content: h.testo })),
      { role: "user", content: testoUtente },
    ];

    const body = { messages };
    if (allegato && allegato.isImage) {
      body.image = allegato.base64; // data:image/...;base64,....
    }

    try {
      const res = await fetch(AI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const risposta = data.reply || "Non ho ricevuto una risposta valida dal server, signore.";

      await JarvisMemory.pushHistory("user", testoUtente);
      await JarvisMemory.pushHistory("assistant", risposta);

      return risposta;
    } catch (e) {
      return "Non riesco a raggiungere il backend AI. Verifica che il Worker proxy sia configurato e online.";
    }
  }

  return { chiedi };
})();
