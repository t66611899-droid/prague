/* core: אחסון, שעון פראג, גאומטריה, מצב התוכנית */
"use strict";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const QS = new URLSearchParams(location.search);
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

const LS = {
  get(k, d) { try { const v = localStorage.getItem("prg." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("prg." + k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem("prg." + k); } catch (e) {} }
};

/* ---------- שעון פראג ----------
   wall() מחזיר Date שהשדות ה-UTC שלו הם השעה על הקיר בפראג, גם כשהטלפון על שעון אחר.
   ‎?now=2026-12-01T12:30 מדמה שעה (לבדיקות). */
const _fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TRIP.timezone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
let _fakeOff = null;
(() => {
  const m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/.exec(QS.get("now") || "");
  if (m) _fakeOff = Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5]) - Date.now();
})();
function wall() {
  if (_fakeOff != null) return new Date(Date.now() + _fakeOff);
  const p = {}; for (const x of _fmt.formatToParts(new Date())) p[x.type] = +x.value;
  return new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second));
}
const dstr = d => d.toISOString().slice(0, 10);
const HEDAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const parseT = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const fmtT = m => { m = Math.round(m); const h = Math.floor(m / 60) % 24, mm = ((m % 60) + 60) % 60; return String((h + 24) % 24).padStart(2, "0") + ":" + String(mm).padStart(2, "0"); };
const fmtDur = m => { m = Math.max(0, Math.round(m)); return m < 60 ? m + " דק'" : Math.floor(m / 60) + ":" + String(m % 60).padStart(2, "0") + " שע'"; };
const fmtDist = m => m < 950 ? Math.round(m / 10) * 10 + " מ'" : (m / 1000).toFixed(1) + " ק\"מ";
const dayDate = iso => { const d = new Date(iso + "T00:00:00Z"); return { dow: HEDAYS[d.getUTCDay()], dm: d.getUTCDate() + "." + (d.getUTCMonth() + 1) }; };

/* עד 05:00 זה עדיין "אותו לילה" של היום הקודם */
function tripNow() {
  const w = wall(); let d = new Date(w); let min = w.getUTCHours() * 60 + w.getUTCMinutes() + w.getUTCSeconds() / 60;
  if (w.getUTCHours() < 5) { d = new Date(w.getTime() - 864e5); min += 1440; }
  const date = dstr(d), dayIdx = plan.findIndex(x => x.date === date);
  const phase = date < plan[0].date ? "before" : date > plan[plan.length - 1].date ? "after" : "during";
  const h = w.getUTCHours();
  return { w, date, min, dayIdx, phase, hour: h, night: h >= 22 || h < 5, evening: h >= 17 || h < 7 };
}

/* ---------- גאומטריה ---------- */
const R2 = Math.PI / 180;
function hav(a, b) { // מטרים, a/b = {lat,lng}
  const h = Math.sin((b.lat - a.lat) * R2 / 2) ** 2 + Math.cos(a.lat * R2) * Math.cos(b.lat * R2) * Math.sin((b.lng - a.lng) * R2 / 2) ** 2;
  return 12742000 * Math.asin(Math.sqrt(h));
}
const WALK = 75; // מטר לדקה = 4.5 קמ"ש
const walkEst = m => Math.max(1, Math.round(m * 1.3 / WALK)); // קו אווירי → הערכת הליכה
function decodePoly(str) { // polyline precision 5 → [[lng,lat],...]
  let i = 0, lat = 0, lng = 0; const out = [];
  while (i < str.length) {
    for (const k of [0, 1]) {
      let r = 0, s = 0, b;
      do { b = str.charCodeAt(i++) - 63; r |= (b & 31) << s; s += 5; } while (b >= 32);
      const d = r & 1 ? ~(r >> 1) : r >> 1;
      if (k === 0) lat += d; else lng += d;
    }
    out.push([lng / 1e5, lat / 1e5]);
  }
  return out;
}
function circlePoly(c, r) { // פוליגון עיגול ברדיוס r מטר
  const pts = [], dLat = r / 111320, dLng = r / (111320 * Math.cos(c.lat * R2));
  for (let i = 0; i <= 40; i++) { const a = i / 40 * 2 * Math.PI; pts.push([c.lng + dLng * Math.cos(a), c.lat + dLat * Math.sin(a)]); }
  return pts;
}

