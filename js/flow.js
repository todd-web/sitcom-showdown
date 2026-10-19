// Fighting game engine, part 3 of 6 (flow.js): arcade map (item 11), game state, mode list and SHOWCASE (item 13), the fixed-step update.
// Plain classic scripts loaded in order by index.html (core, fight, flow, draw, screens, main). They share one
// global scope, so a top-level name declared in one part is visible in the parts after it. Top-level code in a
// part may only call functions from the same or an earlier part (calls inside functions run after all parts load).
"use strict";
// ---------- item 11: arcade map. 8 city fights (one per CITIES pin) then a final against the player's tag partner ----------
// game.ladder holds every leg of the run: { city, from, opp (ROSTER index), stage, final, near }; game.ladderI is the
// leg being played. Between fights the "map" scene flies a plane from the last city to the next on a dotted arc
// (MAP_FLY frames), then the opponent card slides in from the right; start or LP fights (a press during the
// flight skips to the card). The map theme plays under it. Arcade stays 1 vs 1.
const MAP_IN = 20, MAP_FLY = 90, MAP_CARD = 26, MAP_READY = MAP_IN + MAP_FLY + MAP_CARD, MAP_INPUT_AFTER = 8, MAP_LOOP_R = 46;
const MAP_IMG = quietImg("assets/map.webp", false);   // optional art; missing or bad draws the canvas fallback map
const mapImgReady = () => !!(MAP_IMG.complete && MAP_IMG.naturalWidth && !MAP_IMG.bad);
// fallback: a simple continental US outline traced in the same 1280x720 frame as window.CITIES, plus Lake Michigan
const US_OUTLINE = [[186,44],[214,40],[370,70],[520,96],[640,100],[700,104],[760,128],[790,150],[830,150],[870,165],[905,200],
  [930,232],[960,225],[985,200],[1050,180],[1100,150],[1110,90],[1135,75],[1160,125],[1120,185],[1110,215],[1070,240],[1058,262],
  [1050,300],[1045,340],[1052,395],[1010,440],[975,490],[962,540],[990,610],[1005,665],[980,650],[960,600],[925,550],[860,548],
  [810,565],[805,595],[760,590],[720,580],[650,575],[610,620],[595,668],[560,640],[520,600],[470,540],[445,525],[385,525],[385,495],
  [300,478],[225,466],[212,440],[205,425],[175,395],[158,370],[145,300],[130,232],[140,200],[150,180],[160,120],[180,95]];
