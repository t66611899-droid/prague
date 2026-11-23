/* cine: "פתיח קולנועי" לכל יום, בהשראת פתיחי משימות של משחקי עולם פתוח — עיצוב מקורי לגמרי (בלי לוגו, פונט, דמויות או אלמנט של משחק קיים).
   • פתיח יומי: פסים קולנועיים, טיסת מצלמה נמוכה ב-3D מעל עצירות היום, כותרת בחבטה, משימה, פאנלים בסגנון פוסטר מאויר, סטטיסטיקות, "▶ יאללה".
   • יום הטיסה (אחרי הנחיתה): כרטיס עלייה שנקרע, טיסה מתל אביב מעל הים לפראג בלילה, "ברוך הבא · הרמה הראשונה נפתחה", ואז מדריך המלון.
   • תקציר סוף יום: המסלול שהלכת בפועל (GPS) נמתח על המפה, התמונות מהיומן קופצות במקומן, "משימה הושלמה ✓", ושליחה להורים.
   • טריילר הטיול (4.12): כל חמשת הימים ברצף, ופוסטר להורדה/שיתוף.
   כללים: פעם ביום אוטומטית, "דלג" תמיד גלוי, רק transform/opacity, גרסה קלה כשהמכשיר חלש / הסוללה נמוכה / "הפחתת תנועה". סאונד רק אם הודלק. */
/* מוגן: המודול כולו בתוך פונקציה עם try. אם משהו כאן נכשל (גם בדפדפן ישן), שאר האפליקציה עולה כרגיל, רק בלי הפתיחים. */
(function () {
"use strict";
try {
const CINE_MISSION = ["להגיע לפראג בשלום ולמצוא את המעטפה", "לשרוד את הקור ולהגיע לסירה ב-19:00", "לכבוש את התצפיות ולהגיע ל-EPIC עם דרכון", "למלא את התיק (עד 8 ק\"ג!) ולהגיע ל-Duplex אחרי חצות", "מס עירוני, Bolt, והמראה ב-12:45"];
const cineLight = () => REDUCED || saver || (navigator.deviceMemory && navigator.deviceMemory < 3) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) || (window._batt && window._batt.level < 0.2 && !window._batt.charging) || QS.get("cine") === "light";
const canFly = () => !cineLight() && typeof map !== "undefined" && map && map.isStyleLoaded && map.isStyleLoaded(); // המפה מוכנה לטיסת מצלמה
const cineSeen = () => LS.get("cineSeen", {});
const cineMark = k => { const s = cineSeen(); s[k] = 1; LS.set("cineSeen", s); };
const wait = ms => new Promise(r => setTimeout(r, ms));
let CN = null; // הסצנה הפעילה
try { Object.defineProperty(window, "__cineActive", { get: () => !!CN, configurable: true }); } catch (e) {}

/* ---------- סאונד (מסונתז, בלי קבצים), רק אם הודלק ---------- */
let _ac = null;
const sfx = kind => { if (!settings.cineSound) return; try { _ac = _ac || new (window.AudioContext || window.webkitAudioContext)(); const ac = _ac, t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination);
  if (kind === "slam") { o.type = "sine"; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.35); g.gain.setValueAtTime(0.55, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.45); o.start(t); o.stop(t + 0.5);
    const n = ac.createBufferSource(), b = ac.createBuffer(1, ac.sampleRate * 0.2, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3); n.buffer = b; const ng = ac.createGain(); ng.gain.value = 0.25; n.connect(ng); ng.connect(ac.destination); n.start(t); }
  else if (kind === "tick") { o.type = "square"; o.frequency.setValueAtTime(880, t); g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06); o.start(t); o.stop(t + 0.07); }
  else if (kind === "win") { [523, 659, 784, 1047].forEach((f, i) => { const o2 = ac.createOscillator(), g2 = ac.createGain(); o2.type = "triangle"; o2.frequency.value = f; o2.connect(g2); g2.connect(ac.destination); g2.gain.setValueAtTime(0.0001, t + i * 0.09); g2.gain.exponentialRampToValueAtTime(0.18, t + i * 0.09 + 0.02); g2.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.5); o2.start(t + i * 0.09); o2.stop(t + i * 0.09 + 0.55); }); }
  else if (kind === "whoosh") { const n = ac.createBufferSource(), b = ac.createBuffer(1, ac.sampleRate * 1.2, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / d.length) * 0.5; n.buffer = b; const f = ac.createBiquadFilter(); f.type = "bandpass"; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2400, t + 1.1); n.connect(f); f.connect(g); g.gain.value = 0.35; n.start(t); }
} catch (e) {} };
const thump = () => { sfx("slam"); try { navigator.vibrate && navigator.vibrate([18, 30, 12]); } catch (e) {} };

/* ---------- השלד: פסים, דלג, סאונד ---------- */
function cineOpen(cls) {
  cineClose(true); const el = document.createElement("div"); el.id = "cine"; el.className = cls + (cineLight() ? " lite" : "");
  el.innerHTML = `<i class="cn-bar t"></i><i class="cn-bar b"></i><div class="cn-stage"></div>
    <button class="cn-skip" aria-label="דלג">דלג ⏭</button><button class="cn-snd" aria-label="סאונד">${settings.cineSound ? "🔊" : "🔇"}</button>`;
  document.body.appendChild(el); document.body.classList.add("cine-on");
  const run = { el, stage: el.querySelector(".cn-stage"), dead: false, tm: [] };
  el.querySelector(".cn-skip").onclick = () => { buzz(8); cineClose(); };
  el.querySelector(".cn-snd").onclick = e => { settings.cineSound = !settings.cineSound; saveSet(); e.target.textContent = settings.cineSound ? "🔊" : "🔇"; if (settings.cineSound) sfx("tick"); };
  requestAnimationFrame(() => el.classList.add("in")); CN = run; return run;
}
function cineClose(silent) {
  const r = CN; if (!r) return; CN = null; r.dead = true; r.tm.forEach(clearTimeout); try { map.stop(); } catch (e) {} cineClearMap();
  r.el.classList.add("out"); document.body.classList.remove("cine-on"); setTimeout(() => r.el.remove(), silent ? 0 : 450);
  if (!silent) { window.__cineLand = false; try { flyDay(curDay); } catch (e) {} if (r.onEnd) r.onEnd(); } // נוחתים חזרה על היום במפה
}
const alive = r => r && !r.dead && CN === r;
const step = async (r, ms) => { await wait(ms); return alive(r); };
async function mapReadyP(ms = 6000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (map && map.isStyleLoaded && map.isStyleLoaded()) return true; await wait(150); } return !!map; }

