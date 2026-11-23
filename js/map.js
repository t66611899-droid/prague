/* map: MapLibre וקטורי בסגנון מותאם, ציוני דרך, סימנים בלי חפיפות, GPS, המסלול שהלכתי, נגן היום */
"use strict";
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const BLUE = "#2f7de1", MUSTARD = "#e8a317";
const DAYC = ["#d42a33", "#d42a33", "#7a4fe0", "#0e9a86", "#d42a33"]; // צבע המסלול של כל יום
const TYC = { food: "#e8590c", cafe: "#a0623a", shop: "#c2255c", view: "#2a9558", party: "#7a4fe0", hotel: "#2f7de1", transit: "#5c6470", sight: "#d42a33" };
let map, curDay = 0, mapDark = null, follow = false, heading = null, isRaster = false, saver = false;
let stopMarkers = [], nearMarkers = [], meMarker = null, playMarker = null;
const isDesktop = () => innerWidth >= 900;
const dayColor = () => DAYC[curDay] || DAYC[0];

/* ---------- שמש: זריחה ושקיעה בפראג (דקות על שעון פראג) ---------- */
function sunTimes(w) {
  const n = Math.floor((Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate()) - Date.UTC(w.getUTCFullYear(), 0, 0)) / 864e5);
  const decl = -23.44 * Math.cos(2 * Math.PI / 365 * (n + 10)) * R2, B = 2 * Math.PI * (n - 81) / 364, E = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const lat = 50.0875 * R2, ha = Math.acos((Math.sin(-0.833 * R2) - Math.sin(lat) * Math.sin(decl)) / (Math.cos(lat) * Math.cos(decl))) / R2;
  const tz = n > 87 && n < 298 ? 120 : 60, noon = 720 - 4 * 14.4213 - E + tz;
  return { rise: noon - 4 * ha, set: noon + 4 * ha };
}
function sunDown() { const w = wall(), m = w.getUTCHours() * 60 + w.getUTCMinutes(), s = sunTimes(w); return m < s.rise - 15 || m > s.set + 15; }
function wantDark() {
  const t = QS.get("theme") || settings.theme;
  if (t === "dark") return true; if (t === "light") return false;
  return matchMedia("(prefers-color-scheme: dark)").matches || sunDown();
}

