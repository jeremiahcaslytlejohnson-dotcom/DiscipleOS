import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

const CODE_LENGTH = 6;

function getHashSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET environment variable is required");
  return secret;
}

export function generateVerificationCode() {
  return randomInt(0, 10 ** CODE_LENGTH).toString().padStart(CODE_LENGTH, "0");
}

export function hashVerificationCode(code: string, salt = randomBytes(16).toString("hex")) {
  const hash = createHmac("sha256", getHashSecret())
    .update(`${salt}:${code}`)
    .digest("hex");
  return { hash, salt };
}

export function verifyVerificationCode(code: string, hash: string, salt: string) {
  const candidate = Buffer.from(hashVerificationCode(code, salt).hash, "hex");
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return null;
  }
  return email;
}

export type AuthPurpose = "email" | "sign-in" | "sign-up";

export const AUTH_CODE_TTL_MS = 10 * 60 * 1000;
export const AUTH_RESEND_INTERVAL_MS = 60 * 1000;
export const AUTH_MAX_CODES_PER_HOUR = 5;
export const AUTH_MAX_ATTEMPTS = 5;
