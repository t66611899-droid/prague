/* intro: פתיח קולנועי לכל יום עד הטיסה (23.11–30.11). עיצוב, איורים ותנועה מקוריים לגמרי.
   כל יום סצנה משלו: ערפל ושלג · גשר קרל בלילה · שווקי חג המולד · מסיבת הסירה · אורזים 8 ק"ג · כרטיס העלייה · שקיעה על המסלול · לוח יציאות.
   בכל פתיח: טיימר ספרות מתהפכות (חצאים מסתובבים באמת, עם צל), כותרת שעולה מתוך קו, משפט ליום, כרטיס עלייה, "דלג" ו"בוא נראה את הטיול".
   פעם ביום הפתיח המלא; בכניסות הבאות אותה סצנה בגרסה מהירה. סאונד כבוי כברירת מחדל.
   מוגן: הכול בתוך פונקציה עם try. אם משהו נכשל, נשאר מסך הספירה הרגיל. */
(function () {
"use strict";
window.__mods = window.__mods || {};
try {

const FLY_AT = typeof T_FLY !== "undefined" ? T_FLY : Date.UTC(2026, 10, 30, 17, 25); // שעון פראג
const nowMs = () => wall().getTime();
const pragueDate = () => new Date(nowMs()).toISOString().slice(0, 10);
const daysLeft = () => { const d = pragueDate().split("-").map(Number); return Math.round((Date.UTC(2026, 10, 30) - Date.UTC(d[0], d[1] - 1, d[2])) / 864e5); };
const sceneFor = () => { const dl = daysLeft(), w = nowMs(); if (dl >= 7) return 7; if (dl >= 1) return dl; if (dl === 0 && w < FLY_AT) return 0; return null; };
const introLight = () => REDUCED || saver || (navigator.deviceMemory && navigator.deviceMemory < 3) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) || (window._batt && window._batt.level < 0.2 && !window._batt.charging) || QS.get("intro") === "light";
const seen = () => LS.get("introSeen", {});

/* ---------- עזרים לאיורים ---------- */
const rnd = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const lg = (id, stops, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(s => `<stop offset="${s[0]}" stop-color="${s[1]}"${s[2] != null ? ` stop-opacity="${s[2]}"` : ""}/>`).join("")}</linearGradient>`;
const rg = (id, c, a = 1, mid) => `<radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity="${a}"/>${mid ? `<stop offset="${mid[0]}" stop-color="${c}" stop-opacity="${mid[1]}"/>` : ""}<stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
const stars = (n, seed, yMax = 420) => { const r = rnd(seed); let s = ""; for (let i = 0; i < n; i++) { const big = r() > 0.88; s += `<circle class="tw" cx="${(r() * 390).toFixed(1)}" cy="${(r() * yMax).toFixed(1)}" r="${big ? 1.3 : 0.7}" style="animation-delay:-${(r() * 4).toFixed(2)}s;animation-duration:${(2.5 + r() * 3).toFixed(2)}s" opacity="${(0.35 + r() * 0.6).toFixed(2)}"/>`; } return `<g fill="#fff">${s}</g>`; };
const windows = (x0, x1, ys, seed, lit = 0.4, w = 3, h = 4.5, step = 7) => { const r = rnd(seed); let s = ""; ys.forEach(y => { for (let x = x0; x <= x1; x += step) { const on = r() < lit; s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx=".6" fill="${on ? "#ffcf7a" : "#000"}" opacity="${on ? (0.55 + r() * 0.4).toFixed(2) : 0.18}"${on && r() > 0.7 ? ` class="tw slow" style="animation-delay:-${(r() * 6).toFixed(1)}s"` : ""}/>`; } }); return s; };
// מגדל גותי בסגנון טין: גוף, גג תלול, ארבעה צריחונים
const tyn = (x, base, top, w = 24, roof = 70) => `<path d="M${x} ${base}V${top}h${w}V${base}z"/><path d="M${x - 2} ${top + 1}L${x + w / 2} ${top - roof}L${x + w + 2} ${top + 1}z"/>${[x - 3, x + 3, x + w - 9, x + w - 3].map((px, i) => `<path d="M${px} ${top + 2}l3 -${i % 3 ? 26 : 20} 3 ${i % 3 ? 26 : 20}z"/>`).join("")}<path d="M${x + w / 2 - 0.6} ${top - roof}v-10h1.2v10z"/>`;
// פסל בארוקי על המעקה
const statue = (x, y, k) => `<g transform="translate(${x} ${y})"><rect x="-5" y="-8" width="10" height="8"/><path d="M-4 -8L-5 -24Q0 -31 5 -24L4 -8z"/><circle cx="0" cy="-30" r="3"/>${k % 2 ? `<path d="M3 -26l8 -9 1.5 1.5-8 9z"/>` : `<path d="M-0.7 -44h1.4v14h-1.4zM-4 -40h8v1.4h-8z"/>`}</g>`;

/* ---------- הסצנות ---------- */
const SC = {};

SC[7] = { k: "עוד 7 ימים", title: ["הספירה", "לאחור", "התחילה"], quip: "שבוע. בערך כמה זמן לוקח לך לדחות רעיון טוב. הפעם יש כרטיס טיסה — אין לאן לברוח.", fx: "fog", tone: "cold",
  art: () => `<defs>${lg("i7s", [[0, "#05081a"], [0.42, "#121a44"], [0.7, "#2b2c66"], [1, "#4b3a72"]])}${rg("i7m", "#cfe0ff", 0.55, [0.25, 0.18])}${lg("i7f", [[0, "#2f3a78"], [1, "#1d2453"]])}${lg("i7n", [[0, "#111536"], [1, "#05061a"]])}${rg("i7w", "#ffb45a", 0.9)}</defs>
    <rect width="390" height="844" fill="url(#i7s)"/>
    <g class="L L0">${stars(70, 7)}<circle cx="58" cy="452" r="70" fill="url(#i7m)"/><circle cx="58" cy="452" r="16" fill="#eef3ff"/><circle cx="52" cy="448" r="3.8" fill="#d9e2f7" opacity=".7"/><circle cx="63" cy="458" r="2.6" fill="#d9e2f7" opacity=".6"/></g>
    <g class="L L1" fill="url(#i7f)"><path d="M0 500C80 470 160 462 230 466S350 478 390 472V844H0z"/>
      <path d="M104 437l8-9h184l8 9z"/><path d="M108 468V436h192v32z"/><path d="M138 436v-16l7-9 7 9v16zM282 436v-14l6-8 6 8v14z"/>
      <path d="M214 436V354h22v82z"/><path d="M210 357h30v-6h-30z"/><path d="M214 351c0-15 22-15 22 0z"/><path d="M218 338c0-13 14-13 14 0z"/><path d="M223 325l2-30 2 30z"/>
      <path d="M236 436v-28l14-12 22 10v30z"/><path d="M246 436v-62h11v62zM262 436v-62h11v62z"/><path d="M246 375l5.5-58 5.5 58zM262 375l5.5-60 5.5 60z"/>
      <g>${windows(114, 296, [444, 455], 71, 0.45)}</g><g>${windows(217, 232, [370, 386, 402, 418], 72, 0.5, 2.4, 6, 6)}</g></g>
    <g class="L L2" fill="#161b44">${tyn(52, 640, 470, 24, 72)}${tyn(92, 640, 478, 24, 66)}<path d="M76 640V520l8-14 8 14v120z"/>
      <path d="M0 640V560l18-16 18 16v80zM118 640V540l22-22 22 22v100z"/><path d="M262 640V556q38-66 76 0v84z"/><path d="M296 492h8v-22h-8z"/><path d="M299 470l1-14 1 14z"/><path d="M338 640v-70l26-24 26 24v70z"/><path d="M180 640v-62h70v62z"/><path d="M176 580l39-30 39 30z"/>
      <g>${windows(124, 160, [560, 574, 588], 73, 0.5)}${windows(186, 246, [592, 606, 620], 74, 0.45)}${windows(272, 330, [575, 592, 609], 75, 0.4)}${windows(344, 384, [590, 606], 76, 0.45)}</g></g>
    <g class="L L3" fill="url(#i7n)"><path d="M0 844V676l26-22 4 0v-14h8v20l20 16h22l30-26 34 26v-6h10v8l24-20 28 22h18l36-30 38 30h8v-14h9v20l18-14 28 22h30V844z"/>
      <g>${[[46, 704], [112, 712], [186, 700], [256, 716], [330, 706], [70, 744], [210, 748], [300, 742]].map(([x, y], i) => `<circle cx="${x + 2}" cy="${y + 3}" r="12" fill="url(#i7w)" opacity=".35"/><rect x="${x}" y="${y}" width="5" height="7" rx="1" fill="#ffc46e" class="tw slow" style="animation-delay:-${i * 0.9}s"/>`).join("")}</g>
      <path d="M0 676l26-22h4l20 16h30l30-26 34 26M174 662l24-20 28 22h18l36-30 38 30M322 668l18-14 28 22h22" fill="none" stroke="#e9f0ff" stroke-opacity=".55" stroke-width="2.2" stroke-linecap="round"/></g>` };

SC[6] = { k: "עוד 6 ימים", title: ["גשר קרל", "בלילה"], quip: "לגשר קרל לקח כמעט 50 שנה להיבנות. לך יש 6 ימים להפסיק לחכות לרגע המושלם.", fx: "snow", tone: "warm", shift: 165, ground: "#03050f",
  art: () => { const lamps = [36, 76, 116, 156, 196, 236, 276]; return `<defs>${lg("i6s", [[0, "#040716"], [0.55, "#101941"], [1, "#27305e"]])}${lg("i6w", [[0, "#141c45"], [0.25, "#0b1130"], [1, "#03050f"]])}${rg("i6l", "#ffbf66", 0.95, [0.18, 0.45])}${lg("i6r", [[0, "#ffbf66", 0.75], [1, "#ffbf66", 0]])}${rg("i6c", "#ffb46b", 0.42)}${lg("i6b", [[0, "#1a2150"], [1, "#0b0f2c"]])}</defs>
    <rect width="390" height="844" fill="url(#i6s)"/>
    <g class="L L0">${stars(60, 6, 380)}<circle cx="330" cy="470" r="15" fill="#f2f5ff"/><circle cx="330" cy="470" r="60" fill="url(#i6c)" opacity=".25"/></g>
    <g class="L L1"><ellipse cx="110" cy="472" rx="150" ry="60" fill="url(#i6c)" opacity=".55"/><g fill="#2a2a5c"><path d="M-10 520C40 490 120 478 230 486L400 500V520z"/><path d="M40 488v-22h140v22z"/><path d="M110 468V412h16v56zM134 468v-42h8v42zM148 468v-42h8v42z"/><path d="M110 414c0-12 16-12 16 0zM134 428l4-36 4 36zM148 428l4-38 4 38z"/></g><g>${windows(46, 176, [474, 482], 61, 0.55, 2.4, 3.5, 6)}</g></g>
    <rect y="520" width="390" height="520" fill="url(#i6w)"/>
    <g class="L L2 shimmer" opacity=".5">${Array.from({ length: 14 }, (_, i) => `<rect x="${(i * 53) % 360}" y="${680 + i * 11}" width="${30 + (i % 4) * 18}" height="1.2" rx=".6" fill="#9fb3ff" style="animation-delay:-${i * 0.37}s"/>`).join("")}</g>
    <g class="L L2">
      ${lamps.map((x, i) => `<g class="lampx" style="--i:${i}"><rect x="${x - 3}" y="660" width="6" height="150" fill="url(#i6r)" class="refl"/><circle cx="${x}" cy="520" r="34" fill="url(#i6l)" class="glow"/></g>`).join("")}
      <g fill="url(#i6b)"><path d="M-10 548H312V566H-10z"/>${[0, 80, 160, 240].map(x => `<path d="M${x + 8} 566h22v86h-22z"/><path d="M${x + 8} 652l11 14 11-14z"/>`).join("")}${[0, 80, 160, 240].map(x => `<path d="M${x + 30} 566h50v86c0-46-50-46-50 0z" fill="#0d1236"/>`).join("")}
        ${[56, 136, 176, 216, 256].map((x, i) => statue(x, 548, i)).join("")}${lamps.map(x => `<path d="M${x - 0.8} 548v-26h1.6v26z"/><path d="M${x - 3} 522h6l-1 -8h-4z"/>`).join("")}</g>
      ${lamps.map((x, i) => `<rect x="${x - 2}" y="514" width="4" height="7" rx="1" fill="#ffd796" class="lampc" style="--i:${i}"/>`).join("")}
      <g fill="#0e1334"><path d="M306 566V398h64v168z"/><path d="M300 400l38-78 38 78z"/>${[300, 312, 358, 370].map(x => `<path d="M${x} 400l3 -22 3 22z"/>`).join("")}<path d="M320 566v-44q18-28 36 0v44z" fill="#070a1f"/></g>
      <g fill="#ffcf7a" opacity=".7"><rect x="318" y="430" width="5" height="12" rx="2"/><rect x="353" y="430" width="5" height="12" rx="2"/><rect x="334" y="462" width="8" height="16" rx="4" class="tw slow"/></g>
      <path d="M-10 548H306" stroke="#c9d3ff" stroke-opacity=".35" stroke-width="1"/></g>`; } };

SC[5] = { k: "עוד 5 ימים", title: ["השווקים", "כבר דולקים"], quip: "בעוד 5 ימים אף אחד שם לא יודע מי אתה. זה לא מפחיד — זה דף חדש בלי היסטוריה.", fx: "bokeh", tone: "warm",
  art: () => { const r = rnd(55), lights = [], cols = ["#ffd27a", "#ff7a6b", "#ffe9b0", "#8fd6ff", "#ffb347"];
    [[300, 400, 150, 240, 4], [350, 470, 130, 260, 5], [410, 550, 110, 280, 6], [470, 630, 92, 298, 7]].forEach(([ty, by, xl, xr, n], t) => { for (let g = 0; g < 2; g++) { const y0 = ty + (by - ty) * (0.35 + g * 0.4); const half = ((y0 - ty) / (by - ty)) * ((xr - xl) / 2); for (let i = 0; i <= n + g * 2; i++) { const f = i / (n + g * 2), x = 195 - half + f * half * 2, y = y0 + Math.sin(f * Math.PI) * 10 - f * 6; lights.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1.8 + r() * 1.4).toFixed(1)}" fill="${cols[(i + t + g) % cols.length]}" class="tw" style="animation-delay:-${(r() * 3).toFixed(2)}s;animation-duration:${(1.2 + r() * 1.6).toFixed(2)}s"/>`); } } });
    const hut = (x, w, c) => `<g><path d="M${x} 844V${700}h${w}V844z" fill="#2a160e"/><path d="M${x - 10} 704L${x + w / 2} ${660}L${x + w + 10} 704z" fill="${c}"/><path d="M${x - 10} 704L${x + w / 2} 660L${x + w + 10} 704l-6 3-${w / 2 + 4} -36-${w / 2 + 4} 36z" fill="#f4f7ff"/><rect x="${x + 8}" y="716" width="${w - 16}" height="34" rx="3" fill="#ffb24d" opacity=".95"/><rect x="${x + 8}" y="716" width="${w - 16}" height="34" rx="3" fill="url(#i5i)"/><path d="M${x + 4} 752h${w - 8}v6h-${w - 8}z" fill="#5a2e17"/></g>`;
    return `<defs>${lg("i5s", [[0, "#07051a"], [0.5, "#1c1140"], [1, "#3b1d3e"]])}${lg("i5t", [[0, "#1d5a3e"], [1, "#0a2a1c"]], 1, 0)}${rg("i5g", "#ffb95e", 0.6)}${rg("i5st", "#fff1b8", 1, [0.2, 0.6])}${lg("i5i", [[0, "#fff3c4", 0.6], [1, "#ff8a2a", 0]])}${lg("i5f", [[0, "#cfd8f5"], [1, "#8d97c4"]])}</defs>
      <rect width="390" height="844" fill="url(#i5s)"/>
      <g class="L L0">${stars(40, 5, 300)}</g>
      <g class="L L1" fill="#241a4a">${tyn(26, 700, 440, 26, 80)}${tyn(70, 700, 450, 26, 72)}<path d="M290 700V560l20-30 20 30v140zM330 700V590l30-26 30 26v110zM120 700v-70l16-16 16 16v70zM236 700v-80l14-22 14 22v80z"/><g>${windows(296, 386, [600, 620, 640], 51, 0.5)}${windows(124, 148, [648, 664], 52, 0.5)}</g></g>
      <g class="L L2"><g transform="translate(58.5 118) scale(.7)"><circle cx="195" cy="470" r="230" fill="url(#i5g)" opacity=".55"/>
        <path d="M188 690h14v-60h-14z" fill="#3a2012"/>
        <g fill="url(#i5t)"><path d="M195 470L92 630h206z"/><path d="M195 410L110 550h170z"/><path d="M195 350L130 470h130z"/><path d="M195 300L150 400h90z"/></g>
        <g fill="#f2f6ff" opacity=".85"><path d="M92 630q50-10 103-4t103 4l-4-6q-50 6-99 0t-99 2z"/><path d="M110 550q42-8 85-3t85 3l-3-5q-40 5-82 0t-82 2z"/><path d="M130 470q32-6 65-2t65 2l-3-5q-31 4-62 0t-62 2z"/></g>
        ${lights.join("")}
        <g class="star"><circle cx="195" cy="292" r="40" fill="url(#i5st)"/><g class="rays" stroke="#fff3c0" stroke-width="1.2" stroke-linecap="round" opacity=".8">${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6, r1 = 14, r2 = i % 2 ? 28 : 40; return `<path d="M${(195 + Math.cos(a) * r1).toFixed(1)} ${(292 + Math.sin(a) * r1).toFixed(1)}L${(195 + Math.cos(a) * r2).toFixed(1)} ${(292 + Math.sin(a) * r2).toFixed(1)}"/>`; }).join("")}</g><path d="M195 278l3.6 9.4 10 .5-7.8 6.3 2.7 9.7-8.5-5.5-8.5 5.5 2.7-9.7-7.8-6.3 10-.5z" fill="#ffe08a"/></g></g></g>
      <g class="L L3"><path d="M0 760q195-30 390 0V844H0z" fill="url(#i5f)"/>${hut(-6, 112, "#9b2230")}${hut(140, 110, "#1f5b44")}${hut(288, 110, "#9b2230")}
        <path d="M0 690q55 20 110 4t110 6 110-4 60 0" fill="none" stroke="#2a1a14" stroke-width="1.2"/>${Array.from({ length: 16 }, (_, i) => { const x = i * 26 + 6, y = 690 + Math.sin(i * 0.9) * 7 + 6; return `<circle cx="${x}" cy="${y.toFixed(1)}" r="2.6" fill="${cols[i % 5]}" class="tw" style="animation-delay:-${(i * 0.31).toFixed(2)}s"/>`; }).join("")}</g>`; } };

SC[4] = { k: "עוד 4 ימים", title: ["הלילות", "של פראג"], quip: "על הסירה אף אחד לא יגיד 'היי' ראשון בשבילך. תתחיל להתאמן.", fx: "sparks", tone: "neon", beat: 124, shift: 150, ground: "#030108",
  art: () => `<defs>${lg("i4s", [[0, "#05020f"], [0.55, "#170a35"], [1, "#2a0f45"]])}${lg("i4w", [[0, "#16083a"], [1, "#030108"]])}${lg("i4b1", [[0, "#ff3fd1", 0], [1, "#ff3fd1", 0.7]])}${lg("i4b2", [[0, "#36e3ff", 0], [1, "#36e3ff", 0.7]])}${lg("i4b3", [[0, "#b07bff", 0], [1, "#b07bff", 0.65]])}${lg("i4win", [[0, "#ff4fd8"], [0.5, "#b46bff"], [1, "#39e6ff"]], 1, 0)}${lg("i4r1", [[0, "#ff4fd8", 0.6], [1, "#ff4fd8", 0]])}${lg("i4r2", [[0, "#39e6ff", 0.55], [1, "#39e6ff", 0]])}${rg("i4h", "#ff4fd8", 0.5)}</defs>
    <rect width="390" height="844" fill="url(#i4s)"/>
    <g class="L L0">${stars(50, 4, 360)}</g>
    <g class="beams">${[["i4b1", -32, 3.2], ["i4b2", -12, 2.6], ["i4b3", 6, 3.6], ["i4b1", 22, 2.9], ["i4b2", 38, 3.4]].map(([g, a, d], i) => `<g class="bm" style="--a:${a}deg;animation-duration:${d}s;animation-delay:-${i * 0.7}s"><path d="M193 552L178 40h34L197 552z" fill="url(#${g})"/></g>`).join("")}</g>
    <g class="L L1" fill="#1a0f3c"><path d="M-10 530l20-30 30 10 10-30 30 0 20-60 22 60 30-6 26-40 26 40 24-10 20 22 34-14 30 18 34-24 34 20 25 0V530z"/><g>${windows(20, 380, [500, 514], 41, 0.3, 2.4, 3.4, 9)}</g></g>
    <rect y="528" width="390" height="520" fill="url(#i4w)"/>
    <g class="L L2"><circle cx="195" cy="590" r="150" fill="url(#i4h)" class="pulse" opacity=".6"/>
      <g class="refl2"><rect x="102" y="630" width="186" height="120" fill="url(#i4r1)" opacity=".55"/><rect x="150" y="630" width="90" height="170" fill="url(#i4r2)" opacity=".45"/></g>
      <path d="M40 600H316q22 0 36-6l-30 34H84q-26-4-44-28z" fill="#0b0618"/><path d="M40 600H316q22 0 36-6" fill="none" stroke="#ff7ce2" stroke-opacity=".6" stroke-width="1.4"/><path d="M70 614h240" stroke="#2a1a50" stroke-width="2"/>
      <path d="M70 600v-24q0-4 4-4h226q6 0 10 6l12 22z" fill="#120a26"/>${Array.from({ length: 15 }, (_, i) => `<rect x="${80 + i * 15}" y="580" width="10" height="12" rx="2" fill="url(#i4win)" class="winp" style="animation-delay:-${(i * 0.17).toFixed(2)}s"/>`).join("")}
      <path d="M118 572v-16q0-3 3-3h132q5 0 8 5l7 14z" fill="#160c2e"/>${Array.from({ length: 8 }, (_, i) => `<rect x="${126 + i * 16}" y="558" width="11" height="9" rx="2" fill="url(#i4win)" opacity=".9" class="winp" style="animation-delay:-${(i * 0.23).toFixed(2)}s"/>`).join("")}
      <path d="M118 553h150" stroke="#6b5aa8" stroke-opacity=".7" stroke-width="1"/><path d="M124 553v-5M144 553v-5M164 553v-5M184 553v-5M204 553v-5M224 553v-5M244 553v-5M264 553v-5M118 548h150" stroke="#6b5aa8" stroke-opacity=".55" stroke-width="1"/>
      <path d="M195 548v-26" stroke="#2a1d52" stroke-width="2"/><path d="M110 576L195 522 280 576" fill="none" stroke="#3a2a6a" stroke-width="1"/>
      ${Array.from({ length: 13 }, (_, i) => { const t = i / 12, x = 110 + t * 170, y = 576 - Math.sin(t * Math.PI) * 50 + (t < 0.5 ? 0 : 0); return `<circle cx="${x.toFixed(1)}" cy="${(y).toFixed(1)}" r="1.8" fill="${["#ff6be0", "#5fe9ff", "#ffe26b"][i % 3]}" class="tw" style="animation-duration:.9s;animation-delay:-${(i * 0.13).toFixed(2)}s"/>`; }).join("")}</g>
    <g class="L L3 shimmer" opacity=".6">${Array.from({ length: 12 }, (_, i) => `<rect x="${(i * 61) % 340}" y="${660 + i * 13}" width="${24 + (i % 3) * 20}" height="1.3" rx=".6" fill="${i % 2 ? "#ff7ce2" : "#62e8ff"}" style="animation-delay:-${i * 0.41}s"/>`).join("")}</g>` };

SC[3] = { k: "עוד 3 ימים", title: ["אורזים."], sub: "תיק אחד · 55×40×23 · עד 8 ק\"ג", quip: "תיק אחד, 8 קילו. גם התירוצים צריכים להיכנס פנימה — בהצלחה עם זה.", fx: "dust", tone: "studio",
  items: [["jacket", "מעיל", 1.6], ["beanie", "כובע", 0.2], ["gloves", "כפפות", 0.2], ["socks", "גרביים", 0.4], ["power", "מטען נייד", 0.5], ["passport", "דרכון", 0.1], ["shoes", "נעליים", 0.9], ["tees", "חולצות", 1.5], ["kit", "רחצה", 0.6], ["pants", "מכנסיים", 1.4]],
  art: () => `<defs>${rg("i3bg", "#3a4170", 1, [0.4, 0.55])}${lg("i3bag", [[0, "#f05a62"], [0.55, "#d42a33"], [1, "#8e141c"]], 1, 0.2)}${lg("i3side", [[0, "#7a0f16"], [1, "#4d080d"]])}${lg("i3cone", [[0, "#fff6e0", 0.22], [1, "#fff6e0", 0]])}${rg("i3sh", "#000", 0.55)}</defs>
    <rect width="390" height="844" fill="#0b0d1a"/><circle cx="195" cy="470" r="420" fill="url(#i3bg)" opacity=".75"/>
    <path d="M150 0h90l120 844H30z" fill="url(#i3cone)" class="cone"/>
    <g class="L L2"><g transform="translate(39 18) scale(.8)"><ellipse cx="195" cy="662" rx="150" ry="18" fill="url(#i3sh)"/>
      <g class="bag">
        <path d="M142 420c0-30 106-30 106 0" fill="none" stroke="#1a1d2e" stroke-width="9" stroke-linecap="round"/>
        <path d="M84 432h222l8 6v196l-8 8H84l-8-8V438z" fill="url(#i3side)"/>
        <ellipse cx="195" cy="440" rx="104" ry="10" fill="#26080c"/>
        <g class="itms"></g>
        <path d="M78 452q117-20 234 0v176q0 14-14 14H92q-14 0-14-14z" fill="url(#i3bag)"/>
        <path d="M78 452q117-20 234 0" fill="none" stroke="#ffd27a" stroke-width="2.4" stroke-dasharray="3 3"/>
        <path d="M120 470v160M270 470v160" stroke="#000" stroke-opacity=".14" stroke-width="2"/><path d="M118 470v160" stroke="#fff" stroke-opacity=".12" stroke-width="1.4"/>
        <rect x="150" y="530" width="90" height="56" rx="10" fill="#000" opacity=".12"/><path d="M160 548h70M160 560h50" stroke="#fff" stroke-opacity=".25" stroke-width="3" stroke-linecap="round"/>
        <rect x="100" y="636" width="22" height="16" rx="4" fill="#1a1d2e"/><rect x="268" y="636" width="22" height="16" rx="4" fill="#1a1d2e"/>
        <g class="tag"><path d="M312 470q14 6 12 30" fill="none" stroke="#e8a317" stroke-width="1.6"/><rect x="306" y="500" width="40" height="26" rx="4" fill="#f7f1e6" transform="rotate(8 326 513)"/><text x="326" y="517" text-anchor="middle" font-size="8.5" font-weight="800" fill="#14161b" transform="rotate(8 326 513)" font-family="Rubik,system-ui">55×40×23</text></g>
      </g></g></g>` };

SC[2] = { k: "עוד יומיים", title: ["כרטיס העלייה", "מוכן"], quip: "הזמן לא חיכה לך כשדחית. הוא גם לא יחכה עכשיו. ההבדל — הפעם אתה זז איתו.", fx: "bokeh-cool", tone: "cool", hero: "pass",
  art: () => `<defs>${lg("i2s", [[0, "#04101f"], [0.6, "#0b2440"], [1, "#123456"]])}${lg("i2st", [[0, "#7fd3ff", 0], [0.5, "#7fd3ff", 0.35], [1, "#7fd3ff", 0]], 1, 0)}</defs>
    <rect width="390" height="844" fill="url(#i2s)"/>
    <g class="L L0 streaks">${[120, 260, 420, 610, 740].map((y, i) => `<rect x="-200" y="${y}" width="200" height="${1 + (i % 3)}" fill="url(#i2st)" style="animation-delay:-${i * 0.9}s;animation-duration:${2.6 + i * 0.5}s"/>`).join("")}</g>
    <g class="L L1" opacity=".5" stroke="#6fb7ff" stroke-opacity=".25" fill="none">${Array.from({ length: 9 }, (_, i) => `<path d="M${-20 + i * 52} 844L195 470"/>`).join("")}<path d="M0 620H390M0 700H390M0 790H390"/></g>` };

SC[1] = { k: "עוד יום אחד", title: ["מחר", "טסים."], quip: "מחר אתה עולה לבד על מטוס. מה שמלחיץ אותך עכשיו — בעוד שבוע זה סיפור שאתה מספר.", fx: "haze", tone: "sunset", shift: 125, ground: "#0b0815",
  art: () => { const edge = []; for (let i = 0; i < 16; i++) { const t = i / 15, y = 505 + Math.pow(t, 1.9) * 339, half = 10 + Math.pow(t, 1.9) * 200, r = 0.6 + t * 3.2; edge.push(`<circle cx="${(195 - half).toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#fff3d6"/><circle cx="${(195 + half).toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#fff3d6"/>`); }
    const ctr = []; for (let i = 0; i < 12; i++) { const t = i / 11, y = 512 + Math.pow(t, 1.9) * 330, h = 2 + t * 16, w = 1 + t * 4; ctr.push(`<rect x="${(195 - w / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="#fff" opacity=".75"/>`); }
    const chase = []; for (let i = 0; i < 8; i++) { const t = 1 - i / 8, y = 520 + Math.pow(t, 1.9) * 320; chase.push(`<circle class="chase" style="--i:${i}" cx="195" cy="${y.toFixed(1)}" r="${(1 + t * 4).toFixed(1)}" fill="#fffbe8"/>`); }
    return `<defs>${lg("i1s", [[0, "#1b1745"], [0.32, "#4a2a6e"], [0.55, "#c4517a"], [0.75, "#ff8a5c"], [0.9, "#ffc27a"]])}${rg("i1sun", "#ffd58a", 0.9, [0.3, 0.45])}${lg("i1g", [[0, "#2b1c3f"], [1, "#0b0815"]])}${lg("i1rw", [[0, "#3b2c4c"], [1, "#16111f"]])}${lg("i1c", [[0, "#ffb07a", 0.75], [1, "#ff6f8a", 0.35]], 1, 0)}<filter id="i1bl" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="5"/></filter></defs>
      <rect width="390" height="844" fill="url(#i1s)"/>
      <g class="L L0"><circle cx="252" cy="500" r="170" fill="url(#i1sun)"/><circle cx="252" cy="500" r="34" fill="#ffe3a6"/>
        <g class="clouds" filter="url(#i1bl)">${[[90, 330, 110, 9], [290, 300, 130, 8], [40, 410, 150, 12], [250, 425, 170, 11], [170, 375, 90, 7], [350, 380, 80, 6]].map(([x, y, rx, ry], i) => `<g style="animation-delay:-${i * 4}s"><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#i1c)" opacity=".85"/><ellipse cx="${x - rx * 0.35}" cy="${y - ry * 0.7}" rx="${rx * 0.45}" ry="${ry * 1.1}" fill="#ffb98f" opacity=".35"/><ellipse cx="${x + rx * 0.25}" cy="${y - ry * 0.5}" rx="${rx * 0.4}" ry="${ry}" fill="#ff8fa0" opacity=".3"/></g>`).join("")}</g></g>
      <g class="L L1" fill="#2a1d3c"><path d="M0 505h390v4H0z"/><path d="M318 505v-70h8v70z"/><path d="M308 436h28l-4-14h-20z"/><path d="M310 422h24v-6h-24z" fill="#ffd27a" opacity=".7"/><path d="M20 505v-14h60v14zM90 505v-8h40v8z"/><circle cx="322" cy="412" r="2" fill="#ff4b4b" class="tw" style="animation-duration:1.2s"/></g>
      <path d="M0 505h390v520H0z" fill="url(#i1g)"/><path d="M185 505h20l190 339H-5z" fill="url(#i1rw)"/>${ctr.join("")}${edge.join("")}${chase.join("")}
      <g class="L L2 plane"><path d="M30 600h330v8H30z" fill="#120d1c"/>
        <g transform="translate(120 548)"><path d="M10 34c-6 0-10-3-10-7s4-7 12-7h118c8 0 13 2 16 5l-2 9H10z" fill="#0d0a16"/><path d="M128 20l8-28h10l-4 28z" fill="#0d0a16"/><path d="M60 30l-22 14h14l26-14z" fill="#07050c"/><rect x="40" y="31" width="22" height="7" rx="3.5" fill="#07050c"/><path d="M14 24h104" stroke="#ffd9a8" stroke-opacity=".35" stroke-width="2" stroke-dasharray="3 3"/>
          <circle cx="140" cy="-6" r="2.2" fill="#ff3b3b" class="nav r"/><circle cx="44" cy="44" r="2" fill="#38ff7a" class="nav g"/><circle cx="148" cy="22" r="2.2" fill="#fff" class="strobe"/><path d="M36 44v8M120 34v18" stroke="#07050c" stroke-width="2"/><circle cx="36" cy="54" r="3" fill="#07050c"/><circle cx="120" cy="54" r="3" fill="#07050c"/></g></g>`; } };

SC[0] = { k: "היום!", title: ["היום", "טסים."], quip: "אף אחד לא בא להציל אותך. ואף אחד גם לא צריך. טוס.", fx: "dust", tone: "terminal", hero: "board",
  art: () => `<defs>${lg("i0s", [[0, "#1a1d4a"], [0.45, "#5a3a7a"], [0.75, "#e07a8a"], [1, "#ffb87a"]])}${lg("i0f", [[0, "#1b1d2e"], [1, "#07080f"]])}${lg("i0gl", [[0, "#fff", 0.08], [0.5, "#fff", 0], [1, "#fff", 0.05]], 1, 1)}${rg("i0lt", "#ffe2b0", 0.35)}</defs>
    <rect width="390" height="844" fill="#0c0d18"/>
    <g class="L L0"><rect x="0" y="420" width="390" height="250" fill="url(#i0s)"/><circle cx="90" cy="610" r="90" fill="url(#i0lt)"/>
      <g fill="#1a1530"><path d="M0 640h390v30H0z"/><path d="M230 640l40-150h26l-8 150z"/><path d="M268 500l6-24h14l-4 24z" fill="#d42a33"/><path d="M60 640c0-10 10-14 26-14h150c12 0 18 4 18 10v4z"/><path d="M90 640l40 18h20l-30-18z"/></g>
      <path d="M244 600l46-90" stroke="#fff" stroke-opacity=".5" stroke-width="3"/></g>
    <g class="L L1" fill="#11131f"><path d="M0 0h390v420H0z"/>${[0, 78, 156, 234, 312, 390].map(x => `<rect x="${x - 3}" y="410" width="6" height="270"/>`).join("")}<path d="M0 410h390v10H0zM0 666h390v14H0z"/><rect y="420" width="390" height="250" fill="url(#i0gl)"/>
      ${[60, 160, 260, 360].map(x => `<rect x="${x - 30}" y="40" width="60" height="4" rx="2" fill="#fff3d6" opacity=".55"/><path d="M${x - 30} 44h60l20 60h-100z" fill="#fff3d6" opacity=".05"/>`).join("")}</g>
    <path d="M0 680h390v164H0z" fill="url(#i0f)"/><g opacity=".22"><rect x="0" y="690" width="390" height="40" fill="url(#i0s)" transform="scale(1 -1) translate(0 -1420)"/></g>` };

/* ---------- רכיבים ---------- */
const flap = () => `<b class="fl"><i class="t"><s></s></i><i class="b"><s></s></i><i class="ft"><s></s></i><i class="fb"><s></s></i></b>`;
const timerHtml = () => `<div class="in-timer" dir="ltr">${[["d", "ימים"], ["h", "שעות"], ["m", "דקות"], ["s", "שניות"]].map(([k, l], i) => `${i ? `<i class="col"><u></u><u></u></i>` : ""}<div class="grp" data-k="${k}"><div class="pair">${flap()}${flap()}</div><small>${l}</small></div>`).join("")}</div>`;
function setDigit(el, ch, animate) {
  if (el.dataset.v === ch) return; const old = el.dataset.v == null ? ch : el.dataset.v; el.dataset.v = ch;
  const [t, b, ft, fb] = el.children; t.firstChild.textContent = ch; fb.firstChild.textContent = ch; ft.firstChild.textContent = old; b.firstChild.textContent = old;
  if (!animate) { b.firstChild.textContent = ch; return; }
  el.classList.remove("flp"); void el.offsetWidth; el.classList.add("flp"); clearTimeout(el._t); el._t = setTimeout(() => { b.firstChild.textContent = ch; el.classList.remove("flp"); }, 520);
}
function tickTimer(root, animate) {
  const ms = Math.max(0, FLY_AT - nowMs()), v = { d: Math.floor(ms / 864e5), h: Math.floor(ms % 864e5 / 36e5), m: Math.floor(ms % 36e5 / 6e4), s: Math.floor(ms % 6e4 / 1000) };
  root.querySelectorAll(".grp").forEach(g => { const s = String(v[g.dataset.k]).padStart(2, "0"); g.querySelectorAll(".fl").forEach((f, i) => setDigit(f, s[i], animate)); });
  return ms;
}
const barcode = (n, seed, h = 30) => { const r = rnd(seed); let x = 0, s = ""; for (let i = 0; i < n; i++) { const w = r() > 0.7 ? 2.4 : r() > 0.4 ? 1.4 : 0.8; s += `<rect x="${x.toFixed(1)}" width="${w}" height="${h}" style="--i:${i}"/>`; x += w + (r() > 0.6 ? 1.6 : 1); } return `<svg class="bc" viewBox="0 0 ${x.toFixed(0)} ${h}" preserveAspectRatio="none" aria-hidden="true">${s}</svg>`; };
const passHtml = () => `<div class="in-pass" aria-label="כרטיס עלייה: תל אביב לפראג, QS1285, 30.11, 18:25">
  <div class="pa"><div class="rt"><div><small>TEL AVIV</small><b>TLV</b></div><div class="mid"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.500V19l-2 1.500V22l3.500-1 3.500 1v-1.500L13 19v-5.500z" fill="currentColor"/></svg><i></i><small>QS1285</small></div><div><small>PRAGUE</small><b>PRG</b></div></div>
    <div class="ff"><span><small>תאריך</small>30.11</span><span><small>המראה</small>18:25</span><span><small>נוסע</small>עומר</span></div></div>
  <div class="pb">${barcode(26, 1285, 40)}<small>QS1285</small></div></div>`;
const bigPassHtml = () => `<div class="in-bp"><div class="slot"><i></i></div><div class="clip"><div class="paper">
  <div class="hd"><b>BOARDING PASS</b><span>כרטיס עלייה</span></div>
  <div class="rt"><div><b>TLV</b><small>Tel Aviv</small></div><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 16v-2l-8-5V3.500a1.500 1.500 0 0 0-3 0V9l-8 5v2l8-2.500V19l-2 1.500V22l3.500-1 3.500 1v-1.500L13 19v-5.500z" fill="currentColor"/></svg><div><b>PRG</b><small>Prague</small></div></div>
  <div class="gr"><span><small>טיסה</small><b>QS1285</b></span><span><small>תאריך</small><b>30.11</b></span><span><small>המראה</small><b>18:25</b></span><span><small>נוסע</small><b>עומר</b></span></div>
  <div class="perf"></div>${barcode(54, 2026, 46)}<div class="stamp">צ'ק-אין<br>נפתח</div></div></div></div>`;
const BOARD = [["17:55", "LO 152", "WARSAW", "DEPARTED"], ["18:10", "A3 929", "ATHENS", "GATE CLOSED"], ["18:25", "QS 1285", "PRAGUE", null], ["18:40", "FR 2416", "BUDAPEST", "ON TIME"]];
const boardStatus = () => { const left = FLY_AT - nowMs(); return left <= 60 * 6e4 ? "BOARDING" : left <= 3 * 36e5 ? "CHECK-IN" : "ON TIME"; };
const boardHtml = () => `<div class="in-board" dir="ltr"><div class="bh"><span>DEPARTURES</span><span>יציאות</span></div>${BOARD.map(r => `<div class="br${r[3] ? "" : " mine"}">${[r[0], r[1], r[2], r[3] || boardStatus()].map((c, j) => `<span class="c${j}">${c.split("").map(ch => `<i data-c="${ch === " " ? "&nbsp;" : ch}">${ch === " " ? "&nbsp;" : ""}</i>`).join("")}</span>`).join("")}</div>`).join("")}</div>`;
function boardFlip(root, quick) {
  const A = "ABCDEFGHIJKLMNOPRSTUVWXYZ0123456789"; let i = 0;
  root.querySelectorAll(".in-board i").forEach(el => { const fin = el.dataset.c === "&nbsp;" ? " " : el.dataset.c; if (quick || fin === " ") { el.textContent = fin; return; } const n = 4 + (i++ % 7), d0 = 300 + (i % 23) * 40; for (let k = 0; k <= n; k++) setTimeout(() => { el.textContent = k === n ? fin : A[(Math.random() * A.length) | 0]; el.classList.remove("f"); void el.offsetWidth; el.classList.add("f"); }, d0 + k * 70); });
}
const ITEM_SVG = {
  jacket: `<path d="M-22 -26l12-6 10 6 10-6 12 6 8 40-10 4-4-18v32h-32v-32l-4 18-10-4z" fill="#2f7de1"/><path d="M-18 -8h36M-18 4h36M-18 16h36" stroke="#1b4f99" stroke-width="2"/><path d="M0 -26v54" stroke="#ffd27a" stroke-width="1.6"/>`,
  beanie: `<path d="M-18 6c0-24 36-24 36 0z" fill="#e8a317"/><rect x="-20" y="4" width="40" height="10" rx="4" fill="#c8840a"/><circle cx="0" cy="-16" r="6" fill="#f7f1e6"/><path d="M-12 -2v6M-4 -6v10M4 -6v10M12 -2v6" stroke="#c8840a" stroke-width="1.4"/>`,
  gloves: `<path d="M-16 14v-18c0-6 2-10 6-10s6 4 6 10l2-6c1-3 6-2 5 2l-3 10v12z" fill="#7a4cc2"/><path d="M2 14v-18c0-6 2-10 6-10s6 4 6 10l2-6c1-3 6-2 5 2l-3 10v12z" fill="#9a6be0"/><rect x="-17" y="12" width="15" height="5" rx="2" fill="#4f2f86"/><rect x="1" y="12" width="15" height="5" rx="2" fill="#6a43a8"/>`,
  socks: `<path d="M-10 -18h12v20l10 6c6 4 3 12-4 10l-18-6z" fill="#f7f1e6"/><path d="M-10 -18h12v6h-12z" fill="#d42a33"/><path d="M2 -18h12v20l10 6c6 4 3 12-4 10l-18-6z" fill="#dfe6f5" transform="translate(6 2)"/>`,
  power: `<rect x="-14" y="-18" width="28" height="40" rx="6" fill="#262a3d"/><rect x="-9" y="-12" width="18" height="4" rx="2" fill="#39e07a"/><path d="M14 10c14 0 14 18 0 18h-20" fill="none" stroke="#f7f1e6" stroke-width="2.4" stroke-linecap="round"/>`,
  passport: `<rect x="-14" y="-20" width="28" height="38" rx="3" fill="#1e3a8a"/><circle cx="0" cy="-4" r="7" fill="none" stroke="#e8c36b" stroke-width="1.6"/><path d="M-7 10h14" stroke="#e8c36b" stroke-width="1.6"/>`,
  shoes: `<path d="M-22 6c0-10 4-16 10-16 4 0 6 6 12 8l16 4c4 1 6 4 6 8v2h-44z" fill="#f7f1e6"/><path d="M-22 12h44v4h-44z" fill="#14161b"/><path d="M-8 -4l4 8M-2 -2l4 8" stroke="#d42a33" stroke-width="1.6"/>`,
  tees: `<path d="M-18 -16l10-4c2 4 14 4 16 0l10 4 6 12-8 4-4-6v26h-24v-26l-4 6-8-4z" fill="#f04f6d"/><path d="M-18 -10l10-4c2 4 14 4 16 0l10 4" fill="none" stroke="#fff" stroke-opacity=".4"/>`,
  kit: `<rect x="-18" y="-10" width="36" height="24" rx="8" fill="#2fb7a3"/><path d="M-10 -10c0-8 20-8 20 0" fill="none" stroke="#1d7d6f" stroke-width="2.6"/><path d="M-18 2h36" stroke="#1d7d6f" stroke-width="1.6"/>`,
  pants: `<path d="M-14 -20h28l2 42h-11l-3-28-3 28h-11z" fill="#3c4a6b"/><path d="M-14 -16h28" stroke="#2a3550" stroke-width="2"/>`
};

/* ---------- חלקיקים (Canvas): שלג בעומק, ערפל, בוקה, ניצוצות ---------- */
function makeFx(cv, kind, lite, noVeil) {
  const ctx = cv.getContext("2d"), dpr = Math.min(window.devicePixelRatio || 1, lite ? 1 : 2); let W = 0, H = 0, P = [], fog = [], raf = 0, t0 = performance.now(), dead = false, paused = false;
  const resize = () => { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  resize(); addEventListener("resize", resize);
  const N = { fog: 90, snow: 140, bokeh: 34, "bokeh-cool": 30, sparks: 70, dust: 46, haze: 40 }[kind] || 80, n = lite ? Math.round(N * 0.4) : N;
  for (let i = 0; i < n; i++) { const z = Math.random(); P.push({ x: Math.random() * W, y: Math.random() * H, z, r: kind.startsWith("bokeh") ? 8 + z * 26 : kind === "sparks" ? 0.8 + z * 1.8 : 0.6 + z * (kind === "dust" || kind === "haze" ? 1.4 : 2.6), vx: (Math.random() - 0.5) * 0.3, vy: kind === "sparks" ? -(0.4 + z * 1.4) : kind.startsWith("bokeh") ? -(0.05 + z * 0.18) : kind === "dust" || kind === "haze" ? (Math.random() - 0.5) * 0.12 : 0.35 + z * 1.25, ph: Math.random() * 6.28, h: kind === "sparks" ? (Math.random() > 0.5 ? 320 : 190) : Math.random() > 0.5 ? 38 : 18 }); }
  if (kind === "fog") for (let i = 0; i < (lite ? 4 : 8); i++) fog.push({ x: Math.random() * W, y: H * (0.35 + Math.random() * 0.5), r: 140 + Math.random() * 160, v: 0.12 + Math.random() * 0.25 });
  const frame = now => {
    if (dead) return; raf = requestAnimationFrame(frame); if (paused) return; const t = (now - t0) / 1000; ctx.clearRect(0, 0, W, H);
    if (fog.length) { const clear = Math.min(1, t / 3.2), base = 0.92 - clear * 0.62; fog.forEach(f => { f.x += f.v; if (f.x - f.r > W) f.x = -f.r; const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r); g.addColorStop(0, `rgba(196,206,240,${(base * 0.55).toFixed(3)})`); g.addColorStop(1, "rgba(196,206,240,0)"); ctx.fillStyle = g; ctx.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2); });
      if (t < 3.4 && !noVeil) { ctx.fillStyle = `rgba(150,160,205,${Math.max(0, 0.85 - t / 3.4 * 0.85).toFixed(3)})`; ctx.fillRect(0, 0, W, H); } }
    for (const p of P) {
      p.ph += 0.02; p.x += p.vx + Math.sin(p.ph) * (kind === "snow" || kind === "fog" ? 0.35 * p.z : 0.1); p.y += p.vy;
      if (p.y > H + 20) { p.y = -20; p.x = Math.random() * W; } if (p.y < -40) { p.y = H + 30; p.x = Math.random() * W; } if (p.x > W + 30) p.x = -30; if (p.x < -30) p.x = W + 30;
      if (kind.startsWith("bokeh")) { const a = (0.06 + p.z * 0.12) * (0.7 + 0.3 * Math.sin(p.ph * 0.7)), g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); const c = kind === "bokeh-cool" ? "120,190,255" : p.h === 38 ? "255,196,110" : "255,120,90"; g.addColorStop(0, `rgba(${c},${a.toFixed(3)})`); g.addColorStop(0.7, `rgba(${c},${(a * 0.6).toFixed(3)})`); g.addColorStop(1, `rgba(${c},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
      else if (kind === "sparks") { const a = 0.35 + 0.65 * Math.abs(Math.sin(p.ph * 3)); ctx.fillStyle = `hsla(${p.h},100%,72%,${(a * (0.4 + p.z * 0.6)).toFixed(3)})`; ctx.fillRect(p.x, p.y, p.r, p.r * 3); }
      else { const a = kind === "dust" || kind === "haze" ? 0.18 + 0.3 * Math.abs(Math.sin(p.ph)) : 0.35 + p.z * 0.6; ctx.fillStyle = kind === "haze" ? `rgba(255,220,180,${a.toFixed(3)})` : `rgba(255,255,255,${a.toFixed(3)})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
    }
  };
  raf = requestAnimationFrame(frame);
  const vis = () => { paused = document.hidden; }; document.addEventListener("visibilitychange", vis);
  return { stop() { dead = true; cancelAnimationFrame(raf); removeEventListener("resize", resize); document.removeEventListener("visibilitychange", vis); }, thin() { P = P.filter((_, i) => i % 2 === 0); fog = fog.slice(0, 3); } };
}

/* ---------- סאונד (מסונתז, כבוי כברירת מחדל) ---------- */
let AC = null;
const snd = (kind, at = 0) => { if (!settings.cineSound) return; try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const t = AC.currentTime + at, o = AC.createOscillator(), g = AC.createGain(); o.connect(g); g.connect(AC.destination);
  if (kind === "flap") { const b = AC.createBuffer(1, 600, AC.sampleRate), d = b.getChannelData(0); for (let i = 0; i < 600; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / 600, 4); const s = AC.createBufferSource(), f = AC.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 1800; s.buffer = b; s.connect(f); f.connect(g); g.gain.value = 0.22; s.start(t); o.disconnect(); return; }
  if (kind === "kick") { o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.start(t); o.stop(t + 0.32); return; }
  if (kind === "chime") { o.type = "triangle"; o.frequency.setValueAtTime(1318, t); g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.1); o.start(t); o.stop(t + 1.2); return; }
  if (kind === "boom") { o.type = "sine"; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.7); g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.9); o.start(t); o.stop(t + 1); return; }
  o.type = "sawtooth"; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(880, t + 0.5); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.25); g.gain.exponentialRampToValueAtTime(0.001, t + 0.6); o.start(t); o.stop(t + 0.62); } catch (e) {} };

/* ---------- מנוע 2.5D: איור מצויר + מפת עומק = מצלמה אמיתית בתוך הסצנה ----------
   Shader אחד: פרלקסה לפי עומק (push-in, הטיה, tracking), עומק שדה, ערפל נפחי שזז, חשיפה, וינייטה וגרגר קולנועי.
   האיורים (art/dN.jpg) נוצרו במיוחד לטיול; מפות העומק (art/zN.jpg) חושבו מהם. אם התמונה או WebGL לא זמינים: האיור הווקטורי הישן. */
const ARTC = {};
function loadArt(n) { if (ARTC[n]) return ARTC[n].p; const one = src => new Promise((res, rej) => { const i = new Image(); i.decoding = "async"; i.onload = () => res(i); i.onerror = rej; i.src = src; }); const o = ARTC[n] = { ok: false }; o.p = Promise.all([one(`art/d${n}.jpg`), one(`art/z${n}.jpg`)]).then(([img, dep]) => { o.img = img; o.dep = dep; o.ok = true; return o; }).catch(() => { delete ARTC[n]; return null; }); return o.p; }
const artReady = n => (ARTC[n] && ARTC[n].ok ? ARTC[n] : null);
const POSE0 = { z: 1, px: 0, py: 0, cx: 0, cy: 0, f: 0.3, b: 0, e: 1, fog: 0 };
/* לכל יום: צבע הערפל, תנוחת המנוחה (מסך הספירה), ומסלול המצלמה של המיני-סרטון (זמן במ"ש → תנוחה) */
const KF = {
  7: { fc: [0.62, 0.68, 0.92], rest: { z: 1.04, f: 0.25, fog: 0.16 }, path: [[0, { z: 1.02, py: 0.1, f: 0.9, b: 0.02, e: 0, fog: 1 }], [500, { e: 0.6 }], [2600, { z: 1.42, py: -0.035, cy: 0.05, f: 0.2, b: 0.006, e: 1, fog: 0.3 }], [2950, { z: 1.47, py: -0.04, cy: 0.055, fog: 0.22 }]] },
  6: { fc: [0.5, 0.56, 0.82], rest: { z: 1.05, f: 0.3, fog: 0.14 }, path: [[0, { z: 1.7, px: -0.12, py: 0.16, f: 0.75, b: 0.012, e: 0, fog: 0.5 }], [450, { e: 0.6 }], [2500, { z: 1.3, px: 0.1, py: 0, cx: -0.05, f: 0.3, b: 0.004, e: 1, fog: 0.25 }], [2950, { z: 1.22, px: 0.06, py: -0.02, cx: -0.06 }]] },
  5: { fc: [0.95, 0.72, 0.5], rest: { z: 1.05, f: 0.3, fog: 0.08 }, path: [[0, { z: 1.5, py: 0.2, f: 1.6, b: 0.022, e: 0, fog: 0.25 }], [500, { e: 0.75 }], [1500, { z: 1.45, py: 0.14, f: 0.35, b: 0.004 }], [2700, { z: 1.3, py: -0.04, cy: 0.05, e: 1, fog: 0.12 }], [2950, { z: 1.26, py: -0.05 }]] },
  4: { fc: [0.45, 0.2, 0.62], rest: { z: 1.05, f: 0.35, fog: 0.18 }, path: [[0, { z: 1.6, px: 0.04, py: 0.2, f: 0.9, b: 0.012, e: 0, fog: 0.7 }], [450, { e: 0.5 }], [2400, { z: 1.35, px: 0.06, py: 0.02, cy: 0.04, f: 0.35, b: 0.003, e: 1, fog: 0.3 }], [2950, { z: 1.28 }]] },
  3: { fc: [0.2, 0.2, 0.3], rest: { z: 1.04, py: 0.05, f: 0.6, fog: 0 }, path: [[0, { z: 1.25, py: 0.12, cx: -0.06, f: 0.6, b: 0.01, e: 0 }], [380, { e: 0.15 }], [640, { e: 1 }], [2600, { z: 1.3, cx: 0.06, b: 0.004 }], [2950, { z: 1.33, cx: 0.07 }]] },
  2: { fc: [0.2, 0.5, 0.6], rest: { z: 1.03, f: 0.5, fog: 0.04 }, path: [[0, { z: 2.1, py: -0.13, f: 0.6, b: 0.01, e: 0 }], [420, { e: 0.9 }], [1150, { z: 1.03, py: 0, b: 0.002, e: 1 }], [2950, { z: 1.06 }]] },
  1: { fc: [1, 0.6, 0.45], rest: { z: 1.05, f: 0.2, fog: 0.1 }, path: [[0, { z: 1.7, py: 0.24, f: 0.95, b: 0.014, e: 0, fog: 0.5 }], [450, { e: 0.8 }], [2500, { z: 1.4, py: 0.04, cy: 0.06, f: 0.25, b: 0.004, e: 1, fog: 0.2 }], [2950, { z: 1.34, py: 0.02 }]] },
  0: { fc: [0.5, 0.4, 0.56], rest: { z: 1.04, f: 0.3, fog: 0.06 }, path: [[0, { z: 2.3, px: -0.03, py: -0.2, f: 0.25, b: 0.006, e: 0 }], [520, { e: 0.9 }], [2300, { z: 1.25, px: 0, py: -0.03, cy: -0.03, e: 1 }], [2950, { z: 1.18 }]] }
};
function makeStage(cv, art, lite, n) {
  let gl; try { gl = cv.getContext("webgl", { alpha: false, antialias: false, powerPreference: "high-performance" }); } catch (e) {} if (!gl) return null;
  const VS = "attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}";
  const FS = `${lite ? "" : "#define RICH\n"}precision highp float;varying vec2 v;uniform sampler2D I,D;uniform vec2 uS,uPan,uCam,uR;uniform float uZ,uF,uB,uE,uT,uFog,uHit;uniform vec3 uFc;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
void main(){vec2 s=vec2(v.x,1.-v.y);vec2 uv=((s-.5)/uZ+uPan)*uS+.5;
float d=texture2D(D,uv).r;uv-=(d-uF)*uCam;d=texture2D(D,uv).r;
vec3 c=texture2D(I,uv).rgb;
#ifdef RICH
float k=abs(d-uF)*uB;if(k>.0005){c+=texture2D(I,uv+vec2(k,0.)).rgb+texture2D(I,uv-vec2(k,0.)).rgb+texture2D(I,uv+vec2(0.,k)).rgb+texture2D(I,uv-vec2(0.,k)).rgb+texture2D(I,uv+vec2(k,k)*.7).rgb+texture2D(I,uv-vec2(k,k)*.7).rgb+texture2D(I,uv+vec2(k,-k)*.7).rgb+texture2D(I,uv+vec2(-k,k)*.7).rgb;c/=9.;}
float fg=n2(vec2(uv.x*2.4+uT*.035,uv.y*3.2-uT*.012))*.6+n2(vec2(uv.x*5.1-uT*.02,uv.y*6.3))*.4;c=mix(c,uFc,clamp(uFog*(.3+fg)*smoothstep(.8,.05,d),0.,.94));
#endif
c*=uE;c+=uHit*vec3(1.,.9,.72)*.3;
float vg=smoothstep(1.25,.35,length((s-.5)*vec2(.9,1.15)));c*=mix(.6,1.,vg);
c+=(h(s*uR+fract(uT))-.5)*.035;
gl_FragColor=vec4(c,1.);}`;
  const sh = (t, src) => { const o = gl.createShader(t); gl.shaderSource(o, src); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o) || "shader"); return o; };
  let pr; try { pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error("link"); } catch (e) { window.__mods.glErr = String(e.message).slice(0, 120); return null; }
  gl.useProgram(pr); const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW); const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = (img, unit) => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img); return t; };
  try { tex(art.img, 0); tex(art.dep, 1); } catch (e) { return null; }
  const U = {}; ["I", "D", "uS", "uPan", "uCam", "uR", "uZ", "uF", "uB", "uE", "uT", "uFog", "uHit", "uFc"].forEach(k => U[k] = gl.getUniformLocation(pr, k)); gl.uniform1i(U.I, 0); gl.uniform1i(U.D, 1); gl.uniform3fv(U.uFc, KF[n].fc);
  const dpr = Math.min(window.devicePixelRatio || 1, lite ? 1 : 1.5); let W = 0, H = 0;
  const size = () => { W = Math.max(2, Math.round(cv.clientWidth * dpr)); H = Math.max(2, Math.round(cv.clientHeight * dpr)); cv.width = W; cv.height = H; gl.viewport(0, 0, W, H); const as = W / H, ai = art.img.naturalWidth / art.img.naturalHeight; gl.uniform2f(U.uS, as < ai ? as / ai : 1, as < ai ? 1 : ai / as); gl.uniform2f(U.uR, W, H); };
  size(); addEventListener("resize", size);
  const full = p => Object.assign({}, POSE0, p), eio = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  let cur = full(KF[n].rest), segs = [], hit = 0, kick = 0, ptx = 0, pty = 0, px = 0, py = 0, dead = false, raf = 0, last = performance.now(), T = 0, drift = 1;
  const lerp = (a, b, k) => { const o = {}; for (const key in POSE0) o[key] = a[key] + (b[key] - a[key]) * k; return o; };
  const frame = now => {
    if (dead) return; raf = requestAnimationFrame(frame); if (document.hidden) { last = now; return; } const dt = Math.min(50, now - last); last = now; T += dt / 1000;
    if (segs.length) { const sg = segs[0]; sg.t += dt; const k = Math.min(1, sg.t / sg.d); cur = lerp(sg.a, sg.b, sg.lin ? k : eio(k)); if (k >= 1) { segs.shift(); if (segs.length) segs[0].a = cur; } }
    hit *= Math.pow(0.004, dt / 1000); kick *= Math.pow(0.0008, dt / 1000); px += (ptx - px) * 0.06; py += (pty - py) * 0.06;
    const z = cur.z + kick * 0.035, lim = Math.max(0, 0.5 - 0.5 / z), cl = v => Math.max(-lim, Math.min(lim, v));
    gl.uniform1f(U.uZ, z); gl.uniform2f(U.uPan, cl(cur.px), cl(cur.py));
    gl.uniform2f(U.uCam, cur.cx + (Math.sin(T * 0.23) * 0.006 + px * 0.022) * drift, cur.cy + (Math.cos(T * 0.19) * 0.004 + py * 0.016) * drift);
    gl.uniform1f(U.uF, cur.f); gl.uniform1f(U.uB, cur.b); gl.uniform1f(U.uE, cur.e); gl.uniform1f(U.uFog, cur.fog); gl.uniform1f(U.uT, T); gl.uniform1f(U.uHit, hit);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  raf = requestAnimationFrame(frame);
  return {
    set(p) { cur = full(p); segs = []; },
    to(p, ms) { segs = [{ a: cur, b: full(Object.assign({}, cur, p)), d: Math.max(1, ms), t: 0 }]; },
    play(path) { let prev = full(path[0][1]); cur = prev; segs = []; for (let i = 1; i < path.length; i++) { const nx = full(Object.assign({}, prev, path[i][1])); segs.push({ a: prev, b: nx, d: path[i][0] - path[i - 1][0], t: 0 }); prev = nx; } },
    hit() { hit = 1; kick = 1; }, pointer(x, y) { ptx = x; pty = y; },
    stop() { dead = true; cancelAnimationFrame(raf); removeEventListener("resize", size); try { const ex = gl.getExtension("WEBGL_lose_context"); ex && ex.loseContext(); } catch (e) {} }
  };
}
/* אווירה (רק כשהסאונד דלוק): רוח רכה מסוננת, נכנסת ויוצאת בעדינות */
function ambience(sec) { if (!settings.cineSound) return; try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const len = AC.sampleRate * 2, b = AC.createBuffer(1, len, AC.sampleRate), d = b.getChannelData(0); let l = 0; for (let i = 0; i < len; i++) { l = l * 0.985 + (Math.random() * 2 - 1) * 0.015; d[i] = l * 6; } const src = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(), t = AC.currentTime; src.buffer = b; src.loop = true; f.type = "lowpass"; f.frequency.setValueAtTime(260, t); f.frequency.linearRampToValueAtTime(900, t + sec * 0.6); f.frequency.linearRampToValueAtTime(320, t + sec); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09, t + 0.8); g.gain.linearRampToValueAtTime(0.0001, t + sec); src.connect(f); f.connect(g); g.connect(AC.destination); src.start(t); src.stop(t + sec + 0.1); } catch (e) {} }

