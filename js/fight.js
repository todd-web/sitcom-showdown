// Fighting game engine, part 2 of 6 (fight.js): moves, the Fighter class, CPU, TAG mode (item 8), stage breaks (item 12), assist strikers.
// Plain classic scripts loaded in order by index.html (core, fight, flow, draw, screens, main). They share one
// global scope, so a top-level name declared in one part is visible in the parts after it. Top-level code in a
// part may only call functions from the same or an earlier part (calls inside functions run after all parts load).
"use strict";
// ---------- moves ----------
// frames at 60 Hz. reach comes from the sprite (manifest) plus bonus for specials/supers.
// heavy: connects with hit stop, white silhouettes, a radial burst and shake. rank: chain cancel order
// (a move that connects can be cancelled into a higher rank: light -> heavy -> special -> super).
// frames: 2 means the pose animates frame _1 during startup and frame _2 from the active frame on.
const METER_MAX = 200, LOW_HP = 300;
// reel capture (?reel=1): every banner (round, K.O., stage break, assist) holds at most REEL_BANNER frames (1.2 s)
const REEL_BANNER = 72;
const MOVES = {
  lp:  { pose: "punch_light", start: 4,  active: 4,  rec: 8,  dmg: 40,  kb: 7,  stun: 14, meter: 6,  rank: 1 },
  hp:  { pose: "punch_heavy", start: 8,  active: 5,  rec: 16, dmg: 85,  kb: 13, stun: 20, meter: 10, rank: 2, heavy: true },
  lk:  { pose: "kick_light",  start: 5,  active: 4,  rec: 9,  dmg: 45,  kb: 7,  stun: 14, meter: 6,  rank: 1, low: true },
  hk:  { pose: "kick_heavy",  start: 10, active: 5,  rec: 18, dmg: 95,  kb: 16, stun: 22, meter: 12, rank: 2, heavy: true, knock: true },
  sp:  { pose: "special",     start: 12, active: 9,  rec: 20, dmg: 110, kb: 18, stun: 24, meter: 14, rank: 3, heavy: true, knock: true, bonus: 140, frames: 2 },
  su1: { pose: "super",       start: 22, active: 16, rec: 24, dmg: 300, kb: 26, stun: 40, meter: 0,  rank: 4, heavy: true, knock: true, bonus: 300, isSuper: true, cost: 100, frames: 1 },
  su2: { pose: "super",       start: 22, active: 22, rec: 28, dmg: 450, kb: 30, stun: 46, meter: 0,  rank: 5, heavy: true, knock: true, bonus: 320, isSuper: true, isSuper2: true, cost: 200, freeze: 60, frames: 2 },
};
MOVES.su = MOVES.su1;   // old name kept for anything that still reads MOVES.su
const STUN_STATES = ["hit", "down", "block"];

