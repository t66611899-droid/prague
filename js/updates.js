/* updates: עדכונים חיים רק לאזורים ולשעות שבמסלול — מזג אוויר, תחבורה (PID), שעות פתיחה (OSM), אור יום. בלי מפתחות. */
"use strict";

/* שעות פתיחה מ-OpenStreetMap (נבדקו ב-23.11.2026). כללי החורף בלבד. */
const OH = {
  primark: "Mo-Sa 09:00-21:00", palladium: "Mo-Su 07:00-24:00", kuz: "Mo-Fr 12:00-19:00; Sa 13:00-17:00", manifesto: "Mo-Su 11:00-22:00",
  duplex: "Mo-Su 22:00-05:00", epic: "We-Sa 22:00-05:00", x_louvre: "Mo-Fr 08:00-23:30; Sa,Su 09:00-23:30", x_petrin: "Mo-Su 10:00-18:00",
  x_tower: "Mo-Su 10:00-18:00", x_quadrio: "Mo-Su 07:00-21:00", footshop: "Mo-Su 11:00-20:00"
};
const DAYS2 = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
function ohRules(str) { // → [{days:Set, a, b}] בדקות
  return str.split(";").map(r => r.trim()).filter(Boolean).map(r => {
    const m = /^([A-Za-z,\- ]+?)\s+(\d\d):(\d\d)-(\d\d):(\d\d)$/.exec(r); if (!m) return null; const days = new Set();
    m[1].split(",").forEach(p => { const [x, y] = p.trim().split("-"), i = DAYS2.indexOf(x), j = y ? DAYS2.indexOf(y) : i; if (i < 0 || j < 0) return; for (let k = i; ; k = (k + 1) % 7) { days.add(k); if (k === j) break; } });
    let a = +m[2] * 60 + +m[3], b = +m[4] * 60 + +m[5]; if (b <= a) b += 1440; return { days, a, b };
  }).filter(Boolean);
}
function ohFor(s) { if (/Footshop/i.test(s.n)) return OH.footshop; return (s.at && OH[s.at]) || null; }
function ohState(str, date, min) { // min = דקות מתחילת התאריך (אפשר מעל 1440)
  const dow = new Date(date + "T00:00:00Z").getUTCDay(), rules = ohRules(str); if (!rules.length) return null;
  const hit = (d, m) => rules.find(r => r.days.has(((d % 7) + 7) % 7) && m >= r.a && m < r.b);
  const open = hit(dow + Math.floor(min / 1440), min % 1440) || hit(dow + Math.floor(min / 1440) - 1, (min % 1440) + 1440);
  const today = rules.filter(r => r.days.has(dow)).map(r => `${fmtT(r.a)}–${fmtT(r.b)}`).join(", ");
  return { open: !!open, today: today || "סגור היום" };
}
const ohLabel = (key, date) => { const st = OH[key] && ohState(OH[key], date, 720); return st ? st.today : ""; };

/* ---------- תחבורה: פיד התקלות והשינויים הרשמי של PID ---------- */
const MY_LINES = ["A", "B", "C", "2", "3", "4", "6", "9", "10", "11", "13", "14", "16", "17", "18", "22", "23", "24", "59", "91", "92", "93", "94", "95", "96", "97", "98", "99"];
const HOTEL_LINES = ["C", "4", "6", "10", "11", "13", "16", "22"], AIRPORT_LINES = ["A", "59"];
let pid = LS.get("pid", null);
async function loadPid() {
  if (isOffline() || !CONFIG.pidUrl || (pid && Date.now() - pid.t < 28 * 60000)) return;
  try { const j = await fetchJson(CONFIG.pidUrl, 9000); if (Array.isArray(j.items)) { pid = { t: Date.now(), items: j.items.slice(0, 120) }; LS.set("pid", pid); refreshUpdates(); } } catch (e) {}
}
function pidRelevant() {
  if (!pid) return []; const T = tripNow(), now = Date.now(); if (T.phase !== "during") return []; /* לפני הטיול אין מה להתריע */
  const di = T.dayIdx, air = plan[di].stops.some(s => s.at === "airport" && (s.m == null || s.m >= T.min - 30));
  return pid.items.filter(x => {
    const lines = (x.lines || []).filter(l => MY_LINES.includes(l)); if (!lines.length) return false;
    const a = x.from ? Date.parse(x.from) : 0, b = x.to ? Date.parse(x.to) : Infinity; if (isNaN(a) || (b && b < now) || a > now + 12 * 36e5) return false; /* רק מה שבתוקף עכשיו או ב-12 השעות הקרובות */
    x._lines = lines; x._home = lines.some(l => HOTEL_LINES.includes(l)); x._air = air && lines.some(l => AIRPORT_LINES.includes(l)); return true;
  }).sort((p, q) => (q._air ? 2 : q._home ? 1 : 0) - (p._air ? 2 : p._home ? 1 : 0) || (q.live ? 1 : 0) - (p.live ? 1 : 0)).slice(0, 6);
}

