// אופה את poi.json: המקומות ש"לאן?" צריך בלי אינטרנט (אוכל צמחוני, קפה, מאפיות, כספומטים, סופרים, שירותים, ברים),
// ברדיוס 2 ק"מ סביב המלון וסביב כל מקום במסלול. מקור: OpenStreetMap דרך Overpass (חינם, נתונים ציבוריים). אין כאן שום פרט אישי.
//   node worker/build-poi.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url), ROOT = fileURLToPath(new URL("..", import.meta.url));
const RULES = require(ROOT + "js/poi-rules.js"), TRIP = new Function(readFileSync(ROOT + "data.js", "utf8") + ";return TRIP")();
const pts = [...Object.entries(TRIP.places).filter(([k]) => k !== "airport").map(([, p]) => p), ...TRIP.extras].filter(p => p.lat);
const SERVERS = ["https://overpass.private.coffee/api/interpreter", "https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
async function overpass(q) { let err; for (let i = 0; i < 3; i++) for (const u of SERVERS) { try { const r = await fetch(u, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": "Mozilla/5.0 trip-poi-bake/1.0" }, body: "data=" + encodeURIComponent(q), signal: AbortSignal.timeout(150000) }); if (!r.ok) throw new Error(u + " " + r.status); return await r.json(); } catch (e) { err = e; console.log("  ממתין אחרי", String(e.message).slice(0, 70)); await new Promise(r => setTimeout(r, 5000 + i * 10000)); } } throw err; }
const seen = new Set(), items = [];
// כמה מעגלים קטנים במקום שאילתה אחת ענקית: יציב יותר מול השרת
for (let i = 0; i < pts.length; i += 6) {
  const chunk = pts.slice(i, i + 6), a = `(around:2000,${chunk.map(p => p.lat.toFixed(4) + "," + p.lng.toFixed(4)).join(",")})`;
  const j = await overpass(`[out:json][timeout:120];(${RULES.query(a)});out center tags;`);
  for (const e of j.elements) { const k = e.type + e.id; if (seen.has(k)) continue; seen.add(k); const r = RULES.rec(e); if (r) items.push(r); }
  await new Promise(r => setTimeout(r, 6000));
  console.log(`נקודות ${i + 1}-${i + chunk.length}: ${j.elements.length} רשומות, סה"כ ${items.length}`);
}
// כפילויות (אותו שם באותו מקום, למשל צומת וגם בניין)
const uniq = new Map(); for (const r of items) { const k = r[0] + "|" + r[1].toLowerCase() + "|" + r[2].toFixed(4) + "|" + r[3].toFixed(4); if (!uniq.has(k) || (!uniq.get(k)[4] && r[4])) uniq.set(k, r); }
const out = [...uniq.values()].sort((a, b) => a[0].localeCompare(b[0]) || a[2] - b[2]);
const by = {}; out.forEach(r => by[r[0]] = (by[r[0]] || 0) + 1);
writeFileSync(ROOT + "poi.json", JSON.stringify({ built: new Date().toISOString().slice(0, 10), center: pts.map(p => [+p.lat.toFixed(4), +p.lng.toFixed(4)]), items: out }));
console.log("poi.json:", out.length, "מקומות", JSON.stringify(by), Math.round(readFileSync(ROOT + "poi.json").length / 1024) + " KB");
