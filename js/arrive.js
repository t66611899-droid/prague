/* arrive: מדריך "מגיעים למלון" לערב הנחיתה. צעד-אחר-צעד, עובד בלי אינטרנט.
   הקודים, הטלפונים, מספר החדר ותמונת הכניסה מגיעים רק מ"הפרטים שלי" (נשמרים בטלפון). בקוד אין אף אחד מהם. */
"use strict";
const telHref = v => "tel:" + String(v || "").replace(/[^\d+]/g, "");
const arrSt = () => LS.get("arr", {});
const bigCode = (v, what) => v ? `<div class="arr-code" dir="ltr">${esc(v).split("").join("<i></i>")}</div>` : `<button class="arr-miss" data-arr="me">🔑 ${what} עוד לא הוקלד. להכניס ב"הפרטים שלי"</button>`;
const hotelCalls = () => [me.h1, me.h2].filter(v => String(v || "").replace(/\D/g, "").length >= 8).map((v, i) => `<a class="btn" href="${telHref(v)}">📞 חירום מלון ${i + 1}</a>`).join("");
const ARR_STEPS = [
  { k: "esim", ic: "📶", t: "להדליק את ה-eSIM", b: () => `<p>מדליקים את הקו <b dir="ltr">Travel - Holafly</b>, ונתונים סלולריים דרכו. כל הצעדים עם ✓ במסך ה-eSIM.</p><div class="row wrap"><button class="btn" data-arr="esim">📶 מסך ה-eSIM</button></div>` },
  { k: "cash", ic: "💵", t: "לפרוט שטר של 1,000 Kč", b: () => `<p>קונים משהו קטן בשדה (מים, שוקולד) ומשלמים בשטר של <b>1,000 Kč</b>, כדי שיהיו שטרות קטנים לנהג.</p>` },
  { k: "air", ic: "🚕", t: "Bolt למלון, במזומן", b: () => `<ol class="tips">
      <li>פותחים את <b>Bolt</b>. ביעד בוחרים <b>"מלון"</b> מהשמורים, או מדביקים את הכתובת (הכפתור למטה מעתיק אותה).</li>
      <li><b>לפני ההזמנה</b>: אמצעי תשלום ← <b>Cash</b>.</li>
      <li>הולכים ל<b>נקודת האיסוף שמופיעה באפליקציה</b>. לא עולים עם מי שניגש אליך, גם אם הוא אומר "Bolt".</li>
      <li>בודקים שהלוחית תואמת לאפליקציה. מחיר צפוי <b>550–700 Kč</b>.</li></ol>
      <div class="row wrap"><button class="btn pri" data-act="bolt">🚕 Bolt</button><button class="btn" data-arr="taxi">להראות כתובת לנהג</button></div>
      <details class="arr-alt"><summary>אם Bolt יקר או לא זמין</summary><ul class="tips">
      <li><b>טרוליבוס 59</b> מהטרמינל עד <b>Nádraží Veleslavín</b>, שם <b>מטרו A</b> עד <b>Muzeum</b>, ומחליפים ל<b>מטרו C</b> תחנה אחת עד <b>I.P. Pavlova</b>. יוצאים במעלית, המלון כמעט ממול.</li>
      <li>כרטיס <b>90 דק'</b>: 46 Kč באפליקציית PID Lítačka, או 50 Kč נייר מהמכונה (חובה להחתים כשעולים).</li>
      <li><b>ה-59 האחרון יוצא מהשדה ב-23:32.</b> אחרי זה רק אוטובוס לילה <b>910</b>, ישר ל-I.P. Pavlova, כל 30 דק'.</li>
      <li>גיבוי אחרון: מונית <b>AAA</b>, בטלפון.</li></ul><div class="row wrap"><a class="btn" href="tel:+420222333222">📞 מונית AAA</a></div></details>` },
  { k: "rec", ic: "🚪", t: "דלת הקבלה", b: () => `<p>הדלת <b>החומה מעץ, בצד ימין</b> של הבניין, מתחת לשלט HOTEL של המלון. לוח המקשים השחור מימין לדלת.</p><div id="arrPic"></div><small class="arr-l">קוד דלת הקבלה</small>${bigCode(me.rc, "קוד דלת הקבלה")}` },
  { k: "env", ic: "✉️", t: "המעטפה עם השם שלך", b: () => `<p>בפנים, על הארון הכחול, יש מעטפה עם השם שלך. בתוכה <b>כרטיסי החדר ומספר החדר</b>.</p><label class="fld">מספר החדר (מהמעטפה)<input id="arrRoom" inputmode="numeric" dir="ltr" autocomplete="off" value="${esc(me.room || "")}" placeholder="למשל 12"></label>` },
  { k: "out", ic: "↩️", t: "יוצאים חזרה לרחוב", b: () => `<p>יוצאים מהקבלה חזרה לרחוב ו<b>סוגרים את הדלת בזהירות</b>, עד שהיא ננעלת.</p>` },
  { k: "door", ic: "🏛️", t: "כניסת החדרים", b: () => `<p>הדלת <b>הגדולה עם העמודים, בצד שמאל</b> של הבניין, ליד מסעדת Legenda. מצמידים את <b>כרטיס החדר</b> לקורא שליד הפעמונים, או מקלידים את הקוד ואז <b>Enter</b>.</p><small class="arr-l">קוד כניסת החדרים + Enter</small>${bigCode(me.ec, "קוד כניסת החדרים")}` },
  { k: "room", ic: "🛏️", t: "בחדר", b: () => `${me.room ? `<div class="arr-code room">חדר ${esc(me.room)}</div>` : ""}<p>הגעת. מטעינים את הטלפון ושולחים הודעה קצרה הביתה.</p><div class="row wrap"><button class="btn wa" data-arr="home">💬 "הגעתי למלון"</button></div>
      <p class="fine">לימים הבאים: צ'ק-אאוט עד 11:00. מס עירוני 50 Kč ללילה (200 Kč בסך הכול) משלמים במקום, במזומן (אירו או קרונות) או בכרטיס. אם הקבלה סגורה כשעוזבים, משאירים את הכרטיסים בחדר וסוגרים את הדלת.</p>` }
];
async function arrPic() { const box = $("#arrPic"); if (!box) return; try { const b = await imgGet("hotelDoor"); if (b && $("#arrPic")) $("#arrPic").innerHTML = `<img class="arr-img" src="${URL.createObjectURL(b)}" alt="הכניסה למלון">`; } catch (e) {} }
function openArrive(openK) {
  const st = arrSt(), cur = openK || (ARR_STEPS.find(s => !st[s.k]) || {}).k, n = ARR_STEPS.filter(s => st[s.k]).length, calls = hotelCalls();
  openModal(`<h2>🏨 מגיעים למלון</h2><p class="sub">צ'ק-אין עצמי: ביום שני הקבלה נסגרת ב-16:00. עובד גם בלי אינטרנט.</p>
    <div class="arr-bar"><i style="width:${Math.round(n / ARR_STEPS.length * 100)}%"></i></div>
    <ol class="arr">${ARR_STEPS.map((s, i) => `<li class="${st[s.k] ? "ok" : ""}${s.k === cur ? " cur" : ""}" data-k="${s.k}"><button class="arr-h" data-arr="open"><span>${st[s.k] ? "✓" : s.ic}</span><b>${i + 1}. ${s.t}</b></button>${s.k === cur ? `<div class="arr-b">${s.b()}<button class="btn pri wide" data-arr="done">${st[s.k] ? "לבטל ✓" : "✓ עשיתי, הלאה"}</button></div>` : ""}</li>`).join("")}</ol>
    <div class="card soft"><b>📞 משהו לא נפתח?</b><p class="sub">הקבלה עונה רק בשעות הפעילות. בלילה יש שני מספרי חירום של המלון (כתובים גם על דלת הקבלה).</p><div class="row wrap">${calls || `<button class="btn" data-arr="me">להכניס את טלפוני החירום של המלון</button>`}<button class="btn" data-arr="sos">🆘 מסך החירום</button></div></div>`, "tall");
  arrPic();
  const room = $("#arrRoom"); if (room) room.oninput = () => { me.room = room.value.trim(); LS.set("me", me); };
  $$("#mbody [data-arr]").forEach(b => b.onclick = () => { const a = b.dataset.arr, li = b.closest("li"), k = li && li.dataset.k;
    if (a === "open") openArrive(k);
    else if (a === "done") { const s = arrSt(); if (s[k]) delete s[k]; else s[k] = 1; LS.set("arr", s); buzz(10); const nx = ARR_STEPS.find(x => !s[x.k]); if (!nx) { toast("🎉 אתה בחדר. לבד, בעיר זרה, והסתדרת. לילה טוב.", 4200); } openArrive(s[k] && nx ? nx.k : k); const c = $("#mbody li.cur"); if (c) c.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
    else if (a === "me") openMe();
    else if (a === "sos") openSOS();
    else if (a === "taxi") showTaxi();
    else if (a === "esim") { if (window.openEsim) openEsim(); }
    else if (a === "home") waSend("הגעתי למלון, הכול בסדר 🏨"); });
}
/* נפתח לבד: בערב הראשון אחרי הנחיתה, ושוב כשמתקרבים למלון */
function arriveAuto() {
  const T = tripNow(); if (T.phase !== "during" || T.dayIdx !== 0 || T.min < 21 * 60 + 35 + Math.round(fltAdj("out") / 6e4)) return; const st = arrSt(); if (st.room) return;
  if (!$("#modal").hidden || !$("#splash").hidden) return;
  const near = gps && hav(gps, place("hotel")) < 300;
  if (near && !LS.get("arrA2")) { LS.set("arrA2", 1); LS.set("arrA1", 1); ["esim", "cash", "air"].forEach(k => st[k] = 1); LS.set("arr", st); buzz([20, 60, 20]); openArrive(); }
  else if (!LS.get("arrA1")) { LS.set("arrA1", 1); openArrive(); }
}
setInterval(arriveAuto, 15000); setTimeout(arriveAuto, 6000);

/* "הפרטים שלי": שדות המלון החדשים (נשמרים רק בטלפון) */
if (me.code && !me.rc) { me.rc = me.code; LS.set("me", me); }
window.openMe = (old => function () {
  old.apply(this, arguments);
  const oldCode = $('#mbody [data-me="code"]'); if (oldCode) oldCode.closest("label").remove();
  const hot = $("#hotF") && $("#hotF").closest(".card"); if (!hot) return;
  const f = (k, label, ph, type, mode) => `<label class="fld">${label}<input data-me2="${k}" type="${type || "text"}" ${mode ? `inputmode="${mode}"` : ""} value="${esc(me[k] || "")}" placeholder="${ph}" dir="ltr" autocomplete="off"></label>`;
  hot.insertAdjacentHTML("afterend", `<div class="card soft"><b>🔑 כניסה למלון</b><p class="sub">מהמייל של המלון. מוצג במדריך "מגיעים למלון" ברגע הנכון.</p>
    ${f("rc", "קוד דלת הקבלה", "הקוד ללוח המקשים השחור", "text", "numeric")}${f("ec", "קוד כניסת החדרים (אם יש)", "מקלידים ואז Enter", "text", "numeric")}
    ${f("h1", "טלפון חירום של המלון 1", "+420…", "tel", "tel")}${f("h2", "טלפון חירום של המלון 2", "+420…", "tel", "tel")}${f("room", "מספר החדר", "ממלאים אחרי שמוצאים את המעטפה", "text", "numeric")}
    <label class="btn wide" style="display:flex">🖼️ תמונת הכניסה (מהגלריה)<input id="meDoor" type="file" accept="image/*" hidden></label><div id="meDoorP"></div>
    <button class="btn wide" id="meArr">🏨 לפתוח את המדריך "מגיעים למלון"</button></div>`);
  $$("#mbody [data-me2]").forEach(i => i.oninput = () => { me[i.dataset.me2] = i.value.trim(); LS.set("me", me); });
  const show = async () => { try { const b = await imgGet("hotelDoor"); if ($("#meDoorP")) $("#meDoorP").innerHTML = b ? `<img class="arr-img" src="${URL.createObjectURL(b)}" alt=""><button class="lnk" id="meDoorX">להסיר את התמונה</button>` : ""; const x = $("#meDoorX"); if (x) x.onclick = async () => { await imgDel("hotelDoor"); show(); }; } catch (e) {} };
  $("#meDoor").onchange = async e => { const file = e.target.files[0]; if (!file) return; try { await imgPut("hotelDoor", await shrinkTo(file, 1600, 0.82, true)); toast("התמונה נשמרה בטלפון ✓"); show(); } catch (err) { toast("לא הצלחתי לשמור את התמונה"); } };
  $("#meArr").onclick = () => openArrive(); show();
})(window.openMe);

/* מסך החירום: חיוג לטלפוני החירום של המלון */
window.openSOS = (old => function (test) {
  old.apply(this, arguments); if (test) return; const g = $("#mbody .sos-grid"); if (!g) return;
  [me.h2, me.h1].forEach((v, i) => { if (String(v || "").replace(/\D/g, "").length >= 8) g.insertAdjacentHTML("afterbegin", `<a class="sos-t" href="${telHref(v)}"><span>🏨</span><b>חירום מלון ${2 - i}</b><small><bdi dir="ltr">${esc(v)}</bdi> · גם בלילה</small></a>`); });
})(window.openSOS);

/* עדכון חד-פעמי של טקסטים בתוכנית שכבר שמורה בטלפון (אחרי המיילים מהמלון ומ-EPIC), בלי לאפס שינויים שעשית */
if (!LS.get("planFix2")) { let ch = false; // תחבורה 2026: 59 + מטרו כברירת מחדל, יציאה לשדה 09:45 באותו מסלול הפוך
  plan.forEach(d => d.stops.forEach(s => { if (s.n === "נחיתה בפראג" && /AirportExpress|Bolt/.test(s.w || "")) { s.w = "מפעילים eSIM · טרוליבוס 59 + מטרו (כרטיס 90 דק') או Bolt"; ch = true; } if (s.n === "מס עירוני · Bolt לשדה") { s.n = "מס עירוני · יוצאים לשדה"; s.w = "200 Kč · מטרו C→A + טרוליבוס 59 (כרטיס 90 דק') או Bolt"; ch = true; } }));
  if (ch && LS.get("plan")) savePlan(); LS.set("planFix2", 1); }
if (!LS.get("planFix1")) { const fix = { "מפעילים eSIM · Bolt למלון": "מפעילים eSIM · AirportExpress או Bolt", "מפתח מהארון הכחול": "קוד בדלת הקבלה · מעטפה על הארון הכחול", "200 Kč במזומן": "200 Kč · מזומן או כרטיס" }; let ch = false;
  plan.forEach(d => d.stops.forEach(s => { if (fix[s.w]) { s.w = fix[s.w]; ch = true; } if (s.at === "epic" && !s.w) { s.w = "דלתות 22:00 · כרטיס Basic"; ch = true; } })); if (ch && LS.get("plan")) savePlan(); LS.set("planFix1", 1); }

if (!LS.get("planFix2")) { const fix = { "הרציף לפי המייל של Duplex": "דלתות 19:00 · הרציף ושעת העלייה בכרטיס שב-Wallet", "כניסה כלולה בכרטיס": "כניסה כלולה בכרטיס הסירה", "לשקול 8 ק\"ג": "לבדוק משקל ומידות התיק · מנוחה לפני Duplex", "חזרה עד 3:00": "להגיע 00:00–01:00, לפני זה ריק" }; let ch = false;
  plan.forEach(d => d.stops.forEach(s => { if (fix[s.w]) { s.w = fix[s.w]; ch = true; } if (d.date === "2026-12-04" && s.m === 600 && /^מס עירוני/.test(s.n)) { s.m = 585; ch = true; } })); if (ch && LS.get("plan")) savePlan(); LS.set("planFix2", 1); }

if (!LS.get("planFix3")) { let ch = false; plan.forEach(d => d.stops.forEach(s => { if (s.w === "לבדוק משקל ומידות התיק · מנוחה לפני Duplex" || s.w === "לשקול 8 ק\"ג") { s.w = "לשקול את התיק: מעל 8 ק\"ג? מזוודה אונליין (€40), לא בשער (€60) · לנוח"; ch = true; } })); if (ch && LS.get("plan")) savePlan(); LS.set("planFix3", 1); }

if (!LS.get("planFix4")) { let ch = false; plan.forEach(d => d.stops.forEach(s => {
    if (s.n === "נחיתה בפראג" && /59|Bolt/.test(s.w || "")) { s.w = "21:35 שעון פראג · eSIM · Bolt במזומן (550–700 Kč) · גיבוי: 59 + מטרו"; ch = true; }
    if (s.n === "המראה QS1285" && s.w === "הדלפק נסגר 17:25") { s.w = "הדלפק נסגר 17:25 (שעון ישראל)"; ch = true; } }));
  if (ch && LS.get("plan")) savePlan(); LS.set("planFix4", 1); }
/* planFix5: עדכון טקסטים ותחנות חדשות (EES, My People Bar, Footshop, Tax Free) גם בתוכנית ששמורה בטלפון. רץ פעם אחת, אחרי התיקונים הקודמים */
if (!LS.get("planFix5")) { let ch = false; const day = k => plan.find(x => x.date === k);
  const put = (k, st) => { const x = day(k); if (!x || x.stops.some(s => s.n === st.n)) return; let i = x.stops.findIndex(s => s.m > st.m); if (i < 0) i = x.stops.length; x.stops.splice(i, 0, st); ch = true; };
  const set = (k, f, w) => { const x = day(k); if (!x) return; x.stops.forEach(s => { if (f(s) && s.w !== w) { s.w = w; ch = true; } }); };
  set("2026-11-30", s => s.n === "נחיתה בפראג", "נחיתה · רישום EES בעמדה (כ-20–45 דק') · eSIM · Bolt במזומן");
  set("2026-12-04", s => /^בשדה/.test(s.n), "EES גם ביציאה · דלפק נסגר 12:05");
  set("2026-12-03", s => s.at === "palladium" && !s.w, "Tax Free מעל 2001 Kč בקבלה אחת");
  put("2026-12-02", { id: "d2mp", m: 21 * 60, n: "My People Bar – שוטים עם קסדה (לאכול לפני)", at: "mypeople", w: "Michalská 20", big: false, il: false });
  put("2026-12-03", { id: "d3fs", m: 13 * 60 + 30, n: "Footshop – סניקרס במבצע", at: "prik", w: "", big: false, il: false });
  if (ch && LS.get("plan")) savePlan(); LS.set("planFix5", 1); }
/* planFix6: התחנה הישנה "קונים ב-Footshop" (14:00) יורדת, כי יש עכשיו Footshop ב-13:30 */
if (!LS.get("planFix6")) { let ch = false; const x = plan.find(d => d.date === "2026-12-03");
  if (x) { const n = x.stops.length; x.stops = x.stops.filter(s => s.n !== "קונים ב-Footshop"); ch = x.stops.length !== n; }
  if (ch && LS.get("plan")) savePlan(); LS.set("planFix6", 1); }
/* planFix7: Footshop מקבל נקודה משלו על המפה (החנות עצמה, לא כל הרחוב) */
if (!LS.get("planFix7")) { let ch = false; plan.forEach(d => d.stops.forEach(s => { if (/^Footshop/.test(s.n) && s.at === "prik") { s.at = "footshop"; ch = true; } }));
  if (ch && LS.get("plan")) savePlan(); LS.set("planFix7", 1); }
/* planFix8 (28.11): 4.12 יוצאים ב-09:00 ב-Bolt ובשדה בסביבות 09:45; אין צ'ק-אין אונליין; LITE. רק טקסט ושעות, שום דבר לא נמחק */
if (!LS.get("planFix8")) { let ch = false; const set = (s, k, v) => { if (s[k] !== v) { s[k] = v; ch = true; } };
  plan.forEach(d => d.stops.forEach(s => {
    if (d.date === "2026-12-04" && s.n === "קמים וסוגרים תיק") { set(s, "m", 8 * 60 + 15); set(s, "w", "מעיל ונעליים החדשות עליך, את הקופסה זורקים"); }
    if (d.date === "2026-12-04" && /^מס עירוני/.test(s.n)) { set(s, "m", 9 * 60); set(s, "w", "200 Kč · Bolt לשדה (גיבוי: מטרו C→A + טרוליבוס 59)"); }
    if (d.date === "2026-12-04" && /^בשדה/.test(s.n)) { set(s, "m", 9 * 60 + 45); set(s, "w", "Tax Free קודם: הדלפק לפני הצ'ק-אין, בצד שמאל · EES · ישר לדלפק, נסגר 12:05"); }
    if (s.n === "המראה QS1285") set(s, "w", "ישר לדלפק, נסגר 17:25 (שעון ישראל)");
    if (d.date === "2026-12-03" && /^מלון · לארוז/.test(s.n)) set(s, "w", "LITE: תיק אחד 55×40×23 עד 8 ק\"ג · מעל? מזוודה באתר מראש, בשער כ-€60 · לנוח");
  }));
  plan.forEach(d => { if (d.date === "2026-12-04") d.stops.sort((a, b) => a.m - b.m); });
  if (ch && LS.get("plan")) savePlan(); LS.set("planFix8", 1); }
