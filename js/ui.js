/* ui: כותרת, ימים, גיליון תחתון, כרטיס התחנה הבאה, רשימה, עריכה, כרטיס מקום, מסך פתיחה, ניווט פנימי */
"use strict";
const DOW1 = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
let editMode = false, pickCb = null;
/* שם לטיני בתוך טקסט עברי: עוטפים ב-bdi כדי שלא יתהפך ולא ייחתך באמצע */
const bd = s => esc(s).replace(/[A-Za-zÀ-ž][A-Za-zÀ-ž0-9 .'’&-]*[A-Za-zÀ-ž0-9]|[A-Za-zÀ-ž]/g, m => `<bdi dir="ltr">${m}</bdi>`);
const stopCz = s => { const p = s.at && place(s.at); return p && p.cz && !s.n.includes(p.cz) ? p.cz : ""; };

/* ---------- toast + modal ---------- */
let _toastT;
function toast(msg, ms = 2600) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(_toastT); _toastT = setTimeout(() => t.classList.remove("show"), ms); }
function openModal(html, cls = "") {
  const m = $("#modal"); $("#mbody").innerHTML = html; $("#mbox").className = "mbox " + cls; m.hidden = false;
  void m.offsetWidth; m.classList.add("show"); $("#mbox").scrollTop = 0; m.dataset.cls = cls;
}
function closeModal() { const m = $("#modal"); m.classList.remove("show"); setTimeout(() => { if (!m.classList.contains("show")) m.hidden = true; }, 260); }

/* ---------- גיליון תחתון: שלושה גבהים ---------- */
let sheetState = "low";
function sheetHeights() {
  const g = $("#grab").offsetHeight, sab = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sab-px")) || 0;
  return { low: g + $("#nxMore").offsetTop + sab, mid: Math.min(g + $("#listHead").offsetTop + sab + 2, innerHeight * 0.62), full: innerHeight - 104 };
}
function setSheet(st, noAnim) {
  if (st === "peek") st = "low"; if (st === "half") st = "mid";
  sheetState = st; const sh = $("#sheet"); if (isDesktop()) { sh.style.height = ""; $("#fabs").classList.remove("hide"); return; }
  const H = sheetHeights(); sh.classList.toggle("noanim", !!noAnim); sh.style.height = H[st] + "px"; sh.dataset.state = st;
  const fb = $("#fabs"), room = innerHeight - H[st] - 12 - fb.offsetHeight - ($("#hud").getBoundingClientRect().bottom + 8);
  fb.style.bottom = (H[st] + 12) + "px"; fb.classList.toggle("hide", st === "full" || room < 0);
  const pc = $("#playCard"); if (pc) pc.style.bottom = (H[st] + 14) + "px";
}
function initSheet() {
  const sh = $("#sheet"); let y0 = null, h0 = 0, moved = false, t0 = 0;
  const down = e => { if (isDesktop() || e.target.closest("a,button:not(#grab),input,label")) return; y0 = e.clientY; h0 = sh.offsetHeight; moved = false; t0 = Date.now(); sh.classList.add("noanim"); e.currentTarget.setPointerCapture(e.pointerId); };
  const move = e => { if (y0 == null) return; const dy = y0 - e.clientY; if (Math.abs(dy) > 6) moved = true; const H = sheetHeights(); let h = h0 + dy; if (h > H.full) h = H.full + (h - H.full) * 0.25; if (h < H.low) h = H.low - (H.low - h) * 0.25; sh.style.height = h + "px"; }; // קצת "גומי" בקצוות
  const end = e => {
    if (y0 == null) return; const dy = y0 - e.clientY, v = dy / Math.max(1, Date.now() - t0); y0 = null; sh.classList.remove("noanim"); const H = sheetHeights(), h = sh.offsetHeight, order = ["low", "mid", "full"];
    if (!moved) { if (e.target.closest("#grab")) setSheet(order[(order.indexOf(sheetState) + 1) % 3]); else setSheet(sheetState); return; }
    let st = order.reduce((b, k) => Math.abs(H[k] - h) < Math.abs(H[b] - h) ? k : b, "low");
    if (Math.abs(v) > 0.45) st = order[Math.max(0, Math.min(2, order.indexOf(sheetState) + (v > 0 ? 1 : -1)))]; // החלקה מהירה = קפיצה לגובה הבא
    setSheet(st); buzz(6);
  };
  for (const el of [$("#grab"), $("#nextCard")]) { el.addEventListener("pointerdown", down); el.addEventListener("pointermove", move); el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end); }
  addEventListener("resize", () => setSheet(sheetState, true));
}

