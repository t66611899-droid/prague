/* priv: פריט אישי שנמצא רק בכספת המוצפנת (קטגוריה pv בחלק הכרטיסים). אין כאן שום תוכן: הכול מגיע מהכספת, רק בטלפון.
   • ברשימה של היום מופיעה שורה בשם ניטרלי, רק אם הכספת פתוחה בטלפון הזה. הפרטים נפתחים רק בלחיצה.
   • לא בתוכנית (plan), אז לא במפה, לא ביומן/התראות, לא בשיתוף, לא בדף ההורים ולא בסיכומים.
   • ✅ הולך / ❌ לא הולך לכל מופע. הולך: תחנה רגילה (נווט, ✓) ועל המפה של אותו יום נקודה עם מסלול הליכה מהמלון. לא הולך: שורה אפורה דקה, אפשר להחזיר.
   • מופיע גם ב"מקומות באזור" כמו כל מקום, ומשם מוסיפים לכל יום ושעה (pvX).
     עדיין לא בתוכנית, אז לא ביומן, בהתראות, בשיתוף או אצל ההורים.
   • מה שנשמר כאן (pvH, pvD, pvDec, pvX) לא נכנס לגיבוי ולהעברה (לא ברשימת MOVE_KEYS).
   מוגן: אם משהו נכשל, פשוט אין שורה. */