/* ---------- הפתיח ---------- */
let RUN = null;
function playIntro(n, opts = {}) {
  closeIntro(true); const S = SC[n]; if (!S) return null;
  const quick = !!opts.quick, lite = introLight(), el = document.createElement("div");
  el.id = "intro"; el.className = `s${n} ${S.tone}${lite ? " lite" : ""}${quick ? " quick" : ""}`; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "פתיח: " + S.title.join(" "));
  const words = S.title.map((w, i) => `<span class="w"><i style="--i:${i}">${w}</i></span>`).join(" ");
  el.innerHTML = `<div class="art"><svg viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${S.ground ? `<rect width="390" height="844" fill="${S.ground}"/>` : ""}<g transform="translate(0 ${-(S.shift || 0)})">${S.art()}</g></svg></div><canvas class="fx" aria-hidden="true"></canvas><div class="grain" aria-hidden="true"></div><div class="vig" aria-hidden="true"></div>
    <div class="hdr"><button class="skip">דלג ⏭</button><button class="snd" aria-label="סאונד">${settings.cineSound ? "🔊" : "🔈"}</button></div>
    <div class="copy"><p class="kick"><span>${S.k}<small> · ${(() => { const d = pragueDate().split("-"); return +d[2] + "." + +d[1]; })()}</small></span>${S.beat ? `<em class="eq">${"<u></u>".repeat(5)}</em>` : ""}</p><h1 class="ttl">${words}</h1>${S.sub ? `<p class="sub">${S.sub}</p>` : ""}<p class="quip">${S.quip}</p></div>
    ${S.hero === "pass" ? bigPassHtml() : ""}${S.hero === "board" ? boardHtml() : ""}${n === 3 ? `<div class="scale"><span><b class="kg">0.0</b> / 8 ק"ג</span><i><s></s></i></div>` : ""}
    ${timerHtml()}${S.hero === "pass" ? "" : passHtml()}<button class="go">בוא נראה את הטיול <span>←</span></button>`;
  document.body.appendChild(el); document.body.classList.add("intro-on");
  const run = { el, n, tm: [], fx: null, onEnd: opts.onEnd, dead: false }; RUN = run;
  const A = !REDUCED && artReady(n); if (A) { const host = el.querySelector(".art"), svg0 = host.innerHTML; host.innerHTML = `<canvas class="glc" aria-hidden="true"></canvas>`; run.gl = makeStage(host.firstChild, A, lite, n); if (run.gl) { el.classList.add("gl"); el.addEventListener("pointermove", e => run.gl.pointer(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5), { passive: true }); if (!opts.hold) { if (quick || opts.fromTeaser) run.gl.set(KF[n].rest); else { run.gl.set(Object.assign({}, KF[n].rest, { z: KF[n].rest.z + 0.16, e: 0, fog: Math.min(1, (KF[n].rest.fog || 0) + 0.5), b: 0.01 })); run.gl.to(Object.assign({ b: 0, e: 1 }, KF[n].rest), 2800); } } } else host.innerHTML = svg0; }
  const later = (fn, ms) => run.tm.push(setTimeout(() => { if (!run.dead) fn(); }, quick ? Math.min(ms, 120) : ms));
  const tmr = el.querySelector(".in-timer");
  tickTimer(tmr, false); run.tick = setInterval(() => { if (!run.dead && !document.hidden) { tickTimer(tmr, true); if (el.classList.contains("t3")) snd("flap"); } }, 1000);
  const start = () => {
  if (!REDUCED) run.fx = makeFx(el.querySelector(".fx"), run.gl && S.fx === "fog" ? "snow" : S.fx, lite, !!run.gl); /* על האיור המצויר הערפל כבר ב-shader */
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("t0")));
  const TT = opts.fromTeaser ? [220, 560, 620, 950, 1350] : [250, 1200, 1800, 2600, 3400]; if (opts.fromTeaser) el.classList.add("ft");
  later(() => { el.classList.add("t1"); if (!opts.fromTeaser) snd("whoosh"); }, TT[0]);   // כותרת
  later(() => el.classList.add("t2"), TT[1]);                                   // משפט
  later(() => { el.classList.add("t3"); }, TT[2]);                              // טיימר
  later(() => el.classList.add("t4"), TT[3]);                                   // כרטיס
  later(() => { el.classList.add("t5"); buzz(8); }, TT[4]);                     // כפתור
  // לכל סצנה רגע משלה
  if (S.hero === "board") later(() => boardFlip(el, quick), 600);
  if (n === 6) el.querySelectorAll(".lampx,.lampc").forEach(l => { const i = +l.style.getPropertyValue("--i"); later(() => { l.classList.add("on"); if (!opts.fromTeaser) snd("chime"); }, opts.fromTeaser ? 0 : 700 + i * 260); });
  if (n === 5) later(() => snd("chime"), 900);
  if (S.beat && !REDUCED) { const iv = 60000 / S.beat; later(() => { const b = () => { if (run.dead) return; el.classList.remove("beat"); void el.offsetWidth; el.classList.add("beat"); snd("kick"); }; b(); run.beat = setInterval(b, iv); }, 600); }
  if (n === 3) { const holder = el.querySelector(".itms"), kgEl = el.querySelector(".kg"), bar = el.querySelector(".scale s"); let kg = 0;
    S.items.forEach(([id, , w], i) => { later(() => { const side = i % 2 ? 1 : -1, g = document.createElementNS("http://www.w3.org/2000/svg", "g"); g.setAttribute("class", "itm"); g.style.setProperty("--x0", `${side * (230 + (i % 3) * 30)}px`); g.style.setProperty("--y0", `${-260 - (i % 4) * 40}px`); g.style.setProperty("--r0", `${side * (40 + i * 9)}deg`);
      g.innerHTML = `<g transform="translate(195 440)"><g class="mv">${ITEM_SVG[id]}</g></g>`; if (holder) holder.appendChild(g);
      later(() => { kg = Math.round((kg + w) * 10) / 10; kgEl.textContent = kg.toFixed(1); bar.style.width = Math.min(100, kg / 8 * 100) + "%"; const bg = el.querySelector(".bag"); if (bg) { bg.classList.remove("bump"); void el.getBoundingClientRect(); bg.classList.add("bump"); } snd("flap"); if (i === S.items.length - 1) el.querySelector(".scale").classList.add("ok"); }, 620); }, 500 + i * 300); }); }
  };
  if (opts.hold) { el.classList.add("hold"); run.release = fast => { if (run.dead || !el.classList.contains("hold")) return; el.classList.remove("hold"); if (fast) el.classList.add("quick"); start(); }; } else start();
  // מכשיר שלא עומד בקצב: עוברים לגרסה קלה בלי לעצור
  if (!lite && !REDUCED) { let fr = 0, t0 = 0; const mon = now => { if (run.dead) return; if (!t0) t0 = now; fr++; if (now - t0 < 1500) return requestAnimationFrame(mon); if (fr / ((now - t0) / 1000) < 45) { el.classList.add("lite"); run.fx && run.fx.thin(); } }; requestAnimationFrame(mon); }
  const leave = () => closeIntro(false);
  el.querySelector(".skip").onclick = leave; el.querySelector(".go").onclick = () => { buzz(12); snd("boom"); leave(); };
  el.querySelector(".snd").onclick = e => { settings.cineSound = !settings.cineSound; saveSet(); e.currentTarget.textContent = settings.cineSound ? "🔊" : "🔈"; if (settings.cineSound) snd("chime"); };
  if (!opts.replay) { const s = seen(); s[pragueDate()] = 1; LS.set("introSeen", s); }
  return run;
}
function closeIntro(silent) {
  if (silent === "all" && typeof closeTeaser === "function") closeTeaser();
  const r = RUN; if (!r) return; RUN = null; r.dead = true; r.tm.forEach(clearTimeout); clearInterval(r.tick); clearInterval(r.beat); r.fx && r.fx.stop(); if (r.gl) setTimeout(() => r.gl.stop(), silent ? 0 : 950);
  document.body.classList.remove("intro-on");
  if (silent) { r.el.remove(); return; }
  r.el.classList.add("out"); setTimeout(() => r.el.remove(), 900); if (r.onEnd) setTimeout(r.onEnd, 120);
}
Object.defineProperty(window, "__introActive", { get: () => !!RUN, configurable: true });


/* ---------- מיני-סרטון (4–5 שנ') לפני מסך הספירה: המספר של היום הוא הכוכב ----------
   שחור → שלג → המצלמה טסה לתוך הסצנה → המספר נבנה מתוך הסצנה עצמה → שיא (בס + רטט) → מתפרק לחלקיקים שנוחתים בדיוק על קלפי הטיימר.
   חי ב-Canvas: נוחת על הקלפים האמיתיים במסך, בלי הורדה, חד בכל מסך. זוהר = ספרייטים מוכנים מראש + חיבור אור (lighter), זול לטלפון. */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SPR = {};
function sprite(col, r = 16) { const k = col + r; if (SPR[k]) return SPR[k]; const c = document.createElement("canvas"); c.width = c.height = r * 2; const x = c.getContext("2d"), g = x.createRadialGradient(r, r, 0, r, r, r); const a = v => col.replace(/,\s*[\d.]+\)$/, `,${v})`); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.16, a(1)); g.addColorStop(0.42, a(0.28)); g.addColorStop(1, a(0)); x.fillStyle = g; x.fillRect(0, 0, r * 2, r * 2); return SPR[k] = c; }
async function digitPts(ch, W, H, cx, cy, want) {
  try { await Promise.race([document.fonts.load("900 200px Rubik"), sleep(650)]); } catch (e) {}
  const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d"), fs = Math.min(H * 0.58, W * 1.2);
  x.font = `900 ${fs}px Rubik, system-ui, sans-serif`; x.textAlign = "center"; x.textBaseline = "alphabetic"; const m = x.measureText(ch), asc = m.actualBoundingBoxAscent || fs * 0.72, desc = m.actualBoundingBoxDescent || 0;
  x.fillStyle = "#fff"; x.fillText(ch, cx, cy + (asc - desc) / 2);
  const d = x.getImageData(0, 0, W, H).data; let filled = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 128) filled++;
  const step = Math.max(4, Math.sqrt(filled / want)), pts = [];
  for (let y = step / 2; y < H; y += step) for (let xx = step / 2; xx < W; xx += step) if (d[((y | 0) * W + (xx | 0)) * 4 + 3] > 128) pts.push({ tx: xx + (Math.random() - 0.5) * step * 0.35, ty: y + (Math.random() - 0.5) * step * 0.35 });
  return { pts, step, top: cy - asc / 2 - 4, bot: cy + asc / 2 + 4, cx, cy, fs, base: cy + (asc - desc) / 2 };
}
const TZ_COL = { 7: ["rgba(255,206,120,1)"], 6: ["rgba(255,186,96,1)"], 5: ["rgba(255,210,122,1)", "rgba(255,104,96,1)", "rgba(130,208,255,1)", "rgba(255,240,180,1)"], 4: ["rgba(255,72,214,1)", "rgba(70,228,255,1)"], 3: ["rgba(255,210,122,1)"], 2: ["rgba(255,210,122,1)"], 1: ["rgba(255,244,214,1)"], 0: ["rgba(255,210,122,1)"] };
const ITEM_COL = ["#2f7de1", "#e8a317", "#9a6be0", "#f04f6d", "#2fb7a3", "#5d6f9a", "#f7f1e6", "#d42a33"];
let TZ = null;
function closeTeaser() { const t = TZ; if (!t) return; TZ = null; t.dead = true; cancelAnimationFrame(t.raf); t.tm.forEach(clearTimeout); t.el.remove(); }
function playTeaser(n, opts = {}) {
  closeTeaser(); closeIntro(true); const S = SC[n]; if (!S || REDUCED) return playIntro(n, opts);
  let IR = null; if (artReady(n)) { IR = playIntro(n, Object.assign({}, opts, { fromTeaser: 1, hold: 1 })); if (!IR || !IR.gl) { closeIntro(true); IR = null; } } /* האיור המצויר מוכן: הסצנה רצה על הבמה של מסך הספירה עצמו */
  const lite = introLight(), el = document.createElement("div"); el.id = "teaser"; el.className = `s${n}${lite ? " lite" : ""}${IR ? " glm" : ""}`; el.setAttribute("aria-label", "פתיח קצר");
  el.innerHTML = `<div class="tz-art"><svg viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${S.ground ? `<rect width="390" height="844" fill="${S.ground}"/>` : ""}<g transform="translate(0 ${-(S.shift || 0)})">${S.art()}</g></svg></div><div class="tz-dim"></div><canvas class="tz-cv" aria-hidden="true"></canvas>${n === 0 ? `<div class="tz-board" dir="ltr"></div>` : ""}<button class="tz-skip">דלג ⏭</button>`;
  document.body.appendChild(el); document.body.classList.add("intro-on");
  if (!opts.replay) { const z = LS.get("tz2Seen", {}); z[pragueDate()] = 1; LS.set("tz2Seen", z); }
  const T = { el, dead: false, tm: [], raf: 0 }; TZ = T;
  const at = (ms, fn) => T.tm.push(setTimeout(() => { if (!T.dead) fn(); }, ms));
  const toIntro = extra => { if (T.dead) return; if (IR) { IR.gl.to(KF[n].rest, extra && extra.quick ? 500 : 1150); IR.release(!!(extra && extra.quick)); return IR; } const o = Object.assign({}, opts, extra); return playIntro(n, o); };
  el.querySelector(".tz-skip").onclick = () => { const t = T; toIntro({ quick: true }); t.dead = true; closeTeaser(); };
  if (IR) { IR.gl.play(KF[n].path); ambience(5.5); }
  const cv = el.querySelector(".tz-cv"), ctx = cv.getContext("2d"), dpr = Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 2), W = cv.clientWidth, H = cv.clientHeight;
  cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // לוח הזמנים: כניסה איטית, שיא חד, יציאה מהירה
  const FORM = n === 0 ? 900 : 1150, PEAK = 2950, BURST = 3250, END = 4150;
  const cols = TZ_COL[n], want = lite ? 110 : n === 3 ? 74 : n === 4 ? 150 : 190, cx = W / 2, cy = H * (IR && n === 2 ? 0.63 : 0.43);
  let P = [], G = null, timerT = [], plane = null;
  // שלג בתלת-ממד: בזמן הטיסה פנימה הוא נמתח החוצה מהמרכז (תחושת תנועה)
  const SN = Array.from({ length: lite ? 70 : 140 }, () => ({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: Math.random() }));
  const fog = n === 7 && !IR ? Array.from({ length: lite ? 4 : 7 }, () => ({ x: Math.random() * W, y: H * (0.3 + Math.random() * 0.55), r: 160 + Math.random() * 160, v: 0.2 + Math.random() * 0.3 })) : [];
  const fogSpr = sprite("rgba(190,200,236,1)", 64);
  digitPts(n === 0 ? "0" : String(n), W, H, cx, cy, want).then(g => { G = g; if (T.dead) return;
    const N = g.pts.length; P = g.pts.map((p, i) => Object.assign(p, { col: cols[i % cols.length], d: 0, sz: 1, ord: i }));
    if (n === 6 || n === 1) { const key = n === 6 ? p => { let a = Math.atan2(p.ty - g.cy, p.tx - g.cx) + Math.PI / 2; if (a < 0) a += Math.PI * 2; return a; } : p => -p.ty; P.sort((a, b) => key(a) - key(b)); P.forEach((p, i) => p.d = i * (n === 6 ? 1350 : 950) / N); }
    else if (n === 7) P.forEach(p => p.d = Math.random() * 1250);
    else if (n === 5) P.forEach(p => { p.d = Math.random() * 650; p.sx = cx + (Math.random() - 0.5) * 170; p.sy = H * (0.6 + Math.random() * 0.25); });
    else if (n === 4) { P.sort((a, b) => a.ty - b.ty); P.forEach((p, i) => { const beat = Math.floor(i / N * 4); p.d = beat * 484 + (i % Math.ceil(N / 4)) * (260 / Math.ceil(N / 4)); p.col = cols[beat % 2]; }); for (let b = 0; b < 4; b++) at(FORM + b * 484, () => { el.classList.remove("beat"); void el.offsetWidth; el.classList.add("beat"); snd("kick"); }); }
    else if (n === 3) { P.sort((a, b) => b.ty - a.ty); P.forEach((p, i) => { p.d = i * 1350 / N; p.sy = -30 - Math.random() * 120; p.ic = ITEM_COL[i % ITEM_COL.length]; }); }
    else if (n === 2) P.forEach(p => p.d = 0);
    else if (n === 0) P = [];
  });
  // לוח יציאות ענק: NOW BOARDING
  if (n === 0) { const bd = el.querySelector(".tz-board"), rows = ["NOW", "BOARDING"]; bd.innerHTML = rows.map(r => `<div>${r.split("").map(ch => `<i data-c="${ch}"></i>`).join("")}</div>`).join("");
    const A = "ABCDEFGHIJKLMNOPRSTUVWXYZ0123456789"; bd.querySelectorAll("i").forEach((c, k) => { const flips = 6 + (k * 3) % 7; for (let j = 0; j <= flips; j++) at(FORM - 300 + k * 55 + j * 85, () => { c.textContent = j === flips ? c.dataset.c : A[(Math.random() * A.length) | 0]; c.classList.remove("f"); void c.offsetWidth; c.classList.add("f"); if (j === flips && k % 3 === 0) snd("flap"); }); }); }
  // הסצנה: שחור → המצלמה טסה פנימה
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("go")));
  at(300, () => snd("whoosh"));
  at(PEAK - 420, () => snd("whoosh"));
  at(PEAK, () => { el.classList.add("peak", "shake"); snd("boom"); buzz([28]); if (IR) IR.gl.hit(); });
  at(PEAK + 320, () => el.classList.remove("shake"));
  at(BURST, () => { // מתפרק → נוחת על הטיימר האמיתי
    el.classList.add("burst"); const r = toIntro({ fromTeaser: 1 }); if (!r) return;
    const fls = [...r.el.querySelectorAll(".in-timer .fl")].map(f => f.getBoundingClientRect()).filter(b => b.width);
    timerT = fls.length ? (n >= 1 ? fls.slice(0, 2) : fls) : [{ left: cx - 20, top: H * 0.7, width: 40, height: 56 }]; /* match cut: המספר נוחת בקלף "ימים" */
    if (n === 0) { const bd = el.querySelector(".tz-board"), br = bd.getBoundingClientRect(); for (let i = 0; i < (lite ? 90 : 160); i++) P.push({ tx: br.left + Math.random() * br.width, ty: br.top + Math.random() * br.height, col: cols[0], d: 0, sz: 1 }); }
    P.forEach((p, i) => { const b = timerT[i % timerT.length], a = Math.atan2(p.ty - cy, p.tx - cx) + (Math.random() - 0.5) * 0.9, sp = 90 + Math.random() * 150; p.bx = p.cx0 != null ? p.cx0 : p.tx; p.by = p.cy0 != null ? p.cy0 : p.ty; p.kx = p.bx + Math.cos(a) * sp; p.ky = p.by + Math.sin(a) * sp; p.ex = b.left + 4 + Math.random() * (b.width - 8); p.ey = b.top + 4 + Math.random() * (b.height - 8); p.bd = Math.random() * 120; });
  });
  at(END, () => closeTeaser());
  const ease = k => k < 0 ? 0 : k > 1 ? 1 : 1 - Math.pow(1 - k, 3), eio = k => k < 0 ? 0 : k > 1 ? 1 : k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  const t0 = performance.now(); let lastTick = 0;
  const frame = now => {
    if (T.dead) return; T.raf = requestAnimationFrame(frame); const t = now - t0; ctx.clearRect(0, 0, W, H);
    // שלג: מואץ בזמן הטיסה פנימה, רגוע אחר כך
    const warp = t < 2200 ? Math.sin(Math.min(1, t / 2200) * Math.PI) * 0.022 : 0.002;
    ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = "#fff";
    for (const f of SN) { f.z -= warp + 0.002; if (f.z <= 0.02) { f.z = 1; f.x = (Math.random() - 0.5) * 2; f.y = (Math.random() - 0.5) * 2; } f.y += 0.0012; const px = cx + f.x / f.z * W * 0.5, py = H * 0.45 + f.y / f.z * H * 0.5, r = (1 - f.z) * 2.6 + 0.3; if (px < -10 || px > W + 10 || py < -10 || py > H + 10) continue; ctx.globalAlpha = Math.min(1, (1 - f.z) * 1.4) * (t < 350 ? t / 350 : 1) * (t > BURST ? Math.max(0, 1 - (t - BURST) / 500) : 1); ctx.beginPath(); ctx.arc(px, py, r, 0, 6.283); ctx.fill(); if (warp > 0.01) { ctx.globalAlpha *= 0.35; ctx.fillRect(px, py, (px - cx) * warp * 3, (py - H * 0.45) * warp * 3); } }
    // ערפל (7): מתפזר וחושף את המספר
    if (fog.length && t < BURST + 300) { const a = Math.max(0, 0.9 - Math.max(0, t - 600) / 1900); fog.forEach(f => { f.x += f.v * (1 + t / 1500); if (f.x - f.r > W) f.x = -f.r; ctx.globalAlpha = a; ctx.drawImage(fogSpr, f.x - f.r, f.y - f.r, f.r * 2, f.r * 2); }); }
    ctx.globalAlpha = 1;
    if (!G) return;
    const tf = t - FORM, glowBoost = t > PEAK && t < PEAK + 300 ? 1 + (1 - (t - PEAK) / 300) * 0.1 : 1;
    // 2: המדפסת — נייר ענק יורד מהחריץ, והמספר מודפס עליו שורה-שורה
    let paperTop = null; const slotY = H * (IR ? 0.352 : 0.12), paperH = G.bot - G.top + 70;
    if (n === 2 && t < BURST + 120) { const k = eio(tf / 1500); paperTop = slotY - paperH + (G.top - 35 - (slotY - paperH)) * k; const pa = t > BURST ? Math.max(0, 1 - (t - BURST) / 120) : 1;
      ctx.globalAlpha = pa; ctx.fillStyle = "#05080f"; ctx.fillRect(cx - W * 0.42, slotY - 9, W * 0.84, 14); ctx.fillStyle = "#7fd3ff"; ctx.fillRect(cx - W * 0.38, slotY - 3, W * 0.76, 2);
      ctx.save(); ctx.beginPath(); ctx.rect(0, slotY, W, H); ctx.clip(); ctx.fillStyle = "#f7f1e6"; const pw = W * 0.72; ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 24; ctx.fillRect(cx - pw / 2, paperTop, pw, paperH); ctx.shadowBlur = 0; ctx.fillStyle = "#d42a33"; ctx.fillRect(cx - pw / 2, paperTop, pw, 26); ctx.fillStyle = "#fff"; ctx.font = "800 11px Rubik,system-ui"; ctx.textAlign = "left"; ctx.fillText("BOARDING PASS · QS1285", cx - pw / 2 + 12, paperTop + 17); ctx.restore(); ctx.globalAlpha = 1; }
    const ks = t < PEAK - 380 ? 0.95 : t < PEAK - 90 ? 0.95 - 0.05 * ((t - (PEAK - 380)) / 290) : t < PEAK + 70 ? 0.9 + 0.19 * ((t - (PEAK - 90)) / 160) : t < PEAK + 320 ? 1.09 - 0.09 * ((t - (PEAK + 70)) / 250) : 1; /* anticipation → hit → settle */
    if (n >= 1 && t > PEAK && t < PEAK + 300 && G.fs) { const k = (t - PEAK) / 300; ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = (1 - k) * (1 - k) * 0.3; ctx.font = `900 ${G.fs * ks}px Rubik, system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = cols[0]; ctx.fillText(String(n), cx, cy + (G.base - cy) * ks); ctx.restore(); }
    for (const p of P) {
      let x = p.tx, y = p.ty, al = 1, sz = 1, spr = p.col;
      if (t < BURST) {
        const k = (tf - p.d) / (n === 5 ? 900 : n === 3 ? 520 : 420); if (k <= 0 && n !== 2) continue;
        if (n === 7) { al = ease(k); sz = 0.7 + 0.5 * Math.sin(t / 260 + p.tx) * 0.3; }
        else if (n === 6 || n === 1) { al = ease(k * 2); sz = k < 0.5 ? 1 + (0.5 - k) * (n === 1 ? 1.1 : 2.2) : 1; if (n === 1 && k > 1 && t < PEAK) al = 0.45 + 0.55 * Math.max(0, Math.sin((t - p.ty * 3) / 90)); if (n === 6 && k > 0 && k < 0.06 && now - lastTick > 90) { lastTick = now; snd("flap"); } }
        else if (n === 5) { const e = eio(k), mx = (p.sx + p.tx) / 2 + (p.tx - cx) * 0.6, my = Math.min(p.sy, p.ty) - 120; x = (1 - e) * (1 - e) * p.sx + 2 * (1 - e) * e * mx + e * e * p.tx; y = (1 - e) * (1 - e) * p.sy + 2 * (1 - e) * e * my + e * e * p.ty; al = Math.min(1, k * 3); }
        else if (n === 4) { al = ease(k * 3); if (k > 0 && k < 0.35) { ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = p.col.replace(/,\s*[\d.]+\)$/, `,${(0.55 * (1 - k / 0.35)).toFixed(3)})`); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, H * 0.69); ctx.lineTo(p.tx, p.ty); ctx.stroke(); } }
        else if (n === 3) { const e = Math.min(1, Math.max(0, k)), fall = e * e; y = p.sy + (p.ty - p.sy) * fall; if (e >= 1) { const b = Math.max(0, (tf - p.d - 520) / 220); y = p.ty - Math.sin(Math.min(1, b) * Math.PI) * 6 * (1 - Math.min(1, b)); } }
        else if (n === 2) { if (paperTop == null) continue; y = p.ty - (G.top - 35) + paperTop; al = y > slotY ? 1 : 0; }
        if (n !== 2 && n !== 3) { x = cx + (x - cx) * ks; y = cy + (y - cy) * ks; }
        p.cx0 = x; p.cy0 = y;
      } else {
        const u = eio((t - BURST - (p.bd || 0)) / 720), q = 1 - u; x = q * q * p.bx + 2 * q * u * p.kx + u * u * p.ex; y = q * q * p.by + 2 * q * u * p.ky + u * u * p.ey; sz = 1 - u * 0.45; al = u > 0.92 ? (1 - u) / 0.08 : 1; if (n === 3 || n === 2) spr = cols[0];
      }
      if (al <= 0.01) continue;
      if ((n === 3 || n === 2) && t < BURST) { // חפצים / דיו: מוצקים, עם זוהר עדין
        ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = al;
        if (n === 3) { const s = G.step * 0.82; ctx.fillStyle = p.ic; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - s / 2, y - s / 2, s, s, 3) : ctx.rect(x - s / 2, y - s / 2, s, s); ctx.fill(); ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fillRect(x - s / 2, y - s / 2, s, 2); }
        else { ctx.fillStyle = "#14161b"; const s = G.step * 0.6; ctx.fillRect(x - s / 2, y - s / 2, s, s); }
        if (t > PEAK) { ctx.globalCompositeOperation = "lighter"; const r = 14 * glowBoost; ctx.globalAlpha = al * 0.6; ctx.drawImage(sprite(cols[0]), x - r, y - r, r * 2, r * 2); }
        continue; }
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = al * (n === 5 ? 0.62 : 0.78); const r = (G.step * 0.95 + 3) * sz * glowBoost; ctx.drawImage(sprite(spr), x - r, y - r, r * 2, r * 2);
    }
    // 1: המטוס עובר דרך ה-1
    if (n === 1 && tf > 950 && tf < 1900) { const k = eio((tf - 950) / 950), px = W * -0.1 + W * 1.2 * k, py = H * 0.82 - H * 0.62 * k, ang = Math.atan2(-H * 0.62, W * 1.2); ctx.globalCompositeOperation = "lighter"; for (let i = 0; i < 14; i++) { const kk = k - i * 0.012; if (kk < 0) break; ctx.globalAlpha = 0.35 * (1 - i / 14); const r = 10 - i * 0.5; ctx.drawImage(sprite("rgba(255,230,190,1)"), W * -0.1 + W * 1.2 * kk - r, H * 0.82 - H * 0.62 * kk - r, r * 2, r * 2); }
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.save(); ctx.translate(px, py); ctx.rotate(ang); ctx.scale(1.5, 1.5); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(10, -3); ctx.lineTo(-2, -16); ctx.lineTo(-7, -16); ctx.lineTo(0, -3); ctx.lineTo(-14, -3); ctx.lineTo(-19, -9); ctx.lineTo(-22, -9); ctx.lineTo(-19, 0); ctx.lineTo(-22, 9); ctx.lineTo(-19, 9); ctx.lineTo(-14, 3); ctx.lineTo(0, 3); ctx.lineTo(-7, 16); ctx.lineTo(-2, 16); ctx.lineTo(10, 3); ctx.closePath(); ctx.fill(); ctx.restore(); }
    // הבזק השיא
    if (t > PEAK && t < PEAK + 240) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.16 * (1 - (t - PEAK) / 240); const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * 0.6); g.addColorStop(0, cols[0]); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  };
  T.raf = requestAnimationFrame(frame);
  return T;
}
window.playTeaser = playTeaser;

