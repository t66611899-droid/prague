/* safety: מסך חירום (עובד בלי אינטרנט), משפטים באנגלית ובצ'כית, המיקום שלי, ווטסאפ, אנשי קשר, יומן (ics), כדאי לדעת, המרת מטבע */
"use strict";

/* מספרים שאומתו ב-23.11.2026: השגרירות מהאתר הרשמי שלה (new.embassies.gov.il/czechrepublic), חדר המצב מאתרי שגרירויות ישראל.
   בתי חולים ובתי מרקחת 24/7: מיקומים וטלפונים מ-OpenStreetMap. */
const EMG = {
  embassy: { name: "שגרירות ישראל בפראג", cz: "Badeniho 2, Praha 7", gen: "+420233097500", genShow: "+420 233 097 500", emg: "+420233097532", emgShow: "+420 233 097 532", lat: 50.09688, lng: 14.40838, q: "Velvyslanectví Státu Izrael, Badeniho 2, Praha" },
  mfa: { tel: "+97225303155", show: "+972 2 530 3155" }
};
const HOSPITALS = [
  { name: "בית החולים הכללי", cz: "Všeobecná fakultní nemocnice (VFN)", lat: 50.07252, lng: 14.42073, q: "Všeobecná fakultní nemocnice, U Nemocnice 2, Praha" },
  { name: "בית החולים נה פרנטישקו", cz: "Nemocnice Na Františku", lat: 50.09243, lng: 14.42119, q: "Nemocnice Na Františku, Na Františku 847/8, Praha" },
  { name: "בית החולים וינוהרדי", cz: "FN Královské Vinohrady", lat: 50.07464, lng: 14.47892, q: "Fakultní nemocnice Královské Vinohrady, Šrobárova 50, Praha", tel: "+420267161111" },
  { name: "בית החולים במאלה סטראנה", cz: "Nemocnice Milosrdných sester", lat: 50.08689, lng: 14.39558, q: "Nemocnice Milosrdných sester sv. Karla Boromejského, Vlašská 36, Praha", tel: "+420257197111" },
  { name: "בית החולים מוטול", cz: "FN Motol", lat: 50.07277, lng: 14.34664, q: "Fakultní nemocnice v Motole, V Úvalu 84, Praha" },
  { name: "בית החולים נה הומולצה", cz: "Nemocnice Na Homolce", lat: 50.07572, lng: 14.35417, q: "Nemocnice Na Homolce, Roentgenova 2, Praha" }
];
const PHARMACIES = [ // פתוחים 24/7 לפי OpenStreetMap
  { name: "בית מרקחת תורן", cz: "Pohotovostní lékárna · Palackého 5", lat: 50.08112, lng: 14.42320, q: "Lékárna Palackého 5, Praha 1", tel: "+420224946982" },
  { name: "בית מרקחת ליד המלון", cz: "U Svaté Ludmily · Belgická 37", lat: 50.07434, lng: 14.43537, q: "Lékárna U Svaté Ludmily, Belgická 37, Praha 2", tel: "+420222513396" },
  { name: "בית המרקחת של בית החולים", cz: "Nemocniční lékárna · Na Františku", lat: 50.09279, lng: 14.42192, q: "Nemocnice Na Františku lékárna, Praha 1", tel: "+420222311870" }
];
const PHRASES = [
  ["🆘", "אני צריך עזרה", "I need help.", "Potřebuji pomoc."],
  ["🚑", "תזמינו אמבולנס", "Please call an ambulance.", "Zavolejte prosím sanitku."],
  ["👮", "איפה המשטרה?", "Where is the police station?", "Kde je policejní stanice?"],
  ["📱", "איבדתי את הטלפון", "I lost my phone.", "Ztratil jsem telefon."],
  ["👛", "איבדתי את הארנק", "I lost my wallet.", "Ztratil jsem peněženku."],
  ["🧭", "הלכתי לאיבוד", "I'm lost. Can you help me get to this address?", "Ztratil jsem se. Pomůžete mi dostat se na tuto adresu?"],
  ["📞", "אפשר להשתמש בטלפון שלך?", "Can I use your phone, please? It's urgent.", "Mohu si prosím půjčit váš telefon? Je to naléhavé."],
  ["🤒", "אני לא מרגיש טוב", "I don't feel well. I need a doctor.", "Není mi dobře. Potřebuji lékaře."],
  ["💊", "איפה בית מרקחת?", "Where is the nearest pharmacy?", "Kde je nejbližší lékárna?"],
  ["🗣️", "אני לא מדבר צ'כית", "I don't speak Czech. Do you speak English?", "Nemluvím česky. Mluvíte anglicky?"],
  ["🥗", "אני לא אוכל בשר", "I don't eat meat. Is this without meat?", "Nejím maso. Je to bez masa?"],
  ["🧾", "חשבון בבקשה", "The bill, please.", "Účet, prosím."],
  ["🙏", "תודה", "Thank you.", "Děkuji."]
];
const nearestOf = (arr, ref) => arr.map(x => ({ ...x, dist: hav(ref, x) })).sort((a, b) => a.dist - b.dist);
function lastKnown() { // GPS חי, או המיקום האחרון הידוע (עם השעה שלו)
  if (gps) return { lat: gps.lat, lng: gps.lng, live: true, t: gps.t };
  const lp = LS.get("lastPos", null); if (lp && lp.lat) return { lat: lp.lat, lng: lp.lng, live: false, t: lp.t };
  const T = tripNow(), tr = LS.get(trackKey(T.date), []).filter(Boolean); if (tr.length) { const p = tr[tr.length - 1]; return { lat: p[1], lng: p[0], live: false }; }
  return null;
}
const mapsLink = p => `https://maps.google.com/?q=${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
function whereText(p) { if (!p) return ""; const st = nearestStreet(p), k = nearestKnown(p), kd = hav(p, k); return [st ? st : "", kd < 600 ? `ליד ${czName(k)}` : ""].filter(Boolean).join(", "); }

function openSOS() {
  const p = lastKnown(), ref = p || refPoint(), h = nearestOf(HOSPITALS, ref)[0], ph = nearestOf(PHARMACIES, ref)[0], hotel = place("hotel"), ins = (me.ins || "").replace(/[^\d+]/g, ""), c0 = (me.contacts || []).find(c => c && c.p);
  const tile = (href, ic, t, s, cls = "") => `<a class="sos-t ${cls}" href="${href}"${/^tel:/.test(href) ? "" : ' target="_blank" rel="noopener"'}><span>${ic}</span><b>${t}</b><small>${s}</small></a>`;
  openModal(`<div class="sos-head"><h2>חירום</h2><p>הכול כאן עובד גם בלי אינטרנט. חיוג עובד תמיד.</p></div>
    <a class="sos-112" href="tel:112"><b>112</b><span>חירום בכל אירופה · משטרה, אמבולנס, כיבוי · עונים באנגלית</span></a>
    <div class="sos-send"><button class="sos-sms" id="sosSms"><b>📩 שלח SOS ב-SMS</b><small>${sosContacts().length ? "לכל " + sosContacts().length + " אנשי הקשר · עובד בלי אינטרנט" : "עובד בלי אינטרנט · בוחרים נמען"}</small></button>
    <button class="sos-wa" id="sosWa"><b>💬 שלח SOS בווטסאפ</b><small>${c0 ? (sosContacts().length > 1 ? "בוחרים את כולם בתפריט השיתוף" : "אל " + esc(c0.n || "איש הקשר")) : "בוחרים למי"}</small></button></div>
    ${sosContacts().length ? "" : `<p class="fine">עוד אין אנשי קשר. מוסיפים עד שלושה ב"הפרטים שלי", ואז ה-SOS יוצא ישר אליהם.</p>`}
    <div class="sos-loc" id="sosLoc">${locHtml(p)}</div>
    <div class="sos-grid">
      ${tile("tel:" + EMG.embassy.emg, "🇮🇱", "שגרירות · חירום", `<bdi dir="ltr">${EMG.embassy.emgShow}</bdi> · ערבים וסופ"ש`)}
      ${tile("tel:" + EMG.embassy.gen, "🏛️", "שגרירות · כללי", `<bdi dir="ltr">${EMG.embassy.genShow}</bdi>`)}
      ${tile("tel:" + EMG.mfa.tel, "☎️", "חדר מצב · משרד החוץ", `<bdi dir="ltr">${EMG.mfa.show}</bdi> · 24/7`)}
      ${ins ? tile("tel:" + esc(ins), "🛡️", "מוקד הביטוח", `<bdi dir="ltr">${esc(me.ins)}</bdi>`) : `<button class="sos-t" id="sosIns"><span>🛡️</span><b>מוקד הביטוח</b><small>להוסיף מספר ב"הפרטים שלי"</small></button>`}
      ${tile(navUrl(h), "🏥", "בית חולים קרוב", `${bd(h.cz)} · ${fmtDist(h.dist * 1.3)}`)}
      ${tile(navUrl(ph), "💊", "בית מרקחת 24/7", `${bd(ph.cz)} · ${fmtDist(ph.dist * 1.3)}`)}
      ${tile(navUrl(hotel), "🏨", "הביתה למלון", `ברגל · ${fmtDist(hav(ref, hotel) * 1.3)}`)}
      <button class="sos-t" data-act="bolt"><span>🚕</span><b>Bolt</b><small>רק דרך האפליקציה</small></button>
    </div>
    <h3>להראות למישהו (נוגעים, והמשפט מוצג גדול)</h3>
    <div class="phr">${PHRASES.map((x, i) => `<button data-ph="${i}"><span>${x[0]}</span>${x[1]}</button>`).join("")}</div>
    <details class="sos-more"><summary>עוד בתי חולים ובתי מרקחת</summary>
      ${nearestOf(HOSPITALS, ref).map(x => `<div class="ritem flat"><span><b>🏥 ${bd(x.name)}</b><small class="sub2"><span class="cz1" dir="ltr">${esc(x.cz)}</span><span class="nt1">${fmtDist(x.dist * 1.3)}</span></small></span>${x.tel ? `<a class="btn" href="tel:${x.tel}">📞</a>` : ""}<a class="btn" href="${navUrl(x)}" target="_blank" rel="noopener">נווט</a></div>`).join("")}
      ${nearestOf(PHARMACIES, ref).map(x => `<div class="ritem flat"><span><b>💊 ${bd(x.name)}</b><small class="sub2"><span class="cz1" dir="ltr">${esc(x.cz)}</span><span class="nt1">${fmtDist(x.dist * 1.3)}</span></small></span><a class="btn" href="tel:${x.tel}">📞</a><a class="btn" href="${navUrl(x)}" target="_blank" rel="noopener">נווט</a></div>`).join("")}
      <p class="fine">בכל מקרה דחוף מתקשרים קודם ל-112. מיקומים וטלפונים של בתי החולים ובתי המרקחת: OpenStreetMap. מספרי השגרירות מהאתר הרשמי שלה.</p></details>
    ${me.pol ? `<p class="sub">מספר פוליסה: <b dir="ltr">${esc(me.pol)}</b></p>` : ""}<button class="btn wide" id="sosMe">🔒 הפרטים שלי ואנשי קשר</button>`, "sos tall");
  $("#sosWa").onclick = sosWa; $("#sosSms").onclick = sosSms;
  const i = $("#sosIns"); if (i) i.onclick = openMe; $("#sosMe").onclick = openMe;
  $$("#mbody [data-ph]").forEach(b => b.onclick = () => showBig(PHRASES[b.dataset.ph]));
  bindLoc(); if (!gps) { userWantsFollow = false; startGPS(false); setTimeout(() => { const el = $("#sosLoc"); if (el) { el.innerHTML = locHtml(lastKnown()); bindLoc(); } }, 6000); }
}
function locHtml(p) {
  if (!p) return `<b>📍 המיקום שלי</b><p class="sub">מחפש GPS… ליד חלון או בחוץ זה מהיר יותר.</p>`;
  const w = whereText(p);
  return `<b>📍 המיקום שלי${p.live ? "" : p.t ? ` (אחרון ידוע, ${pragueTimeOf(p.t)})` : " (האחרון שנשמר)"}</b><div class="coords" dir="ltr">${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</div>${w ? `<p class="where" dir="ltr">${esc(w.replace("ליד", "near"))}</p>` : ""}
    <div class="row"><button class="btn" id="locBig">להציג גדול</button><button class="btn" id="locCopy">העתק</button><button class="btn" id="locWa">ווטסאפ</button></div>`;
}
function bindLoc() {
  const p = lastKnown(); if (!p) return; const b = $("#locBig"); if (!b) return;
  b.onclick = () => showBig(["📍", "המיקום שלי", `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`, whereText(p).replace("ליד", "near")]);
  $("#locCopy").onclick = () => { if (navigator.clipboard) navigator.clipboard.writeText(`${p.lat.toFixed(5)}, ${p.lng.toFixed(5)} ${mapsLink(p)}`).then(() => toast("הועתק ✓")); };
  $("#locWa").onclick = () => waSend(msgWhere());
}
function showBig(x) { // משפט ענק על כל המסך, להראות לאנשים
  const b = $("#big"); b.innerHTML = `<button id="bigX" aria-label="סגור">✕</button><div><small>${x[0]} ${esc(x[1])}</small><p class="en" dir="ltr">${esc(x[2])}</p>${x[3] ? `<p class="cz" dir="ltr">${esc(x[3])}</p>` : ""}</div>`;
  b.hidden = false; b.onclick = () => { b.hidden = true; };
}
function openPhrases() {
  openModal(`<h2>🗣️ משפטים להראות</h2><p class="sub">נוגעים במשפט, והוא מוצג גדול באנגלית ובצ'כית. עובד בלי אינטרנט.</p><div class="phr">${PHRASES.map((x, i) => `<button data-ph="${i}"><span>${x[0]}</span>${x[1]}</button>`).join("")}</div>`, "tall");
  $$("#mbody [data-ph]").forEach(b => b.onclick = () => showBig(PHRASES[b.dataset.ph]));
}

