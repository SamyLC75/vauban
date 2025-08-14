// src/services/crypto.service.ts
import crypto from "crypto";

// Get the encryption key from environment
const key = process.env.ENCRYPTION_KEY || "9a0a8447ef07a5157cc55e2789475f1421147dd56d04209253defc4ec0fe89a0";

// Convert hex string to Buffer
const KEY = Buffer.from(key, "hex");

// Debug logging
console.log("Using encryption key:", { keyLength: key.length, bufferLength: KEY.length });

if (KEY.length !== 32) throw new Error("ENCRYPTION_KEY must be exactly 32 bytes");

export function encryptJson(obj: unknown) {
  const iv = crypto.randomBytes(12); // GCM IV
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const json = Buffer.from(JSON.stringify(obj), "utf8");
  const enc = Buffer.concat([cipher.update(json), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]); // [12 IV][16 TAG][N DATA]
}

export function decryptJson(buf: Buffer) {
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(dec.toString("utf8"));
}