/* ---------- מתי מנגנים: במקום מסך הספירה, בכל כניסה עד ההמראה ---------- */
try { const s0 = sceneFor(); if (s0 != null) loadArt(s0); setTimeout(() => { if (navigator.onLine) [7, 6, 5, 4, 3, 2, 1, 0].forEach(k => { fetch(`art/d${k}.jpg`).catch(() => {}); fetch(`art/z${k}.jpg`).catch(() => {}); }); }, 12000); } catch (e) {}
window.showSplash = (old => function (done) {
  let n = null; const f = QS.get("intro"); try { n = f && /^[0-7]$/.test(f) ? +f : f === "0" ? null : sceneFor(); if (QS.get("splash") === "welcome" || QS.get("cine")) n = null; } catch (e) { n = null; }
  if (n == null) return old.apply(this, arguments);
  try { const today = !f && !!LS.get("tz2Seen", {})[pragueDate()]; /* סימון נפרד: גם מי שראה היום את המסך בגרסה הקודמת יקבל את המיני-סרטון */
    const go = () => { const w = document.getElementById("introWait"); try { if (today || QS.get("tz") === "0") playIntro(n, { quick: today, onEnd: done }); else playTeaser(n, { onEnd: done }); } catch (e) { console.warn("intro failed", e); window.__mods.introErr = String(e && e.message || e); closeIntro("all"); old(done); } if (w) setTimeout(() => w.remove(), 60); };
    if (REDUCED || artReady(n)) go(); else { const w = document.createElement("div"); w.id = "introWait"; w.style.cssText = "position:fixed;inset:0;z-index:9790;background:#05061a"; document.body.appendChild(w); Promise.race([loadArt(n), sleep(1400)]).then(go, go); } /* מחכים רגע לאיור, בלי הבזק של המפה */ } catch (e) { console.warn("intro failed", e); window.__mods.introErr = String(e && e.message || e); closeIntro(true); return old.apply(this, arguments); }
})(window.showSplash);

