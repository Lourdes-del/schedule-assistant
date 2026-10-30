import { z } from "zod";

/** AI 返回的日程草稿字段（时间约定为「用户本地时间」的字符串）。 */
export const eventDraftSchema = z.object({
  title: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  start_time: z.string().nullable().optional(),
  deadline_time: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  audience: z.string().nullable().optional(),
  signup_method: z.string().nullable().optional(),
  uncertain: z.array(z.string()).optional().default([]),
});

/** 通知解析结果 = 日程草稿 + 附加说明。 */
export const noticeExtractionSchema = eventDraftSchema.extend({
  note: z.string().nullable().optional(),
});

/** 助手对话结果 = 文本回复 + 可选的日程草稿。 */
export const chatResultSchema = z.object({
  reply: z.string(),
  event: eventDraftSchema.nullable().optional(),
});
