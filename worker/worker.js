/* Cloudflare Worker: מתווך בין האפליקציה ל-Claude API.
   הסודות נמצאים רק כאן, כמשתני סביבה מוצפנים (Settings → Variables and Secrets):
     ANTHROPIC_API_KEY  המפתח מ-console.anthropic.com
     APP_TOKEN          סיסמה שבחרת. אותה מקלידים פעם אחת באפליקציה
   אופציונלי: ALLOWED_ORIGIN (כתובת האתר), DAILY_LIMIT (ברירת מחדל 40), MODEL, וקישור KV בשם LIMITS למונה יומי אמין. */

const SYSTEM = `אתה שותף טיול של עומר בפראג. עונה בעברית, קצר וקליל, מעשי. הוא בן 18, מטייל לבד, אוכל בלי בשר, אוהב לטייל ברגל, קניות ומקומות של צעירים. תן 2–3 אפשרויות עם מרחק הליכה.
כללים:
- שמות מקומות ורחובות כותבים כמו על השלטים (צ'כית או אנגלית), כדי שיזהה אותם.
- בכל פעם שאתה ממליץ על מקומות ספציפיים, קרא גם לכלי show_places כדי שיופיעו על המפה. רק מקומות שאתה בטוח שקיימים. אם אתה לא בטוח בשם או בכתובת, אמור את זה.
- בלי הקדמות ובלי רשימות ארוכות. עד 90 מילים. בלי Markdown.
- בלילה: מעדיף רחובות ראשיים ומוארים, ומונית רק דרך אפליקציית Bolt.
- אל תמליץ על אוכל עם בשר. אל תמציא שעות פתיחה או מחירים.`;

const TOOL = {
  name: "show_places",
  description: "מציג מקומות על המפה באפליקציה של עומר, עם כפתורי ניווט והוספה למסלול.",
  input_schema: {
    type: "object",
    properties: {
      places: {
        type: "array", maxItems: 4,
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "שם המקום כמו שהוא כתוב על השלט" },
            query: { type: "string", description: "מחרוזת חיפוש למפה: שם + רחוב + Praha" },
            lat: { type: "number" }, lng: { type: "number" },
            note: { type: "string", description: "משפט קצר בעברית: מה זה ולמה שווה" }
          },
          required: ["name", "query", "note"]
        }
      }
    },
    required: ["places"]
  }
};

