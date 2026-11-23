/* transfer: העברת כל מה ששמור בטלפון בין דפדפנים (Chrome / Safari / האייקון במסך הבית). באייפון כל אחד מהם שומר בנפרד.
   "📤 לשלוח מכאן": אורז את הפרטים, הכרטיסים (כולל הקבצים), סיסמת היומן, התוכנית והיומן, מצפין בטלפון (AES-GCM, קוד של 6 ספרות),
   ומעלה לשרת לזמן קצר. "📥 לקבל לכאן": מדביקים את הקישור, מקלידים את הקוד, והכול נכנס. החבילה נמחקת מהשרת אחרי הקבלה (או אחרי 24 שעות).
   מה שלא עובר: מסלול ה-GPS ומיקום אחרון (נשארים במכשיר), וזיכרונות זמניים (מזג אוויר, תחבורה וכו'). */
"use strict";
const MOVE_KEYS = ["me", "tix", "prep", "arr", "arrA1", "arrA2", "plan", "planV", "planFix1", "planFix2", "planFix3", "marks", "set", "exp", "jr", "jrShare", "jrRe", "jrMig", "jrVis", "jrDel", "free", "rem", "leave", "askQ", "welcomed", "lgSeen", "waHint", "diary", "tixSeen", "updSeen"];
const moveKeyOk = k => MOVE_KEYS.includes(k) || /^pack\./.test(k);
let movePending = null;
(() => { const m = /[#&]move=([a-f0-9]{32})/.exec(location.hash || ""); if (!m) return; movePending = m[1]; try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} })();
const idbAll = () => jdb().then(db => new Promise((res, rej) => { const out = [], tx = db.transaction("img", "readonly"), cur = tx.objectStore("img").openCursor(); cur.onsuccess = () => { const c = cur.result; if (c) { out.push([c.key, c.value]); c.continue(); } }; tx.oncomplete = () => res(out); tx.onerror = () => rej(tx.error); }));
async function moveKey(pin, salt) { const k0 = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveKey"]); return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" }, k0, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]); }
function moveSummary(ls, nFiles) {
  const me2 = (() => { try { return JSON.parse(ls.me || "{}"); } catch (e) { return {}; } })(), tx = (() => { try { return JSON.parse(ls.tix || "{}"); } catch (e) { return {}; } })(), j = (() => { try { return JSON.parse(ls.jr || "[]"); } catch (e) { return []; } })();
  const det = ["rc", "ec", "h1", "h2", "room", "pol", "fullname", "notes"].filter(k => me2[k]).length + ((me2.contacts || []).length ? 1 : 0) + (me2.hotel ? 1 : 0);
  return { det, tix: Object.values(tx).reduce((a, l) => a + l.length, 0), tok: !!(me2.chatTok || "").trim(), jr: j.length, files: nFiles };
}
const sumRows = s => [["🔒 פרטים (קודים, טלפונים, מלון)", s.det ? s.det + " פריטים" : "אין"], ["🎟️ כרטיסים ומסמכים", s.tix ? s.tix + " קבצים" : "אין"], ["🔑 סיסמת היומן להורים", s.tok ? "יש" : "אין"], ["📔 רגעים ביומן", s.jr ? String(s.jr) : "אין"]];
function moveHere() { const ls = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith("prg.") && moveKeyOk(k.slice(4))) ls[k.slice(4)] = localStorage.getItem(k); } return moveSummary(ls, 0); }