/* ---------- בתפריט: לצפות שוב ---------- */
const NAMES = { 7: "הספירה לאחור", 6: "גשר קרל בלילה", 5: "שווקי חג המולד", 4: "הלילות", 3: "אורזים", 2: "כרטיס העלייה", 1: "מחר טסים", 0: "יום הטיסה" };
function introSection() {
  const cur = sceneFor();
  return `<h3 class="in-mh">✈️ הספירה לאחור</h3><p class="sub">פתיח לכל יום עד הטיסה. ${cur != null ? `היום: <b>${NAMES[cur]}</b>.` : ""}</p><div class="in-mg">${[7, 6, 5, 4, 3, 2, 1, 0].map(k => `<button data-in="${k}"${k === cur ? ` class="cur"` : ""}><b>${k ? k : "✈"}</b><span>${NAMES[k]}</span></button>`).join("")}</div>`;
}
function bindIntroSection() { $$("#mbody [data-in]").forEach(b => b.onclick = () => { closeModal(); const k = +b.dataset.in; Promise.race([loadArt(k), sleep(1500)]).then(() => playTeaser(k, { replay: 1 })); }); }
if (typeof window.openCineMenu === "function") {
  window.openCineMenu = (old => function () { old.apply(this, arguments); try { const sub = $("#mbody .sub"); (sub || $("#mbody")).insertAdjacentHTML(sub ? "afterend" : "afterbegin", introSection()); bindIntroSection(); } catch (e) {} })(window.openCineMenu);
} else {
  window.openCineMenu = function () { openModal(`<h2>🎬 פתיחים</h2>${introSection()}<label class="sw"><span><b>סאונד בפתיחים</b><small>כבוי כברירת מחדל</small></span><input type="checkbox" id="inSndSw" ${settings.cineSound ? "checked" : ""}><i></i></label>`, "tall"); bindIntroSection(); $("#inSndSw").onchange = e => { settings.cineSound = e.target.checked; saveSet(); }; };
}
window.playIntro = playIntro; window.closeIntro = closeIntro;

