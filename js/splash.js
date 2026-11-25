/* splash: מסך פתיחה עם טיימר לטיסה (ספרות מתהפכות), קו הרקיע של פראג, שלג, מטוס, כרטיס עלייה למטוס.
   אחרי הנחיתה: "ברוך הבא לפראג" חד-פעמי. ביום החזרה: טיימר ליציאה לשדה ולהמראה. מחליף את showSplash מ-ui.js. */
"use strict";
const T_FLY = Date.UTC(2026, 10, 30, 17, 25), T_LAND = Date.UTC(2026, 10, 30, 21, 35), T_LEAVE = Date.UTC(2026, 11, 4, 10, 0), T_HOME = Date.UTC(2026, 11, 4, 12, 45); // שעון פראג
let _cdTimer = null, _cdRot = null;

/* ---------- איור מקורי: קו הרקיע של פראג (הטירה והקתדרלה, גשר קרל, מגדלי טין) ---------- */
function skylineSvg() {
  const piers = [], lamps = [], arcs = [], win = [];
  for (let x = 12; x <= 400; x += 54) { piers.push(`<path d="M${x - 6} 141h12v20l-6 6-6-6z"/>`); lamps.push(`<circle class="tw" style="animation-delay:${(x % 7) * 0.35}s" cx="${x}" cy="128" r="1.9"/>`); if (x + 54 <= 412) arcs.push(`<path d="M${x + 6} 142q21 -17 42 0" fill="none" stroke-width="3"/>`); }
  [[60, 84], [78, 84], [150, 86], [168, 86], [104, 70], [116, 66], [322, 96], [326, 110], [350, 96], [354, 112], [338, 104], [250, 124], [272, 126], [296, 122], [380, 124]].forEach((p, i) => win.push(`<rect class="tw" style="animation-delay:${(i % 6) * 0.5}s" x="${p[0]}" y="${p[1]}" width="2.4" height="3.4" rx=".6"/>`));
  const xmas = []; for (let i = 0; i < 17; i++) { const x = 8 + i * 24, y = 147 + Math.sin(i * 1.3) * 1.6; xmas.push(`<circle class="tw c${i % 3}" style="animation-delay:${(i % 5) * 0.28}s" cx="${x}" cy="${y.toFixed(1)}" r="1.5"/>`); }
  return `<svg class="sky" viewBox="0 0 400 180" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    <g class="l1"><path d="M0 118C60 96 120 88 190 92L400 106V180H0Z"/><path d="M38 80h156v16H38z"/><path d="M38 80l8-6 8 6M176 80l9-7 9 7"/><path d="M94 58h36v24H94z"/><path d="M97 58l5-30 5 30zM110 58l7-40 7 40zM125 60l4-22 4 22z"/><path d="M60 80v-9l6-5 6 5v9zM146 80v-8l7-5 7 5v8z"/></g>
    <g class="l2"><path d="M224 180v-56l8-8 8 8 6-10 8 10 7-7 7 7 9-12 9 12 8-6 8 6v56z"/><path d="M316 130V70l9-34 9 34v60zM344 130V70l9-34 9 34v60z"/><path d="M312 74l4-12 4 12zM330 74l4-12 4 12zM340 74l4-12 4 12zM358 74l4-12 4 12z"/><path d="M330 130V94l8-12 8 12v36z"/><path d="M366 180v-52l10-10 10 10 8-8 6 6v54z"/></g>
    <g class="l3"><path d="M0 132h400v10H0z"/>${piers.join("")}<path d="M20 132V104h18v28zM18 104l11-22 11 22z"/><path d="M372 132v-22h14v22zM370 110l9-16 9 16z"/><g class="l3s">${arcs.join("")}</g></g>
    <path class="rv" d="M0 163h400v17H0z"/><g class="lamp">${lamps.join("")}${win.join("")}</g><g class="xm">${xmas.join("")}</g></svg>`;
}
function planeSvg(back) { // מטוס קטן חוצה את המסך לאורך קו מקווקו
  return `<svg class="route" viewBox="0 0 400 170" preserveAspectRatio="none" aria-hidden="true"><path id="fl" d="M18 140Q200 -20 382 60" fill="none" class="dash"/>
    <circle cx="18" cy="140" r="4" class="pt"/><circle cx="382" cy="60" r="4" class="pt"/>
    <g class="pl"><path d="M9 0L-7 -6.500v4.500l-5 .8v2.400l5 .8v4.500z" /><animateMotion dur="11s" repeatCount="indefinite" rotate="auto" keyPoints="${back ? "1;0" : "0;1"}" keyTimes="0;1" calcMode="linear"><mpath href="#fl"/></animateMotion></g></svg>
    <span class="ap a1">${back ? "PRG" : "TLV"}</span><span class="ap a2">${back ? "TLV" : "PRG"}</span>`;
}
const snowHtml = n => `<div class="snow" aria-hidden="true">${Array.from({ length: n }, (_, i) => `<i style="left:${(i * 37 + 11) % 100}%;--s:${3 + (i % 4) * 1.5}px;--d:${7 + (i % 6) * 1.7}s;animation-delay:-${(i * 1.3) % 9}s;opacity:${0.45 + (i % 4) * 0.14}"></i>`).join("")}</div>`;
function snowBurst() { // קונפטי של שלג, לרגעים חגיגיים
  if (REDUCED || saver) return; const b = document.createElement("div"); b.className = "burst"; b.innerHTML = Array.from({ length: 30 }, (_, i) => `<i style="left:${(i * 31 + 7) % 100}%;--s:${5 + (i % 4) * 2}px;--x:${(i % 2 ? 1 : -1) * (10 + i % 5 * 8)}px;animation-delay:${(i % 10) * 0.07}s"></i>`).join("");
  document.body.appendChild(b); setTimeout(() => b.remove(), 3400);
}

