/* service worker: האפליקציה, הנתונים והמפה של מרכז פראג עובדים גם בלי קליטה */
const V = "prg-v55";
const SHELL = ["./", "index.html", "styles.css", "data.js", "routes.js", "manifest.webmanifest",
  "js/config.js", "js/core.js", "js/map.js", "js/ui.js", "js/chat.js", "js/flow.js", "js/safety.js", "js/updates.js", "js/more.js", "js/gallery.js", "js/media.js", "js/journal.js", "js/arrive.js", "js/tickets.js", "js/ask.js", "js/talk.js", "js/go.js", "js/where.js", "js/nav.js", "js/home.js", "js/esim.js", "js/tkview.js", "js/poi-rules.js", "poi.json", "js/prep.js", "js/import.js", "js/harel.js", "js/docs.js", "js/transfer.js", "js/vault.js", "js/feel.js", "family.html", "js/splash.js", "js/music.js", "snd/intro.m4a", "js/cine.js", "js/intro.js", "js/extras.js", "prague.ics",
  "vendor/maplibre-gl.js", "vendor/maplibre-gl.css", "vendor/mapbox-gl-rtl-text.js", "vendor/pdf.min.js", "vendor/pdf.worker.min.js", "vendor/jsQR.js", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-180.png", "icons/icon-maskable-512.png"];
const MAP = "prg-map", MEDIA = "prg-media";

self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" }))))  /* תמיד מהשרת, לא ממטמון הדפדפן */.then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("prg-v") && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// כתובות האריחים כוללות גרסה שמתחלפת כל שבוע. מנרמלים אותה כדי שאריח שמור יעבוד גם אחרי עדכון.
function tileKey(url) { const m = /^(https:\/\/tiles\.openfreemap\.org\/planet\/)[^/]+(\/\d+\/\d+\/\d+\.pbf)$/.exec(url); return m ? m[1] + "_" + m[2] : url; }

async function cacheFirst(req, name, key) {
  const c = await caches.open(name), hit = await c.match(key || req, { ignoreVary: true });
  if (hit) return hit;
  const res = await fetch(req); if (res.ok || res.type === "opaque") c.put(key || req, res.clone()); return res;
}
async function staleWhileRevalidate(req, name) {
  const c = await caches.open(name), hit = await c.match(req, { ignoreVary: true, ignoreSearch: req.mode === "navigate" });
  const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => null);
  return hit || (await Promise.race([net, new Promise(r => setTimeout(() => r(null), 6000))])) || (req.mode === "navigate" ? c.match("index.html") : Response.error());
}

// קבצי האפליקציה. כדי לעלות מהר גם ב-4G חלש:
// • קובץ עם ?v=N של הגרסה הזאת לא משתנה לעולם, אז מגישים אותו מיד מהמטמון.
// • הדף עצמו מגיע מהמטמון של אותה גרסה (תמיד תואם לקבצים). גרסה חדשה נכנסת כש-sw.js מתעדכן, ומופיעה בפתיחה הבאה.
// • אף פעם לא מגישים קובץ מגרסה אחרת (ערבוב גרסאות שובר את העלייה).
const verOf = u => new URL(u).searchParams.get("v");
async function appFetch(req, name) {
  const c = await caches.open(name), opt = { ignoreVary: true, ignoreSearch: true }, u = new URL(req.url);
  const want = verOf(req.url), sameVer = !want || want === V.slice(5), nav = req.mode === "navigate" && /\/(index\.html)?$/.test(u.pathname); // רק הדף הראשי (לא family.html)
  if (nav || (want && sameVer)) { const hit = await c.match(nav ? "index.html" : req, opt); if (hit) return hit; }
  const net = fetch(req); net.catch(() => {});
  try {
    const res = await Promise.race([net, new Promise((_, rej) => setTimeout(() => rej(new Error("slow")), 4000))]);
    if (res.ok && sameVer && !nav) c.put(req, res.clone()); return res;
  } catch (e) {
    const hit = sameVer ? await c.match(req, opt) : null; if (hit) return hit;
    return net;
  }
}

self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const u = new URL(req.url);
  if (u.origin === location.origin && u.pathname.includes("/art/")) { e.respondWith(cacheFirst(req, MEDIA).catch(() => fetch(req))); return; } // איורי הפתיחים: פעם אחת, ונשארים
  if (u.origin === location.origin) { e.respondWith(appFetch(req, V)); return; }
  if (u.hostname === "tiles.openfreemap.org") {
    if (/\.(pbf|png|json)$/.test(u.pathname) && !u.pathname.startsWith("/styles")) e.respondWith(cacheFirst(req, MAP, tileKey(req.url)).catch(() => Response.error()));
    else e.respondWith(staleWhileRevalidate(req, MAP)); // סגנונות ו-TileJSON
    return;
  }
  if (u.hostname.endsWith("basemaps.cartocdn.com")) { e.respondWith(cacheFirst(req, MAP).catch(() => Response.error())); return; }
  if (u.hostname === "fonts.googleapis.com") { e.respondWith(staleWhileRevalidate(req, MEDIA)); return; }
  if (u.hostname === "fonts.gstatic.com" || u.hostname === "upload.wikimedia.org") { e.respondWith(cacheFirst(req, MEDIA).catch(() => Response.error())); return; }
  if (u.hostname === "en.wikipedia.org") { e.respondWith(staleWhileRevalidate(req, MEDIA)); return; }
  // מזג אוויר, חיפוש, ניתוב וצ'אט: תמיד מהרשת (האפליקציה שומרת בעצמה מה שצריך)
});

// Web Push: ההתראה מגיעה בלי תוכן, ואת הטקסט מושכים מהשרת. אם אין קליטה באותו רגע, מציגים הודעה כללית.
try { importScripts("js/config.js"); } catch (e) {}
self.addEventListener("push", e => {
  e.waitUntil((async () => {
    let d = { title: "🔥 אירוע חדש בפראג", body: "פותחים את האפליקציה לפרטים" };
    try {
      const base = (typeof CONFIG !== "undefined" && CONFIG.chatUrl) || "";
      if (base) { const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 6000); const r = await fetch(base + "/push/latest", { signal: ctl.signal, cache: "no-store" }); clearTimeout(to); const j = await r.json(); if (j && j.title) d = j; }
    } catch (err) {}
    await self.registration.showNotification(String(d.title).slice(0, 80), { body: String(d.body || "").slice(0, 200), icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: "prague-event", renotify: true, dir: "rtl", lang: "he" });
  })());
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window" }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow("./")));
});
