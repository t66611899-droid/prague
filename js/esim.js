/* esim: "📶 הפעלת eSIM בנחיתה". עובד בלי אינטרנט (שמור עם האפליקציה).
   • תמיד בתפריט ← הטיול.  • ב-30.11 מ-21:30 בשעון פראג, או כשה-GPS בשדה התעופה של פראג: עולה לבד כמסך ראשון (פעם אחת).
   • צעדים עם ✓, "לא עובד? לפי הסדר", אזהרה לא למחוק, ומה עובד גם בלי רשת. בלי פרטים אישיים: רק מספרי תמיכה ומונית ציבוריים.
   מוגן: אם משהו כאן נכשל, שאר האפליקציה עולה כרגיל. */
"use strict";
(function () {
try {
const HOLA_WA = "16613848482", TAXI = { n: "AAA Radiotaxi", tel: "+420222333222", show: "+420 222 333 222" };
const STEPS = [
  ["air", "מורידים את <b>מצב טיסה</b>", "מרכז הבקרה (החלקה מהפינה הימנית למעלה) ← ✈️ כבוי"],
  ["line", "מדליקים את הקו Travel - Holafly", "הגדרות ← סלולרי ← <b dir=\"ltr\">\"Travel - Holafly\"</b> ← להדליק <b>\"הפעל קו זה\"</b>"],
  ["data", "נתונים דרך Travel - Holafly", "הגדרות ← סלולרי ← <b>נתונים סלולריים</b> ← לבחור <b dir=\"ltr\">\"Travel - Holafly\"</b>"],
  ["roam", "נדידה דולקת ב-Travel - Holafly", "הגדרות ← סלולרי ← <b dir=\"ltr\">\"Travel - Holafly\"</b> ← להדליק <b>\"נדידת נתונים\"</b>"],
  ["il", "נדידה כבויה ב-Personal וב-Business", "הגדרות ← סלולרי ← <b dir=\"ltr\">\"Personal\"</b> ← <b>\"נדידת נתונים\"</b> כבויה. ואותו דבר ב-<b dir=\"ltr\">\"Business\"</b> (כדי שלא יחייבו)"],
  ["hola", "בודקים ב-Holafly", "אפליקציית Holafly ← <b>Purchases</b> ← הסטטוס <b>\"In use\"</b>"]
];
const FIX = [
  "מצב טיסה: להדליק, לחכות 10 שניות, לכבות.",
  "להפעיל את האייפון מחדש.",
  "לוודא שוב ש<b>\"נתונים סלולריים\"</b> על <b dir=\"ltr\">\"Travel - Holafly\"</b>, ושנדידה דולקת בקו הזה (ובקווים Personal ו-Business כבויה).",
  "הגדרות ← סלולרי ← <b dir=\"ltr\">\"Travel - Holafly\"</b> ← <b>בחירת רשת</b>: לכבות <b>\"אוטומטי\"</b>, לחכות לרשימה ולבחור רשת אחרת (T-Mobile / O2 / Vodafone). אחרי דקה להחזיר לאוטומטי.",
  "להתחבר ל-Wi-Fi החינמי של השדה ולכתוב לתמיכה של Holafly בווטסאפ:"
];
const done = () => LS.get("esimDone", {});
function openEsim() {
  const d = done(), n = STEPS.filter(s => d[s[0]]).length;
  openModal(`<h2>📶 הפעלת eSIM בנחיתה</h2><p class="sub">${n === STEPS.length ? "✓ הכול סומן. אם יש אינטרנט, סיימת." : "מסמנים ✓ כל שלב. עובד גם בלי אינטרנט."}</p>
    <ol class="es-l">${STEPS.map(([k, t, how], i) => `<li><button class="es-s${d[k] ? " on" : ""}" data-es="${k}" aria-pressed="${!!d[k]}"><span class="es-c">${d[k] ? "✓" : i + 1}</span><span class="es-t"><b>${t}</b><small>${how}</small></span></button></li>`).join("")}</ol>
    <p class="es-warn">⚠️ <b>לא למחוק את ה-eSIM בשום מצב.</b> אי אפשר להוריד אותו שוב בלי התמיכה.</p>
    <details class="es-fix"${n === STEPS.length ? "" : ""}><summary>🔧 לא עובד? לפי הסדר</summary><ol>${FIX.map(f => `<li>${f}</li>`).join("")}</ol>
      <a class="btn wide es-wa" href="https://wa.me/${HOLA_WA}" target="_blank" rel="noopener">💬 תמיכת Holafly בווטסאפ</a></details>
    <div class="card soft es-calm"><b>😮‍💨 גם אם עדיין אין אינטרנט, זה בסדר.</b><p>הכרטיסים, הוראות הכניסה למלון והמפה שמורים בטלפון ועובדים בלי רשת.</p>
      <div class="row wrap"><button class="btn" id="esTix">🎟️ הכרטיסים</button><button class="btn" id="esHotel">🏨 הגעה למלון</button></div>
      <p style="margin-top:12px">מונית בלי אינטרנט: <b>${TAXI.n}</b> <span dir="ltr">${TAXI.show}</span></p><a class="btn pri wide" href="tel:${TAXI.tel}">📞 להתקשר למונית</a></div>`, "tall");
  $$("#mbody [data-es]").forEach(b => b.onclick = () => { const all = done(), k = b.dataset.es; all[k] = !all[k]; LS.set("esimDone", all); buzz(8); openEsim(); });
  $("#esTix").onclick = () => openTickets(); $("#esHotel").onclick = () => openArrive();
}
/* עולה לבד: 30.11 מ-21:30 (שעון פראג) ועד 04:00, או כשה-GPS בשדה התעופה של פראג (עד 2 ק"מ) — פעם אחת */
const pragueNow = () => { try { const w = wall(); return { d: dstr(w), m: w.getUTCHours() * 60 + w.getUTCMinutes() }; } catch (e) { return { d: "", m: 0 }; } };
function due() {
  if (LS.get("esimAuto", 0)) return false; const p = pragueNow();
  const time = (p.d === "2026-11-30" && p.m >= 21 * 60 + 30) || (p.d === "2026-12-01" && p.m < 4 * 60);
  let atAir = false; try { atAir = !!(gps && hav(gps, TRIP.places.airport) < 2000); } catch (e) {}
  return time || (atAir && p.d >= "2026-11-30" && p.d <= "2026-12-01");
}
function tryAuto() {
  try { if (!window.__ui || !due()) return; if (document.querySelector("#intro, #cine:not([hidden]), #vkGuard, #bootFail")) return;
    if ($("#modal") && !$("#modal").hidden) closeModal(); LS.set("esimAuto", Date.now()); openEsim(); buzz([20, 40, 20]); } catch (e) {}
}
setTimeout(tryAuto, 2500); setInterval(tryAuto, 15000);
window.openEsim = openEsim;
(() => { const s = document.createElement("style"); s.textContent = `
.es-l{list-style:none;margin:10px 0;padding:0;display:flex;flex-direction:column;gap:8px}
.es-s{width:100%;display:flex;align-items:flex-start;gap:12px;min-height:64px;border:0;border-radius:16px;background:var(--card2);color:var(--ink);padding:12px;text-align:start;font:inherit}
.es-s.on{background:color-mix(in srgb,#1f9d55 16%,var(--card2))}
.es-c{flex:none;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:var(--card);font-weight:800;font-size:1rem;box-shadow:inset 0 0 0 2px var(--line)}
.es-s.on .es-c{background:#1f9d55;color:#fff;box-shadow:none}
.es-t b{display:block;font-size:1.02rem;font-weight:700}.es-t small{display:block;color:var(--mut);font-size:.9rem;line-height:1.45;margin-top:2px}.es-t small b{color:var(--ink);display:inline;font-size:inherit;unicode-bidi:isolate}
.es-warn{margin:14px 0;background:#d42a33;color:#fff;border-radius:16px;padding:12px 14px;font-size:1rem;line-height:1.45}
.es-fix{margin:10px 0;border-radius:16px;background:var(--card2);padding:4px 14px}
.es-fix summary{min-height:52px;display:flex;align-items:center;font-weight:700;font-size:1.02rem;cursor:pointer}
.es-fix ol{margin:0 0 10px;padding-inline-start:20px;display:flex;flex-direction:column;gap:8px;line-height:1.45}
.es-wa{margin-bottom:12px;background:#25d366!important;color:#fff!important;text-decoration:none;justify-content:center;display:flex;align-items:center}
.es-calm{margin-top:14px}.es-calm p{margin:6px 0 10px}.es-calm .btn.pri{text-decoration:none;display:flex;justify-content:center;align-items:center}
`; document.head.appendChild(s); })();
(window.__mods = window.__mods || {}).esim = "ok";
} catch (err) { try { (window.__mods = window.__mods || {}).esim = "fail: " + (err && err.message || err); } catch (e) {} }
})();
