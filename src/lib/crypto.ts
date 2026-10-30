import crypto from "node:crypto";

// 用户 API Key 静态加密（AES-256-GCM），密钥由 APP_SECRET 派生。
// 明文 Key 绝不写入数据库、日志或返回给浏览器。

const ALGO = "aes-256-gcm";

function key(): Buffer {
  const secret = process.env.APP_SECRET;
  if (secret) {
    return crypto.createHash("sha256").update(secret).digest();
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("缺少 APP_SECRET，无法安全存储 API Key。");
  }
  // 开发环境回退：进程内随机密钥（重启后已存 Key 将无法解密）。
  const g = globalThis as { __devAppSecret?: Buffer };
  if (!g.__devAppSecret) {
    g.__devAppSecret = crypto.randomBytes(32);
    console.warn(
      "[crypto] 未设置 APP_SECRET，使用进程内随机密钥（仅限开发环境）。",
    );
  }
  return g.__devAppSecret;
}

/** 加密明文，返回 "iv:tag:ciphertext" 的 hex 字符串。 */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

/** 解密，失败（密钥变更/数据损坏）抛出异常。 */
export function decryptSecret(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("密文格式错误");
  const decipher = crypto.createDecipheriv(ALGO, key(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}
