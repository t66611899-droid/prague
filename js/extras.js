/* extras: מזג אוויר, מה יש פה, Claude, קר לי, היום שלי, הוצאות, חירום, פרטים, הגדרות, סיכום, אירועים, אופליין, אתחול */
"use strict";

/* ---------- מזג אוויר (Open-Meteo, בלי מפתח). בלי רשת מציגים את התחזית האחרונה ששמורה ---------- */
let wx = LS.get("wx", null);
async function loadWeather() {
  if (isOffline() || (wx && Date.now() - wx.t < 29 * 60000)) return;
  try {
    const j = await fetchJson("https://api.open-meteo.com/v1/forecast?latitude=50.0875&longitude=14.4213&hourly=temperature_2m,apparent_temperature,precipitation_probability,snowfall,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,snowfall_sum,weather_code&timezone=Europe%2FPrague&forecast_days=16", 9000);
    if (!j.daily) return; wx = { t: Date.now(), d: j.daily, h: j.hourly }; LS.set("wx", wx); renderTop(); if (typeof refreshUpdates === "function") refreshUpdates();
  } catch (e) {}
}
const wxIcon = c => c == null ? "🌡️" : c === 0 ? "☀️" : c <= 2 ? "⛅" : c === 3 ? "☁️" : c <= 48 ? "🌫️" : (c >= 71 && c <= 77) || c === 85 || c === 86 ? "❄️" : c >= 95 ? "⛈️" : "🌧️";
function wxDay(date) {
  if (!wx) return null; const i = wx.d.time.indexOf(date); if (i < 0 || wx.d.temperature_2m_max[i] == null) return null;
  return { max: Math.round(wx.d.temperature_2m_max[i]), min: Math.round(wx.d.temperature_2m_min[i]), pp: wx.d.precipitation_probability_max[i] || 0, snow: wx.d.snowfall_sum[i] || 0, code: wx.d.weather_code[i] };
}
function wxChip(date) { const d = wxDay(date); return d ? `${wxIcon(d.code)} <b dir="ltr">${d.max}°</b>` : ""; }
function wxHours(date) {
  if (!wx) return []; const out = [], i0 = wx.h.time.indexOf(date + "T08:00"); if (i0 < 0) return out;
  for (let i = i0; i <= i0 + 18 && i < wx.h.time.length; i += 2) out.push({ h: wx.h.time[i].slice(11, 16), t: Math.round(wx.h.temperature_2m[i]), pp: wx.h.precipitation_probability[i] || 0, code: wx.h.weather_code[i] });
  return out;
}
function isWetNow() {
  if (!wx) return false; const w = wall(), k = dstr(w) + "T" + String(w.getUTCHours()).padStart(2, "0") + ":00", i = wx.h.time.indexOf(k);
  return i >= 0 && ((wx.h.precipitation_probability[i] || 0) >= 55 || wx.h.weather_code[i] >= 51);
}
function wearAdvice(d) {
  if (!d) return "דצמבר בפראג: בערך 0 עד 4 מעלות. מעיל חם, שכבות, כפפות וכובע.";
  let a = d.min <= -3 ? "קר ממש. שכבה תרמית מתחת, מעיל חם, כפפות, כובע וצעיף." : d.max <= 3 ? "קר. מעיל חם, סוודר מתחת, כפפות וכובע." : d.max <= 8 ? "קריר. מעיל וסוודר, והכפפות בכיס לערב." : "נעים יחסית. מעיל קל ושכבה אחת מתחת.";
  if (d.snow > 0.2) a += " צפוי שלג, אז נעליים שלא מחליקות."; else if (d.pp >= 50) a += " סיכוי טוב לגשם. קפוצ'ון עדיף על מטרייה בשווקים.";
  return a;
}
function ago(t) { const m = Math.round((Date.now() - t) / 6e4); return m < 2 ? "עכשיו" : m < 60 ? `לפני ${m} דק'` : m < 2880 ? `לפני ${Math.round(m / 60)} שע'` : `לפני ${Math.round(m / 1440)} ימים`; }
function wxBlock(date) {
  const d = wxDay(date), hrs = wxHours(date);
  if (!d) return `<div class="card soft"><b>🌡️ התחזית עוד לא זמינה</b><p class="sub">היא מתעדכנת לבד כשמתקרבים לתאריך וכשיש חיבור. ${wearAdvice(null)}</p></div>`;
  return `<div class="card soft"><div class="wx-h"><span class="wx-big" dir="ltr">${wxIcon(d.code)} ${d.max}°<small> / ${d.min}°</small></span><span class="sub">${d.snow > 0.2 ? `❄️ שלג ${d.snow.toFixed(1)} ס"מ` : `💧 ${d.pp}% משקעים`}</span></div>
    <p class="desc">${wearAdvice(d)}</p>${hrs.length ? `<div class="wx-row">${hrs.map(h => `<div class="wx-c"><small>${h.h}</small><span>${wxIcon(h.code)}</span><b>${h.t}°</b><small class="${h.pp >= 50 ? "wet" : ""}">${h.pp}%</small></div>`).join("")}</div>` : ""}
    <p class="fine">עודכן ${ago(wx.t)}${isOffline() ? " · בלי אינטרנט, זאת התחזית האחרונה ששמורה" : ""} · Open-Meteo</p></div>`;
}
function openWeather() { const dd = dayDate(plan[curDay].date); openModal(`<h2>מזג האוויר · ${dd.dow} ${dd.dm}</h2>${wxBlock(plan[curDay].date)}`); }

/* ---------- "מה יש פה?" (Overpass / OpenStreetMap) ---------- */
const F = '[amenity~"^(restaurant|fast_food|cafe)$"]';
const CATS = [
  { k: "food", n: "🍕 אוכל בלי בשר", q: a => `nwr${a}${F}[cuisine~"pizza|vegetarian|vegan|falafel"];nwr${a}${F}["diet:vegetarian"~"yes|only"];nwr${a}${F}["diet:vegan"~"yes|only"];nwr${a}[shop=bakery];` },
  { k: "cafe", n: "☕ קפה", q: a => `nwr${a}[amenity=cafe];` },
  { k: "shop", n: "👟 בגדים וסניקרס", q: a => `nwr${a}[shop~"^(clothes|shoes|second_hand|fashion|boutique)$"];` },
  { k: "view", n: "🌄 תצפיות", q: a => `nwr${a}[tourism=viewpoint];` },
  { k: "xmas", n: "🎄 שווקי כריסמס", q: null },
  { k: "super", n: "🛒 סופר", q: a => `nwr${a}[shop~"^(supermarket|convenience)$"];` },
  { k: "atm", n: "🏧 כספומט", note: "בכספומט בוחרים תמיד חיוב ב-CZK ומסרבים ל\"המרה\". כספומט של בנק (ČSOB, KB, Česká spořitelna) עדיף על עצמאי. לא מחליפים כסף ברחוב, ונזהרים מצ'יינג'ים עם \"0% עמלה\".", q: a => `nwr${a}[amenity=atm];nwr${a}[amenity=bank][atm=yes];` },
  { k: "wc", n: "🚻 שירותים", note: "שירותים ציבוריים בפראג הם לרוב בתשלום (מטבעות או כרטיס). בקניונים ובבתי קפה זה בחינם או זול.", q: a => `nwr${a}[amenity=toilets];` }
];
const OVERPASS = ["https://overpass.kumi.systems/api/interpreter", "https://overpass-api.de/api/interpreter"];
async function overpass(q) { // שני שרתים, כל אחד עם timeout
  let err; for (const u of OVERPASS) { try { return await fetchJson(u, 11000, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(q) }); } catch (e) { err = e; } } throw err;
}
const XMAS = ["wenc", "ots", "miru"];
function refPoint() { if (gps) return { lat: gps.lat, lng: gps.lng, me: true }; const c = map.getCenter(); return { lat: c.lat, lng: c.lng, me: false }; }
function builtinNear(ref, r, onlyXmas) {
  const inPlan = new Set(plan[curDay].stops.map(s => s.at));
  const all = [...TRIP.extras.map(x => ({ ...x, extraId: x.id })), ...Object.entries(TRIP.places).filter(([k]) => k !== "hotel" && k !== "airport" && !inPlan.has(k)).map(([k, p]) => ({ ...p, ...TRIP.info[k], id: "p_" + k, placeKey: k, xmas: XMAS.includes(k) }))];
  return all.filter(x => !onlyXmas || x.xmas).map(x => ({ ...x, dist: hav(ref, x) })).filter(x => x.dist <= r).sort((a, b) => a.dist - b.dist);
}
function tagItem(e, cat) {
  const t = e.tags || {}, lat = e.lat ?? (e.center && e.center.lat), lng = e.lon ?? (e.center && e.center.lon); if (lat == null) return null;
  let ic = "📍", veg = false, sub = "", name = t.name || t.brand || "", ty = "sight";
  if (cat === "food") {
    const cu = t.cuisine || "", vg = /yes|only/.test(t["diet:vegetarian"] || "") || /yes|only/.test(t["diet:vegan"] || "") || /vegetarian|vegan/.test(cu); ty = "food";
    if (t.shop === "bakery") { ic = "🥐"; sub = "מאפייה"; } else if (/pizza/.test(cu)) { ic = "🍕"; sub = "פיצה"; veg = true; } else if (/falafel/.test(cu)) { ic = "🧆"; sub = "פלאפל"; veg = true; } else { ic = "🥗"; sub = "יש צמחוני"; veg = true; }
    if (vg) { veg = true; if (/only/.test(t["diet:vegan"] || "")) sub += " · טבעוני"; else if (!/צמחוני/.test(sub)) sub += " · יש צמחוני"; }
  } else if (cat === "cafe") { ic = "☕"; sub = "קפה"; ty = "cafe"; }
  else if (cat === "shop") { ty = "shop"; ic = t.shop === "shoes" ? "👟" : t.shop === "second_hand" ? "🧥" : "🛍️"; sub = t.shop === "shoes" ? "נעליים" : t.shop === "second_hand" ? "יד שנייה / וינטג'" : "בגדים"; }
  else if (cat === "view") { ty = "view"; ic = "🌄"; sub = "תצפית"; name = name || "נקודת תצפית"; }
  else if (cat === "super") { ty = "food"; ic = "🛒"; sub = t.shop === "convenience" ? "מכולת" : "סופר"; veg = /albert|billa|lidl/i.test(name); }
  else if (cat === "atm") { ty = "transit"; ic = "🏧"; name = name || t.operator || "כספומט"; sub = t.operator && t.operator !== name ? t.operator : "כספומט"; }
  else if (cat === "wc") { ty = "transit"; ic = "🚻"; name = name || "שירותים ציבוריים"; sub = t.fee === "no" ? "בחינם" : t.fee === "yes" ? "בתשלום (מטבעות)" : "שירותים"; }
  if (!name) return null;
  return { id: "n" + e.id, name, ic, veg: veg && cat !== "super", top: veg, sub, lat, lng, q: "", ty };
}
let _nearCat = "food", _nearItems = [];
async function runNearby(cat) {
  _nearCat = cat; const ref = refPoint(), box = $("#nearR"), C = CATS.find(c => c.k === cat);
  $$("#nearC .chip").forEach(b => b.classList.toggle("sel", b.dataset.k === cat));
  const wet = isWetNow(); let bi = builtinNear(ref, 900, cat === "xmas"); if (wet) bi.sort((a, b) => (b.in ? 1 : 0) - (a.in ? 1 : 0) || a.dist - b.dist);
  const biHtml = bi.length ? `<h3>${cat === "xmas" ? "שווקים בסביבה" : "שווה אם אתה בסביבה"}${wet ? " · יורד בחוץ, אז מקורה קודם" : ""}</h3>` + bi.slice(0, cat === "xmas" ? 8 : 4).map(x => nearRow({ ...x, sub: (x.in ? "מקורה · " : "") + (x.cz || "") })).join("") : cat === "xmas" ? emptyState("🎄", "אין שוק ממש כאן", "הקרובים: כיכר ואצלב, כיכר העיר העתיקה וכיכר השלום.") : "";
  _nearItems = bi;
  if (!C.q) { box.innerHTML = biHtml; bindNear(); showNearMarkers([]); return; }
  if (isOffline()) { box.innerHTML = biHtml + emptyState("📡", "בלי אינטרנט", "החיפוש בסביבה צריך קליטה. המקומות המובנים למעלה שמורים במכשיר."); bindNear(); return; }
  box.innerHTML = biHtml + `<p class="sub dots">מחפש ${C.n}</p>`; bindNear();
  try {
    let items = [];
    for (const r of [500, 800]) {
      const a = `(around:${r},${ref.lat.toFixed(3)},${ref.lng.toFixed(3)})`; // מעגלים את המיקום (~100 מ') לפני ששולחים
      const j = await overpass(`[out:json][timeout:10];(${C.q(a)});out center tags 80;`);
      const seen = new Set(); items = j.elements.map(e => tagItem(e, cat)).filter(x => x && !seen.has(x.name + x.sub) && seen.add(x.name + x.sub)).map(x => ({ ...x, dist: hav(ref, x) }));
      if (items.length >= 4) break;
    }
    items.sort((a, b) => (b.top ? 1 : 0) - (a.top ? 1 : 0) || a.dist - b.dist);
    if (cat !== "food" && cat !== "super") items.sort((a, b) => a.dist - b.dist);
    if ($("#nearR") !== box || _nearCat !== cat) return;
    _nearItems = [...bi, ...items]; showNearMarkers(items);
    box.innerHTML = (C.note ? `<p class="fine note">${C.note}</p>` : "") + biHtml + (items.length ? `<h3>${C.n} · ${items.length} מקומות עד 800 מ'</h3>` + items.slice(0, 30).map(nearRow).join("") + `<button class="btn wide" id="nearMap">🗺️ להראות על המפה</button>` : emptyState("🤷", "לא מצאתי כאן", "אפשר לנסות קטגוריה אחרת, או לשאול את Claude."));
    bindNear();
  } catch (e) { box.innerHTML = biHtml + emptyState("📡", "החיפוש לא עונה כרגע", "המקומות המובנים למעלה עובדים תמיד. אפשר לנסות שוב עוד רגע."); bindNear(); }
}
const nearRow = x => `<div class="ritem flat${x.veg ? " veg" : ""}"><button class="rmain" data-nid="${x.id}"><b>${x.ic} ${bd(x.name)}</b><small>${fmtDist(x.dist * 1.3)} · 🚶 ${fmtDur(walkEst(x.dist))}${x.sub ? " · " + bd(x.sub) : ""}</small></button><a class="btn" href="${navUrl(x)}" target="_blank" rel="noopener">נווט</a></div>`;
function bindNear() {
  $$("#nearR .rmain").forEach(b => b.onclick = () => { const it = _nearItems.find(x => x.id === b.dataset.nid); if (!it) return; closeModal(); if (!isDesktop()) setSheet("low"); flyTo(it, 17); setTimeout(() => openPlace(it.extraId ? { extraId: it.extraId } : it.placeKey ? { placeKey: it.placeKey } : { near: it }), 900); });
  const m = $("#nearMap"); if (m) m.onclick = () => { closeModal(); if (!isDesktop()) setSheet("low"); const ref = refPoint(); map.flyTo({ center: [ref.lng, ref.lat], zoom: 15.6, ...camOpts(), padding: mapPad() }); };
}
function openNearby(cat) {
  const ref = refPoint();
  openModal(`<h2>מה יש פה?</h2><p class="sub">${ref.me ? "מחפש סביבך" : "אין GPS כרגע, אז מחפש סביב מרכז המפה"}, עד 800 מ'. לחיפוש נשלח מיקום מעוגל ל-OpenStreetMap, ורק כשלוחצים כאן.</p>
    <div class="chips" id="nearC">${CATS.map(c => `<button class="chip" data-k="${c.k}">${c.n}</button>`).join("")}</div><div id="nearR" class="rlist"></div>`, "tall");
  $$("#nearC .chip").forEach(b => b.onclick = () => runNearby(b.dataset.k)); runNearby(cat || _nearCat);
}

