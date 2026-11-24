/* go: "🔍 לאן?" — חכם ואישי: לפי איפה שאתה עכשיו, רק מה שפתוח, ולפי מה שאתה אוכל ואיך אתה משלם.
   • הכול ממוין לפי מרחק מה-GPS. אין GPS או שאתה לא בפראג: מחושב מהמלון, וזה כתוב.
   • ברירת מחדל עד 15 דק' הליכה; פחות מ-5 תוצאות: מתרחב לבד ל-25 דק'.
   • רק מקומות פתוחים עכשיו (opening_hours של OSM). "נסגר ב-22:00" כשנשארה פחות משעה; בלי שעות: בסוף, "שעות לא ידועות".
   • "אוכל בשבילי": בלי בשר (פיצה, פלאפל, צמחוני, פסטה, צ'יפס, מאפים). זול קודם, מלכודות תיירים מסומנות ⚠️.
   • כספומט: רק של בנקים; Euronet מסומן ⚠️. סופר, קפה, שירותים, בילוי (רק בערב). הקיצורים מתחלפים לפי השעה בפראג.
   • אופליין: poi.json (נאפה מראש מ-OSM, 2 ק"מ סביב המלון וכל מקום במסלול) נשמר עם האפליקציה. מחוץ לאזור הזה, עם קליטה: Overpass חי.
   פרטיות: לחיפוש בשם נשלח הטקסט ומיקום מעוגל (~100 מ') ל-OpenStreetMap, ורק כשאתה מחפש. בלי API בתשלום.
   מוגן: אם משהו כאן נכשל, שאר האפליקציה עולה כרגיל. */
