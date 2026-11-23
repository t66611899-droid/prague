// בדיקת בטיחות לנתוני המשתמש — רצה אוטומטית לפני כל פריסה (מתוך bump-version.py), ונכשלת אם משהו בקוד עלול למחוק נתונים.
// הכלל: עדכון, migration, ניקוי מטמון או שומר-עלייה נוגעים רק בקבצי האפליקציה (מטמון prg-v*, service worker), אף פעם לא ב-localStorage/IndexedDB של המשתמש.
// מחיקה מותרת רק במקומות שהמשתמש עצמו לוחץ "מחק", או בזיכרונות זמניים שברשימה.
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = ["index.html", "sw.js", ...readdirSync(join(ROOT, "js")).filter(f => f.endsWith(".js")).map(f => "js/" + f)];
const TRANSIENT = new Set(["chatQ", "dropDel", "jrErr", "sosPending"]);                      // זיכרונות זמניים בלבד
const IMGDEL_OK = [/imgDel\("tk:" \+ ev\.target\.dataset\.x\)/, /imgDel\("drop:" \+ id\)/, /imgDel\(x\.id\)/, /imgDel\("t:" \+ x\.id\)/, /imgDel\("hotelDoor"\)/]; // לחיצת "מחק" של המשתמש / חבילת מסירה זמנית
const errs = [];
for (const f of files) {
  const lines = readFileSync(join(ROOT, f), "utf8").split("\n");
  lines.forEach((ln, i) => {
    const at = `${f}:${i + 1}`;
    if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|indexedDB\.deleteDatabase\s*\(/.test(ln)) errs.push(`${at} מחיקה גורפת של אחסון`);
    if (/caches\.delete\s*\(/.test(ln) && !/prg-v/.test(ln)) errs.push(`${at} caches.delete בלי סינון ל-prg-v (רק קבצי אפליקציה)`);
    if (/localStorage\.removeItem\s*\(/.test(ln) && !(f === "js/core.js" && /del\(k\)/.test(ln))) errs.push(`${at} localStorage.removeItem מחוץ ל-LS.del`);
    for (const m of ln.matchAll(/LS\.del\(\s*"([^"]+)"/g)) if (!TRANSIENT.has(m[1]) && !/^(track\.|pack\.)/.test(m[1]) && !/Seen$/.test(m[1])) errs.push(`${at} LS.del("${m[1]}") — מפתח של נתוני משתמש`);
    if (/LS\.del\(\s*[^"\s)]/.test(ln) && !/^\s*del\(k\)/.test(ln) && f !== "js/core.js") errs.push(`${at} LS.del עם מפתח דינמי`);
    for (const m of ln.matchAll(/imgDel\([^)]*\)/g)) if (!IMGDEL_OK.some(re => re.test(m[0]))) errs.push(`${at} ${m[0]} — מחיקת קובץ שלא ברשימה המותרת`);
    if (/LS\.set\(\s*"(me|tix|jr|plan|exp|marks|arr|prep|diary|rem)"\s*,\s*(\{\s*\}|\[\s*\]|null|""|undefined)\s*\)/.test(ln)) errs.push(`${at} דריסה בערך ריק של נתוני משתמש`);
    if (/localStorage\.setItem\(\s*"prg\.(me|tix)"/.test(ln)) errs.push(`${at} כתיבה ישירה ל-me/tix (חייב לעבור דרך מיזוג בטוח)`);
  });
}
// ה-service worker מוחק רק מטמונים של גרסאות ישנות
const sw = readFileSync(join(ROOT, "sw.js"), "utf8");
if (!/k\.startsWith\("prg-v"\) && k !== V/.test(sw)) errs.push("sw.js: ה-activate חייב למחוק רק מטמוני prg-v* ישנים");
// העברה/ייבוא חייבים לעבור דרך המיזוג הבטוח
const tr = readFileSync(join(ROOT, "js/transfer.js"), "utf8"), im = readFileSync(join(ROOT, "js/import.js"), "utf8");
if (!/safeApplyLS\(data\.man\.ls\)/.test(tr)) errs.push("transfer.js: moveApply לא עובר דרך safeApplyLS");
if (!/mergeMe\(me, f\)/.test(im)) errs.push("import.js: impApply לא עובר דרך mergeMe");
if (errs.length) { console.error("✗ בדיקת בטיחות הנתונים נכשלה:\n  " + errs.join("\n  ")); process.exit(1); }
console.log(`✓ בדיקת בטיחות הנתונים: ${files.length} קבצים, אף עדכון לא נוגע בנתוני המשתמש`);
