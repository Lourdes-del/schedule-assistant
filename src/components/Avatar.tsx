"use client";

/** AI 助手头像：有上传则显示图片，否则显示默认机器人图标。 */
export function Avatar({
  hasAvatar,
  size = 40,
}: {
  hasAvatar: boolean;
  size?: number;
}) {
  const style = { width: size, height: size };
  if (hasAvatar) {
    return (
      <img
        src={`/api/avatar?t=${Date.now()}`}
        alt="助手头像"
        style={style}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <div
      style={style}
      className="flex shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xl"
    >
      🤖
    </div>
  );
}
