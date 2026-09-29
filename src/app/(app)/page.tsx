import Link from "next/link";
import { listDeals, type SortKey } from "@/lib/deals";
import { cached } from "@/lib/cache";
import { sql } from "@/lib/db";
import { CATEGORIES } from "@/lib/categories";
import { DealCard } from "@/components/DealCard";
import { FeedList } from "@/components/FeedList";
import { compact, won } from "@/lib/format";
import { listBounties } from "@/lib/bounties";
import { getCurrentUser } from "@/lib/auth";

const SORTS: { id: SortKey; label: string }[] = [
  { id: "hot", label: "🔥 핫딜" },
  { id: "new", label: "🆕 최신" },
  { id: "ending", label: "⏰ 마감임박" },
  { id: "top", label: "🏆 오늘 TOP" },
];

type SP = Promise<{ sort?: string; category?: string; q?: string }>;

export default async function Home({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const sort = (SORTS.some((s) => s.id === sp.sort) ? sp.sort : "hot") as SortKey;
  const category = sp.category ?? "all";
  const q = sp.q?.trim() || null;

  const [{ items, nextCursor }, stats, hotBounties, user] = await Promise.all([
    q ? listDeals({ sort, category, q }) : cached(`feed:${sort}:${category}:`, 15, () => listDeals({ sort, category })),
    cached("stats:today", 60, async () => {
      const [s] = await sql<{ deals: number; clicks: number; saved: number }[]>`
        SELECT
          (SELECT count(*)::int FROM deals WHERE created_at > now() - interval '24 hours') AS deals,
          (SELECT count(*)::int FROM clicks WHERE created_at > now() - interval '24 hours') AS clicks,
          (SELECT COALESCE(sum((original_price - price)::bigint * greatest(click_count, 1)), 0)::bigint
             FROM deals WHERE created_at > now() - interval '24 hours' AND original_price > price) AS saved`;
      return s;
    }),
    q ? { items: [] } : cached("bounties:strip", 30, () => listBounties({ sort: "hot", limit: 8 })),
    getCurrentUser(),
  ]);
  const unread = user
    ? (await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM notifications WHERE user_id = ${user.id} AND read_at IS NULL`)[0].n
    : 0;

  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ sort, category, ...(q ? { q } : {}), ...patch });
    if (p.get("sort") === "hot") p.delete("sort");
    if (p.get("category") === "all") p.delete("category");
    const s = p.toString();
    return s ? `/?${s}` : "/";
  };
  const apiQuery = new URLSearchParams({ sort, category, ...(q ? { q } : {}) }).toString();

  return (
    <>
      <header className="pt-safe sticky top-0 z-30 bg-surface/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 pt-3">
          <Link href="/" className="text-2xl font-black tracking-tight text-brand">
            줍줍
          </Link>
          <form action="/" className="flex-1">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="어떤 핫딜 찾아요? (예: 에어팟)"
              className="h-9 w-full rounded-full bg-canvas px-4 text-sm outline-none placeholder:text-sub"
            />
          </form>
          <Link href="/alerts" aria-label="알림" className="relative text-xl">
            🔔
            {unread > 0 && (
              <span className="absolute -right-1.5 -top-1 min-w-4 rounded-full bg-brand px-1 text-center text-[10px] font-bold leading-4 text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
        </div>
        <nav className="no-scrollbar mt-2 flex gap-4 overflow-x-auto border-b border-line px-4">
          {SORTS.map((s) => (
            <Link
              key={s.id}
              href={qs({ sort: s.id })}
              className={`shrink-0 border-b-2 pb-2 text-[15px] ${sort === s.id ? "border-ink font-bold" : "border-transparent text-sub"}`}
            >
              {s.label}
            </Link>
          ))}
        </nav>
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2.5">
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              href={qs({ category: c.id })}
              className={`shrink-0 rounded-full border px-3 py-1 text-[13px] ${
                category === c.id ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink/80"
              }`}
            >
              {c.emoji} {c.name}
            </Link>
          ))}
        </div>
      </header>

      {!q && hotBounties.items.length > 0 && (
        <section className="mt-3">
          <div className="flex items-baseline justify-between px-4">
            <h2 className="font-black">🎯 지금 뜨는 현상금 수배</h2>
            <Link href="/bounties" className="text-xs text-sub">
              전체 ›
            </Link>
          </div>
          <div className="no-scrollbar mt-2 flex gap-2.5 overflow-x-auto px-4 pb-1">
            {hotBounties.items.map((b) => (
              <Link key={b.id} href={`/bounties/${b.id}`} className="wanted w-40 shrink-0 rounded-2xl p-3">
                <span className="wanted-stamp text-[9px]">WANTED</span>
                <div className="mt-1.5 line-clamp-2 h-10 text-[13px] font-bold leading-snug">{b.title}</div>
                <div className="mt-1 text-[11px] opacity-80">{b.targetPrice ? `${won(b.targetPrice)} 이하` : "최저가 찾기"}</div>
                <div className="mt-2 text-lg font-black">💰 {compact(b.pot)}P</div>
                <div className="text-[11px] opacity-80">
                  🙋 {compact(b.participantCount)}명 · 발견 {b.foundCount}
                </div>
              </Link>
            ))}
            <Link href="/bounties/new" className="flex w-32 shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line text-center text-xs text-sub">
              <span className="text-2xl">＋</span>
              찾는 상품
              <br />
              수배 걸기
            </Link>
          </div>
        </section>
      )}

      {!q && (
        <div className="mx-4 mt-3 rounded-xl bg-brand-soft px-3 py-2 text-xs text-ink/80">
          💸 오늘 줍줍러들이 아낀 돈 <b>{compact(Number(stats.saved))}원</b> · 새 딜 {stats.deals}개 · 구매 이동 {compact(stats.clicks)}회
        </div>
      )}

      {q && <p className="px-4 pt-3 text-sm text-sub">‘{q}’ 검색 결과</p>}

      <section className="mt-3 divide-y divide-line">
        {items.length === 0 ? (
          <div className="px-4 py-16 text-center text-sub">
            <div className="text-4xl">🧺</div>
            <p className="mt-2">아직 딜이 없어요. 첫 핫딜을 올려보세요!</p>
            <Link href="/submit" className="mt-4 inline-block rounded-full bg-brand px-5 py-2 font-bold text-white">
              핫딜 올리기
            </Link>
          </div>
        ) : (
          <FeedList initial={items} initialCursor={nextCursor} query={apiQuery}>
            {items.map((d, i) => (
              <DealCard key={d.id} deal={d} rank={sort === "hot" || sort === "top" ? i : undefined} />
            ))}
          </FeedList>
        )}
      </section>
    </>
  );
}