/* ---------- סגנון מותאם: אותו בסיס וקטורי, שתי ערכות צבע ---------- */
const PAL = {
  day: { bg: "#f3ede4", land: "#efe8dc", water: "#3d84cf", bank: "#2867ad", park: "#cde5c0", wood: "#bcdaae", bld: "#e7dfd2", bldLine: "#d8cdbd", b3d: "#ece4d8",
    major: "#ffe7a8", majorCase: "#dfae4f", mid: "#ffffff", midCase: "#d6cbba", minor: "#fffdf9", minorCase: "#e2d8c9", path: "#dccdb4", rail: "#b9b2a6",
    label: "#3a352e", labelMinor: "#6e675c", halo: "#fbf7f0", waterLabel: "#f1f7ff", routeCase: "#ffffff" },
  night: { bg: "#1b1e29", land: "#1f2331", water: "#1c4f93", bank: "#3274c9", park: "#1d3b30", wood: "#1a3329", bld: "#272c3b", bldLine: "#303648", b3d: "#343b52",
    major: "#dba55c", majorCase: "#6b5030", mid: "#8d7a5d", midCase: "#3a3427", minor: "#3d4356", minorCase: "#262b39", path: "#4b5063", rail: "#4a4f5f",
    label: "#f2eee6", labelMinor: "#bdb7aa", halo: "#141720", waterLabel: "#a9cdf8", routeCase: "#10121a" }
};
function layerPaint(l, P) {
  const id = l.id, t = l.type, sl = l["source-layer"], o = {};
  if (t === "background") o["background-color"] = P.bg;
  else if (id === "water") o["fill-color"] = P.water;
  else if (id === "water-bank") o["line-color"] = P.bank;
  else if (sl === "waterway" && t === "line") o["line-color"] = P.water;
  else if (id === "park_outline") o["line-color"] = P.wood;
  else if (t === "fill" && (id === "park" || /grass|pitch|cemetery|landuse_track/.test(id))) o["fill-color"] = P.park;
  else if (t === "fill" && /wood|wetland/.test(id)) o["fill-color"] = P.wood;
  else if (t === "fill" && (sl === "landuse" || sl === "landcover" || sl === "aeroway")) o["fill-color"] = P.land;
  else if (id === "building") { o["fill-color"] = P.bld; o["fill-outline-color"] = P.bldLine; }
  else if (id === "b3d") o["fill-extrusion-color"] = P.b3d;
  else if (sl === "aeroway" && t === "line") o["line-color"] = P.mid;
  else if (sl === "transportation" && t === "line") {
    const c = /casing/.test(id);
    o["line-color"] = /rail/.test(id) ? P.rail : /motorway|trunk_primary/.test(id) ? (c ? P.majorCase : P.major) : /secondary_tertiary/.test(id) ? (c ? P.midCase : P.mid) : /path_pedestrian/.test(id) ? (c ? P.minorCase : P.path) : (c ? P.minorCase : P.minor);
  } else if (sl === "boundary" && t === "line") o["line-color"] = P.rail;
  else if (t === "symbol" && l.layout && l.layout["text-field"]) {
    const wtr = /water/.test(id);
    o["text-color"] = wtr ? P.waterLabel : /highway-name-(minor|path)|poi/.test(id) ? P.labelMinor : P.label;
    o["text-halo-color"] = wtr ? P.water : P.halo; o["text-halo-width"] = 1.5;
  } else if (id === "plan-case") o["line-color"] = P.routeCase;
  else if (id === "road_area_pattern") o["fill-opacity"] = P === PAL.night ? 0.1 : 0.55; // בלי פסים לבנים בלילה
  return o;
}
const emptyFC = { type: "FeatureCollection", features: [] };
function myLayers(dark, vector) { // השכבות שלי: נקודות רקע, דיוק GPS, המסלול שהלכתי, המסלול המתוכנן, הקטע הבא
  const round = { "line-cap": "round", "line-join": "round" }, P = PAL[dark ? "night" : "day"];
  const kindColor = ["match", ["get", "kind"], "ev", "#ff8a2a", "lm", dark ? "#aab6e8" : "#55628f", dark ? "#8d93a6" : "#7c8394"];
  return [
    { id: "poi-dot", type: "circle", source: "poi", paint: { "circle-color": kindColor, "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 2, 13, 3.5, 15, 6, 17, 8], "circle-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0.3, 13, 0.5, 15.5, 0.85], "circle-stroke-color": P.routeCase, "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 12, 0.5, 15, 1.5], "circle-stroke-opacity": 0.7 } },
    ...(vector ? [{ id: "poi-label", type: "symbol", source: "poi", minzoom: 14.4, layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Regular"], "text-size": 11.5, "text-anchor": "top", "text-offset": [0, 0.7], "text-optional": true, "text-max-width": 8 }, paint: { "text-color": P.labelMinor, "text-halo-color": P.halo, "text-halo-width": 1.4, "text-opacity": ["interpolate", ["linear"], ["zoom"], 14.4, 0, 15.1, 1] } }] : []),
    { id: "acc", type: "fill", source: "acc", paint: { "fill-color": BLUE, "fill-opacity": 0.14 } },
    { id: "walked-glow", type: "line", source: "walked", layout: round, paint: { "line-color": "#5aa7ff", "line-width": 11, "line-blur": 6, "line-opacity": 0.4 } },
    { id: "walked", type: "line", source: "walked", layout: round, paint: { "line-color": BLUE, "line-width": 4 } },
    { id: "plan-case", type: "line", source: "plan", layout: round, paint: { "line-color": P.routeCase, "line-width": 9, "line-opacity": 0.8 } },
    { id: "plan", type: "line", source: "plan", filter: ["==", ["get", "real"], true], layout: round, paint: { "line-color": ["get", "c"], "line-width": 5, "line-opacity": 0.9 } },
    { id: "plan-far", type: "line", source: "plan", filter: ["==", ["get", "real"], false], paint: { "line-color": ["get", "c"], "line-width": 4.5, "line-opacity": 0.9, "line-dasharray": [1.6, 1.3] } },
    { id: "plan-flow", type: "line", source: "plan", filter: ["==", ["get", "real"], true], paint: { "line-color": "#ffffff", "line-width": 2, "line-opacity": 0.6, "line-dasharray": [0, 4, 3] } },
    { id: "plan-arrows", type: "symbol", source: "plan", minzoom: 12.5, layout: { "symbol-placement": "line", "symbol-spacing": 90, "icon-image": "arrow", "icon-size": 0.5, "icon-allow-overlap": true, "icon-ignore-placement": true } },
    { id: "meline", type: "line", source: "meline", layout: round, paint: { "line-color": BLUE, "line-width": 4, "line-dasharray": [0.2, 1.8] } },
    { id: "nextleg-case", type: "line", source: "nextleg", layout: round, paint: { "line-color": dark ? "#ffffff" : "#1b1c20", "line-width": 12, "line-opacity": 0.9 } },
    { id: "nextleg", type: "line", source: "nextleg", layout: round, paint: { "line-color": MUSTARD, "line-width": 7.5 } },
    { id: "nextleg-arrows", type: "symbol", source: "nextleg", layout: { "symbol-placement": "line", "symbol-spacing": 55, "icon-image": "arrow-dark", "icon-size": 0.62, "icon-allow-overlap": true, "icon-ignore-placement": true } }
  ];
}
const mySources = () => ({ poi: { type: "geojson", data: emptyFC }, plan: { type: "geojson", data: emptyFC }, nextleg: { type: "geojson", data: emptyFC }, meline: { type: "geojson", data: emptyFC }, walked: { type: "geojson", data: emptyFC }, acc: { type: "geojson", data: emptyFC } });

function buildVectorStyle(base, dark) {
  const P = PAL[dark ? "night" : "day"], st = JSON.parse(JSON.stringify(base)), out = [];
  for (const l of st.layers) {
    if (l.id === "natural_earth" || l.id === "building-3d" || /shield|one_way/.test(l.id)) continue;
    if (l.type === "symbol" && l.layout && l.layout["text-field"] && /highway-name|label_|poi|water_name|waterway/.test(l.id)) l.layout["text-field"] = ["coalesce", ["get", "name"], ["get", "name:latin"]]; // שמות כמו על השלטים
    out.push(l);
    if (l.id === "water") out.push({ id: "water-bank", type: "line", source: "openmaptiles", "source-layer": "water", paint: { "line-color": P.bank, "line-width": ["interpolate", ["linear"], ["zoom"], 11, 1.5, 16, 5], "line-blur": 3, "line-opacity": 0.55 } }); // הצללה עדינה בגדות
    if (l.id === "building") out.push({ id: "b3d", type: "fill-extrusion", source: "openmaptiles", "source-layer": "building", minzoom: 14, filter: ["!", ["has", "hide_3d"]], layout: { visibility: settings.is3d && !saver ? "visible" : "none" },
      paint: { "fill-extrusion-color": P.b3d, "fill-extrusion-height": ["coalesce", ["get", "render_height"], 9], "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0], "fill-extrusion-opacity": 0.88, "fill-extrusion-vertical-gradient": true } });
  }
  for (const l of out) { const p = layerPaint(l, P); l.paint = Object.assign(l.paint || {}, p); }
  delete st.sources.ne2_shaded;
  const mine = myLayers(dark, true), dot = mine.shift(), fs = out.findIndex(l => l.type === "symbol"); out.splice(fs < 0 ? out.length : fs, 0, dot); // הנקודות הקטנות מתחת לשמות המקומות
  st.layers = [...out, ...mine]; Object.assign(st.sources, mySources());
  st.transition = { duration: 1400, delay: 0 }; st.light = { anchor: "viewport", color: dark ? "#b9c7ff" : "#fff5e0", intensity: dark ? 0.25 : 0.45, position: [1.3, 210, 35] };
  return st;
}
function rasterStyle(dark) { // גיבוי: אריחי CARTO רגילים
  const k = dark ? "dark_all" : "rastertiles/voyager";
  return { version: 8, sources: { carto: { type: "raster", tileSize: 256, maxzoom: 19, tiles: ["a", "b", "c"].map(s => `https://${s}.basemaps.cartocdn.com/${k}/{z}/{x}/{y}@2x.png`) }, ...mySources() },
    layers: [{ id: "bg", type: "background", paint: { "background-color": PAL[dark ? "night" : "day"].bg } }, { id: "carto", type: "raster", source: "carto" }, ...myLayers(dark, false)] };
}
let baseStyle = null;
async function fetchBase() {
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 4000);
  try { const j = await (await fetch(STYLE_URL, { signal: ctl.signal })).json(); clearTimeout(to); return j; } catch (e) { clearTimeout(to); return null; }
}

function mapPad() {
  if (isDesktop()) return { top: 150, bottom: 70, left: 80, right: 80 };
  const sh = $("#sheet").getBoundingClientRect();
  return { top: 150, bottom: Math.min(innerHeight * 0.5, innerHeight - sh.top) + 36, left: 56, right: 56 };
}

/* MapLibre (800KB) לא חוסם את העלייה: נטען כאן, אחרי שהממשק כבר מוצג */
const MAPLIB_V = (() => { try { return new URL(document.currentScript.src).searchParams.get("v") || ""; } catch (e) { return ""; } })();
function loadMapLib() {
  if (window.maplibregl) return Promise.resolve();
  return window._mlP || (window._mlP = new Promise((res, rej) => {
    const q = MAPLIB_V ? "?v=" + MAPLIB_V : "", css = document.createElement("link"); css.rel = "stylesheet"; css.href = "vendor/maplibre-gl.css" + q; document.head.appendChild(css);
    const s = document.createElement("script"); s.src = "vendor/maplibre-gl.js" + q; s.onload = () => window.maplibregl ? res() : rej(new Error("maplibre missing")); s.onerror = () => { window._mlP = null; rej(new Error("maplibre load failed")); }; document.head.appendChild(s);
  }));
}
async function initMap() {
  mapDark = wantDark(); document.documentElement.dataset.theme = mapDark ? "dark" : "light";
  const libP = loadMapLib(); // במקביל לסגנון המפה
  baseStyle = QS.get("raster") === "1" ? null : await fetchBase(); isRaster = !baseStyle;
  await libP;
  map = new maplibregl.Map({
    container: "map", style: baseStyle ? buildVectorStyle(baseStyle, mapDark) : rasterStyle(mapDark), center: [14.4185, 50.0855], zoom: 12.4, pitch: 0,
    attributionControl: false, maxPitch: 70, fadeDuration: 150
  });
  setAttr(); window._mapErr = []; map.on("error", e => { if (window._mapErr.length < 20) window._mapErr.push(String((e.error && e.error.message) || e.error).slice(0, 200)); });
  // אם הסגנון הווקטורי לא נטען תוך 4 שניות, עוברים לאריחים רגילים
  // אם אריחי המפה הווקטורית נכשלים (ולא רק איטיים), עוברים לאריחים רגילים של CARTO
  let tileErr = 0; map.on("error", e => { if (isRaster || map._gotData || !e.sourceId) return; if (++tileErr >= 4) { isRaster = true; map.setStyle(rasterStyle(mapDark), { diff: false }); setAttr(); toast("עברתי למפה פשוטה, המפה המפורטת לא נטענת כרגע"); } });
  map.on("data", e => { if (e.dataType === "source" && e.sourceId === "openmaptiles" && e.tile) map._gotData = true; });
  map.on("styleimagemissing", e => { if (/^arrow/.test(e.id)) addArrow(); });
  map.on("style.load", () => { addArrow(); drawRoute(); drawWalked(); drawAcc(); drawPoi(); });
  map.on("dragstart", () => { if (follow) { follow = false; updateFab(); } });
  map.on("zoom", zoomClass); zoomClass();
  // "תוסיף משהו שראיתי": לחיצה ארוכה (או קליק ימני במחשב)
  let lp = null, lpAt = 0;
  const fire = ll => { if (Date.now() - lpAt < 900) return; lpAt = Date.now(); buzz(15); onMapLongPress(ll); };
  const clr = () => { clearTimeout(lp); lp = null; };
  map.on("touchstart", e => { clr(); if (e.originalEvent.touches.length === 1) lp = setTimeout(() => fire(e.lngLat), 650); });
  ["touchend", "touchcancel", "dragstart", "zoomstart", "rotatestart", "pitchstart"].forEach(ev => map.on(ev, clr));
  map.on("contextmenu", e => fire(e.lngLat));
  map.on("click", e => { if (pickCb) { const cb = pickCb; pickCb = null; cb(e.lngLat); return; } poiTap(e); });
  startFlow();
}
function setAttr() { const a = $("#attr"); if (a) a.innerHTML = isRaster ? '© <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' : '© <a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> · <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'; }
function addArrow() {
  for (const [id, col] of [["arrow", "#fff"], ["arrow-dark", "#1b1c20"]]) {
    if (map.hasImage(id)) continue; const c = document.createElement("canvas"); c.width = c.height = 32; const x = c.getContext("2d");
    x.strokeStyle = col; x.lineWidth = 5; x.lineCap = "round"; x.lineJoin = "round"; x.beginPath(); x.moveTo(11, 7); x.lineTo(21, 16); x.lineTo(11, 25); x.stroke();
    map.addImage(id, x.getImageData(0, 0, 32, 32));
  }
}
function zoomClass() { const z = map.getZoom(), m = $("#map"); m.classList.toggle("vfar", z < 9.3); m.classList.toggle("far", z < 13.4); m.classList.toggle("mid", z < 14.8); }
const buzz = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} };

/* מעבר יום/לילה הדרגתי: מחליפים צבעים במקום, בלי לטעון סגנון מחדש */
function applyTheme() {
  const d = wantDark(), T = tripNow();
  document.documentElement.dataset.theme = d ? "dark" : "light";
  document.documentElement.classList.toggle("night", T.night && T.phase === "during");
  const mc = $('meta[name="theme-color"]'); if (mc) mc.content = d ? "#14161b" : "#d42a33";
  if (!map || d === mapDark) return; mapDark = d;
  if (isRaster) { map.setStyle(rasterStyle(d), { diff: false }); return; }
  const P = PAL[d ? "night" : "day"];
  try { for (const l of map.getStyle().layers) { const p = layerPaint(l, P); for (const k in p) map.setPaintProperty(l.id, k, p[k]); } map.setLight({ anchor: "viewport", color: d ? "#b9c7ff" : "#fff5e0", intensity: d ? 0.25 : 0.45 }); } catch (e) {}
}

/* ---------- המסלול ---------- */
function drawRoute() {
  if (!map || !map.getSource("plan")) return;
  const L = dayLine(curDay), c = dayColor(), free = typeof freeFrom === "function" && freeFrom(curDay) === -1;
  map.getSource("plan").setData({ type: "FeatureCollection", features: free ? [] : L.legs.filter(l => l.coords.length > 1).map(l => ({ type: "Feature", properties: { real: l.real, c }, geometry: { type: "LineString", coordinates: l.coords } })) });
  // הקטע הבא: הכי בולט על המסך, עם חצים. ואם יש GPS, קו מנוקד ממני אל התחנה הבאה
  const lv = live(curDay); let nl = emptyFC, ml = emptyFC;
  if (lv.today && lv.next && !navT) {
    const i = L.pts.findIndex(p => p.s.id === lv.next.id), l = loc(lv.next);
    if (i > 0 && L.legs[i - 1].coords.length > 1 && L.legs[i - 1].real) nl = { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: L.legs[i - 1].coords } };
    if (gps && l && hav(gps, l) < 4000 && hav(gps, l) > 40) ml = { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[gps.lng, gps.lat], [l.lng, l.lat]] } };
  }
  if (!navT) map.getSource("nextleg").setData(nl); if (map.getSource("meline")) map.getSource("meline").setData(ml);
}
function onRoutesChanged() { drawRoute(); if (typeof renderAll === "function") renderAll(); }
const DASH = [[0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0], [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5]];
let _flowI = 0;
function startFlow() { // אנימציית "זרימה" איטית לאורך המסלול
  setInterval(() => {
    if (REDUCED || saver || settings.eco || document.hidden || !map || !map.getLayer("plan-flow") || map.getZoom() < 12 || map.isMoving()) return;
    _flowI = (_flowI + 1) % DASH.length; map.setPaintProperty("plan-flow", "line-dasharray", DASH[_flowI]);
  }, 130);
}

/* ---------- סימנים ----------
   רק התחנות של היום הנבחר הן סימנים ממוספרים. הם יושבים בדיוק על הנקודה שלהם ולא זזים בזום.
   כל השאר (ציוני דרך, "שווה בסביבה", שווקים) הם נקודות קטנות בתוך המפה עצמה, מתחת לשמות המקומות,
   ומקבלות שם רק בזום קרוב (ההתנגשויות וה-fade מטופלים על ידי MapLibre). */
function mkNode(o) { // סימן זמני (תוצאות חיפוש / Claude)
  const c = document.createElement("div"); c.className = "mkc " + (o.kind || "");
  c.innerHTML = `<button type="button" class="mk ${o.cls || ""}" style="--r:${o.r}px"><span class="mk-b">${o.inner}</span>${o.he ? `<span class="mk-l"><b>${bd(o.he)}</b></span>` : ""}</button>`;
  c.style.zIndex = o.z || 1; const b = c.querySelector(".mk"); b.setAttribute("aria-label", o.he || "");
  b.addEventListener("click", e => { e.stopPropagation(); o.onClick(); });
  return { m: new maplibregl.Marker({ element: c }).setLngLat([o.lng, o.lat]).addTo(map), el: c };
}
function drawMarkers() {
  if (!map) return;
  stopMarkers.forEach(x => x.m.remove()); stopMarkers = [];
  const L = live(curDay), groups = new Map();
  plan[curDay].stops.forEach((s, i) => { const l = loc(s); if (!l) return; const k = l.lat.toFixed(4) + "," + l.lng.toFixed(4); if (!groups.has(k)) groups.set(k, { l, items: [] }); groups.get(k).items.push({ s, n: i + 1 }); });
  for (const g of groups.values()) {
    const sts = g.items.map(x => stopStatus(x.s, L)), gone = x => ["done", "skip", "past", "later"].includes(x);
    const lead = g.items[sts.indexOf("next")] || g.items[sts.indexOf("now")] || g.items.find((x, i) => !gone(sts[i])) || g.items[g.items.length - 1];
    const st = sts.includes("next") ? "next" : sts.includes("now") ? "now" : sts.every(x => x === "done") ? "done" : sts.every(gone) ? "past" : "";
    const inf = sinfo(lead.s), pl = lead.s.at ? place(lead.s.at) : null, name = pl ? pl.name : lead.s.n;
    const c = document.createElement("div"); c.className = "mkc stop"; c.style.zIndex = st === "next" ? 9 : st === "now" ? 8 : st === "past" || st === "done" ? 2 : 5;
    c.innerHTML = `<button type="button" class="pin ${st}${isFixed(lead.s) ? " fx" : ""}" aria-label="${esc(lead.n + ". " + name)}"><span class="pin-n">${st === "done" ? "✓" : lead.n}</span><span class="pin-l">${inf.ic} ${bd(name)}</span></button>`;
    c.firstChild.addEventListener("click", e => { e.stopPropagation(); openPlace({ stopId: lead.s.id }); });
    stopMarkers.push({ m: new maplibregl.Marker({ element: c }).setLngLat([g.l.lng, g.l.lat]).addTo(map), el: c });
  }
  $("#map").classList.toggle("few", stopMarkers.length <= 4); // ביום עם מעט תחנות (טיסה) מראים שמות גם בזום רחוק
  drawPoi();
}
/* כל מה שלא בתוכנית של היום: נקודות קטנות ושקופות חלקית בתוך המפה */
function poiFeatures() {
  const used = new Set(plan[curDay].stops.map(s => s.at).filter(Boolean)), near = plan[curDay].stops.map(loc).filter(Boolean), f = [];
  const far = p => !near.some(l => hav(l, p) < 70), add = (p, kind, ref, name) => f.push({ type: "Feature", properties: { kind, ref, name: name || p.cz || p.name, he: p.name }, geometry: { type: "Point", coordinates: [p.lng, p.lat] } });
  for (const [k, inf] of Object.entries(TRIP.info)) if (inf.lm && !used.has(k)) add(TRIP.places[k], "lm", "p:" + k);
  for (const x of TRIP.extras) if (far(x)) add(x, x.lm ? "lm" : "x", "x:" + x.id);
  if (settings.evOn && typeof eventsFor === "function") for (const e of eventsFor(plan[curDay].date)) if (e.lat && far(e)) add(e, "ev", "e:" + e.id, e.cz || e.name);
  return f;
}
function drawPoi() { if (map && map.getSource("poi")) map.getSource("poi").setData({ type: "FeatureCollection", features: poiFeatures() }); }
function poiTap(e) { // נגיעה ליד נקודה קטנה פותחת את הכרטיס שלה
  if (!map.getLayer("poi-dot")) return false; const p = e.point, fs = map.queryRenderedFeatures([[p.x - 16, p.y - 16], [p.x + 16, p.y + 16]], { layers: ["poi-dot"] }); if (!fs.length) return false;
  const [t, id] = fs[0].properties.ref.split(":"); buzz(6);
  if (t === "p") openPlace({ placeKey: id }); else if (t === "x") openPlace({ extraId: id }); else { const ev = eventsFor(plan[curDay].date).find(x => x.id === id); if (ev) openPlace({ near: ev }); }
  return true;
}
function showNearMarkers(items) {
  nearMarkers.forEach(x => x.m.remove()); nearMarkers = [];
  items.slice(0, 30).forEach(it => nearMarkers.push(mkNode({ kind: "near", cls: "mk-near" + (it.veg ? " veg" : ""), r: 15, z: 4, inner: `<span class="mk-i">${it.ic}</span>`, he: it.name, lat: it.lat, lng: it.lng, onClick: () => openPlace({ near: it }) })));
}
const glyphSvg = g => `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="${GLYPH[g] || GLYPH.star}"/></svg>`;
const GLYPH = {
  castle: "M3 21V10l2-1V6l1-3 1 3v3l2 1v3h2V8l1-5 1 5v5h2v-3l2-1V6l1-3 1 3v3l2 1v11h-7v-4a2 2 0 0 0-4 0v4z",
  bridge: "M2 8h20v3h-1v8h-3v-4a2 2 0 0 0-4 0v4h-4v-4a2 2 0 0 0-4 0v4H3v-8H2zM5 4h2v4H5zm12 0h2v4h-2z",
  clock: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 3a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm-1 2v6l4.5 2.6 1-1.7-3.5-2V7z",
  church: "M5 21V10l2-8 2 8v3h6v-3l2-8 2 8v11h-5v-4a2 2 0 0 0-4 0v4z",
  tower: "M11 2h2v5l3 2v2h-2l1.2 10h-2.1L12.6 16h-1.2l-.5 5H8.8L10 11H8V9l3-2z",
  eiffel: "M11 2h2l.8 7H15v2h-.8L17 21h-2.6l-.9-4h-3l-.9 4H7l2.8-10H9V9h1.2z",
  head: "M12 3c4 0 7 3 7 7 0 2-.8 3.7-2 4.9V19l-4 2H9v-3H7l-.5-3H5l1.5-4C6.5 6 8 3 12 3zm-3 5v2h6V8zm0 3.5v2h6v-2z",
  dance: "M5 21V5l6-2v18zm8 0 1-17 5 2-1 15z",
  brush: "M4 20c0-3 2-4.2 4-4.2s3 1.4 3 3-2 3.4-7 1.2zm6.2-6.2 9-11 2 2-9 11z",
  star: "M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z",
  square: "M4 20h16v-2H4zm2-3h2V10H6zm5 0h2V10h-2zm5 0h2V10h-2zM3 9h18L12 3z"
};

/* ---------- מצלמה ---------- */
const tilt = () => settings.is3d && !saver;
function camOpts() { return tilt() ? { pitch: 55, bearing: -17 } : { pitch: 0, bearing: 0 }; }
function flyDay(di, instant) {
  if (!map) return;
  // רק מה שבאזור פראג: ביום הטיסה הקו מתל אביב היה מושך את המצלמה לאמצע הדרך (טורקיה)
  const near = c => Math.abs(c[0] - 14.42) < 0.9 && Math.abs(c[1] - 50.08) < 0.6;
  const L = dayLine(di); let pts = L.pts.map(p => p.p).filter(near); if (!pts.length) pts = [[14.4213, 50.0875]];
  const b = new maplibregl.LngLatBounds(pts[0], pts[0]); pts.forEach(p => b.extend(p)); L.legs.forEach(l => l.coords.filter(near).forEach(c => b.extend(c)));
  // התאמה עצמאית של הזום לגבולות היום (לא תלויה בהטיה או בסיבוב הנוכחיים של המצלמה)
  const pad = mapPad(), el = map.getContainer(), mx = l => (l + 180) / 360, my = l => (1 - Math.log(Math.tan(l * R2) + 1 / Math.cos(l * R2)) / Math.PI) / 2;
  const dx = Math.max(1e-7, mx(b.getEast()) - mx(b.getWest())), dy = Math.max(1e-7, my(b.getSouth()) - my(b.getNorth()));
  const fitZ = Math.log2(Math.min((el.clientWidth - pad.left - pad.right) / (512 * dx), (el.clientHeight - pad.top - pad.bottom) / (512 * dy)));
  const cam = pts.length > 1 ? { center: b.getCenter(), zoom: Math.max(9, Math.min(15.5, fitZ)) } : { center: pts[0], zoom: 15 };
  const o = { ...cam, padding: pad, pitch: tilt() ? 40 : 0, bearing: tilt() ? -12 : 0 }; if (tilt()) o.zoom -= 0.45; // בהטיה רואים פחות, אז מתרחקים קצת // ריווח נדיב ואז הטיה עדינה
  if (instant || REDUCED) map.jumpTo(o); else map.flyTo({ ...o, duration: 1900, curve: 1.45, essential: true });
}
function flyTo(l, zoom = 16.3) {
  if (!map) return; follow = false; updateFab();
  const o = { center: [l.lng, l.lat], zoom: Math.max(zoom, Math.min(map.getZoom(), 17)), ...camOpts(), padding: mapPad() };
  if (REDUCED) map.jumpTo(o); else map.flyTo({ ...o, duration: 1300, essential: true });
}
/* רשת ביטחון: אם המפה נשארה רחוק מפראג (אנימציה שנעצרה באמצע, שגיאה), קופצים ישר לעיר */
function ensurePrague(delay) { setTimeout(() => { try { if (!map || window.__cineActive) return; /* לא באמצע פתיח קולנועי */ const c = map.getCenter(); if (Math.abs(c.lng - 14.42) > 0.9 || Math.abs(c.lat - 50.08) > 0.6 || map.getZoom() < 8.5) { map.stop(); flyDay(curDay, true); } } catch (e) { try { map.jumpTo({ center: [14.4213, 50.0875], zoom: 12.5, pitch: 0, bearing: 0 }); } catch (e2) {} } }, delay); }
function openingFlight() { // מבט פתיחה: טיסה קצרה מעל העיר אל התחנה הבאה
  ensurePrague(4200);
  const L = live(curDay), s = (L.today && (L.next || L.cur)) || plan[curDay].stops.find(x => loc(x) && !isAirport(loc(x))), l = s && loc(s);
  if (!l || REDUCED || saver || isAirport(l)) { flyDay(curDay, REDUCED); return; }
  map.jumpTo({ center: [14.4185, 50.0855], zoom: 11.6, pitch: 0, bearing: 0 });
  map.flyTo({ center: [l.lng, l.lat], zoom: 15.6, pitch: 55, bearing: -20, duration: 2600, curve: 1.3, padding: mapPad(), essential: true });
}
function toggle3D() {
  settings.is3d = !settings.is3d; saveSet(); if (settings.is3d && saver) { saver = false; toast("מצב חיסכון בסוללה כובה"); }
  if (map.getLayer("b3d")) map.setLayoutProperty("b3d", "visibility", tilt() ? "visible" : "none");
  const o = { ...camOpts(), zoom: tilt() ? Math.max(map.getZoom(), 15.4) : map.getZoom() };
  if (REDUCED) map.jumpTo(o); else map.easeTo({ ...o, duration: 900 });
  updateFab();
}
function nearestStreet(l) { // שם הרחוב הקרוב, מתוך אריחי המפה שכבר במכשיר — בלי לשלוח מיקום לשום מקום
  try {
    const p = map.project([l.lng, l.lat]);
    const f = map.queryRenderedFeatures([[p.x - 45, p.y - 45], [p.x + 45, p.y + 45]]).find(f => f.sourceLayer === "transportation_name" && (f.properties.name || f.properties["name:latin"]));
    return f ? (f.properties.name || f.properties["name:latin"]) : null;
  } catch (e) { return null; }
}
function nearestKnown(l) {
  const all = [...Object.entries(TRIP.places).filter(([k]) => k !== "hotel").map(([k, p]) => p), ...TRIP.extras];
  return all.reduce((b, p) => hav(l, p) < hav(l, b) ? p : b);
}
const czName = p => p.cz || (p.q ? p.q.split(",")[0] : p.name);

/* ---------- GPS ---------- */
let watchId = null, lastProc = 0, lowPower = false, lastMove = { t: 0, p: null }, userWantsFollow = false;
function startGPS(userTap) {
  const f = /^(-?[\d.]+),(-?[\d.]+)$/.exec(QS.get("gps") || "");
  if (f) { settings.gps = true; onPos({ coords: { latitude: +f[1], longitude: +f[2], accuracy: 18 } }); return; }
  if (!navigator.geolocation) { toast("אין GPS בדפדפן הזה"); return; }
  if (watchId != null) return;
  const low = settings.eco || saver || lowPower;
  watchId = navigator.geolocation.watchPosition(onPos, e => {
    if (e.code === 1) { stopGPS(); settings.gps = false; saveSet(); if (userTap) toast("המיקום חסום. מאשרים בהגדרות הדפדפן ← מיקום"); }
    else if (userTap) toast("מחפש GPS… עדיף ליד חלון או בחוץ");
    updateFab();
  }, { enableHighAccuracy: !low, maximumAge: low ? 30000 : 2000, timeout: 25000 });
  settings.gps = true; saveSet(); updateFab();
}
function stopGPS() { if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; } }
function restartGPS() { stopGPS(); if (settings.gps) startGPS(false); }
// מעקב רק כשהמסך פתוח (דפדפן לא יכול לעקוב ברקע בכל מקרה)
document.addEventListener("visibilitychange", () => { if (document.hidden) stopGPS(); else if (settings.gps) startGPS(false); });

