// 浏览器端 fetch 封装：自动处理 JSON 序列化 / 反序列化与错误提示。

export async function api<T = unknown>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  let body = options.body;

  if (body !== undefined && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
    if (typeof body !== "string") body = JSON.stringify(body);
  }

  const res = await fetch(url, { ...options, headers, body });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      data && typeof data === "object" && "error" in data
        ? (data as { error: unknown }).error
        : null;
    throw new Error(msg ? String(msg) : `请求失败（${res.status}）`);
  }
  return data as T;
}
