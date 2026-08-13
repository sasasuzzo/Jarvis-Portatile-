# J.A.R.V.I.S Portable

PWA tascabile, standalone, indipendente dal JARVIS desktop. Pubblicabile su
GitHub Pages e installabile su iPhone come app.

## Struttura

```
index.html
manifest.json
service-worker.js
css/jarvis.css
js/app.js        orchestrazione generale
js/hud.js        cerchio HUD animato (identico al pannello desktop)
js/voice.js      riconoscimento vocale + TTS + wake word "Jarvis"
js/ai.js         chiamata al backend AI (nessuna API key nel codice)
js/commands.js   funzioni smartphone locali (ora, meteo, timer, mappe...)
js/files.js      menu File / Foto / Fotocamera
js/memory.js     memoria locale (IndexedDB), indipendente dal PC
icons/           icone PWA
```

## 1. Pubblicare su GitHub Pages

1. Crea un repository (es. `jarvis-portable`) e carica tutti questi file
   mantenendo la struttura delle cartelle.
2. Impostazioni repo → **Pages** → Source: `main` branch, root `/`.
3. Dopo qualche minuto l'app sarà su
   `https://<tuo-utente>.github.io/jarvis-portable/`.
4. Apri il link da Safari su iPhone → condividi → **Aggiungi a Home** per
   installarla come PWA.

## 2. Configurare il backend AI (obbligatorio, senza chiavi nel codice pubblico)

`js/ai.js` non contiene nessuna API key: chiama un endpoint tuo
(`AI_ENDPOINT`) che deve essere un piccolo proxy — lo stesso schema
Cloudflare Worker + Groq che usi già per gli altri progetti (jarvis-tascabile,
Modalità Macchina).

Esempio minimo di Worker (`worker.js`) da incollare in un nuovo Cloudflare
Worker, con la variabile d'ambiente segreta `GROQ_API_KEY` impostata da
dashboard (mai nel codice):

```js
export default {
  async fetch(request, env) {
    if (request.method !== "POST") return new Response("ok");
    const { messages, image } = await request.json();

    const userContent = image
      ? [
          { type: "text", text: messages.at(-1).content },
          { type: "image_url", image_url: { url: image } },
        ]
      : messages.at(-1).content;

    const payload = {
      model: image ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.3-70b-versatile",
      messages: [...messages.slice(0, -1), { role: "user", content: userContent }],
    };

    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content || "Errore nella risposta AI.";

    return new Response(JSON.stringify({ reply }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
};
```

Poi in `js/ai.js` sostituisci:

```js
const AI_ENDPOINT = "https://TUO-WORKER.workers.dev/api/chat";
```

con l'URL reale del tuo Worker.

## 3. Cosa gira lato client (senza backend)

Questi comandi sono gestiti da `commands.js` senza toccare l'AI, quindi
funzionano anche prima di collegare il Worker:

- "che ore sono", "che giorno è"
- "batteria"
- "timer di 15 minuti"
- "ricordami di comprare il pane"
- "che tempo fa" (Open-Meteo, nessuna chiave richiesta)
- "dove mi trovo"
- "cerca informazioni su Marte"
- "apri youtube / gmail / maps / whatsapp"
- "portami a [indirizzo]"

Tutto il resto (conversazione libera, analisi immagini/file allegati) passa
dal Worker AI.

## 4. Memoria

`memory.js` usa IndexedDB (fallback automatico a localStorage) e resta
completamente separata dal JARVIS desktop: nome utente, preferenze, fatti
da ricordare esplicitamente e cronologia recente della conversazione (ultimi
30 messaggi) vivono solo sul telefono.

## 5. Icone

Le icone in `icons/` sono un placeholder minimale nello stile del cerchio
HUD. Sostituiscile pure con una tua grafica se vuoi un'icona diversa in
home screen.
