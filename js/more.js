/* more: חירום שעובד בכל מצב רשת, "רוצה עוד?", "לילה טוב", פתוח עכשיו, יומן רגעים.
   מחליף את openSOS / openMe / sosSent / msgSOS / markDone בגרסאות מורחבות. */
"use strict";
const intl = p => { const d = waNum(p); return d ? "+" + d : ""; }; // 05X… → ‎+9725X…
const prettyIntl = p => intl(p).replace(/^(\+972)(\d{2})(\d{3})(\d+)$/, "$1 $2 $3 $4");
let sosTest = false;

/* ---------- הודעות ---------- */
function msgSOS() {
  const p = lastKnown(), b = window._batt ? Math.round(window._batt.level * 100) : null, where = p ? whereText(p).replace("ליד", "near") : "";
  const locEn = p ? `Location${p.live ? "" : " (last known, " + pragueTimeOf(p.t) + ")"}: ${mapsLink(p)}${where ? " (" + where + ")" : ""}` : "Location: unknown (no GPS)";
  const locHe = p ? `מיקום${p.live ? "" : " (אחרון ידוע, " + pragueTimeOf(p.t) + ")"}: ${mapsLink(p)}` : "אין לי מיקום כרגע";
  if (sosTest) return `זו בדיקה מהאפליקציה של הטיול, הכול בסדר 🙂\nככה תיראה הודעת חירום אמיתית. ${locHe}. השעה בפראג ${clockNow()}.\n\nThis is only a TEST message. All good.`;
  return `SOS - Omer needs help in Prague.\n${locEn}\nTime in Prague: ${clockNow()}.${b != null ? ` Battery: ${b}%.` : ""}\nPlease call me. If no answer, call 112 (EU emergency).\n\n🆘 עומר צריך עזרה בפראג. ${locHe}. השעה בפראג ${clockNow()}. תתקשרו אליי, ואם אני לא עונה תתקשרו ל-112.`;
}

