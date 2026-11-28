// מוסיף לכספת המוצפנת הקיימת של עומר, עם המפתח השמור (~/.prague-vault-key). בלי קישור חדש, בלי QR, בלי קוד:
// הטלפון ממזג את התוספת לבד בפתיחה הבאה. אין כאן שום סוד: המפתח נקרא מקובץ מקומי, וסיסמת ההעלאה נמצאת בתוך הכספת עצמה.
//   node worker/vault-add.mjs --check                              מה יש בכספת (ספירות בלבד, בלי ערכים)
//   node worker/vault-add.mjs --me room=12 --me notes="..."         פרט ב"הפרטים שלי"
//   node worker/vault-add.mjs --ticket fl1 "כרטיס עלייה.pdf" /path/file.pdf "תווית"   קובץ ב"הכרטיסים שלי" (fl1 fl2 hot boat dup1 epic dup2 ins)
//   node worker/vault-add.mjs --door /path/photo.jpg                תמונת הכניסה למלון
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { extname } from "node:path";
import { randomBytes, pbkdf2Sync, createCipheriv, createDecipheriv } from "node:crypto";
const API = "https://prague-api.pages.dev", KF = homedir() + "/.prague-vault-key";
if (!existsSync(KF)) { console.error("אין קובץ מפתח (" + KF + "). לא יוצרים כספת חדשה: זה היה מחייב את עומר לפתוח קישור חדש."); process.exit(1); }
const KEY = readFileSync(KF, "utf8").trim(), id = pbkdf2Sync(KEY, "prg-backup-id-v1", 150000, 32, "sha256").toString("hex");
const open = buf => { if (buf.subarray(0, 4).toString() !== "PBK1") throw new Error("format"); const salt = buf.subarray(4, 20), iv = buf.subarray(20, 32), body = buf.subarray(32, buf.length - 16), tag = buf.subarray(buf.length - 16); const d = createDecipheriv("aes-256-gcm", pbkdf2Sync(KEY, salt, 600000, 32, "sha256"), iv); d.setAuthTag(tag); const pt = Buffer.concat([d.update(body), d.final()]); const n = pt.readUInt32BE(0), man = JSON.parse(pt.subarray(4, 4 + n).toString()); let off = 4 + n; const files = man.files.map(f => { const b = pt.subarray(off, off + f.n); off += f.n; return [f.k, f.t, b]; }); return { ls: man.ls, files }; };
const seal = (ls, files) => { const man = Buffer.from(JSON.stringify({ v: 1, ts: Date.now(), ls, files: files.map(([k, t, b]) => ({ k, t, n: b.length })) })), head = Buffer.alloc(4); head.writeUInt32BE(man.length); const plain = Buffer.concat([head, man, ...files.map(f => f[2])]), salt = randomBytes(16), iv = randomBytes(12), c = createCipheriv("aes-256-gcm", pbkdf2Sync(KEY, salt, 600000, 32, "sha256"), iv); return Buffer.concat([Buffer.from("PBK1"), salt, iv, c.update(plain), c.final(), c.getAuthTag()]); };
const get = async p => { const r = await fetch(`${API}/backup/${id}/${p}`, { cache: "no-store" }); if (!r.ok) throw new Error(`הכספת לא נמצאה (${p}: ${r.status})`); return open(Buffer.from(await r.arrayBuffer())); };
const D = await get("d"), T = await get("t"), me = JSON.parse(D.ls.me || "{}"), tix = JSON.parse(T.ls.tix || "{}");
const count = () => Object.entries(tix).filter(([k]) => k !== "pv").map(([, l]) => l).reduce((a, l) => a + l.filter(it => T.files.some(f => f[0] === "tk:" + it.id)).length, 0) + (D.files.some(f => f[0] === "hotelDoor") ? 1 : 0);
const args = process.argv.slice(2), MIME = { ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".pkpass": "application/vnd.apple.pkpass", ".json": "application/json" };
let changedD = false, changedT = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--me") { const [k, ...v] = args[++i].split("="); me[k] = v.join("="); changedD = true; }
  else if (args[i] === "--door") { const b = readFileSync(args[++i]); D.files = D.files.filter(f => f[0] !== "hotelDoor").concat([["hotelDoor", "image/jpeg", b]]); changedD = true; }
  else if (args[i] === "--ticket") { const k = args[++i], name = args[++i], file = args[++i], label = args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : ""; const mime = MIME[extname(file).toLowerCase()] || "application/octet-stream", fid = randomBytes(6).toString("hex"), isImg = mime.startsWith("image/");
    tix[k] = (tix[k] || []).filter(it => { if (it.name !== name) return true; T.files = T.files.filter(f => f[0] !== "tk:" + it.id); return false; }); // אותו שם = מחליף, לא משכפל
    const item = { id: fid, name, pdf: !isImg && mime !== "application/json", label }; if (isImg) tix[k].unshift(item); else tix[k].push(item); T.files.push(["tk:" + fid, mime, readFileSync(file)]); changedT = true; }
}
const put = async (p, ls, files) => { const body = seal(ls, files), r = await fetch(`${API}/backup/${id}/${p}`, { method: "PUT", headers: { "x-app-token": me.chatTok || "", "content-type": "application/octet-stream" }, body }); if (!r.ok) throw new Error(`העלאה נכשלה (${p}: ${r.status})`); return body.length; };
if (changedD) console.log("עודכן חלק הפרטים:", await put("d", { ...D.ls, me: JSON.stringify(me) }, D.files), "bytes");
if (changedT) console.log("עודכן חלק הכרטיסים:", await put("t", { ...T.ls, tix: JSON.stringify(tix) }, T.files), "bytes");
console.log(`הכספת: ${count()} מתוך 13 פריטים · ${Object.keys(me).filter(k => me[k] && (typeof me[k] !== "object" || Object.keys(me[k]).length)).length} שדות פרטים · סיסמת יומן: ${me.chatTok ? "יש" : "אין"} · קטגוריות: ${Object.entries(tix).map(([k, l]) => k + "=" + l.length).join(" ")}`);
