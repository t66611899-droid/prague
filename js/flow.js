/* flow: התוכנית היא הצעה, לא חובה. שעות "בערך", בלי "איחרת", "מה עכשיו?", יום חופשי, "אולי בהמשך".
   הקובץ מחליף כמה פונקציות מ-core.js ומ-ui.js (live, stopStatus, renderNext, renderList) בגרסה זורמת. */
"use strict";
const isFixed = s => !!s.big; // רק דברים שבאמת קבועים: טיסה, מסיבה, צ'ק-אין
const partOfDay = m => { m = ((m % 1440) + 1440) % 1440; return m < 300 ? "לילה" : m < 690 ? "בוקר" : m < 870 ? "צהריים" : m < 1050 ? "אחה״צ" : m < 1290 ? "ערב" : "לילה"; };
let freeDays = LS.get("free", {}); // date → "all" | דקה שממנה היום חופשי
const freeFrom = di => { const f = freeDays[plan[di].date]; return f === "all" ? -1 : typeof f === "number" ? f : null; };
const isFreeStop = (s, di) => { const f = freeFrom(di); return f != null && !isFixed(s) && pm(s) >= f; };

/* "אולי בהמשך": תחנה גמישה שהיום כבר המשיך הלאה ממנה. לא נעלמת, רק זזה הצידה בשקט */
function isLater(s, di, now) {
  if (isFixed(s) || marks[s.id] || s.at === "hotel") return false; // יציאה מהמלון או חזרה אליו הן לא "אולי בהמשך"
  if (isFreeStop(s, di)) return true;
  if (now == null) return false;
  return pm(s) < now - 60 && plan[di].stops.some(x => x !== s && pm(x) > pm(s) && pm(x) <= now);
}
function live(di) {
  const T = tripNow(), st = plan[di].stops, today = T.dayIdx === di, past = plan[di].date < T.date;
  const open = st.filter(s => !marks[s.id]);
  if (!today) return { today, past, now: null, cur: null, next: past ? null : open.find(s => !isFreeStop(s, di)) || null, late: 0 };
  const now = T.min; let lastDone = -1; st.forEach((s, i) => { if (marks[s.id] === "done") lastDone = i; });
  // תחנה גמישה שהיום כבר המשיך הלאה ממנה (גם מלון) לא מוצעת יותר כ"הבא"
  const stale = s => !isFixed(s) && pm(s) < now - 60 && st.some(x => x !== s && pm(x) > pm(s) && pm(x) <= now);
  const fx = open.filter(isFixed), started = fx.filter(s => pm(s) <= now && now - pm(s) < 45).pop() || null; // דבר קבוע שהתחיל ממש עכשיו
  const nf = fx.find(s => pm(s) > now) || null, fixedSoon = started || (nf && pm(nf) - now < 75 ? nf : null);
  const cands = open.filter(s => !isFixed(s) && !isLater(s, di, now) && !stale(s) && !isFreeStop(s, di));
  let next = fixedSoon;
  if (!next) { const loc8 = cands.filter(s => loc(s)); next = settings.spont && gps && loc8.length ? loc8.reduce((b, s) => hav(gps, loc(s)) < hav(gps, loc(b)) ? s : b) : cands[0] || null; }
  if (next && !isFixed(next) && nf && pm(nf) < pm(next)) next = nf;
  if (!next) next = nf;
  const cur = lastDone >= 0 ? st[lastDone] : [...st].reverse().find(s => pm(s) <= now && !marks[s.id] && !isLater(s, di, now) && !stale(s) && s !== next && (!isFixed(s) || now - pm(s) < 240)) || null;
  return { today, past, now, cur, next, late: 0, nextFixed: nf || null };
}
function stopStatus(s, L) {
  if (marks[s.id] === "done") return "done";
  if (marks[s.id] === "skip") return "skip";
  if (L.next && L.next.id === s.id) return "next";
  if (L.today && L.cur && L.cur.id === s.id) return "now";
  const di = dayOf(s.id);
  if (isLater(s, di, L.today ? L.now : null) || (L.past && !isFixed(s))) return "later";
  if (L.past || (L.today && isFixed(s) && pm(s) < L.now - 120) || (L.today && s.at === "hotel" && pm(s) < L.now - 60 && plan[di].stops.some(x => x !== s && pm(x) > pm(s) && pm(x) <= L.now))) return "past";
  return "";
}
const whenText = s => isFixed(s) ? fmtT(s.m) : `${partOfDay(s.m)} · בערך ${fmtT(s.m)}`;

