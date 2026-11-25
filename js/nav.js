/* nav: ניווט הליכה חי, כמו Google Maps, בתוך האפליקציה.
   "➤ התחל" → מסלול הליכה מ-OSRM של OpenStreetMap (חינם, בלי מפתח). המפה עוקבת אחריך ומסתובבת לפי הכיוון שלך,
   למעלה הפנייה הבאה בעברית, למטה זמן הגעה ומרחק. רטט לפני כל פנייה, חישוב מחדש כשסוטים, "הגעת ✓" ביעד, והמסך לא נכבה.
   בלי אינטרנט: החץ הפנימי (כיוון ומרחק) עם הודעה ברורה. המיקום נשלח לשרת הניווט רק כשלוחצים "התחל", כמו "נווט".
   מוגן: אם משהו כאן נכשל, נופלים לחץ הישן ושאר האפליקציה עובדת. */
"use strict";
(function () {
try {
const OSRM = "https://routing.openstreetmap.de/routed-foot/route/v1/foot/";
let N = null; /* { dest, route:{coords,cum,total,steps}, stepIx, buzzed:{}, off, lastReroute, follow, wake, startT } */

/* ---------- גיאומטריה ---------- */
const R = 6371000, rad = x => x * Math.PI / 180;
function xy(p, o) { return [rad(p[0] - o[0]) * Math.cos(rad(o[1])) * R, rad(p[1] - o[1]) * R]; } /* [lng,lat] → מטרים סביב o */
/* מקרין את המיקום על המסלול: כמה מטרים כבר עברתי, וכמה רחוק אני מהקו */
function snap(c, coords, cum) {
  const o = [c.lng, c.lat]; let best = { d: 1e12, along: 0, i: 0 };
  for (let i = 1; i < coords.length; i++) {
    const a = xy(coords[i - 1], o), b = xy(coords[i], o), dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
    let t = L2 ? -(a[0] * dx + a[1] * dy) / L2 : 0; t = Math.max(0, Math.min(1, t));
    const px = a[0] + t * dx, py = a[1] + t * dy, d = Math.hypot(px, py);
    if (d < best.d) best = { d, along: cum[i - 1] + t * (cum[i] - cum[i - 1]), i };
  }
  return best;
}
const bearingTo = (a, b) => { const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat)), x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng)); return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; };

