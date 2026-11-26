/* feel: שהאפליקציה תרגיש כמו אפליקציה מה-App Store.
   • בלי זום של הדף (צביטה / הקשה כפולה) — רק המפה וצפיית התמונות זזות.
   • תגובה מיידית ללחיצה (:active עובד באייפון), רטט אמיתי באייפון (מתג iOS), ובלי "נגיעות תקועות".
   • חלונות מלמטה: נפתחים עם קפיץ, נסגרים בגרירה למטה, ומעבר רך כשחלון מחליף חלון.
   • כיוון טקסט: מספרים, טלפונים, טווחי שעות ושמות לועזיים בתוך עברית מקבלים <bdi dir="ltr"> אוטומטית, כדי שלא יתהפכו.
   • "🐞 דווח על באג": המסך הנוכחי, הגרסה, 20 הפעולות האחרונות והשגיאות — לשליחה בלחיצה. */
"use strict";
(function () {
try {
/* ---------- זום ומגע ---------- */
const pinchOK = t => !!(t && t.closest && t.closest("#map, #gv, [data-pinch]"));
["gesturestart", "gesturechange", "gestureend"].forEach(ev => document.addEventListener(ev, e => { if (!pinchOK(e.target)) e.preventDefault(); }, { passive: false }));
/* :active עובד באייפון רק אם יש מאזין touchstart */
document.addEventListener("touchstart", () => {}, { passive: true });

/* ---------- רטט באייפון: מתג iOS נסתר (iOS 18+) נותן משוב הפטי אמיתי ---------- */
let hl = null, lastH = 0;
window.__haptic = () => {
  const now = Date.now(); if (now - lastH < 45) return; lastH = now;
  const a = document.activeElement; if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return; /* לא סוגרים מקלדת בגלל רטט */
  try { if (!hl) { hl = document.createElement("label"); hl.setAttribute("aria-hidden", "true"); hl.style.cssText = "position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none"; const i = document.createElement("input"); i.type = "checkbox"; i.setAttribute("switch", ""); i.tabIndex = -1; hl.appendChild(i); document.body.appendChild(hl); } hl.click(); } catch (e) {}
};
/* רטט קטן בלחיצות חשובות */
document.addEventListener("click", e => { const b = e.target.closest(".btn.pri, .nx-go, #sos, .tbtn.sos, .fab, .cd-go, .go, [data-hr], .arr-code"); if (b && typeof buzz === "function") buzz(8); }, true);

/* ---------- חלונות מלמטה: קפיץ, גרירה לסגירה, ומעבר רך בין חלונות ---------- */
const mbox = document.getElementById("mbox"), modal = document.getElementById("modal");
if (mbox && modal) {
  const swap = () => { const b = document.getElementById("mbody"); if (!b) return; b.classList.remove("swap"); void b.offsetWidth; b.classList.add("swap"); };
  if (typeof window.openModal === "function") window.openModal = (old => function () { const was = modal.classList.contains("show") && !modal.hidden; const r = old.apply(this, arguments); if (was) swap(); mbox.style.transform = ""; trackScreen(); return r; })(window.openModal);
  let y0 = null, dy = 0, t0 = 0, dragging = false;
  mbox.addEventListener("touchstart", e => { if (e.touches.length !== 1 || e.target.closest("input,textarea,select,[contenteditable],.no-drag,canvas,.chips,.seg,[data-pinch]")) { y0 = null; return; } y0 = e.touches[0].clientY; dy = 0; t0 = Date.now(); dragging = false; }, { passive: true });
  mbox.addEventListener("touchmove", e => {
    if (y0 == null) return; const d = e.touches[0].clientY - y0;
    if (!dragging) { if (d > 8 && mbox.scrollTop <= 0) { dragging = true; mbox.classList.add("drag"); } else if (d < -4 || mbox.scrollTop > 0) { y0 = null; return; } else return; }
    if (e.cancelable) e.preventDefault(); dy = Math.max(0, d); mbox.style.transform = `translateY(${dy}px)`;
    const bk = document.getElementById("mback"); if (bk) bk.style.opacity = String(Math.max(0.15, 1 - dy / 500));
  }, { passive: false });
  const end = () => {
    if (y0 == null) return; y0 = null; if (!dragging) return; dragging = false; mbox.classList.remove("drag");
    const v = dy / Math.max(1, Date.now() - t0), bk = document.getElementById("mback"); if (bk) bk.style.opacity = "";
    if (dy > 120 || (v > 0.55 && dy > 40)) { mbox.style.transform = `translateY(${mbox.offsetHeight + 40}px)`; buzz && buzz(6); setTimeout(() => { (window.__modalBack || closeModal)(); setTimeout(() => { mbox.style.transform = ""; }, 300); }, 160); }
    else mbox.style.transform = "";
  };
  mbox.addEventListener("touchend", end); mbox.addEventListener("touchcancel", end);
}

/* ---------- כיוון טקסט: מספרים ושמות לועזיים לא מתהפכים בתוך עברית ---------- */
const RISKY = /(?:[+−-]\s?\d[\d\s.,:\/–-]*\d|\d[\d.,:]*\s?[–—-]\s?\d[\d.,:]*|\d{2,}(?:[\s -]\d{2,}){1,}|[+−-]\d+(?:[.,]\d+)?\s?°?|[A-Za-zÀ-ſ][A-Za-zÀ-ſ0-9 .'’&]*(?:[(/:+]|\d)[A-Za-zÀ-ſ0-9 .'’&()\/:+#-]*[A-Za-zÀ-ſ0-9)])/g;
const SKIP = "script,style,textarea,input,select,svg,canvas,code,pre,bdi,[dir=ltr],[contenteditable],#intro,#teaser,#cine,#gv,.maplibregl-map,.nobidi";
const HEB = /[֐-׿]/;
function fixText(tn) {
  const s = tn.nodeValue; if (!s || s.length < 3 || !/\d|[A-Za-z]/.test(s)) return;
  const p = tn.parentElement; if (!p || p.closest(SKIP)) return;
  const ctxRtl = HEB.test(p.textContent || "") || getComputedStyle(p).direction === "rtl"; if (!ctxRtl) return;
  RISKY.lastIndex = 0; if (!RISKY.test(s)) return; RISKY.lastIndex = 0;
  const frag = document.createDocumentFragment(); let last = 0, m;
  while ((m = RISKY.exec(s))) { let run = m[0].trimEnd(), at = m.index;
    if (/^[+\u2212-]/.test(run) && at > 0 && /[\p{L}]/u.test(s[at - 1])) { run = run.slice(1); at += 1; if (!/[\s\u2013\u2014\/-]/.test(run.replace(/^\d[\d.,:]*/, "").charAt(0) || "") || !/\d[\d.,:]*\s?[\u2013\u2014-]\s?\d|\d{2,}[\s\u00a0-]\d{2,}/.test(run)) continue; } /* "ו-19", "ב-19:00": המקף שייך למילה, זה לא מינוס */
    if (run.length < 2 || HEB.test(run)) continue; if (at > last) frag.appendChild(document.createTextNode(s.slice(last, at))); const b = document.createElement("bdi"); b.dir = "ltr"; b.textContent = run; frag.appendChild(b); last = at + run.length; }
  if (!last) return; if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last))); tn.replaceWith(frag);
}
function fixTree(root) { if (!root || root.nodeType !== 1 || root.closest && root.closest(SKIP)) return; const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), list = []; let n; while ((n = w.nextNode())) list.push(n); list.forEach(fixText); }
let pend = new Set(), raf = 0;
const flush = () => { raf = 0; const roots = [...pend]; pend.clear(); roots.forEach(r => { try { if (r.nodeType === 3) fixText(r); else fixTree(r); } catch (e) {} }); };
new MutationObserver(ms => { for (const mu of ms) mu.addedNodes.forEach(nd => { if (nd.nodeType === 1 || nd.nodeType === 3) pend.add(nd); }); if (pend.size && !raf) raf = requestAnimationFrame(flush); }).observe(document.body, { childList: true, subtree: true });
setTimeout(() => fixTree(document.body), 1200);

/* ---------- יומן פעולות ושגיאות (בשביל דיווח באג) ---------- */
const ACT = [], ERRS = [];
const desc = el => { if (!el || !el.closest) return ""; const t = el.closest("button,a,[data-act],[data-q],[data-c],[data-in],.st-main,.day,label,input,.pin,.maplibregl-marker") || el; const ds = Object.entries(t.dataset || {}).slice(0, 2).map(([k, v]) => `${k}=${String(v).slice(0, 16)}`).join(","); return `${t.tagName.toLowerCase()}${t.id ? "#" + t.id : ""}${t.className && typeof t.className === "string" ? "." + t.className.trim().split(/\s+/).slice(0, 2).join(".") : ""}${ds ? "[" + ds + "]" : ""} "${(t.getAttribute("aria-label") || t.textContent || "").replace(/\s+/g, " ").trim().slice(0, 28)}"`; };
const stamp = () => { const d = new Date(); return d.toTimeString().slice(0, 8); };
document.addEventListener("click", e => { ACT.push(`${stamp()} tap ${desc(e.target)}`); if (ACT.length > 25) ACT.shift(); }, true);
let lastScreen = "מפה";
function trackScreen() { const h = document.querySelector("#mbody h2"); const t = h ? h.textContent.trim().slice(0, 40) : "מפה"; if (t !== lastScreen) { ACT.push(`${stamp()} screen ${t}`); if (ACT.length > 25) ACT.shift(); prevScreen = lastScreen; lastScreen = t; } }
let prevScreen = "מפה";
addEventListener("error", e => { ERRS.push(`${stamp()} ${String(e.message || "error").slice(0, 120)} @ ${String(e.filename || "").split("/").pop()}:${e.lineno || ""}`); if (ERRS.length > 8) ERRS.shift(); });
addEventListener("unhandledrejection", e => { ERRS.push(`${stamp()} promise: ${String(e.reason && (e.reason.message || e.reason)).slice(0, 120)}`); if (ERRS.length > 8) ERRS.shift(); });

/* ---------- 🐞 דווח על באג ---------- */
function report(note) {
  const v = (() => { try { return new URL(document.querySelector('script[src*="extras.js"]').src).searchParams.get("v"); } catch (e) { return "?"; } })();
  const vv = window.visualViewport, T = (() => { try { return tripNow(); } catch (e) { return {}; } })();
  return [`🐞 דיווח באג · פראג v${v}`, note ? `מה קרה: ${note}` : "",
    `מסך: ${prevScreen === "🐞 דווח על באג" ? lastScreen : prevScreen} · גיליון: ${typeof sheetState !== "undefined" ? sheetState : "?"} · יום ${typeof curDay !== "undefined" ? curDay + 1 : "?"}`,
    `מקום: ${(matchMedia("(display-mode: standalone)").matches || navigator.standalone) ? "אייקון" : /CriOS/.test(navigator.userAgent) ? "Chrome" : "Safari"} · מסך ${innerWidth}×${innerHeight} · DPR ${devicePixelRatio} · זום ${vv ? vv.scale.toFixed(2) : "?"}`,
    `זמן: ${new Date().toLocaleString("he-IL")} · שלב: ${T.phase || "?"} · רשת: ${navigator.onLine ? "יש" : "אין"}`,
    `מודולים: ${Object.entries(window.__mods || {}).map(([k, s]) => k + "=" + (s === "ok" ? "✓" : s)).join(", ")}`,
    `פעולות אחרונות:\n${ACT.slice(-20).join("\n") || "-"}`, `שגיאות:\n${ERRS.join("\n") || "אין"}`, `UA: ${navigator.userAgent}`].filter(Boolean).join("\n");
}
function openBug() {
  openModal(`<h2>🐞 דווח על באג</h2><p class="sub">נשמר אוטומטית: המסך שהיית בו, הגרסה, 20 הפעולות האחרונות והשגיאות. בלי מיקום ובלי פרטים אישיים.</p>
    <label class="fld">מה קרה? (לא חובה)<textarea id="bgN" rows="3" placeholder="למשל: לחצתי על התחנה והמסך קפץ למעלה"></textarea></label>
    <label class="fld">📸 צילום מסך (לא חובה)<input id="bgF" type="file" accept="image/*"></label>
    <details class="no-drag"><summary>מה יישלח</summary><pre id="bgP" dir="ltr" style="white-space:pre-wrap;font-size:.72rem;max-height:30vh;overflow:auto"></pre></details>
    <div class="row wrap" style="margin-top:10px"><button class="btn pri" id="bgS" style="flex:1">📤 לשלוח</button><button class="btn" id="bgC" style="flex:1">📋 להעתיק</button></div><p class="sub" id="bgSt"></p>`, "tall");
  const txt = () => report($("#bgN").value.trim()); $("#bgP").textContent = txt(); $("#bgN").oninput = () => { $("#bgP").textContent = txt(); };
  const st = $("#bgSt"), save = () => { try { LS.set("lastBug", { t: Date.now(), r: txt() }); } catch (e) {} };
  $("#bgC").onclick = async () => { save(); try { await navigator.clipboard.writeText(txt()); st.textContent = "✓ הועתק. אפשר להדביק לי בצ'אט."; } catch (e) { st.textContent = "לא הצלחתי להעתיק. פותחים את \"מה יישלח\" ומעתיקים ידנית."; } };
  $("#bgS").onclick = async () => { save(); const f = $("#bgF").files[0], data = { title: "באג באפליקציית פראג", text: txt() };
    try { if (f && navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ ...data, files: [f] }); else if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(txt()); st.textContent = "✓ הועתק (אין כאן שיתוף)."; } } catch (e) { if (e.name !== "AbortError") st.textContent = "השיתוף נכשל. לוחצים \"להעתיק\"."; } };
}
Object.assign(window, { openBug, fixBidi: fixTree });

