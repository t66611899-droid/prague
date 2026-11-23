/* docs: ייבוא כל המסמכים בבת אחת ל"הכרטיסים שלי".
   הקישור (#docs=<מזהה>) מצביע על חבילה מוצפנת ששמורה זמנית בשרת ונמחקת שם בהורדה הראשונה (או אחרי 24 שעות).
   הפענוח נעשה רק בטלפון, עם קוד של 6 ספרות. עד שהקוד נכון, החבילה המוצפנת נשמרת בטלפון כדי שאפשר יהיה לנסות שוב. */
"use strict";
let docsPending = null;
(() => { const m = /[#&]docs=([a-f0-9]{32})/.exec(location.hash || ""); if (!m) return; docsPending = m[1]; try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} })();
const DOC_LBL = { fl1: "✈️ טיסה הלוך", fl2: "🛫 טיסה חזור", hot: "🏨 המלון", boat: "🚢 מסיבת הסירה", dup1: "🎧 Duplex · Music Therapy", epic: "🎧 EPIC", dup2: "🎧 Duplex · Tasty Thursday", ins: "🛡️ ביטוח הראל", door: "🖼️ תמונת הכניסה למלון" };
async function docsDecrypt(buf, pin) {
  const b = new Uint8Array(buf), salt = b.slice(0, 16), iv = b.slice(16, 28), ct = b.slice(28);
  const k0 = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" }, k0, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const pt = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct)), n = new DataView(pt.buffer).getUint32(0);
  const man = JSON.parse(new TextDecoder().decode(pt.slice(4, 4 + n))); let off = 4 + n;
  return man.files.map(f => { const data = pt.slice(off, off + f.size); off += f.size; return { ...f, blob: new Blob([data], { type: f.mime }) }; });
}
async function docsFetch(id) { // מהשרת (ונמחק שם), או מהעותק המוצפן שכבר בטלפון
  const keep = await imgGet("drop:" + id).catch(() => null); if (keep) return keep.arrayBuffer();
  const r = await fetch(apiUrl() + "/drop/" + id, { cache: "no-store" }); if (r.status === 404) throw new Error("gone"); if (!r.ok) throw new Error("net");
  const blob = await r.blob(); await imgPut("drop:" + id, blob).catch(() => {}); return blob.arrayBuffer();
}
async function docsApply(files, id) {
  let n = 0;
  for (const f of files) {
    if (f.k === "door") { await imgPut("hotelDoor", f.blob); n++; continue; }
    const list = (tix[f.k] = (tix[f.k] || []).filter(x => x.name !== f.name)), fid = rid(); // ייבוא חוזר מחליף ולא משכפל
    await imgPut("tk:" + fid, f.blob); const item = { id: fid, name: f.name, pdf: f.kind !== "img", label: f.label || "" };
    if (f.kind === "img") list.unshift(item); else list.push(item); n++; // QR ראשון, הקובץ המקורי מתחתיו
  }
  tixSave(); await imgDel("drop:" + id).catch(() => {}); return n;
}
function openDocsImport(id) {
  openModal(`<h2>📥 לייבא מסמכים?</h2><p class="sub">חבילה מוצפנת עם הכרטיסים והמסמכים לטיול. מפוענחת רק בטלפון הזה ונשמרת ב"הכרטיסים שלי". בשרת היא נמחקת מיד בהורדה.</p>
    <label class="fld">הקוד (6 ספרות)<input id="dcP" type="tel" inputmode="numeric" maxlength="8" dir="ltr" autocomplete="off" placeholder="••••••"></label>
    <button class="btn pri wide" id="dcGo">לפתוח</button><p class="sub" id="dcSt"></p><div id="dcOut"></div>`, "tall");
  const st = $("#dcSt");
  $("#dcGo").onclick = async () => {
    const pin = $("#dcP").value.replace(/\D/g, ""); if (pin.length < 4) { st.textContent = "מקלידים את הקוד שקיבלת."; return; }
    if (!(window.crypto && crypto.subtle)) { st.textContent = "הדפדפן הזה לא תומך בפענוח. פותחים ב-Safari."; return; }
    $("#dcGo").disabled = true; st.textContent = "מוריד ומפענח…"; let buf, files;
    try { buf = await docsFetch(id); } catch (e) { st.textContent = e.message === "gone" ? "⚠️ החבילה כבר לא בשרת (הורדה קודמת, או שעברו 24 שעות). צריך חבילה חדשה." : "⚠️ אין חיבור לשרת כרגע. מנסים שוב כשיש רשת."; $("#dcGo").disabled = false; return; }
    try { files = await docsDecrypt(buf, pin); } catch (e) { st.textContent = "⚠️ הקוד לא נכון. החבילה שמורה בטלפון, אפשר לנסות שוב."; $("#dcGo").disabled = false; return; }
    const groups = {}; files.forEach(f => (groups[f.k] = groups[f.k] || []).push(f));
    $("#dcP").closest("label").hidden = true; $("#dcGo").hidden = true; st.textContent = `${files.length} קבצים בחבילה:`;
    $("#dcOut").innerHTML = `<ul class="imp">${Object.keys(groups).map(k => `<li><small>${DOC_LBL[k] || k}</small><b dir="auto">${groups[k].map(f => esc(k === "door" ? "תמונה" : f.kind === "img" ? "QR לסריקה" : f.name)).join(" · ")}</b></li>`).join("")}</ul><div class="row"><button class="btn pri" id="dcOk" style="flex:2">ייבא הכול</button><button class="btn" data-act="close" style="flex:1">ביטול</button></div>`;
    $("#dcOk").onclick = async () => { $("#dcOk").disabled = true; const n = await docsApply(files, id); docsPending = null; buzz([12, 40, 12]); toast(`${n} מסמכים נשמרו בטלפון ✓`, 3600); openTickets(); };
  };
}
const docsBoot = setInterval(() => { if (!docsPending) return clearInterval(docsBoot); if (window.__booted && $("#splash").hidden && $("#modal").hidden && !impPending) { clearInterval(docsBoot); openDocsImport(docsPending); } }, 400);
