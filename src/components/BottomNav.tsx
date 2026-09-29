"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "홈", icon: "🏠", tint: "bg-peach" },
  { href: "/bounties", label: "수배", icon: "🎯", tint: "bg-butter" },
  { href: "/new", label: "올리기", icon: "＋", primary: true },
  { href: "/casino", label: "라운지", icon: "🎰", tint: "bg-lilac" },
  { href: "/me", label: "MY", icon: "🐥", tint: "bg-mint" },
];

/** 떠 있는 말랑 탭바 */
export function BottomNav() {
  const path = usePathname();
  // 딜 상세는 하단에 구매 바가 있으므로, 크리에이터 채널은 독립 페이지이므로 탭바를 숨긴다
  if (path.startsWith("/deals/") || path.startsWith("/c/") || path.startsWith("/@")) return null;
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-3 pb-2">
      <ul className="grid h-16 grid-cols-5 items-center rounded-[28px] bg-surface/90 px-1 shadow-[0_12px_30px_-10px_rgb(90_50_20/0.35)] ring-1 ring-line backdrop-blur-lg">
        {TABS.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <li key={t.href} className="flex items-center justify-center">
              {t.primary ? (
                <Link
                  href={t.href}
                  aria-label={t.label}
                  className="btn-pop -mt-7 flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#ff8a5c] to-brand text-3xl font-light text-white ring-4 ring-canvas"
                >
                  {t.icon}
                </Link>
              ) : (
                <Link href={t.href} className="flex flex-col items-center gap-0.5 text-[11px]">
                  <span
                    className={`flex h-9 w-12 items-center justify-center rounded-2xl text-xl transition ${
                      active ? `${t.tint} jelly` : "opacity-50 grayscale"
                    }`}
                  >
                    {t.icon}
                  </span>
                  <span className={active ? "font-bold text-ink" : "text-sub"}>{t.label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