class Fighter {
  constructor(ch, slot, x) {
    this.ch = ch; this.id = ch.id; this.slot = slot; this.x = x; this.y = 0; this.vx = 0; this.vy = 0;
    this.sc = S * (ch.size || 1); this.face = slot === 0 ? 1 : -1; this.hp = 1000; this.meter = 0; this.state = "idle"; this.t = 0;
    this.move = null; this.hitDone = false; this.stun = 0; this.flash = 0; this.wins = 0; this.cpu = false;
    this.combo = { hits: 0, dmg: 0 }; this.lowHp = false; this.stunEndT = -99; this.buffer = null;
    this.idleT = 0; this.taunt = 0; this.land = 0; this.red = 0; this.inv = 0;   // tag: recoverable health, invulnerable frames
    this.hpTrail = 1000; this.hpSeen = 1000; this.trailWait = 0;   // HUD: delayed red trail behind the health bar
    this.roundDmg = 0; this.matchDmg = 0; this.punish = 0;   // damage taken this round / match (PERFECT), CPU free-hit window
  }
  reset(x) {
    Object.assign(this, { x, y: 0, vx: 0, vy: 0, hp: 1000, state: "idle", t: 0, move: null, stun: 0, flash: 0, lowHp: false, stunEndT: -99, buffer: null, idleT: 0, taunt: 0, land: 0, hpTrail: 1000, hpSeen: 1000, trailWait: 0, red: 0, inv: 0, tagTarget: 0, ai: null, flyOut: false, flyIn: false, gone: false, flyRot: 0, introT: 0, roundDmg: 0, punish: 0 });
    this.combo = { hits: 0, dmg: 0 }; this.face = this.slot === 0 ? 1 : -1;
  }
  get air() { return this.y < 0; }
  // the logical pose name for this frame; resolvePose() maps it to the art that exists
  pose() {
    switch (this.state) {
      case "walk": {   // a roster walkCycle (George's strut) plays only while walking FORWARD; backward keeps walk_1/walk_2
        const cyc = this.vx * this.face > 0 ? cycleOf(this, "walkCycle") : null;
        return cyc ? cyc[Math.floor(this.t / CYCLE_STEP) % cyc.length] : "walk_" + (Math.floor(this.t / 8) % 2 + 1);
      }
      case "intro": { const cyc = cycleOf(this, "introCycle"); return cyc ? cyc[Math.floor(this.t / CYCLE_STEP) % cyc.length] : "idle"; }
      case "crouch": return "crouch"; case "jump": return "jump";
      case "block": return this.crouchBlock ? "crouch" : "block"; case "hit": return "hit";
      case "down": case "ko": return "knockdown";
      // reel capture: a winner with no win art alternates his idle frames (the result scene keeps moving, Video QA R3)
      case "win": return REEL && !(MANIFEST[this.id] && (MANIFEST[this.id].win || MANIFEST[this.id].win_1)) ? (Math.floor(game.t / 30) % 2 ? "idle_2" : "idle") : "win";
      case "tagin": case "tagout": return "walk_" + (Math.floor(this.t / 5) % 2 + 1);   // running: the walk frames, faster
      case "tagsuper": return game.tagSuper && game.tagSuper.t < TS_FREEZE ? "super_1" : "super_2";
      case "assistcall": return (this.ch.assist && this.ch.assist.callPose) || "punch_heavy";   // throwing the assist (Jazz)
      case "attack": {
        const m = this.move;
        if (m.isSuper2 && this.t >= m.start) { const cyc = super2CycleOf(this); if (cyc) return cyc[Math.min(cyc.length - 1, Math.floor((this.t - m.start) / S2_STEP))]; }
        if (m.frames === 2) return m.pose + (this.t < m.start ? "_1" : "_2");
        if (m.frames === 1) return m.pose + "_1";
        return m.pose;
      }
      default: return this.taunt > 0 ? "taunt" : Math.floor(this.t / 30) % 2 ? "idle_2" : "idle";
    }
  }
  startMove(key, h = {}) {
    if (key === "su") {
      if (this.meter >= METER_MAX && !h.down) key = "su2";
      else if (this.meter >= MOVES.su1.cost) key = "su1";
      else return false;
    }
    const base = MOVES[key]; if (!base) return false;
    this.move = Object.assign({ key, fromStun: game.t - this.stunEndT <= 4 }, base); this.state = "attack"; this.t = 0; this.hitDone = false;
    if (key === "sp" && this.ch.specialStart > 0) this.move.start = Math.round(this.ch.specialStart);   // roster wind-up hold
    if (base.cost) { this.meter -= base.cost; sfx("super"); }
    if (key === "sp") playVoice(this.ch, "special");   // optional real clip (VOICE.slots); none: silence
    if (key === "su1") rrLog("super1");
    if (key === "su2") {
      game.superFreeze = base.freeze; game.superBy = this; rrLog("super2"); playVoice(this.ch, "super");
      rrLog("cutin " + this.id + " " + (portraitReady(this.id) ? "portrait" : "sprite"));
    }
    if (key === "sp" || base.isSuper) {
      game.moveBanner = { text: key === "sp" ? this.ch.special : key === "su2" ? (this.ch.super2 || this.ch.super) : (this.ch.super1 || this.ch.super), slot: this.slot, t: 60, who: this.ch.name };
      rrLog("banner " + game.moveBanner.text);
    }
    return true;
  }
  // idle taunt: TAUNT_AFTER frames with no input (CPU: no action) while idle on the ground. The count pauses,
  // never resets, while the opponent is in a move (startup, active or recovery), so it cannot fire mid-combo.
  // Any input cancels the taunt; the fighter stays in the idle state, so it is hittable throughout.
  tauntTick(inp, opp) {
    const any = BTNS.some(n => inp.held[n] || inp.pressed[n]);
    if (any) { this.idleT = 0; if (this.taunt) { this.taunt = 0; rrLog("tauntCancel " + this.id); } return; }
    if (this.taunt || this.state !== "idle" || this.air || opp.state === "attack") return;
    if (++this.idleT >= TAUNT_AFTER) {
      this.idleT = 0; this.taunt = TAUNT_LEN; rrLog("taunt " + this.id); playVoice(this.ch, "taunt");
    }
  }
  control(inp, opp) {
    const h = inp.held, p = inp.pressed;
    this.tauntTick(inp, opp);
    const fwd = this.face > 0 ? h.right : h.left, back = this.face > 0 ? h.left : h.right;
    // newest attack press wins; it is buffered for 8 frames so a press during recovery still comes out
    for (const k of ["su", "sp", "hk", "hp", "lk", "lp"]) if (p[k]) { this.buffer = { k, ttl: 8, down: !!h.down }; break; }
    if (this.buffer && --this.buffer.ttl < 0) this.buffer = null;
    if (["hit", "down", "ko", "win", "tagin", "tagout", "tagsuper", "intro", "assistcall"].includes(this.state)) return;
    if (this.state === "attack") {
      // chain cancel: a move that connected can be cancelled into a higher rank one
      const m = this.move, b = this.buffer;
      if (b && m.connected && !this.air && this.t >= m.start) {
        const want = b.k === "su" ? (this.meter >= METER_MAX && !b.down ? "su2" : "su1") : b.k;
        if (MOVES[want].rank > m.rank && this.startMove(b.k, { down: b.down })) { this.buffer = null; rrLog("cancel " + m.key + ">" + this.move.key); }
      }
      return;
    }
    this.holdingBack = back;
    if (this.buffer && this.startMove(this.buffer.k, { down: this.buffer.down })) { this.buffer = null; return; }
    if (this.air) return;
    if (h.up) { this.vy = JUMP_V; this.vx = (h.right ? 1 : h.left ? -1 : 0) * (this.ch.speed + 1.5); this.y = -1; this.state = "jump"; return; }
    if (h.down) { this.state = back ? "block" : "crouch"; this.crouchBlock = back; this.vx = 0; return; }
    if (back && opp.state === "attack" && Math.abs(opp.x - this.x) < 420) { this.state = "block"; this.crouchBlock = false; this.vx = 0; return; }
    // a stun assist's free-hit window (punish > 0, CPU caller): the caller rushes in at 2.2x walk speed
    if (fwd || back) { if (this.state !== "walk") this.t = 0; this.state = "walk"; this.vx = (h.right ? 1 : -1) * this.ch.speed * (back ? 0.75 : 1) * (this.punish > 0 && fwd ? 2.2 : 1); return; }
    this.state = "idle"; this.vx = 0;
  }
  update(opp) {
    this.t++; if (this.flash > 0) this.flash--; if (this.land > 0) this.land--; if (this.inv > 0) this.inv--;
    if (this.flyOut) { flyTick(this); return; }   // item 12: flung out by a stage break
    if (this.state === "tagin" || this.state === "tagout") { tagRun(this); return; }
    if (this.taunt > 0) { if (this.state !== "idle" || this.air) this.taunt = 0; else this.taunt--; }
    const was = this.state;
    // physics
    if (this.air || this.vy < 0) {
      this.vy += GRAVITY; this.y += this.vy; this.x += this.vx;
      if (this.y >= 0) { this.y = 0; this.vy = 0; this.vx = 0; this.land = LAND_LEN; if (this.state === "jump" || this.state === "attack") { this.state = "idle"; this.move = null; } }
    } else if (["walk"].includes(this.state)) this.x += this.vx;
    else if (this.state === "intro") { this.x += this.vx; if (--this.introT <= 0) { this.state = "idle"; this.vx = 0; this.t = 0; } }
    else if (["hit", "down", "block"].includes(this.state)) { this.x += this.vx; this.vx *= 0.82; }
    // timers
    if (this.state === "hit" || this.state === "block") { if (--this.stun <= 0) this.state = "idle"; }
    if (this.state === "down") { if (--this.stun <= 0) this.state = "idle"; }
    if (this.state === "assistcall" && this.t >= AS_CALL) { this.state = "idle"; this.t = 0; }
    if (STUN_STATES.includes(was) && !STUN_STATES.includes(this.state)) this.stunEndT = game.t;
    if (this.state === "attack") {
      const m = this.move;
      if (m.isSuper2 && this.t === m.start && super2CycleOf(this)) { this.flash = 10; rrLog("super2Cycle " + this.id + " " + super2CycleOf(this).join(",")); }   // the glow, then the cycle
      if (this.t >= m.start && this.t < m.start + m.active && !this.hitDone) this.tryHit(opp);
      if (this.move === m && this.t >= m.start + m.active + m.rec) { this.state = this.air ? "jump" : "idle"; this.move = null; }
    }
    // a combo ends when this fighter gets out of hit stun or knockdown
    if (this.combo.hits && !["hit", "down", "ko"].includes(this.state)) this.combo = { hits: 0, dmg: 0 };
    if (!this.air && !["attack", "hit", "down", "ko", "win"].includes(this.state)) this.face = opp.x >= this.x ? 1 : -1;
    this.x = Math.max(LEFT_WALL, Math.min(RIGHT_WALL, this.x));
    reelClamp(this);
  }
  tryHit(opp) {
    const m = this.move, md = meta(this.id, this.pose());
    const reach = md.reach * this.sc + (m.bonus || 0) + BODY * 0.5;
    const dx = (opp.x - this.x) * this.face;
    if (dx < -20 || dx > reach + BODY) return;
    if (Math.abs(opp.y - this.y) > 230) return;
    if (["down", "ko"].includes(opp.state)) return;
    if (opp.inv > 0 || TAG_OFF.includes(opp.state)) { if (opp.inv > 0) rrLog("invuln " + opp.id); return; }   // tag run-in: untouchable
    this.hitDone = true; m.connected = true;
    const blocked = opp.state === "block" && (!m.low || opp.crouchBlock);
    if (blocked) {
      opp.stun = 12; opp.vx = this.face * m.kb * 0.6; sfx("block");
      if (m.bonus) { const chip = Math.round(m.dmg * 0.12 * this.ch.power); opp.hp -= chip; noteDamage(opp, chip); }
      this.meter = Math.min(METER_MAX, this.meter + m.meter * 0.5);
      game.spark(opp.x - this.face * 30, FLOOR + opp.y - 260, "#9ee7ff");
    } else {
      // callouts are judged on the state before this hit lands
      const counter = opp.state === "attack" && opp.move && opp.t < opp.move.start;
      const inCombo = opp.state === "hit" && opp.combo.hits > 0;
      const powered = m.key === "sp" && this.hp <= LOW_HP;
      const dmg = Math.round(m.dmg * this.ch.power * (this.air ? 0.85 : 1) * (powered ? 1.2 : 1));
      opp.hp -= dmg; opp.flash = 8; addRed(opp, dmg); noteDamage(opp, dmg); game.hits[this.slot]++;
      this.meter = Math.min(METER_MAX, this.meter + m.meter); opp.meter = Math.min(METER_MAX, opp.meter + m.meter * 0.6);
      opp.move = null;
      if (m.knock || opp.air || opp.hp <= 0) { opp.state = "down"; opp.stun = 55; opp.vx = this.face * m.kb * 1.2; opp.y = 0; opp.vy = 0; nextTicker(); if (opp.hp > 0) playVoice(this.ch, "taunt"); }
      else { opp.state = "hit"; opp.stun = m.stun; opp.vx = this.face * m.kb; }
      sfx(m.heavy ? "heavy" : "hit");
      const hx = opp.x - this.face * 20, hy = FLOOR + opp.y - (m.low ? 120 : 270);
      game.spark(hx, hy, m.isSuper ? "#ffd23f" : "#fff3b0");
      rrLog("hit " + m.key + " " + dmg + (powered ? " powered" : ""));
      if (m.heavy) {
        game.hitStop = 6; game.silT = 2; game.shake = m.isSuper2 ? 18 : m.isSuper ? 14 : 8;
        game.bursts.push({ x: hx, y: hy, t: 0, life: 16, big: !!m.isSuper });
        rrLog("hitStop 6"); rrLog("shake");
      } else game.shake = Math.max(game.shake, 4);
      // combo counter lives on the fighter taking the hits
      opp.combo = inCombo ? { hits: opp.combo.hits + 1, dmg: opp.combo.dmg + dmg } : { hits: 1, dmg };
      if (opp.combo.hits >= 2) { game.comboShow[this.slot] = { hits: opp.combo.hits, dmg: opp.combo.dmg, t: REEL ? REEL_BANNER : 90 }; rrLog("combo " + opp.combo.hits); }
      if (!game.firstHit) { game.firstHit = true; callout("FIRST ATTACK", this.slot); }
      if (counter) callout("COUNTER", this.slot);
      if (m.fromStun) callout("REVERSAL", this.slot);
      if (opp.hp > 0 && opp.hp <= LOW_HP && !opp.lowHp) {
        opp.lowHp = true; game.lowBanner = { text: opp.ch.lowHpLine || `${opp.ch.name} IS FIRED UP`, slot: opp.slot, t: 110 };
        rrLog("lowhp " + opp.id);
      }
    }
    if (opp.hp <= 0) { opp.hp = 0; opp.red = 0; opp.state = "ko"; opp.stun = 9999; if (m.isSuper2 && !blocked) tryStageBreak(this, opp, this.face, "su2"); }
  }
  draw(silhouette = false) {
    if (this.gone) return;   // flung out past the edge by a stage break
    const pose = poseOf(this.id, this.pose()), md = meta(this.id, pose), im = IMG[this.id][pose];
    // shadow
    if (!this.flyOut) {
      ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath();
      ctx.ellipse(this.x, FLOOR + 4, 70 * (1 + this.y / 900), 12, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (!im || !im.complete || !im.naturalWidth) return;
    const lp = this.pose(), b = bodyFlex(this, lp);
    ctx.save(); ctx.translate(this.x, FLOOR + this.y + b.bob);
    const k = this.sc, dx = -md.ax * k, dy = -md.h * k, dw = md.w * k, dh = md.h * k;
    if (this.flyOut) { ctx.translate(0, dy * 0.45); ctx.rotate(this.flyRot); ctx.translate(0, -dy * 0.45); }   // spin about the body center
    if (this.face < 0) ctx.scale(-1, 1);
    ctx.scale(b.sx, b.sy);   // squash and stretch anchored at the feet
    if (silhouette) ctx.drawImage(whiteSprite(im, dw, dh), dx, dy, dw, dh);
    else {
      if (b.smear) drawSmear(im, dx, dy, dw, dh, b.smear);
      if (this.inv > 0 && this.inv % 4 < 2 && !REEL) ctx.globalAlpha *= 0.55;   // invulnerable after a tag: flicker (reel capture: full opacity)
      ctx.drawImage(im, dx, dy, dw, dh);
      if (this.flash > 0 && this.flash % 2) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.5; ctx.drawImage(im, dx, dy, dw, dh); }
    }
    ctx.restore();
  }
}
// Procedural life on top of the drawn frames (Third Strike feel, kept small):
// idle and taunt breathe (2 percent vertical stretch, 1 percent inverse width, 46-frame sine, feet anchored),
// walk bobs a few pixels per step, a landing squashes for LAND_LEN frames, fast moves smear for 3 frames.
const TAUNT_AFTER = 180, TAUNT_LEN = 60, LAND_LEN = 6, BREATH = 46, SMEAR_LEN = 3;
// Drawn walk cycles (roster walkCycle / introCycle, George's strut): CYCLE_STEP game frames per drawn frame. A cycle
// is used only when every frame it names is in the manifest; otherwise the fighter keeps walk_1/walk_2 (or idle).
// The round-1 intro struts the fighter INTRO_BACK px forward into its start mark over INTRO_LEN frames (1.5 s).
// CYCLE_STEP 8 (CD-00 strut verdict): one 6-frame stride takes 0.8 s, so the bounce reads as cocky, not hurried.
const CYCLE_STEP = 8, INTRO_LEN = 90, INTRO_BACK = 110, CYCLE_OK = {};
function cycleOf(f, key) {
  const c = f.ch[key]; if (!c || !c.length) return null;
  const k = f.id + "/" + key;
  if (!(k in CYCLE_OK)) CYCLE_OK[k] = c.every(p => MANIFEST[f.id] && MANIFEST[f.id][p]);
  return CYCLE_OK[k] ? c : null;
}
// Level 2 super pose cycle (roster super2Cycle, Urkel's Stefan Transformation): after the startup (super_1, the glow)
// each listed pose that is in the manifest shows for S2_STEP frames and the last one holds to the end of the move.
// None in the manifest: null, and the move shows super_2 as before.
const S2_STEP = 14, S2_OK = {};
function super2CycleOf(f) {
  if (f.id in S2_OK) return S2_OK[f.id];
  const c = (f.ch.super2Cycle || []).filter(p => MANIFEST[f.id] && MANIFEST[f.id][p]);
  return (S2_OK[f.id] = c.length ? c : null);
}
// game.hpFloor (reel director guard): a hit never takes a fighter below the floor (it stops there, it is never refilled)
function noteDamage(f, dmg) {
  if (!(dmg > 0)) return;
  f.roundDmg = (f.roundDmg || 0) + dmg; f.matchDmg = (f.matchDmg || 0) + dmg;
  if (game.hpFloor > 0 && f.hp < game.hpFloor) f.hp = Math.max(f.hp, Math.min(game.hpFloor, f.hp + dmg));
}
// round-1 intro: a fighter with a usable introCycle backs off INTRO_BACK px and struts forward to its mark
// true while any fighter on screen is still in its round-1 intro: the ROUND N / FIGHT! banner holds until it ends
const introRunning = () => !!(game.fighters && game.fighters.some(f => f && f.state === "intro"));
function startIntro(f) {
  if (!cycleOf(f, "introCycle")) return false;
  Object.assign(f, { state: "intro", t: 0, introT: INTRO_LEN, vx: f.face * INTRO_BACK / INTRO_LEN });
  if (!REEL) f.x -= f.face * INTRO_BACK;   // reel capture: the strut starts on the placed mark (inside the column) and walks in
  rrLog("intro " + f.id); return true;
}
const SMEAR_POSES = { punch_heavy: 1, kick_heavy: 1, special_2: 1, super_2: 1 };
function breath(t, phase = 0) { const s = Math.sin((t + phase) / BREATH * Math.PI * 2); return { sx: 1 - 0.01 * s, sy: 1 + 0.02 * s }; }
function bodyFlex(f, lp) {
  const out = { sx: 1, sy: 1, bob: 0, smear: 0 };
  if (f.state === "idle" && !f.air) Object.assign(out, breath(game.t, f.slot * 17));
  // reel capture (Video QA R3, the result screen froze): the winner breathes with a squash loop, the K.O.'d loser bobs
  if (REEL && f.state === "win" && !f.air) { const s = Math.sin((game.t + f.slot * 17) / BREATH * Math.PI * 2); out.sx = 1 - 0.015 * s; out.sy = 1 + 0.03 * s; }
  if (REEL && (f.state === "ko" || f.state === "down") && !f.flyOut) out.bob = Math.round(Math.sin(game.t / 14) * 2.5);
  const ci = f.ch.cycleBob ? (f.ch.walkCycle || []).indexOf(lp) : -1;   // a drawn cycle frame: its own bounce (roster cycleBob)
  if (ci >= 0 && (f.state === "walk" || f.state === "intro")) out.bob = f.ch.cycleBob[ci] || 0;
  else if (f.state === "walk") out.bob = -Math.abs(Math.sin(f.t / 8 * Math.PI)) * 4;
  if (f.land > 0) { const k = f.land / LAND_LEN; out.sy *= 1 - 0.07 * k; out.sx *= 1 + 0.05 * k; }
  if (f.state === "attack" && f.move && SMEAR_POSES[lp]) {
    const k = f.t - f.move.start; if (k >= 0 && k < SMEAR_LEN) out.smear = 1 - k / SMEAR_LEN;   // the first active frames
  }
  return out;
}
// a faded copy stretched horizontally, trailing behind (local space already faces forward)
function drawSmear(im, dx, dy, dw, dh, a) {
  for (const [off, st, al] of [[-46, 1.22, 0.3], [-92, 1.4, 0.14]]) {
    ctx.save(); ctx.globalAlpha *= al * a; ctx.translate(off * a, 0); ctx.scale(st, 1);
    ctx.drawImage(im, dx, dy, dw, dh); ctx.restore();
  }
  game.smearDrawn = (game.smearDrawn || 0) + 1;
}
// white silhouette of a sprite: draw it on a scratch canvas, then fill white with source-atop
const SIL = document.createElement("canvas"), silx = SIL.getContext("2d");
function whiteSprite(im, w, h) {
  SIL.width = Math.max(1, Math.ceil(w)); SIL.height = Math.max(1, Math.ceil(h));
  silx.globalCompositeOperation = "source-over"; silx.drawImage(im, 0, 0, SIL.width, SIL.height);
  silx.globalCompositeOperation = "source-atop"; silx.fillStyle = "#fff"; silx.fillRect(0, 0, SIL.width, SIL.height);
  return SIL;
}
// reel capture: no FIRST ATTACK (it misfired at the tag K.O. and stacked under the speech bubbles)
function callout(text, slot) {
  if (REEL && text === "FIRST ATTACK") { rrLog("callout-skip " + text); return; }
  game.callouts.push({ text, slot, t: 70 }); rrLog("callout " + text);
}
// reel capture: the fighter's drawn box stays inside the center column (REEL_X0..REEL_X1, 1 px in). A fighter flung out
// by a stage break, running a tag in or out, or on the bench is left alone (those frames leave the column on purpose).
function reelClamp(f) {
  if (!REEL || !f || f.flyOut || f.gone || ["tagin", "tagout", "bench"].includes(f.state)) return;
  const b = fighterBox(f); if (!b) return;
  if (b[0] < REEL_X0 + 1) f.x += REEL_X0 + 1 - b[0];
  else if (b[0] + b[2] > REEL_X1 - 1) f.x -= b[0] + b[2] - (REEL_X1 - 1);
}

// ---------- CPU ----------
function cpuInput(me, opp, level) {
  const held = {}, pressed = {}, dist = Math.abs(opp.x - me.x), toward = opp.x > me.x ? "right" : "left", away = toward === "right" ? "left" : "right";
  me.ai = me.ai || { plan: null, t: 0 };
  if (game.mode === "tag" && game.teams) {   // tag in a hurt point fighter, or spend a full meter on the tag super
    const mate = partnerOf(me);
    if (mate && mate.hp > 0 && canTagFrom(me) && !tagBusy(me.slot)) {
      if (me.meter >= METER_MAX && dist < 520 && Math.random() < 0.03) { held.tag = pressed.tag = pressed.su = true; return { held, pressed }; }
      if (me.hp < 450 && mate.hp > me.hp + 200 && Math.random() < 0.006) { pressed.tag = true; return { held, pressed }; }
    }
  }
  // assist striker: now and then when it is ready and the opponent is in range (never in a reel capture: the director calls them)
  if (!REEL && me.ch.assist && dist < 640 && Math.random() < 0.003 + level * 0.0008 && !assistBlock(me.slot)) { pressed.assist = true; return { held, pressed }; }
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
// a CPU side's input for this frame. Reel director hooks: __rr.cpuHush(slot, n) mutes the AI for n active frames and
// __rr.cpuPress(slot, ...btns) adds presses (also held for the frame, so tag + super reads as a tag super). Inert in play.
function cpuIn(me, opp, level) {
  const fc = FORCE[me.slot];
  let r = fc.hush > 0 ? (fc.hush--, { held: {}, pressed: {} }) : cpuInput(me, opp, level);
  if (fc.calm) for (const k of ["lp", "hp", "lk", "hk", "sp", "su", "tag", "assist"]) { delete r.pressed[k]; delete r.held[k]; }
  if (fc.walk > 0) {   // __rr.cpuWalk(slot, n, dir): walk n frames, dir 1 = toward the opponent (forward), -1 = away
    fc.walk--; r = { held: { [(me.face > 0) === (fc.walkDir > 0) ? "right" : "left"]: true }, pressed: {} };
  }
  // free hit after a stun assist (Harriette): walk in and land a heavy punch while the opponent flinches
  if (me.punish > 0 && fc.hush <= 0 && fc.walk <= 0) {
    me.punish--;
    const reach = meta(me.id, "punch_heavy").reach * me.sc + BODY * 1.5;
    if (Math.abs(opp.x - me.x) > reach) r = { held: { [opp.x > me.x ? "right" : "left"]: true }, pressed: {} };
    else { r = { held: {}, pressed: { hp: true } }; me.punish = 0; rrLog("assistPunish " + me.id); }
  }
  for (const b of fc.cpu) { r.pressed[b] = true; r.held[b] = true; }
  fc.cpu.clear();
  return r;
}

// ---------- item 8: TAG mode, 2 vs 2 ----------
// game.teams[s] = [first pick, second pick]; game.fighters[s] is the fighter on point (on screen).
// Tag input (P1 R, P2 O, gamepad LT/RT, touch TAG): a press arms TAG_ARM frames. Super pressed while armed, or
// while tag is held, with the side's meter at 200 is the TAG SUPER; otherwise the swap fires when tag is
// released or the arm runs out. A swap needs the point on the ground in idle, walk or crouch.
// Swap: the partner runs in from the back edge (the screen edge behind its side) over TAG_RUN frames, then is
// invulnerable for TAG_INV frames; the outgoing fighter runs off and, off screen, recovers its red health at
// 10 percent (100 hp) per 10 s. Red health = TAG_RED_SHARE of every unblocked hit taken (drawn as a red segment).
// The super meter belongs to the side: it moves to the incoming fighter on every swap.
// A K.O.'d point is replaced by its partner after TAG_KO_WAIT frames (forced run-in). The match is one round
// (TAG_ROUNDS_TO_WIN) and it ends only when both fighters of one side are K.O.'d (or on time: team health).
const TAG_ARM = 12, TAG_RUN = 30, TAG_INV = 20, TAG_REGEN = 100 / 600, TAG_RED_SHARE = 0.5, TAG_KO_WAIT = 70, TAG_ROUNDS_TO_WIN = 1;
// tag super: TS_FREEZE frames of freeze (both sides stop, cut-in slab), then the team image (or the fallback pair
// of super_2 poses) is the active pose for TS_ACTIVE frames; the hit lands TS_HIT frames in for TS_DMG damage.
const TS_FREEZE = 30, TS_ACTIVE = 40, TS_HIT = 6, TS_DMG = 500, TS_RANGE = 760;
const TAG_OFF = ["tagin", "tagout", "tagsuper"];
const isTag = () => game.mode === "tag";
const winsNeeded = () => isTag() ? TAG_ROUNDS_TO_WIN : (game.roundsToWin || ROUNDS_TO_WIN);
const p2Auto = () => game.mode === "arcade" || !!game.showcase || (game.mode === "tag" && game.tagCpu);
function partnerOf(f) { const tm = game.teams && f && game.teams[f.slot]; return tm ? (tm[0] === f ? tm[1] : tm[0]) : null; }
function allFighters() { return game.teams ? game.teams[0].concat(game.teams[1]) : (game.fighters || []); }
const teamName = s => game.teams ? game.teams[s].map(f => f.ch.name).join(" & ") : game.fighters[s].ch.name;
function addRed(f, dmg) { if (isTag()) f.red = Math.max(0, Math.min(1000 - Math.max(0, f.hp), f.red + dmg * TAG_RED_SHARE)); }
const canTagFrom = f => !f.air && ["idle", "walk", "crouch"].includes(f.state);
function tagBusy(s) { return !!game.tagSuper || game.fighters[s].state === "tagin" || game.runners.some(r => r.slot === s && r.state === "tagout"); }
function backDir(s) { const me = game.fighters[s], opp = game.fighters[1 - s]; return opp.x >= me.x ? -1 : 1; }   // -1: left edge
// reel capture: the outgoing fighter clears the canvas edge in TAG_OUT_REEL frames (0.35 s)
const TAG_OUT_REEL = 21;
function runOff(f, dir) {
  Object.assign(f, { state: "tagout", t: 0, move: null, y: 0, vy: 0, inv: 0, face: dir });
  f.vx = REEL ? dir * Math.max(8, Math.abs((dir < 0 ? 0 : W) - f.x) / TAG_OUT_REEL) : dir * Math.max(8, Math.abs((dir < 0 ? -160 : W + 160) - f.x) / TAG_RUN);
}
// run-in / run-off movement (called from Fighter.update for the tagin and tagout states)
function tagRun(f) {
  f.x += f.vx;
  if (f.state === "tagin" && f.t >= TAG_RUN) {
    f.x = f.tagTarget; f.vx = 0; f.state = "idle"; f.t = 0; f.inv = TAG_INV;
    rrLog("tagIn " + f.id + " inv " + TAG_INV);
  }
}
// reel capture: every tag uses the side's own edge (P1 left, P2 right): the outgoing fighter exits that way and the
// partner runs in from just past it (x -20 or 1300) at full opacity
function startTag(s, forced = false) {
  const out = game.fighters[s], inn = partnerOf(out), dir = REEL ? (s === 0 ? -1 : 1) : backDir(s);
  const edge = REEL ? (dir < 0 ? -20 : W + 20) : dir < 0 ? -120 : W + 120, target = Math.max(LEFT_WALL, Math.min(RIGHT_WALL, out.x));
  Object.assign(inn, { x: edge, y: 0, vy: 0, state: "tagin", t: 0, move: null, buffer: null, stun: 0, taunt: 0, idleT: 0, inv: 0, flash: 0, land: 0, tagTarget: target });
  inn.combo = { hits: 0, dmg: 0 }; inn.vx = (target - edge) / TAG_RUN; inn.face = inn.vx >= 0 ? 1 : -1;
  inn.meter = out.meter; inn.cpu = out.cpu;
  if (out.state === "ko") out.fadeT = 0;   // a K.O.'d point fades out where it fell
  else runOff(out, dir);
  game.runners.push(out); game.fighters[s] = inn; game.tagArm[s] = 0; game.koWait[s] = 0;
  sfx("whiff"); rrLog(`tag ${s} ${out.id}>${inn.id} runin ${TAG_RUN} from ${dir < 0 ? "left" : "right"}${forced ? " forced" : ""}`);
}
function tagInput(s, inp) {
  const f = game.fighters[s], mate = partnerOf(f); if (!mate) return;
  if (inp.pressed.tag) game.tagArm[s] = TAG_ARM;
  const armed = game.tagArm[s] > 0;
  if ((armed || inp.held.tag) && inp.pressed.su) {
    if (f.meter >= METER_MAX && mate.hp > 0 && canTagFrom(f) && !tagBusy(s)) { inp.pressed.su = false; game.tagArm[s] = 0; startTagSuper(s); return; }
    rrLog("tagSuperDenied " + (f.meter < METER_MAX ? "meter " + Math.floor(f.meter) : mate.hp <= 0 ? "partner out" : f.state));
  }
  if (!armed) return;
  if (inp.held.tag && --game.tagArm[s] > 0) return;
  game.tagArm[s] = 0;
  if (mate.hp > 0 && canTagFrom(f) && !tagBusy(s)) startTag(s);
  else rrLog("tagDenied " + s + " " + (mate.hp <= 0 ? "partner out" : tagBusy(s) ? "busy" : f.state));
}
// runners: outgoing fighters running off the back edge, and K.O.'d points fading out
function updateRunners() {
  for (const r of game.runners) { if (r.state === "tagout") r.update(null); else r.fadeT++; }
  game.runners = game.runners.filter(r => {
    if (r.state === "tagout" && (r.x < -150 || r.x > W + 150)) { r.state = "bench"; r.vx = 0; r.benchT = 0; rrLog("bench " + r.id); return false; }
    return r.state === "tagout" || r.fadeT < 30;
  });
}
// off-screen recovery: red health back at 10 percent per 10 seconds
function benchTick() {
  for (let s = 0; s < 2; s++) {
    const m = partnerOf(game.fighters[s]);
    if (!m || m.state !== "bench" || m.hp <= 0 || m.red <= 0) continue;
    const g = Math.min(m.red, TAG_REGEN); m.hp = Math.min(1000, m.hp + g); m.red -= g;
    if (++m.benchT % 60 === 0) rrLog(`recover ${m.id} ${Math.round(m.hp)} red ${Math.round(m.red)}`);
  }
}
// the tag super's show-joke name: either fighter's roster tagSuperName, else window.TAG_SUPER_NAME (roster.js)
function tagSuperName(f, mate) { return String((f && f.ch.tagSuperName) || (mate && mate.ch.tagSuperName) || window.TAG_SUPER_NAME || "TAG TEAM SUPER").toUpperCase(); }
function startTagSuper(s) {
  const f = game.fighters[s], mate = partnerOf(f), key = pairKey(f.id, mate.id);
  const isPair = f.ch.tag === mate.id || mate.ch.tag === f.id, im = isPair ? TEAM_IMG[key] : null;
  const ready = !!(im && im.complete && im.naturalWidth && !im.bad);
  f.meter -= METER_MAX; sfx("super"); playVoice(f.ch, "super");
  Object.assign(f, { state: "tagsuper", t: 0, move: null, vx: 0, buffer: null, taunt: 0, idleT: 0 });
  const mx = Math.max(LEFT_WALL - 40, Math.min(RIGHT_WALL + 40, f.x - f.face * 175));
  Object.assign(mate, { state: "tagsuper", t: 0, x: mx, y: 0, vx: 0, vy: 0, face: f.face, move: null, inv: 0, flash: 0, land: 0 });
  game.tagSuper = { s, f, mate, t: 0, key, team: ready ? im : null, hit: false };
  reelClamp(mate); reelClamp(f);   // reel capture: the pair stands inside the column
  game.moveBanner = { text: tagSuperName(f, mate), slot: s, t: 60, who: `${f.ch.name} + ${mate.ch.name}` };
  rrLog(`tagSuper ${key} ${ready ? "team" : "fallback " + (isPair ? "no-team-image" : "not-tag-partners")}`);
}
function tagSuperTick() {
  const ts = game.tagSuper, opp = game.fighters[1 - ts.s];
  ts.t++;
  if (ts.t <= TS_FREEZE) return;                 // freeze: neither side moves
  const k = ts.t - TS_FREEZE;
  if (k > TS_ACTIVE) { endTagSuper(ts); return; }
  if (k === TS_HIT) tagSuperHit(ts, opp);
  if (ts.hit) opp.update(ts.f);                  // after the hit the opponent flies back
}
function tagSuperHit(ts, opp) {
  const f = ts.f, dx = (opp.x - f.x) * f.face;
  if (["down", "ko"].includes(opp.state) || TAG_OFF.includes(opp.state) || opp.inv > 0 || dx < -80 || dx > TS_RANGE) { rrLog("tagSuperWhiff " + opp.state); return; }
  ts.hit = true;
  const hx = opp.x - f.face * 20, hy = FLOOR + opp.y - 270;
  if (opp.state === "block") {
    const chip = Math.round(TS_DMG * 0.12); opp.hp -= chip; noteDamage(opp, chip); opp.stun = 16; opp.vx = f.face * 10; sfx("block");
    rrLog("hit tagsuper " + chip + " blocked");
  } else {
    opp.hp -= TS_DMG; addRed(opp, TS_DMG); noteDamage(opp, TS_DMG); game.hits[ts.s]++; opp.flash = 8; opp.move = null;
    opp.state = "down"; opp.stun = 60; opp.vx = f.face * 34; opp.y = 0; opp.vy = 0; nextTicker();
    opp.combo = { hits: 1, dmg: TS_DMG }; sfx("heavy");
    if (!game.firstHit) { game.firstHit = true; callout("FIRST ATTACK", ts.s); }
    rrLog("hit tagsuper " + TS_DMG);
  }
  opp.meter = Math.min(METER_MAX, opp.meter + 10);
  game.spark(hx, hy, "#ffd23f"); game.bursts.push({ x: hx, y: hy, t: 0, life: 16, big: true });
  game.hitStop = 6; game.silT = 2; game.shake = 18;
  if (opp.hp <= 0) { opp.hp = 0; opp.red = 0; opp.state = "ko"; opp.stun = 9999; tryStageBreak(f, opp, f.face, "tagsuper"); }
}
function endTagSuper(ts) {
  Object.assign(ts.f, { state: "idle", t: 0 });
  runOff(ts.mate, REEL ? (ts.s === 0 ? -1 : 1) : backDir(ts.s)); game.runners.push(ts.mate);
  game.tagSuper = null; rrLog("tagSuperEnd " + ts.key + " partner runs off");
}
// a side is out when its point is K.O. and the partner is K.O. too; otherwise the partner is forced in
function sideOut(s) { const f = game.fighters[s], m = partnerOf(f); return f.state === "ko" && (!m || m.hp <= 0); }
function tagKoCheck() {
  const o0 = sideOut(0), o1 = sideOut(1);
  if (o0 || o1) { rrLog("tagSideOut " + (o0 ? "0" : "") + (o1 ? "1" : "")); endRound(o0 && o1 ? null : o0 ? game.fighters[1] : game.fighters[0]); return true; }
  for (let s = 0; s < 2; s++) {
    const f = game.fighters[s];
    if (f.state !== "ko") { game.koWait[s] = 0; continue; }
    if (game.koWait[s] === 0) { callout(`${f.ch.name} IS OUT`, 1 - s); rrLog("tagKO " + f.id + " partner next"); }
    if (++game.koWait[s] >= TAG_KO_WAIT && !tagBusy(s)) startTag(s, true);
  }
  return false;
}
// CPU picks for P2 in single-player TAG: a real show pair (roster tag partners) that P1 did not take
function cpuTagPicks(ex) {
  const pairs = [];
  ROSTER.forEach((c, i) => { const j = ROSTER.findIndex(d => d.id === c.tag); if (j > i && !ex.includes(i) && !ex.includes(j)) pairs.push([i, j]); });
  const pk = pairs.length ? pairs[Math.floor(Math.random() * pairs.length)] : ROSTER.map((_, i) => i).filter(i => !ex.includes(i)).slice(0, 2);
  rrLog("cpuPicks " + pk.map(i => ROSTER[i].id).join(","));
  return pk;
}
function drawTeamImage(ts, sil) {
  const f = ts.f, im = ts.team, h = meta(f.id, "idle").h * f.sc * 1.12, w = im.naturalWidth * h / im.naturalHeight;
  const lo = REEL ? REEL_X0 + 1 : 10, hi = REEL ? REEL_X1 - 1 : W - 10;   // keep the whole pair on screen (reel: in the column)
  const cx = Math.max(lo + w / 2, Math.min(hi - w / 2, (f.x + ts.mate.x) / 2));
  ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(cx, FLOOR + 4, w * 0.42, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(cx, FLOOR); if (f.face < 0) ctx.scale(-1, 1);
  ctx.drawImage(sil ? whiteSprite(im, w, h) : im, -w / 2, -h, w, h); ctx.restore();
}
// the tag super on screen: stage darkened, opponent, then the pair. Freeze: both fighters in super_1 side by side.
// Active (TS_ACTIVE frames): the team image, or both fighters' super_2 (resolvePose falls back to super) side by side.
function drawTagSuper(ts) {
  const opp = game.fighters[1 - ts.s], sil = game.silT > 0, active = ts.t > TS_FREEZE;
  ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(-30, -30, W + 60, H + 60);
  opp.draw(sil);
  if (active && ts.team) { drawTeamImage(ts, sil); game.teamDrawn = (game.teamDrawn || 0) + 1; }
  else { ts.mate.draw(sil); ts.f.draw(sil); if (active) game.tagFallbackDrawn = (game.tagFallbackDrawn || 0) + 1; }
}

// ---------- item 12: stage breaks ----------
// A Level 2 super (su2) or a tag super that K.O.s the opponent within BRK_WALL px of the wall it is knocked toward
// breaks the stage: the loser is flung out past that edge, a drawn crack-and-shatter overlay plays for BRK_LEN frames,
// the camera shakes, and the banner reads "<WINNER NAME> STAGE BREAK: <winner's breakLine>". Once per match.
// Target rule: the stage the fight is on breaks into STAGES[stage].breakInto (you go through the wall of the room
// you are in). roster.js keeps every fighter's breakStage equal to its home stage's breakInto, so on a fighter's
// home stage this is the same as that fighter's breakStage; a stage with no breakInto falls back to the loser's.
// VERSUS / ARCADE: the next round opens on the target stage with the loser getting up (knockdown, BRK_GETUP frames).
// TAG: if the K.O.'d point's partner is still in, the fight moves to the target stage when the shatter ends (white
// flash) and the partner runs in there; if the K.O. ends the match, the banner plays and the match ends as usual.
const BRK_LEN = 30, BRK_WALL = 120, BRK_GETUP = 70, BRK_ROUND_BANNER = 210, BRK_BANNER_END = 200;
const wallDist = (f, dir) => dir > 0 ? RIGHT_WALL - f.x : f.x - LEFT_WALL;
// a stage can be a break target unless its art is known to be missing (unlisted in the asset index, or failed to load);
// breakInto first, then the stage's breakFallback (the old target while new art is not on disk), then the loser's breakStage
const stageUsable = k => !!STAGES[k] && !(STAGE_IMG[k] && STAGE_IMG[k].bad);
function breakTarget(loser) {
  const st = STAGES[game.stage];
  for (const k of [st && st.breakInto, st && st.breakFallback]) if (k && stageUsable(k)) return k;
  const b = loser && loser.ch && loser.ch.breakStage;
  return b && stageUsable(b) ? b : null;
}
// small seeded generator so the crack pattern is the same on every replay of one break (tests, reel captures)
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function tryStageBreak(w, l, dir, kind) {
  if (game.scene !== "fight" || l.state !== "ko") return false;
  if (game.breakUsed) { rrLog("stageBreak skip used"); return false; }
  if (REEL && kind === "tagsuper") { rrLog("stageBreak skip reel-tagsuper"); return false; }   // reel: breaks come from a Level 2 only
  const d = wallDist(l, dir);
  if (d > BRK_WALL) { rrLog("stageBreak skip dist " + Math.round(d)); return false; }
  const to = breakTarget(l);
  if (!to) { rrLog("stageBreak skip no-target " + game.stage); return false; }
  game.breakUsed = true;
  // reel capture: one name per beat, so the banner is "STAGE BREAK: <breakLine>" (the cut-in already named the super)
  const text = (REEL ? "" : `${w.ch.name} `) + `STAGE BREAK: ${w.ch.breakLine || "THROUGH THE WALL!"}`;
  const ox = dir > 0 ? W - 36 : 36, oy = Math.max(180, Math.min(FLOOR - 120, FLOOR + l.y - 230));
  const R = rng(((game.stage.length * 7919) ^ (w.id.length * 104729) ^ (l.id.length * 1299709)) + game.matchNo);
  // cracks: 10 jagged rays fanning into the screen from the impact point, a branch on most, two rings between rays
  const cracks = [], rays = [];
  for (let i = 0; i < 10; i++) {
    const a0 = (dir > 0 ? Math.PI : 0) + (i / 9 - 0.5) * Math.PI * 1.05 + (R() - 0.5) * 0.18, len = 260 + R() * 520, pts = [[ox, oy]];
    let x = ox, y = oy, a = a0;
    for (let k = 0, n = 5 + Math.floor(R() * 3); k < n; k++) { a += (R() - 0.5) * 0.5; x += Math.cos(a) * len / n; y += Math.sin(a) * len / n; pts.push([x, y]); }
    cracks.push({ pts, w: 3.2 }); rays.push(pts);
    if (R() < 0.75) {   // a branch off the middle of the ray
      const j = 1 + Math.floor(R() * (pts.length - 2)); let [bx, by] = pts[j], ba = a0 + (R() < 0.5 ? -1 : 1) * (0.4 + R() * 0.5); const bp = [[bx, by]];
      for (let k = 0; k < 3; k++) { ba += (R() - 0.5) * 0.5; bx += Math.cos(ba) * 50; by += Math.sin(ba) * 50; bp.push([bx, by]); }
      cracks.push({ pts: bp, w: 2 });
    }
  }
  for (const r of [70, 160]) {   // concentric rings: link the point on each ray nearest radius r
    const ring = rays.map(pts => { let best = pts[0], bd = 1e9; for (const p of pts) { const e = Math.abs(Math.hypot(p[0] - ox, p[1] - oy) - r); if (e < bd) { bd = e; best = p; } } return [best[0] + (R() - 0.5) * 10, best[1] + (R() - 0.5) * 10]; });
    cracks.push({ pts: ring, w: 2.2 });
  }
  // shards: glass pieces that break loose after the cracks form and fly out the way the loser goes
  const shards = [];
  for (let i = 0; i < 28; i++) {
    const a = R() * Math.PI * 2, rr = R() * 190, sz = 14 + R() * 34, n = 3 + Math.floor(R() * 2), pts = [];
    for (let k = 0; k < n; k++) { const pa = k / n * Math.PI * 2 + (R() - 0.5) * 0.9; pts.push([Math.cos(pa) * sz * (0.6 + R() * 0.5), Math.sin(pa) * sz * (0.6 + R() * 0.5)]); }
    shards.push({ x: ox - dir * Math.abs(Math.cos(a)) * rr, y: oy + Math.sin(a) * rr, vx: dir * (5 + R() * 14) + (R() - 0.5) * 8, vy: -9 + R() * 11, r: R() * 6, vr: (R() - 0.5) * 0.5, t0: 6 + Math.floor(R() * 7), pts });
  }
  game.brk = { t: 0, w, l, dir, kind, from: game.stage, to, text, ox, oy, cracks, shards };
  game.brkPending = { to, loser: l.id };
  // the loser is flung past the edge (Fighter.update hands it to flyTick, which ignores the walls)
  Object.assign(l, { flyOut: true, gone: false, flyRot: 0, flyDir: dir, vx: dir * 30, vy: -15, move: null });
  game.shake = Math.max(game.shake, 26); sfx("ko");
  rrLog(`stageBreak start ${kind} ${w.id}>${l.id} ${game.stage}>${to} ${dir > 0 ? "right" : "left"}`);
  rrLog("stageBreak banner " + text);
  return true;
}
function flyTick(f) {
  if (f.gone) return;
  f.x += f.vx; f.y += f.vy; f.vy += 0.7;
  if (!f.flyIn || f.bounces === 0) f.flyRot += f.flyDir * (f.flyIn ? LAND_SPIN : 0.22);
  if (f.y > 0) {
    f.y = 0;
    if (f.flyIn) {   // landing on the new stage: the spin stops on the first contact, one small bounce, then a slide to rest
      f.flyRot = 0; f.bounces++; f.vx *= 0.45;
      if (f.bounces >= 2) { Object.assign(f, { flyOut: false, flyIn: false, vx: 0, vy: 0, y: 0 }); rrLog("stageBreak landed " + f.id + " " + Math.round(f.x)); return; }
      f.vy = -Math.abs(f.vy) * 0.28;
    } else f.vy = -Math.abs(f.vy) * 0.3;
  }
  if (!f.flyIn && (f.x > W + 260 || f.x < -260)) { f.gone = true; f.vx = 0; f.vy = 0; rrLog("stageBreak out " + f.id); }
}
// VERSUS / ARCADE / SHOWCASE: under the shatter's closing flash the fight cuts to the break-into stage and the loser
// flies in through the edge it would enter by (out the right wall, in from the left), tumbles and lands. LAND_SPIN
// gives one full turn over the fall, so the knockdown pose lands flat. The winner stands at the entry side.
const LAND_SPIN = Math.PI * 2 / 34;
// reel capture: the loser comes to rest about 150 px past the column center (the fall and bounce travel about 856 px),
// clear of the winner, who stands inside the column at the entry side
const LAND_TRAVEL_REEL = 856;
function landIn(l, w, dir) {
  const x0 = REEL ? W / 2 + dir * 150 - dir * LAND_TRAVEL_REEL : dir > 0 ? -170 : W + 170;
  Object.assign(l, { flyOut: true, flyIn: true, gone: false, bounces: 0, flyRot: 0, flyDir: dir, x: x0, y: -240, vx: dir * 21, vy: -5, move: null });
  if (w && !w.flyOut) { Object.assign(w, { x: REEL ? (dir > 0 ? REEL_X0 + 170 : REEL_X1 - 170) : dir > 0 ? 330 : W - 330, y: 0, vx: 0, vy: 0, face: dir, move: null }); reelClamp(w); }
}
function breakTick() {
  const b = game.brk; b.t++;
  if (b.t < 20) game.shake = Math.max(game.shake, 16);
  if (b.t <= BRK_LEN) for (const s of b.shards) if (b.t >= s.t0) { s.x += s.vx; s.y += s.vy; s.vy += 0.6; s.r += s.vr; }
  if (b.t === BRK_LEN) {
    rrLog("stageBreak overlayEnd");
    // TAG with the partner still in: the fight carries on in the next room, swapped under the shatter's white flash
    if (isTag() && game.brkPending && !(game.banner && game.banner.after) && !sideOut(b.l.slot)) {
      game.stage = game.brkPending.to; game.brkPending = null; game.walk = null; rrLog("stageBreak stage " + game.stage);
    } else if (!isTag() && game.brkPending) {
      game.stage = game.brkPending.to; game.brkGetup = game.brkPending.loser; game.brkPending = null; game.walk = null;
      landIn(b.l, b.w, b.dir); rrLog("stageBreak stage " + game.stage); rrLog("stageBreak landIn " + b.l.id);
    }
  }
  if (b.t > brkBannerEnd() + 40 && !(game.banner && game.banner.brk)) game.brk = null;
}
// the break banner's last frame: BRK_BANNER_END in play; in a reel capture it holds REEL_BANNER frames after the shatter
const brkBannerEnd = () => REEL ? BRK_LEN + REEL_BANNER : BRK_BANNER_END;
// banner over: the next round, on the break-into stage (already swapped under the shatter), with the loser getting up
function nextRoundAfterBreak() {
  const pend = game.brkPending; game.brkPending = null;
  if (pend) { game.stage = pend.to; game.walk = null; rrLog("stageBreak stage " + game.stage); }
  const up = pend ? pend.loser : game.brkGetup; game.brkGetup = null;
  startRound();
  if (!up) return;
  const l = game.fighters.find(f => f.id === up);
  if (l) { l.state = "down"; l.stun = BRK_GETUP; rrLog("stageBreak getUp " + l.id); }
}
function drawBreakOverlay(b) {
  const t = b.t, grow = ease(Math.min(1, t / 8)), fade = t < 18 ? 1 : Math.max(0, 1 - (t - 18) / 12);
  ctx.save();
  if (t <= 4) { ctx.fillStyle = `rgba(255,255,255,${0.55 * (1 - t / 5)})`; ctx.fillRect(-40, -40, W + 80, H + 80); }   // impact flash
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const pass of [0, 1]) {   // dark edge under a white core, so the cracks read on bright and dark stages
    ctx.strokeStyle = pass ? `rgba(255,255,255,${0.95 * fade})` : `rgba(10,6,20,${0.55 * fade})`;
    for (const c of b.cracks) {
      ctx.lineWidth = pass ? c.w : c.w + 4; const n = c.pts.length, upto = (n - 1) * grow;
      ctx.beginPath(); ctx.moveTo(c.pts[0][0], c.pts[0][1]);
      for (let i = 1; i < n; i++) {
        if (i <= upto) ctx.lineTo(c.pts[i][0], c.pts[i][1]);
        else { const f = upto - (i - 1); if (f > 0) ctx.lineTo(c.pts[i - 1][0] + (c.pts[i][0] - c.pts[i - 1][0]) * f, c.pts[i - 1][1] + (c.pts[i][1] - c.pts[i - 1][1]) * f); break; }
      }
      ctx.stroke();
    }
  }
  // impact star at the break point
  const g = ctx.createRadialGradient(b.ox, b.oy, 0, b.ox, b.oy, 120);
  g.addColorStop(0, `rgba(255,255,255,${0.9 * fade})`); g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.ox, b.oy, 120, 0, Math.PI * 2); ctx.fill();
  for (const s of b.shards) {
    if (t < s.t0) continue;
    const a = Math.min(1, (BRK_LEN + 2 - t) / 8);
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.r); ctx.beginPath(); s.pts.forEach((p, i) => ctx[i ? "lineTo" : "moveTo"](p[0], p[1])); ctx.closePath();
    ctx.fillStyle = `rgba(235,248,255,${0.82 * a})`; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = `rgba(20,12,28,${0.6 * a})`; ctx.stroke();
    ctx.restore();
  }
  if (t >= BRK_LEN - 3) { ctx.fillStyle = `rgba(255,255,255,${0.35 * (t - BRK_LEN + 4) / 4})`; ctx.fillRect(-40, -40, W + 80, H + 80); }   // closing flash
  ctx.restore();
  game.brkDrawn = (game.brkDrawn || 0) + 1;
}
// "<WINNER NAME> STAGE BREAK:" over the winner's breakLine on a yellow slab that slides in from the break side
function drawBreakBanner(b) {
  const age = b.t - BRK_LEN, slide = (1 - ease(Math.min(1, age / 8))) * b.dir * -W;
  if (REEL) { drawBreakBannerReel(b, age); return; }
  const cut = b.text.indexOf(":"), l1 = b.text.slice(0, cut + 1), l2 = b.text.slice(cut + 2);
  const fit = (s, size, max, font) => { ctx.font = `${size}px '${font}', Impact, sans-serif`; while (size > 14 && ctx.measureText(s).width > max) { size -= 2; ctx.font = `${size}px '${font}', Impact, sans-serif`; } return size; };
  ctx.save(); ctx.translate(slide, 0);
  const y = 228, h = 150;
  ctx.fillStyle = "#140c1c"; ctx.beginPath(); ctx.moveTo(40, y - 8); ctx.lineTo(W - 10, y - 8); ctx.lineTo(W - 40, y + h + 8); ctx.lineTo(10, y + h + 8); ctx.fill();
  ctx.fillStyle = "#ffd23f"; ctx.beginPath(); ctx.moveTo(50, y); ctx.lineTo(W - 22, y); ctx.lineTo(W - 50, y + h); ctx.lineTo(22, y + h); ctx.fill();
  const s1 = fit(l1, 58, 1080, "Bungee");
  ctx.fillStyle = "#140c1c"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(l1, W / 2, y + 50);
  const s2 = fit(l2, 34, 1100, "Bungee");
  ctx.font = s2 + "px 'Bungee', Impact, sans-serif"; ctx.fillStyle = "#140c1c"; ctx.fillText(l2, W / 2, y + 112);   // dark type on yellow, same as line 1
  ctx.restore();
  hudBox("breakBanner", Math.max(0, 10 + slide), y - 8, W - 20, h + 16);
  game.brkBannerDrawn = (game.brkBannerDrawn || 0) + 1; void s1;
}
// reel capture: "STAGE BREAK:" over the breakLine (one or two lines, never under REEL_MIN px) on a slab that sits inside
// the center column (x REEL_X0..REEL_X1), fading in (no slide from off screen), held REEL_BANNER frames after the
// shatter. ?banners=0: not drawn (the 9:16 caption carries it).
function drawBreakBannerReel(b, age) {
  if (age >= REEL_BANNER || !REEL_BANNERS) return;
  const cut = b.text.indexOf(":"), l1 = b.text.slice(0, cut + 1), l2 = b.text.slice(cut + 2);
  const x0 = REEL_X0 + 4, x1 = REEL_X1 - 4, f2 = fitLines(l2, x1 - x0 - 70, 50, REEL_MIN), lh = Math.round(f2.size * 1.1), y = 228, h = 70 + f2.lines.length * lh + 14;
  ctx.save(); ctx.globalAlpha = Math.min(1, age / 6, (REEL_BANNER - age) / 8);
  ctx.fillStyle = "#140c1c"; ctx.beginPath(); ctx.moveTo(x0 + 30, y - 8); ctx.lineTo(x1, y - 8); ctx.lineTo(x1 - 30, y + h + 8); ctx.lineTo(x0, y + h + 8); ctx.fill();
  ctx.fillStyle = "#ffd23f"; ctx.beginPath(); ctx.moveTo(x0 + 40, y); ctx.lineTo(x1 - 12, y); ctx.lineTo(x1 - 40, y + h); ctx.lineTo(x0 + 12, y + h); ctx.fill();
  ctx.fillStyle = "#140c1c"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const s1 = fitLines(l1, x1 - x0 - 90, 56, REEL_MIN).size;
  ctx.font = s1 + "px 'Bungee', Impact, sans-serif"; ctx.fillText(l1, W / 2, y + 40);
  ctx.font = f2.size + "px 'Bungee', Impact, sans-serif"; f2.lines.forEach((l, i) => ctx.fillText(l, W / 2, y + 84 + i * lh + lh / 2 - 6));
  ctx.restore();
  hudBox("breakBanner", x0, y - 8, x1 - x0, h + 16); reelUi("banner", x0, y - 8, x1 - x0, h + 16);
  game.brkBannerDrawn = (game.brkBannerDrawn || 0) + 1; game.brkBannerText = [l1].concat(f2.lines);
}


