import Link from "next/link";
import { Icon } from "./Icon";
import { BackButton } from "./BackButton";

/** 상단 바: 뒤로 · 제목 · 오른쪽 액션 */
export function TopBar({ title, back = true, right }: { title?: string; back?: boolean; right?: React.ReactNode }) {
  return (
    <header className="pt-safe sticky top-0 z-30 bg-surface">
      <div className="flex h-13 items-center gap-1 px-2" style={{ height: 52 }}>
        {back ? <BackButton /> : <span className="w-2" />}
        {title && <h1 className="truncate text-[17px] font-bold">{title}</h1>}
        <div className="ml-auto flex items-center gap-1 pr-1">{right}</div>
      </div>
    </header>
  );
}

/** 흰 바탕 섹션 (섹션 사이는 canvas 색 간격으로 구분) */
export function Section({
  title,
  desc,
  action,
  children,
  className = "",
}: {
  title?: string;
  desc?: string;
  action?: { label: string; href: string };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-surface px-5 py-5 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            {title && <h2 className="text-[17px] font-bold">{title}</h2>}
            {desc && <p className="mt-0.5 text-[13px] text-muted">{desc}</p>}
          </div>
          {action && (
            <Link href={action.href} className="flex shrink-0 items-center text-[13px] text-muted">
              {action.label}
              <Icon name="chevron" size={14} />
            </Link>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

const BTN = {
  primary: "bg-brand text-white active:bg-brand-dark disabled:bg-line disabled:text-muted",
  secondary: "bg-fill text-ink disabled:text-muted",
  dark: "bg-ink text-surface disabled:opacity-40",
  outline: "bg-surface text-ink ring-1 ring-inset ring-line disabled:text-muted",
};
const SIZE = { lg: "h-[52px] text-[16px] rounded-xl", md: "h-11 text-[15px] rounded-xl", sm: "h-9 px-3 text-[13px] rounded-lg" };

export function buttonClass(variant: keyof typeof BTN = "primary", size: keyof typeof SIZE = "md", full = false) {
  return `press inline-flex items-center justify-center gap-1.5 font-semibold ${BTN[variant]} ${SIZE[size]} ${full ? "w-full" : "px-4"}`;
}

/** 빈 상태: 무엇이 없는지 + 다음 행동 하나 */
export function Empty({ title, desc, action }: { title: string; desc?: string; action?: { label: string; href: string } }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="text-[15px] font-semibold">{title}</p>
      {desc && <p className="mt-1 text-[13px] text-muted">{desc}</p>}
      {action && (
        <Link href={action.href} className={`${buttonClass("secondary", "sm")} mt-4`}>
          {action.label}
        </Link>
      )}
    </div>
  );
}

/** 라벨-값 한 줄 */
export function Row({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5">
      <span className="text-[14px] text-sub">{label}</span>
      <span className="text-right">
        <span className="text-[15px] font-semibold">{value}</span>
        {sub && <span className="block text-[12px] text-muted">{sub}</span>}
      </span>
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "brand" | "positive" | "negative" | "info" }) {
  const t = {
    neutral: "bg-fill text-sub",
    brand: "bg-brand-soft text-brand",
    positive: "bg-positive/10 text-positive",
    negative: "bg-negative/10 text-negative",
    info: "bg-info/10 text-info",
  }[tone];
  return <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${t}`}>{children}</span>;
}