/* ---------- גיבוי: פתיחה ב-claude.ai עם אותו הקשר ---------- */
function claudeText(question) {
  const T = tripNow(), L = T.dayIdx >= 0 ? live(T.dayIdx) : null, w = T.w, time = String(w.getUTCHours()).padStart(2, "0") + ":" + String(w.getUTCMinutes()).padStart(2, "0");
  let where;
  if (gps) { const st = nearestStreet(gps), k = nearestKnown(gps), kd = hav(gps, k); where = st ? `ברחוב ${st}${kd < 500 ? `, ליד ${czName(k)}` : ""}` : `ליד ${czName(k)}`; }
  else { const s = L && (L.cur || L.next), l = s && s.at && place(s.at); where = l ? `באזור ${czName(l)}` : "במרכז העיר"; }
  const done = T.dayIdx >= 0 ? plan[T.dayIdx].stops.filter(s => marks[s.id] === "done").map(s => s.n) : [];
  const nx = L && L.next, hrs = nx ? Math.max(1, Math.min(4, Math.round((pm(nx) - T.min) / 60))) : 2, wd = wxDay(T.date);
  return `אני בפראג, עכשיו ${time}, ${where}.${wd ? ` בחוץ בערך ${wd.max}°${isWetNow() ? " ויורד גשם או שלג" : ""}.` : ""}
${done.length ? `כבר הייתי היום ב: ${done.join(", ")}.` : "עוד לא הספקתי כלום היום."}
${nx ? `הבא בתוכנית: ${nx.n} ב-${fmtT(nx.m)}.` : "אין לי עוד משהו קבוע היום."}
אני בן 18, לבד, לא אוכל בשר, אוהב קניות, מקומות של צעירים ולהסתובב.${typeof chatMood !== "undefined" && chatMood ? `\nהמצב שלי עכשיו: ${(MOODS.find(m => m[0] === chatMood) || ["", ""])[1].replace(/^\S+\s/, "")}.` : ""}
${question ? "מה שאני מחפש עכשיו: " + question + (/[?.!]$/.test(question) ? "" : ".") : `מה שווה לעשות פה ${hrs === 1 ? "בשעה הקרובה" : "ב-" + hrs + " השעות הקרובות"}?`} תן לי 3–4 רעיונות קונקרטיים במרחק הליכה, עם שמות מקומות כמו שהם כתובים על השלטים.`;
}
function openClaude(question) {
  openModal(`<h2>✨ לפתוח ב-Claude</h2><p class="sub">זאת ההודעה שתיפתח באפליקציית Claude. אפשר לערוך לפני ששולחים. נשלח רק שם הרחוב או המקום הקרוב, בלי קואורדינטות.</p>
    <textarea id="clT" rows="9" dir="auto">${esc(claudeText(typeof question === "string" ? question : ""))}</textarea>
    <div class="row"><button class="btn pri wide" id="clGo">לפתוח ב-Claude</button><button class="btn" id="clCp">העתק</button></div>`, "tall");
  $("#clGo").onclick = () => window.open("https://claude.ai/new?q=" + encodeURIComponent($("#clT").value), "_blank", "noopener");
  $("#clCp").onclick = () => { navigator.clipboard && navigator.clipboard.writeText($("#clT").value).then(() => toast("הועתק ✓")); };
}

