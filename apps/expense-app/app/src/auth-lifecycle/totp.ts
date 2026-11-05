import { createHmac, timingSafeEqual } from 'node:crypto';

/** RFC 6238 SHA-1, six digits, 30-second step. Secret bytes are host fixture data. */
export function fixtureTotp(secret: Buffer, now: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 30_000)));
  const hash = createHmac('sha1', secret).update(counter).digest();
  const offset = hash[hash.length - 1]! & 15;
  return String((hash.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}

export function verifyFixtureTotp(secret: Buffer, code: string, now: number): boolean {
  return /^\d{6}$/.test(code) && timingSafeEqual(Buffer.from(code), Buffer.from(fixtureTotp(secret, now)));
}
