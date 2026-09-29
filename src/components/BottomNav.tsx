"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "홈", icon: "🏠" },
  { href: "/bounties", label: "수배", icon: "🎯" },
  { href: "/new", label: "올리기", icon: "＋", primary: true },
  { href: "/points", label: "포인트", icon: "🎁" },
  { href: "/me", label: "MY", icon: "🙂" },
];

export function BottomNav() {
  const path = usePathname();
  // 딜 상세는 하단에 구매 바가 있으므로, 크리에이터 채널은 독립 페이지이므로 탭바를 숨긴다
  if (path.startsWith("/deals/") || path.startsWith("/c/") || path.startsWith("/@")) return null;
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-line bg-surface/95 backdrop-blur">
      <ul className="grid h-16 grid-cols-5">
        {TABS.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <li key={t.href} className="flex items-center justify-center">
              {t.primary ? (
                <Link
                  href={t.href}
                  aria-label={t.label}
                  className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-3xl font-light text-white shadow-lg shadow-brand/30 active:scale-95"
                >
                  {t.icon}
                </Link>
              ) : (
                <Link
                  href={t.href}
                  className={`flex flex-col items-center gap-0.5 text-[11px] ${active ? "font-bold text-ink" : "text-sub"}`}
                >
                  <span className={`text-xl ${active ? "" : "opacity-60 grayscale"}`}>{t.icon}</span>
                  {t.label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