"use strict";
(function () {
try {
let P = null, loading = false;
async function load() {
  if (loading) return; loading = true;
  try { let best = null; /* כמה גרסאות של הפריט: לוקחים את החדשה ביותר (rev) */
    for (const it of ((typeof tix !== "undefined" && tix && tix.pv) || [])) { const b = await imgGet("tk:" + it.id).catch(() => null); if (!b) continue; try { const j = JSON.parse(await b.text()); if (j && j.v === 1 && (!best || (j.rev || 0) >= (best.rev || 0))) best = j; } catch (e) {} }
    if (!best) { P = null; return; } const had = !!P, ch = !P || P.rev !== best.rev; P = best; if (!had || ch) try { renderList(); } catch (e) {} }
  catch (e) {} finally { loading = false; }
}
const nowP = () => { const T = tripNow(), w = T.w; return { d: dstr(w), m: w.getUTCHours() * 60 + w.getUTCMinutes() }; };
/* החלטה לכל מופע (תאריך|שעה): go = הולך, no = לא הולך, בלי = אופציונלי. נשמר רק בטלפון (pvDec), כמו pvX = ימים שהוספת בעצמך */
const key = s => s.date + "|" + s.m, decs = () => LS.get("pvDec", {}) || {}, dec = s => decs()[key(s)] || "";
const setDec = (s, v) => { const d = decs(); if (v) d[key(s)] = v; else delete d[key(s)]; LS.set("pvDec", d); };
const done = () => !!LS.get("pvD", 0);
function migrate() { try { const a = LS.get("pvA", ""); if (!a || !P) return; const s = (P.slots || []).find(x => x.date === a); if (s && !dec(s)) setDec(s, "go"); LS.set("pvA", ""); } catch (e) {} } /* גרסה קודמת: "➕ הוסף" = הולך */
const extra = () => (LS.get("pvX", []) || []).map(x => ({ date: x.date, m: x.m, note: "הוספת ליום הזה", x: 1 }));
function slots() {
  if (!P) return []; migrate(); const n = nowP(), h = LS.get("pvH", null), out = [];
  for (const s of [...(P.slots || []), ...extra()]) { const d = dec(s);
    if (d === "go") { out.push(s); continue; } if (done()) continue; if (d === "no") { out.push(s); continue; }
    if (s.by != null) { const ok = h ? (h.d < s.date || (h.d === s.date && h.m <= s.by)) : (n.d < s.date || (n.d === s.date && n.m <= s.by)); if (ok) out.push(s); }
    else out.push(s);
  }
  return out;
}
/* רישום שעת הכניסה למלון: הפעם הראשונה שהתחנה מסומנת "הייתי" */
function trackHotel() { try { if (!P || LS.get("pvH", null) || !P.hs) return; const d = plan.find(x => x.date === P.hs.date); const s = d && d.stops.find(x => x.n === P.hs.n); if (s && marks[s.id] === "done") LS.set("pvH", nowP()); } catch (e) {} }

const fmt = s => esc(String(s || "")).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(&#39;|&quot;|')([A-Za-z][^'"&]*?)(\1)/g, '<bdi dir="ltr">$1$2$3</bdi>'); /* משפט באנגלית בתוך עברית: בכיוון הנכון */
const name = () => P.t || P.name || "";
function decide(s, v) { setDec(s, v); if (v !== "go") LS.set("pvD", 0); try { renderList(); } catch (e) {} drawPv(); buzz(8);
  if (v === "go" && plan[curDay] && plan[curDay].date === s.date) setTimeout(() => { try { const h = place("hotel"); map.fitBounds([[Math.min(h.lng, P.lng), Math.min(h.lat, P.lat)], [Math.max(h.lng, P.lng), Math.max(h.lat, P.lat)]], { padding: mapPad(), maxZoom: 16.2, duration: REDUCED ? 0 : 800 }); } catch (e) {} }, 60); }
function row(s) {
  const d = dec(s), dn = d === "go" && done(), note = String(s.note || "").replace(/^[^·]*אפשרות[^·]*·\s*/, "");
  const li = document.createElement("li"); li.style.setProperty("--c", "#7a4fe0");
  if (d === "no") { li.className = "st pvrow optno"; li.innerHTML = `<button class="opt-thin" type="button"><span>❌ ${fmtT(s.m)} · ${esc(name())}</span><u>להחזיר</u></button>`; }
  else {
    li.className = "st pvrow" + (d === "go" ? " pvon" : " optrow") + (dn ? " done" : "");
    li.innerHTML = `<button class="st-main" type="button"><span class="st-t">${fmtT(s.m)}</span><span class="st-ic">🌙</span><span class="st-x"><b>${esc(name())}</b>${d ? (note ? `<small class="sub2"><span class="nt1">${esc(note)}</span></small>` : "") : `<small class="sub2"><span class="pv-tag">אופציונלי</span>${note ? `<span class="nt1">${esc(note)}</span>` : ""}</small>`}</span></button>`
      + (P.lat ? `<a class="st-nav" href="${navUrl({ lat: P.lat, lng: P.lng })}" target="_blank" rel="noopener" aria-label="ניווט הליכה">נווט</a>` : `<span class="st-nav off"></span>`)
      + (d === "go" ? `<button class="st-chk" type="button" aria-label="${dn ? "בטל סימון" : "סמן שבוצע"}" aria-pressed="${dn}"></button>` : `<span class="st-chk" style="visibility:hidden"></span>`)
      + (d ? "" : `<div class="opt-row"><button class="opt-b go" type="button">✅ הולך</button><button class="opt-b no" type="button">❌ לא הולך</button></div>`);
  }
  li.querySelectorAll("button,a").forEach(b => ["click", "pointerdown"].forEach(ev => b.addEventListener(ev, e => { e.stopPropagation(); if (ev !== "click") return;
    if (b.classList.contains("st-main")) open(s); else if (b.classList.contains("st-chk")) { LS.set("pvD", dn ? 0 : 1); renderList(); buzz(8); }
    else if (b.classList.contains("go")) decide(s, "go"); else if (b.classList.contains("no")) decide(s, "no"); else if (b.classList.contains("opt-thin")) decide(s, ""); })));
  return li;
}
const old = window.renderList;
window.renderList = function () {
  const r = old.apply(this, arguments);
  try { if (!P) { load(); return r; } trackHotel(); if (editMode) return r; const day = plan[curDay], list = $("#list"); if (!day || !list) return r;
    for (const s of slots().filter(x => x.date === day.date)) { let best = null, bm = -1; for (const li of list.querySelectorAll("li.st[data-id]")) { const st = findStop(li.dataset.id); if (st && st.m <= s.m && st.m >= bm) { best = li; bm = st.m; } } const el = row(s); if (best) best.after(el); else list.insertBefore(el, list.firstChild); } } catch (e) {}
  return r;
};
const DAYS = () => plan.map(d => d.date);
function addFlow() {
  if (!P) return; const cur = plan[curDay] ? plan[curDay].date : DAYS()[1];
  openModal(`<h2>📅 להוסיף ליום</h2><p class="sub">${esc(name())} · אופציונלי, בלי תזכורות</p>
    <div class="seg" id="pvDay">${plan.map(d => `<button data-d="${d.date}" class="${d.date === cur ? "sel" : ""}">${dayDate(d.date).dm}</button>`).join("")}</div>
    <label class="fld">שעה<input id="pvTm" type="time" value="20:00"></label>
    <button class="btn pri wide" id="pvAddGo">➕ להוסיף</button>`);
  let d0 = cur; $$("#pvDay button").forEach(b => b.onclick = () => { d0 = b.dataset.d; $$("#pvDay button").forEach(x => x.classList.toggle("sel", x === b)); });
  $("#pvAddGo").onclick = () => { const [h, mi] = ($("#pvTm").value || "20:00").split(":").map(Number), m = h * 60 + mi, x = LS.get("pvX", []) || [];
    if (!x.some(y => y.date === d0 && y.m === m)) x.push({ date: d0, m }); LS.set("pvX", x); setDec({ date: d0, m }, "go"); closeModal();
    const i = plan.findIndex(d => d.date === d0); if (i >= 0 && i !== curDay && typeof selectDay === "function") selectDay(i); else { try { renderList(); } catch (e) {} drawPv(); } toast("נוסף ליום ✓", 1400); };
}
function open(s) {
  if (!P) return; const d = s ? dec(s) : "";
  openModal(`<div class="hero" style="--c:#7a4fe0"><span>🌙</span></div>
    <div class="pc"><h2 dir="auto" style="text-align:right">${esc(name())}</h2><p class="meta">${s ? `<span>🕐 ${fmtT(s.m)}</span>` : ""}<span>${d === "go" ? "✅ הולך" : d === "no" ? "❌ לא הולך" : "✨ אופציונלי"}</span></p>
    ${P.sub ? `<p class="pc-what">${fmt(P.sub)}</p>` : ""}
    ${(P.sec || []).map(x => `<div class="pv-sec"><h3>${fmt(x.h)}</h3>${(x.li || []).length ? `<ul class="pv-l">${x.li.map(l => `<li>${fmt(l)}</li>`).join("")}</ul>` : ""}</div>`).join("")}
    ${s ? `<div class="opt-row in"><button class="opt-b go${d === "go" ? " on" : ""}" id="pvGo" type="button">✅ הולך</button><button class="opt-b no${d === "no" ? " on" : ""}" id="pvNo" type="button">❌ לא הולך</button></div>` : ""}
    <div class="pc-btns">${P.lat ? `<a class="btn pri" href="${navUrl({ lat: P.lat, lng: P.lng })}" target="_blank" rel="noopener">🚶 נווט</a>` : ""}<button class="btn" id="pvMore">📅 ליום אחר</button>${s && s.x ? `<button class="btn" id="pvDel">🗑 להוריד</button>` : `<button class="btn" id="pvDone">✓ הייתי</button>`}</div>
    <p class="fine">רק בכספת המוצפנת ובטלפון הזה. לא ביומן, בהתראות, בשיתוף או אצל ההורים.</p></div>`, "place");
  const g = $("#pvGo"), n = $("#pvNo"); if (g) g.onclick = () => { closeModal(); decide(s, d === "go" ? "" : "go"); }; if (n) n.onclick = () => { closeModal(); decide(s, d === "no" ? "" : "no"); };
  $("#pvMore").onclick = () => addFlow();
  const del = $("#pvDel"); if (del) del.onclick = () => { LS.set("pvX", (LS.get("pvX", []) || []).filter(y => !(y.date === s.date && y.m === s.m))); setDec(s, ""); closeModal(); try { renderList(); } catch (e) {} drawPv(); toast("הורד", 1200); };
  const dn = $("#pvDone"); if (dn) dn.onclick = () => { LS.set("pvD", 1); closeModal(); try { renderList(); } catch (e) {} toast("✓", 1200); };
}
/* ---------- ברשימת "מקומות באזור", כמו כל מקום אחר (רק בטלפון שהכספת פתוחה בו). לחיצה: בוחרים יום ושעה ---------- */
if (typeof window.builtinNear === "function") window.builtinNear = (o => function (ref, r, onlyXmas) { const out = o.apply(this, arguments);
  try { if (P && P.lat && !onlyXmas && ref) { const dist = hav(ref, { lat: P.lat, lng: P.lng }); if (dist <= r) { out.push({ id: "pvx", name: name(), ic: "🌙", ty: "night", lat: P.lat, lng: P.lng, sub: "אופציונלי · מוסיפים לכל יום ושעה", d: "", pvAdd: true, dist }); out.sort((a, b) => a.dist - b.dist); } } } catch (e) {}
  return out; })(window.builtinNear);
const oPlace = window.openPlace; window.openPlace = function (o) { if (o && o.near && o.near.pvAdd) return addFlow(); return oPlace.apply(this, arguments); };

/* ---------- על המפה, רק ביום שבו בחרת "הולך": נקודה + מסלול הליכה מהמלון ---------- */
let mk = null;
function curSlot() { try { if (!P || !P.lat || (window.__mapClean && window.__mapClean.S.all)) return null; const d = plan[curDay]; return d ? slots().find(x => x.date === d.date && dec(x) === "go") || null : null; } catch (e) { return null; } }
function drawPv() {
  try { if (typeof map === "undefined" || !map || !map.getStyle || !map.getStyle()) return; const s = curSlot(), dst = s && { lat: P.lat, lng: P.lng };
    if (!s) { if (mk) { mk.remove(); mk = null; } if (map.getSource("pvline")) map.getSource("pvline").setData(emptyFC); return; }
    if (!mk) { const c = document.createElement("div"); c.className = "mkc stop"; c.style.zIndex = 6;
      c.innerHTML = `<button type="button" class="pin lb" aria-label="${esc(P.name || "")}"><span class="pin-n" style="font-size:17px">🌙</span><span class="pin-l">${esc(P.name || "")}</span></button>`;
      c.firstChild.addEventListener("click", e => { e.stopPropagation(); open(curSlot()); }); mk = new maplibregl.Marker({ element: c }).setLngLat([dst.lng, dst.lat]).addTo(map); }
    else mk.setLngLat([dst.lng, dst.lat]);
    if (!map.getSource("pvline")) { map.addSource("pvline", { type: "geojson", data: emptyFC });
      map.addLayer({ id: "pvline", type: "line", source: "pvline", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": DAYC[curDay] || "#5c6470", "line-width": 4.5, "line-opacity": 0.9, "line-dasharray": [1.2, 1.1] } }); }
    else map.setPaintProperty("pvline", "line-color", DAYC[curDay] || "#5c6470");
    const h = place("hotel"); if (!h || h.lat == null) return; const r = getRoute(h, dst);
    map.getSource("pvline").setData(r && r.coords && r.coords.length > 1 ? { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: r.coords } } : { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[h.lng, h.lat], [dst.lng, dst.lat]] } });
  } catch (e) {}
}
["drawMarkers", "drawRoute"].forEach(f => { if (typeof window[f] === "function") window[f] = (o => function () { const r = o.apply(this, arguments); drawPv(); return r; })(window[f]); });
const hookMap = () => { if (typeof map === "undefined" || !map || !map.on) return setTimeout(hookMap, 500); map.on("style.load", () => setTimeout(drawPv, 80)); drawPv(); }; hookMap();

const kick = () => { if (!window.__ui) return setTimeout(kick, 400); load(); };
kick(); setInterval(() => { if (!document.hidden) load(); }, 60000);
(window.__mods = window.__mods || {}).priv = "ok";
} catch (err) { try { (window.__mods = window.__mods || {}).priv = "fail"; } catch (e) {} }
})();