/* ---------- כותרת ---------- */
const FLIGHT = Date.UTC(2026, 10, 30, 17, 25); // 18:25 בישראל = 17:25 על שעון פראג
function statusLine() {
  const T = tripNow(), w = T.w;
  if (T.phase === "before" || (T.dayIdx === 0 && w.getTime() < (FLIGHT + fltAdj("out")))) {
    const ms = (FLIGHT + fltAdj("out")) - w.getTime(), d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), mi = Math.floor(ms % 36e5 / 6e4);
    return "✈️ " + (d > 0 ? `עוד ${d} ימים ו-${h} שע' לטיסה` : h > 0 ? `עוד ${h} שע' ו-${mi} דק' לטיסה` : `עוד ${mi} דק' לטיסה`);
  }
  if (T.phase === "during") return `יום ${T.dayIdx + 1} מתוך ${plan.length}`;
  return "הטיול מאחוריך 🇨🇿";
}
/* שורת הסטטוס בפס העליון, בשתי שורות קצרות שלא נחתכות: "✈️ 7 ימים" ומתחת "ו-3 שע' לטיסה" */
/* "בעוד…" בגיליון: אותו חישוב כמו בפס העליון. יום הטיסה = הזמן עד ההמראה; יום אחר = הזמן עד תחילת היום */
function untilText(day) {
  try { const T = tripNow(), w = T.w.getTime(), d0 = Date.UTC(...day.date.split("-").map((v, i) => i === 1 ? v - 1 : +v)), target = day.date === plan[0].date ? (FLIGHT + fltAdj("out")) : d0;
    const ms = target - w; if (ms <= 0) return "היום"; const dd = Math.floor(ms / 864e5), hh = Math.floor(ms % 864e5 / 36e5);
    return dd >= 1 ? `בעוד ${dd === 1 ? "יום" : dd + " ימים"} ו-${hh} שע'` : `בעוד ${hh} שע'`; } catch (e) { return ""; }
}
function statusParts() {
  const T = tripNow(), w = T.w;
  if (T.phase === "before" || (T.dayIdx === 0 && w.getTime() < (FLIGHT + fltAdj("out")))) {
    const ms = (FLIGHT + fltAdj("out")) - w.getTime(), d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), mi = Math.floor(ms % 36e5 / 6e4);
    return d > 0 ? ["✈️ " + (d === 1 ? "יום אחד" : d + " ימים"), `ו-${h} שע'`] : h > 0 ? [`✈️ ${h} שע'`, `ו-${mi} דק'`] : [`✈️ ${mi} דק'`, "להמראה"]; // ✈️ כבר אומר "לטיסה", והפס צר
  }
  if (T.phase === "during") return [`יום ${T.dayIdx + 1}`, `מתוך ${plan.length}`];
  return ["הטיול", "מאחוריך 🇨🇿"];
}
function renderTop() {
  const w = wall();
  $("#ck").textContent = String(w.getUTCHours()).padStart(2, "0") + ":" + String(w.getUTCMinutes()).padStart(2, "0");
  try { const sp = statusParts(); $("#st").innerHTML = `<b>${sp[0]}</b><small>${sp[1]}</small>`; $("#st").setAttribute("aria-label", statusLine()); } catch (e) { $("#st").textContent = statusLine(); } // מוגן: אם נכשל, השורה הישנה
  const wx = typeof wxChip === "function" ? wxChip(plan[curDay].date) : ""; $("#wx").innerHTML = wx || "🌡️";
}
function renderDays() {
  const T = tripNow();
  $("#days").innerHTML = plan.map((d, i) => { const dd = dayDate(d.date), w = new Date(d.date + "T00:00:00Z").getUTCDay(); return `<button class="day${i === curDay ? " sel" : ""}${i === T.dayIdx ? " today" : ""}" data-i="${i}" role="tab" aria-selected="${i === curDay}" style="--dc:${DAYC[i]}"><b>${DOW1[w]}</b><span>${dd.dm}</span></button>`; }).join("");
}

/* ---------- כרטיס "התחנה הבאה" ---------- */
function homeRow() { // בלילה: כפתור "הביתה" בולט עם זמן ההליכה למלון, ועדכון להורים בלחיצה
  const hh = place("hotel"), dd = gps ? hav(gps, hh) : null, at = dd != null && dd < 80;
  return `<div class="nrow"><a class="btn home" href="${navUrl(hh)}" target="_blank" rel="noopener">🏠 הביתה${dd != null ? ` · ${fmtDur(walkEst(dd))} ברגל` : " ברגל"}</a><button class="btn dark" data-act="bolt">🚕 Bolt</button></div><div class="nrow"><button class="btn wa" data-act="${at ? "wahome" : "waway"}">${at ? "💬 הגעתי בשלום" : "💬 אני בדרך למלון"}</button></div>`;
}
function homeRow_v1() {
  const h = place("hotel"), d = gps ? hav(gps, h) : null;
  return `<div class="nrow"><a class="btn home" href="${navUrl(h)}" target="_blank" rel="noopener">🏠 הביתה${d != null ? ` · ${fmtDur(walkEst(d))} ברגל` : " ברגל"}</a><button class="btn dark" data-act="bolt">🚕 Bolt</button></div>`;
}
function renderNext() {
  const T = tripNow(), L = live(curDay), day = plan[curDay], dd = dayDate(day.date); let top = "", more = "";
  if (L.today && L.next) {
    const s = L.next, l = loc(s), inf = sinfo(s), w = walkTo(s, curDay), dt = pm(s) - L.now, cz = stopCz(s);
    let when;
    if (settings.spont && !s.big) when = "מתי שבא לך";
    else if (L.late >= 5) when = `<span class="late">מאחר ב-${fmtDur(L.late)}. לא נורא</span>`;
    else if (dt <= 1) when = `עכשיו · ${fmtT(s.m)}`;
    else when = `בעוד ${fmtDur(dt)} · ${fmtT(s.m)}${s.il ? " (ישראל)" : ""}`;
    const far = w && w.dist > 2200, sub = (cz ? `<span class="cz1" dir="ltr">${esc(cz)}</span>` : "") + `<span class="nt1">${w ? `🚶 ${fmtDur(w.min)} · ${fmtDist(w.dist)}${w.from === "prev" ? " מהקודמת" : ""}` : bd(s.w || "")}${far ? " · עדיף חשמלית" : ""}</span>`;
    top = `<div class="nx-top"><span class="nx-k">${settings.spont && !s.big ? "הכי קרוב אליך" : "התחנה הבאה"}</span><span class="nx-when">${when}</span></div>
      <div class="nx-row"><button class="nx-main" data-act="focus" data-id="${s.id}"><span class="nx-ic" style="--c:${TYC[inf.ty || s.ty] || TYC.sight}">${inf.ic}</span><span class="nx-tx"><b>${bd(s.n)}</b><small class="sub2">${sub}</small></span></button>
      ${l ? `<a class="btn pri nx-go" href="${navUrl(l, far ? "transit" : "walking")}" target="_blank" rel="noopener">${far ? "🚋 סע" : "נווט"}</a>` : ""}</div>${T.night ? homeRow() : ""}`;
    more = `<div class="nx-btns"><button class="btn ok" data-act="done" data-id="${s.id}">הגעתי ✓</button>${l ? `<a class="btn" href="${navUrl(l, far ? "walking" : "transit")}" target="_blank" rel="noopener">${far ? "🚶 ברגל" : "🚋 חשמלית"}</a><button class="btn" data-act="navin" data-id="${s.id}">🧭 חץ</button>` : ""}${s.big ? "" : `<button class="btn ghost" data-act="skip" data-id="${s.id}">דלג</button>`}</div>`;
    if (L.late >= 10) {
      const after = day.stops.find(x => !marks[x.id] && pm(x) > pm(s));
      more += s.big ? `<p class="nx-hint">על זה לא מוותרים. שווה לצאת עכשיו 🙂</p>`
        : `<p class="nx-hint">${after ? `אפשר לוותר על זה ולהמשיך ל${/^[A-Za-z]/.test(after.n) ? "-" : ""}${bd(after.n)}, או פשוט לדחות הכול.` : "אפשר לדחות את שאר היום."} <button class="lnk" data-act="delay">דחיתי</button>${L.late >= 30 ? ` · <button class="lnk" data-act="drop">מה לוותר?</button>` : ""}</p>`;
    }
  } else if (L.today) {
    top = `<div class="nx-top"><span class="nx-k">יום ${curDay + 1}</span><span class="nx-when">זהו להיום</span></div><div class="nx-row"><div class="nx-main static"><span class="nx-ic">🌙</span><span class="nx-tx"><b>אין עוד תחנות</b><small>לנוח זה גם חלק מהטיול</small></span></div><button class="btn pri nx-go" data-act="summary">סיכום</button></div>${T.night ? homeRow() : ""}`;
  } else {
    const f = day.stops[0], ms = x => Date.UTC(...x.split("-").map((v, i) => i === 1 ? v - 1 : +v)), days = Math.round((ms(day.date) - ms(T.date)) / 864e5);
    top = `<div class="nx-top"><span class="nx-k">יום ${curDay + 1} · ${dd.dow} ${dd.dm}</span><span class="nx-when">${L.past ? "מאחוריך" : untilText(day)}</span></div>
      <div class="nx-row"><div class="nx-main static"><span class="nx-ic" style="--c:${DAYC[curDay]}">${sinfo(f).ic}</span><span class="nx-tx"><b>${bd(day.title)}</b><small>${day.stops.length} תחנות · מתחילים ב-${fmtT(f.m)}</small></span></div>
      ${L.past ? `<button class="btn pri nx-go" data-act="summary">סיכום</button>` : `<button class="btn pri nx-go" data-act="play">▶ נגן</button>`}</div>`;
    more = `<div class="nx-btns"><button class="btn" data-act="today">☀️ היום שלי</button><button class="btn" data-act="pack">🎒 מה לקחת</button></div>`;
  }
  $("#nextCard").innerHTML = top; $("#nxMore").innerHTML = more + (typeof eventCard === "function" ? eventCard() : "");
}

