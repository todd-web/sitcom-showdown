// Fighting game engine, part 1 of 6 (core.js): constants, debug hook, asset loading, audio, show voice clips, input and touch controls.
// Plain classic scripts loaded in order by index.html (core, fight, flow, draw, screens, main). They share one
// global scope, so a top-level name declared in one part is visible in the parts after it. Top-level code in a
// part may only call functions from the same or an earlier part (calls inside functions run after all parts load).
"use strict";
const W = 1280, H = 720, FLOOR = 650, S = 0.78;      // S = sprite draw scale
// reel capture (?reel=1, _tools/capture_reel.py). Reel mode keeps every fighter, banner, cut-in and bubble inside the
// center column x 255..1025 (REEL_X0..REEL_X1 in draw.js), so the walls close in to 365..915 and a per-frame box clamp
// (reelClamp in fight.js) holds each fighter's drawn box inside the column. ?banners=0 (the 9:16 variant, whose
// captions carry them) hides the round, K.O., WINS, stage break and assist banners.
const REEL = /[?&]reel=1/.test(location.search);
const REEL_BANNERS = !(REEL && /[?&]banners=0/.test(location.search));
const LEFT_WALL = REEL ? 365 : 90, RIGHT_WALL = REEL ? W - 365 : W - 90, BODY = 55; // BODY = half body width for spacing
const ROUND_TIME = 99, ROUNDS_TO_WIN = 2, GRAVITY = 1.15, JUMP_V = -23;
const cv = document.getElementById("c"), ctx = cv.getContext("2d");
// HD hand-drawn sprites: smooth scaling on (Third Strike look). Only the TV static keeps hard pixels.
function smooth(c) { c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high"; }
smooth(ctx);

// ---------- debug hook for headless tests (window.__rr). Harmless in play: a capped event log, and the
// forced-input and manual-step helpers do nothing unless a test calls them. ----------
const RR_LOG = [];
function rrLog(s) { RR_LOG.push(s); if (RR_LOG.length > 600) RR_LOG.splice(0, RR_LOG.length - 600); }
// cpu / hush: reel director hooks (__rr.cpuPress, __rr.cpuHush) that steer a CPU side (see cpuIn in fight.js)
// calm: the CPU still moves and blocks but never attacks, tags or calls an assist on its own (reel set pieces press through it)
const FORCE = [{ held: {}, press: new Set(), cpu: new Set(), hush: 0, walk: 0, walkDir: 1, calm: false }, { held: {}, press: new Set(), cpu: new Set(), hush: 0, walk: 0, walkDir: 1, calm: false }];
// reel capture (_tools/capture_reel.py): every music change, voice clip and sound effect, stamped with the game frame
// (game.t, plus the clip's delay in frames), so the soundtrack can be rendered offline in sync with a frame-stepped
// capture. ?reel=1 hides the desktop hint text (full screen, music toggle, showcase prompts) for clean captures.
const AUDIO_LOG = [];
function aLog(e) { let f = 0; try { f = game.t; } catch (x) {} e.f = f + (e.f || 0); AUDIO_LOG.push(e); if (AUDIO_LOG.length > 60000) AUDIO_LOG.splice(0, 10000); }
// Background walkers are OFF (Todd 2026-10-18): nothing crosses any stage. The walker art stays on disk and the
// stage data keeps its walker keys; flip this to bring the code path back.
const WALKERS_ON = false;

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
// Stages, walkers and portraits load only when assets/asset-index.json lists them (written by
// _tools/asset_index.py), so a stage or walker that is not drawn yet never makes a 404 in the console.
// No index (file://, or the file is missing): every stage is tried and a failure is marked bad, silently.
const STAGE_IMG = {}, WALKER_IMG = {}, PORTRAIT_IMG = {}, TEAM_IMG = {};
// painted screen art (game/assets/ui/<name>.webp): title_poster_nologo (the Endgame-style ensemble poster: title screen and
// the reels' title card), title_keyart (menu; the title's fallback), select_bg, vs_bg. Each screen has a canvas fallback,
// so a missing file just draws the fallback. Listed under "ui" in the asset index.
const UI_IMG = {}, UI_FILES = ["title_poster_nologo", "title_keyart", "select_bg", "vs_bg"];
const uiReady = k => { const im = UI_IMG[k]; return !!(im && im.complete && im.naturalWidth && !im.bad); };
// TEAM IMAGE NAMING CONVENTION (item 8): game/assets/teams/<pair>.webp, where <pair> is the two fighter ids
// in ROSTER order joined by "_" (will_phil, dragonfly_sheneneh, george_weezy, carl_urkel, keenan_ed).
// Transparent background (magenta keyed), both fighters facing right, feet on the bottom edge.
// _tools/asset_index.py lists them under "teams"; an unlisted pair draws the super_2 fallback.
function pairKey(a, b) {
  const ia = ROSTER.findIndex(c => c.id === a), ib = ROSTER.findIndex(c => c.id === b);
  return ia <= ib ? a + "_" + b : b + "_" + a;
}
function quietImg(src, counted = true) {
  const im = new Image(); if (counted) track(im);
  im.onerror = () => { im.bad = true; }; im.src = src; return im;
}
LOAD.total++;
fetch("assets/asset-index.json").then(r => r.ok ? r.json() : null).catch(() => null).then(ix => {
  const has = (list, f) => !ix || (Array.isArray(list) && list.includes(f));
  for (const [k, st] of Object.entries(STAGES)) {
    const f = String(st.file || "").replace(/^.*\//, "");
    if (ix && !has(ix.stages, f)) { STAGE_IMG[k] = { bad: true }; continue; }
    STAGE_IMG[k] = quietImg(st.file);
  }
  if (ix && WALKERS_ON) {
    for (const st of Object.values(STAGES)) {
      const w = st.walker; if (!w || WALKER_IMG[w]) continue;
      const fr = [1, 2].filter(n => has(ix.walkers, `${w}_${n}.webp`)).map(n => quietImg(`assets/walkers/${w}_${n}.webp`, false));
      if (fr.length) WALKER_IMG[w] = fr;
    }
  }
  if (ix) {
    for (const ch of ROSTER) if (has(ix.portraits, ch.id + ".webp")) PORTRAIT_IMG[ch.id] = quietImg(`assets/portraits/${ch.id}.webp`, false);
    // team super art (item 8): only pairs listed under "teams" in the index load; the rest use the fallback
    for (const ch of ROSTER) {
      const k = ch.tag && pairKey(ch.id, ch.tag);
      if (k && !TEAM_IMG[k] && has(ix.teams, k + ".webp")) TEAM_IMG[k] = quietImg(`assets/teams/${k}.webp`, false);
    }
  }
  for (const k of UI_FILES) if (has(ix && ix.ui, k + ".webp")) UI_IMG[k] = quietImg(`assets/ui/${k}.webp`, false);
  loadAssists(ix);
  if (!ix || ix.voiceSlots) loadVoiceSlots();
  rrLog("assetIndex " + (ix ? "ok" : "none"));
}).finally(() => LOAD.done++);
// ---------- assist strikers: art contract ----------
// game/assets/assists/assists.json: { key: { name, size, poses: { run: { file, w, h, ax }, atk1: {...}, atk2: {...}, exit: {...} } } }
// Files live under game/assets/assists/<key>/ (a bare file name is read from that folder). size: on-screen height
// factor like a fighter's roster size (drawn at S * size, feet on the floor, ax = the foot anchor x in the source).
// The asset index lists "assists.json" and every "<key>/<file>" under "assists" (_tools/asset_index.py); only listed
// files load, so missing art never 404s. An assist with no loaded art still runs its attack, is logged, draws nothing.
const ASSIST_ART = {};
function loadAssists(ix) {
  const listed = f => !ix || (Array.isArray(ix.assists) && ix.assists.includes(f));
  if (!listed("assists.json")) { rrLog("assists none"); return; }
  LOAD.total++;
  fetch("assets/assists/assists.json").then(r => r.ok ? r.json() : null).catch(() => null).then(j => {
    if (!j || typeof j !== "object") { rrLog("assists none"); return; }
    for (const [key, a] of Object.entries(j)) {
      if (!a || typeof a !== "object") continue;
      const out = { name: String(a.name || key), size: +a.size || 1, poses: {} };
      for (const [pn, p] of Object.entries(a.poses || {})) {
        if (!p || !p.file) continue;
        const rel = String(p.file).replace(/\\/g, "/").replace(/^.*assets\/assists\//, "").replace(/^\/+/, "");
        const path = rel.includes("/") ? rel : key + "/" + rel;
        if (!listed(path)) { rrLog(`assist missing ${key} ${pn} ${path}`); continue; }
        out.poses[pn] = { im: quietImg("assets/assists/" + path), w: +p.w || 0, h: +p.h || 0, ax: p.ax == null ? null : +p.ax };
      }
      ASSIST_ART[key] = out;
    }
    rrLog("assists " + Object.keys(ASSIST_ART).length);
  }).finally(() => LOAD.done++);
}
// Pose fallback: a missing frame drops to the previous frame, then the base pose, then idle.
// walk_2 -> walk_1 -> walk -> idle, special_2 -> special_1 -> special -> idle, idle_2 -> idle.
// A base name with no art tries its first frame (walk -> walk_1), so 14-pose and 18-pose sets both work.
const POSE_CACHE = {};
function resolvePose(id, pose) {
  const key = id + "/" + pose; if (key in POSE_CACHE) return POSE_CACHE[key];
  const set = MANIFEST[id] || {}, tries = [pose], m = /^(.*)_(\d+)$/.exec(pose);
  if (m) { for (let n = +m[2] - 1; n >= 1; n--) tries.push(m[1] + "_" + n); tries.push(m[1]); }
  else tries.push(pose + "_1");
  if (pose === "taunt") tries.push("win", "win_1", "intro", "intro_1");   // missing taunt art: win, then intro, then idle
  tries.push("idle", "idle_1");
  let out = tries.find(p => set[p]); if (!out) out = Object.keys(set)[0] || "idle";
  return (POSE_CACHE[key] = out);
}
const meta = (id, pose) => (MANIFEST[id] && MANIFEST[id][resolvePose(id, pose)]) || { w: 200, h: 480, ax: 100, reach: 100, back: 100 };
const poseOf = resolvePose;

// ---------- audio: synth sound effects + music tracks (no actor voices) ----------
let AC = null;
function audio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  if (AC) decodeAll();
  if (AC && AC.state === "suspended") AC.resume();
  return AC;
}
const MUSIC_FILES = { title: "assets/music/title_a.mp3", select: "assets/music/title_b.mp3", fight1: "assets/music/fight_a.mp3",
                      fight2: "assets/music/fight_b.mp3", victory: "assets/music/victory.mp3",
                      fight3: "assets/music/fight3.mp3", fight4: "assets/music/fight4.mp3", map: "assets/music/map.mp3" };
const music = { raw: {}, buf: {}, el: {}, cur: null, node: null, gain: null, muted: false, vol: 0.55, want: null, wantLoop: true, missing: new Set() };
try { music.muted = localStorage.getItem("ss_muted") === "1"; } catch (e) {}
for (const [k, url] of Object.entries(MUSIC_FILES)) {
  LOAD.total++;
  fetch(url).then(r => { if (!r.ok) { music.missing.add(k); return null; } return r.arrayBuffer(); })
    .then(ab => { if (!ab) return; music.raw[k] = ab; if (AC) decodeOne(k); })
    .catch(() => { const a = new Audio(url); a.preload = "auto"; a.addEventListener("error", () => { music.missing.add(k); delete music.el[k]; }); music.el[k] = a; })   // file:// fallback
    .finally(() => LOAD.done++);
}
// fight theme by the home stage's decade: 70s funk (fight3), 90s new jack swing (fight4) rotating with the
// two original themes, 80s the two original themes. A theme whose file is missing drops to fight1/fight2.
const THEME_BY_DECADE = { "70s": ["fight3"], "80s": ["fight1", "fight2"], "90s": ["fight4", "fight1", "fight2"] };
let themeTurn = 0;
function fightTheme(stageKey) {
  const st = STAGES[stageKey] || {}, list = (THEME_BY_DECADE[st.decade] || ["fight1", "fight2"]).filter(k => !music.missing.has(k));
  const n = themeTurn++;
  return list.length ? list[n % list.length] : (n % 2 ? "fight2" : "fight1");
}

// ---------- voice: real show clips from assets/voice/<key>.mp3 (no synthetic voices) ----------
// A clip that is missing or not loaded yet falls back to a synth stinger. Nothing here throws.
const VOICE = { buf: {}, el: {}, state: {}, listed: null, lines: {}, slots: {}, last: {}, busy: {}, node: {}, mute: new Set() };
// manifest.json: { key: { file, line, ... } }. The line feeds the in-fight speech bubble. Slot keys for the
// optional "special" and "taunt" clips come from the <id>_special / <id>_taunt naming convention in the manifest,
// overridden by assets/voice/slots.json ({ id: { special: key|null, taunt: key|null } }) when the asset index lists it.
// reel capture: every listed clip is decoded up front (counted in LOAD), so every clip's real length is known when the
// no-overlap rule in playVoice checks it
if (REEL) LOAD.total++;
fetch("assets/voice/manifest.json").then(r => r.ok ? r.json() : null).then(j => {
  if (!j) return;
  const arr = Array.isArray(j) ? j : Array.isArray(j.clips) ? j.clips : Object.entries(j).map(([k, v]) => Object.assign({ key: k }, typeof v === "object" ? v : {}));
  const keyOf = c => c && (c.key || c.id || String(c.file || "").replace(/^.*\//, "").replace(/\.mp3$/, ""));
  VOICE.listed = new Set(arr.map(keyOf).filter(Boolean));
  for (const c of arr) { const k = keyOf(c); if (k && c.line) VOICE.lines[k] = String(c.line); }
  for (const ch of ROSTER) for (const sl of ["special", "taunt"]) {
    const k = `${ch.id}_${sl}`, cur = VOICE.slots[ch.id] || (VOICE.slots[ch.id] = {});
    if (VOICE.listed.has(k) && cur[sl] === undefined) cur[sl] = k;
  }
  if (REEL) for (const k of VOICE.listed) loadVoice(k, true);
}).catch(() => {}).finally(() => { if (REEL) LOAD.done++; });
// called by the asset-index loader when slots.json is listed (or there is no index); a null slot stays silent
function loadVoiceSlots() {
  fetch("assets/voice/slots.json").then(r => r.ok ? r.json() : null).catch(() => null).then(j => {
    if (!j || typeof j !== "object") return;
    for (const [id, v] of Object.entries(j)) if (v && typeof v === "object") VOICE.slots[id] = { special: v.special || null, taunt: v.taunt || null };
    rrLog("voiceSlots " + Object.keys(j).length);
  });
}
// the clip key for a fighter's slot: intro / super / win from the roster soundbites, special / taunt from VOICE.slots
function voiceKey(ch, slot) {
  if (!ch) return null;
  if (slot === "special" || slot === "taunt") { const s = VOICE.slots[ch.id]; return (s && s[slot]) || null; }
  return (ch.soundbites && ch.soundbites[slot]) || null;
}
// counted: the load joins LOAD (reel preload), so the capture waits for it
function loadVoice(key, counted = false) {
  if (!key || VOICE.state[key]) return;
  if (VOICE.listed && !VOICE.listed.has(key)) { VOICE.state[key] = "missing"; return; }
  VOICE.state[key] = "loading"; const url = `assets/voice/${key}.mp3`;
  let fin = () => {}; if (counted) { LOAD.total++; let once = false; fin = () => { if (!once) { once = true; LOAD.done++; } }; }
  fetch(url).then(r => { if (!r.ok) throw 404; return r.arrayBuffer(); })
    .then(ab => new Promise((res, rej) => { if (!AC) return rej(0); AC.decodeAudioData(ab, res, rej); }))
    .then(b => { VOICE.buf[key] = b; VOICE.state[key] = "ready"; fin(); })
    .catch(e => {
      if (e === 404) { VOICE.state[key] = "missing"; fin(); return; }
      const a = new Audio(url); a.preload = "auto";      // file:// fallback
      a.addEventListener("canplaythrough", () => { VOICE.el[key] = a; VOICE.state[key] = "ready"; fin(); }, { once: true });
      a.addEventListener("error", () => { VOICE.state[key] = "missing"; fin(); }, { once: true });
      setTimeout(fin, 4000);
    });
}
// an assist's clip: assist.voice is a clip key, or { key, line } (the clip whose manifest line matches, case and
// punctuation ignored). Nothing on disk: null, the assist is silent.
const lineNorm = s => String(s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, "").replace(/\s+/g, " ").trim();
function assistVoiceKey(def) {
  const v = def && def.voice; if (!v) return null;
  const key = typeof v === "string" ? v : v.key, line = typeof v === "object" ? v.line : null;
  if (key && VOICE.listed && VOICE.listed.has(key)) return key;
  if (line) { const want = lineNorm(line); for (const [k, l] of Object.entries(VOICE.lines)) if (lineNorm(l) === want) return k; }
  return null;
}
function preloadVoices(ch) { if (ch) for (const sl of ["intro", "super", "win", "special", "taunt"]) loadVoice(voiceKey(ch, sl)); }
const VOICE_STINGER = { intro: "select", super: null, win: "round" };   // super already has its own whoosh
// clip length in seconds: the decoded buffer, else the element, else an estimate from the line
function voiceDur(key) {
  const b = VOICE.buf[key], el = VOICE.el[key];
  if (b && b.duration) return b.duration;
  if (el && isFinite(el.duration) && el.duration > 0) return el.duration;
  const n = String(VOICE.lines[key] || "").split(/\s+/).length; return Math.max(1, Math.min(3.5, 0.4 + n * 0.32));
}
// Show clips at full level: the voice bus runs at VOICE_GAIN and the music ducks to MUSIC_DUCK of its volume while a
// line plays, so a line always reads over the fight theme. Throttle (in game frames, so a stepped reel capture
// matches play): one fighter never starts two clips within VOICE_GAP frames (1.5 s). special / taunt are dropped
// inside that window; intro / super / win cut the fighter's own earlier line instead. A new clip while the OTHER
// fighter is mid-line plays ducked (VOICE_DUCKED); the audio log carries that gain for the reel mix.
const VOICE_GAIN = 1.25, VOICE_DUCKED = 0.5, MUSIC_DUCK = 0.4, VOICE_GAP = 90, VOICE_REPEAT = 600, VOICE_MAJOR = { intro: 1, super: 1, win: 1 };
let duckUntil = 0;
function duckMusic(sec) {
  const a = AC, g = music.gain; if (!a || !g) return;
  const now = a.currentTime, end = Math.max(duckUntil, now + sec); duckUntil = end;
  try { g.gain.cancelScheduledValues(now); g.gain.setTargetAtTime(music.vol * MUSIC_DUCK, now, 0.04); g.gain.setTargetAtTime(music.vol, end, 0.25); } catch (e) {}
}
// over: { key, id } plays that clip for a non-fighter speaker (an assist), never as a major slot.
// Reel capture (?reel=1): no two clips ever overlap. A clip that would start while any clip is still playing is
// DROPPED (logged voice-drop), not delayed. __rr.voiceMute(id, slot) silences one fighter slot (reel director).
function playVoice(ch, slot, delay = 0, over = null) {
  const key = over ? over.key : voiceKey(ch, slot), id = over ? over.id : ch && ch.id, major = !over && !!VOICE_MAJOR[slot];
  if (!key && !major) return;   // special / taunt with no clip: silence, no bubble
  if (VOICE.mute.has(id + "/" + slot) || VOICE.mute.has("*/" + slot)) { rrLog("voice-mute " + (key || id + "_" + slot)); return; }
  let t0 = 0; try { t0 = game.t; } catch (e) {}
  const at = t0 + Math.round(delay * 60), dur = key ? voiceDur(key) : 0;
  if (REEL && key) {
    const busy = Math.max(0, ...Object.values(VOICE.busy));
    if (at < busy) { rrLog("voice-drop " + key + " busy " + (busy - at)); return; }
  }
  if (!major && VOICE.last[id] != null && at - VOICE.last[id] < VOICE_GAP) { rrLog("voice-throttle " + key); return; }
  // the same special / taunt line never repeats within VOICE_REPEAT frames (10 s), so a taunt does not loop on every knockdown
  VOICE.lastKey = VOICE.lastKey || {};
  if (!major && key && VOICE.lastKey[key] != null && at - VOICE.lastKey[key] < VOICE_REPEAT) { rrLog("voice-repeat " + key); return; }
  if (key) VOICE.lastKey[key] = at;
  const other = Object.keys(VOICE.busy).some(k => k !== id && VOICE.busy[k] > at);
  const gain = other ? VOICE_DUCKED : 1;
  if (key) { VOICE.last[id] = at; VOICE.busy[id] = at + Math.round(dur * 60) + (REEL ? 3 : 0); }   // reel: a 50 ms pad between clips
  aLog(Object.assign({ type: "voice", key: key || null, slot, id, stinger: VOICE_STINGER[slot] || null, f: Math.round(delay * 60) }, gain !== 1 ? { gain } : {}));
  if (key && ch && typeof voiceBubble === "function") voiceBubble(ch, key, Math.round(delay * 60), dur, slot);
  const go = () => {
    const a = audio(), prev = VOICE.node[id];
    if (prev && major) { try { prev.stop(); } catch (e) {} }
    if (a && VOICE.buf[key]) {
      const n = a.createBufferSource(), g = a.createGain(); n.buffer = VOICE.buf[key]; g.gain.value = VOICE_GAIN * gain;
      n.connect(g); g.connect(a.destination); n.start(); VOICE.node[id] = n; duckMusic(n.buffer.duration);
      rrLog("voice " + key + (gain !== 1 ? " ducked" : "")); return;
    }
    if (VOICE.el[key]) { try { const el = VOICE.el[key]; el.volume = Math.min(1, gain); el.currentTime = 0; el.play().catch(() => {}); duckMusic(voiceDur(key)); rrLog("voice " + key); return; } catch (e) {} }
    if (!major) return;
    rrLog("voice-fallback " + (key || ch && ch.id + "_" + slot)); if (VOICE_STINGER[slot]) sfx(VOICE_STINGER[slot], true);
  };
  if (key && VOICE.state[key] === "loading") {   // give a clip that is still decoding a short grace period
    const s0 = performance.now(), wait = () => (VOICE.state[key] !== "loading" || performance.now() - s0 > 900) ? go() : setTimeout(wait, 50);
    setTimeout(wait, delay * 1000); return;
  }
  if (delay > 0) setTimeout(go, delay * 1000); else go();
}
// create the (suspended) audio context now so tracks decode during the loader; the first tap resumes it
try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
function decodeOne(k) {
  const ab = music.raw[k]; if (!ab || music.buf[k]) return; delete music.raw[k];
  AC.decodeAudioData(ab, b => { music.buf[k] = b; if (music.want === k && !music.node) { music.cur = null; playMusic(k, music.wantLoop); } }, () => {});
}
function decodeAll() { for (const k of Object.keys(music.raw)) decodeOne(k); }
function stopMusic(log) {
  if (log) { music.logged = null; aLog({ type: "music", key: null }); }
  if (music.node) { const g = music.gain, n = music.node; try { g.gain.setTargetAtTime(0, AC.currentTime, 0.15); n.stop(AC.currentTime + 0.6); } catch (e) {} }
  music.node = null;
  for (const a of Object.values(music.el)) { try { a.pause(); } catch (e) {} }
}
function playMusic(k, loop = true) {
  music.want = k; music.wantLoop = loop;
  if (music.logged !== k) { music.logged = k; aLog({ type: "music", key: k, loop }); }
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
// quiet: not logged (a voice stinger; the reel log already has the voice entry it stands in for)
function sfx(kind, quiet) {
  if (!quiet) aLog({ type: "sfx", key: kind });
  const a = audio(); if (!a) return;
  sfxOn(a, kind, a.currentTime, a.destination);
}
// one synth effect on context `a` at time `t` into `dest`: the live path and the reel's offline render share it
function sfxOn(a, kind, t, dest) {
  const g = a.createGain(); g.connect(dest);
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
// reel capture: one effect rendered offline (OfflineAudioContext, mono, `rate` Hz, 1 s) with the same synth code,
// returned as base64 little-endian float32 samples
function renderSfx(kind, rate = 48000) {
  const oc = new OfflineAudioContext(1, rate, rate); sfxOn(oc, kind, 0, oc.destination);
  return oc.startRendering().then(b => {
    const d = b.getChannelData(0), u8 = new Uint8Array(d.buffer, d.byteOffset, d.byteLength); let s = "";
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  });
}

// ---------- input ----------
// The listeners below are attached while core.js runs, but `game` is declared later in flow.js. A key or tap that
// lands before flow.js has run (slow network, or flow.js failed to load) would throw a ReferenceError on `game`, so
// the listeners read the scene through sceneNow(), which returns "" until game exists.
function sceneNow() { try { return game && game.scene ? game.scene : ""; } catch (e) { return ""; } }
const KEYS = new Set(), LATCH = new Set();   // LATCH keeps a quick tap alive until the next update reads it
addEventListener("keydown", e => { KEYS.add(e.code); LATCH.add(e.code); audio(); if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code)) e.preventDefault(); });
addEventListener("keyup", e => KEYS.delete(e.code));
// O is P2 TAG during a fight, so the full-screen hotkey only works outside the fight scene
addEventListener("keydown", e => { if (e.code === "KeyP") toggleMute(); if (e.code === "KeyO" && sceneNow() && sceneNow() !== "fight") goFullscreen(); });
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
  const sc = sceneNow(); if (!sc) return;                                                     // engine not up yet
  if (!isTouch && sc !== "fight" && y < 70 && x < 120) { goFullscreen(); return; }        // desktop corner icons
  if (!isTouch && sc !== "fight" && y < 70 && x > W - 220) { toggleMute(); return; }
  if (sc === "boot" || sc === "title" || sc === "map") LATCH.add("touch:start");
});
const KMAP = [
  { left: "KeyA", right: "KeyD", up: "KeyW", down: "KeyS", lp: "KeyF", hp: "KeyG", lk: "KeyV", hk: "KeyB", sp: "KeyH", su: "KeyT", tag: "KeyR", start: "Enter" },
  { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown", lp: "KeyJ", hp: "KeyK", lk: "KeyM", hk: "Comma", sp: "KeyL", su: "KeyI", tag: "KeyO", start: "ShiftRight" },
];
// assist: the ASSIST touch button and free pad buttons; the keyboard calls an assist with both heavies (ASSIST_CHORDS)
const BTNS = ["left", "right", "up", "down", "lp", "hp", "lk", "hk", "sp", "su", "tag", "start", "back", "assist"];
// assist chords per side: both heavies together (P1 G + B). P2 also takes K + M (heavy punch + the M key, which is
// P2's light kick on the current map) so both readings of "P2 K+M" work; P2's two heavies are K + comma.
const ASSIST_CHORDS = [[["hp", "hk"]], [["hp", "hk"], ["hp", "lk"]]];
const TOUCH = {};
function readPad(i) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const p = pads && pads[i]; if (!p) return {};
  const b = n => p.buttons[n] && p.buttons[n].pressed, ax = p.axes || [];
  const both = b(6) && b(7);   // both triggers together: ASSIST (one trigger alone stays TAG)
  return { left: b(14) || ax[0] < -0.5, right: b(15) || ax[0] > 0.5, up: b(12) || ax[1] < -0.5, down: b(13) || ax[1] > 0.5,
           lp: b(2), hp: b(3), lk: b(0), hk: b(1), sp: b(4), su: b(5), tag: (b(6) || b(7)) && !both, start: b(9), back: b(8),
           assist: both || b(10) || b(11) };   // LB special, RB super, LT/RT tag, LT+RT together or a stick click: assist
}
const prevIn = [{}, {}];
function readInput(slot) {
  const k = KMAP[slot], pad = readPad(slot), cur = {};
  for (const n of BTNS) cur[n] = !!((k[n] && KEYS.has(k[n])) || pad[n] || (slot === 0 && TOUCH[n]) || FORCE[slot].held[n]);
  for (const n of FORCE[slot].press) { cur[n] = true; LATCH.add("force:" + slot + n); }
  FORCE[slot].press.clear();
  if (slot === 0 && KEYS.has("Escape")) cur.back = true;
  if (slot === 0 && KEYS.has("Space")) cur.start = true;
  const pressed = {};
  for (const n of BTNS) {
    const latched = (k[n] && LATCH.has(k[n])) || (slot === 0 && LATCH.has("touch:" + n)) || (slot === 0 && n === "start" && LATCH.has("Space")) || LATCH.has("force:" + slot + n);
    LATCH.delete("force:" + slot + n);
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
function buildTouch() {
  const box = document.getElementById("touch"); box.classList.add("on");
  // 8 buttons in percent of the 16:9 game box. TAG sits left of the LP/LK column, ASSIST above it, clear of the HUD
  // (the super meters run along the bottom edge under the buttons, see drawHUD).
  const defs = [["lp","LP",73,58],["hp","HP",83,52],["lk","LK",73,76],["hk","HK",83,70],["sp","SP",92,62],["su","SU",92,44],["tag","TAG",63,64],["assist","ASSIST",63,46],["start","START",46,82]];
  for (const [n, label, l, t] of defs) {
    const d = document.createElement("div"); d.className = "tb"; d.textContent = label; d.dataset.btn = n;
    const sz = n === "start" ? 8 : 8.5;
    Object.assign(d.style, { left: l + "%", top: t + "%", width: sz + "%", aspectRatio: "1" });
    if (n === "assist") d.style.fontSize = "8px";
    const on = e => { e.preventDefault(); TOUCH[n] = true; LATCH.add("touch:" + n); d.classList.add("down"); audio(); };
    const off = e => { e.preventDefault(); TOUCH[n] = false; d.classList.remove("down"); };
    d.addEventListener("pointerdown", on); d.addEventListener("pointerup", off); d.addEventListener("pointercancel", off); d.addEventListener("pointerleave", off);
    box.appendChild(d);
  }
  const mb = document.createElement("div"); mb.className = "tb"; mb.id = "musicbtn"; mb.dataset.btn = "music"; mb.textContent = music.muted ? "\u266A OFF" : "\u266A ON";
  Object.assign(mb.style, { right: "1.5%", top: "16%", width: "9%", aspectRatio: "1", fontSize: "11px" });
  mb.addEventListener("pointerdown", e => { e.preventDefault(); audio(); toggleMute(); });
  box.appendChild(mb);
  if (!standalone) {
    const fb = document.createElement("div"); fb.className = "tb"; fb.dataset.btn = "fullscreen"; fb.textContent = "\u26F6";
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
if (isTouch) buildTouch();

