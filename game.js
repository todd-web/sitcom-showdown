// Sitcom Showdown engine: one canvas, fixed 60 Hz update, sprites + manifest from assets/.
(() => {
"use strict";
const W = 1280, H = 720, FLOOR = 650, S = 0.78;      // S = sprite draw scale
const LEFT_WALL = 90, RIGHT_WALL = W - 90, BODY = 55; // BODY = half body width for spacing
const ROUND_TIME = 99, ROUNDS_TO_WIN = 2, GRAVITY = 1.15, JUMP_V = -23;
const cv = document.getElementById("c"), ctx = cv.getContext("2d");
ctx.imageSmoothingEnabled = false;

// ---------- assets ----------
const LOAD = { total: 0, done: 0 };
function track(im) { LOAD.total++; const fin = () => { if (!im._counted) { im._counted = true; LOAD.done++; } }; im.addEventListener("load", fin); im.addEventListener("error", fin); return im; }
const IMG = {};
for (const ch of ROSTER) {
  IMG[ch.id] = {};
  for (const pose of Object.keys(MANIFEST[ch.id] || {})) {
    const im = track(new Image()); im.src = `assets/fighters/${ch.id}/${pose}.webp`; IMG[ch.id][pose] = im;
  }
}
const STAGE_IMG = {};
for (const [k, st] of Object.entries(STAGES)) {
  const im = track(new Image()); im.onerror = () => { im.bad = true; }; im.src = st.file; STAGE_IMG[k] = im;
}
const meta = (id, pose) => (MANIFEST[id] && (MANIFEST[id][pose] || MANIFEST[id].idle)) || { w: 200, h: 480, ax: 100, reach: 100, back: 100 };
const poseOf = (id, pose) => (MANIFEST[id] && MANIFEST[id][pose]) ? pose : "idle";

// ---------- audio: synth sound effects + music tracks (no actor voices) ----------
let AC = null;
function audio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  if (AC) decodeAll();
  if (AC && AC.state === "suspended") AC.resume();
  return AC;
}
const MUSIC_FILES = { title: "assets/music/title_a.mp3", select: "assets/music/title_b.mp3", fight1: "assets/music/fight_a.mp3",
                      fight2: "assets/music/fight_b.mp3", victory: "assets/music/victory.mp3" };
const music = { raw: {}, buf: {}, el: {}, cur: null, node: null, gain: null, muted: false, vol: 0.55, want: null, wantLoop: true };
try { music.muted = localStorage.getItem("ss_muted") === "1"; } catch (e) {}
for (const [k, url] of Object.entries(MUSIC_FILES)) {
  LOAD.total++;
  fetch(url).then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); })
    .then(ab => { music.raw[k] = ab; if (AC) decodeOne(k); })
    .catch(() => { const a = new Audio(url); a.preload = "auto"; music.el[k] = a; })   // file:// fallback
    .finally(() => LOAD.done++);
}
// create the (suspended) audio context now so tracks decode during the loader; the first tap resumes it
try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
function decodeOne(k) {
  const ab = music.raw[k]; if (!ab || music.buf[k]) return; delete music.raw[k];
  AC.decodeAudioData(ab, b => { music.buf[k] = b; if (music.want === k && !music.node) { music.cur = null; playMusic(k, music.wantLoop); } }, () => {});
}
function decodeAll() { for (const k of Object.keys(music.raw)) decodeOne(k); }
function stopMusic() {
  if (music.node) { const g = music.gain, n = music.node; try { g.gain.setTargetAtTime(0, AC.currentTime, 0.15); n.stop(AC.currentTime + 0.6); } catch (e) {} }
  music.node = null;
  for (const a of Object.values(music.el)) { try { a.pause(); } catch (e) {} }
}
function playMusic(k, loop = true) {
  music.want = k; music.wantLoop = loop;
  if (music.cur === k) return; music.cur = k; stopMusic();
  if (music.muted) return;
  const a = audio();
  if (a && music.buf[k]) {
    const n = a.createBufferSource(), g = a.createGain(); n.buffer = music.buf[k]; n.loop = loop;
    g.gain.setValueAtTime(0, a.currentTime); g.gain.linearRampToValueAtTime(music.vol, a.currentTime + 0.4);
    n.connect(g); g.connect(a.destination); n.start(); music.node = n; music.gain = g;
  } else if (music.el[k]) {
    const el = music.el[k]; el.loop = loop; el.volume = music.vol; el.currentTime = 0; el.play().catch(() => { music.cur = null; });
  } else music.cur = null;   // still decoding; decodeOne starts it when ready
}
function toggleMute() {
  music.muted = !music.muted;
  const mb = document.getElementById("musicbtn"); if (mb) mb.textContent = music.muted ? "\u266A OFF" : "\u266A ON"; try { localStorage.setItem("ss_muted", music.muted ? "1" : "0"); } catch (e) {}
  if (music.muted) stopMusic(); else { const k = music.want; music.cur = null; if (k) playMusic(k, music.wantLoop); }
}
function sfx(kind) {
  const a = audio(); if (!a) return;
  const t = a.currentTime, g = a.createGain(); g.connect(a.destination);
  if (kind === "hit" || kind === "heavy") {
    const len = kind === "heavy" ? 0.22 : 0.12, buf = a.createBuffer(1, a.sampleRate * len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = kind === "heavy" ? 900 : 1800;
    src.connect(f); f.connect(g); g.gain.setValueAtTime(0.5, t); src.start(t);
  } else {
    const o = a.createOscillator(); o.connect(g);
    const conf = { block: [900, 600, 0.06, "square"], whiff: [300, 200, 0.05, "sine"], super: [200, 1200, 0.5, "sawtooth"],
                   select: [660, 990, 0.08, "square"], ko: [400, 60, 0.8, "triangle"], round: [520, 780, 0.25, "square"] }[kind] || [440, 440, 0.05, "sine"];
    o.type = conf[3]; o.frequency.setValueAtTime(conf[0], t); o.frequency.exponentialRampToValueAtTime(conf[1], t + conf[2]);
    g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + conf[2]); o.start(t); o.stop(t + conf[2] + 0.02);
  }
}

