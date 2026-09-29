import Link from "next/link";
import { listDeals, type SortKey } from "@/lib/deals";
import { cached } from "@/lib/cache";
import { sql } from "@/lib/db";
import { CATEGORIES } from "@/lib/categories";
import { listBounties } from "@/lib/bounties";
import { getCurrentUser } from "@/lib/auth";
import { compact, won } from "@/lib/format";
import { DealCard } from "@/components/DealCard";
import { FeedList } from "@/components/FeedList";
import { Icon } from "@/components/Icon";
import { Empty } from "@/components/ui";

const SORTS: { id: SortKey; label: string }[] = [
  { id: "hot", label: "인기" },
  { id: "new", label: "최신" },
  { id: "ending", label: "마감 임박" },
  { id: "top", label: "오늘 베스트" },
];

type SP = Promise<{ sort?: string; category?: string; q?: string }>;

export default async function Home({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const sort = (SORTS.some((s) => s.id === sp.sort) ? sp.sort : "hot") as SortKey;
  const category = sp.category ?? "all";
  const q = sp.q?.trim() || null;

  const [{ items, nextCursor }, bounties, user] = await Promise.all([
    q ? listDeals({ sort, category, q }) : cached(`feed:${sort}:${category}:`, 15, () => listDeals({ sort, category })),
    q || category !== "all" ? { items: [] } : cached("bounties:strip", 30, () => listBounties({ sort: "hot", limit: 6 })),
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
      <header className="pt-safe sticky top-0 z-30 bg-surface">
        <div className="flex h-14 items-center gap-3 px-5">
          <Link href="/" className="text-[22px] font-extrabold tracking-tight text-brand">
            줍줍
          </Link>
          <form action="/" className="relative flex-1">
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="상품명으로 핫딜 검색"
              className="h-10 w-full rounded-xl bg-fill pl-9 pr-3 text-[15px] outline-none placeholder:text-muted"
            />
          </form>
          <Link href="/alerts" aria-label={`알림${unread ? ` ${unread}개` : ""}`} className="relative text-ink">
            <Icon name="bell" />
            {unread > 0 && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-brand" />}
          </Link>
        </div>
        <nav className="flex gap-5 border-b border-line px-5">
          {SORTS.map((s) => (
            <Link
              key={s.id}
              href={qs({ sort: s.id })}
              className={`-mb-px border-b-2 pb-2.5 pt-1 text-[15px] ${sort === s.id ? "border-ink font-bold text-ink" : "border-transparent text-muted"}`}
            >
              {s.label}
            </Link>
          ))}
        </nav>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-5 py-2.5">
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              href={qs({ category: c.id })}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] ${category === c.id ? "bg-ink font-semibold text-surface" : "bg-fill text-sub"}`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      </header>

      {bounties.items.length > 0 && (
        <section className="mt-2 bg-surface py-4">
          <div className="flex items-end justify-between px-5">
            <div>
              <h2 className="text-[17px] font-bold">찾고 있는 상품</h2>
              <p className="text-[13px] text-muted">찾아서 올리면 현상금을 받아요</p>
            </div>
            <Link href="/bounties" className="flex items-center text-[13px] text-muted">
              전체
              <Icon name="chevron" size={14} />
            </Link>
          </div>
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-5">
            {bounties.items.map((b) => (
              <Link key={b.id} href={`/bounties/${b.id}`} className="w-[172px] shrink-0 rounded-xl border border-line p-3.5">
                <p className="line-clamp-2 min-h-10 text-[14px] font-semibold leading-5">{b.title}</p>
                <p className="mt-1 text-[12px] text-muted">{b.targetPrice ? `${won(b.targetPrice)} 이하` : "최저가"}</p>
                <div className="mt-2.5 flex items-baseline justify-between">
                  <span className="tnum text-[15px] font-bold text-brand">{b.pot.toLocaleString()}P</span>
                  <span className="text-[12px] text-muted">{compact(b.participantCount)}명 참여</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {q && (
        <p className="mt-2 bg-surface px-5 py-3 text-[14px] text-sub">
          ‘<b className="text-ink">{q}</b>’ 검색 결과
        </p>
      )}

      <section className="mt-2 divide-y divide-line bg-surface">
        {items.length === 0 ? (
          q ? (
            <Empty title="검색 결과가 없어요" desc="찾는 상품을 수배하면 다른 사람들이 찾아줘요" action={{ label: "수배 걸기", href: "/bounties/new" }} />
          ) : (
            <Empty title="아직 올라온 딜이 없어요" desc="싸게 파는 곳을 알고 있다면 먼저 알려주세요" action={{ label: "핫딜 올리기", href: "/submit" }} />
          )
        ) : (
          <FeedList initial={items} initialCursor={nextCursor} query={apiQuery}>
            {items.map((d) => (
              <DealCard key={d.id} deal={d} />
            ))}
          </FeedList>
        )}
      </section>
    </>
  );
}
