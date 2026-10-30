import { readFile, unlink, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { jsonOk, jsonErr } from "@/lib/http";

export const runtime = "nodejs";

const ALLOWED: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
};
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

function uploadDir(): string {
  return path.resolve(
    process.env.UPLOAD_DIR ?? path.join(process.cwd(), "data", "uploads"),
  );
}

/** 返回当前用户头像文件；无头像返回 404（前端回退到默认头像）。 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonErr("请先登录", 401);
  if (!user.avatar_path || !existsSync(user.avatar_path)) {
    return new NextResponse(null, { status: 404 });
  }
  const data = await readFile(user.avatar_path);
  return new NextResponse(data, {
    headers: {
      "Content-Type": user.avatar_mime ?? "application/octet-stream",
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonErr("请先登录", 401);

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonErr("请选择图片文件", 400);
  if (!ALLOWED[file.type]) {
    return jsonErr("仅支持 PNG / JPG / WebP / GIF 图片", 400);
  }
  if (file.size > MAX_SIZE) return jsonErr("图片不能超过 2MB", 400);

  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  const filename = `avatar_${user.id}_${Date.now()}${ALLOWED[file.type]}`;
  const filepath = path.join(dir, filename);
  await writeFile(filepath, Buffer.from(await file.arrayBuffer()));

  const old = user.avatar_path;
  getDb()
    .prepare("UPDATE users SET avatar_path = ?, avatar_mime = ? WHERE id = ?")
    .run(filepath, file.type, user.id);

  if (old && existsSync(old)) {
    try {
      await unlink(old);
    } catch {
      /* 忽略旧文件清理失败 */
    }
  }

  return jsonOk({ avatar_mime: file.type });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return jsonErr("请先登录", 401);

  const old = user.avatar_path;
  getDb()
    .prepare("UPDATE users SET avatar_path = NULL, avatar_mime = NULL WHERE id = ?")
    .run(user.id);
  if (old && existsSync(old)) {
    try {
      await unlink(old);
    } catch {
      /* ignore */
    }
  }
  return jsonOk({ ok: true });
}
