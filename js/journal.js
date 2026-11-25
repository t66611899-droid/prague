/* journal: יומן טיול להורים. רגעים עם תמונות וסרטונים, תור העלאה לאופליין, קישור סודי לדף ההורים, תגובות, מיקום כללי, הורדת זיפ.
   הקבצים נשמרים בטלפון (IndexedDB) ועולים לשרת רק עם הסיסמה. איכות קודם: המקור עולה כמו שהוא אם הוא נכנס במגבלה (ראו media.js).
   סדר ההעלאה: קודם תצוגה מקדימה קלה + פרטי הרגע (ההורים רואים מיד), ואחר כך הקבצים המלאים ברקע. מחליף את openDiary. */
"use strict";
const apiUrl = () => (QS.get("api") || (me.chatUrl && !/workers\.dev/.test(me.chatUrl) ? me.chatUrl : "") || CONFIG.chatUrl || "").replace(/\/+$/, ""); // כתובת workers.dev ישנה לא עובדת אצל חלק מהספקים
const apiTok = () => (me.chatTok || "").trim();
let jr = LS.get("jr", []), jrShare = LS.get("jrShare", ""), jrRe = LS.get("jrRe", {}), jrBusy = false, jrProg = {};
const saveJr = () => { try { localStorage.setItem("prg.jr", JSON.stringify(jr)); } catch (e) { toast("נגמר המקום בטלפון ליומן"); } };

/* רגעים מהיומן הישן (תמונה אחת, רק בטלפון) עוברים ליומן החדש כ"רק לי" */
if (!LS.get("jrMig")) { LS.get("diary", []).forEach(x => jr.push({ id: "o" + Number(x.id).toString(36), t: +x.id, date: x.date, time: x.time, text: "", where: x.where || "", lat: x.lat == null ? null : +(+x.lat).toFixed(3), lng: x.lng == null ? null : +(+x.lng).toFixed(3), imgs: [], th: [x.img], vis: "me", st: "local", up: [] })); LS.set("jrMig", 1); if (jr.length) saveJr(); }
/* רגעים מהגרסה הקודמת (תמונות בלבד, בלי כיתוב לכל תמונה) עוברים למבנה החדש */
jr.forEach(m => { if (m.media) return; m.media = (m.imgs || []).map((id, i) => ({ id, k: "i", cap: "", ar: (m.ar || [])[i] || 1.333, ph: (m.ph || [])[i] || "", pv: "", ct: "image/jpeg", sz: 0, psz: 0, dur: 0, full: (m.up || []).includes(id) || m.st === "up", pvUp: true })); });

