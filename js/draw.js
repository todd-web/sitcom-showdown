// Fighting game engine, part 4 of 6 (draw.js): fight drawing: stage, bursts, fight text, Level 2 cut-in, round lines, ticker, walker, HUD (item 14).
// Plain classic scripts loaded in order by index.html (core, fight, flow, draw, screens, main). They share one
// global scope, so a top-level name declared in one part is visible in the parts after it. Top-level code in a
// part may only call functions from the same or an earlier part (calls inside functions run after all parts load).
"use strict";
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
function drawBurst(b) {
  const k = b.t / b.life, r = (b.big ? 260 : 170) * (0.35 + 0.65 * k), a = 1 - k;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
  g.addColorStop(0, `rgba(255,255,255,${0.9 * a})`); g.addColorStop(0.35, `rgba(255,214,90,${0.6 * a})`); g.addColorStop(1, "rgba(255,80,20,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill();
  ctx.translate(b.x, b.y); ctx.rotate(b.x * 0.01); ctx.fillStyle = `rgba(255,240,200,${0.55 * a})`;
  for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(r * 0.2, -4); ctx.lineTo(r * 1.15, 0); ctx.lineTo(r * 0.2, 4); ctx.fill(); }
  ctx.restore();
}
// combo counter at the attacker's screen edge, callouts centered, the low-health line, the move name caption
function drawFightText() {
  for (let s = 0; s < 2; s++) {
    const c = game.comboShow[s]; if (!c) continue;
    // reel capture: inside the center window (REEL_X0..REEL_X1) and no small damage line
    const x = REEL ? (s === 0 ? REEL_X0 + 20 : REEL_X1 - 20) : s === 0 ? 24 : W - 24, al = s === 0 ? "left" : "right", top = REEL ? REEL_BANNER : 90;
    const pop = c.t > top - 6 ? 1 + (c.t - (top - 6)) * 0.04 : 1;
    ctx.save(); ctx.globalAlpha = Math.min(1, c.t / 20);
    text(`${c.hits} HITS`, x, COMBO_Y, Math.round(46 * pop), "#ffd23f", al);
    if (!REEL) text(`${c.dmg} DAMAGE`, x, COMBO_Y + 38, 14, "#fff", al, "Press Start 2P");
    ctx.restore();
    textBox("combo" + s, `${c.hits} HITS`, x, COMBO_Y, Math.round(46 * pop), al);
    if (REEL) reelUi("combo", ...game.hud["combo" + s]);
    if (!REEL) textBox("comboDmg" + s, `${c.dmg} DAMAGE`, x, COMBO_Y + 38, 14, al, "Press Start 2P");
  }
  drawAssistBanner();
  game.callouts.slice(-2).forEach((c, i, arr) => {
    const y = 190 + (arr.length - 1 - i) * 56;
    let sc = c.t > 62 ? 1 + (c.t - 62) * 0.08 : 1, size = 40;
    if (REEL) {   // reel capture: the callout and its pop stay inside the column
      size = fitLines(c.text, REEL_W - 24, 40, REEL_MIN).size; ctx.font = `${size}px 'Bungee', Impact, sans-serif`;
      sc = Math.min(sc, (REEL_W - 24) / Math.max(1, ctx.measureText(c.text).width + size / 7));
    }
    ctx.save(); ctx.globalAlpha = Math.min(1, c.t / 15); ctx.translate(W / 2, y); ctx.scale(sc, sc);
    text(c.text, 0, 0, size, c.text === "FIRST ATTACK" ? "#ffd23f" : c.text === "COUNTER" ? "#ff5a3a" : "#5ff0ff"); ctx.restore();
    textBox("callout" + i, c.text, W / 2, y, size * sc, "center");
    if (REEL) reelUi("callout", ...game.hud["callout" + i]);
  });
  const lb = REEL ? null : game.lowBanner;   // reel capture: hidden (too small for a phone; the speech bubble carries the line)
  if (lb) {   // fitted into the fighter's half, under the names and clear of the corner buttons, on a dark plate
    const cx = lb.slot === 0 ? 370 : W - 380, MAXW = 440, PAD = 6; let size = 20;
    const font = sz => { ctx.font = `${sz}px 'Press Start 2P', monospace`; };
    font(size); while (size > 14 && ctx.measureText(lb.text).width > MAXW) { size--; font(size); }
    let lines = [lb.text];
    if (ctx.measureText(lb.text).width > MAXW) {   // at the 14 px floor: wrap to two lines on the space nearest the middle
      const words = lb.text.split(" "); let best = null;
      for (let i = 1; i < words.length; i++) {
        const a = words.slice(0, i).join(" "), b = words.slice(i).join(" "), m = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
        if (!best || m < best.m) best = { a, b, m };
      }
      if (best) lines = [best.a, best.b];
      while (size > 9 && Math.max(...lines.map(l => ctx.measureText(l).width)) > MAXW) { size--; font(size); }   // one unbreakable word only
    }
    const lh = Math.round(size * 1.5), tw = Math.max(...lines.map(l => ctx.measureText(l).width)) + 4;
    const y0 = 134 - (lines.length - 1) * lh / 2;
    let px = cx - tw / 2 - PAD; const pw = tw + PAD * 2, py = y0 - size * 0.62 - PAD, ph = (lines.length - 1) * lh + size * 1.24 + PAD * 2;
    px = Math.max(112, Math.min(W - 112 - pw, px));   // clear of the fullscreen button (canvas x up to about 106) and the right corner
    const tx = px + pw / 2;
    ctx.save(); ctx.globalAlpha = Math.min(1, lb.t / 20);
    ctx.fillStyle = "rgba(20,12,28,.85)"; ctx.fillRect(px, py, pw, ph);
    font(size); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = 2; ctx.strokeStyle = "#000"; ctx.fillStyle = "#ff7a2f";
    lines.forEach((l, i) => { ctx.strokeText(l, tx, y0 + i * lh); ctx.fillText(l, tx, y0 + i * lh); });
    ctx.restore();
    hudBox("lowBanner", px, py, pw, ph);
  }
  const mb = REEL ? null : game.moveBanner;   // reel capture: the move plate is hidden (the reel caption carries the move name)
  if (mb && mb.text) {   // yellow caption, bottom left, 60 frames, slides in from the left edge
    const age = 60 - mb.t, slide = (1 - ease(age / 8)) * -420;
    ctx.save(); ctx.globalAlpha = Math.min(1, mb.t / 10); ctx.translate(slide, 0);
    ctx.font = "28px 'Bungee', Impact, sans-serif"; const label = mb.text.toUpperCase(), w = ctx.measureText(label).width + 56, x = 0, y = MOVE_BANNER_Y;
    ctx.fillStyle = "#140c1c"; ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + w + 26, y - 4); ctx.lineTo(x + w + 6, y + 54); ctx.lineTo(x, y + 54); ctx.fill();
    ctx.fillStyle = "#ffd23f"; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w + 18, y); ctx.lineTo(x + w + 2, y + 48); ctx.lineTo(x, y + 48); ctx.fill();
    ctx.fillStyle = "#140c1c"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(label, x + 30, y + 25);
    const who = mb.who && !isTouch;   // on touch screens the banner sits between the combo counter and the stick, no room for the name
    if (who) { ctx.font = "10px 'Press Start 2P', monospace"; ctx.fillStyle = "#fff"; ctx.fillText(mb.who, x + 30, y - 14); }
    ctx.restore();
    hudBox("moveBanner", Math.max(0, slide), who ? y - 22 : y - 6, w + 26, who ? 78 : 62);
  }
}
// ---------- reel capture (?reel=1) layout: everything that is not a fighter sits in the center window REEL_X0..REEL_X1
// (770 px, which the 9:16 compositor scales about 1.4x to the 1080 px width) and no text is drawn with a cap height
// under REEL_CAP px (36 px on the phone after that scale). fitLines fits a string to one line, else two, never below
// the floor size; a string that still overflows is logged in game.reelTextWarn. ----------
const REEL_X0 = 255, REEL_X1 = 1025, REEL_W = REEL_X1 - REEL_X0, REEL_CAP = 26, REEL_MIN = 36;
// this frame's reel overlay boxes (game.reelUi, reset at the top of every draw): kind "banner" (round, K.O., WINS,
// stage break, assist), "cutin" (the Level 2 slab band across the column), "callout", "combo", "bubble". The speech
// bubble layout pass reads them; the camera log (demo/<reel>-camera.json "ui") and the capture's column check write them out.
function reelUi(k, x, y, w, h) { if (REEL) game.reelUi.push({ k, box: [Math.round(x), Math.round(y), Math.round(w), Math.round(h)] }); }
function fitLines(str, maxW, size, min, font = "Bungee") {
  const f = z => `${z}px '${font}', Impact, sans-serif`, wide = (ls, z) => { ctx.font = f(z); return Math.max(...ls.map(l => ctx.measureText(l).width)); };
  for (let z = size; z >= min; z -= 2) if (wide([str], z) <= maxW) return { lines: [str], size: z };
  const two = typeof twoLines === "function" ? twoLines(str) : [str];
  for (let z = size; z >= min; z -= 2) if (wide(two, z) <= maxW) return { lines: two, size: z };
  if (REEL) { game.reelTextWarn = game.reelTextWarn || []; if (!game.reelTextWarn.includes(str)) game.reelTextWarn.push(str); }
  return { lines: two, size: min };
}
// the assist call banner "ASSIST: <NAME>": reel capture centered under the HUD; in play on the caller's side under the names, above the callouts
function drawAssistBanner() {
  const ab = game.assistBanner; if (!ab || !REEL_BANNERS) return;   // ?banners=0: the 9:16 caption carries ASSIST
  const age = ASSIST_BANNER - ab.t, k = REEL ? 1 : ease(Math.min(1, age / 6)), size = REEL ? 44 : 26;   // reel: fades in, no slide
  ctx.font = `${size}px 'Bungee', Impact, sans-serif`;
  const tw = ctx.measureText(ab.text).width, w = tw + 48, h = Math.round(size * 1.35);
  const cx = REEL ? W / 2 : ab.slot === 0 ? 370 : W - 380, cy = REEL ? 252 : 134, dir = ab.slot === 0 ? -1 : 1;   // play: above the callouts
  ctx.save(); ctx.globalAlpha = Math.min(1, ab.t / 8, REEL ? (age + 1) / 6 : 1); ctx.translate((1 - k) * dir * 300, 0);
  ctx.fillStyle = "#140c1c"; ctx.fillRect(cx - w / 2 - 5, cy - h / 2 - 5, w + 10, h + 10);
  ctx.fillStyle = "#2fa8ff"; ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
  ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(ab.text, cx, cy + 2);
  ctx.restore();
  hudBox("assistBanner", cx - w / 2 - 5, cy - h / 2 - 5, w + 10, h + 10); reelUi("banner", cx - w / 2 - 5, cy - h / 2 - 5, w + 10, h + 10);
  game.assistBannerDrawn = (game.assistBannerDrawn || 0) + 1;
}
// reel camera (demo/<reel>-camera.json): the x midpoint of the two point fighters and each one's drawn box
// [x, y, w, h] in canvas pixels (pose art, scale, facing and bob), plus any assist on screen
function fighterBox(f) {
  if (!f || f.gone || f.state === "bench") return null;
  const lp = f.pose(), md = meta(f.id, lp), k = f.sc, b = bodyFlex(f, lp);
  const left = f.face > 0 ? f.x - md.ax * k : f.x - (md.w - md.ax) * k;
  return [Math.round(left), Math.round(FLOOR + f.y + b.bob - md.h * k), Math.round(md.w * k), Math.round(md.h * k)];
}
// reel capture result scene (Video QA R3): a slow world push from 1.00 to RESULT_PUSH over RESULT_PUSH_LEN frames,
// centered on the winner's feet, held back so both fighters' boxes stay inside the column. { s, cx, cy }; s 1 elsewhere.
const RESULT_PUSH = 1.02, RESULT_PUSH_LEN = 150;
function reelPush() {
  const none = { s: 1, cx: W / 2, cy: FLOOR };
  if (!REEL || game.scene !== "result" || !game.result || !game.fighters) return none;
  const cx = game.result.x, cy = FLOOR; let s = 1 + (RESULT_PUSH - 1) * ease(Math.min(1, (game.resultT || 0) / RESULT_PUSH_LEN));
  for (const f of game.fighters) {
    const b = fighterBox(f); if (!b) continue;
    for (const x of [b[0], b[0] + b[2]]) {
      if (x < cx && cx > REEL_X0) s = Math.min(s, (cx - REEL_X0) / Math.max(1, cx - x));
      if (x > cx && cx < REEL_X1) s = Math.min(s, (REEL_X1 - cx) / Math.max(1, x - cx));
    }
  }
  return { s: Math.max(1, s), cx, cy };
}
// a canvas box as drawn under the result push
function pushBox(b) {
  const p = reelPush(); if (!b || p.s === 1) return b;
  return [Math.round(p.cx + (b[0] - p.cx) * p.s), Math.round(p.cy + (b[1] - p.cy) * p.s), Math.round(b[2] * p.s), Math.round(b[3] * p.s)];
}
function reelCamera() {
  const scene = game.scene, fs = (scene === "fight" || scene === "result") && game.fighters ? game.fighters : [];
  const live = fs.filter(f => f && !f.gone);
  const mid = live.length ? live.reduce((n, f) => n + f.x, 0) / live.length : W / 2;
  // fly: a point fighter is flung out or landing (stage break); run: one is running a tag in or out. Either may leave the column.
  const fly = fs.some(f => f && (f.flyOut || f.gone)), run = fs.some(f => f && ["tagin", "tagout"].includes(f.state));
  return { scene, stage: fs.length ? game.stage : null, mid: Math.round(mid * 10) / 10, a: pushBox(fighterBox(fs[0])), b: pushBox(fighterBox(fs[1])),
           push: Math.round(reelPush().s * 1000) / 1000,
           ids: fs.map(f => f && f.id), fly, run, hud: fs.length ? !game.hudOff : false,
           ui: (game.reelUi || []).map(u => [u.k].concat(u.box)),
           assists: (game.assists || []).filter(a => a && a.box && fs.length).map(a => ({ slot: a.s, key: a.def.key, box: a.box })) };
}
// the 770 px window the compositor follows, clamped to the canvas
function reelWindow() { const m = reelCamera().mid; const x0 = Math.max(0, Math.min(W - REEL_W, m - REEL_W / 2)); return [x0, x0 + REEL_W]; }
// ---------- item 6: Level 2 cut-in, round lines, ticker; item 7: background walker ----------
const portraitReady = id => { const im = PORTRAIT_IMG[id]; return !!(im && im.complete && im.naturalWidth && !im.bad); };
// source rect for a head shot in a box of aspect a (w/h). A tall image (a full-body portrait or the idle
// sprite) is cropped to the head; a near-square portrait is used whole (center-cropped to the box).
function headRect(im, a) {
  const w = im.naturalWidth, h = im.naturalHeight;
  if (h / w <= 1.3) { const sw = Math.min(w, h * a), sh = sw / a; return [(w - sw) / 2, Math.max(0, (h - sh) * 0.3), sw, sh]; }
  const sh = h * 0.34, sw = Math.min(w, sh * a), sx = Math.max(0, Math.min(w - sw, w * 0.5 - sw / 2 + w * 0.04));
  return [sx, 0, sw, Math.min(h, sw / a)];
}
function cutInFace(f) { return faceOf(f.id); }
// red diagonal slab from the left: portrait plus the super2 name in yellow Bungee with a black outline.
// k = frames into the 60-frame freeze: 8 in, 45 hold, 7 out.
const CUT_IN = 8, CUT_HOLD = 45;
// opt (tag super): total, inF, hold frames, and mate (second face, name TAG TEAM SUPER, both names)
function drawCutIn(f, k, opt = {}) {
  const total = opt.total || MOVES.su2.freeze, cin = opt.inF || CUT_IN, hold = opt.hold || CUT_HOLD;
  const ox = k < cin ? -W * 1.3 * (1 - ease(k / cin)) : k < cin + hold ? 0 : W * 1.3 * ease((k - cin - hold + 1) / (total - cin - hold));
  const name = opt.mate ? tagSuperName(f, opt.mate) : String(f.ch.super2 || f.ch.super || "SUPER").toUpperCase();
  if (REEL) reelUi("cutin", REEL_X0, 200, REEL_W, 340);   // the slab band across the column (y about 200..540 after the tilt)
  ctx.save(); ctx.translate(W / 2 + ox, H / 2 + 10); ctx.rotate(-0.1);
  const sw = W * 1.6, sh = 236;
  ctx.fillStyle = "#140c1c"; ctx.fillRect(-sw / 2, -sh / 2 - 12, sw, sh + 24);
  const g = ctx.createLinearGradient(0, -sh / 2, 0, sh / 2); g.addColorStop(0, "#e8343c"); g.addColorStop(0.55, "#c0262d"); g.addColorStop(1, "#7c1219");
  ctx.fillStyle = g; ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
  ctx.save(); ctx.beginPath(); ctx.rect(-sw / 2, -sh / 2, sw, sh); ctx.clip();
  ctx.fillStyle = "rgba(255,210,63,.16)";   // speed streaks
  for (let i = 0; i < 14; i++) { const y = -sh / 2 + ((i * 53) % sh), x = ((i * 211 + k * 38) % (sw + 400)) - sw / 2 - 200; ctx.fillRect(x, y, 260 + (i % 3) * 120, 5); }
  const face = cutInFace(f), bx = REEL ? REEL_X0 - W / 2 + 12 : -W / 2 + 70, bw = REEL ? 230 : 300, bh = sh;
  const mface = opt.mate && cutInFace(opt.mate);
  if (face && mface) {   // tag super: the two faces share the portrait box
    for (const [im, ox2] of [[mface, 0], [face, bw / 2]]) { const [sx, sy, ssw, ssh] = headRect(im, (bw / 2) / bh); ctx.drawImage(im, sx, sy, ssw, ssh, bx + ox2, -bh / 2, bw / 2, bh); }
    ctx.fillStyle = "#140c1c"; ctx.fillRect(bx + bw / 2 - 3, -bh / 2, 6, bh);
  } else if (face) {
    const [sx, sy, ssw, ssh] = headRect(face, bw / bh);
    ctx.drawImage(face, sx, sy, ssw, ssh, bx, -bh / 2, bw, bh);
  }
  if (face) {
    const fade = ctx.createLinearGradient(bx + bw - 60, 0, bx + bw + 10, 0); fade.addColorStop(0, "rgba(192,38,45,0)"); fade.addColorStop(1, "rgba(192,38,45,1)");
    ctx.fillStyle = fade; ctx.fillRect(bx + bw - 60, -bh / 2, 70, bh);
    ctx.fillStyle = "#140c1c"; ctx.fillRect(bx + bw + 8, -bh / 2, 6, bh);
  }
  ctx.restore();
  if (REEL) {   // reel capture: the name only (one or two lines, never under REEL_MIN px), inside the center window
    const tx = bx + bw + 26, fit = fitLines(name, REEL_X1 - W / 2 - 12 - tx, 64, REEL_MIN), lh = Math.round(fit.size * 1.08);
    ctx.font = `${fit.size}px 'Bungee', Impact, sans-serif`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    fit.lines.forEach((l, i) => { const y = 6 + (i - (fit.lines.length - 1) / 2) * lh;
      ctx.lineWidth = Math.max(8, fit.size / 5); ctx.strokeStyle = "#000"; ctx.strokeText(l, tx, y); ctx.fillStyle = "#ffd23f"; ctx.fillText(l, tx, y); });
    game.cutInText = { lines: fit.lines, size: fit.size };
    ctx.restore(); return;
  }
  // name: yellow Bungee, heavy black outline, sized to fit the slab right of the portrait
  const tx = bx + bw + 44, maxW = W / 2 - 30 - tx;
  let size = 64; ctx.font = `${size}px 'Bungee', Impact, sans-serif`;
  while (size > 28 && ctx.measureText(name).width > maxW) { size -= 4; ctx.font = `${size}px 'Bungee', Impact, sans-serif`; }
  text(opt.mate ? "LEVEL 2 TAG SUPER" : "LEVEL 2 SUPER", tx + 4, -64, 16, "#fff", "left", "Press Start 2P");
  ctx.font = `${size}px 'Bungee', Impact, sans-serif`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(8, size / 5); ctx.strokeStyle = "#000"; ctx.strokeText(name, tx, 8);
  ctx.fillStyle = "#ffd23f"; ctx.fillText(name, tx, 8);
  text(opt.mate ? `${opt.mate.ch.name} + ${f.ch.name}` : f.ch.name, tx + 4, 74, 18, "#fff", "left", "Press Start 2P");
  ctx.restore();
}
// round start: two show lines on a black strip just under the HUD bars (y 108 to 212), clear of both fighters
// (CD-00 strut verdict: at y 432 it covered the strutting fighter from chest to knees)
const RL_Y = 108;
function drawRoundLines(lines, t) {
  if (REEL) return;   // reel capture: the round-lines band is hidden
  const a = Math.max(0, Math.min(1, t / 14));
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = "rgba(20,12,28,.82)"; ctx.fillRect(0, RL_Y, W, 104); ctx.fillStyle = "#c0262d"; ctx.fillRect(0, RL_Y, W, 4); ctx.fillRect(0, RL_Y + 100, W, 4);
  lines.forEach((ln, i) => {
    let size = 22; ctx.font = `${size}px 'Press Start 2P', monospace`;
    while (size > 12 && ctx.measureText(ln).width > W - 80) { size -= 2; ctx.font = `${size}px 'Press Start 2P', monospace`; }
    text(ln, W / 2, RL_Y + 30 + i * 44, size, i ? "#fff" : "#ffd23f", "center", "Press Start 2P");
  });
  ctx.restore();
}
// bottom ticker: one show line, slides up into place on every knockdown, scrolls if it is too long
function drawTicker() {
  const tk = game.ticker; if (!tk || !tk.text || REEL) return;   // reel capture: no ticker
  hudBox("ticker", 0, H - 22, W, 22);
  ctx.save(); ctx.fillStyle = "rgba(10,6,20,.82)"; ctx.fillRect(0, H - 22, W, 22);
  ctx.beginPath(); ctx.rect(0, H - 22, W, 22); ctx.clip();
  ctx.font = "14px 'Press Start 2P', monospace"; ctx.textBaseline = "middle"; ctx.fillStyle = "#ffd23f";
  const tw = ctx.measureText(tk.text).width, y = H - 11 + Math.max(0, 20 - tk.t * 2);
  if (tw <= W - 40) { ctx.textAlign = "center"; ctx.fillText(tk.text, W / 2, y); }
  else { ctx.textAlign = "left"; const span = tw + 120, x = 20 - ((tk.t * 1.2) % span); ctx.fillText(tk.text, x, y); ctx.fillText(tk.text, x + span, y); }
  ctx.restore();
}
// Background walker: drawn at WALKER_K of the roster's average idle height on screen (about 374 px), feet on a line
// WALKER_LIFT px above the fighters' floor, behind them, desaturated and dimmed (WALKER_TONE) so the fighters pop.
// The walker sources are 600 px tall, so every walker is a downscale (no blur).
const WALKER_K = 0.9, WALKER_LIFT = 8, WALKER_TONE = { sat: 0.68, bright: 0.84 };
let AVG_IDLE_H = 0;
function avgIdleH() {
  if (AVG_IDLE_H) return AVG_IDLE_H;
  const hs = ROSTER.filter(c => MANIFEST[c.id]).map(c => meta(c.id, "idle").h * S * (c.size || 1));
  AVG_IDLE_H = hs.length ? hs.reduce((n, h) => n + h, 0) / hs.length : 374; return AVG_IDLE_H;
}
// a toned copy of a walker frame (cached on the image); a canvas that cannot be read (file://) uses ctx.filter instead
function walkerTone(im) {
  if (im._tone !== undefined) return im._tone;
  try {
    const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const x = c.getContext("2d"); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height), p = d.data, { sat, bright } = WALKER_TONE;
    for (let i = 0; i < p.length; i += 4) {
      const l = 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2];
      p[i] = (l + (p[i] - l) * sat) * bright; p[i + 1] = (l + (p[i + 1] - l) * sat) * bright; p[i + 2] = (l + (p[i + 2] - l) * sat) * bright;
    }
    x.putImageData(d, 0, 0); im._tone = c;
  } catch (e) { im._tone = null; }
  return im._tone;
}
function drawWalker() {
  const w = game.walk; if (!w || !WALKERS_ON) return;
  const frames = (WALKER_IMG[w.key] || []).filter(im => im.complete && im.naturalWidth && !im.bad);
  if (!frames.length) return;
  const im = frames[Math.floor(w.t / 14) % frames.length], hgt = Math.round(avgIdleH() * WALKER_K), sc = hgt / im.naturalHeight;
  const toned = walkerTone(im);
  ctx.save(); ctx.translate(w.x, FLOOR - WALKER_LIFT - (Math.floor(w.t / 14) % 2) * 2); if (w.dir < 0) ctx.scale(-1, 1);
  ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.beginPath(); ctx.ellipse(0, 2, im.naturalWidth * sc * 0.32, 8, 0, 0, Math.PI * 2); ctx.fill();
  if (!toned) ctx.filter = `saturate(${WALKER_TONE.sat}) brightness(${WALKER_TONE.bright})`;
  ctx.drawImage(toned || im, -im.naturalWidth * sc / 2, -hgt, im.naturalWidth * sc, hgt); ctx.restore();
  game.walkerDrawn = (game.walkerDrawn || 0) + 1;
  game.walkerBox = { h: hgt, w: Math.round(im.naturalWidth * sc), feet: FLOOR - WALKER_LIFT, avg: Math.round(avgIdleH()), src: im.naturalHeight };
}
// in-fight speech bubbles (game.bubbles, filled by voiceBubble in flow.js): a white comic balloon over the speaker's
// head with the clip's line, wrapped to 3 lines, pops in, fades out, kept under the HUD and inside the screen
function wrapLines(s, maxW, maxLines) {
  const words = String(s).split(/\s+/), lines = []; let cur = "";
  for (const wd of words) { const t = cur ? cur + " " + wd : wd; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = t; }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "") + "..."; }
  return lines;
}
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
// true while any banner or cut-in is on screen (round / K.O., stage break, assist, super freeze)
function bannerUp() {
  return !!((game.banner && (game.banner.after || !introRunning())) || game.superFreeze > 0 || (game.tagSuper && game.tagSuper.t <= TS_FREEZE)
    || (game.brk && game.brk.t > BRK_LEN && game.brk.t < brkBannerEnd()) || game.assistBanner);
}
// ---------- reel speech bubble layout pass (?reel=1). Every frame, after the banners, cut-in, callouts and combo text
// are drawn (their boxes are in game.reelUi), each bubble takes the first spot that is inside the column, below the HUD,
// at least RB.gap px from every banner / cut-in / callout / combo box, RB.hudPad px from every HUD element (portraits,
// bars, stars, timer, names: one or two lines), clear of every fighter's head and of the other bubbles. Spots tried, in order: over the speaker's head, beside the head toward the column center, beside it on the
// far side, then RB.gap px under each overlay box. Font RB.sizes[0] (1.35x the old 36 px) first, two lines, wrapped at
// RB.widths (widest first); smaller sizes (never under the cap floor) only when no spot fits, three slim lines last. The last spot used is tried first (no jitter).
// Nothing fits: the bubble is held (its clock stops, flow.js tickBubbles) until a spot frees up. ----------
const RB = { sizes: [49, 44, 40], widths: [560, 400, 300], maxW: 560, top: 24, bottom: FLOOR - 64, gap: 24, headPad: 6, pad: 8, hudPad: 8 };
// the head region of a fighter: the top 24 percent of its standing height, 34 percent of it wide, over the foot anchor
// (standing, walking, attacking: measured from the idle height, so raised arms or a prop in the pose art do not lift it;
// down or K.O.: the top of the lying pose)
function headBox(f) {
  const b = fighterBox(f); if (!b) return null;
  const hi = meta(f.id, "idle").h * f.sc, hw = Math.round(hi * 0.34), hh = Math.round(hi * 0.24);
  const top = ["down", "ko"].includes(f.state) ? b[1] : Math.round(FLOOR + f.y + bodyFlex(f, f.pose()).bob - hi);
  return pushBox([Math.round(f.x - hw / 2), top, hw, hh]);
}
const boxHit = (a, b, m = 0) => a[0] < b[0] + b[2] + m && b[0] < a[0] + a[2] + m && a[1] < b[1] + b[3] + m && b[1] < a[1] + a[3] + m;
function bubbleFit(text, fs, lines, maxW = RB.maxW) {
  ctx.font = `bold ${fs}px 'Trebuchet MS', Arial, sans-serif`;
  const all = wrapLines(text, maxW, 9);
  if (all.length > lines) return null;
  const lh = Math.round(fs * 1.16), tw = Math.max(...all.map(l => ctx.measureText(l).width));
  return { fs, lines: all, lh, bw: Math.round(tw + 34), bh: all.length * lh + 22 };
}
function bubbleSpots(f, head, sz, obst) {
  const cx = head[0] + head[2] / 2, toC = f.x < W / 2 ? 1 : -1, out = [];
  const over = head[1] - 26 - sz.bh;                                                                               // over the head:
  out.push([cx - sz.bw / 2 + toC * 60, over], [cx - sz.bw / 2, over], [head[0] + head[2] + 20 - sz.bw, over], [head[0] - 20, over]);   // centered, or flush to a side
  for (const sd of [toC, -toC]) out.push([sd > 0 ? head[0] + head[2] + 16 : head[0] - 16 - sz.bw, head[1] - Math.round(sz.bh * 0.4)]);   // beside it
  for (const o of obst) {                                                                                          // under an overlay
    const y = o.box[1] + o.box[3] + RB.gap;
    out.push([cx - sz.bw / 2 + toC * 60, y], [toC > 0 ? head[0] + head[2] + 16 : head[0] - 16 - sz.bw, y]);
  }
  return out.map(([x, y]) => [Math.round(Math.max(REEL_X0 + RB.pad, Math.min(REEL_X1 - RB.pad - sz.bw, x))), Math.round(Math.max(RB.top, Math.min(RB.bottom - sz.bh, y)))]);
}
function layoutBubble(b, f, heads, obst, placed, hud) {
  const head = heads.find(h => h.f === f).box, fits = [];
  // each size wrapped at the full width, then narrower (a taller, slimmer bubble fits beside a head)
  for (const fs of RB.sizes) for (const mw of RB.widths) { const z = bubbleFit(b.text, fs, 2, mw); if (z && !fits.some(q => q.fs === z.fs && q.lines.join("|") === z.lines.join("|"))) fits.push(z); }
  // last resort: three lines at the smaller sizes, slim (a long line beside a tall speaker's head)
  for (const fs of RB.sizes.slice(1)) for (const mw of RB.widths.slice(1)) { const z = bubbleFit(b.text, fs, 3, mw); if (z && z.lines.length === 3) fits.push(z); }
  // strict: clear of every head on screen; relaxed (second pass): clear of the speaker's head only (the other fighter
  // may be lying across the floor under the only free spot, e.g. the win line over a K.O.'d loser)
  const ok = (box, strict) => box[3] <= RB.bottom - RB.top && box[0] >= REEL_X0 + 1 && box[0] + box[2] <= REEL_X1 - 1
    && !obst.some(o => boxHit(box, o.box, RB.gap - 1)) && !hud.some(h => boxHit(box, h, RB.hudPad)) && !heads.some(h => (strict || h.f === f) && boxHit(box, h.box, RB.headPad)) && !placed.some(p => boxHit(box, p, RB.pad));
  const tries = [];
  for (let zi = 0; zi < fits.length; zi++) bubbleSpots(f, head, fits[zi], obst).forEach((sp, si) => tries.push({ zi, si, sp }));
  if (b.spot) { const same = t => t.zi === b.spot.zi && t.si === b.spot.si; tries.sort((p, q) => same(q) - same(p)); }
  for (const strict of [true, false]) for (const t of tries) {
    const z = fits[t.zi], box = [t.sp[0], t.sp[1], z.bw, z.bh];
    if (ok(box, strict)) { b.spot = { zi: t.zi, si: t.si }; return { z, box, head }; }
  }
  return null;
}
function drawBubbleAt(b, z, box, head) {
  const [bx, by, bw, bh] = box, lh = z.lh;
  // the tail points at the nearest edge of the speaker's head
  const tip = { x: Math.max(head[0], Math.min(head[0] + head[2], bx + bw / 2)), y: Math.max(head[1], Math.min(head[1] + head[3], by + bh / 2)) };
  const k = Math.min(1, b.t / 5), a = Math.min(1, (b.life - b.t) / 8), sc = 0.6 + 0.4 * ease(k);
  ctx.save(); ctx.globalAlpha = a; ctx.translate(tip.x, tip.y); ctx.scale(sc, sc); ctx.translate(-tip.x, -tip.y);
  ctx.lineJoin = "round"; ctx.lineWidth = 4; ctx.strokeStyle = "#111"; ctx.fillStyle = "#fff";
  roundRect(bx, by, bw, bh, 16); ctx.fill(); ctx.stroke();
  const tail = (p1, p2, cover) => { ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(tip.x, tip.y); ctx.lineTo(p2.x, p2.y); ctx.fill(); ctx.stroke(); ctx.fillRect(cover[0], cover[1], cover[2], cover[3]); };
  if (tip.y > by + bh + 4) { const tx = Math.max(bx + 24, Math.min(bx + bw - 24, tip.x)); tail({ x: tx - 11, y: by + bh - 2 }, { x: tx + 11, y: by + bh - 2 }, [tx - 9, by + bh - 6, 18, 6]); }
  else if (tip.y < by - 4) { const tx = Math.max(bx + 24, Math.min(bx + bw - 24, tip.x)); tail({ x: tx - 11, y: by + 2 }, { x: tx + 11, y: by + 2 }, [tx - 9, by, 18, 6]); }
  else if (tip.x > bx + bw + 4) { const ty = Math.max(by + 18, Math.min(by + bh - 18, tip.y)); tail({ x: bx + bw - 2, y: ty - 10 }, { x: bx + bw - 2, y: ty + 10 }, [bx + bw - 6, ty - 8, 6, 16]); }
  else if (tip.x < bx - 4) { const ty = Math.max(by + 18, Math.min(by + bh - 18, tip.y)); tail({ x: bx + 2, y: ty - 10 }, { x: bx + 2, y: ty + 10 }, [bx, ty - 8, 6, 16]); }
  ctx.font = `bold ${z.fs}px 'Trebuchet MS', Arial, sans-serif`;
  ctx.fillStyle = "#111"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  z.lines.forEach((l, i) => ctx.fillText(l, bx + bw / 2, by + 11 + lh / 2 + i * lh));
  ctx.restore();
}
function drawBubblesReel() {
  const out = [], placed = [], obst = (game.reelUi || []).filter(u => u.k !== "bubble");
  const hud = game.hudOff ? [] : Object.entries(game.hud || {}).filter(([k]) => /^(portrait|health|stars|timer|name|partner)/.test(k)).map(([, v]) => v);
  const shown = q => !q.gone && q.state !== "bench" && (game.fighters.includes(q) || q.state === "tagsuper" || game.runners.includes(q));
  const heads = allFighters().filter(shown).map(q => ({ f: q, box: headBox(q) })).filter(h => h.box);
  let held = 0;
  for (const b of game.bubbles || []) {
    if (b.wait > 0) continue;
    const f = allFighters().find(q => q.id === b.id && !q.gone && q.state !== "bench"); if (!f || !heads.some(h => h.f === f)) continue;
    const L = layoutBubble(b, f, heads, obst, placed, hud);
    // no spot: a bubble not yet shown (or barely) is held; one that has shown for half its life ends here
    if (!L) { if (b.t > b.life * 0.5) { b.t = b.life; rrLog("bubble-end " + b.key); } else { b.hold = true; held++; } continue; }
    b.hold = false;
    drawBubbleAt(b, L.z, L.box, L.head);
    placed.push(L.box); reelUi("bubble", L.box[0], L.box[1], L.box[2], L.box[3]);
    out.push({ id: b.id, key: b.key, text: b.text, box: L.box.slice(), size: L.z.fs, lines: L.z.lines.length, head: L.head.slice() });
  }
  game.bubbleDraw = out;
  if (held) game.bubbleHidden = (game.bubbleHidden || 0) + 1;
}
function drawBubbles() {
  if (REEL) { drawBubblesReel(); return; }
  const out = [];
  const FS = 20, LH = 25, MAXW = 330, wx0 = 0, wx1 = W;
  for (const b of game.bubbles || []) {
    if (b.wait > 0) continue;
    const f = allFighters().find(q => q.id === b.id && !q.gone && q.state !== "bench"); if (!f) continue;
    const md = meta(f.id, f.pose()), head = FLOOR + f.y - md.h * f.sc * 0.97;
    ctx.font = `bold ${FS}px 'Trebuchet MS', Arial, sans-serif`;
    const lines = wrapLines(b.text, MAXW, 3), tw = Math.max(...lines.map(l => ctx.measureText(l).width)), lh = LH;
    const bw = Math.round(tw + 34), bh = lines.length * lh + 22, tip = { x: f.x - f.face * 18, y: Math.max(126, head - 6) };
    let bx = tip.x - bw / 2 + f.face * -40, by = tip.y - 22 - bh;
    bx = Math.max(wx0 + 16, Math.min(wx1 - 16 - bw, bx)); by = Math.max(112, by);
    const k = Math.min(1, b.t / 5), a = Math.min(1, (b.life - b.t) / 8), sc = 0.6 + 0.4 * ease(k);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(tip.x, tip.y); ctx.scale(sc, sc); ctx.translate(-tip.x, -tip.y);
    const tx = Math.max(bx + 24, Math.min(bx + bw - 24, tip.x));
    ctx.lineJoin = "round"; ctx.lineWidth = 4; ctx.strokeStyle = "#111"; ctx.fillStyle = "#fff";
    roundRect(bx, by, bw, bh, 16); ctx.fill(); ctx.stroke();
    if (tip.y > by + bh + 4) {
      ctx.beginPath(); ctx.moveTo(tx - 11, by + bh - 2); ctx.lineTo(tip.x, tip.y); ctx.lineTo(tx + 11, by + bh - 2); ctx.fill(); ctx.stroke();
      ctx.fillRect(tx - 9, by + bh - 6, 18, 6);   // hide the box outline under the tail root
    }
    ctx.fillStyle = "#111"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    lines.forEach((l, i) => ctx.fillText(l, bx + bw / 2, by + 11 + lh / 2 + i * lh));
    ctx.restore();
    out.push({ id: b.id, key: b.key, text: b.text, box: [Math.round(bx), Math.round(by), bw, bh] });
  }
  game.bubbleDraw = out;
}
// ---------- item 14: HUD (portraits, health with a delayed red trail, round stars, hexagon timer,
// two-segment super meter). Layout in canvas units, kept clear of the touch buttons: the top row ends at
// y 104 (the corner buttons start at y 115), the meters run along the bottom edge at y 667..693, above the 22 px ticker strip (stick and
// buttons end at y 662; START sits in the center), the combo counter sits at the edges between y 236 and 314.
// Every element's box goes into game.hud each frame so the headless test can check it against the buttons.
const HUD = { port: 92, portY: 10, barX: 116, barW: 440, barY: 22, barH: 30, skew: 16, meterY: 670, meterH: 20, seg: 136 };
const COMBO_Y = 268, MOVE_BANNER_Y = isTouch ? 322 : H - 140, TRAIL_WAIT = 30, TRAIL_DRAIN = 7;
function hudBox(name, x, y, w, h) { game.hud[name] = [Math.round(x), Math.round(y), Math.round(w), Math.round(h)]; }
function textBox(name, s, x, y, size, align, font = "Bungee") {
  ctx.font = `${size}px '${font}', Impact, sans-serif`;
  const w = ctx.measureText(s).width + Math.max(3, size / 7), x0 = align === "left" ? x : align === "right" ? x - w : x - w / 2;
  hudBox(name, x0 - 2, y - size * 0.62, w + 4, size * 1.24);
}
// the red trail waits while the fighter is in hit stun, then TRAIL_WAIT frames, then drains to the health
function hudTick() {
  for (const f of allFighters()) {
    if (f.hp < f.hpSeen) f.trailWait = TRAIL_WAIT;
    f.hpSeen = f.hp;
    if (f.hpTrail < f.hp) f.hpTrail = f.hp;
    else if (f.hpTrail > f.hp && f.state !== "hit" && --f.trailWait <= 0) f.hpTrail = Math.max(f.hp, f.hpTrail - TRAIL_DRAIN);
  }
}
// a slanted bar: the end toward the timer (P1 right, P2 left) is cut on a diagonal
function slabPath(x, y, w, h, k, s) {
  ctx.beginPath();
  if (s === 0) { ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - k, y + h); ctx.lineTo(x, y + h); }
  else { ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x + k, y + h); }
  ctx.closePath();
}
function hexPath(cx, cy, r) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx[i ? "lineTo" : "moveTo"](cx + r * Math.cos(a), cy + r * Math.sin(a) * 0.9); } ctx.closePath(); }
function starPath(cx, cy, r) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx[i ? "lineTo" : "moveTo"](cx + rr * Math.cos(a), cy + rr * Math.sin(a)); } ctx.closePath(); }
function drawHUDPortrait(f, s) {
  const P = HUD.port, x = s === 0 ? 14 : W - 14 - P, y = HUD.portY;
  ctx.fillStyle = "#140c1c"; ctx.fillRect(x - 4, y - 4, P + 8, P + 8);
  const g = ctx.createLinearGradient(0, y, 0, y + P);
  if (s === 0) { g.addColorStop(0, "#2a5cc0"); g.addColorStop(1, "#0b1530"); } else { g.addColorStop(0, "#c02a2a"); g.addColorStop(1, "#300b0b"); }
  ctx.fillStyle = g; ctx.fillRect(x, y, P, P);
  const face = cutInFace(f); game.hudFace[s] = face ? (face === PORTRAIT_IMG[f.id] ? "portrait" : "sprite") : "none";
  if (face) {
    const [sx, sy, sw, sh] = headRect(face, 1);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, P, P); ctx.clip();
    if (s === 1) { ctx.translate(x * 2 + P, 0); ctx.scale(-1, 1); }   // P2 faces the center
    ctx.drawImage(face, sx, sy, sw, sh, x, y, P, P); ctx.restore();
  }
  if (f.hp <= LOW_HP && f.hp > 0 && game.t % 30 < 15) { ctx.fillStyle = "rgba(255,60,40,.28)"; ctx.fillRect(x, y, P, P); }
  if (f.hp <= 0) { ctx.fillStyle = "rgba(20,12,28,.55)"; ctx.fillRect(x, y, P, P); }
  ctx.lineWidth = 3; ctx.strokeStyle = "#ffd23f"; ctx.strokeRect(x + 1.5, y + 1.5, P - 3, P - 3);
  hudBox("portrait" + s, x - 4, y - 4, P + 8, P + 8);
}
function drawHUDHealth(f, s) {
  const { barW: bw, barY: by, barH: bh, skew: k } = HUD, x = s === 0 ? HUD.barX : W - HUD.barX - bw;
  const fillW = v => bw * Math.max(0, Math.min(1000, v)) / 1000, at = w => s === 0 ? x + bw - w : x;   // anchored at the timer end
  ctx.save();
  slabPath(x - 4, by - 4, bw + 8, bh + 8, k, s); ctx.fillStyle = "#140c1c"; ctx.fill();
  slabPath(x, by, bw, bh, k - 2, s); ctx.clip();
  ctx.fillStyle = "#3a0d14"; ctx.fillRect(x, by, bw, bh);
  if (f.red > 0) drawRedHealth(at(fillW(f.hp + f.red)), by, fillW(f.hp + f.red) - fillW(f.hp), bh, s);   // TAG: recoverable part
  const tw = fillW(f.hpTrail); ctx.fillStyle = "#e8343c"; ctx.fillRect(at(tw), by, tw, bh);
  const hw = fillW(f.hp), low = f.hp <= LOW_HP, g = ctx.createLinearGradient(0, by, 0, by + bh);
  if (low) { g.addColorStop(0, "#ffd0a0"); g.addColorStop(0.5, "#ff7a2f"); g.addColorStop(1, "#c0400f"); }
  else { g.addColorStop(0, "#fff6a8"); g.addColorStop(0.45, "#ffd23f"); g.addColorStop(1, "#d08a10"); }
  ctx.fillStyle = g; ctx.fillRect(at(hw), by, hw, bh);
  ctx.fillStyle = "rgba(255,255,255,.28)"; ctx.fillRect(x, by + 3, bw, 5);
  ctx.restore();
  slabPath(x, by, bw, bh, k - 2, s); ctx.lineWidth = 2; ctx.strokeStyle = "#ffd23f"; ctx.stroke();
  hudBox("health" + s, x - 4, by - 4, bw + 8, bh + 8);
  // name under the bar at the outer end, fitted to 360 px
  const nx = s === 0 ? x + 4 : x + bw - 4, al = s === 0 ? "left" : "right", nmax = game.teams ? 200 : 360; let size = 22;
  ctx.font = `${size}px 'Bungee', Impact, sans-serif`; while (size > 12 && ctx.measureText(f.ch.name).width > nmax) { size -= 2; ctx.font = `${size}px 'Bungee', Impact, sans-serif`; }
  text(f.ch.name, nx, 72, size, "#fff", al); textBox("name" + s, f.ch.name, nx, 72, size, al);
  // round stars under the bar at the timer end
  const sx0 = s === 0 ? x + bw - 30 : x + 30, dir = s === 0 ? -1 : 1;
  for (let r = 0; r < winsNeeded(); r++) {
    const cx = sx0 + dir * r * 30;
    starPath(cx, 72, 12); ctx.lineWidth = 5; ctx.strokeStyle = "#140c1c"; ctx.stroke();
    ctx.fillStyle = r < f.wins ? "#ffd23f" : "rgba(255,255,255,.18)"; ctx.fill();
    if (r < f.wins) { ctx.lineWidth = 1.5; ctx.strokeStyle = "#fff6a8"; ctx.stroke(); }
  }
  const sx1 = sx0 + dir * (winsNeeded() - 1) * 30;
  hudBox("stars" + s, Math.min(sx0, sx1) - 15, 57, Math.abs(sx1 - sx0) + 30, 30);
}
function drawHUDTimer() {
  const cx = W / 2, cy = 52, r = 50, t = game.timer, warn = t <= 10 && game.t % 30 < 15;
  hexPath(cx, cy, r + 5); ctx.fillStyle = "#140c1c"; ctx.fill();
  hexPath(cx, cy, r); ctx.fillStyle = "#ffd23f"; ctx.fill();
  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r); g.addColorStop(0, "#8a1820"); g.addColorStop(1, "#2a0710");
  hexPath(cx, cy, r - 5); ctx.fillStyle = g; ctx.fill();
  text(String(Math.max(0, t)).padStart(2, "0"), cx, cy + 3, 44, warn ? "#ff5a3a" : "#fff");
  hudBox("timer", cx - r - 5, cy - (r + 5) * 0.9, (r + 5) * 2, (r + 5) * 1.8);
}
// super meter in the bottom corner: badge with the level, two slanted segments of 100 (Level 1 fills first,
// then Level 2), a full segment pulses, and the ready label sits inboard of the bar
function drawHUDMeter(f, s) {
  const { meterY: my, meterH: mh, seg } = HUD, gap = 6, k = 8, lv = f.meter >= 200 ? 2 : f.meter >= 100 ? 1 : 0;
  const pulse = 0.5 + 0.5 * Math.sin(game.t / 4), bx = s === 0 ? 32 : W - 32, by = my + mh / 2;
  const x0 = s === 0 ? 56 : W - 56 - seg * 2 - gap, totalW = seg * 2 + gap;
  ctx.fillStyle = "#140c1c"; ctx.fillRect(x0 - 4, my - 3, totalW + 8, mh + 6);
  for (let i = 0; i < 2; i++) {
    const sx = s === 0 ? x0 + i * (seg + gap) : x0 + totalW - (i + 1) * seg - i * gap;
    const fill = Math.max(0, Math.min(100, f.meter - i * 100)) / 100 * seg, full = fill >= seg;
    ctx.save(); slabPath(sx, my, seg, mh, k, s); ctx.clip();
    ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fillRect(sx, my, seg, mh);
    ctx.fillStyle = i ? "#e0a020" : "#2fa8ff"; ctx.fillRect(s === 0 ? sx : sx + seg - fill, my, fill, mh);
    if (full) { ctx.globalAlpha = 0.25 + 0.6 * pulse; ctx.fillStyle = i ? "#fff3b0" : "#c8fbff"; ctx.fillRect(sx, my, seg, mh); ctx.globalAlpha = 1; }
    ctx.fillStyle = "rgba(255,255,255,.3)"; ctx.fillRect(sx, my + 2, seg, 4);
    ctx.restore();
  }
  // level badge
  ctx.beginPath(); ctx.arc(bx, by, 17, 0, Math.PI * 2); ctx.fillStyle = "#140c1c"; ctx.fill();
  ctx.beginPath(); ctx.arc(bx, by, 14, 0, Math.PI * 2); ctx.fillStyle = lv === 2 ? "#ffd23f" : lv === 1 ? "#5ff0ff" : "#3a3550"; ctx.fill();
  if (lv && pulse > 0.5) { ctx.lineWidth = 3; ctx.strokeStyle = "#fff"; ctx.stroke(); }
  ctx.font = "14px 'Press Start 2P', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = lv ? "#140c1c" : "#ccc"; ctx.fillText(String(lv), bx + 1, by + 1);
  const label = lv === 2 ? "LV2 READY" : lv === 1 ? "LV1 READY" : "SUPER", lx = s === 0 ? x0 + totalW + 12 : x0 - 12, al = s === 0 ? "left" : "right";
  ctx.save(); if (lv) ctx.globalAlpha = 0.6 + 0.4 * pulse;
  text(label, lx, by, 12, lv === 2 ? "#ffd23f" : lv === 1 ? "#5ff0ff" : "#bbb", al, "Press Start 2P"); ctx.restore();
  const left = s === 0 ? bx - 17 : x0 - 4, right = s === 0 ? x0 + totalW + 4 : bx + 17;
  hudBox("meter" + s, left, my - 3, right - left, mh + 6);
  textBox("meterLabel" + s, label, lx, by, 12, al, "Press Start 2P");
}
function drawHUD() {
  game.hud = {};
  if (game.hudOff) return;   // reel capture: hidden for the hook shot (__rr.hudShow(false)), so a punch-in clips nothing
  if (REEL) { drawHUDReel(); return; }
  const [p, q] = game.fighters;
  [p, q].forEach((f, s) => { drawHUDHealth(f, s); drawHUDPortrait(f, s); drawHUDMeter(f, s); if (game.teams) drawHUDPartner(s); });
  drawHUDTimer();
}
// TAG: the recoverable (red) part of a health bar, crimson with light diagonal stripes so it reads apart
// from the short damage trail
function drawRedHealth(x, y, w, h, s) {
  if (w <= 0) return;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = "#b3122e"; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "rgba(255,150,170,.35)";
  for (let i = -h; i < w + h; i += 10) { ctx.beginPath(); ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + 4, y + h); ctx.lineTo(x + i + 4 + h, y); ctx.lineTo(x + i + h, y); ctx.fill(); }
  ctx.restore();
  game.redDrawn = (game.redDrawn || 0) + 1;
}
// TAG: the partner waiting off screen, a small portrait and a thin health bar (with its red part) between the
// name and the round star, clear of the corner touch buttons (top row ends at y 104)
function drawHUDPartner(s) {
  const f = partnerOf(game.fighters[s]); if (!f) return;
  const P = 32, y = 58, bw = 116, bh = 12, px = s === 0 ? HUD.barX + 212 : W - HUD.barX - 212 - P;
  const bx = s === 0 ? px + P + 8 : px - 8 - bw, by = y + 10, out = f.hp <= 0;
  ctx.fillStyle = "#140c1c"; ctx.fillRect(px - 3, y - 3, P + 6, P + 6);
  ctx.fillStyle = s ? "#5a1a1a" : "#1a2a5a"; ctx.fillRect(px, y, P, P);
  const face = cutInFace(f);
  if (face) {
    const [sx, sy, sw, sh] = headRect(face, 1);
    ctx.save(); ctx.beginPath(); ctx.rect(px, y, P, P); ctx.clip();
    if (s === 1) { ctx.translate(px * 2 + P, 0); ctx.scale(-1, 1); }
    ctx.drawImage(face, sx, sy, sw, sh, px, y, P, P); ctx.restore();
  }
  if (out) {
    ctx.fillStyle = "rgba(20,12,28,.6)"; ctx.fillRect(px, y, P, P);
    ctx.strokeStyle = "#e8343c"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px + 5, y + 5); ctx.lineTo(px + P - 5, y + P - 5); ctx.moveTo(px + P - 5, y + 5); ctx.lineTo(px + 5, y + P - 5); ctx.stroke();
  }
  ctx.lineWidth = 2; ctx.strokeStyle = out ? "#777" : "#ffd23f"; ctx.strokeRect(px + 1, y + 1, P - 2, P - 2);
  ctx.fillStyle = "#140c1c"; ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
  ctx.fillStyle = "#3a0d14"; ctx.fillRect(bx, by, bw, bh);
  const fw = v => bw * Math.max(0, Math.min(1000, v)) / 1000, at = w => s === 0 ? bx + bw - w : bx;
  if (f.red > 0) drawRedHealth(at(fw(f.hp + f.red)), by, fw(f.hp + f.red) - fw(f.hp), bh, s);
  const hw = fw(f.hp); ctx.fillStyle = "#ffd23f"; ctx.fillRect(at(hw), by, hw, bh);
  if (f.state === "bench" && f.red > 0 && game.t % 40 < 20) { ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(at(hw), by, hw, bh); }   // recovering
  hudBox("partner" + s, Math.min(px, bx) - 3, y - 3, P + 8 + bw + 6, P + 6);
}