/* ---------- "קר לי / נמאס לי" ---------- */
function openCold() {
  const ref = refPoint(), h = place("hotel"), hd = hav(ref, h);
  const warm = [...Object.entries(TRIP.places).filter(([k]) => TRIP.info[k] && TRIP.info[k].in).map(([k, p]) => ({ ...p, ...TRIP.info[k], id: "p_" + k, placeKey: k })), ...TRIP.extras.filter(x => x.in).map(x => ({ ...x, extraId: x.id }))]
    .map(x => ({ ...x, dist: hav(ref, x) })).sort((a, b) => a.dist - b.dist).slice(0, 4);
  _nearItems = warm;
  openModal(`<h2>🥶 קר? נמאס?</h2><p class="sub">לגיטימי לגמרי. הנה מקומות חמים קרובים${ref.me ? "" : " (לפי מרכז המפה, כי אין GPS כרגע)"}, והדרך הקצרה למלון.</p>
    <div class="rlist" id="nearR">${warm.map(x => nearRow({ ...x, sub: (x.d || "").split(".")[0] })).join("")}</div>
    <button class="btn wide" id="coldCafe">☕ לחפש קפה ממש קרוב</button>
    <div class="card soft"><b>🏠 חזרה למלון</b><p class="sub">${fmtDist(hd * 1.3)} · 🚶 ${fmtDur(walkEst(hd))}${hd > 2000 ? " · עדיף חשמלית או Bolt" : ""}</p>
    <div class="row wrap"><a class="btn pri" href="${navUrl(h)}" target="_blank" rel="noopener">ברגל</a><a class="btn" href="${navUrl(h, "transit")}" target="_blank" rel="noopener">🚋 חשמלית</a><button class="btn" data-act="bolt">🚕 Bolt</button></div></div>`, "tall");
  bindNear(); $("#coldCafe").onclick = () => openNearby("cafe");
}

/* ---------- מה לקחת ---------- */
function packHtml(di) {
  const date = plan[di].date, items = [...(TRIP.pack[date] || []), ...TRIP.pack.base], ch = LS.get("pack." + date, {});
  const club = plan[di].stops.some(s => ["duplex", "epic"].includes(s.at));
  return `<div class="pack" data-date="${date}">${items.filter(x => club || !/מועדונים/.test(x)).map(x => `<label class="chk"><input type="checkbox" data-k="${esc(x)}" ${ch[x] ? "checked" : ""}><span>${bd(x)}</span></label>`).join("")}</div>`;
}
function bindPack() { $$("#mbody .pack input").forEach(c => c.onchange = () => { const d = c.closest(".pack").dataset.date, ch = LS.get("pack." + d, {}); ch[c.dataset.k] = c.checked; LS.set("pack." + d, ch); buzz(6); }); }
function openPack() { const dd = dayDate(plan[curDay].date); openModal(`<h2>🎒 מה לקחת · ${dd.dow} ${dd.dm}</h2>${packHtml(curDay)}`); bindPack(); }

/* ---------- הוצאות ---------- */
let exp = LS.get("exp", []);
const spent = date => exp.filter(e => !date || e.date === date).reduce((a, e) => a + e.a, 0);
const kc = n => Math.round(n).toLocaleString("en-US") + " Kč";
function openExp() {
  const left = TRIP.budget - spent(), T = tripNow(), daysLeft = T.phase === "during" ? plan.length - T.dayIdx : plan.length, pct = Math.min(100, spent() / TRIP.budget * 100);
  openModal(`<h2>💰 הוצאות</h2><div class="card soft"><div class="money ${left < 0 ? "neg" : ""}" dir="ltr">${kc(left)}</div><p class="sub">נשאר מתוך ${kc(TRIP.budget)}</p>
    <div class="bar"><i style="width:${pct}%"></i></div><p class="sub">${left > 0 ? `בערך ${kc(left / daysLeft)} ליום לימים שנשארו` : "עברת את התקציב. קורה, רק שתדע."}</p></div>
    <form id="expF"><div class="row"><input id="expA" type="number" inputmode="decimal" min="1" step="1" placeholder="סכום ב-Kč" required><button class="btn pri">להוסיף</button></div>
    <div class="chips" id="expC">${["🍕 אוכל", "🛍️ קניות", "🎧 מסיבה", "🚋 תחבורה", "☕ קפה", "אחר"].map((c, i) => `<button type="button" class="chip${i === 0 ? " sel" : ""}">${c}</button>`).join("")}</div></form>
    <div class="rlist">${[...exp].reverse().map(e => `<div class="ritem flat"><span><b>${esc(e.n)}</b><small>${dayDate(e.date).dm}</small></span><span class="amt" dir="ltr">${kc(e.a)}</span><button class="st-del" data-x="${e.id}" aria-label="מחק">✕</button></div>`).join("") || emptyState("🧾", "עוד אין הוצאות", "מכניסים סכום כל פעם שמשלמים, ורואים כמה נשאר.")}</div>`, "tall");
  $$("#expC .chip").forEach(b => b.onclick = () => { $$("#expC .chip").forEach(x => x.classList.remove("sel")); b.classList.add("sel"); });
  $("#expF").onsubmit = e => { e.preventDefault(); const a = +$("#expA").value; if (!(a > 0)) return; const T = tripNow(); exp.push({ id: Date.now(), a, n: $("#expC .sel").textContent, date: T.phase === "during" ? T.date : dstr(T.w) }); LS.set("exp", exp); buzz(10); openExp(); };
  $$("#mbody [data-x]").forEach(b => b.onclick = () => { exp = exp.filter(e => e.id !== +b.dataset.x); LS.set("exp", exp); openExp(); });
}

