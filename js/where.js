/* where: מאיפה האפליקציה מחשבת "קרוב אליי". תמיד מהמיקום האמיתי האחרון, אף פעם לא ממיקום מדומה.
   • GPS טוב (דיוק עד 200 מ', בפראג): ממנו.  • GPS לא מדויק: "מיקום לא מדויק", מחושב מהמלון (ולא תוצאות שגויות).
   • אין הרשאה / אין GPS / רחוק מפראג: מחושב מהמלון, וכתוב למה.
   • "📍 המיקום שלי" בתפריט ← הגדרות: קואורדינטות, דיוק, מקור ומתי עודכן.  • אין הרשאה: מסך עם ההוראות ל-Chrome באייפון.
   מוגן: אם משהו כאן נכשל, שאר האפליקציה עולה כרגיל. */
"use strict";
(function () {
try {
const WEAK = 200;
let perm = "unknown";
try { navigator.permissions && navigator.permissions.query({ name: "geolocation" }).then(p => { perm = p.state; p.onchange = () => { perm = p.state; }; }).catch(() => {}); } catch (e) {}
const hotel = () => { const p = TRIP.places.hotel; return me && me.hotel && me.hotel.lat ? { ...p, ...me.hotel } : p; };
const near = () => { try { return typeof gpsNear === "function" ? gpsNear() : true; } catch (e) { return true; } };
/* {lat,lng,me,src,label,acc,t} — src: gps | weak | denied | far | none */
function myPos() {
  const h = hotel(), H = (src, label) => ({ lat: h.lat, lng: h.lng, me: false, src, label, acc: gps ? gps.acc : null, t: gps ? gps.t : null });
  if (gps && near() && (gps.acc || 0) <= WEAK) return { lat: gps.lat, lng: gps.lng, me: true, src: "gps", label: "📍 לפי המיקום שלך", acc: gps.acc, t: gps.t };
  if (gps && near()) return H("weak", `📍 מיקום לא מדויק (±${Math.round(gps.acc)} מ'), אז מחושב מהמלון`);
  if (gps) return H("far", "🏨 אתה לא בפראג, אז מחושב מהמלון");
  if (perm === "denied" || (settings && settings.gps === false && perm !== "granted" && perm !== "unknown")) return H("denied", "🔒 אין הרשאת מיקום, אז מחושב מהמלון");
  return H("none", "🏨 אין מיקום עדיין, אז מחושב מהמלון");
}
const ago = t => { if (!t) return "אף פעם"; const s = Math.round((Date.now() - t) / 1000); return s < 60 ? `לפני ${s} שנ'` : s < 3600 ? `לפני ${Math.round(s / 60)} דק'` : `לפני ${Math.round(s / 3600)} שע'`; };
function locDiag() {
  const P = myPos(), src = { gps: "GPS", weak: "GPS לא מדויק → מחושב מהמלון", far: "GPS (מחוץ לפראג) → מחושב מהמלון", denied: "אין הרשאה → מחושב מהמלון", none: "אין GPS עדיין → מחושב מהמלון" }[P.src];
  return gps ? `📍 המיקום שלי: ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)} · ±${Math.round(gps.acc)} מ' · ${src} · עודכן ${ago(gps.t)}` : `📍 המיקום שלי: אין · ${src} · הרשאה: ${{ granted: "יש", denied: "חסומה", prompt: "עוד לא נשאלה", unknown: "לא ידוע" }[perm] || perm}`;
}
function openLocHelp() {
  openModal(`<h2>📍 צריך לאשר מיקום</h2><p class="sub">בלי זה אין "קרוב אליי", אין ניווט חי והמפה לא יודעת איפה אתה. המיקום נשאר בטלפון.</p>
    <ol class="lh-steps"><li>פותחים את <b>הגדרות</b> של האייפון</li><li>גוללים ל-<b>Chrome</b></li><li><b>מיקום</b> ← בוחרים <b>"בזמן השימוש ביישום"</b></li><li>מדליקים את <b>"מיקום מדויק"</b></li><li>חוזרים לכאן ולוחצים "לנסות שוב"</li></ol>
    <p class="fine">אם עדיין לא עובד: ב-Chrome, ⋯ ← הגדרות ← הגדרות תוכן ← מיקום, ולוודא שהאתר הזה לא חסום.</p>
    <div class="row"><button class="btn pri wide" id="lhTry">לנסות שוב</button></div><p class="fine" id="lhDiag" style="user-select:text;-webkit-user-select:text">${esc(locDiag())}</p>`);
  $("#lhTry").onclick = () => { closeModal(); try { settings.gps = true; saveSet(); stopGPS(); startGPS(true); askCompass(); } catch (e) {} };
}
/* הרשאה חסומה: במקום toast שנעלם, מסך עם ההוראות (פעם בפתיחה, או כשלוחצים על כפתור המיקום) */
let shown = false;
window.locateTap = (old => function () { if (perm === "denied") return openLocHelp(); return old.apply(this, arguments); })(window.locateTap);
const watchDenied = () => { if (perm === "denied" && settings.gps && !shown && window.__ui) { shown = true; openLocHelp(); } };
setInterval(watchDenied, 4000);
/* "מה יש פה?" — אותו כלל: GPS רק אם הוא מדויק ובפראג */
const patchRef = () => { if (!window.__ui || typeof window.refPoint !== "function") return setTimeout(patchRef, 200); window.refPoint = function () { const P = myPos(); if (P.me) return { lat: P.lat, lng: P.lng, me: true }; try { const c = map.getCenter(); return { lat: c.lat, lng: c.lng, me: false }; } catch (e) { return { lat: P.lat, lng: P.lng, me: false }; } }; }; patchRef(); /* refPoint מוגדר ב-extras.js, שנטען אחרי הקובץ הזה */
/* בלי מעקב חי להורים: המיקום מגיע אליהם רק עם רגע שמעלים (ראו journal) */
if (typeof window.liveTick === "function") window.liveTick = function () {};
Object.assign(window, { myPos, locDiag, openLocHelp });
(() => { const s = document.createElement("style"); s.textContent = `.lh-steps{margin:10px 0 12px;padding-inline-start:22px;display:flex;flex-direction:column;gap:8px;font-size:1.02rem;line-height:1.4}.lh-steps b{font-weight:700}`; document.head.appendChild(s); })();
(window.__mods = window.__mods || {}).where = "ok";
} catch (err) { try { (window.__mods = window.__mods || {}).where = "fail: " + (err && err.message || err); } catch (e) {} }
})();