/* ---------- כרטיס התחנה הבאה: בלי "מאחר", בלי לחץ ---------- */
function renderNext() {
  const T = tripNow(), L = live(curDay), day = plan[curDay], dd = dayDate(day.date), f = freeFrom(curDay); let top = "", more = "";
  const what = `<button class="btn what" data-act="what">✨ מה עכשיו?</button>`;
  if (L.today && L.next) {
    const s = L.next, l = loc(s), inf = sinfo(s), w = walkTo(s, curDay), dt = pm(s) - L.now, cz = stopCz(s);
    const when = isFixed(s) ? (dt > 1 ? `${fmtT(s.m)}${s.il ? " (ישראל)" : ""} · עוד ${fmtDur(dt)}` : `${fmtT(s.m)} · זה עכשיו`) : `${partOfDay(s.m)} · מתי שבא לך`;
    const far = w && w.dist > 2200, sub = (cz ? `<span class="cz1" dir="ltr">${esc(cz)}</span>` : "") + `<span class="nt1">${w ? `🚶 ${fmtDur(w.min)} · ${fmtDist(w.dist)}${w.from === "prev" ? " מהקודמת" : ""}` : bd(s.w || "")}${far ? " · עדיף חשמלית" : ""}</span>`;
    top = `<div class="nx-top"><span class="nx-k">${isFixed(s) ? "הדבר הקבוע הבא" : f != null ? "אם בא לך" : "ההצעה הבאה"}</span><span class="nx-when${isFixed(s) ? " fx" : ""}">${when}</span></div>
      <div class="nx-row"><button class="nx-main" data-act="focus" data-id="${s.id}"><span class="nx-ic" style="--c:${TYC[inf.ty || s.ty] || TYC.sight}">${inf.ic}</span><span class="nx-tx"><b>${bd(s.n)}</b><small class="sub2">${sub}</small></span></button>
      ${l ? `<a class="btn pri nx-go" href="${navUrl(l, far ? "transit" : "walking")}" target="_blank" rel="noopener">${far ? "🚋 סע" : "נווט"}</a>` : ""}</div>${T.night ? homeRow() : ""}`;
    more = what + `<div class="nx-btns"><button class="btn ok" data-act="done" data-id="${s.id}">הייתי ✓</button>${l ? `<a class="btn" href="${navUrl(l, far ? "walking" : "transit")}" target="_blank" rel="noopener">${far ? "🚶 ברגל" : "🚋 חשמלית"}</a><button class="btn" data-act="navin" data-id="${s.id}">🧭 חץ</button>` : ""}${isFixed(s) ? "" : `<button class="btn ghost" data-act="later" data-id="${s.id}">אולי אחר כך</button>`}</div>`;
  } else if (L.today) {
    top = `<div class="nx-top"><span class="nx-k">יום ${curDay + 1}</span><span class="nx-when">${f != null ? "יום חופשי" : "אין עוד משהו קבוע"}</span></div><div class="nx-row"><div class="nx-main static"><span class="nx-ic">${f != null ? "🧭" : "🌙"}</span><span class="nx-tx"><b>${f != null ? "רק להסתובב" : "הכול פתוח"}</b><small>${f != null ? "המפה מראה מה שווה סביבך" : "לנוח זה גם חלק מהטיול"}</small></span></div><button class="btn pri nx-go" data-act="what">מה עכשיו?</button></div>${T.night ? homeRow() : ""}`;
    more = `<div class="nx-btns"><button class="btn" data-act="summary">📊 סיכום היום</button><button class="btn" data-act="today">☀️ היום שלי</button></div>`;
  } else {
    if (!day.stops.length) { $("#nextCard").innerHTML = `<div class="nx-top"><span class="nx-k">יום ${curDay + 1} · ${dd.dow} ${dd.dm}</span></div><div class="nx-row"><div class="nx-main static"><span class="nx-ic">🗺️</span><span class="nx-tx"><b>יום פתוח</b><small>דף ריק. תמלא אותו, או תלך לאיבוד בכוונה</small></span></div><button class="btn pri nx-go" data-act="what">מה עכשיו?</button></div>`; $("#nxMore").innerHTML = ""; return; }
    const fs = day.stops[0], ms = x => Date.UTC(...x.split("-").map((v, i) => i === 1 ? v - 1 : +v)), days = Math.round((ms(day.date) - ms(T.date)) / 864e5);
    top = `<div class="nx-top"><span class="nx-k">יום ${curDay + 1} · ${dd.dow} ${dd.dm}</span><span class="nx-when">${L.past ? "מאחוריך" : untilText(day)}</span></div>
      <div class="nx-row"><div class="nx-main static"><span class="nx-ic" style="--c:${DAYC[curDay]}">${sinfo(fs).ic}</span><span class="nx-tx"><b>${bd(day.title)}</b><small>${day.stops.length} רעיונות · מתחילים ב${partOfDay(fs.m)}</small></span></div>
      ${L.past ? `<button class="btn pri nx-go" data-act="summary">סיכום</button>` : `<button class="btn pri nx-go" data-act="play">▶ נגן</button>`}</div>`;
    more = `<div class="nx-btns"><button class="btn" data-act="today">☀️ היום שלי</button><button class="btn" data-act="pack">🎒 מה לקחת</button></div>`;
  }
  $("#nextCard").innerHTML = top + (typeof updateCard === "function" ? updateCard() : ""); // עדכון חשוב נראה גם כשהגיליון סגור
  $("#nxMore").innerHTML = more + (typeof eventCard === "function" ? eventCard() : "") + dwellCard();
}

