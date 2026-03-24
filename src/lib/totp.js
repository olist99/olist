import crypto from 'crypto';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(secret) {
  let bits = '';
  for (const c of secret.toUpperCase().replace(/=+$/, '').replace(/\s/g, '')) {
    const val = BASE32.indexOf(c);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

export function generateSecret() {
  const bytes = crypto.randomBytes(20);
  let result = '';
  let buffer = 0, bitsLeft = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bitsLeft += 8;
    while (bitsLeft >= 5) {
      result += BASE32[(buffer >> (bitsLeft - 5)) & 31];
      bitsLeft -= 5;
    }
  }
  return result;
}

export function generateTOTP(secret, windowOffset = 0) {
  const key = base32Decode(secret);
  const counter = Math.floor(Date.now() / 1000 / 30) + windowOffset;
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return code.toString().padStart(6, '0');
}

/**
 * Verify a TOTP code — accepts ±1 window (30s tolerance each side)
 */
export function verifyTOTP(secret, code) {
  if (!secret || !code || !/^\d{6}$/.test(code)) return false;
  return [-1, 0, 1].some(w => generateTOTP(secret, w) === code);
}

/**
 * Generate an otpauth:// URL for QR code scanning
 */
export function totpUri(secret, username, issuer = 'OCMS') {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(username)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
