import { getCurrentUser } from "@/lib/auth";
import { chatSchema } from "@/lib/validation";
import { getAiConfig } from "@/lib/ai-config";
import { chatOnce } from "@/lib/ai/chat";
import { AiError } from "@/lib/ai/client";
import { jsonOk, jsonErr } from "@/lib/http";

export const runtime = "nodejs";

const DEFAULT_TZ = 480;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonErr("请先登录", 401);

  const body = await req.json().catch(() => null);
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return jsonErr(parsed.error.issues[0]?.message ?? "参数错误", 422);
  }

  const cfg = getAiConfig(user.id);
  if (!cfg || !cfg.api_key) {
    return jsonErr(
      "尚未配置 AI（DeepSeek）。请先到「设置」页填写 API Key 后再试。",
      400,
    );
  }

  try {
    const result = await chatOnce({
      apiKey: cfg.api_key,
      baseUrl: cfg.base_url,
      model: cfg.model,
      message: parsed.data.message,
      tzOffsetMinutes: parsed.data.tz_offset_minutes ?? DEFAULT_TZ,
    });
    return jsonOk({ reply: result.reply, event: result.event });
  } catch (err) {
    if (err instanceof AiError) return jsonErr(err.message, 502);
    return jsonErr(
      "对话失败：" + (err instanceof Error ? err.message : "未知错误"),
      502,
    );
  }
}
