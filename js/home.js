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
  if (T.phase === "during" && T.dayIdx === 0 && w < (FLIGHT_OUT + fltAdj("out"))) return "flight";
  if (T.phase === "during" && T.dayIdx === last) return "return";
  if (T.phase === "during") return "prague";
  return "after";
}
const hotel = () => { const p = TRIP.places.hotel; return me && me.hotel && me.hotel.lat ? { ...p, ...me.hotel, name: "המלון" } : { ...p, name: "המלון" }; };
const flightTicket = k => { try { return ((LS.get("tix", {})[k]) || []).length; } catch (e) { return 0; } };

/* ---------- שורת הקיצורים לפי ההקשר ---------- */
const H = { prep: () => openPrep(), tix: () => openTickets(), fl1: () => openTickets("fl1"), fl2: () => openTickets("fl2"), talk: () => openPhrases(), moment: () => newMoment(), esim: () => window.openEsim && openEsim(),
  hotel: () => typeof goChoose === "function" ? goChoose({ ...hotel(), ic: "🏨" }) : openArrive(), arr: () => openArrive(),
  tlv: () => window.open(navUrl(TLV, "driving"), "_blank", "noopener"), air: () => window.open(navUrl(TRIP.places.airport, "transit"), "_blank", "noopener") };
const QB = (k, ic, t, attr) => `<button ${attr || `data-h="${k}"`}>${ico(ic)}<span>${t}</span></button>`;
function quickHtml(ph) {
  const badge = '<i id="updBadge" hidden>0</i>', upd = `<button data-q="upd">${ico("bell")}<span>עדכונים</span>${badge}</button>`, more = QB("", "dots", "עוד", 'data-q="more"'), cl = QB("", "spark", "Claude", 'data-q="claude"');
  const n = (() => { try { return prepLeft(); } catch (e) { return 0; } })();
  if (ph === "before") return QB("prep", "check", n ? `הכנות · ${n}` : "הכנות ✓") + QB("tix", "ticket", "כרטיסים") + QB("talk", "talk", "לדבר") + cl + more + `<span hidden>${badge}</span>`;
  if (ph === "flight") return QB("fl1", "ticket", "כרטיס הטיסה") + QB("tlv", "car", "לנתב\"ג") + QB("prep", "check", n ? `הכנות · ${n}` : "הכנות ✓") + cl + more + `<span hidden>${badge}</span>`;
  if (ph === "return") return QB("fl2", "ticket", "טיסה חזור") + QB("arr", "bed", "המלון") + QB("air", "plane", "לשדה") + upd + cl + more;
  const esim = (() => { try { const T = tripNow(); return T.dayIdx === 0 || (T.dayIdx === 1 && T.min < 600); } catch (e) { return false; } })() ? `<button data-h="esim"><span>📶 eSIM</span></button>` : "";
  return esim + QB("hotel", "bed", "המלון") + QB("moment", "camera", "רגע להורים") + cl + upd + QB("", "send", "ווטסאפ", 'data-q="wa"') + more;
}
let lastPh = "";
function renderQuick() { const q = $("#quick"), ph = phase(); if (!q || ph === lastPh) return; lastPh = ph; q.innerHTML = quickHtml(ph); try { refreshUpdates(); } catch (e) {} }
document.addEventListener("click", e => { const b = e.target.closest("#quick [data-h], #nextCard [data-h], #nxMore [data-h]"); if (!b || !H[b.dataset.h]) return; e.stopPropagation(); buzz(6); H[b.dataset.h](); }, true);