/* ---------- מסך החירום: מציג קודם את מה שבאמת יעבוד עכשיו ---------- */
function openSOS(test) {
  sosTest = !!test; const off = isOffline(), p = lastKnown(), ref = p || refPoint(), cs = sosContacts(), hotel = place("hotel"), h = nearestOf(HOSPITALS, ref)[0], ph = nearestOf(PHARMACIES, ref)[0], ins = (me.ins || "").replace(/[^\d+]/g, "");
  const tile = (href, ic, t, s) => `<a class="sos-t" href="${href}"${/^tel:/.test(href) ? "" : ' target="_blank" rel="noopener"'}><span>${ic}</span><b>${t}</b><small>${s}</small></a>`;
  const calls = cs.length ? cs.map(c => `<a class="sos-call" href="tel:${intl(c.p)}"><span>📞</span><b>התקשר ל${esc(c.n || "איש קשר")}</b><small dir="ltr">${prettyIntl(c.p)}</small></a>`).join("")
    : `<button class="sos-call empty" id="sosAdd"><span>➕</span><b>להוסיף את אמא ואבא</b><small>כדי להתקשר ולשלוח SOS בלחיצה אחת</small></button>`;
  const smsB = `<button class="sos-sms" id="sosSms"><b>📩 ${test ? "בדיקה" : "SOS"} ב-SMS</b><small>${cs.length ? "ל" + cs.map(c => esc(c.n || "איש קשר")).join(" ול") : "בוחרים נמען"} · בלי אינטרנט</small></button>`;
  const waB = `<button class="sos-wa" id="sosWa"><b>💬 ${test ? "בדיקה" : "SOS"} בווטסאפ</b><small>${cs.length > 1 ? "בוחרים את שניהם בשיתוף" : cs.length ? "אל " + esc(cs[0].n || "איש הקשר") : "בוחרים למי"}</small></button>`;
  const taxi = `<button class="btn wide" id="sosTaxi">🚕 להראות לנהג / לעובר אורח את כתובת המלון</button>`;
  openModal(`<div class="sos-head${test ? " test" : ""}"><h2>${test ? "בדיקת חירום" : "חירום"}</h2><p>${test ? "שולחים הודעת ניסיון להורים, כדי לראות שהכול מגיע." : off ? "📡 אין אינטרנט כרגע. שיחה ו-SMS עובדים עם קליטה סלולרית." : "יש אינטרנט. אפשר להתקשר, ווטסאפ או SMS."}</p></div>
    ${test ? "" : `<div class="sos-calls">${calls}</div>`}
    <div class="sos-send${off ? " solo" : ""}">${off ? smsB : waB + smsB}</div>
    ${off && !test ? `<p class="fine">ווטסאפ צריך אינטרנט. אם תלחץ SMS והוא לא יוצא, ההודעה נשמרת ואציע לשלוח אותה כשהרשת תחזור.</p>` : ""}
    ${test ? `<button class="btn wide ghost" id="sosReal">חזרה למסך החירום</button>` : `
    <a class="sos-112" href="tel:112"><b>112</b><span>${off ? "אין קליטה בכלל? 112 עובד בכל רשת סלולרית באירופה, גם בלי כרטיס SIM" : "חירום בכל אירופה · משטרה, אמבולנס, כיבוי · עונים באנגלית"}</span></a>
    <div class="sos-loc" id="sosLoc">${locHtml(p)}</div>${taxi}
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
    ${me.pol ? `<p class="sub">מספר פוליסה: <b dir="ltr">${esc(me.pol)}</b></p>` : ""}
    <div class="row" style="margin-top:12px"><button class="btn" id="sosTestB" style="flex:1">🧪 בדיקה עם ההורים</button><button class="btn" id="sosMe" style="flex:1">🔒 אנשי קשר</button></div>`}`, "sos tall");
  $("#sosSms").onclick = sosSms; const w = $("#sosWa"); if (w) w.onclick = sosWa;
  if (test) { $("#sosReal").onclick = () => openSOS(); return; }
  const a = $("#sosAdd"); if (a) a.onclick = openMe; const i = $("#sosIns"); if (i) i.onclick = openMe; $("#sosMe").onclick = openMe; $("#sosTestB").onclick = () => openSOS(true);
  $("#sosTaxi").onclick = showTaxi; $$("#mbody [data-ph]").forEach(b => b.onclick = () => showBig(PHRASES[b.dataset.ph]));
  bindLoc(); if (!gps) { startGPS(false); setTimeout(() => { const el = $("#sosLoc"); if (el) { el.innerHTML = locHtml(lastKnown()); bindLoc(); } }, 6000); }
}
function showTaxi() { // כתובת המלון בצ'כית, להראות לנהג מונית או לעובר אורח
  const q = (me.hotel && me.hotel.q) || ""; if (!q) { toast("עוד לא הגדרת את כתובת המלון. מוסיפים ב\"הפרטים שלי\"", 4200); openMe(); return; }
  showBig(["🏨", "המלון שלי", "Please take me to this address:", "Prosím, odvezte mě na tuto adresu:\n" + q]);
}
function sosSent(names, via) {
  const test = sosTest; if (!test) LS.set("sosPending", { t: Date.now(), via });
  openModal(`<div class="sos-head${test ? " test" : ""}"><h2>ההודעה מוכנה</h2><p>${names.length ? `${via} אל: ${names.map(esc).join(", ")}` : `${via} · בוחרים למי לשלוח`}</p></div>
    <p class="desc">עכשיו לוחצים <b>שלח</b> באפליקציית ההודעות. האפליקציה הזאת מכינה את ההודעה, אבל לא יכולה לשלוח במקומך.</p>
    <div class="row"><button class="btn ok big" id="ssYes" style="flex:1">✓ נשלח</button><button class="btn big" id="ssNo" style="flex:1">לא יצא</button></div>
    ${test ? "" : `<a class="sos-112" href="tel:112" style="margin-top:10px"><b>112</b><span>אם זה דחוף, מתקשרים עכשיו. עונים באנגלית</span></a>`}
    <div class="col" style="margin-top:10px"><button class="btn big" id="ssSms">📩 לנסות ב-SMS</button><button class="btn big" id="ssWa">💬 לנסות בווטסאפ</button><button class="btn big ghost" id="ssBack">חזרה למסך החירום</button></div>`, "sos tall");
  $("#ssYes").onclick = () => { LS.del("sosPending"); sosBanner(); buzz(12); toast(test ? "מעולה, הבדיקה עברה ✓" : "נשלח. מישהו יחזור אליך"); if (test) { sosTest = false; closeModal(); } else openSOS(); };
  $("#ssNo").onclick = () => { if (test) { toast("אפשר לנסות בדרך השנייה"); return; } toast("שמרתי את ההודעה. אציע לשלוח שוב כשתהיה רשת", 4200); sosBanner(); openSOS(); };
  $("#ssSms").onclick = sosSms; $("#ssWa").onclick = sosWa; $("#ssBack").onclick = () => openSOS();
}
/* הודעת SOS שלא אושרה כ"נשלחה": באנר כשהרשת חוזרת */
function sosBanner() {
  let b = $("#sosBanner"); const pnd = LS.get("sosPending", null), show = pnd && Date.now() - pnd.t < 6 * 36e5 && !isOffline();
  if (!show) { if (b) b.remove(); return; }
  if (!b) { b = document.createElement("div"); b.id = "sosBanner"; $("#hud").appendChild(b); }
  b.innerHTML = `<span>🆘 לשלוח עכשיו את הודעת ה-SOS?</span><button id="sbGo">לשלוח</button><button id="sbX" aria-label="לא צריך">✕</button>`;
  $("#sbGo").onclick = () => { sosTest = false; openSOS(); }; $("#sbX").onclick = () => { LS.del("sosPending"); b.remove(); };
}