// ---------- input ----------
const KEYS = new Set(), LATCH = new Set();   // LATCH keeps a quick tap alive until the next update reads it
addEventListener("keydown", e => { KEYS.add(e.code); LATCH.add(e.code); audio(); if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code)) e.preventDefault(); });
addEventListener("keyup", e => KEYS.delete(e.code));
addEventListener("keydown", e => { if (e.code === "KeyP") toggleMute(); if (e.code === "KeyO") goFullscreen(); });
const standalone = (window.matchMedia && matchMedia("(display-mode: fullscreen), (display-mode: standalone)").matches) || navigator.standalone;
let fsTip = 0;
function goFullscreen() {
  const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (document.fullscreenElement || document.webkitFullscreenElement) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
  if (req && !/iPhone|iPod/.test(navigator.userAgent)) {
    Promise.resolve(req.call(el)).then(() => { try { screen.orientation.lock("landscape").catch(() => {}); } catch (e) {} }).catch(() => { fsTip = 300; });
  } else fsTip = 300;
}
cv.addEventListener("pointerdown", e => {
  audio();
  const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
  if (!isTouch && game.scene !== "fight" && y < 70 && x < 120) { goFullscreen(); return; }        // desktop corner icons
  if (!isTouch && game.scene !== "fight" && y < 70 && x > W - 220) { toggleMute(); return; }
  if (game.scene === "boot" || game.scene === "title") LATCH.add("touch:start");
});
const KMAP = [
  { left: "KeyA", right: "KeyD", up: "KeyW", down: "KeyS", lp: "KeyF", hp: "KeyG", lk: "KeyV", hk: "KeyB", sp: "KeyH", su: "KeyT", start: "Enter" },
  { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown", lp: "KeyJ", hp: "KeyK", lk: "KeyM", hk: "Comma", sp: "KeyL", su: "KeyI", start: "ShiftRight" },
];
const BTNS = ["left", "right", "up", "down", "lp", "hp", "lk", "hk", "sp", "su", "start", "back"];
const TOUCH = {};
function readPad(i) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const p = pads && pads[i]; if (!p) return {};
  const b = n => p.buttons[n] && p.buttons[n].pressed, ax = p.axes || [];
  return { left: b(14) || ax[0] < -0.5, right: b(15) || ax[0] > 0.5, up: b(12) || ax[1] < -0.5, down: b(13) || ax[1] > 0.5,
           lp: b(2), hp: b(3), lk: b(0), hk: b(1), sp: b(4) || b(6), su: b(5) || b(7), start: b(9), back: b(8) };
}
const prevIn = [{}, {}];
function readInput(slot) {
  const k = KMAP[slot], pad = readPad(slot), cur = {};
  for (const n of BTNS) cur[n] = !!((k[n] && KEYS.has(k[n])) || pad[n] || (slot === 0 && TOUCH[n]));
  if (slot === 0 && KEYS.has("Escape")) cur.back = true;
  if (slot === 0 && KEYS.has("Space")) cur.start = true;
  const pressed = {};
  for (const n of BTNS) {
    const latched = (k[n] && LATCH.has(k[n])) || (slot === 0 && LATCH.has("touch:" + n)) || (slot === 0 && n === "start" && LATCH.has("Space"));
    pressed[n] = (cur[n] && !prevIn[slot][n]) || latched;
    if (latched) cur[n] = true;
  }
  for (const n of BTNS) { if (k[n]) LATCH.delete(k[n]); if (slot === 0) LATCH.delete("touch:" + n); }
  if (slot === 0) LATCH.delete("Space");
  prevIn[slot] = cur;
  return { held: cur, pressed };
}

// touch controls (shown automatically on touch devices)
const isTouch = (window.matchMedia && matchMedia("(pointer: coarse)").matches) || /[?&]touch=1/.test(location.search);
if (isTouch) {
  const box = document.getElementById("touch"); box.classList.add("on");
  const defs = [["lp","LP",73,58],["hp","HP",83,52],["lk","LK",73,76],["hk","HK",83,70],["sp","SP",92,62],["su","SU",92,44],["start","START",46,82]];
  for (const [n, label, l, t] of defs) {
    const d = document.createElement("div"); d.className = "tb"; d.textContent = label;
    const sz = n === "start" ? 8 : 8.5;
    Object.assign(d.style, { left: l + "%", top: t + "%", width: sz + "%", aspectRatio: "1" });
    const on = e => { e.preventDefault(); TOUCH[n] = true; LATCH.add("touch:" + n); d.classList.add("down"); audio(); };
    const off = e => { e.preventDefault(); TOUCH[n] = false; d.classList.remove("down"); };
    d.addEventListener("pointerdown", on); d.addEventListener("pointerup", off); d.addEventListener("pointercancel", off); d.addEventListener("pointerleave", off);
    box.appendChild(d);
  }
  const mb = document.createElement("div"); mb.className = "tb"; mb.id = "musicbtn"; mb.textContent = music.muted ? "\u266A OFF" : "\u266A ON";
  Object.assign(mb.style, { right: "1.5%", top: "16%", width: "9%", aspectRatio: "1", fontSize: "11px" });
  mb.addEventListener("pointerdown", e => { e.preventDefault(); audio(); toggleMute(); });
  box.appendChild(mb);
  if (!standalone) {
    const fb = document.createElement("div"); fb.className = "tb"; fb.textContent = "\u26F6";
    Object.assign(fb.style, { left: "1.5%", top: "16%", width: "7%", aspectRatio: "1", fontSize: "20px" });
    fb.addEventListener("pointerdown", e => { e.preventDefault(); goFullscreen(); });
    box.appendChild(fb);
  }
  const stick = document.getElementById("stick"), knob = document.getElementById("knob");
  const move = e => {
    e.preventDefault(); const r = stick.getBoundingClientRect(), t = e.touches[0]; if (!t) return;
    const dx = (t.clientX - r.left) / r.width - 0.5, dy = (t.clientY - r.top) / r.height - 0.5;
    TOUCH.left = dx < -0.15; TOUCH.right = dx > 0.15; TOUCH.up = dy < -0.2; TOUCH.down = dy > 0.2;
    knob.style.left = (35 + Math.max(-30, Math.min(30, dx * 70))) + "%"; knob.style.top = (35 + Math.max(-30, Math.min(30, dy * 70))) + "%";
  };
  const end = () => { TOUCH.left = TOUCH.right = TOUCH.up = TOUCH.down = false; knob.style.left = knob.style.top = "35%"; };
  stick.addEventListener("touchstart", move); stick.addEventListener("touchmove", move); stick.addEventListener("touchend", end);
}

// ---------- moves ----------
// frames at 60 Hz. reach comes from the sprite (manifest) plus bonus for specials/supers.
const MOVES = {
  lp: { pose: "punch_light", start: 4,  active: 4,  rec: 8,  dmg: 40,  kb: 7,  stun: 14, meter: 6 },
  hp: { pose: "punch_heavy", start: 8,  active: 5,  rec: 16, dmg: 85,  kb: 13, stun: 20, meter: 10 },
  lk: { pose: "kick_light",  start: 5,  active: 4,  rec: 9,  dmg: 45,  kb: 7,  stun: 14, meter: 6, low: true },
  hk: { pose: "kick_heavy",  start: 10, active: 5,  rec: 18, dmg: 95,  kb: 16, stun: 22, meter: 12, knock: true },
  sp: { pose: "special",     start: 12, active: 9,  rec: 20, dmg: 110, kb: 18, stun: 24, meter: 14, knock: true, bonus: 140 },
  su: { pose: "super",       start: 22, active: 16, rec: 24, dmg: 300, kb: 26, stun: 40, meter: 0,  knock: true, bonus: 300, isSuper: true },
};