/* ---------- ספרות מתהפכות ---------- */
const flapHtml = (id, label) => `<div class="fu"><div class="fd" dir="ltr"><b class="flap" id="${id}0">0</b><b class="flap" id="${id}1">0</b></div><small>${label}</small></div>`;
function setFlap(id, v) { const s = String(v).padStart(2, "0"); for (const k of [0, 1]) { const el = $("#" + id + k); if (!el || el.dataset.v === s[k]) continue; el.dataset.v = s[k]; if (REDUCED || el.textContent === "") { el.textContent = s[k]; continue; } el.classList.remove("flip"); void el.offsetWidth; el.classList.add("flip"); setTimeout(() => { el.textContent = s[k]; }, 150); } }
function tickFlaps(target) { const ms = Math.max(0, target - wall().getTime()), d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4), s = Math.floor(ms % 6e4 / 1000); setFlap("fD", d); setFlap("fH", h); setFlap("fM", m); setFlap("fS", s); return ms; }

/* ---------- המשפט שמתחלף ---------- */
function cdLines() {
  const now = wall().getTime(), days = t => Math.max(0, Math.floor((t - now) / 864e5)) /* ימים מלאים, כמו בכל שאר האפליקציה */, n = d => d === 1 ? "מחר" : d === 0 ? "היום" : `עוד ${d} ימים`;
  return [[Date.UTC(2026, 11, 1, 10, 20), "לשווקי חג המולד 🎄"], [Date.UTC(2026, 11, 1, 13, 0), "לגשר קרל 🌉"], [Date.UTC(2026, 11, 1, 19, 0), "למסיבת הסירה 🚢"], [Date.UTC(2026, 11, 1, 15, 0), "לטירה מעל העיר 🏰"], [Date.UTC(2026, 11, 2, 22, 30), "ל-EPIC 🎧"], [Date.UTC(2026, 11, 3, 13, 0), "ליום הקניות 🛍️"]]
    .filter(x => x[0] > now).map(x => `${n(days(x[0]))} ${x[1]}`);
}
function milestone(ms) { // שבוע / 3 ימים / יום / 3 שעות לפני הטיסה: הודעה מיוחדת, פעם אחת
  const seen = LS.get("ms", {}), M = [[3 * 36e5, "h3", "עוד מעט ממריאים! 🛫", "הדלפק נסגר ב-17:25 (שעון ישראל). דרכון, טלפון, מטען."], [864e5, "d1", "מחר טסים! ✈️", "סגרת תיק? עד 8 ק\"ג. מעיל ונעליים כבדות עליך."], [3 * 864e5, "d3", "שלושה ימים! ❄️", "זמן להוריד את המפה לאופליין ולהוסיף את התזכורות ליומן."], [7 * 864e5, "w1", "פחות משבוע! 🎒", "שווה לבדוק דרכון, ביטוח, eSIM ולהוסיף את אמא ואבא לאנשי הקשר."]];
  const m = M.find(x => ms <= x[0]); if (!m || seen[m[1]]) return ""; seen[m[1]] = 1; M.forEach(x => { if (x[0] >= m[0]) seen[x[1]] = 1; }); LS.set("ms", seen); setTimeout(snowBurst, 500);
  return `<div class="cd-ms"><b>${m[2]}</b><span>${m[3]}</span></div>`;
}

