import { randomUUID } from "node:crypto";

/** 生成全局唯一 ID（UUID v4）。 */
export function newId(): string {
  return randomUUID();
}
