/* music: הסאונד של הפתיחים (קובץ אחד, snd/intro.m4a, נשמר עם האפליקציה לאופליין).
   • מתנגן רק כשמתג הסאונד דלוק, ורק אחרי נגיעה (חוקי autoplay באייפון). בלי נגיעה: שקט, והפתיח רץ כרגיל.
   • הביט החזק של הקטע (2.19 שנ' בקובץ) נוחת על רגע השיא של כל פתיח. fade-in קצר, ו-fade-out בסוף.
   • כל תקלה (קובץ שלא נטען, דפדפן בלי Web Audio) נבלעת כאן: הפתיח ממשיך בשקט. */
"use strict";
(function () {
try {
const V = (() => { try { return new URL(document.currentScript.src).searchParams.get("v") || ""; } catch (e) { return ""; } })();
const SRC = "snd/intro.m4a" + (V ? "?v=" + V : ""), HIT = 2.19, TAIL = 4.8, FADE_IN = 0.35, FADE_OUT = 1.4, VOL = 0.55;
let AC = null, bufP = null, cur = null, pend = null;
const getAC = () => { if (!AC) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; AC = new C(); } return AC; };
const buffer = ctx => bufP || (bufP = fetch(SRC).then(r => { if (!r.ok) throw new Error("snd " + r.status); return r.arrayBuffer(); })
  .then(a => new Promise((res, rej) => { try { const p = ctx.decodeAudioData(a, res, rej); if (p && p.then) p.then(res, rej); } catch (e) { rej(e); } })).catch(e => { bufP = null; throw e; }));
function stop(fast) { const c = cur; cur = null; pend = null; if (!c) return; try { const t = c.ctx.currentTime, g = c.g.gain; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0.0001, t + (fast ? 0.12 : 0.6)); c.s.stop(t + (fast ? 0.15 : 0.65)); } catch (e) {} }
/* climaxSec: בעוד כמה שניות השיא. הביט נוחת עליו: אם צריך, מתחילים מאמצע הקובץ, ואם יש זמן, מחכים קצת לפני שמתחילים */
async function start(climaxSec) {
  const ctx = getAC(); if (!ctx) return false; stop(true); const my = {}; cur = my;
  const buf = await buffer(ctx); if (cur !== my || !settings.cineSound) return false;
  const now = ctx.currentTime, offset = Math.max(0, HIT - climaxSec), when = now + Math.max(0, climaxSec - HIT), endAt = Math.min(buf.duration, HIT + TAIL), dur = Math.max(0.5, endAt - offset);
  const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf; s.connect(g); g.connect(ctx.destination);
  g.gain.setValueAtTime(0.0001, when); g.gain.linearRampToValueAtTime(VOL, when + FADE_IN); g.gain.setValueAtTime(VOL, when + Math.max(FADE_IN, dur - FADE_OUT)); g.gain.linearRampToValueAtTime(0.0001, when + dur);
  s.start(when, offset, dur + 0.05); Object.assign(my, { ctx, s, g, until: Date.now() + (when - now + dur) * 1000 }); return true;
}
/* climaxMs: בעוד כמה מ"ש מגיע רגע השיא של הפתיח. בלי נגיעה עדיין: מחכים לנגיעה הראשונה ומתחילים משם, עם השיא שנשאר */
function play(kind, climaxMs) {
  try { if (!settings.cineSound) return false; const ctx = getAC(); if (!ctx) return false; const due = Date.now() + Math.max(0, climaxMs || 0);
    const go = () => { const left = (due - Date.now()) / 1000; start(left > 0 ? left : 0).catch(() => {}); return true; };
    buffer(ctx).catch(() => {}); /* מתחילים לטעון מיד, מהמטמון */
    if (ctx.state === "running") return go();
    pend = { go }; ctx.resume().then(() => { if (pend && ctx.state === "running") { const p = pend; pend = null; p.go(); } }).catch(() => {}); return false;
  } catch (e) { return false; }
}
const onTouch = () => { try { if (!pend || !settings.cineSound) return; const ctx = getAC(); if (!ctx) return; const p = pend; ctx.resume().then(() => { if (pend === p) { pend = null; p.go(); } }).catch(() => {}); } catch (e) {} };
["pointerdown", "touchend", "keydown"].forEach(ev => document.addEventListener(ev, onTouch, true));
document.addEventListener("visibilitychange", () => { if (document.hidden) stop(true); }); /* ברקע: שקט */
const active = () => !!(cur && (!cur.until || Date.now() < cur.until)) || !!pend;
window.Music = { play, stop, active, kindForCount: () => "intro", kindForDay: () => "intro" };
(window.__mods = window.__mods || {}).music = "ok";
} catch (err) { try { window.Music = { play() { return false; }, stop() {}, active() { return false; }, kindForCount: () => "", kindForDay: () => "" }; (window.__mods = window.__mods || {}).music = "fail: " + (err && err.message || err); } catch (e) {} }
})();
