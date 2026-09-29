"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

const TABS = [
  { href: "/", label: "홈", icon: "home", match: (p: string) => p === "/" },
  { href: "/bounties", label: "수배", icon: "target", match: (p: string) => p.startsWith("/bounties") },
  { href: "/new", label: "글쓰기", icon: "plus", match: (p: string) => p === "/new" || p.startsWith("/submit") },
  { href: "/points", label: "혜택", icon: "gift", match: (p: string) => ["/points", "/play", "/market", "/games"].some((x) => p.startsWith(x)) },
  { href: "/me", label: "내 정보", icon: "user", match: (p: string) => p.startsWith("/me") },
];

export function BottomNav() {
  const path = usePathname();
  // 딜 상세(하단 구매 바), 크리에이터 채널(독립 페이지), 게임 진행 화면에서는 숨긴다
  if (["/deals/", "/c/", "/@", "/play/"].some((p) => path.startsWith(p))) return null;
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-line bg-surface">
      <ul className="grid h-[58px] grid-cols-5">
        {TABS.map((t) => {
          const active = t.match(path);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`press flex h-full flex-col items-center justify-center gap-0.5 text-[11px] ${active ? "font-semibold text-ink" : "text-muted"}`}
              >
                <Icon name={t.icon} size={24} strokeWidth={active ? 2.2 : 1.8} />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