/* ---------- הפרטים שלי: אמא, אבא ועוד אחד. המספרים רק בטלפון ---------- */
function openMe() {
  const f = (k, label, ph, type = "text") => `<label class="fld">${label}<input data-me="${k}" type="${type}" value="${esc(me[k] || "")}" placeholder="${ph}" dir="auto" autocomplete="off"></label>`;
  const saved = me.contactsAll || [0, 1, 2].map(i => (me.contacts || [])[i] || {}), names = ["אמא", "אבא", ""];
  openModal(`<h2>🔒 הפרטים שלי</h2><p class="sub">נשמר רק בטלפון הזה. לא נשלח לשום מקום ולא נמצא בקוד של האתר.</p>
    <div class="card soft"><b>📞 אנשי קשר לחירום</b><p class="sub">מקלידים מספר רגיל (050…). אני ממיר אותו לבד לפורמט שעובד מחו"ל.</p>
      ${[0, 1, 2].map(i => `<div class="cta2"><input data-cn="${i}" value="${esc(saved[i].n != null && saved[i].n !== "" ? saved[i].n : names[i])}" placeholder="${i === 2 ? "עוד מישהו (לא חובה)" : names[i]}" dir="auto" autocomplete="off"><input data-cp="${i}" type="tel" inputmode="tel" value="${esc(saved[i].p || "")}" placeholder="050-0000000" dir="ltr" autocomplete="off"><small data-ci="${i}" dir="ltr"></small></div>`).join("")}
      <button class="btn wide" id="meTest">🧪 לשלוח להם הודעת בדיקה</button></div>
    <div class="card soft"><b>🏨 המלון</b><p class="sub" id="hotSt">${me.hotel ? "מוגדר: " + esc(me.hotel.q || "נקודה על המפה") : "כרגע מסומן אזור כללי. הכתובת משמשת גם למסלולים וגם כדי להראות לנהג מונית."}</p>
      <form id="hotF" class="row"><input id="hotQ" placeholder="כתובת המלון (רחוב ומספר)" dir="auto" value="${esc((me.hotel && me.hotel.q) || "")}"><button class="btn">חפש</button></form>
      <div class="row wrap" style="margin-top:8px"><button class="btn" id="hotHere">📍 אני במלון עכשיו</button><button class="btn" id="hotPick">לבחור על המפה</button></div></div>
    ${f("code", "קוד כניסה למלון", "הקוד לדלת / לארון המפתחות")}${f("ins", "טלפון מוקד הביטוח", "+972…", "tel")}${f("pol", "מספר פוליסה", "")}
    <label class="fld">מספרי הזמנה והערות<textarea data-me="notes" rows="4" dir="auto" placeholder="טיסה, מלון, כרטיסים…">${esc(me.notes || "")}</textarea></label>
    <button class="btn pri wide" data-act="close">שמור וסגור</button>`, "tall");
  $$("#mbody [data-me]").forEach(i => i.oninput = () => { me[i.dataset.me] = i.value; LS.set("me", me); });
  const saveC = () => {
    me.contactsAll = [0, 1, 2].map(i => ({ n: $(`[data-cn="${i}"]`).value.trim(), p: $(`[data-cp="${i}"]`).value.trim() }));
    me.contacts = me.contactsAll.filter(c => waNum(c.p).length >= 9); LS.set("me", me);
    [0, 1, 2].forEach(i => { const v = me.contactsAll[i].p, ok = waNum(v).length >= 9; $(`[data-ci="${i}"]`).textContent = v ? (ok ? "✓ " + prettyIntl(v) : "המספר קצר מדי") : ""; });
  };
  $$("#mbody [data-cn],#mbody [data-cp]").forEach(i => i.oninput = saveC); saveC();
  $("#meTest").onclick = () => sosContacts().length ? openSOS(true) : toast("קודם מוסיפים לפחות מספר אחד");
  const setHot = (h, msg) => { me.hotel = h; LS.set("me", me); const s = $("#hotSt"); if (s) s.textContent = "מוגדר: " + (h.q || "נקודה על המפה"); renderAll(); toast(msg || "מיקום המלון נשמר ✓"); };
  $("#hotF").onsubmit = async e => {
    e.preventDefault(); const q = $("#hotQ").value.trim(); if (!q) return;
    try { const j = await fetchJson("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&viewbox=14.22,50.18,14.71,49.94&bounded=1&q=" + encodeURIComponent(q), 9000); if (!j.length) return toast("לא מצאתי את הכתובת"); setHot({ lat: +(+j[0].lat).toFixed(5), lng: +(+j[0].lon).toFixed(5), q }); }
    catch (err) { toast("אין חיבור לחיפוש כרגע. אפשר לבחור על המפה"); }
  };
  $("#hotHere").onclick = () => gps ? setHot({ lat: +gps.lat.toFixed(5), lng: +gps.lng.toFixed(5), q: $("#hotQ").value.trim() }) : toast("צריך קודם להפעיל מיקום (החץ על המפה)");
  $("#hotPick").onclick = () => { const q = $("#hotQ").value.trim(); closeModal(); if (!isDesktop()) setSheet("low"); toast("נוגעים במפה על המלון", 4000); pickCb = ll => setHot({ lat: +ll.lat.toFixed(5), lng: +ll.lng.toFixed(5), q }); };
}