function onPos(pos) {
  const c = pos.coords, now = Date.now();
  if ((settings.eco || saver || lowPower) && now - lastProc < 12000) return; lastProc = now;
  const first = !gps;
  gps = { lat: c.latitude, lng: c.longitude, acc: c.accuracy || 30, t: now };
  if (!onPos._saved || now - onPos._saved > 20000) { onPos._saved = now; LS.set("lastPos", { lat: +gps.lat.toFixed(5), lng: +gps.lng.toFixed(5), t: now }); } // המיקום האחרון הידוע, בשביל SOS
  // עומד במקום שתי דקות → מורידים תדירות ודיוק. זז שוב → חוזרים למעקב מלא
  if (!lastMove.p || hav(gps, lastMove.p) > 25) { lastMove = { t: now, p: { lat: gps.lat, lng: gps.lng } }; if (lowPower) { lowPower = false; restartGPS(); } }
  else if (!lowPower && now - lastMove.t > 120000 && !QS.get("gps")) { lowPower = true; restartGPS(); }
  if (c.heading != null && !isNaN(c.heading) && c.speed > 0.7 && !compassOn) setHeading(c.heading);
  if (!meMarker) {
    const el = document.createElement("div"); el.className = "me"; el.innerHTML = '<span class="me-cone"></span><span class="me-dot"></span>';
    meMarker = new maplibregl.Marker({ element: el, rotationAlignment: "map", pitchAlignment: "map" }).setLngLat([gps.lng, gps.lat]).addTo(map);
    if (heading != null) setHeading(heading);
  } else meMarker.setLngLat([gps.lng, gps.lat]);
  drawAcc(); trackPoint(); autoArrive(); if (typeof flowOnPos === "function") flowOnPos();
  if (first && userWantsFollow) { follow = true; userWantsFollow = false; }
  if (follow && !playRaf) map.easeTo({ center: [gps.lng, gps.lat], zoom: Math.max(map.getZoom(), 15.5), duration: REDUCED ? 0 : 700, padding: mapPad() });
  updateFab(); if (typeof renderLive === "function") renderLive();
}
function drawAcc() {
  if (!map || !map.getSource("acc")) return;
  map.getSource("acc").setData(gps && gps.acc > 12 ? { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [circlePoly(gps, Math.min(gps.acc, 400))] } } : emptyFC);
}
function locateTap() {
  askCompass();
  if (!gps) { userWantsFollow = true; startGPS(true); toast("מחפש אותך…"); return; }
  if (follow) { follow = false; toast("המעקב כבוי. המפה חופשית"); }
  else { follow = true; map.flyTo({ center: [gps.lng, gps.lat], zoom: Math.max(map.getZoom(), 16), ...camOpts(), padding: mapPad(), duration: REDUCED ? 0 : 900 }); }
  updateFab();
}
function updateFab() {
  const b = $("#fabLoc"); if (!b) return;
  b.classList.toggle("on", follow); b.classList.toggle("has", !!gps);
  b.setAttribute("aria-label", follow ? "בטל מעקב" : "מרכז עליי");
  $("#fab3d").classList.toggle("on", tilt());
}