// ---------- reel capture HUD (?reel=1): portraits, health bars, round stars, timer and names inside the center window
// REEL_X0..REEL_X1, no super meters, no small labels; names in Bungee at REEL_MIN px or more (two lines when long) ----------
const RHUD = { port: 72, portY: 8, barY: 16, barH: 28, gap: 8, timerR: 40 };
function drawHUDReel() {
  const [p, q] = game.fighters, cx = W / 2, barW = cx - RHUD.timerR - 14 - (REEL_X0 + RHUD.port + RHUD.gap + 2);
  [p, q].forEach((f, s) => {
    const P = RHUD.port, px = s === 0 ? REEL_X0 + 2 : REEL_X1 - 2 - P, y = RHUD.portY;
    // portrait
    ctx.fillStyle = "#140c1c"; ctx.fillRect(px - 3, y - 3, P + 6, P + 6);
    const g = ctx.createLinearGradient(0, y, 0, y + P);
    if (s === 0) { g.addColorStop(0, "#2a5cc0"); g.addColorStop(1, "#0b1530"); } else { g.addColorStop(0, "#c02a2a"); g.addColorStop(1, "#300b0b"); }
    ctx.fillStyle = g; ctx.fillRect(px, y, P, P);
    const face = cutInFace(f); game.hudFace[s] = face ? (face === PORTRAIT_IMG[f.id] ? "portrait" : "sprite") : "none";
    if (face) {
      const [sx, sy, sw, sh] = headRect(face, 1);
      ctx.save(); ctx.beginPath(); ctx.rect(px, y, P, P); ctx.clip();
      if (s === 1) { ctx.translate(px * 2 + P, 0); ctx.scale(-1, 1); }
      ctx.drawImage(face, sx, sy, sw, sh, px, y, P, P); ctx.restore();
    }
    if (f.hp <= 0) { ctx.fillStyle = "rgba(20,12,28,.55)"; ctx.fillRect(px, y, P, P); }
    ctx.lineWidth = 3; ctx.strokeStyle = "#ffd23f"; ctx.strokeRect(px + 1.5, y + 1.5, P - 3, P - 3);
    hudBox("portrait" + s, px - 3, y - 3, P + 6, P + 6);
    // health bar between the portrait and the timer, anchored at the timer end
    const bx = s === 0 ? px + P + RHUD.gap : px - RHUD.gap - barW, by = RHUD.barY, bh = RHUD.barH, k = 12;
    const fillW = v => barW * Math.max(0, Math.min(1000, v)) / 1000, at = w => s === 0 ? bx + barW - w : bx;
    ctx.save(); slabPath(bx - 3, by - 3, barW + 6, bh + 6, k, s); ctx.fillStyle = "#140c1c"; ctx.fill();
    slabPath(bx, by, barW, bh, k - 2, s); ctx.clip();
    ctx.fillStyle = "#3a0d14"; ctx.fillRect(bx, by, barW, bh);
    if (f.red > 0) drawRedHealth(at(fillW(f.hp + f.red)), by, fillW(f.hp + f.red) - fillW(f.hp), bh, s);
    const tw = fillW(f.hpTrail); ctx.fillStyle = "#e8343c"; ctx.fillRect(at(tw), by, tw, bh);
    const hw = fillW(f.hp), low = f.hp <= LOW_HP, gg = ctx.createLinearGradient(0, by, 0, by + bh);
    if (low) { gg.addColorStop(0, "#ffd0a0"); gg.addColorStop(0.5, "#ff7a2f"); gg.addColorStop(1, "#c0400f"); }
    else { gg.addColorStop(0, "#fff6a8"); gg.addColorStop(0.45, "#ffd23f"); gg.addColorStop(1, "#d08a10"); }
    ctx.fillStyle = gg; ctx.fillRect(at(hw), by, hw, bh); ctx.fillStyle = "rgba(255,255,255,.28)"; ctx.fillRect(bx, by + 3, barW, 5);
    ctx.restore();
    slabPath(bx, by, barW, bh, k - 2, s); ctx.lineWidth = 2; ctx.strokeStyle = "#ffd23f"; ctx.stroke();
    hudBox("health" + s, bx - 3, by - 3, barW + 6, bh + 6);
    // round stars under the bar at the timer end
    const sx0 = s === 0 ? bx + barW - 16 : bx + 16, dir = s === 0 ? -1 : 1;
    for (let r = 0; r < winsNeeded(); r++) {
      const sx = sx0 + dir * r * 26; starPath(sx, 62, 10); ctx.lineWidth = 4; ctx.strokeStyle = "#140c1c"; ctx.stroke();
      ctx.fillStyle = r < f.wins ? "#ffd23f" : "rgba(255,255,255,.2)"; ctx.fill();
    }
    const sx1 = sx0 + dir * (winsNeeded() - 1) * 26; hudBox("stars" + s, Math.min(sx0, sx1) - 12, 50, Math.abs(sx1 - sx0) + 24, 24);
    // tag partner: a small face chip under the bar at the portrait end
    const m = game.teams ? partnerOf(f) : null;
    if (m) {
      const C = 34, cxp = s === 0 ? bx : bx + barW - C, cy = 50, mf = cutInFace(m);
      ctx.fillStyle = "#140c1c"; ctx.fillRect(cxp - 2, cy - 2, C + 4, C + 4); ctx.fillStyle = s ? "#5a1a1a" : "#1a2a5a"; ctx.fillRect(cxp, cy, C, C);
      if (mf) { const [sx, sy, sw, sh] = headRect(mf, 1); ctx.save(); ctx.beginPath(); ctx.rect(cxp, cy, C, C); ctx.clip(); if (s === 1) { ctx.translate(cxp * 2 + C, 0); ctx.scale(-1, 1); } ctx.drawImage(mf, sx, sy, sw, sh, cxp, cy, C, C); ctx.restore(); }
      if (m.hp <= 0) { ctx.fillStyle = "rgba(20,12,28,.6)"; ctx.fillRect(cxp, cy, C, C); }
      ctx.lineWidth = 2; ctx.strokeStyle = m.hp <= 0 ? "#777" : "#ffd23f"; ctx.strokeRect(cxp + 1, cy + 1, C - 2, C - 2);
      hudBox("partner" + s, cxp - 2, cy - 2, C + 4, C + 4);
    }
    // name under the portrait, toward the center
    const nmaxW = cx - RHUD.timerR - 10 - (REEL_X0 + 2), fit = fitLines(f.ch.name, nmaxW, REEL_MIN, REEL_MIN), lh = Math.round(fit.size * 1.1);
    const nx = s === 0 ? REEL_X0 + 2 : REEL_X1 - 2, al = s === 0 ? "left" : "right";
    fit.lines.forEach((l, i) => text(l, nx, 108 + i * lh, fit.size, "#fff", al));
    ctx.font = `${fit.size}px 'Bungee', Impact, sans-serif`;
    const nw = Math.max(...fit.lines.map(l => ctx.measureText(l).width)) + 6;
    hudBox("name" + s, s === 0 ? nx - 3 : nx - nw, 108 - fit.size * 0.62, nw + 3, (fit.lines.length - 1) * lh + fit.size * 1.24);
  });
  // timer
  const r = RHUD.timerR, cy = 46, t = game.timer;
  hexPath(cx, cy, r + 5); ctx.fillStyle = "#140c1c"; ctx.fill(); hexPath(cx, cy, r); ctx.fillStyle = "#ffd23f"; ctx.fill();
  const tg = ctx.createLinearGradient(0, cy - r, 0, cy + r); tg.addColorStop(0, "#8a1820"); tg.addColorStop(1, "#2a0710");
  hexPath(cx, cy, r - 5); ctx.fillStyle = tg; ctx.fill();
  text(String(Math.max(0, t)).padStart(2, "0"), cx, cy + 3, 40, "#fff");
  hudBox("timer", cx - r - 5, cy - (r + 5) * 0.9, (r + 5) * 2, (r + 5) * 1.8);
}
