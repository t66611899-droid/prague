/* harel: ביטוח הנסיעות (הראל). אין להם API, אז ה"חיבור" הוא כפתורים מוכנים: חיוג, ווטסאפ עם הודעה מוכנה, ומספר הפוליסה בגדול.
   מספרי המוקד ציבוריים (מופיעים בפוליסה). מספר הפוליסה והשם המלא נשמרים רק בטלפון, ב"הפרטים שלי". */
"use strict";
const HAREL = { tel: "+97237547030", telShow: "+972-3-7547030", wa: "972527544589", waShow: "+972-52-7544589" };
function harelMsg() {
  const p = lastKnown(), name = (me.fullname || "").trim(), pol = (me.pol || "").trim();
  return `שלום, ${name ? "אני " + name + ", " : ""}${pol ? "פוליסה " + pol + ", " : ""}נמצא בפראג, צ'כיה. צריך עזרה רפואית.\nהמיקום שלי: ${p ? mapsLink(p) : "לא זמין כרגע"}\nהשעה בפראג: ${clockNow()}`;
}
function harelWa() { const t = encodeURIComponent(harelMsg()); window.open(isOffline() ? `whatsapp://send?phone=${HAREL.wa}&text=${t}` : `https://wa.me/${HAREL.wa}?text=${t}`, "_blank", "noopener"); }
function harelCard() {
  const pol = (me.pol || "").trim();
  return `<div class="hrl"><b>🏥 ביטוח הראל · מוקד 24/7</b><small>הם מפנים לבית חולים או מרפאה ומסדרים את התשלום. דחוף ממש? קודם 112.</small>
    ${pol ? `<div class="hrl-pol"><small>מספר פוליסה (להקראה)</small><b dir="ltr">${esc(pol)}</b></div>` : `<button class="lnk" data-hr="me">➕ להוסיף את מספר הפוליסה ב"הפרטים שלי"</button>`}
    <div class="row wrap"><a class="btn hrl-call" href="tel:${HAREL.tel}">📞 להתקשר למוקד</a><button class="btn wa" data-hr="wa">💬 ווטסאפ למוקד</button></div>
    ${typeof tixN === "function" && tixN("ins") ? `<button class="btn wide" data-hr="pol">📄 לפתוח את הפוליסה</button>` : ""}
    <p class="fine">ווטסאפ: <bdi dir="ltr">${HAREL.waShow}</bdi> · טלפון: <bdi dir="ltr">${HAREL.telShow}</bdi>. ההודעה כוללת את הפוליסה, המיקום והשעה, ואפשר לערוך לפני ששולחים.</p></div>`;
}
const bindHarel = root => $$("[data-hr]", root || document).forEach(b => b.onclick = () => b.dataset.hr === "wa" ? harelWa() : b.dataset.hr === "pol" ? showTicket("ins") : openMe());

/* מסך החירום: כרטיס הראל במקום הכפתור הכללי של "מוקד הביטוח" */
window.openSOS = (old => function (test) {
  old.apply(this, arguments); if (test) return;
  $$("#mbody .sos-t").forEach(t => { if (/מוקד הביטוח/.test(t.textContent)) t.remove(); });
  const g = $("#mbody .sos-grid"); if (g) { g.insertAdjacentHTML("beforebegin", harelCard()); bindHarel($("#mbody")); }
})(window.openSOS);

/* "הפרטים שלי": פוליסה ושם מלא, בכרטיס של הביטוח */
window.openMe = (old => function () {
  old.apply(this, arguments);
  ["ins", "pol"].forEach(k => { const i = $(`#mbody [data-me="${k}"]`); if (i) i.closest("label").remove(); });
  const ref = $("#meArr") ? $("#meArr").closest(".card") : $("#hotF") && $("#hotF").closest(".card"); if (!ref) return;
  ref.insertAdjacentHTML("afterend", `<div class="card soft"><b>🏥 ביטוח נסיעות · הראל</b><p class="sub">מופיע במסך החירום ובהודעת הווטסאפ למוקד. נשמר רק בטלפון.</p>
    <label class="fld">מספר פוליסה<input data-me3="pol" value="${esc(me.pol || "")}" dir="ltr" inputmode="numeric" autocomplete="off" placeholder="מהפוליסה"></label>
    <label class="fld">שם מלא (כמו בפוליסה)<input data-me3="fullname" value="${esc(me.fullname || "")}" dir="auto" autocomplete="off" placeholder="שם פרטי, שם אמצעי ומשפחה"></label>
    <p class="fine">מוקד 24/7: <bdi dir="ltr">${HAREL.telShow}</bdi> · ווטסאפ <bdi dir="ltr">${HAREL.waShow}</bdi></p></div>`);
  $$("#mbody [data-me3]").forEach(i => i.oninput = () => { me[i.dataset.me3] = i.value.trim(); LS.set("me", me); });
})(window.openMe);

