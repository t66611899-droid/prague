/* arrive: מדריך "מגיעים למלון" לערב הנחיתה. צעד-אחר-צעד, עובד בלי אינטרנט.
   הקודים, הטלפונים, מספר החדר ותמונת הכניסה מגיעים רק מ"הפרטים שלי" (נשמרים בטלפון). בקוד אין אף אחד מהם. */
"use strict";
const telHref = v => "tel:" + String(v || "").replace(/[^\d+]/g, "");
const arrSt = () => LS.get("arr", {});
const bigCode = (v, what) => v ? `<div class="arr-code" dir="ltr">${esc(v).split("").join("<i></i>")}</div>` : `<button class="arr-miss" data-arr="me">🔑 ${what} עוד לא הוקלד. להכניס ב"הפרטים שלי"</button>`;
const hotelCalls = () => [me.h1, me.h2].filter(v => String(v || "").replace(/\D/g, "").length >= 8).map((v, i) => `<a class="btn" href="${telHref(v)}">📞 חירום מלון ${i + 1}</a>`).join("");
const ARR_STEPS = [
  { k: "air", ic: "🚌", t: "מהשדה לעיר", b: () => `<ul class="tips">
      <li><b>AirportExpress (AE)</b> מחוץ לטרמינל 1: כרטיס אצל הנהג, 200 Kč. יוצא כל 20 עד 30 דק', האחרון בסביבות 22:00. יורדים בתחנה המרכזית (Hlavní nádraží).</li>
      <li>משם <b>מטרו קו C (האדום)</b>, 2 תחנות עד <b>I.P. Pavlova</b>. כרטיס 39 Kč מהמכונה או מהקיוסק, ו<b>חייבים להחתים</b> במכשיר הצהוב בכניסה.</li>
      <li>פספסת את ה-AE? קו 59 עד Nádraží Veleslavín, מטרו A עד Muzeum, ושם מחליפים ל-C תחנה אחת. בערך שעה.</li>
      <li>אחרי 00:15: אוטובוס לילה <b>910</b>, כל חצי שעה בערך. או פשוט Bolt.</li></ul>
      <div class="row wrap"><button class="btn" data-act="bolt">🚕 Bolt</button><button class="btn" data-arr="taxi">להראות כתובת לנהג</button></div>` },
  { k: "metro", ic: "🚇", t: "יוצאים ב-I.P. Pavlova", b: () => `<p>עולים <b>במעלית</b> מהרציף. כשיוצאים לרחוב, המלון כמעט ממול.</p>${me.hotel && me.hotel.q ? `<p class="fine">${bd(me.hotel.q)}</p>` : ""}<div class="row wrap"><a class="btn" href="${navUrl(place("hotel"))}" target="_blank" rel="noopener">🧭 נווט למלון</a></div>` },
  { k: "rec", ic: "🚪", t: "דלת הקבלה", b: () => `<p>הדלת <b>החומה מעץ, בצד ימין</b> של הבניין, מתחת לשלט HOTEL של המלון. לוח המקשים השחור מימין לדלת.</p><div id="arrPic"></div><small class="arr-l">קוד דלת הקבלה</small>${bigCode(me.rc, "קוד דלת הקבלה")}` },
  { k: "env", ic: "✉️", t: "המעטפה עם השם שלך", b: () => `<p>בפנים, על הארון הכחול, יש מעטפה עם השם שלך. בתוכה <b>כרטיסי החדר ומספר החדר</b>.</p><label class="fld">מספר החדר (מהמעטפה)<input id="arrRoom" inputmode="numeric" dir="ltr" autocomplete="off" value="${esc(me.room || "")}" placeholder="למשל 12"></label>` },
  { k: "out", ic: "↩️", t: "יוצאים חזרה לרחוב", b: () => `<p>יוצאים מהקבלה חזרה לרחוב ו<b>סוגרים את הדלת בזהירות</b>, עד שהיא ננעלת.</p>` },
  { k: "door", ic: "🏛️", t: "כניסת החדרים", b: () => `<p>הדלת <b>הגדולה עם העמודים, בצד שמאל</b> של הבניין, ליד מסעדת Legenda. מצמידים את <b>כרטיס החדר</b> לקורא שליד הפעמונים, או מקלידים קוד ואז Enter.</p><small class="arr-l">קוד כניסת החדרים + Enter</small>${bigCode(me.ec, "קוד כניסת החדרים")}` },
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
    else if (a === "done") { const s = arrSt(); if (s[k]) delete s[k]; else s[k] = 1; LS.set("arr", s); buzz(10); const nx = ARR_STEPS.find(x => !s[x.k]); if (!nx) { toast("🎉 אתה בחדר. לילה טוב!", 3600); } openArrive(s[k] && nx ? nx.k : k); const c = $("#mbody li.cur"); if (c) c.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
    else if (a === "me") openMe();
    else if (a === "sos") openSOS();
    else if (a === "taxi") showTaxi();
    else if (a === "home") waSend("הגעתי למלון, הכול בסדר 🏨"); });
}
/* נפתח לבד: בערב הראשון אחרי הנחיתה, ושוב כשמתקרבים למלון */
function arriveAuto() {
  const T = tripNow(); if (T.phase !== "during" || T.dayIdx !== 0 || T.min < 21 * 60 + 35) return; const st = arrSt(); if (st.room) return;
  if (!$("#modal").hidden || !$("#splash").hidden) return;
  const near = gps && hav(gps, place("hotel")) < 300;
  if (near && !LS.get("arrA2")) { LS.set("arrA2", 1); LS.set("arrA1", 1); ["air", "metro"].forEach(k => st[k] = 1); LS.set("arr", st); buzz([20, 60, 20]); openArrive(); }
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
if (!LS.get("planFix1")) { const fix = { "מפעילים eSIM · Bolt למלון": "מפעילים eSIM · AirportExpress או Bolt", "מפתח מהארון הכחול": "קוד בדלת הקבלה · מעטפה על הארון הכחול", "200 Kč במזומן": "200 Kč · מזומן או כרטיס" }; let ch = false;
  plan.forEach(d => d.stops.forEach(s => { if (fix[s.w]) { s.w = fix[s.w]; ch = true; } if (s.at === "epic" && !s.w) { s.w = "דלתות 22:00 · כרטיס Basic"; ch = true; } })); if (ch && LS.get("plan")) savePlan(); LS.set("planFix1", 1); }
