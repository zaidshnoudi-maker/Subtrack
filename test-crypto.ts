import { randomBytes } from "node:crypto";
process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
const { encryptToken, decryptToken } = await import("../src/lib/crypto");

const token = "1//0gExampleRefreshToken-abc_123";
const enc = encryptToken(token);
const ok1 = enc.startsWith("v1:") && !enc.includes(token);
const ok2 = decryptToken(enc) === token;
const ok3 = decryptToken(token) === token; // legacy plaintext still readable
let ok4 = false;
try { decryptToken(enc.slice(0, -4) + "AAAA"); } catch { ok4 = true; } // tampering detected
console.log(ok1 ? "ok  " : "FAIL", "token is encrypted");
console.log(ok2 ? "ok  " : "FAIL", "decrypts back to original");
console.log(ok3 ? "ok  " : "FAIL", "legacy plaintext tokens still work");
console.log(ok4 ? "ok  " : "FAIL", "tampered value is rejected");
if (!(ok1 && ok2 && ok3 && ok4)) process.exitCode = 1;
