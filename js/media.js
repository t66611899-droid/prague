/* media: הכנת תמונות וסרטונים ליומן, בטלפון.
   איכות קודם: אם הקובץ המקורי נכנס במגבלה (24.5MB לקובץ) הוא עולה כמו שהוא. רק אם הוא גדול מדי, מכווצים בעדינות:
   תמונה ברזולוציה מלאה ב-JPEG ~90, סרטון ל-1080p בביטרייט הכי גבוה שנכנס במגבלה.
   בנוסף לכל קובץ: תצוגה מקדימה קלה (לטעינה מהירה אצל ההורים), תמונה זעירה מטושטשת, יחס גובה-רוחב,
   וזמן הצילום ומיקום הצילום מתוך הקובץ עצמו (EXIF בתמונה, mvhd/ISO6709 בסרטון), כדי שתמונה ישנה מהגלריה תיכנס במקום הנכון. */
"use strict";
const MED_MAX = 24500000, VID_MAX_SEC = 20.9, CANVAS_MAX_PX = 16700000; // iOS לא מצייר קנבס מעל ~16.7 מגה-פיקסל
const isVid = f => /^video\//.test(f.type) || /\.(mov|mp4|m4v|webm)$/i.test(f.name || "");
const canvasBlob = (c, type, q) => new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error("blob")), type, q));

/* ---------- זמן ומיקום צילום ---------- */
function exifInfo(buf) { // JPEG בלבד: DateTimeOriginal + OffsetTimeOriginal + GPS
  const d = new DataView(buf); if (d.byteLength < 4 || d.getUint16(0) !== 0xffd8) return {};
  let o = 2; while (o + 4 < d.byteLength) { const m = d.getUint16(o), len = d.getUint16(o + 2); if (m === 0xffe1 && d.getUint32(o + 4) === 0x45786966) return tiff(d, o + 10); if ((m & 0xff00) !== 0xff00 || m === 0xffda) break; o += 2 + len; }
  return {};
  function tiff(d, t) {
    const le = d.getUint16(t) === 0x4949, u16 = p => d.getUint16(p, le), u32 = p => d.getUint32(p, le), out = {};
    const ifd = (p, fn) => { if (p <= 0 || t + p + 2 > d.byteLength) return; const n = u16(t + p); for (let i = 0; i < n; i++) { const e = t + p + 2 + i * 12; if (e + 12 > d.byteLength) return; fn(u16(e), u16(e + 2), u32(e + 4), e + 8); } };
    const str = (cnt, vo) => { let s = "", p = cnt > 4 ? t + u32(vo) : vo; for (let i = 0; i < cnt - 1 && p + i < d.byteLength; i++) s += String.fromCharCode(d.getUint8(p + i)); return s; };
    const rat3 = vo => { const p = t + u32(vo), r = k => u32(p + k * 8) / (u32(p + k * 8 + 4) || 1); return r(0) + r(1) / 60 + r(2) / 3600; };
    let exP = 0, gpP = 0; ifd(8 > 0 ? u32(t + 4) : 0, (tag, ty, cnt, vo) => { if (tag === 0x8769) exP = u32(vo); if (tag === 0x8825) gpP = u32(vo); });
    ifd(exP, (tag, ty, cnt, vo) => { if (tag === 0x9003) out.dto = str(cnt, vo); if (tag === 0x9011) out.off = str(cnt, vo); });
    let la, lo, lar = "N", lor = "E"; ifd(gpP, (tag, ty, cnt, vo) => { if (tag === 1) lar = String.fromCharCode(d.getUint8(vo)); if (tag === 2) la = rat3(vo); if (tag === 3) lor = String.fromCharCode(d.getUint8(vo)); if (tag === 4) lo = rat3(vo); });
    if (la != null && lo != null && (la || lo)) out.gps = { lat: lar === "S" ? -la : la, lng: lor === "W" ? -lo : lo };
    if (out.dto) { const m = /^(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d):(\d\d)/.exec(out.dto); if (m) { const off = /^([+-])(\d\d):(\d\d)$/.exec(out.off || "") , mins = off ? (off[1] === "-" ? -1 : 1) * (+off[2] * 60 + +off[3]) : 60; // בלי אזור זמן: מניחים שעון פראג (חורף, UTC+1)
      out.t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) - mins * 60000; } }
    return out;
  }
}
// מיקום: רק הפורמט של אפל (ISO6709, נגמר ב-/), כדי לא לנחש מבייטים אקראיים
async function movInfo(file) { // MOV/MP4: זמן יצירה (mvhd, UTC) ומיקום (ISO6709 של אפל)
  const out = {}, n = file.size, parts = [[0, Math.min(n, 3e6)], [Math.max(0, n - 3e6), n]];
  for (const [a, b] of parts) { const buf = new Uint8Array(await file.slice(a, b).arrayBuffer());
    for (let i = 0; i < buf.length - 24 && !out.t; i++) if (buf[i] === 0x6d && buf[i + 1] === 0x76 && buf[i + 2] === 0x68 && buf[i + 3] === 0x64) { const dv = new DataView(buf.buffer, i + 4), v = dv.getUint8(0), secs = v === 1 ? Number(dv.getBigUint64(4)) : dv.getUint32(4), t = (secs - 2082844800) * 1000; if (t > Date.UTC(2015, 0, 1) && t < Date.now() + 864e5) out.t = t; }
    if (!out.gps) { let s = ""; for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i] < 128 ? buf[i] : 32); const g = /([+-]\d{2}\.\d{4,})([+-]\d{3}\.\d{4,})([+-]\d+(?:\.\d+)?)?\//.exec(s); if (g) out.gps = { lat: +g[1], lng: +g[2] }; } }
  return out;
}