class Fighter {
  constructor(ch, slot, x) {
    this.ch = ch; this.id = ch.id; this.slot = slot; this.x = x; this.y = 0; this.vx = 0; this.vy = 0;
    this.sc = S * (ch.size || 1); this.face = slot === 0 ? 1 : -1; this.hp = 1000; this.meter = 0; this.state = "idle"; this.t = 0;
    this.move = null; this.hitDone = false; this.stun = 0; this.flash = 0; this.wins = 0; this.cpu = false;
  }
  reset(x) { Object.assign(this, { x, y: 0, vx: 0, vy: 0, hp: 1000, state: "idle", t: 0, move: null, stun: 0, flash: 0 }); this.face = this.slot === 0 ? 1 : -1; }
  get air() { return this.y < 0; }
  pose() {
    switch (this.state) {
      case "walk": return "walk"; case "crouch": return "crouch"; case "jump": return "jump";
      case "block": return this.crouchBlock ? "crouch" : "block"; case "hit": return "hit";
      case "down": case "ko": return "knockdown"; case "win": return "win";
      case "attack": return this.move.pose;
      default: return "idle";
    }
  }
  startMove(key) {
    if (key === "su" && this.meter < 100) return false;
    this.move = Object.assign({ key }, MOVES[key]); this.state = "attack"; this.t = 0; this.hitDone = false;
    if (key === "su") { this.meter = 0; game.superFreeze = 50; game.superBy = this; sfx("super"); }
    return true;
  }
  control(inp, opp) {
    const h = inp.held, p = inp.pressed;
    const fwd = this.face > 0 ? h.right : h.left, back = this.face > 0 ? h.left : h.right;
    if (["hit", "down", "ko", "win"].includes(this.state)) return;
    if (this.state === "attack") return;
    this.holdingBack = back;
    for (const k of ["su", "sp", "hk", "hp", "lk", "lp"]) {
      if (p[k]) { if (this.startMove(k)) return; }
    }
    if (this.air) return;
    if (h.up) { this.vy = JUMP_V; this.vx = (h.right ? 1 : h.left ? -1 : 0) * (this.ch.speed + 1.5); this.y = -1; this.state = "jump"; return; }
    if (h.down) { this.state = back ? "block" : "crouch"; this.crouchBlock = back; this.vx = 0; return; }
    if (back && opp.state === "attack" && Math.abs(opp.x - this.x) < 420) { this.state = "block"; this.crouchBlock = false; this.vx = 0; return; }
    if (fwd || back) { this.state = "walk"; this.vx = (h.right ? 1 : -1) * this.ch.speed * (back ? 0.75 : 1); return; }
    this.state = "idle"; this.vx = 0;
  }
  update(opp) {
    this.t++; if (this.flash > 0) this.flash--;
    // physics
    if (this.air || this.vy < 0) {
      this.vy += GRAVITY; this.y += this.vy; this.x += this.vx;
      if (this.y >= 0) { this.y = 0; this.vy = 0; this.vx = 0; if (this.state === "jump" || this.state === "attack") { this.state = "idle"; this.move = null; } }
    } else if (["walk"].includes(this.state)) this.x += this.vx;
    else if (["hit", "down", "block"].includes(this.state)) { this.x += this.vx; this.vx *= 0.82; }
    // timers
    if (this.state === "hit" || this.state === "block") { if (--this.stun <= 0) this.state = "idle"; }
    if (this.state === "down") { if (--this.stun <= 0) this.state = "idle"; }
    if (this.state === "attack") {
      const m = this.move;
      if (this.t >= m.start && this.t < m.start + m.active && !this.hitDone) this.tryHit(opp);
      if (this.t >= m.start + m.active + m.rec) { this.state = this.air ? "jump" : "idle"; this.move = null; }
    }
    if (!this.air && !["attack", "hit", "down", "ko", "win"].includes(this.state)) this.face = opp.x >= this.x ? 1 : -1;
    this.x = Math.max(LEFT_WALL, Math.min(RIGHT_WALL, this.x));
  }
  tryHit(opp) {
    const m = this.move, md = meta(this.id, poseOf(this.id, m.pose));
    const reach = md.reach * this.sc + (m.bonus || 0) + BODY * 0.5;
    const dx = (opp.x - this.x) * this.face;
    if (dx < -20 || dx > reach + BODY) return;
    if (Math.abs(opp.y - this.y) > 230) return;
    if (["down", "ko"].includes(opp.state)) return;
    this.hitDone = true;
    const blocked = opp.state === "block" && (!m.low || opp.crouchBlock);
    if (blocked) {
      opp.stun = 12; opp.vx = this.face * m.kb * 0.6; sfx("block");
      if (m.bonus) opp.hp -= Math.round(m.dmg * 0.12 * this.ch.power);
      this.meter = Math.min(100, this.meter + m.meter * 0.5);
      game.spark(opp.x - this.face * 30, FLOOR + opp.y - 260, "#9ee7ff");
    } else {
      const dmg = Math.round(m.dmg * this.ch.power * (this.air ? 0.85 : 1));
      opp.hp -= dmg; opp.flash = 8;
      this.meter = Math.min(100, this.meter + m.meter); opp.meter = Math.min(100, opp.meter + m.meter * 0.6);
      opp.move = null;
      if (m.knock || opp.air || opp.hp <= 0) { opp.state = "down"; opp.stun = 55; opp.vx = this.face * m.kb * 1.2; opp.y = 0; opp.vy = 0; }
      else { opp.state = "hit"; opp.stun = m.stun; opp.vx = this.face * m.kb; }
      sfx(m.dmg >= 85 ? "heavy" : "hit"); game.shake = m.isSuper ? 18 : m.dmg >= 85 ? 8 : 4;
      game.spark(opp.x - this.face * 20, FLOOR + opp.y - (m.low ? 120 : 270), m.isSuper ? "#ffd23f" : "#fff3b0");
    }
    if (opp.hp <= 0) { opp.hp = 0; opp.state = "ko"; opp.stun = 9999; }
  }
  draw() {
    const pose = poseOf(this.id, this.pose()), md = meta(this.id, pose), im = IMG[this.id][pose];
    // shadow
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath();
    ctx.ellipse(this.x, FLOOR + 4, 70 * (1 + this.y / 900), 12, 0, 0, Math.PI * 2); ctx.fill();
    if (!im || !im.complete || !im.naturalWidth) return;
    ctx.save(); ctx.translate(Math.round(this.x), Math.round(FLOOR + this.y)); if (this.face < 0) ctx.scale(-1, 1);
    const k = this.sc; ctx.drawImage(im, -md.ax * k, -md.h * k, md.w * k, md.h * k);
    if (this.flash > 0 && this.flash % 2) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.5; ctx.drawImage(im, -md.ax * k, -md.h * k, md.w * k, md.h * k); }
    ctx.restore();
  }
}

