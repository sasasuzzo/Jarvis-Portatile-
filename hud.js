/* ============================================================
   HUD — cerchio centrale J.A.R.V.I.S. Stessa geometria e palette
   del pannello desktop (jarvis.py): 5 anelli concentrici pulsanti,
   anello a 16 blocchi "respiranti", anello a 60 tacche, due archi
   rotanti, doppio glow del nucleo, scritta J.A.R.V.I.S al centro.

   Stati supportati: standby, listening, thinking, speaking, error.
   ============================================================ */

const JarvisHUD = (() => {
  const canvas = document.getElementById("hud");
  const ctx = canvas.getContext("2d");
  const CX = 170, CY = 170;
  const SCALE = CX / 220;

  const RING_RADII = [130, 145, 160, 175, 190].map((r) => r * SCALE);
  const BLOCK_R_IN = 200 * SCALE, BLOCK_R_OUT = 216 * SCALE, N_BLOCKS = 16;
  const TICK_R = 226 * SCALE, N_TICKS = 60;
  const NUCLEUS_R1 = 62 * SCALE, NUCLEUS_R2 = 78 * SCALE;

  const STATES = {
    standby:   { color: "#00FFFF", speed: 1,   range: 5,  label: "STANDBY",   sub: "" },
    listening: { color: "#33FF66", speed: 1.8, range: 9,  label: "LISTENING", sub: "in ascolto…" },
    thinking:  { color: "#FFB347", speed: 2.4, range: 4,  label: "THINKING",  sub: "elaborazione…" },
    speaking:  { color: "#00FFFF", speed: 1.4, range: 11, label: "SPEAKING",  sub: "" },
    error:     { color: "#FF3B3B", speed: 0.4, range: 13, label: "ERROR",    sub: "" },
  };

  let state = "standby";
  let pulse = 0, pulseDir = 1, sweep1 = 0, sweep2 = 180;
  let timer = null;

  const stateLabelEl = document.getElementById("stateLabel");
  const stateSubEl = document.getElementById("stateSub");

  function setState(s) {
    if (!STATES[s]) return;
    state = s;
    stateLabelEl.textContent = STATES[s].label;
    stateLabelEl.style.color = s === "standby" ? "var(--cyan-soft)" : STATES[s].color;
    stateSubEl.textContent = STATES[s].sub;
  }

  function lerpColor(a, b, t) {
    const pa = a.match(/\w\w/g).map((x) => parseInt(x, 16));
    const pb = b.match(/\w\w/g).map((x) => parseInt(x, 16));
    const p = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
    return `rgb(${p[0]},${p[1]},${p[2]})`;
  }

  function draw(cfg) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const glow = cfg.color;

    ctx.lineWidth = 2;
    ctx.strokeStyle = glow;
    ctx.shadowColor = glow;
    ctx.shadowBlur = 6;
    RING_RADII.forEach((r0) => {
      const r = r0 + pulse;
      ctx.beginPath();
      ctx.arc(CX, CY, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    const t = performance.now() / 1000;
    for (let i = 0; i < N_BLOCKS; i++) {
      const step = 360 / N_BLOCKS;
      const a0 = ((i * step + 3) * Math.PI) / 180;
      const a1 = ((i * step + step - 3) * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(CX + BLOCK_R_IN * Math.cos(a0), CY + BLOCK_R_IN * Math.sin(a0));
      ctx.lineTo(CX + BLOCK_R_IN * Math.cos(a1), CY + BLOCK_R_IN * Math.sin(a1));
      ctx.lineTo(CX + BLOCK_R_OUT * Math.cos(a1), CY + BLOCK_R_OUT * Math.sin(a1));
      ctx.lineTo(CX + BLOCK_R_OUT * Math.cos(a0), CY + BLOCK_R_OUT * Math.sin(a0));
      ctx.closePath();
      const intensity = (Math.sin(t * 2.5 + i * 0.5) + 1) / 2;
      ctx.fillStyle = lerpColor("#014a5c", glow, intensity * 0.6);
      ctx.shadowBlur = 0;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#00E5FF";
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#00CFE8";
    ctx.lineWidth = 1.6;
    for (let i = 0; i < N_TICKS; i++) {
      const ang = (i * (360 / N_TICKS) * Math.PI) / 180;
      const rIn = TICK_R - (i % 5 === 0 ? 7 : 3);
      ctx.beginPath();
      ctx.moveTo(CX + rIn * Math.cos(ang), CY + rIn * Math.sin(ang));
      ctx.lineTo(CX + TICK_R * Math.cos(ang), CY + TICK_R * Math.sin(ang));
      ctx.stroke();
    }

    ctx.shadowColor = glow;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = glow;
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.arc(CX, CY, TICK_R, (sweep1 * Math.PI) / 180, ((sweep1 + 55) * Math.PI) / 180);
    ctx.stroke();

    ctx.strokeStyle = "#66FFFF";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(CX, CY, TICK_R - 10, (sweep2 * Math.PI) / 180, ((sweep2 + 25) * Math.PI) / 180);
    ctx.stroke();

    ctx.shadowBlur = 4;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#00E5FF";
    ctx.beginPath();
    ctx.arc(CX, CY, NUCLEUS_R1 + pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#0099AA";
    ctx.beginPath();
    ctx.arc(CX, CY, NUCLEUS_R2 + pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 10;
    ctx.shadowColor = glow;
    ctx.fillStyle = glow;
    ctx.font = '700 20px "Segoe UI", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("J.A.R.V.I.S", CX, CY);
    ctx.shadowBlur = 0;
  }

  function loop() {
    const cfg = STATES[state];
    pulse += pulseDir * 0.5 * cfg.speed;
    if (pulse > cfg.range || pulse < -cfg.range) pulseDir *= -1;
    sweep1 = (sweep1 + 4 * cfg.speed) % 360;
    sweep2 = (sweep2 - 3 * cfg.speed + 360) % 360;
    draw(cfg);
    timer = setTimeout(loop, 50);
  }

  function start() {
    if (!timer) loop();
  }

  return { start, setState, get state() { return state; } };
})();

JarvisHUD.start();