/* ---------- הרשימה: בערך בוקר / צהריים / ערב. שעה מדויקת רק למה שקבוע ---------- */
function rowHtml(s, i, L, LN, later) {
  const l = loc(s), inf = sinfo(s), stt = stopStatus(s, L), cz = stopCz(s), col = TYC[inf.ty || s.ty] || TYC.sight;
  const li = LN.pts.findIndex(p => p.s.id === s.id), leg = li > 0 ? LN.legs[li - 1] : null;
  const walk = !later && leg && leg.dist > 60 ? (leg.real ? `🚶 ${fmtDur(leg.dur)}` : leg.dist > 5000 ? "🚕 נסיעה" : `🚶 ~${fmtDur(leg.dur)}`) : "";
  const nt = [s.w ? bd(s.w) : "", walk].filter(Boolean).join(" · "), note = (cz ? `<span class="cz1" dir="ltr">${esc(cz)}</span>` : "") + (nt ? `<span class="nt1">${nt}</span>` : "");
  const tm = isFixed(s) ? `<span class="st-t fx">${fmtT(s.m)}${s.il ? "<i>ישראל</i>" : "<i>קבוע</i>"}</span>` : `<span class="st-t soft">${partOfDay(s.m)}<i>~${fmtT(s.m)}</i></span>`;
  if (editMode) return `<li class="st edit" data-id="${s.id}"><button class="st-h" aria-label="גרור לשינוי סדר">⠿</button>
    <input class="st-time" type="time" value="${fmtT(s.m)}" aria-label="שעה"><span class="st-x"><b>${bd(s.n)}</b></span><button class="st-del" aria-label="מחק">✕</button></li>`;
  const pill = { done: "הייתי", skip: "ויתרתי", next: "הבא", now: "עכשיו" }[stt] || "";
  return `<li class="st ${stt}${isFixed(s) ? " big" : ""}" data-id="${s.id}" style="--c:${col}"><button class="st-main">${tm}<span class="st-ic">${inf.ic}</span>
    <span class="st-x"><b>${bd(s.n)}</b>${note ? `<small class="sub2">${note}</small>` : ""}</span>${pill ? `<span class="pill ${stt}">${pill}</span>` : ""}</button>
    ${l ? `<a class="st-nav" href="${navUrl(l)}" target="_blank" rel="noopener" aria-label="נווט אל ${esc(s.n)}">נווט</a>` : `<span class="st-nav off"></span>`}
    <button class="st-chk" aria-label="${stt === "done" ? "בטל סימון" : "סמן שהייתי"}" aria-pressed="${stt === "done"}"></button></li>`;
}
function renderList() {
  const day = plan[curDay], L = live(curDay), LN = dayLine(curDay), f = freeFrom(curDay);
  $("#listTitle").innerHTML = bd(day.title); $("#listSub").textContent = `${dayDate(day.date).dow} ${dayDate(day.date).dm} · ${f === -1 ? "יום חופשי" : f != null ? "חופשי מ" + partOfDay(f) : "הצעה, לא חובה"}`;
  $("#spont").checked = settings.spont; $("#editBtn").textContent = editMode ? "סיום" : "עריכה"; $("#list").classList.toggle("editing", editMode); $("#freeBtn").classList.toggle("on", f != null);
  const main = [], later = [];
  day.stops.forEach((s, i) => (!editMode && stopStatus(s, L) === "later" ? later : main).push(rowHtml(s, i, L, LN, !editMode && stopStatus(s, L) === "later")));
  $("#list").innerHTML = (main.join("") || (later.length ? "" : `<li class="empty"><span>🗺️</span><b>יום פתוח</b><small>אפשר להוסיף משהו, או ללחוץ לחיצה ארוכה על המפה.</small></li>`))
    + (later.length ? `<li class="sep"><b>אולי בהמשך</b><small>לא נעלמים. אציע אותם שוב כשתהיה קרוב</small></li>` + later.join("") : "");
  $("#resetBtn").hidden = !planEdited();
}
function showPlayCard(s) { const c = $("#playCard"), inf = sinfo(s); c.innerHTML = `<span class="pc-ic" style="--c:${TYC[inf.ty || s.ty] || TYC.sight}">${inf.ic}</span><span><b>${bd(s.n)}</b><small>${whenText(s)}${stopCz(s) ? ` · <bdi dir="ltr">${esc(stopCz(s))}</bdi>` : ""}</small></span>`; c.classList.remove("show"); void c.offsetWidth; c.classList.add("show"); }