/* ---------- ווטסאפ ---------- */
const waNum = p => { let d = String(p || "").replace(/\D/g, ""); if (d.startsWith("00")) d = d.slice(2); else if (d.startsWith("0")) d = "972" + d.slice(1); return d; };
const clockNow = () => { const w = wall(); return String(w.getUTCHours()).padStart(2, "0") + ":" + String(w.getUTCMinutes()).padStart(2, "0"); };
function msgWhere() {
  const p = lastKnown(), T = tripNow(), L = T.dayIdx >= 0 ? live(T.dayIdx) : null, w = p ? whereText(p) : "";
  return `היי, אני בפראג 🇨🇿 השעה כאן ${clockNow()}.${p ? `\nאני עכשיו ${w ? w.replace(/^([^ל])/, "ב-$1") : "כאן"}: ${mapsLink(p)}` : "\nאין לי GPS כרגע, אעדכן מיקום עוד מעט."}${L && L.next ? `\nעכשיו הולך ל${/^[A-Za-z]/.test(L.next.n) ? "-" : ""}${L.next.n}.` : ""}\nהכול טוב 🙂`;
}
const pragueTimeOf = t => new Date(t).toLocaleTimeString("en-GB", { timeZone: "Europe/Prague", hour: "2-digit", minute: "2-digit" });
function msgSOS() { // אנגלית קודם (כל אחד יבין), ועברית מתחת
  const p = lastKnown(), b = window._batt ? Math.round(window._batt.level * 100) : null, where = p ? whereText(p).replace("ליד", "near") : "";
  const locEn = p ? `Location${p.live ? "" : " (last known, " + pragueTimeOf(p.t) + ")"}: ${mapsLink(p)}${where ? " (" + where + ")" : ""}` : "Location: unknown (no GPS)";
  const locHe = p ? `מיקום${p.live ? "" : " (אחרון ידוע, " + pragueTimeOf(p.t) + ")"}: ${mapsLink(p)}` : "אין לי מיקום כרגע";
  return `SOS - Omer needs help in Prague.\n${locEn}\nTime in Prague: ${clockNow()}.${b != null ? ` Battery: ${b}%.` : ""}\nPlease call me. If no answer, call 112 (EU emergency).\n\n🆘 עומר צריך עזרה בפראג. ${locHe}. השעה בפראג ${clockNow()}. תתקשרו אליי, ואם אני לא עונה תתקשרו ל-112.`;
}
const sosContacts = () => (me.contacts || []).filter(c => c && c.p);
function sosSms() { // SMS לכל אנשי הקשר ביחד. עובד גם בלי אינטרנט, רק עם קליטה סלולרית
  const cs = sosContacts(), nums = cs.map(c => "+" + waNum(c.p)), body = encodeURIComponent(msgSOS()), ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  sosSent(cs.length ? cs.map(c => c.n || c.p) : [], "SMS");
  location.href = ios ? `sms:/open?addresses=${nums.join(",")}&body=${body}` : `sms:${nums.join(",")}?body=${body}`;
}
function sosWa() { // ווטסאפ: עם כמה אנשי קשר נפתח תפריט השיתוף של הטלפון (בוחרים את כולם), אחרת ישר לצ'אט
  const cs = sosContacts(), text = msgSOS(); sosSent(cs.map(c => c.n || c.p), "ווטסאפ");
  if (cs.length !== 1 && navigator.share) { navigator.share({ text }).catch(() => {}); return; }
  waSend(text, 0);
}
function sosSent(names, via) {
  openModal(`<div class="sos-head"><h2>ההודעה מוכנה</h2><p>${names.length ? `${via} אל: ${names.map(esc).join(", ")}` : `${via} · בוחרים למי לשלוח`}</p></div>
    <p class="desc">עכשיו לוחצים <b>שלח</b> באפליקציית ההודעות. האפליקציה הזאת לא יכולה לשלוח במקומך, רק להכין את ההודעה.</p>
    <a class="sos-112" href="tel:112"><b>112</b><span>אם זה דחוף, מתקשרים עכשיו. עונים באנגלית</span></a>
    <div class="col" style="margin-top:10px"><button class="btn big" id="ssSms">📩 לשלוח גם ב-SMS</button><button class="btn big" id="ssWa">💬 לשלוח גם בווטסאפ</button><button class="btn big ghost" id="ssBack">חזרה למסך החירום</button></div>`, "sos tall");
  $("#ssSms").onclick = sosSms; $("#ssWa").onclick = sosWa; $("#ssBack").onclick = () => openSOS();
}
function msgOnWay() { const p = lastKnown(), h = place("hotel"), eta = p ? fmtT(tripNow().min + walkEst(hav(p, h)) + 3) : null; return `אני בדרך למלון 🏨 השעה כאן ${clockNow()}.${eta ? ` אמור להגיע בסביבות ${eta}.` : ""}${p ? `\nאיפה אני עכשיו: ${mapsLink(p)}` : ""}\nאכתוב כשאגיע.`; }
const msgHome = () => `הגעתי בשלום למלון ✓ (${clockNow()} בפראג). לילה טוב 🌙`;
function waSend(text, idx) {
  const cs = (me.contacts || []).filter(c => c && c.p), go = n => { const t = encodeURIComponent(text); window.open(isOffline() ? `whatsapp://send?${n ? "phone=" + n + "&" : ""}text=${t}` : `https://wa.me/${n}?text=${t}`, "_blank", "noopener"); };
  if (!cs.length) { go(""); if (!LS.get("waHint")) { LS.set("waHint", 1); toast("אפשר לשמור עד 3 אנשי קשר ב\"הפרטים שלי\", ואז זה נשלח ישר אליהם", 4600); } return; }
  if (idx != null || cs.length === 1) return go(waNum(cs[Math.min(idx || 0, cs.length - 1)].p));
  openModal(`<h2>💬 למי לשלוח?</h2><div class="col">${cs.map((c, i) => `<button class="btn big" data-c="${i}">${esc(c.n || "איש קשר " + (i + 1))}</button>`).join("")}<button class="btn big ghost" data-c="x">לבחור בווטסאפ</button></div><p class="fine" style="white-space:pre-wrap">${esc(text)}</p>`);
  $$("#mbody [data-c]").forEach(b => b.onclick = () => { closeModal(); go(b.dataset.c === "x" ? "" : waNum(cs[b.dataset.c].p)); });
}
function openWa() {
  const T = tripNow();
  openModal(`<h2>💬 ווטסאפ</h2><p class="sub">הודעה מוכנה עם המיקום והשעה בפראג. המיקום נשלח רק כשלוחצים כאן.</p>
    <div class="col"><button class="btn big" id="waWhere">📍 איפה אני עכשיו</button><button class="btn big" id="waWay">🏨 אני בדרך למלון</button><button class="btn big" id="waHome">✓ הגעתי בשלום</button><button class="btn big sosb-lite" id="waSos">🆘 מצב חירום</button></div>
    <button class="btn wide ghost" id="waMe">אנשי קשר (עד 3)</button>`);
  $("#waWhere").onclick = () => waSend(msgWhere()); $("#waWay").onclick = () => waSend(msgOnWay()); $("#waHome").onclick = () => waSend(msgHome()); $("#waSos").onclick = sosWa; $("#waMe").onclick = openMe;
}

