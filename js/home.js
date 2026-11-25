/* home: המסך הראשי = "מצב עכשיו". כרטיס אחד עם פעולה ראשית אחת, שורת "לאן?" והמפה. השאר משני.
   המסך משתנה לפי ההקשר:
   • לפני הטיסה: ספירה לאחור והכנות.   • ביום הטיסה: הטיסה, כרטיס עלייה והדרך לנתב"ג.
   • בפראג: מה עכשיו + "➤ התחל" (ניווט חי בתוך האפליקציה), והמלון.   • ביום החזרה: צ'ק-אאוט, הדרך לשדה והטיסה.
   שורת הקיצורים מתקצרת ל-4-5 דברים לפי ההקשר; כל השאר בתפריט.  מוגן: אם משהו כאן נכשל, המסך הישן נשאר. */
"use strict";
(function () {
try {
/* אייקונים באותו סגנון קווי של שורת הקיצורים */
try { Object.assign(IC, { check: "M5 12.5l4.5 4.5L19 7.5", ticket: "M4 7.500h16v3a1.500 1.500 0 0 0 0 3v3H4v-3a1.500 1.500 0 0 0 0-3zM14 7.500v9", bed: "M3 18V7m0 6h18v5M3 13l0-2a2 2 0 0 1 2-2h4v4m0-4h8a4 4 0 0 1 4 4", talk: "M5 18l1.500-3.500A7 7 0 1 1 9 17.300zM9 11h.010M12 11h.010M15 11h.010", plane: "M3 13.500l7-1.500 4-7 2 .500-1.500 6.500 4.500-1 1.500-2 1.500.500-1 3.500 1 3.500-1.500.500-1.500-2-4.500-1 1.500 6.500-2 .500-4-7-7-1.500z", car: "M5 16.500h14M6.500 16.500v2M17.500 16.500v2M5 16.500l1.500-6h11l1.500 6M8 13.500h.010M16 13.500h.010", map: "M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14", camera: "M4 8.500h3l1.500-2h7l1.500 2h3v10H4zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" }); } catch (e) {}
const ico = k => { try { return icon(k); } catch (e) { return ""; } };
const FLIGHT_OUT = Date.UTC(2026, 10, 30, 17, 25), TLV = { lat: 32.0004, lng: 34.8706, name: "נתב\"ג טרמינל 3", q: "Ben Gurion Airport Terminal 3" };
function phase() {
  const T = tripNow(), w = T.w.getTime(), last = plan.length - 1;
  if (T.phase === "before") return "before";
  if (T.phase === "during" && T.dayIdx === 0 && w < FLIGHT_OUT) return "flight";
  if (T.phase === "during" && T.dayIdx === last) return "return";
  if (T.phase === "during") return "prague";
  return "after";
}
const hotel = () => { const p = TRIP.places.hotel; return me && me.hotel && me.hotel.lat ? { ...p, ...me.hotel, name: "המלון" } : { ...p, name: "המלון" }; };
const flightTicket = k => { try { return ((LS.get("tix", {})[k]) || []).length; } catch (e) { return 0; } };

/* ---------- שורת הקיצורים לפי ההקשר ---------- */
const H = { prep: () => openPrep(), tix: () => openTickets(), fl1: () => openTickets("fl1"), fl2: () => openTickets("fl2"), talk: () => openPhrases(), moment: () => newMoment(),
  hotel: () => typeof goChoose === "function" ? goChoose({ ...hotel(), ic: "🏨" }) : openArrive(), arr: () => openArrive(),
  tlv: () => window.open(navUrl(TLV, "driving"), "_blank", "noopener"), air: () => window.open(navUrl(TRIP.places.airport, "transit"), "_blank", "noopener") };
const QB = (k, ic, t, attr) => `<button ${attr || `data-h="${k}"`}>${ico(ic)}<span>${t}</span></button>`;
function quickHtml(ph) {
  const badge = '<i id="updBadge" hidden>0</i>', upd = `<button data-q="upd">${ico("bell")}<span>עדכונים</span>${badge}</button>`, more = QB("", "dots", "עוד", 'data-q="more"'), cl = QB("", "spark", "Claude", 'data-q="claude"');
  const n = (() => { try { return prepLeft(); } catch (e) { return 0; } })();
  if (ph === "before") return QB("prep", "check", n ? `הכנות · ${n}` : "הכנות ✓") + QB("tix", "ticket", "כרטיסים") + QB("talk", "talk", "לדבר") + cl + more + `<span hidden>${badge}</span>`;
  if (ph === "flight") return QB("fl1", "ticket", "כרטיס עלייה") + QB("tlv", "car", "לנתב\"ג") + QB("prep", "check", n ? `הכנות · ${n}` : "הכנות ✓") + cl + more + `<span hidden>${badge}</span>`;
  if (ph === "return") return QB("fl2", "ticket", "טיסה חזור") + QB("arr", "bed", "המלון") + QB("air", "plane", "לשדה") + upd + cl + more;
  return QB("hotel", "bed", "המלון") + QB("moment", "camera", "רגע להורים") + cl + upd + QB("", "send", "ווטסאפ", 'data-q="wa"') + more;
}
let lastPh = "";
function renderQuick() { const q = $("#quick"), ph = phase(); if (!q || ph === lastPh) return; lastPh = ph; q.innerHTML = quickHtml(ph); try { refreshUpdates(); } catch (e) {} }
document.addEventListener("click", e => { const b = e.target.closest("#quick [data-h], #nextCard [data-h], #nxMore [data-h]"); if (!b || !H[b.dataset.h]) return; e.stopPropagation(); buzz(6); H[b.dataset.h](); }, true);

/* ---------- הכרטיס ---------- */
function cardBefore() {
  const ms = Math.max(0, FLIGHT_OUT - tripNow().w.getTime()), d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), mi = Math.floor(ms % 36e5 / 6e4), n = (() => { try { return prepLeft(); } catch (e) { return 0; } })();
  const big = d > 0 ? `${d === 1 ? "יום" : d + " ימים"} ו-${h} שע'` : h > 0 ? `${h} שע' ו-${mi} דק'` : `${mi} דק'`;
  return `<div class="nx-top"><span class="nx-k">✈️ הטיסה לפראג</span><span class="nx-when">QS1285 · 30.11 · 18:25</span></div>
    <div class="nx-row"><div class="nx-main static"><span class="nx-ic">✈️</span><span class="nx-tx"><b>${big}</b><small>עד ההמראה · ${n ? `נשארו ${n} דברים להכין` : "הכול מוכן"}</small></span></div>
    <button class="btn pri nx-go" data-h="prep">${n ? "להכין" : "✓ הכנות"}</button></div>`;
}
function cardFlight() {
  const ms = Math.max(0, FLIGHT_OUT - tripNow().w.getTime()), h = Math.floor(ms / 36e5), mi = Math.floor(ms % 36e5 / 6e4), has = flightTicket("fl1");
  return `<div class="nx-top"><span class="nx-k">✈️ היום טסים</span><span class="nx-when fx">המראה 18:25 · עוד ${h ? h + " שע' ו-" : ""}${mi} דק'</span></div>
    <div class="nx-row"><div class="nx-main static"><span class="nx-ic">🛫</span><span class="nx-tx"><b>QS1285 · נתב"ג טרמינל 3</b><small>להגיע עד 15:25 · הדלפק נסגר 17:25</small></span></div>
    <button class="btn pri nx-go" data-h="fl1">${has ? "כרטיס עלייה" : "הכרטיסים"}</button></div>`;
}
/* בפראג וביום החזרה: הכרטיס הקיים (הבא במסלול), רק שהפעולה הראשית היא ניווט חי בתוך האפליקציה */
function upgradeNext() {
  const go = $("#nextCard a.nx-go"); if (!go || typeof navStart !== "function") return;
  if (/סע/.test(go.textContent)) return; /* רחוק: חשמלית/מטרו ב-Google Maps נשאר הראשי */
  const id = ($("#nextCard [data-id]") || {}).dataset; if (!id || !id.id) return;
  const b = document.createElement("button"); b.className = "btn pri nx-go"; b.dataset.act = "navin"; b.dataset.id = id.id; b.textContent = "➤ התחל"; go.replaceWith(b);
  const arrow = $(`#nxMore [data-act="navin"]`), s = findStop(id.id), l = s && loc(s);
  if (arrow && l) { const a = document.createElement("a"); a.className = "btn"; a.href = navUrl(l, "walking"); a.target = "_blank"; a.rel = "noopener"; a.textContent = "Google Maps ↗"; arrow.replaceWith(a); }
}
window.renderNext = (old => function () {
  const ph = phase();
  try { renderQuick(); } catch (e) {}
  if (curDay === 0 && ph === "before") { /* ביום הטיסה עצמו הכרטיס הרגיל כבר עוקב אחרי התוכנית: יציאה מהבית, רכבת, שדה, טיסה */
    try { $("#nextCard").innerHTML = cardBefore() + (typeof updateCard === "function" ? updateCard() : "");
      $("#nxMore").innerHTML = `<div class="nx-btns"><button class="btn" data-act="play">▶ איך ייראה יום 1</button><button class="btn" data-h="tix">🎟️ הכרטיסים</button></div>` + (typeof eventCard === "function" ? eventCard() : ""); return; } catch (e) {}
  }
  const r = old.apply(this, arguments); try { upgradeNext(); } catch (e) {} return r;
})(window.renderNext);
/* כפתור המיקום נשאר תמיד (הוא לבד עכשיו, אז יש לו מקום גם באייפון SE), חוץ מכשהגיליון פתוח עד הסוף */
if (typeof window.setSheet === "function") window.setSheet = (old => function (st) { const r = old.apply(this, arguments); try { const f = $("#fabs"); if (f) f.classList.toggle("hide", sheetState === "full"); } catch (e) {} return r; })(window.setSheet);
try { if (window.__ui) setSheet(sheetState, true); } catch (e) {}
setInterval(() => { try { if (phase() !== lastPh || (curDay === 0 && (lastPh === "before" || lastPh === "flight"))) renderNext(); } catch (e) {} }, 60000);

(() => { const s = document.createElement("style"); s.textContent = `
@media (max-width:360px){#top #nowBtn{display:none!important}} /* במסך קטן: הימים למטה כבר עושים את זה */
#fabChat{display:none!important} /* Claude נמצא בשורת הקיצורים; על המפה נשאר רק כפתור המיקום */
#quick button span{white-space:nowrap}
#listHead .sw.mini,#listHead #freeBtn{display:none} /* ספונטני ויום חופשי: בהגדרות ובתפריט */
#sheetBody .fine.attr{font-size:.72rem;opacity:.75}
`; document.head.appendChild(s); })();
(window.__mods = window.__mods || {}).home = "ok";
} catch (err) { try { (window.__mods = window.__mods || {}).home = "fail: " + (err && err.message || err); } catch (e) {} }
})();
