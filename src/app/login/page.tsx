"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { inputCls, labelCls, btnPrimary, cardCls } from "@/lib/ui";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await refresh();
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-8 max-w-sm">
      <div className={cardCls}>
        <h1 className="text-lg font-semibold text-gray-900">登录</h1>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <label className={labelCls}>邮箱</label>
            <input
              type="email"
              className={inputCls}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelCls}>密码</label>
            <input
              type="password"
              className={inputCls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className={`${btnPrimary} w-full`}>
            {loading ? "登录中…" : "登录"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          还没有账号？{" "}
          <Link href="/register" className="text-indigo-600 hover:underline">
            注册
          </Link>
        </p>
      </div>
    </div>
  );
}
