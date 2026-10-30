import { z } from "zod";
import { CATEGORIES } from "./categories";

// —— 账号 ——
export const registerSchema = z.object({
  email: z.string().trim().email("邮箱格式不正确").max(120),
  password: z.string().min(8, "密码至少 8 位").max(72),
  display_name: z.string().trim().min(1, "请填写昵称").max(40),
});

export const loginSchema = z.object({
  email: z.string().trim().email("邮箱格式不正确"),
  password: z.string().min(1, "请输入密码").max(72),
});

// —— AI 对话 ——
export const chatSchema = z.object({
  message: z.string().trim().min(1, "消息不能为空").max(8000),
  tz_offset_minutes: z.number().int().min(-840).max(840).optional(),
});

// —— AI 配置（字段均可选，用于部分更新；Key 只进不出）——
export const aiConfigSchema = z.object({
  provider: z.enum(["deepseek", "openai-compatible"]).default("deepseek"),
  api_key: z.string().trim().max(500).optional(),
  base_url: z.string().trim().max(300).optional(),
  model: z.string().trim().max(100).optional(),
});

// —— 日程 ——
const nullableText = z.string().trim().max(2000).nullable().optional();

export const eventSchema = z.object({
  title: z.string().trim().min(1, "请填写标题").max(200),
  category: z.enum(CATEGORIES),
  start_at: nullableText,
  deadline_at: nullableText,
  location: nullableText,
  audience: nullableText,
  signup_method: z.string().trim().max(500).nullable().optional(),
  description: nullableText,
  uncertain_fields: z.array(z.string()).optional().default([]),
  reminder: z
    .object({
      choice: z.enum(["none", "1day", "1hour", "30min", "custom"]),
      custom_minutes: z.number().int().min(1).optional(),
    })
    .optional(),
});

// —— 通知：原文 + 待确认的日程字段 ——
export const noticeCreateSchema = z.object({
  raw_text: z.string().trim().min(1, "通知原文不能为空").max(20000),
  event: eventSchema,
});
