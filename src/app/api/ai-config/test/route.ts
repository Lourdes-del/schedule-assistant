import { getCurrentUser } from "@/lib/auth";
import { aiConfigSchema } from "@/lib/validation";
import { getAiConfig, DEFAULT_AI } from "@/lib/ai-config";
import { callChat, AiError } from "@/lib/ai/client";
import { jsonOk, jsonErr } from "@/lib/http";

export const runtime = "nodejs";

/**
 * 测试连接：使用请求中给定的候选配置（缺失字段回退到已保存配置），
 * 发起一次最小化调用，验证 Key / Base URL / 模型是否可用。
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonErr("请先登录", 401);

  const body = await req.json().catch(() => null);
  const parsed = aiConfigSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return jsonErr(parsed.error.issues[0]?.message ?? "参数错误", 422);
  }

  const saved = getAiConfig(user.id);
  const apiKey = parsed.data.api_key || saved?.api_key || null;
  const baseUrl = parsed.data.base_url || saved?.base_url || DEFAULT_AI.base_url;
  const model = parsed.data.model || saved?.model || DEFAULT_AI.model;

  if (!apiKey) return jsonErr("请先填写 API Key", 400);

  try {
    await callChat(
      {
        provider: parsed.data.provider,
        apiKey,
        baseUrl,
        model,
      },
      {
        messages: [{ role: "user", content: "请只回复两个字：正常" }],
        temperature: 0,
      },
    );
    return jsonOk({ ok: true });
  } catch (err) {
    if (err instanceof AiError) return jsonErr(err.message, 502);
    return jsonErr(
      "测试失败：" + (err instanceof Error ? err.message : "未知错误"),
      502,
    );
  }
}