/* ---------- פאנלים בסגנון פוסטר מאויר: תמונה של המקום עם פילטר "דיו + רסטר", או איור וקטורי כשאין רשת ---------- */
const POSTER_FX = `<svg width="0" height="0" style="position:absolute"><filter id="cnInk"><feColorMatrix type="saturate" values="1.55"/><feComponentTransfer><feFuncR type="discrete" tableValues="0 .22 .45 .7 .9 1"/><feFuncG type="discrete" tableValues="0 .22 .45 .7 .9 1"/><feFuncB type="discrete" tableValues="0 .22 .45 .7 .9 1"/></feComponentTransfer></filter></svg>`;
async function panelFor(s, i, di) {
  const inf = sinfo(s), l = loc(s), name = (l && l.name) || s.n, col = DAYC[di] || "#d42a33"; let img = null;
  try { if (inf.wiki && !isOffline()) img = await Promise.race([wikiImg(inf.wiki), wait(1800).then(() => null)]); else if (inf.wiki) img = (LS.get("wiki", {}))[inf.wiki] || null; } catch (e) {}
  return `<figure class="cn-pn" style="--c:${col};--r:${[-4, 3, -2, 4][i % 4]}deg">${img ? `<img src="${esc(img)}" alt="" style="filter:url(#cnInk) contrast(1.15)">` : `<div class="cn-vec"><span>${inf.ic || "📍"}</span></div>`}<i class="cn-dots"></i>
    <figcaption><b>${esc(name)}</b><small>${String(Math.floor(pm(s) / 60) % 24).padStart(2, "0")}:${String(pm(s) % 60).padStart(2, "0")}</small></figcaption></figure>`;
}
const keyStops = di => { const seen = new Set(); return plan[di].stops.filter(s => loc(s) && s.at !== "hotel" && !isAirport(loc(s)) && (s.big || sinfo(s).big || sinfo(s).ty === "party")).filter(s => !seen.has(s.at || s.id) && seen.add(s.at || s.id)).slice(0, 4); };
function dayStats(di) {
  const L = dayLine(di), km = L.legs.reduce((a, l) => a + (l.cum[l.cum.length - 1] || 0), 0) / 1000, wd = typeof wxDay === "function" ? wxDay(plan[di].date) : null;
  const t = wd ? Math.round((wd.max + wd.min) / 2) : 2, cold = Math.max(5, Math.min(100, Math.round((12 - t) * 5 + (wd && wd.snow > 0.2 ? 15 : 0)))), party = plan[di].stops.filter(s => sinfo(s).ty === "party").length;
  return { km, stops: plan[di].stops.filter(s => loc(s)).length, t, wd, cold, energy: Math.max(20, Math.min(100, Math.round(km * 9 + party * 22 + 20))) };
}
const bar = (label, v, cls) => `<div class="cn-meter ${cls || ""}"><span>${label}</span><i><s style="--v:${v}%"></s></i><b>${v}%</b></div>`;
function countUp(el, to, dec, ms = 900) { const t0 = performance.now(); const f = now => { const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = (to * e).toFixed(dec); if (k < 1 && document.body.contains(el)) requestAnimationFrame(f); }; requestAnimationFrame(f); }

/* ---------- פתיח יומי ---------- */
async function cineDay(di, opts = {}) {
  di = Math.max(0, Math.min(plan.length - 1, di)); const r = cineOpen("cn-day"), day = plan[di], dd = dayDate(day.date), ks = keyStops(di), S = dayStats(di), lite = cineLight();
  r.onEnd = opts.onEnd; if (!opts.replay) cineMark("d" + day.date);
  r.stage.innerHTML = `${POSTER_FX}<div class="cn-title"><small>יום ${di + 1} · ${dd.dow} ${dd.dm}</small><h1>${esc(day.title)}</h1><p><b>משימה:</b> ${esc(CINE_MISSION[di] || "ליהנות")}</p></div>
    <div class="cn-panels"></div><div class="cn-stats" hidden><div class="cn-nums"><div><b data-n="${S.km.toFixed(1)}" data-d="1">0</b><small>ק"מ הליכה</small></div><div><b data-n="${S.stops}" data-d="0">0</b><small>עצירות</small></div><div><b data-n="${S.t}" data-d="0">0</b><small>מעלות</small></div></div>${bar("רמת קור", S.cold, "cold")}${bar("אנרגיה נדרשת", S.energy, "nrg")}</div>
    <button class="cn-go" hidden>▶ יאללה</button>`;
  r.stage.querySelector(".cn-go").onclick = () => { buzz(10); cineClose(); };
  const ready = lite ? false : await Promise.race([mapReadyP(), wait(2500).then(() => false)]); if (!alive(r)) return;
  const pts = ks.map(s => loc(s)), cen = pts[0] || { lng: 14.4213, lat: 50.0875 };
  if (canFly()) { try { map.jumpTo({ center: [cen.lng, cen.lat], zoom: 14.2, pitch: 62, bearing: -30 }); } catch (e) {} }
  if (!await step(r, 380)) return; r.el.classList.add("t1"); thump();                               // הכותרת בחבטה
  const panels = await Promise.all(ks.map((s, i) => panelFor(s, i, di))); if (!alive(r)) return;
  r.stage.querySelector(".cn-panels").innerHTML = panels.join("");
  const pEls = [...r.stage.querySelectorAll(".cn-pn")];
  if (!await step(r, 1100)) return; r.el.classList.add("t2");
  for (let i = 0; i < Math.max(1, pEls.length); i++) {                                               // הפאנלים מתחלפים, והמצלמה טסה נמוך מעל כל עצירה
    pEls.forEach((p, j) => p.classList.toggle("on", j === i)); if (pEls[i]) sfx("tick");
    if (canFly() && pts[i]) try { map.flyTo({ center: [pts[i].lng, pts[i].lat], zoom: 16.3, pitch: 66, bearing: -30 + i * 38, duration: 1250, curve: 1.2, essential: true }); } catch (e) {}
    if (!await step(r, pEls.length ? 1150 : 600)) return;
  }
  pEls.forEach(p => p.classList.remove("on")); r.el.classList.add("t3"); const st = r.stage.querySelector(".cn-stats"); st.hidden = false;
  st.querySelectorAll("[data-n]").forEach(b => countUp(b, +b.dataset.n, +b.dataset.d)); if (canFly()) try { map.easeTo({ ...map.cameraForBounds(dayLine(di).pts.reduce((b, p) => b.extend(p.p), new maplibregl.LngLatBounds(pts[0] ? [pts[0].lng, pts[0].lat] : [14.42, 50.08], pts[0] ? [pts[0].lng, pts[0].lat] : [14.42, 50.08])), { padding: { top: 120, bottom: 300, left: 40, right: 40 } }), pitch: 50, bearing: -12, duration: 1500 }); } catch (e) { try { flyDay(di); } catch (e2) {} }
  if (!await step(r, 1500)) return; r.stage.querySelector(".cn-go").hidden = false; r.el.classList.add("t4");
  r.tm.push(setTimeout(() => alive(r) && cineClose(), opts.replay ? 12000 : 6000));
}

