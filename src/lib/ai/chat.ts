import { callChat } from "./client";
import { chatResultSchema } from "./schemas";
import { extractJson } from "./json";
import {
  normalizeEventDraft,
  formatLocalNow,
  formatOffset,
} from "./normalize";
import type { EventDraft } from "../types";

export interface ChatResult {
  reply: string;
  event: EventDraft | null;
}

function buildSystem(tzOffsetMinutes: number): string {
  return `你是一名大学生「日程与通知助手」，可以回答学习相关问题，也能识别用户话里的日程信息。

你必须输出一个 JSON 对象，字段如下：
{
  "reply": "你对用户说的话（自然、简洁的简体中文）",
  "event": null 或 {
    "title": "事项名称",
    "category": "讲座 / 考试 / 作业 / 竞赛 / 社团活动 / 其他",
    "start_time": "YYYY-MM-DDTHH:mm 或 YYYY-MM-DD 或 null",
    "deadline_time": "同上",
    "location": "地点，未知 null",
    "audience": "对象，未知 null",
    "signup_method": "报名方式，未知 null",
    "uncertain": ["含糊或缺失的字段名，没有则空数组"]
  }
}

规则：
- 若用户的话里包含可识别的日程（时间、地点、事项），在 event 中提取；时间缺失或含糊就置 null 并写入 uncertain。reply 中先回显你理解到的信息，并明确请用户确认后再创建。
- 若只是普通问题或闲聊，event 置 null，正常回答。
- 绝不编造时间、地点等信息。
- 时间是本地时间（今天 ${formatLocalNow(
    tzOffsetMinutes,
  )}，时区 ${formatOffset(tzOffsetMinutes)}）。`;
}

export async function chatOnce(params: {
  apiKey: string;
  baseUrl: string;
  model: string;
  message: string;
  tzOffsetMinutes: number;
}): Promise<ChatResult> {
  const content = await callChat(
    {
      provider: "deepseek",
      apiKey: params.apiKey,
      baseUrl: params.baseUrl,
      model: params.model,
    },
    {
      json: true,
      temperature: 0.4,
      messages: [
        { role: "system", content: buildSystem(params.tzOffsetMinutes) },
        { role: "user", content: params.message },
      ],
    },
  );

  let data: unknown;
  try {
    data = extractJson(content);
  } catch {
    return { reply: content, event: null };
  }

  const parsed = chatResultSchema.safeParse(data);
  if (!parsed.success) {
    return { reply: content, event: null };
  }

  const event = parsed.data.event
    ? normalizeEventDraft(parsed.data.event, params.tzOffsetMinutes)
    : null;
  return { reply: parsed.data.reply ?? "", event };
}