/* ---------- "רוצה עוד?" היום לא נגמר בכוח ---------- */
const NIGHT_VIEWS = ["rieg", "bridge", "naplavka", "letna", "wenc"];
const backHome = p => { const d = hav(p, place("hotel")); return `🏨 ${fmtDur(walkEst(d))} חזרה למלון`; };
function markDone(id) {
  setMark(id, "done"); delete autoOff[id]; LS.set("autoOff", autoOff); buzz([18, 40, 18]); renderAll(); afterDone(id);
}
function afterDone(id) { // הגעתי לתחנה האחרונה של היום → מציעים בעדינות להמשיך
  const T = tripNow(), di = dayOf(id); if (di !== T.dayIdx) return; const st = plan[di].stops, asked = LS.get("contAsk", {});
  const me0 = findStop(id), left = st.filter(s => !marks[s.id] && !isLater(s, di, T.min) && pm(s) > pm(me0)); // נשאר משהו אחרי התחנה הזאת?
  if (left.length || asked[plan[di].date] || di === plan.length - 1) return;
  asked[plan[di].date] = 1; LS.set("contAsk", asked); setTimeout(() => openContinue(), 2800);
}
function openContinue(fromList) {
  const T = tripNow(), ref = refPoint(), hotel = place("hotel"), nearHotel = hav(ref, hotel) < 1500, walkKm = 2.8;
  const nv = NIGHT_VIEWS.map(k => ({ k, p: place(k), d: hav(ref, place(k)) })).sort((a, b) => a.d - b.d)[0], late = T.hour >= 21 || T.hour < 5;
  const row = (id, ic, t, s) => `<button class="copt" data-co="${id}"><span>${ic}</span><span><b>${t}</b><small>${s}</small></span></button>`;
  openModal(`<h2>${fromList ? "להוסיף עוד" : "רוצה להמשיך?"}</h2><p class="sub">${fromList ? "כמה רעיונות קרובים, או משהו משלך." : "הגעת לסוף מה שתוכנן להיום. אפשר לעצור כאן, ואפשר עוד קצת."}</p>
    <div class="col">
      ${row("walk", "🚶", "סיבוב קצר ליד המלון", `${walkKm} ק"מ · בערך 40 דק' · כיכר השלום, כיכר ואצלב וחזרה, ברחובות ראשיים${nearHotel ? "" : " · מתחיל מהמלון"}`)}
      ${row("food", "🍕", late ? "אוכל שפתוח עכשיו" : "משהו לאכול, בלי בשר", "רק מקומות ש-OpenStreetMap אומר שפתוחים בשעה הזאת")}
      ${row("view", "🌃", `נקודת נוף ${late ? "בלילה" : "קרובה"}: ${nv.p.name}`, `🚶 ${fmtDur(walkEst(nv.d))} מכאן · ${backHome(nv.p)}`)}
      ${fromList ? row("own", "➕", "להוסיף תחנה משלי", "חיפוש מקום, או נקודה על המפה") : ""}
      ${row("enough", "😴", "מספיק להיום", "מה שנשאר עובר ל\"אולי בהמשך\"")}
    </div>`, "tall");
  const A = { walk: addWalk, food: openOpenNow, view: () => { closeModal(); flyTo(nv.p, 16); setTimeout(() => openPlace({ placeKey: nv.k }), 900); }, own: () => addStopFlow(), enough: doEnough };
  $$("#mbody [data-co]").forEach(b => b.onclick = () => A[b.dataset.co]());
}
function addWalk() { // מוסיף ליום את הסיבוב: המלון → כיכר השלום → כיכר ואצלב → המלון
  const T = tripNow(), di = T.dayIdx >= 0 ? T.dayIdx : curDay, d = plan[di], t0 = T.dayIdx === di ? Math.floor(T.min) : Math.max(...d.stops.map(s => s.m), 1200), id = "w" + Date.now().toString(36);
  [["miru", "סיבוב ערב · כיכר השלום", 12], ["wenc", "סיבוב ערב · כיכר ואצלב", 28], ["hotel", "חזרה למלון", 42]].forEach(([at, n, dt], i) => d.stops.push({ id: id + i, m: t0 + dt, n, at, w: "", big: false, il: false }));
  sortDay(d); savePlan(); delete freeDays[d.date]; LS.set("free", freeDays); curDay = di; closeModal(); renderAll(); buzz(12);
  fitBox(["hotel", "miru", "wenc"].map(place)); // מתמקדים בסיבוב עצמו
}
function doEnough() {
  const T = tripNow(), di = T.dayIdx >= 0 ? T.dayIdx : curDay; if (T.dayIdx === di) { freeDays[plan[di].date] = Math.floor(T.min); LS.set("free", freeDays); }
  renderAll(); openGoodNight(di);
}
function openGoodNight(di) {
  const nx = plan[di + 1], T = tripNow();
  if (!nx) { openModal(`<div class="gn"><span>✈️</span><h2>זהו, מחר הביתה</h2><p class="desc">אין עוד יום אחרי זה. שווה לבדוק את התיק ואת שעת היציאה לשדה.</p><button class="btn pri wide" data-act="close">סגור</button></div>`); return; }
  const first = nx.stops.find(s => s.at !== "hotel") || nx.stops[0], fx = nx.stops.find(isFixed), wake = Math.max(450, Math.round((nx.stops[0].m - 75) / 15) * 15), wd = wxDay(nx.date), dd = dayDate(nx.date);
  openModal(`<div class="gn"><span>🌙</span><h2>לילה טוב</h2><p class="sub">${T.dayIdx === di ? "מה שנשאר מהיום עבר ל\"אולי בהמשך\". אפשר להחזיר מתי שרוצים." : ""}</p></div>
    <div class="card soft"><p class="kick">מחר · ${dd.dow} ${dd.dm}</p><b style="font-size:1.15rem">${bd(nx.title)}</b>
      <p class="desc">מתחילים ב${partOfDay(nx.stops[0].m)} עם ${bd(first.n)}.${fx ? ` הדבר הקבוע: ${bd(fx.n)} ב-${fmtT(fx.m)}.` : ""}</p>
      ${wd ? `<p class="sub"><span dir="ltr">${wxIcon(wd.code)} ${wd.max}° / ${wd.min}°</span> · ${wearAdvice(wd).split(".")[0]}</p>` : ""}</div>
    <div class="card soft"><b>⏰ השכמה מומלצת: ${fmtT(wake)}</b><p class="sub">שעה ורבע לפני היציאה (${fmtT(nx.stops[0].m)}). את השעון המעורר מכוונים בטלפון עצמו.</p></div>
    <div class="row"><button class="btn pri wide" data-act="close">לילה טוב</button></div>`, "tall");
}

/* ---------- אוכל שפתוח עכשיו (לפי opening_hours של OpenStreetMap) ---------- */
function ohOpenNow(str) { if (!str) return null; if (/24\/7/.test(str)) return true; const T = tripNow(), st = ohState(str.replace(/,\s*PH[^;]*/g, "").replace(/;\s*PH[^;]*/g, ""), T.date, T.min); return st ? st.open : null; }
async function openOpenNow() {
  const ref = refPoint(), T = tripNow();
  openModal(`<h2>🍕 פתוח עכשיו</h2><p class="sub">בלי בשר, עד 900 מ' ${ref.me ? "ממך" : "ממרכז המפה"}. השעה ${fmtT(T.min)}. שעות הפתיחה מ-OpenStreetMap, אז שווה להציץ בדלת לפני שהולכים רחוק.</p><div id="nearR" class="rlist"><p class="sub dots">מחפש</p></div>`, "tall");
  const box = $("#nearR"); if (isOffline()) { box.innerHTML = emptyState("📡", "בלי אינטרנט", "החיפוש הזה צריך קליטה. ב\"שווה בסביבה\" יש מקומות שמורים."); return; }
  try {
    const a = `(around:900,${ref.lat.toFixed(3)},${ref.lng.toFixed(3)})`, j = await overpass(`[out:json][timeout:10];(${CATS[0].q(a)}nwr${a}[shop=convenience][opening_hours];);out center tags 120;`), seen = new Set();
    let items = j.elements.map(e => { const it = e.tags && e.tags.shop === "convenience" ? tagItem(e, "super") : tagItem(e, "food"); if (!it) return null; it.open = ohOpenNow(e.tags.opening_hours); it.oh = e.tags.opening_hours || ""; return it; }).filter(x => x && !seen.has(x.name) && seen.add(x.name)).map(x => ({ ...x, dist: hav(ref, x) }));
    const open = items.filter(x => x.open === true).sort((p, q) => p.dist - q.dist), unk = items.filter(x => x.open == null).sort((p, q) => p.dist - q.dist).slice(0, 5);
    if ($("#nearR") !== box) return; _nearItems = [...open, ...unk]; showNearMarkers(open);
    const r = x => nearRow({ ...x, sub: `${x.sub} · ${backHome(x)}` });
    box.innerHTML = (open.length ? `<h3>פתוחים עכשיו · ${open.length}</h3>` + open.slice(0, 20).map(r).join("") : emptyState("🌙", "לא מצאתי משהו שבטוח פתוח", "בשעה כזאת הכי בטוח: דוכני השוק בכיכר ואצלב, או מכולת (Večerka / Žabka).")) + (unk.length ? `<h3>אולי פתוחים (אין שעות ב-OSM)</h3>` + unk.map(r).join("") : "");
    bindNear();
  } catch (e) { box.innerHTML = emptyState("📡", "החיפוש לא עונה כרגע", "אפשר לנסות שוב עוד רגע."); }
}

/* ---------- יומן רגעים: תמונה, מקום ושעה. נשמר רק בטלפון ---------- */
function shrinkImage(file, max = 720) { return new Promise((res, rej) => { const img = new Image(), u = URL.createObjectURL(file); img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL("image/jpeg", 0.72)); }; img.onerror = rej; img.src = u; }); }
function openDiary() {
  const d = LS.get("diary", []);
  openModal(`<h2>📔 יומן הטיול</h2><p class="sub">תמונה אחת של רגע, עם המקום והשעה. נשמר רק בטלפון הזה (עד 30 תמונות, מוקטנות).</p>
    <label class="btn pri wide" style="display:flex">📸 לשמור את הרגע הזה<input id="diF" type="file" accept="image/*" capture="environment" hidden></label>
    <div class="diary">${[...d].reverse().map(x => `<figure><img src="${x.img}" alt="" loading="lazy"><figcaption><b>${bd(x.where || "פראג")}</b><small>${dayDate(x.date).dow} ${dayDate(x.date).dm} · ${x.time}</small></figcaption><button data-dx="${x.id}" aria-label="מחק">✕</button></figure>`).join("") || emptyState("📷", "עוד אין רגעים", "בסוף הטיול יהיה לך כאן יומן קטן, לפי הסדר.")}</div>`, "tall");
  $("#diF").onchange = async e => {
    const f = e.target.files[0]; if (!f) return; toast("שומר…");
    try { const img = await shrinkImage(f), T = tripNow(), p = lastKnown(), k = p ? nearestKnown(p) : null, all = LS.get("diary", []);
      all.push({ id: Date.now(), img, date: T.phase === "during" ? T.date : dstr(T.w), time: clockNow(), where: p ? (hav(p, k) < 250 ? k.name : nearestStreet(p) || k.name) : "", lat: p ? +p.lat.toFixed(5) : null, lng: p ? +p.lng.toFixed(5) : null });
      localStorage.setItem("prg.diary", JSON.stringify(all.slice(-30))); buzz(12); openDiary(); toast("נשמר ביומן ✓");
    } catch (err) { toast("לא הצלחתי לשמור (אולי נגמר המקום בטלפון)", 4000); }
  };
  $$("#mbody [data-dx]").forEach(b => b.onclick = () => { LS.set("diary", LS.get("diary", []).filter(x => x.id !== +b.dataset.dx)); openDiary(); });
}

/* מתמקד בקבוצת נקודות, באותו חישוב של flyDay (לא תלוי בהטיה או בריווח הקודם של המצלמה) */
function fitBox(pts) {
  const pad = mapPad(), el = map.getContainer(), mx = l => (l + 180) / 360, my = l => (1 - Math.log(Math.tan(l * R2) + 1 / Math.cos(l * R2)) / Math.PI) / 2;
  const xs = pts.map(p => p.lng), ys = pts.map(p => p.lat), w = Math.min(...xs), e = Math.max(...xs), so = Math.min(...ys), n = Math.max(...ys);
  const z = Math.log2(Math.min((el.clientWidth - pad.left - pad.right) / (512 * Math.max(1e-7, mx(e) - mx(w))), (el.clientHeight - pad.top - pad.bottom) / (512 * Math.max(1e-7, my(so) - my(n)))));
  const o = { center: [(w + e) / 2, (so + n) / 2], zoom: Math.max(10, Math.min(15.5, z)) - (tilt() ? 0.45 : 0), padding: pad, pitch: tilt() ? 40 : 0, bearing: tilt() ? -12 : 0 };
  if (REDUCED) map.jumpTo(o); else map.flyTo({ ...o, duration: 1400, essential: true });
}
