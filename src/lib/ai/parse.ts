import { callChat, AiError } from "./client";
import { noticeExtractionSchema } from "./schemas";
import { extractJson } from "./json";
import {
  normalizeEventDraft,
  formatLocalNow,
  formatOffset,
} from "./normalize";
import type { EventDraft } from "../types";

export interface ParsedNotice {
  draft: EventDraft;
  note: string | null;
}

const SYSTEM_PROMPT = `你是一名高校「通知解析助手」，负责从学生粘贴的学校、社团或课程通知中提取结构化的日程信息。

请严格输出一个 JSON 对象（不要输出任何其他文字），字段如下：
{
  "title": "标题，简短概括",
  "category": "类别，只能是以下之一：讲座、考试、作业、竞赛、社团活动、其他",
  "start_time": "开始时间，格式 YYYY-MM-DDTHH:mm，24 小时制；若只有日期没有时刻，输出 YYYY-MM-DD；无法确定则输出 null",
  "deadline_time": "截止/结束时间，格式同上；无截止则 null",
  "location": "地点；未知则 null",
  "audience": "面向对象；未知则 null",
  "signup_method": "报名方式；未知则 null",
  "uncertain": ["你认为含糊、可能不准确或需要人工确认的字段名（如 start_time、location）；没有则为空数组"],
  "note": "一句补充说明或需要提醒用户核对的要点；没有则 null"
}

规则：
- 只提取通知中明确出现的信息，绝不编造时间、地点、对象、报名方式。
- 缺失或含糊的信息一律置 null，并写入 uncertain 标注。
- 时间用 24 小时制；没有时刻就只写日期。`;

export async function parseNotice(params: {
  apiKey: string;
  baseUrl: string;
  model: string;
  text: string;
  tzOffsetMinutes: number;
}): Promise<ParsedNotice> {
  const content = await callChat(
    {
      provider: "deepseek",
      apiKey: params.apiKey,
      baseUrl: params.baseUrl,
      model: params.model,
    },
    {
      json: true,
      temperature: 0.1,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `下面是需要解析的通知原文（今天是 ${formatLocalNow(
            params.tzOffsetMinutes,
          )}，时区 ${formatOffset(params.tzOffsetMinutes)}）：\n<通知原文>\n${
            params.text
          }\n</通知原文>`,
        },
      ],
    },
  );

  let data: unknown;
  try {
    data = extractJson(content);
  } catch {
    throw new AiError("AI 返回内容不是合法 JSON，请重试。", "unparseable");
  }

  const parsed = noticeExtractionSchema.safeParse(data);
  if (!parsed.success) {
    throw new AiError(
      "AI 返回结构无法解析，请重试或手动创建日程。",
      "unparseable",
    );
  }

  return {
    draft: normalizeEventDraft(parsed.data, params.tzOffsetMinutes),
    note: typeof parsed.data.note === "string" ? parsed.data.note : null,
  };
}