const US_LAKE = [[800,165],[820,160],[822,200],[818,240],[812,268],[800,262],[796,220],[792,190]];
const cityPt = k => CITIES[k] || { x: W / 2, y: H / 2, name: String(k || "") };
const cityDist = (a, b) => Math.hypot(cityPt(a).x - cityPt(b).x, cityPt(a).y - cityPt(b).y);
function shuffled(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// route: the 7 cities other than home in random order, then the home city, then the final at home (the plane
// leaves from home). Each city's opponent is a random fighter from that city's shows: never the player, never a
// repeat, and the partner is saved for the final. A home city that holds only the player's show (New York,
// Brooklyn, Virginia, Bel-Air, Watts) has no one left, so that leg takes a free fighter from the nearest other
// city (leg.near, shown on the card as "IN TOWN FROM ...").
function buildLadder(me) {
  const ch = ROSTER[me], keys = Object.keys(CITIES), home = CITIES[ch.cityPin] ? ch.cityPin : keys[0];
  const mate = ROSTER.findIndex(c => c.id === ch.tag), used = new Set([me, mate]), legs = [];
  const free = city => ROSTER.map((_, i) => i).filter(i => ROSTER[i].cityPin === city && !used.has(i));
  let from = home;
  for (const city of shuffled(keys.filter(k => k !== home)).concat([home])) {
    let pool = free(city), near = null;
    if (!pool.length) for (const k of keys.filter(k => k !== city).sort((a, b) => cityDist(city, a) - cityDist(city, b))) { pool = free(k); if (pool.length) { near = k; break; } }
    if (!pool.length) continue;
    const opp = pool[Math.floor(Math.random() * pool.length)]; used.add(opp);
    legs.push({ city, from, opp, stage: ROSTER[opp].stage, final: false, near });
    from = city;
  }
  if (mate >= 0 && mate !== me) legs.push({ city: home, from, opp: mate, stage: ch.stage, final: true, near: null });
  return legs;
}
const curLeg = () => (game.ladder && game.ladder[game.ladderI]) || null;
function startArcade(me) {
  game.ladder = buildLadder(me); game.ladderI = 0; game.level = 1;
  rrLog("ladder " + game.ladder.map(l => l.city + ":" + ROSTER[l.opp].id + (l.final ? ":final" : "")).join(" "));
  enterMap();
}
function enterMap() {
  const leg = curLeg(); if (!leg) { game.scene = "select"; game.ready = [false, p2Auto()]; playMusic("select"); return; }
  game.scene = "map"; game.mapT = 0; preloadVoices(ROSTER[leg.opp]); playMusic("map");
  rrLog(`map ${game.ladderI + 1}/${game.ladder.length} ${leg.from}->${leg.city} ${ROSTER[leg.opp].id}${leg.final ? " final" : ""}`);
}
// arcade CPU difficulty: the 9 legs climb over the same 1..6 range the old 6-fight ladder used
const arcadeCpuLevel = () => Math.min(6, 1 + Math.floor((Math.max(1, game.level) - 1) * 5 / 8));
const easeInOut = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
function arcCtrl(a, b) {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  let nx = -(b.y - a.y) / d, ny = (b.x - a.x) / d; if (ny > 0) { nx = -nx; ny = -ny; }   // the normal that points up
  const lift = Math.max(60, d * 0.28); return { x: mx + nx * lift, y: Math.max(84, my + ny * lift) };
}
// point and heading at k (0..1) on the leg's arc: a quadratic bowed upward between the two pins, or a loop over
// the pin when the final stays in the home city
function arcAt(a, b, k) {
  if (a.x === b.x && a.y === b.y) {
    const th = k * Math.PI * 2;
    return { x: a.x + MAP_LOOP_R * Math.sin(th), y: a.y - MAP_LOOP_R * (1 - Math.cos(th)), ang: -th };
  }
  const c = arcCtrl(a, b), u = 1 - k;
  return { x: u * u * a.x + 2 * u * k * c.x + k * k * b.x, y: u * u * a.y + 2 * u * k * c.y + k * k * b.y,
           ang: Math.atan2(2 * u * (c.y - a.y) + 2 * k * (b.y - c.y), 2 * u * (c.x - a.x) + 2 * k * (b.x - c.x)) };
}
// plane at map frame t: k0 is the linear flight progress, k the eased position along the arc
function planeAt(leg, t) {
  const k0 = Math.max(0, Math.min(1, (t - MAP_IN) / MAP_FLY)), k = easeInOut(k0);
  return Object.assign(arcAt(cityPt(leg.from), cityPt(leg.city), k), { k0, k });
}
// a face for the map card: the portrait, else the idle sprite (headRect crops it to the head)
function faceOf(id) {
  if (portraitReady(id)) return PORTRAIT_IMG[id];
  const im = IMG[id] && IMG[id][poseOf(id, "idle")]; return im && im.naturalWidth ? im : null;
}
function drawMapBase() {
  if (mapImgReady()) { ctx.drawImage(MAP_IMG, 0, 0, W, H); game.mapArt = "image"; return; }
  game.mapArt = "fallback";
  const g = ctx.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, W * 0.75);
  g.addColorStop(0, "#f4e6c4"); g.addColorStop(1, "#d9bf8c"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(120,80,40,.07)"; for (let i = 0; i < 90; i++) ctx.fillRect((i * 337) % W, (i * 191) % H, 2 + (i % 5) * 9, 2);   // paper flecks
  const path = pts => { ctx.beginPath(); pts.forEach(([x, y], i) => ctx[i ? "lineTo" : "moveTo"](x, y)); ctx.closePath(); };
  ctx.save(); ctx.translate(6, 8); path(US_OUTLINE); ctx.fillStyle = "rgba(90,50,20,.18)"; ctx.fill(); ctx.restore();
  path(US_OUTLINE); ctx.fillStyle = "#e7c47e"; ctx.fill();
  ctx.lineJoin = "round"; ctx.lineWidth = 5; ctx.strokeStyle = "#5a3418"; ctx.stroke();
  path(US_LAKE); ctx.fillStyle = "#9cc1c6"; ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
}
// the plane: 40 px nose to tail, drawn pointing +x, with a drop shadow
function planePath() {
  ctx.beginPath();
  ctx.moveTo(20, 0); ctx.quadraticCurveTo(18, -4, 12, -4); ctx.lineTo(3, -4); ctx.lineTo(-6, -18); ctx.lineTo(-11, -18); ctx.lineTo(-6, -4);
  ctx.lineTo(-15, -4); ctx.lineTo(-19, -10); ctx.lineTo(-20, -10); ctx.lineTo(-20, 10); ctx.lineTo(-19, 10); ctx.lineTo(-15, 4);
  ctx.lineTo(-6, 4); ctx.lineTo(-11, 18); ctx.lineTo(-6, 18); ctx.lineTo(3, 4); ctx.lineTo(12, 4); ctx.quadraticCurveTo(18, 4, 20, 0); ctx.closePath();
}
function drawPlane(x, y, ang) {
  ctx.save(); ctx.translate(x + 7, y + 11); ctx.rotate(ang); planePath(); ctx.fillStyle = "rgba(40,20,10,.28)"; ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.lineJoin = "round"; ctx.lineWidth = 2.5; ctx.strokeStyle = "#140c1c";
  planePath(); ctx.fillStyle = "#fbf6ea"; ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#c0262d"; ctx.fillRect(-14, -2, 26, 4);
  ctx.fillStyle = "#3fa8ff"; ctx.beginPath(); ctx.arc(15, 0, 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawDots(a, b, k0, k1, color, r, n) {
  ctx.fillStyle = color;
  for (let i = 0; i <= n; i++) { const k = i / n; if (k < k0 || k > k1) continue; const p = arcAt(a, b, k); ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); }
}
function drawMap() {
  const leg = curLeg(); if (!leg) return;
  const t = game.mapT, opp = ROSTER[leg.opp], pl = planeAt(leg, t), a = cityPt(leg.from), b = cityPt(leg.city);
  drawMapBase();
  ctx.fillStyle = "rgba(20,12,28,.12)"; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < game.ladderI; i++) { const l = game.ladder[i]; if (l.from !== l.city) drawDots(cityPt(l.from), cityPt(l.city), 0, 1, "rgba(90,52,24,.45)", 2.5, 18); }   // legs flown
  const n = leg.from === leg.city ? 26 : Math.max(14, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 16));
  drawDots(a, b, pl.k, 1, "rgba(255,255,255,.9)", 3, n);    // ahead of the plane
  drawDots(a, b, 0, pl.k, "#c0262d", 3.6, n);               // the dotted trail behind it
  // pins: cities already fought gold, the destination pulsing red, the rest dark
  const done = new Set(game.ladder.slice(0, game.ladderI).map(l => l.city));
  for (const [k, c] of Object.entries(CITIES)) {
    const dest = k === leg.city;
    if (dest) { ctx.beginPath(); ctx.arc(c.x, c.y, 18 * (1 + 0.25 * Math.sin(game.t / 6)), 0, Math.PI * 2); ctx.fillStyle = "rgba(192,38,45,.3)"; ctx.fill(); }
    ctx.beginPath(); ctx.arc(c.x, c.y, 9, 0, Math.PI * 2); ctx.fillStyle = dest ? "#e8343c" : done.has(k) ? "#ffd23f" : "#3a2a4a"; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = "#fff"; ctx.stroke();
    const left = c.label === "left", lx = c.x + (left ? -16 : 16), nm = c.name.toUpperCase();
    ctx.font = "11px 'Press Start 2P', monospace"; const tw = ctx.measureText(nm).width;
    ctx.fillStyle = dest ? "rgba(192,38,45,.92)" : "rgba(20,12,28,.78)"; ctx.fillRect(left ? lx - tw - 8 : lx - 4, c.y - 10, tw + 12, 20);
    text(nm, lx + (left ? -2 : 2), c.y + 1, 11, "#fff", left ? "right" : "left", "Press Start 2P");
  }
  drawPlane(pl.x, pl.y, pl.ang);
  game.mapPlane = { x: Math.round(pl.x * 10) / 10, y: Math.round(pl.y * 10) / 10, ang: Math.round(pl.ang * 100) / 100 };
  // header strip, centered (the top-left corner holds the full screen hint)
  ctx.fillStyle = "rgba(20,12,28,.86)"; ctx.fillRect(0, 0, W, 74); ctx.fillStyle = "#c0262d"; ctx.fillRect(0, 74, W, 4);
  text(leg.final ? "FINAL FIGHT" : `FIGHT ${game.ladderI + 1} OF ${game.ladder.length}`, W / 2, 26, 28, "#ffd23f");
  text(leg.final ? `BACK HOME TO ${b.name.toUpperCase()}` : `NEXT STOP: ${b.name.toUpperCase()}`, W / 2, 57, 14, "#fff", "center", "Press Start 2P");
  // opponent card: a lower third that slides in from the right once the plane lands
  const ck = ease((t - MAP_IN - MAP_FLY) / MAP_CARD), cx = W + 40 - (W + 40 - 60) * ck, cy = 552, cw = W - 120, chh = 140;
  game.mapCard = { id: opp.id, x: Math.round(cx), face: "none", shown: ck > 0 };
  if (ck > 0) {
    ctx.save(); ctx.translate(cx, cy);
    ctx.fillStyle = "#140c1c"; ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(cw + 30, -8); ctx.lineTo(cw + 10, chh + 8); ctx.lineTo(-30, chh + 8); ctx.closePath(); ctx.fill();
    const g = ctx.createLinearGradient(0, 0, 0, chh); g.addColorStop(0, "#e8343c"); g.addColorStop(1, "#7c1219");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(cw + 18, 0); ctx.lineTo(cw, chh); ctx.lineTo(-18, chh); ctx.closePath(); ctx.fill();
    const face = faceOf(opp.id), px = 24, py = -46, pw = 180, ph = 180;
    ctx.fillStyle = "#140c1c"; ctx.fillRect(px - 6, py - 6, pw + 12, ph + 12); ctx.fillStyle = "#24183a"; ctx.fillRect(px, py, pw, ph);
    if (face) { const [sx, sy, sw, sh] = headRect(face, pw / ph); ctx.drawImage(face, sx, sy, sw, sh, px, py, pw, ph); game.mapCard.face = face === PORTRAIT_IMG[opp.id] ? "portrait" : "sprite"; }
    ctx.lineWidth = 4; ctx.strokeStyle = "#ffd23f"; ctx.strokeRect(px, py, pw, ph);
    const tx = px + pw + 34;
    text(leg.final ? "YOUR OWN PARTNER" : leg.near ? `IN TOWN FROM ${cityPt(leg.near).name.toUpperCase()}` : "CHALLENGER", tx, 26, 12, "#ffd23f", "left", "Press Start 2P");
    let size = 46; ctx.font = `${size}px 'Bungee', Impact, sans-serif`;
    while (size > 26 && ctx.measureText(opp.name).width > cw - tx - 330) { size -= 2; ctx.font = `${size}px 'Bungee', Impact, sans-serif`; }
    text(opp.name, tx, 68, size, "#fff", "left");
    text(opp.show.toUpperCase(), tx, 110, 14, "#fff", "left", "Press Start 2P");
    const st = STAGES[leg.stage] || {};
    text("STAGE", cw - 30, 44, 11, "#ffd23f", "right", "Press Start 2P");
    text(String(st.name || leg.stage).toUpperCase(), cw - 30, 72, 13, "#fff", "right", "Press Start 2P");
    ctx.restore();
  }
  if (t >= MAP_READY && Math.floor(game.t / 28) % 2 === 0) text(isTouch ? "TAP TO FIGHT" : "PRESS START TO FIGHT", W / 2, 516, 20, "#fff", "center", "Press Start 2P");
}