/* ---------- יום הטיסה: כרטיס נקרע → טיסה מעל הים → נחיתה בפראג בלילה ---------- */
async function cineFlight(opts = {}) {
  const r = cineOpen("cn-fly"), lite = cineLight(); r.onEnd = opts.onEnd; if (!opts.replay) cineMark("flight");
  r.stage.innerHTML = `<div class="cn-sky"><i class="cl a"></i><i class="cl b"></i><i class="cl c"></i></div>
    <div class="cn-pass"><div class="pa"><small>BOARDING PASS · כרטיס עלייה</small><b>TLV <em>✈</em> PRG</b><span>30.11 · 18:25 · QS1285</span></div><div class="pb"><small>שער</small><b>B</b></div></div>
    <svg class="cn-plane" viewBox="0 0 64 64" aria-hidden="true"><path d="M30 4c2 0 3 2 3 5v14l22 12v5l-22-6v12l7 5v4l-10-3-10 3v-4l7-5V34L5 40v-5l22-12V9c0-3 1-5 3-5z" fill="#fff"/></svg>
    <div class="cn-land"><small>21:35 · Václav Havel Airport</small><h1>ברוך הבא לפראג 🇨🇿</h1><p class="cn-lvl"><i>🔓</i> הרמה הראשונה נפתחה</p></div>
    <div class="cn-lights"></div><button class="cn-go" hidden>▶ למדריך המלון</button>`;
  r.stage.querySelector(".cn-lights").innerHTML = Array.from({ length: 36 }, (_, i) => `<i style="left:${(i * 53) % 100}%;top:${48 + ((i * 29) % 40)}%;--d:${(i % 7) * 0.12}s"></i>`).join("");
  r.stage.querySelector(".cn-go").onclick = () => { buzz(10); cineClose(); setTimeout(() => typeof openArrive === "function" && openArrive(), 350); };
  const ready = lite ? false : await Promise.race([mapReadyP(), wait(2500).then(() => false)]); if (!alive(r)) return;
  if (!await step(r, 500)) return; r.el.classList.add("f1"); sfx("tick"); try { navigator.vibrate && navigator.vibrate(12); } catch (e) {}        // הכרטיס נקרע
  if (!await step(r, 1100)) return; r.el.classList.add("f2"); sfx("whoosh");                                                                     // ממריאים
  if (!canFly()) await Promise.race([mapReadyP(2000), wait(2000)]);                                            // נותנים למפה עוד רגע להיטען
  if (canFly()) try { map.jumpTo({ center: [34.8, 32.05], zoom: 5.6, pitch: 35, bearing: -20 }); map.flyTo({ center: [14.26, 50.1], zoom: 9.4, pitch: 50, bearing: -15, duration: 4300, curve: 1.6, essential: true }); } catch (e) {}
  if (!await step(r, 4300)) return; r.el.classList.add("f3"); thump(); if (typeof snowBurst === "function") try { snowBurst(); } catch (e) {}       // נחיתה: אורות העיר, שלג
  if (canFly()) try { map.easeTo({ center: [14.42, 50.085], zoom: 12.3, pitch: 55, bearing: 10, duration: 2200 }); } catch (e) {}
  if (!await step(r, 1400)) return; r.el.classList.add("f4"); sfx("win");
  if (!await step(r, 900)) return; r.stage.querySelector(".cn-go").hidden = false;
  r.tm.push(setTimeout(() => { if (alive(r)) { cineClose(); setTimeout(() => typeof openArrive === "function" && openArrive(), 350); } }, 9000));
}

