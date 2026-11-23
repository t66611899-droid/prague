import io, re, sys
ROOT = "/Users/omer/claude low/prague/"
V = sys.argv[1]
# לפני כל פריסה: בדיקת בטיחות לנתוני המשתמש. אם משהו בקוד עלול למחוק נתונים, לא מעלים גרסה.
import subprocess
if subprocess.call(["node", ROOT + "worker/check-data-safety.mjs"]) != 0:
    sys.exit("עצרתי: בדיקת בטיחות הנתונים נכשלה, הגרסה לא עודכנה")
# index.html: every local asset gets ?v=N so a new index always pulls a matching set of files
p = ROOT + "index.html"; s = io.open(p, encoding="utf8").read()
s = re.sub(r'(src|href)="((?:js|vendor)/[^"?]+|styles\.css|data\.js|routes\.js)(\?v=\d+)?"', lambda m: f'{m.group(1)}="{m.group(2)}?v={V}"', s)
BOOT = '''<script>
/* התאוששות: אם העלייה נכשלת (למשל קבצים מגרסאות שונות מיד אחרי עדכון), מנקים את מטמון האפליקציה וטוענים מחדש פעם אחת */
window.__boot = function (why) {
  try { if (window.__booted || Date.now() - (+sessionStorage.getItem("prg.heal") || 0) < 60000) return; sessionStorage.setItem("prg.heal", Date.now()); } catch (e) { return; }
  var go = function () { location.replace(location.pathname + "?r=" + Date.now() + location.hash); };
  if (window.caches) caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return /^prg-v/.test(k); }).map(function (k) { return caches.delete(k); })); }).then(go, go); else go();
};
window.addEventListener("error", function (e) { if (!window.__booted) window.__boot(e.message); });
window.addEventListener("unhandledrejection", function (e) { if (!window.__booted) window.__boot(String(e.reason)); });
</script>
'''
if "window.__boot" not in s:
    s = s.replace('<script src="vendor/maplibre-gl.js', BOOT + '<script src="vendor/maplibre-gl.js', 1)
io.open(p, "w", encoding="utf8").write(s)

p = ROOT + "sw.js"; s = io.open(p, encoding="utf8").read()
OLD_V = re.search(r'const V = "prg-v(\d+)";', s).group(1)
s = re.sub(r'const V = "prg-v\d+";', f'const V = "prg-v{V}";', s)
io.open(p, "w", encoding="utf8").write(s)

p = ROOT + "js/extras.js"; s = io.open(p, encoding="utf8").read()
a = "  const onLoad = () => { if (mapReady) return; mapReady = true;"
assert a in s
if "window.__booted = true" not in s:
    s = s.replace(a, "  window.__booted = true; // העלייה הצליחה\n" + a, 1)
io.open(p, "w", encoding="utf8").write(s)
print("version", V)

# שער פריסה (כלל קבוע): דפדפן עם נתונים מהגרסה הקודמת חייב לעלות על הגרסה החדשה עם 13/13 כרטיסים וכל הפרטים.
# אם הבדיקה נכשלת, מחזירים את מספר הגרסה ולא פורסים.
if "--skip-upgrade-test" not in sys.argv and subprocess.call(["node", ROOT + "worker/check-upgrade.cjs"]) != 0:
    for f, pat, rep_ in ((ROOT + "index.html", r'\?v=' + V + r'(?=")', "?v=" + OLD_V), (ROOT + "sw.js", r'const V = "prg-v\d+";', f'const V = "prg-v{OLD_V}";')):
        t = io.open(f, encoding="utf8").read(); io.open(f, "w", encoding="utf8").write(re.sub(pat, rep_, t))
    sys.exit(f"עצרתי: בדיקת השדרוג נכשלה. הגרסה הוחזרה ל-{OLD_V} ולא פורסים")
