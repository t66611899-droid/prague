/* docs: ייבוא כל המסמכים בבת אחת ל"הכרטיסים שלי".
   הקישור (#docs=<מזהה>) מצביע על חבילה מוצפנת ששמורה זמנית בשרת. הפענוח נעשה רק בטלפון, עם קוד של 6 ספרות.
   החבילה נמחקת מהשרת רק אחרי שהפענוח והשמירה הצליחו (או אחרי 24 שעות). עד אז אפשר לנסות שוב,
   ומה שכבר ירד נשמר מוצפן בטלפון כדי לא להוריד שוב. */
"use strict";
let docsPending = null;
(() => { const m = /[#&]docs=([a-f0-9]{32})/.exec(location.hash || ""); if (!m) return; docsPending = m[1]; try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} })();
const DOC_LBL = { fl1: "✈️ טיסה הלוך", fl2: "🛫 טיסה חזור", hot: "🏨 המלון", boat: "🚢 מסיבת הסירה", dup1: "🎧 Duplex · Music Therapy", epic: "🎧 EPIC", dup2: "🎧 Duplex · Tasty Thursday", ins: "🛡️ ביטוח הראל", door: "🖼️ תמונת הכניסה למלון" };
const DOC_STALL = 25000, DOC_CONNECT = 30000; // בלי אף בית חדש 25 שניות = תקוע; 30 שניות עד שהשרת עונה
async function docsDecrypt(buf, pin) {
  const b = new Uint8Array(buf), salt = b.slice(0, 16), iv = b.slice(16, 28), ct = b.slice(28);
  const k0 = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" }, k0, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const pt = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct)), n = new DataView(pt.buffer).getUint32(0);
  const man = JSON.parse(new TextDecoder().decode(pt.slice(4, 4 + n))); let off = 4 + n;
  return man.files.map(f => { const data = pt.slice(off, off + f.size); off += f.size; return { ...f, blob: new Blob([data], { type: f.mime }) }; });
}
/* הורדה עם אחוזים. אם אין התקדמות זמן מה, עוצרים עם הודעה ברורה במקום להיתקע */
async function docsFetch(id, onProg) {
  const keep = await imgGet("drop:" + id).catch(() => null); if (keep) { onProg(1, keep.size, keep.size); return keep.arrayBuffer(); }
  if (isOffline()) throw new Error("offline");
  const ctl = new AbortController(); let why = "", tm = setTimeout(() => { why = "connect"; ctl.abort(); }, DOC_CONNECT);
  try {
    const r = await fetch(apiUrl() + "/drop/" + id, { cache: "no-store", signal: ctl.signal }); clearTimeout(tm);
    if (r.status === 404) throw new Error("gone"); if (!r.ok) throw new Error("net");
    const total = +r.headers.get("content-length") || 0, chunks = []; let got = 0;
    const arm = () => { clearTimeout(tm); tm = setTimeout(() => { why = "stall"; ctl.abort(); }, DOC_STALL); };
    if (r.body && r.body.getReader) { const rd = r.body.getReader(); arm(); for (;;) { const { done, value } = await rd.read(); if (done) break; chunks.push(value); got += value.length; arm(); onProg(total ? got / total : 0, got, total); } clearTimeout(tm); }
    else { arm(); const b = new Uint8Array(await r.arrayBuffer()); clearTimeout(tm); chunks.push(b); got = b.length; onProg(1, got, got); }
    if (total && got < total) throw new Error("stall");
    const blob = new Blob(chunks); await imgPut("drop:" + id, blob).catch(() => {}); return blob.arrayBuffer();
  } catch (e) { clearTimeout(tm); if (e.name === "AbortError") throw new Error(why || "stall"); if (e.message === "gone" || e.message === "net") throw e; throw new Error("net"); }
}
async function docsApply(files, id) {
  let n = 0;
  for (const f of files) {
    if (f.k === "door") { await imgPut("hotelDoor", f.blob); n++; continue; }
    const list = (tix[f.k] = (tix[f.k] || []).filter(x => x.name !== f.name)), fid = rid(); // ייבוא חוזר מחליף ולא משכפל
    await imgPut("tk:" + fid, f.blob); const item = { id: fid, name: f.name, pdf: f.kind !== "img", label: f.label || "" };
    if (f.kind === "img") list.unshift(item); else list.push(item); n++; // QR ראשון, הקובץ המקורי מתחתיו
  }
  tixSave(); await imgDel("drop:" + id).catch(() => {});
  try { await fetch(apiUrl() + "/drop/" + id, { method: "DELETE" }); } catch (e) { LS.set("dropDel", id); } // אם אין רשת עכשיו, ננסה שוב אחר כך
  return n;
}
const kb = n => n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.round(n / 1024) + " KB";
const DOC_ERR = { offline: "📡 אין אינטרנט כרגע. מתחברים ל-Wi-Fi או מחכים לקליטה, ולוחצים \"לנסות שוב\".", connect: "⏱️ השרת לא ענה תוך 30 שניות. כנראה הקליטה חלשה. כדאי לעבור ל-Wi-Fi ולנסות שוב.", stall: "⏱️ ההורדה נתקעה (אין התקדמות 25 שניות). כדאי לעבור ל-Wi-Fi ולנסות שוב. החבילה עדיין בשרת.", net: "⚠️ לא הצלחתי להגיע לשרת. בודקים שיש אינטרנט ולוחצים \"לנסות שוב\".", gone: "⚠️ החבילה כבר לא בשרת (הייבוא כבר הצליח, או שעברו 24 שעות). צריך חבילה חדשה." };
function openDocsImport(id) {
  openModal(`<h2>📥 לייבא מסמכים?</h2><p class="sub">חבילה מוצפנת עם הכרטיסים והמסמכים לטיול. מפוענחת רק בטלפון הזה ונשמרת ב"הכרטיסים שלי". מהשרת היא נמחקת אחרי שהייבוא מצליח.</p>
    <label class="fld">הקוד (6 ספרות)<input id="dcP" type="tel" inputmode="numeric" maxlength="8" dir="ltr" autocomplete="off" placeholder="••••••"></label>
    <button class="btn pri wide" id="dcGo">לפתוח</button>
    <div class="dc-prog" id="dcProg" hidden><div class="arr-bar"><i id="dcBar" style="width:0%"></i></div><small id="dcPct">0%</small></div>
    <p class="sub" id="dcSt"></p><div id="dcOut"></div>`, "tall");
  const st = $("#dcSt"), go = $("#dcGo"), prog = $("#dcProg");
  const prg = (f, got, total) => { prog.hidden = false; $("#dcBar").style.width = Math.round(f * 100) + "%"; $("#dcPct").textContent = total ? `${Math.round(f * 100)}% · ${kb(got)} מתוך ${kb(total)}` : kb(got); };
  const fail = msg => { st.textContent = msg; go.disabled = false; go.textContent = "🔄 לנסות שוב"; };
  go.onclick = async () => {
    const pin = $("#dcP").value.replace(/\D/g, ""); if (pin.length < 4) { st.textContent = "מקלידים את הקוד שקיבלת."; return; }
    if (!(window.crypto && crypto.subtle)) { st.textContent = "הדפדפן הזה לא תומך בפענוח. פותחים ב-Safari."; return; }
    go.disabled = true; go.textContent = "מוריד…"; st.textContent = "מוריד את החבילה המוצפנת…"; let buf, files;
    try { buf = await docsFetch(id, prg); } catch (e) { return fail(DOC_ERR[e.message] || DOC_ERR.net); }
    go.textContent = "מפענח…"; st.textContent = "מפענח בטלפון…";
    try { files = await docsDecrypt(buf, pin); } catch (e) { st.textContent = "⚠️ הקוד לא נכון. מה שירד כבר שמור בטלפון, מקלידים שוב ולוחצים."; go.disabled = false; go.textContent = "לפתוח"; return; }
    const groups = {}; files.forEach(f => (groups[f.k] = groups[f.k] || []).push(f));
    $("#dcP").closest("label").hidden = true; go.hidden = true; prog.hidden = true; st.textContent = `${files.length} קבצים בחבילה:`;
    $("#dcOut").innerHTML = `<ul class="imp">${Object.keys(groups).map(k => `<li><small>${DOC_LBL[k] || k}</small><b dir="auto">${groups[k].map(f => esc(k === "door" ? "תמונה" : f.kind === "img" ? "QR לסריקה" : f.name)).join(" · ")}</b></li>`).join("")}</ul><div class="row"><button class="btn pri" id="dcOk" style="flex:2">ייבא הכול</button><button class="btn" data-act="close" style="flex:1">ביטול</button></div>`;
    $("#dcOk").onclick = async () => { $("#dcOk").disabled = true; $("#dcOk").textContent = "שומר…"; try { const n = await docsApply(files, id); docsPending = null; buzz([12, 40, 12]); toast(`${n} מסמכים נשמרו בטלפון ✓`, 3600); openTickets(); } catch (e) { $("#dcOk").disabled = false; $("#dcOk").textContent = "🔄 לנסות שוב"; st.textContent = "⚠️ לא הצלחתי לשמור בטלפון (אולי אין מקום). מנסים שוב."; } };
  };
}
const docsBoot = setInterval(() => { if (!docsPending) return clearInterval(docsBoot); if (window.__booted && $("#splash").hidden && $("#modal").hidden && !impPending) { clearInterval(docsBoot); openDocsImport(docsPending); } }, 400);
/* מחיקה שלא הספיקה לצאת (בלי רשת ברגע הייבוא) יוצאת כשהרשת חוזרת */
const docsDelLater = () => { const id = LS.get("dropDel", ""); if (!id || isOffline()) return; fetch(apiUrl() + "/drop/" + id, { method: "DELETE" }).then(r => { if (r.ok) LS.del("dropDel"); }).catch(() => {}); };
addEventListener("online", docsDelLater); setTimeout(docsDelLater, 8000);