// ---------- game state ----------
const game = {
  scene: "boot", bootT: 0, titleT: 0, matchNo: 0, mode: "arcade", t: 0, sel: [0, 3], ready: [false, false], fighters: null, stage: "winslow",
  round: 1, timer: ROUND_TIME, frame: 0, banner: null, shake: 0, sparks: [], superFreeze: 0, superBy: null, ladder: [], ladderI: 0, mapT: 0, mapPlane: null, mapCard: null, mapArt: null, level: 1, menu: 0,
  showcase: null, showcaseTag: false, titleStage: null, titleMarch: null,   // item 13: SHOWCASE (CPU vs CPU) state, title slideshow and lineup march stats
  hitStop: 0, silT: 0, bursts: [], comboShow: [null, null], callouts: [], firstHit: false, lowBanner: null, moveBanner: null, pend: [null, null],
  roundLines: null, ticker: { pool: [], i: 0, text: "", t: 0 }, walk: null, walkClock: 0, walkDir: 1,
  selIdle: [0, 0], selTaunt: [0, 0], prevScene: null, hud: {}, hudFace: [null, null],
  teams: null, runners: [], tagSuper: null, tagArm: [0, 0], koWait: [0, 0], tagCpu: true, tagPicks: [[], []],
  brk: null, breakUsed: false, brkPending: null,   // item 12: stage break visuals, the once-per-match flag, the next-stage hand-off
  vs: null, vsOff: false, bubbles: [],   // VS loading screen (vsOff: tests skip it), in-fight speech bubbles
  reelUi: [], hudOff: false,   // reel capture: this frame's banner / cut-in / callout / bubble boxes (draw.js), HUD hidden (__rr.hudShow)
  assists: [null, null], assistUsed: [0, 0], assistCd: [0, 0], assistBanner: null, assistHits: [],   // assist strikers (fight.js)
  hits: [0, 0], brkGetup: null, roundsToWin: 0, hpFloor: 0,   // unblocked hits landed per side this match (reel "say on hit"), break loser to get up, rounds override
  spark(x, y, color) { for (let i = 0; i < 10; i++) this.sparks.push({ x, y, vx: (Math.random() - .5) * 14, vy: (Math.random() - .5) * 14, life: 16, color }); },
};

