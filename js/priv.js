/* priv: פריט אישי שנמצא רק בכספת המוצפנת (קטגוריה pv בחלק הכרטיסים). אין כאן שום תוכן: הכול מגיע מהכספת, רק בטלפון.
   • ברשימה של היום מופיעה שורה בשם ניטרלי, רק אם הכספת פתוחה בטלפון הזה. הפרטים נפתחים רק בלחיצה.
   • לא בתוכנית (plan), אז לא במפה, לא ביומן/התראות, לא בשיתוף, לא בדף ההורים ולא בסיכומים.
   • מה שנשמר כאן (pvH, pvD) לא נכנס לגיבוי ולהעברה (לא ברשימת MOVE_KEYS).
   מוגן: אם משהו נכשל, פשוט אין שורה. */
"use strict";
(function () {
try {
let P = null, loading = false;
async function load() {
  if (loading) return; loading = true;
  try { const it = ((typeof tix !== "undefined" && tix && tix.pv) || [])[0]; if (!it) { P = null; return; }
    const b = await imgGet("tk:" + it.id).catch(() => null); if (!b) { P = null; return; }
    const j = JSON.parse(await b.text()); if (j && j.v === 1) { const had = !!P; P = j; if (!had) try { renderList(); } catch (e) {} } }
  catch (e) {} finally { loading = false; }
}
const nowP = () => { const T = tripNow(), w = T.w; return { d: dstr(w), m: w.getUTCHours() * 60 + w.getUTCMinutes() }; };
const done = () => !!LS.get("pvD", 0);
function slots() {
  if (!P || done()) return []; const n = nowP(), h = LS.get("pvH", null), out = [];
  for (const s of P.slots || []) {
    if (s.by != null) { const ok = h ? (h.d < s.date || (h.d === s.date && h.m <= s.by)) : (n.d < s.date || (n.d === s.date && n.m <= s.by)); if (ok) out.push(s); }
    else out.push(s);
  }
  return out;
}
/* רישום שעת הכניסה למלון: הפעם הראשונה שהתחנה מסומנת "הייתי" */
function trackHotel() { try { if (!P || LS.get("pvH", null) || !P.hs) return; const d = plan.find(x => x.date === P.hs.date); const s = d && d.stops.find(x => x.n === P.hs.n); if (s && marks[s.id] === "done") LS.set("pvH", nowP()); } catch (e) {} }

const fmt = s => esc(String(s || "")).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(&#39;|&quot;|')([A-Za-z][^'"&]*?)(\1)/g, '<bdi dir="ltr">$1$2$3</bdi>'); /* משפט באנגלית בתוך עברית: בכיוון הנכון */
function row(s) {
  const li = document.createElement("li"); li.className = "st pvrow"; li.style.setProperty("--c", "#5c6470");
  li.innerHTML = `<button class="st-main" type="button"><span class="st-t">${fmtT(s.m)}</span><span class="st-ic">🔒</span><span class="st-x"><b>${esc(P.name || "זמן חופשי")}</b>${s.note ? `<small class="sub2"><span class="nt1">${esc(s.note)}</span></small>` : ""}</span></button><span class="st-nav off"></span><span class="st-chk" style="visibility:hidden"></span>`;
  const b = li.firstChild; ["click", "pointerdown"].forEach(ev => b.addEventListener(ev, e => { e.stopPropagation(); if (ev === "click") open(); }));
  return li;
}
const old = window.renderList;
window.renderList = function () {
  const r = old.apply(this, arguments);
  try { if (!P) { load(); return r; } trackHotel(); if (editMode) return r; const day = plan[curDay], list = $("#list"); if (!day || !list) return r;
    for (const s of slots().filter(x => x.date === day.date)) { let best = null, bm = -1; for (const li of list.querySelectorAll("li.st[data-id]")) { const st = findStop(li.dataset.id); if (st && st.m <= s.m && st.m >= bm) { best = li; bm = st.m; } } const el = row(s); if (best) best.after(el); else list.insertBefore(el, list.firstChild); } } catch (e) {}
  return r;
};
function open() {
  if (!P) return;
  openModal(`<h2>🔒 ${esc(P.t || P.name || "")}</h2>${P.sub ? `<p class="sub">${fmt(P.sub)}</p>` : ""}
    ${(P.sec || []).map(x => `<div class="card soft"><b>${fmt(x.h)}</b>${(x.li || []).length ? `<ul class="pv-l">${x.li.map(l => `<li>${fmt(l)}</li>`).join("")}</ul>` : ""}</div>`).join("")}
    <div class="row wrap">${P.lat ? `<a class="btn pri" href="${navUrl({ lat: P.lat, lng: P.lng })}" target="_blank" rel="noopener">🚶 ניווט הליכה</a>` : ""}<button class="btn" id="pvDone">✓ הייתי</button></div>
    <p class="fine">נשמר רק בכספת המוצפנת ובטלפון הזה. לא במפה, לא ביומן ולא אצל ההורים.</p>`);
  $("#pvDone").onclick = () => { LS.set("pvD", 1); closeModal(); try { renderList(); } catch (e) {} toast("✓", 1200); };
}
const kick = () => { if (!window.__ui) return setTimeout(kick, 400); load(); };
kick(); setInterval(() => { if (!P && !document.hidden) load(); }, 20000);
(window.__mods = window.__mods || {}).priv = "ok";
} catch (err) { try { (window.__mods = window.__mods || {}).priv = "fail"; } catch (e) {} }
})();