/* ---------- נגן ---------- */
function renderPlayer() {
  const st = plan[curDay].stops; $("#player").hidden = !st.length; if (!st.length) return;
  const a = pm(st[0]), b = pm(st[st.length - 1]), sc = $("#scrub"), L = live(curDay);
  sc.min = a; sc.max = Math.max(b, a + 1); sc.step = 1;
  const v = playT != null ? playT : L.today ? Math.min(b, Math.max(a, L.now)) : a;
  sc.value = v; sc.style.setProperty("--f", ((v - a) / Math.max(1, b - a) * 100) + "%");
  $("#scrubT").textContent = fmtT(v); $("#speedBtn").textContent = "x" + playSpeed;
  $("#playBtn").textContent = playRaf ? "⏸" : "▶"; $("#playBtn").setAttribute("aria-label", playRaf ? "עצור" : "נגן את היום");
  const cur = playT != null ? [...st].reverse().find(s => pm(s) <= playT) : null;
  $$("#list .st").forEach(li => li.classList.toggle("scrub", !!cur && li.dataset.id === cur.id));
}
function showPlayCard(s) { const c = $("#playCard"), inf = sinfo(s); c.innerHTML = `<span class="pc-ic" style="--c:${TYC[inf.ty || s.ty] || TYC.sight}">${inf.ic}</span><span><b>${bd(s.n)}</b><small>${fmtT(s.m)}${stopCz(s) ? ` · <bdi dir="ltr">${esc(stopCz(s))}</bdi>` : ""}</small></span>`; c.classList.remove("show"); void c.offsetWidth; c.classList.add("show"); }
function hidePlayCard() { $("#playCard").classList.remove("show"); }

