import type { Category } from "./categories";

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_path: string | null;
  avatar_mime: string | null;
  created_at: string;
}

export interface Event {
  id: string;
  user_id: string;
  title: string;
  category: Category;
  start_at: string | null;
  deadline_at: string | null;
  location: string | null;
  audience: string | null;
  signup_method: string | null;
  description: string | null;
  notice_id: string | null;
  uncertain_fields: string[];
  created_at: string;
  updated_at: string;
  reminder: {
    remind_at: string | null;
    offset_label: string | null;
    sent_at: string | null;
  } | null;
}

/** 尚未落库、等待用户确认的日程草稿（来自 AI 解析或对话）。 */
export interface EventDraft {
  title: string | null;
  category: Category;
  start_at: string | null;
  deadline_at: string | null;
  location: string | null;
  audience: string | null;
  signup_method: string | null;
  description: string | null;
  uncertain_fields: string[];
}

export interface Reminder {
  id: string;
  user_id: string;
  event_id: string;
  remind_at: string;
  offset_label: string;
  sent_at: string | null;
  created_at: string;
}

/** 返回给客户端的 AI 配置（永不包含明文密钥）。 */
export interface AiConfig {
  provider: "deepseek" | "openai-compatible";
  has_key: boolean;
  base_url: string;
  model: string;
}

export const FIELD_LABELS: Record<string, string> = {
  title: "标题",
  start_at: "开始时间",
  deadline_at: "截止时间",
  location: "地点",
  audience: "对象",
  signup_method: "报名方式",
};
