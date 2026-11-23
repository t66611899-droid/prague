/* tickets: "הכרטיסים שלי". קבצים (צילום QR / PDF) נשמרים רק בטלפון (IndexedDB), עובדים בלי אינטרנט.
   כל כרטיס משויך לאירוע, וקופץ לבד שעתיים לפני ובהגעה למקום. בקוד יש רק שמות האירועים והשעות, בלי מספרי הזמנה. */
"use strict";
const TIX_EV = [ // h = שעון פראג
  { k: "fl1",  ic: "✈️", n: "טיסה הלוך · QS1285", sub: "30.11 · המראה 18:25 (שעון ישראל) · טרמינל 3", date: "2026-11-30", h: "17:25", hint: "כרטיס עלייה למטוס אחרי הצ'ק-אין. כרטיס LITE: תיק אחד עד 8 ק\"ג, בלי מזוודה לבטן." },
  { k: "hot",  ic: "🏨", n: "המלון", sub: "30.11 עד 4.12 · צ'ק-אין עצמי", date: "2026-11-30", h: "22:30", at: "hotel", hint: "אישור ההזמנה מ-Booking." },
  { k: "boat", ic: "🚢", n: "מסיבת הסירה · Duplex Boat Party", sub: "1.12 · דלתות 19:00 · Regular Wave 1 · הרציף ושעת העלייה רק בכרטיס", date: "2026-12-01", h: "19:00", hint: "הכרטיס כבר ב-Apple Wallet. כדאי לשמור כאן גם צילום מסך, ולבדוק בו את הרציף ושעת העלייה." },
  { k: "dup1", ic: "🎧", n: "Duplex · אפטר-פארטי", sub: "1.12 · Tuesday Music Therapy · כניסה כלולה", date: "2026-12-01", h: "22:00", at: "duplex", hint: "כרטיס נפרד (חינם) באותה הזמנה של הסירה." },
  { k: "epic", ic: "🎧", n: "EPIC · Erasmus Winter Party", sub: "2.12 · דלתות 22:00 · כרטיס Basic", date: "2026-12-02", h: "22:00", at: "epic", hint: "ה-PDF עם ה-QR מהמייל Vstupenky. אין ביטולים." },
  { k: "dup2", ic: "🎧", n: "Duplex · Tasty Thursday", sub: "3.12 בלילה · Regular, בלי הגבלת שעה · להגיע 00:00–01:00", date: "2026-12-03", h: "24:00", at: "duplex", hint: "הכרטיס מהקישור Download במייל השני של Duplex." },
  { k: "fl2",  ic: "🛫", n: "טיסה חזור · QS1284", sub: "4.12 · המראה 12:45 · הדלפק נסגר 12:05 · טרמינל 1", date: "2026-12-04", h: "12:45", at: "airport", hint: "כרטיס עלייה למטוס אחרי הצ'ק-אין." },
  { k: "ins",  ic: "🛡️", n: "ביטוח נסיעות", sub: "הפוליסה ומספר המוקד", hint: "PDF של הפוליסה. כדאי שיהיה זמין גם בלי אינטרנט." }
];
let tix = LS.get("tix", {});
const tixSave = () => LS.set("tix", tix);
const evTs = e => { if (!e.date) return null; const [y, mo, d] = e.date.split("-").map(Number), [h, m] = e.h.split(":").map(Number); return Date.UTC(y, mo - 1, d, h, m); }; // באותו ציר של wall()
const tixN = k => (tix[k] || []).length;
function tixState(e) { const t = evTs(e); if (t == null) return ""; const d = (t - wall().getTime()) / 60000; return d > 120 ? "" : d > -240 ? "now" : "past"; }
function openTickets(focus) {
  const total = TIX_EV.reduce((a, e) => a + tixN(e.k), 0);
  openModal(`<h2>🎟️ הכרטיסים שלי</h2><p class="sub">צילום מסך של ה-QR או קובץ PDF. נשמר רק בטלפון הזה ועובד בלי אינטרנט. ${total ? "" : "מוסיפים פעם אחת בבית, לפני הטיסה."}</p>
    <div class="tix">${TIX_EV.map(e => { const fs = tix[e.k] || [], st = tixState(e);
      return `<section class="tk ${st}${focus === e.k ? " focus" : ""}" data-k="${e.k}"><header><span>${e.ic}</span><div><b>${e.n}</b><small>${e.sub}</small></div>${st === "now" ? `<i class="tk-now">עכשיו</i>` : ""}</header>
        ${fs.length ? `<div class="tk-f">${fs.map(f => `<button class="tk-i" data-id="${f.id}"><span>${f.pdf ? (/\.pkpass$/i.test(f.name) ? "🎫" : "📄") : "🔳"}</span><b>${esc(f.name)}</b><small>${f.label || (f.pdf ? (/\.pkpass$/i.test(f.name) ? "להוסיף ל-Wallet" : "PDF") : "להצגה במסך מלא")}</small><i data-x="${f.id}" aria-label="מחק">✕</i></button>`).join("")}</div>` : `<p class="fine">${e.hint}</p>`}
        <label class="btn${fs.length ? "" : " pri"} wide" style="display:flex;margin-top:8px">➕ ${fs.length ? "להוסיף עוד" : "להוסיף כרטיס"}<input type="file" accept="image/*,application/pdf" multiple hidden data-add="${e.k}"></label></section>`; }).join("")}</div>
    <p class="fine">טיפ: ל-QR הכי נוח צילום מסך של הקוד. PDF נפתח בתצוגת הקבצים של הטלפון. בכניסה למועדון צריך גם תעודה מזהה פיזית.</p>`, "tall");
  if (focus) { const el = $(`#mbody .tk[data-k="${focus}"]`); if (el) el.scrollIntoView({ block: "center" }); }
  $$("#mbody [data-add]").forEach(inp => inp.onchange = async () => { const k = inp.dataset.add; let ok = 0;
    for (const file of [...inp.files].slice(0, 6)) { try { const pdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name), id = rid(); if (!pdf && file.size > 4e6) await imgPut("tk:" + id, await shrinkTo(file, 2400, 0.92, true)); else await imgPut("tk:" + id, file.slice(0, file.size, file.type || (pdf ? "application/pdf" : "image/jpeg")));
        (tix[k] = tix[k] || []).push({ id, name: (file.name || (pdf ? "כרטיס.pdf" : "כרטיס")).slice(0, 40), pdf }); ok++; } catch (e) {} }
    tixSave(); toast(ok ? "נשמר בטלפון ✓" : "לא הצלחתי לשמור את הקובץ"); openTickets(k); });
  $$("#mbody .tk-i").forEach(b => b.onclick = async ev => { const k = b.closest(".tk").dataset.k;
    if (ev.target.dataset.x) { if (!confirm("למחוק את הקובץ הזה מהטלפון?")) return; tix[k] = (tix[k] || []).filter(f => f.id !== ev.target.dataset.x); tixSave(); imgDel("tk:" + ev.target.dataset.x).catch(() => {}); return openTickets(k); }
    showTicket(k, b.dataset.id); });
}
/* מסך מלא על רקע לבן, כדי שהסורק בכניסה יקרא בקלות */
async function showTicket(k, id) {
  const e = TIX_EV.find(x => x.k === k), fs = tix[k] || [], f = fs.find(x => x.id === id) || fs[0]; if (!f) return openTickets(k);
  let blob; try { blob = await imgGet("tk:" + f.id); } catch (err) {} if (!blob) return toast("הקובץ לא נמצא בטלפון. צריך להוסיף אותו שוב");
  const url = URL.createObjectURL(blob);
  if (f.pdf) { const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 120000); return; }
  let v = $("#tkView"); if (!v) { v = document.createElement("div"); v.id = "tkView"; document.body.appendChild(v); }
  const imgs = fs.filter(x => !x.pdf), i = imgs.indexOf(f);
  v.innerHTML = `<header><b>${e.ic} ${e.n}</b><button aria-label="סגור">✕</button></header><img src="${url}" alt="הכרטיס"><footer>${imgs.length > 1 ? `<button data-go="${imgs[(i + 1) % imgs.length].id}">הכרטיס הבא (${i + 1}/${imgs.length})</button>` : ""}<small>☀️ להגביר את בהירות המסך · תעודה מזהה ביד</small></footer>`;
  v.hidden = false; let lock = null; try { if (navigator.wakeLock) lock = await navigator.wakeLock.request("screen"); } catch (err) {}
  const close = () => { v.hidden = true; v.innerHTML = ""; URL.revokeObjectURL(url); if (lock) lock.release().catch(() => {}); };
  v.querySelector("header button").onclick = close; const go = v.querySelector("[data-go]"); if (go) go.onclick = () => { close(); showTicket(k, go.dataset.go); };
}
/* קופץ לבד: שעתיים לפני האירוע, ובהגעה למקום */
function tixAuto() {
  if (!$("#modal").hidden || !$("#splash").hidden || ($("#tkView") && !$("#tkView").hidden)) return; const seen = LS.get("tixSeen", {}), now = wall().getTime();
  for (const e of TIX_EV) { const t = evTs(e); if (t == null) continue; const d = (t - now) / 60000, l = e.at && place(e.at), near = l && gps && d < 240 && d > -300 && hav(gps, l) < 160;
    const why = near && !seen[e.k + "g"] ? "g" : d <= 120 && d > -90 && !seen[e.k + "t"] ? "t" : ""; if (!why) continue;
    seen[e.k + why] = 1; if (why === "g") seen[e.k + "t"] = 1; LS.set("tixSeen", seen); buzz([15, 50, 15]);
    if (tixN(e.k)) { const f = tix[e.k].find(x => !x.pdf); if (f) showTicket(e.k, f.id); else openTickets(e.k); toast(why === "g" ? `🎟️ הגעת. הכרטיס ל${e.n.split(" · ")[0]} מוכן` : `🎟️ בעוד פחות משעתיים: ${e.n}`, 4200); }
    else toastAct(`🎟️ ${e.n}: עוד לא הוספת כרטיס`, "להוסיף", () => openTickets(e.k), 7000);
    return; }
}
setInterval(tixAuto, 20000); setTimeout(tixAuto, 8000);
