/* ============================================================
   MEMORY — memoria locale della PWA, su IndexedDB (con fallback
   automatico a localStorage se IndexedDB non è disponibile).
   Completamente indipendente dal JARVIS desktop: nessuna
   comunicazione tra i due sistemi.

   Ricorda:
   - nome utente / preferenze
   - fatti che l'utente chiede esplicitamente di ricordare
   - contesto delle conversazioni recenti (ultimi N messaggi)
   ============================================================ */

const JarvisMemory = (() => {
  const DB_NAME = "jarvis_portable_db";
  const DB_VERSION = 1;
  const STORE = "kv";
  const MAX_HISTORY = 30; // messaggi di contesto conservati

  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) return resolve(null); // fallback localStorage
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
    return dbPromise;
  }

  async function get(key, fallback = null) {
    const db = await openDB();
    if (!db) {
      const raw = localStorage.getItem("jarvis_" + key);
      return raw ? JSON.parse(raw) : fallback;
    }
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result !== undefined ? req.result : fallback);
      req.onerror = () => resolve(fallback);
    });
  }

  async function set(key, value) {
    const db = await openDB();
    if (!db) {
      localStorage.setItem("jarvis_" + key, JSON.stringify(value));
      return;
    }
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  // ---- API di alto livello ----

  async function getProfile() {
    return get("profile", { nome: null, preferenze: {} });
  }
  async function setUserName(nome) {
    const profile = await getProfile();
    profile.nome = nome;
    await set("profile", profile);
  }
  async function setPreference(chiave, valore) {
    const profile = await getProfile();
    profile.preferenze[chiave] = valore;
    await set("profile", profile);
  }

  async function getFatti() {
    return get("fatti_ricordati", []);
  }
  async function ricordaFatto(testo) {
    const fatti = await getFatti();
    fatti.push({ testo, quando: new Date().toISOString() });
    await set("fatti_ricordati", fatti);
  }

  async function getHistory() {
    return get("conversazione", []);
  }
  async function pushHistory(ruolo, testo) {
    const history = await getHistory();
    history.push({ ruolo, testo, quando: new Date().toISOString() });
    while (history.length > MAX_HISTORY) history.shift();
    await set("conversazione", history);
  }
  async function clearHistory() {
    await set("conversazione", []);
  }

  return {
    getProfile, setUserName, setPreference,
    getFatti, ricordaFatto,
    getHistory, pushHistory, clearHistory,
  };
})();
