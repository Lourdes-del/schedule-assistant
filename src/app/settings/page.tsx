"use client";

import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import { inputCls, labelCls, btnPrimary, btnSecondary, btnDanger, cardCls } from "@/lib/ui";

interface AiConfig {
  provider: "deepseek" | "openai-compatible";
  has_key: boolean;
  base_url: string;
  model: string;
}

export default function SettingsPage() {
  return (
    <RequireAuth>
      <Settings />
    </RequireAuth>
  );
}

function Settings() {
  const { user, refresh } = useAuth();

  // AI 设置
  const [provider, setProvider] = useState<"deepseek" | "openai-compatible">("deepseek");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.deepseek.com");
  const [model, setModel] = useState("deepseek-chat");
  const [hasKey, setHasKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [aiMsg, setAiMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // 头像
  const [avatarMsg, setAvatarMsg] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // 通知
  const [notifState, setNotifState] = useState<string>("");

  async function loadConfig() {
    try {
      const d = await api<{ config: AiConfig }>("/api/ai-config");
      setProvider(d.config.provider);
      setBaseUrl(d.config.base_url);
      setModel(d.config.model);
      setHasKey(d.config.has_key);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    loadConfig();
    setNotifState(
      typeof Notification === "undefined"
        ? "unsupported"
        : Notification.permission,
    );
  }, []);

  async function saveConfig() {
    setSaving(true);
    setAiMsg(null);
    try {
      await api("/api/ai-config", {
        method: "PUT",
        body: JSON.stringify({
          provider,
          api_key: apiKey.trim() ? apiKey.trim() : undefined,
          base_url: baseUrl,
          model,
        }),
      });
      setApiKey("");
      await loadConfig();
      setAiMsg({ ok: true, text: "已保存（API Key 已加密存储于服务端）" });
    } catch (err) {
      setAiMsg({ ok: false, text: err instanceof Error ? err.message : "保存失败" });
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setAiMsg(null);
    try {
      await api("/api/ai-config/test", {
        method: "POST",
        body: JSON.stringify({
          provider,
          api_key: apiKey.trim() ? apiKey.trim() : undefined,
          base_url: baseUrl,
          model,
        }),
      });
      setAiMsg({ ok: true, text: "连接测试成功 ✅" });
    } catch (err) {
      setAiMsg({ ok: false, text: err instanceof Error ? err.message : "测试失败" });
    } finally {
      setTesting(false);
    }
  }

  async function deleteKey() {
    if (!window.confirm("确定删除已保存的 API Key 吗？")) return;
    try {
      await api("/api/ai-config", { method: "DELETE" });
      setApiKey("");
      await loadConfig();
      setAiMsg({ ok: true, text: "已删除 API Key" });
    } catch (err) {
      setAiMsg({ ok: false, text: err instanceof Error ? err.message : "删除失败" });
    }
  }

  async function uploadAvatar(file: File) {
    setAvatarError(null);
    setAvatarMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      await api("/api/avatar", { method: "POST", body: fd });
      await refresh();
      setAvatarMsg("头像已更新");
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "上传失败");
    }
  }

  async function removeAvatar() {
    setAvatarError(null);
    setAvatarMsg(null);
    try {
      await api("/api/avatar", { method: "DELETE" });
      await refresh();
      setAvatarMsg("已恢复默认头像");
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "删除失败");
    }
  }

  async function requestNotification() {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifState(perm);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">个人设置</h1>

      {/* AI 设置 */}
      <section className={cardCls}>
        <h2 className="text-base font-semibold text-gray-900">AI 设置（DeepSeek）</h2>
        <p className="mt-1 text-sm text-gray-500">
          默认使用 DeepSeek；也可填写其他 OpenAI 兼容的 Base URL。API Key 加密存储，仅服务端可见。
        </p>

        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>提供方</label>
              <select
                className={inputCls}
                value={provider}
                onChange={(e) => setProvider(e.target.value as typeof provider)}
              >
                <option value="deepseek">DeepSeek</option>
                <option value="openai-compatible">OpenAI 兼容接口</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>模型名称</label>
              <input
                className={inputCls}
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="deepseek-chat"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>API Base URL</label>
            <input
              className={inputCls}
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.deepseek.com"
            />
          </div>

          <div>
            <label className={labelCls}>
              API Key {hasKey && <span className="text-xs text-green-600">（已保存）</span>}
            </label>
            <input
              type="password"
              className={inputCls}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasKey ? "留空则不修改已保存的 Key" : "sk-..."}
              autoComplete="off"
            />
          </div>

          {aiMsg && (
            <p className={`text-sm ${aiMsg.ok ? "text-green-600" : "text-red-600"}`}>
              {aiMsg.text}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button onClick={saveConfig} disabled={saving} className={btnPrimary}>
              {saving ? "保存中…" : "保存"}
            </button>
            <button onClick={testConnection} disabled={testing} className={btnSecondary}>
              {testing ? "测试中…" : "测试连接"}
            </button>
            {hasKey && (
              <button onClick={deleteKey} className={btnDanger}>
                删除 Key
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 头像 */}
      <section className={cardCls}>
        <h2 className="text-base font-semibold text-gray-900">助手头像</h2>
        <div className="mt-3 flex items-center gap-4">
          <Avatar hasAvatar={!!user?.avatar_path} size={64} />
          <div className="space-y-2 text-sm">
            <label className="inline-flex cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              上传 / 替换
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAvatar(f);
                }}
              />
            </label>
            {user?.avatar_path && (
              <button onClick={removeAvatar} className={btnSecondary}>
                删除（恢复默认）
              </button>
            )}
            <p className="text-xs text-gray-500">支持 PNG / JPG / WebP / GIF，≤ 2MB。</p>
            {avatarMsg && <p className="text-green-600">{avatarMsg}</p>}
            {avatarError && <p className="text-red-600">{avatarError}</p>}
          </div>
        </div>
      </section>

      {/* 浏览器通知 */}
      <section className={cardCls}>
        <h2 className="text-base font-semibold text-gray-900">浏览器通知</h2>
        <p className="mt-1 text-sm text-gray-500">
          到点提醒时，站内弹窗始终可用；若授权浏览器通知，还会在网页打开期间弹出系统通知。
        </p>
        <div className="mt-3">
          {notifState === "granted" ? (
            <p className="text-sm text-green-600">已授权浏览器通知 ✅</p>
          ) : notifState === "denied" ? (
            <p className="text-sm text-red-600">已拒绝浏览器通知（站内弹窗仍可用）</p>
          ) : notifState === "unsupported" ? (
            <p className="text-sm text-gray-500">当前浏览器不支持通知，仅使用站内弹窗。</p>
          ) : (
            <button onClick={requestNotification} className={btnSecondary}>
              开启浏览器通知
            </button>
          )}
        </div>
      </section>

      {/* 提醒说明 */}
      <section className={cardCls}>
        <h2 className="text-base font-semibold text-gray-900">提醒能力说明</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600">
          <li>提醒基于日程的「开始时间」（无开始时间则用截止时间）。</li>
          <li>支持提前 1 天 / 1 小时 / 30 分钟或自定义分钟数。</li>
          <li>
            本项目未接入推送服务，<strong>网站关闭后无法保证提醒送达</strong>；仅当你登录且网页打开时才会触发。
          </li>
        </ul>
      </section>
    </div>
  );
}
