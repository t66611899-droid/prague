/* tkview: פתיחת הכרטיסים בתוך האפליקציה, במסך מלא, גם בלי אינטרנט.
   למה: ב-Chrome באייפון קישור blob: של PDF בחלון חדש לא נפתח באמינות. עכשיו:
   • PDF: מרונדר לתמונה בתוך האפליקציה (pdf.js, שמור עם האפליקציה) ונשמר בטלפון אחרי הפעם הראשונה (מתחיל כבר ברקע אחרי העלייה).
   • QR: מזוהה בעמוד ומוצג גדול וחד על רקע לבן. התצוגה היא הגדלה של אותו קובץ בדיוק, בלי לשנות, לחתוך את הקוד או לדחוס אותו.
   • תמונת QR: מוגדלת בלי טשטוש (פיקסלים חדים). זום בצביטה ובנגיעה כפולה.
   • כרטיס Wallet (.pkpass): "שתף / הוסף ל-Wallet", ומעבר לתמונת ה-QR של אותו כרטיס.
   • לכל כרטיס: "שמור ל-Files / שתף" כגיבוי.
   • הרשימה לפי תאריך, מלון וביטוח בנפרד למטה, וביום של אירוע הכרטיס שלו ראשון עם "📍 היום".
   לא נוגע בקבצים המקוריים: תמונות התצוגה נשמרות בנפרד (tkpg:/tkqr:), לא נכנסות לגיבוי, ושום דבר לא נמחק.
   מוגן: אם משהו כאן נכשל, נשאר המסך הקודם. */
