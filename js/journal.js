/* journal: יומן טיול להורים. רגעים עם תמונות, תור העלאה לאופליין, קישור סודי לדף ההורים, תגובות, מיקום כללי, הורדת זיפ.
   התמונות המלאות נשמרות בטלפון (IndexedDB) ועולות לשרת רק עם הסיסמה. מחליף את openDiary. */
"use strict";
const apiUrl = () => (QS.get("api") || (me.chatUrl && !/workers\.dev/.test(me.chatUrl) ? me.chatUrl : "") || CONFIG.chatUrl || "").replace(/\/+$/, ""); // כתובת workers.dev ישנה לא עובדת אצל חלק מהספקים
const apiTok = () => (me.chatTok || "").trim();
let jr = LS.get("jr", []), jrShare = LS.get("jrShare", ""), jrRe = LS.get("jrRe", {}), jrBusy = false;
const saveJr = () => { try { localStorage.setItem("prg.jr", JSON.stringify(jr)); } catch (e) { toast("נגמר המקום בטלפון ליומן"); } };

/* רגעים מהיומן הישן (תמונה אחת, רק בטלפון) עוברים ליומן החדש כ"רק לי" */
if (!LS.get("jrMig")) { LS.get("diary", []).forEach(x => jr.push({ id: "o" + Number(x.id).toString(36), t: +x.id, date: x.date, time: x.time, text: "", where: x.where || "", lat: x.lat == null ? null : +(+x.lat).toFixed(3), lng: x.lng == null ? null : +(+x.lng).toFixed(3), imgs: [], th: [x.img], vis: "me", st: "local", up: [] })); LS.set("jrMig", 1); if (jr.length) saveJr(); }

