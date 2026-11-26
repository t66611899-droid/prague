/* back: "אחורה" (החלקה מהצד או כפתור אחורה) חוזר צעד אחד בדיוק, בכל האפליקציה.
   איך: תמיד יש בהיסטוריה רשומת "שומר" אחת מעל הבסיס. כל "אחורה" צורך אותה, אנחנו סוגרים את השכבה העליונה, ומחזירים את השומר.
   כך "אחורה" אף פעם לא יוצא מהאפליקציה בטעות, וההיסטוריה לא מתבלגנת גם כשמסכים נפתחים ונסגרים מתוך הקוד.
   סדר הסגירה (מלמעלה למטה): כרטיס במסך מלא ← הצגה בגדול ← גלריה ← פתיח ← חלון (חוזר לחלון הקודם, למשל כרטיסים ← תפריט) ← ניווט חי (שואל קודם) ← כרטיס יעד.
   ✕ בתוך חלון עושה בדיוק את אותו דבר כמו "אחורה". מוגן: אם משהו כאן נכשל, האפליקציה מתנהגת כמו קודם. */
"use strict";
(function () {
try {
const $ = s => document.querySelector(s);
/* ---------- חלונות: מחסנית של מסכים קודמים (התוכן עצמו, עם הכפתורים שלו, נשמר כמו שהוא) ---------- */
const stack = [];
const title = () => { const h = $("#mbody h2"); return h ? h.textContent.trim() : ""; };
const modalOpen = () => { const m = $("#modal"); return !!(m && !m.hidden && m.classList.contains("show")); };
const oOpen = window.openModal, oClose = window.closeModal;
window.openModal = function (html, cls) {
  try { const body = $("#mbody"), box = $("#mbox");
    if (modalOpen() && body && body.firstChild) { const before = title(), frag = document.createDocumentFragment(), scroll = box.scrollTop, mcls = $("#modal").dataset.cls || "";
      const tmp = document.createElement("div"); tmp.innerHTML = html; const next = (tmp.querySelector("h2") || {}).textContent || "";
      if (before && next.trim() !== before) { while (body.firstChild) frag.appendChild(body.firstChild); stack.push({ frag, cls: mcls, scroll }); if (stack.length > 8) stack.shift(); } /* אותו מסך שמתרענן (למשל צעד במדריך): בלי צעד חדש באחורה */
    } else stack.length = 0;
  } catch (e) {}
  return oOpen.apply(this, arguments);
};
window.closeModal = function () { stack.length = 0; return oClose.apply(this, arguments); }; /* סגירה מתוך הקוד: סוגר הכול */
function modalBack() {
  const prev = stack.pop(); if (!prev) return oClose();
  try { const body = $("#mbody"), box = $("#mbox"); body.innerHTML = ""; body.appendChild(prev.frag); box.className = "mbox " + prev.cls; $("#modal").dataset.cls = prev.cls; box.scrollTop = prev.scroll || 0; } catch (e) { oClose(); }
}

/* ---------- מה סוגרים ב"אחורה": השכבה העליונה שפתוחה ---------- */
let asking = false;
function backOne() {
  try {
    const tv = $("#tkView"); if (tv && !tv.hidden) { const x = tv.querySelector(".tv-x, header button"); if (x) x.click(); else tv.hidden = true; return true; }
    const big = $("#big"); if (big && !big.hidden) { big.hidden = true; return true; }
    const gv = $("#gv"); if (gv) { const G = typeof Gal !== "undefined" ? Gal : window.Gal; if (G && G.close) G.close(); else { const x = gv.querySelector(".gv-x"); if (x) x.click(); else gv.remove(); } return true; } /* Gal מוגדר ב-gallery.js בלי window */
    if ($("#teaser") || $("#intro")) { const tz = $("#teaser .tz-skip"); if (tz) { tz.click(); setTimeout(() => { const k = $("#intro .skip"); k && k.click(); }, 60); } else { const k = $("#intro .skip"); k && k.click(); } return true; } /* פתיח: יוצאים ממנו לאפליקציה */
    const cn = $("#cine"); if (cn && window.cineClose) { cineClose(); return true; }
    if (modalOpen()) { modalBack(); return true; }
    if (typeof navActive === "function" && navActive()) { if (asking) return true; asking = true; setTimeout(() => { asking = false; if (confirm("לסיים ניווט?")) navStop(false); }, 30); return true; }
    const nc = $("#navChip"); if (nc && !nc.hidden && typeof stopNav === "function") { stopNav(); return true; } /* חץ הניווט הפשוט */
    const gc = $("#goCard"); if (gc && typeof goClear === "function") { goClear(); return true; }
  } catch (e) {}
  return false; /* המסך הראשי: נשארים במקום */
}

/* ---------- רשומת השומר ---------- */
let armed = false;
const arm = () => { if (armed) return; try { history.pushState({ prgGuard: 1 }, "", location.href); armed = true; } catch (e) {} };
addEventListener("popstate", () => { armed = false; backOne(); arm(); }); /* "אחורה" צרך את השומר: סוגרים שכבה אחת ומחזירים אותו */
/* מוסיפים את השומר רק אחרי שהאפליקציה עלתה, ושוב אחרי כל נגיעה אם חסר (דפדפנים מדלגים על רשומות שנוצרו בלי נגיעה) */
const boot = () => { if (!window.__ui) return setTimeout(boot, 300); try { history.replaceState(Object.assign({}, history.state || {}, { prgBase: 1 }), "", location.href); } catch (e) {} arm(); }; boot();
["pointerdown", "touchstart"].forEach(ev => addEventListener(ev, () => { if (!armed && window.__ui) arm(); }, { capture: true, passive: true }));

/* ---------- ✕ ורקע החלון = "אחורה" (צעד אחד), לא סגירה של הכול ---------- */
const wire = () => { const x = $("#mclose"), bg = $("#mback"); if (!x || !window.__ui) return setTimeout(wire, 300); x.onclick = () => modalBack(); if (bg) bg.onclick = () => modalBack(); }; wire();
window.__modalBack = modalBack; window.__backOne = backOne;
(window.__mods = window.__mods || {}).back = "ok";
} catch (err) { try { (window.__mods = window.__mods || {}).back = "fail: " + (err && err.message || err); } catch (e) {} }
})();