/* ---------- הכרטיס ---------- */
function cardBefore() {
  const ms = Math.max(0, (FLIGHT_OUT + fltAdj("out")) - tripNow().w.getTime()), d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), mi = Math.floor(ms % 36e5 / 6e4), n = (() => { try { return prepLeft(); } catch (e) { return 0; } })();
  const big = d > 0 ? `${d === 1 ? "יום" : d + " ימים"} ו-${h} שע'` : h > 0 ? `${h} שע' ו-${mi} דק'` : `${mi} דק'`;
  return `<div class="nx-top"><span class="nx-k">✈️ הטיסה לפראג</span><span class="nx-when">QS1285 · 30.11 · 18:25 שעון ישראל</span></div>
    <div class="nx-row"><div class="nx-main static"><span class="nx-ic">✈️</span><span class="nx-tx"><b>${big}</b><small>עד ההמראה · ${n ? `נשארו ${n} דברים להכין` : "הכול מוכן"}</small></span></div>
    <button class="btn pri nx-go" data-h="prep">${n ? "להכין" : "✓ הכנות"}</button></div>`;
}
function cardFlight() {
  const ms = Math.max(0, (FLIGHT_OUT + fltAdj("out")) - tripNow().w.getTime()), h = Math.floor(ms / 36e5), mi = Math.floor(ms % 36e5 / 6e4), has = flightTicket("fl1");
  return `<div class="nx-top"><span class="nx-k">✈️ היום טסים</span><span class="nx-when fx">המראה 18:25 (ישראל) · עוד ${h ? h + " שע' ו-" : ""}${mi} דק'</span></div>
    <div class="nx-row"><div class="nx-main static"><span class="nx-ic">🛫</span><span class="nx-tx"><b>QS1285 · נתב"ג טרמינל 3</b><small>שעון ישראל: להגיע עד 15:25 · ישר לדלפק, נסגר 17:25 · נחיתה 21:35 שעון פראג</small></span></div>
    <button class="btn pri nx-go" data-h="fl1">${has ? "כרטיס הטיסה" : "הכרטיסים"}</button></div>`;
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

/* daylist: "היום שלי" נקי וברור. רק תצוגה: לא נוגע בנתונים, בתוכנית, בכספת, בכרטיסים, במפה או ב-service worker.
   • ציר זמן: שעה בגדול ← שם ← שורה אחת קצרה ← נווט. בלי "בוקר/צהריים" במקום השעה, ובלי השם הצ'כי בשורה.
   • הבא בתור מודגש: "הבא בתור · בעוד 40 דק'".
   • פס אחד קטן למעלה עם התזכורות של היום (דרכון / Bolt / קור), במקום שיהיו מפוזרות.
   • הרשימה עולה מיד אחרי הכרטיס "הבא" והקיצורים. הנגן של היום יורד לסוף.
   מוגן: אם משהו כאן נכשל, הרשימה נשארת כמו שהייתה. */
(function () {
try {
const STRIP = {
  "2026-11-30": ["🛂 דרכון ביד", "✈️ ישר לדלפק · נסגר 17:25 (ישראל)", "📶 eSIM בנחיתה", "💵 Bolt במזומן"],
  "2026-12-01": ["🪪 רישיון נהיגה ל-Duplex", "🚕 הביתה ב-Bolt", "🥶 בלילה עד −8°"],
  "2026-12-02": ["🪪 רישיון נהיגה ל-EPIC", "🚕 אחרי EPIC רק Bolt", "🥶 בלילה עד −8°"],
  "2026-12-03": ["🪪 רישיון נהיגה ל-Duplex", "🎒 תיק עד 8 ק\"ג", "🧾 Tax Free מעל 2001 Kč"],
  "2026-12-04": ["🛂 דרכון ביד", "🚕 Bolt ב-09:00", "🧾 Tax Free משמאל לפני הדלפקים", "✈️ הדלפק נסגר 12:05"]
};
function strip(day) {
  let s = $("#dayStrip"); const items = STRIP[day.date] || [];
  if (!s) { s = document.createElement("div"); s.id = "dayStrip"; const lh = $("#listHead"); if (!lh) return; lh.parentNode.insertBefore(s, lh); }
  s.hidden = !items.length; s.innerHTML = items.map(t => `<span>${esc(t)}</span>`).join("");
}
const inMin = s => { try { const T = tripNow(); if (T.dayIdx !== curDay) return null; return Math.round(pm(s) - T.min); } catch (e) { return null; } };
const old = window.renderList;
window.renderList = function () {
  const r = old.apply(this, arguments);
  try {
    const day = plan[curDay], list = $("#list"); if (!day || !list) return r; strip(day); if (editMode) return r;
    list.querySelectorAll("li.st[data-id]").forEach(li => {
      const s = findStop(li.dataset.id); if (!s) return;
      const t = li.querySelector(".st-t"); if (t && !t.classList.contains("num")) t.innerHTML = `${fmtT(s.m)}${s.il ? "<i>ישראל</i>" : ""}`;
      if (li.classList.contains("next")) { const x = li.querySelector(".st-x"), m = inMin(s), p = li.querySelector(".pill"); if (p) p.remove();
        if (x && !x.querySelector(".nx-in")) x.insertAdjacentHTML("afterbegin", `<small class="nx-in">הבא בתור${m != null && m > 0 ? ` · בעוד ${fmtDur(m)}` : m != null && m > -5 ? " · עכשיו" : ""}</small>`); }
    });
  } catch (e) {}
  return r;
};
/* הרשימה מוקדם יותר בגיליון; המצב האמצעי מראה גם כמה שורות ממנה */
const css = document.createElement("style");
css.textContent = `
#sheetBody{display:flex;flex-direction:column}
#sheetBody > *{flex-shrink:0}
#nextCard{order:1}#nxMore{order:2}#quick{order:3}#dayStrip{order:4}#listHead{order:5}#list{order:6}#player{order:7}#sheetBody > :not(#nextCard):not(#nxMore):not(#quick):not(#dayStrip):not(#listHead):not(#list):not(#player){order:8}
#dayStrip{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:10px 0 2px;margin:0 -14px;padding-inline:14px}
#dayStrip::-webkit-scrollbar{display:none}
#dayStrip[hidden]{display:none}
#dayStrip span{flex:none;font-size:.8rem;font-weight:600;padding:6px 10px;border-radius:999px;background:var(--card2);white-space:nowrap}
#list .st-main{padding:14px 0;min-height:74px;gap:12px}
#list .st-t{width:3.3em;font-size:1.38rem;font-weight:800;color:var(--ink)}
#list .st.big .st-t{color:var(--red-ink)}
#list .st-t i{font-size:.62rem;font-weight:600}
#list .cz1{display:none}
#list .cz1 + .nt1::before{content:none}
#list .st-x{gap:3px}
#list .st-x b{font-size:1.02rem}
#list .st-ic{width:36px;height:36px;font-size:1.05rem}
#list .nx-in{display:block;font-size:.76rem;font-weight:800;color:#8a5a00;white-space:normal;overflow:visible}
#list .pvrow .sub2{flex-wrap:wrap;row-gap:3px}
#list .pvrow .sub2 > span{white-space:normal}
#list .pvrow .pv-tag{flex:0 1 auto!important;max-width:100%;overflow:visible;text-overflow:clip;line-height:1.35}
:root[data-theme="dark"] #list .nx-in{color:var(--must)}
#list .st.next::before{background:color-mix(in srgb,var(--must) 18%,transparent);box-shadow:inset 3px 0 0 var(--must)}
`;
document.head.appendChild(css);
if (typeof window.sheetHeights === "function") window.sheetHeights = (o => function () { const H = o.apply(this, arguments); try { const lh = $("#listHead"); if (lh && !isDesktop()) H.mid = Math.max(H.low + 80, Math.min(lh.offsetTop + lh.offsetHeight + 190 + ($("#grab") ? $("#grab").offsetHeight : 0), innerHeight * 0.62)); } catch (e) {} return H; })(window.sheetHeights);
(window.__mods = window.__mods || {}).daylist = "ok";
} catch (err) { try { (window.__mods = window.__mods || {}).daylist = "fail"; } catch (e) {} }
})();

/* אופציונלי: ✅ הולך / ❌ לא הולך. תחנה אופציונלית = השם מתחיל ב"אופציה" או ההערה ב"אופציונלי" (גשר טרויה, Manifesto).
   בלי החלטה: שני כפתורים קטנים. הולך: תחנה רגילה. לא הולך: שורה אפורה דקה, נגיעה מחזירה. ההחלטה נשמרת בטלפון (optDec) לפי תאריך ושם, אז עדכונים לא מוחקים אותה. */
(function () {
try {
const isOpt = s => /^אופציה/.test(s.n || "") || /^אופציונלי/.test(s.w || "");
const okey = (d, s) => d + "|" + s.n, od = () => LS.get("optDec", {}) || {};
window.__optNo = (date, s) => { try { return isOpt(s) && od()[okey(date, s)] === "no"; } catch (e) { return false; } };
/* "לא הולך": גם הקו של היום עוקף את התחנה (רק התצוגה; התוכנית עצמה לא משתנה) */
if (typeof window.dayLine === "function") window.dayLine = (o => function (di) { const d = plan[di]; if (!d || !d.stops.some(s => window.__optNo(d.date, s))) return o.apply(this, arguments); const keep = d.stops; try { d.stops = keep.filter(s => !window.__optNo(d.date, s)); return o.apply(this, arguments); } finally { d.stops = keep; } })(window.dayLine);
function setO(date, s, v) { const d = od(); if (v) d[okey(date, s)] = v; else delete d[okey(date, s)]; LS.set("optDec", d); try { renderAll(); } catch (e) {} buzz(8); }
const old = window.renderList;
window.renderList = function () {
  const r = old.apply(this, arguments);
  try { if (editMode) return r; const day = plan[curDay]; if (!day) return r;
    $$("#list li.st[data-id]").forEach(li => { const s = findStop(li.dataset.id); if (!s || !isOpt(s)) return; const v = od()[okey(day.date, s)] || "";
      if (v === "no") { li.className = "st optno"; li.innerHTML = `<button class="opt-thin" type="button"><span>❌ ${fmtT(s.m)} · ${esc(s.n.replace(/^אופציה:\s*/, ""))}</span><u>להחזיר</u></button>`; }
      else if (v === "go") { const b = li.querySelector(".st-x b"); if (b) b.textContent = b.textContent.replace(/^אופציה:\s*/, ""); const nt = li.querySelector(".nt1"); if (nt) nt.innerHTML = nt.innerHTML.replace(/^אופציונלי\s*·\s*/, ""); }
      else { li.classList.add("optrow"); li.insertAdjacentHTML("beforeend", `<div class="opt-row"><button class="opt-b go" type="button">✅ הולך</button><button class="opt-b no" type="button">❌ לא הולך</button></div>`); }
      li.querySelectorAll(".opt-b,.opt-thin").forEach(b => ["click", "pointerdown"].forEach(ev => b.addEventListener(ev, e => { e.stopPropagation(); if (ev !== "click") return; setO(day.date, s, b.classList.contains("go") ? "go" : b.classList.contains("no") ? "no" : ""); })));
    });
  } catch (e) {}
  return r;
};
const css = document.createElement("style");
css.textContent = `
#list .st.optrow{flex-wrap:wrap}
#list .opt-row{flex-basis:100%;display:flex;gap:8px;padding:0 0 12px;padding-inline-start:calc(3.3em + 48px)}
.opt-row.in{padding:0;margin-top:16px;display:flex;gap:8px}
.opt-b{font:inherit;font-size:.8rem;font-weight:700;padding:6px 14px;border-radius:999px;border:1px solid var(--line);background:var(--card2);color:var(--ink);cursor:pointer}
.opt-b.on{background:var(--ink);color:var(--card);border-color:var(--ink)}
#list .st.optno{min-height:0;border-bottom:1px dashed var(--line)}
#list .opt-thin{width:100%;display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 2px;background:none;border:0;font:inherit;font-size:.82rem;color:var(--mut);cursor:pointer;text-align:start}
#list .opt-thin span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#list .opt-thin u{flex:none;font-weight:700;color:var(--ink)}
`;
document.head.appendChild(css);
(window.__mods = window.__mods || {}).optional = "ok";
} catch (err) { try { (window.__mods = window.__mods || {}).optional = "fail"; } catch (e) {} }
})();