/* ---------- הוראות בעברית ---------- */
const MOD = { left: "שמאלה", right: "ימינה", "slight left": "קלות שמאלה", "slight right": "קלות ימינה", "sharp left": "חדה שמאלה", "sharp right": "חדה ימינה", straight: "ישר", uturn: "אחורה (פרסה)" };
const SV = d => `<svg viewBox="0 0 48 48" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICO = { straight: SV('<path d="M24 42V8M12 20 24 8l12 12"/>'), left: SV('<path d="M30 42V22a6 6 0 0 0-6-6H8M18 6 8 16l10 10"/>'), right: SV('<path d="M18 42V22a6 6 0 0 1 6-6h16M30 6l10 10-10 10"/>'),
  "slight left": SV('<path d="M30 42V26L14 10M14 22V10h12"/>'), "slight right": SV('<path d="M18 42V26L34 10M34 22V10H22"/>'), "sharp left": SV('<path d="M32 6v22L12 42M12 28v14h14"/>'), "sharp right": SV('<path d="M16 6v22l20 14M36 28v14H22"/>'),
  uturn: SV('<path d="M32 42V18a10 10 0 0 0-20 0v14M4 24l8 8 8-8"/>'), round: SV('<circle cx="24" cy="18" r="9"/><path d="M24 27v15M33 18h9"/>'), arrive: SV('<path d="M12 42V8M12 8h22l-5 7 5 7H12"/>') };
const ARW = { left: ICO.left, right: ICO.right, "slight left": ICO["slight left"], "slight right": ICO["slight right"], "sharp left": ICO["sharp left"], "sharp right": ICO["sharp right"], straight: ICO.straight, uturn: ICO.uturn };
const ORD = ["", "הראשונה", "השנייה", "השלישית", "הרביעית", "החמישית"];
function say(st) {
  const m = st.maneuver || {}, mod = m.modifier || "straight", nm = st.name ? `<b dir="auto">${esc(st.name)}</b>` : "", to = nm ? " ל" + nm : "";
  switch (m.type) {
    case "arrive": return { a: ICO.arrive, t: "היעד לפניך" };
    case "depart": return { a: ICO.straight, t: nm ? "צא לכיוון " + nm : "צא לדרך" };
    case "roundabout": case "rotary": case "roundabout turn": return { a: ICO.round, t: `בכיכר, צא ביציאה ${ORD[m.exit] || m.exit || ""}${to}` };
    case "new name": case "continue": return mod === "straight" || !MOD[mod] ? { a: ICO.straight, t: nm ? "המשך ישר ב" + nm : "המשך ישר" } : { a: ARW[mod], t: `המשך ${MOD[mod]}${to}` };
    case "end of road": return { a: ARW[mod] || ICO.right, t: `בסוף הרחוב פנה ${MOD[mod] || ""}${to}` };
    case "fork": return { a: ARW[mod] || ICO["slight right"], t: `בפיצול, קח ${MOD[mod] || ""}${to}` };
    default: return mod === "straight" ? { a: ICO.straight, t: nm ? "המשך ישר ל" + nm : "המשך ישר" } : { a: ARW[mod] || ICO.right, t: `פנה ${MOD[mod] || ""}${to}` };
  }
}

/* ---------- מסלול ---------- */
async function route(from, to) {
  const j = await fetchJson(`${OSRM}${from.lng.toFixed(6)},${from.lat.toFixed(6)};${to.lng.toFixed(6)},${to.lat.toFixed(6)}?overview=full&geometries=geojson&steps=true`, 9000), r = j.routes && j.routes[0];
  if (!r) throw new Error("no route");
  const coords = r.geometry.coordinates, cum = [0]; for (let i = 1; i < coords.length; i++) cum.push(cum[i - 1] + hav({ lng: coords[i - 1][0], lat: coords[i - 1][1] }, { lng: coords[i][0], lat: coords[i][1] }));
  const steps = [], all = r.legs[0].steps;
  /* לכל פנייה: איפה היא על הקו (מטרים מההתחלה) */
  for (let k = 0; k < all.length; k++) { const st = all[k], loc_ = st.maneuver.location, at = snap({ lng: loc_[0], lat: loc_[1] }, coords, cum).along; steps.push({ at, ...say(st), type: st.maneuver.type }); }
  /* פניות קטנות מאוד ברצף (מעבר חצייה, פינה של 5 מ') מתמזגות כדי שלא ירטוט כל שנייה */
  const clean = steps.filter((s, i) => i === 0 || s.type === "arrive" || s.at - steps[i - 1].at > 8);
  return { coords, cum, total: cum[cum.length - 1], steps: clean };
}

/* ---------- המסך ---------- */
function ui() {
  let el = $("#navLive"); if (el) return el;
  el = document.createElement("div"); el.id = "navLive";
  el.innerHTML = `<div class="nl-top" role="status" aria-live="polite"><span class="nl-a">${ICO.straight}</span><div><b class="nl-d">…</b><p class="nl-t">מחשב מסלול</p></div></div>
    <div class="nl-then" hidden></div>
    <button class="nl-re" hidden>↺ חזרה למסלול</button>
    <div class="nl-bot"><div class="nl-eta"><b>--:--</b><small>…</small></div><a class="btn nl-pt" target="_blank" rel="noopener">🚇 במטרו/חשמלית</a><button class="btn nl-x" aria-label="סיום ניווט">✕ סיום</button></div>`;
  document.body.appendChild(el);
  el.querySelector(".nl-x").onclick = () => navStop(false);
  el.querySelector(".nl-re").onclick = () => { if (!N) return; N.follow = true; el.querySelector(".nl-re").hidden = true; cam(true); };
  return el;
}
const clock = mins => { try { return new Date(Date.now() + mins * 6e4).toLocaleTimeString("en-GB", { timeZone: TRIP.timezone || "Europe/Prague", hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; } };
function paint() {
  if (!N) return; const el = ui(), r = N.route;
  el.querySelector(".nl-pt").href = navUrl(N.dest, "transit");
  if (!r) return;
  const st = r.steps[N.stepIx] || r.steps[r.steps.length - 1], dTurn = Math.max(0, st.at - N.along), left = Math.max(0, r.total - N.along), min = left / WALK;
  el.querySelector(".nl-a").innerHTML = st.a; el.querySelector(".nl-d").textContent = st.type === "arrive" ? fmtDist(left) : "בעוד " + fmtDist(dTurn);
  el.querySelector(".nl-t").innerHTML = st.t;
  const nx = r.steps[N.stepIx + 1], th = el.querySelector(".nl-then");
  th.hidden = !(nx && nx.at - st.at < 120 && st.type !== "arrive"); if (!th.hidden) th.innerHTML = `<span class="nl-sa">${nx.a}</span> ואחר כך ${nx.t}`;
  el.querySelector(".nl-eta b").textContent = clock(min);
  el.querySelector(".nl-eta small").textContent = `${fmtDur(Math.max(1, Math.round(min)))} · ${fmtDist(left)} · ${esc(N.dest.name || "היעד")}`;
}
function drawLine() {
  try { const data = { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: N && N.route ? N.route.coords : [] } }, s = map.getSource("navline"); if (s) return s.setData(data);
    map.addSource("navline", { type: "geojson", data });
    map.addLayer({ id: "navline-case", type: "line", source: "navline", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#0d2a55", "line-width": 13, "line-opacity": 0.85 } });
    map.addLayer({ id: "navline", type: "line", source: "navline", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#3d8bfd", "line-width": 8 } });
  } catch (e) {}
}
function hdg() { if (heading != null && !isNaN(heading)) return heading; if (N && N.route && gps) { const r = N.route, i = Math.min(r.coords.length - 1, (snap(gps, r.coords, r.cum).i || 1)); return bearingTo(gps, { lng: r.coords[i][0], lat: r.coords[i][1] }); } return map.getBearing(); }
function cam(force) {
  if (!N || !N.follow || !gps || !map) return; const now = Date.now(); if (!force && now - (N.camT || 0) < 700) return; N.camT = now;
  map.easeTo({ center: [gps.lng, gps.lat], bearing: hdg(), pitch: 50, zoom: 17.3, padding: { top: Math.round(innerHeight * 0.3), bottom: Math.round(innerHeight * 0.18), left: 0, right: 0 }, duration: REDUCED ? 0 : 650 });
}

/* ---------- כל עדכון מיקום ---------- */
function tick() {
  if (!N || !gps) return; const r = N.route;
  if (hav(gps, N.dest) < Math.max(20, Math.min(gps.acc || 20, 35))) return arrived();
  if (!r) { cam(); return; }
  const s = snap(gps, r.coords, r.cum); N.along = Math.max(N.along * 0 + s.along, 0);
  while (N.stepIx < r.steps.length - 1 && r.steps[N.stepIx].at < N.along + 6) N.stepIx++;
  const st = r.steps[N.stepIx], dTurn = st.at - N.along;
  if (dTurn < 35 && !N.buzzed[N.stepIx] && st.type !== "arrive") { N.buzzed[N.stepIx] = 1; try { (window.__haptic || buzz)([30, 60, 30]); } catch (e) {} }
  if (r.total - N.along < 15) return arrived();
  /* סטייה: יותר מ-40 מ' (או מהדיוק) מהקו, פעמיים ברצף */
  const tol = Math.max(40, Math.min((gps.acc || 20) * 1.2, 90)); N.off = s.d > tol ? N.off + 1 : 0;
  if (N.off >= 2 && Date.now() - N.lastReroute > 12000) reroute();
  paint(); cam();
}
async function reroute() {
  if (!N || isOffline()) return; N.lastReroute = Date.now(); N.off = 0; const my = N;
  const el = ui(); el.querySelector(".nl-t").textContent = "מחשב מסלול מחדש…"; el.querySelector(".nl-a").innerHTML = ICO.uturn;
  try { const r = await route(gps, N.dest); if (N !== my) return; Object.assign(N, { route: r, stepIx: 0, along: 0, buzzed: {} }); drawLine(); toast("המסלול חושב מחדש", 1800); tick(); } catch (e) { paint(); }
}
function arrived() {
  const n = N && N.dest && N.dest.name; navStop(true);
  try { (window.__haptic || buzz)([25, 50, 25, 50, 40]); } catch (e) {}
  const el = document.createElement("div"); el.id = "navDone"; el.innerHTML = `<span>✓</span><b>הגעת</b><small>${esc(n || "")}</small>`; document.body.appendChild(el); setTimeout(() => el.remove(), 3500);
}

/* ---------- המסך לא נכבה ---------- */
async function wake() { try { if (N && "wakeLock" in navigator && !document.hidden) N.wake = await navigator.wakeLock.request("screen"); } catch (e) {} }
document.addEventListener("visibilitychange", () => { if (N && !document.hidden) wake(); });

/* ---------- התחלה וסיום ---------- */
async function navStart(dest) {
  if (!dest || dest.lat == null) return; dest = { lat: +dest.lat, lng: +dest.lng, name: dest.name || dest.n || "", q: dest.q || "" };
  try { if (typeof goClear === "function") goClear(); if (typeof closeModal === "function") closeModal(); } catch (e) {}
  if (isOffline()) { toast("📡 אין אינטרנט, אז אין ניתוב מלא. מנווט עם חץ: כיוון ומרחק ליעד", 4200); return startNav(dest, dest.name); }
  try { askCompass(); } catch (e) {}
  if (!gps) { try { userWantsFollow = false; startGPS(true); } catch (e) {} toast("מחפש את המיקום שלך…", 2500); const t0 = Date.now(); while (!gps && Date.now() - t0 < 9000) await new Promise(r => setTimeout(r, 300)); }
  if (!gps) { toast("אין מיקום כרגע. פותח את Google Maps במקום", 3200); return window.open(navUrl(dest, "walking"), "_blank", "noopener"); }
  if (gps.acc > 200) toast(`⚠️ המיקום לא מדויק כרגע (±${Math.round(gps.acc)} מ'). זה ישתפר בחוץ`, 3600);
  try { stopNav(); } catch (e) {}
  N = { dest, route: null, stepIx: 0, along: 0, buzzed: {}, off: 0, lastReroute: 0, follow: true, startT: Date.now() };
  try { follow = false; lowPower = false; } catch (e) {}
  document.body.classList.add("nav-on"); ui(); paint(); wake();
  try { setSheet("low"); } catch (e) {}
  map.on("dragstart", onDrag);
  try { const r = await route(gps, dest); if (!N || N.dest !== dest) return; N.route = r; drawLine(); tick(); cam(true); }
  catch (e) { const d = dest; navStop(false); toast("📡 שרת הניווט לא עונה. מנווט עם חץ: כיוון ומרחק ליעד", 4200); startNav(d, d.name); }
}
function onDrag() { if (!N) return; N.follow = false; const b = $("#navLive .nl-re"); if (b) b.hidden = false; }
function navStop(done) {
  if (!N) return; try { N.wake && N.wake.release(); } catch (e) {} N = null;
  document.body.classList.remove("nav-on"); const el = $("#navLive"); if (el) el.remove(); drawLine();
  try { map.off("dragstart", onDrag); map.easeTo({ pitch: 0, bearing: 0, duration: REDUCED ? 0 : 700 }); } catch (e) {}
}
/* כל עדכון GPS עובר כבר דרך flowOnPos (ב-map.js) — נכנסים לשם */
window.flowOnPos = (old => function () { try { if (typeof old === "function") old.apply(this, arguments); } finally { try { tick(); } catch (e) {} } })(window.flowOnPos);
Object.assign(window, { navStart, navStop, navActive: () => !!N, navSay: say });

