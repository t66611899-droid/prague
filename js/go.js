/* go: "🔍 לאן?" — ללכת לכל מקום, לא רק לתוכנית.
   שורה קבועה מתחת לימים. מקלידים כל דבר (חנות, פיצה, כספומט, רחוב) ומקבלים:
   • מיד, גם בלי אינטרנט: המקומות שבאפליקציה, התחנות שלך, מה ששמרת וחיפושים אחרונים, עם מרחק וזמן הליכה.
   • עם אינטרנט: חיפוש ב-OpenStreetMap (Photon, ואם הוא לא עונה Nominatim). חינם, בלי מפתח. לחיפוש נשלח רק הטקסט, לא המיקום שלך.
   בוחרים מקום: סימן על המפה, קו הליכה, וכרטיס עם "נווט" (Google Maps), "חץ" (הניווט הפנימי, עובד בלי קליטה), "הוסף למסלול" ו"שמור".
   קו ההליכה האמיתי מבקש מסלול משרת הניווט של OSM עם מיקום מעוגל (~100 מ'), ורק אחרי שבחרת יעד; בלי קליטה מצויר קו ישר.
   מוגן: אם משהו כאן נכשל, שאר האפליקציה עולה כרגיל. */
"use strict";
(function () {
try {
const PRG = { lat: 50.0875, lng: 14.4213 }, BOX = "14.22,49.94,14.71,50.18";
const rec = () => LS.get("goRec", []), saved = () => LS.get("goSaved", []);
const same = (a, b) => a && b && Math.abs(a.lat - b.lat) < 2e-4 && Math.abs(a.lng - b.lng) < 2e-4;
const hotelP = () => { const p = TRIP.places.hotel; return me && me.hotel && me.hotel.lat ? { ...p, ...me.hotel, name: "המלון" } : p; };
const here = () => { try { if (gps && (typeof gpsNear !== "function" || gpsNear())) return { lat: gps.lat, lng: gps.lng, me: true }; } catch (e) {} return { ...hotelP(), me: false }; };
const nrm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-֑ͯ-ׇ]/g, "").replace(/['׳’`"״.,\-–()]/g, " ").replace(/\s+/g, " ").trim();
const distTxt = it => { const r = here(), d = hav(r, it); return `${fmtDist(d * 1.3)} · 🚶 ${fmtDur(walkEst(d))}${r.me ? "" : " מהמלון"}`; };

/* ---------- המקומות ששמורים בטלפון ---------- */
function localPlaces() {
  const out = [], seen = new Set(), add = o => { if (!o || o.lat == null) return; const k = nrm(o.name) + "|" + o.lat.toFixed(3); if (seen.has(k)) return; seen.add(k); out.push(o); };
  saved().forEach(s => add({ ...s, ic: "⭐", src: "saved" }));
  for (const [k, p] of Object.entries(TRIP.places)) { const inf = TRIP.info[k] || {}; add({ ...(k === "hotel" ? hotelP() : p), ic: inf.ic || "📍", src: "app", placeKey: k }); }
  for (const x of TRIP.extras) add({ ...x, ic: x.ic || "📍", src: "app", extraId: x.id });
  try { for (const d of plan) for (const s of d.stops) { const l = loc(s); if (l && !s.at) add({ name: s.n, lat: l.lat, lng: l.lng, q: l.q || "", ic: s.ic || "📍", src: "plan" }); } } catch (e) {}
  rec().forEach(s => add({ ...s, ic: "🕘", src: "rec" }));
  return out;
}
function localFind(q) { const t = nrm(q).split(" ").filter(Boolean); if (!t.length) return []; const r = here();
  return localPlaces().map(p => { const h = nrm([p.name, p.cz, p.q, p.sub].join(" ")); return t.every(x => h.includes(x)) ? { ...p, d: hav(r, p) } : null; }).filter(Boolean).sort((a, b) => a.d - b.d).slice(0, 8); }
/* מילים שמשמעותן "משהו כזה קרוב אליי": פותחים את החיפוש בסביבה במקום לחפש שם */
const KW = [["food", "🍽️", "אוכל קרוב", /אוכל|מסעד|פיצה|לאכול|רעב|פלאפל|צמחוני|food|pizza|restaurant/], ["atm", "🏧", "כספומט קרוב", /כספומט|מזומן|atm|bankomat/], ["wc", "🚻", "שירותים קרובים", /שירותים|שרותים|wc|toilet/], ["cafe", "☕", "קפה קרוב", /קפה|coffee|cafe/], ["super", "🛒", "סופר קרוב", /סופר|מכולת|supermarket|market/], ["shop", "👟", "בגדים וסניקרס קרוב", /בגדים|קניות|נעליים|סניקרס|clothes|shoes/]];

/* ---------- חיפוש ב-OSM ---------- */
async function remoteFind(q, deep) {
  let items = [];
  try { const j = await fetchJson(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&lat=${PRG.lat}&lon=${PRG.lng}&bbox=${BOX}`, 7000);
    items = (j.features || []).map(f => { const p = f.properties || {}, c = f.geometry && f.geometry.coordinates; if (!c) return null; const name = p.name || [p.street, p.housenumber].filter(Boolean).join(" "); if (!name) return null; return { name, sub: [p.name ? [p.street, p.housenumber].filter(Boolean).join(" ") : "", p.district || p.city || ""].filter(Boolean).join(", "), lat: c[1], lng: c[0], ic: "📍", src: "osm", ltr: true }; }).filter(Boolean);
  } catch (e) { if (!deep) throw e; }
  if (!items.length && deep) { const j = await fetchJson(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&viewbox=14.22,50.18,14.71,49.94&bounded=1&q=${encodeURIComponent(q)}`, 9000);
    items = j.map(x => ({ name: x.name || x.display_name.split(",")[0], sub: x.display_name.split(",").slice(1, 3).join(",").trim(), lat: +x.lat, lng: +x.lon, ic: "📍", src: "osm", ltr: true })); }
  const r = here(), seen = new Set(); return items.filter(x => { const k = nrm(x.name) + "|" + x.lat.toFixed(3); return !seen.has(k) && seen.add(k); }).map(x => ({ ...x, d: hav(r, x) })).sort((a, b) => a.d - b.d);
}

/* ---------- המסך ---------- */
let list = [], tok = 0, timer = 0;
const rowH = (x, i) => `<button class="ritem go-r" data-i="${i}"><b${x.ltr ? ' dir="ltr" style="text-align:right"' : ""}>${x.ic || "📍"} ${x.ltr ? esc(x.name) : bd(x.name)}</b><small>${distTxt(x)}${x.sub || x.cz ? " · " + esc(x.sub || x.cz) : ""}</small></button>`;
function paint(html, items) { const box = $("#goR"); if (!box) return; list = items; box.innerHTML = html; box.querySelectorAll(".go-r").forEach(b => b.onclick = () => choose(list[+b.dataset.i])); box.querySelectorAll("[data-near]").forEach(b => b.onclick = () => openNearby(b.dataset.near)); }
function home() { const s = saved(), r = rec().filter(x => !s.some(y => same(x, y))), items = [...s.map(x => ({ ...x, ic: "⭐" })), ...r.map(x => ({ ...x, ic: "🕘" }))];
  paint(items.length ? (s.length ? `<h3>⭐ שמרת</h3>` + s.map((x, i) => rowH(items[i], i)).join("") : "") + (r.length ? `<h3>🕘 חיפושים אחרונים</h3>` + r.map((x, i) => rowH(items[s.length + i], s.length + i)).join("") : "") : `<p class="sub" style="margin-top:14px">כל מקום בפראג: חנות, מסעדה, רחוב, אתר. מה שתבחר יסומן על המפה עם קו הליכה.</p>`, items); }
async function search(q, deep) {
  const my = ++tok; q = q.trim(); if (!q) return home();
  const kw = KW.filter(k => k[3].test(nrm(q))).map(k => `<button class="ritem go-k" data-near="${k[0]}"><b>${k[1]} ${k[2]}</b><small>מחפש סביבך, עד 800 מ'</small></button>`).join(""), loc_ = localFind(q);
  const top = kw + (loc_.length ? `<h3>באפליקציה</h3>` + loc_.map(rowH).join("") : "");
  if (isOffline()) return paint(top + `<p class="fine note" style="margin-top:12px">📡 בלי אינטרנט מחפשים רק במקומות ששמורים בטלפון. הניווט עם החץ עובד גם ככה.</p>` + (top ? "" : emptyState("🔎", "לא מצאתי בשמורים", "עם קליטה אפשר לחפש כל מקום בפראג.")), loc_);
  if (q.length < 3 && !deep) return paint(top, loc_);
  paint(top + `<p class="sub dots">מחפש בפראג</p>`, loc_);
  try { const rem = (await remoteFind(q, deep)).filter(x => !loc_.some(l => same(l, x))); if (my !== tok) return; const all = [...loc_, ...rem];
    paint(top + (rem.length ? `<h3>בפראג</h3>` + rem.map((x, i) => rowH(x, loc_.length + i)).join("") : (top ? "" : emptyState("🔎", "לא מצאתי", "אפשר לנסות שם באנגלית או בצ'כית, או רק חלק מהשם."))) + (!deep && !rem.length ? `<p class="fine">Enter לחיפוש רחב יותר.</p>` : ""), all);
  } catch (e) { if (my === tok) paint(top + `<p class="fine note" style="margin-top:12px">📡 החיפוש בפראג לא עונה כרגע. המקומות השמורים למעלה עובדים תמיד.</p>`, loc_); }
}
function openGo(q) {
  openModal(`<h2>🔍 לאן?</h2><form id="goF" class="row"><input id="goQ" type="search" placeholder="Primark, פיצה, כספומט, גשר קרל, רחוב…" enterkeyhint="search" autocomplete="off" autocapitalize="off" autocorrect="off" dir="auto"><button class="btn pri">חפש</button></form>
    <div class="chips" id="goC"><button class="chip" data-g="food">🍽️ אוכל</button><button class="chip" data-g="atm">🏧 כספומט</button><button class="chip" data-g="wc">🚻 שירותים</button><button class="chip" data-g="hotel">🏨 המלון</button><button class="chip" data-g="cafe">☕ קפה</button><button class="chip" data-g="super">🛒 סופר</button><button class="chip" data-g="near">📍 מה יש פה?</button></div>
    <div id="goR" class="rlist"></div>`, "tall");
  const inp = $("#goQ"); inp.oninput = () => { clearTimeout(timer); const v = inp.value; timer = setTimeout(() => search(v, false), v.trim().length < 3 ? 0 : 420); };
  $("#goF").onsubmit = e => { e.preventDefault(); clearTimeout(timer); inp.blur(); search(inp.value, true); };
  $$("#goC .chip").forEach(b => b.onclick = () => { const g = b.dataset.g; buzz(6); if (g === "hotel") choose({ ...hotelP(), ic: "🏨" }); else openNearby(g === "near" ? undefined : g); });
  if (typeof q === "string" && q) { inp.value = q; search(q, true); } else { home(); try { inp.focus(); } catch (e) {} }
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
function card(extra) { if (!cur) return; let c = $("#goCard"); if (!c) { c = document.createElement("div"); c.id = "goCard"; document.body.appendChild(c); } const isSaved = saved().some(s => same(s, cur));
  c.innerHTML = `<div class="gc-h"><span class="gc-ic">${cur.ic && cur.ic !== "🕘" ? cur.ic : "📍"}</span><div><b${cur.ltr ? ' dir="ltr"' : ""}>${esc(cur.name)}</b><small>${extra || distTxt(cur)}</small></div><button data-a="x" aria-label="לסגור">✕</button></div>
    <div class="gc-b"><a class="btn pri" href="${navUrl(cur)}" target="_blank" rel="noopener">🧭 נווט</a><button class="btn" data-a="arrow">➤ חץ</button><button class="btn" data-a="add">➕ למסלול</button><button class="btn${isSaved ? " on" : ""}" data-a="save" aria-label="לשמור">${isSaved ? "★" : "☆"}</button></div>`;
  c.onclick = e => { const b = e.target.closest("[data-a]"); if (!b) return; const a = b.dataset.a, it = cur;
    if (a === "x") return clearGo();
    if (a === "arrow") { clearGo(); return startNav(it, it.name); }
    if (a === "add") { const pre = { lat: it.lat, lng: it.lng, name: it.name, q: it.q || "" }; clearGo(); return addStopFlow(pre); }
    if (a === "save") { const s = saved(), on = !s.some(x => same(x, it)); LS.set("goSaved", on ? [{ name: it.name, lat: it.lat, lng: it.lng, q: it.q || "", sub: it.sub || it.cz || "", ltr: !!it.ltr }, ...s].slice(0, 30) : s.filter(x => !same(x, it))); buzz(8); toast(on ? "נשמר ⭐ יופיע תמיד ב\"לאן?\", גם בלי אינטרנט" : "הוסר מהשמורים"); card(extra); } };
  document.body.classList.add("go-on"); place(); }
/* MapLibre מוסיף את הריפוד הזה לריפוד שכבר שמור במפה, ואם יחד הם גדולים מהמסך הוא פשוט לא זז. אז מאפסים קודם ונותנים ריפוד מלא אחד. */
function goPad() { const p = mapPad(); try { map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 }); } catch (e) {} return { top: Math.min(p.top + 60, innerHeight * 0.32), left: 40, right: 40, bottom: Math.min(p.bottom + 150, innerHeight * 0.5) }; }
async function choose(it) {
  if (!it || it.lat == null) return; cur = { name: it.name, lat: it.lat, lng: it.lng, q: it.q || "", sub: it.sub || "", cz: it.cz || "", ic: it.ic, ltr: !!it.ltr };
  LS.set("goRec", [{ name: cur.name, lat: cur.lat, lng: cur.lng, q: cur.q, sub: cur.sub || cur.cz, ltr: cur.ltr }, ...rec().filter(x => !same(x, cur))].slice(0, 6));
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
Object.assign(window, { openGo, goChoose: choose, goClear: clearGo, goLocal: localFind });

(() => { const st = document.createElement("style"); st.textContent = `
#goBar{align-self:stretch;min-height:46px;border:0;border-radius:var(--r3,18px);background:var(--card);color:var(--ink);box-shadow:var(--sh2);display:flex;align-items:center;gap:8px;padding:0 14px;font:inherit;text-align:start;transition:transform .15s}
#goBar:active{transform:scale(.98)}#goBar span{font-size:1.05rem}#goBar b{font-weight:700;font-size:1rem}#goBar small{color:var(--mut);font-size:.84rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
#fabHere,#fab3d{display:none!important}
#goF input{flex:1;min-width:0}#goR h3{margin:14px 0 2px;font-size:.84rem;color:var(--mut);font-weight:600}
#goCard{position:fixed;z-index:5;inset-inline:10px;bottom:170px;background:var(--card);color:var(--ink);border-radius:var(--r3,18px);box-shadow:var(--sh2);padding:12px;transition:bottom .42s var(--spring),opacity .2s;animation:drop .35s var(--spring)}
#goCard.hide{opacity:0;pointer-events:none}
#goCard .gc-h{display:flex;align-items:center;gap:10px}#goCard .gc-h>div{flex:1;min-width:0}
#goCard .gc-ic{font-size:1.5rem}#goCard b{display:block;font-weight:700;font-size:1.02rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:start}
#goCard small{display:block;color:var(--mut);font-size:.86rem}
#goCard .gc-h button{width:40px;height:40px;border:0;border-radius:50%;background:var(--card2);color:var(--ink);font-size:1rem}
#goCard .gc-b{display:flex;gap:6px;margin-top:10px}#goCard .gc-b .btn{flex:1;min-height:46px;padding:0 6px;font-size:.88rem;white-space:nowrap;text-decoration:none;display:flex;align-items:center;justify-content:center}
#goCard .gc-b .btn.pri{flex:1.3}#goCard .gc-b [data-a="save"]{flex:none;width:46px;font-size:1.15rem}#goCard .gc-b .btn.on{color:#e8a317}
body.go-on #talkPill{opacity:0;pointer-events:none}
.go-pin{width:34px;height:44px;filter:drop-shadow(0 4px 6px rgba(0,0,0,.45))}
.go-pin i{display:block;width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#e8a317;border:3px solid #fff;box-sizing:border-box}
`; document.head.appendChild(st); })();
(window.__mods = window.__mods || {}).go = "ok";
} catch (err) { try { console.warn("go:", err); (window.__mods = window.__mods || {}).go = "fail: " + (err && err.message || err); } catch (e) {} }
})();
