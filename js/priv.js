/* priv: פריט אישי שנמצא רק בכספת המוצפנת (קטגוריה pv בחלק הכרטיסים). אין כאן שום תוכן: הכול מגיע מהכספת, רק בטלפון.
   • ברשימה של היום מופיעה שורה בשם ניטרלי, רק אם הכספת פתוחה בטלפון הזה. הפרטים נפתחים רק בלחיצה.
   • לא בתוכנית (plan), אז לא במפה, לא ביומן/התראות, לא בשיתוף, לא בדף ההורים ולא בסיכומים.
   • ➕ הוסף: השורה נהיית כמו תחנה רגילה (שעה, נווט, ✓) ונשארת רק ביום הזה. עדיין לא בתוכנית, אז לא במפה, ביומן או בהתראות.
   • מה שנשמר כאן (pvH, pvD, pvA) לא נכנס לגיבוי ולהעברה (לא ברשימת MOVE_KEYS).
   מוגן: אם משהו נכשל, פשוט אין שורה. */
"use strict";
(function () {
try {
let P = null, loading = false;
async function load() {
  if (loading) return; loading = true;
  try { let best = null; /* כמה גרסאות של הפריט: לוקחים את החדשה ביותר (rev) */
    for (const it of ((typeof tix !== "undefined" && tix && tix.pv) || [])) { const b = await imgGet("tk:" + it.id).catch(() => null); if (!b) continue; try { const j = JSON.parse(await b.text()); if (j && j.v === 1 && (!best || (j.rev || 0) >= (best.rev || 0))) best = j; } catch (e) {} }
    if (!best) { P = null; return; } const had = !!P, ch = !P || P.rev !== best.rev; P = best; if (!had || ch) try { renderList(); } catch (e) {} }
  catch (e) {} finally { loading = false; }
}
const nowP = () => { const T = tripNow(), w = T.w; return { d: dstr(w), m: w.getUTCHours() * 60 + w.getUTCMinutes() }; };
const done = () => !!LS.get("pvD", 0), added = () => LS.get("pvA", "") || ""; /* pvA: התאריך שהפריט נוסף אליו כמו תחנה רגילה */
function slots() {
  if (!P) return []; const a = added(); if (a) return (P.slots || []).filter(s => s.date === a).slice(0, 1); /* נוסף ליום: מופיע רק שם, גם אחרי ✓ */
  if (done()) return []; const n = nowP(), h = LS.get("pvH", null), out = [];
  for (const s of P.slots || []) {
    if (s.by != null) { const ok = h ? (h.d < s.date || (h.d === s.date && h.m <= s.by)) : (n.d < s.date || (n.d === s.date && n.m <= s.by)); if (ok) out.push(s); }
    else out.push(s);
  }
  return out;
}
/* רישום שעת הכניסה למלון: הפעם הראשונה שהתחנה מסומנת "הייתי" */
function trackHotel() { try { if (!P || LS.get("pvH", null) || !P.hs) return; const d = plan.find(x => x.date === P.hs.date); const s = d && d.stops.find(x => x.n === P.hs.n); if (s && marks[s.id] === "done") LS.set("pvH", nowP()); } catch (e) {} }

const fmt = s => esc(String(s || "")).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(&#39;|&quot;|')([A-Za-z][^'"&]*?)(\1)/g, '<bdi dir="ltr">$1$2$3</bdi>'); /* משפט באנגלית בתוך עברית: בכיוון הנכון */
function setAdded(d) { LS.set("pvA", d || ""); if (!d) LS.set("pvD", 0); try { renderList(); } catch (e) {} buzz(8); }
function row(s) {
  const on = added() === s.date, dn = on && done(), note = on ? String(s.note || "").replace(/^[^·]*אפשרות[^·]*·\s*/, "") : s.note;
  const li = document.createElement("li"); li.className = "st pvrow" + (on ? " pvon" : "") + (dn ? " done" : ""); li.style.setProperty("--c", "#5c6470");
  li.innerHTML = `<button class="st-main" type="button"><span class="st-t">${fmtT(s.m)}</span><span class="st-ic">${on ? "🌙" : "🔒"}</span><span class="st-x"><b>${esc(P.name || "זמן חופשי")}</b>${note ? `<small class="sub2"><span class="nt1">${esc(note)}</span></small>` : ""}</span></button>`
    + (on ? (P.lat ? `<a class="st-nav" href="${navUrl({ lat: P.lat, lng: P.lng })}" target="_blank" rel="noopener">נווט</a>` : `<span class="st-nav off"></span>`) + `<button class="st-chk" type="button" aria-label="${dn ? "בטל סימון" : "סמן שבוצע"}" aria-pressed="${dn}"></button>`
      : `<button class="st-nav pv-add" type="button" aria-label="להוסיף ליום">➕ הוסף</button><span class="st-chk" style="visibility:hidden"></span>`);
  li.querySelectorAll("button,a").forEach(b => ["click", "pointerdown"].forEach(ev => b.addEventListener(ev, e => { e.stopPropagation(); if (ev !== "click") return;
    if (b.classList.contains("st-main")) open(s); else if (b.classList.contains("pv-add")) { setAdded(s.date); toast("נוסף ליום ✓", 1400); } else if (b.classList.contains("st-chk")) { LS.set("pvD", dn ? 0 : 1); renderList(); buzz(8); } })));
  return li;
}
const old = window.renderList;
window.renderList = function () {
  const r = old.apply(this, arguments);
  try { if (!P) { load(); return r; } trackHotel(); if (editMode) return r; const day = plan[curDay], list = $("#list"); if (!day || !list) return r;
    for (const s of slots().filter(x => x.date === day.date)) { let best = null, bm = -1; for (const li of list.querySelectorAll("li.st[data-id]")) { const st = findStop(li.dataset.id); if (st && st.m <= s.m && st.m >= bm) { best = li; bm = st.m; } } const el = row(s); if (best) best.after(el); else list.insertBefore(el, list.firstChild); } } catch (e) {}
  return r;
};
function open(s) {
  if (!P) return; const on = s && added() === s.date;
  openModal(`<h2>🔒 ${esc(P.t || P.name || "")}</h2>${P.sub ? `<p class="sub">${fmt(P.sub)}</p>` : ""}
    ${(P.sec || []).map(x => `<div class="card soft"><b>${fmt(x.h)}</b>${(x.li || []).length ? `<ul class="pv-l">${x.li.map(l => `<li>${fmt(l)}</li>`).join("")}</ul>` : ""}</div>`).join("")}
    <div class="row wrap">${P.lat ? `<a class="btn pri" href="${navUrl({ lat: P.lat, lng: P.lng })}" target="_blank" rel="noopener">🚶 ניווט הליכה</a>` : ""}${s ? `<button class="btn" id="pvAdd">${on ? "➖ להוריד מהיום" : "➕ להוסיף ליום"}</button>` : ""}<button class="btn" id="pvDone">✓ הייתי</button></div>
    <p class="fine">נשמר רק בכספת המוצפנת ובטלפון הזה. לא במפה, לא ביומן ולא אצל ההורים.</p>`);
  const ad = $("#pvAdd"); if (ad) ad.onclick = () => { closeModal(); setAdded(on ? "" : s.date); toast(on ? "הורד מהיום" : "נוסף ליום ✓", 1400); };
  $("#pvDone").onclick = () => { LS.set("pvD", 1); closeModal(); try { renderList(); } catch (e) {} toast("✓", 1200); };
}
const kick = () => { if (!window.__ui) return setTimeout(kick, 400); load(); };
kick(); setInterval(() => { if (!document.hidden) load(); }, 60000);
(window.__mods = window.__mods || {}).priv = "ok";
} catch (err) { try { (window.__mods = window.__mods || {}).priv = "fail"; } catch (e) {} }
})();
