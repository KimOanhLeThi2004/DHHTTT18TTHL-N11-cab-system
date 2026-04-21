const crypto = require("crypto");

const CARD_ALGO = "aes-256-gcm";
const IV_SIZE = 12;

function resolveKey() {
  const raw =
    process.env.PAYMENT_CARD_ENCRYPTION_KEY ||
    process.env.INTERNAL_JWT_SECRET ||
    process.env.JWT_SECRET ||
    "dev-only-payment-key";

  // Always derive a 32-byte key so encryption still works if operator provides
  // a passphrase rather than raw key bytes.
  return crypto.createHash("sha256").update(String(raw)).digest();
}

function normalizeCardNumber(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).replace(/[\s-]/g, "");
  if (!/^\d{12,19}$/.test(normalized)) {
    return null;
  }
  return normalized;
}

function getCardLast4(cardNumber) {
  return String(cardNumber).slice(-4);
}

function maskCardLast4(last4) {
  if (!last4) return null;
  return `**** **** **** ${last4}`;
}

function encryptCardNumber(cardNumber) {
  const key = resolveKey();
  const iv = crypto.randomBytes(IV_SIZE);
  const cipher = crypto.createCipheriv(CARD_ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(cardNumber, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

module.exports = {
  normalizeCardNumber,
  getCardLast4,
  maskCardLast4,
  encryptCardNumber,
};