/* ---------- מצב ---------- */
const PLAN_V = 3;
function freshPlan() {
  return TRIP.days.map((d, i) => ({ date: d.date, title: d.title, stops: d.stops.map((s, j) => ({ id: `d${i}s${j}`, m: parseT(s.t), n: s.n, at: s.at, w: s.w || "", big: !!s.big, il: !!s.il, ...(s.ic ? { ic: s.ic } : {}), ...(s.ty ? { ty: s.ty } : {}) })) }));
}
let plan = (LS.get("planV") === PLAN_V && LS.get("plan")) || freshPlan();
let marks = LS.get("marks", {});     // id → "done" | "skip"
let autoOff = LS.get("autoOff", {}); // תחנות שביטלתי ידנית — לא לסמן שוב אוטומטית
let me = LS.get("me", {});           // "הפרטים שלי" — רק במכשיר
let settings = Object.assign({ spont: false, eco: false, theme: "auto", remind: false, is3d: true, gps: false, evOn: false }, LS.get("set", {}));
const savePlan = () => { LS.set("plan", plan); LS.set("planV", PLAN_V); };
const saveSet = () => LS.set("set", settings);
const planEdited = () => JSON.stringify(plan) !== JSON.stringify(freshPlan());
function setMark(id, v) { if (v) marks[id] = v; else delete marks[id]; LS.set("marks", marks); }

function place(key) {
  const p = TRIP.places[key]; if (!p) return null;
  if (key === "hotel" && me.hotel && me.hotel.lat) return { ...p, ...me.hotel, name: "המלון" };
  return p;
}
function loc(s) { // מיקום של תחנה, או null (למשל טיסה)
  if (s.at) { const p = place(s.at); return p ? { lat: p.lat, lng: p.lng, q: p.q, name: p.name } : null; }
  if (s.lat != null) return { lat: s.lat, lng: s.lng, q: s.q || "", name: s.n };
  return null;
}
const sinfo = s => (s.at && TRIP.info[s.at]) || { ic: s.ic || (s.big ? "⭐" : "📍"), ty: s.ty || "sight", d: s.d || "" };
const pm = s => s.m - (s.il ? 60 : 0); // דקות לפי שעון פראג
const sortDay = d => d.stops.sort((a, b) => pm(a) - pm(b));
const findStop = id => { for (const d of plan) for (const s of d.stops) if (s.id === id) return s; return null; };
const dayOf = id => plan.findIndex(d => d.stops.some(s => s.id === id));

function navUrl(l, mode = "walking") {
  const dest = l.q ? l.q : l.lat.toFixed(5) + "," + l.lng.toFixed(5);
  return "https://www.google.com/maps/dir/?api=1&travelmode=" + mode + "&destination=" + encodeURIComponent(dest);
}