"use strict";
(function () {
try {
const PRG = { lat: 50.0875, lng: 14.4213 }, BOX = "14.22,49.94,14.71,50.18", NEAR = 865, FAR = 1440; /* 15 ו-25 דק' הליכה, במטרים בקו ישר (לפי walkEst) */
const rec = () => LS.get("goRec", []), saved = () => LS.get("goSaved", []);
const same = (a, b) => a && b && Math.abs(a.lat - b.lat) < 2e-4 && Math.abs(a.lng - b.lng) < 2e-4;
const hotelP = () => { const p = TRIP.places.hotel; return me && me.hotel && me.hotel.lat ? { ...p, ...me.hotel, name: "המלון" } : p; };
const here = () => { try { if (window.__goRef) return { ...window.__goRef, me: true }; if (gps && (typeof gpsNear !== "function" || gpsNear())) return { lat: gps.lat, lng: gps.lng, me: true }; } catch (e) {} return { ...hotelP(), me: false }; };
const nrm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-֑ͯ-ׇ]/g, "").replace(/['׳’`"״.,\-–()]/g, " ").replace(/\s+/g, " ").trim();
const mins = d => walkEst(d);
const revUrl = x => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([x.name, x.st, "Praha"].filter(Boolean).join(", "));

/* ---------- השעה בפראג ושעות פתיחה ---------- */
const DAYS = ["mo", "tu", "we", "th", "fr", "sa", "su"];
function nowP() { if (window.__goNow) return window.__goNow; const p = {}; for (const x of new Intl.DateTimeFormat("en-GB", { timeZone: TRIP.timezone || "Europe/Prague", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date())) p[x.type] = x.value; return { d: DAYS.indexOf(p.weekday.toLowerCase().slice(0, 2)), m: +p.hour * 60 + +p.minute }; }
const hm = m => { m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); };
function daySet(spec) { const set = new Set(); for (const part of spec.split(",")) { const m = /^(mo|tu|we|th|fr|sa|su)(?:\s*-\s*(mo|tu|we|th|fr|sa|su))?$/.exec(part.trim()); if (!m) return null; let a = DAYS.indexOf(m[1]); const b = m[2] ? DAYS.indexOf(m[2]) : a; for (; ; a = (a + 1) % 7) { set.add(a); if (a === b) break; } } return set; }
/* מחזיר {open, closeIn, closeT, openT} או null כשאין שעות או שהכתיב מורכב מדי (ואז "שעות לא ידועות") */
function ohState(str, now) {
  if (!str) return null; const s = str.toLowerCase().replace(/"[^"]*"/g, "").replace(/(\d{2})\s*,\s*(?=(?:mo|tu|we|th|fr|sa|su)\b)/g, "$1;+").trim(); if (s === "24/7") return { open: true, all: true }; /* "Mo-Th 15:00-01:00, Fr 15:00-02:00": כלל נוסף, לא מחליף */
  const tab = [null, null, null, null, null, null, null]; let any = false;
  for (let rule of s.split(";")) { const plus = /^\s*\+/.test(rule); rule = rule.replace(/^\s*\+/, "").trim().replace(/,\s*(ph|sh)\b/g, "").replace(/\b(ph|sh)\s*,\s*/g, ""); if (!rule || /^(ph|sh)\b/.test(rule)) continue;
    const m = /^((?:mo|tu|we|th|fr|sa|su)(?:[\s,\-]*(?:mo|tu|we|th|fr|sa|su))*)?\s*:?\s*(off|closed|24\/7|(?:\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\s*,?\s*)+)$/.exec(rule); if (!m) return null;
    const days = m[1] ? daySet(m[1].replace(/\s+/g, "")) : new Set([0, 1, 2, 3, 4, 5, 6]); if (!days) return null; let list = [];
    if (m[2] === "24/7") list = [[0, 1440]]; else if (m[2] !== "off" && m[2] !== "closed") for (const r of m[2].split(",")) { const t = /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/.exec(r); if (!t) continue; const a = +t[1] * 60 + +t[2]; let b = +t[3] * 60 + +t[4]; if (b <= a) b += 1440; list.push([a, b]); }
    days.forEach(d => tab[d] = plus && tab[d] ? tab[d].concat(list) : list); any = true; }
  if (!any) return null;
  const today = tab[now.d] || [], yest = tab[(now.d + 6) % 7] || [];
  for (const [a, b] of yest) if (b > 1440 && now.m + 1440 < b) return { open: true, closeIn: b - 1440 - now.m, closeT: hm(b) };
  for (const [a, b] of today) if (now.m >= a && now.m < b) return { open: true, closeIn: b - now.m, closeT: hm(b) };
  const next = today.filter(r => r[0] > now.m).sort((x, y) => x[0] - y[0])[0]; return { open: false, openT: next ? hm(next[0]) : "" };
}

/* ---------- המקומות האפויים (אופליין) ---------- */
let POI = null, poiP = null;
const toObj = r => ({ c: r[0], name: r[1], lat: r[2], lng: r[3], oh: r[4], f: r[5] || "", b: r[6] || "", st: r[7] || "" });
function loadPoi() { if (POI) return Promise.resolve(POI); if (!poiP) { let v = ""; try { v = new URL($('script[src*="extras.js"]').src).searchParams.get("v") || ""; } catch (e) {} poiP = fetch("poi.json?v=" + v).then(r => r.json()).then(j => (POI = j.items.map(toObj))).catch(() => { poiP = null; return (POI = null) || []; }); } return poiP; }
setTimeout(() => { loadPoi(); }, 6000); /* מחמם את המטמון כדי שיהיה מוכן בלי קליטה */

/* ---------- למה המקום הזה ---------- */
const TRAP = [[50.0875, 14.4213, 115], [50.0862, 14.4135, 90], [50.0865, 14.4106, 90], [50.0868, 14.4078, 90]]; /* כיכר העיר העתיקה וגשר קארל */
const isTrap = x => x.f.includes("T") || ((x.c === "f" || x.c === "k" || x.c === "b") && TRAP.some(t => hav({ lat: t[0], lng: t[1] }, x) < t[2]));
const IC = { f: "🍽️", k: "☕", y: "🥐", a: "💵", s: "🛒", w: "🚻", b: "🍺", m: "🛍️", x: "📍" };
function judge(x, ref, now) {
  const d = hav(ref, x), os = x.c === "a" || x.c === "w" && !x.oh ? { open: true, all: true, quiet: true } : ohState(x.oh, now), why = [mins(d) + " דק' הליכה"]; let warn = "", bonus = 0, ic = IC[x.c] || "📍";
  if (os && os.open) why.push(os.all ? (os.quiet ? "" : "פתוח 24 שעות") : os.closeIn < 60 ? "נסגר ב-" + os.closeT : "פתוח עד " + os.closeT); else if (os) why.push(os.openT ? "סגור, נפתח ב-" + os.openT : "סגור עכשיו"); else why.push("שעות לא ידועות");
  if (x.c === "f" || x.c === "y" || x.c === "k") { const f = x.f; if (f.includes("V")) why.push("כולו צמחוני"); else if (f.includes("v")) why.push("יש צמחוני");
    if (f.includes("p")) { why.push("פיצה"); ic = "🍕"; } if (f.includes("l")) { why.push("פלאפל"); ic = "🧆"; } if (f.includes("i") && !f.includes("p")) { why.push("פסטה"); ic = "🍝"; } if (f.includes("r")) { why.push("צ'יפס"); ic = "🍟"; }
    if (x.c === "y") { why.push("מאפים"); ic = "🥐"; } if (f.includes("$")) { why.push("זול"); bonus = 130; }
    if (isTrap(x)) warn = f.includes("T") ? "דוכן טרדלניק: יקר/תיירותי" : "יקר/תיירותי"; }
  else if (x.c === "a") { if (x.f === "b") why.push("כספומט של בנק"); else if (x.f === "e") warn = "עמלה גבוהה, לא להשתמש"; else warn = "מפעיל לא ידוע, עדיף כספומט של בנק"; }
  else if (x.c === "s") { if (x.f === "g") { why.push("רשת גדולה, זול"); bonus = 130; } else why.push("מכולת קטנה"); }
  else if (x.c === "w") why.push(x.f === "0" ? "בחינם" : x.f === "1" ? "בתשלום" : "");
  else if (x.c === "m") why.push(x.f === "M" ? "קניון" : "חנות");
  else if (x.c === "b") { why.push(x.f === "n" ? "מועדון" : "בר"); if (isTrap(x)) warn = "יקר/תיירותי"; }
  return { ...x, d, os, ic, warn, why: why.filter(Boolean).join(" · "), rank: (os && os.open ? 0 : os ? 2e6 : 1e6) + (warn ? 5e5 : 0) + d - bonus, name: x.name || (x.c === "a" ? "כספומט" : x.c === "w" ? "שירותים ציבוריים" : "מקום") };
}
/* רדיוס: עד 15 דק'. פחות מ-5 פתוחים: 25 דק'. עדיין כלום: הכי קרובים, עם הסבר. */
function pick(all, showClosed) {
  const good = r => all.filter(x => x.d <= r && (showClosed || !x.os || x.os.open)), openIn = r => all.filter(x => x.d <= r && x.os && x.os.open).length;
  let r = NEAR, wide = false, far = false; if (openIn(NEAR) < 5) { r = FAR; wide = true; }
  let list = good(r); if (!list.length) { list = all.filter(x => showClosed || !x.os || x.os.open).sort((a, b) => a.d - b.d).slice(0, 6); far = true; }
  return { list: list.sort((a, b) => a.rank - b.rank).slice(0, 40), wide, far, closed: all.filter(x => x.d <= r && x.os && !x.os.open).length };
}

/* ---------- קטגוריות ---------- */
/* רשתות המבורגרים, סטייקים, עוף וקבב לא נכנסות ל"אוכל בשבילי", גם אם רשום שיש בהן מנה צמחונית */
const MEATY = /burger|steak|grill|bbq|ribs|kfc|mcdonald|chicken|kebab/i, mine = x => x.c === "y" || (x.c === "f" && (/[plirV]/.test(x.f) || !MEATY.test(x.name)));
const CAT = { food: ["🍕", "אוכל בשבילי", mine, "בלי בשר: פיצה, פלאפל, צמחוני, פסטה, מאפים. זול קודם."], night: ["🌙", "אוכל לילה", x => x.c === "f" && mine(x), "מה שפתוח עכשיו בלי בשר."], cafe: ["☕", "קפה", x => x.c === "k" || x.c === "y", ""], bakery: ["🥐", "מאפייה", x => x.c === "y", ""],
  atm: ["💵", "כספומט", x => x.c === "a", "רק כספומט של בנק. במסך בוחרים חיוב ב-CZK ומסרבים ל\"המרה\"."], super: ["🛒", "סופר", x => x.c === "s", ""], wc: ["🚻", "שירותים", x => x.c === "w", "בקניונים ובבתי קפה זה בחינם ללקוחות."], fun: ["🎉", "בילוי", x => x.c === "b", ""] };
async function livePoi(ref) { const a = `(around:1500,${ref.lat.toFixed(3)},${ref.lng.toFixed(3)})`, j = await overpass(`[out:json][timeout:12];(${POI_RULES.query(a)});out center tags 700;`); return j.elements.map(e => POI_RULES.rec(e)).filter(Boolean).map(toObj); }
let showClosed = false, curCat = "";
async function runCat(cat) {
  curCat = cat; const my = ++tok, C = CAT[cat], ref = here(), now = nowP(); paint(`<p class="sub dots">מחפש ${C[1]} קרוב</p>`, []);
  let base = await loadPoi(); if (my !== tok) return; let note = "";
  if (!base.some(x => hav(ref, x) < 1200)) { /* מחוץ לאזור שנשמר מראש */ if (isOffline()) note = "📡 אתה מחוץ לאזור שנשמר מראש ואין קליטה, אז אלה הקרובים ביותר מתוך מה ששמור."; else { try { base = await livePoi(ref); } catch (e) { note = "📡 החיפוש החי לא עונה כרגע, אז אלה הקרובים ביותר מתוך מה ששמור."; } if (my !== tok) return; } }
  const P = pick(base.filter(C[2]).map(x => judge(x, ref, now)), showClosed);
  paint(head(ref, P, C) + (note ? `<p class="fine note">${note}</p>` : "") + (P.list.length ? P.list.map(rowH).join("") : emptyState("🤷", "אין " + C[1] + " פתוח קרוב", "אפשר להציג גם מקומות סגורים, או לחפש בשם.")) + closedBtn(P), P.list);
}
const head = (ref, P, C) => `<div class="go-hd"><b>${C ? C[0] + " " + C[1] : "תוצאות"}</b><span>${ref.me ? "📍 לפי המיקום שלך" : "🏨 מחושב מהמלון"} · ${P.far ? "אין קרוב, אלה הכי קרובים" : "עד " + (P.wide ? 25 : 15) + " דק' הליכה"}${showClosed ? "" : " · רק פתוחים"}</span>${C && C[3] ? `<small>${C[3]}</small>` : ""}</div>`;
const closedBtn = P => P.closed || showClosed ? `<button class="btn wide go-cl" data-cl="1">${showClosed ? "להציג רק פתוחים" : `להציג גם ${P.closed} סגורים עכשיו`}</button>` : "";

/* ---------- חיפוש בשם: האפליקציה + השמורים + OSM, הכול לפי מרחק ---------- */
function appPlaces() {
  const out = [], seen = new Set(), add = o => { if (!o || o.lat == null) return; const k = nrm(o.name) + "|" + o.lat.toFixed(3); if (seen.has(k)) return; seen.add(k); out.push({ c: "x", f: "", b: "", st: "", oh: "", ...o }); };
  saved().forEach(s => add({ ...s, ic0: "⭐" }));
  for (const [k, p] of Object.entries(TRIP.places)) add({ ...(k === "hotel" ? hotelP() : p), ic0: (TRIP.info[k] || {}).ic || "📍", app: 1 });
  for (const x of TRIP.extras) add({ ...x, ic0: x.ic || "📍", app: 1 });
  try { for (const d of plan) for (const s of d.stops) { const l = loc(s); if (l && !s.at) add({ name: s.n, lat: l.lat, lng: l.lng, q: l.q || "", ic0: s.ic || "📍", app: 1 }); } } catch (e) {}
  rec().forEach(s => add({ ...s, ic0: "🕘" }));
  return out;
}
const KW = [["food", /אוכל|מסעד|פיצה|לאכול|רעב|פלאפל|צמחוני|פסטה|food|pizza|restaurant/], ["atm", /כספומט|מזומן|atm|bankomat/], ["wc", /שירותים|שרותים|wc|toilet/], ["cafe", /קפה|מאפ|coffee|cafe|bakery/], ["super", /סופר|מכולת|supermarket|albert|billa|lidl|tesco/], ["fun", /בר\b|ברים|מועדון|בילוי|פאב|bar|club|pub/]];
async function remoteFind(q, ref) {
  const out = [], safe = q.replace(/[.*+?^${}()|[\]\\"]/g, "\\$&");
  const jobs = [fetchJson(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=10&lat=${PRG.lat}&lon=${PRG.lng}&bbox=${BOX}`, 7000).then(j => (j.features || []).forEach(f => { const p = f.properties || {}, c = f.geometry && f.geometry.coordinates; if (!c) return; const name = p.name || [p.street, p.housenumber].filter(Boolean).join(" "); if (name) out.push({ c: "x", name, st: p.name ? [p.street, p.housenumber].filter(Boolean).join(" ") : "", lat: c[1], lng: c[0], oh: "", f: "", b: "", ltr: true, addr: !p.name }); })).catch(() => {})];
  if (/^[\x20-\x7eÀ-ɏ]{3,}$/.test(q)) jobs.push(overpass(`[out:json][timeout:10];nwr(around:3000,${ref.lat.toFixed(3)},${ref.lng.toFixed(3)})[name~"${safe}",i];out center tags 40;`).then(j => j.elements.forEach(e => { const r = POI_RULES.rec(e), t = e.tags || {}, lat = e.lat != null ? e.lat : e.center && e.center.lat, lng = e.lon != null ? e.lon : e.center && e.center.lon; if (lat == null || !t.name) return; out.unshift(r ? { ...toObj(r), ltr: true } : { c: "x", name: t.name, st: [t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(" "), lat, lng, oh: t.opening_hours || "", f: "", b: "", ltr: true, kind: t.shop || t.amenity || t.tourism || "" }); })).catch(() => {}));
  await Promise.all(jobs); return out;
}
function mergeFound(lists, ref, now) { const seen = [], out = []; for (const x of lists.flat()) { if (seen.some(y => nrm(y.name) === nrm(x.name) && hav(y, x) < 60)) { const y = seen.find(y => nrm(y.name) === nrm(x.name) && hav(y, x) < 60); if (!y.oh && x.oh) y.oh = x.oh; continue; } seen.push(x); } for (const x of seen) { const j = judge(x, ref, now); if (x.c === "x") { j.ic = x.ic0 || "📍"; if (!x.oh) { j.os = null; j.why = mins(j.d) + " דק' הליכה" + (x.addr ? " · כתובת" : x.app ? " · מהאפליקציה" : x.ic0 === "⭐" ? " · שמרת" : " · שעות לא ידועות"); j.rank = (x.app || x.addr || x.ic0 ? 0 : 1e6) + j.d; } } out.push(j); } return out; }
async function search(q, deep) {
  const my = ++tok; q = q.trim(); curCat = ""; if (!q) return home();
  const ref = here(), now = nowP(), n = nrm(q), t = n.split(" ").filter(Boolean), hit = x => { const h = nrm([x.name, x.cz, x.q, x.b, x.st].join(" ")); return t.every(w => h.includes(w)); };
  const kwc = KW.find(k => k[1].test(n)), sub = /פיצה|pizza/.test(n) ? "p" : /פלאפל|falafel/.test(n) ? "l" : /פסטה|pasta/.test(n) ? "i" : /צ.?יפס|fries/.test(n) ? "r" : ""; let kw = "";
  const base = await loadPoi(); if (my !== tok) return;
  if (kwc) { const C = CAT[kwc[0]], P = pick(base.filter(C[2]).filter(x => !sub || x.f.includes(sub)).map(x => judge(x, ref, now)), false); curCat = ""; kw = head(ref, P, [C[0], sub ? q : C[1], null, C[3]]) + (P.list.length ? P.list.map(rowH).join("") : emptyState("🤷", "אין פתוח קרוב", "אפשר לנסות את הקיצור למעלה ולהציג גם סגורים.")); return paint(kw, P.list); }
  const local = [appPlaces().filter(hit), n.length >= 2 ? base.filter(hit) : []];
  const show = (lists, tail) => { const P = pick(mergeFound(lists, ref, now), true); paint(kw + (P.list.length ? head(ref, P, null) + P.list.map(rowH).join("") : "") + tail, P.list); return P.list.length; };
  if (isOffline()) { const c = show(local, `<p class="fine note" style="margin-top:12px">📡 בלי אינטרנט מחפשים במה ששמור בטלפון (המקומות שבאפליקציה ו-${base.length.toLocaleString()} מקומות באזור המסלול).</p>`); if (!c && !kw) paint(emptyState("🔎", "לא מצאתי בשמורים", "עם קליטה אפשר לחפש כל מקום בפראג."), []); return; }
  if (q.length < 3 && !deep) return show(local, "");
  show(local, `<p class="sub dots">מחפש בפראג</p>`);
  const rem = await remoteFind(q, ref); if (my !== tok) return;
  const c = show([...local, rem], ""); if (!c && !kw) paint(emptyState("🔎", "לא מצאתי", "אפשר לנסות שם באנגלית או בצ'כית, או רק חלק מהשם."), []);
}

/* ---------- המסך ---------- */
let list = [], tok = 0, timer = 0;
const rowH = (x, i) => `<div class="ritem flat go-it${x.warn ? " warn" : ""}${x.os && !x.os.open ? " shut" : ""}"><button class="rmain go-r" data-i="${i}"><b${x.ltr || /^[\x20-\x7eÀ-ɏ]+$/.test(x.name) ? ' dir="ltr"' : ""}>${x.ic} ${esc(x.name)}</b><small>${esc(x.why)}</small>${x.warn ? `<small class="go-w">⚠️ ${esc(x.warn)}</small>` : ""}</button>${x.c !== "a" && x.c !== "w" && !x.addr ? `<a class="go-rev" href="${revUrl(x)}" target="_blank" rel="noopener" aria-label="ביקורות ב-Google Maps">⭐<span>ביקורות</span></a>` : ""}</div>`;
function paint(html, items) { const box = $("#goR"); if (!box) return; list = items; box.innerHTML = html; box.querySelectorAll(".go-r").forEach(b => b.onclick = () => choose(list[+b.dataset.i])); box.querySelectorAll("[data-cat]").forEach(b => b.onclick = () => { $("#goQ").value = ""; runCat(b.dataset.cat); }); const cl = box.querySelector("[data-cl]"); if (cl) cl.onclick = () => { showClosed = !showClosed; if (curCat) runCat(curCat); }; }
function home() { const ref = here(), now = nowP(), s = saved(), r = rec().filter(x => !s.some(y => same(x, y))), mk = (x, ic) => { const j = judge({ c: "x", f: "", b: "", st: "", oh: "", ...x }, ref, now); j.ic = ic; j.why = mins(j.d) + " דק' הליכה" + (ref.me ? "" : " מהמלון"); return j; }, items = [...s.map(x => mk(x, "⭐")), ...r.map(x => mk(x, "🕘"))];
  paint((s.length ? `<h3>⭐ שמרת</h3>` + s.map((x, i) => rowH(items[i], i)).join("") : "") + (r.length ? `<h3>🕘 חיפושים אחרונים</h3>` + r.map((x, i) => rowH(items[s.length + i], s.length + i)).join("") : "") + (items.length ? "" : `<p class="sub" style="margin-top:14px">${ref.me ? "הכול לפי המקום שאתה נמצא בו עכשיו." : "אין GPS בפראג כרגע, אז הכול מחושב מהמלון."} בוחרים קיצור למעלה, או מקלידים כל מקום: חנות, רחוב, אתר.</p>`), items); }
/* הקיצורים מתחלפים לפי השעה בפראג */
function chips() { const h = Math.floor(nowP().m / 60), c = k => `<button class="chip" data-g="${k}">${CAT[k][0]} ${CAT[k][1]}</button>`, eve = h >= 17 || h < 5;
  const first = h < 5 ? c("night") + `<button class="chip" data-g="taxi">🚕 מונית למלון</button><button class="chip" data-g="bus">🚌 אוטובוס לילה</button>` : h < 11 ? c("cafe") + c("bakery") + c("food") : h < 17 ? c("food") + c("cafe") : c("food") + c("fun");
  return first + c("atm") + c("super") + c("wc") + (eve && h >= 17 ? "" : eve ? c("fun") : "") + `<button class="chip" data-g="hotel">🏨 המלון</button>`; }
function openGo(q) {
  showClosed = false; curCat = "";
  openModal(`<h2>🔍 לאן?</h2><form id="goF" class="row"><input id="goQ" type="search" placeholder="Primark, פיצה, כספומט, גשר קרל, רחוב…" enterkeyhint="search" autocomplete="off" autocapitalize="off" autocorrect="off" dir="auto"><button class="btn pri">חפש</button></form>
    <div class="chips" id="goC">${chips()}</div><div id="goR" class="rlist"></div>`, "tall");
  const inp = $("#goQ"); inp.oninput = () => { clearTimeout(timer); const v = inp.value; timer = setTimeout(() => search(v, false), v.trim().length < 3 ? 0 : 450); };
  $("#goF").onsubmit = e => { e.preventDefault(); clearTimeout(timer); inp.blur(); search(inp.value, true); };
  $$("#goC .chip").forEach(b => b.onclick = () => { const g = b.dataset.g; buzz(6); $$("#goC .chip").forEach(o => o.classList.toggle("sel", o === b));
    if (g === "hotel") return choose({ ...hotelP(), ic: "🏨" }); if (g === "taxi") return typeof openBolt === "function" ? openBolt() : showTaxi(); if (g === "bus") return window.open(navUrl(hotelP(), "transit"), "_blank", "noopener");
    inp.value = ""; showClosed = false; runCat(g); });
  if (typeof q === "string" && q) { if (CAT[q]) runCat(q); else { inp.value = q; search(q, true); } } else { home(); try { inp.focus(); } catch (e) {} }
}

/* ---------- בחרת יעד: סימן, קו הליכה וכרטיס ---------- */
let cur = null, marker = null;
const lineData = c => ({ type: "Feature", geometry: { type: "LineString", coordinates: c } });
function setLine(coords) { try { if (!map || !map.getSource) return; const s = map.getSource("go-line"); if (s) return s.setData(lineData(coords));
    map.addSource("go-line", { type: "geojson", data: lineData(coords) });
    map.addLayer({ id: "go-line-bg", type: "line", source: "go-line", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#14161b", "line-width": 8, "line-opacity": 0.55 } });
    map.addLayer({ id: "go-line", type: "line", source: "go-line", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#e8a317", "line-width": 4.5, "line-dasharray": [0.2, 1.8] } }); } catch (e) {} }
function clearGo() { cur = null; try { if (marker) marker.remove(); } catch (e) {} marker = null; setLine([]); const c = $("#goCard"); if (c) c.remove(); document.body.classList.remove("go-on"); }
function place() { const c = $("#goCard"); if (!c) return; try { if (isDesktop()) { c.style.bottom = "28px"; return; } c.style.bottom = (sheetHeights()[sheetState] + 12) + "px"; c.classList.toggle("hide", sheetState === "full"); } catch (e) {} }
function card(distTxt) { if (!cur) return; let c = $("#goCard"); if (!c) { c = document.createElement("div"); c.id = "goCard"; document.body.appendChild(c); } const isSaved = saved().some(s => same(s, cur)), r = here();
  const line = [distTxt || (fmtDist(hav(r, cur) * 1.3) + " · 🚶 " + fmtDur(mins(hav(r, cur))) + (r.me ? "" : " מהמלון")), ...(cur.why ? cur.why.split(" · ").slice(1) : [])].join(" · ");
  c.innerHTML = `<div class="gc-h"><span class="gc-ic">${cur.ic && cur.ic !== "🕘" ? cur.ic : "📍"}</span><div><b${cur.ltr ? ' dir="ltr"' : ""}>${esc(cur.name)}</b><small>${esc(line)}</small>${cur.warn ? `<small class="go-w">⚠️ ${esc(cur.warn)}</small>` : ""}</div><button data-a="x" aria-label="לסגור">✕</button></div>
    <div class="gc-b"><a class="btn pri" href="${navUrl(cur)}" target="_blank" rel="noopener">🧭 נווט</a><button class="btn" data-a="arrow">➤ חץ</button><button class="btn" data-a="add">➕ למסלול</button>${cur.rev ? `<a class="btn" href="${cur.rev}" target="_blank" rel="noopener" aria-label="ביקורות">⭐ ביקורות</a>` : ""}<button class="btn${isSaved ? " on" : ""}" data-a="save" aria-label="לשמור">${isSaved ? "★" : "☆"}</button></div>`;
  c.onclick = e => { const b = e.target.closest("[data-a]"); if (!b) return; const a = b.dataset.a, it = cur;
    if (a === "x") return clearGo();
    if (a === "arrow") { clearGo(); return startNav(it, it.name); }
    if (a === "add") { const pre = { lat: it.lat, lng: it.lng, name: it.name, q: it.q || "" }; clearGo(); return addStopFlow(pre); }
    if (a === "save") { const s = saved(), on = !s.some(x => same(x, it)); LS.set("goSaved", on ? [{ name: it.name, lat: it.lat, lng: it.lng, q: it.q || "", st: it.st || "", ltr: !!it.ltr }, ...s].slice(0, 30) : s.filter(x => !same(x, it))); buzz(8); toast(on ? "נשמר ⭐ יופיע תמיד ב\"לאן?\", גם בלי אינטרנט" : "הוסר מהשמורים"); card(distTxt); } };
  document.body.classList.add("go-on"); place(); }
/* MapLibre מוסיף את הריפוד הזה לריפוד שכבר שמור במפה, ואם יחד הם גדולים מהמסך הוא פשוט לא זז. אז מאפסים קודם ונותנים ריפוד מלא אחד. */
function goPad() { const p = mapPad(); try { map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 }); } catch (e) {} return { top: Math.min(p.top + 60, innerHeight * 0.32), left: 40, right: 40, bottom: Math.min(p.bottom + 150, innerHeight * 0.5) }; }
async function choose(it) {
  if (!it || it.lat == null) return; cur = { name: it.name, lat: it.lat, lng: it.lng, q: it.q || "", st: it.st || "", ic: it.ic, ltr: !!it.ltr || /^[\x20-\x7eÀ-ɏ]+$/.test(it.name || ""), why: it.why || "", warn: it.warn || "", rev: it.c === "a" || it.c === "w" || it.addr || !it.c ? "" : revUrl(it) };
  LS.set("goRec", [{ name: cur.name, lat: cur.lat, lng: cur.lng, q: cur.q, st: cur.st, ltr: cur.ltr }, ...rec().filter(x => !same(x, cur))].slice(0, 6));
  closeModal(); if (!isDesktop()) setSheet("low"); buzz(10);
  const r = here(), my = cur;
  try { if (marker) marker.remove(); if (window.maplibregl && map) { const el = document.createElement("div"); el.className = "go-pin"; el.innerHTML = "<i></i>"; marker = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([cur.lng, cur.lat]).addTo(map); } } catch (e) {}
  setLine(r.me ? [[r.lng, r.lat], [cur.lng, cur.lat]] : []);
  try { if (r.me && hav(r, cur) < 15000) map.fitBounds([[Math.min(r.lng, cur.lng), Math.min(r.lat, cur.lat)], [Math.max(r.lng, cur.lng), Math.max(r.lat, cur.lat)]], { padding: goPad(), maxZoom: 16.5, duration: REDUCED ? 0 : 900 }); else flyTo(cur, 16.2); } catch (e) { try { flyTo(cur, 16.2); } catch (x) {} }
  card();
  if (!r.me || isOffline() || hav(r, cur) < 40) return;
  try { const o = { lat: +r.lat.toFixed(3), lng: +r.lng.toFixed(3) }, j = await fetchJson(`https://routing.openstreetmap.de/routed-foot/route/v1/foot/${o.lng},${o.lat};${cur.lng},${cur.lat}?overview=full&geometries=polyline`, 8000), R = j.routes && j.routes[0];
    if (R && cur === my) { setLine([[r.lng, r.lat], ...decodePoly(R.geometry)]); card(`${fmtDist(R.distance)} · 🚶 ${fmtDur(R.distance / WALK)}`); } } catch (e) {}
}

/* ---------- השורה הקבועה במסך הראשי ---------- */
try { const hud = $("#hud"), days = $("#days"); if (hud && !$("#goBar")) { const b = document.createElement("button"); b.id = "goBar"; b.setAttribute("aria-label", "לאן? חיפוש מקום"); b.innerHTML = `<span>🔍</span><b>לאן?</b><small>Primark, פיצה, כספומט, רחוב…</small>`; b.onclick = () => openGo(); if (days && days.nextSibling) hud.insertBefore(b, days.nextSibling); else hud.appendChild(b); }
  if (typeof window.setSheet === "function") window.setSheet = (old => function () { const r = old.apply(this, arguments); place(); return r; })(window.setSheet);
  addEventListener("resize", place); try { if (window.__ui) setSheet(sheetState, true); } catch (e) {} } catch (e) {}
Object.assign(window, { openGo, goChoose: choose, goClear: clearGo, goOh: ohState });

(() => { const st = document.createElement("style"); st.textContent = `
#goBar{align-self:stretch;min-height:46px;border:0;border-radius:var(--r3,18px);background:var(--card);color:var(--ink);box-shadow:var(--sh2);display:flex;align-items:center;gap:8px;padding:0 14px;font:inherit;text-align:start;transition:transform .15s}
#goBar:active{transform:scale(.98)}#goBar span{font-size:1.05rem}#goBar b{font-weight:700;font-size:1rem}#goBar small{color:var(--mut);font-size:.84rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
#fabHere,#fab3d{display:none!important}
#goF input{flex:1;min-width:0}#goF .btn{flex:none;padding:0 18px}#goR h3{margin:14px 0 2px;font-size:.84rem;color:var(--mut);font-weight:600}
.go-hd{margin:12px 0 4px;display:flex;flex-direction:column;gap:2px}.go-hd b{font-size:1.05rem;font-weight:700}.go-hd span{font-size:.84rem;color:var(--must-ink,#b07a00);font-weight:600}
:root[data-theme="dark"] .go-hd span{color:var(--must)}.go-hd small{font-size:.8rem;color:var(--mut)}
.go-it{align-items:center}.go-it .rmain b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:start;unicode-bidi:plaintext}
.go-it .rmain small{white-space:normal;line-height:1.35}.go-it.shut .rmain{opacity:.55}
.go-w{color:#e0892b!important;font-weight:600}.go-it.warn .rmain b{opacity:.8}
.go-rev{flex:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;min-width:58px;min-height:48px;border-radius:14px;background:var(--card2);color:var(--ink);text-decoration:none;font-size:1rem}
.go-rev span{font-size:.66rem;font-weight:600;color:var(--mut)}
.go-cl{margin-top:12px}
#goC .chip.sel{background:var(--ink);color:var(--card);box-shadow:none}
#goCard{position:fixed;z-index:5;inset-inline:10px;bottom:170px;background:var(--card);color:var(--ink);border-radius:var(--r3,18px);box-shadow:var(--sh2);padding:12px;transition:bottom .42s var(--spring),opacity .2s;animation:drop .35s var(--spring)}
#goCard.hide{opacity:0;pointer-events:none}
#goCard .gc-h{display:flex;align-items:center;gap:10px}#goCard .gc-h>div{flex:1;min-width:0}
#goCard .gc-ic{font-size:1.5rem}#goCard b{display:block;font-weight:700;font-size:1.02rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:start}
#goCard small{display:block;color:var(--mut);font-size:.84rem;line-height:1.35}
#goCard .gc-h button{width:40px;height:40px;border:0;border-radius:50%;background:var(--card2);color:var(--ink);font-size:1rem}
#goCard .gc-b{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}#goCard .gc-b .btn{flex:1;min-height:46px;padding:0 6px;font-size:.86rem;white-space:nowrap;text-decoration:none;display:flex;align-items:center;justify-content:center}
#goCard .gc-b .btn.pri{flex:1.3}#goCard .gc-b [data-a="save"]{flex:none;width:46px;font-size:1.15rem}#goCard .gc-b .btn.on{color:#e8a317}
body.go-on #talkPill{opacity:0;pointer-events:none}
.go-pin{width:34px;height:44px;filter:drop-shadow(0 4px 6px rgba(0,0,0,.45))}
.go-pin i{display:block;width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#e8a317;border:3px solid #fff;box-sizing:border-box}
`; document.head.appendChild(st); })();
(window.__mods = window.__mods || {}).go = "ok";
} catch (err) { try { console.warn("go:", err); (window.__mods = window.__mods || {}).go = "fail: " + (err && err.message || err); } catch (e) {} }
})();
