/* chat: Claude בתוך האפליקציה, דרך פונקציה שרתית. המפתח של Anthropic נמצא רק בשרת. */
"use strict";
const MOODS = [["cold", "🥶 קר לי"], ["tired", "😮‍💨 עייף"], ["hungry", "🍕 רעב"], ["free", "🕐 יש לי זמן"]];
const SHORTS = ["מה יש פה לידי?", "אוכל בלי בשר", "משהו חם לשתות", "מקום לצילום", "יש לי שעתיים", "חנויות לידי", "איפה מסיבה הערב?"];
let chatMood = LS.get("mood", ""), chatBusy = false;
const chatUrl = () => CONFIG.server ? (me.chatUrl || CONFIG.chatUrl || "").trim() : "";
const chatTok = () => (me.chatTok || "").trim();
const chatKey = () => "chat." + tripNow().date;
const chatLog = () => LS.get(chatKey(), []);

function chatContext() {
  const T = tripNow(), w = T.w, L = T.dayIdx >= 0 ? live(T.dayIdx) : null, wd = wxDay(T.date), lines = [];
  lines.push(`השעה בפראג: ${String(w.getUTCHours()).padStart(2, "0")}:${String(w.getUTCMinutes()).padStart(2, "0")}, ${dayDate(dstr(w)).dow} ${dayDate(dstr(w)).dm}.`);
  if (gps) { const st = nearestStreet(gps), k = nearestKnown(gps); lines.push(`המיקום שלי (GPS): ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}${st ? `, רחוב ${st}` : ""}, ${fmtDist(hav(gps, k))} מ-${k.q ? k.q.split(",")[0] : k.name}.`); }
  else { const s = L && (L.cur || L.next), l = s && loc(s); lines.push(`אין לי GPS כרגע. ${l ? `כנראה באזור ${l.q ? l.q.split(",")[0] : s.n}.` : "במרכז פראג."}`); }
  if (T.phase === "during") {
    lines.push(`יום ${T.dayIdx + 1} מתוך ${plan.length}: ${plan[T.dayIdx].title}.`);
    const done = plan[T.dayIdx].stops.filter(s => marks[s.id] === "done").map(s => s.n);
    if (done.length) lines.push(`כבר הייתי ב: ${done.join(", ")}.`);
    if (L.next) lines.push(`התחנה הבאה: ${L.next.n} ב-${fmtT(L.next.m)} (${pm(L.next) >= T.min ? "בעוד " + fmtDur(pm(L.next) - T.min) : "אני מאחר אליה ב-" + fmtDur(T.min - pm(L.next))}).`); else lines.push("אין עוד תחנות קבועות היום.");
  } else lines.push(T.phase === "before" ? "הטיול עוד לא התחיל, אני מתכנן מראש." : "הטיול הסתיים.");
  if (wd) lines.push(`מזג אוויר: ${wd.min}° עד ${wd.max}°, ${wd.pp}% משקעים${isWetNow() ? ", יורד עכשיו" : ""}.`);
  const m = MOODS.find(x => x[0] === chatMood); if (m) lines.push(`המצב שלי: ${m[1].replace(/^\S+\s/, "")}.`);
  const h = place("hotel"); if (gps) lines.push(`המלון ${fmtDist(hav(gps, h) * 1.3)} ממני.`);
  return lines.join("\n");
}