/* ---------- "מה עכשיו?" 2–3 אפשרויות קרובות, מהתוכנית ומחוצה לה. לא חייבים לבחור ---------- */
function visitedPlaces() { const v = new Set(); plan.forEach(d => d.stops.forEach(s => { if (marks[s.id] === "done" && s.at) v.add(s.at); })); return v; }
function openWhat() {
  const T = tripNow(), ref = refPoint(), di = T.dayIdx >= 0 ? T.dayIdx : curDay, L = live(di), seenP = visitedPlaces(), opts = [], used = new Set();
  const wet = isWetNow(), wd = wxDay(T.date), cold = wd && wd.max <= -3, h = T.hour;
  const add = (o) => { const k = o.key; if (used.has(k) || opts.length >= 3) return; used.add(k); opts.push(o); };
  if (L.next && loc(L.next)) add({ key: L.next.at || L.next.id, tag: isFixed(L.next) ? "קבוע · " + fmtT(L.next.m) : "הבא ברשימה", ic: sinfo(L.next).ic, name: L.next.n, cz: stopCz(L.next), l: loc(L.next), open: { stopId: L.next.id } });
  // מהתוכנית (כל הימים) שעוד לא הייתי בהם וקרובים אליי
  const pool = []; plan.forEach((d, i) => d.stops.forEach(s => { const l = loc(s); if (!l || marks[s.id] === "done" || isFixed(s) || s.at === "hotel" || isAirport(l) || (s.at && seenP.has(s.at))) return; pool.push({ s, l, d: hav(ref, l), later: i < di || (i === di && isLater(s, di, L.now)) }); }));
  pool.sort((a, b) => a.d - b.d).filter(p => p.d < 1200).forEach(p => add({ key: p.s.at || p.s.id, tag: p.later ? "אולי בהמשך · קרוב אליך" : "מהתוכנית · קרוב אליך", ic: sinfo(p.s).ic, name: p.s.at ? place(p.s.at).name : p.s.n, cz: stopCz(p.s), l: p.l, open: { stopId: p.s.id } }));
  // מחוץ לתוכנית: שווה אם אתה בסביבה. בגשם או בקור, קודם מקורה
  const ex = TRIP.extras.map(x => ({ x, d: hav(ref, x) })).filter(o => o.d < 1000).sort((a, b) => ((wet || cold) ? (b.x.in ? 1 : 0) - (a.x.in ? 1 : 0) : 0) || a.d - b.d);
  ex.forEach(o => add({ key: o.x.id, tag: (o.x.in ? "מקורה · " : "") + "לא בתוכנית", ic: o.x.ic, name: o.x.name, cz: o.x.cz, l: o.x, open: { extraId: o.x.id } }));
  const acts = [];
  if ((h >= 11 && h < 15) || (h >= 18 && h < 21)) acts.push(["food", "🍕 לאכול משהו בלי בשר"]);
  if (wet || cold) acts.push(["cold", "☕ להתחמם במקום קרוב"]);
  acts.push(["here", "📍 מה עוד יש פה?"], ["wc", "🚻 שירותים"], ["atm", "🏧 כספומט"], ["ask", "💬 לשאול את Claude"]);
  const why = [ref.me ? "לפי איפה שאתה" : "לפי מרכז המפה (אין GPS כרגע)", `השעה ${fmtT(T.min)}`, wd ? `${wd.max}° בחוץ${wet ? " ויורד" : ""}` : ""].filter(Boolean).join(" · ");
  window._whatOpts = opts;
  openModal(`<h2>✨ מה עכשיו?</h2><p class="sub">${why}. לא חייבים לבחור, אפשר גם סתם להמשיך ללכת.</p>
    <div class="what-list">${opts.map((o, i) => `<div class="wcard"><button class="w-main" data-w="${i}"><span class="w-ic">${o.ic}</span><span class="w-tx"><small class="w-tag">${o.tag}</small><b>${bd(o.name)}</b><small class="sub2">${o.cz ? `<span class="cz1" dir="ltr">${esc(o.cz)}</span>` : ""}<span class="nt1">🚶 ${fmtDur(walkEst(hav(ref, o.l)))} · ${fmtDist(hav(ref, o.l) * 1.3)}</span></small></span></button><a class="btn pri" href="${navUrl(o.l)}" target="_blank" rel="noopener">נווט</a></div>`).join("") || emptyState("🧭", "אין משהו ממש קרוב", "אפשר לחפש מה יש בסביבה או לשאול את Claude.")}</div>
    <div class="chips wrapc">${acts.map(a => `<button class="chip" data-wa="${a[0]}">${a[1]}</button>`).join("")}</div>`, "tall");
  $$("#mbody [data-w]").forEach(b => b.onclick = () => { const o = window._whatOpts[b.dataset.w]; closeModal(); if (!isDesktop()) setSheet("low"); flyTo(o.l, 16.4); setTimeout(() => openPlace(o.open), 900); });
  const A = { wc: () => openNearby("wc"), atm: () => openNearby("atm"), food: () => openNearby("food"), cold: openCold, here: () => openNearby(), ask: openChat };
  $$("#mbody [data-wa]").forEach(b => b.onclick = () => A[b.dataset.wa]());
}

