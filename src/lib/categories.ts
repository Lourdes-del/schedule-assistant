// 日程/通知类别：内部用英文 slug 存储，界面显示中文标签。

export const CATEGORIES = [
  "lecture",
  "exam",
  "homework",
  "competition",
  "club",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  lecture: "讲座",
  exam: "考试",
  homework: "作业",
  competition: "竞赛",
  club: "社团活动",
  other: "其他",
};

const CHINESE_ALIASES: Record<string, Category> = {
  讲座: "lecture",
  学术讲座: "lecture",
  报告: "lecture",
  考试: "exam",
  测验: "exam",
  作业: "homework",
  课程作业: "homework",
  竞赛: "competition",
  比赛: "competition",
  社团活动: "club",
  社团: "club",
  活动: "club",
};

/** 把 AI 返回的类别（中文标签或英文 slug）归一化到合法枚举；无法识别归入 other。 */
export function normalizeCategory(value: unknown): Category {
  if (typeof value !== "string") return "other";
  const t = value.trim();
  if ((CATEGORIES as readonly string[]).includes(t)) return t as Category;
  return CHINESE_ALIASES[t] ?? "other";
}