/* ---------- IndexedDB לקבצים ---------- */
const jdb = () => new Promise((res, rej) => { const r = indexedDB.open("prg-journal", 1); r.onupgradeneeded = () => r.result.createObjectStore("img"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const idb = async (mode, fn) => { const db = await jdb(); return new Promise((res, rej) => { const tx = db.transaction("img", mode), rq = fn(tx.objectStore("img")); tx.oncomplete = () => res(rq && rq.result); tx.onerror = () => rej(tx.error); }); };
const imgPut = (id, blob) => idb("readwrite", s => s.put(blob, id)), imgGet = id => idb("readonly", s => s.get(id)), imgDel = id => idb("readwrite", s => s.delete(id));
const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
function shrinkTo(file, max, q, asBlob) { // (משמש גם את "הכרטיסים שלי" ותמונת הכניסה)
  return new Promise((res, rej) => { const img = new Image(), u = URL.createObjectURL(file); img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); asBlob ? c.toBlob(b => b ? res(b) : rej(new Error("blob")), "image/jpeg", q) : res(c.toDataURL("image/jpeg", q)); }; img.onerror = () => rej(new Error("img")); img.src = u; });
}
const _tu = new Map();
const thumbUrl = id => { if (!_tu.has(id)) _tu.set(id, imgGet("t:" + id).then(b => b || imgGet(id)).then(b => b ? URL.createObjectURL(b) : "").catch(() => "")); return _tu.get(id); };
const fullUrl = id => imgGet(id).then(b => b ? URL.createObjectURL(b) : "");
// הקבצים של רגע, בפורמט של הגלריה (כולל רגעים ישנים שנשמרו כתמונה קטנה בלבד)
const moImgs = m => m.media && m.media.length ? m.media.map(x => ({ gid: x.id, id: x.id, ar: x.ar, ph: x.ph || "", src: "", vid: x.k === "v", dur: x.dur, cap: x.cap || "" })) : (m.th || []).map((t, i) => ({ gid: "L" + m.id + i, src: t, ph: t, old: t }));
function fillThumbs(root) {
  $$(".gc-i", root).forEach(b => { const img = b.querySelector("img"), v = b.querySelector("video"), g = b.dataset.g; if (/^L/.test(g)) return;
    if (!img.getAttribute("src")) thumbUrl(g).then(u => { if (u) img.src = u; });
    if (v && !v.dataset.v) fullUrl(g).then(u => { if (u) { v.dataset.v = u; v.src = u; } }); });
  Gal.scan(root); Gal.autoplay(root);
}
const capHtml = (cap, m) => `${cap ? `<span class="vcap">${esc(cap)}</span>` : ""}${m.text ? esc(m.text) : ""}<b>${dayDate(m.date).dow} ${dayDate(m.date).dm} · ${m.time} · ${esc(m.where || "פראג")}</b>`;
function jrViewer(gid) { // כל הקבצים של היומן ברצף אחד, לפי הזמן
  const items = []; [...jr].sort((a, b) => a.t - b.t).forEach(m => moImgs(m).forEach(x => items.push({ gid: x.gid, ar: x.ar, thumb: x.ph || x.src, vid: x.vid, load: x.old ? x.old : () => fullUrl(x.id), cap: capHtml(x.cap, m) })));
  Gal.open(items, Math.max(0, items.findIndex(x => x.gid === gid)));
}
function jrReplay() { // ▶ הסרטון: טיסה על המפה מרגע לרגע
  const ms = [...jr].sort((a, b) => a.t - b.t); if (!ms.length) return toast("עוד אין רגעים ביומן"); closeModal(); if (typeof stopPlay === "function") try { stopPlay(); } catch (e) {}
  Gal.replay({ map, title: "פראג · " + ms.length + " רגעים", endTitle: "זה היה הטיול עד עכשיו", endText: `${ms.length} רגעים · ${ms.reduce((a, m) => a + moImgs(m).length, 0)} תמונות וסרטונים`,
    steps: ms.map(m => { const di = plan.findIndex(d => d.date === m.date); return { lat: m.lat, lng: m.lng, kicker: `${di >= 0 ? "יום " + (di + 1) + " · " : ""}${dayDate(m.date).dow} ${m.time}`, title: m.where || "פראג", text: m.text, imgs: moImgs(m).map(x => ({ thumb: x.ph || x.src, load: x.old ? x.old : () => x.vid ? thumbUrl(x.id) : fullUrl(x.id) })) }; }),
    onClose: () => { try { flyDay(curDay); } catch (e) {} openDiary(); } });
}
function whereFor(p) { const k = nearestKnown(p), d = hav(p, k); if (d < 250) return k.name; if (d > 20000) return ""; return nearestStreet(p) || (d < 900 ? "ליד " + k.name : "פראג"); }
function whereNow() { const p = lastKnown(); if (!p) return { where: "פראג", lat: null, lng: null }; return { where: whereFor(p) || "פראג", lat: +p.lat.toFixed(3), lng: +p.lng.toFixed(3) }; }
const pragueDT = t => { const p = {}; for (const x of new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Prague", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(t))) p[x.type] = x.value; return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` }; };

/* ---------- רגע חדש ---------- */
async function addMoment(files, text, caps, vis, ac, onProg) {
  const T = tripNow(), mo = { id: rid(), t: Date.now(), date: T.phase === "during" ? T.date : dstr(T.w), time: clockNow(), text: (text || "").trim().slice(0, 400), where: "", lat: null, lng: null, media: [], vis: vis === "me" ? "me" : "p", st: vis === "me" ? "local" : "pending" };
  const list = [...files].slice(0, 10); let tcap = null, gpsCap = null;
  for (let i = 0; i < list.length; i++) {
    const r = await prepMedia(list[i], ac, p => onProg && onProg(i, list.length, p)), id = rid();
    await imgPut(id, r.blob); if (r.pv) await imgPut("t:" + id, r.pv);
    mo.media.push({ id, k: r.k, cap: ((caps || [])[i] || "").trim().slice(0, 200), ar: r.ar, ph: r.ph, pv: r.pv ? id + "p" : "", ct: r.ct, sz: r.blob.size, psz: r.pv ? r.pv.size : 0, dur: r.dur || 0, how: r.how, full: false, pvUp: !r.pv });
    if (r.t && (!tcap || r.t < tcap)) tcap = r.t; if (r.gps && !gpsCap && hav(r.gps, { lat: 50.0875, lng: 14.4213 }) < 60000) gpsCap = r.gps; onProg && onProg(i + 1, list.length, 0); // מיקום מתוך הקובץ רק אם הוא באזור פראג. תמונה ישנה ממקום אחר לא נכנסת למפה
  }
  if (tcap && Math.abs(Date.now() - tcap) > 5 * 60000) { const d = pragueDT(tcap); mo.t = tcap; mo.date = d.date; mo.time = d.time; mo.tc = 1; } // זמן הצילום, לא זמן ההעלאה
  if (gpsCap) { mo.lat = +gpsCap.lat.toFixed(3); mo.lng = +gpsCap.lng.toFixed(3); mo.where = whereFor(gpsCap); }
  else if (!mo.tc || Date.now() - mo.t < 2 * 36e5) { const w = whereNow(); Object.assign(mo, { where: w.where, lat: w.lat, lng: w.lng }); } // תמונה ישנה בלי מיקום: לא מצמידים לה את המיקום של עכשיו
  jr.push(mo); jr.sort((a, b) => a.t - b.t); saveJr(); flushJournal(); return mo;
}
async function api(path, opt = {}, ms = 25000) {
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(apiUrl() + path, { ...opt, headers: { "x-app-token": apiTok(), ...(opt.headers || {}) }, signal: ctl.signal }); const j = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error(j.error || "http " + r.status); e.status = r.status; throw e; } return j; } finally { clearTimeout(to); }
}
function putFile(id, blob, ct, onProg) { // XHR בשביל אחוזי העלאה; עוצר אם אין התקדמות דקה
  return new Promise((res, rej) => { const x = new XMLHttpRequest(); let tm; const arm = () => { clearTimeout(tm); tm = setTimeout(() => x.abort(), 60000); };
    x.open("PUT", apiUrl() + "/journal/img/" + id); x.setRequestHeader("x-app-token", apiTok()); x.setRequestHeader("content-type", ct || "application/octet-stream");
    x.upload.onprogress = e => { arm(); if (e.lengthComputable && onProg) onProg(e.loaded / e.total); };
    x.onload = () => { clearTimeout(tm); if (x.status >= 200 && x.status < 300) res(); else { let j = {}; try { j = JSON.parse(x.responseText); } catch (e) {} const er = new Error(j.error || "http " + x.status); er.status = x.status; rej(er); } };
    x.onerror = () => { clearTimeout(tm); rej(new Error("net")); }; x.onabort = () => { clearTimeout(tm); rej(new Error("net")); }; arm(); x.send(blob); });
}
const momentBody = mo => JSON.stringify({ id: mo.id, t: mo.t, date: mo.date, time: mo.time, text: mo.text, where: mo.where, lat: mo.lat, lng: mo.lng, vis: mo.vis,
  media: mo.media.map(x => ({ id: x.id, k: x.k, cap: x.cap, ar: x.ar, ph: x.ph, pv: x.pvUp && x.pv ? x.pv : "", ct: x.ct, sz: x.sz, psz: x.psz, dur: x.dur, full: !!x.full })) });
const postMoment = mo => api("/journal/moment", { method: "POST", headers: { "content-type": "application/json" }, body: momentBody(mo) });
const setProg = (id, f) => { jrProg[id] = f; const el = $(`#jrList [data-jm="${id}"] .jb.wait`); if (el) el.textContent = f >= 1 ? "⏳ מסיים…" : `⬆️ באיכות מלאה ${Math.round(f * 100)}%`; };
/* תור ההעלאה: רץ כשיש רשת וסיסמה. מה שלא עלה נשאר בתור ויעלה בפעם הבאה */
async function flushJournal() {
  if (jrBusy || isOffline() || !apiTok() || !apiUrl()) return; jrBusy = true; let sent = 0;
  try {
    // שלב 1: תצוגות מקדימות + פרטי הרגע. ההורים רואים את הרגע מיד
    for (const mo of jr.filter(m => m.vis === "p" && m.st === "pending")) {
      for (const x of mo.media) { if (x.pvUp || !x.pv) continue; const b = await imgGet("t:" + x.id); if (b) await putFile(x.pv, b, "image/jpeg"); x.pvUp = true; saveJr(); }
      await postMoment(mo); mo.st = mo.media.every(x => x.full) ? "up" : "partial"; if (!mo.sent) { mo.sent = 1; sent++; } saveJr(); if ($("#jrList")) renderJrList();
    }
    if (sent) jrSentFx(sent);
    // שלב 2: הקבצים המלאים, אחד אחרי השני, עם אחוזים
    for (const mo of jr.filter(m => m.vis === "p" && m.st === "partial")) {
      const todo = mo.media.filter(x => !x.full), total = todo.reduce((a, x) => a + (x.sz || 1), 0) || 1; let done = 0;
      for (const x of todo) { const b = await imgGet(x.id); if (b) await putFile(x.id, b, x.ct, f => setProg(mo.id, (done + f * (x.sz || 1)) / total)); x.full = true; done += x.sz || 1; saveJr(); }
      await postMoment(mo); mo.st = "up"; delete jrProg[mo.id]; saveJr(); if ($("#jrList")) renderJrList();
    }
    for (const id of LS.get("jrDel", [])) { await api("/journal/moment/" + id, { method: "DELETE" }); LS.set("jrDel", LS.get("jrDel", []).filter(x => x !== id)); }
    const T = tripNow(); if (T.phase === "during" && jrShare) { const body = JSON.stringify({ date: T.date, km: +trackKm(T.date).toFixed(1), places: plan[T.dayIdx].stops.filter(s => marks[s.id] === "done").length }); // רק כשמשהו השתנה, ולכל היותר פעם ב-10 דקות (חוסך כתיבות בשרת)
      if (body !== LS.get("jrStat", "") && Date.now() - LS.get("jrStatT", 0) > 6e5) { LS.set("jrStat", body); LS.set("jrStatT", Date.now()); api("/journal/stats", { method: "POST", headers: { "content-type": "application/json" }, body }).catch(() => {}); } }
    LS.del("jrErr");
  } catch (e) { LS.set("jrErr", e.status === 401 ? "הסיסמה לא תואמת לזו שבשרת" : e.message === "notset" ? "notset" : e.message === "full" ? "האחסון החינמי (1GB) מלא" : e.message === "size" ? "קובץ גדול מדי לשרת" : "אין חיבור לשרת כרגע"); }
  jrBusy = false; if ($("#jrList")) refreshUse();
}
async function pullReactions(quiet) { // "אמא הגיבה ❤️"
  if (isOffline() || !apiTok() || !apiUrl()) return;
  try { const j = await api("/journal", {}, 12000); jrShare = j.share || ""; LS.set("jrShare", jrShare); if (j.usage) LS.set("jrUse", j.usage); const old = jrRe; jrRe = j.re || {}; LS.set("jrRe", jrRe);
    if (!quiet) for (const id in jrRe) { const n = jrRe[id].length, o = (old[id] || []).length; if (n > o) { const r = jrRe[id][n - 1], mo = jr.find(m => m.id === id); toast(`${r.n} ${r.n === "אמא" ? "הגיבה" : r.n === "אבא" ? "הגיב" : "הגיבו"} ${r.h ? "❤️" : "💬"}${r.x ? ": " + r.x.slice(0, 40) : ""}${mo && mo.where ? " · " + mo.where : ""}`, 5200); buzz([15, 40, 15]); break; } }
    if ($("#jrList")) { renderJrList(); refreshUse(); } useWarn();
  } catch (e) {}
}
/* מיקום חי להורים: רק אזור כללי (שם רחוב/שכונה ונקודה מעוגלת לקילומטר), כל 15 דקות, רק כשהמתג דלוק */
function liveTick() {
  if (!settings.live || isOffline() || !apiTok() || !gps) return; if (Date.now() - LS.get("liveT", 0) < 14 * 60000) return; LS.set("liveT", Date.now());
  const k = nearestKnown(gps); api("/journal/loc", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ where: hav(gps, k) < 700 ? "אזור " + k.name : nearestStreet(gps) || "פראג", lat: gps.lat, lng: gps.lng }) }).catch(() => {});
}
/* ---------- אחסון חינמי: כמה נשאר ---------- */
const useNow = () => { const u = LS.get("jrUse", null), pend = jr.filter(m => m.vis === "p" && m.st !== "up").reduce((a, m) => a + m.media.reduce((b, x) => b + (x.full ? 0 : x.sz || 0) + (x.pvUp ? 0 : x.psz || 0), 0), 0); return u ? { used: u.bytes, pend, limit: u.limit || 1e9 } : null; };
function useHtml() { const u = useNow(); if (!u) return ""; const f = (u.used + u.pend) / u.limit, cls = f > 0.95 ? "bad" : f > 0.8 ? "warn" : "";
  return `<div class="jr-use ${cls}"><div><span>☁️ אחסון חינמי</span><b>${fmtMB(Math.max(0, u.limit - u.used))} פנויים מתוך ${fmtMB(u.limit)}</b></div><i><s style="width:${Math.min(100, u.used / u.limit * 100).toFixed(1)}%"></s><s class="p" style="width:${Math.min(100, u.pend / u.limit * 100).toFixed(1)}%"></s></i>${cls ? `<small>${f > 0.95 ? "⚠️ כמעט מלא. רגעים חדשים עלולים לא לעלות." : "המקום מתחיל להיגמר. סרטונים תופסים הכי הרבה."}</small>` : ""}</div>`; }