/* ---------- "היום שלי" ---------- */
function openToday(di) {
  const day = plan[di], dd = dayDate(day.date);
  let top = day.stops.filter(s => (s.big || sinfo(s).big) && s.at !== "hotel"); const seen = new Set(); top = top.filter(s => !seen.has(s.at || s.id) && seen.add(s.at || s.id)).slice(0, 3);
  if (top.length < 3) top = [...top, ...day.stops.filter(s => !top.includes(s) && s.at !== "hotel")].slice(0, 3).sort((a, b) => a.m - b.m);
  const left = TRIP.budget - spent();
  openModal(`<p class="kick">יום ${di + 1} · ${dd.dow} ${dd.dm}</p><h2>${bd(day.title)}</h2>${wxBlock(day.date)}
    <h3>שלושת הדברים של היום</h3><div class="rlist">${top.map(s => `<div class="ritem flat"><span><b>${sinfo(s).ic} ${bd(s.n)}</b><small>${fmtT(s.m)}${s.w ? " · " + bd(s.w) : ""}</small></span></div>`).join("")}</div>
    <h3>מה לקחת</h3>${packHtml(di)}
    <div class="card soft"><b>💰 נשאר לך <span dir="ltr">${kc(left)}</span></b><p class="sub">מתוך ${kc(TRIP.budget)}. את ההוצאות מעדכנים בכפתור "הוצאות".</p></div>
    <button class="btn pri wide" data-act="close">יאללה, יוצאים</button>`, "tall");
  bindPack();
}

/* ---------- סיכום יום + שמירה כתמונה ---------- */
function summaryData(di) {
  const day = plan[di], km = trackKm(day.date), L = dayLine(di), segs = trackSegs(day.date), city = p => p[0] > 14.33;
  return { day, km, steps: Math.round(km * 1320 / 100) * 100, done: day.stops.filter(s => marks[s.id] === "done").length, skip: day.stops.filter(s => marks[s.id] === "skip").length, money: spent(day.date), L, segs, all: [...L.pts.map(p => p.p), ...segs.flat()].filter(city), city };
}
function projector(all, W, H, pad) {
  const xs = all.map(p => p[0]), ys = all.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), k = Math.cos(50.08 * R2);
  const sc = Math.min((W - pad * 2) / ((x1 - x0) * k || 1e-4), (H - pad * 2) / ((y1 - y0) || 1e-4));
  return p => [W / 2 + (p[0] - (x0 + x1) / 2) * k * sc, H / 2 - (p[1] - (y0 + y1) / 2) * sc];
}
function openSummary(di) {
  const S = summaryData(di), dd = dayDate(S.day.date), c = DAYC[di]; let svg = "";
  if (S.all.length > 1) {
    const W = 320, H = 210, pr = projector(S.all, W, H, 22), path = a => a.filter(S.city).map((p, i) => { const q = pr(p); return (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1); }).join("");
    svg = `<svg class="minimap" viewBox="0 0 ${W} ${H}" role="img" aria-label="מפת היום">${S.L.legs.map(l => `<path d="${path(l.coords)}" fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round" opacity=".45"/>`).join("")}${S.segs.map(s => `<path d="${path(s)}" fill="none" stroke="${BLUE}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`).join("")}${S.L.pts.filter(p => S.city(p.p)).map(p => { const q = pr(p.p); return `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="5" fill="${marks[p.s.id] === "done" ? "#2a9558" : c}" stroke="#fff" stroke-width="2"/>`; }).join("")}</svg>`;
  }
  openModal(`<p class="kick">סיכום · ${dd.dow} ${dd.dm}</p><h2>${bd(S.day.title)}</h2>
    <div class="stats"><div><b>${S.km ? S.km.toFixed(1) : "—"}</b><small>ק"מ ברגל</small></div><div><b>${S.km ? S.steps.toLocaleString("en-US") : "—"}</b><small>צעדים בערך</small></div><div><b>${S.done}<i>/${S.day.stops.length}</i></b><small>תחנות</small></div></div>
    ${svg}<p class="sub">${S.km ? "הכחול זה מה שהלכת באמת, והקו הבהיר זאת התוכנית." : "אין עדיין מסלול מוקלט ליום הזה. הוא נרשם כשה-GPS פעיל והאפליקציה פתוחה."}${S.skip ? ` דילגת על ${S.skip}, וזה בסדר גמור.` : ""}${S.money ? ` הוצאת ${kc(S.money)}.` : ""}</p>
    <div class="row"><button class="btn pri wide" id="sumImg">📸 לשמור כתמונה</button><button class="btn" data-act="close">סגור</button></div>`);
  $("#sumImg").onclick = () => summaryImage(di); if (typeof rollStats === "function") rollStats(); // ספירה מתגלגלת
}
async function summaryImage(di) {
  const S = summaryData(di), dd = dayDate(S.day.date), W = 1080, H = 1350, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const x = cv.getContext("2d"), c = DAYC[di];
  try { await document.fonts.load("700 80px Rubik"); } catch (e) {}
  x.fillStyle = "#14161b"; x.fillRect(0, 0, W, H); x.fillStyle = c; x.fillRect(0, 0, W, 14);
  x.direction = "rtl"; x.textAlign = "right"; x.fillStyle = "#9da1ad"; x.font = "500 38px Rubik"; x.fillText(`פראג · יום ${di + 1} · ${dd.dow} ${dd.dm}`, W - 70, 110);
  x.fillStyle = "#fff"; x.font = "700 76px Rubik"; x.fillText(S.day.title, W - 70, 200);
  x.fillStyle = "#1e2129"; x.beginPath(); x.roundRect(60, 250, W - 120, 700, 40); x.fill();
  if (S.all.length > 1) {
    const pr0 = projector(S.all, W - 120, 700, 70), pr = p => { const q = pr0(p); return [q[0] + 60, q[1] + 250]; }, line = (a, col, w, al) => { const b = a.filter(S.city); if (b.length < 2) return; x.beginPath(); b.forEach((p, i) => { const q = pr(p); i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]); }); x.strokeStyle = col; x.globalAlpha = al; x.lineWidth = w; x.lineCap = x.lineJoin = "round"; x.stroke(); x.globalAlpha = 1; };
    S.L.legs.forEach(l => line(l.coords, c, 7, 0.45)); S.segs.forEach(s => { line(s, "#5aa7ff", 20, 0.25); line(s, BLUE, 9, 1); });
    S.L.pts.filter(p => S.city(p.p)).forEach(p => { const q = pr(p.p); x.beginPath(); x.arc(q[0], q[1], 13, 0, 7); x.fillStyle = marks[p.s.id] === "done" ? "#48b878" : c; x.fill(); x.lineWidth = 5; x.strokeStyle = "#fff"; x.stroke(); });
  }
  const st = [[S.km ? S.km.toFixed(1) : "—", 'ק"מ ברגל'], [S.km ? S.steps.toLocaleString("en-US") : "—", "צעדים בערך"], [`${S.done}/${S.day.stops.length}`, "תחנות"]];
  st.forEach((s, i) => { const cx = W - 70 - i * 330; x.textAlign = "right"; x.direction = "ltr"; x.fillStyle = "#fff"; x.font = "700 92px Rubik"; x.fillText(s[0], cx, 1090); x.direction = "rtl"; x.fillStyle = "#9da1ad"; x.font = "500 36px Rubik"; x.fillText(s[1], cx, 1150); });
  x.fillStyle = "#6b6f7b"; x.font = "400 30px Rubik"; x.textAlign = "left"; x.direction = "ltr"; x.fillText("© OpenStreetMap", 70, H - 60);
  cv.toBlob(async b => {
    const f = new File([b], `prague-day-${di + 1}.png`, { type: "image/png" });
    try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f] }); return; } } catch (e) { if (e.name === "AbortError") return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = f.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast("התמונה נשמרה ✓");
  }, "image/png");
}

