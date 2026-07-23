import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { env } from "@chestnut-chat/env/server";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";
const IV_BYTES = 12;

// Falls back to BETTER_AUTH_SECRET so existing stored keys stay decryptable
// when PROVIDER_ENCRYPTION_SECRET is not configured.
const ENCRYPTION_KEY = createHash("sha256")
  .update(env.PROVIDER_ENCRYPTION_SECRET ?? env.BETTER_AUTH_SECRET)
  .digest();

export function encryptApiKey(apiKey: string) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":");
}

export function decryptApiKey(value: string) {
  const [version, iv, tag, ciphertext] = value.split(":");
  if (version !== VERSION || !iv || !tag || !ciphertext) {
    throw new Error("Unsupported encrypted provider key format.");
  }

  const decipher = createDecipheriv(ALGORITHM, ENCRYPTION_KEY, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