(() => { const s = document.createElement("style"); s.textContent = `
body.nav-on #hud,body.nav-on #sheet,body.nav-on #fabs,body.nav-on #talkPill,body.nav-on #goCard,body.nav-on #navChip,body.nav-on #playCard,body.nav-on #pop,body.nav-on #toast:empty{display:none!important}
#navLive{position:fixed;inset:0;z-index:20;pointer-events:none;display:flex;flex-direction:column;justify-content:flex-start;gap:6px;padding:calc(var(--sat,0px) + 10px) 10px calc(var(--sab,0px) + 12px)}
#navLive>*{pointer-events:auto}
.nl-top{display:flex;align-items:center;gap:14px;background:#0f5c3a;color:#fff;border-radius:22px;padding:14px 16px;box-shadow:0 10px 30px rgba(0,0,0,.35)}
.nl-a{flex:none;width:58px;height:58px;display:grid;place-items:center;font-size:3rem;line-height:1}.nl-sa{font-size:1.25rem;display:inline-grid}
.nl-top div{min-width:0}.nl-d{display:block;font-size:1.65rem;font-weight:800;line-height:1.1}.nl-t{margin:3px 0 0;font-size:1.08rem;font-weight:500;line-height:1.3}
.nl-then{align-self:flex-start;display:flex;align-items:center;gap:6px;background:#0b4730;color:#fff;border-radius:14px;padding:7px 12px;font-size:.9rem;font-weight:600}
.nl-re{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(var(--sab,0px) + 104px);min-height:48px;border:0;border-radius:24px;background:var(--card);color:var(--ink);font:700 1rem Rubik,system-ui,sans-serif;padding:0 20px;box-shadow:var(--sh2)}
.nl-bot{margin-top:auto;display:flex;align-items:center;gap:8px;background:var(--card);color:var(--ink);border-radius:22px;padding:12px;box-shadow:0 -6px 26px rgba(0,0,0,.25)}
.nl-eta{flex:1;min-width:0}.nl-eta b{display:block;font-size:1.5rem;font-weight:800;color:#0f8a55;line-height:1.1}.nl-eta small{display:block;color:var(--mut);font-size:.86rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nl-bot .btn{min-height:48px;padding:0 12px;font-size:.88rem;white-space:nowrap;text-decoration:none;display:flex;align-items:center}
.nl-x{background:#d42a33!important;color:#fff!important}
#navDone{position:fixed;z-index:30;left:50%;top:40%;transform:translate(-50%,-50%);background:#0f8a55;color:#fff;border-radius:28px;padding:22px 34px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.4);animation:drop .4s var(--spring)}
#navDone span{display:block;font-size:2.6rem;font-weight:800;line-height:1}#navDone b{display:block;font-size:1.6rem}#navDone small{font-size:.95rem;opacity:.9}
@media (max-width:360px){.nl-d{font-size:1.4rem}.nl-t{font-size:.98rem}.nl-a{width:48px;height:48px;font-size:2rem}.nl-bot .btn{padding:0 9px;font-size:.8rem}}
`; document.head.appendChild(s); })();
(window.__mods = window.__mods || {}).nav = "ok";
} catch (err) { try { console.warn("nav:", err); (window.__mods = window.__mods || {}).nav = "fail: " + (err && err.message || err); } catch (e) {} }
})();