function msgHtml(m, i) {
  if (m.r === "sys") return `<div class="msg sys">${m.t}</div>`;
  let h = `<div class="msg ${m.r === "user" ? "u" : "a"}" dir="auto">${esc(m.t)}</div>`;
  if (m.p && m.p.length) h += `<div class="ch-pl">${m.p.map((p, j) => `<div class="ch-p"><button data-go="${i},${j}"><b dir="ltr">📍 ${esc(p.name)}</b><small>${p.lat && gps ? fmtDist(hav(gps, p) * 1.3) + " · " : ""}${esc(p.note || "")}</small></button>
    <a class="btn pri" style="flex:none" href="${navUrl({ q: p.q || p.name + ", Praha", lat: p.lat || 0, lng: p.lng || 0 })}" target="_blank" rel="noopener">נווט</a>${p.lat ? `<button class="btn" data-add="${i},${j}">➕</button>` : ""}</div>`).join("")}</div>`;
  return h;
}
function renderChat() {
  const log = chatLog(), box = $("#chLog"); if (!box) return;
  const pend = LS.get("chatQ", "");
  box.innerHTML = (isOffline() ? `<div class="msg sys">📡 אין קליטה. אפשר לכתוב שאלה, והיא תישלח לבד כשהרשת תחזור.</div>` : "") + (log.length || pend ? "" : `<div class="msg sys">אני רואה איפה אתה, מה השעה ומה הבא בתוכנית. שואלים מה שרוצים.</div>`) + log.map(msgHtml).join("") + (pend ? `<div class="msg u pend" dir="auto">${esc(pend)}</div><div class="msg sys">ממתין לרשת…</div>` : "") + (chatBusy ? `<div class="msg a dots">חושב</div>` : "");
  box.scrollTop = box.scrollHeight;
  $$("#chLog [data-go]").forEach(b => b.onclick = () => { const [i, j] = b.dataset.go.split(","), p = log[i].p[j]; if (!p.lat) return toast("לא מצאתי אותו על המפה. \"נווט\" יחפש לפי השם"); closeModal(); if (!isDesktop()) setSheet("low"); showChatPlaces(log[i].p); flyTo(p, 16.8); });
  $$("#chLog [data-add]").forEach(b => b.onclick = () => { const [i, j] = b.dataset.add.split(","), p = log[i].p[j]; addStopFlow({ lat: p.lat, lng: p.lng, name: p.name, q: p.q || "", d: p.note || "", ic: "✨" }); });
  const fb = $("#chFb"); if (fb) fb.onclick = () => openClaude(window._chatLast || "");
}
function showChatPlaces(ps) { showNearMarkers(ps.filter(p => p.lat).map((p, i) => ({ id: "c" + i, name: p.name, ic: "✨", lat: p.lat, lng: p.lng, sub: p.note || "", q: p.q || "" }))); }