/* ---------- מסך הטיימר ---------- */
function countdownSplash(done, mode) { // mode: out (לפני הטיסה) | air (בדרך) | back (יום החזרה)
  const sp = $("#splash"), w = wall().getTime(), back = mode === "back", target = mode === "out" ? T_FLY : mode === "air" ? T_LAND : (w < T_LEAVE ? T_LEAVE : T_HOME);
  const head = mode === "out" ? "ההמראה לפראג בעוד" : mode === "air" ? "נוחתים בפראג בעוד" : w < T_LEAVE ? "יוצאים לשדה התעופה בעוד" : "ההמראה הביתה בעוד";
  const ms0 = Math.max(0, target - w), big = ms0 >= 864e5;
  sp.className = "cd " + (wantDark() ? "nt" : "dy"); sp.hidden = false;
  sp.innerHTML = `${skylineSvg()}${snowHtml(26)}<div class="cd-top">${planeSvg(back)}</div>
    <div class="cd-in"><p class="cd-k">${head}</p>
      <div class="flaps${big ? "" : " nod"}">${big ? flapHtml("fD", "ימים") + `<i class="col">:</i>` : ""}${flapHtml("fH", "שעות")}<i class="col">:</i>${flapHtml("fM", "דקות")}<i class="col">:</i>${flapHtml("fS", "שניות")}</div>
      ${back && w < T_LEAVE ? `<p class="cd-sub">ההמראה ב-12:45 · הדלפק נסגר ב-12:05 · 200 Kč במזומן למס העירוני</p>` : `<p class="cd-line" id="cdLine"></p>`}
      ${mode === "out" ? milestone(ms0) : ""}
      <div class="bp"><div class="bp-a"><small>${back ? "PRAGUE" : "TEL AVIV"}</small><b>${back ? "PRG" : "TLV"}</b></div><div class="bp-m"><i></i><span>✈</span><i></i><small>${back ? "QS1284" : "QS1285"}</small></div><div class="bp-a"><small>${back ? "TEL AVIV" : "PRAGUE"}</small><b>${back ? "TLV" : "PRG"}</b></div>
        <div class="bp-f"><span><small>תאריך</small>${back ? "4.12" : "30.11"}</span><span><small>${back ? "המראה" : "המראה · ישראל"}</small>${back ? "12:45" : "18:25"}</span><span><small>נוסע</small>עומר</span><i class="bar"></i></div></div>
      <button class="cd-go">${mode === "air" ? "לראות מה מחכה ←" : back ? "למפה ←" : "בוא נראה את הטיול ←"}</button></div>`;
  tickFlaps(target); clearInterval(_cdTimer); clearInterval(_cdRot);
  _cdTimer = setInterval(() => { if (sp.hidden) return clearInterval(_cdTimer); if (tickFlaps(target) <= 0) { clearInterval(_cdTimer); leave(); } }, 1000);
  const lines = cdLines(), el = $("#cdLine"); let li = 0;
  if (el && lines.length) { el.textContent = lines[0]; _cdRot = setInterval(() => { if (sp.hidden) return clearInterval(_cdRot); el.classList.add("out"); setTimeout(() => { li = (li + 1) % lines.length; el.textContent = lines[li]; el.classList.remove("out"); }, 380); }, 3600); }
  let gone = false; function leave() { if (gone) return; gone = true; clearInterval(_cdTimer); clearInterval(_cdRot); sp.classList.add("out"); buzz(10); setTimeout(() => { sp.hidden = true; sp.className = ""; sp.innerHTML = ""; }, 720); done(); }
  sp.onclick = null; sp.querySelector(".cd-go").onclick = leave;
}

