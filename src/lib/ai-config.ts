import { getDb } from "./db";
import { encryptSecret, decryptSecret } from "./crypto";
import type { AiConfig } from "./types";

export const DEFAULT_AI = {
  provider: "deepseek" as const,
  base_url: "https://api.deepseek.com",
  model: "deepseek-chat",
};

export interface AiConfigFull extends AiConfig {
  /** 解密后的密钥，仅服务端使用，绝不返回给浏览器。 */
  api_key: string | null;
}

interface AiConfigRow {
  user_id: string;
  provider: string;
  api_key_enc: string | null;
  base_url: string;
  model: string;
}

export function getAiConfig(userId: string): AiConfigFull | null {
  const row = getDb()
    .prepare("SELECT * FROM ai_configs WHERE user_id = ?")
    .get(userId) as AiConfigRow | undefined;
  if (!row) return null;

  let apiKey: string | null = null;
  if (row.api_key_enc) {
    try {
      apiKey = decryptSecret(row.api_key_enc);
    } catch {
      apiKey = null;
    }
  }
  return {
    provider: row.provider as AiConfigFull["provider"],
    has_key: !!row.api_key_enc,
    base_url: row.base_url,
    model: row.model,
    api_key: apiKey,
  };
}

export interface AiConfigInput {
  provider?: string;
  /** undefined=保持不变；null/空串=清除；非空=设置。 */
  api_key?: string | null;
  base_url?: string | null;
  model?: string | null;
}

export function saveAiConfig(userId: string, input: AiConfigInput): AiConfig {
  const existing = getDb()
    .prepare("SELECT * FROM ai_configs WHERE user_id = ?")
    .get(userId) as AiConfigRow | undefined;

  const provider =
    input.provider ?? existing?.provider ?? DEFAULT_AI.provider;
  const base_url =
    input.base_url && input.base_url.trim()
      ? input.base_url.trim()
      : existing?.base_url ?? DEFAULT_AI.base_url;
  const model =
    input.model && input.model.trim()
      ? input.model.trim()
      : existing?.model ?? DEFAULT_AI.model;

  let api_key_enc = existing?.api_key_enc ?? null;
  if (input.api_key !== undefined) {
    api_key_enc = input.api_key ? encryptSecret(input.api_key) : null;
  }

  getDb()
    .prepare(
      `INSERT INTO ai_configs (user_id, provider, api_key_enc, base_url, model, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         provider = excluded.provider,
         api_key_enc = excluded.api_key_enc,
         base_url = excluded.base_url,
         model = excluded.model,
         updated_at = excluded.updated_at`,
    )
    .run(userId, provider, api_key_enc, base_url, model, new Date().toISOString());

  return { provider: provider as AiConfig["provider"], has_key: !!api_key_enc, base_url, model };
}

/** 若用户尚未配置密钥，抛出 not_configured 错误。 */
export function requireAiConfig(
  userId: string,
): AiConfigFull & { api_key: string } {
  const cfg = getAiConfig(userId);
  if (!cfg || !cfg.api_key) {
    throw new Error("NOT_CONFIGURED");
  }
  return { ...cfg, api_key: cfg.api_key };
}