/* מאמתים את המיקום של כל מקום מול OpenStreetMap, כי קואורדינטות של מודל לא תמיד מדויקות */
async function geocodePlaces(ps) {
  const inPrague = p => p.lat > 49.94 && p.lat < 50.18 && p.lng > 14.22 && p.lng < 14.71, out = [];
  for (const p of (ps || []).slice(0, 4)) {
    const o = { name: String(p.name || "").slice(0, 80), note: String(p.note || "").slice(0, 140), q: String(p.query || p.name || "").slice(0, 120), lat: null, lng: null };
    if (!o.name) continue;
    try {
      const j = await (await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&viewbox=14.22,50.18,14.71,49.94&bounded=1&q=" + encodeURIComponent(o.q))).json();
      if (j[0]) { o.lat = +(+j[0].lat).toFixed(5); o.lng = +(+j[0].lon).toFixed(5); }
    } catch (e) {}
    if (o.lat == null && typeof p.lat === "number" && inPrague(p)) { o.lat = +p.lat.toFixed(5); o.lng = +p.lng.toFixed(5); o.note = (o.note ? o.note + " · " : "") + "מיקום משוער"; }
    out.push(o); if (ps.length > 1) await new Promise(r => setTimeout(r, 1050));
  }
  return out;
}

async function sendChat(text) {
  text = (text || "").trim(); if (!text || chatBusy) return;
  const key = chatKey(), log = chatLog(); log.push({ r: "user", t: text }); LS.set(key, log);
  const fail = why => { const l = LS.get(key, []); l.push({ r: "sys", t: `${why} <button class="lnk" id="chFb">פתח ב-Claude במקום</button>` }); LS.set(key, l); chatBusy = false; window._chatLast = text; renderChat(); };
  if (isOffline()) { // אין קליטה: שומרים את השאלה ושולחים לבד כשהרשת חוזרת
    const l = LS.get(key, []); l.pop(); LS.set(key, l); LS.set("chatQ", text); renderChat(); toast("אין קליטה. השאלה תישלח לבד כשהרשת תחזור", 3600); return;
  }
  if (!chatUrl() || !chatTok()) { renderChat(); return fail("הצ'אט עוד לא מחובר (חסרה כתובת השרת או הסיסמה, ב\"עוד\" → \"הגדרות הצ'אט\")."); }
  chatBusy = true; renderChat(); window._chatLast = text;
  try {
    const msgs = log.filter(m => m.r !== "sys").slice(-10).map(m => ({ role: m.r === "user" ? "user" : "assistant", content: m.t + (m.p && m.p.length ? "\n(המקומות שהצעתי: " + m.p.map(p => p.name).join(", ") + ")" : "") }));
    while (msgs.length && msgs[0].role !== "user") msgs.shift();
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 35000);
    const r = await fetch(chatUrl(), { method: "POST", headers: { "content-type": "application/json", "x-app-token": chatTok() }, body: JSON.stringify({ messages: msgs, context: chatContext() }), signal: ctl.signal });
    clearTimeout(to); const j = await r.json().catch(() => ({}));
    if (!r.ok) return fail(r.status === 401 ? "הסיסמה לא תואמת לזו שבשרת." : r.status === 429 ? "נגמרה מכסת ההודעות להיום (היא מתאפסת בחצות)." : (j.error || "השרת לא ענה כמו שצריך."));
    const places = await geocodePlaces(j.places);
    const l = LS.get(key, []); l.push({ r: "assistant", t: j.text || "סימנתי לך כמה מקומות:", p: places }); LS.set(key, l);
    chatBusy = false; renderChat(); if (places.some(p => p.lat)) showChatPlaces(places);
    if (typeof j.left === "number" && j.left <= 5) toast(`נשארו ${j.left} הודעות להיום`);
  } catch (e) { fail(navigator.onLine === false ? "אין קליטה כרגע." : "לא הצלחתי להגיע לשרת."); }
}