/* ---------- הפרטים שלי (רק במכשיר), כולל אנשי קשר ---------- */
function openMe() {
  const f = (k, label, ph, type = "text") => `<label class="fld">${label}<input data-me="${k}" type="${type}" value="${esc(me[k] || "")}" placeholder="${ph}" dir="auto" autocomplete="off"></label>`;
  const cs = [0, 1, 2].map(i => (me.contacts || [])[i] || { n: "", p: "" });
  openModal(`<h2>🔒 הפרטים שלי</h2><p class="sub">נשמר רק בטלפון הזה. לא נשלח לשום מקום ולא נמצא בקוד של האתר.</p>
    <div class="card soft"><b>💬 אנשי קשר לווטסאפ</b><p class="sub">עד שלושה. הראשון מקבל את הודעת החירום.</p>
      ${cs.map((c, i) => `<div class="row cta"><input data-cn="${i}" value="${esc(c.n)}" placeholder="${["אמא / אבא", "עוד מישהו", "חבר"][i]}" dir="auto" autocomplete="off"><input data-cp="${i}" type="tel" value="${esc(c.p)}" placeholder="050-0000000" dir="ltr" autocomplete="off"></div>`).join("")}</div>
    <div class="card soft"><b>🏨 מיקום המלון</b><p class="sub" id="hotSt">${me.hotel ? "מוגדר: " + esc(me.hotel.q || "נקודה על המפה") : "כרגע מסומן אזור כללי. כדי שהמסלולים יהיו מדויקים, קובעים את המקום המדויק."}</p>
      <form id="hotF" class="row"><input id="hotQ" placeholder="כתובת המלון" dir="auto" value="${esc((me.hotel && me.hotel.q) || "")}"><button class="btn">חפש</button></form>
      <div class="row wrap" style="margin-top:8px"><button class="btn" id="hotHere">📍 אני במלון עכשיו</button><button class="btn" id="hotPick">לבחור על המפה</button></div></div>
    ${f("code", "קוד כניסה למלון", "הקוד לדלת / לארון המפתחות")}${f("ins", "טלפון מוקד הביטוח", "+972…", "tel")}${f("pol", "מספר פוליסה", "")}
    <label class="fld">מספרי הזמנה והערות<textarea data-me="notes" rows="4" dir="auto" placeholder="טיסה, מלון, כרטיסים…">${esc(me.notes || "")}</textarea></label>
    <button class="btn pri wide" data-act="close">שמור וסגור</button>`, "tall");
  $$("#mbody [data-me]").forEach(i => i.oninput = () => { me[i.dataset.me] = i.value; LS.set("me", me); });
  const saveC = () => { me.contacts = [0, 1, 2].map(i => ({ n: $(`[data-cn="${i}"]`).value.trim(), p: $(`[data-cp="${i}"]`).value.trim() })).filter(c => c.p); LS.set("me", me); };
  $$("#mbody [data-cn],#mbody [data-cp]").forEach(i => i.oninput = saveC);
  const setHot = (h, msg) => { me.hotel = h; LS.set("me", me); const s = $("#hotSt"); if (s) s.textContent = "מוגדר: " + (h.q || "נקודה על המפה"); renderAll(); toast(msg || "מיקום המלון נשמר ✓"); };
  $("#hotF").onsubmit = async e => {
    e.preventDefault(); const q = $("#hotQ").value.trim(); if (!q) return;
    try { const j = await fetchJson("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&viewbox=14.22,50.18,14.71,49.94&bounded=1&q=" + encodeURIComponent(q), 9000); if (!j.length) return toast("לא מצאתי את הכתובת"); setHot({ lat: +(+j[0].lat).toFixed(5), lng: +(+j[0].lon).toFixed(5), q }); }
    catch (err) { toast("אין חיבור לחיפוש כרגע. אפשר לבחור על המפה"); }
  };
  $("#hotHere").onclick = () => gps ? setHot({ lat: +gps.lat.toFixed(5), lng: +gps.lng.toFixed(5), q: $("#hotQ").value.trim() }) : toast("צריך קודם להפעיל מיקום (החץ על המפה)");
  $("#hotPick").onclick = () => { const q = $("#hotQ").value.trim(); closeModal(); if (!isDesktop()) setSheet("low"); toast("נוגעים במפה על המלון", 4000); pickCb = ll => setHot({ lat: +ll.lat.toFixed(5), lng: +ll.lng.toFixed(5), q }); };
}