/* ---------- מסלולי הליכה ---------- */
let routeCache = LS.get("routes", {});
const _pending = {};
const rkey = (a, b) => a.lat.toFixed(5) + "," + a.lng.toFixed(5) + ";" + b.lat.toFixed(5) + "," + b.lng.toFixed(5);
const isAirport = p => hav(p, TRIP.places.airport) < 1500;
function getRoute(a, b) { // {coords,dist,dur(min),real}
  const k = rkey(a, b), r = ROUTES[k] || routeCache[k];
  if (r) return { coords: decodePoly(r.g), dist: r.d, dur: r.d / WALK, real: true };
  const dist = hav(a, b);
  if (dist > 30 && !isAirport(a) && !isAirport(b) && !_pending[k] && navigator.onLine !== false) {
    _pending[k] = 1;
    fetch(`https://routing.openstreetmap.de/routed-foot/route/v1/foot/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=polyline`)
      .then(r => r.json()).then(j => {
        const R = j.routes && j.routes[0]; if (!R) return;
        routeCache[k] = { g: R.geometry, d: Math.round(R.distance) }; LS.set("routes", routeCache);
        if (typeof onRoutesChanged === "function") onRoutesChanged();
      }).catch(() => {}); // אם השירות לא זמין נשארים עם קו ישר
  }
  return { coords: [[a.lng, a.lat], [b.lng, b.lat]], dist: dist * 1.3, dur: isAirport(a) || isAirport(b) ? 30 : dist * 1.3 / WALK, real: false };
}
/* קו היום: נקודות (תחנות עם מיקום) + מקטעים ביניהן */
function dayLine(di) {
  const pts = plan[di].stops.map(s => ({ s, l: loc(s) })).filter(x => x.l).map(x => ({ s: x.s, l: x.l, p: [x.l.lng, x.l.lat], m: pm(x.s) }));
  const legs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const r = getRoute(pts[i].l, pts[i + 1].l); let cum = [0];
    for (let j = 1; j < r.coords.length; j++) cum.push(cum[j - 1] + hav({ lng: r.coords[j - 1][0], lat: r.coords[j - 1][1] }, { lng: r.coords[j][0], lat: r.coords[j][1] }));
    legs.push({ ...r, cum });
  }
  return { pts, legs };
}
function along(leg, f) {
  const tot = leg.cum[leg.cum.length - 1]; if (!tot) return leg.coords[0];
  const d = f * tot; let j = 1; while (j < leg.cum.length - 1 && leg.cum[j] < d) j++;
  const a = leg.coords[j - 1], b = leg.coords[j], seg = leg.cum[j] - leg.cum[j - 1] || 1, t = Math.min(1, Math.max(0, (d - leg.cum[j - 1]) / seg));
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}
/* איפה אני אמור להיות בשעה t (דקות פראג) */
function posAt(di, t) {
  const L = dayLine(di); if (!L.pts.length) return null;
  if (t <= L.pts[0].m) return L.pts[0].p;
  for (let i = 0; i < L.pts.length - 1; i++) {
    const a = L.pts[i], b = L.pts[i + 1];
    if (t < b.m) { const leg = L.legs[i], dur = Math.min(leg.dur, b.m - a.m), dep = b.m - dur; return (t <= dep || dur <= 0) ? a.p : along(leg, (t - dep) / dur); }
  }
  return L.pts[L.pts.length - 1].p;
}

/* ---------- מצב חי: איפה אני בתוכנית ---------- */
let gps = null; // {lat,lng,acc,t}
function live(di) {
  const T = tripNow(), st = plan[di].stops, today = T.dayIdx === di, past = plan[di].date < T.date;
  const open = st.filter(s => !marks[s.id]);
  if (!today) return { today, past, now: null, cur: null, next: past ? null : open[0] || null, late: 0 };
  const now = T.min; let cur = null, next = null, late = 0, lastDone = -1;
  st.forEach((s, i) => { if (marks[s.id] === "done") lastDone = i; });
  if (settings.spont) {
    // ספונטני: קודם כול דברים קבועים שמתקרבים (טיסה, מסיבה), אחרת הכי קרוב אליי מתוך מה שנשאר
    const fixed = open.find(s => s.big && pm(s) - now < 75 && pm(s) - now > -90);
    const free = open.filter(s => !s.big && loc(s));
    if (fixed) next = fixed;
    else if (gps && free.length) next = free.reduce((b, s) => hav(gps, loc(s)) < hav(gps, loc(b)) ? s : b);
    else next = free[0] || open.find(s => pm(s) >= now - 90) || null;
    cur = lastDone >= 0 ? st[lastDone] : null;
  } else if (lastDone < 0) {
    next = st.find(s => !marks[s.id] && pm(s) > now) || null;
    cur = [...st].reverse().find(s => pm(s) <= now && marks[s.id] !== "skip") || null;
  } else {
    cur = st[lastDone];
    next = st.find((s, i) => i > lastDone && !marks[s.id] && pm(s) >= now - 90) || null;
    if (next && now > pm(next)) late = Math.round(now - pm(next));
  }
  return { today, past, now, cur, next, late };
}
function stopStatus(s, L) {
  if (marks[s.id] === "done") return "done";
  if (marks[s.id] === "skip") return "skip";
  if (L.next && L.next.id === s.id) return "next";
  if (L.today && L.cur && L.cur.id === s.id) return "now";
  if (L.past || (L.today && !settings.spont && pm(s) < L.now)) return "past";
  return "";
}
/* המרחק ממני לתחנה, או מהתחנה הקודמת אם אין GPS */
function walkTo(s, di) {
  const l = loc(s); if (!l) return null;
  if (gps) { const d = hav(gps, l); return { dist: d * 1.3, min: walkEst(d), from: "me" }; }
  const L = dayLine(di), i = L.pts.findIndex(p => p.s.id === s.id);
  if (i > 0 && L.legs[i - 1].dist > 30) return { dist: L.legs[i - 1].dist, min: Math.round(L.legs[i - 1].dur), from: "prev" };
  return null;
}
