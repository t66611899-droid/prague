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
  p.on("pageerror", e => { if (!/Load failed|access control|Fetch API|network|cancel/i.test(e.message)) errs.push(e.message.slice(0, 140)); });
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
  await ctx.close(); srv.close(); try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {}
  const badDetails = Object.entries(last.details).filter(([, ok]) => !ok).map(([k]) => k), badMods = Object.entries(last.mods).filter(([, s]) => s !== "ok").map(([k, s]) => k + "=" + s);
  if (last.bootFail || !last.ui) fail("האפליקציה לא עלתה בגרסה החדשה");
  if (last.total !== 13) fail(`כרטיסים: ${last.total} מתוך 13 אחרי השדרוג`);
  if (badDetails.length) fail("פרטים שנעלמו או השתנו: " + badDetails.join(", "));
  if (last.jr !== 1) fail("רגעי היומן לא נשמרו");
  if (badMods.length) fail("מודול לא נטען: " + badMods.join(", "));
  if (errs.length) fail("שגיאות JS: " + errs.slice(0, 3).join(" | "));
  console.log(`✓ בדיקת השדרוג: גרסה ${from} → ${to}, 13/13 כרטיסים, כל הפרטים, היומן, בלי שגיאות`);
  process.exit(0);
})().catch(e => { try { srv.close(); } catch (x) {} fail(String(e && e.message || e).slice(0, 200)); });