/* ---------- IndexedDB לתמונות המלאות ---------- */
const jdb = () => new Promise((res, rej) => { const r = indexedDB.open("prg-journal", 1); r.onupgradeneeded = () => r.result.createObjectStore("img"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const idb = async (mode, fn) => { const db = await jdb(); return new Promise((res, rej) => { const tx = db.transaction("img", mode), rq = fn(tx.objectStore("img")); tx.oncomplete = () => res(rq && rq.result); tx.onerror = () => rej(tx.error); }); };
const imgPut = (id, blob) => idb("readwrite", s => s.put(blob, id)), imgGet = id => idb("readonly", s => s.get(id)), imgDel = id => idb("readwrite", s => s.delete(id));
const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
function shrinkTo(file, max, q, asBlob) { // דחיסה בטלפון לפני העלאה, כדי לחסוך גלישה
  return new Promise((res, rej) => { const img = new Image(), u = URL.createObjectURL(file); img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); asBlob ? c.toBlob(b => b ? res(b) : rej(new Error("blob")), "image/jpeg", q) : res(c.toDataURL("image/jpeg", q)); }; img.onerror = () => rej(new Error("img")); img.src = u; });
}
function imgMeta(file) { // יחס התמונה + תמונה זעירה (20 פיקסלים) שמוצגת מטושטשת עד שהאמיתית נטענת
  return new Promise(res => { const img = new Image(), u = URL.createObjectURL(file); img.onload = () => { const ar = +(img.width / img.height).toFixed(3), c = document.createElement("canvas"); c.width = ar >= 1 ? 20 : Math.max(8, Math.round(20 * ar)); c.height = ar >= 1 ? Math.max(8, Math.round(20 / ar)) : 20; c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res({ ar, ph: c.toDataURL("image/jpeg", 0.5) }); }; img.onerror = () => res({ ar: 1.333, ph: "" }); img.src = u; });
}
const _tu = new Map();
const thumbUrl = id => { if (!_tu.has(id)) _tu.set(id, imgGet("t:" + id).then(b => b || imgGet(id)).then(b => b ? URL.createObjectURL(b) : "").catch(() => "")); return _tu.get(id); };
const fullUrl = id => imgGet(id).then(b => b ? URL.createObjectURL(b) : "");
// התמונות של רגע, בפורמט של הגלריה (כולל רגעים ישנים שנשמרו כתמונה קטנה בלבד)
const moImgs = m => m.imgs.length ? m.imgs.map((id, i) => ({ gid: id, ar: (m.ar || [])[i], ph: (m.ph || [])[i] || (m.th || [])[i] || "", src: (m.th || [])[i] || "", id })) : (m.th || []).map((t, i) => ({ gid: "L" + m.id + i, src: t, ph: t, old: t }));
function fillThumbs(root) { $$(".gc-i", root).forEach(b => { const img = b.querySelector("img"); if (img.getAttribute("src") || /^L/.test(b.dataset.g)) return; thumbUrl(b.dataset.g).then(u => { if (u) img.src = u; }); }); Gal.scan(root); }
function jrViewer(gid) { // כל התמונות של היומן ברצף אחד, לפי הזמן
  const items = []; [...jr].sort((a, b) => a.t - b.t).forEach(m => moImgs(m).forEach(x => items.push({ gid: x.gid, ar: x.ar, thumb: x.ph || x.src, load: x.old ? x.old : () => fullUrl(x.id), cap: `${m.text ? esc(m.text) : ""}<b>${dayDate(m.date).dow} ${dayDate(m.date).dm} · ${m.time} · ${esc(m.where || "פראג")}</b>` })));
  Gal.open(items, Math.max(0, items.findIndex(x => x.gid === gid)));
}
function jrReplay() { // ▶ הסרטון: טיסה על המפה מרגע לרגע
  const ms = [...jr].sort((a, b) => a.t - b.t); if (!ms.length) return toast("עוד אין רגעים ביומן"); closeModal(); if (typeof stopPlay === "function") try { stopPlay(); } catch (e) {}
  Gal.replay({ map, title: "פראג · " + ms.length + " רגעים", endTitle: "זה היה הטיול עד עכשיו", endText: `${ms.length} רגעים · ${ms.reduce((a, m) => a + moImgs(m).length, 0)} תמונות`,
    steps: ms.map(m => { const di = plan.findIndex(d => d.date === m.date); return { lat: m.lat, lng: m.lng, kicker: `${di >= 0 ? "יום " + (di + 1) + " · " : ""}${dayDate(m.date).dow} ${m.time}`, title: m.where || "פראג", text: m.text, imgs: moImgs(m).map(x => ({ thumb: x.ph || x.src, load: x.old ? x.old : () => fullUrl(x.id) })) }; }),
    onClose: () => { try { flyDay(curDay); } catch (e) {} openDiary(); } });
}
function whereNow() { const p = lastKnown(); if (!p) return { where: "פראג", lat: null, lng: null }; const k = nearestKnown(p); return { where: hav(p, k) < 250 ? k.name : nearestStreet(p) || (hav(p, k) < 900 ? "ליד " + k.name : "פראג"), lat: +p.lat.toFixed(3), lng: +p.lng.toFixed(3) }; }

/* ---------- רגע חדש ---------- */
async function addMoment(files, text, vis) {
  const T = tripNow(), w = whereNow(), mo = { id: rid(), t: Date.now(), date: T.phase === "during" ? T.date : dstr(T.w), time: clockNow(), text: (text || "").trim().slice(0, 400), where: w.where, lat: w.lat, lng: w.lng, imgs: [], th: [], ar: [], ph: [], vis: vis === "me" ? "me" : "p", st: vis === "me" ? "local" : "pending", up: [] };
  for (const f of [...files].slice(0, 6)) { const id = rid(), mt = await imgMeta(f); await imgPut(id, await shrinkTo(f, 1600, 0.8, true)); await imgPut("t:" + id, await shrinkTo(f, 640, 0.72, true)); mo.imgs.push(id); mo.ar.push(mt.ar); mo.ph.push(mt.ph); }
  jr.push(mo); saveJr(); flushJournal(); return mo;
}
async function api(path, opt = {}, ms = 25000) {
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(apiUrl() + path, { ...opt, headers: { "x-app-token": apiTok(), ...(opt.headers || {}) }, signal: ctl.signal }); const j = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error(j.error || "http " + r.status); e.status = r.status; throw e; } return j; } finally { clearTimeout(to); }
}
/* תור ההעלאה: רץ כשיש רשת וסיסמה. מה שלא עלה נשאר "ממתין" ויעלה בפעם הבאה */
async function flushJournal() {
  if (jrBusy || isOffline() || !apiTok() || !apiUrl()) return; jrBusy = true; let did = 0;
  try {
    for (const mo of jr.filter(m => m.st === "pending")) {
      for (const id of mo.imgs) { if ((mo.up || []).includes(id)) continue; const b = await imgGet(id); if (!b) continue; await api("/journal/img/" + id, { method: "PUT", headers: { "content-type": "image/jpeg" }, body: b }, 60000); (mo.up = mo.up || []).push(id); saveJr(); }
      await api("/journal/moment", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: mo.id, t: mo.t, date: mo.date, time: mo.time, text: mo.text, where: mo.where, lat: mo.lat, lng: mo.lng, imgs: mo.imgs, ar: mo.ar || [], ph: mo.ph || [], vis: mo.vis }) });
      mo.st = "up"; saveJr(); did++;
    }
    for (const id of LS.get("jrDel", [])) { await api("/journal/moment/" + id, { method: "DELETE" }); LS.set("jrDel", LS.get("jrDel", []).filter(x => x !== id)); }
    const T = tripNow(); if (T.phase === "during" && jrShare) { const body = JSON.stringify({ date: T.date, km: +trackKm(T.date).toFixed(1), places: plan[T.dayIdx].stops.filter(s => marks[s.id] === "done").length }); // רק כשמשהו השתנה, ולכל היותר פעם ב-10 דקות (חוסך כתיבות בשרת)
      if (body !== LS.get("jrStat", "") && Date.now() - LS.get("jrStatT", 0) > 6e5) { LS.set("jrStat", body); LS.set("jrStatT", Date.now()); api("/journal/stats", { method: "POST", headers: { "content-type": "application/json" }, body }).catch(() => {}); } }
    LS.del("jrErr");
  } catch (e) { LS.set("jrErr", e.status === 401 ? "הסיסמה לא תואמת לזו שבשרת" : e.message === "notset" ? "notset" : "אין חיבור לשרת כרגע"); }
  jrBusy = false; if (did) { toast(did === 1 ? "הרגע עלה ליומן ✓" : did + " רגעים עלו ליומן ✓"); if ($("#jrList")) openDiary(); }
}
async function pullReactions(quiet) { // "אמא הגיבה ❤️"
  if (isOffline() || !apiTok() || !apiUrl()) return;
  try { const j = await api("/journal", {}, 12000); jrShare = j.share || ""; LS.set("jrShare", jrShare); const old = jrRe; jrRe = j.re || {}; LS.set("jrRe", jrRe);
    if (!quiet) for (const id in jrRe) { const n = jrRe[id].length, o = (old[id] || []).length; if (n > o) { const r = jrRe[id][n - 1], mo = jr.find(m => m.id === id); toast(`${r.n} ${r.n === "אמא" ? "הגיבה" : r.n === "אבא" ? "הגיב" : "הגיבו"} ${r.h ? "❤️" : "💬"}${r.x ? ": " + r.x.slice(0, 40) : ""}${mo && mo.where ? " · " + mo.where : ""}`, 5200); buzz([15, 40, 15]); break; } }
    if ($("#jrList")) renderJrList();
  } catch (e) {}
}
/* מיקום חי להורים: רק אזור כללי (שם רחוב/שכונה ונקודה מעוגלת לקילומטר), כל 15 דקות, רק כשהמתג דלוק */
function liveTick() {
  if (!settings.live || isOffline() || !apiTok() || !gps) return; if (Date.now() - LS.get("liveT", 0) < 14 * 60000) return; LS.set("liveT", Date.now());
  const k = nearestKnown(gps); api("/journal/loc", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ where: hav(gps, k) < 700 ? "אזור " + k.name : nearestStreet(gps) || "פראג", lat: gps.lat, lng: gps.lng }) }).catch(() => {});
}

