/* flight: "טייס אוטומטי" לטיסות. בלי שום הגדרה.
   מקור: נתוני הטיסות הרשמיים של נתב"ג (רשות שדות התעופה, data.gov.il). חינם, בלי מפתח, בלי פרטים אישיים: שואלים רק על מספר טיסה.
   • בימי הטיסות בלבד, כל 10 דק' כשהאפליקציה פתוחה (ברקע לא, בגלל הסוללה).
   • עיכוב בהלוך (10 דק' ומעלה): הכול זז לבד. הספירה לאחור, שעת הנחיתה, מסך ה-eSIM ומדריך ההגעה, התחנות והתזכורות.
     בחזור (4.12): שום דבר לא זז (יציאה 09:00, הדלפק נסגר 12:05). רק שורת מידע: לא לשנות את היציאה אלא אם Smartwings הודיעו אחרת.
   • שורה אחת חמה בכרטיס הראשי (סטטוס, שעה, דלפקים), והודעה אחת בכל שינוי. ביטול: הודעה ברורה עם מה עושים.
   מוגן: אם משהו כאן נכשל, האפליקציה ממשיכה עם השעות המקוריות. */
"use strict";
(function () {
try {
const API = "https://data.gov.il/api/3/action/datastore_search", RES = "e83f763b-b7d7-479e-b172-ae981ddc6de5";
const FL = { out: { no: "1285", dir: "D", date: "2026-11-30", from: "2026-11-28", to: "2026-11-30" }, back: { no: "1284", dir: "A", date: "2026-12-04", from: "2026-12-02", to: "2026-12-04" } };
const DEV = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const get = () => LS.get("flt", {}), put = v => LS.set("flt", v);
const cancelled = st => /CANCEL/.test(st || "");
/* "כ-40 דק'", "כשעה", "כשעה וחצי", "כשעתיים", "כ-3 שעות", "כ-2 שעות ו-20 דק'" */
const dur = m => { m = Math.abs(Math.round(m)); const h = Math.floor(m / 60), r = m % 60, near = r < 10 || r > 50, hh = r > 50 ? h + 1 : h;
  if (m < 55) return `כ-${m} דק'`; if (near) return hh === 1 ? "כשעה" : hh === 2 ? "כשעתיים" : `כ-${hh} שעות`; if (r >= 20 && r <= 40) return h === 1 ? "כשעה וחצי" : h === 2 ? "כשעתיים וחצי" : `כ-${h} שעות וחצי`; return `${h === 1 ? "כשעה" : h === 2 ? "כשעתיים" : "כ-" + h + " שעות"} ו-${r} דק'`; };
/* כמה דקות להזיז כל דבר (0 אם בזמן, אם בוטלה, או אם אין מידע) */
function raw(k) { try { const o = get()[k]; if (!o || cancelled(o.st) || Math.abs(o.d) < 10) return 0; return Math.max(-30, Math.min(600, o.d)); } catch (e) { return 0; } }
/* בחזור (4.12) לא מזיזים כלום: יציאה 09:00, הדלפק נסגר 12:05 שעון פראג. רק שורת מידע. בהלוך: הכול זז לפי העיכוב */
function delay(k) { return k === "out" ? raw("out") : 0; }
window.__fltDelay = delay;

/* ---------- הזזה של התחנות ושל הכרטיסים (בזיכרון, מהשעה המקורית) ---------- */
const SHIFT = { "2026-11-30": { "המראה QS1285": "out", "נחיתה בפראג": "out", "המלון · כניסה עצמית": "out" }, };
const hm = t => new Date(t).toISOString().slice(11, 16);
function apply() {
  try { plan.forEach(d => { const map = SHIFT[d.date]; if (!map) return; d.stops.forEach(s => { const k = map[s.n]; if (!k) return; if (s.m0 == null) s.m0 = s.m; s.m = s.m0 + delay(k); }); });
    const t1 = (TIX_EV || []).find(e => e.k === "fl1"), t2 = (TIX_EV || []).find(e => e.k === "fl2");
    if (t1) t1.h = hm(Date.UTC(2026, 10, 30, 17, 25) + delay("out") * 6e4); if (t2) t2.h = hm(Date.UTC(2026, 11, 4, 12, 45) + delay("back") * 6e4);
  } catch (e) {}
}

/* ---------- בדיקה ---------- */
const today = () => { try { return dstr(wall()); } catch (e) { return ""; } };
async function fetchOne(k) {
  const F = FL[k], u = `${API}?resource_id=${RES}&limit=20&filters=${encodeURIComponent(JSON.stringify({ CHOPER: "QS", CHFLTN: F.no }))}`;
  const j = await fetchJson(u, 9000), r = ((j && j.result && j.result.records) || []).find(x => x.CHAORD === F.dir && String(x.CHSTOL || "").startsWith(F.date)); if (!r) return null;
  const d = Math.round((Date.parse(r.CHPTOL + "Z") - Date.parse(r.CHSTOL + "Z")) / 6e4) || 0;
  return { d, st: String(r.CHRMINE || "").toUpperCase(), sched: r.CHSTOL, est: r.CHPTOL, ci: r.CHCINT || "", cz: r.CHCKZN || "", term: r.CHTERM || "", t: Date.now() };
}
async function check() {
  if (isOffline()) return; const day = today(), f = get(); let changed = false;
  for (const k of ["out", "back"]) { const F = FL[k]; if (day < F.from || day > F.to) continue; const o = f[k]; if (o && /DEPARTED|LANDED/.test(o.st) && Date.now() - o.t < 6 * 36e5 && k === "out") continue;
    try { const n = await fetchOne(k); if (!n) continue; const before = o ? `${Math.round(o.d / 10)}|${o.st}` : ""; f[k] = n; if (`${Math.round(n.d / 10)}|${n.st}` !== before) { changed = true; tell(k, n, o); } } catch (e) {} }
  put(f); if (changed) { apply(); try { renderAll(); } catch (e) {} }
}
/* הודעה אחת בכל שינוי. בלי לחץ */
function tell(k, n, o) {
  const name = k === "out" ? "הטיסה לפראג" : "הטיסה הביתה", d = n.d, abs = Math.abs(d), dr = dur(d);
  if (cancelled(n.st)) return cancelMsg(k);
  if (!o && abs < 10) return; /* הפעם הראשונה ובזמן: לא מטרידים */
  if (abs < 10) return toast(`✈️ ${name} חזרה לזמן. עדכנתי הכול לבד`, 4200);
  if (k === "out") toast(`✈️ ${name} ${d > 0 ? "נדחתה" : "מקדימה"} ב${dr}. עדכנתי לבד את הספירה, הנחיתה וה-eSIM`, 6000);
  else toast(`✈️ QS1284 מדווחת כ${d > 0 ? "נדחית" : "מקדימה"} ב${dr}. אל תשנה את היציאה, הדלפק נסגר לפי השעה המקורית אלא אם Smartwings הודיעו אחרת.`, 8000);
  try { buzz([15, 50, 15]); } catch (e) {}
}
function cancelMsg(k) {
  const seen = LS.get("fltCx", {}); if (seen[k]) return; seen[k] = 1; LS.set("fltCx", seen);
  openModal(`<h2>✈️ ${k === "out" ? "הטיסה לפראג" : "הטיסה הביתה"} מסומנת כמבוטלת</h2><p class="sub">נשימה. זה קורה, ויש מה לעשות:</p>
    <ol class="tips"><li>בודקים ב-SMS ובמייל של Smartwings: בדרך כלל כבר מחכה שם טיסה חלופית.</li><li>באתר או בדלפק של Smartwings מבקשים טיסה חלופית (או החזר).</li><li>שומרים קבלות על אוכל ומלון. הביטוח מכסה עיכובים וביטולים.</li><li>מעדכנים את ההורים.</li></ol>
    <div class="row wrap"><a class="btn pri" href="https://www.smartwings.com" target="_blank" rel="noopener">Smartwings ↗</a><button class="btn" id="cxIns">🛡️ הביטוח</button><button class="btn" id="cxWa">💬 להורים</button></div>
    <p class="fine">המידע מנתוני רשות שדות התעופה. כדאי לוודא גם ב-SMS של חברת התעופה.</p>`);
  $("#cxIns").onclick = () => openTickets("ins"); $("#cxWa").onclick = () => { try { waSend(`${k === "out" ? "הטיסה לפראג" : "הטיסה הביתה"} בוטלה. אני מסתדר עם טיסה חלופית ואעדכן`); } catch (e) {} };
}

/* ---------- שורה אחת בכרטיס הראשי, בימים הרלוונטיים ---------- */
function line() {
  try { const day = today(), f = get(), k = day >= FL.back.from ? "back" : "out", o = f[k], F = FL[k]; if (!o || day < F.from || day > F.to) return "";
    if (k === "out" && /DEPARTED|LANDED/.test(o.st) && day === F.date) return `<div class="flt ok">✈️ QS1285 ${o.st === "LANDED" ? "נחתה" : "בדרך לפראג"} · נחיתה ${hm(Date.UTC(2026, 10, 30, 21, 35) + delay("out") * 6e4)} שעון פראג</div>`;
    if (cancelled(o.st)) return `<div class="flt bad">✈️ QS${F.no} מסומנת כמבוטלת · <button class="lnk" data-flt="cx">מה עושים</button></div>`;
    const d = raw(k); if (k === "back") return d >= 10 || d <= -10 ? `<div class="flt late">✈️ QS1284 מדווחת כ${d > 0 ? "נדחית" : "מקדימה"} ב${dur(d)}. אל תשנה את היציאה (09:00), הדלפק נסגר 12:05 לפי השעה המקורית אלא אם Smartwings הודיעו אחרת.<small>עודכן ${Math.max(1, Math.round((Date.now() - o.t) / 6e4))} דק' · רשות שדות התעופה</small></div>` : `<div class="flt">✈️ QS1284 · בזמן · המראה 12:45 מפראג · הדלפק נסגר 12:05<small>עודכן ${Math.max(1, Math.round((Date.now() - o.t) / 6e4))} דק' · רשות שדות התעופה</small></div>`;
    const when = k === "out" ? `המראה ${hm(Date.UTC(2026, 10, 30, 18, 25) + d * 6e4)} שעון ישראל` : `המראה ${hm(Date.UTC(2026, 11, 4, 12, 45) + d * 6e4)} מפראג`;
    const st = d >= 10 ? `נדחתה ב${dur(d)}` : d <= -10 ? `מקדימה ב${dur(d)}` : "בזמן";
    const desk = k === "out" && o.ci ? ` · דלפקים ${esc(o.ci)}${o.cz ? ` (אזור ${esc(o.cz)})` : ""}` : "";
    return `<div class="flt${d >= 10 ? " late" : ""}">✈️ QS${F.no} · ${st} · ${when}${desk}<small>עודכן ${Math.max(1, Math.round((Date.now() - o.t) / 6e4))} דק' · רשות שדות התעופה</small></div>`;
  } catch (e) { return ""; }
}
window.renderNext = (old => function () { const r = old.apply(this, arguments); try { const l = line(), c = $("#nextCard"); if (l && c && !c.querySelector(".flt")) { c.insertAdjacentHTML("afterbegin", l); const b = c.querySelector("[data-flt]"); if (b) b.onclick = e => { e.stopPropagation(); const s = LS.get("fltCx", {}); delete s[(today() >= FL.back.from ? "back" : "out")]; LS.set("fltCx", s); cancelMsg(today() >= FL.back.from ? "back" : "out"); }; } } catch (e) {} return r; })(window.renderNext);

/* בדיקות במחשב בלבד: ?flt=out:60 / out:cancel / back:90 */
if (DEV) { const m = /^(out|back):(-?\d+|cancel)$/.exec(new URLSearchParams(location.search).get("flt") || ""); if (m) { const f = get(); f[m[1]] = { d: m[2] === "cancel" ? 0 : +m[2], st: m[2] === "cancel" ? "CANCELED" : (+m[2] >= 10 ? "DELAYED" : "ON TIME"), ci: "217-220", cz: "G", term: 3, t: Date.now() - 3 * 6e4 }; put(f); window.__fltTest = 1; } }
apply();
const boot = () => { if (!window.__ui) return setTimeout(boot, 500); try { renderAll(); } catch (e) {} if (!window.__fltTest) check(); else { const f = get(); ["out", "back"].forEach(k => { if (f[k]) tell(k, f[k], null); }); } }; boot();
setInterval(() => { if (!window.__fltTest) check(); }, 10 * 60000);
window.__fltCheck = check;
(() => { const s = document.createElement("style"); s.textContent = `
.flt{margin:0 0 8px;padding:8px 12px;border-radius:14px;background:color-mix(in srgb,var(--blue,#2f7de1) 14%,var(--card2));font-size:.9rem;font-weight:600;line-height:1.35}
.flt small{display:block;font-weight:400;color:var(--mut);font-size:.74rem}
.flt.late{background:color-mix(in srgb,#e8a317 22%,var(--card2))}.flt.bad{background:color-mix(in srgb,#d42a33 22%,var(--card2))}.flt.ok{background:color-mix(in srgb,#1f9d55 18%,var(--card2))}
.flt .lnk{font:inherit;font-weight:700;text-decoration:underline;background:none;border:0;color:inherit;padding:0}
`; document.head.appendChild(s); })();
(window.__mods = window.__mods || {}).flight = "ok";
} catch (err) { try { window.__fltDelay = () => 0; (window.__mods = window.__mods || {}).flight = "fail: " + (err && err.message || err); } catch (e) {} }
})();