"use strict";
(function () {
try {
const V = (() => { try { return new URL(document.currentScript.src).searchParams.get("v") || ""; } catch (e) { return ""; } })();
const load = src => new Promise((res, rej) => { const s = document.createElement("script"); s.src = src + (V ? "?v=" + V : ""); s.onload = res; s.onerror = () => rej(new Error("load " + src)); document.head.appendChild(s); });
let pdfP = null, qrP = null;
/* ה-worker נטען דרך fetch רגיל (שעובר במטמון של האפליקציה, גם בלי רשת) והופך ל-blob, כדי שלא יהיה תלוי באיך הדפדפן טוען workers */
const pdfjs = () => pdfP || (pdfP = (window.pdfjsLib ? Promise.resolve() : load("vendor/pdf.min.js")).then(async () => { let src = "vendor/pdf.worker.min.js" + (V ? "?v=" + V : ""); try { const r = await fetch(src); if (r.ok) src = URL.createObjectURL(new Blob([await r.text()], { type: "text/javascript" })); } catch (e) {} pdfjsLib.GlobalWorkerOptions.workerSrc = src; return pdfjsLib; }).catch(e => { pdfP = null; throw e; }));
const jsqr = () => qrP || (qrP = (window.jsQR ? Promise.resolve() : load("vendor/jsQR.js")).then(() => window.jsQR).catch(e => { qrP = null; throw e; }));
const kindOf = (f, blob) => { const n = (f.name || "").toLowerCase(), t = (blob && blob.type) || ""; if (/pkpass/.test(t) || /\.pkpass$/.test(n)) return "pass"; if (/pdf/.test(t) || /\.pdf$/.test(n) || (f.pdf && !/image/.test(t))) return "pdf"; return "img"; };
const toBlob = c => new Promise(r => c.toBlob(b => r(b), "image/png"));

/* קווי שיער לבנים בין ריבועים שחורים (תוצר של הרינדור כשכל ריבוע ב-PDF מצויר בנפרד) נסגרים. ריבוע לבן אמיתי רחב מ-2 פיקסלים בהרבה ולא נוגעים בו, כך שהקוד עצמו לא משתנה. */
function seams(cv) { try { const x = cv.getContext("2d"), W = cv.width, H = cv.height, im = x.getImageData(0, 0, W, H), d = im.data, L = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) L[i] = (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) < 140 ? 1 : 0;
  const dark = (X, Y) => X >= 0 && Y >= 0 && X < W && Y < H && L[Y * W + X] === 1, out = new Uint8Array(L);
  for (let y = 0; y < H; y++) for (let X = 0; X < W; X++) { if (L[y * W + X]) continue;
    if ((dark(X - 1, y) && (dark(X + 1, y) || dark(X + 2, y))) || (dark(X - 2, y) && dark(X + 1, y)) || (dark(X, y - 1) && (dark(X, y + 1) || dark(X, y + 2))) || (dark(X, y - 2) && dark(X, y + 1))) out[y * W + X] = 1; }
  for (let i = 0; i < W * H; i++) { const v = out[i] ? 0 : 255; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; } x.putImageData(im, 0, 0); } catch (e) {} }

/* ---------- PDF → תמונות (פעם אחת, ואז מהטלפון) ---------- */
async function pdfPages(id, blob) {
  const meta = await imgGet("tkpg:" + id + ":n").catch(() => null);
  if (meta && meta.n) { const out = []; for (let i = 0; i < meta.n; i++) { const b = await imgGet(`tkpg:${id}:${i}`).catch(() => null); if (!b) { out.length = 0; break; } out.push(b); } if (out.length) return { pages: out, qr: meta.qr || null }; }
  const lib = await pdfjs(), doc = await lib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false }).promise, pages = []; let qr = null;
  const n = Math.min(doc.numPages, 12);
  for (let i = 1; i <= n; i++) {
    const pg = await doc.getPage(i), vp0 = pg.getViewport({ scale: 1 }), scale = Math.min(4, 2200 / vp0.width), vp = pg.getViewport({ scale }), c = document.createElement("canvas");
    c.width = Math.round(vp.width); c.height = Math.round(vp.height); const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
    await pg.render({ canvasContext: x, viewport: vp }).promise;
    if (!qr) { try { const J = await jsqr(), k = Math.min(1, 1100 / c.width), sw = Math.round(c.width * k), sh = Math.round(c.height * k), s = document.createElement("canvas"); s.width = sw; s.height = sh; const sx = s.getContext("2d"); sx.drawImage(c, 0, 0, sw, sh); const d = sx.getImageData(0, 0, sw, sh), hit = J(d.data, sw, sh, { inversionAttempts: "dontInvert" });
        if (hit && hit.data) { const L = hit.location, xs = [L.topLeftCorner.x, L.topRightCorner.x, L.bottomLeftCorner.x, L.bottomRightCorner.x].map(v => v / k), ys = [L.topLeftCorner.y, L.topRightCorner.y, L.bottomLeftCorner.y, L.bottomRightCorner.y].map(v => v / k), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), m = (x1 - x0) * 0.18;
          const cx0 = Math.max(0, Math.floor(x0 - m)), cy0 = Math.max(0, Math.floor(y0 - m)), cw = Math.min(c.width, Math.ceil(x1 + m)) - cx0, ch = Math.min(c.height, Math.ceil(y1 + m)) - cy0, q = document.createElement("canvas");
          /* ה-QR מרונדר שוב מהקובץ עצמו (וקטורי) ברזולוציה גבוהה, רק באזור שלו: חד בלי שום הגדלה של פיקסלים */
          const f = Math.max(1, Math.min(8, 1400 / cw)), qv = pg.getViewport({ scale: scale * f, offsetX: -cx0 * f, offsetY: -cy0 * f }); q.width = Math.round(cw * f); q.height = Math.round(ch * f); const qx = q.getContext("2d"); qx.fillStyle = "#fff"; qx.fillRect(0, 0, q.width, q.height);
          try { await pg.render({ canvasContext: qx, viewport: qv }).promise; } catch (e) { q.width = cw; q.height = ch; q.getContext("2d").drawImage(c, cx0, cy0, cw, ch, 0, 0, cw, ch); }
          seams(q);
          qr = { page: i - 1, blob: await toBlob(q) }; } } catch (e) {} }
    pages.push(await toBlob(c)); c.width = c.height = 0;
  }
  try { for (let i = 0; i < pages.length; i++) await imgPut(`tkpg:${id}:${i}`, pages[i]); await imgPut("tkpg:" + id + ":n", { n: pages.length, qr: qr ? { page: qr.page } : null }); if (qr) await imgPut("tkqr:" + id, qr.blob); } catch (e) {}
  return { pages, qr: qr ? { page: qr.page } : null };
}