/* ---------- תקציר סוף יום ---------- */
const momentsOf = date => (typeof jr !== "undefined" ? jr : []).filter(m => m.date === date);
function cineClearMap() { try { ["cn-trail", "cn-trail-c"].forEach(id => map.getLayer(id) && map.removeLayer(id)); map.getSource("cn-trail") && map.removeSource("cn-trail"); } catch (e) {} (window._cnMk || []).forEach(m => m.remove()); window._cnMk = []; }
async function cineRecap(di, opts = {}) {
  const r = cineOpen("cn-rec"), day = plan[di], date = day.date, segs = trackSegs(date), walked = segs.length > 0, lite = cineLight(); r.onEnd = opts.onEnd; if (!opts.replay) cineMark("r" + date);
  let path = walked ? segs.flat() : []; if (!walked) dayLine(di).legs.forEach(l => path.push(...l.coords));
  const km = walked ? trackKm(date) : dayLine(di).legs.reduce((a, l) => a + (l.cum[l.cum.length - 1] || 0), 0) / 1000, ms = momentsOf(date), photos = ms.reduce((a, m) => a + ((m.media || []).length || (m.th || []).length), 0);
  const places = day.stops.filter(s => marks[s.id] === "done").length, nx = plan[di + 1];
  r.stage.innerHTML = `<div class="cn-title"><small>תקציר · יום ${di + 1}</small><h1>${esc(day.title)}</h1><p>${walked ? "המסלול שהלכת בפועל" : "המסלול של היום"}</p></div>
    <div class="cn-stats" hidden><div class="cn-nums four"><div><b data-n="${km.toFixed(1)}" data-d="1">0</b><small>ק"מ</small></div><div><b data-n="${Math.round(km * 1350)}" data-d="0">0</b><small>צעדים בערך</small></div><div><b data-n="${places}" data-d="0">0</b><small>מקומות</small></div><div><b data-n="${photos}" data-d="0">0</b><small>תמונות</small></div></div></div>
    <div class="cn-done" hidden><h2>משימה הושלמה ✓</h2><p>${nx ? `מחר: <b>${esc(nx.title)}</b>` : "מחר: הביתה ✈️"}</p><div class="row"><button class="btn pri" id="cnSend">💌 לשלוח להורים</button><button class="btn" id="cnClose">סגור</button></div></div>`;
  r.stage.querySelector("#cnClose").onclick = () => cineClose();
  r.stage.querySelector("#cnSend").onclick = async e => { const b = e.target; b.disabled = true; b.textContent = "מכין…"; try { const thumbs = []; for (const m of ms.slice(0, 3)) { const xm = (m.media || [])[0], u = xm ? await thumbUrl(xm.id) : (m.th || [])[0]; if (u) thumbs.push(u); } const blob = await recapPoster(di, { km, places, photos, thumbs }); await addMoment([new File([blob], "recap.jpg", { type: "image/jpeg" })], `תקציר יום ${di + 1}: ${km.toFixed(1)} ק"מ, ${places} מקומות, ${photos} תמונות 🏁`, ["משימה הושלמה ✓"], "p", null, () => {}); b.textContent = "נשלח 💌"; toast("התקציר נשלח לדף ההורים 💌"); } catch (err) { b.disabled = false; b.textContent = "💌 לשלוח להורים"; toast("לא הצלחתי להכין את התקציר"); } };
  const ready = lite ? false : await Promise.race([mapReadyP(), wait(2500).then(() => false)]); if (!alive(r)) return;
  if (!await step(r, 350)) return; r.el.classList.add("t1"); thump();
  if (canFly() && path.length > 1) {
    try { const b = path.reduce((b, p) => b.extend(p), new maplibregl.LngLatBounds(path[0], path[0])); map.fitBounds(b, { padding: { top: 170, bottom: 260, left: 40, right: 40 }, pitch: 45, bearing: -15, duration: 1400, maxZoom: 15.5 });
      map.addSource("cn-trail", { type: "geojson", data: { type: "Feature", geometry: { type: "LineString", coordinates: [path[0]] } } });
      map.addLayer({ id: "cn-trail-c", type: "line", source: "cn-trail", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#fff", "line-width": 9, "line-opacity": 0.85 } });
      map.addLayer({ id: "cn-trail", type: "line", source: "cn-trail", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#e8a317", "line-width": 5 } }); } catch (e) {}
    const N = path.length, dur = 3200, t0 = performance.now(), pins = ms.filter(m => m.lat != null), shown = new Set();
    await new Promise(res => { const f = now => { if (!alive(r)) return res(); const k = Math.min(1, (now - t0) / dur), n = Math.max(2, Math.floor(N * k)); try { map.getSource("cn-trail").setData({ type: "Feature", geometry: { type: "LineString", coordinates: path.slice(0, n) } }); } catch (e) {}
        const tip = path[n - 1]; pins.forEach(m => { if (shown.has(m.id) || !tip) return; if (k > 0.98 || hav({ lng: tip[0], lat: tip[1] }, m) < 120) { shown.add(m.id); cinePin(m); sfx("tick"); } });  // התמונה קופצת כשהקו מגיע למקום שבו צילמת
        if (k < 1) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
  } else if (!await step(r, 1600)) return;
  if (!alive(r)) return; r.el.classList.add("t3"); const st = r.stage.querySelector(".cn-stats"); st.hidden = false; st.querySelectorAll("[data-n]").forEach(b => countUp(b, +b.dataset.n, +b.dataset.d));
  if (!await step(r, 1300)) return; r.el.classList.add("t4"); r.stage.querySelector(".cn-done").hidden = false; sfx("win"); try { navigator.vibrate && navigator.vibrate([10, 40, 10, 40, 30]); } catch (e) {}
}
async function cinePin(m) { const x = (m.media || [])[0], u = x ? await thumbUrl(x.id) : (m.th || [])[0]; if (!u || !CN) return; const el = document.createElement("div"); el.className = "cn-pin"; el.innerHTML = `<img src="${u}" alt="">`; (window._cnMk = window._cnMk || []).push(new maplibregl.Marker({ element: el }).setLngLat([m.lng, m.lat]).addTo(map)); }
async function recapPoster(di, s, trailer) { // תמונה 1080×1350 לשליחה להורים / שיתוף
  const W = 1080, H = trailer ? 1920 : 1350, c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d"); try { await document.fonts.load("800 90px Rubik"); } catch (e) {}
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#0c1536"); g.addColorStop(0.6, "#27306a"); g.addColorStop(1, "#8a3a52"); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = "rgba(255,255,255,.05)"; for (let i = 0; i < 260; i++) { x.beginPath(); x.arc((i * 97) % W, (i * 61) % H, 3, 0, 7); x.fill(); }
  x.fillStyle = "#000"; x.fillRect(0, 0, W, 90); x.fillRect(0, H - 90, W, 90); x.direction = "rtl"; x.textAlign = "right";
  x.fillStyle = "#e8a317"; x.font = "700 44px Rubik, sans-serif"; x.fillText(trailer ? "פראג · 30.11–4.12.2026" : `תקציר · יום ${di + 1}`, W - 70, 190);
  x.fillStyle = "#fff"; x.font = "800 96px Rubik, sans-serif"; x.save(); x.translate(W - 70, 320); x.transform(1, 0, -0.12, 1, 0, 0); x.fillText(trailer ? "הטיול הושלם" : plan[di].title.slice(0, 18), 0, 0); x.restore();
  const items = trailer ? [["ק\"מ", s.km.toFixed(1)], ["מקומות", s.places], ["תמונות", s.photos], ["ימים", 5]] : [["ק\"מ", s.km.toFixed(1)], ["צעדים", Math.round(s.km * 1350).toLocaleString("en")], ["מקומות", s.places], ["תמונות", s.photos]];
  items.forEach((it, i) => { const bx = W - 70 - (i % 2) * 480, by = 420 + Math.floor(i / 2) * 230; x.fillStyle = "rgba(255,255,255,.1)"; x.beginPath(); x.roundRect ? x.roundRect(bx - 440, by, 440, 200, 28) : x.rect(bx - 440, by, 440, 200); x.fill(); x.fillStyle = "#fff"; x.font = "800 86px Rubik, sans-serif"; x.fillText(String(it[1]), bx - 40, by + 110); x.fillStyle = "rgba(255,255,255,.75)"; x.font = "500 38px Rubik, sans-serif"; x.fillText(it[0], bx - 40, by + 168); });
  const thumbs = (s.thumbs || []).slice(0, trailer ? 6 : 3); for (let i = 0; i < thumbs.length; i++) { try { const im = await new Promise((res, rej) => { const q = new Image(); q.onload = () => res(q); q.onerror = rej; q.src = thumbs[i]; }); const sz = trailer ? 300 : 262, col = i % 3, row = Math.floor(i / 3), px = (trailer ? 70 : 92) + col * (sz + (trailer ? 25 : 40)), py = (trailer ? 940 : 872) + row * (sz + 25); x.save(); x.translate(px + sz / 2, py + sz / 2); x.rotate([-0.05, 0.04, -0.02, 0.05, -0.04, 0.03][i]); x.fillStyle = "#fff"; x.fillRect(-sz / 2 - 10, -sz / 2 - 10, sz + 20, sz + 20); const k = Math.max(sz / im.width, sz / im.height); x.beginPath(); x.rect(-sz / 2, -sz / 2, sz, sz); x.clip(); x.drawImage(im, -im.width * k / 2, -im.height * k / 2, im.width * k, im.height * k); x.restore(); } catch (e) {} }
  x.fillStyle = "#e8a317"; x.font = "800 60px Rubik, sans-serif"; x.fillText(trailer ? "✓ הושלם" : "✓ משימה הושלמה", W - 70, H - 150);
  return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error("blob")), "image/jpeg", 0.9));
}

/* ---------- טריילר הטיול ---------- */
async function cineTrailer(opts = {}) {
  const r = cineOpen("cn-tr"), lite = cineLight(); r.onEnd = opts.onEnd; if (!opts.replay) cineMark("trailer");
  const all = typeof jr !== "undefined" ? [...jr].sort((a, b) => a.t - b.t) : [], hearts = m => ((typeof jrRe !== "undefined" && jrRe[m.id]) || []).filter(x => x.h).length;
  const walkedAll = plan.reduce((a, d) => a + (trackKm(d.date) || 0), 0), plannedAll = plan.reduce((a, d, i) => a + dayLine(i).legs.reduce((b, l) => b + (l.cum[l.cum.length - 1] || 0), 0), 0) / 1000;
  const tot = { km: walkedAll || plannedAll, places: plan.reduce((a, d) => a + d.stops.filter(s => marks[s.id] === "done").length, 0) || plan.reduce((a, d) => a + d.stops.filter(s => loc(s)).length, 0), photos: all.reduce((a, m) => a + ((m.media || []).length || (m.th || []).length), 0) };
  r.stage.innerHTML = `<div class="cn-title"><small></small><h1></h1><p></p></div><div class="cn-pola"></div>
    <div class="cn-end" hidden><small>30.11–4.12.2026</small><h1>פראג · הושלם</h1><div class="cn-nums four"><div><b data-n="${tot.km.toFixed(1)}" data-d="1">0</b><small>ק"מ</small></div><div><b data-n="${tot.places}" data-d="0">0</b><small>מקומות</small></div><div><b data-n="${tot.photos}" data-d="0">0</b><small>תמונות</small></div><div><b data-n="5" data-d="0">0</b><small>ימים</small></div></div>
    <div class="row"><button class="btn pri" id="cnPoster">⬇️ פוסטר להורדה / שיתוף</button><button class="btn" id="cnClose2">סגור</button></div></div>`;
  r.stage.querySelector("#cnClose2").onclick = () => cineClose();
  const thumbsAll = []; for (const m of [...all].sort((a, b) => hearts(b) - hearts(a)).slice(0, 6)) { const xm = (m.media || [])[0]; const u = xm ? await thumbUrl(xm.id) : (m.th || [])[0]; if (u) thumbsAll.push(u); }
  r.stage.querySelector("#cnPoster").onclick = async e => { const b = e.target; b.disabled = true; try { const blob = await recapPoster(0, { ...tot, thumbs: thumbsAll }, true), f = new File([blob], "prague-trip.jpg", { type: "image/jpeg" });
    if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: "פראג 2026" }); else { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "prague-trip.jpg"; document.body.appendChild(a); a.click(); a.remove(); } } catch (err) {} b.disabled = false; };
  const ready = lite ? false : await Promise.race([mapReadyP(), wait(2500).then(() => false)]); if (!alive(r)) return;
  const T = r.stage.querySelector(".cn-title"), P = r.stage.querySelector(".cn-pola");
  for (let di = 0; di < plan.length; di++) {
    const d = plan[di], dd = dayDate(d.date), ms = all.filter(m => m.date === d.date).sort((a, b) => hearts(b) - hearts(a)).slice(0, 2);
    T.querySelector("small").textContent = `יום ${di + 1} · ${dd.dow} ${dd.dm}`; T.querySelector("h1").textContent = d.title; T.querySelector("p").textContent = trackKm(d.date) ? `${trackKm(d.date).toFixed(1)} ק"מ ברגל` : "";
    r.el.classList.remove("t1"); void r.el.offsetWidth; r.el.classList.add("t1"); thump();
    if (canFly()) try { flyDay(di); } catch (e) {}
    const urls = []; for (const m of ms) { const xm = (m.media || [])[0]; const u = xm ? await thumbUrl(xm.id) : (m.th || [])[0]; if (u) urls.push(u); }
    P.innerHTML = urls.map((u, i) => `<img src="${u}" alt="" style="--r:${i ? 5 : -6}deg;--x:${i ? -60 : 60}px">`).join(""); P.classList.remove("on"); void P.offsetWidth; P.classList.add("on");
    if (!await step(r, lite ? 1300 : 1900)) return;
  }
  r.el.classList.remove("t1"); r.el.classList.add("t5"); P.innerHTML = ""; const end = r.stage.querySelector(".cn-end"); end.hidden = false; end.querySelectorAll("[data-n]").forEach(b => countUp(b, +b.dataset.n, +b.dataset.d, 1200)); sfx("win");
  if (canFly()) try { map.flyTo({ center: [14.4213, 50.0855], zoom: 12.2, pitch: 50, bearing: 0, duration: 2200 }); } catch (e) {}
}

/* ---------- מתי מנגנים ---------- */
function cinePick() { // מה לנגן אוטומטית עכשיו (או null)
  const T = tripNow(), seen = cineSeen(), w = wall().getTime(), f = QS.get("cine");
  if (f === "flight") return () => cineFlight(); if (f === "day") return () => cineDay(T.dayIdx >= 0 ? T.dayIdx : curDay); if (f === "recap") return () => cineRecap(T.dayIdx >= 0 ? T.dayIdx : curDay); if (f === "trailer") return () => cineTrailer();
  if (f === "0" || T.phase !== "during") return null;
  if (T.dayIdx === 0) return w >= T_LAND && !seen.flight ? () => cineFlight() : null;                          // יום הטיסה: רק אחרי הנחיתה
  if (T.min >= 26 * 60 && !seen["r" + T.date]) return () => cineRecap(T.dayIdx);                               // אחרי 02:00: התקציר של היום
  if (T.date === "2026-12-04" && T.min >= 11 * 60 && !seen.trailer) return () => cineTrailer();               // היום האחרון, בדרך הביתה: הטריילר
  if (!seen["d" + T.date] && T.min >= 5 * 60) return () => cineDay(T.dayIdx);                                   // בוקר: הפתיח של היום
  return null;
}
/* במקום מסך הפתיחה הרגיל (בזמן הטיול) או אחריו, ובכל חזרה לאפליקציה */
window.showSplash = (old => function (done) {
  let p = null; try { p = cinePick(); } catch (e) { p = null; } if (!p) return old.apply(this, arguments); // אם הבחירה נכשלה: מסך הפתיחה הרגיל
  window.__cineLand = true; try { done(); } catch (e) {} setTimeout(() => { try { p(); } catch (e) {} }, 60);
})(window.showSplash);
document.addEventListener("visibilitychange", () => { try { if (document.hidden || CN || !window.__booted || !$("#modal").hidden) return; const p = cinePick(); if (p) p(); } catch (e) {} });
/* "מספיק להיום" → קודם התקציר, ואז לילה טוב */
window.doEnough = (old => function () { let di = curDay; try { const T = tripNow(); di = T.dayIdx >= 0 ? T.dayIdx : curDay; } catch (e) {} old.apply(this, arguments); setTimeout(() => { try { closeModal(); cineRecap(di, { onEnd: () => typeof openGoodNight === "function" && openGoodNight(di) }); } catch (e) {} }, 250); })(window.doEnough);
/* לצפות שוב, מהתפריט */
function openCineMenu() {
  const T = tripNow(), di = T.dayIdx >= 0 ? T.dayIdx : curDay;
  openModal(`<h2>🎬 פתיחים ותקצירים</h2><p class="sub">מתנגנים לבד פעם ביום. כאן אפשר לצפות שוב. ${cineLight() ? "המכשיר במצב חיסכון, אז מוצגת גרסה קלה." : ""}</p>
    <div class="menu-top"><button class="big" data-c="day"><span>🎬</span>הפתיח של ${di === curDay ? "היום" : "יום " + (curDay + 1)}</button><button data-c="flight"><span>✈️</span>הטיסה לפראג</button><button data-c="recap"><span>🏁</span>תקציר היום</button><button class="mv" data-c="trailer"><span>🏆</span><div>טריילר הטיול<small>כל חמשת הימים ברצף, ופוסטר לשיתוף</small></div></button></div>
    <label class="sw"><span><b>סאונד בפתיחים</b><small>כבוי כברירת מחדל</small></span><input type="checkbox" id="cnSndSw" ${settings.cineSound ? "checked" : ""}><i></i></label>`, "tall");
  $$("#mbody [data-c]").forEach(b => b.onclick = () => { closeModal(); const k = b.dataset.c; setTimeout(() => k === "day" ? cineDay(curDay, { replay: 1 }) : k === "flight" ? cineFlight({ replay: 1 }) : k === "recap" ? cineRecap(curDay, { replay: 1 }) : cineTrailer({ replay: 1 }), 280); });
  $("#cnSndSw").onchange = e => { settings.cineSound = e.target.checked; saveSet(); if (settings.cineSound) sfx("tick"); };
}

/* ---------- עיצוב ---------- */
(() => { const st = document.createElement("style"); st.textContent = `
#cine{position:fixed;inset:0;z-index:9700;pointer-events:auto;color:#fff;font-family:Rubik,system-ui,sans-serif;direction:rtl;overflow:hidden}
#cine::before{content:"";position:absolute;inset:0;background:radial-gradient(120% 80% at 50% 40%,transparent 40%,rgba(0,0,0,.55));pointer-events:none}
#cine.cn-fly::before{background:linear-gradient(rgba(4,8,26,.5),rgba(4,8,26,.25) 50%,rgba(4,8,26,.65))}
.cn-bar{position:absolute;left:0;right:0;height:11vh;background:#000;z-index:3;transition:transform .7s cubic-bezier(.2,.8,.2,1)}
.cn-bar.t{top:0;transform:translateY(-100%)}.cn-bar.b{bottom:0;transform:translateY(100%)}
#cine.in .cn-bar{transform:none}#cine.out{opacity:0;transition:opacity .4s}#cine.out .cn-bar.t{transform:translateY(-100%)}#cine.out .cn-bar.b{transform:translateY(100%)}
.cn-skip,.cn-snd{position:absolute;z-index:5;top:calc(env(safe-area-inset-top,0px) + 2.2vh);height:40px;border:0;border-radius:20px;background:rgba(255,255,255,.14);color:#fff;font:600 .9rem Rubik,sans-serif;padding:0 14px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.cn-skip{inset-inline-start:14px}.cn-snd{inset-inline-end:14px;width:40px;padding:0}
.cn-stage{position:absolute;inset:11vh 0;z-index:2}
.cn-title{position:absolute;top:4vh;left:20px;right:20px;opacity:0;transform:translate3d(0,0,0) scale(1.9)}
#cine.t1 .cn-title{animation:cnSlam .55s cubic-bezier(.2,1.4,.4,1) forwards}
@keyframes cnSlam{0%{opacity:0;transform:scale(1.9)}55%{opacity:1;transform:scale(.96)}75%{transform:scale(1.02) rotate(-.6deg)}100%{opacity:1;transform:none}}
.cn-title small{display:inline-block;background:#e8a317;color:#14161b;font-weight:800;font-size:.8rem;letter-spacing:.06em;padding:4px 10px;transform:skew(-10deg)}
.cn-title h1{margin:8px 0 6px;font-size:clamp(2.1rem,10vw,3.4rem);font-weight:800;line-height:1.02;letter-spacing:-.02em;transform:skew(-8deg);text-shadow:0 4px 0 rgba(0,0,0,.35),0 0 30px rgba(0,0,0,.4);-webkit-text-stroke:1px rgba(0,0,0,.25)}
.cn-title p{margin:0;font-size:1rem;font-weight:500;text-shadow:0 2px 8px rgba(0,0,0,.7);max-width:30ch}.cn-title p b{color:#e8a317}
#cine.t3 .cn-title,#cine.t5 .cn-title{transition:transform .6s,opacity .6s;transform:translateY(-6px) scale(.86);transform-origin:100% 0}
.cn-panels{position:absolute;left:0;right:0;top:30%;height:42%}
.cn-pn{position:absolute;inset:0 12%;margin:0;border:5px solid #fff;outline:3px solid #14161b;background:var(--c);transform:rotate(var(--r)) scale(.6) translate3d(0,40px,0);opacity:0;transition:transform .45s cubic-bezier(.2,1.3,.4,1),opacity .3s;box-shadow:12px 14px 0 rgba(0,0,0,.45);overflow:hidden}
.cn-pn.on{opacity:1;transform:rotate(var(--r)) scale(1)}
.cn-pn img{width:100%;height:100%;object-fit:cover;display:block}
.cn-dots{position:absolute;inset:0;background:radial-gradient(rgba(0,0,0,.32) 1.2px,transparent 1.6px) 0 0/7px 7px;mix-blend-mode:multiply;pointer-events:none}
.cn-vec{width:100%;height:100%;display:grid;place-items:center;background:radial-gradient(circle at 30% 30%,rgba(255,255,255,.35),transparent 55%),repeating-linear-gradient(-35deg,rgba(0,0,0,.12) 0 14px,transparent 14px 28px),var(--c)}
.cn-vec span{font-size:5.5rem;filter:drop-shadow(5px 6px 0 rgba(0,0,0,.4))}
.cn-pn figcaption{position:absolute;bottom:12px;inset-inline-start:12px;background:#ffe14d;color:#14161b;border:3px solid #14161b;padding:6px 12px;transform:skew(-8deg);display:flex;flex-direction:column;box-shadow:4px 4px 0 #14161b}
.cn-pn figcaption b{font-size:1.15rem;font-weight:800}.cn-pn figcaption small{font-weight:700;font-size:.8rem}
.cn-stats{position:absolute;left:16px;right:16px;bottom:9vh;background:rgba(10,12,26,.72);border:2px solid rgba(255,255,255,.18);border-radius:18px;padding:14px 16px;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);animation:cnUp .5s cubic-bezier(.2,1.2,.4,1)}
@keyframes cnUp{from{opacity:0;transform:translate3d(0,30px,0)}to{opacity:1;transform:none}}
.cn-nums{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center;margin-bottom:10px}.cn-nums.four{grid-template-columns:repeat(4,1fr)}
.cn-nums b{direction:ltr;unicode-bidi:isolate;display:block;font-size:1.9rem;font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-.02em}.cn-nums small{font-size:.74rem;opacity:.75}
.cn-meter{display:grid;grid-template-columns:7.5em 1fr 3em;align-items:center;gap:10px;margin-top:8px;font-size:.84rem;font-weight:600}
.cn-meter i{height:10px;border-radius:5px;background:rgba(255,255,255,.14);overflow:hidden;transform:skew(-14deg)}
.cn-meter s{display:block;height:100%;width:var(--v);background:linear-gradient(90deg,#2f7de1,#7fd3ff);animation:cnFill 1.1s cubic-bezier(.2,.8,.2,1)}
.cn-meter.nrg s{background:linear-gradient(90deg,#e8a317,#ff5a3c)}.cn-meter b{text-align:end;font-variant-numeric:tabular-nums}
@keyframes cnFill{from{width:0}}
.cn-go{position:absolute;left:50%;bottom:1.6vh;transform:translateX(-50%);min-height:56px;min-width:200px;border:0;border-radius:28px;background:#d42a33;color:#fff;font:800 1.2rem Rubik,sans-serif;box-shadow:0 8px 0 #8e1a21,0 14px 30px rgba(0,0,0,.4);animation:cnPop .5s cubic-bezier(.2,1.6,.4,1)}
.cn-go:active{transform:translateX(-50%) translateY(4px);box-shadow:0 4px 0 #8e1a21}
@keyframes cnPop{from{opacity:0;transform:translateX(-50%) scale(.5)}to{opacity:1;transform:translateX(-50%) scale(1)}}
/* יום הטיסה */
.cn-sky{position:absolute;inset:-11vh 0;pointer-events:none;opacity:0;transition:opacity .8s}
#cine.f2 .cn-sky{opacity:1}#cine.f3 .cn-sky{opacity:0}
.cn-sky .cl{position:absolute;width:70vw;height:22vh;border-radius:50%;background:radial-gradient(closest-side,rgba(255,255,255,.75),rgba(255,255,255,0));filter:blur(6px);animation:cnCloud 2.6s linear infinite}
.cn-sky .a{top:20%;animation-delay:0s}.cn-sky .b{top:52%;animation-delay:-1s;width:90vw}.cn-sky .c{top:75%;animation-delay:-1.8s}
@keyframes cnCloud{from{transform:translate3d(-120vw,0,0)}to{transform:translate3d(120vw,0,0)}}
.cn-pass{position:absolute;top:22%;left:8%;right:8%;display:flex;height:150px;filter:drop-shadow(0 12px 24px rgba(0,0,0,.45))}
.cn-pass>div{background:#f6f2ea;color:#14161b;display:flex;flex-direction:column;justify-content:center;padding:14px 18px;transition:transform .8s cubic-bezier(.3,.7,.3,1),opacity .8s}
.cn-pass .pa{flex:1;border-radius:16px 0 0 16px;border-inline-start:3px dashed #c9c0b0}.cn-pass .pb{width:90px;border-radius:0 16px 16px 0;align-items:center;background:#e8a317}
.cn-pass small{font-size:.66rem;letter-spacing:.08em;font-weight:700;opacity:.65}.cn-pass b{font-size:2rem;font-weight:800;letter-spacing:.02em}.cn-pass em{font-style:normal;color:#d42a33}.cn-pass span{font-size:.82rem;font-weight:600}
#cine.f1 .cn-pass .pb{transform:translate3d(40px,60px,0) rotate(28deg);opacity:0}#cine.f1 .cn-pass .pa{transform:rotate(-3deg)}
#cine.f2 .cn-pass{opacity:0;transform:scale(.8);transition:opacity .5s,transform .5s}
.cn-plane{position:absolute;left:50%;top:46%;width:74px;height:74px;margin:-37px;opacity:0;transform:rotate(-58deg) scale(.4);filter:drop-shadow(0 10px 8px rgba(0,0,0,.5));transition:opacity .5s,transform .9s cubic-bezier(.2,1.2,.4,1)}
#cine.f2 .cn-plane{opacity:1;transform:rotate(-58deg) scale(1)}#cine.f3 .cn-plane{opacity:0;transform:rotate(-58deg) scale(.3) translate3d(0,-80px,0)}
.cn-land{position:absolute;left:20px;right:20px;top:24%;text-align:center;opacity:0;transform:scale(1.8)}
#cine.f3 .cn-land{animation:cnSlam .6s cubic-bezier(.2,1.4,.4,1) forwards}
.cn-land small{font-weight:700;letter-spacing:.06em;opacity:.8}.cn-land h1{font-size:clamp(2.2rem,10vw,3.4rem);font-weight:800;margin:8px 0;transform:skew(-6deg);text-shadow:0 4px 0 rgba(0,0,0,.35)}
.cn-lvl{display:inline-flex;align-items:center;gap:8px;background:#e8a317;color:#14161b;font-weight:800;padding:8px 16px;border-radius:12px;transform:scale(0);transition:transform .5s cubic-bezier(.2,1.8,.4,1)}
#cine.f4 .cn-lvl{transform:scale(1)}.cn-lvl i{font-style:normal}
.cn-lights{position:absolute;inset:0;opacity:0;transition:opacity 1.2s;pointer-events:none}#cine.f3 .cn-lights{opacity:1}
.cn-lights i{position:absolute;width:5px;height:5px;border-radius:50%;background:#ffd27a;box-shadow:0 0 10px 3px rgba(255,190,90,.75);animation:cnTw 1.6s ease-in-out infinite var(--d)}
@keyframes cnTw{50%{opacity:.35}}
/* תקציר וטריילר */
.cn-pin{width:58px;height:58px;border-radius:50%;border:3px solid #fff;overflow:hidden;box-shadow:0 6px 16px rgba(0,0,0,.5);animation:cnPin .55s cubic-bezier(.2,1.7,.4,1)}.cn-pin img{width:100%;height:100%;object-fit:cover}
@keyframes cnPin{from{transform:scale(0) translate3d(0,20px,0)}to{transform:none}}
.cn-done{position:absolute;left:16px;right:16px;bottom:2vh;text-align:center;animation:cnUp .5s cubic-bezier(.2,1.2,.4,1)}
.cn-done h2{margin:0 0 6px;font-size:2.2rem;font-weight:800;color:#ffe14d;transform:skew(-8deg);text-shadow:0 4px 0 rgba(0,0,0,.5)}.cn-done p{margin:0 0 12px}.cn-done .row{justify-content:center;gap:10px}
#cine.cn-rec .cn-stats{bottom:22vh}
.cn-pola{position:absolute;left:0;right:0;top:34%;height:36%;display:flex;justify-content:center;align-items:center}
.cn-pola img{width:44vw;max-width:230px;aspect-ratio:1;object-fit:cover;border:8px solid #fff;border-bottom-width:28px;box-shadow:0 14px 30px rgba(0,0,0,.5);margin:0 -14px;transform:rotate(var(--r)) translate3d(var(--x),60px,0) scale(.6);opacity:0}
.cn-pola.on img{animation:cnPola .6s cubic-bezier(.2,1.4,.4,1) forwards}.cn-pola.on img:nth-child(2){animation-delay:.18s}
@keyframes cnPola{to{opacity:1;transform:rotate(var(--r)) translate3d(0,0,0) scale(1)}}
.cn-end{position:absolute;left:16px;right:16px;top:9%;text-align:center;background:rgba(10,12,26,.78);border:2px solid rgba(255,255,255,.16);border-radius:22px;padding:20px 14px;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);animation:cnUp .6s cubic-bezier(.2,1.2,.4,1)}
.cn-end small{color:#e8a317;font-weight:800;letter-spacing:.08em}.cn-end h1{font-size:clamp(2.4rem,11vw,3.8rem);font-weight:800;margin:6px 0 22px;transform:skew(-8deg);text-shadow:0 5px 0 rgba(0,0,0,.4)}
.cn-end .row{justify-content:center;gap:10px;margin-top:18px}
/* גרסה קלה: בלי טיסת מצלמה, בלי פילטרים כבדים */
#cine.lite .cn-pn img{filter:none!important}#cine.lite .cn-sky,#cine.lite .cn-dots{display:none}
#cine.lite::after{content:"";position:absolute;inset:0;z-index:0;background:linear-gradient(160deg,#0c1536,#27306a 55%,#8a3a52)}
#cine.lite .cn-stage{z-index:2}
body.cine-on #modal,body.cine-on #toast{opacity:0!important;pointer-events:none!important}
body.cine-on .maplibregl-marker:not(.cn-pin){opacity:0;transition:opacity .4s}
body.cine-on #hud,body.cine-on #fabs,body.cine-on #sheet,body.cine-on #playCard{opacity:0;pointer-events:none;transition:opacity .4s}
`; document.head.appendChild(st); })();

/* מה שאר האפליקציה (התפריט) ובדיקות צריכים לראות */
Object.assign(window, { openCineMenu, cineDay, cineFlight, cineRecap, cineTrailer, cineClose });
} catch (err) { try { console.warn("cine disabled:", err); window.openCineMenu = undefined; } catch (e) {} }
})();