/* ---------- יום חופשי / חצי יום ---------- */
function openFree() {
  const T = tripNow(), today = T.dayIdx === curDay, f = freeFrom(curDay), dd = dayDate(plan[curDay].date);
  openModal(`<h2>🧭 יום חופשי</h2><p class="sub">${dd.dow} ${dd.dm}. בלי סדר ובלי רשימה, רק להסתובב. המפה תראה מה שווה סביבך, והדברים הקבועים (מסיבה, טיסה) נשארים. התחנות לא נמחקות, הן עוברות ל"אולי בהמשך".</p>
    <div class="col"><button class="btn big${f === -1 ? " sel" : ""}" data-f="all">כל היום חופשי</button>${today ? `<button class="btn big" data-f="now">מעכשיו והלאה</button>` : `<button class="btn big" data-f="pm">חופשי מהצהריים</button>`}
    ${f != null ? `<button class="btn big ghost" data-f="off">חזרה לתוכנית</button>` : ""}</div>`);
  $$("#mbody [data-f]").forEach(b => b.onclick = () => {
    const v = b.dataset.f, d = plan[curDay].date; if (v === "off") delete freeDays[d]; else freeDays[d] = v === "all" ? "all" : v === "now" ? Math.floor(T.min) : 780;
    LS.set("free", freeDays); closeModal(); buzz(10); renderAll(); toast(v === "off" ? "חזרנו לתוכנית" : "חופשי. רק להסתובב 🧭");
  });
}
function laterStop(id) { const s = findStop(id); if (!s || isFixed(s)) return; setMark(id, "skip"); buzz(10); renderAll(); toastAct("עבר ל\"ויתרתי\". תמיד אפשר להחזיר", "בטל", () => { setMark(id, null); renderAll(); }); }

/* ---------- toast עם פעולה ("בטל") ---------- */
function toastAct(msg, label, fn, ms = 5200) {
  const t = $("#toast"); t.innerHTML = `<span>${esc(msg)}</span><button>${esc(label)}</button>`; t.classList.add("show", "act"); clearTimeout(_toastT);
  t.querySelector("button").onclick = () => { t.classList.remove("show", "act"); fn(); };
  _toastT = setTimeout(() => t.classList.remove("show", "act"), ms);
}