/* ---------- "ברוך הבא לפראג": חד-פעמי, אחרי הנחיתה ---------- */
function welcomeSplash(done) {
  const sp = $("#splash"); LS.set("welcomed", 1); sp.className = "cd wl " + (wantDark() ? "nt" : "dy"); sp.hidden = false;
  sp.innerHTML = `${skylineSvg()}${snowHtml(30)}<div class="cd-in wl-in"><span class="wl-flag">🇨🇿</span><h1>ברוך הבא לפראג</h1><p class="wl-s">Vítejte v Praze · עשית את זה. עכשיו מתחיל החלק הכיף</p>
    <ul class="wl-l"><li><b>1</b>מפעילים את ה-eSIM</li><li><b>2</b>לפרוט 1,000 Kč, ואז Bolt במזומן (גיבוי: 59 + מטרו)</li><li><b>3</b>כניסה עצמית למלון: יש מדריך צעד-אחר-צעד</li><li><b>4</b>הודעה קצרה הביתה שנחתת</li></ul>
    <div class="row"><button class="cd-go">למפה ←</button><button class="cd-go alt" id="wlWa">💬 נחתתי</button></div></div>`;
  setTimeout(snowBurst, 400); buzz([20, 60, 20, 60, 40]);
  let gone = false; const leave = () => { if (gone) return; gone = true; sp.classList.add("out"); setTimeout(() => { sp.hidden = true; sp.className = ""; sp.innerHTML = ""; }, 720); done(); };
  sp.onclick = null; sp.querySelector(".cd-go").onclick = leave; $("#wlWa").onclick = () => waSend(`נחתתי בפראג בשלום 🇨🇿 השעה כאן ${clockNow()}. נוסע עכשיו למלון, אכתוב כשאגיע.`);
}

/* ---------- מסך הפתיחה של כל יום ---------- */
function dailySplash(done) {
  const T = tripNow(), h = T.hour, hello = h >= 5 && h < 12 ? "בוקר" : h < 17 ? "צהריים" : h < 22 ? "ערב" : "לילה";
  const PUSH = ["נחתת לבד בעיר זרה. מי שחיכה ל\"רגע הנכון\" עדיין בבית.", "היום אתה מדבר עם לפחות אדם זר אחד. לא מו\"מ.", "קר? טוב. גם נוח היה לך בבית.", "יום רביעי מתוך חמישה. מה שלא תעז היום, תסביר לעצמך בטיסה חזרה.", "יום אחרון. אל תארוז את האומץ יחד עם הגרביים."];
  const di = T.dayIdx >= 0 ? T.dayIdx : plan.length - 1, day = plan[di], wd = typeof wxDay === "function" ? wxDay(day.date) : null;
  let top = day.stops.filter(s => (s.big || sinfo(s).big) && s.at !== "hotel"); const seen = new Set(); top = top.filter(s => !seen.has(s.at || s.id) && seen.add(s.at || s.id)).slice(0, 3);
  const sp = $("#splash"); sp.className = "cd dl " + (wantDark() ? "nt" : "dy"); sp.hidden = false;
  sp.innerHTML = `${skylineSvg()}${snowHtml(18)}<div class="cd-in dl-in"><p class="cd-k">${hello}, עומר.</p><h1>${T.phase === "during" ? `יום ${di + 1} מתוך ${plan.length}` : "היה טיול 🇨🇿"}</h1>
    <p class="wl-s">${T.phase === "during" ? bd(day.title) : "הכול עדיין כאן. השאלה מה אתה עושה עם זה עכשיו"}</p>${T.phase === "during" && PUSH[di] ? `<p class="dl-push">${PUSH[di]}</p>` : ""}
    ${wd ? `<p class="dl-wx"><span dir="ltr">${wxIcon(wd.code)} ${wd.max}° / ${wd.min}°</span> · ${wearAdvice(wd).split(".")[0]}</p>` : ""}
    ${T.phase === "during" ? `<ul class="dl-l">${top.map(s => `<li><span>${sinfo(s).ic}</span><b>${bd(s.n)}</b><i>${isFixed(s) ? fmtT(s.m) : partOfDay(s.m)}</i></li>`).join("")}</ul>` : ""}
    <button class="cd-go">למפה ←</button></div>`;
  let gone = false; const leave = () => { if (gone) return; gone = true; sp.classList.add("out"); setTimeout(() => { sp.hidden = true; sp.className = ""; sp.innerHTML = ""; }, 720); done(); };
  sp.onclick = leave; setTimeout(leave, QS.get("splash") === "hold" ? 6e5 : 3600);
}
function showSplash(done) {
  const w = wall().getTime(), T = tripNow(), force = QS.get("splash");
  if (force === "welcome") return welcomeSplash(done);
  if (w < T_FLY) return countdownSplash(done, "out");
  if (w < T_LAND) return countdownSplash(done, "air");
  if (w < T_LAND + 20 * 36e5 && !LS.get("welcomed")) return welcomeSplash(done);
  if (T.date === "2026-12-04" && w < T_HOME) return countdownSplash(done, "back");
  dailySplash(done);
}