/* ---------- זום בצביטה ובנגיעה כפולה ---------- */
function zoomable(el) {
  let s = 1, x = 0, y = 0, d0 = 0, s0 = 1, p0 = null, x0 = 0, y0 = 0, lastTap = 0;
  const apply = () => { el.style.transform = `translate(${x}px,${y}px) scale(${s})`; };
  const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  el.addEventListener("touchstart", e => { if (e.touches.length === 2) { d0 = dist(e.touches); s0 = s; } else if (e.touches.length === 1) { p0 = [e.touches[0].clientX, e.touches[0].clientY]; x0 = x; y0 = y; const now = Date.now(); if (now - lastTap < 300) { s = s > 1 ? 1 : 2.5; if (s === 1) x = y = 0; apply(); } lastTap = now; } }, { passive: true });
  el.addEventListener("touchmove", e => { if (e.touches.length === 2 && d0) { e.preventDefault(); s = Math.max(1, Math.min(6, s0 * dist(e.touches) / d0)); apply(); } else if (e.touches.length === 1 && s > 1 && p0) { e.preventDefault(); x = x0 + e.touches[0].clientX - p0[0]; y = y0 + e.touches[0].clientY - p0[1]; apply(); } }, { passive: false });
  el.addEventListener("touchend", () => { d0 = 0; if (s <= 1.02) { s = 1; x = y = 0; apply(); } }, { passive: true });
}

/* ---------- שמירה / שיתוף ---------- */
async function shareFile(f, blob) {
  const name = /\.[a-z0-9]{2,6}$/i.test(f.name || "") ? f.name : (f.name || "כרטיס") + (/pdf/.test(blob.type) ? ".pdf" : /pkpass/.test(blob.type) ? ".pkpass" : /png/.test(blob.type) ? ".png" : ".jpg");
  try { const file = new File([blob], name, { type: blob.type || "application/octet-stream" }); if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
  try { const u = URL.createObjectURL(blob), a = document.createElement("a"); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000); toast("אם לא נפתח חלון שמירה: ⋯ ← שתף ← שמור בקבצים", 4200); } catch (e) { toast("הדפדפן הזה לא מאפשר לשמור מכאן"); }
}

