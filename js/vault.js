/* vault: שהנתונים של עומר לא ילכו לאיבוד.
   • אחסון קבוע: מבקשים מהדפדפן לא למחוק (navigator.storage.persist).
   • גיבוי מוצפן אוטומטי: הכול מוצפן בטלפון (AES-GCM, מפתח מקוד שעומר בוחר, לפחות 8 תווים) ונשמר בשרת. השרת לא יכול לקרוא.
     שני חלקים: d = פרטים, תוכנית, יומן ותמונת הכניסה (קטן, מתעדכן כשמשהו משתנה); t = קבצי הכרטיסים (רק כשהם משתנים).
   • "♻️ שחזור": מקלידים את הקוד בכל דפדפן (Chrome, האייקון, טלפון חדש) והכול חוזר, במיזוג בטוח שלא מוחק כלום.
   • "✅ מה יש אצלי": בדיקה של כל פריט, עם כפתור "להשלים" למה שחסר. */
"use strict";
(function () {
try {
const enc = new TextEncoder();
const hex = u8 => [...u8].map(x => x.toString(16).padStart(2, "0")).join("");
const b64 = u8 => { let s = ""; u8.forEach(c => s += String.fromCharCode(c)); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function pbkdf2(code, salt, iter) { const k0 = await crypto.subtle.importKey("raw", enc.encode(code), "PBKDF2", false, ["deriveBits"]); return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, k0, 256)); }
const bkIdOf = code => pbkdf2(code.trim(), enc.encode("prg-backup-id-v1"), 150000).then(hex);
const aes = raw => crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
const sha = async u8 => hex(new Uint8Array(await crypto.subtle.digest("SHA-256", u8)));
const bkGet = () => LS.get("bk", null), bkSet = v => LS.set("bk", v);
const DOOR = "hotelDoor", EXPECT = { fl1: 1, fl2: 1, hot: 1, boat: 2, dup1: 2, epic: 2, dup2: 2, ins: 1 }; /* 12 קבצים + תמונת הכניסה = 13 */

/* ---------- סנכרון אוטומטי, בלי שום פעולה ----------
   המפתח (אקראי, 256 ביט) מגיע פעם אחת מהקישור האישי: …/prague/#k=<מפתח>. מה שאחרי ה-# לא נשלח לשום שרת.
   בשרת יושב רק עותק מוצפן (אותו מנגנון של הגיבוי), ובלי המפתח אי אפשר לפענח אותו. בכל פתיחה: אם משהו חסר כאן, מורידים ומשלימים בשקט.
   באייפון: כשמוסיפים למסך הבית מהקישור הזה, הכתובת עם המפתח נשמרת באייקון, אז גם אייקון חדש מתמלא לבד. */
const VK = (() => { let k = ""; try { const m = /[#&]k=([A-Za-z0-9_-]{40,64})/.exec(location.hash || ""); if (m) { k = m[1]; LS.set("vk", k); } else k = LS.get("vk", "") || ""; } catch (e) {} return k; })();
const isStandalone = () => !!(matchMedia("(display-mode: standalone)").matches || navigator.standalone);
if (VK) { try { const has = /[#&]k=/.test(location.hash || ""), clean = () => history.replaceState(null, "", location.pathname + location.search);
  if (isStandalone()) { if (has) clean(); }
  else if (/iPhone|iPad|iPod/.test(navigator.userAgent)) { if (!has) history.replaceState(null, "", location.pathname + location.search + "#k=" + VK); const ml = document.querySelector('link[rel="manifest"]'); if (ml) ml.remove(); } /* כדי ש"הוסף למסך הבית" ישמור את הכתובת הזאת, עם המפתח */
  else if (has) clean(); } catch (e) {} }
let syncing = false;
const haveCount = async () => { let n = Object.values(me || {}).filter(x => x && (typeof x !== "object" || Object.keys(x).length)).length; for (const l of Object.values(tix || {})) for (const it of l) if (await imgGet("tk:" + it.id).catch(() => null)) n++; if (await imgGet(DOOR).catch(() => null)) n++; return n; };
const looksMissing = async () => { const m = me || {}; if (!m.rc || !m.ec || !m.h1 || !m.pol || !apiTok() || !(m.contactsAll || []).some(c => c && c.p)) return true; let f = 0; for (const [k, need] of Object.entries(EXPECT)) f += Math.min((tix[k] || []).length, need); return f < 12 || !(await imgGet(DOOR).catch(() => null)); };
async function autoSync(force) {
  if (!VK || syncing || isOffline() || !(window.crypto && crypto.subtle)) return; syncing = true;
  try {
    let bk = bkGet(); const due = !bk || !bk.syncT || Date.now() - bk.syncT > 12 * 36e5;
    if (!(force || !bk || !bk.vk || !bk.synced || due || await looksMissing())) return;
    let R = null; try { R = await restoreFetch(VK); } catch (e) { if (e.message !== "none") return; } /* בעיית רשת: ננסה בפתיחה הבאה, ובינתיים לא מעלים כלום */
    if (R) { const before = await haveCount(); await restoreApply(R); bk = bkGet(); Object.assign(bk, { vk: 1, synced: 1, syncT: Date.now() }); bkSet(bk); const after = await haveCount();
      if (after > before) { try { renderAll(); } catch (e) {} toast("הכול כאן ✓ הפרטים והכרטיסים הושלמו לבד", 3600); try { const t = (($("#mbody h2") || {}).textContent || ""); if (!$("#modal").hidden) { if (/הכרטיסים/.test(t)) openTickets(); else if (/מה יש אצלי/.test(t)) openHave(); } } catch (e) {} } }
    else { const salt = crypto.getRandomValues(new Uint8Array(16)), raw = await pbkdf2(VK, salt, 600000), id = await bkIdOf(VK); bkSet({ id, salt: b64(salt), key: b64(raw), on: 1, vk: 1, synced: 1, syncT: Date.now() }); } /* עוד אין עותק בשרת: הטלפון הזה יוצר אותו */
    await backupNow(false);
  } catch (e) {} finally { syncing = false; }
}
setTimeout(() => autoSync(false), 1800);
document.addEventListener("visibilitychange", () => { if (!document.hidden) setTimeout(() => autoSync(false), 800); });
addEventListener("online", () => setTimeout(() => autoSync(false), 2500));
window.__setVaultKey = k => { if (/^[A-Za-z0-9_-]{40,64}$/.test(k)) { LS.set("vk", k); location.reload(); return true; } return false; };

/* ---------- אחסון קבוע ---------- */
async function askPersist() { try { if (navigator.storage && navigator.storage.persist) { if (await navigator.storage.persisted()) return true; return await navigator.storage.persist(); } } catch (e) {} return false; }
setTimeout(askPersist, 4000);

/* ---------- אריזה ---------- */
function userLS() { const ls = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith("prg.") && moveKeyOk(k.slice(4))) ls[k.slice(4)] = localStorage.getItem(k); } return ls; }
async function pack(ls, files) {
  const man = JSON.stringify({ v: 1, ts: Date.now(), ls, files: files.map(([k, b]) => ({ k, t: b.type || "", n: b.size })) }), mb = enc.encode(man), head = new Uint8Array(4); new DataView(head.buffer).setUint32(0, mb.length);
  return new Uint8Array(await new Blob([head, mb, ...files.map(([, b]) => b)]).arrayBuffer());
}
function unpack(pt) { const n = new DataView(pt.buffer, pt.byteOffset).getUint32(0), man = JSON.parse(new TextDecoder().decode(pt.slice(4, 4 + n))); let off = 4 + n; const files = man.files.map(f => { const b = new Blob([pt.slice(off, off + f.n)], { type: f.t }); off += f.n; return [f.k, b]; }); return { man, files }; }
async function seal(raw, salt, plain) { const iv = crypto.getRandomValues(new Uint8Array(12)), ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aes(raw), plain)); return new Blob([enc.encode("PBK1"), salt, iv, ct]); }
async function open_(buf, code) { const b = new Uint8Array(buf); if (new TextDecoder().decode(b.slice(0, 4)) !== "PBK1") throw new Error("format"); const salt = b.slice(4, 20), iv = b.slice(20, 32), raw = await pbkdf2(code, salt, 600000); const pt = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await aes(raw), b.slice(32))); return { pt, salt, raw }; }
async function partD() { const door = await imgGet(DOOR).catch(() => null); const ls = userLS(); delete ls.tix; return pack(ls, door ? [[DOOR, door]] : []); }
async function partT() { const all = await idbAll().catch(() => []), files = all.filter(([k, v]) => /^tk:/.test(k) && v instanceof Blob); return pack({ tix: localStorage.getItem("prg.tix") || "{}" }, files); }

/* ---------- גיבוי אוטומטי ---------- */
let busy = false;
async function backupNow(force) {
  const bk = bkGet(); if (!bk || !bk.id || busy || isOffline() || !apiTok() || (bk.vk && !bk.synced)) return { skipped: true };
  busy = true; const out = {};
  try {
    for (const [p, make] of [["d", partD], ["t", partT]]) {
      const plain = await make(), h = await sha(plain); if (!force && bk["h" + p] === h) continue;
      const blob = await seal(unb64(bk.key), unb64(bk.salt), plain);
      const r = await fetch(apiUrl() + `/backup/${bk.id}/${p}`, { method: "PUT", headers: { "x-app-token": apiTok(), "content-type": "application/octet-stream" }, body: await blob.arrayBuffer() });
      if (!r.ok) throw new Error(r.status === 401 ? "auth" : "net");
      bk["h" + p] = h; bk["ts" + p] = Date.now(); bk["sz" + p] = blob.size; out[p] = blob.size;
    }
    bk.err = ""; bkSet(bk); return out;
  } catch (e) { bk.err = e.message; bkSet(bk); return { err: e.message }; } finally { busy = false; }
}
setTimeout(() => backupNow(false), 25000); setInterval(() => backupNow(false), 5 * 60000);
document.addEventListener("visibilitychange", () => { if (document.hidden) backupNow(false); });
addEventListener("online", () => setTimeout(() => backupNow(false), 3000));

async function setupBackup(code) { const salt = crypto.getRandomValues(new Uint8Array(16)), raw = await pbkdf2(code, salt, 600000), id = await bkIdOf(code); bkSet({ id, salt: b64(salt), key: b64(raw), on: 1 }); return backupNow(true); }

/* ---------- שחזור ---------- */
async function fetchPart(id, p) { const r = await fetch(apiUrl() + `/backup/${id}/${p}`, { cache: "no-store" }); if (r.status === 404) return null; if (r.status === 429) throw new Error("slow"); if (!r.ok) throw new Error("net"); return { buf: await r.arrayBuffer(), ts: +r.headers.get("x-backup-ts") || 0 }; }
async function restoreFetch(code) {
  const id = await bkIdOf(code), d = await fetchPart(id, "d"); if (!d) throw new Error("none");
  let od; try { od = await open_(d.buf, code); } catch (e) { throw new Error("code"); }
  const D = unpack(od.pt), t = await fetchPart(id, "t").catch(() => null); let T = null; if (t) { try { T = unpack((await open_(t.buf, code)).pt); } catch (e) {} }
  return { id, salt: od.salt, raw: od.raw, D, T, ts: d.ts };
}
async function restoreApply(R) {
  safeApplyLS(R.D.man.ls); await safePutFiles(R.D.files, false);
  if (R.T) { safeApplyLS(R.T.man.ls); await safePutFiles(R.T.files, false); }
  bkSet({ id: R.id, salt: b64(R.salt), key: b64(R.raw), on: 1 }); /* מכאן הטלפון הזה ממשיך לגבות לאותו מקום */
}

/* ---------- מסכים ---------- */
const ago = ts => { if (!ts) return "עוד לא"; const m = Math.round((Date.now() - ts) / 6e4); return m < 1 ? "עכשיו" : m < 60 ? `לפני ${m} דק'` : m < 1440 ? `לפני ${Math.round(m / 60)} שע'` : new Date(ts).toLocaleDateString("he-IL"); };
const kbs = n => n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.round((n || 0) / 1024) + " KB";
const where = () => (matchMedia("(display-mode: standalone)").matches || navigator.standalone) ? "📱 האייקון במסך הבית" : /CriOS/.test(navigator.userAgent) ? "🌐 Chrome" : /FxiOS/.test(navigator.userAgent) ? "🌐 Firefox" : "🧭 Safari / דפדפן";
function openBackup() {
  const bk = bkGet();
  openModal(`<h2>☁️ גיבוי ושחזור</h2><p class="sub">הכול מוצפן בטלפון לפני שהוא יוצא. השרת שומר רק בלוק נעול, ובלי הקוד שלך אי אפשר לקרוא אותו (גם לא אני).</p>
    ${VK ? `<div class="card soft"><b>🔗 סנכרון אוטומטי פעיל כאן</b><p class="sub">הדפדפן הזה מחובר לקישור האישי שלך. מה שחסר מושלם לבד בכל פתיחה, ומה שמתווסף נשמר בעותק המוצפן.</p><button class="btn wide" id="bkSync">🔄 לסנכרן עכשיו</button></div>` : ""}
    ${bk && bk.id ? `<div class="card soft"><b>✓ גיבוי אוטומטי פעיל</b><ul class="imp"><li><small>פרטים, תוכנית, יומן ותמונה</small><b>${ago(bk.tsd)}${bk.szd ? " · " + kbs(bk.szd) : ""}</b></li><li><small>קבצי כרטיסים</small><b>${ago(bk.tst)}${bk.szt ? " · " + kbs(bk.szt) : ""}</b></li></ul>${bk.err ? `<p class="jr-note">⚠️ הגיבוי האחרון לא עלה (${bk.err === "auth" ? "סיסמת היומן חסרה או ישנה" : "בעיית רשת"}). ינסה שוב לבד.</p>` : ""}<button class="btn wide" id="bkNow">⬆️ לגבות עכשיו</button></div>`
      : `<div class="card soft"><b>להפעיל גיבוי אוטומטי</b><p class="sub">בוחרים קוד שקל לך לזכור (לפחות 8 תווים, אפשר מילים). עם הקוד הזה משחזרים הכול בכל טלפון ובכל דפדפן.</p>
        ${apiTok() ? "" : `<p class="jr-note">🔑 לגיבוי צריך את סיסמת היומן בטלפון הזה (היא זו שמאשרת העלאה). מייבאים אותה קודם מה-QR.</p>`}
        <label class="fld">קוד גיבוי<input id="bkC1" type="password" autocomplete="new-password" dir="ltr" minlength="8"></label><label class="fld">שוב, לוודא<input id="bkC2" type="password" autocomplete="new-password" dir="ltr"></label>
        <button class="btn pri wide" id="bkOn" ${apiTok() ? "" : "disabled"}>להפעיל ולגבות עכשיו</button></div>`}
    <p class="sub" id="bkSt"></p>
    <div class="card soft"><b>♻️ שחזור</b><p class="sub">בטלפון חדש, ב-Chrome או באייקון: מקלידים את קוד הגיבוי והכול חוזר. מה שכבר יש כאן לא נמחק.</p><button class="btn wide" id="bkRe">♻️ לשחזר מגיבוי</button></div>`, "tall");
  const st = $("#bkSt");
  if ($("#bkNow")) $("#bkNow").onclick = async () => { st.textContent = "מגבה…"; const r = await backupNow(true); st.textContent = r.err ? "⚠️ לא הצליח: " + (r.err === "auth" ? "סיסמת היומן חסרה או ישנה" : "אין רשת") : r.skipped ? "אין רשת או סיסמת יומן כרגע." : "✓ גובה"; setTimeout(openBackup, 900); };
  if ($("#bkOn")) $("#bkOn").onclick = async () => { const a = $("#bkC1").value, b = $("#bkC2").value; if (a.trim().length < 8) { st.textContent = "לפחות 8 תווים."; return; } if (a !== b) { st.textContent = "שני הקודים לא זהים."; return; } $("#bkOn").disabled = true; st.textContent = "מצפין ומעלה… (כמה שניות)"; const r = await setupBackup(a); st.textContent = r.err ? "⚠️ " + (r.err === "auth" ? "סיסמת היומן לא מתקבלת" : "אין רשת, ינסה שוב לבד") : "✓ הגיבוי פעיל. תשמור את הקוד במקום בטוח."; buzz([12, 40, 12]); setTimeout(openBackup, 1600); };
  $("#bkRe").onclick = () => openRestore();
  if ($("#bkSync")) $("#bkSync").onclick = async () => { st.textContent = "מסנכרן…"; await autoSync(true); st.textContent = "✓ מסונכרן"; setTimeout(openBackup, 900); };
}
function openRestore() {
  openModal(`<h2>♻️ שחזור מגיבוי</h2><p class="sub">מקלידים את קוד הגיבוי. ההורדה והפענוח בטלפון בלבד. מה שכבר יש כאן נשאר: רק מוסיפים את מה שחסר.</p>
    <label class="fld">קוד הגיבוי<input id="reC" type="password" autocomplete="current-password" dir="ltr"></label><button class="btn pri wide" id="reGo">לשחזר</button><p class="sub" id="reSt"></p><div id="reOut"></div>`, "tall");
  const st = $("#reSt");
  $("#reGo").onclick = async () => {
    const code = $("#reC").value; if (code.trim().length < 8) { st.textContent = "הקוד הוא לפחות 8 תווים."; return; }
    if (isOffline()) { st.textContent = "📡 צריך אינטרנט לשחזור."; return; }
    $("#reGo").disabled = true; st.textContent = "מוריד ומפענח… (עד חצי דקה)"; let R;
    try { R = await restoreFetch(code); } catch (e) { $("#reGo").disabled = false; st.textContent = e.message === "none" ? "לא מצאתי גיבוי עם הקוד הזה. בודקים אותיות גדולות/קטנות ורווחים." : e.message === "code" ? "הקוד לא מתאים לגיבוי." : e.message === "slow" ? "יותר מדי ניסיונות. מחכים שעה." : "📡 בעיית רשת. מנסים שוב."; return; }
    const s = moveSummary(Object.assign({}, R.D.man.ls, R.T ? R.T.man.ls : {}), (R.T ? R.T.files.length : 0) + R.D.files.length);
    $("#reC").closest("label").hidden = true; $("#reGo").hidden = true; st.textContent = `גיבוי מ-${new Date(R.ts || Date.now()).toLocaleString("he-IL")}:`;
    $("#reOut").innerHTML = `<ul class="imp">${sumRows(s).map(r => `<li><small>${r[0]}</small><b>${r[1]}</b></li>`).join("")}<li><small>🖼️ תמונת הכניסה</small><b>${R.D.files.some(f => f[0] === DOOR) ? "יש" : "אין"}</b></li></ul><button class="btn pri wide" id="reOk">לשחזר הכול לכאן</button>`;
    $("#reOk").onclick = async () => { $("#reOk").disabled = true; $("#reOk").textContent = "משחזר…"; try { await restoreApply(R); toast("הכול שוחזר ✓", 2500); setTimeout(() => location.reload(), 1300); } catch (e) { $("#reOk").disabled = false; $("#reOk").textContent = "לנסות שוב"; st.textContent = "⚠️ לא הצלחתי לשמור כאן (אולי אין מקום)."; } };
  };
}
async function haveChecks() {
  const m = me || {}, notes = String(m.notes || ""), cs = (m.contactsAll || []).filter(c => String(c.p || "").replace(/\D/g, "").length >= 9);
  let files = 0; const missing = [];
  for (const [k, need] of Object.entries(EXPECT)) { let have = 0; for (const it of (tix[k] || [])) { if (await imgGet("tk:" + it.id).catch(() => null)) have++; } files += Math.min(have, need); if (have < need) missing.push(k); }
  const door = !!(await imgGet(DOOR).catch(() => null)), persisted = await (navigator.storage && navigator.storage.persisted ? navigator.storage.persisted().catch(() => false) : Promise.resolve(false));
  const bk = bkGet(), books = ["Y2TTH6", "6725430694", "1796276", "1796410", "TCK-G144", "L7976T"].filter(b => notes.includes(b)).length;
  return [
    ["🏨 המלון (כתובת ומיקום)", !!(m.hotel && m.hotel.q), "me"],
    ["🔑 קוד דלת הקבלה", !!m.rc, "me"], ["🚪 קוד כניסת החדרים", !!m.ec, "me"],
    ["🆘 טלפוני חירום של המלון", !!(m.h1 && m.h2), "me"], ["☎️ טלפון הקבלה", /קבלה/.test(notes), "me"],
    [`👪 אמא ואבא (${cs.length} מתוך 2)`, cs.length >= 2, "me"],
    ["🛡️ ביטוח הראל: פוליסה ומוקד", !!(m.pol && m.ins), "me"],
    [`🧾 מספרי הזמנה (${books} מתוך 6)`, books >= 6, "me"],
    [`🎟️ כרטיסים (${files + (door ? 1 : 0)} מתוך 13)`, files >= 12 && door, "tix", missing],
    ["🖼️ תמונת הכניסה למלון", door, "door"],
    ["🔑 סיסמת היומן להורים", !!apiTok(), "tok"],
    [VK ? `🔗 סנכרון אוטומטי ${bk && bk.syncT ? "· " + ago(bk.syncT) : ""}` : "🔗 סנכרון אוטומטי (צריך לפתוח פעם אחת את הקישור האישי)", !!(VK && bk && bk.synced), VK ? "bk" : "sync"],
    [`☁️ גיבוי מוצפן ${bk && bk.tsd ? "· " + ago(bk.tsd) : ""}`, !!(bk && bk.id && bk.tsd), "bk"],
    ["💾 אחסון קבוע (הדפדפן לא ימחק)", !!persisted, "persist"]
  ];
}
async function openHave() {
  openModal(`<h2>✅ מה יש אצלי</h2><p class="sub">${where()} · גרסה ${(() => { try { return new URL($('script[src*="extras.js"]').src).searchParams.get("v"); } catch (e) { return "?"; } })()}. כל דפדפן ואייקון באייפון שומרים בנפרד, אז הבדיקה היא על המקום הזה.</p><ul class="have" id="hvL"><li>בודק…</li></ul>
    <div class="row wrap" style="margin-top:10px"><button class="btn" id="hvRe">♻️ שחזור מגיבוי</button><button class="btn" id="hvImp">📥 ייבוא מ-QR</button><button class="btn" id="hvMv">📲 העברה</button></div>`, "tall");
  const rows = await haveChecks(), go = { me: () => openMe(), tix: () => openTickets(), door: () => openMe(), tok: () => openImport(""), bk: () => openBackup(), sync: () => { openImport(""); setTimeout(() => { const st = $("#impSt"); if (st) st.textContent = "מדביקים כאן את הקישור האישי (זה עם ה-#k=). פעם אחת, ומכאן הכול מתמלא לבד."; }, 300); }, persist: async () => { const ok = await askPersist(); toast(ok ? "האחסון קבוע ✓" : "הדפדפן לא אישר. באייקון במסך הבית זה קבוע ממילא.", 3200); openHave(); } };
  const L = $("#hvL"); if (!L) return;
  L.innerHTML = rows.map(([t, ok, k, extra], i) => `<li class="${ok ? "ok" : "no"}"><span>${ok ? "✓" : "✗"}</span><b>${t}${!ok && extra && extra.length ? `<small>חסר: ${extra.map(x => (typeof DOC_LBL !== "undefined" && DOC_LBL[x]) || x).join(", ")}</small>` : ""}</b>${ok ? "" : `<button class="btn sm" data-hv="${i}">להשלים</button>`}</li>`).join("");
  L.querySelectorAll("[data-hv]").forEach(b => b.onclick = () => { closeModal(); setTimeout(() => go[rows[+b.dataset.hv][2]](), 250); });
  $("#hvRe").onclick = () => openRestore(); $("#hvImp").onclick = () => openImport(""); $("#hvMv").onclick = () => openMove();
}
Object.assign(window, { openHave, openBackup, openRestore, backupNow, askPersist, autoSync });

(() => { const st = document.createElement("style"); st.textContent = `
.have{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}
.have li{display:flex;align-items:center;gap:10px;background:var(--card2);border-radius:12px;padding:10px 12px}
.have li>span{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-weight:800;flex:none}
.have li.ok>span{background:rgba(57,224,122,.18);color:#1f9d55}.have li.no>span{background:rgba(212,42,51,.15);color:var(--red,#d42a33)}
.have li b{flex:1;font-weight:600;font-size:.92rem;display:flex;flex-direction:column}.have li b small{font-weight:500;color:var(--mut);font-size:.75rem}
.have .btn.sm{padding:6px 12px;font-size:.82rem;min-height:0}
`; document.head.appendChild(st); })();
(window.__mods = window.__mods || {}).vault = "ok";
} catch (err) { try { console.warn("vault:", err); (window.__mods = window.__mods || {}).vault = "fail: " + (err && err.message || err); } catch (e) {} }
})();