/* העוזר: חולה, רופא, פציעה, איך משתמשים בביטוח */
(() => {
  const ins = () => `${(me.pol || "").trim() ? `מספר הפוליסה שלך: <b dir="ltr">${esc(me.pol)}</b>. ` : "את מספר הפוליסה מכניסים ב\"הפרטים שלי\". "}`;
  const steps = `<ol class="qa-o"><li><b>דחוף</b> (קשה לנשום, דימום חזק, איבוד הכרה, כאב חזה): <b>112</b> מיד. אחר כך מעדכנים את הראל.</li><li><b>לא דחוף אבל צריך רופא</b>: מתקשרים או שולחים ווטסאפ ל<b>מוקד הראל</b>. הם מפנים לבית חולים או מרפאה ומסדרים את התשלום.</li><li>שומרים <b>כל קבלה</b> על הוצאה רפואית (רופא, תרופות, מונית לבית החולים), ומצלמים כל מסמך שמקבלים.</li><li>מעדכנים את ההורים.</li></ol>`;
  const btns = () => callA("112", "112") + `<a class="btn" href="tel:${HAREL.tel}">📞 מוקד הראל</a>` + actB("💬 ווטסאפ להראל", "harelwa") + actB("🆘 מסך החירום", "sos");
  kbSet("sick", { t: "לא מרגיש טוב / צריך רופא", k: "חולה כואב כאב ראש בטנ חומ הקאתי בחילה רופא תרופה בית מרקחת אקמול כדור דמ שתיתי שיכור אלכוהול מרפאה רפואי בית חולימ",
    p: ["לא מרגיש טוב", "אני חולה", "בית מרקחת", "כואב לי", "שתיתי יותר מדי", "צריך רופא", "איפה רופא", "בית חולים"],
    a: () => steps + `<p class="fine">משהו קל (כאב ראש, צינון): בית מרקחת (Lékárna). שניים פתוחים 24/7 במסך החירום. שתית יותר מדי: מים, לא נשארים לבד, וחוזרים למלון ב-Bolt.</p>` + ins(), b: btns });
  kbSet("ins", { t: "ביטוח הראל: איך משתמשים", k: "ביטוח פוליסה מוקד תביעה החזר קבלה הראל harel משתמשימ לפנות כיסוי",
    p: ["מספר הביטוח", "מוקד הביטוח", "איך תובעים", "איך משתמשים בביטוח", "ביטוח הראל", "הראל"],
    a: () => `מוקד החירום של הראל עונה <b>24/7</b>: טלפון <bdi dir="ltr">${HAREL.telShow}</bdi>, ווטסאפ <bdi dir="ltr">${HAREL.waShow}</bdi>. ` + steps + ins(), b: btns });
  KB.push({ id: "injury", t: "נפצעתי", k: "נפצעתי פציעה נפלתי נחתכתי חתכ שבר נקע כוויה תאונה מכה מדמם", p: ["נפצעתי", "נפלתי", "נחתכתי", "שברתי", "נקע"], boost: () => 1,
    a: () => `<b>דימום חזק, חשד לשבר, מכה בראש או שמשהו מרגיש רציני: 112 מיד.</b><br>פציעה קלה: לוחצים על חתך עם בד נקי, קר על נקע, ומתקשרים ל<b>מוקד הראל</b> כדי שיפנו למרפאה ויסדרו את התשלום. ` + steps.replace(/^<ol class="qa-o"><li>.*?<\/li>/, '<ol class="qa-o">') + ins(), b: btns });
  KB.forEach(e => { if (!e._k) { e._k = e.k.split(" ").map(hNorm).filter(Boolean); e._p = (e.p || []).map(hNorm); e._t = hNorm(e.t).split(" "); } });
  ["sick", "ins"].forEach(id => { const e = KB.find(x => x.id === id); e._k = e.k.split(" ").map(hNorm).filter(Boolean); e._p = e.p.map(hNorm); e._t = hNorm(e.t).split(" "); });
  QA_ACT.harelwa = harelWa;
})();

/* רשימת "לפני הטיסה": להקליד את הפוליסה */
PREP.push({ k: "harel", ic: "🏥", t: "להקליד את פוליסת הראל", s: "ב\"הפרטים שלי\": מספר פוליסה ושם מלא. אז הם מופיעים במסך החירום ובהודעה למוקד.", a: ["🔒 הפרטים שלי", () => openMe()], auto: () => (me.pol || "").trim().length >= 4 });
