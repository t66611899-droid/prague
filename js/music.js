/* music: הסאונד של הפתיחים (קובץ אחד, snd/intro.m4a, נשמר עם האפליקציה לאופליין). אותו סאונד בכל הפתיחים, ורק הוא.
   • מתנגן רק כשמתג הסאונד דלוק, ורק אחרי נגיעה (חוקי autoplay באייפון). בלי נגיעה: שקט, והפתיח רץ כרגיל.
   • הביט החזק של הקטע (2.18 שנ' בקובץ) נוחת על רגע השיא של הפתיח.
   • כל עוד הפתיח פתוח: לופ חלק. הלולאה היא 4 תיבות מדויקות (3.00→11.00 שנ' בקובץ, על הביט), עם מעבר רך קצר, כך שלא שומעים את התפר.
   • נעצר עם fade-out כשהפתיח נסגר, כשעוברים לרקע, או אחרי דקה.
   • כל תקלה (קובץ שלא נטען, דפדפן בלי Web Audio) נבלעת כאן: הפתיח ממשיך בשקט. */
"use strict";
(function () {
try {
const V = (() => { try { return new URL(document.currentScript.src).searchParams.get("v") || ""; } catch (e) { return ""; } })();
const SRC = "snd/intro.m4a" + (V ? "?v=" + V : ""), HIT = 2.18, L0 = 3.0, L1 = 11.0, XF = 0.3, FADE_IN = 0.35, VOL = 0.6, MAX = 60;
let AC = null, bufP = null, cur = null, pend = null;
const getAC = () => { if (!AC) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; AC = new C(); } return AC; };
const buffer = ctx => bufP || (bufP = fetch(SRC).then(r => { if (!r.ok) throw new Error("snd " + r.status); return r.arrayBuffer(); })
  .then(a => new Promise((res, rej) => { try { const p = ctx.decodeAudioData(a, res, rej); if (p && p.then) p.then(res, rej); } catch (e) { rej(e); } })).catch(e => { bufP = null; throw e; }));
function stop(fast) { const c = cur; cur = null; pend = null; if (!c) return; try { clearTimeout(c.tm); if (!c.master) return; const t = c.ctx.currentTime, g = c.master.gain, d = fast ? 0.12 : 0.8; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0.0001, t + d); c.segs.forEach(s => { try { s.stop(t + d + 0.05); } catch (e) {} }); } catch (e) {} }
async function start(climaxSec) {
  const ctx = getAC(); if (!ctx) return false; stop(true); const my = { segs: [] }; cur = my;
  const buf = await buffer(ctx); if (cur !== my || !settings.cineSound) return false;
  const end = Math.min(L1, buf.duration - 0.02), now = ctx.currentTime, offset = Math.max(0, Math.min(HIT - climaxSec, end - 1)), when = now + Math.max(0, climaxSec - HIT);
  const master = ctx.createGain(); master.connect(ctx.destination); master.gain.setValueAtTime(0.0001, now); master.gain.setValueAtTime(0.0001, when); master.gain.linearRampToValueAtTime(VOL, when + FADE_IN);
  master.gain.setValueAtTime(VOL, when + MAX - 2); master.gain.linearRampToValueAtTime(0.0001, when + MAX); /* עד דקה, ואז דועך */
  Object.assign(my, { ctx, master, until: Date.now() + (when - now + MAX) * 1000 });
  /* קטע אחד: מנגן from→to, נכנס ויוצא ב-XF. מחזיר מתי להתחיל את הקטע הבא כך שהביט נשמר */
  const seg = (at, from, to, fadeIn) => { const s = ctx.createBufferSource(), g = ctx.createGain(), len = to - from; s.buffer = buf; s.connect(g); g.connect(master);
    if (fadeIn) { g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(1, at + XF); } else g.gain.setValueAtTime(1, at);
    g.gain.setValueAtTime(1, at + len - XF); g.gain.linearRampToValueAtTime(0.0001, at + len); s.start(at, from, len + 0.02); my.segs.push(s); if (my.segs.length > 4) my.segs.shift(); return at + len - XF; };
  let next = seg(when, offset, end, false);
  const more = () => { if (cur !== my) return; if (next - when > MAX) return; next = seg(next, L0 - XF, end, true); my.tm = setTimeout(more, Math.max(200, (next - ctx.currentTime - 2) * 1000)); };
  my.tm = setTimeout(more, Math.max(200, (next - ctx.currentTime - 2) * 1000));
  return true;
}
/* climaxMs: בעוד כמה מ"ש מגיע רגע השיא. כבר מתנגן? ממשיכים בלי לקטוע. בלי נגיעה עדיין: מחכים לנגיעה הראשונה */
function play(kind, climaxMs) {
  try { if (!settings.cineSound) return false; const ctx = getAC(); if (!ctx) return false;
    if (cur && cur.master && Date.now() < cur.until) return true; /* הפתיח ממשיך (למשל מהמיני-סרטון למסך הספירה): לא מתחילים מחדש */
    const due = Date.now() + Math.max(0, climaxMs || 0), go = () => { const left = (due - Date.now()) / 1000; start(left > 0 ? left : 0).catch(() => {}); return true; };
    buffer(ctx).catch(() => {});
    if (ctx.state === "running") return go();
    pend = { go }; ctx.resume().then(() => { if (pend && ctx.state === "running") { const p = pend; pend = null; p.go(); } }).catch(() => {}); return false;
  } catch (e) { return false; }
}
const onTouch = () => { try { if (!pend || !settings.cineSound) return; const ctx = getAC(); if (!ctx) return; const p = pend; ctx.resume().then(() => { if (pend === p) { pend = null; p.go(); } }).catch(() => {}); } catch (e) {} };
["pointerdown", "touchend", "keydown"].forEach(ev => document.addEventListener(ev, onTouch, true));
document.addEventListener("visibilitychange", () => { if (document.hidden) stop(true); });
const active = () => !!(cur && (!cur.until || Date.now() < cur.until)) || !!pend;
window.Music = { play, stop, active, kindForCount: () => "intro", kindForDay: () => "intro" };
(window.__mods = window.__mods || {}).music = "ok";
} catch (err) { try { window.Music = { play() { return false; }, stop() {}, active() { return false; }, kindForCount: () => "", kindForDay: () => "" }; (window.__mods = window.__mods || {}).music = "fail: " + (err && err.message || err); } catch (e) {} }
})();
