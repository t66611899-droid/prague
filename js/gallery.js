/* gallery: צפייה בתמונות, קולאז'ים, כניסה עדינה בגלילה ו"סרטון" של הטיול. קובץ עצמאי, משמש גם את האפליקציה וגם את דף ההורים.
   הכול ב-transform/opacity בלבד, כדי שיישאר חלק בטלפון. */
"use strict";
const Gal = (() => {
  const st = document.createElement("style");
  st.textContent = `
.gc{display:grid;gap:3px;position:relative;overflow:hidden;background:rgba(127,127,127,.12)}
.gc-i{position:relative;overflow:hidden;border:0;padding:0;margin:0;background-color:rgba(127,127,127,.18);background-size:cover;background-position:center;cursor:zoom-in;min-height:0;min-width:0;display:block;width:100%;height:100%;-webkit-tap-highlight-color:transparent}
.gc-i img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .45s ease}
.gc-i img.ld{opacity:1}
.gc-i:active img{transform:scale(.985);transition:transform .15s}
.gc1{aspect-ratio:var(--ar,1.333)}
.gc2{grid-template-columns:1fr 1fr;aspect-ratio:3/2}.gc2.pt{aspect-ratio:4/3}
.gc3{grid-template-columns:2fr 1fr;grid-template-rows:1fr 1fr;aspect-ratio:4/3}.gc3 .gc-i:first-child{grid-row:1/3}
.gc3.ls{grid-template-columns:1fr 1fr;grid-template-rows:2fr 1fr;aspect-ratio:1/1}.gc3.ls .gc-i:first-child{grid-row:auto;grid-column:1/3}
.gc4{grid-template-columns:2.2fr 1fr;grid-template-rows:1fr 1fr 1fr;aspect-ratio:4/3}.gc4 .gc-i:first-child{grid-row:1/4}
.gc4.ls{grid-template-columns:1fr 1fr 1fr;grid-template-rows:2.2fr 1fr;aspect-ratio:1/1}.gc4.ls .gc-i:first-child{grid-row:auto;grid-column:1/4}
.gc-i video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .4s;pointer-events:none}
.gc-i video.on{opacity:1}
.gc-dur{position:absolute;bottom:8px;inset-inline-start:8px;background:rgba(0,0,0,.6);color:#fff;border-radius:11px;padding:3px 9px;font:600 12px/1.5 inherit;pointer-events:none;direction:ltr}
#gv .gv-z video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none;background:transparent}
#gv .gv-play{position:absolute;left:50%;top:50%;width:76px;height:76px;margin:-38px;border-radius:50%;background:rgba(0,0,0,.5);color:#fff;font-size:30px;display:grid;place-items:center;pointer-events:none;opacity:0;transition:opacity .2s;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
#gv .gv-play.show{opacity:1}
.gc-more{position:absolute;bottom:8px;inset-inline-end:8px;background:rgba(0,0,0,.62);color:#fff;border-radius:11px;padding:3px 10px;font:600 13px/1.5 inherit;pointer-events:none}
.rv{opacity:.001;transform:translate3d(0,22px,0) scale(.985)}
.rv.in{opacity:1;transform:none;transition:opacity .55s ease,transform .7s cubic-bezier(.2,.8,.2,1)}
@media (prefers-reduced-motion:reduce){.rv{opacity:1;transform:none}}
#gv{position:fixed;inset:0;z-index:9999;touch-action:none;user-select:none;-webkit-user-select:none;overflow:hidden;direction:ltr;font-family:inherit}
#gv .gv-bg{position:absolute;inset:0;background:#000;opacity:0;transition:opacity .3s ease}
#gv .gv-tr{position:absolute;inset:0;will-change:transform}
#gv .gv-s{position:absolute;top:0;height:100%;display:grid;place-items:center}
#gv .gv-z{position:relative;will-change:transform;transform-origin:50% 50%;background-size:cover;background-position:center;overflow:hidden}
#gv .gv-z img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;opacity:0;transition:opacity .35s;-webkit-user-drag:none;pointer-events:none}
#gv .gv-z img.ld{opacity:1}
#gv .gv-ui{position:absolute;inset:0;pointer-events:none;transition:opacity .25s;color:#fff}
#gv.noui .gv-ui{opacity:0}
#gv .gv-x{position:absolute;top:calc(env(safe-area-inset-top,0px) + 10px);right:12px;width:46px;height:46px;border-radius:50%;border:0;background:rgba(40,40,40,.6);color:#fff;font-size:18px;pointer-events:auto;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
#gv .gv-n{position:absolute;top:calc(env(safe-area-inset-top,0px) + 22px);left:0;right:0;text-align:center;font:600 14px/1 inherit;text-shadow:0 1px 4px rgba(0,0,0,.6);font-variant-numeric:tabular-nums}
#gv .gv-c{position:absolute;left:0;right:0;bottom:0;padding:44px 20px calc(env(safe-area-inset-bottom,0px) + 22px);background:linear-gradient(transparent,rgba(0,0,0,.72));direction:rtl;text-align:start;font-size:15px;line-height:1.45}
#gv .gv-c .vcap{display:block;font-weight:600;font-size:16px;margin-bottom:4px}
#gv .gv-c b{display:block;font-size:13px;font-weight:500;opacity:.8;margin-top:3px}
#gv .gv-c:empty{display:none}
#grp{position:fixed;inset:0;z-index:9990;color:#fff;direction:rtl;font-family:inherit;user-select:none;-webkit-user-select:none;overflow:hidden}
#grp .rp-ph{position:absolute;inset:0;opacity:0;transition:opacity .7s ease;background:#000}
#grp .rp-ph.on{opacity:1}
#grp .rp-ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .9s ease;will-change:transform,opacity}
#grp .rp-ph img.on{opacity:1}
#grp .rp-ph img.kb1{animation:rpkb1 5s linear forwards}#grp .rp-ph img.kb2{animation:rpkb2 5s linear forwards}
@keyframes rpkb1{from{transform:scale(1.03) translate3d(-1%,0,0)}to{transform:scale(1.15) translate3d(1.5%,-1%,0)}}
@keyframes rpkb2{from{transform:scale(1.15) translate3d(1.5%,1%,0)}to{transform:scale(1.03) translate3d(-1%,0,0)}}
#grp.pz .rp-ph img{animation-play-state:paused}
#grp .rp-sh{position:absolute;inset:0;background:linear-gradient(rgba(0,0,0,.5),transparent 22%,transparent 55%,rgba(0,0,0,.78));pointer-events:none}
#grp .rp-bar{position:absolute;top:calc(env(safe-area-inset-top,0px) + 10px);left:12px;right:12px;display:flex;gap:3px;direction:ltr}
#grp .rp-bar i{flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,.3);overflow:hidden}
#grp .rp-bar i b{display:block;height:100%;width:0;background:#fff;transform-origin:left}
#grp .rp-bar i.dn b{width:100%}
#grp .rp-top{position:absolute;top:calc(env(safe-area-inset-top,0px) + 24px);left:14px;right:14px;display:flex;align-items:center;gap:10px;font-weight:600;font-size:15px;text-shadow:0 1px 6px rgba(0,0,0,.6)}
#grp .rp-top span{flex:1}
#grp button{border:0;background:rgba(40,40,40,.55);color:#fff;border-radius:50%;width:44px;height:44px;font-size:16px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
#grp .rp-cap{position:absolute;left:0;right:0;bottom:0;padding:20px 22px calc(env(safe-area-inset-bottom,0px) + 30px);text-shadow:0 1px 8px rgba(0,0,0,.7);pointer-events:none}
#grp .rp-cap>*{transform:translate3d(0,14px,0);opacity:0;transition:transform .6s cubic-bezier(.2,.8,.2,1),opacity .6s}
#grp .rp-cap.on>*{transform:none;opacity:1}
#grp .rp-cap small{display:block;font-size:13px;font-weight:600;letter-spacing:.04em;opacity:.85}
#grp .rp-cap h3{margin:4px 0 0;font-size:28px;line-height:1.15;font-weight:700;letter-spacing:-.01em;color:#fff}
#grp .rp-cap p{margin:8px 0 0;font-size:16px;line-height:1.45;max-width:34ch}
#grp .rp-end{position:absolute;inset:0;display:none;place-items:center;text-align:center;background:rgba(8,10,24,.72);padding:24px}
#grp.end .rp-end{display:grid}
#grp .rp-end h3{font-size:30px;margin:0 0 6px;color:#fff}#grp .rp-end p{margin:0 0 20px;opacity:.85}
#grp .rp-end button{width:auto;height:52px;border-radius:26px;padding:0 24px;font:600 16px inherit;margin:0 5px;background:#fff;color:#111}
#grp .rp-end button+button{background:rgba(255,255,255,.18);color:#fff}`;
  document.head.appendChild(st);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // קפיץ: תנועה פיזיקלית עם מהירות התחלתית (מהאצבע). יש גם שעון ביטחון, אם הדפדפן מאט את האנימציה
  function spring(from, to, v0, onStep, onEnd, k = 320, c = 34) {
    let x = from, v = v0 || 0, last = performance.now(), raf = 0, done = false;
    const fin = () => { if (done) return; done = true; cancelAnimationFrame(raf); clearTimeout(tm); onStep(to); if (onEnd) onEnd(); };
    const tm = setTimeout(fin, 1100);
    const step = now => { if (done) return; const dt = Math.min(0.034, (now - last) / 1000); last = now; v += (-k * (x - to) - c * v) * dt; x += v * dt; if (Math.abs(x - to) < 0.5 && Math.abs(v) < 12) return fin(); onStep(x); raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => { done = true; cancelAnimationFrame(raf); clearTimeout(tm); };
  }
  // תמונות שנטענו: מסירים את הטשטוש (load לא מבעבע, אז מקשיבים בשלב ה-capture)
  document.addEventListener("load", e => { const t = e.target; if (t && t.tagName === "IMG" && (t.closest(".gc-i") || t.closest(".gv-z"))) t.classList.add("ld"); }, true);
  const scan = root => (root || document).querySelectorAll(".gc-i img").forEach(i => { if (i.complete && i.naturalWidth) i.classList.add("ld"); });

  /* קולאז': אחת גדולה / שתיים זו ליד זו / גדולה ועוד שתיים או שלוש, לפי הכמות והכיוון של התמונה הראשונה */
  function collage(imgs, max = 4) {
    const n = Math.min(max, imgs.length); if (!n) return ""; const a0 = imgs[0].ar || 1.333, ls = a0 > 1.2;
    const cls = n === 1 ? "gc1" : n === 2 ? "gc2" + (imgs.slice(0, 2).every(i => (i.ar || 1.3) < 0.95) ? " pt" : "") : (n === 3 ? "gc3" : "gc4") + (ls ? " ls" : "");
    return `<div class="gc ${cls}"${n === 1 ? ` style="--ar:${clamp(a0, 0.8, 1.78).toFixed(3)}"` : ""}>${imgs.slice(0, n).map(i => `<button class="gc-i${i.vid ? " gc-v" : ""}" data-g="${esc(i.gid)}" aria-label="${i.vid ? "לנגן סרטון" : "להגדיל תמונה"}"${i.ph ? ` style="background-image:url(${esc(i.ph)})"` : ""}><img ${i.src ? `src="${esc(i.src)}"` : ""} alt="" loading="lazy" decoding="async">${i.vid ? `<video muted playsinline loop preload="none"${i.vsrc ? ` data-v="${esc(i.vsrc)}"` : ""}></video><span class="gc-dur">▶ ${i.dur ? "0:" + String(Math.round(i.dur)).padStart(2, "0") : ""}</span>` : ""}</button>`).join("")}${imgs.length > n ? `<span class="gc-more">+${imgs.length - n}</span>` : ""}</div>`;
  }
  let apIO = null;
  function autoplay(root) {
    if (!("IntersectionObserver" in window)) return;
    if (!apIO) apIO = new IntersectionObserver(es => es.forEach(x => { const v = x.target;
      if (x.isIntersecting && x.intersectionRatio >= 0.55 && !document.getElementById("gv") && !document.getElementById("grp")) { if (!v.getAttribute("src") && v.dataset.v) v.src = v.dataset.v; if (v.getAttribute("src")) v.play().catch(() => {}); }
      else if (!v.paused) v.pause(); }), { threshold: [0, 0.55, 0.9] });
    (root || document).querySelectorAll(".gc-v video").forEach(v => { if (v._ap) return; v._ap = 1; v.muted = true; v.addEventListener("playing", () => v.classList.add("on")); v.addEventListener("error", () => v.classList.remove("on")); apIO.observe(v); });
  }
  function reveal(root, sel) {
    const els = [...(root || document).querySelectorAll(sel)].filter(e => !e.classList.contains("rv")); if (!els.length) return;
    if (!("IntersectionObserver" in window)) return; els.forEach(e => e.classList.add("rv"));
    const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }), { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    els.forEach(e => io.observe(e));
    setTimeout(() => els.forEach(e => { const r = e.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) e.classList.add("in"); }), 1400);
  }

  /* ---------- צפייה במסך מלא ---------- */
  let V = null;
  function open(items, i0, opts = {}) {
    if (V) close(true); if (!items.length) return;
    const W = innerWidth, H = innerHeight, P = W + 24, root = document.createElement("div"); root.id = "gv";
    root.innerHTML = `<div class="gv-bg"></div><div class="gv-tr">${items.map((it, i) => { const ar = it.ar || 1.333, fw = Math.min(W, H * ar), fh = fw / ar; return `<div class="gv-s" style="left:${i * P}px;width:${W}px"><div class="gv-z" style="width:${fw}px;height:${fh}px${it.thumb ? `;background-image:url(${esc(it.thumb)})` : ""}"><img alt=""></div></div>`; }).join("")}</div>
      <div class="gv-ui"><div class="gv-n"></div><div class="gv-c"></div><button class="gv-x" aria-label="סגור">✕</button></div>`;
    document.body.appendChild(root);
    const tr = root.querySelector(".gv-tr"), bg = root.querySelector(".gv-bg"), zs = [...root.querySelectorAll(".gv-z")];
    V = { root, items, idx: clamp(i0 || 0, 0, items.length - 1), tx: 0, z: { s: 1, x: 0, y: 0 }, opts, stop: null, prevOv: document.documentElement.style.overflow };
    document.documentElement.style.overflow = "hidden";
    const size = i => { const ar = items[i].ar || 1.333, fw = Math.min(W, H * ar); return { fw, fh: fw / ar }; };
    const setTr = x => { V.tx = x; tr.style.transform = `translate3d(${x}px,0,0)`; };
    const setZ = (anim) => { const el = zs[V.idx]; el.style.transition = anim ? "transform .28s cubic-bezier(.2,.8,.2,1)" : "none"; el.style.transform = `translate3d(${V.z.x}px,${V.z.y}px,0) scale(${V.z.s})`; };
    const load = i => { if (i < 0 || i >= items.length) return; const it = items[i], img = zs[i].querySelector("img"); if (it._l) return; it._l = 1;
      if (it.vid) { Promise.resolve(typeof it.load === "function" ? it.load() : it.src).then(u => { if (!u || !V) return; const v = document.createElement("video"); v.playsInline = true; v.setAttribute("playsinline", ""); v.loop = true; v.preload = "auto"; v.src = u;
          v.addEventListener("loadedmetadata", () => { if (!it.ar && v.videoWidth) { it.ar = v.videoWidth / v.videoHeight; const s = size(i); zs[i].style.width = s.fw + "px"; zs[i].style.height = s.fh + "px"; } });
          zs[i].appendChild(v); const pl = document.createElement("div"); pl.className = "gv-play"; pl.textContent = "▶"; zs[i].appendChild(pl);
          v.addEventListener("pause", () => pl.classList.add("show")); v.addEventListener("play", () => pl.classList.remove("show")); if (V && V.idx === i) v.play().catch(() => pl.classList.add("show")); }).catch(() => { it._l = 0; }); return; }
      Promise.resolve(typeof it.load === "function" ? it.load() : it.src).then(u => { if (!u || !V) return; img.onload = () => { img.classList.add("ld"); if (!it.ar && img.naturalWidth) { it.ar = img.naturalWidth / img.naturalHeight; const s = size(i); zs[i].style.width = s.fw + "px"; zs[i].style.height = s.fh + "px"; } }; img.src = u; }).catch(() => { it._l = 0; }); };
    const ui = () => { const it = items[V.idx]; root.querySelector(".gv-n").textContent = items.length > 1 ? `${V.idx + 1} / ${items.length}` : ""; root.querySelector(".gv-c").innerHTML = it.cap || ""; zs.forEach((z, j) => { const v = z.querySelector("video"); if (v) { if (j === V.idx) v.play().catch(() => {}); else v.pause(); } }); load(V.idx); load(V.idx + 1); load(V.idx - 1); if (opts.onChange) opts.onChange(V.idx, it); };
    const thumbOf = i => { const g = items[i].gid; if (!g) return null; const el = document.querySelector(`.gc-i[data-g="${CSS.escape(g)}"]`); if (!el) return null; const r = el.getBoundingClientRect(); return r.width && r.bottom > 0 && r.top < H ? { el, r } : null; };
    const flip = i => { const t = thumbOf(i); if (!t) return null; const { fw, fh } = size(i), r = t.r, sc = Math.max(r.width / fw, r.height / fh), vw = r.width / sc, vh = r.height / sc;
      return { el: t.el, tf: `translate3d(${r.left + r.width / 2 - W / 2}px,${r.top + r.height / 2 - H / 2}px,0) scale(${sc})`, clip: `inset(${Math.max(0, (fh - vh) / 2)}px ${Math.max(0, (fw - vw) / 2)}px round ${12 / sc}px)` }; };
    setTr(-V.idx * P); ui();
    // כניסה: התמונה "גדלה" מהמקום שלה בדף
    const z0 = zs[V.idx], f = flip(V.idx);
    if (f) { z0.style.transition = "none"; z0.style.transform = f.tf; z0.style.clipPath = f.clip; f.el.style.visibility = "hidden"; V.hid = f.el; void z0.offsetWidth; z0.style.transition = "transform .36s cubic-bezier(.2,.85,.25,1),clip-path .36s cubic-bezier(.2,.85,.25,1)"; z0.style.transform = "none"; z0.style.clipPath = "inset(0px 0px round 0px)"; setTimeout(() => { if (V) z0.style.clipPath = ""; }, 400); }
    else { z0.style.transition = "none"; z0.style.transform = "scale(.92)"; z0.style.opacity = "0"; void z0.offsetWidth; z0.style.transition = "transform .3s ease,opacity .3s"; z0.style.transform = "none"; z0.style.opacity = "1"; }
    requestAnimationFrame(() => { bg.style.opacity = "1"; }); setTimeout(() => { bg.style.opacity = "1"; }, 60);
    const go = (n, v0) => { n = clamp(n, 0, items.length - 1); if (V.stop) V.stop(); if (n !== V.idx) { V.z = { s: 1, x: 0, y: 0 }; setZ(true); if (V.hid) { V.hid.style.visibility = ""; V.hid = null; } V.idx = n; ui(); } V.stop = spring(V.tx, -n * P, v0, setTr); };
    V.go = go;
    V.close = (instant) => { if (!V) return; const v = V; V = null; zs.forEach(z => { const vd = z.querySelector("video"); if (vd) { vd.pause(); vd.removeAttribute("src"); vd.load(); } }); removeEventListener("keydown", key); document.documentElement.style.overflow = v.prevOv; if (v.stop) v.stop();
      const end = () => { if (v.hid) v.hid.style.visibility = ""; root.remove(); if (opts.onClose) opts.onClose(v.idx); }; if (instant) return end();
      const z = zs[v.idx], fl = flip(v.idx); root.classList.add("noui"); bg.style.transition = "opacity .3s"; bg.style.opacity = "0";
      if (fl) { if (v.hid && v.hid !== fl.el) v.hid.style.visibility = ""; fl.el.style.visibility = "hidden"; v.hid = fl.el; z.style.transition = "transform .32s cubic-bezier(.3,.8,.3,1),clip-path .32s cubic-bezier(.3,.8,.3,1)"; z.style.clipPath = "inset(0px 0px round 0px)"; void z.offsetWidth; z.style.transform = fl.tf; z.style.clipPath = fl.clip; }
      else { z.style.transition = "transform .26s ease,opacity .26s"; z.style.transform += " scale(.9)"; z.style.opacity = "0"; }
      setTimeout(end, 330); };
    root.querySelector(".gv-x").onclick = e => { e.stopPropagation(); close(); };
    const key = e => { if (e.key === "Escape") close(); else if (e.key === "ArrowLeft") go(V.idx - 1, 0); else if (e.key === "ArrowRight") go(V.idx + 1, 0); }; addEventListener("keydown", key);
    /* מחוות: החלקה בין תמונות, צביטה לזום, גרירה למטה לסגירה, הקשה כפולה */
    const pts = new Map(); let g = null, lastTap = 0, tapT = 0;
    const bounds = () => { const { fw, fh } = size(V.idx); return { mx: Math.max(0, (fw * V.z.s - W) / 2), my: Math.max(0, (fh * V.z.s - H) / 2) }; };
    const startG = () => { const a = [...pts.values()]; if (a.length === 1) g = { m: "", x0: a[0].x, y0: a[0].y, t0: performance.now(), zx: V.z.x, zy: V.z.y, tx: V.tx, sm: [] };
      else if (a.length >= 2) g = { m: "pinch", d0: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1, s0: V.z.s, mx: (a[0].x + a[1].x) / 2, my: (a[0].y + a[1].y) / 2, zx: V.z.x, zy: V.z.y }; };
    root.addEventListener("pointerdown", e => { if (e.target.closest(".gv-x")) return; try { root.setPointerCapture(e.pointerId); } catch (err) {} pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (V.stop) { V.stop(); V.stop = null; } startG(); });
    root.addEventListener("pointermove", e => { if (!pts.has(e.pointerId) || !g || !V) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); const a = [...pts.values()];
      if (g.m === "pinch" && a.length >= 2) { const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), s = clamp(g.s0 * d / g.d0, 0.7, 5), mx = (a[0].x + a[1].x) / 2, my = (a[0].y + a[1].y) / 2, r = s / g.s0;
        V.z = { s, x: mx - W / 2 - (g.mx - W / 2 - g.zx) * r, y: my - H / 2 - (g.my - H / 2 - g.zy) * r }; setZ(false); return; }
      if (a.length !== 1) return; const dx = e.clientX - g.x0, dy = e.clientY - g.y0; g.sm.push({ t: performance.now(), x: e.clientX, y: e.clientY }); if (g.sm.length > 5) g.sm.shift();
      if (!g.m) { if (V.z.s > 1.02) g.m = "pan"; else if (Math.abs(dx) > 8 && Math.abs(dx) >= Math.abs(dy)) g.m = "swipe"; else if (dy > 8 && dy > Math.abs(dx)) g.m = "dismiss"; else if (Math.abs(dy) > 12) g.m = "none"; }
      if (g.m === "swipe") { const edge = (V.idx === 0 && dx > 0) || (V.idx === items.length - 1 && dx < 0); setTr(g.tx + (edge ? dx * 0.32 : dx)); }
      else if (g.m === "dismiss") { const el = zs[V.idx]; el.style.transition = "none"; el.style.transform = `translate3d(${dx * 0.5}px,${dy}px,0) scale(${Math.max(0.55, 1 - dy / 900)})`; bg.style.transition = "none"; bg.style.opacity = String(Math.max(0, 1 - dy / 420)); root.classList.add("noui"); }
      else if (g.m === "pan") { V.z.x = g.zx + dx; V.z.y = g.zy + dy; setZ(false); } });
    const up = e => { if (!pts.has(e.pointerId) || !V) return; pts.delete(e.pointerId); const was = g; if (!was) return;
      if (was.m === "pinch") { if (V.z.s < 1.06) V.z = { s: 1, x: 0, y: 0 }; else { V.z.s = Math.min(V.z.s, 4); const b = bounds(); V.z.x = clamp(V.z.x, -b.mx, b.mx); V.z.y = clamp(V.z.y, -b.my, b.my); } setZ(true); g = null; if (pts.size) startG(); return; }
      if (pts.size) return; g = null; const dx = e.clientX - was.x0, dy = e.clientY - was.y0, s0 = was.sm[0], s1 = was.sm[was.sm.length - 1], dt = s0 && s1 && s1.t > s0.t ? s1.t - s0.t : 0, vx = dt ? (s1.x - s0.x) / dt : 0, vy = dt ? (s1.y - s0.y) / dt : 0;
      if (was.m === "swipe") go(V.idx + (dx < -W * 0.2 || vx < -0.4 ? 1 : dx > W * 0.2 || vx > 0.4 ? -1 : 0), vx * 1000);
      else if (was.m === "dismiss") { if (dy > 110 || vy > 0.55) close(); else { root.classList.remove("noui"); bg.style.transition = "opacity .25s"; bg.style.opacity = "1"; V.z = { s: 1, x: 0, y: 0 }; setZ(true); } }
      else if (was.m === "pan") { const b = bounds(); V.z.x = clamp(V.z.x, -b.mx, b.mx); V.z.y = clamp(V.z.y, -b.my, b.my); setZ(true); }
      else if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && performance.now() - was.t0 < 300) { const now = performance.now(); clearTimeout(tapT);
        if (now - lastTap < 300) { lastTap = 0; if (V.z.s > 1.05) V.z = { s: 1, x: 0, y: 0 }; else { const s = 2.6; V.z = { s, x: (W / 2 - e.clientX) * (s - 1), y: (H / 2 - e.clientY) * (s - 1) }; const b = bounds(); V.z.x = clamp(V.z.x, -b.mx, b.mx); V.z.y = clamp(V.z.y, -b.my, b.my); } setZ(true); }
        else { lastTap = now; const cv = zs[V.idx].querySelector("video"); if (cv) { cv.paused ? cv.play().catch(() => {}) : cv.pause(); return; } tapT = setTimeout(() => { if (V) root.classList.toggle("noui"); }, 310); } } };
    root.addEventListener("pointerup", up); root.addEventListener("pointercancel", up);
    root.addEventListener("wheel", e => { e.preventDefault(); if (Math.abs(e.deltaX) > 30 && !V.stop) go(V.idx + (e.deltaX > 0 ? 1 : -1), 0); }, { passive: false });
  }
  function close(instant) { if (V && V.close) V.close(instant); }

  /* ---------- "סרטון": טיסה על המפה מרגע לרגע, ואז התמונות עם תנועה איטית ---------- */
  let R = null;
  function replay(o) { // o = { map, steps:[{lat,lng,kicker,title,text,imgs:[{thumb,load|src}]}], title, onStep(i), onEnd(), flyMs, photoMs }
    stopReplay(); const steps = o.steps.filter(s => s.lat != null || s.imgs.length); if (!steps.length) return;
    const el = document.createElement("div"); el.id = "grp";
    el.innerHTML = `<div class="rp-ph"><img alt=""><img alt=""></div><div class="rp-sh"></div><div class="rp-bar">${steps.map(() => "<i><b></b></i>").join("")}</div>
      <div class="rp-top"><span>${esc(o.title || "")}</span><button data-a="pz" aria-label="השהה">❚❚</button><button data-a="x" aria-label="סגור">✕</button></div>
      <div class="rp-cap"><small></small><h3></h3><p></p></div><div class="rp-end"><div><h3>${esc(o.endTitle || "סוף")}</h3><p>${esc(o.endText || "")}</p><button data-a="again">▶ שוב</button><button data-a="x">סגור</button></div></div>`;
    document.body.appendChild(el); document.body.classList.add("replay"); if (o.map) setTimeout(() => o.map.resize(), 30);
    const ph = el.querySelector(".rp-ph"), im = [...ph.querySelectorAll("img")], cap = el.querySelector(".rp-cap"), bars = [...el.querySelectorAll(".rp-bar i")];
    const r = R = { el, o, tok: 0, paused: false, i: 0, skip: 0, cur: 0 };
    const wait = ms => new Promise(res => { const tok = r.tok; let left = ms, last = Date.now(); const t = setInterval(() => { const now = Date.now(); if (!r.paused) left -= now - last; last = now; if (R !== r || tok !== r.tok || left <= 0) { clearInterval(t); res(R === r && tok === r.tok); } }, 60); });
    const fill = (i, ms) => { bars.forEach((b, j) => { b.classList.toggle("dn", j < i); if (j >= i) { b.firstChild.style.transition = "none"; b.firstChild.style.width = "0"; } }); const b = bars[i] && bars[i].firstChild; if (b) { void b.offsetWidth; b.style.transition = `width ${ms}ms linear`; b.style.width = "100%"; } };
    const showImg = async (img) => { let u = ""; try { u = await Promise.resolve(typeof img.load === "function" ? img.load() : img.src); } catch (e) {} if (R !== r) return; const a = im[r.cur ^= 1], b = im[r.cur ^ 1];
      a.className = ""; a.src = u || img.thumb || ""; void a.offsetWidth; a.className = "on " + (r.cur ? "kb1" : "kb2"); b.classList.remove("on"); };
    async function run(from) {
      const tok = ++r.tok; el.classList.remove("end");
      for (let i = from; i < steps.length; i++) { r.i = i; const s = steps[i], pm = o.photoMs || 3400, fm = s.lat != null && o.map ? (o.flyMs || 2600) : 0, total = fm + Math.max(1, s.imgs.length) * pm + 300; fill(i, total);
        ph.classList.remove("on"); cap.classList.remove("on"); if (o.onStep) o.onStep(i, s);
        if (fm) { try { o.map.flyTo({ center: [s.lng, s.lat], zoom: o.zoom || 15.4, pitch: o.pitch == null ? 52 : o.pitch, bearing: (i * 37) % 70 - 35, duration: fm - 300, essential: true, curve: 1.3 }); } catch (e) {} }
        if (!(await wait(fm ? 500 : 50)) || tok !== r.tok) return; cap.querySelector("small").textContent = s.kicker || ""; cap.querySelector("h3").textContent = s.title || ""; cap.querySelector("p").textContent = ""; cap.classList.add("on");
        if (fm && (!(await wait(fm - 500)) || tok !== r.tok)) return;
        if (s.imgs.length) { cap.querySelector("p").textContent = s.text || ""; for (const img of s.imgs) { await showImg(img); ph.classList.add("on"); if (!(await wait(pm)) || tok !== r.tok) return; } }
        else { cap.querySelector("p").textContent = s.text || ""; if (!(await wait(pm)) || tok !== r.tok) return; }
        if (!(await wait(300)) || tok !== r.tok) return; }
      bars.forEach(b => b.classList.add("dn")); ph.classList.remove("on"); cap.classList.remove("on"); el.classList.add("end"); if (o.onEnd) o.onEnd();
    }
    el.addEventListener("click", e => { const a = e.target.closest("[data-a]"); if (a) { const k = a.dataset.a; if (k === "x") stopReplay(); else if (k === "again") run(0); else if (k === "pz") { r.paused = !r.paused; el.classList.toggle("pz", r.paused); a.textContent = r.paused ? "▶" : "❚❚"; bars.forEach(b => { if (r.paused) { const w = getComputedStyle(b.firstChild).width; b.firstChild.style.transition = "none"; b.firstChild.style.width = w; } }); } return; }
      if (el.classList.contains("end")) return; const left = e.clientX < innerWidth * 0.33; run(clamp(r.i + (left ? -1 : 1), 0, steps.length - 1)); });
    run(0);
  }
  function stopReplay() { if (!R) return; const r = R; R = null; r.tok++; r.el.remove(); document.body.classList.remove("replay"); if (r.o.map) setTimeout(() => r.o.map.resize(), 30); if (r.o.onClose) r.o.onClose(); }
  return { open, close, collage, reveal, scan, replay, stopReplay, spring, autoplay };
})();
