/* ============================================================
   COMMANDS — funzioni smartphone gestite localmente, senza
   passare dall'AI: ora/data, batteria, timer, promemoria, meteo
   (Open-Meteo, senza chiave), ricerca web, apertura siti,
   posizione, navigazione via Maps.

   JarvisCommands.tryHandle(testo) ritorna:
     null                      -> non è un comando locale, passa all'AI
     { risposta, parla }       -> comando gestito, mostra/parla risposta
   ============================================================ */

const JarvisCommands = (() => {
  const giorni = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];

  function normalizza(t) {
    return t.toLowerCase().trim();
  }

  async function orario() {
    const now = new Date();
    const ora = now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    return `Sono le ${ora}, signore.`;
  }

  async function dataOggi() {
    const now = new Date();
    return `Oggi è ${giorni[now.getDay()]} ${now.toLocaleDateString("it-IT")}.`;
  }

  async function batteria() {
    if (!navigator.getBattery) return "Il browser non espone i dati della batteria su questo dispositivo.";
    const b = await navigator.getBattery();
    const pct = Math.round(b.level * 100);
    return `Batteria al ${pct}%${b.charging ? ", in carica" : ""}.`;
  }

  const timersAttivi = [];
  function timer(minuti) {
    const ms = minuti * 60000;
    const id = setTimeout(() => {
      new SpeechSynthesisUtterance && JarvisVoice.speak(`Signore, il timer di ${minuti} minuti è scaduto.`);
      appendSystemMessage(`⏰ Timer di ${minuti} minuti scaduto.`);
    }, ms);
    timersAttivi.push(id);
    return `Timer di ${minuti} minuti impostato.`;
  }

  async function promemoria(testo) {
    const lista = await JarvisMemory.get("promemoria", []);
    lista.push({ testo, quando: new Date().toISOString() });
    await JarvisMemory.set("promemoria", lista);
    return `Promemoria salvato: "${testo}".`;
  }

  async function meteo() {
    try {
      const pos = await getPosition();
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${pos.lat}&longitude=${pos.lon}&current_weather=true`;
      const res = await fetch(url);
      const data = await res.json();
      const t = data.current_weather.temperature;
      const vento = data.current_weather.windspeed;
      return `Temperatura attuale: ${t}°C, vento a ${vento} km/h.`;
    } catch (e) {
      return "Non riesco ad accedere alla posizione per il meteo. Controlla i permessi di localizzazione.";
    }
  }

  function getPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject("no geolocation");
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
        () => reject("denied"),
        { timeout: 8000 }
      );
    });
  }

  async function posizioneAttuale() {
    try {
      const pos = await getPosition();
      return `Posizione attuale: ${pos.lat.toFixed(4)}, ${pos.lon.toFixed(4)}.`;
    } catch {
      return "Posizione non disponibile. Controlla i permessi di localizzazione del browser.";
    }
  }

  function ricercaWeb(query) {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank");
    return `Ricerca web avviata: "${query}".`;
  }

  const sitiNoti = {
    youtube: "https://www.youtube.com",
    gmail: "https://mail.google.com",
    maps: "https://maps.google.com",
    whatsapp: "https://web.whatsapp.com",
  };
  function apriSito(nome) {
    const key = Object.keys(sitiNoti).find((k) => nome.includes(k));
    if (key) {
      window.open(sitiNoti[key], "_blank");
      return `Apro ${key}.`;
    }
    return null;
  }

  function navigaVerso(destinazione) {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destinazione)}`, "_blank");
    return `Avvio la navigazione verso "${destinazione}".`;
  }

  function appendSystemMessage(testo) {
    if (window.JarvisApp && window.JarvisApp.addSystemMessage) {
      window.JarvisApp.addSystemMessage(testo);
    }
  }

  /* ---- Parser comandi: pattern semplici in italiano ---- */
  async function tryHandle(testoOriginale) {
    const t = normalizza(testoOriginale);

    if (/che ore sono|che ora è/.test(t)) return { risposta: await orario(), parla: true };
    if (/che giorno è|data di oggi|che data è/.test(t)) return { risposta: await dataOggi(), parla: true };
    if (/batteria/.test(t)) return { risposta: await batteria(), parla: true };

    const mTimer = t.match(/timer(?:\sdi)?\s(\d+)\s?minut/);
    if (mTimer) return { risposta: timer(parseInt(mTimer[1], 10)), parla: true };

    const mPromemoria = t.match(/(?:ricordami|promemoria)(?:\sdi)?\s(.+)/);
    if (mPromemoria) return { risposta: await promemoria(mPromemoria[1]), parla: true };

    if (/che tempo fa|meteo/.test(t)) return { risposta: await meteo(), parla: true };
    if (/dove mi trovo|posizione attuale|dove sono/.test(t)) return { risposta: await posizioneAttuale(), parla: true };

    const mCerca = t.match(/cerca(?:\sinformazioni su| su)?\s(.+)/);
    if (mCerca) return { risposta: ricercaWeb(mCerca[1]), parla: true };

    const mApri = t.match(/apri\s(.+)/);
    if (mApri) {
      const risultato = apriSito(mApri[1]);
      if (risultato) return { risposta: risultato, parla: true };
    }

    const mNavigazione = t.match(/(?:portami a|naviga verso|indicazioni per)\s(.+)/);
    if (mNavigazione) return { risposta: navigaVerso(mNavigazione[1]), parla: true };

    return null; // nessun comando locale riconosciuto -> passa all'AI
  }

  return { tryHandle };
})();
