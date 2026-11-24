/* talk: "🗣️ לדבר עם אנשים" — משפטים מוכנים בעברית / אנגלית / צ'כית עם הגייה בעברית.
   נגיעה במשפט מקריאה אותו בקול (הקול של הטלפון, בלי אינטרנט ובלי שום שירות בתשלום), "⛶" מציג אותו ענק על כל המסך,
   ⭐ מועדפים, 🕘 אחרונים, ו"תרגם משהו אחר" פותח את Google Translate עם מה שהקלדת (רק זה צריך רשת).
   מחובר לעוזר: "איך אומרים X בצ'כית?" נענה מהרשימה. מוגן: אם משהו כאן נכשל, שאר האפליקציה עולה כרגיל. */
"use strict";
(function () {
try {
/* [id, עברית, English, Česky, איך מבטאים] — בקטגוריית "להכיר" אין צ'כית: מדברים אנגלית, וההגייה היא של האנגלית */
const CATS = [
  { k: "base", ic: "👋", t: "בסיס", say: "cs", items: [
    ["hi", "שלום", "Hello", "Dobrý den", "דוֹבְּרִי דֶן"],
    ["hey", "היי (לצעירים)", "Hi", "Ahoj", "אַהוֹי"],
    ["thx", "תודה", "Thank you", "Děkuji", "דְיֶקוּיִי"],
    ["sorry", "סליחה", "Excuse me", "Promiňte", "פְּרוֹמִינְטֶה"],
    ["pls", "בבקשה", "Please", "Prosím", "פְּרוֹסִים"],
    ["yes", "כן / לא", "Yes / No", "Ano / Ne", "אָנוֹ / נֶה"],
    ["nocz", "אני לא מדבר צ'כית", "I don't speak Czech", "Nemluvím česky", "נֶמְלוּבִים צֶ'סְקִי"],
    ["eng", "אתה מדבר אנגלית?", "Do you speak English?", "Mluvíte anglicky?", "מְלוּבִיטֶה אַנְגְלִיצְקִי?"],
    ["bye", "להתראות", "Goodbye", "Na shledanou", "נָא סְחְלֶדָנוֹאוּ"] ] },
  { k: "food", ic: "🍽️", t: "אוכל", say: "cs", items: [
    ["nomeat", "אפשר בלי בשר?", "Can I have it without meat?", "Může to být bez masa?", "מוּזֶ'ה טוֹ בִּיט בֶּז מָסָה?"],
    ["veg", "מה יש צמחוני?", "What do you have that's vegetarian?", "Co máte vegetariánského?", "צוֹ מָאטֶה וֶגֶטָרִיָאנְסְקֶהוֹ?"],
    ["bill", "חשבון בבקשה", "The bill, please", "Účet, prosím", "אוּצֶ'ט, פְּרוֹסִים"],
    ["price", "כמה זה עולה?", "How much is it?", "Kolik to stojí?", "קוֹלִיק טוֹ סְטוֹיִי?"],
    ["water", "מים בבקשה", "Water, please", "Vodu, prosím", "ווֹדוּ, פְּרוֹסִים"],
    ["card", "אפשר לשלם בכרטיס?", "Can I pay by card?", "Můžu platit kartou?", "מוּז׳וּ פְּלָטִיט קַרְטוֹאוּ?"] ] },
  { k: "way", ic: "🚇", t: "תחבורה וכיוונים", say: "cs", items: [
    ["metro", "איפה המטרו?", "Where is the metro?", "Kde je metro?", "גְדֶה יֶה מֶטְרוֹ?"],
    ["howto", "איך מגיעים ל-...?", "How do I get to ...?", "Jak se dostanu na ...?", "יָאק סֶה דוֹסְטָנוּ נָה ...?"],
    ["ticket", "כרטיס אחד בבקשה", "One ticket, please", "Jednu jízdenku, prosím", "יֶדְנוּ יִיזְדֶנְקוּ, פְּרוֹסִים"],
    ["dir", "זה הכיוון ל-...?", "Is this the way to ...?", "Je to směr ...?", "יֶה טוֹ סְמְנְיֶר ...?"],
    ["stop", "איפה התחנה?", "Where is the stop?", "Kde je zastávka?", "גְדֶה יֶה זָסְטָאבְקָה?"] ] },
  { k: "club", ic: "🍺", t: "מועדון ובר", say: "cs", items: [
    ["beer", "בירה אחת בבקשה", "One beer, please", "Jedno pivo, prosím", "יֶדְנוֹ פִּיבוֹ, פְּרוֹסִים"],
    ["cloak", "איפה המלתחה?", "Where is the cloakroom?", "Kde je šatna?", "גְדֶה יֶה שַׁטְנָה?"],
    ["close", "מתי זה נסגר?", "What time do you close?", "V kolik zavíráte?", "בְקוֹלִיק זָבִירָאטֶה?"],
    ["wc", "איפה השירותים?", "Where is the toilet?", "Kde jsou toalety?", "גְדֶה יְסוֹאוּ טוֹאָלֶטִי?"],
    ["cheers", "לחיים!", "Cheers!", "Na zdraví!", "נָא זְדְרָבִי!"] ] },
  { k: "meet", ic: "🤝", t: "להכיר אנשים", say: "en", sting: "אף אחד לא יגיד \"היי\" ראשון בשבילך. הנה שמונה דרכים, תבחר אחת.", items: [
    ["from", "מאיפה אתם?", "Hey, where are you guys from?", "", "הֵיי, וֵר אָר יוּ גַאיְז פְרוֹם?"],
    ["alone", "באת לבד גם?", "Did you come here alone too?", "", "דִיד יוּ קַאם הִיר אֶלוֹן טוּ?"],
    ["first", "פעם ראשונה בפראג?", "Is this your first time in Prague?", "", "אִיז דִיס יוֹר פֶרְסְט טַיְם אִין פְּרָאג?"],
    ["todo", "מה באמת כדאי לעשות פה?", "What's actually worth doing here?", "", "ווֹטְס אַקְצ'וּאָלִי ווֹרְת' דוּאִינְג הִיר?"],
    ["join", "אפשר להצטרף?", "Mind if I join you?", "", "מַיְנְד אִיף אַיי ג'וֹיְן יוּ?"],
    ["name", "אני עומר, דרך אגב", "I'm Omer, by the way", "", "אַיְם עוֹמֶר, בַּיי דֶה ווֵיי"],
    ["photo", "בוא נצטלם", "Let's take a photo", "", "לֶטְס טֵייק אֶה פוֹטוֹ"],
    ["insta", "יש לך אינסטגרם?", "Do you have Instagram?", "", "דוּ יוּ הֶב אִינְסְטַגְרָם?"] ] },
  { k: "sos", ic: "🆘", t: "חירום", say: "cs", items: [
    ["help", "עזרה!", "Help!", "Pomoc!", "פּוֹמוֹץ!"],
    ["amb", "תתקשרו לאמבולנס!", "Call an ambulance!", "Zavolejte sanitku!", "זָבוֹלֵיְטֶה סָנִיטְקוּ!"],
    ["police", "תתקשרו למשטרה!", "Call the police!", "Zavolejte policii!", "זָבוֹלֵיְטֶה פּוֹלִיצִיִי!"],
    ["phone", "איבדתי את הטלפון", "I lost my phone", "Ztratil jsem telefon", "סְטְרָטִיל יְסֶם טֶלֶפוֹן"],
    ["doc", "אני צריך רופא", "I need a doctor", "Potřebuji lékaře", "פּוֹטְרְזֶ'בּוּיִי לֶקָאזֶ'ה"],
    ["lost", "הלכתי לאיבוד", "I'm lost", "Ztratil jsem se", "סְטְרָטִיל יְסֶם סֶה"] ] }
];
const ALL = []; CATS.forEach(c => c.items.forEach(x => ALL.push({ id: c.k + "." + x[0], he: x[1], en: x[2], cs: x[3], pr: x[4], say: x[3] ? c.say : "en", cat: c.k })));
const byId = id => ALL.find(x => x.id === id);
const fav = () => LS.get("talkFav", []), rec = () => LS.get("talkRec", []);
const touch = id => { const r = rec().filter(x => x !== id); r.unshift(id); LS.set("talkRec", r.slice(0, 8)); };

/* ---------- הקראה: הקול של הטלפון (speechSynthesis), עובד בלי אינטרנט ---------- */
let voices = []; const loadV = () => { try { voices = speechSynthesis.getVoices() || []; } catch (e) {} };
try { loadV(); speechSynthesis.addEventListener && speechSynthesis.addEventListener("voiceschanged", loadV); } catch (e) {}
function speak(text, lang) { // lang: "cs" | "en"; מחזיר false אם אין אפשרות להקריא
  try { if (!("speechSynthesis" in window) || !window.SpeechSynthesisUtterance) return false; loadV();
    const want = lang === "cs" ? "cs-CZ" : "en-US", v = voices.find(x => x.lang === want) || voices.find(x => (x.lang || "").toLowerCase().startsWith(lang));
    if (lang === "cs" && voices.length && !v) return false; /* אין קול צ'כי מותקן: עדיף להראות בגדול מלהקריא במבטא לא נכון */
    const u = new SpeechSynthesisUtterance(text.replace(/\.\.\./g, " ")); u.lang = want; if (v) u.voice = v; u.rate = lang === "cs" ? 0.85 : 0.92; speechSynthesis.cancel(); speechSynthesis.speak(u); return true; } catch (e) { return false; }
}
function say(p, lang) { const L = lang || p.say, txt = L === "cs" ? p.cs : p.en; touch(p.id); if (!speak(txt, L)) { toast(L === "cs" ? "אין בטלפון הזה קול צ'כי, אז מראים בגדול" : "ההקראה לא זמינה כאן, אז מראים בגדול", 2600); big(p); } }

/* ---------- "הצג בגדול": להראות את המסך למישהו ---------- */
function big(p) { touch(p.id); const b = $("#big"); if (!b) return;
  b.innerHTML = `<button id="bigX" aria-label="סגור">✕</button><div class="tk-big"><small>${esc(p.he)}</small>${p.cs ? `<p class="cz" dir="ltr">${esc(p.cs)}</p>` : ""}<p class="en${p.cs ? " sm" : ""}" dir="ltr">${esc(p.en)}</p><div class="row" style="justify-content:center;margin-top:18px">${p.cs ? `<button class="btn" data-sp="cs">🔊 צ'כית</button>` : ""}<button class="btn" data-sp="en">🔊 אנגלית</button></div></div>`;
  b.hidden = false; b.onclick = e => { const s = e.target.closest("[data-sp]"); if (s) { e.stopPropagation(); speak(s.dataset.sp === "cs" ? p.cs : p.en, s.dataset.sp); return; } b.hidden = true; };
}

/* ---------- המסך ---------- */
const row = p => `<li class="tk-row" data-id="${p.id}"><button class="tk-main" data-say="${p.id}" aria-label="להקריא: ${esc(p.he)}"><b>${esc(p.he)}</b>${p.cs ? `<span class="cz" dir="ltr">${esc(p.cs)}</span><small class="pr">${esc(p.pr)}</small><span class="en" dir="ltr">${esc(p.en)}</span>` : `<span class="cz" dir="ltr">${esc(p.en)}</span><small class="pr">${esc(p.pr)}</small>`}</button>
  <span class="tk-act">${p.cs ? `<button data-en="${p.id}" aria-label="להקריא באנגלית">EN</button>` : ""}<button data-big="${p.id}" aria-label="להציג בגדול">⛶</button><button data-fav="${p.id}" class="${fav().includes(p.id) ? "on" : ""}" aria-label="מועדף">${fav().includes(p.id) ? "★" : "☆"}</button></span></li>`;
let curTab = "base";
function openTalk(tab) {
  if (tab) curTab = tab; const f = fav().map(byId).filter(Boolean), r = rec().map(byId).filter(Boolean);
  if (curTab === "fav" && !f.length) curTab = "base"; if (curTab === "rec" && !r.length) curTab = "base";
  const cat = CATS.find(c => c.k === curTab), list = curTab === "fav" ? f : curTab === "rec" ? r : cat.items.map(x => byId(cat.k + "." + x[0]));
  openModal(`<h2>🗣️ לדבר עם אנשים</h2><p class="sub">נוגעים במשפט והטלפון אומר אותו בקול. <b>⛶</b> מציג אותו ענק, להראות למישהו. עובד בלי אינטרנט.</p>
    <div class="chips tk-tabs">${f.length ? `<button class="chip${curTab === "fav" ? " sel" : ""}" data-tab="fav">⭐ מועדפים</button>` : ""}${r.length ? `<button class="chip${curTab === "rec" ? " sel" : ""}" data-tab="rec">🕘 אחרונים</button>` : ""}${CATS.map(c => `<button class="chip${curTab === c.k ? " sel" : ""}" data-tab="${c.k}">${c.ic} ${c.t}</button>`).join("")}</div>
    ${cat && cat.sting ? `<p class="tk-sting">${cat.sting}</p>` : ""}
    <ul class="tk-list">${list.map(row).join("")}</ul>
    <div class="card soft tk-tr"><b>🌐 תרגם משהו אחר</b><p class="sub">נפתח ב-Google Translate עם מה שהקלדת. רק זה צריך אינטרנט.</p>
      <textarea id="tkTx" rows="2" dir="auto" placeholder="מה רצית להגיד?"></textarea>
      <div class="row wrap"><select id="tkDir" aria-label="כיוון תרגום"><option value="iw|cs">עברית ← צ'כית</option><option value="iw|en">עברית ← אנגלית</option><option value="cs|iw">צ'כית ← עברית</option><option value="en|iw">אנגלית ← עברית</option></select><button class="btn pri" id="tkGo" style="flex:1">לתרגם ↗</button></div></div>`, "tall");
  const box = $("#mbody");
  try { const sel = box.querySelector(".tk-tabs .sel"), tb = box.querySelector(".tk-tabs"); if (sel && tb) tb.scrollLeft += sel.getBoundingClientRect().left - tb.getBoundingClientRect().left - (tb.clientWidth - sel.offsetWidth) / 2; } catch (e) {}
  box.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => openTalk(b.dataset.tab));
  box.querySelector(".tk-list").onclick = e => { const g = k => e.target.closest(`[data-${k}]`); let b;
    if ((b = g("fav"))) { const id = b.dataset.fav, cur = fav(), on = !cur.includes(id); LS.set("talkFav", on ? cur.concat([id]) : cur.filter(x => x !== id)); b.textContent = on ? "★" : "☆"; b.classList.toggle("on", on); buzz(6); if (curTab === "fav") openTalk("fav"); return; }
    if ((b = g("big"))) return big(byId(b.dataset.big));
    if ((b = g("en"))) return say(byId(b.dataset.en), "en");
    if ((b = g("say"))) { const p = byId(b.dataset.say); b.classList.add("spk"); setTimeout(() => b.classList.remove("spk"), 900); say(p); } };
  $("#tkGo").onclick = () => { const t = $("#tkTx").value.trim(); if (!t) { $("#tkTx").focus(); return; } if (isOffline()) { toast("⚠️ לתרגום חופשי צריך אינטרנט. המשפטים המוכנים עובדים גם בלי", 3600); return; } const [sl, tl] = $("#tkDir").value.split("|"); window.open(`https://translate.google.com/?sl=${sl}&tl=${tl}&text=${encodeURIComponent(t)}&op=translate`, "_blank", "noopener"); };
}

/* ---------- העוזר: "איך אומרים X בצ'כית / באנגלית?" ---------- */
const nrm = s => String(s || "").toLowerCase().replace(/[֑-ׇ]/g, "").replace(/['׳’`]/g, "").replace(/[?!.,"״:()\-]/g, " ").replace(/ם/g, "מ").replace(/ן/g, "נ").replace(/ץ/g, "צ").replace(/ף/g, "פ").replace(/ך/g, "כ").replace(/\s+/g, " ").trim();
const STOP = new Set(["איכ", "אומרימ", "אומר", "להגיד", "אגיד", "מגידימ", "אומרת", "בצכית", "צכית", "באנגלית", "אנגלית", "את", "זה", "של", "אני", "לי", "מה", "המילה", "מילה", "אפשר", "בבקשה"]);
function talkFind(q) { const n = nrm(q); if (!/איכ (אומרימ|אומר|להגיד|מגידימ|אגיד)|בצכית|באנגלית|how do (you|i) say/.test(n)) return null;
  const toks = n.split(" ").filter(t => t.length > 1 && !STOP.has(t)); if (!toks.length) return [];
  return ALL.map(p => { const h = nrm(p.he); let s = 0; toks.forEach(t => { if (h === t) s += 5; else if (h.split(" ").includes(t)) s += 3; else if (h.includes(t) || (t.length > 3 && h.includes(t.slice(1)))) s += 1.5; }); return { p, s }; }).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 3).map(x => x.p); }
if (typeof window.askAnswer === "function") window.askAnswer = (old => function (q) {
  let hit = null; try { hit = talkFind(q); } catch (e) {} const box = $("#qaOut"); if (!hit || !hit.length || !box) return old.apply(this, arguments);
  LS.set("askLast", q);
  box.innerHTML = `<article class="qa"><small>מהמשפטים ששמורים בטלפון · נוגעים כדי לשמוע</small><ul class="tk-list">${hit.map(row).join("")}</ul><div class="row wrap qa-b"><button class="btn" id="qaTalk">🗣️ כל המשפטים</button></div></article>`;
  box.querySelector(".tk-list").onclick = e => { const g = k => e.target.closest(`[data-${k}]`); let b; if ((b = g("fav"))) { const id = b.dataset.fav, cur = fav(), on = !cur.includes(id); LS.set("talkFav", on ? cur.concat([id]) : cur.filter(x => x !== id)); b.textContent = on ? "★" : "☆"; return; } if ((b = g("big"))) return big(byId(b.dataset.big)); if ((b = g("en"))) return say(byId(b.dataset.en), "en"); if ((b = g("say"))) say(byId(b.dataset.say)); };
  $("#qaTalk").onclick = () => openTalk();
})(window.askAnswer);

/* ---------- כניסות: כפתור גלוי על המפה, ראשון בשורת הקיצורים, ובתפריט ---------- */
window.openPhrases = () => openTalk();
try { /* כפתור צף משלו מעל הגיליון, בצד שמול כפתורי המפה: לא נוגע בעמודה שלהם, כדי שלא ייגמר להם המקום במסך נמוך */
  if (!$("#talkPill")) { const b = document.createElement("button"); b.id = "talkPill"; b.setAttribute("aria-label", "לדבר עם אנשים"); b.innerHTML = `<span>🗣️</span> לדבר`; b.onclick = () => { buzz(6); openTalk(); }; document.body.appendChild(b);
    const place = () => { try { if (isDesktop()) { b.style.bottom = "28px"; b.classList.remove("hide"); return; } const H = sheetHeights(); b.style.bottom = (H[sheetState] + 12) + "px"; b.classList.toggle("hide", sheetState === "full"); } catch (e) {} };
    if (typeof window.setSheet === "function") window.setSheet = (old => function () { const r = old.apply(this, arguments); place(); return r; })(window.setSheet);
    place(); addEventListener("resize", place); }
  const q = $("#quick"); if (q && !$("#qTalk")) { const b = document.createElement("button"); b.id = "qTalk"; b.textContent = "🗣️ לדבר עם אנשים"; b.onclick = e => { e.stopPropagation(); openTalk(); }; q.insertBefore(b, q.firstChild); } } catch (e) {}
Object.assign(window, { openTalk, talkFind, talkSpeak: speak, TALK: ALL });

(() => { const st = document.createElement("style"); st.textContent = `
.tk-tabs{margin:4px -16px 6px;padding:0 16px;display:flex;gap:8px;overflow-x:auto;scrollbar-width:none}
.tk-tabs .chip.sel{background:var(--ink);color:var(--card);box-shadow:none}
.tk-sting{margin:8px 0 2px;font-weight:700;color:var(--must-ink,#8a5d00);font-size:.98rem;line-height:1.4}
:root[data-theme="dark"] .tk-sting{color:var(--must)}
.tk-list{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:8px}
.tk-row{display:flex;align-items:stretch;gap:6px;background:var(--card2);border-radius:16px;overflow:hidden}
.tk-main{flex:1;min-width:0;border:0;background:none;text-align:start;padding:12px 14px;display:flex;flex-direction:column;gap:2px;color:var(--ink);font:inherit}
.tk-main b{font-size:1rem;font-weight:700}
.tk-main .cz{font-size:1.12rem;font-weight:700;color:var(--red-ink,#b81f28);text-align:left;unicode-bidi:isolate}
.tk-main .pr{font-size:.86rem;color:var(--mut);font-weight:500}
.tk-main .en{font-size:.86rem;color:var(--mut);text-align:left;unicode-bidi:isolate}
.tk-main.spk{background:color-mix(in srgb,var(--must) 22%,transparent)}
.tk-act{display:flex;flex-direction:column;justify-content:center;gap:4px;padding:6px 8px 6px 6px}
.tk-act button{width:40px;height:34px;border:0;border-radius:10px;background:var(--card);color:var(--ink);font:700 .8rem Rubik,system-ui,sans-serif;box-shadow:var(--sh1)}
.tk-act button.on{color:#e8a317;font-size:1.05rem}
.tk-tr{margin-top:16px}.tk-tr textarea{width:100%;margin:6px 0 8px;border-radius:12px;border:1.5px solid var(--line);background:var(--card);padding:10px 12px;color:var(--ink);font:inherit;resize:none}
.tk-tr select{min-height:50px;border-radius:15px;border:1.5px solid var(--line);background:var(--card);color:var(--ink);padding:0 10px;font:inherit}
#big .tk-big{text-align:center;padding:0 18px}#big .tk-big small{font-size:1.1rem;opacity:.7}
#big .tk-big p{margin:14px 0 0;font-weight:800;line-height:1.1;font-size:clamp(2.2rem,11vw,4.2rem);unicode-bidi:isolate}
#big .tk-big p.en.sm{font-size:clamp(1.1rem,5vw,1.6rem);font-weight:600;opacity:.75}
#big .tk-big{width:100%}#big .tk-big p{text-align:center}
#talkPill{position:fixed;z-index:4;inset-inline-start:10px;bottom:170px;min-height:48px;padding:0 16px 0 14px;border:0;border-radius:24px;background:var(--card);color:var(--ink);box-shadow:var(--sh2);font:700 .92rem Rubik,system-ui,sans-serif;display:flex;align-items:center;gap:7px;transition:bottom .42s var(--spring),opacity .2s,transform .15s}
#talkPill span{font-size:1.15rem}#talkPill:active{transform:scale(.94)}#talkPill.hide{opacity:0;pointer-events:none}
`; document.head.appendChild(st); })();
(window.__mods = window.__mods || {}).talk = "ok";
} catch (err) { try { console.warn("talk:", err); (window.__mods = window.__mods || {}).talk = "fail: " + (err && err.message || err); } catch (e) {} }
})();