/* ---------- מצבים מעוצבים ---------- */
/* הודעות: ✓ = הצלחה (סימן ירוק קופץ), ⚠️ / "לא הצלח" / "אין אינטרנט" = אזהרה */
if (typeof window.toast === "function") window.toast = (old => function (msg, ms) { const t = document.getElementById("toast"), s = String(msg == null ? "" : msg); const ok = /✓|✅|🎉/.test(s), warn = !ok && /⚠️|לא הצלח|נכשל|אין אינטרנט|אין רשת|שגיאה/.test(s); if (t) { t.classList.toggle("t-ok", ok); t.classList.toggle("t-warn", warn); } return old.call(this, ok ? s.replace(/\s*[✓✅]\s*$/, "").replace(/^\s*[✓✅]\s*/, "") : warn ? s.replace(/^\s*⚠️\s*/, "") : s, ms); })(window.toast);
/* אין אינטרנט: ניסוח אחד ברור */
try { const n = document.getElementById("net"); if (n) n.textContent = "בלי אינטרנט · הכול שמור אצלך"; } catch (e) {}
/* המפה בטעינה: רקע מנצנץ עד שהיא מוכנה (או עד שנכשלה) */
try { document.body.classList.add("map-wait"); const iv = setInterval(() => { let ready = false; try { ready = !!window.__booted || !!document.querySelector("#map .empty, #map canvas"); } catch (e) {} if (ready) { document.body.classList.remove("map-wait"); clearInterval(iv); } }, 300); setTimeout(() => { document.body.classList.remove("map-wait"); clearInterval(iv); }, 20000); } catch (e) {}