/* ---------- רשימת התחנות ---------- */
const PILL = { done: "בוצע", skip: "דילגתי", next: "הבא", now: "עכשיו", past: "" };
function renderList() {
  const day = plan[curDay], L = live(curDay), LN = dayLine(curDay);
  $("#listTitle").innerHTML = bd(day.title); $("#listSub").textContent = `${day.stops.length} תחנות · ${dayDate(day.date).dow} ${dayDate(day.date).dm}`;
  $("#spont").checked = settings.spont; $("#editBtn").textContent = editMode ? "סיום" : "עריכה"; $("#list").classList.toggle("editing", editMode);
  $("#list").innerHTML = day.stops.map((s, i) => {
    const l = loc(s), inf = sinfo(s), stt = stopStatus(s, L), cz = stopCz(s), col = TYC[inf.ty || s.ty] || TYC.sight;
    const li = LN.pts.findIndex(p => p.s.id === s.id), leg = li > 0 ? LN.legs[li - 1] : null;
    const walk = leg && leg.dist > 60 ? (leg.real ? `🚶 ${fmtDur(leg.dur)}` : leg.dist > 5000 ? "🚕 נסיעה" : `🚶 ~${fmtDur(leg.dur)}`) : "";
    const nt = [s.w ? bd(s.w) : "", walk].filter(Boolean).join(" · "), note = (cz ? `<span class="cz1" dir="ltr">${esc(cz)}</span>` : "") + (nt ? `<span class="nt1">${nt}</span>` : "");
    const tm = settings.spont && !s.big ? `<span class="st-t num">${i + 1}</span>` : `<span class="st-t">${fmtT(s.m)}${s.il ? "<i>ישראל</i>" : ""}</span>`;
    if (editMode) return `<li class="st edit" data-id="${s.id}"><button class="st-h" aria-label="גרור לשינוי סדר">⠿</button>
      <input class="st-time" type="time" value="${fmtT(s.m)}" aria-label="שעה"><span class="st-x"><b>${bd(s.n)}</b></span><button class="st-del" aria-label="מחק">✕</button></li>`;
    return `<li class="st ${stt}${s.big ? " big" : ""}" data-id="${s.id}" style="--c:${col}"><button class="st-main">${tm}<span class="st-ic">${inf.ic}</span>
      <span class="st-x"><b>${bd(s.n)}</b>${note ? `<small class="sub2">${note}</small>` : ""}</span>${PILL[stt] ? `<span class="pill ${stt}">${PILL[stt]}</span>` : ""}</button>
      ${l ? `<a class="st-nav" href="${navUrl(l)}" target="_blank" rel="noopener" aria-label="נווט אל ${esc(s.n)}">נווט</a>` : `<span class="st-nav off"></span>`}
      <button class="st-chk" aria-label="${stt === "done" ? "בטל סימון" : "סמן שבוצע"}" aria-pressed="${stt === "done"}"></button></li>`;
  }).join("") || `<li class="empty"><span>🗺️</span><b>יום ריק</b><small>אפשר להוסיף תחנה, או ללחוץ לחיצה ארוכה על המפה.</small></li>`;
  $("#resetBtn").hidden = !planEdited();
}

function renderAll() { renderTop(); renderDays(); renderNext(); renderList(); renderPlayer(); drawRoute(); drawMarkers(); drawWalked(); renderNav(); if (!isDesktop()) setSheet(sheetState, true); }
let _rl = 0;
function renderLive() { const n = Date.now(); if (n - _rl < 1500) return; _rl = n; renderTop(); renderNext(); if (!editMode && !_dragging) { renderList(); renderPlayer(); } drawMarkers(); drawRoute(); renderNav(); if (!isDesktop() && sheetState !== "full") setSheet(sheetState, true); }

function selectDay(i, instant) { curDay = i; clearPlay(); editMode = false; document.documentElement.style.setProperty("--day", DAYC[i]); renderAll(); flyDay(i, instant); $("#sheetBody").scrollTop = 0; if (typeof loadWeather === "function") loadWeather(); if (typeof drawEvents === "function") drawEvents(); }
function goNow() {
  const T = tripNow(); clearPlay(); applyTheme(); buzz(8);
  if (T.phase === "before") { selectDay(0); toast("הטיול עוד לא התחיל. הנה היום הראשון"); return; }
  if (T.phase === "after") { selectDay(plan.length - 1); toast("הטיול כבר מאחוריך"); return; }
  selectDay(T.dayIdx, true); const L = live(T.dayIdx);
  if (gps && gpsNear()) { follow = true; map.flyTo({ center: [gps.lng, gps.lat], zoom: 15.8, ...camOpts(), padding: mapPad() }); updateFab(); }
  else if (L.next && loc(L.next)) flyTo(loc(L.next), 15.5); else if (L.cur && loc(L.cur)) flyTo(loc(L.cur), 15.5);
  const li = L.next && $(`#list .st[data-id="${L.next.id}"]`); if (li && sheetState === "full") li.scrollIntoView({ block: "center", behavior: REDUCED ? "auto" : "smooth" });
}

/* ---------- פעולות ---------- */
function markDone(id) { setMark(id, "done"); delete autoOff[id]; LS.set("autoOff", autoOff); buzz([18, 40, 18]); renderAll(); }
function unmark(id) { setMark(id, null); autoOff[id] = 1; LS.set("autoOff", autoOff); renderAll(); }
function skipStop(id) { const s = findStop(id); if (s && s.big) { toast("זה קבוע, אבל אפשר לשנות דרך \"עריכה\""); return; } laterStop(id); }
function focusStop(id) { const s = findStop(id), l = s && loc(s); if (l) { flyTo(l); if (!isDesktop()) setSheet("low"); } else toast("לתחנה הזאת אין מיקום על המפה"); }
function showArrive(s) { // אנימציית ✓ קטנה כשמגיעים
  const p = $("#pop"); p.innerHTML = `<svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="23"/><path d="M15 27l8 8 15-17"/></svg><b>הגעת</b><span>${bd(s.n)}</span>`;
  p.classList.remove("show"); void p.offsetWidth; p.classList.add("show"); setTimeout(() => p.classList.remove("show"), 2600);
}
function onAct(act, id) {
  if (act === "focus") focusStop(id);
  else if (act === "done") { const s = findStop(id); markDone(id); closeModal(); if (s) showArrive(s); }
  else if (act === "undone") { unmark(id); closeModal(); }
  else if (act === "skip") { skipStop(id); closeModal(); }
  else if (act === "what") openWhat();
  else if (act === "later") { laterStop(id); closeModal(); }
  else if (act === "delay") openDelay();
  else if (act === "drop") openDrop();
  else if (act === "play") { if (!isDesktop()) setSheet("low"); playDay(); }
  else if (act === "summary") openSummary(curDay);
  else if (act === "today") openToday(curDay);
  else if (act === "pack") openPack();
  else if (act === "bolt") openBolt();
  else if (act === "waway") waSend(msgOnWay());
  else if (act === "wahome") waSend(msgHome());
  else if (act === "navin") { const s = findStop(id), l = s && loc(s); closeModal(); if (l) (typeof navStart === "function" ? navStart({ ...l, name: s.n }) : startNav(l, s.n)); }
  else if (act === "close") closeModal();
}

