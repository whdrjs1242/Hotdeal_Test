import type { Look } from "@/lib/cosmetics";
import { levelOf } from "@/lib/levels";
import { compact } from "@/lib/format";

/** 꾸민 프로필 카드 (MY·크리에이터 채널에서 사용) */
export function ProfileCard({
  nickname,
  xp,
  look,
  stats,
  avatarUrl,
}: {
  nickname: string;
  xp: number;
  look: Look;
  stats?: { label: string; value: number }[];
  avatarUrl?: string | null;
}) {
  const lv = levelOf(xp);
  const bg = look.card ?? "linear-gradient(135deg,#2d3340,#16181d)";
  return (
    <div className="relative overflow-hidden rounded-3xl p-5 text-white shadow-lg" style={{ background: bg }}>
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
      <div className="flex items-center gap-4">
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 text-5xl backdrop-blur"
          style={look.frame ? { boxShadow: `0 0 0 3px ${look.frame}, 0 0 18px ${look.frame}` } : undefined}
        >
          {look.character ??
            (avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              lv.emoji
            ))}
        </div>
        <div className="min-w-0">
          {look.title && (
            <span className="mb-1 inline-block rounded-full bg-black/25 px-2 py-0.5 text-[11px] font-bold">
              {look.titleIcon} {look.title}
            </span>
          )}
          <div className="truncate text-xl font-black drop-shadow">{nickname}</div>
          <div className="text-xs opacity-90">
            Lv.{lv.level} {lv.name} · {compact(xp)} XP
          </div>
          <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-black/25">
            <div className="h-full rounded-full bg-white" style={{ width: `${lv.progress * 100}%` }} />
          </div>
        </div>
      </div>
      {stats && (
        <div className="mt-4 grid grid-cols-4 gap-1 rounded-2xl bg-black/20 py-2 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-base font-black">{compact(s.value)}</div>
              <div className="text-[10px] opacity-80">{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