const refreshUse = () => { const b = $("#jrUse"); if (b) b.innerHTML = useHtml(); };
function useWarn() { const u = useNow(); if (!u) return; const f = (u.used + u.pend) / u.limit, lvl = f > 0.95 ? 2 : f > 0.8 ? 1 : 0; if (lvl > LS.get("jrUseWarn", 0)) { LS.set("jrUseWarn", lvl); toast(lvl === 2 ? "⚠️ האחסון של היומן כמעט מלא (1GB)" : "האחסון של היומן מעל 80%", 5200); } }

/* ---------- המסך ---------- */
const stLabel = m => m.vis === "me" ? `<i class="jb mine">🔒 רק לי</i>` : m.st === "up" ? `<i class="jb ok">💌 אצל ההורים ✓</i>` : m.st === "partial" ? `<i class="jb ok">💌 אצל ההורים</i><i class="jb wait">⬆️ באיכות מלאה${jrProg[m.id] != null ? " " + Math.round(jrProg[m.id] * 100) + "%" : "…"}</i>` : `<i class="jb wait">⏳ ממתין להעלאה</i>`;
function renderJrList() {
  const box = $("#jrList"); if (!box) return; const days = {}; [...jr].sort((a, b) => b.t - a.t).forEach(m => (days[m.date] = days[m.date] || []).push(m));
  box.innerHTML = Object.keys(days).sort().reverse().map(d => { const di = plan.findIndex(x => x.date === d), ms = days[d], first = ms[ms.length - 1], cov = moImgs(first)[0] || (ms.map(m => moImgs(m)[0]).filter(Boolean)[0]), nph = ms.reduce((a, m) => a + moImgs(m).length, 0), km = (() => { try { return trackKm(d); } catch (e) { return 0; } })();
    return `<header class="jd"${cov && cov.ph ? ` style="background-image:url(${cov.ph})"` : ""}>${cov ? `<img alt="" data-cov="${cov.gid}"${cov.old ? ` src="${cov.old}"` : ""}>` : ""}<div><small>${di >= 0 ? "יום " + (di + 1) + " · " : ""}${dayDate(d).dow} ${dayDate(d).dm}</small><b>${di >= 0 ? bd(plan[di].title) : "רגעים"}</b><span>${km >= 0.1 ? km.toFixed(1) + ' ק"מ · ' : ""}${ms.length} ${ms.length === 1 ? "רגע" : "רגעים"} · ${nph} קבצים</span></div></header>` + ms.map(m => { const re = jrRe[m.id] || [], caps = (m.media || []).filter(x => x.cap);
    return `<article class="jm" data-jm="${m.id}">${Gal.collage(moImgs(m))}
      <div class="jm-b">${m.text ? `<p>${bd(m.text)}</p>` : ""}${caps.length ? `<ul class="jm-caps">${caps.slice(0, 4).map(x => `<li>${x.k === "v" ? "🎬" : "📷"} ${bd(x.cap)}</li>`).join("")}</ul>` : ""}<small>${m.time}${m.tc ? " (שעת הצילום)" : ""} · ${bd(m.where || "פראג")}</small><div class="jm-f">${stLabel(m)}${re.length ? `<i class="jb re">${re.filter(r => r.h).length ? "❤️ " + re.filter(r => r.h).length : ""} ${re.filter(r => r.x).length ? "💬 " + re.filter(r => r.x).length : ""}</i>` : ""}</div>
      ${re.filter(r => r.x).slice(-2).map(r => `<p class="jm-re"><b>${esc(r.n)}:</b> ${bd(r.x)}</p>`).join("")}</div></article>`; }).join(""); }).join("") || emptyState("📷", "עוד אין רגעים", "תמונה או סרטון ומשפט קצר, וההורים רואים את הטיול מתעדכן. המקום והשעה נכנסים לבד.");
  $$("#jrList [data-jm]").forEach(a => a.onclick = e => { const g = e.target.closest(".gc-i"); if (g) jrViewer(g.dataset.g); else editMoment(a.dataset.jm); });
  $$("#jrList [data-cov]").forEach(i => { if (!i.getAttribute("src")) thumbUrl(i.dataset.cov).then(u => { if (u) { i.onload = () => i.classList.add("ld"); i.src = u; } }); else i.classList.add("ld"); });
  fillThumbs(box); Gal.reveal(box, ".jm,.jd");
}
function openDiary() {
  const pend = jr.filter(m => m.vis === "p" && m.st === "pending").length, err = LS.get("jrErr", ""), ready = !!apiTok();
  openModal(`<h2>📔 יומן הטיול</h2><p class="sub">רגעים מהטיול: תמונות, סרטונים קצרים, מקום ושעה. מה שמסומן "להורים" מופיע אצלם בדף משלהם, באיכות המקורית.</p>
    <button class="btn pri wide big" id="jrNew">📸 רגע חדש</button>
    <button class="btn wide" id="jrShareB">👨‍👩‍👦 ${!ready ? "לחבר את דף ההורים" : jrShare ? "דף ההורים והשיתוף" : "להפעיל את דף ההורים"}</button>
    ${pend ? `<p class="jr-note">${isOffline() ? "📡 בלי אינטרנט." : !ready ? "🔑 עוד לא הוקלדה סיסמה." : err && err !== "notset" ? "⚠️ " + esc(err) + "." : err === "notset" ? "🔑 השרת עוד לא הוגדר." : "⏳"} ${pend} ${pend === 1 ? "רגע ממתין" : "רגעים ממתינים"} להעלאה, ויעלו לבד כשתהיה רשת.</p>` : ""}
    <div id="jrUse">${useHtml()}</div>
    ${jr.length ? `<button class="btn wide jr-play" id="jrPlay">▶ לנגן את הטיול</button>` : ""}<div id="jrList"></div>`, "tall");
  if ($("#jrPlay")) $("#jrPlay").onclick = jrReplay;
  $("#jrNew").onclick = newMoment; $("#jrShareB").onclick = openShare; renderJrList(); flushJournal(); pullReactions(true);
}
function newMoment() {
  let files = [], vis = LS.get("jrVis", "p"), urls = [];
  openModal(`<h2>📸 רגע חדש</h2>
    <label class="jr-pick" id="jrPickL"><input id="jrF" type="file" accept="image/*,video/*" multiple hidden><span>📷</span><b>לצלם או לבחור תמונות וסרטונים</b><small>עד 10 קבצים · סרטון עד 20 שניות · באיכות המקורית</small></label>
    <div class="jr-items" id="jrPrev"></div><p class="fine" id="jrInfo"></p>
    <label class="fld">משפט על הרגע כולו (לא חובה)<textarea id="jrT" rows="2" dir="auto" maxlength="400" placeholder="מה קורה פה?"></textarea></label>
    <p class="fine" id="jrKeep" hidden>⏳ סרטון גדול מתכווץ בעדינות. להשאיר את המסך דלוק ובאפליקציה עד שזה נגמר.</p>
    <p class="sub" id="jrWhere">📍 ${bd(whereNow().where)} · 🕐 ${clockNow()} · נכנסים לבד. תמונה ישנה מהגלריה נכנסת לפי שעת הצילום שלה.</p>
    <div class="seg" id="jrVis"><button data-v="p">👨‍👩‍👦 להורים</button><button data-v="me">🔒 רק לי</button></div>
    <button class="btn pri wide big" id="jrSave" disabled>לשמור</button>`, "tall");
  const seg = () => { $$("#jrVis button").forEach(b => b.classList.toggle("sel", b.dataset.v === vis)); const sv = $("#jrSave"); if (sv && !sv.dataset.busy) sv.textContent = vis === "p" ? "שלח להורים 💌" : "לשמור"; }; seg();
  try { $("#jrF").click(); } catch (e) {} /* שתי לחיצות: המצלמה/הגלריה נפתחת מיד, ואחרי הבחירה רק "שלח" */
  $$("#jrVis button").forEach(b => b.onclick = () => { vis = b.dataset.v; LS.set("jrVis", vis); seg(); });
  const draw = async () => {
    urls.forEach(u => URL.revokeObjectURL(u)); urls = files.map(f => URL.createObjectURL(f)); const caps = $$("#jrPrev [data-cap]").map(i => i.value);
    $("#jrPrev").innerHTML = files.map((f, i) => `<div class="jr-it" data-i="${i}">${isVid(f) ? `<video src="${urls[i]}#t=0.2" muted playsinline preload="metadata"></video><span class="jr-v">🎬</span>` : `<img src="${urls[i]}" alt="">`}<button class="jr-x" data-x="${i}" aria-label="להסיר">✕</button><input data-cap="${i}" dir="auto" maxlength="200" placeholder="${isVid(f) ? "כיתוב לסרטון" : "כיתוב לתמונה"} (לא חובה)" value="${esc(caps[i] || "")}"></div>`).join("");
    $$("#jrPrev [data-x]").forEach(b => b.onclick = () => { files.splice(+b.dataset.x, 1); draw(); });
    $("#jrPickL").classList.toggle("has", !!files.length);
    const tot = files.reduce((a, f) => a + f.size, 0), big = files.filter(f => f.size > MED_MAX).length; let longV = 0;
    for (const f of files.filter(isVid)) { const d = await videoTooLong(f); if (d) { longV++; const it = $(`#jrPrev [data-i="${files.indexOf(f)}"]`); if (it) it.classList.add("bad"); } }
    const u = useNow(), full = u && u.used + u.pend + tot > u.limit * 0.985;
    $("#jrInfo").innerHTML = files.length ? `${files.length} קבצים · ${fmtMB(tot)}${big ? ` · ${big === 1 ? "קובץ אחד גדול" : big + " קבצים גדולים"} מ-24.5MB ${big === 1 ? "יכווץ" : "יכווצו"} בעדינות` : " · עולים באיכות המקורית"}${longV ? `<br><b class="bad-t">סרטון ארוך מ-20 שניות. מקצרים אותו בגלריה של הטלפון (עריכה ← חיתוך) ובוחרים שוב.</b>` : ""}${full ? `<br><b class="bad-t">אין מספיק מקום באחסון החינמי בשביל הקבצים האלה.</b>` : ""}` : "";
    $("#jrSave").disabled = !files.length || !!longV || !!full; $("#jrKeep").hidden = !files.some(f => isVid(f) && f.size > MED_MAX);
  };
  $("#jrF").onchange = e => { files = [...files, ...e.target.files].slice(0, 10); e.target.value = ""; draw(); };
  $("#jrSave").onclick = async () => {
    const b = $("#jrSave"), ac = (() => { try { const C = window.AudioContext || window.webkitAudioContext; return files.some(f => isVid(f) && f.size > MED_MAX) && C ? new C() : null; } catch (e) { return null; } })(); // נוצר בלחיצה, בשביל הקול בכיווץ סרטון
    b.disabled = true; b.dataset.busy = 1; b.textContent = "מכין…"; const caps = $$("#jrPrev [data-cap]").map(i => i.value), from = $("#jrPrev img, #jrPrev video"), fr = from ? from.getBoundingClientRect() : null, fsrc = from && from.tagName === "IMG" ? from.src : "";
    try { const mo = await addMoment(files, $("#jrT").value, caps, vis, ac, (i, n, p) => { b.textContent = p > 0 && p < 1 ? `מכווץ סרטון ${Math.round(p * 100)}% · ${i + 1}/${n}` : `מכין ${Math.min(i + 1, n)}/${n}…`; });
      if (ac) ac.close().catch(() => {}); buzz(12); openDiary(); jrFlyIn(mo, fr, fsrc);
      toast(vis === "me" ? "נשמר, רק אצלך ✓" : isOffline() || !apiTok() ? "נשמר. יישלח להורים כשתהיה רשת 💌" : "נשמר, נשלח להורים…", 3600);
    } catch (e) { b.disabled = false; delete b.dataset.busy; b.textContent = vis === "p" ? "שלח להורים 💌" : "לשמור"; toast(e.message === "long" ? "סרטון ארוך מ-20 שניות" : e.message === "codec" ? "הטלפון לא הצליח לפתוח את הסרטון. כדאי לנסות שוב, או לבחור סרטון קצר יותר" : e.message === "hidden" ? "צריך להשאיר את המסך דלוק ובאפליקציה בזמן שהסרטון מתכווץ (כמה שניות). מנסים שוב" : e.message === "norec" ? "הסרטון גדול מדי והדפדפן לא יכול לכווץ אותו. מקצרים אותו ובוחרים שוב" : "לא הצלחתי לשמור. אולי אין מקום בטלפון", 5200); }
  };
}
/* האנימציה: התמונה "עפה" מהמסך של הרגע החדש אל המקום שלה ביומן, עם ✓ */
function jrFlyIn(mo, fr, src) {
  const go = async () => { const card = $(`#jrList [data-jm="${mo.id}"]`); if (!card) return; card.scrollIntoView({ block: "center" }); await new Promise(r => setTimeout(r, 60)); const to = card.querySelector(".gc") ? card.querySelector(".gc").getBoundingClientRect() : card.getBoundingClientRect();
    const u = src || await thumbUrl(mo.media[0] && mo.media[0].id); if (!u) return; const s = fr || { left: innerWidth / 2 - 90, top: innerHeight - 260, width: 180, height: 180 };
    const el = document.createElement("div"); el.className = "jr-fly"; el.innerHTML = `<img src="${u}" alt=""><b>✓</b>`; Object.assign(el.style, { left: to.left + "px", top: to.top + "px", width: to.width + "px", height: to.height + "px" }); document.body.appendChild(el);
    const sx = s.width / to.width, sy = s.height / to.height, dx = s.left - to.left, dy = s.top - to.top; card.style.opacity = "0";
    if (!el.animate) { el.remove(); card.style.opacity = ""; return; }
    const a = el.animate([{ transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})`, borderRadius: "16px" }, { transform: `translate(${dx * 0.4}px,${dy * 0.4 - 60}px) scale(${(sx + 1) / 2})`, offset: 0.45 }, { transform: "none", borderRadius: "18px" }], { duration: 720, easing: "cubic-bezier(.2,.8,.2,1)" });
    a.onfinish = () => { el.classList.add("done"); card.style.opacity = ""; setTimeout(() => el.remove(), 900); }; };
  setTimeout(go, 120);
}
/* כשהרגע הגיע להורים: הודעה + קפיצה קטנה של התווית */
function jrSentFx(n) { buzz([10, 30, 10]); toast(n === 1 ? "נשלח להורים 💌" : `${n} רגעים נשלחו להורים 💌`, 3200); $$("#jrList .jb.ok").forEach(e => { e.classList.remove("pop"); void e.offsetWidth; e.classList.add("pop"); }); }
function editMoment(id) {
  const m = jr.find(x => x.id === id); if (!m) return; const re = jrRe[id] || [];
  openModal(`<h2>${dayDate(m.date).dow} ${dayDate(m.date).dm} · ${m.time}</h2><p class="sub">📍 ${bd(m.where || "פראג")}${m.tc ? " · השעה לפי זמן הצילום" : ""}</p>
    <div class="jr-items" id="jePrev">${moImgs(m).map((x, i) => `<div class="jr-it"><img ${x.src ? `src="${x.src}"` : ""} data-t="${x.id || ""}" alt="">${x.vid ? `<span class="jr-v">🎬</span>` : ""}${m.media && m.media[i] ? `<input data-ecap="${i}" dir="auto" maxlength="200" placeholder="כיתוב (לא חובה)" value="${esc(m.media[i].cap || "")}">` : ""}</div>`).join("")}</div>
    <label class="fld">משפט על הרגע כולו<textarea id="jeT" rows="2" dir="auto" maxlength="400">${esc(m.text)}</textarea></label>
    <div class="seg" id="jeVis"><button data-v="p" class="${m.vis === "p" ? "sel" : ""}">👨‍👩‍👦 להורים</button><button data-v="me" class="${m.vis === "me" ? "sel" : ""}">🔒 רק לי</button></div>
    ${re.length ? `<h3>מה ההורים אמרו</h3>` + re.map(r => `<p class="jm-re"><b>${esc(r.n)}</b> ${r.h ? "❤️" : ""} ${bd(r.x || "")}</p>`).join("") : ""}
    <div class="row" style="margin-top:12px"><button class="btn pri" id="jeOk" style="flex:2">לשמור שינויים</button><button class="btn" id="jeDel" style="flex:1;color:var(--red-ink)">למחוק</button></div>`, "tall");
  $$("#jePrev img").forEach(i => { if (!i.getAttribute("src") && i.dataset.t) thumbUrl(i.dataset.t).then(u => { if (u) i.src = u; }); });
  let vis = m.vis; $$("#jeVis button").forEach(b => b.onclick = () => { vis = b.dataset.v; $$("#jeVis button").forEach(x => x.classList.toggle("sel", x === b)); });
  $("#jeOk").onclick = () => { const was = m.vis; m.text = $("#jeT").value.trim().slice(0, 400); $$("#jePrev [data-ecap]").forEach(i => { m.media[+i.dataset.ecap].cap = i.value.trim().slice(0, 200); }); m.vis = vis;
    if (vis === "me") { if (was === "p" && m.st !== "pending") LS.set("jrDel", [...LS.get("jrDel", []), m.id]); m.st = "local"; (m.media || []).forEach(x => { x.full = false; x.pvUp = !x.pv; }); delete m.sent; } // נמחק מהשרת, אז אם יחזור להורים הקבצים יעלו שוב else { m.st = "pending"; } // הקבצים שכבר עלו לא עולים שוב, רק הפרטים
    saveJr(); openDiary(); toast("עודכן ✓"); };
  $("#jeDel").onclick = async () => { if (!confirm("למחוק את הרגע הזה? הוא יימחק גם אצל ההורים.")) return; jr = jr.filter(x => x.id !== id); saveJr(); for (const x of (m.media || [])) { imgDel(x.id).catch(() => {}); imgDel("t:" + x.id).catch(() => {}); } if (m.vis === "p" && (m.st !== "pending" || (m.media || []).some(x => x.pvUp && x.pv))) LS.set("jrDel", [...LS.get("jrDel", []), id]); openDiary(); toast("נמחק"); };
}

/* ---------- שיתוף עם ההורים ---------- */
const familyLink = () => location.origin + location.pathname.replace(/[^/]*$/, "") + "family.html#k=" + jrShare;
async function openShare() {
  if (!apiTok() || LS.get("jrErr") === "notset") return openJrSetup();
  openModal(`<h2>👨‍👩‍👦 דף ההורים</h2><p class="sub dots" id="shSt">בודק</p><div id="shBody"></div>`, "tall");
  try { const j = await api("/journal", {}, 12000); jrShare = j.share || ""; LS.set("jrShare", jrShare); if (j.usage) LS.set("jrUse", j.usage); } catch (e) { if (e.status === 401 || e.message === "notset") { LS.set("jrErr", e.message === "notset" ? "notset" : "הסיסמה לא תואמת לזו שבשרת"); return openJrSetup(e.status === 401); } $("#shSt").textContent = "אין חיבור לשרת כרגע. מוצג המצב האחרון ששמור."; }
  const st = $("#shSt"); if (!st) return; st.classList.remove("dots"); st.textContent = jrShare ? "הדף פעיל. מי שיש לו את הקישור רואה את הרגעים שסימנת \"להורים\", בלי הרשמה." : "השיתוף כבוי. אף אחד לא רואה כלום.";
  $("#shBody").innerHTML = (jrShare ? `<div class="card soft"><b>הקישור הסודי</b><p class="fine" dir="ltr" style="word-break:break-all">${esc(familyLink())}</p>
      <div class="row wrap"><button class="btn pri" id="shWa">💬 לשלוח להורים</button><button class="btn" id="shCp">העתק</button><a class="btn" href="${esc(familyLink())}" target="_blank" rel="noopener">לפתוח</a></div></div>
    <label class="sw"><span><b>שתף מיקום חי עם ההורים</b><small>רק אזור כללי (שכונה או רחוב), מתעדכן כל רבע שעה כשהאפליקציה פתוחה</small></span><input type="checkbox" id="shLive" ${settings.live ? "checked" : ""}><i></i></label>
    <div class="col" style="margin-top:12px"><button class="btn" id="shRot">🔄 להחליף קישור (הישן מפסיק לעבוד)</button><button class="btn" id="shStop" style="color:var(--red-ink)">⏹ לעצור שיתוף</button><button class="btn" id="shZip">📦 להוריד את כל הטיול (זיפ)</button></div>
    <p class="fine">בדף ההורים אין את כתובת המלון, קודים או מספרי הזמנה. הקבצים נשמרים בשרת שלך ב-Cloudflare (חינם עד 1GB), לא ב-GitHub.</p>`
    : `<button class="btn pri wide big" id="shStart">להפעיל ולקבל קישור</button><button class="btn wide" id="shZip">📦 להוריד את כל הטיול (זיפ)</button>`) + useHtml();
  const act = async a => { try { const j = await api("/journal/share", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: a }) }); jrShare = j.share || ""; LS.set("jrShare", jrShare); if (a === "stop") { settings.live = false; saveSet(); } openShare(); toast(a === "stop" ? "השיתוף נעצר" : a === "rotate" ? "קישור חדש. הישן כבר לא עובד" : "הדף פעיל ✓"); } catch (e) { toast("לא הצלחתי, אין חיבור לשרת"); } };
  const on = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
  on("#shStart", () => act("start")); on("#shRot", () => confirm("להחליף קישור? הקישור הישן יפסיק לעבוד.") && act("rotate")); on("#shStop", () => confirm("לעצור את השיתוף? ההורים לא יראו יותר כלום.") && act("stop"));
  on("#shCp", () => navigator.clipboard && navigator.clipboard.writeText(familyLink()).then(() => toast("הקישור הועתק ✓"))); on("#shWa", () => waSend(`היי, זה היומן שלי מפראג 🇨🇿 הוא מתעדכן לבד עם תמונות וסרטונים מהטיול:\n${familyLink()}\n(הקישור סודי, רק בשבילכם)`)); on("#shZip", exportZip);
  const lv = $("#shLive"); if (lv) lv.onchange = () => { settings.live = lv.checked; saveSet(); if (lv.checked) { LS.set("liveT", 0); if (!gps) startGPS(true); liveTick(); toast("ההורים יראו באיזה אזור אתה, לא נקודה מדויקת"); } else { api("/journal/loc", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ off: true }) }).catch(() => {}); toast("שיתוף המיקום כבוי"); } };
}
function openJrSetup(bad) {
  openModal(`<h2>🔑 לחבר את דף ההורים</h2><p class="sub">הסיסמה של היומן נכנסת לטלפון בסריקת ה-QR המוצפן ("הפרטים שלי" ← לייבא). אפשר גם להקליד אותה כאן:</p>
    <label class="fld">הסיסמה (APP_TOKEN)<input id="jsT" type="password" dir="ltr" autocomplete="off" value="${esc(apiTok())}"></label>
    <button class="btn pri wide" id="jsOk">לשמור ולבדוק</button><p class="sub" id="jsSt">${bad ? "⚠️ הסיסמה שהוקלדה לא תואמת לזו שבשרת." : "בלי זה היומן עובד רגיל בטלפון, רק שההורים עוד לא רואים אותו."}</p>`, "tall");
  $("#jsOk").onclick = async () => { me.chatTok = $("#jsT").value.trim(); LS.set("me", me); const st = $("#jsSt"); st.textContent = "בודק…"; try { await api("/journal", {}, 12000); LS.del("jrErr"); toast("מחובר ✓"); flushJournal(); openShare(); } catch (e) { st.textContent = e.message === "notset" ? "השרת עונה, אבל הסיסמה עוד לא הוגדרה בו." : e.status === 401 ? "⚠️ הסיסמה לא תואמת לזו שבשרת." : "לא הצלחתי להגיע לשרת. בודקים שיש אינטרנט ומנסים שוב."; } };
}

/* ---------- הורדת כל הטיול כזיפ (קבצים מקוריים + דף HTML), ישר מהטלפון ---------- */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = t[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }; })();
function zipStore(files) { // ZIP בלי דחיסה (התמונות כבר דחוסות)
  const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
  for (const f of files) { const name = enc.encode(f.name), crc = CRC(f.data), h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint32(14, crc, true); h.setUint32(18, f.data.length, true); h.setUint32(22, f.data.length, true); h.setUint16(26, name.length, true);
    parts.push(new Uint8Array(h.buffer), name, f.data); const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint32(16, crc, true); c.setUint32(20, f.data.length, true); c.setUint32(24, f.data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true); cen.push(new Uint8Array(c.buffer), name); off += 30 + name.length + f.data.length; }
  const cs = cen.reduce((a, x) => a + x.length, 0), e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cs, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...cen, new Uint8Array(e.buffer)], { type: "application/zip" });
}
const extOf = ct => /png/.test(ct) ? "png" : /webp/.test(ct) ? "webp" : /gif/.test(ct) ? "gif" : /heic|heif/.test(ct) ? "heic" : /webm/.test(ct) ? "webm" : /video/.test(ct) ? "mp4" : "jpg";
async function exportZip() {
  if (!jr.length) return toast("עוד אין רגעים ביומן"); toast("מכין את הזיפ…", 4000); const files = [], enc = new TextEncoder(); let html = "";
  for (const m of [...jr].sort((a, b) => a.t - b.t)) { const names = [];
    for (let i = 0; i < (m.media || []).length; i++) { const x = m.media[i], b = await imgGet(x.id); if (!b) continue; const n = `media/${m.date}_${m.time.replace(":", "")}_${i + 1}.${extOf(x.ct)}`; files.push({ name: n, data: new Uint8Array(await b.arrayBuffer()) }); names.push([n, x]); }
    html += `<article><h3>${dayDate(m.date).dow} ${dayDate(m.date).dm} · ${m.time} · ${esc(m.where || "")}</h3>${m.text ? `<p>${esc(m.text)}</p>` : ""}${names.map(([n, x]) => (x.k === "v" ? `<video src="${n}" controls playsinline></video>` : `<img src="${n}" alt="">`) + (x.cap ? `<p class="cap">${esc(x.cap)}</p>` : "")).join("")}${(jrRe[m.id] || []).map(r => `<p class="re"><b>${esc(r.n)}</b> ${r.h ? "❤️" : ""} ${esc(r.x || "")}</p>`).join("")}</article>`; }
  files.push({ name: "trip.html", data: enc.encode(`<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>פראג 2026</title><style>body{font-family:system-ui,sans-serif;max-width:720px;margin:0 auto;padding:20px;background:#f5f1ea;color:#1b1c20}h1{color:#d42a33}article{background:#fff;border-radius:18px;padding:16px;margin:16px 0}img,video{width:100%;border-radius:12px;margin-top:10px}h3{margin:0 0 6px;font-size:1rem;color:#6a6c75}.re,.cap{color:#6a6c75;font-size:.9rem}</style><h1>פראג · 30.11–4.12.2026</h1>${html}</html>`) });
  const blob = zipStore(files), a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "prague-trip.zip"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000); toast(`הזיפ מוכן: ${files.length - 1} קבצים ✓`, 4200);
}
addEventListener("online", () => setTimeout(flushJournal, 1500));
setInterval(() => { flushJournal(); liveTick(); }, 60000); setInterval(() => pullReactions(false), 150000); setTimeout(() => { flushJournal(); pullReactions(true); }, 9000);
