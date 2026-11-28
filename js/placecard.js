/* placecard: הכרטיס שנפתח כשנוגעים בנקודה במפה.
   • תמונה אמיתית מ-Wikimedia Commons (רישיון חופשי, קרדיט קטן). נשמרת בטלפון מראש (img/p), אז עובדת גם בלי אינטרנט.
     אין תמונה: אייקון גדול של סוג המקום, בצבע שלו.
   • 2–3 שורות: מה זה, מה עושים שם, וטיפ אחד.
   • שורה אחת: זמן הליכה (מה-GPS, ואם אתה לא בפראג: מהמלון, וזה כתוב), שעות פתיחה, מחיר אם ידוע.
   • כפתורים: 🧭 נווט (מפות) · ➤ התחל (ניווט חי באפליקציה) · ⭐ שמור (מופיע ב"לאן?").
   מוגן: אם משהו כאן נכשל, נפתח הכרטיס הקודם. */
"use strict";
(function () {
try {
/* מה זה · מה עושים · טיפ · מחיר · שעות. נכתב לתחנות במסלול */
const PT = {
  castle: { w: "מתחם הטירה העתיק הגדול בעולם, על הגבעה מעל העיר.", d: "נכנסים לחצרות בחינם, נעמדים מול קתדרלת ויטוס (מבפנים היא מטורפת), ומסיימים בתצפית על כל הגגות האדומים. שעה עד שעה וחצי מספיק.", t: "חילופי המשמר בשער הראשי כל שעה עגולה. בצהריים זה הכי גדול.", p: "חצרות חינם · כרטיס לפנים כ-450 Kč", h: "חצרות 06:00–22:00" },
  bridge: { w: "גשר אבן מ-1357 עם 30 פסלים, בין העיר העתיקה למאלה סטראנה.", d: "הולכים לאט, עוצרים לתמונה עם הטירה ברקע, ונוגעים בפסל של יאן נפומוצקי בשביל המזל. כולם עושים את זה, לכן הוא מבריק.", t: "יש כייסים על הגשר. הטלפון בכיס הקדמי.", p: "חינם", h: "פתוח תמיד" },
  mypeople: { w: "בר שוטים בעיר העתיקה, עם השוטים שמגישים לך עם קסדה.", d: "שוט או שניים, תמונה עם הקסדה, ומשם 10 דק' הליכה ל-EPIC.", t: "לאכול לפני. ערב ארוך מחכה לך." },
  petrin: { w: "גבעה ירוקה מעל מאלה סטראנה, עם תצפית חינם על כל פראג.", d: "מהטירה הולכים 15–20 דק' דרך מנזר סטרהוב, נעמדים בתצפית, ויורדים ברכבל ל-Újezd או ברגל בגנים.", t: "הרכבל כל 10 דק', 07:00–22:15. כנראה תקף עם כרטיס 90 דק', אחרת 100 Kč.", p: "חינם", h: "פתוח תמיד" },
  trojsky: { w: "גשר קשת מודרני מעל הנהר, מואר בלילה.", d: "אופציונלי: מטרו C ל-Nádraží Holešovice (~10 דק') ועוד ~15 דק' הליכה. סרטון ותמונות בחושך, כשעה וחצי הלוך-חזור.", t: "כרטיס 90 דק' לכל כיוון. אם הולכים: האריזה זזה ל-18:30.", p: "חינם" },
  footshop: { w: "חנות סניקרס גדולה ברחוב הקניות Na Příkopě.", d: "ישר למדף המבצעים ומודדים. מידות אירופאיות, אז עדיף למדוד ולא לנחש.", t: "קונה מעל 2001 Kč בקבלה אחת? מבקשים בקופה טופס Tax Free, עם דרכון." },
  duplex: { w: "מועדון על גג בכיכר ואצלב, עם מרפסת מעל הכיכר.", d: "רוקדים, ויוצאים למרפסת לראות את הכיכר בלילה מלמעלה. הכרטיס ב-Wallet.", t: "רישיון נהיגה פיזי (לא צילום). הדרכון בכספת במלון.", h: "22:00–05:00" },
  epic: { w: "אחד המועדונים הגדולים בפראג, ליד Náměstí Republiky.", d: "Erasmus Winter Party: סטודנטים מכל אירופה, וכולם מדברים אנגלית. הכי קל להכיר פה אנשים.", t: "רישיון נהיגה פיזי (לא צילום), הדרכון בכספת במלון. אחרי: חוזרים רק ב-Bolt, לא ברגל (עד −8°)." },
  hotel: { w: "הבסיס שלך.", d: "מקלחת, שכבה נוספת, להטעין את הטלפון ואת המטען הנייד, ויוצאים שוב." },
  airport: { w: "שדה התעופה ואצלב האבל, טרמינל 1.", d: "בנחיתה: רישום EES ובקרת דרכונים, אחר כך eSIM ו-Bolt. בחזור: מגיעים בסביבות 09:45, Tax Free משמאל לפני הדלפקים, ואז ישר לדלפק (נסגר 12:05).", t: "אין צ'ק-אין אונליין באף טיסה. מונית רק דרך Bolt." },
  wenc: { w: "השדרה הגדולה של העיר החדשה, עם שוק כריסמס בדצמבר.", d: "trdelník וקפה חם בשוק, ואז הולכים במורד עד Na Příkopě.", t: "השוק פה יקר יותר. לטעום כאן, מזכרות בשווקים הקטנים.", p: "חינם" },
  prik: { w: "רחוב הקניות הראשי של פראג.", d: "Zara, H&M, Footshop ופסאז'ים קטנים. ביום הראשון רק מסתכלים, ב-3.12 קונים." },
  ots: { w: "הכיכר הכי מפורסמת בפראג, עם השעון האסטרונומי ושוק הכריסמס הגדול.", d: "עומדים מול השעון בשעה עגולה להצגה הקטנה, מסתובבים בשוק ומרימים את הראש לכנסיית טין.", t: "ההצגה של השעון כל שעה עגולה, 09:00–23:00. מגיעים 5 דק' לפני.", p: "חינם" },
  pariz: { w: "רחוב המותגים היוקרתי, בתוך הרובע היהודי העתיק.", d: "הליכה בין חלונות ראווה ובתי כנסת עתיקים. 30 דק' מספיק." },
  kampa: { w: "קיר הגרפיטי לזכרו של ג'ון לנון.", d: "תמונה מול הקיר, ומשם 2 דק' לגשר הקטן עם המנעולים.", t: "הקיר משתנה כל הזמן. מה שתראה היום לא יהיה שם בחודש הבא.", p: "חינם", h: "פתוח תמיד" },
  mala: { w: "שכונה של סמטאות וגגות אדומים מתחת לטירה.", d: "עוצרים לצהריים לפני העלייה לטירה. בסמטאות הצדדיות זול יותר מאשר על הכיכר הראשית." },
  neruda: { w: "הרחוב התלול שיורד מהטירה.", d: "יורדים לאט כשמחשיך, עם הפנסים ושלטי הבתים העתיקים: במקום מספרים יש סמלים." },
  dancing: { w: "הבניין ה\"רוקד\" של פרנק גרי, על שפת הנהר.", d: "תמונה מהצד השני של הכביש, ומשם ישר לטיילת. 10 דק'.", p: "מבחוץ חינם" },
  naplavka: { w: "טיילת על שפת הנהר, מתחת לגובה הרחוב.", d: "הליכה שקטה דרומה לכיוון וישהראד, עם ברבורים ונוף לטירה.", p: "חינם" },
  vys: { w: "מבצר עתיק על צוק מעל הנהר.", d: "הולכים על החומות לנוף פתוח על כל העיר, ונכנסים לבית הקברות היפה ליד הכנסייה. שעה וחצי.", t: "הרבה פחות תיירים מהטירה. הכי יפה לקראת שקיעה.", p: "השטח חינם" },
  letna: { w: "פארק על גבעה עם המטרונום הענק.", d: "צופים בסקייטרים מתחת למטרונום, ומקבלים את התצפית הכי טובה על הגשרים.", p: "חינם" },
  kuz: { w: "חנות וינטג' ויד שנייה ב-Holešovice.", d: "לחטט. יש מעילים וג'קטים במחירים טובים." },
  miru: { w: "כיכר עם כנסייה גותית ושוק כריסמס שכונתי.", d: "מאפה ותה חם בשוק. זול ורגוע יותר מהשווקים במרכז.", p: "כניסה חופשית" },
  rieg: { w: "פארק על גבעה ב-Vinohrady.", d: "יושבים על המדשאה עם נוף ישר לטירה. חצי שעה.", p: "חינם" },
  primark: { w: "שלוש קומות של בגדים זולים, בראש כיכר ואצלב.", d: "שכבות חמות, כפפות וגרביים. שעה מספיקה." },
  palladium: { w: "הקניון הגדול במרכז, כ-200 חנויות.", d: "קניות, קומת אוכל, שירותים נקיים, ומקום טוב להתחמם.", t: "Tax Free מעל 2001 Kč בקבלה אחת: מבקשים טופס בקופה, עם הדרכון. בשדה: הדלפק לפני הצ'ק-אין, בצד שמאל." },
  manifesto: { w: "שוק אוכל עם דוכנים מכל העולם.", d: "בוחרים דוכן. יש הרבה אפשרויות בלי בשר.", t: "משלמים רק בכרטיס." }
};
window.PLACE_TXT = PT;
const PH = typeof PHOTOS !== "undefined" ? PHOTOS : {};
const imgOf = k => k && PH[k] ? "img/p/" + k + ".jpg" : null;
const savedL = () => LS.get("goSaved", []), same = (a, b) => a && b && Math.abs(a.lat - b.lat) < 2e-4 && Math.abs(a.lng - b.lng) < 2e-4;
const hoursOf = (key, s) => { try { const raw = (s && typeof ohFor === "function" && ohFor(s)) || (key && typeof OH !== "undefined" && OH[key]); if (!raw) return ""; const d = s ? plan[dayOf(s.id)].date : (tripNow().phase === "during" ? plan[Math.max(0, tripNow().dayIdx)].date : plan[1].date); const st = ohState(raw, d, s ? s.m : 720); return st ? st.today : ""; } catch (e) { return ""; } };

const old = window.openPlace;
function card(o) {
  let name, sub = "", cz = "", inf = {}, l, s = null, extra = null, near = false, key = null;
  if (o.stopId) { s = findStop(o.stopId); inf = sinfo(s); l = loc(s); key = s.at || null; const p = s.at && place(s.at); const parts = s.n.split(" – "); name = parts[0]; sub = parts.slice(1).join(" – "); cz = p ? p.cz : ""; }
  else if (o.placeKey) { key = o.placeKey; const p = place(key); inf = TRIP.info[key] || {}; l = p; name = p.name; cz = p.cz; extra = { ...p, ...inf }; }
  else if (o.extraId) { key = o.extraId; extra = TRIP.extras.find(x => x.id === o.extraId); inf = extra; l = extra; name = extra.name; cz = extra.cz; }
  else { extra = o.near; near = true; inf = { ic: extra.ic, d: extra.sub || "", ty: extra.ty }; l = extra; name = extra.name; }
  const t = (key && PT[key]) || null, col = TYC[inf.ty] || TYC.sight, img = imgOf(key), cr = img && PH[key];
  /* זמן הליכה: מה-GPS אם אתה בפראג, אחרת מהמלון */
  let walk = "";
  if (l && l.lat != null) { const me0 = typeof gpsNear === "function" && gpsNear() ? gps : null, from = me0 || (key !== "hotel" ? place("hotel") : null);
    if (from) { const d = hav(from, l); walk = `🚶 ${fmtDur(walkEst(d))}${me0 ? "" : " מהמלון"}`; } }
  const hrs = (t && t.h) || hoursOf(key, s), price = (t && t.p) || (extra && extra.price) || "";
  const info = [s ? `🕐 ${fmtT(s.m)}` : "", walk, hrs ? `🕰️ ${esc(hrs)}` : "", price ? `🎟️ ${esc(price)}` : "", !t && inf.stay ? `⏳ ${esc(inf.stay)}` : ""].filter(Boolean);
  const what = t ? t.w : inf.one || "", doIt = t ? t.d : inf.d || "", tip = t && t.t;
  const isSaved = l && savedL().some(x => same(x, l)), st = s ? marks[s.id] : null;
  openModal(`<div class="hero${img ? " has" : ""}" id="hero" style="--c:${col}">${img ? `<img src="${img}" alt="" decoding="async">` : inf.lm ? glyphSvg(inf.g) : `<span>${inf.ic || "📍"}</span>`}${cr ? `<a class="hero-cr" href="${esc(cr.u)}" target="_blank" rel="noopener" dir="ltr">📷 ${esc(cr.a)} · ${esc(cr.l)}</a>` : ""}</div>
    <div class="pc"><h2 dir="auto" style="text-align:right">${esc(name)}</h2>${sub ? `<p class="pc-sub">${bd(sub)}</p>` : ""}${cz ? `<p class="cz" dir="ltr">${esc(cz)}</p>` : ""}
    ${info.length ? `<p class="meta">${info.map(x => `<span>${x}</span>`).join("")}</p>` : ""}
    ${what ? `<p class="pc-what">${bd(what)}</p>` : ""}${doIt ? `<p class="pc-do">${bd(doIt)}</p>` : ""}${tip ? `<p class="pc-tip">💡 ${bd(tip)}</p>` : ""}
    ${s && s.w && s.w !== sub && s.w !== cz ? `<p class="note">${bd(s.w)}</p>` : ""}
    ${l && l.lat != null ? `<div class="pc-btns"><a class="btn" href="${navUrl(l)}" target="_blank" rel="noopener">🧭 נווט</a><button class="btn pri" id="pcGo">➤ התחל</button><button class="btn${isSaved ? " on" : ""}" id="pcSave">${isSaved ? "⭐ שמור" : "☆ שמור"}</button></div>` : ""}
    <div class="row wrap pc-more">${s ? (st === "done" ? `<button class="btn ghost" data-act="undone" data-id="${s.id}">בטל "הייתי"</button>` : `<button class="btn ghost" data-act="done" data-id="${s.id}">הייתי פה ✓</button>`) : ""}
    ${s && !s.big && st !== "skip" && st !== "done" ? `<button class="btn ghost" data-act="skip" data-id="${s.id}">דלג</button>` : ""}
    ${extra ? `<button class="btn ghost" id="addX">➕ להוסיף ליום</button>` : ""}${extra && extra.url ? `<a class="btn ghost" href="${esc(extra.url)}" target="_blank" rel="noopener">לפרטים ↗</a>` : ""}</div></div>`, "place");
  const go = $("#pcGo"); if (go) go.onclick = () => { closeModal(); if (typeof navStart === "function") navStart({ lat: l.lat, lng: l.lng, name, q: l.q || "" }); else startNav(l, name); };
  const sv = $("#pcSave"); if (sv) sv.onclick = () => { const a = savedL(), on = !a.some(x => same(x, l)); LS.set("goSaved", on ? [{ name, lat: l.lat, lng: l.lng, q: l.q || "", st: "", ltr: false }, ...a].slice(0, 30) : a.filter(x => !same(x, l)));
    sv.classList.toggle("on", on); sv.textContent = on ? "⭐ שמור" : "☆ שמור"; buzz(8); toast(on ? "נשמר ⭐ יופיע ב\"לאן?\", גם בלי אינטרנט" : "הוסר מהשמורים"); };
  if (extra && $("#addX")) $("#addX").onclick = () => addStopFlow({ lat: extra.lat, lng: extra.lng, name: extra.name, q: extra.q || "", ic: extra.ic, ty: extra.ty, d: extra.d || "", m: extra.m, shift: extra.m != null ? 60 : 0 });
  const im = $("#hero img"); if (im) im.onerror = () => { const h = $("#hero"); if (!h) return; h.classList.remove("has"); im.remove(); const c = h.querySelector(".hero-cr"); c && c.remove(); h.insertAdjacentHTML("afterbegin", inf.lm ? glyphSvg(inf.g) : `<span>${inf.ic || "📍"}</span>`); };
}
window.openPlace = function (o) { try { return card(o); } catch (e) { return old(o); } };

/* אופליין: כל התמונות של המסלול נכנסות לטלפון ברקע (פעם אחת; ה-SW שומר אותן לתמיד) */
const warm = () => { if (typeof isOffline === "function" && isOffline()) return; LS.set("phWarm" + Object.keys(PH).length, 1); Object.keys(PH).forEach((k, i) => setTimeout(() => { try { fetch("img/p/" + k + ".jpg").catch(() => {}); } catch (e) {} }, i * 250)); };
if (!LS.get("phWarm" + Object.keys(PH).length)) setTimeout(warm, 9000);
(window.__mods = window.__mods || {}).placecard = "ok";
} catch (err) { try { (window.__mods = window.__mods || {}).placecard = "fail: " + (err && err.message || err); } catch (e) {} }
})();
