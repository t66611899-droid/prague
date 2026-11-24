// שער פריסה: דפדפן עם נתונים מהגרסה הקודמת (האחרונה ב-git) חייב לעלות על הגרסה החדשה עם הכול — 13/13 כרטיסים וכל הפרטים.
// רץ אוטומטית מתוך bump-version.py לפני כל פריסה. אם נכשל: הגרסה חוזרת אחורה ולא פורסים.
// הנתונים כאן הם נתוני דמה בלבד. WebKit (המנוע של כל הדפדפנים באייפון) דרך Playwright.
const fs = require("fs"), os = require("os"), path = require("path"), http = require("http"), { execSync } = require("child_process");
const ROOT = path.join(__dirname, ".."), PW = process.env.PRG_PLAYWRIGHT || "/opt/homebrew/lib/node_modules/omniroute/node_modules/playwright-core";
const WK = process.env.PRG_WEBKIT || path.join(os.homedir(), "Library/Caches/ms-playwright/webkit-2370/pw_run.sh"), PORT = 8797;
const fail = m => { console.error("✗ בדיקת השדרוג נכשלה: " + m); process.exit(1); };
let webkit, devices; try { ({ webkit, devices } = require(PW)); } catch (e) { fail("Playwright לא נמצא (" + PW + "). בלי הבדיקה לא פורסים."); }
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "prg-upg-")), OLD = path.join(TMP, "old"), PROF = path.join(TMP, "profile");
fs.mkdirSync(OLD); execSync(`git -C "${ROOT}" archive HEAD | tar -x -C "${OLD}"`);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ics": "text/calendar" };
let root = OLD;
const srv = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, "http://x").pathname); if (p.endsWith("/")) p += "index.html"; fs.readFile(path.join(root, p), (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { "content-type": types[path.extname(p)] || "application/octet-stream", "cache-control": "no-cache" }); res.end(d); }); });
const verOf = dir => (/prg-v(\d+)/.exec(fs.readFileSync(path.join(dir, "sw.js"), "utf8")) || [])[1];
(async () => {
  await new Promise(r => srv.listen(PORT, r));
  const d = { ...devices["iPhone 13"] }; delete d.defaultBrowserType;
  const ctx = await webkit.launchPersistentContext(PROF, { executablePath: WK, ...d }), p = ctx.pages()[0] || await ctx.newPage(), errs = [];
  await ctx.route(u => !/^http:\/\/localhost:/.test(u.toString()), r => r.abort()); // בלי רשת חיצונית: מהיר ויציב
  p.on("pageerror", e => { if (!/Load failed|access control|Fetch API|network|cancel|Service Worker context closed|^Cannot load \.?$/i.test(e.message)) /* כולל בקשות שנקטעו כשה-service worker מתחלף באמצע טעינה: רעש רשת, לא באג */ errs.push(e.message.slice(0, 140)); });
  const B = `http://localhost:${PORT}/?splash=0`, ready = () => p.waitForFunction(() => window.__ui, null, { timeout: 45000 });
  // 1) הגרסה הקודמת, פעמיים (ה-service worker מתקין את עצמו), ואז נתוני דמה מלאים
  for (let i = 0; i < 2; i++) { await p.goto(B); await ready(); await p.waitForTimeout(2500); }
  await p.evaluate(async () => {
    me = { hotel: { lat: 50.07, lng: 14.43, q: "Test Hotel, Praha" }, rc: "1111", ec: "2222", h1: "+420 111 111 111", h2: "+420 222 222 222", pol: "123456789", ins: "+972-3-0000000", fullname: "Test User", chatTok: "T".repeat(32),
      contactsAll: [{ n: "אמא", p: "0500000001" }, { n: "אבא", p: "0500000002" }, { n: "", p: "" }], notes: "קבלה: +420 333\nY2TTH6 6725430694 1796276 1796410 TCK-G144-2026-9872 L7976T" };
    me.contacts = me.contactsAll.filter(c => c.p); LS.set("me", me);
    const need = { fl1: 1, fl2: 1, hot: 1, boat: 2, dup1: 2, epic: 2, dup2: 2, ins: 1 }; tix = {}; let n = 0;
    for (const [k, c] of Object.entries(need)) { tix[k] = []; for (let i = 0; i < c; i++) { const id = "t" + (n++); tix[k].push({ id, name: k + i + ".pdf", pdf: true, label: "" }); await imgPut("tk:" + id, new Blob(["file-" + id], { type: "application/pdf" })); } }
    LS.set("tix", tix); await imgPut("hotelDoor", new Blob(["door"], { type: "image/jpeg" })); LS.set("jr", [{ id: "m1", t: 1, date: "2026-12-01" }]);
  });
  const from = verOf(OLD);
  // 2) הגרסה החדשה: שלוש פתיחות (הראשונה עוד מהמטמון הישן, ואז ה-service worker מתחלף)
  root = ROOT; const to = verOf(ROOT); let seenNew = false, last = null;
  for (let i = 0; i < 4 && !seenNew; i++) { await p.goto(B + "&o=" + i); await ready(); await p.waitForTimeout(4500); seenNew = (await p.evaluate(() => { try { return new URL(document.querySelector('script[src*="extras.js"]').src).searchParams.get("v"); } catch (e) { return ""; } })) === to; }
  if (!seenNew && from !== to) { await ctx.close(); srv.close(); fail(`הדפדפן לא עבר לגרסה ${to} אחרי 4 פתיחות`); }
  await p.goto(B + "&final=1"); await ready(); await p.waitForTimeout(2500);
  last = await p.evaluate(async () => {
    const m = LS.get("me", {}), t = LS.get("tix", {}); let files = 0; for (const l of Object.values(t)) for (const it of l) if (await imgGet("tk:" + it.id).catch(() => null)) files++;
    const door = !!(await imgGet("hotelDoor").catch(() => null)), notes = String(m.notes || "");
    return { bootFail: !!document.getElementById("bootFail"), ui: !!window.__ui, files, door, total: files + (door ? 1 : 0),
      details: { hotel: !!(m.hotel && m.hotel.q), rc: m.rc === "1111", ec: m.ec === "2222", h1: !!m.h1, h2: !!m.h2, pol: m.pol === "123456789", ins: !!m.ins, tok: (m.chatTok || "").length === 32, contacts: (m.contactsAll || []).filter(c => c.p).length === 2, bookings: ["Y2TTH6", "6725430694", "1796276", "1796410", "TCK-G144", "L7976T"].every(b => notes.includes(b)), reception: /קבלה/.test(notes) },
      jr: (LS.get("jr", []) || []).length, mods: window.__mods || {} };
  });
  await ctx.close();
  // 3) Chrome באייפון, דפדפן ריק לגמרי: (א) בלי מפתח חייב לעלות מסך "תדביק את הקישור האישי"; (ב) עם מפתח שמור ונתונים ריקים הכול חייב לחזור לבד, 13/13.
  //    הכספת כאן היא כספת דמה שנבנית במקום (אותו פורמט בדיוק), והשרת מדומה בתוך הדפדפן. שום דבר אמיתי לא נוגע בזה.
  const crypto = require("crypto"), VKEY = crypto.randomBytes(32).toString("base64url"), vid = crypto.pbkdf2Sync(VKEY, "prg-backup-id-v1", 150000, 32, "sha256").toString("hex");
  const sealV = (ls, files) => { const man = Buffer.from(JSON.stringify({ v: 1, ts: Date.now(), ls, files: files.map(([k, t, b]) => ({ k, t, n: b.length })) })), head = Buffer.alloc(4); head.writeUInt32BE(man.length); const plain = Buffer.concat([head, man, ...files.map(f => f[2])]), salt = crypto.randomBytes(16), iv = crypto.randomBytes(12), c = crypto.createCipheriv("aes-256-gcm", crypto.pbkdf2Sync(VKEY, salt, 600000, 32, "sha256"), iv); return Buffer.concat([Buffer.from("PBK1"), salt, iv, c.update(plain), c.final(), c.getAuthTag()]); };
  const vme = { hotel: { lat: 50.07, lng: 14.43, q: "Test Hotel, Praha" }, rc: "1111", ec: "2222", h1: "+420 111 111 111", h2: "+420 222 222 222", pol: "123456789", ins: "+972-3-0000000", fullname: "Test User", chatTok: "T".repeat(32), contactsAll: [{ n: "אמא", p: "0500000001" }, { n: "אבא", p: "0500000002" }], notes: "קבלה: +420 333" };
  const vtix = {}, vfiles = []; let vn = 0; for (const [k, c] of Object.entries({ fl1: 1, fl2: 1, hot: 1, boat: 2, dup1: 2, epic: 2, dup2: 2, ins: 1 })) { vtix[k] = []; for (let i = 0; i < c; i++) { const id = "v" + (vn++); vtix[k].push({ id, name: k + i + ".pdf", pdf: true, label: "" }); vfiles.push(["tk:" + id, "application/pdf", Buffer.from("file-" + id)]); } }
  const PART = { d: sealV({ me: JSON.stringify(vme) }, [["hotelDoor", "image/jpeg", Buffer.from("door")]]), t: sealV({ tix: JSON.stringify(vtix) }, vfiles) };
  const CRIOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1";
  const ctx2 = await webkit.launchPersistentContext(path.join(TMP, "profile2"), { executablePath: WK, ...d, userAgent: CRIOS, serviceWorkers: "block" }), q = ctx2.pages()[0] || await ctx2.newPage(), cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,PUT,OPTIONS", "access-control-expose-headers": "x-backup-ts" };
  await ctx2.route(u => !/^http:\/\/localhost:/.test(u.toString()), r => { const m = /\/backup\/([a-f0-9]{64})\/(d|t)$/.exec(r.request().url()), me = r.request().method(); if (!m) return r.abort(); if (me === "OPTIONS") return r.fulfill({ status: 204, headers: cors }); if (me === "PUT") return r.fulfill({ status: 200, headers: cors, contentType: "application/json", body: '{"ok":true}' }); if (m[1] !== vid) return r.fulfill({ status: 404, headers: cors, body: "{}" }); return r.fulfill({ status: 200, headers: { ...cors, "x-backup-ts": String(Date.now()) }, contentType: "application/octet-stream", body: PART[m[2]] }); });
  const ready2 = () => q.waitForFunction(() => window.__ui, null, { timeout: 45000 });
  await q.goto(B + "&c=1"); await ready2(); await q.waitForFunction(() => { const g = document.getElementById("vkGuard"); return g && g.dataset.kind === "nokey"; }, null, { timeout: 15000 }).catch(() => fail("דפדפן ריק בלי מפתח: לא עלה המסך \"תדביק את הקישור האישי\""));
  const askTxt = await q.evaluate(() => document.getElementById("vkGuard").innerText); if (!/תדביק את הקישור האישי שלך כדי להחזיר הכול/.test(askTxt)) fail("מסך הקישור האישי בלי הכותרת הנכונה");
  await q.evaluate(k => LS.set("vk", k), VKEY); await q.goto(B + "&c=2"); await ready2(); /* מפתח שמור, נתונים ריקים, בלי שום נגיעה */
  const count2 = () => q.evaluate(async () => { const m = LS.get("me", {}), t = LS.get("tix", {}); let files = 0; for (const l of Object.values(t)) for (const it of l) if (await imgGet("tk:" + it.id).catch(() => null)) files++; const door = !!(await imgGet("hotelDoor").catch(() => null)); return { total: files + (door ? 1 : 0), details: !!(m.rc === "1111" && m.ec === "2222" && m.h1 && m.pol === "123456789" && (m.chatTok || "").length === 32 && (m.contactsAll || []).filter(c => c.p).length === 2 && m.hotel && m.hotel.q), guard: (document.getElementById("vkGuard") || { dataset: {} }).dataset.kind || "", why: ((document.querySelector("#vkGuard p") || {}).innerText || "").slice(0, 80) + " " + (LS.get("vkErr", "") || "") }; });
  let c2 = null; for (let i = 0; i < 30; i++) { await q.waitForTimeout(1000); c2 = await count2(); if (c2.total === 13 && c2.details && !c2.guard) break; }
  if (!(c2.total === 13 && c2.details)) { await ctx2.close(); srv.close(); fail(`Chrome iOS עם מפתח שמור ונתונים ריקים: חזרו ${c2.total} מתוך 13, פרטים: ${c2.details ? "כן" : "לא"}, מסך: ${c2.guard || "אין"} ${c2.why}`); }
  if (c2.guard) { await ctx2.close(); srv.close(); fail("השחזור הצליח אבל המסך לא נסגר: " + c2.guard); }
  await ctx2.close(); srv.close(); try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {}
  const badDetails = Object.entries(last.details).filter(([, ok]) => !ok).map(([k]) => k), badMods = Object.entries(last.mods).filter(([, s]) => s !== "ok").map(([k, s]) => k + "=" + s);
  if (last.bootFail || !last.ui) fail("האפליקציה לא עלתה בגרסה החדשה");
  if (last.total !== 13) fail(`כרטיסים: ${last.total} מתוך 13 אחרי השדרוג`);
  if (badDetails.length) fail("פרטים שנעלמו או השתנו: " + badDetails.join(", "));
  if (last.jr !== 1) fail("רגעי היומן לא נשמרו");
  if (badMods.length) fail("מודול לא נטען: " + badMods.join(", "));
  if (errs.length) fail("שגיאות JS: " + errs.slice(0, 3).join(" | "));
  console.log(`✓ בדיקת השדרוג: גרסה ${from} → ${to}, 13/13 כרטיסים, כל הפרטים, היומן, בלי שגיאות`);
  console.log("✓ Chrome iOS: דפדפן ריק בלי מפתח מציג את מסך הקישור האישי; עם מפתח שמור ונתונים ריקים חזרו 13/13 וכל הפרטים, לבד");
  process.exit(0);
})().catch(e => { try { srv.close(); } catch (x) {} fail(String(e && e.message || e).slice(0, 200)); });