/* ---------- יומן: קובץ ics עם התראות אמיתיות (עובד כשהאפליקציה סגורה ובלי אינטרנט) ---------- */
function icsUTC(date, min, il) { const [y, mo, d] = date.split("-").map(Number), x = new Date(Date.UTC(y, mo - 1, d) + (min - (il ? 120 : 60)) * 60000); return x.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z"; } // חורף: פראג UTC+1, ישראל UTC+2
const icsEsc = s => String(s || "").replace(/\\/g, "\\\\").replace(/[,;]/g, m => "\\" + m).replace(/\n/g, "\\n");
function icsEvents(days) {
  const ev = [];
  days.forEach(d => d.stops.forEach(s => {
    if (!isFixed(s)) return; const p = s.at && place(s.at), n = s.n;
    const al = /המראה/.test(n) ? [180, 120] : /Duplex|EPIC|מסיבת/.test(n) ? [60, 20] : /Bolt לשדה|יוצאים/.test(n) ? [30, 10] : /בשדה/.test(n) ? [15] : [15, 0];
    ev.push({ id: s.id, date: d.date, m: s.m, il: s.il, dur: /Duplex|EPIC|מסיבת/.test(n) ? 180 : 30, title: n, desc: s.w || "", loc: p ? (p.cz || p.q || p.name) : "", al });
  }));
  for (const date of ["2026-12-01", "2026-12-02", "2026-12-03"]) ev.push({ id: "mk" + date, date, m: 21 * 60 + 15, dur: 15, title: "שווקי הכריסמס נסגרים בסביבות 22:00", desc: "אם בא לך עוד סיבוב אחרון או משהו חם", loc: "Staroměstské náměstí", al: [0] });
  ev.push({ id: "wake", date: "2026-12-04", m: 8 * 60 + 15, dur: 15, title: "קמים וסוגרים תיק", desc: "Bolt לשדה ב-09:00. זה גיבוי, לא תחליף לשעון מעורר", loc: "", al: [0] });
  return ev;
}
function buildICS(days) {
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//prague-trip//HE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:פראג"], stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  for (const e of icsEvents(days)) {
    L.push("BEGIN:VEVENT", "UID:" + e.id + "@prague-trip", "DTSTAMP:" + stamp, "DTSTART:" + icsUTC(e.date, e.m, e.il), "DTEND:" + icsUTC(e.date, e.m + e.dur, e.il), "SUMMARY:" + icsEsc("פראג · " + e.title));
    if (e.desc) L.push("DESCRIPTION:" + icsEsc(e.desc)); if (e.loc) L.push("LOCATION:" + icsEsc(e.loc));
    for (const a of e.al) L.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + icsEsc(a ? `בעוד ${a >= 60 ? a / 60 + " שע'" : a + " דק'"}: ${e.title}` : e.title), "TRIGGER:" + (a ? `-PT${a}M` : "PT0M"), "END:VALARM");
    L.push("END:VEVENT");
  }
  L.push("END:VCALENDAR"); return L.join("\r\n") + "\r\n";
}
function openCalendar() {
  const ev = icsEvents(plan);
  openModal(`<h2>📅 תזכורות ליומן</h2><p class="sub">לחיצה אחת מכניסה ${ev.length} אירועים ליומן של הטלפון, עם התראות אמיתיות שמגיעות גם כשהאפליקציה סגורה וגם בלי אינטרנט. בלי קודים ובלי מספרי הזמנה.</p>
    <div class="rlist cal">${ev.sort((a, b) => (a.date + String(a.m).padStart(5, "0")).localeCompare(b.date + String(b.m).padStart(5, "0"))).map(e => `<div class="ritem flat"><span><b>${bd(e.title)}</b><small>${dayDate(e.date).dow} ${dayDate(e.date).dm} · ${fmtT(e.m)}${e.il ? " (ישראל)" : ""} · 🔔 ${e.al.map(a => a ? (a >= 60 ? a / 60 + " שע'" : a + " דק'") + " לפני" : "בזמן").join(", ")}</small></span></div>`).join("")}</div>
    <button class="btn pri wide" id="calGo">להוסיף הכול ליומן</button>
    <p class="fine">באייפון נפתח חלון "הוסף הכול". אם לא נפתח כלום: <a href="prague.ics" target="_blank" rel="noopener">קובץ היומן הקבוע</a> (התוכנית המקורית). השעות נשמרות נכון גם כשהטלפון עובר לשעון פראג.</p>`, "tall");
  $("#calGo").onclick = () => {
    const blob = new Blob([buildICS(plan)], { type: "text/calendar;charset=utf-8" }), url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = "prague.ics"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); buzz(10); toast("קובץ היומן מוכן. מאשרים \"הוסף הכול\"", 3600);
  };
}
/* כשהאפליקציה פתוחה: "עוד רבע שעה יוצאים" לדברים הקבועים בלבד */
function leaveReminder() {
  const T = tripNow(); if (T.dayIdx < 0) return; const told = LS.get("leave", {});
  for (const s of plan[T.dayIdx].stops) {
    if (!isFixed(s) || marks[s.id] || told[s.id]) continue; const l = loc(s), walk = l && gps ? walkEst(hav(gps, l)) : 0, left = pm(s) - walk - T.min;
    if (left <= 15 && left > 8) { told[s.id] = 1; LS.set("leave", told); buzz([20, 60, 20]); toast(`עוד רבע שעה יוצאים ל${/^[A-Za-z]/.test(s.n) ? "-" : ""}${s.n}${walk ? ` (${fmtDur(walk)} הליכה)` : ""}`, 6000); break; }
  }
}