// mates (TAG mode only): [P1 partner index, P2 partner index]; a and b are the point fighters
// round-start marks: x 360 and W - 360; reel capture: START_GAP_REEL px apart around the column center (a SHOWCASE
// { gap } overrides it), so both fighters start inside the column
const START_GAP_REEL = 440;
const startX = s => { const g = REEL ? ((game.showcase && game.showcase.gap) || START_GAP_REEL) : W - 720; return s === 0 ? W / 2 - g / 2 : W / 2 + g / 2; };
function startMatch(a, b, stage, mates) {
  const A = mates ? [a, mates[0]] : [a], B = mates ? [b, mates[1]] : [b];
  game.teams = mates ? [A.map(i => new Fighter(ROSTER[i], 0, startX(0))), B.map(i => new Fighter(ROSTER[i], 1, startX(1)))] : null;
  game.fighters = game.teams ? [game.teams[0][0], game.teams[1][0]] : [new Fighter(ROSTER[a], 0, startX(0)), new Fighter(ROSTER[b], 1, startX(1))];
  for (const f of allFighters()) if (f.slot === 1 || game.showcase) f.cpu = !!game.showcase || game.mode === "arcade" || (game.mode === "tag" && game.tagCpu);   // SHOWCASE: both sides CPU
  for (const i of A.concat(B)) preloadVoices(ROSTER[i]);
  game.stage = stage || ROSTER[b].stage; game.round = 1;
  Object.assign(game, { brk: null, breakUsed: false, brkPending: null, brkGetup: null, hits: [0, 0], assistHits: [] });
  game.roundsToWin = (game.showcase && game.showcase.rounds) || 0;   // SHOWCASE { rounds: 1 }: a one-round match (reel captures)
  if (game.teams) rrLog("tagMatch " + game.teams.map(t => t.map(f => f.id).join("+")).join(" vs "));
  // ticker pool: every fighter's show lines, interleaved; it advances on every knockdown
  const lists = A.concat(B).map(i => ROSTER[i].ticker || []), pool = [];
  for (let i = 0; i < Math.max(...lists.map(l => l.length)); i++) for (const l of lists) if (l[i]) pool.push(l[i]);
  game.ticker = { pool, i: 0, text: pool[0] || "", t: 0 };
  game.walk = null; game.walkClock = 0; game.bubbles = []; game.vs = null;
  startRound(); game.scene = "fight";
  const theme = fightTheme(game.stage); game.matchNo++; playMusic(theme); rrLog("music " + theme);
}
// ---------- VS loading screen: VS_LEN frames (2.5 s) between select (or the arcade map) and the fight, START or LP
// skips it after VS_SKIP frames. The match is built when it ends. game.vsOff (window.__rr.vsOff) skips it for tests;
// a showcase start plays it unless the call passes vs: false (window.__rr.skipVs() ends a running one). ----------
const VS_LEN = REEL ? 60 : 150, VS_SKIP = 10;   // reel capture: the VS screen holds at most 1.0 s
function enterVs(a, b, stage, mates) {
  if (game.vsOff) { startMatch(a, b, stage, mates); return; }
  game.vs = { a, b, stage: stage || ROSTER[b].stage, mates: mates || null, t: 0, from: game.scene };
  for (const i of [a, b].concat(mates || [])) preloadVoices(ROSTER[i]);
  game.scene = "vs"; sfx("super");
  rrLog(`vs ${ROSTER[a].id}${mates ? "+" + ROSTER[mates[0]].id : ""} vs ${ROSTER[b].id}${mates ? "+" + ROSTER[mates[1]].id : ""} ${game.vs.stage}`);
}
function endVs() {
  const v = game.vs; if (!v) return false;
  game.vs = null; rrLog("vsEnd " + v.t); startMatch(v.a, v.b, v.stage, v.mates); return true;
}
// ---------- in-fight speech bubbles: a voice clip (any slot) puts its manifest line over the speaker for the clip's
// length. wait: frames until the clip starts (its delay). Only fighters in the current match get one. ----------
// reel capture: the win line's bubble starts WIN_BUBBLE_SETTLE frames after its clip, once the WINS banner has settled
const WIN_BUBBLE_SETTLE = 10;
function voiceBubble(ch, key, wait, dur, slot) {
  const line = VOICE.lines[key]; if (!line) return;   // drawn only in the fight and result scenes; startMatch clears the list
  if (REEL && slot === "win") wait = (wait | 0) + WIN_BUBBLE_SETTLE;
  if (!allFighters().some(f => f.ch === ch)) return;
  // one bubble per fighter: a line that starts now replaces the fighter's current bubble; a delayed one (the win line)
  // replaces it when it starts (tickBubbles), so the line before it stays readable until then
  if (!(wait > 0)) game.bubbles = (game.bubbles || []).filter(b => b.id !== ch.id);
  game.bubbles.push({ id: ch.id, key, text: line, wait: Math.max(0, wait | 0), t: 0, life: Math.round(Math.max(0.9, Math.min(4, dur)) * 60) + 12, hold: false, held: 0 });
  rrLog("bubble " + key);
}
// reel capture: a bubble the layout pass could not place clear of the banners, cut-in and heads is held (its clock stops)
// until a spot frees up; one held longer than BUBBLE_HOLD_MAX frames is dropped and logged
const BUBBLE_HOLD_MAX = 180;
function tickBubbles() {
  for (const b of game.bubbles) {
    if (b.wait > 0) { if (--b.wait === 0) for (const o of game.bubbles) if (o !== b && o.id === b.id && o.wait <= 0) o.t = o.life; }   // starts: replaces the older one
    else if (b.hold) { if (++b.held > BUBBLE_HOLD_MAX) { b.t = b.life; rrLog("bubble-drop " + b.key); } } else b.t++;
  }
  game.bubbles = game.bubbles.filter(b => b.t < b.life);
}

