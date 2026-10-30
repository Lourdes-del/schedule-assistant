import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LEN = 64;

/** 使用 scrypt + 随机盐对密码做单向哈希。 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LEN).toString("hex");
  return { hash, salt };
}

/** 校验密码是否与存储的哈希一致（恒定时间比较）。 */
export function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string,
): boolean {
  const hash = scryptSync(password, salt, KEY_LEN);
  const expected = Buffer.from(expectedHash, "hex");
  return hash.length === expected.length && timingSafeEqual(hash, expected);
}