/* ---------- מצפן ---------- */
let compassOn = false;
function setHeading(h) { heading = h; if (!meMarker) return; meMarker.getElement().classList.add("has-h"); meMarker.setRotation(h); }
function onOrient(e) {
  let h = null;
  if (e.webkitCompassHeading != null) h = e.webkitCompassHeading; else if (e.absolute && e.alpha != null) h = 360 - e.alpha;
  if (h != null) { compassOn = true; setHeading(h); }
}
function askCompass() { // באייפון חייבים לבקש הרשאה מתוך לחיצה
  if (compassOn || askCompass.done) return; const D = window.DeviceOrientationEvent; if (!D) return;
  const on = () => { askCompass.done = true; addEventListener("deviceorientationabsolute", onOrient, true); addEventListener("deviceorientation", onOrient, true); };
  if (typeof D.requestPermission === "function") D.requestPermission().then(r => { if (r === "granted") on(); }).catch(() => {}); else on();
}

/* ---------- המסלול שבאמת הלכתי (נשמר במכשיר בין פתיחות) ---------- */
const trackKey = date => "track." + date;
function trackPoint() {
  const T = tripNow(); if (T.phase !== "during" || gps.acc > 60) return;
  const tr = LS.get(trackKey(T.date), []), last = tr[tr.length - 1];
  if (last) { const d = hav(gps, { lat: last[1], lng: last[0] }); if (d < 15) return; if (d > 2500) tr.push(null); } // קפיצה גדולה (מונית/מטרו) = קו חדש
  tr.push([+gps.lng.toFixed(5), +gps.lat.toFixed(5)]); LS.set(trackKey(T.date), tr); drawWalked();
}
function trackSegs(date) { const segs = [[]]; for (const p of LS.get(trackKey(date), [])) { if (!p) segs.push([]); else segs[segs.length - 1].push(p); } return segs.filter(s => s.length > 1); }
function trackKm(date) { let m = 0; for (const s of trackSegs(date)) for (let i = 1; i < s.length; i++) m += hav({ lng: s[i - 1][0], lat: s[i - 1][1] }, { lng: s[i][0], lat: s[i][1] }); return m / 1000; }
function drawWalked() {
  if (!map || !map.getSource("walked")) return;
  map.getSource("walked").setData({ type: "FeatureCollection", features: trackSegs(plan[curDay].date).map(s => ({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: s } })) });
}

