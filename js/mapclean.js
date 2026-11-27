/* mapclean: מפה שקטה.
   • ברירת מחדל: רק התחנות של היום הנבחר, ממוספרות 1, 2, 3… לפי הסדר, עם קו דק ביניהן. צבע אחד לכל יום.
   • המלון תמיד על המפה, באייקון משלו (לא כמספר).
   • סימנים שנופלים אחד על השני: הראשון בתור (או "הבא") נשאר עם מספר, השאר נהיים נקודה קטנה עד שמתקרבים.
   • שמות רק מזום קרוב, ורק כשיש להם מקום (בלי חפיפות).
   • "📅 כל הימים": כל התחנות של כל הימים, כל יום בצבע שלו. "⭐ שמורים": המקומות השמורים והנקודות של "שווה בסביבה".
     הם בשכבה נפרדת, מוסתרים כברירת מחדל כדי שהמסלול של היום יהיה נקי. תוצאות חיפוש ("לאן?") מופיעות רק כשמחפשים.
   מוגן: אם משהו כאן נכשל, המפה הקודמת נשארת. */
"use strict";
(function () {
try {
if (typeof DAYC === "undefined" || typeof drawMarkers !== "function") return;
["#5c6470", "#d42a33", "#7a4fe0", "#0e9a86", "#1971c2"].forEach((c, i) => { if (i < DAYC.length) DAYC[i] = c; }); /* 30.11 טיסה · 1.12 · 2.12 · 3.12 · 4.12 חזרה */
try { document.documentElement.style.setProperty("--day", DAYC[curDay]); } catch (e) {}
const S = { all: false, extra: false };
let hotelMk = null;
const isHotel = s => s.at === "hotel";
const PRI = { next: 0, now: 1, "": 2, fx: 2, later: 3, past: 4, done: 5, skip: 5 };

function mkPin(lead, n, st, color, di) {
  const inf = sinfo(lead), pl = lead.at ? place(lead.at) : null, name = pl ? pl.name : lead.n.split(" – ")[0];
  const c = document.createElement("div"); c.className = "mkc stop"; c.style.zIndex = st === "next" ? 9 : st === "now" ? 8 : st === "past" || st === "done" ? 2 : 5;
  c.dataset.pri = (PRI[st] != null ? PRI[st] : 2) * 100 + n + (di || 0) * 1000;
  c.innerHTML = `<button type="button" class="pin ${st}${isFixed(lead) ? " fx" : ""}" style="${color ? "--day:" + color : ""}" aria-label="${esc(n + ". " + name)}"><span class="pin-n">${st === "done" ? "✓" : n}</span><span class="pin-l">${inf.ic} ${bd(name)}</span></button>`;
  c.firstChild.addEventListener("click", e => { e.stopPropagation(); openPlace({ stopId: lead.id }); });
  return c;
}
function drawDay(di, color, withStatus) {
  const L = withStatus ? live(di) : null, groups = new Map(); let n = 0;
  plan[di].stops.forEach(s => { const l = loc(s); if (!l || isHotel(s)) return; n++; const k = l.lat.toFixed(4) + "," + l.lng.toFixed(4); if (!groups.has(k)) groups.set(k, { l, items: [] }); groups.get(k).items.push({ s, n }); });
  for (const g of groups.values()) {
    const sts = g.items.map(x => withStatus ? stopStatus(x.s, L) : ""), gone = x => ["done", "skip", "past", "later"].includes(x);
    const lead = g.items[sts.indexOf("next")] || g.items[sts.indexOf("now")] || g.items.find((x, i) => !gone(sts[i])) || g.items[g.items.length - 1];
    const st = sts.includes("next") ? "next" : sts.includes("now") ? "now" : sts.length && sts.every(x => x === "done") ? "done" : sts.length && sts.every(gone) ? "past" : "";
    const el = mkPin(lead.s, lead.n, st, color, di);
    stopMarkers.push({ m: new maplibregl.Marker({ element: el }).setLngLat([g.l.lng, g.l.lat]).addTo(map), el });
  }
}
function drawHotel() {
  const h = place("hotel"); if (!h || h.lat == null) return;
  if (!hotelMk) { const c = document.createElement("div"); c.className = "mkc hotelmk"; c.style.zIndex = 7;
    c.innerHTML = `<button type="button" class="pin-h" aria-label="המלון"><span>🏨</span></button>`;
    c.firstChild.addEventListener("click", e => { e.stopPropagation(); openPlace({ placeKey: "hotel" }); });
    hotelMk = new maplibregl.Marker({ element: c }).setLngLat([h.lng, h.lat]).addTo(map); }
  else hotelMk.setLngLat([h.lng, h.lat]);
}
const oldDraw = window.drawMarkers;
window.drawMarkers = function () {
  try {
    if (!map) return;
    stopMarkers.forEach(x => x.m.remove()); stopMarkers = [];
    if (S.all) plan.forEach((d, i) => drawDay(i, DAYC[i], false)); else drawDay(curDay, null, true);
    drawHotel();
    $("#map").classList.toggle("few", false);
    drawPoi(); applyVis(); declutter();
  } catch (e) { try { oldDraw(); } catch (x) {} }
};
/* כל הימים: הקווים של כל הימים, כל אחד בצבע שלו */
const oldRoute = window.drawRoute;
window.drawRoute = function () {
  if (!S.all) return oldRoute.apply(this, arguments);
  try { if (!map || !map.getSource("plan")) return; const f = [];
    plan.forEach((d, i) => { const L = dayLine(i); L.legs.filter(l => l.coords.length > 1).forEach(l => f.push({ type: "Feature", properties: { real: l.real, c: DAYC[i] }, geometry: { type: "LineString", coordinates: l.coords } })); });
    map.getSource("plan").setData({ type: "FeatureCollection", features: f }); map.getSource("nextleg").setData(emptyFC); if (map.getSource("meline")) map.getSource("meline").setData(emptyFC);
  } catch (e) { return oldRoute.apply(this, arguments); }
};

/* ---------- בלי חפיפות ---------- */
let raf = 0;
function declutter() {
  if (!map || !stopMarkers.length) return; const z = map.getZoom(), taken = [], boxes = [];
  const items = stopMarkers.map(x => ({ el: x.el, p: map.project(x.m.getLngLat()), pri: +x.el.dataset.pri || 0 })).sort((a, b) => a.pri - b.pri);
  if (hotelMk) { const p = map.project(hotelMk.getLngLat()); taken.push(p); }
  const R = S.all ? 22 : 30, labelZ = S.all ? 16 : 15;
  for (const it of items) {
    const pin = it.el.firstChild, next = pin.classList.contains("next"), hit = taken.some(q => Math.abs(q.x - it.p.x) < R && Math.abs(q.y - it.p.y) < R);
    pin.classList.toggle("tuck", hit && !next); if (!hit || next) taken.push(it.p);
    if (!it.el.dataset.z) it.el.dataset.z = it.el.style.zIndex || 5; it.el.style.zIndex = hit && !next ? 1 : it.el.dataset.z; /* נקודה קטנה תמיד מתחת למספרים */
    let lb = false;
    if (!hit && (z >= labelZ || (next && z >= 13.5))) { const lab = pin.querySelector(".pin-l"), w = (lab && lab.offsetWidth) || 120, b = { x1: it.p.x - w / 2, x2: it.p.x + w / 2, y1: it.p.y + 20, y2: it.p.y + 42 };
      lb = !boxes.some(o => b.x1 < o.x2 && b.x2 > o.x1 && b.y1 < o.y2 && b.y2 > o.y1) && !taken.some(q => q !== it.p && q.x > b.x1 - 14 && q.x < b.x2 + 14 && q.y > b.y1 - 14 && q.y < b.y2 + 14); if (lb) boxes.push(b); }
    pin.classList.toggle("lb", lb);
  }
}
const dq = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; try { declutter(); } catch (e) {} }); };

