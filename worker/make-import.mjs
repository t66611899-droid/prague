// יוצר קישור ייבוא מוצפן ל"הפרטים שלי" מתוך קובץ JSON מקומי. הקובץ עצמו והקישור לא שייכים למאגר.
// שימוש: node worker/make-import.mjs <path-to-details.json> <pin> [base-url]
import { readFileSync } from "node:fs";
import { webcrypto as crypto } from "node:crypto";
const [, , file, pin, base = "https://t66611899-droid.github.io/prague/"] = process.argv;
if (!file || !/^\d{4,8}$/.test(pin || "")) { console.error("usage: node make-import.mjs details.json <4-8 digit pin> [base-url]"); process.exit(1); }
const data = JSON.parse(readFileSync(file, "utf8")), salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
const k0 = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" }, k0, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(data))));
const out = Buffer.concat([salt, iv, ct]).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
process.stdout.write(base + "#import=" + out + "\n");