/* ---------- אייקונים אחידים (קו דק, מקוריים) לכפתורים הקבועים ---------- */
const IC = {
  chat: "M4 5h16v11H10l-5 4v-4H4z", pin: "M12 21s-6-5.500-6-10a6 6 0 1 1 12 0c0 4.500-6 10-6 10zM12 9.300a1.900 1.900 0 1 0 0 3.800 1.900 1.900 0 0 0 0-3.800z",
  bell: "M6 16v-5a6 6 0 1 1 12 0v5l2 2H4zM10 20.500a2 2 0 0 0 4 0", send: "M3 11.500l18-8-7 18-3-7z", spark: "M12 3l1.800 5.200L19 10l-5.200 1.800L12 17l-1.800-5.200L5 10l5.200-1.800zM19 15.500l.800 2.200 2.200.800-2.200.800-.800 2.200-.800-2.200-2.200-.800 2.200-.800z",
  snow: "M12 2v20M4.200 7l15.600 10M19.800 7L4.200 17M9 4l3 2 3-2M9 20l3-2 3 2", clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
  sun: "M12 7.500a4.500 4.500 0 1 0 0 9 4.500 4.500 0 0 0 0-9zM12 2v2.500M12 19.500V22M2 12h2.500M19.500 12H22M5 5l1.700 1.700M17.300 17.300L19 19M19 5l-1.700 1.700M6.700 17.300L5 19",
  coin: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM14.500 9.500c-.500-.900-1.400-1.400-2.500-1.400-1.400 0-2.400.800-2.400 1.900 0 2.600 5 1.400 5 4 0 1.100-1 1.900-2.500 1.900-1.200 0-2.100-.500-2.600-1.400M12 6.500v11",
  bag: "M6 8.500h12l1 11.500H5zM9 8.500V6.500a3 3 0 0 1 6 0v2", dots: "M5.500 12h.010M12 12h.010M18.500 12h.010"
};
const icon = k => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="${IC[k]}"/></svg>`;
(function applyIcons() {
  const q = { upd: "bell", wa: "send", claude: "spark", cold: "snow", delay: "clock", today: "sun", exp: "coin", pack: "bag", more: "dots" };
  $$("#quick [data-q]").forEach(b => { const k = q[b.dataset.q]; if (!k) return; const badge = b.querySelector("#updBadge"), txt = b.textContent.replace(/^[^֐-׿A-Za-z]+/, "").replace(/\d+$/, "").trim(); b.innerHTML = icon(k) + `<span>${txt}</span>`; if (badge) b.appendChild(badge); });
  const f = (id, k) => { const b = $(id), s = b && b.querySelector("span"); if (s) s.outerHTML = icon(k); }; f("#fabChat", "chat"); f("#fabHere", "pin");
})();
/* ספירה מתגלגלת של מספרים (ק"מ, צעדים) */
function rollStats() { if (REDUCED) return; $$("#mbody .stats b").forEach(b => { const m = /^([\d.,]+)(.*)$/.exec(b.innerHTML); if (!m) return; const end = parseFloat(m[1].replace(/,/g, "")), dec = (m[1].split(".")[1] || "").length, t0 = performance.now(); if (!(end > 0)) return; const step = now => { const f = Math.min(1, (now - t0) / 900), v = end * (1 - Math.pow(1 - f, 3)); b.innerHTML = (dec ? v.toFixed(dec) : Math.round(v).toLocaleString("en-US")) + m[2]; if (f < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }); }