// ---------- CPU ----------
function cpuInput(me, opp, level) {
  const held = {}, pressed = {}, dist = Math.abs(opp.x - me.x), toward = opp.x > me.x ? "right" : "left", away = toward === "right" ? "left" : "right";
  me.ai = me.ai || { plan: null, t: 0 };
  if (--me.ai.t <= 0) {
    const r = Math.random();
    if (opp.state === "attack" && dist < 360 && r < 0.25 + level * 0.12) me.ai.plan = "block";
    else if (dist > 300) me.ai.plan = r < 0.85 ? "approach" : "jumpin";
    else if (r < 0.45 + level * 0.1) me.ai.plan = "attack";
    else if (r < 0.65) me.ai.plan = "retreat";
    else if (r < 0.75) me.ai.plan = "jumpin";
    else me.ai.plan = "wait";
    me.ai.t = 10 + Math.floor(Math.random() * (30 - level * 6));
    me.ai.fired = false;
  }
  switch (me.ai.plan) {
    case "approach": held[toward] = true; break;
    case "retreat": held[away] = true; break;
    case "block": held[away] = true; if (opp.move && opp.move.low) held.down = true; break;
    case "jumpin": if (!me.ai.fired) { held.up = true; held[toward] = true; me.ai.fired = true; } else if (me.air && dist < 260) pressed.hk = true; break;
    case "attack":
      if (!me.ai.fired && me.state !== "attack") {
        const r = Math.random();
        const k = me.meter >= 100 && r < 0.5 ? "su" : r < 0.1 ? "sp" : r < 0.35 ? "lp" : r < 0.55 ? "lk" : r < 0.78 ? "hp" : "hk";
        pressed[k] = true; me.ai.fired = true;
      } break;
  }
  return { held, pressed };
}

// ---------- game state ----------
const game = {
  scene: "boot", bootT: 0, titleT: 0, matchNo: 0, mode: "arcade", t: 0, sel: [0, 3], ready: [false, false], fighters: null, stage: "winslow",
  round: 1, timer: ROUND_TIME, frame: 0, banner: null, shake: 0, sparks: [], superFreeze: 0, superBy: null, ladder: [], level: 1, menu: 0,
  spark(x, y, color) { for (let i = 0; i < 10; i++) this.sparks.push({ x, y, vx: (Math.random() - .5) * 14, vy: (Math.random() - .5) * 14, life: 16, color }); },
};

function startMatch(a, b, stage) {
  game.fighters = [new Fighter(ROSTER[a], 0, 360), new Fighter(ROSTER[b], 1, W - 360)];
  game.fighters[1].cpu = game.mode === "arcade";
  game.stage = stage || ROSTER[b].stage; game.round = 1; startRound(); game.scene = "fight";
  playMusic(game.matchNo++ % 2 ? "fight2" : "fight1");
}
function startRound() {
  const [p, q] = game.fighters; p.reset(360); q.reset(W - 360);
  game.timer = ROUND_TIME; game.frame = 0; game.banner = { text: `ROUND ${game.round}`, sub: "FIGHT!", t: 110 }; sfx("round");
}
function endRound(winner) {
  const [p, q] = game.fighters;
  if (winner) { winner.wins++; winner.state = "win"; if (winner.wins >= ROUNDS_TO_WIN) playMusic("victory", false); }
  game.banner = { text: winner ? (winner.hp >= 1000 ? "PERFECT!" : "K.O.") : "TIME", sub: winner ? `${winner.ch.name} WINS` : "DRAW", t: 170, after: true };
  sfx("ko");
}

// ---------- update ----------
function update() {
  game.t++;
  const i0 = readInput(0), i1 = readInput(1);
  if (game.scene === "boot") {
    game.bootT++;
    if (LOAD.done >= LOAD.total && game.bootT > 230 && (i0.pressed.start || i0.pressed.lp || i1.pressed.start)) {
      audio(); game.scene = "title"; game.titleT = 0; sfx("ko"); playMusic("title");
    }
    return;
  }
  if (game.scene === "title") {
    game.titleT++;
    if (game.titleT > 40 && (i0.pressed.start || i0.pressed.lp || i1.pressed.start)) { game.scene = "mode"; sfx("select"); playMusic("select"); }
    return;
  }
  if (game.scene === "mode") {
    if (i0.pressed.up || i0.pressed.down) { game.menu ^= 1; sfx("select"); }
    if (i0.pressed.lp || i0.pressed.start) {
      game.mode = game.menu === 0 ? "arcade" : "versus"; game.scene = "select"; game.ready = [false, game.mode === "arcade"]; sfx("select");
    }
    if (i0.pressed.back) game.scene = "title";
    return;
  }
  if (game.scene === "select") {
    const cols = 5;
    [i0, i1].forEach((inp, s) => {
      if (game.ready[s] || (s === 1 && game.mode === "arcade")) return;
      let c = game.sel[s];
      if (inp.pressed.left) c = (c + ROSTER.length - 1) % ROSTER.length;
      if (inp.pressed.right) c = (c + 1) % ROSTER.length;
      if (inp.pressed.up) c = (c + ROSTER.length - cols) % ROSTER.length;
      if (inp.pressed.down) c = (c + cols) % ROSTER.length;
      if (c !== game.sel[s]) sfx("select");
      game.sel[s] = c;
      if (inp.pressed.lp || inp.pressed.start) { game.ready[s] = true; sfx("super"); }
    });
    if (i0.pressed.back) { game.scene = "mode"; return; }
    if (game.ready[0] && game.ready[1]) {
      if (game.mode === "arcade") {
        game.ladder = ROSTER.map((_, i) => i).filter(i => i !== game.sel[0]).sort(() => Math.random() - 0.5).slice(0, 6);
        game.level = 1; startMatch(game.sel[0], game.ladder.shift());
      } else startMatch(game.sel[0], game.sel[1], ROSTER[game.sel[1]].stage);
    }
    return;
  }
  if (game.scene === "fight") {
    const [p, q] = game.fighters;
    for (const s of game.sparks) { s.x += s.vx; s.y += s.vy; s.vx *= .88; s.vy *= .88; s.life--; }
    game.sparks = game.sparks.filter(s => s.life > 0);
    if (game.shake > 0) game.shake--;
    if (game.superFreeze > 0) { game.superFreeze--; return; }
    if (game.banner) {
      game.banner.t--;
      if (game.banner.t <= 0) {
        const after = game.banner.after; game.banner = null;
        if (after) {
          if (p.wins >= ROUNDS_TO_WIN || q.wins >= ROUNDS_TO_WIN) {
            const won = p.wins >= ROUNDS_TO_WIN;
            if (game.mode === "arcade" && won && game.ladder.length) {
              const keep = game.sel[0]; game.level++; startMatch(keep, game.ladder.shift());
            } else { game.scene = "result"; game.result = won ? p : q; game.resultT = 0; }
          } else { game.round++; startRound(); }
        }
      }
      // keep KO / win poses animating during banners but no control
      p.update(q); q.update(p);
      return;
    }
    p.control(i0, q);
    q.control(q.cpu ? cpuInput(q, p, game.level) : i1, p);
    p.update(q); q.update(p);
    // keep bodies apart on the ground
    const dx = q.x - p.x;
    if (Math.abs(dx) < BODY * 2 && Math.abs(p.y - q.y) < 120) {
      const push = (BODY * 2 - Math.abs(dx)) / 2 * Math.sign(dx || 1);
      p.x -= push; q.x += push;
      p.x = Math.max(LEFT_WALL, Math.min(RIGHT_WALL, p.x)); q.x = Math.max(LEFT_WALL, Math.min(RIGHT_WALL, q.x));
    }
    if (++game.frame % 60 === 0 && game.timer > 0) game.timer--;
    if (p.state === "ko" || q.state === "ko") endRound(p.state === "ko" ? (q.state === "ko" ? null : q) : p);
    else if (game.timer <= 0) endRound(p.hp === q.hp ? null : p.hp > q.hp ? p : q);
    if (i0.pressed.back) { game.scene = "select"; game.ready = [false, game.mode === "arcade"]; playMusic("select"); }
    return;
  }
  if (game.scene === "result") {
    game.resultT++;
    if (game.resultT > 60 && (i0.pressed.lp || i0.pressed.start)) { game.scene = "select"; game.ready = [false, game.mode === "arcade"]; playMusic("select"); }
  }
}