/* ---------- לשלוח מכאן ---------- */
async function moveExport(onStep) {
  const ls = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith("prg.") && moveKeyOk(k.slice(4))) ls[k.slice(4)] = localStorage.getItem(k); }
  let files = (await idbAll().catch(() => [])).filter(([k, v]) => v instanceof Blob && !/^drop:/.test(k));
  let total = files.reduce((a, [, b]) => a + b.size, 0);
  if (total > 22e6) { const upIds = new Set(); try { JSON.parse(ls.jr || "[]").forEach(m => (m.media || []).forEach(x => { if (x.full) upIds.add(x.id); })); } catch (e) {} // יותר מדי: מוותרים על קבצי יומן שכבר אצל ההורים (נשארים בשרת)
    files = files.filter(([k]) => !upIds.has(k)); total = files.reduce((a, [, b]) => a + b.size, 0); }
  if (total > 22.5e6) throw new Error("big");
  onStep && onStep("אורז…");
  const man = JSON.stringify({ v: 1, ls, files: files.map(([k, b]) => ({ k, t: b.type || "", n: b.size })) }), mb = new TextEncoder().encode(man), head = new Uint8Array(4); new DataView(head.buffer).setUint32(0, mb.length);
  const plain = new Uint8Array(await new Blob([head, mb, ...files.map(([, b]) => b)]).arrayBuffer());
  const pin = String(crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000), salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  onStep && onStep("מצפין…"); const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await moveKey(pin, salt), plain));
  onStep && onStep("מעלה…"); const r = await fetch(apiUrl() + "/drop", { method: "PUT", headers: { "x-app-token": apiTok(), "content-type": "application/octet-stream" }, body: new Blob([salt, iv, ct]) });
  const j = await r.json().catch(() => ({})); if (!r.ok || !j.id) throw new Error(r.status === 401 ? "auth" : "net");
  return { pin, id: j.id, link: location.origin + location.pathname.replace(/[^/]*$/, "") + "#move=" + j.id, sum: moveSummary(ls, files.length), bytes: plain.length };
}
/* ---------- לקבל לכאן ---------- */
async function moveImport(id, pin, onStep) {
  onStep && onStep("מוריד…"); const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 60000);
  let buf; try { const r = await fetch(apiUrl() + "/drop/" + id, { cache: "no-store", signal: ctl.signal }); if (r.status === 404) throw new Error("gone"); if (!r.ok) throw new Error("net"); buf = new Uint8Array(await r.arrayBuffer()); } catch (e) { throw new Error(e.message === "gone" ? "gone" : "net"); } finally { clearTimeout(to); }
  onStep && onStep("מפענח…"); let pt; try { pt = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: buf.slice(16, 28) }, await moveKey(pin, buf.slice(0, 16)), buf.slice(28))); } catch (e) { throw new Error("pin"); }
  const n = new DataView(pt.buffer).getUint32(0), man = JSON.parse(new TextDecoder().decode(pt.slice(4, 4 + n))); let off = 4 + n;
  const files = man.files.map(f => { const b = new Blob([pt.slice(off, off + f.n)], { type: f.t }); off += f.n; return [f.k, b]; });
  return { man, files, sum: moveSummary(man.ls, files.length) };
}
async function moveApply(id, data) {
  for (const [k, v] of Object.entries(data.man.ls)) { if (!moveKeyOk(k)) continue;
    if (k === "me") { const cur = LS.get("me", {}), inc = JSON.parse(v); localStorage.setItem("prg.me", JSON.stringify({ ...cur, ...inc })); continue; } // ממזגים: מה שכבר הוקלד כאן נשאר אם לא קיים בחבילה
    localStorage.setItem("prg." + k, v); }
  for (const [k, b] of data.files) await imgPut(k, b);
  try { await fetch(apiUrl() + "/drop/" + id, { method: "DELETE" }); } catch (e) { LS.set("dropDel", id); }
}
function openMove(tab) {
  const here = moveHere(), installed = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  openModal(`<h2>📲 העברה בין דפדפנים</h2><p class="sub">באייפון, Chrome, Safari והאייקון במסך הבית שומרים כל אחד בנפרד. כאן מעבירים הכול מאחד לשני, מוצפן, בלי להקליד כלום מחדש.</p>
    <div class="card soft"><b>מה שמור כאן ${installed ? "(באייקון)" : "(בדפדפן הזה)"}</b><ul class="imp">${sumRows(here).map(r => `<li><small>${r[0]}</small><b>${r[1]}</b></li>`).join("")}</ul></div>
    <div class="seg" id="mvTab"><button data-t="in">📥 לקבל לכאן</button><button data-t="out">📤 לשלוח מכאן</button></div><div id="mvBody"></div>`, "tall");
  const tabs = t => { $$("#mvTab button").forEach(b => b.classList.toggle("sel", b.dataset.t === t)); t === "out" ? moveOutUI() : moveInUI(); };
  $$("#mvTab button").forEach(b => b.onclick = () => tabs(b.dataset.t)); tabs(tab || (installed || movePending ? "in" : (here.det || here.tix || here.tok ? "out" : "in")));
}
function moveOutUI() {
  const b = $("#mvBody"), here = moveHere();
  b.innerHTML = `<ol class="steps"><li>לוחצים כאן "לארוז ולשלוח". מקבלים קישור וקוד.</li><li>"📋 להעתיק את הקישור".</li><li>פותחים את המקום השני (למשל האייקון במסך הבית) ← ☰ ← 📲 העברה ← "📥 לקבל לכאן" ← "📋 להדביק" ← מקלידים את הקוד.</li></ol>
    ${!apiTok() ? `<p class="jr-note">🔑 כדי לשלוח צריך את סיסמת היומן כאן (היא זו שמאשרת את ההעלאה). שולחים מהמקום שבו ייבאת את הפרטים.</p>` : ""}
    <button class="btn pri wide big" id="mvGo" ${!apiTok() || !(here.det || here.tix || here.tok || here.jr) ? "disabled" : ""}>📤 לארוז ולשלוח</button><p class="sub" id="mvSt"></p><div id="mvOut"></div>`;
  const go = $("#mvGo"); if (go) go.onclick = async () => { go.disabled = true; const st = $("#mvSt");
    try { const r = await moveExport(t => st.textContent = t); st.textContent = "";
      $("#mvOut").innerHTML = `<div class="card soft"><b>הקוד</b><div class="arr-code" dir="ltr">${r.pin.split("").join("<i></i>")}</div>
        <button class="btn pri wide" id="mvCp">📋 להעתיק את הקישור</button><p class="fine">נשלחו: ${sumRows(r.sum).map(x => x[0].split(" ")[0] + " " + x[1]).join(" · ")} (${fmtMB(r.bytes)}). הקישור עובד 24 שעות, ונמחק מהשרת ברגע שמקבלים אותו.</p></div>`;
      $("#mvCp").onclick = () => { (navigator.clipboard ? navigator.clipboard.writeText(r.link) : Promise.reject()).then(() => toast("הקישור הועתק ✓ עכשיו פותחים את האייקון")).catch(() => prompt("מעתיקים את הקישור:", r.link)); };
    } catch (e) { go.disabled = false; st.textContent = e.message === "big" ? "⚠️ יש כאן יותר מדי קבצים להעברה אחת (מעל 22MB)." : e.message === "auth" ? "⚠️ סיסמת היומן כאן לא תואמת לשרת." : "⚠️ אין חיבור לשרת. בודקים שיש אינטרנט ומנסים שוב."; } };
}
function moveInUI(prefill) {
  const b = $("#mvBody"), id0 = prefill || movePending || "";
  b.innerHTML = `${id0 ? `<p class="sub">✓ קישור העברה התקבל.</p>` : `<label class="fld">קישור ההעברה<textarea id="mvL" rows="2" dir="ltr" placeholder="מדביקים כאן" autocomplete="off"></textarea></label><button class="btn wide" id="mvPaste">📋 להדביק מהלוח</button>`}
    <label class="fld">הקוד (6 ספרות)<input id="mvP" type="tel" inputmode="numeric" maxlength="6" dir="ltr" autocomplete="off" placeholder="••••••"></label>
    <button class="btn pri wide big" id="mvIn">📥 לקבל</button><p class="sub" id="mvSt"></p><div id="mvOut"></div>`;
  const ps = $("#mvPaste"); if (ps) ps.onclick = async () => { try { const t = await navigator.clipboard.readText(); $("#mvL").value = t; } catch (e) { toast("לוחצים לחיצה ארוכה בתיבה ← הדבק"); $("#mvL").focus(); } };
  $("#mvIn").onclick = async () => { const st = $("#mvSt"), m = id0 ? [0, id0] : /move=([a-f0-9]{32})/.exec(($("#mvL") || {}).value || ""), pin = $("#mvP").value.replace(/\D/g, "");
    if (!m) { st.textContent = "לא מצאתי קישור העברה. מעתיקים אותו שוב בצד השני."; return; } if (pin.length !== 6) { st.textContent = "מקלידים את הקוד בן 6 הספרות."; return; }
    $("#mvIn").disabled = true; let data;
    try { data = await moveImport(m[1], pin, t => st.textContent = t); } catch (e) { $("#mvIn").disabled = false; st.textContent = e.message === "pin" ? "⚠️ הקוד לא נכון." : e.message === "gone" ? "⚠️ הקישור כבר נוצל או שפג תוקפו. שולחים שוב מהצד השני." : "⚠️ אין חיבור לשרת. מנסים שוב."; return; }
    st.textContent = "זה מה שייכנס לכאן:"; $("#mvIn").hidden = true;
    $("#mvOut").innerHTML = `<ul class="imp">${sumRows(data.sum).map(r => `<li><small>${r[0]}</small><b>${r[1]}</b></li>`).join("")}</ul><button class="btn pri wide big" id="mvOk">לייבא הכול</button><p class="fine">מה שכבר קיים כאן ולא נמצא בחבילה, נשאר. האפליקציה תיטען מחדש בסוף.</p>`;
    $("#mvOk").onclick = async () => { $("#mvOk").disabled = true; $("#mvOk").textContent = "מייבא…"; try { await moveApply(m[1], data); movePending = null; toast("הכול הועבר לכאן ✓", 2500); setTimeout(() => location.reload(), 1400); } catch (e) { $("#mvOk").disabled = false; $("#mvOk").textContent = "לייבא הכול"; st.textContent = "⚠️ לא הצלחתי לשמור כאן (אולי אין מקום)."; } };
  };
}
/* קישור העברה שנפתח ישר: מחכים שהמסך יהיה פנוי ופותחים את מסך הקבלה */
const moveBoot = setInterval(() => { if (!movePending) return clearInterval(moveBoot); if (window.__booted && $("#splash").hidden && $("#modal").hidden) { clearInterval(moveBoot); openMove("in"); } }, 400);
/* כפתור התפריט בפס העליון */
document.addEventListener("click", e => { if (e.target.closest("#menuBtn")) { buzz(6); openMore(); } });