/* ---------- חירום ---------- */
function openSOS_v1() {
  const ins = (me.ins || "").replace(/[^\d+]/g, "");
  openModal(`<h2>🆘 חירום</h2>
    <a class="sosb big" href="tel:112"><b>112</b><span>חירום בכל אירופה: משטרה, אמבולנס, כיבוי. מדברים אנגלית.</span></a>
    <a class="sosb" href="tel:+442033202739"><b>Booking.com</b><span dir="ltr">+44 20 3320 2739</span></a>
    ${ins ? `<a class="sosb" href="tel:${esc(ins)}"><b>מוקד הביטוח</b><span dir="ltr">${esc(me.ins)}</span></a>` : `<button class="sosb" id="sosIns"><b>מוקד הביטוח</b><span>עוד לא הוספת מספר. לוחצים כאן ומוסיפים ב"הפרטים שלי".</span></button>`}
    ${me.pol ? `<p class="sub">מספר פוליסה: <b dir="ltr">${esc(me.pol)}</b></p>` : ""}
    <div class="row wrap"><a class="btn" href="${navUrl(place("hotel"))}" target="_blank" rel="noopener">🏠 הביתה ברגל</a><button class="btn" data-act="bolt">🚕 Bolt</button><button class="btn" id="sosMe">הפרטים שלי</button></div>`);
  const i = $("#sosIns"); if (i) i.onclick = openMe; $("#sosMe").onclick = openMe;
}

/* ---------- הפרטים שלי (רק במכשיר) ---------- */
function openMe_v1() {
  const f = (k, label, ph, type = "text") => `<label class="fld">${label}<input data-me="${k}" type="${type}" value="${esc(me[k] || "")}" placeholder="${ph}" dir="auto" autocomplete="off"></label>`;
  openModal(`<h2>🔒 הפרטים שלי</h2><p class="sub">נשמר רק בטלפון הזה. לא נשלח לשום מקום ולא נמצא בקוד של האתר.</p>
    <div class="card soft"><b>🏨 מיקום המלון</b><p class="sub" id="hotSt">${me.hotel ? "מוגדר: " + esc(me.hotel.q || "נקודה על המפה") : "כרגע מסומן אזור כללי. כדי שהמסלולים יהיו מדויקים, קובעים את המקום המדויק."}</p>
      <form id="hotF" class="row"><input id="hotQ" placeholder="כתובת המלון" dir="auto" value="${esc((me.hotel && me.hotel.q) || "")}"><button class="btn">חפש</button></form>
      <div class="row wrap" style="margin-top:8px"><button class="btn" id="hotHere">📍 אני במלון עכשיו</button><button class="btn" id="hotPick">לבחור על המפה</button></div></div>
    ${f("code", "קוד כניסה למלון", "הקוד לדלת / לארון המפתחות")}${f("ins", "טלפון מוקד הביטוח", "+972…", "tel")}${f("pol", "מספר פוליסה", "")}
    <label class="fld">מספרי הזמנה והערות<textarea data-me="notes" rows="4" dir="auto" placeholder="טיסה, מלון, כרטיסים…">${esc(me.notes || "")}</textarea></label>
    <button class="btn pri wide" data-act="close">שמור וסגור</button>`, "tall");
  $$("#mbody [data-me]").forEach(i => i.oninput = () => { me[i.dataset.me] = i.value; LS.set("me", me); });
  const setHot = (h, msg) => { me.hotel = h; LS.set("me", me); const s = $("#hotSt"); if (s) s.textContent = "מוגדר: " + (h.q || "נקודה על המפה"); renderAll(); toast(msg || "מיקום המלון נשמר ✓"); };
  $("#hotF").onsubmit = async e => {
    e.preventDefault(); const q = $("#hotQ").value.trim(); if (!q) return;
    try { const j = await fetchJson("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&viewbox=14.22,50.18,14.71,49.94&bounded=1&q=" + encodeURIComponent(q), 9000); if (!j.length) return toast("לא מצאתי את הכתובת"); setHot({ lat: +(+j[0].lat).toFixed(5), lng: +(+j[0].lon).toFixed(5), q }); }
    catch (err) { toast("אין חיבור לחיפוש כרגע. אפשר לבחור על המפה"); }
  };
  $("#hotHere").onclick = () => gps ? setHot({ lat: +gps.lat.toFixed(5), lng: +gps.lng.toFixed(5), q: $("#hotQ").value.trim() }) : toast("צריך קודם להפעיל מיקום (החץ על המפה)");
  $("#hotPick").onclick = () => { const q = $("#hotQ").value.trim(); closeModal(); if (!isDesktop()) setSheet("low"); toast("נוגעים במפה על המלון", 4000); pickCb = ll => setHot({ lat: +ll.lat.toFixed(5), lng: +ll.lng.toFixed(5), q }); };
}