// ---------- drawing ----------
function text(s, x, y, size, color, align = "center", font = "Bungee") {
  ctx.font = `${size}px '${font}', Impact, sans-serif`; ctx.textAlign = align; ctx.textBaseline = "middle";
  ctx.lineWidth = Math.max(3, size / 7); ctx.strokeStyle = "#140c1c"; ctx.strokeText(s, x, y);
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}
function drawStage(key) {
  const im = STAGE_IMG[key], st = STAGES[key];
  if (im && im.complete && im.naturalWidth && !im.bad) {
    const sc = Math.max(W / im.naturalWidth, H / im.naturalHeight);
    ctx.drawImage(im, (W - im.naturalWidth * sc) / 2, H - im.naturalHeight * sc, im.naturalWidth * sc, im.naturalHeight * sc);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, st.sky[0]); g.addColorStop(1, st.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(0, FLOOR, W, H - FLOOR);
    text(st.name.toUpperCase(), W / 2, 200, 30, "rgba(255,255,255,.25)");
  }
}
function portrait(id, x, y, w, h) {
  const im = IMG[id] && IMG[id].idle, md = meta(id, "idle");
  if (!im || !im.naturalWidth) return;
  const sh = md.h * 0.36, sw = Math.min(md.w, sh * w / h), sx = Math.max(0, Math.min(md.w - sw, md.w * 0.5 - sw / 2 + md.w * 0.05));
  ctx.drawImage(im, sx, 0, sw, sh, x, y, w, h);
}
function drawHUD() {
  const [p, q] = game.fighters;
  [p, q].forEach((f, s) => {
    const x = s === 0 ? 60 : W - 60, dir = s === 0 ? 1 : -1, bw = 470;
    ctx.fillStyle = "#140c1c"; ctx.fillRect(s === 0 ? x - 4 : x - bw - 4, 36, bw + 8, 34);
    ctx.fillStyle = "#c0262d"; ctx.fillRect(s === 0 ? x : x - bw, 40, bw, 26);
    const hw = bw * Math.max(0, f.hp) / 1000;
    ctx.fillStyle = f.hp > 300 ? "#ffd23f" : "#ff7a2f"; ctx.fillRect(s === 0 ? x + bw - hw : x - bw, 40, hw, 26);
    text(f.ch.name, s === 0 ? x : x, 90, 22, "#fff", s === 0 ? "left" : "right");
    for (let r = 0; r < ROUNDS_TO_WIN; r++) {
      ctx.fillStyle = r < f.wins ? "#ffd23f" : "rgba(255,255,255,.25)";
      ctx.beginPath(); ctx.arc(W / 2 + dir * (-80 - r * 26), 100, 9, 0, Math.PI * 2); ctx.fill();
    }
    // super meter
    const mx = s === 0 ? 60 : W - 60 - 300;
    ctx.fillStyle = "#140c1c"; ctx.fillRect(mx - 3, H - 40, 306, 22);
    ctx.fillStyle = f.meter >= 100 ? (game.t % 20 < 10 ? "#5ff0ff" : "#ffffff") : "#2fa8ff";
    ctx.fillRect(s === 0 ? mx : mx + 300 - f.meter * 3, H - 37, f.meter * 3, 16);
    text(f.meter >= 100 ? "SUPER READY" : "SUPER", s === 0 ? mx : mx + 300, H - 58, 14, f.meter >= 100 ? "#5ff0ff" : "#ccc", s === 0 ? "left" : "right", "Press Start 2P");
  });
  text(String(game.timer), W / 2, 54, 46, "#fff");
}
// ---------- presentation: boot loader (90s TV powering on, channel surfing) and the animated title ----------
const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const NOISE = document.createElement("canvas"); NOISE.width = 160; NOISE.height = 90;
const nctx = NOISE.getContext("2d"), nimg = nctx.createImageData(160, 90);
function drawStatic(alpha) {
  if (alpha <= 0) return;
  const d = nimg.data;
  for (let i = 0; i < d.length; i += 4) { const v = (Math.random() * 255) | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  nctx.putImageData(nimg, 0, 0);
  ctx.save(); ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = false; ctx.drawImage(NOISE, 0, 0, W, H); ctx.restore();
}
const SCAN = (() => { const c = document.createElement("canvas"); c.width = 4; c.height = 3; const x = c.getContext("2d"); x.fillStyle = "rgba(0,0,0,.55)"; x.fillRect(0, 0, 4, 1); return c; })();
let SCAN_PAT = null;
function scanlines(a) { SCAN_PAT = SCAN_PAT || ctx.createPattern(SCAN, "repeat"); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = SCAN_PAT; ctx.fillRect(0, 0, W, H); ctx.restore(); }
function vignette(a) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
const SHOWS = [];
for (const c of ROSTER) if (!SHOWS.find(s => s.show === c.show)) SHOWS.push({ show: c.show, stage: c.stage });
const stageReady = k => { const im = STAGE_IMG[k]; return im && im.complete && im.naturalWidth && !im.bad; };
function drawCover(im, scale, ox, oy, alpha = 1) {
  const sc = Math.max(W / im.naturalWidth, H / im.naturalHeight) * scale, w = im.naturalWidth * sc, h = im.naturalHeight * sc;
  ctx.save(); ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = false; ctx.drawImage(im, (W - w) / 2 + ox, (H - h) / 2 + oy, w, h); ctx.restore();
}
function drawFighterAt(id, pose, x, floorY, scale, face) {
  const im = IMG[id][poseOf(id, pose)], md = meta(id, pose);
  if (!im || !im.naturalWidth) return;
  ctx.save(); ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(x, floorY + 3, 55 * scale / 0.6, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(Math.round(x), Math.round(floorY)); if (face < 0) ctx.scale(-1, 1);
  ctx.drawImage(im, -md.ax * scale, -md.h * scale, md.w * scale, md.h * scale); ctx.restore();
}

function drawBoot() {
  const t = game.bootT;
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  // 1) CRT power-on: a dot, a line, then the picture
  if (t < 34) {
    if (t < 6) { const r = 4 + t * 2; const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, r * 6); g.addColorStop(0, "#fff"); g.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); return; }
    const a = ease((t - 6) / 10), b = ease((t - 16) / 12), w = W * a, h = Math.max(3, H * b);
    ctx.fillStyle = "#e8f4ff"; ctx.globalAlpha = t < 28 ? 1 : 1 - (t - 28) / 6; ctx.fillRect(W / 2 - w / 2, H / 2 - h / 2, w, h); ctx.globalAlpha = 1;
    return;
  }
  // 2) channel surfing through the shows while assets load
  const tt = t - 34, CH = 40, ch = Math.floor(tt / CH), local = tt % CH;
  const avail = SHOWS.filter(s => stageReady(s.stage));
  if (avail.length) {
    const s = avail[ch % avail.length];
    const jx = local < 6 ? (Math.random() - 0.5) * 40 : 0, jy = local < 6 ? (Math.random() - 0.5) * 24 : 0;
    drawCover(STAGE_IMG[s.stage], 1.05 + 0.02 * Math.sin(tt / 40), jx, jy);
    ctx.fillStyle = "rgba(20,0,40,.28)"; ctx.fillRect(0, 0, W, H);
    if (local < 6) { ctx.fillStyle = `rgba(255,0,120,.12)`; ctx.fillRect(0, 0, W, H); }
    text(`CH ${String(3 + (ch % 60)).padStart(2, "0")}`, W - 60, 64, 34, "#62ff7a", "right", "Press Start 2P");
    text(s.show.toUpperCase(), 60, 64, 18, "#62ff7a", "left", "Press Start 2P");
  }
  drawStatic(local < 8 ? 0.9 - local * 0.1 : 0.1);
  const ry = ((tt * 5) % (H + 240)) - 120; ctx.fillStyle = "rgba(255,255,255,.07)"; ctx.fillRect(0, ry, W, 90);
  // fighter parade marching across the bottom (2-frame step: walk and idle)
  const walkers = ROSTER.filter(c => IMG[c.id].walk && IMG[c.id].walk.naturalWidth);
  const gap = 160, period = W + 260 + ROSTER.length * gap;
  walkers.forEach((c, i) => {
    const x = ((tt * 3.2 - ROSTER.indexOf(c) * gap) % period + period) % period - 130;
    if (x < -130 || x > W + 130) return;
    const step = Math.floor((tt + i * 5) / 9) % 2;
    drawFighterAt(c.id, step ? "walk" : "idle", x, H - 108 - (step ? 4 : 0), 0.34 * (c.size || 1), 1);
  });
  // VCR bar
  const pct = LOAD.total ? LOAD.done / LOAD.total : 0, ready = pct >= 1 && t > 230;
  ctx.fillStyle = "rgba(0,0,0,.72)"; ctx.fillRect(0, H - 92, W, 92);
  text("PLAY", 78, H - 46, 20, "#fff", "left", "Press Start 2P"); if (ready || tt % 40 < 26) text("▶", 40, H - 46, 20, "#62ff7a", "left", "Press Start 2P");
  const bx = 250, bw = 760, n = 38, filled = Math.floor(n * Math.min(1, pct, t / 230));
  for (let i = 0; i < n; i++) { ctx.fillStyle = i < filled ? (i > n * 0.8 ? "#ffd23f" : "#62ff7a") : "rgba(255,255,255,.15)"; ctx.fillRect(bx + i * (bw / n), H - 60, bw / n - 5, 28); }
  text(`${Math.round(Math.min(1, pct, t / 230) * 100)}%`, W - 40, H - 46, 20, "#fff", "right", "Press Start 2P");
  // centre card
  if (!ready) {
    text("PLEASE STAND BY", W / 2, H / 2 - 40, 30, "#fff", "center", "Press Start 2P");
    text(`LOADING ${Math.round(Math.min(1, pct, t / 230) * LOAD.total)} / ${LOAD.total}`, W / 2, H / 2 + 10, 14, "#62ff7a", "center", "Press Start 2P");
  } else if ((t - 230) % 50 < 34) {
    ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(W / 2 - 330, H / 2 - 80, 660, 110);
    text(isTouch ? "TAP TO START" : "PRESS START", W / 2, H / 2 - 24, 40, "#ffd23f", "center", "Press Start 2P");
  }
  scanlines(0.45); vignette(0.6);
}

