/* build-photos: תמונה חופשית (Wikimedia Commons) לכל מקום במסלול ולכל "שווה בסביבה", דחוסה, עם קרדיט.
   מריצים מהמחשב פעם אחת: node worker/build-photos.mjs. כותב img/p/<key>.jpg ו-js/photos-data.js.
   רק תמונות עם רישיון חופשי (pilicense=free ב-Wikipedia, ובדיקת הרישיון ב-Commons). בלי תמונה: האפליקציה מציגה אייקון. */
import fs from "fs"; import vm from "vm"; import { execFileSync } from "child_process"; import path from "path"; import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ctx = {}; vm.runInNewContext(fs.readFileSync(R + "/data.js", "utf8") + ";this.T=TRIP", ctx); const T = ctx.T;
const UA = { "User-Agent": "trip-pwa-photo-builder/1.0 (static site build)" };
const get = async u => { for (let i = 0; i < 4; i++) { const r = await fetch(u, { headers: UA }); if (r.ok) return r; await new Promise(z => setTimeout(z, 5000 * (i + 1))); } throw new Error("fetch " + u); };
const FREE = /^(CC0|CC BY(-SA)? [1-4]\.0|CC BY(-SA)? 2\.5|Public domain|PD|Attribution|GFDL|FAL)/i;
const strip = h => String(h || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
const SKIP = new Set(["airport"]); /* תמונת לוויין, לא עוזרת. עדיף אייקון */
const jobs = [];
for (const [k, inf] of Object.entries(T.info)) if ((inf.wiki || inf.file) && !SKIP.has(k)) jobs.push({ key: k, wiki: inf.wiki, file: inf.file });
for (const x of T.extras) if (x.wiki || x.file) jobs.push({ key: x.id, wiki: x.wiki, file: x.file });
fs.mkdirSync(R + "/img/p", { recursive: true });
const out = (() => { try { const c = {}; vm.runInNewContext(fs.readFileSync(R + "/js/photos-data.js", "utf8") + ";this.P=PHOTOS", c); return c.P; } catch (e) { return {}; } })(); /* ממשיכים מאיפה שעצרנו */
for (const j of jobs) {
  if (out[j.key] && fs.existsSync(R + "/img/p/" + j.key + ".jpg")) continue;
  try {
    let file = j.file;
    if (!file) { const q = await (await get(`https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=name&pilicense=free&redirects=1&titles=${encodeURIComponent(j.wiki)}`)).json();
      const pg = Object.values(q.query.pages)[0]; file = pg && pg.pageimage; }
    if (!file) { console.log("—", j.key, "no free page image"); continue; }
    const c = await (await get(`https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=720&titles=${encodeURIComponent("File:" + file)}`)).json();
    const ii = Object.values(c.query.pages)[0].imageinfo; if (!ii) { console.log("—", j.key, "not on commons"); continue; }
    const m = ii[0].extmetadata || {}, lic = strip(m.LicenseShortName && m.LicenseShortName.value);
    if (!FREE.test(lic)) { console.log("—", j.key, "license", lic); continue; }
    const buf = Buffer.from(await (await get(ii[0].thumburl)).arrayBuffer()), tmp = R + "/img/p/_" + j.key, dst = R + "/img/p/" + j.key + ".jpg";
    fs.writeFileSync(tmp, buf);
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "52", "--resampleWidth", "480", tmp, "--out", dst], { stdio: "ignore" }); fs.unlinkSync(tmp);
    out[j.key] = { a: strip(m.Artist && m.Artist.value) || "Wikimedia Commons", l: lic, u: ii[0].descriptionurl };
    console.log("✓", j.key, (fs.statSync(dst).size / 1024).toFixed(0) + "KB", lic);
    await new Promise(z => setTimeout(z, 2500));
  } catch (e) { console.log("✗", j.key, e.message); }
}
fs.writeFileSync(R + "/js/photos-data.js", "/* נוצר על ידי worker/build-photos.mjs. תמונות חופשיות מ-Wikimedia Commons, עם קרדיט. */\nconst PHOTOS = " + JSON.stringify(out) + ";\n");
console.log(Object.keys(out).length, "photos");