/* ---------- עצרתי במקום שלא בתוכנית? שואלים בעדינות ---------- */
let dwell = null, dwellAsk = null; const dwellSeen = LS.get("dwellSeen", {});
function flowOnPos() {
  const T = tripNow(); if (T.phase !== "during" || !gps || gps.acc > 60) return;
  if (!dwell || hav(gps, dwell.p) > 60) { dwell = { p: { lat: gps.lat, lng: gps.lng }, t0: Date.now() }; if (dwellAsk && hav(gps, dwellAsk) > 120) { dwellAsk = null; renderNext(); } return; }
  if (dwellAsk || Date.now() - dwell.t0 < 12 * 60000) return;
  const key = dwell.p.lat.toFixed(3) + "," + dwell.p.lng.toFixed(3); if (dwellSeen[key]) return;
  const nearPlan = plan[T.dayIdx].stops.some(s => { const l = loc(s); return l && hav(gps, l) < 150; }); if (nearPlan || hav(gps, place("hotel")) < 150) return;
  const k = nearestKnown(gps), name = poiNameAt({ lat: gps.lat, lng: gps.lng }) || (hav(gps, k) < 120 ? k.name : nearestStreet(gps)) || "מקום בדרך";
  dwellAsk = { lat: gps.lat, lng: gps.lng, name, key }; renderNext(); if (!isDesktop()) setSheet(sheetState, true);
}
function dwellCard() { return dwellAsk ? `<div class="evc soft"><button class="evc-m" data-dw="add"><b>📍 עצרת ב${/^[A-Za-zÀ-ž]/.test(dwellAsk.name) ? "-" : ""}${bd(dwellAsk.name)}?</b><small>להוסיף את זה ליום שלך?</small></button><button class="evc-x" data-dw="x" aria-label="לא עכשיו">✕</button></div>` : ""; }
function dwellAnswer(yes) {
  if (!dwellAsk) return; const a = dwellAsk; dwellSeen[a.key] = 1; LS.set("dwellSeen", dwellSeen); dwellAsk = null;
  if (yes) { const T = tripNow(), was = curDay; curDay = T.dayIdx; insertStop({ lat: a.lat, lng: a.lng, name: a.name, ic: "📍" }, Math.floor(T.min), 30); const s = plan[curDay].stops.find(x => x.lat === +a.lat.toFixed(5) && x.n === a.name); if (s) setMark(s.id, "done"); curDay = was; renderAll(); toast("נוסף ליום, והשאר הסתדר מסביב ✓"); } else renderNext();
}

/* ---------- מחיקה בהחלקה ---------- */
function initSwipe() {
  const list = $("#list"); let sw = null;
  list.addEventListener("pointerdown", e => { const m = e.target.closest(".st-main"); if (!m || editMode) return; sw = { li: m.closest(".st"), x: e.clientX, y: e.clientY, on: false }; });
  list.addEventListener("pointermove", e => {
    if (!sw) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    if (!sw.on) { if (Math.abs(dy) > 12) { sw = null; return; } if (Math.abs(dx) < 16) return; sw.on = true; sw.li.classList.add("swiping"); }
    sw.li.style.transform = `translateX(${dx}px)`; sw.li.style.opacity = String(Math.max(0.25, 1 - Math.abs(dx) / 260));
  });
  const end = e => {
    if (!sw) return; const s = sw; sw = null; if (!s.on) return; const dx = e.clientX - s.x; s.li.classList.remove("swiping");
    if (Math.abs(dx) < 110) { s.li.style.transform = ""; s.li.style.opacity = ""; s.li.dataset.swiped = "1"; setTimeout(() => delete s.li.dataset.swiped, 300); return; }
    const id = s.li.dataset.id, d = plan[curDay], idx = d.stops.findIndex(x => x.id === id), st = d.stops[idx]; if (!st) return;
    if (isFixed(st)) { s.li.style.transform = ""; s.li.style.opacity = ""; toast("את זה לא מוחקים בהחלקה. אפשר דרך \"עריכה\""); return; }
    d.stops.splice(idx, 1); savePlan(); buzz(12); renderAll(); toastAct(`"${st.n}" ירד מהיום`, "בטל", () => { d.stops.splice(idx, 0, st); sortDay(d); savePlan(); renderAll(); });
  };
  list.addEventListener("pointerup", end); list.addEventListener("pointercancel", () => { if (sw && sw.on) { sw.li.style.transform = ""; sw.li.style.opacity = ""; } sw = null; });
  list.addEventListener("click", e => { const li = e.target.closest(".st"); if (li && li.dataset.swiped) { e.stopPropagation(); e.preventDefault(); } }, true);
}