function flushChatQueue() { if (!CONFIG.server) return; const q = LS.get("chatQ", ""); if (!q || isOffline()) return; LS.del("chatQ"); sendChat(q).then(() => toast("Claude ענה על השאלה ששמרת ✓")); }
/* בלי שרת: כל שאלה נפתחת ישר ב-claude.ai עם כל ההקשר (איפה אני, שעה, תחנה הבאה, מזג אוויר, מצב רוח) */
function askClaude(q) {
  const text = claudeText(q);
  if (isOffline()) { if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {}); toast("אין קליטה כרגע. העתקתי את השאלה, אפשר להדביק ב-Claude כשהרשת חוזרת", 4200); return; }
  buzz(8); window.open("https://claude.ai/new?q=" + encodeURIComponent(text), "_blank", "noopener");
}
function openAsk() {
  openModal(`<h2>💬 Claude <small class="h-sub">שותף הטיול שלך</small></h2>
    <p class="sub">בוחרים שאלה, והיא נפתחת ב-Claude עם כל ההקשר: איפה אתה, השעה בפראג, התחנה הבאה ומזג האוויר.</p>
    <h3>איך אתה עכשיו?</h3><div class="chips" id="chMood">${MOODS.map(m => `<button class="chip${chatMood === m[0] ? " sel" : ""}" data-m="${m[0]}">${m[1]}</button>`).join("")}</div>
    <h3>מה בא לך לדעת?</h3><div class="ask-grid" id="chShort">${SHORTS.map(s => `<button class="ask"><span>${s}</span><i>↗</i></button>`).join("")}</div>
    <form class="ch-bar" id="chF"><input id="chI" placeholder="או שאלה משלך…" enterkeyhint="go" autocomplete="off" dir="auto"><button class="btn pri" style="flex:none">שאל</button></form>
    <button class="lnk" id="chPrev">לראות ולערוך את ההודעה לפני ששולחים</button>`, "tall");
  $$("#chMood .chip").forEach(b => b.onclick = () => { chatMood = chatMood === b.dataset.m ? "" : b.dataset.m; LS.set("mood", chatMood); buzz(6); $$("#chMood .chip").forEach(x => x.classList.toggle("sel", x.dataset.m === chatMood)); });
  $$("#chShort .ask").forEach(b => b.onclick = () => askClaude(b.querySelector("span").textContent));
  $("#chF").onsubmit = e => { e.preventDefault(); askClaude($("#chI").value.trim()); };
  $("#chPrev").onclick = () => openClaude($("#chI").value.trim());
}
function openChat() {
  if (!CONFIG.server) return openAsk();
  openModal(`<h2>💬 Claude <small class="h-sub">שותף הטיול שלך</small></h2>
    <div class="chips" id="chMood">${MOODS.map(m => `<button class="chip${chatMood === m[0] ? " sel" : ""}" data-m="${m[0]}">${m[1]}</button>`).join("")}</div>
    <div class="ch-log" id="chLog" aria-live="polite"></div>
    <div class="chips" id="chShort">${SHORTS.map(s => `<button class="chip">${s}</button>`).join("")}</div>
    <form class="ch-bar" id="chF"><input id="chI" placeholder="מה בא לך לשאול?" enterkeyhint="send" autocomplete="off" dir="auto"><button class="btn pri" style="flex:none">שלח</button></form>`, "chat");
  $$("#chMood .chip").forEach(b => b.onclick = () => { chatMood = chatMood === b.dataset.m ? "" : b.dataset.m; LS.set("mood", chatMood); $$("#chMood .chip").forEach(x => x.classList.toggle("sel", x.dataset.m === chatMood)); });
  $$("#chShort .chip").forEach(b => b.onclick = () => sendChat(b.textContent));
  $("#chF").onsubmit = e => { e.preventDefault(); const v = $("#chI").value; $("#chI").value = ""; sendChat(v); };
  renderChat();
}
function openChatSetup() {
  openModal(`<h2>💬 הגדרות הצ'אט</h2><p class="sub">הצ'אט עובד דרך שרת קטן משלך. הסיסמה היא המילה שבחרת כ-APP_TOKEN בהגדרות השרת. היא נשמרת רק בטלפון הזה.</p>
    <label class="fld">כתובת השרת<input id="csU" dir="ltr" inputmode="url" value="${esc(chatUrl())}" placeholder="https://….workers.dev" autocomplete="off"></label>
    <label class="fld">הסיסמה (APP_TOKEN)<input id="csT" dir="ltr" type="password" value="${esc(chatTok())}" autocomplete="off"></label>
    <div class="row"><button class="btn pri wide" id="csOk">שמור ובדוק</button></div><p class="sub" id="csSt"></p>`, "tall");
  $("#csOk").onclick = async () => {
    me.chatUrl = $("#csU").value.trim(); me.chatTok = $("#csT").value.trim(); LS.set("me", me); const st = $("#csSt");
    if (!chatUrl()) { st.textContent = "חסרה כתובת שרת."; return; } st.textContent = "בודק…";
    try { const j = await (await fetch(chatUrl())).json(); st.textContent = j.ready ? "✓ השרת עונה והמפתח מוגדר. אפשר לשלוח הודעה בצ'אט." : "השרת עונה, אבל עוד לא הוגדרו בו ANTHROPIC_API_KEY ו-APP_TOKEN."; }
    catch (e) { st.textContent = "לא הצלחתי להגיע לכתובת הזאת."; }
  };
}
$("#fabChat").onclick = openChat;