// ---------- assist strikers (Todd 2026-10-18): a side character from the fighter's show runs in, does one attack, leaves ----------
// Data: roster assist { key, name, attack, dmg, voice, callPose }. Input: both heavies (ASSIST_CHORDS in core.js), the
// ASSIST touch button, LT + RT together or a stick click on a pad, or __rr / the reel director pressing "assist".
// Cost ASSIST_COST meter, ASSIST_PER_ROUND use per round, ASSIST_CD frames of cooldown. The assist runs in from the
// caller's back edge (the screen edge behind the caller) over AS_RUN frames, attacks once (hit stop, the
// "ASSIST: <NAME>" banner for at most ASSIST_BANNER frames, its clip if one is on disk), then exits the way it came.
// It is not a fighter: it is never hit, never pushes, and is not in game.fighters. A blocked assist still pushes back.
// attack kinds (ASSIST_MOVES): stand = where it stops in front of the opponent, atk1 = wind-up frames, atk2 = the hit
// frame held, stun / kb = the opponent's hit stun and knockback, reach = the most the opponent may be off its spot.
//   slap  (Florence, feather duster)  swing (Grady, cane)  tray (Geoffrey, silver tray to the face, knockdown)
//   throw (Jazz: runs up behind the caller, the caller throws him bodily, he flies across, lands in a heap, exits)
//   stun  (Harriette: points and shouts, unblockable, the opponent flinches 40 frames, a CPU caller takes a free hit)
//   pin   (Myra: tackle hug, the opponent is held 60 frames)
const ASSIST_COST = 50, ASSIST_PER_ROUND = 1, ASSIST_CD = 360, ASSIST_BANNER = 72, AS_RUN = 22, AS_EXIT = 24, AS_CALL = 18, AS_FLY = 24;
const ASSIST_MOVES = {
  slap:  { stand: 120, atk1: 8,  atk2: 18, stun: 22, kb: 10, reach: 240 },
  swing: { stand: 150, atk1: 10, atk2: 18, stun: 24, kb: 13, reach: 270 },
  tray:  { stand: 115, atk1: 8,  atk2: 18, stun: 26, kb: 12, reach: 240, knock: true },
  throw: { stand: 40,  atk1: 0,  atk2: 34, stun: 50, kb: 14, reach: 280, knock: true },
  stun:  { stand: 250, atk1: 12, atk2: 34, stun: 40, kb: 2,  reach: 560, unblockable: true, flinch: true },
  pin:   { stand: 70,  atk1: 6,  atk2: 60, stun: 60, kb: 0,  reach: 220, pin: true },
};
const lerp = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
// why a side cannot call its assist right now ("" = it can)
function assistBlock(s) {
  const f = game.fighters && game.fighters[s]; if (!f) return "nofighter";
  if (!f.ch.assist) return "none";
  if (game.scene !== "fight") return "scene";
  if (game.banner || game.superFreeze || game.tagSuper || game.brk) return "busy";
  if (game.assists[s]) return "active";
  if (game.assistUsed[s] >= ASSIST_PER_ROUND) return "used";
  if (game.assistCd[s] > 0) return "cooldown";
  if (f.meter < ASSIST_COST) return "meter " + Math.floor(f.meter);
  if (f.flyOut || f.air || ["hit", "down", "ko", "win", "tagin", "tagout", "tagsuper", "intro", "assistcall", "bench"].includes(f.state)) return f.air ? "air" : f.state;
  return "";
}
const assistChord = (s, inp) => (ASSIST_CHORDS[s] || []).some(([a, b]) => (inp.pressed[a] && inp.held[b]) || (inp.pressed[b] && inp.held[a]));
function assistInput(s, inp) {
  const chord = assistChord(s, inp);
  if (!inp.pressed.assist && !chord) return;
  if (chord) for (const k of ["hp", "hk", "lk"]) inp.pressed[k] = false;   // the chord is the call, not two attacks
  const why = assistBlock(s);
  if (why) { rrLog("assistDenied " + s + " " + why); return; }
  startAssist(s);
}
function startAssist(s) {
  const f = game.fighters[s], opp = game.fighters[1 - s], def = f.ch.assist, mv = ASSIST_MOVES[def.attack] || ASSIST_MOVES.slap;
  f.meter -= ASSIST_COST; game.assistUsed[s]++; game.assistCd[s] = ASSIST_CD;
  const edgeDir = backDir(s), fromX = edgeDir < 0 ? -140 : W + 140, art = ASSIST_ART[def.key] || null;
  const hasArt = !!(art && Object.keys(art.poses).length);
  game.assists[s] = { s, def, mv, caller: f, art, hasArt, phase: "run", t: 0, x: fromX, y: 0, rot: 0, fromX, edgeDir, face: opp.x >= f.x ? 1 : -1, hit: false, pin: null, noArt: {} };
  game.assistBanner = { text: "ASSIST: " + String(def.name || def.key).toUpperCase(), slot: s, t: ASSIST_BANNER };
  sfx("whiff");
  const vk = assistVoiceKey(def);
  if (vk) playVoice(null, "assist", 0, { key: vk, id: "assist:" + def.key }); else rrLog("assistVoice none " + def.key);
  rrLog(`assist ${s} ${f.id} ${def.key} ${def.attack}${hasArt ? "" : " noart"}`);
}
function assistTick() {
  for (let s = 0; s < 2; s++) { if (game.assistCd[s] > 0) game.assistCd[s]--; const a = game.assists[s]; if (a) assistStep(a); }
  if (game.assistBanner && --game.assistBanner.t <= 0) game.assistBanner = null;
}
function assistPhase(a, ph) { a.phase = ph; a.t = 0; a.from = a.x; a.fromY = a.y; }
function assistStep(a) {
  const opp = game.fighters[1 - a.s], mv = a.mv, c = a.caller; a.t++;
  const clampX = x => REEL ? Math.max(REEL_X0 + 70, Math.min(REEL_X1 - 70, x)) : Math.max(LEFT_WALL - 40, Math.min(RIGHT_WALL + 40, x));   // reel: inside the column
  switch (a.phase) {
    case "run": {
      const throwing = a.def.attack === "throw", goal = clampX(throwing ? c.x - a.face * mv.stand : opp.x - a.face * mv.stand);
      a.x = lerp(a.fromX, goal, a.t / AS_RUN);
      if (a.t >= AS_RUN) {
        if (!throwing) { assistPhase(a, "atk1"); break; }
        if (!c.air && ["idle", "walk", "crouch"].includes(c.state)) { Object.assign(c, { state: "assistcall", t: 0, vx: 0, move: null, taunt: 0 }); c.face = a.face; }
        a.x = c.x + a.face * 30; a.y = -170; assistPhase(a, "fly"); rrLog("assistThrow " + c.id + " " + a.def.key);
      }
      break;
    }
    case "fly": {   // thrown: an arc from the caller's hands to the opponent's chest, spinning
      const k = a.t / AS_FLY, tx = opp.x - a.face * 50;
      a.x = lerp(a.from, tx, k); a.y = lerp(-170, -120, k) - 4 * 90 * k * (1 - k); a.rot = a.face * k * Math.PI * 1.5;
      if (a.t >= AS_FLY) { a.rot = 0; assistHit(a); assistPhase(a, "atk2"); }
      break;
    }
    case "atk1":
      if (a.t >= mv.atk1) { assistPhase(a, "atk2"); assistHit(a); }
      break;
    case "atk2": {
      if (a.def.attack === "throw") { a.y = lerp(a.fromY, 0, a.t / 8); a.x += a.face * Math.max(0, 6 - a.t); }   // drops into a heap
      if (a.pin) {   // the hug holds the opponent in place
        if (a.pin.state === "hit") { a.pin.x = a.pinX; a.pin.vx = 0; a.pin.stun = Math.max(a.pin.stun, 2); a.x = lerp(a.x, a.pinX - a.face * 45, 0.5); }   // Myra hugs, the opponent stays put
        else a.pin = null;
      }
      if (a.t >= mv.atk2) { if (a.pin) { a.pin.stun = 8; a.pin = null; } assistPhase(a, "exit"); }
      break;
    }
    case "exit":
      a.x = lerp(a.from, a.fromX, a.t / AS_EXIT); a.y = 0;
      if (a.t >= AS_EXIT) { game.assists[a.s] = null; rrLog("assistEnd " + a.def.key); }
      break;
  }
}
function assistHit(a) {
  const opp = game.fighters[1 - a.s], mv = a.mv, d = a.def; a.hit = true;
  const off = Math.abs(opp.x - a.x);
  if (["down", "ko"].includes(opp.state) || TAG_OFF.includes(opp.state) || opp.inv > 0 || opp.flyOut || off > mv.reach) { rrLog(`assistWhiff ${d.key} ${opp.state} ${Math.round(off)}`); return; }
  const hx = opp.x - a.face * 20, hy = FLOOR + opp.y - 250;
  const guarding = opp.state === "block" || (opp.holdingBack && !opp.air && ["idle", "walk", "crouch"].includes(opp.state));
  if (guarding && !mv.unblockable) {   // blocked: no damage, still a push back
    Object.assign(opp, { state: "block", crouchBlock: false, stun: 14, vx: a.face * (mv.kb + 6), move: null });
    sfx("block"); game.spark(hx, hy, "#9ee7ff"); game.hitStop = 4; game.assistHits.push({ key: d.key, blocked: true, dmg: 0 });
    rrLog(`assistHit ${d.key} blocked push`); return;
  }
  const dmg = Math.max(0, Math.round(d.dmg || 0));
  if (dmg) { opp.hp -= dmg; opp.flash = 8; addRed(opp, dmg); noteDamage(opp, dmg); }
  opp.move = null; opp.taunt = 0;
  if (mv.knock || opp.hp <= 0) { Object.assign(opp, { state: "down", stun: 55, vx: a.face * mv.kb * 1.2, y: 0, vy: 0 }); nextTicker(); }
  else if (mv.pin) { Object.assign(opp, { state: "hit", stun: mv.atk2 + 4, vx: 0 }); a.pin = opp; a.pinX = opp.x; }
  else Object.assign(opp, { state: "hit", stun: mv.stun, vx: a.face * mv.kb });
  if (mv.flinch && a.caller.cpu) a.caller.punish = mv.stun;
  sfx(dmg ? "heavy" : "hit"); game.spark(hx, hy, "#fff3b0"); game.bursts.push({ x: hx, y: hy, t: 0, life: 14, big: false });
  game.hitStop = 6; game.silT = 2; game.shake = Math.max(game.shake, 8);
  opp.combo = { hits: (opp.combo.hits || 0) + 1, dmg: (opp.combo.dmg || 0) + dmg };
  if (!game.firstHit) { game.firstHit = true; callout("FIRST ATTACK", a.s); }
  if (opp.hp <= 0) { opp.hp = 0; opp.red = 0; opp.state = "ko"; opp.stun = 9999; }
  game.assistHits.push({ key: d.key, blocked: false, dmg, state: opp.state });
  rrLog(`assistHit ${d.key} ${dmg}${a.pin ? " pin" : mv.flinch ? " flinch" : ""}`);
}
// the pose for this frame; a missing pose falls back to a neighbor (atk2 -> atk1 -> run, exit -> run, run -> exit)
function assistPoseName(a) {
  if (a.def.attack === "throw") return { run: "run", fly: "atk1", atk2: "atk2", exit: "exit" }[a.phase] || "run";
  return { run: "run", atk1: "atk1", atk2: "atk2", exit: "exit" }[a.phase] || "run";
}
const ASSIST_FALLBACK = { run: ["run", "exit", "atk1"], atk1: ["atk1", "run", "atk2"], atk2: ["atk2", "atk1", "run"], exit: ["exit", "run", "atk1"] };
function assistPose(a) {
  const want = assistPoseName(a), ok = p => p && p.im && p.im.complete && p.im.naturalWidth && !p.im.bad;
  for (const n of ASSIST_FALLBACK[want]) { const p = a.art && a.art.poses[n]; if (ok(p)) return p; }
  if (!a.noArt[want]) { a.noArt[want] = true; rrLog(`assist noart ${a.def.key} ${want}`); }
  return null;
}
// drawn like a fighter: S * size from assists.json, feet on the floor at the anchor ax, source art facing right
// Source art faces the opponent as if the assist entered from the left (facing right), except the exit pose, which is
// drawn already running away (facing left). A missing exit pose falls back to run, flipped toward the exit edge.
function assistRect(a, p) {
  const k = S * ((a.art && a.art.size) || 1), w = (p.w || p.im.naturalWidth), h = (p.h || p.im.naturalHeight), ax = p.ax == null ? w / 2 : p.ax;
  const exitArt = a.art && a.art.poses.exit === p;
  const dir = a.phase === "exit" && !exitArt ? a.edgeDir : a.face;   // facing-right art points at the exit edge
  const left = dir > 0 ? a.x - ax * k : a.x - (w - ax) * k;
  return { k, w, h, ax, dir, box: [Math.round(left), Math.round(FLOOR + a.y - h * k), Math.round(w * k), Math.round(h * k)] };
}
function drawAssist(a) {
  const p = assistPose(a); if (!p) return;
  const r = assistRect(a, p);
  if (a.y > -60) { ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(a.x, FLOOR + 4, 60, 10, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.save(); ctx.translate(a.x, FLOOR + a.y);
  if (a.rot) { ctx.translate(0, -r.h * r.k * 0.45); ctx.rotate(a.rot); ctx.translate(0, r.h * r.k * 0.45); }
  if (r.dir < 0) ctx.scale(-1, 1);
  ctx.drawImage(game.silT > 0 ? whiteSprite(p.im, r.w * r.k, r.h * r.k) : p.im, -r.ax * r.k, -r.h * r.k, r.w * r.k, r.h * r.k);
  ctx.restore();
  game.assistDrawn = (game.assistDrawn || 0) + 1; a.box = r.box;
}