/* ---------- המסך ---------- */
const stLabel = m => m.vis === "me" ? `<i class="jb mine">🔒 רק לי</i>` : m.st === "up" ? `<i class="jb ok">👨‍👩‍👦 להורים ✓</i>` : `<i class="jb wait">⏳ ממתין להעלאה</i>`;
function renderJrList() {
  const box = $("#jrList"); if (!box) return; const days = {}; [...jr].sort((a, b) => b.t - a.t).forEach(m => (days[m.date] = days[m.date] || []).push(m));
  box.innerHTML = Object.keys(days).sort().reverse().map(d => { const di = plan.findIndex(x => x.date === d), ms = days[d], first = ms[ms.length - 1], cov = moImgs(first)[0] || (ms.map(m => moImgs(m)[0]).filter(Boolean)[0]), nph = ms.reduce((a, m) => a + moImgs(m).length, 0), km = (() => { try { return trackKm(d); } catch (e) { return 0; } })();
    return `<header class="jd"${cov && cov.ph ? ` style="background-image:url(${cov.ph})"` : ""}>${cov ? `<img alt="" data-cov="${cov.gid}"${cov.old ? ` src="${cov.old}"` : ""}>` : ""}<div><small>${di >= 0 ? "יום " + (di + 1) + " · " : ""}${dayDate(d).dow} ${dayDate(d).dm}</small><b>${di >= 0 ? bd(plan[di].title) : "רגעים"}</b><span>${km >= 0.1 ? km.toFixed(1) + ' ק"מ · ' : ""}${ms.length} ${ms.length === 1 ? "רגע" : "רגעים"} · ${nph} תמונות</span></div></header>` + ms.map(m => { const re = jrRe[m.id] || [];
    return `<article class="jm" data-jm="${m.id}">${Gal.collage(moImgs(m))}
      <div class="jm-b">${m.text ? `<p>${bd(m.text)}</p>` : ""}<small>${m.time} · ${bd(m.where || "פראג")}</small><div class="jm-f">${stLabel(m)}${re.length ? `<i class="jb re">${re.filter(r => r.h).length ? "❤️ " + re.filter(r => r.h).length : ""} ${re.filter(r => r.x).length ? "💬 " + re.filter(r => r.x).length : ""}</i>` : ""}</div>
      ${re.filter(r => r.x).slice(-2).map(r => `<p class="jm-re"><b>${esc(r.n)}:</b> ${bd(r.x)}</p>`).join("")}</div></article>`; }).join(""); }).join("") || emptyState("📷", "עוד אין רגעים", "תמונה ומשפט קצר, וההורים רואים את הטיול מתעדכן. המיקום והשעה נכנסים לבד.");
  $$("#jrList [data-jm]").forEach(a => a.onclick = e => { const g = e.target.closest(".gc-i"); if (g) jrViewer(g.dataset.g); else editMoment(a.dataset.jm); });
  $$("#jrList [data-cov]").forEach(i => { if (!i.getAttribute("src")) thumbUrl(i.dataset.cov).then(u => { if (u) { i.onload = () => i.classList.add("ld"); i.src = u; } }); else i.classList.add("ld"); });
  fillThumbs(box); Gal.reveal(box, ".jm,.jd");
}
function openDiary() {
  const pend = jr.filter(m => m.st === "pending").length, err = LS.get("jrErr", ""), ready = !!apiTok();
  openModal(`<h2>📔 יומן הטיול</h2><p class="sub">רגעים מהטיול, עם תמונה, מקום ושעה. מה שמסומן "להורים" מופיע אצלם בדף משלהם.</p>
    <button class="btn pri wide big" id="jrNew">📸 רגע חדש</button>
    <button class="btn wide" id="jrShareB">👨‍👩‍👦 ${!ready ? "לחבר את דף ההורים" : jrShare ? "דף ההורים והשיתוף" : "להפעיל את דף ההורים"}</button>
    ${pend ? `<p class="jr-note">${isOffline() ? "📡 בלי אינטרנט." : !ready ? "🔑 עוד לא הוקלדה סיסמה." : err && err !== "notset" ? "⚠️ " + esc(err) + "." : err === "notset" ? "🔑 השרת עוד לא הוגדר." : "⏳"} ${pend} ${pend === 1 ? "רגע ממתין" : "רגעים ממתינים"} להעלאה, ויעלו לבד.</p>` : ""}
    ${jr.length ? `<button class="btn wide jr-play" id="jrPlay">▶ לנגן את הטיול</button>` : ""}<div id="jrList"></div>`, "tall");
  if ($("#jrPlay")) $("#jrPlay").onclick = jrReplay;
  $("#jrNew").onclick = newMoment; $("#jrShareB").onclick = openShare; renderJrList(); flushJournal(); pullReactions(true);
}
function newMoment() {
  let files = [], vis = LS.get("jrVis", "p");
  openModal(`<h2>📸 רגע חדש</h2>
    <label class="jr-pick" id="jrPickL"><input id="jrF" type="file" accept="image/*" multiple hidden><span>📷</span><b>לצלם או לבחור תמונות</b><small>עד 6. מוקטנות בטלפון לפני העלאה</small></label>
    <div class="jr-prev" id="jrPrev"></div>
    <label class="fld">משפט קצר (לא חובה)<textarea id="jrT" rows="2" dir="auto" maxlength="400" placeholder="מה קורה פה?"></textarea></label>
    <p class="sub">📍 ${bd(whereNow().where)} · 🕐 ${clockNow()} · נכנסים לבד. נשמר שם המקום, לא נקודה מדויקת.</p>
    <div class="seg" id="jrVis"><button data-v="p">👨‍👩‍👦 להורים</button><button data-v="me">🔒 רק לי</button></div>
    <button class="btn pri wide big" id="jrSave" disabled>לשמור</button>`, "tall");
  const seg = () => $$("#jrVis button").forEach(b => b.classList.toggle("sel", b.dataset.v === vis)); seg();
  $$("#jrVis button").forEach(b => b.onclick = () => { vis = b.dataset.v; LS.set("jrVis", vis); seg(); });
  $("#jrF").onchange = e => { files = [...e.target.files].slice(0, 6); $("#jrPrev").innerHTML = files.map(f => `<img src="${URL.createObjectURL(f)}" alt="">`).join(""); $("#jrSave").disabled = !files.length; $("#jrPickL").classList.toggle("has", !!files.length); };
  $("#jrSave").onclick = async () => { const b = $("#jrSave"); b.disabled = true; b.textContent = "שומר…"; try { await addMoment(files, $("#jrT").value, vis); buzz(12); openDiary(); toast(vis === "me" ? "נשמר, רק אצלך ✓" : isOffline() || !apiTok() ? "נשמר. יעלה להורים כשתהיה רשת וסיסמה" : "נשמר, עולה להורים…", 3600); } catch (e) { b.disabled = false; b.textContent = "לשמור"; toast("לא הצלחתי לשמור את התמונה"); } };
}
function editMoment(id) {
  const m = jr.find(x => x.id === id); if (!m) return; const re = jrRe[id] || [];
  openModal(`<h2>${dayDate(m.date).dow} ${dayDate(m.date).dm} · ${m.time}</h2><p class="sub">📍 ${bd(m.where || "פראג")}</p>
    <div class="jr-prev big" id="jePrev">${moImgs(m).map(x => `<img ${x.src ? `src="${x.src}"` : ""} data-t="${x.id || ""}" alt="">`).join("")}</div>
    <label class="fld">הטקסט<textarea id="jeT" rows="2" dir="auto" maxlength="400">${esc(m.text)}</textarea></label>
    <div class="seg" id="jeVis"><button data-v="p" class="${m.vis === "p" ? "sel" : ""}">👨‍👩‍👦 להורים</button><button data-v="me" class="${m.vis === "me" ? "sel" : ""}">🔒 רק לי</button></div>
    ${re.length ? `<h3>מה ההורים אמרו</h3>` + re.map(r => `<p class="jm-re"><b>${esc(r.n)}</b> ${r.h ? "❤️" : ""} ${bd(r.x || "")}</p>`).join("") : ""}
    <div class="row" style="margin-top:12px"><button class="btn pri" id="jeOk" style="flex:2">לשמור שינויים</button><button class="btn" id="jeDel" style="flex:1;color:var(--red-ink)">למחוק</button></div>`, "tall");
  $$("#jePrev img").forEach(i => { if (!i.getAttribute("src") && i.dataset.t) thumbUrl(i.dataset.t).then(u => { if (u) i.src = u; }); });
  let vis = m.vis; $$("#jeVis button").forEach(b => b.onclick = () => { vis = b.dataset.v; $$("#jeVis button").forEach(x => x.classList.toggle("sel", x === b)); });
  $("#jeOk").onclick = () => { const was = m.vis; m.text = $("#jeT").value.trim().slice(0, 400); m.vis = vis; if (vis === "me") { if (was === "p" && m.st === "up") LS.set("jrDel", [...LS.get("jrDel", []), m.id]); m.st = "local"; m.up = []; } else m.st = "pending"; saveJr(); openDiary(); toast("עודכן ✓"); };
  $("#jeDel").onclick = async () => { if (!confirm("למחוק את הרגע הזה? הוא יימחק גם אצל ההורים.")) return; jr = jr.filter(x => x.id !== id); saveJr(); for (const i of m.imgs) { imgDel(i).catch(() => {}); imgDel("t:" + i).catch(() => {}); } if (m.st === "up" || (m.up || []).length) LS.set("jrDel", [...LS.get("jrDel", []), id]); openDiary(); toast("נמחק"); };
}