/* ---------- עיצוב ---------- */
(() => { const st = document.createElement("style"); st.textContent = `
:where(button,.btn,.tbtn,.fab,.day,.chip,.st-main,[data-act],[data-q],[data-c],[data-in],.menu button,.menu-top button,#quick button,.ask){transition:transform .14s cubic-bezier(.2,.8,.2,1),filter .14s,background-color .2s}
:where(button,.btn,[data-act],[data-c],[data-in],.st-main,.ask):active{transform:scale(.965);filter:brightness(.95)}
.st-main:active{transform:scale(.985)}
.mbox{transition:transform .5s cubic-bezier(.22,1.18,.36,1);will-change:transform}
.mbox.drag{transition:none}
#modal:not(.show) .mbox{transition:transform .28s cubic-bezier(.4,0,.9,.6)}
.mbox::before{content:"";position:absolute;top:8px;left:50%;width:40px;height:5px;margin-left:-20px;border-radius:3px;background:var(--line,rgba(127,127,127,.35))}
.mbox{box-shadow:0 -14px 44px rgba(8,12,30,.35),0 90px 0 0 var(--card)}
#mbody.swap{animation:fSwap .26s cubic-bezier(.2,.8,.2,1)}
@keyframes fSwap{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){#mbody.swap{animation:none}.mbox{transition-duration:.2s}}
`; document.head.appendChild(st); })();
(window.__mods = window.__mods || {}).feel = "ok";
} catch (err) { try { console.warn("feel:", err); (window.__mods = window.__mods || {}).feel = "fail: " + (err && err.message || err); } catch (e) {} }
})();