// ---------- item 13: mode list and SHOWCASE (CPU vs CPU on both sides, used for the reel captures) ----------
const MODE_ITEMS = ["arcade", "versus", "tag", "showcase"];
const SHOWCASE_LEVEL = 5, SHOWCASE_NEXT = 200;   // CPU level for both sides; result frames before the next random matchup
const rosterIndex = v => typeof v === "number" ? (v >= 0 && v < ROSTER.length ? v : -1) : ROSTER.findIndex(c => c.id === v);
const hasArtId = id => { const im = IMG[id] && IMG[id][resolvePose(id, "idle")]; return !!(im && im.complete && im.naturalWidth); };
const hasArt = i => !!ROSTER[i] && hasArtId(ROSTER[i].id);
// a random matchup: fighters from two different shows (drawn fighters first, so a half-drawn roster still shows art)
function randomShowcase() {
  const all = ROSTER.map((_, i) => i), pool = all.filter(hasArt).length >= 2 ? all.filter(hasArt) : all;
  const a = pool[Math.floor(Math.random() * pool.length)];
  const rest = pool.filter(i => ROSTER[i].show !== ROSTER[a].show), from = rest.length ? rest : pool.filter(i => i !== a);
  return [a, from[Math.floor(Math.random() * from.length)]];
}
// o: { a, b (fighter ids or roster indexes; random when missing), stage (STAGES key, default b's home stage),
//      tag (2 vs 2, each with its roster partner unless a2 / b2 are given), level (CPU 1..6), loop (roll on after the result),
//      gap (reel capture: px between the two start marks, default START_GAP_REEL) }
function startShowcase(o = {}) {
  let a = o.a == null ? -1 : rosterIndex(o.a), b = o.b == null ? -1 : rosterIndex(o.b);
  if (a < 0 || b < 0) { const [ra, rb] = randomShowcase(); if (a < 0) a = ra === b ? rb : ra; if (b < 0) b = rb === a ? ra : rb; }
  const tag = !!o.tag;
  game.showcase = { tag, level: Math.max(1, Math.min(6, o.level || SHOWCASE_LEVEL)), loop: o.loop !== false, n: ((game.showcase && game.showcase.n) || 0) + 1,
    rounds: o.rounds > 0 ? Math.round(o.rounds) : 0, gap: o.gap > 0 ? +o.gap : 0 };   // gap: reel start gap override
  game.mode = tag ? "tag" : "versus"; game.sel = [a, b]; game.ready = [true, true];
  let mates = null;
  if (tag) {
    const mate = (i, v) => { let m = v == null ? rosterIndex(ROSTER[i].tag || "") : rosterIndex(v); if (m < 0 || m === i) m = ROSTER.findIndex((c, j) => j !== i && c.show === ROSTER[i].show); return m < 0 ? (i + 1) % ROSTER.length : m; };
    mates = [mate(a, o.a2), mate(b, o.b2)];
  }
  const stage = o.stage && STAGES[o.stage] ? o.stage : ROSTER[b].stage;
  audio();
  if (o.vs === false) startMatch(a, b, stage, mates); else enterVs(a, b, stage, mates);
  const out = { a: ROSTER[a].id, b: ROSTER[b].id, stage, tag, mates: mates ? mates.map(i => ROSTER[i].id) : null, level: game.showcase.level, loop: game.showcase.loop };
  rrLog(`showcase ${out.a}${tag ? "+" + out.mates[0] : ""} vs ${out.b}${tag ? "+" + out.mates[1] : ""} ${stage}`);
  return out;
}
function leaveShowcase() { game.showcase = null; game.vs = null; game.scene = "mode"; game.menu = 3; playMusic("select"); rrLog("showcaseExit"); }
function startRound() {
  if (game.teams) {   // TAG: first picks back on point, partners on the bench, the side's meter carries over
    for (let s = 0; s < 2; s++) {
      const m = game.fighters[s].meter, [a, b] = game.teams[s];
      b.reset(-999); b.state = "bench"; b.benchT = 0; a.meter = m;
    }
    game.fighters = [game.teams[0][0], game.teams[1][0]];
  }
  Object.assign(game, { runners: [], tagSuper: null, tagArm: [0, 0], koWait: [0, 0], brk: null, assists: [null, null], assistUsed: [0, 0], assistCd: [0, 0], assistBanner: null });
  const [p, q] = game.fighters; p.reset(startX(0)); q.reset(startX(1)); reelClamp(p); reelClamp(q);
  Object.assign(game, { hitStop: 0, silT: 0, bursts: [], comboShow: [null, null], callouts: [], firstHit: false, lowBanner: null, moveBanner: null, superFreeze: 0, pend: [null, null] });
  game.timer = ROUND_TIME; game.frame = 0; game.banner = { text: `ROUND ${game.round}`, sub: "FIGHT!", t: REEL ? REEL_BANNER : 110 }; sfx("round");
  rrLog("round " + game.round);
  // a roster introCycle (George's strut) plays first; ROUND N / FIGHT! holds until every intro ends
  const intro = game.round === 1 ? [startIntro(p), startIntro(q)] : [false, false];
  // two-line round-start banner: round 1 from P1's roundLines, round 2 from P2's, alternating after that;
  // in round 1 a fighter who struts in names himself (P2's lines when only P2 has an intro)
  const who = intro[1] && !intro[0] ? q : game.fighters[(game.round - 1) % 2], rl = who.ch.roundLines;
  game.roundLines = rl && rl.length ? { lines: rl.slice(0, 2), id: who.id } : null;
  if (game.roundLines) rrLog("roundLines " + who.id);
  // round 1 intros: P2 answers once P1's line ends (at least 0.6 s after it starts, at most 2.6 s in)
  // (P1's intro muted by the reel director: P2 speaks at 0.6 s, alone)
  if (game.round === 1) {
    const k = voiceKey(p.ch, "intro"), muted = VOICE.mute.has(p.id + "/intro") || VOICE.mute.has("*/intro");
    playVoice(p.ch, "intro", 0.35); playVoice(q.ch, "intro", muted ? 0.6 : Math.min(2.6, Math.max(0.95, 0.45 + (k ? voiceDur(k) : 0))));
  }
}
function nextTicker() {
  const tk = game.ticker; if (!tk.pool.length) return;
  tk.i = (tk.i + 1) % tk.pool.length; tk.text = tk.pool[tk.i]; tk.t = 0; rrLog("ticker " + tk.i);
}
// a background walker crosses behind the fighters every 20 s (first one 4 s into the match). OFF: WALKERS_ON (core.js)
const WALK_EVERY = 1200, WALK_FIRST = 240;
function updateWalker() {
  if (!WALKERS_ON) { game.walk = null; return; }
  game.walkClock++;
  const key = (STAGES[game.stage] || {}).walker;
  if (key && !game.walk && game.walkClock % WALK_EVERY === WALK_FIRST) {
    const d = game.walkDir; game.walkDir = -d;
    game.walk = { key, dir: d, x: d > 0 ? -140 : W + 140, t: 0 };
    rrLog("walker " + key + (WALKER_IMG[key] ? "" : " noart"));
  }
  const w = game.walk; if (!w) return;
  w.t++; w.x += w.dir * 1.9;
  if (w.x < -160 || w.x > W + 160) game.walk = null;
}
function endRound(winner) {
  const [p, q] = game.fighters;
  if (winner) {
    winner.wins++; winner.state = "win";
    if (game.teams) for (const f of game.teams[winner.slot]) f.wins = winner.wins;   // TAG: wins belong to the side
    if (winner.wins >= winsNeeded()) playMusic("victory", false);
    // reel: the win line plays once, at the match win (after a stage break: as its banner ends and the result shows)
    if (!REEL || winner.wins >= winsNeeded()) playVoice(winner.ch, "win", REEL && game.brk ? Math.max(0.4, (BRK_LEN + REEL_BANNER - game.brk.t) / 60) : 0.4);
  }
  // PERFECT: full health and no damage taken this round (reel capture: none taken all match, since the viewer saw it)
  const clean = f => f.hp >= 1000 && !(f.roundDmg > 0) && !(REEL && f.matchDmg > 0);
  const perfect = winner && (game.teams ? game.teams[winner.slot].every(clean) : clean(winner));
  const sub = winner ? (game.teams ? `${teamName(winner.slot)} WIN` : `${winner.ch.name} WINS`) : "DRAW";
  game.banner = { text: winner ? (perfect ? "PERFECT!" : "K.O.") : "TIME", sub, t: REEL ? REEL_BANNER : 170, after: true };
  if (winner && game.brk) {   // a break this round: its banner replaces K.O. (reel: it ends with the break banner, 1.2 s after the shatter)
    game.banner.brk = true; game.banner.t = REEL ? Math.max(10, BRK_LEN + REEL_BANNER - game.brk.t) : Math.max(80, BRK_ROUND_BANNER - game.brk.t);
  }
  sfx("ko"); rrLog("roundEnd " + (winner ? winner.id : "draw"));
}