/* ---------- המסך ---------- */
let urls = [], lock = null;
const freeUrls = () => { urls.forEach(u => { try { URL.revokeObjectURL(u); } catch (e) {} }); urls = []; };
const U = b => { const u = URL.createObjectURL(b); urls.push(u); return u; };
function closeView() { const v = $("#tkView"); if (v) { v.hidden = true; v.innerHTML = ""; } freeUrls(); if (lock) { lock.release().catch(() => {}); lock = null; } }
async function showTicket(k, id) {
  const e = TIX_EV.find(x => x.k === k) || { ic: "🎟️", n: "כרטיס" }, fs = tix[k] || [], f = fs.find(x => x.id === id) || fs[0]; if (!f) return openTickets(k);
  let blob = null; try { blob = await imgGet("tk:" + f.id); } catch (err) {}
  if (!blob) return toast("הקובץ לא נמצא בטלפון. צריך לשלוח אותו שוב", 4200);
  try { closeModal(); } catch (err) {}
  let v = $("#tkView"); if (!v) { v = document.createElement("div"); v.id = "tkView"; document.body.appendChild(v); }
  freeUrls(); const kind = kindOf(f, blob), i = fs.indexOf(f), nx = fs.length > 1 ? fs[(i + 1) % fs.length] : null;
  v.className = "tv"; v.setAttribute("role", "dialog"); v.setAttribute("aria-label", e.n);
  v.innerHTML = `<header><div><b>${e.ic} ${esc(e.n)}</b><small>${esc(f.name || "")}${fs.length > 1 ? ` · ${i + 1}/${fs.length}` : ""}</small></div><button class="tv-x" aria-label="סגור">✕</button></header>
    <div class="tv-body" data-pinch><p class="tv-wait">פותח…</p></div>
    <footer><p class="tv-tip">☀️ תגביר את בהירות המסך · תעודה מזהה ביד</p><div class="tv-b"><button class="tv-sh">📤 שמור ל-Files / שתף</button>${nx ? `<button class="tv-nx">הבא ←</button>` : ""}<button class="tv-back">כל הכרטיסים</button></div></footer>`;
  v.hidden = false; try { if (navigator.wakeLock) lock = await navigator.wakeLock.request("screen"); } catch (err) {}
  v.querySelector(".tv-x").onclick = closeView; v.querySelector(".tv-back").onclick = () => { closeView(); openTickets(k); };
  v.querySelector(".tv-sh").onclick = () => shareFile(f, blob); const nb = v.querySelector(".tv-nx"); if (nb) nb.onclick = () => showTicket(k, nx.id);
  const body = v.querySelector(".tv-body");
  try {
    if (kind === "img") { body.innerHTML = `<div class="tv-z tv-qr"><img src="${U(blob)}" alt="הכרטיס"></div>`; const im = body.querySelector("img"); im.onload = () => { if (Math.max(im.naturalWidth, im.naturalHeight) < 900) im.classList.add("px"); }; zoomable(body.querySelector(".tv-z")); }
    else if (kind === "pass") { const qrSib = fs.find(x => x !== f && kindOf(x, null) === "img");
      body.innerHTML = `<div class="tv-pass"><span>🎫</span><b>כרטיס Apple Wallet</b><p>ה-QR של הכרטיס הזה ${qrSib ? "נמצא גם כתמונה כאן, לסריקה ישירה מהמסך" : "נמצא בתוך הכרטיס של Wallet"}.</p>${qrSib ? `<button class="btn pri wide tv-toqr">🔳 להציג את ה-QR</button>` : ""}<button class="btn wide tv-wallet">➕ להוסיף ל-Wallet / לשתף</button></div>`;
      const tq = body.querySelector(".tv-toqr"); if (tq) tq.onclick = () => showTicket(k, qrSib.id); body.querySelector(".tv-wallet").onclick = () => shareFile(f, blob); }
    else { const r = await pdfPages(f.id, blob); if ($("#tkView") !== v || v.hidden) return; let qrB = null; if (r.qr) qrB = await imgGet("tkqr:" + f.id).catch(() => null);
      body.innerHTML = `${qrB ? `<div class="tv-z tv-qr"><img src="${U(qrB)}" alt="QR מתוך הכרטיס"></div><p class="tv-note">ה-QR מתוך הקובץ, מוגדל. למטה הכרטיס המלא.</p>` : ""}<div class="tv-z tv-pages">${r.pages.map((b, j) => `<img src="${U(b)}" alt="עמוד ${j + 1}">`).join("")}</div>`;
      body.querySelectorAll(".tv-z").forEach(zoomable); }
  } catch (err) { body.innerHTML = `<div class="tv-pass"><span>⚠️</span><b>לא הצלחתי להציג את הקובץ כאן</b><p>הקובץ עצמו שמור בטלפון. אפשר לפתוח אותו מבחוץ:</p><button class="btn pri wide tv-out">📤 לפתוח / לשמור ל-Files</button></div>`; body.querySelector(".tv-out").onclick = () => shareFile(f, blob); }
}
window.showTicket = showTicket;

/* ---------- סדר הרשימה: לפי תאריך, מלון וביטוח למטה, "📍 היום" ראשון ---------- */
try { const ORDER = ["fl1", "boat", "dup1", "epic", "dup2", "fl2", "hot", "ins"]; TIX_EV.sort((a, b) => ORDER.indexOf(a.k) - ORDER.indexOf(b.k)); } catch (e) {}
window.openTickets = (old => function () {
  const r = old.apply(this, arguments);
  try { const box = $("#mbody .tix"); if (!box) return r; const today = dstr(wall());
    const hot = box.querySelector('.tk[data-k="hot"]'); if (hot && !box.querySelector(".tk-sep")) hot.insertAdjacentHTML("beforebegin", `<h3 class="tk-sep">🏨 מלון וביטוח</h3>`);
    TIX_EV.filter(x => x.date === today && x.k !== "hot" && x.k !== "ins").reverse().forEach(x => { const s = box.querySelector(`.tk[data-k="${x.k}"]`); if (!s) return; box.prepend(s); const h = s.querySelector("header"); if (h && !h.querySelector(".tk-today")) h.insertAdjacentHTML("beforeend", `<i class="tk-today">📍 היום</i>`); });
    const tip = [...$$("#mbody p.fine")].pop(); if (tip && /טיפ/.test(tip.textContent)) tip.textContent = "נגיעה בכרטיס פותחת אותו כאן במסך מלא, גם בלי אינטרנט. בכניסה צריך גם תעודה מזהה פיזית.";
    $$("#mbody .tk-i small").forEach(s => { if (s.textContent === "PDF") s.textContent = "PDF · נפתח כאן"; });
  } catch (e) {}
  return r;
})(window.openTickets);