/* ---------- הגעה אוטומטית (פחות מ-40 מ') ---------- */
function autoArrive() {
  const T = tripNow(); if (T.dayIdx < 0 || gps.acc > 80) return;
  const L = live(T.dayIdx);
  for (const s of plan[T.dayIdx].stops) {
    if (marks[s.id] || autoOff[s.id]) continue; const l = loc(s); if (!l) continue;
    const isNext = L.next && L.next.id === s.id, soon = Math.abs(pm(s) - T.min) <= 45;
    if ((isNext || soon) && hav(gps, l) - Math.min(gps.acc, 20) < 40) {
      setMark(s.id, "done"); buzz([25, 50, 25]); if (typeof showArrive === "function") showArrive(s);
      if (typeof renderAll === "function") renderAll(); if (typeof afterDone === "function") afterDone(s.id); break;
    }
  }
}

/* ---------- נגן היום: מצלמה שעוקבת אחרי נקודה לאורך המסלול ---------- */
let playRaf = null, playT = null, playSpeed = 1, playSeq = null, playState = null;
function setPlayDot(p) {
  if (!p) { if (playMarker) { playMarker.remove(); playMarker = null; } return; }
  if (!playMarker) { const el = document.createElement("div"); el.className = "pl"; playMarker = new maplibregl.Marker({ element: el }).setLngLat(p).addTo(map); } else playMarker.setLngLat(p);
}
function setPlay(t) { playT = t; const p = posAt(curDay, t); setPlayDot(p); if (p && !playRaf) map.easeTo({ center: p, duration: 250 }); }
function clearPlay() { stopPlay(); playT = null; playState = null; setPlayDot(null); hidePlayCard(); }
function stopPlay() { if (playRaf) { cancelAnimationFrame(playRaf); playRaf = null; } if (typeof renderPlayer === "function") renderPlayer(); }
function buildSeq(di) {
  const st = plan[di].stops, L = dayLine(di), seq = []; let lastI = -1, lastP = null;
  for (const s of st) {
    const i = L.pts.findIndex(p => p.s.id === s.id);
    if (i > 0 && lastI >= 0 && L.legs[i - 1].dist > 40) { const leg = L.legs[i - 1]; seq.push({ k: "move", leg, t0: Math.max(L.pts[i - 1].m, pm(s) - leg.dur), t1: pm(s), ms: Math.min(3800, Math.max(1100, leg.dist * 1.5)), far: leg.dist > 6000 }); }
    if (i >= 0) { lastI = i; lastP = L.pts[i].p; }
    seq.push({ k: "stop", s, p: lastP, t: pm(s), ms: i >= 0 ? 1000 : 700 });
  }
  return seq;
}
const angDiff = (a, b) => ((b - a + 540) % 360) - 180;
function playDay() {
  if (playRaf) { stopPlay(); return; }
  const seq = buildSeq(curDay); if (!seq.some(x => x.p)) { toast("אין מה לנגן ביום הזה"); return; }
  if (!playState || playState.i >= seq.length) playState = { i: 0, e: 0, bearing: map.getBearing() };
  playSeq = seq; follow = false; updateFab(); let last = performance.now();
  const step = now => {
    const dt = Math.min(64, now - last) * playSpeed; last = now; const S = playState, cur = seq[S.i];
    if (!cur) { playRaf = null; hidePlayCard(); renderPlayer(); flyDay(curDay); playState = null; return; }
    S.e += dt; const f = Math.min(1, S.e / cur.ms);
    if (cur.k === "stop") {
      if (!S.shown) { S.shown = true; showPlayCard(cur.s); buzz(8); if (cur.p) { setPlayDot(cur.p); if (!REDUCED) map.easeTo({ center: cur.p, zoom: isAirport({ lng: cur.p[0], lat: cur.p[1] }) ? 12 : 16, pitch: saver ? 0 : 55, bearing: S.bearing, duration: 600 / playSpeed, padding: mapPad() }); else map.jumpTo({ center: cur.p, zoom: 15.5 }); } }
      playT = cur.t;
    } else {
      const ff = REDUCED ? 1 : f, p = along(cur.leg, ff), q = along(cur.leg, Math.min(1, ff + 0.04));
      const br = Math.atan2((q[0] - p[0]) * Math.cos(p[1] * R2), q[1] - p[1]) / R2; if (ff < 0.96) S.bearing += angDiff(S.bearing, br) * 0.06; // סיבוב קל בפניות
      setPlayDot(p); playT = cur.t0 + (cur.t1 - cur.t0) * ff; hidePlayCard();
      if (!REDUCED) map.jumpTo({ center: p, zoom: cur.far ? 11.5 : 16, pitch: saver ? 0 : 55, bearing: saver ? 0 : S.bearing, padding: mapPad() });
    }
    if (f >= 1) { S.i++; S.e = 0; S.shown = false; }
    renderPlayer(); playRaf = requestAnimationFrame(step);
  };
  playRaf = requestAnimationFrame(step); renderPlayer();
}
function cycleSpeed() { playSpeed = playSpeed === 1 ? 2 : playSpeed === 2 ? 4 : 1; renderPlayer(); }

/* ---------- חיסכון בסוללה: מתחת ל-20% מכבים 3D ואנימציות ---------- */
function initBattery() {
  if (!navigator.getBattery) return;
  navigator.getBattery().then(b => {
    window._batt = b; const chk = () => { const low = b.level < 0.2 && !b.charging; if (low === saver) return; saver = low; if (map && map.getLayer("b3d")) map.setLayoutProperty("b3d", "visibility", tilt() ? "visible" : "none"); if (low) { map.easeTo({ pitch: 0, bearing: 0, duration: 400 }); restartGPS(); toast("סוללה נמוכה: כיביתי תלת-ממד ואנימציות", 3800); } updateFab(); };
    b.addEventListener("levelchange", chk); b.addEventListener("chargingchange", chk); chk();
  }).catch(() => {});
}
