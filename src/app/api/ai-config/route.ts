import { getCurrentUser } from "@/lib/auth";
import { aiConfigSchema } from "@/lib/validation";
import { getAiConfig, saveAiConfig, DEFAULT_AI } from "@/lib/ai-config";
import { jsonOk, jsonErr } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonErr("请先登录", 401);

  const cfg = getAiConfig(user.id);
  if (!cfg) {
    return jsonOk({
      config: {
        provider: DEFAULT_AI.provider,
        has_key: false,
        base_url: DEFAULT_AI.base_url,
        model: DEFAULT_AI.model,
      },
    });
  }
  return jsonOk({
    config: {
      provider: cfg.provider,
      has_key: cfg.has_key,
      base_url: cfg.base_url,
      model: cfg.model,
    },
  });
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonErr("请先登录", 401);

  const body = await req.json().catch(() => null);
  const parsed = aiConfigSchema.safeParse(body);
  if (!parsed.success) {
    return jsonErr(parsed.error.issues[0]?.message ?? "参数错误", 422);
  }

  const saved = saveAiConfig(user.id, parsed.data);
  return jsonOk({ config: saved });
}

/** 删除（清除）当前用户的 API Key；其余设置保留。 */
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return jsonErr("请先登录", 401);

  saveAiConfig(user.id, { api_key: null });
  return jsonOk({ ok: true });
}
