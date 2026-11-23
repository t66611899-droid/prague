/* import: ייבוא "הפרטים שלי" מקישור מוצפן (למשל מסריקת QR), במקום להקליד הכול בטלפון.
   הפרטים נמצאים רק אחרי ה-# בכתובת, והחלק הזה לא נשלח לשום שרת. הם מוצפנים ב-AES-GCM עם קוד קצר שמקלידים כאן.
   ה-# נמחק מהכתובת מיד כשהדף עולה, כדי שלא יישאר בהיסטוריה. הפענוח והשמירה נעשים רק בטלפון. */
"use strict";
const IMP_ITER = 600000;
let impPending = null;
(() => { const m = /[#&]import=([A-Za-z0-9_-]{40,})/.exec(location.hash || ""); if (!m) return; impPending = m[1]; try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { try { location.hash = ""; } catch (e2) {} } })();
const impBytes = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), c => c.charCodeAt(0));
async function impDecrypt(payload, pin) {
  const b = impBytes(payload), salt = b.slice(0, 16), iv = b.slice(16, 28), ct = b.slice(28);
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: IMP_ITER, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct)));
}
const IMP_LBL = { rc: "קוד דלת הקבלה", ec: "קוד כניסת החדרים", h1: "חירום מלון 1", h2: "חירום מלון 2", room: "מספר החדר", ins: "מוקד הביטוח", pol: "מספר פוליסה" };
function impRows(d) {
  const r = [], m = d.me || {}; if (m.hotel && m.hotel.q) r.push(["🏨 כתובת המלון", m.hotel.q]);
  Object.keys(IMP_LBL).forEach(k => { if (m[k]) r.push([IMP_LBL[k], m[k]]); });
  (m.contactsAll || []).forEach(c => { if (c && c.p) r.push(["📞 " + (c.n || "איש קשר"), c.p]); });
  if (m.notes) r.push(["📝 מספרי הזמנה והערות", m.notes.split("\n").filter(Boolean).length + " שורות"]);
  return r;
}
function impApply(d) {
  const m = d.me || {}; ["rc", "ec", "h1", "h2", "room", "ins", "pol"].forEach(k => { if (m[k]) me[k] = String(m[k]); });
  if (m.hotel && typeof m.hotel.lat === "number" && typeof m.hotel.lng === "number") me.hotel = { lat: m.hotel.lat, lng: m.hotel.lng, q: String(m.hotel.q || "") };
  if (Array.isArray(m.contactsAll) && m.contactsAll.length) { me.contactsAll = [0, 1, 2].map(i => ({ n: String((m.contactsAll[i] || {}).n || ""), p: String((m.contactsAll[i] || {}).p || "") })); me.contacts = me.contactsAll.filter(c => waNum(c.p).length >= 9); }
  if (m.notes) { const cur = (me.notes || "").trim(); me.notes = !cur ? m.notes : cur.includes(m.notes.trim()) ? cur : cur + "\n" + m.notes; }
  LS.set("me", me); try { renderAll(); } catch (e) {}
}
function openImport(payload) {
  let data = null;
  openModal(`<h2>📥 לייבא את הפרטים?</h2><p class="sub">הפרטים מוצפנים בתוך הקישור. הם מפוענחים ונשמרים רק בטלפון הזה, ולא נשלחים לשום מקום.</p>
    ${payload ? "" : `<label class="fld">הקישור מהסריקה<textarea id="impL" rows="3" dir="ltr" placeholder="מדביקים כאן את הקישור המלא" autocomplete="off"></textarea></label>`}
    <label class="fld">הקוד (4 עד 6 ספרות)<input id="impP" type="tel" inputmode="numeric" maxlength="8" dir="ltr" autocomplete="off" placeholder="••••••"></label>
    <button class="btn pri wide" id="impGo">לפתוח</button><p class="sub" id="impSt"></p><div id="impOut"></div>`, "tall");
  const st = $("#impSt");
  $("#impGo").onclick = async () => {
    let p = payload; if (!p) { const m = /import=([A-Za-z0-9_-]{40,})/.exec($("#impL").value) || /^\s*([A-Za-z0-9_-]{40,})\s*$/.exec($("#impL").value); if (!m) { st.textContent = "לא מצאתי קישור ייבוא בטקסט שהודבק."; return; } p = m[1]; }
    const pin = $("#impP").value.replace(/\D/g, ""); if (pin.length < 4) { st.textContent = "מקלידים את הקוד שמופיע ליד ה-QR."; return; }
    if (!(window.crypto && crypto.subtle)) { st.textContent = "הדפדפן הזה לא תומך בפענוח. פותחים את הקישור ב-Safari."; return; }
    st.textContent = "מפענח…"; $("#impGo").disabled = true;
    try { data = await impDecrypt(p, pin); } catch (e) { st.textContent = "⚠️ הקוד לא נכון, או שהקישור לא שלם."; $("#impGo").disabled = false; return; }
    const rows = impRows(data); st.textContent = rows.length ? "זה מה שייכנס לטלפון:" : "הקישור נפתח, אבל אין בו פרטים.";
    $("#impGo").hidden = true; $("#impP").closest("label").hidden = true; const l = $("#impL"); if (l) l.closest("label").hidden = true;
    $("#impOut").innerHTML = `<ul class="imp">${rows.map(r => `<li><small>${esc(r[0])}</small><b dir="auto">${esc(r[1])}</b></li>`).join("")}</ul>${rows.length ? `<div class="row"><button class="btn pri" id="impOk" style="flex:2">ייבא</button><button class="btn" data-act="close" style="flex:1">ביטול</button></div><p class="fine">ערכים שכבר קיימים בטלפון יוחלפו במה שמופיע כאן.</p>` : ""}`;
    const ok = $("#impOk"); if (ok) ok.onclick = () => { impApply(data); impPending = null; buzz([12, 40, 12]);
      openModal(`<h2>✅ הפרטים נשמרו</h2><p class="sub">${rows.length} פרטים נכנסו ל"הפרטים שלי". הם שמורים רק בטלפון הזה.</p><div class="col"><button class="btn wide" id="impA">🏨 לראות במדריך "מגיעים למלון"</button><button class="btn wide" id="impS">🆘 לראות במסך החירום</button><button class="btn wide" id="impM">🔒 הפרטים שלי</button></div><p class="fine">נשארה רק תמונת הכניסה למלון: מוסיפים אותה מהגלריה ב"הפרטים שלי".</p>`, "tall");
      $("#impA").onclick = () => openArrive("rec"); $("#impS").onclick = () => openSOS(); $("#impM").onclick = () => openMe(); };
  };
}
/* קישור ייבוא שנפתח ישר באפליקציה: מחכים שהמסך יהיה פנוי, ואז שואלים */
const impBoot = setInterval(() => { if (!impPending) return clearInterval(impBoot); if (window.__booted && $("#splash").hidden && $("#modal").hidden) { clearInterval(impBoot); openImport(impPending); } }, 400);
/* וגם ידנית, מתוך "הפרטים שלי" (למשל כשמדביקים קישור שהועתק מהסריקה) */
window.openMe = (old => function () { old.apply(this, arguments); const s = $("#mbody .sub"); if (!s || $("#meImp")) return; s.insertAdjacentHTML("afterend", `<button class="btn wide" id="meImp" style="margin:0 0 10px">📥 לייבא פרטים מקישור / QR</button>`); $("#meImp").onclick = () => openImport(impPending || ""); })(window.openMe);
