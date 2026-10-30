"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { cn } from "@/lib/cn";

const links = [
  { href: "/", label: "首页" },
  { href: "/schedule", label: "日程" },
  { href: "/notices", label: "通知" },
  { href: "/assistant", label: "AI 助手" },
  { href: "/settings", label: "设置" },
];

export function Nav() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900">
          <span className="text-lg">📅</span>
          <span className="hidden sm:inline">日程与通知助手</span>
        </Link>

        <nav className="flex items-center gap-0.5 overflow-x-auto">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-sm font-medium sm:px-3",
                pathname === l.href
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-100",
              )}
            >
              {l.label}
            </Link>
          ))}

          {!loading && user ? (
            <div className="ml-2 flex items-center gap-1.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                {user.display_name.charAt(0)}
              </span>
              <span className="hidden max-w-[6rem] truncate text-sm text-gray-700 md:inline">
                {user.display_name}
              </span>
              <button
                onClick={logout}
                className="rounded-lg px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
              >
                退出
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="ml-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              登录
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