// ---------- update ----------
function update() {
  game.t++;
  if (game.bubbles.length) tickBubbles();
  const entered = game.prevScene !== game.scene; game.prevScene = game.scene;
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
    const NM = MODE_ITEMS.length;
    if (i0.pressed.up) { game.menu = (game.menu + NM - 1) % NM; sfx("select"); }
    if (i0.pressed.down) { game.menu = (game.menu + 1) % NM; sfx("select"); }
    if (game.menu === 2 && (i0.pressed.left || i0.pressed.right)) { game.tagCpu = !game.tagCpu; sfx("select"); rrLog("tagCpu " + game.tagCpu); }
    if (game.menu === 3 && (i0.pressed.left || i0.pressed.right)) { game.showcaseTag = !game.showcaseTag; sfx("select"); rrLog("showcaseTag " + game.showcaseTag); }
    if (i0.pressed.lp || i0.pressed.start) {
      if (MODE_ITEMS[game.menu] === "showcase") { sfx("super"); startShowcase({ tag: game.showcaseTag, loop: true }); return; }
      game.showcase = null;
      game.mode = MODE_ITEMS[game.menu]; game.scene = "select"; game.ready = [false, p2Auto()]; game.tagPicks = [[], []]; sfx("select");
    }
    if (i0.pressed.back) game.scene = "title";
    return;
  }
  if (game.scene === "vs") {
    const v = game.vs; if (!v) { game.scene = "select"; return; }
    v.t++;
    if (v.t === 16) sfx("heavy");   // the VS badge lands
    if (i0.pressed.back) {
      if (game.showcase) { leaveShowcase(); return; }
      game.vs = null; game.scene = v.from === "map" ? "map" : "select"; if (game.scene === "select") game.ready = [false, p2Auto()]; return;
    }
    if (v.t >= VS_LEN || (v.t > VS_SKIP && (i0.pressed.start || i0.pressed.lp || i1.pressed.start || i1.pressed.lp))) endVs();
    return;
  }
  if (game.scene === "map") {
    game.mapT++;
    const go = game.mapT > MAP_INPUT_AFTER && (i0.pressed.start || i0.pressed.lp || i1.pressed.start);
    if (go && game.mapT < MAP_READY) game.mapT = MAP_READY;   // a press during the flight skips to the card
    else if (go) { const leg = curLeg(); rrLog(`arcadeFight ${game.ladderI + 1} ${ROSTER[leg.opp].id} ${leg.stage}`); enterVs(game.sel[0], leg.opp, leg.stage); }
    else if (i0.pressed.back) { game.scene = "select"; game.ready = [false, p2Auto()]; playMusic("select"); }
    return;
  }
  if (game.scene === "select") {
    const SEL_TAUNT_AFTER = 240;
    if (entered) { game.selIdle = [0, 0]; game.selTaunt = [0, 0]; game.tagPicks = [[], []]; preloadVoices(ROSTER[game.sel[0]]); if (!p2Auto()) preloadVoices(ROSTER[game.sel[1]]); }
    [i0, i1].forEach((inp, s) => {
      if (game.ready[s] || (s === 1 && p2Auto())) return;
      let c = game.sel[s];
      // item 13 grid: left / right walk the show-grouped grid in reading order, up / down jump rows (nearest cell)
      if (inp.pressed.left) c = selStep(c, -1);
      if (inp.pressed.right) c = selStep(c, 1);
      if (inp.pressed.up) c = selRow(c, -1);
      if (inp.pressed.down) c = selRow(c, 1);
      if (c !== game.sel[s]) { sfx("select"); game.selIdle[s] = 0; game.selTaunt[s] = 0; preloadVoices(ROSTER[c]); }
      game.sel[s] = c;
      // select taunt: the hovered fighter's big preview plays its taunt after SEL_TAUNT_AFTER still frames
      if (game.selTaunt[s] > 0) game.selTaunt[s]--;
      else if (++game.selIdle[s] >= SEL_TAUNT_AFTER) {
        game.selIdle[s] = 0; game.selTaunt[s] = TAUNT_LEN; const ch = ROSTER[c]; rrLog("taunt " + ch.id); playVoice(ch, "intro");
      }
      if ((inp.pressed.lp || inp.pressed.start) && !hasArt(c)) { sfx("block"); rrLog("selNoArt " + ROSTER[c].id); }
      else if (inp.pressed.lp || inp.pressed.start) {
        if (game.mode === "tag") {   // TAG: two picks each, no duplicate on one side
          const pk = game.tagPicks[s];
          if (pk.includes(c)) sfx("block");
          else { pk.push(c); sfx("super"); rrLog(`tagPick ${s} ${ROSTER[c].id}`); if (pk.length >= 2) game.ready[s] = true; }
        } else { game.ready[s] = true; sfx("super"); }
      }
    });
    if (game.mode === "tag" && !p2Auto() && i1.pressed.back && game.tagPicks[1].length) { game.tagPicks[1].pop(); game.ready[1] = false; }
    if (i0.pressed.back) {
      if (game.mode === "tag" && game.tagPicks[0].length) { game.tagPicks[0].pop(); game.ready[0] = false; }
      else { game.scene = "mode"; return; }
    }
    if (game.ready[0] && game.ready[1]) {
      if (game.mode === "tag") {
        const a = game.tagPicks[0], b = game.tagCpu ? cpuTagPicks(a) : game.tagPicks[1];
        enterVs(a[0], b[0], ROSTER[b[0]].stage, [a[1], b[1]]);
      } else if (game.mode === "arcade") {
        startArcade(game.sel[0]);   // item 11: 8 city fights plus the final, the map before each
      } else enterVs(game.sel[0], game.sel[1], ROSTER[game.sel[1]].stage);
    }
    return;
  }
  if (game.scene === "fight") {
    if (game.showcase && i0.pressed.back) { leaveShowcase(); return; }   // SHOWCASE: BACK leaves at any moment (banners, freezes)
    const [p, q] = game.fighters;
    reelClamp(p); reelClamp(q);   // reel capture: a director place() or cut() between frames lands inside the column too
    // reel capture: the round clock keeps running through freezes, hit stop, assists and the K.O. banner (not the round-start banner)
    if (REEL && !(game.banner && !game.banner.after)) clockTick();
    if (game.brk) breakTick();   // the break plays through hit stop
    for (const s of game.sparks) { s.x += s.vx; s.y += s.vy; s.vx *= .88; s.vy *= .88; s.life--; }
    game.sparks = game.sparks.filter(s => s.life > 0);
    if (game.shake > 0) game.shake--;
    for (const b of game.bursts) b.t++;
    game.bursts = game.bursts.filter(b => b.t < b.life);
    if (game.silT > 0) game.silT--;
    for (const c of game.callouts) c.t--;
    game.callouts = game.callouts.filter(c => c.t > 0);
    for (let s = 0; s < 2; s++) if (game.comboShow[s] && --game.comboShow[s].t <= 0) game.comboShow[s] = null;
    if (game.lowBanner && --game.lowBanner.t <= 0) game.lowBanner = null;
    // super freeze and hit stop: both fighters skip update; attack presses made meanwhile are kept for after
    if (game.superFreeze > 0 || game.hitStop > 0) {
      [i0, i1].forEach((inp, s) => { for (const k of ["su", "sp", "hk", "hp", "lk", "lp"]) if (inp.pressed[k]) game.pend[s] = { k, down: !!inp.held.down }; });
      if (game.superFreeze > 0) game.superFreeze--; else game.hitStop--;
      return;
    }
    if (game.moveBanner && --game.moveBanner.t <= 0) game.moveBanner = null;   // counts after the su2 cut-in
    if (game.ticker) game.ticker.t++;
    updateWalker(); hudTick(); assistTick();
    [i0, i1].forEach((inp, s) => { if (inp.pressed.tag) rrLog("tagPress " + s); });
    [i0, i1].forEach((inp, s) => { const pd = game.pend[s]; if (pd) { inp.pressed[pd.k] = true; if (pd.down) inp.held.down = true; game.pend[s] = null; } });
    if (game.teams) { updateRunners(); benchTick(); if (game.tagSuper) { tagSuperTick(); return; } }
    if (game.banner) {
      if (game.banner.after || !introRunning()) game.banner.t--;   // a round-start banner waits out the intros
      if (game.banner.t <= 0) {
        const after = game.banner.after; game.banner = null;
        if (after) {
          if (p.wins >= winsNeeded() || q.wins >= winsNeeded()) {
            const won = p.wins >= winsNeeded();
            if (game.mode === "arcade" && won && game.ladderI + 1 < game.ladder.length) {
              rrLog("arcadeWin " + (game.ladderI + 1) + " " + q.id); game.ladderI++; game.level++; enterMap();
            } else { game.scene = "result"; game.result = won ? p : q; game.resultT = 0; }
          } else { game.round++; nextRoundAfterBreak(); }
        }
      }
      // keep KO / win poses animating during banners but no control (an assist on its way out keeps moving: assistTick above)
      if (game.teams) { const [a, b] = game.fighters; a.update(b); b.update(a); } else { p.update(q); q.update(p); }
      return;
    }
    const sc = game.showcase, lvl = sc ? sc.level : game.mode === "arcade" ? arcadeCpuLevel() : game.level;
    const in1 = q.cpu ? cpuIn(q, p, lvl) : i1;
    const in0 = sc && p.cpu ? cpuIn(p, q, lvl) : i0;   // SHOWCASE: P1's side is a CPU too (the real pad only leaves with BACK)
    if (game.teams) { tagInput(0, in0); if (!game.tagSuper) tagInput(1, in1); if (game.tagSuper) return; }
    assistInput(0, in0); assistInput(1, in1);
    fightStep(in0, in1);
    if (game.teams) {
      if (!tagKoCheck() && game.timer <= 0) { const hp = s => game.teams[s].reduce((n, f) => n + Math.max(0, f.hp), 0); endRound(hp(0) === hp(1) ? null : hp(0) > hp(1) ? game.fighters[0] : game.fighters[1]); }
    } else if (p.state === "ko" || q.state === "ko") endRound(p.state === "ko" ? (q.state === "ko" ? null : q) : p);
    else if (game.timer <= 0) endRound(p.hp === q.hp ? null : p.hp > q.hp ? p : q);
    if (i0.pressed.back) { if (game.showcase) leaveShowcase(); else { game.scene = "select"; game.ready = [false, p2Auto()]; playMusic("select"); } }
    return;
  }
  if (game.scene === "endcard") { game.endT++; return; }   // reel end card (__rr.scene("endcard")): no input, no exit
  if (game.scene === "result") {
    game.resultT++;
    const sc = game.showcase;
    if (sc) {   // SHOWCASE: the next random matchup rolls on its own (loop), START skips ahead, BACK leaves
      if (i0.pressed.back) leaveShowcase();
      else if ((sc.loop && game.resultT > SHOWCASE_NEXT) || (game.resultT > 60 && (i0.pressed.lp || i0.pressed.start))) startShowcase({ tag: sc.tag, level: sc.level, loop: sc.loop });
      return;
    }
    if (game.resultT > 60 && (i0.pressed.lp || i0.pressed.start)) { game.scene = "select"; game.ready = [false, p2Auto()]; playMusic("select"); }
  }
}
// one normal fight frame: control, physics, spacing, clock (game.fighters is re-read: a tag swap changes the point)
function fightStep(i0, in1) {
  const [p, q] = game.fighters;
  p.control(i0, q); q.control(in1, p);
  p.update(q); q.update(p);
  // keep bodies apart on the ground (a fighter running in or out of a tag passes through)
  const dx = q.x - p.x;
  if (Math.abs(dx) < BODY * 2 && Math.abs(p.y - q.y) < 120 && !TAG_OFF.includes(p.state) && !TAG_OFF.includes(q.state) && !p.flyOut && !q.flyOut) {
      const push = (BODY * 2 - Math.abs(dx)) / 2 * Math.sign(dx || 1);
      p.x -= push; q.x += push;
      p.x = Math.max(LEFT_WALL, Math.min(RIGHT_WALL, p.x)); q.x = Math.max(LEFT_WALL, Math.min(RIGHT_WALL, q.x));
      reelClamp(p); reelClamp(q);
    }
  if (!REEL) clockTick();
}
function clockTick() { if (++game.frame % 60 === 0 && game.timer > 0) game.timer--; }