/* ---------- ברקע אחרי העלייה: מכינים את כל ה-PDF כתמונות, כדי שגם הפתיחה הראשונה תהיה מיידית ובלי רשת ---------- */
async function warm() { try { for (const [k, list] of Object.entries(tix || {})) for (const f of list || []) { if ($("#tkView") && !$("#tkView").hidden) return; const b = await imgGet("tk:" + f.id).catch(() => null); if (b && kindOf(f, b) === "pdf") { const m = await imgGet("tkpg:" + f.id + ":n").catch(() => null); if (!m) await pdfPages(f.id, b).catch(() => {}); } } } catch (e) {} }
const kick = () => { if (!window.__booted) return setTimeout(kick, 3000); (window.requestIdleCallback || (f => setTimeout(f, 200)))(() => warm()); }; setTimeout(kick, 12000);
window.__tkWarm = warm;

(() => { const s = document.createElement("style"); s.textContent = `
#tkView.tv{display:flex;flex-direction:column;background:#fff;color:#111}
#tkView.tv[hidden]{display:none}
#tkView.tv header{display:flex;align-items:center;gap:10px;padding:calc(env(safe-area-inset-top,0px) + 10px) 14px 8px;border-bottom:1px solid #eee}
#tkView.tv header div{flex:1;min-width:0}#tkView.tv header b{display:block;font-size:1.02rem}#tkView.tv header small{display:block;color:#555;font-size:.82rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#tkView.tv .tv-x{flex:none;width:48px;height:48px;border-radius:50%;border:0;background:#eee;color:#111;font-size:1.1rem}
#tkView.tv .tv-body{flex:1;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;background:#fff;padding:12px 10px;touch-action:pan-y}
#tkView.tv .tv-z{transform-origin:center top;will-change:transform}
#tkView.tv .tv-qr{display:flex;justify-content:center;padding:10px 0}
#tkView.tv .tv-qr img{width:min(86vw,520px);height:auto;background:#fff;object-fit:contain;padding:0;flex:none}
#tkView.tv img.px{image-rendering:pixelated;image-rendering:crisp-edges}
#tkView.tv .tv-pages img{display:block;width:100%;height:auto;margin:0 0 10px;box-shadow:0 0 0 1px #e6e6e6;padding:0;flex:none}
#tkView.tv .tv-note{text-align:center;color:#555;font-size:.85rem;margin:0 0 12px}
#tkView.tv .tv-wait{text-align:center;color:#555;margin-top:30vh}
#tkView.tv .tv-pass{text-align:center;padding:30px 16px;display:flex;flex-direction:column;gap:10px;align-items:stretch}#tkView.tv .tv-pass span{font-size:3rem}#tkView.tv .tv-pass b{font-size:1.2rem}#tkView.tv .tv-pass p{margin:0;color:#444}
#tkView.tv footer{padding:8px 12px calc(env(safe-area-inset-bottom,0px) + 12px);border-top:1px solid #eee;display:flex;flex-direction:column;gap:8px}
#tkView.tv .tv-tip{margin:0;text-align:center;color:#333;font-size:.88rem;font-weight:600}
#tkView.tv .tv-b{display:flex;gap:8px}#tkView.tv .tv-b button{flex:1;min-height:50px;border:0;border-radius:14px;background:#111;color:#fff;font:600 .92rem Rubik,system-ui,sans-serif}
#tkView.tv .tv-b .tv-back{background:#eee;color:#111}
.tk-sep{margin:18px 2px 6px;font-size:.92rem;color:var(--mut);font-weight:600}
.tk-today{margin-inline-start:auto;font-style:normal;background:#e8a317;color:#14161b;font-weight:700;font-size:.78rem;border-radius:10px;padding:4px 8px;white-space:nowrap}
`; document.head.appendChild(s); })();
(window.__mods = window.__mods || {}).tkview = "ok";
} catch (err) { try { (window.__mods = window.__mods || {}).tkview = "fail: " + (err && err.message || err); } catch (e) {} }
})();