/* פתיחי ימי הטיול (cine.js) מקבלים את אותה שכבת גימור: גרגר קולנועי, וינייטה, שלג בעומק */
try { new MutationObserver(ms => { for (const m of ms) { m.addedNodes.forEach(nd => { if (nd.id !== "cine" || nd._lux) return; nd._lux = 1; nd.insertAdjacentHTML("afterbegin", `<canvas class="lux-fx" aria-hidden="true"></canvas><div class="lux-grain" aria-hidden="true"></div>`); if (!REDUCED) { const fx = makeFx(nd.querySelector(".lux-fx"), "snow", nd.classList.contains("lite") || introLight()); const st = new MutationObserver(() => { if (!document.body.contains(nd) || nd.classList.contains("out")) { fx.stop(); st.disconnect(); } }); st.observe(nd, { attributes: true }); st.observe(document.body, { childList: true }); } }); } }).observe(document.body, { childList: true }); } catch (e) {}

/* ---------- עיצוב ---------- */
(() => { const st = document.createElement("style"); st.textContent = `
#intro{position:fixed;inset:0;z-index:9800;overflow:hidden;color:#fff;font-family:Rubik,system-ui,-apple-system,sans-serif;direction:rtl;background:#05061a;-webkit-user-select:none;user-select:none}
body.intro-on #splash,body.intro-on #modal,body.intro-on #toast{opacity:0!important;pointer-events:none!important}
#intro .art,#intro .fx,#intro .grain,#intro .vig{position:absolute;inset:0;pointer-events:none}
#intro .art{opacity:0;transform:scale(1.14);transition:opacity 1.1s ease,transform 7s cubic-bezier(.16,.84,.24,1)}
#intro.t0 .art{opacity:1;transform:scale(1)}
#intro .art svg{width:100%;height:100%;display:block}
#intro .L{transition:transform 7s cubic-bezier(.16,.84,.24,1)}#intro .L1{transform:translateY(18px)}#intro .L2{transform:translateY(36px)}#intro .L3{transform:translateY(64px)}
#intro.t0 .L{transform:none}
#intro .fx{width:100%;height:100%}
#intro .grain{opacity:.09;mix-blend-mode:overlay;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");animation:inGrain .5s steps(4) infinite}
@keyframes inGrain{0%{transform:translate(0,0)}25%{transform:translate(-12px,8px)}50%{transform:translate(9px,-6px)}75%{transform:translate(-6px,-10px)}}
#intro .vig{background:radial-gradient(130% 90% at 50% 42%,transparent 52%,rgba(0,0,8,.62))}
#intro .tw{animation:inTw 3s ease-in-out infinite}#intro .tw.slow{animation-duration:6s}
@keyframes inTw{50%{opacity:.25}}
#intro .hdr{position:absolute;top:calc(env(safe-area-inset-top,0px) + 12px);left:14px;right:14px;display:flex;justify-content:space-between;z-index:6;opacity:0;transition:opacity .6s .3s}
#intro.t0 .hdr{opacity:1}
#intro .hdr button{height:40px;min-width:40px;border:0;border-radius:20px;background:rgba(255,255,255,.12);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);color:#fff;font:600 .9rem Rubik,sans-serif;padding:0 14px}
#intro .copy{position:absolute;top:calc(env(safe-area-inset-top,0px) + 9.5vh);left:22px;right:22px;z-index:4;text-align:right}
#intro .kick{margin:0 0 6px;display:flex;align-items:center;gap:10px;font-weight:700;font-size:.82rem;letter-spacing:.12em;opacity:0;transform:translateY(10px);transition:opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1)}
#intro .kick span{color:#fff;background:rgba(255,255,255,.14);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.22);padding:5px 12px;border-radius:999px}
#intro.t1 .kick{opacity:1;transform:none}#intro .kick small{font-weight:500;opacity:.7;letter-spacing:.04em}
#intro .ttl{margin:0;font-size:clamp(2.9rem,15vw,4.6rem);line-height:.98;font-weight:800;letter-spacing:-.035em;color:#fff;filter:drop-shadow(0 8px 22px rgba(0,0,0,.45))}#intro.lite .ttl{filter:none;text-shadow:0 4px 18px rgba(0,0,0,.5)}
#intro .ttl .w{display:inline-block;overflow:hidden;vertical-align:top;padding:0 .02em .1em;margin-bottom:-.06em}
#intro .ttl .w i{display:inline-block;font-style:normal;transform:translateY(105%) rotate(5deg);opacity:0;filter:blur(6px)}
#intro.t1 .ttl .w i{animation:inRise 1.05s cubic-bezier(.16,1,.3,1) forwards;animation-delay:calc(var(--i) * 110ms + 120ms)}
@keyframes inRise{0%{transform:translateY(105%) rotate(5deg);opacity:0;filter:blur(6px)}60%{filter:blur(0)}100%{transform:none;opacity:1;filter:blur(0)}}
#intro .ttl .w:last-child i{color:var(--acc,#ffd27a)}
#intro.cold{--acc:#b9d3ff}#intro.warm{--acc:#ffd27a}#intro.neon{--acc:#ff86e6}#intro.studio{--acc:#ffd27a}#intro.cool{--acc:#8fdcff}#intro.sunset{--acc:#ffcf8a}#intro.terminal{--acc:#ffd27a}
#intro .ttl .w:only-child i,#intro.s1 .ttl .w:first-child i,#intro.s0 .ttl .w:first-child i{color:#fff}
#intro .sub{margin:8px 0 0;font-weight:700;font-size:1rem;color:#ffd27a;opacity:0;transition:opacity .6s .2s}
#intro.t1 .sub{opacity:1}
#intro .quip{display:table;padding:7px 12px;margin:12px 0 0 auto;border-radius:12px;background:rgba(6,8,24,.5);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);max-width:33ch;font-size:.96rem;line-height:1.45;font-weight:500;color:rgba(255,255,255,.86);text-shadow:0 2px 14px rgba(0,0,0,.6);opacity:0;transform:translateY(12px);transition:opacity .8s cubic-bezier(.16,1,.3,1),transform .8s cubic-bezier(.16,1,.3,1)}
#intro.t2 .quip{opacity:1;transform:none}
/* טיימר: ספרות מתהפכות */
#intro .in-timer{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 228px);z-index:4;display:flex;justify-content:center;align-items:flex-start;gap:5px;perspective:600px}
#intro .grp{display:flex;flex-direction:column;align-items:center;gap:6px}
#intro .grp small{font-size:.68rem;font-weight:600;letter-spacing:.08em;color:rgba(255,255,255,.7);opacity:0;transition:opacity .6s .5s}
#intro.t3 .grp small{opacity:1}
#intro .pair{display:flex;gap:3px}
#intro .col{display:flex;flex-direction:column;gap:9px;padding-top:19px;opacity:0;transition:opacity .4s .6s}#intro.t3 .col{opacity:.7}
#intro .col u{width:4px;height:4px;border-radius:50%;background:#fff;display:block}
#intro .fl{position:relative;width:min(9.6vw,40px);height:min(14.4vw,60px);font:800 min(9.6vw,40px)/1 Rubik,system-ui,sans-serif;font-variant-numeric:tabular-nums;color:#f8f1e3;transform-style:preserve-3d;opacity:0;transform:translateY(-30px) rotateX(70deg);transition:opacity .5s,transform .9s cubic-bezier(.2,1.5,.35,1)}
#intro.t3 .fl{opacity:1;transform:none}
#intro.t3 .grp:nth-of-type(2) .fl{transition-delay:.08s}#intro.t3 .grp:nth-of-type(3) .fl{transition-delay:.16s}#intro.t3 .grp:nth-of-type(4) .fl{transition-delay:.24s}
#intro .fl i,#intro .fl s{font-style:normal;text-decoration:none}#intro .fl>i{position:absolute;left:0;right:0;height:50%;overflow:hidden;background:linear-gradient(#262a40,#1b1e31);backface-visibility:hidden;-webkit-backface-visibility:hidden}
#intro .fl>i s{position:absolute;left:0;right:0;height:200%;display:flex;align-items:center;justify-content:center;text-decoration:none}
#intro .fl .t,#intro .fl .ft{top:0;border-radius:7px 7px 0 0;transform-origin:50% 100%}
#intro .fl .b,#intro .fl .fb{bottom:0;border-radius:0 0 7px 7px;transform-origin:50% 0;background:linear-gradient(#1b1e31,#14172a)}
#intro .fl .t s,#intro .fl .ft s{top:0}#intro .fl .b s,#intro .fl .fb s{top:-100%}
#intro .fl .t::after,#intro .fl .ft::after{content:"";position:absolute;left:0;right:0;bottom:0;height:1px;background:rgba(0,0,0,.6)}
#intro .fl .ft,#intro .fl .fb{z-index:2;visibility:hidden}
#intro .fl::before{content:"";position:absolute;inset:-1px;border-radius:8px;box-shadow:0 10px 24px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.08);pointer-events:none}
#intro .fl.flp .ft{visibility:visible;animation:inFt .26s cubic-bezier(.55,0,1,.45) forwards}
#intro .fl.flp .fb{visibility:visible;animation:inFb .26s .26s cubic-bezier(0,.55,.45,1) forwards;transform:rotateX(90deg)}
#intro .fl.flp .ft::before,#intro .fl.flp .fb::before{content:"";position:absolute;inset:0;z-index:3;pointer-events:none}
#intro .fl.flp .ft::before{animation:inShadeT .26s forwards}#intro .fl.flp .fb::before{animation:inShadeB .26s .26s forwards;background:rgba(0,0,0,.45)}
@keyframes inFt{to{transform:rotateX(-90deg)}}
@keyframes inFb{0%{transform:rotateX(90deg)}80%{transform:rotateX(-8deg)}100%{transform:rotateX(0)}}
@keyframes inShadeT{from{background:rgba(0,0,0,0)}to{background:rgba(0,0,0,.5)}}
@keyframes inShadeB{from{background:rgba(0,0,0,.45)}to{background:rgba(0,0,0,0)}}
/* כרטיס עלייה */
#intro .in-pass{position:absolute;left:18px;right:18px;bottom:calc(env(safe-area-inset-bottom,0px) + 92px);z-index:4;display:flex;height:112px;color:#14161b;filter:drop-shadow(0 18px 30px rgba(0,0,0,.5));opacity:0;transform:translateY(60px) rotate(-3deg);transition:opacity .7s,transform 1s cubic-bezier(.16,1.25,.3,1)}
#intro.t4 .in-pass{opacity:1;transform:rotate(-.6deg)}
#intro .in-pass>div{background:#f7f1e6;-webkit-mask:radial-gradient(circle 9px at 0 50%,#0000 98%,#000) left/51% 100% no-repeat,radial-gradient(circle 9px at 100% 50%,#0000 98%,#000) right/51% 100% no-repeat;mask:radial-gradient(circle 9px at 0 50%,#0000 98%,#000) left/51% 100% no-repeat,radial-gradient(circle 9px at 100% 50%,#0000 98%,#000) right/51% 100% no-repeat}
#intro .in-pass .pa{flex:1;border-radius:16px 0 0 16px;padding:12px 18px 10px 14px;display:flex;flex-direction:column;justify-content:space-between;background-image:linear-gradient(90deg,#f7f1e6,#efe6d4)}
#intro .in-pass .pb{width:78px;border-radius:0 16px 16px 0;border-inline-start:2px dashed #cbbfa6;background:#e8a317;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:8px}
#intro .in-pass .pb .bc{width:56px;height:52px;fill:#14161b}#intro .in-pass .pb small{font:700 .6rem Rubik,sans-serif;letter-spacing:.06em}
#intro .in-pass .rt{display:flex;align-items:center;justify-content:space-between;direction:ltr}
#intro .in-pass .rt b{font:800 1.9rem/1 Rubik,sans-serif;letter-spacing:.01em}#intro .in-pass .rt small{display:block;font:700 .55rem Rubik,sans-serif;letter-spacing:.14em;color:#8a8170}
#intro .in-pass .mid{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;color:#d42a33;padding:0 10px}
#intro .in-pass .mid svg{width:20px;height:20px;transform:rotate(90deg)}#intro .in-pass .mid i{display:block;width:100%;border-top:2px dashed #cbbfa6}#intro .in-pass .mid small{color:#8a8170;letter-spacing:.1em}
#intro .in-pass .ff{display:flex;justify-content:space-between;font:800 .95rem Rubik,sans-serif}#intro .in-pass .ff small{display:block;font:600 .6rem Rubik,sans-serif;color:#8a8170}
/* כפתור */
#intro .go{position:absolute;left:18px;right:18px;bottom:calc(env(safe-area-inset-bottom,0px) + 18px);z-index:5;height:60px;border:0;border-radius:30px;color:#fff;font:800 1.12rem Rubik,sans-serif;background:linear-gradient(180deg,#e7414b,#c11f29);box-shadow:0 14px 34px rgba(212,42,51,.45),inset 0 1px 0 rgba(255,255,255,.3);overflow:hidden;opacity:0;transform:translateY(24px) scale(.96);transition:opacity .6s,transform .8s cubic-bezier(.16,1.3,.3,1)}
#intro .go::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.35) 50%,transparent 70%);transform:translateX(120%);animation:inSweep 3.2s 1s ease-in-out infinite}
@keyframes inSweep{0%{transform:translateX(120%)}45%,100%{transform:translateX(-120%)}}
#intro .go span{display:inline-block;margin-inline-start:6px;animation:inNudge 1.6s ease-in-out infinite}@keyframes inNudge{50%{transform:translateX(-5px)}}
#intro.t5 .go{opacity:1;transform:none}
#intro .go:active{transform:scale(.97)}
#intro.out{pointer-events:none}#intro.out .art{transform:scale(1.35);opacity:0;transition:transform .9s cubic-bezier(.6,0,.4,1),opacity .8s}#intro.out .copy,#intro.out .in-timer,#intro.out .in-pass,#intro.out .go,#intro.out .hdr,#intro.out .in-board,#intro.out .in-bp,#intro.out .scale{opacity:0;transform:translateY(20px);transition:opacity .4s,transform .5s}#intro.out{background:transparent;transition:background .8s}#intro.out .fx,#intro.out .grain,#intro.out .vig{opacity:0;transition:opacity .6s}
#intro.quick *{transition-delay:0s!important;animation-delay:0s!important}#intro.ft .art{opacity:1;transform:scale(1.22);transition:transform 7s cubic-bezier(.16,.84,.24,1)}#intro.ft .L{transform:none}#intro.ft.t0 .art{transform:scale(1)}#intro.quick .art,#intro.quick .L{transition-duration:1.4s}
/* סצנות */
#intro.s6 .lampx .glow,#intro.s6 .lampx .refl{opacity:0;transition:opacity 1.1s ease}#intro.s6 .lampx.on .glow{opacity:1;animation:inFlick 4s ease-in-out infinite}#intro.s6 .lampx.on .refl{opacity:.7}
#intro.s6 .lampc{opacity:.25;transition:opacity .3s}#intro.s6 .lampc.on{opacity:1}
@keyframes inFlick{0%,100%{opacity:1}47%{opacity:.86}50%{opacity:.95}}
#intro .shimmer rect{animation:inShim 4s ease-in-out infinite alternate}@keyframes inShim{from{transform:translateX(-14px);opacity:.3}to{transform:translateX(14px);opacity:1}}
#intro.s5 .star{transform-box:view-box;transform-origin:195px 292px;animation:inStar 1.4s 0.5s cubic-bezier(.2,1.6,.4,1) both}#intro.s5 .rays{transform-box:view-box;transform-origin:195px 292px;animation:inSpin 24s linear infinite}
@keyframes inStar{from{transform:scale(0) rotate(-90deg)}to{transform:none}}@keyframes inSpin{to{transform:rotate(360deg)}}
#intro.s4 .bm{transform-box:view-box;transform-origin:195px 552px;animation:inBeam 3s ease-in-out infinite alternate;mix-blend-mode:screen}
@keyframes inBeam{from{transform:rotate(calc(var(--a) - 14deg))}to{transform:rotate(calc(var(--a) + 14deg))}}
#intro.s4 .art{transform-origin:50% 66%}#intro.s4.beat .art{animation:inBeat .42s cubic-bezier(.2,.8,.2,1)}@keyframes inBeat{0%{transform:scale(1.018)}100%{transform:scale(1)}}
#intro.s4.beat .vig{animation:inFlash .42s ease-out}@keyframes inFlash{0%{background-color:rgba(255,60,200,.12)}100%{background-color:transparent}}
#intro.s4 .winp{animation:inHue 2.4s linear infinite}@keyframes inHue{50%{opacity:.6}}
#intro .eq{display:inline-flex;gap:3px;align-items:flex-end;height:16px}#intro .eq u{display:block;width:3px;background:#ff6be0;border-radius:2px;height:100%;transform-origin:bottom;animation:inEq .48s ease-in-out infinite alternate}#intro .eq u:nth-child(2){animation-delay:-.2s;background:#62e8ff}#intro .eq u:nth-child(3){animation-delay:-.33s}#intro .eq u:nth-child(4){animation-delay:-.1s;background:#ffe26b}#intro .eq u:nth-child(5){animation-delay:-.4s;background:#62e8ff}
@keyframes inEq{from{transform:scaleY(.2)}to{transform:scaleY(1)}}
#intro.s3 .itm .mv{animation:inDrop .9s cubic-bezier(.3,.1,.3,1) forwards}
@keyframes inDrop{0%{transform:translate(var(--x0),var(--y0)) rotate(var(--r0)) scale(1.6);opacity:0}15%{opacity:1}65%{transform:translate(calc(var(--x0) * .25),-150px) rotate(calc(var(--r0) * .3)) scale(1.25);opacity:1}100%{transform:translate(0,10px) rotate(0) scale(.7);opacity:1}}
#intro.s3 .bag{transform-box:view-box;transform-origin:195px 650px}#intro.s3 .bag.bump{animation:inBump .35s cubic-bezier(.2,1.8,.4,1)}@keyframes inBump{40%{transform:scale(1.03,.97)}}
#intro.s3 .cone{animation:inCone 5s ease-in-out infinite alternate}@keyframes inCone{to{opacity:.7}}
#intro .scale{position:absolute;left:50%;top:79vh;transform:translateX(-50%);z-index:4;display:none}
#intro.s3 .in-pass{display:none}
#intro.s3 .scale{display:flex;flex-direction:column;align-items:center;gap:6px;top:auto;bottom:calc(env(safe-area-inset-bottom,0px) + 200px);font-weight:700}#intro.s3 .scale span{font-size:1.05rem}#intro.s3 .scale b{font-size:1.9rem;font-variant-numeric:tabular-nums}
#intro.s3 .scale i{display:block;width:220px;height:8px;border-radius:4px;background:rgba(255,255,255,.14);overflow:hidden}#intro.s3 .scale s{display:block;height:100%;width:0;background:linear-gradient(90deg,#39e07a,#e8a317);border-radius:4px;transition:width .5s cubic-bezier(.2,.8,.2,1)}
#intro.s3 .scale.ok span::after{content:" ✓";color:#39e07a}
#intro.s3 .in-timer,#intro.s2 .in-timer{bottom:calc(env(safe-area-inset-bottom,0px) + 98px)}
#intro .streaks rect{animation:inStreak linear infinite}@keyframes inStreak{to{transform:translateX(800px)}}
#intro .in-bp{position:absolute;left:0;right:0;top:31vh;transform:scale(.86);transform-origin:50% 0;z-index:3;display:flex;flex-direction:column;align-items:center}
#intro .in-bp .slot{width:300px;height:14px;border-radius:7px;background:#05080f;box-shadow:0 0 0 2px #1d3352,0 10px 30px rgba(0,0,0,.6);position:relative;z-index:2}#intro .in-bp .slot i{position:absolute;left:12px;right:12px;top:6px;height:2px;border-radius:1px;background:#7fd3ff;box-shadow:0 0 12px #7fd3ff;opacity:.9}
#intro .in-bp .clip{width:270px;overflow:hidden;margin-top:-6px;padding-bottom:30px}
#intro .in-bp .paper{position:relative;background:#f7f1e6;color:#14161b;border-radius:0 0 16px 16px;padding:0 0 14px;transform:translateY(-102%);box-shadow:0 20px 40px rgba(0,0,0,.5)}
#intro.t1 .in-bp .paper{animation:inPrint 1.8s .3s cubic-bezier(.45,.05,.2,1) forwards}@keyframes inPrint{to{transform:none}}
#intro .in-bp .hd{display:flex;justify-content:space-between;align-items:center;background:#d42a33;color:#fff;padding:9px 14px;font-size:.72rem;letter-spacing:.12em}
#intro .in-bp .rt{display:flex;justify-content:space-between;align-items:center;direction:ltr;padding:12px 16px 6px}#intro .in-bp .rt b{font:800 2.2rem/1 Rubik,sans-serif;display:block}#intro .in-bp .rt small{color:#8a8170;font-size:.7rem}#intro .in-bp .rt svg{width:28px;color:#d42a33;transform:rotate(90deg)}
#intro .in-bp .gr{display:grid;grid-template-columns:1fr 1fr;gap:8px 12px;padding:6px 16px 10px}#intro .in-bp .gr small{display:block;color:#8a8170;font-size:.64rem}#intro .in-bp .gr b{font-size:1.05rem}
#intro .in-bp .perf{border-top:2px dashed #cbbfa6;margin:4px 0 10px}
#intro .in-bp .bc{display:block;width:calc(100% - 32px);height:46px;margin:0 16px;fill:#14161b}#intro .in-bp .bc rect{transform:scaleY(0);transform-origin:50% 100%;transform-box:fill-box}#intro.t2 .in-bp .bc rect{animation:inBar .3s cubic-bezier(.2,.8,.2,1) forwards;animation-delay:calc(var(--i) * 14ms)}@keyframes inBar{to{transform:none}}
#intro .in-bp .stamp{position:absolute;left:18px;top:96px;border:3px solid #1f9d55;color:#1f9d55;font:800 1rem/1.05 Rubik,sans-serif;padding:6px 10px;border-radius:8px;text-align:center;transform:rotate(-14deg) scale(2.4);opacity:0}
#intro.t3 .in-bp .stamp{animation:inStamp .45s cubic-bezier(.2,1.6,.4,1) forwards}@keyframes inStamp{to{transform:rotate(-14deg) scale(1);opacity:.92}}

#intro.s1 .chase{opacity:.1;animation:inChase 1.6s linear infinite;animation-delay:calc(var(--i) * .2s)}@keyframes inChase{0%,12%{opacity:1}30%,100%{opacity:.08}}
#intro.s1 .clouds>g{animation:inCloud 30s linear infinite alternate}#intro.lite .clouds{filter:none}@keyframes inCloud{to{transform:translateX(40px)}}
#intro.s1 .nav{animation:inNav 1.4s steps(1) infinite}#intro.s1 .strobe{animation:inStrobe 1.6s infinite}@keyframes inNav{50%{opacity:.25}}@keyframes inStrobe{0%,6%,14%,100%{opacity:0}3%,11%{opacity:1}}
#intro.s1 .plane{transform:translateX(30px)}#intro.s1.t0 .plane{transform:none;transition:transform 8s cubic-bezier(.2,.6,.3,1)}
#intro .in-board{position:absolute;left:14px;right:14px;top:33vh;z-index:4;background:#0a0b10;border-radius:14px;padding:10px 10px 8px;box-shadow:0 16px 40px rgba(0,0,0,.6),inset 0 0 0 1px rgba(255,255,255,.06);font:700 .74rem ui-monospace,Menlo,monospace;opacity:0;transform:translateY(14px);transition:opacity .6s .3s,transform .8s .3s cubic-bezier(.16,1,.3,1)}
#intro.t0 .in-board{opacity:1;transform:none}
#intro .in-board .bh{display:flex;justify-content:space-between;color:#e8a317;font:800 .68rem Rubik,sans-serif;letter-spacing:.16em;padding:0 2px 7px}
#intro .in-board .br{display:grid;grid-template-columns:5ch 8ch 1fr 11ch;gap:6px;padding:3px 0}
#intro .in-board .br span{display:flex;gap:1px}#intro .in-board .c3{justify-content:flex-end}
#intro .in-board i{font-style:normal;display:inline-block;width:1.05ch;text-align:center;background:#16181f;color:#f2ecd9;border-radius:2px;padding:2px 0;line-height:1.25}
#intro .in-board i.f{animation:inCh .07s ease-out}@keyframes inCh{from{transform:scaleY(.2)}to{transform:none}}
#intro .in-board .mine i{color:#ffd27a;background:#211a0b}#intro .in-board .mine .c3 i{color:#4dff94;animation:inBlink 1.2s steps(1) infinite}@keyframes inBlink{50%{opacity:.4}}

/* גרסה קלה: בלי טשטוש, בלי גרגר, פחות חלקיקים — אבל אותו איור ואותה כוריאוגרפיה */
@media (max-height:740px){#intro .in-bp{top:calc(env(safe-area-inset-top,0px) + 238px);transform:scale(.7)}}#intro.lite .grain{display:none}#intro.lite .quip{-webkit-backdrop-filter:none;backdrop-filter:none;background:rgba(6,8,24,.62)}#intro.lite .ttl .w i{filter:none!important}#intro.lite .hdr button,#intro.lite .kick span{-webkit-backdrop-filter:none;backdrop-filter:none;background:rgba(0,0,0,.35)}#intro.lite .bm{mix-blend-mode:normal;opacity:.6}
@media (prefers-reduced-motion:reduce){#intro *{animation-duration:.01s!important;transition-duration:.2s!important}}
@media (max-height:700px){#intro .copy{top:calc(env(safe-area-inset-top,0px) + 7vh)}#intro .ttl{font-size:clamp(2.4rem,12vw,3.6rem)}#intro .quip{font-size:.92rem}#intro .in-timer{bottom:calc(env(safe-area-inset-bottom,0px) + 200px)}#intro .fl{height:min(12vw,50px)}#intro .in-pass{height:96px;bottom:calc(env(safe-area-inset-bottom,0px) + 84px)}#intro .in-pass .rt b{font-size:1.5rem}#intro .go{height:54px}}
#cine .lux-fx{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;opacity:.85}
#cine .lux-grain{position:absolute;inset:0;z-index:6;pointer-events:none;opacity:.08;mix-blend-mode:overlay;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");animation:inGrain .5s steps(4) infinite}
#cine.lite .lux-grain{display:none}
#cine .cn-skip,#cine .cn-snd{background:rgba(255,255,255,.12)!important;-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
#cine .cn-go{border-radius:30px!important;background:linear-gradient(180deg,#e7414b,#c11f29)!important;box-shadow:0 14px 34px rgba(212,42,51,.45),inset 0 1px 0 rgba(255,255,255,.3)!important;overflow:hidden}
#cine .cn-go::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.35) 50%,transparent 70%);transform:translateX(120%);animation:inSweep 3.2s 1s ease-in-out infinite}
#cine .cn-title h1{filter:drop-shadow(0 8px 22px rgba(0,0,0,.45))}
#cine .cn-stats,#cine .cn-end{-webkit-backdrop-filter:blur(16px) saturate(140%);backdrop-filter:blur(16px) saturate(140%);background:rgba(10,12,26,.62)!important;border-color:rgba(255,255,255,.14)!important}
#teaser{position:fixed;inset:0;z-index:9850;background:#000;overflow:hidden;transition:background .45s}
#teaser .tz-art,#teaser .tz-dim,#teaser .tz-cv{position:absolute;inset:0;pointer-events:none}
#teaser .tz-art{opacity:0;transform:scale(.9);transform-origin:50% 44%;filter:blur(10px) brightness(.35);transition:opacity 1.3s ease .25s,transform 2.6s cubic-bezier(.6,0,.2,1) .2s,filter 1.8s ease .25s}
#teaser.go .tz-art{opacity:1;transform:scale(1.22);filter:blur(0) brightness(.62)}
#teaser .tz-art svg{width:100%;height:100%;display:block}
#teaser .tz-dim{background:radial-gradient(120% 80% at 50% 43%,rgba(0,0,10,.15) 20%,rgba(0,0,10,.7));opacity:0;transition:opacity 1.2s .6s}#teaser.go .tz-dim{opacity:1}
#teaser .tz-cv{width:100%;height:100%}
#teaser .tz-skip{position:absolute;top:calc(env(safe-area-inset-top,0px) + 12px);inset-inline-start:14px;z-index:3;height:40px;border:0;border-radius:20px;background:rgba(255,255,255,.14);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);color:#fff;font:600 .9rem Rubik,sans-serif;padding:0 14px}
#teaser.burst{background:transparent;pointer-events:none}#teaser.burst .tz-art,#teaser.burst .tz-dim,#teaser.burst .tz-board{opacity:0;transition:opacity .42s}#teaser.burst .tz-skip{opacity:0;pointer-events:none}
#teaser.shake .tz-art,#teaser.shake .tz-cv{animation:tzShake .3s linear}@keyframes tzShake{20%{transform:translate(-5px,3px) scale(1.22)}40%{transform:translate(4px,-4px) scale(1.22)}60%{transform:translate(-3px,-2px) scale(1.22)}80%{transform:translate(2px,3px) scale(1.22)}}
#teaser.shake .tz-cv{animation-name:tzShakeC}@keyframes tzShakeC{20%{transform:translate(-5px,3px)}40%{transform:translate(4px,-4px)}60%{transform:translate(-3px,-2px)}80%{transform:translate(2px,3px)}}
#teaser.s4.beat .tz-art{animation:tzBeat .4s cubic-bezier(.2,.8,.2,1)}@keyframes tzBeat{0%{filter:brightness(1)}100%{filter:brightness(.62)}}
#teaser .tz-board{position:absolute;left:10px;right:10px;top:30vh;z-index:2;display:flex;flex-direction:column;align-items:center;gap:12px;opacity:0;transform:translateY(16px) scale(.96);transition:opacity .7s .5s,transform 1.4s cubic-bezier(.16,1,.3,1) .5s}
#teaser.go .tz-board{opacity:1;transform:none}
#teaser .tz-board div{display:flex;gap:5px}
#teaser .tz-board i{font-style:normal;display:flex;align-items:center;justify-content:center;width:min(10.4vw,46px);height:min(15vw,66px);border-radius:6px;background:linear-gradient(#1d2030 50%,#15172a 50%);color:#ffd27a;font:800 min(9vw,40px)/1 ui-monospace,Menlo,monospace;box-shadow:0 10px 24px rgba(0,0,0,.6),inset 0 -1px 0 rgba(0,0,0,.6);position:relative}
#teaser .tz-board i::after{content:"";position:absolute;left:0;right:0;top:50%;height:1px;background:rgba(0,0,0,.65)}
#teaser .tz-board i.f{animation:tzF .085s ease-out}@keyframes tzF{from{transform:perspective(200px) rotateX(-70deg)}to{transform:none}}
#teaser.peak .tz-board i{color:#4dff94;text-shadow:0 0 18px rgba(77,255,148,.7)}
#teaser.lite .tz-art{filter:none!important}#teaser.lite .tz-skip{-webkit-backdrop-filter:none;backdrop-filter:none;background:rgba(0,0,0,.4)}
#intro.gl:not(.out) .art{opacity:1;transform:none;transition:none}
#intro .glc{position:absolute;inset:0;width:100%;height:100%;display:block}
#intro.gl .grain{display:none}
#intro.gl .vig{background:linear-gradient(180deg,rgba(4,6,18,.55),rgba(4,6,18,.08) 30%,transparent 46%,rgba(4,6,18,.55) 68%,rgba(4,6,18,.86))}
#intro.hold>:not(.art){opacity:0!important;pointer-events:none!important;transition:none!important}
#intro.gl:not(.hold) .vig{transition:opacity .9s}
#intro.gl .in-bp .slot{visibility:hidden}#intro.s2.gl .in-bp{top:37vh}#teaser.glm{background:transparent}#teaser.glm .tz-art,#teaser.glm .tz-dim{display:none}
.in-mh{margin:6px 0 2px}.in-mg{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:8px 0 16px}.in-mg button{border:0;border-radius:14px;background:var(--card2);color:var(--ink);padding:10px 4px;display:flex;flex-direction:column;align-items:center;gap:4px;font:600 .72rem Rubik,sans-serif;line-height:1.15;text-align:center}.in-mg b{font-size:1.3rem}.in-mg .cur{box-shadow:inset 0 0 0 2px var(--red,#d42a33)}
`; document.head.appendChild(st); })();

window.__mods.intro = "ok";
} catch (err) { try { console.warn("intro disabled:", err); window.__mods.intro = "fail: " + (err && err.message || err); } catch (e) {} }
})();