/* ---------- "עוד" + הגדרות ---------- */
function openMore() {
  const items = [["have", "✅", "מה יש אצלי"], ["bk", "☁️", "גיבוי ושחזור"], ...(typeof window.openCineMenu === "function" ? [["cine", "🎬", "פתיחים ותקצירים"]] : []), ...(tripNow().phase !== "during" ? [["prep", "✅", "לפני הטיסה"]] : []), ["moment", "📸", "רגע חדש"], ["tix", "🎟️", "הכרטיסים שלי"], ["arr", "🏨", "מגיעים למלון"], ["upd", "🔔", "עדכונים"], ["wa", "💬", "ווטסאפ"], ["cal", "📅", "תזכורות ליומן"], ["tips", "💡", "כדאי לדעת"], ["diary", "📔", "יומן הטיול"], ["test", "🧪", "בדיקת חירום"], ["lg", "🗺️", "מקרא המפה"], ["phr", "🗣️", "משפטים"], ["free", "🧭", "יום חופשי"], ["today", "☀️", "היום שלי"], ["wx", "🌡️", "מזג אוויר"], ["pack", "🎒", "מה לקחת"], ["exp", "💰", "הוצאות"], ["sum", "📊", "סיכום היום"], ["off", "📥", "בלי אינטרנט"], ["me", "🔒", "הפרטים שלי"], ["sos", "🆘", "חירום"], ...(CONFIG.server ? [["chat", "💬", "חיבור Claude"]] : []), ["set", "⚙️", "הגדרות"], ["inst", "📲", "מסך הבית"], ["add", "➕", "להוסיף תחנה"]];
  openModal(`<h2>תפריט</h2><div class="menu-top"><button class="big" data-m="moment"><span>📸</span>רגע חדש ליומן</button><button data-m="diary"><span>📔</span>יומן הטיול</button><button data-m="tix"><span>🎟️</span>הכרטיסים שלי</button><button data-m="me"><span>🔒</span>הפרטים שלי</button><button data-m="sos"><span>🆘</span>חירום</button><button class="mv" data-m="move"><span>📲</span><div>העברה בין דפדפנים<small>מ-Chrome או Safari לאייקון במסך הבית, ולהפך</small></div></button></div><h3>עוד</h3><div class="menu">${items.map(i => `<button data-m="${i[0]}"><span>${i[1]}</span>${i[2]}</button>`).join("")}</div>`);
  const fn = { have: () => window.openHave ? openHave() : toast("הבדיקה לא נטענה. לרענן"), bk: () => window.openBackup ? openBackup() : toast("הגיבוי לא נטען. לרענן"), cine: () => window.openCineMenu && window.openCineMenu(), move: () => openMove(), prep: openPrep, moment: newMoment, tix: () => openTickets(), arr: () => openArrive(), diary: openDiary, test: () => openSOS(true), lg: () => { closeModal(); showLegend(true); }, upd: openUpdates, wa: openWa, cal: openCalendar, tips: openTips, phr: openPhrases, free: openFree, today: () => openToday(curDay), wx: openWeather, pack: openPack, exp: openExp, sum: () => openSummary(curDay), off: openOffline, me: openMe, sos: openSOS, set: openSettings, chat: openChatSetup, inst: openInstall, add: () => addStopFlow() };
  $$("#mbody [data-m]").forEach(b => b.onclick = fn[b.dataset.m]);
}
function openSettings() {
  const sw = (k, label, sub) => `<label class="sw"><span><b>${label}</b><small>${sub}</small></span><input type="checkbox" data-s="${k}" ${settings[k] ? "checked" : ""}><i></i></label>`;
  openModal(`<h2>⚙️ הגדרות</h2>
    ${sw("spont", "מצב ספונטני", "בלי שעות. התחנה הבאה היא הכי קרובה אליך")}
    ${sw("eco", "חיסכון בסוללה", "מיקום כל ~12 שניות בדיוק נמוך, בלי תלת-ממד ובלי אנימציות. נדלק לבד מתחת ל-20%")}
    ${CONFIG.server ? sw("push", "התראות על אירועים חמים", "רק אירועים עם ציון 5, עד 2 ביום. מגיע גם כשהאפליקציה סגורה") : ""}
    ${sw("remind", "תזכורות", "20 דק' לפני טיסה, מסיבה או יציאה לשדה. עובד כשהאפליקציה פתוחה")}
    <label class="fld">מראה<select id="thSel"><option value="auto">אוטומטי (לפי הטלפון, וכהה אחרי השקיעה)</option><option value="light">בהיר</option><option value="dark">כהה</option></select></label>
    <div class="row wrap"><button class="btn" id="rsPlan">↩︎ התוכנית המקורית</button><button class="btn" id="rsMarks">לנקות סימוני "בוצע"</button></div>
    <p class="fine">המיקום שלך נשאר במכשיר. הוא יוצא ממנו רק כשלוחצים "נווט", פותחים שאלה ב-Claude או מחפשים "מה יש פה?".<br>מסלולים: OSRM / FOSSGIS · תמונות: Wikipedia · מזג אוויר: Open-Meteo.</p>`, "tall");
  $("#thSel").value = settings.theme; $("#thSel").onchange = e => { settings.theme = e.target.value; saveSet(); applyTheme(); };
  $$("#mbody [data-s]").forEach(c => c.onchange = async () => {
    settings[c.dataset.s] = c.checked; saveSet(); buzz(8);
    if (c.dataset.s === "eco") { restartGPS(); if (map.getLayer("b3d")) map.setLayoutProperty("b3d", "visibility", tilt() && !settings.eco ? "visible" : "none"); }
    if (c.dataset.s === "push") { if (c.checked) { const r = await enablePush(); if (!r.ok) { settings.push = false; saveSet(); c.checked = false; toast(r.msg, 4200); } else toast("התראות האירועים פעילות ✓ שולח התראת בדיקה…", 3600); } else disablePush(); }
    if (c.dataset.s === "remind" && c.checked) { const ok = "Notification" in window && (await Notification.requestPermission()) === "granted"; if (!ok) { settings.remind = false; saveSet(); c.checked = false; toast("הטלפון לא אישר התראות. באייפון צריך קודם להוסיף למסך הבית"); } else toast("תזכורות פעילות ✓"); }
    renderAll();
  });
  $("#rsPlan").onclick = () => { if (confirm("להחזיר את כל הימים לתוכנית המקורית? תחנות שהוספת יימחקו.")) resetPlan(); };
  $("#rsMarks").onclick = () => { if (confirm("לנקות את כל סימוני בוצע/דילגתי?")) { marks = {}; autoOff = {}; LS.set("marks", marks); LS.set("autoOff", autoOff); renderAll(); toast("נוקה"); } };
}
function resetPlan() { plan = freshPlan(); savePlan(); editMode = false; renderAll(); flyDay(curDay); closeModal(); toast("חזרנו לתוכנית המקורית"); }
function openInstall() {
  openModal(`<h2>📲 להוסיף למסך הבית</h2><div class="card soft"><b>אייפון (Safari)</b><p class="desc">1. פותחים את הקישור ב-Safari.<br>2. לוחצים על כפתור השיתוף (ריבוע עם חץ למעלה).<br>3. גוללים ובוחרים "הוסף למסך הבית".<br>4. לוחצים "הוסף". האייקון "פראג" מופיע במסך הבית.</p></div>
    <div class="card soft"><b>אנדרואיד (Chrome)</b><p class="desc">1. פותחים את הקישור ב-Chrome.<br>2. לוחצים על שלוש הנקודות למעלה.<br>3. בוחרים "הוספה למסך הבית" או "התקנת האפליקציה".<br>4. מאשרים.</p></div>
    <p class="sub">אחרי ההתקנה פותחים פעם אחת עם אינטרנט ונכנסים ל"עוד" ← "בלי אינטרנט", כדי שהכול יישמר במכשיר.</p>`, "tall");
}

/* ---------- Web Push: התראות על אירועים עם ציון 5 (עובד באייפון רק כשהאפליקציה במסך הבית) ---------- */
function b64uToBytes(s) { const p = "=".repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(b, c => c.charCodeAt(0)); }
async function enablePush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return { ok: false, msg: /iPhone|iPad/.test(navigator.userAgent) ? "באייפון זה עובד רק אחרי \"הוסף למסך הבית\", ופותחים מהאייקון" : "הדפדפן הזה לא תומך בהתראות" };
  if (!chatUrl() || !chatTok()) return { ok: false, msg: "קודם מחברים את Claude (\"עוד\" ← \"חיבור Claude\"), כי ההתראות יוצאות מאותו שרת" };
  if (isOffline()) return { ok: false, msg: "צריך אינטרנט כדי להפעיל התראות" };
  if ((await Notification.requestPermission()) !== "granted") return { ok: false, msg: "הטלפון לא אישר התראות. אפשר לשנות בהגדרות הטלפון" };
  try {
    const reg = await navigator.serviceWorker.ready, sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToBytes(CONFIG.vapidPublic) }));
    const base = chatUrl().replace(/\/+$/, ""), h = { "content-type": "application/json", "x-app-token": chatTok() };
    const r = await fetch(base + "/push/subscribe", { method: "POST", headers: h, body: JSON.stringify({ endpoint: sub.endpoint }) });
    if (!r.ok) return { ok: false, msg: r.status === 401 ? "הסיסמה לא תואמת לזו שבשרת" : "השרת לא שמר את ההרשמה" };
    fetch(base + "/push/test", { method: "POST", headers: h }).catch(() => {}); return { ok: true };
  } catch (e) { return { ok: false, msg: "ההרשמה להתראות נכשלה. לנסות שוב עוד רגע" }; }
}
async function disablePush() { try { const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription(); if (sub) await sub.unsubscribe(); } catch (e) {} toast("התראות האירועים כבויות"); }

