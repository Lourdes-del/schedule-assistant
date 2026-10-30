import { getCurrentUser } from "@/lib/auth";
import { parseNotice } from "@/lib/ai/parse";
import { getAiConfig } from "@/lib/ai-config";
import { AiError } from "@/lib/ai/client";
import { jsonOk, jsonErr } from "@/lib/http";

export const runtime = "nodejs";

// 解析通知原文：调用用户配置的模型提取结构化信息。不写库、不创建日程。
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonErr("请先登录", 401);

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return jsonErr("请先粘贴通知原文", 422);
  const tz =
    typeof body?.tz_offset_minutes === "number" ? body.tz_offset_minutes : 480;

  const cfg = getAiConfig(user.id);
  if (!cfg || !cfg.api_key) {
    return jsonErr("尚未配置 AI（DeepSeek）。请先到「设置」页填写 API Key 后再试。", 400);
  }

  try {
    const result = await parseNotice({
      apiKey: cfg.api_key,
      baseUrl: cfg.base_url,
      model: cfg.model,
      text,
      tzOffsetMinutes: tz,
    });
    return jsonOk({ draft: result.draft, note: result.note });
  } catch (err) {
    if (err instanceof AiError) return jsonErr(err.message, 502);
    return jsonErr(
      "解析失败：" + (err instanceof Error ? err.message : "未知错误"),
      502,
    );
  }
}