/* ---------- מזג אוויר לפי שעה ---------- */
function wxAt(date, min) {
  if (!wx) return null; const d = new Date(Date.UTC(...date.split("-").map((v, i) => i === 1 ? v - 1 : +v)) + Math.floor(min / 60) * 36e5), k = d.toISOString().slice(0, 13) + ":00", i = wx.h.time.indexOf(k); if (i < 0) return null;
  return { t: wx.h.temperature_2m[i], pp: wx.h.precipitation_probability[i] || 0, snow: wx.h.snowfall[i] || 0, code: wx.h.weather_code[i] };
}
const isIndoor = s => !!(sinfo(s).in || ["party"].includes(sinfo(s).ty) || s.at === "hotel");

/* ---------- בונים את רשימת העדכונים: רק מה שנוגע למסלול ---------- */
function buildUpdates() {
  const T = tripNow(), di = T.dayIdx >= 0 ? T.dayIdx : curDay, day = plan[di], today = T.dayIdx === di, now = today ? T.min : 0, out = [];
  const up = day.stops.filter(s => !marks[s.id] && pm(s) >= now - 30);
  // מזג אוויר בשעות שאני בחוץ
  if (wx) {
    let done = { snow: 0, rain: 0, cold: 0 };
    for (const s of up) {
      if (isIndoor(s) || !loc(s)) continue; const w = wxAt(day.date, pm(s)); if (!w) continue;
      const kind = w.snow > 0.1 || (w.code >= 71 && w.code <= 77) ? "snow" : w.pp >= 60 || (w.code >= 51 && w.code <= 67) || (w.code >= 80 && w.code <= 82) ? "rain" : w.t <= -8 ? "cold" : null; if (!kind || done[kind]) continue; done[kind] = 1;
      const ind = day.stops.filter(x => isIndoor(x) && !marks[x.id] && x.at !== "hotel" && loc(x) && !isFixed(x)).sort((a, b) => hav(loc(a), loc(s)) - hav(loc(b), loc(s)))[0]
        || [...TRIP.extras.filter(x => x.in)].sort((a, b) => hav(a, loc(s)) - hav(b, loc(s)))[0];
      const iname = ind ? (ind.n || ind.name) : "";
      out.push({ lvl: 2, ic: kind === "snow" ? "❄️" : kind === "rain" ? "🌧️" : "🥶", t: kind === "snow" ? `שלג בסביבות ${fmtT(pm(s))}` : kind === "rain" ? `גשם בסביבות ${fmtT(pm(s))}` : `קור רציני בסביבות ${fmtT(pm(s))} (${Math.round(w.t)}°)`,
        b: `בדיוק כשאתה אמור להיות ב${/^[A-Za-z]/.test(s.n) ? "-" : ""}${s.n}.${iname ? ` אם בא לך, אפשר לעבור קודם למקום מקורה: ${iname}.` : ""}`, act: ind && ind.id && findStop(ind.id) ? { stopId: ind.id } : ind && ind.id ? { extraId: ind.id } : null, src: "wx" });
    }
    const wd = wxDay(day.date); if (wd) out.push({ lvl: 0, ic: wxIcon(wd.code), t: `${wd.max}° / ${wd.min}° היום`, b: wearAdvice(wd), src: "wx", fn: "wx" });
  }
  // תחבורה
  for (const x of pidRelevant()) out.push({ lvl: x._air || x._home ? 2 : 1, ic: "🚋", t: `${x._lines.length > 1 ? "קווים" : "קו"} ${x._lines.join(", ")}: ${x.live ? "תקלה עכשיו" : "שינוי במסלול"}${x._air ? " · בדרך לשדה" : x._home ? " · עובר ליד המלון" : ""}`, cz: x.title, b: `${x._air ? "כדאי לצאת 15 דק' מוקדם יותר, או Bolt." : "חלופה: מטרו, ללכת ברגל, או Bolt."}${x.to ? " עד " + new Date(Date.parse(x.to)).toLocaleDateString("he-IL", { day: "numeric", month: "numeric", timeZone: "Europe/Prague" }) + "." : ""}`, url: x.link, src: "pid" });
  // שעות פתיחה
  for (const s of up) { const o = ohFor(s); if (!o) continue; const st = ohState(o, day.date, pm(s)); if (st && !st.open) out.push({ lvl: 2, ic: "🚪", t: `${s.n}: סגור ב${isFixed(s) ? "-" + fmtT(s.m) : partOfDay(s.m)}`, b: `לפי OpenStreetMap פתוח היום ${st.today}. שווה להזיז לשעה אחרת.`, act: { stopId: s.id }, src: "oh" }); }
  // אור יום
  const sun = sunTimes(new Date(day.date + "T12:00:00Z")), outdoor = up.find(s => ["view"].includes(sinfo(s).ty) && pm(s) > sun.set - 20 && pm(s) < sun.set + 240 && !isFixed(s));
  if (today && now < sun.set && now > sun.set - 150) { const L = live(di), at = L.cur || L.next; out.push({ lvl: at && sinfo(at).ty === "view" ? 2 : 1, ic: "🌇", t: `עוד ${fmtDur(sun.set - now)} של אור`, b: `השקיעה ב-${fmtT(sun.set)}.${at && sinfo(at).ty === "view" ? " אתה בנקודת נוף, זה הזמן הכי יפה לתמונות." : " אחריה מחשיך מהר, והשווקים נדלקים."}`, src: "sun" }); }
  else out.push({ lvl: 0, ic: "🌅", t: `זריחה ${fmtT(sun.rise)} · שקיעה ${fmtT(sun.set)}`, b: "בדצמבר יש בערך 8 שעות אור. את הנופים עושים לפני ארבע.", src: "sun" });
  if (outdoor) out.push({ lvl: 1, ic: "🔦", t: `${outdoor.n}: כבר חשוך ב${partOfDay(outdoor.m)}`, b: `השקיעה ב-${fmtT(sun.set)}. אם חשוב לך הנוף באור יום, שווה להקדים.`, act: { stopId: outdoor.id }, src: "sun" });
  // כדאי לדעת להיום
  if (day.stops.some(s => ["duplex", "epic"].includes(s.at) && !marks[s.id])) out.push({ lvl: 0, ic: "🪪", t: "הערב יש מועדון", b: "תעודה מזהה פיזית בכיס, ומטען נייד. הביתה עם Bolt מהאפליקציה או ברחובות הראשיים.", src: "tip" });
  return out.sort((a, b) => b.lvl - a.lvl);
}
let _upd = [];
function refreshUpdates() { _upd = buildUpdates(); const n = _upd.filter(u => u.lvl >= 2).length, b = $("#updBadge"); if (b) { b.textContent = n; b.hidden = !n; } LS.set("updT", { wx: wx ? wx.t : 0, pid: pid ? pid.t : 0 }); if (typeof renderNext === "function" && $("#nextCard").innerHTML) { renderNext(); if (!isDesktop() && typeof setSheet === "function") setSheet(sheetState, true); } }
function updateCard() { // כרטיס עדין אחד בגיליון, רק לדבר הכי חשוב
  const seen = LS.get("updSeen", {}), u = _upd.find(u => u.lvl >= 2 && !seen[u.t]); if (!u) return "";
  return `<div class="evc upd"><button class="evc-m" data-up="open"><b>${u.ic} ${bd(u.t)}</b><small>${bd(u.b)}</small></button><button class="evc-x" data-up="x" data-k="${esc(u.t)}" aria-label="הבנתי">✕</button></div>`;
}
function openUpdates() {
  const U = buildUpdates(); _upd = U; const hot = U.filter(u => u.lvl >= 2), rest = U.filter(u => u.lvl < 2), T = tripNow(), di = T.dayIdx >= 0 ? T.dayIdx : curDay, dd = dayDate(plan[di].date);
  const row = (u, i) => `<div class="upd-i lv${u.lvl}"><span class="upd-ic">${u.ic}</span><div><b>${bd(u.t)}</b>${u.cz ? `<small class="cz1" dir="ltr">${esc(u.cz)}</small>` : ""}<p>${bd(u.b)}</p>
    <div class="row wrap">${u.act ? `<button class="btn" data-ua="${i}">להראות על המפה</button>` : ""}${u.fn === "wx" ? `<button class="btn" data-uf="wx">תחזית לפי שעה</button>` : ""}${u.url ? `<a class="btn" href="${esc(u.url)}" target="_blank" rel="noopener">לפרטים ב-PID ↗</a>` : ""}</div></div></div>`;
  const all = [...hot, ...rest];
  openModal(`<p class="kick">${dd.dow} ${dd.dm}${T.dayIdx < 0 ? " · היום הנבחר" : ""}</p><h2>🔔 עדכונים</h2><p class="sub">רק מה שנוגע למסלול שלך: האזורים, הקווים והשעות של היום.</p>
    ${hot.length ? `<h3>שווה לדעת עכשיו</h3>` + hot.map((u) => row(u, all.indexOf(u))).join("") : `<div class="card soft"><b>✓ הכול רגוע</b><p class="sub">אין כרגע משהו שמשנה את היום שלך.</p></div>`}
    ${rest.length ? `<h3>ברקע</h3>` + rest.map((u) => row(u, all.indexOf(u))).join("") : ""}
    <p class="fine">${isOffline() ? "📡 בלי אינטרנט. מוצג מה ששמור במכשיר.<br>" : ""}מזג אוויר: ${wx ? "עודכן " + ago(wx.t) : "עוד לא נטען"} (Open-Meteo) · תחבורה: ${pid ? "עודכן " + ago(pid.t) : "עוד לא נטען"} (PID) · שעות פתיחה: OpenStreetMap, נבדקו לפני הטיול.</p>
    <button class="btn wide" id="updNow">לרענן עכשיו</button>`, "tall");
  $$("#mbody [data-ua]").forEach(b => b.onclick = () => { const u = all[b.dataset.ua]; closeModal(); if (u.act.stopId) { focusStop(u.act.stopId); setTimeout(() => openPlace(u.act), 900); } else { const x = TRIP.extras.find(e => e.id === u.act.extraId); flyTo(x, 16.4); setTimeout(() => openPlace(u.act), 900); } });
  $$("#mbody [data-uf]").forEach(b => b.onclick = openWeather);
  $("#updNow").onclick = async () => { if (isOffline()) return toast("אין אינטרנט כרגע. מוצג מה ששמור"); const b = $("#updNow"); b.disabled = true; b.textContent = "מרענן…"; if (wx) wx.t = 0; if (pid) pid.t = 0; await Promise.all([loadWeather(), loadPid()]); refreshUpdates(); if ($("#updNow")) openUpdates(); toast("עודכן ✓"); };
}
