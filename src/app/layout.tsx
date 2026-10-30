import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { Nav } from "@/components/Nav";
import { ReminderPoller } from "@/components/ReminderPoller";

export const metadata: Metadata = {
  title: "日程与通知助手",
  description: "面向大学生的日程与通知助手：通知解析、日程管理、AI 助手与提醒",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">
        <AuthProvider>
          <Nav />
          <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-4 sm:px-6">
            {children}
          </main>
          <ReminderPoller />
        </AuthProvider>
      </body>
    </html>
  );
}