/* ---------- ניווט פנימי: חץ כיוון ומרחק על המפה השמורה. עובד גם בלי אינטרנט ---------- */
let navT = null;
function startNav(l, name) { navT = { lat: l.lat, lng: l.lng, name }; askCompass(); if (!gps) { userWantsFollow = true; startGPS(true); } else { follow = true; updateFab(); } if (!isDesktop()) setSheet("low"); renderNav(); if (gps) map.fitBounds([[Math.min(gps.lng, l.lng), Math.min(gps.lat, l.lat)], [Math.max(gps.lng, l.lng), Math.max(gps.lat, l.lat)]], { padding: mapPad(), maxZoom: 16.5, duration: REDUCED ? 0 : 900 }); else flyTo(l); }
function stopNav() { navT = null; renderNav(); drawRoute(); }
function renderNav() {
  const c = $("#navChip"); if (!navT) { c.hidden = true; return; } c.hidden = false;
  if (!gps) { c.innerHTML = `<span class="nv-ar wait">⌖</span><span><b>מחפש GPS…</b><small>${bd(navT.name)}</small></span><button id="navX" aria-label="סיים ניווט">✕</button>`; $("#navX").onclick = stopNav; return; }
  const d = hav(gps, navT); if (d < 30) { const n = navT.name; stopNav(); buzz([25, 50, 25]); toast("הגעת: " + n + " ✓"); return; }
  const br = Math.atan2(Math.sin((navT.lng - gps.lng) * R2) * Math.cos(navT.lat * R2), Math.cos(gps.lat * R2) * Math.sin(navT.lat * R2) - Math.sin(gps.lat * R2) * Math.cos(navT.lat * R2) * Math.cos((navT.lng - gps.lng) * R2)) / R2;
  const rel = heading != null ? br - heading : br - map.getBearing();
  c.innerHTML = `<span class="nv-ar" style="transform:rotate(${rel.toFixed(0)}deg)">↑</span><span><b>${fmtDist(d * 1.25)} · ${fmtDur(walkEst(d))}</b><small>${bd(navT.name)}${heading == null ? " · החץ לפי המפה" : ""}</small></span><button id="navX" aria-label="סיים ניווט">✕</button>`;
  $("#navX").onclick = stopNav;
  if (map.getSource("nextleg")) map.getSource("nextleg").setData({ type: "Feature", properties: { c: BLUE }, geometry: { type: "LineString", coordinates: [[gps.lng, gps.lat], [navT.lng, navT.lat]] } });
}

/* ---------- עריכה: גרירה, שעה, מחיקה ---------- */
let _dragging = false;
function initListEvents() {
  const list = $("#list");
  list.addEventListener("click", e => {
    const li = e.target.closest(".st"); if (!li) return; const id = li.dataset.id;
    if (e.target.closest(".st-del")) { const d = plan[curDay]; d.stops = d.stops.filter(s => s.id !== id); savePlan(); renderAll(); return; }
    if (e.target.closest(".st-chk")) { marks[id] === "done" ? unmark(id) : marks[id] === "skip" ? (setMark(id, null), renderAll()) : markDone(id); return; }
    if (e.target.closest(".st-main")) focusStop(id);
  });
  list.addEventListener("change", e => {
    const inp = e.target.closest(".st-time"); if (!inp || !inp.value) return;
    const s = findStop(inp.closest(".st").dataset.id); let m = parseT(inp.value); if (m < 300) m += 1440; // לפני 05:00 = אחרי חצות
    s.m = m; sortDay(plan[curDay]); savePlan(); renderAll();
  });
  // גרירה: התחנות מחליפות מקום, והשעות נשארות לפי הסדר
  let drag = null;
  list.addEventListener("pointerdown", e => {
    const h = e.target.closest(".st-h"); if (!h) return; e.preventDefault();
    const li = h.closest(".st"); drag = { li, y: e.clientY, times: plan[curDay].stops.map(s => s.m) }; _dragging = true;
    li.classList.add("dragging"); h.setPointerCapture(e.pointerId); buzz(8);
  });
  list.addEventListener("pointermove", e => {
    if (!drag) return; const dy = e.clientY - drag.y; drag.li.style.transform = `translateY(${dy}px)`;
    const sib = dy < 0 ? drag.li.previousElementSibling : drag.li.nextElementSibling; if (!sib) return;
    const r = sib.getBoundingClientRect(), mid = r.top + r.height / 2;
    if ((dy < 0 && e.clientY < mid) || (dy > 0 && e.clientY > mid)) {
      drag.li.style.transform = ""; const before = drag.li.getBoundingClientRect().top;
      if (dy < 0) list.insertBefore(drag.li, sib); else list.insertBefore(sib, drag.li);
      drag.y += drag.li.getBoundingClientRect().top - before; drag.li.style.transform = `translateY(${e.clientY - drag.y}px)`; buzz(4);
    }
  });
  const end = () => {
    if (!drag) return; drag.li.classList.remove("dragging"); drag.li.style.transform = "";
    const ids = $$("#list .st").map(x => x.dataset.id), d = plan[curDay];
    d.stops = ids.map(id => d.stops.find(s => s.id === id)); d.stops.forEach((s, i) => { s.m = drag.times[i]; });
    drag = null; _dragging = false; savePlan(); renderAll();
  };
  list.addEventListener("pointerup", end); list.addEventListener("pointercancel", end);
}