/* ---------- שיתוף עם ההורים ---------- */
const familyLink = () => location.origin + location.pathname.replace(/[^/]*$/, "") + "family.html#k=" + jrShare;
async function openShare() {
  if (!apiTok() || LS.get("jrErr") === "notset") return openJrSetup();
  openModal(`<h2>👨‍👩‍👦 דף ההורים</h2><p class="sub dots" id="shSt">בודק</p><div id="shBody"></div>`, "tall");
  try { const j = await api("/journal", {}, 12000); jrShare = j.share || ""; LS.set("jrShare", jrShare); } catch (e) { if (e.status === 401 || e.message === "notset") { LS.set("jrErr", e.message === "notset" ? "notset" : "הסיסמה לא תואמת לזו שבשרת"); return openJrSetup(e.status === 401); } $("#shSt").textContent = "אין חיבור לשרת כרגע. מוצג המצב האחרון ששמור."; }
  const st = $("#shSt"); if (!st) return; st.classList.remove("dots"); st.textContent = jrShare ? "הדף פעיל. מי שיש לו את הקישור רואה את הרגעים שסימנת \"להורים\", בלי הרשמה." : "השיתוף כבוי. אף אחד לא רואה כלום.";
  $("#shBody").innerHTML = jrShare ? `<div class="card soft"><b>הקישור הסודי</b><p class="fine" dir="ltr" style="word-break:break-all">${esc(familyLink())}</p>
      <div class="row wrap"><button class="btn pri" id="shWa">💬 לשלוח להורים</button><button class="btn" id="shCp">העתק</button><a class="btn" href="${esc(familyLink())}" target="_blank" rel="noopener">לפתוח</a></div></div>
    <label class="sw"><span><b>שתף מיקום חי עם ההורים</b><small>רק אזור כללי (שכונה או רחוב), מתעדכן כל רבע שעה כשהאפליקציה פתוחה</small></span><input type="checkbox" id="shLive" ${settings.live ? "checked" : ""}><i></i></label>
    <div class="col" style="margin-top:12px"><button class="btn" id="shRot">🔄 להחליף קישור (הישן מפסיק לעבוד)</button><button class="btn" id="shStop" style="color:var(--red-ink)">⏹ לעצור שיתוף</button><button class="btn" id="shZip">📦 להוריד את כל הטיול (זיפ)</button></div>
    <p class="fine">בדף ההורים אין את כתובת המלון, קודים או מספרי הזמנה. התמונות נשמרות בשרת שלך ב-Cloudflare, לא ב-GitHub.</p>`
    : `<button class="btn pri wide big" id="shStart">להפעיל ולקבל קישור</button><button class="btn wide" id="shZip">📦 להוריד את כל הטיול (זיפ)</button>`;
  const act = async a => { try { const j = await api("/journal/share", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: a }) }); jrShare = j.share || ""; LS.set("jrShare", jrShare); if (a === "stop") { settings.live = false; saveSet(); } openShare(); toast(a === "stop" ? "השיתוף נעצר" : a === "rotate" ? "קישור חדש. הישן כבר לא עובד" : "הדף פעיל ✓"); } catch (e) { toast("לא הצלחתי, אין חיבור לשרת"); } };
  const on = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
  on("#shStart", () => act("start")); on("#shRot", () => confirm("להחליף קישור? הקישור הישן יפסיק לעבוד.") && act("rotate")); on("#shStop", () => confirm("לעצור את השיתוף? ההורים לא יראו יותר כלום.") && act("stop"));
  on("#shCp", () => navigator.clipboard && navigator.clipboard.writeText(familyLink()).then(() => toast("הקישור הועתק ✓"))); on("#shWa", () => waSend(`היי, זה היומן שלי מפראג 🇨🇿 הוא מתעדכן לבד עם תמונות מהטיול:\n${familyLink()}\n(הקישור סודי, רק בשבילכם)`)); on("#shZip", exportZip);
  const lv = $("#shLive"); if (lv) lv.onchange = () => { settings.live = lv.checked; saveSet(); if (lv.checked) { LS.set("liveT", 0); if (!gps) startGPS(true); liveTick(); toast("ההורים יראו באיזה אזור אתה, לא נקודה מדויקת"); } else { api("/journal/loc", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ off: true }) }).catch(() => {}); toast("שיתוף המיקום כבוי"); } };
}
function openJrSetup(bad) {
  openModal(`<h2>🔑 לחבר את דף ההורים</h2><p class="sub">כדי שרק אתה תוכל להעלות תמונות, השרת צריך סיסמה שאתה בוחר. מגדירים אותה פעם אחת, מהטלפון או מהמחשב:</p>
    <ol class="steps"><li>נכנסים ל-<b dir="ltr">dash.cloudflare.com</b> (החשבון עם <b dir="ltr">bloombarber</b>).</li><li><b dir="ltr">Workers &amp; Pages</b> ← <b dir="ltr">prague-chat</b> ← <b dir="ltr">Settings</b> ← <b dir="ltr">Variables and Secrets</b>.</li><li><b dir="ltr">Add</b> ← סוג <b dir="ltr">Secret</b>, שם: <b dir="ltr">APP_TOKEN</b>, ערך: סיסמה שאתה ממציא (לפחות 10 תווים).</li><li><b dir="ltr">Deploy</b>, ואז מקלידים את אותה סיסמה כאן למטה.</li></ol>
    <label class="fld">הסיסמה (APP_TOKEN)<input id="jsT" type="password" dir="ltr" autocomplete="off" value="${esc(apiTok())}"></label>
    <button class="btn pri wide" id="jsOk">לשמור ולבדוק</button><p class="sub" id="jsSt">${bad ? "⚠️ הסיסמה שהוקלדה לא תואמת לזו שבשרת." : "בלי זה היומן עובד רגיל בטלפון, רק שההורים עוד לא רואים אותו."}</p>`, "tall");
  $("#jsOk").onclick = async () => { me.chatTok = $("#jsT").value.trim(); LS.set("me", me); const st = $("#jsSt"); st.textContent = "בודק…"; try { await api("/journal", {}, 12000); LS.del("jrErr"); toast("מחובר ✓"); flushJournal(); openShare(); } catch (e) { st.textContent = e.message === "notset" ? "השרת עונה, אבל APP_TOKEN עוד לא הוגדר בו (שלבים 1 עד 4)." : e.status === 401 ? "⚠️ הסיסמה לא תואמת לזו שבשרת." : "לא הצלחתי להגיע לשרת. בודקים שיש אינטרנט ומנסים שוב."; } };
}