/* ---------- עזרי תמונה ---------- */
const loadImg = blob => new Promise((res, rej) => { const i = new Image(), u = URL.createObjectURL(blob); i.onload = () => res(Object.assign(i, { _u: u })); i.onerror = () => { URL.revokeObjectURL(u); rej(new Error("img")); }; i.src = u; });
function drawTo(src, w, h, maxSide, maxPx) { let k = Math.min(1, maxSide / Math.max(w, h)); if (maxPx && w * h * k * k > maxPx) k = Math.sqrt(maxPx / (w * h)); const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k)); c.getContext("2d").drawImage(src, 0, 0, c.width, c.height); return c; }
function tinyPh(src, w, h) { const ar = w / h, c = document.createElement("canvas"); c.width = ar >= 1 ? 20 : Math.max(8, Math.round(20 * ar)); c.height = ar >= 1 ? Math.max(8, Math.round(20 / ar)) : 20; c.getContext("2d").drawImage(src, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", 0.5); }

async function prepImage(file) {
  const ex = /jpe?g$/i.test(file.type) || /\.jpe?g$/i.test(file.name || "") ? exifInfo(await file.slice(0, 256 * 1024).arrayBuffer()) : {};
  const img = await loadImg(file), w = img.naturalWidth, h = img.naturalHeight;
  const pvC = drawTo(img, w, h, 1600), pv = await canvasBlob(pvC, "image/jpeg", 0.82), ph = tinyPh(img, w, h);
  let blob = file, ct = file.type, how = "orig";
  const web = /^image\/(jpeg|png|webp|gif)$/.test(file.type);
  if (!web || file.size > MED_MAX) { // HEIC (לא נפתח באנדרואיד) או גדול מדי: JPEG ברזולוציה מלאה באיכות 90
    how = web ? "shrunk" : "converted"; let side = Math.max(w, h), q = 0.9;
    for (let i = 0; i < 6; i++) { const c = drawTo(img, w, h, side, CANVAS_MAX_PX); blob = await canvasBlob(c, "image/jpeg", q); ct = "image/jpeg"; if (blob.size <= MED_MAX) break; if (q > 0.85) q = 0.85; else side = Math.round(side * 0.85); }
  }
  URL.revokeObjectURL(img._u);
  return { k: "i", blob, ct, how, ar: +(w / h).toFixed(3), ph, pv, t: ex.t || null, gps: ex.gps || null, w, h };
}

/* ---------- סרטונים ---------- */
function loadVideo(file) {
  return new Promise((res, rej) => { const v = document.createElement("video"), u = URL.createObjectURL(file); v.muted = true; v.playsInline = true; v.setAttribute("playsinline", ""); v.preload = "auto"; v.src = u;
    const to = setTimeout(() => rej(new Error("meta")), 15000); v.onloadedmetadata = () => { clearTimeout(to); res(Object.assign(v, { _u: u })); }; v.onerror = () => { clearTimeout(to); URL.revokeObjectURL(u); rej(new Error("codec")); }; });
}
const seekTo = (v, t) => new Promise(res => { const done = () => { v.removeEventListener("seeked", done); res(); }; v.addEventListener("seeked", done); v.currentTime = t; setTimeout(done, 4000); });
async function videoProbe(file) { // אורך + תמונת שער, בלי לשנות את הקובץ
  const v = await loadVideo(file), dur = v.duration, w = v.videoWidth || 1920, h = v.videoHeight || 1080;
  await seekTo(v, Math.min(0.2, (dur || 1) / 3)); let pv = null, ph = "";
  try { const c = drawTo(v, w, h, 1600); pv = await canvasBlob(c, "image/jpeg", 0.82); ph = tinyPh(v, w, h); } catch (e) {}
  return { v, dur: isFinite(dur) ? dur : 0, w, h, pv, ph };
}
const recMime = () => ["video/mp4;codecs=avc1.640028,mp4a.40.2", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || "";
/* כיווץ עדין: מנגנים את הסרטון לקנבס ב-1080p ומקליטים בביטרייט הכי גבוה שנכנס ב-24.5MB. לוקח בערך את אורך הסרטון */
async function shrinkVideo(file, probe, ac, onProg, factor = 1) {
  const mime = recMime(); if (!mime) throw new Error("norec");
  const v = probe.v, dur = probe.dur || 20, c = drawTo(v, probe.w, probe.h, 1920), g = c.getContext("2d");
  const vbps = Math.max(1.5e6, Math.min(16e6, Math.floor((MED_MAX * 0.9 * 8) / dur - 192e3) * factor));
  const stream = c.captureStream(30); let audio = null;
  try { if (ac) { const src = ac.createMediaElementSource(v), dst = ac.createMediaStreamDestination(); src.connect(dst); dst.stream.getAudioTracks().forEach(tr => stream.addTrack(tr)); audio = true; v.muted = false; } } catch (e) {}
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: vbps, ...(audio ? { audioBitsPerSecond: 160e3 } : {}) }), chunks = [];
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  await seekTo(v, 0); let stop = false, frames = 0, hid = false; const onVis = () => { if (document.hidden) hid = true; }; document.addEventListener("visibilitychange", onVis);
  const draw = () => { if (stop) return; frames++; if (document.hidden) hid = true; g.drawImage(v, 0, 0, c.width, c.height); onProg && onProg(Math.min(0.99, v.currentTime / dur)); v.requestVideoFrameCallback ? v.requestVideoFrameCallback(draw) : requestAnimationFrame(draw); };
  const ended = new Promise(res => { v.onended = res; setTimeout(res, (dur + 8) * 1000); });
  rec.start(1000); draw(); await v.play().catch(() => {}); await ended; stop = true; rec.stop();
  await new Promise(res => { rec.onstop = res; setTimeout(res, 3000); });
  document.removeEventListener("visibilitychange", onVis);
  // אם המסך כבה או שיצאו מהאפליקציה באמצע, הסרטון יוצא קופצני: עדיף לעצור ולבקש שוב מאשר לשלוח להורים סרטון פגום
  if (hid || frames < dur * 10) { const e = new Error("hidden"); e.frames = frames; throw e; }
  const blob = new Blob(chunks, { type: mime.split(";")[0] }); onProg && onProg(1);
  return blob;
}
async function prepVideo(file, ac, onProg) {
  const mv = await movInfo(file).catch(() => ({})); let probe = null;
  try { probe = await videoProbe(file); } catch (e) { if (file.size > MED_MAX) throw new Error("codec"); } // הדפדפן לא מצליח לפתוח את הסרטון: מעלים כמו שהוא אם הוא נכנס
  if (probe && probe.dur > VID_MAX_SEC) { URL.revokeObjectURL(probe.v._u); const e = new Error("long"); e.dur = probe.dur; throw e; }
  let blob = file, ct = /quicktime|\.mov$/i.test(file.type + file.name) ? "video/mp4" : (file.type || "video/mp4"), how = "orig"; // MOV מוגש כ-mp4: אותו מבנה, ונפתח בעוד דפדפנים
  if (file.size > MED_MAX) { how = "shrunk"; blob = await shrinkVideo(file, probe, ac, onProg); if (blob.size > MED_MAX) { const p2 = await videoProbe(file); blob = await shrinkVideo(file, p2, null, onProg, 0.7); } ct = blob.type || "video/mp4"; }
  const out = { k: "v", blob, ct, how, ar: probe ? +(probe.w / probe.h).toFixed(3) : 1.778, ph: probe ? probe.ph : "", pv: probe ? probe.pv : null, dur: probe ? +probe.dur.toFixed(1) : 0, t: mv.t || null, gps: mv.gps || null, w: probe ? probe.w : 0, h: probe ? probe.h : 0 };
  if (probe) URL.revokeObjectURL(probe.v._u);
  return out;
}
/* בדיקה מהירה לפני השמירה: האם יש סרטון ארוך מדי */
async function videoTooLong(file) { try { const p = await loadVideo(file), d = p.duration; URL.revokeObjectURL(p._u); return isFinite(d) && d > VID_MAX_SEC ? d : 0; } catch (e) { return 0; } }
const prepMedia = (file, ac, onProg) => isVid(file) ? prepVideo(file, ac, onProg) : prepImage(file);
const fmtMB = n => n >= 1e9 ? (n / 1e9).toFixed(2) + " GB" : n >= 1e6 ? (n / 1e6).toFixed(n >= 1e8 ? 0 : 1) + " MB" : Math.max(1, Math.round(n / 1e3)) + " KB";