/* ---------- הוספת תחנה ---------- */
function defaultTime() { const T = tripNow(); if (T.dayIdx === curDay) return Math.ceil((T.min + 10) / 5) * 5; const st = plan[curDay].stops; return st.length ? Math.min(pm(st[st.length - 1]) - 30, 16 * 60) : 12 * 60; }
function insertStop(o, m, shiftMin) { // מכניס תחנה לשעה הנכונה, ואם צריך מזיז את מה שאחריה (לא טיסות ומסיבות)
  const d = plan[curDay];
  if (shiftMin) d.stops.forEach(s => { if (!s.big && !marks[s.id] && s.m >= m && s.m < m + shiftMin) s.m += shiftMin; });
  d.stops.push({ id: "u" + Date.now().toString(36), m, n: o.name || "משהו שראיתי", at: null, lat: +o.lat.toFixed(5), lng: +o.lng.toFixed(5), q: o.q || "", w: o.w || "", big: false, il: false, ic: o.ic || "📍", ty: o.ty || "sight", d: o.d || "" });
  sortDay(d); savePlan(); renderAll();
}
function addStopFlow(pre) {
  if (!pre) {
    openModal(`<h2>להוסיף תחנה</h2><p class="sub">מחפשים מקום בפראג, או בוחרים נקודה על המפה. אפשר גם ללחוץ לחיצה ארוכה על המפה בכל רגע.</p>
      <form id="srch" class="row"><input id="srchQ" type="search" placeholder="שם מקום, רחוב, חנות…" enterkeyhint="search" autocomplete="off"><button class="btn pri">חפש</button></form>
      <div id="srchR" class="rlist"></div><button class="btn wide" id="pickMap">📍 לבחור על המפה</button>`);
    $("#srch").addEventListener("submit", async e => {
      e.preventDefault(); const q = $("#srchQ").value.trim(); if (!q) return; $("#srchR").innerHTML = `<p class="sub dots">מחפש</p>`;
      try {
        const j = await fetchJson("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&viewbox=14.22,50.18,14.71,49.94&bounded=1&q=" + encodeURIComponent(q), 9000);
        $("#srchR").innerHTML = j.length ? j.map((x, i) => `<button class="ritem" data-i="${i}"><b dir="ltr">${esc(x.name || x.display_name.split(",")[0])}</b><small dir="ltr">${esc(x.display_name.split(",").slice(1, 4).join(","))}</small></button>`).join("") : emptyState("🔎", "לא מצאתי", "אפשר לנסות שם אחר או לבחור על המפה.");
        $$("#srchR .ritem").forEach(b => b.onclick = () => { const x = j[b.dataset.i]; addStopFlow({ lat: +x.lat, lng: +x.lon, name: x.name || x.display_name.split(",")[0], q: x.display_name.split(",").slice(0, 3).join(",") }); });
      } catch (err) { $("#srchR").innerHTML = emptyState("📡", "אין חיבור לחיפוש", "אפשר לבחור נקודה על המפה, זה עובד גם בלי קליטה."); }
    });
    $("#pickMap").onclick = () => { closeModal(); if (!isDesktop()) setSheet("low"); toast("נוגעים במפה במקום הרצוי", 4000); pickCb = ll => addStopFlow({ lat: ll.lat, lng: ll.lng, name: poiNameAt(ll) || "" }); };
    return;
  }
  flyTo(pre, 16.5);
  openModal(`<h2>תחנה חדשה</h2><label class="fld">איך לקרוא לזה?<input id="nsN" value="${esc(pre.name || "")}" placeholder="משהו שראיתי בדרך" dir="auto"></label>
    <label class="fld">מתי בערך?<input id="nsT" type="time" value="${fmtT(pre.m != null ? pre.m : defaultTime())}"></label>
    <div class="row"><button class="btn pri wide" id="nsOk">להוסיף ליום ${curDay + 1}</button><button class="btn" data-act="close">ביטול</button></div>`);
  $("#nsOk").onclick = () => { let m = parseT($("#nsT").value || "12:00"); if (m < 300) m += 1440; insertStop({ ...pre, name: $("#nsN").value.trim() || pre.name }, m, pre.shift || 0); closeModal(); buzz(12); toast("נוסף לתוכנית ✓"); };
}
function poiNameAt(ll) {
  try { const p = map.project(ll); const f = map.queryRenderedFeatures([[p.x - 22, p.y - 22], [p.x + 22, p.y + 22]]).find(f => f.sourceLayer === "poi" && (f.properties.name || f.properties["name:latin"])); return f ? (f.properties.name || f.properties["name:latin"]) : ""; } catch (e) { return ""; }
}
function onMapLongPress(ll) { addStopFlow({ lat: ll.lat, lng: ll.lng, name: poiNameAt(ll) }); }
const emptyState = (ic, t, s) => `<div class="empty"><span>${ic}</span><b>${t}</b><small>${s}</small></div>`;