/* ---------- הורדת כל הטיול כזיפ (תמונות + דף HTML), ישר מהטלפון ---------- */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = t[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }; })();
function zipStore(files) { // ZIP בלי דחיסה (התמונות כבר דחוסות)
  const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
  for (const f of files) { const name = enc.encode(f.name), crc = CRC(f.data), h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint32(14, crc, true); h.setUint32(18, f.data.length, true); h.setUint32(22, f.data.length, true); h.setUint16(26, name.length, true);
    parts.push(new Uint8Array(h.buffer), name, f.data); const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint32(16, crc, true); c.setUint32(20, f.data.length, true); c.setUint32(24, f.data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true); cen.push(new Uint8Array(c.buffer), name); off += 30 + name.length + f.data.length; }
  const cs = cen.reduce((a, x) => a + x.length, 0), e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cs, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...cen, new Uint8Array(e.buffer)], { type: "application/zip" });
}
async function exportZip() {
  if (!jr.length) return toast("עוד אין רגעים ביומן"); toast("מכין את הזיפ…", 4000); const files = [], enc = new TextEncoder(); let html = "";
  for (const m of [...jr].sort((a, b) => a.t - b.t)) { const names = []; for (let i = 0; i < m.imgs.length; i++) { const b = await imgGet(m.imgs[i]); if (!b) continue; const n = `photos/${m.date}_${m.time.replace(":", "")}_${i + 1}.jpg`; files.push({ name: n, data: new Uint8Array(await b.arrayBuffer()) }); names.push(n); }
    html += `<article><h3>${dayDate(m.date).dow} ${dayDate(m.date).dm} · ${m.time} · ${esc(m.where || "")}</h3>${m.text ? `<p>${esc(m.text)}</p>` : ""}${names.map(n => `<img src="${n}" alt="">`).join("")}${(jrRe[m.id] || []).map(r => `<p class="re"><b>${esc(r.n)}</b> ${r.h ? "❤️" : ""} ${esc(r.x || "")}</p>`).join("")}</article>`; }
  files.push({ name: "trip.html", data: enc.encode(`<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>פראג 2026</title><style>body{font-family:system-ui,sans-serif;max-width:720px;margin:0 auto;padding:20px;background:#f5f1ea;color:#1b1c20}h1{color:#d42a33}article{background:#fff;border-radius:18px;padding:16px;margin:16px 0}img{width:100%;border-radius:12px;margin-top:10px}h3{margin:0 0 6px;font-size:1rem;color:#6a6c75}.re{color:#6a6c75;font-size:.9rem}</style><h1>פראג · 30.11–4.12.2026</h1>${html}</html>`) });
  const blob = zipStore(files), a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "prague-trip.zip"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000); toast(`הזיפ מוכן: ${files.length - 1} תמונות ✓`, 4200);
}
addEventListener("online", () => setTimeout(flushJournal, 1500));
setInterval(() => { flushJournal(); liveTick(); }, 60000); setInterval(() => pullReactions(false), 150000); setTimeout(() => { flushJournal(); pullReactions(true); }, 9000);
