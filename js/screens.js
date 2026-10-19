// Fighting game engine, part 5 of 6 (screens.js): presentation: boot loader, logo (GAME_TITLE), title, main menu, select screen, VS screen.
// Plain classic scripts loaded in order by index.html (core, fight, flow, draw, screens, main). They share one
// global scope, so a top-level name declared in one part is visible in the parts after it. Top-level code in a
// part may only call functions from the same or an earlier part (calls inside functions run after all parts load).
"use strict";
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
  ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(im, (W - w) / 2 + ox, (H - h) / 2 + oy, w, h); ctx.restore();
}
function drawFighterAt(id, pose, x, floorY, scale, face) {
  const im = IMG[id] && IMG[id][poseOf(id, pose)], md = meta(id, pose);
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

// ---------- item 13: the logo. GAME_TITLE (roster.js) in two stacked lines split on the space nearest the middle:
// Bungee, extruded, TV static inside the letter faces, a 90s CRT scan glint on the shine. Nothing in the engine
// names the game, so a rename is one line in roster.js and the logo rebuilds from it. ----------
const LOGO = { c: null, face: null, w: 1120, h: 340, lines: [], sizes: [], font: false, title: "" };
function titleLines(t) {
  const s = String(t || "").toUpperCase().trim().replace(/\s+/g, " "), mid = s.length / 2;
  let at = -1; for (let i = 0; i < s.length; i++) if (s[i] === " " && (at < 0 || Math.abs(i - mid) < Math.abs(at - mid))) at = i;
  return at < 0 ? [s] : [s.slice(0, at), s.slice(at + 1)];
}
const mkCanvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
// TV static: four quarter-size noise frames (drawn back up with hard pixels), streaked by row like a lost channel
const STATIC_FR = Array.from({ length: 4 }, (_, n) => {
  const w = 280, h = 85, c = mkCanvas(w, h), x = c.getContext("2d"), im = x.createImageData(w, h), d = im.data, r = rng(1013 + n * 7919);
  for (let y = 0; y < h; y++) {
    const row = (r() - 0.5) * 90;
    for (let i = 0; i < w; i++) { const v = Math.max(0, Math.min(255, r() * 255 + row)) | 0, o = (y * w + i) * 4; d[o] = d[o + 1] = d[o + 2] = v; d[o + 3] = 255; }
  }
  x.putImageData(im, 0, 0); return c;
});
// ?title=NAME overrides GAME_TITLE for the logo at run time (reel capture placeholder names); roster.js is untouched
const TITLE_PARAM = (() => { try { return new URLSearchParams(location.search).get("title") || null; } catch (e) { return null; } })();
function buildLogo(title = TITLE_PARAM || window.GAME_TITLE) {
  const lines = titleLines(title), two = lines.length > 1, LW = LOGO.w, LH = LOGO.h, maxW = LW - 90, EX = 18, cx = LW / 2;
  const c = mkCanvas(LW, LH), x = c.getContext("2d"), face = mkCanvas(LW, LH), fx = face.getContext("2d");
  const font = sz => `${sz}px 'Bungee', Impact, sans-serif`;
  const width = (s, sz) => { x.font = font(sz); return x.measureText(s).width; };
  // sizes: the bottom line leads, the top line is at most 82 percent of it, both fit the logo width
  const cap = two ? 172 : 210;
  const sizes = lines.map(s => Math.min(cap, Math.floor(cap * maxW / Math.max(1, width(s, cap)))));
  if (two) sizes[0] = Math.min(sizes[0], Math.round(sizes[1] * 0.82));
  const boxes = () => lines.map((s, i) => { x.font = font(sizes[i]); const m = x.measureText(s); return { a: m.actualBoundingBoxAscent || sizes[i] * 0.74, d: m.actualBoundingBoxDescent || 0 }; });
  let box = boxes();
  const gap = two ? 16 : 0, room = LH - EX - 24, need = () => box.reduce((n, b) => n + b.a + b.d, 0) + gap;
  if (need() > room) { const k = room / need(); for (let i = 0; i < sizes.length; i++) sizes[i] = Math.floor(sizes[i] * k); box = boxes(); }
  let y = (LH - EX - need()) / 2;
  const base = box.map(b => { const yy = y + b.a; y += b.a + b.d + gap; return yy; });
  x.textAlign = fx.textAlign = "center"; x.textBaseline = fx.textBaseline = "alphabetic"; x.lineJoin = "round";
  const each = fn => lines.forEach((s, i) => { x.font = fx.font = font(sizes[i]); fn(s, i, base[i]); });
  // pass 1: a dark rim around the whole extruded block (reads on any stage)
  each((s, i, yb) => { x.lineWidth = 22; x.strokeStyle = "#0b0612"; for (let d = EX; d >= 0; d -= 3) x.strokeText(s, cx + d * 0.55, yb + d); });
  // pass 2: the extrusion, deep maroon into red
  each((s, i, yb) => { for (let d = EX; d > 0; d--) { x.fillStyle = d > EX * 0.55 ? "#2a0710" : d > 4 ? "#8e1626" : "#c4283a"; x.fillText(s, cx + d * 0.55, yb + d); } });
  // pass 3: the faces (outline, then the gold gradient) and the face mask the static and the glint ride on
  each((s, i, yb) => {
    x.lineWidth = 9; x.strokeStyle = "#140c1c"; x.strokeText(s, cx, yb);
    const g = x.createLinearGradient(0, yb - box[i].a, 0, yb + box[i].d);
    g.addColorStop(0, "#fffbd0"); g.addColorStop(0.42, "#ffd23f"); g.addColorStop(0.75, "#ff9d1a"); g.addColorStop(1, "#ff5a1a");
    x.fillStyle = g; x.fillText(s, cx, yb);
    fx.fillStyle = "#fff"; fx.fillText(s, cx, yb);
  });
  // TV static and CRT scanlines baked into the faces (the live flicker rides on top in composeLogo)
  const t = mkCanvas(LW, LH), tx = t.getContext("2d");
  tx.imageSmoothingEnabled = false; tx.drawImage(STATIC_FR[0], 0, 0, LW, LH);
  tx.fillStyle = "rgba(0,0,0,.55)"; for (let yy = 0; yy < LH; yy += 4) tx.fillRect(0, yy, LW, 1);
  tx.globalCompositeOperation = "destination-in"; tx.drawImage(face, 0, 0);
  x.save(); x.globalAlpha = 0.3; x.globalCompositeOperation = "overlay"; x.drawImage(t, 0, 0); x.restore();
  // gloss: the top of every letter catches the light
  tx.globalCompositeOperation = "source-over"; tx.clearRect(0, 0, LW, LH);
  lines.forEach((s, i) => {
    const top = base[i] - box[i].a, g = tx.createLinearGradient(0, top, 0, top + box[i].a * 0.5);
    g.addColorStop(0, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)"); tx.fillStyle = g; tx.fillRect(0, top, LW, box[i].a * 0.5);
  });
  tx.globalCompositeOperation = "destination-in"; tx.drawImage(face, 0, 0); x.drawImage(t, 0, 0);
  each((s, i, yb) => { x.lineWidth = 2.5; x.strokeStyle = "rgba(255,255,255,.6)"; x.strokeText(s, cx, yb - 2); });
  const ok = !!(document.fonts && document.fonts.check && document.fonts.check("40px Bungee"));
  Object.assign(LOGO, { c, face, lines, sizes: sizes.slice(), font: ok, title: String(title || "") });
  rrLog("logo " + lines.join(" / ") + (ok ? " bungee" : " fallback-font"));
  return { lines, sizes: sizes.slice(), font: ok };
}
buildLogo();
if (document.fonts && document.fonts.load) {
  document.fonts.load("120px Bungee").then(() => buildLogo()).catch(() => {});
  document.fonts.addEventListener && document.fonts.addEventListener("loadingdone", () => { if (!LOGO.font) buildLogo(); });
}
// the font stylesheet can land after this script: the logo rebuilds itself the first time Bungee reports ready
function logoFontCheck() { if (!LOGO.font && game.t % 30 === 0 && document.fonts && document.fonts.check && document.fonts.check("40px Bungee")) buildLogo(); }
// the page title follows GAME_TITLE too (index.html and manifest.webmanifest keep their static values)
if (window.GAME_TITLE) {
  const nice = String(GAME_TITLE).toLowerCase().replace(/\b[a-z]/g, m => m.toUpperCase());
  document.title = nice; const am = document.querySelector('meta[name="apple-mobile-web-app-title"]'); if (am) am.setAttribute("content", nice);
}
const SHINE = mkCanvas(LOGO.w, LOGO.h), shx = SHINE.getContext("2d"), LFX = mkCanvas(LOGO.w, LOGO.h), lfx = LFX.getContext("2d");
const LOGO_SCAN = (() => { const c = mkCanvas(4, 3); c.getContext("2d").fillRect(0, 0, 4, 1); return c; })();
let LOGO_SCAN_PAT = null;
// one logo frame into SHINE: base art, live static flicker, a rolling CRT refresh bar, and the scan glint (shinePos 0..1)
function composeLogo(t, shinePos) {
  const LW = LOGO.w, LH = LOGO.h;
  shx.globalCompositeOperation = "source-over"; shx.globalAlpha = 1; shx.clearRect(0, 0, LW, LH); shx.drawImage(LOGO.c, 0, 0);
  const pass = (paint, op, a) => {
    lfx.globalCompositeOperation = "source-over"; lfx.globalAlpha = 1; lfx.clearRect(0, 0, LW, LH); paint();
    lfx.globalCompositeOperation = "destination-in"; lfx.drawImage(LOGO.face, 0, 0);
    shx.globalCompositeOperation = op; shx.globalAlpha = a; shx.drawImage(LFX, 0, 0); shx.globalAlpha = 1; shx.globalCompositeOperation = "source-over";
  };
  const n = Math.floor(t / 3);   // a fresh noise frame every 3 frames, jittered
  pass(() => { lfx.imageSmoothingEnabled = false; lfx.drawImage(STATIC_FR[n % STATIC_FR.length], -((n * 37) % 16), -((n * 11) % 8), LW + 16, LH + 8); }, "overlay", 0.22);
  const by = ((t * 2.2) % (LH + 160)) - 80;   // the refresh bar rolling down the letters
  pass(() => { const g = lfx.createLinearGradient(0, by - 40, 0, by + 40); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,.5)"); g.addColorStop(1, "rgba(255,255,255,0)"); lfx.fillStyle = g; lfx.fillRect(0, by - 40, LW, 80); }, "lighter", 0.3);
  if (shinePos > -0.3 && shinePos < 1.3) {   // the shine: a scanline-striped diagonal CRT glint with red and cyan fringes (RGB gun misregister)
    // gradient axis is near horizontal (1, 0.35), so each band is narrow and leans about 20 degrees
    const px = shinePos * (LW + 400) - 200 - LH * 0.175, band = (x0, x1, stops) => { const g = lfx.createLinearGradient(px + x0, 0, px + x1, (x1 - x0) * 0.35); for (const [k, c] of stops) g.addColorStop(k, c); lfx.fillStyle = g; lfx.fillRect(0, 0, LW, LH); };
    const stripes = () => { LOGO_SCAN_PAT = LOGO_SCAN_PAT || lfx.createPattern(LOGO_SCAN, "repeat"); lfx.globalCompositeOperation = "destination-out"; lfx.fillStyle = LOGO_SCAN_PAT; lfx.fillRect(0, 0, LW, LH); };
    pass(() => { band(-150, -70, [[0, "rgba(255,30,110,0)"], [0.5, "rgba(255,30,110,.9)"], [1, "rgba(255,30,110,0)"]]); lfx.globalCompositeOperation = "source-over";
      band(70, 150, [[0, "rgba(40,210,255,0)"], [0.5, "rgba(40,210,255,.9)"], [1, "rgba(40,210,255,0)"]]); stripes(); }, "source-over", 0.55);
    pass(() => { band(-80, 80, [[0, "rgba(255,255,255,0)"], [0.5, "rgba(255,255,255,1)"], [1, "rgba(255,255,255,0)"]]); stripes(); }, "lighter", 0.9);
  }
}
function drawLogo(cx, cy, scale, alpha, shinePos, t = game.titleT) {
  composeLogo(t, shinePos);
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, cy); ctx.scale(scale, scale);
  ctx.drawImage(SHINE, -LOGO.w / 2, -LOGO.h / 2); ctx.restore();
}
// the logo alone at `width` px (halving steps for a clean downscale): the 200 px legibility check and icon work
function logoImage(width = 200, bg = "#140c1c", shinePos = -1, t = 0) {
  composeLogo(t, shinePos);
  const w = Math.round(width), h = Math.round(width * LOGO.h / LOGO.w), c = mkCanvas(w, h), x = c.getContext("2d"); smooth(x);
  if (bg) { x.fillStyle = bg; x.fillRect(0, 0, w, h); }
  let src = SHINE;
  while (src.width / 2 > w) { const s2 = mkCanvas(Math.round(src.width / 2), Math.round(src.height / 2)), y = s2.getContext("2d"); smooth(y); y.drawImage(src, 0, 0, s2.width, s2.height); src = s2; }
  x.drawImage(src, 0, 0, w, h);
  return c.toDataURL("image/png");
}

// ---------- title (item 13, redone 10/18 after the Friday Fighters reference): the painted key art
// (assets/ui/title_keyart.webp) full screen with a slow push-in, the logo over the open sky (the side of the art with
// the least texture in its top half, found once), PRESS START under it, the show and disclaimer marquee along the
// bottom. No key art: the old slideshow over every stage. No lineup march. ----------
const DISCLAIMER = "Unofficial fan tribute. Not affiliated with any network or studio.";
const TITLE_STAGES = [];
for (const s of SHOWS) for (const k of [s.stage, STAGES[s.stage] && STAGES[s.stage].breakInto]) if (k && STAGES[k] && !TITLE_STAGES.includes(k)) TITLE_STAGES.push(k);
for (const k of Object.keys(STAGES)) if (!TITLE_STAGES.includes(k)) TITLE_STAGES.push(k);
const TITLE_DUR = 210, TITLE_FADE = 40, KEYART_PUSH = 3000;   // push-in: one slow in-and-out every 50 s
// fighters with an installed V3 (hand-drawn) set: V3 builds carry idle_2, the old pixel sets never do
const isV3 = id => hasArtId(id) && !!(window.MANIFEST && MANIFEST[id] && MANIFEST[id].idle_2);
// an image drawn to cover the rect, zoom k, focus fx / fy (0 = left / top edge, 1 = right / bottom edge)
function drawCoverRect(im, x, y, w, h, k = 1, fx = 0.5, fy = 0.5, alpha = 1) {
  const sc = Math.max(w / im.naturalWidth, h / im.naturalHeight) * k, dw = im.naturalWidth * sc, dh = im.naturalHeight * sc;
  ctx.save(); ctx.globalAlpha = alpha; ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.drawImage(im, x + (w - dw) * fx, y + (h - dh) * fy, dw, dh); ctx.restore();
}
let KEYART_SKY = null;
function keyartSky() {
  if (KEYART_SKY) return KEYART_SKY;
  if (!uiReady("title_keyart")) return "right";
  try {
    const c = mkCanvas(48, 27), x = c.getContext("2d"); x.drawImage(UI_IMG.title_keyart, 0, 0, 48, 27);
    const d = x.getImageData(0, 0, 48, 13).data, lum = (i, j) => { const o = (j * 48 + i) * 4; return 0.3 * d[o] + 0.59 * d[o + 1] + 0.11 * d[o + 2]; };
    let L = 0, R = 0;
    for (let j = 0; j < 13; j++) for (let i = 0; i < 47; i++) { const e = Math.abs(lum(i + 1, j) - lum(i, j)) + (j < 12 ? Math.abs(lum(i, j + 1) - lum(i, j)) * 0.5 : 0); if (i < 23) L += e; else if (i > 23) R += e; }
    KEYART_SKY = L <= R ? "left" : "right";
  } catch (e) { KEYART_SKY = "right"; }
  rrLog("keyartSky " + KEYART_SKY);
  return KEYART_SKY;
}
function drawTitleSlideshow(t) {
  const list = TITLE_STAGES.filter(stageReady), n = list.length;
  if (n) {
    const idx = Math.floor(t / TITLE_DUR) % n, lt = t % TITLE_DUR;
    const kb = (k, u, a = 1) => drawCover(STAGE_IMG[list[k]], 1.08 + 0.07 * u, (k % 2 ? -1 : 1) * (40 - 80 * u), 10 - 20 * u, a);
    kb(idx, lt / TITLE_DUR); game.titleStage = list[idx];
    if (lt > TITLE_DUR - TITLE_FADE) kb((idx + 1) % n, 0, (lt - (TITLE_DUR - TITLE_FADE)) / TITLE_FADE);
  } else { const g0 = ctx.createLinearGradient(0, 0, 0, H); g0.addColorStop(0, "#2a1450"); g0.addColorStop(1, "#140c1c"); ctx.fillStyle = g0; ctx.fillRect(0, 0, W, H); game.titleStage = null; }
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "rgba(12,6,28,.7)"); g.addColorStop(0.45, "rgba(12,6,28,.25)"); g.addColorStop(1, "rgba(12,6,28,.7)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function drawMarquee(t) {
  ctx.fillStyle = "rgba(0,0,0,.8)"; ctx.fillRect(0, H - 38, W, 38); ctx.fillStyle = "#ffd23f"; ctx.fillRect(0, H - 38, W, 2);
  const mq = SHOWS.map(s => s.show.toUpperCase()).join("  ★  ") + "  ★  " + DISCLAIMER.toUpperCase() + "  ★  ";
  ctx.font = "14px 'Press Start 2P', monospace"; const mw = ctx.measureText(mq).width, mx = -((t * 1.6) % mw);
  ctx.fillStyle = "#ffd23f"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(mq, mx, H - 18); ctx.fillText(mq, mx + mw, H - 18);
  game.marquee = mq;
}
// title screen with the poster (assets/ui/title_poster_nologo.webp, Todd 2026-10-18): the poster full screen with the slow
// push-in, the live logo centered horizontally over the poster's dark bottom shade (lower third, about y 540 to 660),
// PRESS START under it and the disclaimer marquee along the bottom (reel capture: no marquee, no small text)
const POSTER_LOGO_Y = 598, POSTER_LOGO_K = 0.34;
function drawTitlePoster(t) {
  const u = 0.5 - 0.5 * Math.cos(t / KEYART_PUSH * Math.PI * 2);
  drawCoverRect(UI_IMG.title_poster_nologo, 0, 0, W, H, 1.02 + 0.06 * u, 0.5, 0.42);
  const sh = ctx.createLinearGradient(0, H * 0.66, 0, H); sh.addColorStop(0, "rgba(10,6,20,0)"); sh.addColorStop(0.35, "rgba(10,6,20,.55)"); sh.addColorStop(1, "rgba(10,6,20,.82)");
  ctx.fillStyle = sh; ctx.fillRect(0, H * 0.66, W, H * 0.34);
  const lx = W / 2, ly = POSTER_LOGO_Y, k = ease(t / 20), scale = 3 - 2 * k, shake = t > 18 && t < 34 ? (Math.random() - 0.5) * (34 - t) * 1.6 : 0;
  drawLogo(lx + shake, ly + Math.sin(t / 45) * 3 + shake, scale * POSTER_LOGO_K, Math.min(1, t / 10), ((t - 40) % 240) / 70, t);
  if (t >= 18 && t < 40) { ctx.fillStyle = `rgba(255,255,255,${1 - (t - 18) / 22})`; ctx.fillRect(0, 0, W, H); }
  if (t > 55 && t % 50 < 36) {
    const ps = 1 + 0.05 * Math.sin(t / 7), py = REEL ? 676 : 668;
    ctx.save(); ctx.translate(lx, py); ctx.scale(ps, ps); text(isTouch ? "TAP TO START" : "PRESS START", 0, 0, REEL ? 30 : 22, "#ffd23f", "center", "Press Start 2P"); ctx.restore();
  }
  Object.assign(game, { titleArt: "poster", titleStage: null, titleMarch: null, titleLogo: { x: lx, y: ly, side: "center" } });
  if (!REEL) drawMarquee(t);
  if (!isTouch && !REEL) text(music.muted ? "P: MUSIC OFF" : "P: MUSIC ON", W - 24, 28, 11, "#bbb", "right", "Press Start 2P");
  scanlines(0.07); vignette(0.35);
}
function drawTitle() {
  const t = game.titleT; logoFontCheck();
  if (uiReady("title_poster_nologo")) { drawTitlePoster(t); return; }
  const art = uiReady("title_keyart");
  if (art) {
    const u = 0.5 - 0.5 * Math.cos(t / KEYART_PUSH * Math.PI * 2), side = keyartSky();
    drawCoverRect(UI_IMG.title_keyart, 0, 0, W, H, 1.02 + 0.09 * u, side === "left" ? 0.62 : 0.38, 0.55);
    game.titleStage = null;
  } else drawTitleSlideshow(t);
  game.titleArt = art ? "keyart" : "slideshow"; game.titleMarch = null;
  const side = art ? keyartSky() : "right", lx = side === "left" ? Math.round(W * 0.29) : Math.round(W * 0.71), ly = 178;
  // a soft shade behind the logo and the prompt so both read on any sky
  const sh = ctx.createRadialGradient(lx, ly + 90, 40, lx, ly + 90, 430); sh.addColorStop(0, "rgba(10,6,20,.38)"); sh.addColorStop(1, "rgba(10,6,20,0)");
  ctx.fillStyle = sh; ctx.fillRect(0, 0, W, H);
  // logo: slams in, flashes, then floats with a CRT glint every few seconds
  const k = ease(t / 20), scale = 3 - 2 * k, shake = t > 18 && t < 34 ? (Math.random() - 0.5) * (34 - t) * 1.6 : 0;
  drawLogo(lx + shake, ly + Math.sin(t / 45) * 5 + shake, scale * 0.62, Math.min(1, t / 10), ((t - 40) % 240) / 70, t);
  if (t >= 18 && t < 40) { ctx.fillStyle = `rgba(255,255,255,${1 - (t - 18) / 22})`; ctx.fillRect(0, 0, W, H); }
  if (t > 30 && !REEL) {   // reel capture: no small text (the subtitle and the marquee are hidden)
    ctx.globalAlpha = Math.min(1, (t - 30) / 20);
    text(GAME_SUBTITLE.toUpperCase(), lx, ly + 128, 13, "#fff", "center", "Press Start 2P");
    ctx.globalAlpha = 1;
  }
  if (t > 55 && t % 50 < 36) {
    const ps = 1 + 0.05 * Math.sin(t / 7);
    ctx.save(); ctx.translate(lx, ly + 196); ctx.scale(ps, ps); text(isTouch ? "TAP TO START" : "PRESS START", 0, 0, 30, "#ffd23f", "center", "Press Start 2P"); ctx.restore();
  }
  game.titleLogo = { x: lx, y: ly, side };
  if (!REEL) drawMarquee(t);
  if (!isTouch && !REEL) text(music.muted ? "P: MUSIC OFF" : "P: MUSIC ON", W - 24, 28, 11, "#bbb", "right", "Press Start 2P");
  scanlines(0.07); vignette(0.35);
}

// ---------- main menu (mode screen), after the Friday Fighters menu: the key art on the right half, the logo top
// left, the modes centered in the left column with a full-width red bar on the selected one, a yellow-bordered
// description box under the menu column (bottom left, so the key art figures on the right stay fully visible), and
// the controls hint bar along the bottom ----------
const MODE_INFO = [
  { label: "ARCADE", desc: "Fly the map: 8 city fights against the other shows, then a final against your own tag partner." },
  { label: "VERSUS", desc: "Two players, one couch. Each player picks a fighter and the fight lands on P2's home stage." },
  { label: "TAG 2 VS 2", desc: "Pick two fighters. Tap TAG to swap. Hold TAG + SUPER at LV2 for the tag team super." },
  { label: "CPU SHOWCASE", desc: "CPU vs CPU. Random show matchups roll on their own. ESC or BACK leaves." },
];
const MODE_KEYS = ["P1: WASD move  F G V B attack  H special  T super  R tag", "P2: ARROWS move  J K M , attack  L special  I super  O tag", "PADS: X Y A B attack  LB special  RB super  LT / RT tag"];
function drawMode() {
  const t = game.t;
  if (uiReady("title_keyart")) drawCoverRect(UI_IMG.title_keyart, 0, 0, W, H, 1.04, keyartSky() === "left" ? 1 : 0, 0.5);
  else drawStage("winslow");
  game.modeArt = uiReady("title_keyart") ? "keyart" : "stage";
  const g = ctx.createLinearGradient(0, 0, 640, 0); g.addColorStop(0, "rgba(10,6,20,.86)"); g.addColorStop(0.62, "rgba(10,6,20,.62)"); g.addColorStop(1, "rgba(10,6,20,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 640, H);
  logoFontCheck();
  const cx = 280;
  drawLogo(cx, 116, 0.42, 1, ((t - 40) % 300) / 80, t);
  const y0 = 250, gap = 60, items = [];
  MODE_INFO.forEach((m, i) => {
    const y = y0 + i * gap, on = game.menu === i;
    if (on) { ctx.fillStyle = "#d42a2a"; ctx.fillRect(40, y - 24, 480, 48); ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fillRect(40, y - 24, 480, 4); }
    let label = m.label, chip = i === 2 ? (game.tagCpu ? "VS CPU" : "2 PLAYERS") : i === 3 ? (game.showcaseTag ? "TAG 2 VS 2" : "1 VS 1") : null;
    ctx.font = "30px 'Bungee', Impact, sans-serif"; const lw = ctx.measureText(label).width;
    const lx = chip ? cx - 60 : cx;
    text(label, lx, y + 2, 30, on ? "#fff" : "#fff1d0");
    if (chip) {
      const c = on ? `< ${chip} >` : chip; ctx.font = "11px 'Press Start 2P', monospace"; const cw = ctx.measureText(c).width + 16, chx = lx + lw / 2 + 14;
      ctx.fillStyle = on ? "#ffd23f" : "rgba(255,210,63,.75)"; ctx.fillRect(chx, y - 11, cw, 22);
      ctx.fillStyle = "#140c1c"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(c, chx + 8, y + 1);
    }
    items.push(label);
  });
  // description box (under the menu column): the highlighted mode in one or two lines, then the controls
  const bx = 30, by = 500, bw = 516, bh = 172;
  ctx.fillStyle = "rgba(20,12,28,.86)"; ctx.fillRect(bx, by, bw, bh); ctx.lineWidth = 3; ctx.strokeStyle = "#ffc21a"; ctx.strokeRect(bx, by, bw, bh);
  ctx.font = "bold 19px 'Trebuchet MS', Arial, sans-serif"; ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  const desc = wrapLines(MODE_INFO[game.menu].desc, bw - 36, 2);
  desc.forEach((l, i) => ctx.fillText(l, bx + 18, by + 24 + i * 25));
  ctx.font = "8px 'Press Start 2P', monospace"; ctx.fillStyle = "#c9c2d6";
  MODE_KEYS.forEach((l, i) => ctx.fillText(l, bx + 14, by + 98 + i * 22));
  // controls hint bar
  ctx.fillStyle = "rgba(10,6,20,.92)"; ctx.fillRect(0, H - 34, W, 34);
  text("UP / DOWN CHOOSE  ·  LEFT / RIGHT OPTION  ·  LP OR ENTER SELECT  ·  ESC BACK", W / 2, H - 16, 12, "#ffc21a", "center", "Press Start 2P");
  game.modeDraw = { items, desc: MODE_INFO[game.menu].desc, art: game.modeArt };
}

// ---------- character select, after the Friday Fighters select: navy stage backdrop (assets/ui/select_bg.webp),
// CHOOSE YOUR FIGHTER top left, the mode tag top right, PLAYER ONE / PLAYER TWO tabs, a tight centered grid of square
// bust portraits (6 wide, 4 rows, two fighters per show with the show name over each pair), a big breathing
// full-body fighter on a glowing floor ring on each side with the name, show and years, the hovered fighter's
// flavor line under the grid and a controls bar along the bottom. A fighter with no portrait shows a greyed "?"
// silhouette card; only fighters with art can be picked. ----------
const SEL = (() => {
  const groups = [];
  ROSTER.forEach((c, i) => { let g = groups.find(q => q.show === c.show); if (!g) groups.push(g = { show: c.show, idx: [] }); g.idx.push(i); });
  const PER_ROW = 6, CW = 78, CH = 78, GAP = 6, GG = 14, LBL = 18, TOP = 146, PITCH = CH + LBL + 8, rows = [[]];
  let used = 0;
  for (const g of groups) { if (used && used + g.idx.length > PER_ROW) { rows.push([]); used = 0; } rows[rows.length - 1].push(g); used += g.idx.length; }
  const cells = [], labels = [], order = [];
  rows.forEach((row, r) => {
    const width = row.reduce((n, g) => n + g.idx.length * (CW + GAP) - GAP, 0) + (row.length - 1) * GG;
    let x = Math.round((W - width) / 2); const y = TOP + LBL + r * PITCH;
    row.forEach(g => {
      const gx = x;
      g.idx.forEach(i => { cells[i] = { x, y, w: CW, h: CH, row: r }; order.push(i); x += CW + GAP; });
      labels.push({ show: g.show, x: gx, w: x - GAP - gx, y, row: r });
      x += GG - GAP;
    });
  });
  const xs = cells.map(c => c.x), ys = cells.map(c => c.y);
  const panel = { x: Math.min(...xs) - 16, y: TOP - 6, w: Math.max(...xs) + CW - Math.min(...xs) + 32, h: Math.max(...ys) + CH - TOP + 18 };
  return { cells, labels, order, rows: rows.length, perRow: PER_ROW, panel };
})();
function selStep(c, d) { const n = SEL.order.length, k = SEL.order.indexOf(c); return SEL.order[((k < 0 ? 0 : k) + d + n) % n]; }
function selRow(c, d) {
  const a = SEL.cells[c]; if (!a || SEL.rows < 2) return c;
  const r = (a.row + d + SEL.rows) % SEL.rows; let best = c, bd = 1e9;
  SEL.cells.forEach((b, i) => { if (b && b.row === r && Math.abs(b.x - a.x) < bd) { bd = Math.abs(b.x - a.x); best = i; } });
  return best;
}
function fitFont(s, maxW, size, min, font) {
  const f = z => `${z}px '${font}', Impact, monospace`; ctx.font = f(size);
  while (size > min && ctx.measureText(s).width > maxW) ctx.font = f(--size);
  return size;
}
// split a label in two lines at the space that balances them best
function twoLines(s) {
  const w = s.split(" "); if (w.length < 2) return [s];
  let best = null; for (let i = 1; i < w.length; i++) { const a = w.slice(0, i).join(" "), b = w.slice(i).join(" "), m = Math.max(a.length, b.length); if (!best || m < best[2]) best = [a, b, m]; }
  return [best[0], best[1]];
}
const SEL_COL = ["#ffc21a", "#5fd8ff"];
const showYears = show => (window.SHOW_YEARS && SHOW_YEARS[show]) || "";
// relative height on the select and VS screens: this fighter's in-fight idle height over the roster average
// (roster size sets who is tall), so Will stands over Urkel on every screen, not only in the fight
function relH(id) { const c = ROSTER.find(r => r.id === id); return c && MANIFEST[id] ? meta(id, "idle").h * S * (c.size || 1) / avgIdleH() : 1; }
// a full-body fighter `hgt` px tall (measured on its idle frame, so pose changes never jump in size), feet at floorY
function drawTall(id, pose, x, floorY, hgt, face, opt = {}) {
  const art = poseOf(id, pose), md = meta(id, art), im = IMG[id] && IMG[id][art];
  if (!im || !im.complete || !im.naturalWidth) return false;
  const sc = hgt / meta(id, "idle").h, br = opt.breath ? breath(game.t, opt.phase || 0) : { sx: 1, sy: 1 };
  ctx.save(); if (opt.alpha != null) ctx.globalAlpha = opt.alpha; if (opt.filter) ctx.filter = opt.filter;
  ctx.translate(Math.round(x), Math.round(floorY)); if (face < 0) ctx.scale(-1, 1); ctx.scale(br.sx, br.sy);
  ctx.drawImage(im, -md.ax * sc, -md.h * sc, md.w * sc, md.h * sc); ctx.restore(); return true;
}
function drawSilhouetteCard(x, y, w, h, big) {
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, "#4a5268"); g.addColorStop(1, "#262c3c"); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#1c2130"; ctx.beginPath(); ctx.arc(x + w / 2, y + h * 0.42, w * 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 1.02, w * 0.42, h * 0.36, 0, Math.PI, 0); ctx.fill();
  text("?", x + w / 2, y + h * 0.42, big ? 90 : Math.round(w * 0.42), "#9aa3b8");
}
function drawSelBackdrop() {
  if (uiReady("select_bg")) { drawCoverRect(UI_IMG.select_bg, 0, 0, W, H, 1.02, 0.5, 0.5); ctx.fillStyle = "rgba(8,22,48,.5)"; ctx.fillRect(0, 0, W, H); }
  else { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#123a5c"); g.addColorStop(1, "#0a1a30"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  return uiReady("select_bg") ? "image" : "gradient";
}
function drawSelect() {
  const st = { faces: {}, labels: [], preview: [], cards: [], bg: drawSelBackdrop() };
  ctx.fillStyle = "#ffc21a"; ctx.fillRect(0, 0, W, 5);
  text("CHOOSE YOUR FIGHTER", 38, 60, 42, "#fff4d0", "left");
  ctx.fillStyle = "rgba(255,255,255,.16)"; ctx.fillRect(36, 104, W - 72, 2);
  const modeLabel = game.mode === "arcade" ? "ARCADE" : game.mode === "tag" ? (game.tagCpu ? "TAG VS CPU" : "TAG 2 VS 2") : "VERSUS";
  ctx.fillStyle = "#ffc21a"; ctx.fillRect(980, 34, 264, 50);
  ctx.font = "22px 'Bungee', Impact, sans-serif"; ctx.fillStyle = "#14223a"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(modeLabel, 1112, 60);
  // the grid panel, its header and the show labels
  const P = SEL.panel; ctx.fillStyle = "rgba(4,14,32,.62)"; ctx.fillRect(P.x, P.y, P.w, P.h);
  const pk = game.tagPicks[0].length, head = game.mode === "tag" ? `P1 · PICK 2 FIGHTERS (${Math.min(2, pk + (game.ready[0] ? 0 : 1))}/2)` : "P1 · CHOOSE A FIGHTER";
  text(head, W / 2, 128, 13, "#ffc21a", "center", "Press Start 2P");
  for (const l of SEL.labels) {
    const s = l.show.toUpperCase(), size = fitFont(s, l.w, 11, 6, "Bungee");
    ctx.font = `${size}px 'Bungee', Impact, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#0a1220"; ctx.fillText(s, l.x + l.w / 2 + 1, l.y - 9); ctx.fillStyle = "#ffd23f"; ctx.fillText(s, l.x + l.w / 2, l.y - 10);
    ctx.fillStyle = "rgba(255,210,63,.55)"; ctx.fillRect(l.x, l.y - 3, l.w, 1.5);
    st.labels.push(l.show);
  }
  ROSTER.forEach((c, i) => {
    const b = SEL.cells[i]; if (!b) return;
    const hot = [0, 1].filter(s => game.sel[s] === i && !(s === 1 && p2Auto())), art = hasArt(i);
    ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip();
    let face = "silhouette";
    if (portraitReady(c.id)) { const im = PORTRAIT_IMG[c.id], [sx, sy, sw, sh] = headRect(im, 1); ctx.drawImage(im, sx, sy, sw, sh, b.x, b.y, b.w, b.h); face = "portrait"; }
    else { drawSilhouetteCard(b.x, b.y, b.w, b.h); ctx.fillStyle = "rgba(20,24,36,.35)"; ctx.fillRect(b.x, b.y, b.w, b.h); }
    st.faces[c.id] = face;
    if (!art) { ctx.fillStyle = "rgba(10,12,20,.5)"; ctx.fillRect(b.x, b.y, b.w, b.h); }
    else if (!hot.length) { ctx.fillStyle = "rgba(4,10,24,.18)"; ctx.fillRect(b.x, b.y, b.w, b.h); }
    const nl = c.name.length > 10 ? twoLines(c.name) : [c.name], sz = Math.min(...nl.map(q => fitFont(q, b.w - 6, 7, 5, "Press Start 2P"))), shh = nl.length * (sz + 3) + 5;
    ctx.fillStyle = "rgba(6,10,22,.82)"; ctx.fillRect(b.x, b.y + b.h - shh, b.w, shh);
    ctx.font = `${sz}px 'Press Start 2P', monospace`; ctx.fillStyle = art ? "#fff" : "#8a92a6"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    nl.forEach((q, k) => ctx.fillText(q, b.x + b.w / 2, b.y + b.h - shh + 3 + k * (sz + 3) + sz / 2));
    ctx.restore();
    ctx.lineWidth = 2; ctx.strokeStyle = "rgba(220,230,255,.35)"; ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
    if (game.mode === "tag") [0, 1].forEach(s => { const n = game.tagPicks[s].indexOf(i); if (n >= 0) {   // TAG pick badges
      const bx = b.x + (s === 0 ? 3 : b.w - 23); ctx.fillStyle = SEL_COL[s]; ctx.fillRect(bx, b.y + 3, 20, 20);
      ctx.font = "11px 'Press Start 2P', monospace"; ctx.fillStyle = "#14223a"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(n + 1), bx + 10, b.y + 14); } });
    hot.forEach(s => {
      ctx.lineWidth = 4; ctx.strokeStyle = SEL_COL[s]; ctx.strokeRect(b.x - 2 + s * 5, b.y - 2 + s * 5, b.w + 4 - s * 10, b.h + 4 - s * 10);
      const tag = s ? "2P" : "1P", tx = s ? b.x + b.w - 24 : b.x - 2; ctx.fillStyle = SEL_COL[s]; ctx.fillRect(tx, b.y - 2, 26, 15);
      ctx.font = "8px 'Press Start 2P', monospace"; ctx.fillStyle = "#14223a"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(tag, tx + 13, b.y + 6);
    });
  });
  // the two sides: tab, glowing floor ring, big breathing fighter (taunt after 4 s), name, show and years
  const FLOOR_Y = 566, BIG = 392;   // BIG = the average fighter; relH scales it (tallest about 445, top clear of the header)
  [0, 1].forEach(s => {
    const cpu = s === 1 && p2Auto(), col = SEL_COL[s], cx = s ? 1095 : 185;
    const ring = ctx.createRadialGradient(cx, FLOOR_Y, 10, cx, FLOOR_Y, 160); ring.addColorStop(0, s ? "rgba(95,216,255,.28)" : "rgba(255,194,26,.28)"); ring.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = ring; ctx.beginPath(); ctx.ellipse(cx, FLOOR_Y, 160, 26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = col; ctx.beginPath(); ctx.ellipse(cx, FLOOR_Y, 152, 24, 0, 0, Math.PI * 2); ctx.stroke();
    const nameAt = (name, sub, yrs) => {
      text(name, cx, 604, fitFont(name, 340, 38, 18, "Bungee"), col);
      if (sub) text(sub, cx, 636, fitFont(sub, 350, 12, 8, "Press Start 2P"), "#fff", "center", "Press Start 2P");
      if (yrs) text(yrs, cx, 655, 10, "#9fb3cc", "center", "Press Start 2P");
    };
    if (cpu) {
      const q = 1 + 0.03 * Math.sin(game.t / 18);
      ctx.save(); ctx.translate(cx, 360); ctx.scale(q, q); text("?", 0, 0, 170, col); ctx.restore();
      nameAt(game.mode === "arcade" ? "8 CITIES" : "CPU PICKS", game.mode === "arcade" ? "The CPU picks your road" : "The CPU picks a show pair");
      st.cards.push({ side: s, cpu: true }); return;
    }
    const c = ROSTER[game.sel[s]], i = game.sel[s];
    const lp = game.selTaunt[s] > 0 ? "taunt" : Math.floor(game.t / 30) % 2 ? "idle_2" : "idle";
    const drawn = hasArt(i) && drawTall(c.id, lp, cx, FLOOR_Y, BIG * relH(c.id), s ? -1 : 1, { breath: true, phase: s * 17 });
    if (!drawn) text("?", cx, 360, 170, "#9aa3b8");
    if (game.ready[s]) { ctx.save(); ctx.globalAlpha = 0.9; text("READY!", cx, 330, 40, col); ctx.restore(); }
    const yrs = showYears(c.show);
    nameAt(c.name, c.show.toUpperCase(), yrs);
    if (game.mode === "tag" && game.tagPicks[s].length) text(game.tagPicks[s].map((ci, n) => `${n + 1} ${ROSTER[ci].name}`).join("   "), cx, 672, 9, "#c9d6ea", "center", "Press Start 2P");
    st.cards.push({ side: s, id: c.id, face: st.faces[c.id], name: c.name, show: c.show, art: !!drawn });
  });
  // the PLAYER ONE / PLAYER TWO tabs ride on top of the big fighters
  [0, 1].forEach(s => {
    const cpu = s === 1 && p2Auto(), cx = s ? 1095 : 185, tab = s === 0 ? "PLAYER ONE" : cpu ? (game.mode === "arcade" ? "OPPONENT" : "CPU TEAM") : "PLAYER TWO";
    ctx.fillStyle = SEL_COL[s]; ctx.fillRect(cx - 98, 118, 196, 26);
    ctx.font = "12px 'Press Start 2P', monospace"; ctx.fillStyle = "#14223a"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(tab, cx, 132);
  });
  // flavor line under the grid: the hovered P1 fighter's first ticker line
  const hov = ROSTER[game.sel[0]], fl = (hov.ticker && hov.ticker[0]) || "";
  ctx.font = "bold 18px 'Trebuchet MS', Arial, sans-serif"; ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  wrapLines(fl, P.w + 40, 2).forEach((l, k) => ctx.fillText(l, W / 2, 600 + k * 24));
  st.flavor = fl;
  // controls bar
  ctx.fillStyle = "rgba(4,10,22,.92)"; ctx.fillRect(0, H - 36, W, 36);
  const bar = p2Auto() ? "BROWSE  STICK / WASD     SELECT  LP / ENTER     BACK  ESC" : "P1  WASD + F     P2  ARROWS + J     BACK  ESC";
  text(bar, W / 2, H - 17, 13, "#ffc21a", "center", "Press Start 2P");
  game.selDraw = st;
}

// ---------- VS loading screen (between select or the arcade map and the fight, VS_LEN frames, START skips): the
// match's stage painting behind (assets/ui/vs_bg.webp, then a gradient, as fallbacks), the game name top left, the
// stage name top center, both fighters sliding in on the stage with their tag partners behind (smaller and dimmer),
// a diamond VS badge slamming in, and dark name plates ("WITH <PARTNER>" in tag, the show in 1 vs 1) ----------
function drawVs() {
  const v = game.vs; if (!v) return;
  const t = v.t, A = ROSTER[v.a], B = ROSTER[v.b], mA = v.mates ? ROSTER[v.mates[0]] : null, mB = v.mates ? ROSTER[v.mates[1]] : null;
  const bg = stageReady(v.stage) ? "stage" : uiReady("vs_bg") ? "vs_bg" : "gradient";
  if (bg === "stage") drawCover(STAGE_IMG[v.stage], 1.03 + 0.03 * Math.min(1, t / VS_LEN), 0, 0);
  else if (bg === "vs_bg") drawCover(UI_IMG.vs_bg, 1.03, 0, 0);
  else { const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, "#1c3c8a"); g.addColorStop(0.5, "#140c1c"); g.addColorStop(1, "#8a1c2a"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  ctx.fillStyle = "rgba(10,8,6,.28)"; ctx.fillRect(0, 0, W, H);
  const top = ctx.createLinearGradient(0, 0, 0, 130); top.addColorStop(0, "rgba(10,8,6,.75)"); top.addColorStop(1, "rgba(10,8,6,0)"); ctx.fillStyle = top; ctx.fillRect(0, 0, W, 130);
  // reel capture: no corner title, no "CPU SHOWCASE", no stage name (one name per beat; the caption names the stage)
  if (!REEL) {
    const name = String(TITLE_PARAM || window.GAME_TITLE || "").toUpperCase();
    text(name, 46, 38, 14, "#ffc21a", "left", "Press Start 2P");
    const leg = game.mode === "arcade" && !game.showcase ? curLeg() : null;
    const right = game.showcase ? "CPU SHOWCASE" : leg ? (leg.final ? "FINAL FIGHT" : `FIGHT ${game.ladderI + 1} / ${game.ladder.length}`) : game.mode === "tag" ? "TAG 2 VS 2" : "VERSUS";
    text(right, W - 46, 38, 13, "#fff", "right", "Press Start 2P");
    const sname = String((STAGES[v.stage] || {}).name || v.stage).toUpperCase();
    text(sname, W / 2, 74, fitFont(sname, 900, 22, 12, "Bungee"), "#fff1c8");
    ctx.fillStyle = "rgba(255,194,26,.55)"; ctx.fillRect(46, 98, W - 92, 2);
  }
  // fighters: partners first (behind, smaller, dimmer), then the point fighters sliding in from the sides
  const kA = ease(t / 16), kB = ease((t - 4) / 16), FL = 574, HB = 400, HM = 336;   // average fighter heights; relH scales each (tallest point fighter about 452, under the rule at y 98)
  const dim = { breath: true, filter: "brightness(0.68) saturate(0.85)" };
  const shadow = (x, w) => { ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.beginPath(); ctx.ellipse(x, FL + 2, w, 14, 0, 0, Math.PI * 2); ctx.fill(); };
  if (mA) { const x = 170 - (1 - kA) * 520; shadow(x, 90); drawTall(mA.id, "idle", x, FL - 6, HM * relH(mA.id), 1, Object.assign({ phase: 9 }, dim)); }
  if (mB) { const x = W - 170 + (1 - kB) * 520; shadow(x, 90); drawTall(mB.id, "idle", x, FL - 6, HM * relH(mB.id), -1, Object.assign({ phase: 23 }, dim)); }
  const xa = (mA ? 400 : 360) - (1 - kA) * 720, xb = W - (mB ? 400 : 360) + (1 - kB) * 720;
  shadow(xa, 120); drawTall(A.id, Math.floor(game.t / 30) % 2 ? "idle_2" : "idle", xa, FL, HB * relH(A.id), 1, { breath: true });
  shadow(xb, 120); drawTall(B.id, Math.floor(game.t / 30) % 2 ? "idle" : "idle_2", xb, FL, HB * relH(B.id), -1, { breath: true, phase: 17 });
  // the VS badge: slams in at frame 16, flashes, then settles
  if (t > 4) {
    const k = ease((t - 4) / 12), sc = 3 - 2 * k, sh = t > 16 && t < 30 ? (Math.random() - 0.5) * (30 - t) * 1.4 : 0;
    ctx.save(); ctx.translate(W / 2 + sh, 372 + sh); ctx.scale(sc, sc); ctx.globalAlpha = Math.min(1, (t - 4) / 6);
    ctx.beginPath(); ctx.moveTo(0, -78); ctx.lineTo(78, 0); ctx.lineTo(0, 78); ctx.lineTo(-78, 0); ctx.closePath();
    ctx.fillStyle = "#1e140a"; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = "#d9b45a"; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -66); ctx.lineTo(66, 0); ctx.lineTo(0, 66); ctx.lineTo(-66, 0); ctx.closePath(); ctx.lineWidth = 2; ctx.strokeStyle = "rgba(217,180,90,.6)"; ctx.stroke();
    text("VS", 0, 4, 54, "#fff1c8"); ctx.restore();
    if (t >= 16 && t < 26) { ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - (t - 16) / 10)})`; ctx.fillRect(0, 0, W, H); }
  }
  // name plates
  const plate = (x, f, mate, k) => {
    if (REEL) { plateReel(x < W / 2 ? 0 : 1, f, k); return; }
    ctx.save(); ctx.globalAlpha = k;
    ctx.fillStyle = "rgba(18,12,8,.9)"; ctx.fillRect(x, 584, 540, 94); ctx.fillStyle = "#ffc21a"; ctx.fillRect(x, 584, 540, 4);
    text(f.name, x + 270, 622, fitFont(f.name, 500, 38, 18, "Bungee"), "#fff1c8");
    const yrs = showYears(f.show), sub = mate ? `WITH ${mate.name}` : f.show.toUpperCase() + (yrs ? ` (${yrs})` : "");
    text(sub, x + 270, 658, fitFont(sub, 500, 13, 7, "Press Start 2P"), "#ffc21a", "center", "Press Start 2P");
    ctx.restore();
  };
  plate(40, A, mA, Math.min(1, Math.max(0, (t - 8) / 10))); plate(W - 580, B, mB, Math.min(1, Math.max(0, (t - 12) / 10)));
  if (!REEL) { ctx.fillStyle = "rgba(255,194,26,.45)"; ctx.fillRect(46, 692, W - 92, 2); }
  if (!REEL && t > VS_SKIP) text(isTouch ? "TAP START: SKIP" : "START: SKIP", W - 46, 708, 9, "#bbb", "right", "Press Start 2P");
  vignette(0.35);
  game.vsDraw = { bg, a: A.id, b: B.id, stage: v.stage, stageName: (STAGES[v.stage] || {}).name || v.stage, mates: v.mates ? [mA.id, mB.id] : null, t };
}

// reel capture VS name plate: the fighter's name only, inside its half of the center window, never under REEL_MIN px
function plateReel(s, f, k) {
  if (!REEL_BANNERS) return;   // ?banners=0 (9:16): the plates sit below the 9:16 window; the caption and name strip carry the names (Video QA R2)
  const x = s === 0 ? REEL_X0 : W / 2 + 6, w = REEL_W / 2 - 6, fit = fitLines(f.name, w - 24, 44, REEL_MIN), lh = Math.round(fit.size * 1.08);
  const h = 22 + fit.lines.length * lh, y = 672 - h;
  ctx.save(); ctx.globalAlpha = k;
  ctx.fillStyle = "rgba(18,12,8,.9)"; ctx.fillRect(x, y, w, h); ctx.fillStyle = "#ffc21a"; ctx.fillRect(x, y, w, 4);
  fit.lines.forEach((l, i) => text(l, x + w / 2, y + 13 + lh / 2 + i * lh, fit.size, "#fff1c8"));
  ctx.restore();
}
// ---------- reel end card (item 16): the logo slams in over the title light rays, the fighters with art line up on
// the floor, and the call to action (game.endText, default "PLAY IT FREE, LINK IN BIO") pulses under the logo ----------
const END_TEXT = "PLAY IT FREE, LINK IN BIO";
function drawEndCard() {
  const t = game.endT || 0; logoFontCheck();
  const g0 = ctx.createLinearGradient(0, 0, 0, H); g0.addColorStop(0, "#2a1450"); g0.addColorStop(1, "#140c1c"); ctx.fillStyle = g0; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, 190); ctx.rotate(t / 300); ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 14; i++) { ctx.rotate(Math.PI * 2 / 14); ctx.fillStyle = i % 2 ? "rgba(255,210,63,.07)" : "rgba(255,120,40,.05)"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1100, -110); ctx.lineTo(1100, 110); ctx.fill(); }
  ctx.restore();
  // static bust row (Todd: no characters moving across the bottom): one square portrait card per fighter with a V3
  // portrait, select-screen style, fading in left to right; nothing walks or rises
  const ids = ROSTER.filter(c => isV3(c.id) && portraitReady(c.id)).map(c => c.id), n = ids.length;
  if (n) {
    // two rows (8 per row at 16 fighters), cards about 130 px, the grid centered between the band bottom (412) and the bottom edge
    const perRow = Math.ceil(n / 2), rows = n > perRow ? 2 : 1, gap = 8, top = 412, avail = H - top;
    const cw = Math.min(130, Math.floor((W - 80 - (perRow - 1) * gap) / perRow), Math.floor((avail - 24 - (rows - 1) * gap) / rows));
    const gh = rows * cw + (rows - 1) * gap, y0 = Math.round(top + (avail - gh) / 2);
    game.endRow = ids.slice();
    ids.forEach((id, i) => {
      const a = Math.max(0, Math.min(1, (t - 30 - i * 2) / 12)); if (a <= 0) return;
      const r = Math.floor(i / perRow), inRow = r < rows - 1 ? perRow : n - perRow * (rows - 1), c = i - r * perRow;
      const rw = inRow * cw + (inRow - 1) * gap, x = Math.round(W / 2 - rw / 2 + c * (cw + gap)), y = y0 + r * (cw + gap);
      ctx.globalAlpha = a;
      ctx.fillStyle = "#0d1b33"; ctx.fillRect(x, y, cw, cw);
      ctx.drawImage(PORTRAIT_IMG[id], x, y, cw, cw);
      ctx.lineWidth = 3; ctx.strokeStyle = "#ffd23f"; ctx.strokeRect(x + 1.5, y + 1.5, cw - 3, cw - 3);
      ctx.globalAlpha = 1;
    });
  }
  const k = ease(t / 20), scale = 3 - 2 * k, shake = t > 18 && t < 34 ? Math.sin(t * 2.7) * (34 - t) * 0.9 : 0;
  drawLogo(W / 2 + shake, 170 + shake, scale * 0.8, Math.min(1, t / 10), ((t - 40) % 240) / 70, t);
  if (t >= 18 && t < 40) { ctx.fillStyle = `rgba(255,255,255,${1 - (t - 18) / 22})`; ctx.fillRect(0, 0, W, H); }
  if (t > 28) {
    const a = Math.min(1, (t - 28) / 14), ps = 1 + 0.04 * Math.sin(t / 8);
    ctx.globalAlpha = a; ctx.fillStyle = "rgba(10,6,20,.82)"; ctx.fillRect(0, 300, W, 112); ctx.fillStyle = "#ffd23f"; ctx.fillRect(0, 300, W, 4); ctx.fillRect(0, 408, W, 4);
    ctx.save(); ctx.translate(W / 2, 358); ctx.scale(ps, ps); text(game.endText || END_TEXT, 0, 0, 52, "#ffd23f"); ctx.restore();
    ctx.globalAlpha = 1;
  }
  scanlines(0.12); vignette(0.4);
}