/* ---------- כדאי לדעת + המרת מטבע ---------- */
let fx = LS.get("fx", null);
async function loadFx() { if (isOffline() || (fx && Date.now() - fx.t < 12 * 36e5)) return; try { const j = await fetchJson("https://api.frankfurter.dev/v1/latest?base=CZK&symbols=ILS", 8000); if (j.rates && j.rates.ILS) { fx = { r: j.rates.ILS, t: Date.now(), d: j.date }; LS.set("fx", fx); } } catch (e) {} }
function openTips() {
  const r = fx ? fx.r : 0.15;
  const sec = (ic, t, items) => `<div class="card soft"><b>${ic} ${t}</b><ul class="tips">${items.map(x => `<li>${bd(x)}</li>`).join("")}</ul></div>`;
  openModal(`<h2>💡 כדאי לדעת</h2>
    <div class="card soft"><b>💱 כמה זה בשקלים?</b><div class="row fxr"><input id="fxI" type="number" inputmode="decimal" placeholder="Kč" dir="ltr"><span class="fx-o" id="fxO" dir="ltr">= ₪ 0</span></div><p class="fine">${fx ? `שער: 100 Kč ≈ ${(r * 100).toFixed(1)} ₪ · עודכן ${ago(fx.t)} (ECB)` : "שער משוער: 100 Kč ≈ 15 ₪. יתעדכן כשתהיה רשת"}. טיפ מהיר: מחלקים ב-7.</p></div>
    ${sec("🚋", "תחבורה", ["אפליקציית PID Lítačka זולה יותר ולא צריך להחתים. מחירים 2026 (אפליקציה / נייר): 30 דק' 36/39 Kč, 90 דק' 46/50, 24 שע' 140/150, 72 שע' 340/350.", "כרטיס נייר: חובה להחתים במכונה הצהובה. יש ביקורת בבגדים אזרחיים.", "שדה התעופה: טרוליבוס 59 ↔ Nádraží Veleslavín, מטרו A ↔ Muzeum, מטרו C ↔ I.P. Pavlova. כרטיס 90 דק'. או Bolt.", "AirportExpress רק עד 22:00, בכרטיס נפרד (לא PID). כרטיסי 30/90 דק' לא תקפים בו.", "בלילה יש חשמליות לילה (קווים 91–99), אבל אחרי מסיבה Bolt פשוט יותר."])}
    ${sec("💵", "כסף ומזומן", ["כבר המרת <b>9,500 Kč</b>: קודם משלמים במזומן, הכרטיס לגיבוי.", "מוציאים קרונות רק מ<b>כספומט של בנק</b>: ČSOB, KB (Komerční banka), Česká spořitelna, Raiffeisenbank. עדיף כספומט שצמוד לסניף.", "<b>לא Euronet</b> (הכחול-צהוב, נמצא בכל פינה תיירותית): עמלות גבוהות ושער גרוע.", "בכספומט ובמסוף אשראי בוחרים תמיד <b>CZK, לא שקלים</b>, ומסרבים להמרה (\"Without conversion\").", "Tax Free בשדה: הדלפק לפני הצ'ק-אין, בצד שמאל. קודם אליו.", "לא מחליפים כסף בצ'יינג'ים של העיר העתיקה ולא אצל אנשים ברחוב. \"0% עמלה\" מסתיר שער גרוע: שואלים כמה קרונות מקבלים בפועל לפני שמוסרים כסף.", "מוציאים סכום אחד גדול במקום כמה קטנים (עמלה קבועה לכל משיכה מהבנק שלך), ומחלקים בין הארנק לכיס פנימי.", "Manifesto מקבל רק כרטיס. שירותים ומלתחות במועדונים הם לרוב רק במזומן."])}
    ${sec("🎧", "מועדונים ולילה", ["כניסה מגיל 18 עם דרכון (תעודה עם גיל). לוקחים אותו לכל מועדון, ושומרים בכיס פנימי סגור.", "לא משאירים כוס בלי השגחה, ולא מקבלים משקה פתוח ממישהו זר.", "הביתה: ברחובות הראשיים והמוארים, או Bolt מהאפליקציה בלבד."])}
    ${sec("🧤", "קור ושטח", ["בקור הסוללה נגמרת מהר. הטלפון בכיס פנימי, ומטען נייד בתיק.", "מי הברז טובים לשתייה.", "כייסים: גשר קרל, חשמלית 22 והשווקים. טלפון וארנק בכיס קדמי או פנימי.", "שירותים ציבוריים לרוב בתשלום במטבעות. בקניונים הם בחינם או זולים."])}`, "tall");
  $("#fxI").oninput = e => { $("#fxO").textContent = "= ₪ " + ((+e.target.value || 0) * r).toFixed(1); };
}
