export type AiErrorCode =
  | "network"
  | "http"
  | "empty"
  | "unparseable"
  | "not_configured";

export class AiError extends Error {
  code: AiErrorCode;
  constructor(message: string, code: AiErrorCode) {
    super(message);
    this.name = "AiError";
    this.code = code;
  }
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatProviderConfig {
  /** 提供方标识（deepseek 与 openai-compatible 当前共用同一协议）。 */
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface ChatParams {
  messages: ChatMessage[];
  /** 请求模型输出 JSON 对象。 */
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
}

function truncate(s: string, n = 300): string {
  const oneLine = s.replace(/\s+/g, " ").trim();
  return oneLine.length > n ? oneLine.slice(0, n) + "…" : oneLine;
}

/**
 * 统一的聊天补全调用入口（OpenAI 兼容协议）。
 * 未来接入其他提供方时，只需在此处按 provider 分支或新增适配器。
 */
export async function callChat(
  config: ChatProviderConfig,
  params: ChatParams,
): Promise<string> {
  const url = `${config.baseUrl.replace(/\/+$/, "")}/chat/completions`;

  const body: Record<string, unknown> = {
    model: config.model,
    messages: params.messages,
    temperature: params.temperature ?? 0.3,
  };
  if (params.json) body.response_format = { type: "json_object" };
  if (params.maxTokens) body.max_tokens = params.maxTokens;

  let res: Response;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    throw new AiError(
      aborted
        ? "AI 服务响应超时（60 秒）。"
        : "无法连接到 AI 服务，请检查网络与 Base URL。",
      "network",
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new AiError(
      `AI 服务返回错误（HTTP ${res.status}）：${truncate(text)}`,
      "http",
    );
  }

  const data = (await res.json().catch(() => null)) as {
    choices?: { message?: { content?: unknown } }[];
  } | null;
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new AiError("AI 返回内容为空，无法解析。", "empty");
  }
  return content;
}
