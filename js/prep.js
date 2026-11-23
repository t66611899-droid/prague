/* prep: רשימת מטלות קטנה לפני הטיסה. נשמרת בטלפון. */
"use strict";
const PREP = [
  { k: "esim", ic: "📶", t: "לקנות eSIM", s: "לבדוק מבצעי Black Friday ב-27.11. להתקין בבית, להפעיל רק אחרי הנחיתה." },
  { k: "checkin", ic: "✈️", t: "צ'ק-אין אונליין לטיסה הלוך", s: "נפתח ב-29.11. אחר כך לשמור את כרטיס העלייה ב\"הכרטיסים שלי\".", a: ["🎟️ הכרטיסים שלי", () => openTickets("fl1")] },
  { k: "cash", ic: "💵", t: "להמיר כסף לקרונות", s: "אתה משלם בעיקר במזומן. בפראג מוציאים עוד רק מכספומט של בנק, בחיוב ב-CZK." },
  { k: "pack", ic: "🎒", t: "אריזה", s: "כרטיס LITE: תיק אחד בלבד, עד 55×40×23 ס\"מ ו-8 ק\"ג, בלי תיק אישי נוסף. נוזלים עד 100 מ\"ל. דרכון, מטען נייד, שכבות.", a: ["🎒 מה לקחת", () => openPack()] },
  { k: "charge", ic: "💳", t: "לבדוק שהכרטיס חויב רק פעם אחת", s: "על כרטיסי המסיבות (הייתה הזמנה אחת שנכשלה ב-Duplex)." },
  { k: "hotel", ic: "🏨", t: "לשמור את מספרי החירום של המלון", s: "ב\"הפרטים שלי\", יחד עם קוד הדלת. הם מופיעים אז גם במסך החירום.", a: ["🔒 הפרטים שלי", () => openMe()], auto: () => String(me.h1 || "").replace(/\D/g, "").length >= 8 },
  { k: "sos", ic: "🧪", t: "הודעת בדיקה להורים מה-SOS", s: "לוודא שה-SMS והווטסאפ מגיעים לשניהם.", a: ["🧪 בדיקת חירום", () => openSOS(true)] },
  { k: "tix", ic: "🎟️", t: "לשמור את הכרטיסים בטלפון", s: "EPIC (תמונה), הסירה ו-Duplex (Wallet), אישור המלון.", a: ["🎟️ הכרטיסים שלי", () => openTickets()], auto: () => typeof tixN === "function" && tixN("epic") > 0 }
];
const prepSt = () => { const s = LS.get("prep", {}); PREP.forEach(p => { if (p.auto && p.auto()) s[p.k] = 1; }); return s; };
const prepLeft = () => { const s = prepSt(); return PREP.filter(p => !s[p.k]).length; };
function openPrep() {
  const s = prepSt(), left = PREP.filter(p => !s[p.k]).length;
  openModal(`<h2>✅ לפני הטיסה</h2><p class="sub">${left ? `נשארו ${left} מתוך ${PREP.length}.` : "הכול מוכן. טיסה נעימה! ✈️"}</p>
    <div class="arr-bar"><i style="width:${Math.round((PREP.length - left) / PREP.length * 100)}%"></i></div>
    <div class="prep">${PREP.map((p, i) => `<div class="pr${s[p.k] ? " ok" : ""}"><button class="pr-c" data-pk="${p.k}" aria-label="${s[p.k] ? "לבטל סימון" : "לסמן שבוצע"}">${s[p.k] ? "✓" : p.ic}</button><div><b>${p.t}</b><small>${p.s}</small>${p.a && !s[p.k] ? `<button class="lnk" data-pa="${i}">${p.a[0]}</button>` : ""}</div></div>`).join("")}</div>`, "tall");
  $$("#mbody [data-pk]").forEach(b => b.onclick = () => { const st = LS.get("prep", {}), k = b.dataset.pk; if (prepSt()[k]) delete st[k]; else st[k] = 1; LS.set("prep", st); buzz(8); const y = $("#mbox").scrollTop; openPrep(); $("#mbox").scrollTop = y; });
  $$("#mbody [data-pa]").forEach(b => b.onclick = () => PREP[+b.dataset.pa].a[1]());
}
/* לפני הטיסה: תזכורת עדינה פעם ביום, אם נשאר משהו */
setTimeout(() => { try { const T = tripNow(), n = prepLeft(), day = dstr(T.w); if (T.phase === "during" || !n || LS.get("prepDay") === day || !$("#modal").hidden) return; if (T.w.getTime() > Date.UTC(2026, 10, 30, 17, 25)) return; LS.set("prepDay", day); toastAct(`לפני הטיסה: ${n === 1 ? "נשאר דבר אחד" : "נשארו " + n + " דברים"}`, "לראות", openPrep, 7000); } catch (e) {} }, 12000);
