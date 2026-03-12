"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren } from "react";

const navItems = [
  { href: "/today", label: "今日卡片" },
  { href: "/onboarding", label: "我的偏好" },
  { href: "/auth", label: "登录" },
];

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const isTodayView = pathname === "/today";

  if (isTodayView) {
    return (
      <div className="app-shell deck-shell">
        <main className="page full-bleed">{children}</main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">KnowTok</p>
          <h1>3-5 分钟科研轻内容</h1>
        </div>
        <nav className="nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "nav-link active" : "nav-link"}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="page">{children}</main>
    </div>
  );
}