// logo: extruded gradient lettering, built once the Bungee font is ready
const LOGO = { c: null, w: 1120, h: 340 };
function buildLogo() {
  const c = document.createElement("canvas"); c.width = LOGO.w; c.height = LOGO.h; const x = c.getContext("2d");
  x.textAlign = "center"; x.textBaseline = "middle"; x.lineJoin = "round";
  for (const [tx, sz, y] of [["SITCOM", 118, 105], ["SHOWDOWN", 150, 235]]) {
    x.font = `${sz}px 'Bungee', Impact, sans-serif`;
    for (let d = 16; d > 0; d -= 2) { x.fillStyle = d > 9 ? "#2a0710" : "#9b1d2a"; x.fillText(tx, LOGO.w / 2 + d * 0.6, y + d); }
    x.lineWidth = 16; x.strokeStyle = "#140c1c"; x.strokeText(tx, LOGO.w / 2, y);
    const g = x.createLinearGradient(0, y - sz / 2, 0, y + sz / 2);
    g.addColorStop(0, "#fffbd0"); g.addColorStop(0.42, "#ffd23f"); g.addColorStop(0.75, "#ff9d1a"); g.addColorStop(1, "#ff5a1a");
    x.fillStyle = g; x.fillText(tx, LOGO.w / 2, y);
    x.lineWidth = 3; x.strokeStyle = "rgba(255,255,255,.55)"; x.strokeText(tx, LOGO.w / 2, y - 2);
  }
  LOGO.c = c;
}
buildLogo();
if (document.fonts && document.fonts.load) document.fonts.load("120px Bungee").then(buildLogo).catch(() => {});
const SHINE = document.createElement("canvas"); SHINE.width = LOGO.w; SHINE.height = LOGO.h; const shx = SHINE.getContext("2d");
function drawLogo(cx, cy, scale, alpha, shinePos) {
  shx.globalCompositeOperation = "source-over"; shx.clearRect(0, 0, LOGO.w, LOGO.h); shx.drawImage(LOGO.c, 0, 0);
  if (shinePos > -0.3 && shinePos < 1.3) {
    shx.globalCompositeOperation = "source-atop";
    const px = shinePos * (LOGO.w + 400) - 200, g = shx.createLinearGradient(px - 120, 0, px + 120, LOGO.h);
    g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,.85)"); g.addColorStop(1, "rgba(255,255,255,0)");
    shx.fillStyle = g; shx.fillRect(0, 0, LOGO.w, LOGO.h);
  }
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, cy); ctx.scale(scale, scale);
  ctx.drawImage(SHINE, -LOGO.w / 2, -LOGO.h / 2); ctx.restore();
}
const MOTES = [];
function drawTitle() {
  const t = game.titleT;
  // background: each show's stage with a slow camera move, cross-fading every 5 seconds
  const n = SHOWS.length, dur = 300, idx = Math.floor(t / dur) % n, lt = t % dur;
  const kb = (k, u) => { const st = SHOWS[k].stage; if (stageReady(st)) drawCover(STAGE_IMG[st], 1.08 + 0.07 * u, (k % 2 ? -1 : 1) * (40 - 80 * u), 10 - 20 * u); };
  kb(idx, lt / dur);
  if (lt > dur - 45) { ctx.save(); ctx.globalAlpha = (lt - (dur - 45)) / 45; kb((idx + 1) % n, 0); ctx.restore(); }
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "rgba(12,6,28,.82)"); g.addColorStop(0.45, "rgba(12,6,28,.35)"); g.addColorStop(1, "rgba(12,6,28,.75)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // light rays behind the logo
  ctx.save(); ctx.translate(W / 2, 200); ctx.rotate(t / 400); ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 14; i++) { ctx.rotate(Math.PI * 2 / 14); ctx.fillStyle = i % 2 ? "rgba(255,210,63,.05)" : "rgba(255,120,40,.035)"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1100, -110); ctx.lineTo(1100, 110); ctx.fill(); }
  ctx.restore();
  // drifting sparkles
  if (t % 3 === 0) MOTES.push({ x: Math.random() * W, y: H + 10, vy: -(0.6 + Math.random() * 1.6), vx: (Math.random() - 0.5) * 0.4, s: 2 + Math.random() * 3, life: 0, c: Math.random() < 0.6 ? "#ffd23f" : "#ffffff" });
  for (const m of MOTES) { m.x += m.vx; m.y += m.vy; m.life++; ctx.globalAlpha = 0.35 + 0.35 * Math.sin(m.life / 7); ctx.fillStyle = m.c; ctx.fillRect(m.x, m.y, m.s, m.s); }
  ctx.globalAlpha = 1; while (MOTES.length && MOTES[0].y < -10) MOTES.shift();
  // fighters: groups of five take the stage, breathing, facing the centre
  const size = 5, groups = Math.ceil(ROSTER.length / size), gdur = 260, gi = Math.floor(t / gdur) % groups, gt = t % gdur;
  const grp = Array.from({ length: size }, (_, j) => ROSTER[(gi * size + j) % ROSTER.length]);
  grp.forEach((c, i) => {
    const enter = ease((gt - i * 5) / 28), exit = gt > gdur - 24 ? ease((gt - (gdur - 24)) / 24) : 0;
    const x = W * (i + 1) / (grp.length + 1), y = H - 52 + (1 - enter) * 320 + exit * 320 + Math.sin((t + i * 17) / 11) * 3;
    drawFighterAt(c.id, "idle", x, y, 0.42 * (c.size || 1), x < W / 2 ? 1 : -1);
  });
  // logo: slams in, flashes, then floats with a shine every few seconds
  const k = ease(t / 20), scale = 3 - 2 * k, shake = t > 18 && t < 34 ? (Math.random() - 0.5) * (34 - t) * 1.6 : 0;
  drawLogo(W / 2 + shake, 190 + Math.sin(t / 45) * 6 + shake, scale * 0.92, Math.min(1, t / 10), ((t - 40) % 240) / 70);
  if (t >= 18 && t < 40) { ctx.fillStyle = `rgba(255,255,255,${1 - (t - 18) / 22})`; ctx.fillRect(0, 0, W, H); }
  if (t > 30) {
    ctx.globalAlpha = Math.min(1, (t - 30) / 20);
    text(GAME_SUBTITLE.toUpperCase(), W / 2, 352, 20, "#fff", "center", "Press Start 2P");
    ctx.globalAlpha = 1;
  }
  if (t > 55 && t % 50 < 36) {
    const ps = 1 + 0.05 * Math.sin(t / 7);
    ctx.save(); ctx.translate(W / 2, 410); ctx.scale(ps, ps); text(isTouch ? "TAP TO START" : "PRESS START", 0, 0, 30, "#ffd23f", "center", "Press Start 2P"); ctx.restore();
  }
  // marquee
  ctx.fillStyle = "rgba(0,0,0,.8)"; ctx.fillRect(0, H - 38, W, 38);
  const mq = SHOWS.map(s => s.show.toUpperCase()).join("  ★  ") + "  ★  UNOFFICIAL FAN-MADE TRIBUTE, NOT AFFILIATED WITH ANY SHOW, STUDIO OR NETWORK  ★  ";
  ctx.font = "14px 'Press Start 2P', monospace"; const mw = ctx.measureText(mq).width, mx = -((t * 1.6) % mw);
  ctx.fillStyle = "#ffd23f"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(mq, mx, H - 19); ctx.fillText(mq, mx + mw, H - 19);
  if (!isTouch) text(music.muted ? "P: MUSIC OFF" : "P: MUSIC ON", W - 24, 28, 11, "#bbb", "right", "Press Start 2P");
  scanlines(0.16); vignette(0.45);
}