/* ---------- שכבה נפרדת: שמורים + "שווה בסביבה" ---------- */
const EXTRA = ["poi-dot", "poi-label", "saved-dot", "saved-label"];
function applyVis() { try { if (!map || !map.getStyle()) return; const v = S.extra ? "visible" : "none"; EXTRA.forEach(id => { if (map.getLayer(id) && map.getLayoutProperty(id, "visibility") !== v) map.setLayoutProperty(id, "visibility", v); }); } catch (e) {} }

/* ---------- המתגים הקטנים ---------- */
function chips() {
  const hud = $("#hud"); if (!hud || $("#mapChips")) return;
  const w = document.createElement("div"); w.id = "mapChips";
  w.innerHTML = `<button type="button" class="mchip" id="mcAll" aria-pressed="false">📅 כל הימים</button><button type="button" class="mchip" id="mcExtra" aria-pressed="false">⭐ שמורים</button>`;
  hud.appendChild(w);
  $("#mcAll").onclick = () => setAll(!S.all); $("#mcExtra").onclick = () => setExtra(!S.extra);
}
function setAll(on) {
  S.all = on; const b = $("#mcAll"); if (b) { b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); }
  document.documentElement.classList.toggle("alldays", on); window.drawMarkers(); window.drawRoute();
  if (on) { try { const pts = plan.flatMap(d => d.stops.map(loc).filter(Boolean)); const bb = pts.reduce((a, p) => [[Math.min(a[0][0], p.lng), Math.min(a[0][1], p.lat)], [Math.max(a[1][0], p.lng), Math.max(a[1][1], p.lat)]], [[180, 90], [-180, -90]]);
      const inCity = pts.filter(p => hav(p, { lat: 50.0875, lng: 14.4213 }) < 6000); const cb = inCity.reduce((a, p) => [[Math.min(a[0][0], p.lng), Math.min(a[0][1], p.lat)], [Math.max(a[1][0], p.lng), Math.max(a[1][1], p.lat)]], [[180, 90], [-180, -90]]);
      map.fitBounds(inCity.length ? cb : bb, { padding: mapPad(), maxZoom: 15, pitch: 0, bearing: 0, duration: REDUCED ? 0 : 700 }); } catch (e) {} }
  else flyDay(curDay);
}
function setExtra(on) { S.extra = on; const b = $("#mcExtra"); if (b) { b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); } applyVis(); if (on) toast("⭐ שמורים ו\"שווה בסביבה\" על המפה", 1800); }
/* בחירת יום מחזירה למסלול של אותו יום */
if (typeof window.selectDay === "function") window.selectDay = (old => function () { if (S.all) { S.all = false; const b = $("#mcAll"); if (b) { b.classList.remove("on"); b.setAttribute("aria-pressed", false); } document.documentElement.classList.remove("alldays"); } return old.apply(this, arguments); })(window.selectDay);

const hook = () => { if (!map || !map.on) return setTimeout(hook, 400);
  map.on("zoom", dq); map.on("moveend", dq); map.on("rotate", dq); map.on("pitch", dq);
  map.on("styledata", applyVis); map.on("style.load", () => setTimeout(() => { applyVis(); declutter(); }, 60));
  chips(); window.drawMarkers(); };
hook();
window.__mapClean = { S, setAll, setExtra, declutter };
(window.__mods = window.__mods || {}).mapclean = "ok";
} catch (err) { try { (window.__mods = window.__mods || {}).mapclean = "fail: " + (err && err.message || err); } catch (e) {} }
})();