const mem = new Map(); // מונה גיבוי בזיכרון, כשאין KV
const json = (o, status, cors) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json; charset=utf-8", ...cors } });
function same(a, b) { if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

/* ---------- אירועים: פעמיים ביום (09:00 ו-16:00 בפראג), בין 28.11 ל-4.12, Claude מחפש באינטרנט ושומר JSON ב-KV ---------- */
const EVENTS_PROMPT = `מצא אירועים בפראג בין 30.11.2026 ל-4.12.2026 שמתאימים לעומר: בן 18, מטייל לבד, אוהב מסיבות ומועדונים, שווקי חג המולד, הופעות, אירועי סטודנטים ו-Erasmus, פופ-אפים, דברים חינמיים ומקומות של צעירים. בלי מוזיאונים ובלי אירועים שדורשים גיל 21.
האזורים שלו לפי יום:
30.11 ערב: Vinohrady, ליד I. P. Pavlova.
1.12: Staré Město, Malá Strana, Hradčany. בערב כבר יש לו מסיבת סירה ו-Duplex.
2.12: Náplavka, Vyšehrad, Letná, Holešovice, ובערב Staré Město. בלילה כבר יש לו EPIC.
3.12: Vinohrady, Václavské náměstí, Náměstí Republiky, Anděl. בלילה כבר יש לו Duplex.
4.12 בוקר: Vinohrady בלבד.
חפש במקורות כמו GoOut.net, Prague.eu, Resident Advisor, אתרי מועדונים ודפי אירועים ציבוריים. רק אירועים שמצאת להם מקור אמיתי עם תאריך. אל תמציא.
החזר אך ורק מערך JSON (בלי טקסט לפני או אחרי), עד 12 פריטים, כל פריט:
{"name":"שם האירוע כמו במקור","date":"YYYY-MM-DD","time":"HH:MM","place":"שם המקום","lat":50.08,"lng":14.42,"price":"חינם / 200 Kč / לא ידוע","url":"https://...","why":"משפט אחד בעברית: למה זה מתאים לו","score":1-5}
score 5 רק למשהו שממש שווה לשנות בשבילו תוכנית.`;
async function findEvents(env, manual) {
  if (!env.ANTHROPIC_API_KEY || !env.LIMITS) return { ok: false, error: "חסר ANTHROPIC_API_KEY או KV בשם LIMITS" };
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Prague" });
  if (!manual && (today < "2026-11-28" || today > "2026-12-04")) return { ok: false, error: "מחוץ לתאריכי הטיול" };
  const rk = "evruns:" + today, runs = +(await env.LIMITS.get(rk)) || 0;
  if (runs >= 2) return { ok: false, error: "כבר רצו 2 חיפושים היום" };
  await env.LIMITS.put(rk, String(runs + 1), { expirationTtl: 172800 });
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: env.EVENTS_MODEL || env.MODEL || "claude-haiku-5-5", max_tokens: 3000, tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }], messages: [{ role: "user", content: EVENTS_PROMPT + "\nהיום: " + today }] })
  });
  if (!r.ok) { const t = await r.text(); console.log("events", r.status, t.slice(0, 300)); return { ok: false, error: "Claude " + r.status }; }
  const j = await r.json(), text = (j.content || []).filter(b => b.type === "text").map(b => b.text).join("\n"), m = text.match(/\[[\s\S]*\]/);
  let items = []; try { items = JSON.parse(m ? m[0] : "[]"); } catch (e) { return { ok: false, error: "התשובה לא הייתה JSON תקין" }; }
  items = items.filter(e => e && typeof e.name === "string" && /^2026-1[12]-\d\d$/.test(e.date || "") && typeof e.lat === "number" && typeof e.lng === "number" && e.lat > 49.94 && e.lat < 50.18 && e.lng > 14.22 && e.lng < 14.71)
    .slice(0, 25).map(e => ({ name: e.name.slice(0, 90), date: e.date, time: String(e.time || "").slice(0, 5), place: String(e.place || "").slice(0, 70), lat: +e.lat.toFixed(5), lng: +e.lng.toFixed(5), price: String(e.price || "").slice(0, 30), url: /^https:\/\//.test(e.url || "") ? e.url.slice(0, 300) : "", why: String(e.why || "").slice(0, 160), score: Math.max(1, Math.min(5, Math.round(+e.score) || 3)) }));
  if (items.length) await env.LIMITS.put("events", JSON.stringify({ updated: new Date().toISOString(), items }));
  return { ok: true, found: items.length };
}

export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(findEvents(env, false)); },
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "", allow = env.ALLOWED_ORIGIN || "*";
    const cors = { "Access-Control-Allow-Origin": allow === "*" ? "*" : allow, "Access-Control-Allow-Headers": "content-type,x-app-token", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Max-Age": "86400", "Vary": "Origin" };
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const path = new URL(req.url).pathname.replace(/\/+$/, "");
    if (req.method === "GET" && path.endsWith("/events")) { // האירועים שהחיפוש המתוזמן מצא. קריאה בלבד, בלי סודות
      const v = env.LIMITS ? await env.LIMITS.get("events") : null;
      return new Response(v || '{"items":[]}', { status: 200, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=600", ...cors } });
    }
    if (req.method === "POST" && path.endsWith("/events/run")) { // הרצה ידנית לבדיקה (עם הסיסמה). נספרת במכסה של 2 ביום
      if (!env.APP_TOKEN || !same(req.headers.get("x-app-token") || "", env.APP_TOKEN)) return json({ error: "unauthorized" }, 401, cors);
      return json(await findEvents(env, true), 200, cors);
    }
    if (req.method === "GET") return json({ ok: true, ready: !!(env.ANTHROPIC_API_KEY && env.APP_TOKEN), events: !!env.LIMITS }, 200, cors);
    if (req.method !== "POST") return json({ error: "method" }, 405, cors);
    if (allow !== "*" && origin && origin !== allow) return json({ error: "origin" }, 403, cors);
    if (!env.ANTHROPIC_API_KEY || !env.APP_TOKEN) return json({ error: "השרת עוד לא הוגדר: חסרים ANTHROPIC_API_KEY ו-APP_TOKEN." }, 503, cors);
    if (!same(req.headers.get("x-app-token") || "", env.APP_TOKEN)) return json({ error: "unauthorized" }, 401, cors);

    // מכסה יומית (לפי התאריך בפראג)
    const limit = +env.DAILY_LIMIT || 40, day = "n:" + new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Prague" });
    let used = env.LIMITS ? +(await env.LIMITS.get(day)) || 0 : mem.get(day) || 0;
    if (used >= limit) return json({ error: "limit", left: 0 }, 429, cors);

    let body; try { body = await req.json(); } catch (e) { return json({ error: "bad json" }, 400, cors); }
    const messages = (Array.isArray(body.messages) ? body.messages : []).slice(-10)
      .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));
    while (messages.length && messages[0].role !== "user") messages.shift();
    if (!messages.length || messages[messages.length - 1].role !== "user") return json({ error: "no message" }, 400, cors);
    const context = String(body.context || "").slice(0, 1500);

    used++; if (env.LIMITS) await env.LIMITS.put(day, String(used), { expirationTtl: 172800 }); else mem.set(day, used);

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: env.MODEL || "claude-haiku-5-5", max_tokens: 700, system: SYSTEM + "\n\nהמצב של עומר עכשיו:\n" + context, tools: [TOOL], messages })
    });
    if (!r.ok) { const t = await r.text(); console.log("anthropic", r.status, t.slice(0, 300)); return json({ error: r.status === 401 ? "המפתח של Anthropic לא תקין." : r.status === 429 || r.status === 529 ? "Claude עמוס כרגע. נסה שוב עוד רגע." : r.status === 400 && /credit|billing/i.test(t) ? "נגמר הקרדיט בחשבון Anthropic." : "שגיאה מול Claude (" + r.status + ")." }, 502, cors); }
    const j = await r.json(); let text = "", places = [];
    for (const b of j.content || []) { if (b.type === "text") text += b.text; else if (b.type === "tool_use" && b.name === "show_places" && b.input && Array.isArray(b.input.places)) places = b.input.places.slice(0, 4); }
    if (!text.trim() && places.length) text = places.map(p => `${p.name}: ${p.note || ""}`).join("\n");
    return json({ text: text.trim(), places, left: Math.max(0, limit - used) }, 200, cors);
  }
};