/* ---------- "דחיתי" + "מה לוותר" ---------- */
function openDelay() {
  openModal(`<h2>דחיתי</h2><p class="sub">מזיז את כל מה שנשאר היום. טיסות ומסיבות נשארות בשעה שלהן.</p>
    <div class="grid4">${[15, 30, 45, 60].map(x => `<button class="btn big" data-d="${x}">+${x} דק'</button>`).join("")}</div>`);
  $$("#mbody [data-d]").forEach(b => b.onclick = () => shiftDay(+b.dataset.d));
}
function shiftDay(mins) {
  const T = tripNow(), d = plan[curDay], today = T.dayIdx === curDay, hit = [];
  d.stops.forEach((s, i) => {
    if (s.big || marks[s.id] || (today && pm(s) < T.min - 90)) return;
    const wallS = d.stops.slice(i + 1).find(x => x.big); s.m += mins;
    if (wallS && s.m > wallS.m - 20) hit.push({ s, wall: wallS });
  });
  sortDay(d); savePlan(); renderAll(); buzz(10);
  if (hit.length) openDrop(hit.map(h => h.s), hit[0].wall); else { closeModal(); toast(`הזזתי את שאר היום ב-${mins} דק'`); }
}
function openDrop(list, wallS) {
  const d = plan[curDay], T = tripNow();
  if (!list) { const rest = d.stops.filter(s => !marks[s.id] && (T.dayIdx !== curDay || pm(s) >= T.min - 90)); wallS = rest.find(s => s.big); list = rest.filter(s => !s.big && (!wallS || pm(s) < pm(wallS))); }
  if (!list.length) { closeModal(); toast("אין על מה לוותר. הכול בסדר"); return; }
  openModal(`<h2>על מה מוותרים?</h2><p class="sub">${wallS ? `נהיה צפוף לפני ${bd(wallS.n)} (${fmtT(wallS.m)}), ועל זה לא מוותרים.` : "אפשר להוריד משהו ולהמשיך רגוע."} מה שלא בא לך, פשוט מורידים.</p>
    <div class="rlist">${list.map(s => `<div class="ritem flat"><span><b>${sinfo(s).ic} ${bd(s.n)}</b><small>${fmtT(s.m)}</small></span><button class="btn" data-skip="${s.id}">לוותר</button></div>`).join("")}</div>
    <button class="btn wide" data-act="close">משאיר הכול כמו שזה</button>`);
  $$("#mbody [data-skip]").forEach(b => b.onclick = () => { setMark(b.dataset.skip, "skip"); b.closest(".ritem").classList.add("gone"); b.textContent = "ירד ✓"; b.disabled = true; renderAll(); });
}

/* ---------- כרטיס מקום ---------- */
const _wiki = LS.get("wiki", {});
async function wikiImg(title) {
  if (title in _wiki) return _wiki[title];
  try { const j = await fetchJson("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title), 7000); _wiki[title] = (j.thumbnail && j.thumbnail.source) || null; LS.set("wiki", _wiki); } catch (e) { return null; }
  return _wiki[title];
}
function openPlace(o) {
  let name, cz = "", inf = {}, l, s = null, extra = null, near = false;
  if (o.stopId) { s = findStop(o.stopId); inf = sinfo(s); l = loc(s); const p = s.at && place(s.at); name = p ? p.name : s.n; cz = p ? p.cz : ""; }
  else if (o.placeKey) { const p = place(o.placeKey); inf = TRIP.info[o.placeKey]; l = p; name = p.name; cz = p.cz; extra = { ...p, ...inf }; }
  else if (o.extraId) { extra = TRIP.extras.find(x => x.id === o.extraId); inf = extra; l = extra; name = extra.name; cz = extra.cz; }
  else { extra = o.near; near = true; inf = { ic: extra.ic, d: extra.sub || "", ty: extra.ty }; l = extra; name = extra.name; }
  const dist = gps && l ? hav(gps, l) : null, st = s ? marks[s.id] : null, col = TYC[inf.ty] || TYC.sight;
  openModal(`<div class="hero" id="hero" style="--c:${col}">${inf.lm ? glyphSvg(inf.g) : `<span>${inf.ic || "📍"}</span>`}</div>
    <div class="pc"><h2>${bd(name)}</h2>${cz ? `<p class="cz" dir="ltr">${esc(cz)}</p>` : ""}
    <p class="meta">${s ? `<span>🕐 ${fmtT(s.m)} בתוכנית</span>` : extra && !near ? `<span>✨ שווה אם אתה בסביבה</span>` : ""}${inf.stay ? `<span>⏳ ${inf.stay}</span>` : ""}${dist != null ? `<span>🚶 ${fmtDur(walkEst(dist))} · ${fmtDist(dist * 1.3)}</span>` : ""}${extra && extra.when ? `<span>📅 ${esc(extra.when)}</span>` : ""}${extra && extra.price ? `<span>🎟️ ${esc(extra.price)}</span>` : ""}</p>
    ${s && s.w ? `<p class="note">${bd(s.w)}</p>` : ""}${inf.one ? `<p class="one">${bd(inf.one)}</p>` : ""}${inf.d ? `<p class="desc">${bd(inf.d)}</p>` : ""}
    <div class="row wrap">${l ? `<a class="btn pri" href="${navUrl(l)}" target="_blank" rel="noopener">נווט</a><button class="btn" id="pcNav">🧭 חץ</button><a class="btn" href="${navUrl(l, "transit")}" target="_blank" rel="noopener">🚋</a>` : ""}
    ${s ? (st === "done" ? `<button class="btn" data-act="undone" data-id="${s.id}">בטל "סיימתי"</button>` : `<button class="btn ok" data-act="done" data-id="${s.id}">סיימתי פה ✓</button>`) : ""}
    ${s && !s.big && st !== "skip" && st !== "done" ? `<button class="btn ghost" data-act="skip" data-id="${s.id}">דלג</button>` : ""}
    ${extra ? `<button class="btn" id="addX">➕ להוסיף ליום</button>` : ""}${extra && extra.url ? `<a class="btn" href="${esc(extra.url)}" target="_blank" rel="noopener">לפרטים ↗</a>` : ""}</div></div>`, "place");
  if (extra) $("#addX").onclick = () => addStopFlow({ lat: extra.lat, lng: extra.lng, name: extra.name, q: extra.q || "", ic: extra.ic, ty: extra.ty, d: extra.d || "", m: extra.m, shift: extra.m != null ? 60 : 0 });
  const pn = $("#pcNav"); if (pn) pn.onclick = () => { closeModal(); startNav(l, name); };
  if (inf.wiki) wikiImg(inf.wiki).then(src => { const h = $("#hero"); if (!src || !h) return; const im = new Image(); im.alt = ""; im.decoding = "async"; im.onload = () => { h.classList.add("has"); h.appendChild(im); }; im.onerror = () => { if (im.src !== src) im.src = src; }; im.src = src.replace(/\/\d+px-/, "/640px-"); });
}
/* Bolt: אין קישור עומק רשמי ומתועד עם יעד, ו-bolt.eu לא פותח את האפליקציה. לכן: מעתיקים את כתובת המלון (מהפרטים השמורים בטלפון)
   ופותחים את הדף הרשמי של Bolt ב-App Store (id675033630, נבדק), שם כתוב "פתח" אם האפליקציה מותקנת. */
const BOLT_STORE = "https://apps.apple.com/app/id675033630";
async function boltGo() {
  const q = (me.hotel && me.hotel.q) || ""; let ok = false;
  if (q) { try { await navigator.clipboard.writeText(q); ok = true; } catch (e) { try { const t = document.createElement("textarea"); t.value = q; t.setAttribute("readonly", ""); t.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(t); t.select(); ok = document.execCommand("copy"); t.remove(); } catch (x) {} } }
  toast(ok ? "הכתובת הועתקה: הדבק ביעד או בחר 'מלון' מהשמורים" : q ? "לא הצלחתי להעתיק. בחר 'מלון' מהשמורים ב-Bolt" : "אין כתובת מלון ב'הפרטים שלי'. בחר 'מלון' מהשמורים ב-Bolt", 5200);
  window.open(BOLT_STORE, "_blank", "noopener");
}
function openBolt() {
  openModal(`<h2>🚕 Bolt</h2><p class="desc">מזמינים רק דרך האפליקציה. לא עולים על מונית שעוצרת ברחוב ולא עם מי שניגש אליך. באפליקציה רואים מחיר מראש, שם נהג ומספר רכב: בודקים שהלוחית תואמת.</p>
    <p class="fine">💵 משלמים במזומן? בוחרים <b>Cash</b> באמצעי התשלום <b>לפני</b> ההזמנה.</p>
    <div class="row wrap"><button class="btn pri" id="boltGo">📋 להעתיק את כתובת המלון ולפתוח את Bolt</button><a class="btn" href="${navUrl(place("hotel"))}" target="_blank" rel="noopener">🏠 הביתה ברגל</a></div>
    <p class="fine">נפתח הדף של Bolt ב-App Store: לוחצים שם "פתח".</p>`);
  $("#boltGo").onclick = boltGo;
}

/* ---------- מסך פתיחה ---------- */
function showSplash(done) {
  const T = tripNow(), h = T.hour, hello = h >= 5 && h < 12 ? "בוקר טוב" : h < 17 ? "צהריים טובים" : h < 22 ? "ערב טוב" : "לילה טוב";
  const di = T.dayIdx >= 0 ? T.dayIdx : 0, day = plan[di], wd = typeof wxDay === "function" ? wxDay(day.date) : null;
  let top = day.stops.filter(s => (s.big || sinfo(s).big) && s.at !== "hotel"); const seen = new Set(); top = top.filter(s => !seen.has(s.at || s.id) && seen.add(s.at || s.id)).slice(0, 3);
  const sp = $("#splash");
  sp.innerHTML = `<div class="sp-in"><p class="sp-hi">${hello}, עומר</p><h1>${T.phase === "during" ? `יום ${di + 1} מתוך ${plan.length}` : T.phase === "before" ? "פראג מחכה" : "היה טיול"}</h1>
    <p class="sp-st">${T.phase === "during" ? bd(day.title) : statusLine().replace("✈️ ", "")}</p>
    ${wd ? `<p class="sp-wx"><span dir="ltr">${wxIcon(wd.code)} ${wd.max}° / ${wd.min}°</span> · ${wearAdvice(wd).split(".")[0]}</p>` : ""}
    <ul>${top.map(s => `<li><span>${sinfo(s).ic}</span><b>${bd(s.n)}</b><i>${fmtT(s.m)}</i></li>`).join("")}</ul><button class="sp-go">למפה ←</button></div>`;
  sp.hidden = false; let gone = false;
  const go = () => { if (gone) return; gone = true; sp.classList.add("out"); setTimeout(() => { sp.hidden = true; sp.classList.remove("out"); }, 520); done(); };
  sp.onclick = go; setTimeout(go, QS.get("splash") === "hold" ? 6e5 : 3400);
}

/* ---------- רשת ---------- */
async function fetchJson(url, ms = 8000, opt = {}) { // כל בקשה עם timeout
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(url, { ...opt, signal: ctl.signal }); if (!r.ok) throw new Error("http " + r.status); return await r.json(); } finally { clearTimeout(to); }
}
const isOffline = () => navigator.onLine === false || QS.get("offline") === "1";
function renderNet() { const off = isOffline(), n = $("#net"); n.hidden = !off; document.documentElement.classList.toggle("offline", off); $("#fabChat").classList.toggle("off", off); }

/* ---------- מקרא קטן למפה (אפשר לסגור) ---------- */
function showLegend(on) { const l = $("#legend"); l.hidden = !on; if (!on) LS.set("lgSeen", 1); if (on) { $("#lgEv").checked = !!settings.evOn; l.style.setProperty("--day", DAYC[curDay]); } }
function initLegend() {
  $("#legend").innerHTML = `<button id="lgX" aria-label="סגור מקרא">✕</button><b>מה רואים על המפה</b>
    <p><i class="lg-pin">3</i> התחנות של היום, לפי הסדר</p><p><i class="lg-pin nx">4</i> לאן הולכים עכשיו</p><p><i class="lg-pin dn">✓</i> כבר הייתי</p>
    <p><i class="lg-ln"></i> המסלול של היום</p><p><i class="lg-ln nx"></i> הקטע הבא</p><p><i class="lg-dot"></i> שווה אם אתה בסביבה (נוגעים לפרטים)</p><p><i class="lg-me"></i> אתה</p>
    <label class="sw mini"><span>🎄 להראות שווקים ומסיבות</span><input type="checkbox" id="lgEv"><i></i></label>`;
  $("#lgX").onclick = () => showLegend(false); $("#lgEv").onchange = e => toggleEvents(e.target.checked);
  if (!LS.get("lgSeen")) showLegend(true);
}