/* ---------- תזכורות ---------- */
function checkReminders() {
  if (!settings.remind || !("Notification" in window) || Notification.permission !== "granted") return;
  const T = tripNow(); if (T.dayIdx < 0) return; const sent = LS.get("rem", {});
  for (const s of plan[T.dayIdx].stops) {
    const dt = pm(s) - T.min; if (!s.big || marks[s.id] || sent[s.id] || dt > 20 || dt < 0) continue;
    sent[s.id] = 1; LS.set("rem", sent); const title = `בעוד ${Math.round(dt)} דק': ${s.n}`, o = { body: s.w || "כדאי להתחיל לזוז", icon: "icons/icon-192.png", tag: s.id };
    if (navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then(r => r.showNotification(title, o)).catch(() => { try { new Notification(title, o); } catch (e) {} });
    else try { new Notification(title, o); } catch (e) {}
  }
}

/* ---------- הורדה לשימוש בלי אינטרנט ----------
   אריחים וקטוריים של כל מרכז פראג (העיר העתיקה, מאלה סטראנה, הטירה, וינוהרדי, ז'יז'קוב, סמיחוב). אריח וקטורי בזום 14
   מכסה גם את הזומים 15–18, אז ההורדה קטנה. בנוסף: גופנים, אייקונים ותמונות המקומות. */
const OFFL_V = 3;
async function prefetchMap(force, onProg) {
  if (isOffline() || !navigator.serviceWorker || !navigator.serviceWorker.controller) return 0;
  const prev = LS.get("offl", null); if (!force && prev && prev.v === OFFL_V && Date.now() - prev.t < 6 * 864e5) return prev.n;
  try {
    const B = "https://tiles.openfreemap.org", urls = new Set(), tj = await fetchJson(B + "/planet", 9000), tpl = tj.tiles[0];
    const tx = (lng, z) => Math.floor((lng + 180) / 360 * 2 ** z), ty = (lat, z) => Math.floor((1 - Math.log(Math.tan(lat * R2) + 1 / Math.cos(lat * R2)) / Math.PI) / 2 * 2 ** z);
    const box = (w, s, e, n, z0, z1) => { for (let z = z0; z <= z1; z++) for (let x = tx(w, z); x <= tx(e, z); x++) for (let y = ty(n, z); y <= ty(s, z); y++) urls.add(tpl.replace("{z}", z).replace("{x}", x).replace("{y}", y)); };
    box(14.365, 50.045, 14.48, 50.112, 12, 14); box(14.23, 50.03, 14.50, 50.13, 5, 12);
    const j = await fetchJson(STYLE_URL, 9000), fonts = new Set();
    JSON.stringify(j.layers, (k, v) => { if (k === "text-font" && Array.isArray(v)) { const a = v[0] === "literal" ? v[1] : v; if (a.every(x => typeof x === "string")) fonts.add(a.join(",")); } return v; });
    fonts.forEach(f => ["0-255", "256-511"].forEach(r => urls.add(j.glyphs.replace("{fontstack}", encodeURIComponent(f).replace(/%2C/g, ",")).replace("{range}", r))));
    (typeof j.sprite === "string" ? [j.sprite] : (j.sprite || []).map(s => s.url)).forEach(s => ["", "@2x"].forEach(d => [".json", ".png"].forEach(x => urls.add(s + d + x))));
    const wikis = [...Object.values(TRIP.info), ...TRIP.extras].map(x => x.wiki).filter(Boolean), total = urls.size + wikis.length;
    let n = 0, done = 0; const tick = ok => { done++; if (ok) n++; if (onProg) onProg(done, total); };
    const q = [...urls], work = async () => { while (q.length) { const u = q.pop(); try { const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 15000); const r = await fetch(u, { signal: ctl.signal }); clearTimeout(to); tick(r.ok); } catch (e) { tick(false); } } };
    await Promise.all(Array.from({ length: 6 }, work));
    for (const w of wikis) { try { const src = await wikiImg(w); if (src) await fetch(src.replace(/\/\d+px-/, "/640px-"), { mode: "no-cors" }); tick(!!src); } catch (e) { tick(false); } }
    if (n > 20) LS.set("offl", { v: OFFL_V, n, total, t: Date.now() }); return n;
  } catch (e) { return 0; }
}
function openOffline() {
  const off = LS.get("offl", null), ready = off && off.v === OFFL_V;
  openModal(`<div class="dl"><div class="dl-ic${ready ? " ok" : ""}" id="dlIc">${ready ? "✓" : "📥"}</div><h2 id="dlT">${ready ? "מוכן לטיסה" : "הורדה לשימוש בלי אינטרנט"}</h2>
    <p class="sub" id="dlS">${ready ? `המפה של מרכז פראג, המסלולים, התחנות והתמונות שמורים בטלפון (${off.n} קבצים, עודכן ${ago(off.t)}).` : "מוריד את המפה של כל מרכז פראג, מסלולי ההליכה, התחנות ותמונות המקומות. בערך 12MB, כדאי ב-Wi-Fi."}</p>
    <div class="bar big"><i id="dlBar" style="width:${ready ? 100 : 0}%"></i></div><p class="fine" id="dlN">${ready ? "GPS, מפה, נגן, הוצאות והמסלול שהלכת עובדים גם במצב טיסה." : ""}</p>
    <button class="btn pri wide" id="dlGo">${ready ? "להוריד שוב" : "להוריד עכשיו"}</button></div>`);
  $("#dlGo").onclick = async () => {
    if (isOffline()) return toast("צריך אינטרנט בשביל ההורדה");
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) return toast("רגע, האפליקציה עוד מתקינה את עצמה. לנסות שוב עוד כמה שניות");
    const b = $("#dlGo"); b.disabled = true; b.textContent = "מוריד…"; $("#dlIc").textContent = "📥"; $("#dlIc").classList.remove("ok"); $("#dlT").textContent = "מוריד…";
    const n = await prefetchMap(true, (d, t) => { const bar = $("#dlBar"); if (!bar) return; bar.style.width = (d / t * 100).toFixed(0) + "%"; $("#dlN").textContent = `${d} מתוך ${t} קבצים · בערך ${(d / t * 12).toFixed(1)}MB`; });
    if (!$("#dlGo")) return; b.disabled = false;
    if (n > 20) { $("#dlIc").textContent = "✓"; $("#dlIc").classList.add("ok"); $("#dlT").textContent = "מוכן לטיסה"; $("#dlS").textContent = "הכול שמור בטלפון. אפשר לבדוק: מצב טיסה, ואז לפתוח את האפליקציה."; b.textContent = "להוריד שוב"; buzz([20, 40, 20]); }
    else { $("#dlT").textContent = "לא הצלחתי להוריד"; $("#dlS").textContent = "כנראה שהחיבור חלש. מנסים שוב כשיש Wi-Fi טוב."; b.textContent = "לנסות שוב"; }
  };
}