function drawOverlay() {
  if (!["fight", "endcard", "vs", "select"].includes(game.scene) && !isTouch && !REEL) text("\u26F6 FULL SCREEN (O)", 24, 28, 11, "#bbb", "left", "Press Start 2P");
  if (fsTip > 0) {
    fsTip--; ctx.fillStyle = "rgba(0,0,0,.88)"; ctx.fillRect(W / 2 - 450, H / 2 - 100, 900, 200);
    text("FULL SCREEN ON IPHONE", W / 2, H / 2 - 52, 24, "#ffd23f", "center", "Press Start 2P");
    text("Open this page in Safari, tap Share,", W / 2, H / 2, 16, "#fff", "center", "Press Start 2P");
    text("then Add to Home Screen and launch it there.", W / 2, H / 2 + 38, 16, "#fff", "center", "Press Start 2P");
  }
}
// the round-start (ROUND N / FIGHT!) and round-end (K.O. / <NAME> WINS) banner. Reel capture: both lines fitted inside the
// column and the box recorded for the bubble layout; ?banners=0 hides it (the 9:16 caption carries it)
function drawFightBanner(bn) {
  if (!REEL) { text(bn.text, W / 2, 280, 90, "#ffd23f"); text(bn.sub, W / 2, 370, 36, "#fff"); return; }
  if (!REEL_BANNERS) return;
  const f1 = fitLines(bn.text, REEL_W - 30, 90, 44), f2 = fitLines(bn.sub, REEL_W - 30, 36, REEL_MIN), l2 = Math.round(f2.size * 1.1);
  text(f1.lines[0], W / 2, 280, f1.size, "#ffd23f");
  f2.lines.forEach((l, i) => text(l, W / 2, 370 + i * l2, f2.size, "#fff"));
  const wid = (ls, z) => { ctx.font = `${z}px 'Bungee', Impact, sans-serif`; return Math.max(...ls.map(l => ctx.measureText(l).width)) + z / 7 + 4; };
  const w = Math.max(wid([f1.lines[0]], f1.size), wid(f2.lines, f2.size)), y0 = 280 - f1.size * 0.62, y1 = 370 + (f2.lines.length - 1) * l2 + f2.size * 0.62;
  hudBox("fightBanner", W / 2 - w / 2, y0, w, y1 - y0); reelUi("banner", W / 2 - w / 2, y0, w, y1 - y0);
}
// reel capture result: the stage dims and the winner line (fitted to the column, the team name in Bungee under it) is
// drawn as a banner; ?banners=0 draws neither (the 9:16 caption carries the win)
function drawResultReel() {
  if (!REEL_BANNERS) return;
  ctx.fillStyle = "rgba(10,6,20,.6)"; ctx.fillRect(0, 0, W, H);
  const w = game.result, head = game.teams ? "TEAM WINS!" : `${w.ch.name} WINS!`;
  const f1 = fitLines(head, REEL_W - 30, 80, 44), lh = Math.round(f1.size * 1.05);
  f1.lines.forEach((l, i) => text(l, W / 2, 250 + i * lh - (f1.lines.length - 1) * lh / 2, f1.size, "#ffd23f"));
  let bottom = 250 + (f1.lines.length - 1) * lh / 2 + f1.size * 0.62, tw = 0;
  ctx.font = `${f1.size}px 'Bungee', Impact, sans-serif`; tw = Math.max(...f1.lines.map(l => ctx.measureText(l).width)) + f1.size / 7 + 4;
  if (game.teams) {
    const f2 = fitLines(teamName(w.slot), REEL_W - 30, 40, REEL_MIN); f2.lines.forEach((l, i) => text(l, W / 2, 360 + i * f2.size * 1.1, f2.size, "#fff"));
    ctx.font = `${f2.size}px 'Bungee', Impact, sans-serif`; tw = Math.max(tw, ...f2.lines.map(l => ctx.measureText(l).width + f2.size / 7 + 4));
    bottom = 360 + (f2.lines.length - 1) * f2.size * 1.1 + f2.size * 0.62;
  }
  const top = 250 - (f1.lines.length - 1) * lh / 2 - f1.size * 0.62;
  hudBox("winBanner", W / 2 - tw / 2, top, tw, bottom - top); reelUi("banner", W / 2 - tw / 2, top, tw, bottom - top);
}
function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0); smooth(ctx);
  game.reelUi = [];
  if (game.scene === "boot") { drawBoot(); return; }
  if (game.scene === "title") { drawTitle(); return; }
  if (game.scene === "mode") { drawMode(); return; }
  if (game.scene === "map") { drawMap(); return; }
  if (game.scene === "select") { drawSelect(); return; }
  if (game.scene === "vs") { drawVs(); return; }
  if (game.scene === "endcard") { drawEndCard(); return; }
  if (game.scene === "fight" || game.scene === "result") {
    const sh = game.shake ? (Math.random() - 0.5) * game.shake : 0, pu = reelPush();
    ctx.setTransform(1, 0, 0, 1, sh, sh * 0.5);
    if (pu.s !== 1) { ctx.translate(pu.cx, pu.cy); ctx.scale(pu.s, pu.s); ctx.translate(-pu.cx, -pu.cy); }   // reel result: the slow push
    drawStage(game.stage);
    drawWalker();
    const [p, q] = game.fighters;
    // radial bursts sit behind the fighters
    for (const b of game.bursts) drawBurst(b);
    for (const r of game.runners) { ctx.save(); if (r.state === "ko") ctx.globalAlpha = Math.max(0, 1 - r.fadeT / 30); r.draw(); ctx.restore(); }
    // the attacker draws on top; heavy hits turn both fighters into white silhouettes for 2 frames
    if (game.tagSuper) drawTagSuper(game.tagSuper);
    else (p.state === "attack" ? [q, p] : [p, q]).forEach(f => f.draw(game.silT > 0));
    for (const a of game.assists) if (a) drawAssist(a);   // assist strikers in front of the fighters
    for (const s of game.sparks) { ctx.fillStyle = s.color; ctx.globalAlpha = s.life / 16; ctx.fillRect(s.x - 5, s.y - 5, 10, 10); }
    ctx.globalAlpha = 1;
    if (game.brk && game.brk.t <= BRK_LEN) drawBreakOverlay(game.brk);   // item 12: crack and shatter, inside the shake
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (game.superFreeze > 0 && game.superBy) {
      ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(0, 0, W, H);    // stage at 40 percent
      game.superBy.draw();
    }
    drawHUD();
    if (game.superFreeze > 0 && game.superBy) drawCutIn(game.superBy, MOVES.su2.freeze - game.superFreeze);
    else if (game.tagSuper && game.tagSuper.t <= TS_FREEZE) drawCutIn(game.tagSuper.f, game.tagSuper.t, { total: TS_FREEZE, inF: 6, hold: TS_FREEZE - 12, mate: game.tagSuper.mate });
    else drawFightText();
    if (game.brk && game.brk.t > BRK_LEN && (game.brk.t < brkBannerEnd() || (game.banner && game.banner.brk))) drawBreakBanner(game.brk);
    if (game.banner && !game.banner.brk) {
      if (game.banner.after || !introRunning()) drawFightBanner(game.banner);
      if (!game.banner.after && game.roundLines) drawRoundLines(game.roundLines.lines, game.banner.t);
    }
    if (REEL && game.scene === "result") drawResultReel();   // reel capture: the WINS line is laid out before the bubbles
    drawBubbles();
    drawTicker();
    if (game.scene === "result" && !REEL) {
      ctx.fillStyle = "rgba(10,6,20,.6)"; ctx.fillRect(0, 0, W, H);
      const w = game.result, sc = game.showcase, solo = !sc && (game.mode === "arcade" || (game.mode === "tag" && game.tagCpu));
      const head = solo ? (w.slot === 0 ? "YOU WIN!" : "GAME OVER") : game.teams ? (sc ? "TEAM WINS!" : `P${w.slot + 1} TEAM WINS!`) : `${w.ch.name} WINS!`;
      text(head, W / 2, 260, 80, "#ffd23f");
      if (game.teams) text(teamName(w.slot), W / 2, 350, 22, "#fff", "center", "Press Start 2P");
      if (game.mode === "arcade" && w.slot === 0) text(`${w.ch.name} RUNS THE NEIGHBORHOOD`, W / 2, 350, 22, "#fff", "center", "Press Start 2P");
      if (sc) text(sc.loop ? `NEXT MATCHUP IN ${Math.max(1, Math.ceil((SHOWCASE_NEXT - game.resultT) / 60))}` : (isTouch ? "TAP START: NEXT MATCHUP" : "ENTER: NEXT MATCHUP  ESC: MENU"), W / 2, 450, 22, "#fff", "center", "Press Start 2P");
      else if (game.resultT > 60) text(isTouch ? "TAP START" : "PRESS ENTER", W / 2, 450, 22, "#fff", "center", "Press Start 2P");
    }
  }
}