function drawOverlay() {
  if (game.scene !== "fight" && !isTouch) text("\u26F6 FULL SCREEN (O)", 24, 28, 11, "#bbb", "left", "Press Start 2P");
  if (fsTip > 0) {
    fsTip--; ctx.fillStyle = "rgba(0,0,0,.88)"; ctx.fillRect(W / 2 - 450, H / 2 - 100, 900, 200);
    text("FULL SCREEN ON IPHONE", W / 2, H / 2 - 52, 24, "#ffd23f", "center", "Press Start 2P");
    text("Open this page in Safari, tap Share,", W / 2, H / 2, 16, "#fff", "center", "Press Start 2P");
    text("then Add to Home Screen and launch it there.", W / 2, H / 2 + 38, 16, "#fff", "center", "Press Start 2P");
  }
}
function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
  if (game.scene === "boot") { drawBoot(); return; }
  if (game.scene === "title") { drawTitle(); return; }
  if (game.scene === "mode") {
    drawStage("winslow"); ctx.fillStyle = "rgba(10,6,20,.7)"; ctx.fillRect(0, 0, W, H);
    text("SELECT MODE", W / 2, 160, 56, "#ffd23f");
    ["ARCADE  (VS CPU)", "VERSUS  (2 PLAYERS)"].forEach((s, i) => text((game.menu === i ? "> " : "  ") + s, W / 2, 300 + i * 80, 30, game.menu === i ? "#fff" : "#888", "center", "Press Start 2P"));
    text("P1: WASD move  F G V B attack  H special  T super", W / 2, 560, 14, "#ccc", "center", "Press Start 2P");
    text("P2: ARROWS move  J K M , attack  L special  I super", W / 2, 590, 14, "#ccc", "center", "Press Start 2P");
    text("Controllers: X Y A B attack, LB special, RB super", W / 2, 620, 14, "#ccc", "center", "Press Start 2P");
    return;
  }
  if (game.scene === "select") {
    drawStage(ROSTER[game.sel[0]].stage); ctx.fillStyle = "rgba(10,6,20,.72)"; ctx.fillRect(0, 0, W, H);
    text("CHOOSE YOUR FIGHTER", W / 2, 60, 44, "#ffd23f");
    const cols = 5, cw = 150, chh = 150, gx = W / 2 - cols * cw / 2, gy = 110;
    ROSTER.forEach((c, i) => {
      const x = gx + (i % cols) * cw, y = gy + Math.floor(i / cols) * (chh + 30);
      ctx.fillStyle = "#24183a"; ctx.fillRect(x + 6, y + 6, cw - 12, chh - 12);
      portrait(c.id, x + 6, y + 6, cw - 12, chh - 12);
      [0, 1].forEach(s => { if (game.sel[s] === i && !(s === 1 && game.mode === "arcade")) { ctx.lineWidth = 6; ctx.strokeStyle = s === 0 ? "#3fa8ff" : "#ff4b4b"; ctx.strokeRect(x + 4 + s * 6, y + 4 + s * 6, cw - 8 - s * 12, chh - 8 - s * 12); } });
      text(c.name, x + cw / 2, y + chh + 8, 11, "#fff", "center", "Press Start 2P");
    });
    [0, 1].forEach(s => {
      if (s === 1 && game.mode === "arcade") return;
      const c = ROSTER[game.sel[s]], md = meta(c.id, "idle"), im = IMG[c.id].idle, sc = 0.62;
      const x = s === 0 ? 150 : W - 150;
      if (im && im.naturalWidth) { ctx.save(); ctx.translate(x, H - 20); if (s === 1) ctx.scale(-1, 1); ctx.drawImage(im, -md.ax * sc, -md.h * sc, md.w * sc, md.h * sc); ctx.restore(); }
      text(c.show.toUpperCase(), x, H - 330, 13, "#ccc", "center", "Press Start 2P");
      if (game.ready[s]) text("READY!", x, H - 360, 22, "#ffd23f", "center", "Press Start 2P");
    });
    text(game.mode === "arcade" ? "ARCADE: beat 6 opponents" : "VERSUS: both players pick", W / 2, H - 30, 14, "#ccc", "center", "Press Start 2P");
    return;
  }
  if (game.scene === "fight" || game.scene === "result") {
    const sh = game.shake ? (Math.random() - 0.5) * game.shake : 0;
    ctx.setTransform(1, 0, 0, 1, sh, sh * 0.5);
    drawStage(game.stage);
    const [p, q] = game.fighters;
    // the attacker draws on top
    (p.state === "attack" ? [q, p] : [p, q]).forEach(f => f.draw());
    for (const s of game.sparks) { ctx.fillStyle = s.color; ctx.globalAlpha = s.life / 16; ctx.fillRect(s.x - 5, s.y - 5, 10, 10); }
    ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (game.superFreeze > 0 && game.superBy) {
      ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(0, 0, W, H);
      game.superBy.draw();
      ctx.fillStyle = "#c0262d"; ctx.fillRect(0, H / 2 - 50, W, 100);
      text(game.superBy.ch.super, W / 2 + (game.superFreeze - 25) * 6, H / 2, 56, "#ffd23f");
    }
    drawHUD();
    if (game.banner) { text(game.banner.text, W / 2, 300, 90, "#ffd23f"); text(game.banner.sub, W / 2, 390, 36, "#fff"); }
    if (game.scene === "fight" && game.mode === "arcade" && game.frame < 120 && !game.banner) {}
    if (game.scene === "result") {
      ctx.fillStyle = "rgba(10,6,20,.6)"; ctx.fillRect(0, 0, W, H);
      const w = game.result; text(game.mode === "arcade" ? (w.slot === 0 ? "YOU WIN!" : "GAME OVER") : `${w.ch.name} WINS!`, W / 2, 260, 80, "#ffd23f");
      if (game.mode === "arcade" && w.slot === 0) text(`${w.ch.name} RUNS THE NEIGHBORHOOD`, W / 2, 350, 22, "#fff", "center", "Press Start 2P");
      if (game.resultT > 60) text(isTouch ? "TAP START" : "PRESS ENTER", W / 2, 450, 22, "#fff", "center", "Press Start 2P");
    }
  }
}

// ---------- loop ----------
let last = performance.now(), acc = 0;
function loop(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= 1000 / 60) { update(); acc -= 1000 / 60; }
  draw(); ctx.setTransform(1, 0, 0, 1, 0, 0); drawOverlay(); requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.__game = game; window.__music = music;
})();