/* ---------- 🔥 אירועים: קבועים (שווקים ומסיבות) + מה שהשרת מצא ---------- */
function eventsFor(date) {
  const srv = (CONFIG.server ? LS.get("events", { items: [] }).items || [] : []).filter(e => e.date === date && e.lat && e.name).map((e, i) => ({ id: "se" + i, name: String(e.name).slice(0, 80), cz: String(e.place || "").slice(0, 60), lat: +e.lat, lng: +e.lng, ic: "🔥", ty: "party", when: String(e.time || "").slice(0, 20), price: String(e.price || "").slice(0, 30), url: /^https:\/\//.test(e.url || "") ? e.url : "", sub: String(e.why || "").slice(0, 160), score: +e.score || 3, m: /^\d\d?:\d\d/.test(e.time || "") ? parseT(e.time.slice(0, 5)) : null, srv: true, q: (e.place || e.name) + ", Praha" }));
  const fixed = TRIP.events.filter(e => !e.date || e.date === date).map(e => ({ ...e, ic: e.ic || "🎄", sub: e.d || "", score: e.score || 4, m: e.t ? parseT(e.t) : null, when: e.when || "" }));
  return [...fixed, ...srv];
}
function drawEvents() { drawPoi(); const b = $("#lgEv"); if (b) b.checked = !!settings.evOn; }
function toggleEvents(on) { settings.evOn = on == null ? !settings.evOn : !!on; saveSet(); drawEvents(); buzz(8); toast(settings.evOn ? "🎄 השווקים והמסיבות שלך על המפה (נקודות כתומות)" : "שכבת האירועים כבויה"); }
function eventCard() { // "חדש היום": אירוע שהשרת מצא, עם ציון 4–5, קרוב לאזור של היום
  const T = tripNow(); if (T.dayIdx !== curDay) return ""; const pts = plan[curDay].stops.map(s => loc(s)).filter(Boolean), seen = LS.get("evSeen", {});
  const e = eventsFor(plan[curDay].date).find(e => e.srv && e.score >= 4 && !seen[e.name] && pts.some(l => hav(l, e) < 1500) && (e.m == null || e.m > T.min - 30)); if (!e) return "";
  window._evNew = e; return `<div class="evc"><button class="evc-m" data-ev="open"><b>🔥 חדש היום · ${bd(e.name)}</b><small>${esc(e.when)}${e.sub ? " · " + bd(e.sub) : ""}</small></button><button class="evc-x" data-ev="x" aria-label="לא מעניין">✕</button></div>`;
}
async function loadEvents() {
  if (isOffline() || !chatUrl()) return; const cur = LS.get("events", null); if (cur && Date.now() - cur.t < 3 * 36e5) return;
  try { const j = await fetchJson(chatUrl().replace(/\/+$/, "") + "/events", 9000); if (Array.isArray(j.items)) { LS.set("events", { t: Date.now(), updated: j.updated || "", items: j.items.slice(0, 40) }); drawEvents(); renderNext(); } } catch (e) {}
}

/* ---------- אתחול ---------- */
async function init() {
  const T0 = tripNow(); curDay = T0.dayIdx >= 0 ? T0.dayIdx : T0.phase === "after" ? plan.length - 1 : 0;
  document.documentElement.style.setProperty("--day", DAYC[curDay]); document.documentElement.dataset.theme = wantDark() ? "dark" : "light";
  initSheet(); initListEvents(); renderAll(); setSheet("low", true); renderNet(); window.__ui = true; // הממשק עלה (שומר העלייה נרגע)
  requestAnimationFrame(() => { const b = $("#boot"); if (b) { b.classList.add("out"); setTimeout(() => b.remove(), 400); } });
  let splashDone = QS.get("splash") === "0", mapReady = false; const fly = () => { if (splashDone && mapReady) { if (window.__cineLand) return; /* הפתיח הקולנועי מנהל את המצלמה */ try { QS.get("splash") === "0" ? flyDay(curDay, true) : openingFlight(); } catch (e) { ensurePrague(0); } ensurePrague(6500); } };
  if (!splashDone) showSplash(() => { splashDone = true; fly(); });
  $("#days").addEventListener("click", e => { const b = e.target.closest(".day"); if (b) { buzz(6); selectDay(+b.dataset.i); } });
  document.addEventListener("click", e => {
    const a = e.target.closest("[data-act]"); if (a) onAct(a.dataset.act, a.dataset.id);
    const up = e.target.closest("[data-up]"); if (up) { if (up.dataset.up === "open") openUpdates(); else { const s = LS.get("updSeen", {}); s[up.dataset.k] = 1; LS.set("updSeen", s); renderNext(); setSheet(sheetState); } }
    const dw = e.target.closest("[data-dw]"); if (dw) dwellAnswer(dw.dataset.dw === "add");
    const ev = e.target.closest("[data-ev]"); if (ev && window._evNew) { if (ev.dataset.ev === "open") { flyTo(window._evNew, 16); openPlace({ near: window._evNew }); } else { const s = LS.get("evSeen", {}); s[window._evNew.name] = 1; LS.set("evSeen", s); renderNext(); setSheet(sheetState); } }
  });
  $("#mback").onclick = closeModal; $("#mclose").onclick = closeModal;
  addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
  $("#nowBtn").onclick = goNow; $("#sos").onclick = () => openSOS(); $("#wx").onclick = openWeather;
  $("#fabLoc").onclick = locateTap; $("#fab3d").onclick = toggle3D; $("#fabHere").onclick = () => openNearby(); initLegend();
  $("#playBtn").onclick = playDay; $("#speedBtn").onclick = cycleSpeed;
  $("#scrub").addEventListener("input", e => { stopPlay(); playState = null; hidePlayCard(); setPlay(+e.target.value); renderPlayer(); });
  $("#spont").onchange = e => { settings.spont = e.target.checked; saveSet(); renderAll(); toast(settings.spont ? "מצב ספונטני: בלי שעות, הולכים למה שקרוב" : "חזרנו לשעות"); };
  $("#editBtn").onclick = () => { editMode = !editMode; if (editMode && !isDesktop()) setSheet("full"); renderList(); };
  $("#addBtn").onclick = () => openContinue(true); $("#enoughBtn").onclick = doEnough; sosBanner(); $("#resetBtn").onclick = () => { if (confirm("להחזיר את כל הימים לתוכנית המקורית?")) resetPlan(); };
  const Q = { what: openWhat, upd: openUpdates, wa: openWa, here: () => openNearby(), claude: openChat, cold: openCold, delay: openDelay, today: () => openToday(curDay), exp: openExp, pack: openPack, more: openMore };
  $("#quick").addEventListener("click", e => { const b = e.target.closest("[data-q]"); if (b) Q[b.dataset.q](); });
  addEventListener("online", () => { renderNet(); toast("הרשת חזרה ✓"); sosBanner(); loadWeather(); loadPid(); loadFx(); loadEvents(); flushChatQueue(); });
  addEventListener("offline", renderNet);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
  setInterval(() => { applyTheme(); renderLive(); checkReminders(); leaveReminder(); }, 20000);
  setInterval(() => { loadWeather(); loadPid(); loadFx(); refreshUpdates(); }, 5 * 60000); // הבדיקה כל 5 דק', הרענון בפועל כל חצי שעה
  initSwipe(); $("#freeBtn").onclick = openFree; refreshUpdates(); loadPid(); loadFx();
  loadWeather();
  if ("serviceWorker" in navigator && location.protocol !== "file:" && QS.get("sw") !== "0") {
    navigator.serviceWorker.register("sw.js").then(r => r.update && r.update().catch(() => {})).catch(() => {}); // בודקים גרסה חדשה בכל פתיחה (היא תיכנס בפתיחה הבאה)
    const go = () => setTimeout(async () => { const had = LS.get("offl", null), n = await prefetchMap(false); if (n > 20 && !had) toast("המפה נשמרה במכשיר. עובד גם בלי אינטרנט ✓", 3600); }, 6000);
    if (navigator.serviceWorker.controller) go(); else navigator.serviceWorker.addEventListener("controllerchange", go, { once: true });
  }
  try { await initMap(); } catch (e) { console.error(e); $("#map").innerHTML = emptyState("🗺️", "המפה לא נטענה", "הרשימה והשעות עובדות כרגיל. כדאי לרענן כשיש קליטה."); return; }
  applyTheme(); initBattery();
  window.__booted = true; // העלייה הצליחה
  const onLoad = () => { if (mapReady) return; mapReady = true; renderAll(); drawEvents(); updateFab(); fly(); if (settings.gps || QS.get("gps")) startGPS(false); loadEvents(); };
  if (map.loaded()) onLoad(); else map.once("load", onLoad);
  setTimeout(onLoad, 7000); // גם אם אריחים מתעכבים, האפליקציה ממשיכה
}
/* מתחילים כשה-CSS מוכן (הוא נטען בלי לחסום את מסך הטעינה). אם הוא מתעכב מאוד, מתחילים בכל זאת. */
/* אבחון ב"עוד": האם הפתיחים נטענו בטלפון הזה, ואם לא, למה */
function modDiag() {
  const M = window.__mods || {}, E = window.__scriptErrs || {}, one = (name, file, k) => { const st = M[k]; if (st === "ok") return `${name}: נטען ✓`; if (st) return `${name}: נכשל: ${st.replace(/^fail: /, "")}`; if (E[file]) return `${name}: נכשל: ${E[file]}`; return `${name}: לא נטען`; };
  let ver = ""; try { ver = new URL($('script[src*="extras.js"]').src).searchParams.get("v"); } catch (e) {}
  return [one("פתיחי הספירה", "intro.js", "intro"), one("פתיחי הטיול", "cine.js", "cine"), M.introErr ? "פתיח אחרון: " + M.introErr : "", `גרסה ${ver}`].filter(Boolean).join(" · ");
}
window.openMore = (old => function () { old.apply(this, arguments); try { $("#mbody").insertAdjacentHTML("beforeend", `<p class="fine diag" dir="rtl" style="margin-top:14px;user-select:text;-webkit-user-select:text">🔧 ${esc(modDiag())}</p>`); } catch (e) {} })(window.openMore);

(function startWhenStyled() {
  let started = false; const go = () => { if (started) return; started = true; init(); };
  if (window.__css) go(); else { addEventListener("prg-css", go, { once: true }); setTimeout(go, 12000); }
})();
