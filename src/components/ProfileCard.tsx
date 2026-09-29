import type { Look } from "@/lib/cosmetics";
import { levelOf } from "@/lib/levels";

/** 프로필 카드 — 꾸미기(캐릭터·카드·테두리·칭호)를 적용해 보여준다 */
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
  const decorated = Boolean(look.card);
  return (
    <div className={`rounded-2xl p-5 ${decorated ? "text-[#191f28]" : "bg-fill"}`} style={decorated ? { background: look.card! } : undefined}>
      <div className="flex items-center gap-4">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface text-[34px]"
          style={look.frame ? { boxShadow: `0 0 0 3px ${look.frame}` } : undefined}
        >
          {look.character ??
            (avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[22px] font-bold text-sub">{nickname.slice(0, 1)}</span>
            ))}
        </div>
        <div className="min-w-0 flex-1">
          {look.title && <p className="text-[12px] font-semibold opacity-70">{look.title}</p>}
          <p className="truncate text-[19px] font-bold">{nickname}</p>
          <p className="text-[13px] opacity-70">
            Lv.{lv.level} {lv.name}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/10">
              <div className="h-full rounded-full bg-brand" style={{ width: `${lv.progress * 100}%` }} />
            </div>
            {lv.next && <span className="tnum shrink-0 text-[11px] opacity-60">{(lv.next.min - xp).toLocaleString()} XP 남음</span>}
          </div>
        </div>
      </div>
      {stats && (
        <dl className="mt-4 grid grid-cols-4 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <dd className="tnum text-[16px] font-bold">{s.value.toLocaleString()}</dd>
              <dt className="text-[11px] opacity-60">{s.label}</dt>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
