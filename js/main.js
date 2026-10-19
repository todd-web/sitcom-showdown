// Fighting game engine, part 6 of 6 (main.js): main loop and the window.__rr test hook.
// Plain classic scripts loaded in order by index.html (core, fight, flow, draw, screens, main). They share one
// global scope, so a top-level name declared in one part is visible in the parts after it. Top-level code in a
// part may only call functions from the same or an earlier part (calls inside functions run after all parts load).
"use strict";
// ---------- loop ----------
let last = performance.now(), acc = 0, manual = false, rafDraw = true;   // rafDraw false: only __rr.step draws (reel capture)
function frame() { draw(); ctx.setTransform(1, 0, 0, 1, 0, 0); drawOverlay(); }
function loop(now) {
  acc += Math.min(100, now - last); last = now;
  if (manual) acc = 0;
  while (acc >= 1000 / 60) { update(); acc -= 1000 / 60; }
  if (rafDraw) frame();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.__game = game; window.__music = music;
// test hook: state, event log, meter and input forcing, deterministic stepping. Nothing runs unless called.
window.__rr = {
  game, log: RR_LOG, MOVES, music, voice: VOICE, load: LOAD,
  fighters: () => game.fighters,
  pose: slot => { const f = game.fighters && game.fighters[slot]; return f ? f.pose() : null; },
  art: slot => { const f = game.fighters && game.fighters[slot]; return f ? resolvePose(f.id, f.pose()) : null; },
  resolvePose,
  setMeter: (slot, v) => { const f = game.fighters && game.fighters[slot]; if (f) f.meter = Math.max(0, Math.min(METER_MAX, v)); },
  setHp: (slot, v) => { const f = game.fighters && game.fighters[slot]; if (f) f.hp = v; },
  press: (slot, ...btns) => { for (const b of btns) FORCE[slot].press.add(b); },
  hold: (slot, btn, on = true) => { if (on) FORCE[slot].held[btn] = true; else delete FORCE[slot].held[btn]; },
  release: slot => { FORCE[slot].held = {}; },
  manual: on => { manual = !!on; acc = 0; },
  step: (n = 1) => { for (let i = 0; i < n; i++) update(); frame(); return game.t; },
  advance: (n = 1) => { for (let i = 0; i < n; i++) update(); return game.t; },   // updates without drawing (fast waits); step(0) draws
  clearLog: () => { RR_LOG.length = 0; },
  flex: slot => { const f = game.fighters && game.fighters[slot]; return f ? bodyFlex(f, f.pose()) : null; },
  breath, ctx, walkerImg: WALKER_IMG, portraitImg: PORTRAIT_IMG, stageImg: STAGE_IMG,
  hud: () => game.hud, hudFace: () => game.hudFace.slice(), isTouch, HUD,
  // item 8 (TAG)
  teams: () => game.teams, partner: slot => game.fighters && partnerOf(game.fighters[slot]), pairKey, teamImg: TEAM_IMG,
  tagState: () => ({ mode: game.mode, cpu: game.tagCpu, picks: game.tagPicks.map(p => p.slice()), arm: game.tagArm.slice(), koWait: game.koWait.slice(),
    runners: game.runners.map(r => r.id + ":" + r.state), superT: game.tagSuper ? game.tagSuper.t : -1, teamDrawn: game.teamDrawn || 0,
    fallbackDrawn: game.tagFallbackDrawn || 0, redDrawn: game.redDrawn || 0 }),
  setRed: (slot, v, partner = false) => { const f = game.fighters && game.fighters[slot]; const g = partner ? partnerOf(f) : f; if (g) g.red = v; },
  TAG: { TAG_RUN, TAG_INV, TAG_REGEN, TS_FREEZE, TS_ACTIVE, TS_DMG },
  // item 12 (stage breaks)
  brk: () => { const b = game.brk; return { active: !!b, t: b ? b.t : -1, used: game.breakUsed, text: b ? b.text : null, to: b ? b.to : null, kind: b ? b.kind : null,
    overlay: !!b && b.t <= BRK_LEN, cracks: b && b.t <= BRK_LEN ? b.cracks.length : 0, shards: b && b.t <= BRK_LEN ? b.shards.filter(s => b.t >= s.t0).length : 0,
    pending: game.brkPending ? Object.assign({}, game.brkPending) : null, stage: game.stage, drawn: game.brkDrawn || 0, bannerDrawn: game.brkBannerDrawn || 0 }; },
  breakTarget: (loserSlot = 1) => breakTarget(game.fighters && game.fighters[loserSlot]),
  // deterministic K.O. setup: the defender 30 px from the wall the attacker faces (mid: true puts it 120 px off center),
  // `gap` px between them, defender at `hp` (default 1), attacker meter at `meter` (default 200); idle, banners and freezes cleared
  setupStageBreak: (o = {}) => {
    const atk = o.attacker || 0, a = game.fighters[atk], d = game.fighters[1 - atk], dir = atk === 0 ? 1 : -1;
    const gap = o.gap || 230, dxp = o.mid ? W / 2 + dir * 120 : dir > 0 ? RIGHT_WALL - 30 : LEFT_WALL + 30;
    for (const f of [a, d]) Object.assign(f, { y: 0, vx: 0, vy: 0, state: "idle", t: 0, move: null, stun: 0, buffer: null, taunt: 0, idleT: 0, inv: 0, flyOut: false, gone: false, flyRot: 0 });
    Object.assign(d, { x: dxp, face: -dir, hp: o.hp == null ? 1 : o.hp }); Object.assign(a, { x: dxp - dir * gap, face: dir, meter: o.meter == null ? METER_MAX : o.meter });
    Object.assign(game, { banner: null, hitStop: 0, superFreeze: 0, pend: [null, null] }); FORCE.forEach(fc => { fc.held = {}; fc.press.clear(); });
    return { attacker: a.id, loser: d.id, dist: wallDist(d, dir), x: d.x };
  },
  BRK: { BRK_LEN, BRK_WALL, BRK_GETUP, BRK_ROUND_BANNER, BRK_BANNER_END },
  // item 11 (arcade map)
  ladder: () => (game.ladder || []).map(l => ({ city: l.city, from: l.from, opp: ROSTER[l.opp].id, stage: l.stage, final: l.final, near: l.near })),
  mapState: () => { const leg = curLeg(); return { scene: game.scene, t: game.mapT, i: game.ladderI, total: (game.ladder || []).length, ready: game.mapT >= MAP_READY,
    leg: leg ? { city: leg.city, from: leg.from, opp: ROSTER[leg.opp].id, stage: leg.stage, final: leg.final, near: leg.near } : null,
    plane: game.mapPlane, card: game.mapCard, art: game.mapArt, music: music.want }; },
  planeAt: t => { const leg = curLeg(); return leg ? planeAt(leg, t) : null; },
  buildLadder: id => buildLadder(ROSTER.findIndex(c => c.id === id)).map(l => ({ city: l.city, from: l.from, opp: ROSTER[l.opp].id, stage: l.stage, final: l.final, near: l.near })),
  MAP: { MAP_IN, MAP_FLY, MAP_CARD, MAP_READY },
  mapImg: MAP_IMG,
  // item 13 (logo, title, select, SHOWCASE)
  showcase: (o = {}) => startShowcase(o),
  showcaseState: () => game.showcase ? Object.assign({ scene: game.scene, mode: game.mode, cpu: allFighters().map(f => f.id + ":" + !!f.cpu), stage: game.stage }, game.showcase) : null,
  logo: () => ({ lines: LOGO.lines.slice(), sizes: LOGO.sizes.slice(), font: LOGO.font, title: LOGO.title, w: LOGO.w, h: LOGO.h }),
  logoPng: (w = 200, bg = "#140c1c", shine = -1) => logoImage(w, bg, shine),
  rebuildLogo: t => buildLogo(t == null ? (TITLE_PARAM || window.GAME_TITLE) : t), titleLines, titleParam: () => TITLE_PARAM,
  titleState: () => ({ t: game.titleT, stage: game.titleStage, stages: TITLE_STAGES.slice(), ready: TITLE_STAGES.filter(stageReady), march: game.titleMarch, marquee: game.marquee || "",
    art: game.titleArt || null, logo: game.titleLogo || null }),
  modeState: () => Object.assign({ menu: game.menu, scene: game.scene }, game.modeDraw || {}),
  uiImg: UI_IMG, uiReady,
  // VS loading screen: vsOff(true) skips it everywhere (tests that only want the fight), skipVs() ends a running one
  // now (the match starts), vsState() reports it
  vsOff: (on = true) => { game.vsOff = !!on; return game.vsOff; },
  skipVs: () => game.scene === "vs" ? endVs() : false,
  vsState: () => game.vs ? Object.assign({ scene: game.scene, a: ROSTER[game.vs.a].id, b: ROSTER[game.vs.b].id, stage: game.vs.stage, t: game.vs.t, len: VS_LEN,
    mates: game.vs.mates ? game.vs.mates.map(i => ROSTER[i].id) : null }, { draw: game.vsDraw || null }) : null,
  // voice and speech bubbles
  bubbles: () => ({ list: (game.bubbles || []).map(b => Object.assign({}, b)), drawn: game.bubbleDraw || [] }),
  voiceKey: (id, slot) => voiceKey(ROSTER.find(c => c.id === id), slot), voiceLines: () => Object.assign({}, VOICE.lines), voiceSlots: () => JSON.parse(JSON.stringify(VOICE.slots)),
  playVoice: (id, slot, delay = 0) => playVoice(ROSTER.find(c => c.id === id), slot, delay),
  walker: () => ({ walk: game.walk ? Object.assign({}, game.walk) : null, box: game.walkerBox || null, avg: Math.round(avgIdleH()), k: WALKER_K }),
  startWalker: (dir = 1) => { const key = (STAGES[game.stage] || {}).walker; if (!key || !WALKERS_ON) return null; game.walk = { key, dir, x: dir > 0 ? -140 : W + 140, t: 0 }; return key; },
  walkersOn: () => WALKERS_ON,
  // assist strikers: state, art, readiness, and the reel director's hooks (prime: meter, use and cooldown made ready)
  assistArt: ASSIST_ART, assistBlock: slot => assistBlock(slot), ASSIST: { ASSIST_COST, ASSIST_PER_ROUND, ASSIST_CD, ASSIST_BANNER, AS_RUN, AS_EXIT, AS_FLY, ASSIST_MOVES },
  assistState: () => ({ active: game.assists.map(a => a ? { key: a.def.key, attack: a.def.attack, phase: a.phase, t: a.t, x: Math.round(a.x), y: Math.round(a.y), hit: a.hit, hasArt: a.hasArt, box: a.box || null } : null),
    used: game.assistUsed.slice(), cd: game.assistCd.slice(), banner: game.assistBanner ? Object.assign({}, game.assistBanner) : null, hits: game.assistHits.slice(), drawn: game.assistDrawn || 0, bannerDrawn: game.assistBannerDrawn || 0 }),
  assistPrime: slot => { const f = game.fighters && game.fighters[slot]; if (!f) return false; f.meter = Math.max(f.meter, ASSIST_COST); game.assistUsed[slot] = 0; game.assistCd[slot] = 0; return true; },
  assistVoice: id => { const c = ROSTER.find(r => r.id === id); return c && c.assist ? assistVoiceKey(c.assist) : null; },
  super2Cycle: id => { const c = ROSTER.find(r => r.id === id); return c ? super2CycleOf({ id, ch: c }) : null; },
  // reel voice control: mute(id, slot) drops that fighter's clip slot ("*" = every fighter); unmute with on = false
  voiceMute: (id, slot, on = true) => { const k = (id || "*") + "/" + slot; if (on) VOICE.mute.add(k); else VOICE.mute.delete(k); return [...VOICE.mute]; },
  voiceMuted: (id, slot) => VOICE.mute.has((id || "*") + "/" + slot),
  hits: () => game.hits.slice(),
  camera: () => reelCamera(),
  // reel layout: the HUD on or off (the hook shot hides it), the banners flag (?banners=0), this frame's overlay boxes
  hudShow: (on = true) => { game.hudOff = !on; return !game.hudOff; },
  reelBanners: REEL_BANNERS, reelUi: () => (game.reelUi || []).map(u => ({ k: u.k, box: u.box.slice() })),
  reelCol: [REEL_X0, REEL_X1], reelWalls: [LEFT_WALL, RIGHT_WALL], headBox: slot => { const f = game.fighters && game.fighters[slot]; return f ? headBox(f) : null; },
  fighterBox: slot => { const f = game.fighters && game.fighters[slot]; return f ? fighterBox(f) : null; },
  reelTextWarn: () => (game.reelTextWarn || []).slice(),
  // hard cut mid-fight: the fight moves to `stage` with health, meters, timer and round kept (no ROUND banner, no
  // intros); banners, effects and bubbles clear and both fighters are placed (place() options: gap, center, swap)
  cut: (o = {}) => {
    if (game.scene !== "fight" || !game.fighters) return null;
    if (o.stage && STAGES[o.stage]) game.stage = o.stage;
    Object.assign(game, { banner: null, hitStop: 0, superFreeze: 0, bursts: [], sparks: [], callouts: [], comboShow: [null, null], lowBanner: null,
      moveBanner: null, bubbles: [], walk: null, pend: [null, null], assists: [null, null], assistBanner: null, roundLines: null });
    window.__rr.place(o); rrLog("cut " + game.stage); return game.stage;
  },
  sel: () => ({ cells: SEL.cells.map((c, i) => Object.assign({ id: ROSTER[i].id, show: ROSTER[i].show }, c)), labels: SEL.labels.map(l => Object.assign({}, l)), order: SEL.order.slice(), rows: SEL.rows, draw: game.selDraw || null }),
  selStep, selRow, DISCLAIMER, MODE_ITEMS,
  // K.O. the fighter facing `winner` right now (skips a round-start banner; refuses while a round-end banner runs)
  koNow: (winner = 0) => {
    if (game.scene !== "fight" || !game.fighters || (game.banner && game.banner.after)) return false;
    const l = game.fighters[1 - winner]; Object.assign(game, { banner: null, hitStop: 0, superFreeze: 0 });
    Object.assign(l, { hp: 0, red: 0, state: "ko", stun: 9999, move: null }); return true;
  },
  // item 16 (reel captures, _tools/capture_reel.py): audio event log, offline sfx render, CPU steering, scene jumps
  audioLog: () => AUDIO_LOG.slice(), clearAudioLog: () => { AUDIO_LOG.length = 0; }, musicNow: () => music.logged || null,
  renderSfx, reel: REEL, hasArt: id => hasArtId(id),
  rafDraw: on => { rafDraw = !!on; },
  cpuPress: (slot, ...btns) => { for (const b of btns) FORCE[slot].cpu.add(b); },
  cpuHush: (slot, n = 0) => { FORCE[slot].hush = Math.max(0, n | 0); },
  cpuCalm: (slot, on = true) => { FORCE[slot].calm = !!on; },
  hpFloor: v => { game.hpFloor = Math.max(0, +v || 0); return game.hpFloor; },
  cpuWalk: (slot, n = 60, dir = 1) => { FORCE[slot].walk = Math.max(0, n | 0); FORCE[slot].walkDir = dir < 0 ? -1 : 1; },   // force a CPU walk (George's strut capture)
  cycle: slot => { const f = game.fighters && game.fighters[slot]; return f ? { walk: cycleOf(f, "walkCycle"), intro: cycleOf(f, "introCycle"), state: f.state, introT: f.introT || 0 } : null; },
  // both point fighters idle on the ground, `gap` px apart around `center`, facing each other (o.swap: P1 on the right)
  place: (o = {}) => {
    if (!game.fighters) return null;
    const [a, d] = game.fighters, gap = o.gap || 220, c = o.center || W / 2, s = o.swap ? -1 : 1;
    for (const f of [a, d]) Object.assign(f, { y: 0, vx: 0, vy: 0, state: "idle", t: 0, move: null, stun: 0, buffer: null, taunt: 0, idleT: 0, inv: 0 });
    Object.assign(a, { x: c - s * gap / 2, face: s }); Object.assign(d, { x: c + s * gap / 2, face: -s });
    return { a: a.x, d: d.x };
  },
  // jump to a presentation scene: boot (TV power-on), title (logo slam, lineup march), map (o.fighter's arcade ladder
  // at leg o.leg, plane in flight), endcard (o.text, default END_TEXT). Leaves any SHOWCASE.
  scene: (name, o = {}) => {
    game.showcase = null;
    if (name === "boot") { stopMusic(true); music.cur = null; music.want = null; Object.assign(game, { scene: "boot", bootT: o.t || 0 }); }
    else if (name === "title") { Object.assign(game, { scene: "title", titleT: o.t || 0 }); sfx("ko"); playMusic("title"); }
    else if (name === "map") {
      const me = Math.max(0, rosterIndex(o.fighter == null ? 0 : o.fighter));
      Object.assign(game, { mode: "arcade", level: 1 }); game.sel[0] = me; game.ladder = buildLadder(me);
      game.ladderI = Math.max(0, Math.min(game.ladder.length - 1, o.leg || 0)); enterMap();
    } else if (name === "vs") {   // o: { a, b (ids), stage, tag }: the VS screen for that matchup, then the fight
      const a = Math.max(0, rosterIndex(o.a == null ? 0 : o.a)), b = Math.max(0, rosterIndex(o.b == null ? 1 : o.b));
      const mate = i => { const m = rosterIndex(ROSTER[i].tag || ""); return m >= 0 ? m : (i + 1) % ROSTER.length; };
      if (o.mode) game.mode = o.mode;
      const off = game.vsOff; game.vsOff = false; enterVs(a, b, o.stage && STAGES[o.stage] ? o.stage : ROSTER[b].stage, o.tag ? [mate(a), mate(b)] : null); game.vsOff = off;
    } else if (name === "endcard") { Object.assign(game, { scene: "endcard", endT: o.t || 0, endText: o.text || END_TEXT }); if (o.music) playMusic(o.music, o.loop !== false); }
    else return null;
    rrLog("reelScene " + name);
    return game.scene;
  },
};
