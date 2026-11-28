/* בדיקת פרטיות לפני כל פריסה: אף מילה מהפריט האישי שבכספת לא מופיעה בשום קובץ ציבורי או בהודעת commit.
   אין כאן שום תוכן: המילים נקראות מקובץ מקומי מחוץ לרפו (~/.prague-private-words, מילה בשורה)
   ומהפריט עצמו, שמפוענח מהכספת עם המפתח המקומי (~/.prague-vault-key). שום מילה לא מודפסת, רק כמה נמצאו.
   1) מילים מהקובץ המקומי: אפס הופעות בקבצים ובכל הודעות ה-commit.
   2) כל מילה (4 אותיות ומעלה) מהטקסט של הפריט (לא שמות השדות) שלא הופיעה בקוד הציבורי לפני שהפריט נוסף (BASE): אפס הופעות בקבצים.
   אין מפתח, אין קובץ מילים או אין חיבור לכספת: הבדיקה נכשלת ולא פורסים. */
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { execFileSync } from "node:child_process";
import { pbkdf2Sync, createDecipheriv } from "node:crypto";
import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), BASE = "a12e7a944ff2e8e09c461e41b6b9e161cb126c4b";
const fail = m => { console.error("✗ בדיקת פרטיות: " + m); process.exit(1); };
const KF = homedir() + "/.prague-vault-key", WF = homedir() + "/.prague-private-words";
if (!existsSync(KF) || !existsSync(WF)) fail("חסר קובץ מקומי (מפתח או מילים)");
const KEY = readFileSync(KF, "utf8").trim(), id = pbkdf2Sync(KEY, "prg-backup-id-v1", 150000, 32, "sha256").toString("hex");
const open = buf => { const salt = buf.subarray(4, 20), iv = buf.subarray(20, 32), body = buf.subarray(32, buf.length - 16), tag = buf.subarray(buf.length - 16); const d = createDecipheriv("aes-256-gcm", pbkdf2Sync(KEY, salt, 600000, 32, "sha256"), iv); d.setAuthTag(tag); const pt = Buffer.concat([d.update(body), d.final()]); const n = pt.readUInt32BE(0), man = JSON.parse(pt.subarray(4, 4 + n).toString()); let off = 4 + n; const files = man.files.map(f => { const b = pt.subarray(off, off + f.n); off += f.n; return [f.k, b]; }); return { ls: man.ls, files }; };
const norm = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const toks = s => new Set((norm(s).match(/[a-zא-ת][a-zא-ת'"]{3,}/g) || []).map(w => w.replace(/['"]+$/, "")));
let item = "";
try { const r = await fetch(`https://prague-api.pages.dev/backup/${id}/t`, { cache: "no-store" }); if (!r.ok) throw 0; const T = open(Buffer.from(await r.arrayBuffer())), tix = JSON.parse(T.ls.tix || "{}");
  for (const it of tix.pv || []) { const f = T.files.find(x => x[0] === "tk:" + it.id); if (f) { const j = JSON.parse(f[1].toString("utf8")); delete j.name; const vals = o => typeof o === "string" ? [o] : o && typeof o === "object" ? Object.values(o).flatMap(vals) : []; item += "\n" + vals(j).join("\n"); } } /* השם הניטרלי מופיע בכוונה ברשימה */ } catch (e) { fail("אין חיבור לכספת"); }
const strong = readFileSync(WF, "utf8").split("\n").map(x => norm(x.trim())).filter(Boolean);
const TEXT = /\.(js|mjs|cjs|html|css|json|md|txt|py|toml|ics|webmanifest|svg|yml|yaml)$/i;
const git = a => execFileSync("git", a, { cwd: ROOT, maxBuffer: 1 << 28 }).toString();
const files = git(["ls-files", "-co", "--exclude-standard"]).split("\n").filter(f => f && TEXT.test(f) && existsSync(path.join(ROOT, f)));
const cur = files.map(f => [f, norm(readFileSync(path.join(ROOT, f), "utf8"))]);
const msgs = norm(git(["log", "--all", "--format=%B"]));
let hits = 0;
for (const w of strong) { for (const [, t] of cur) if (t.includes(w)) hits++; if (msgs.includes(w)) hits++; }
const base = new Set(); for (const f of git(["ls-tree", "-r", "--name-only", BASE]).split("\n").filter(f => TEXT.test(f))) { try { for (const w of toks(git(["show", BASE + ":" + f]))) base.add(w); } catch (e) {} }
const ALLOW = new Set(["נהיגה", "האריזה"]); /* מילים כלליות שמופיעות בכוונה גם בטקסט הציבורי (רישיון נהיגה למועדונים, האריזה ב-3.12) */
const fresh = [...toks(item)].filter(w => !base.has(w) && !ALLOW.has(w));
let hits2 = 0; for (const [, t] of cur) { const have = toks(t); for (const w of fresh) if (have.has(w)) hits2++; }
if (!item) fail("הפריט לא נמצא בכספת");
if (hits || hits2) fail(`נמצאו ${hits + hits2} הופעות בקבצים הציבוריים או בהודעות commit. לא פורסים`);
console.log(`✓ בדיקת פרטיות: ${strong.length + fresh.length} מילים מהפריט, 0 הופעות ב-${files.length} קבצים ציבוריים ובהודעות ה-commit`);
