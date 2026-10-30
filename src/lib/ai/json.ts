/**
 * 从模型输出中稳健地提取 JSON 对象。
 * 依次尝试：整体解析 → ```json 代码块 → 首尾花括号之间的内容。
 */
export function extractJson(content: string): unknown {
  const trimmed = content.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    /* 继续 */
  }

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      /* 继续 */
    }
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      /* 继续 */
    }
  }

  throw new Error("no json found");
}
