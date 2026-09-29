import Link from "next/link";
import { cached } from "@/lib/cache";
import { listBounties, type BountySort } from "@/lib/bounties";
import { sql } from "@/lib/db";
import { BountyCard } from "@/components/BountyCard";
import { BountyFeed } from "@/components/BountyFeed";
import { Icon } from "@/components/Icon";
import { Empty, buttonClass } from "@/components/ui";

export const metadata = { title: "수배" };

const SORTS: { id: BountySort; label: string }[] = [
  { id: "hot", label: "많이 찾는" },
  { id: "ending", label: "마감 임박" },
  { id: "new", label: "새로 올라온" },
  { id: "found", label: "상품 발견" },
];

export default async function BountiesPage({ searchParams }: { searchParams: Promise<{ sort?: string; q?: string }> }) {
  const sp = await searchParams;
  const sort = (SORTS.some((s) => s.id === sp.sort) ? sp.sort : "hot") as BountySort;
  const q = sp.q?.trim() || null;
  const [{ items, nextCursor }, stats] = await Promise.all([
    q ? listBounties({ sort, q }) : cached(`bounties:${sort}:`, 15, () => listBounties({ sort })),
    cached("bounties:stats", 60, async () => {
      const [s] = await sql<{ open: number; pot: number }[]>`
        SELECT count(*)::int AS open, COALESCE(sum(pot), 0)::int AS pot
        FROM bounties WHERE status = 'open' AND expires_at > now()`;
      return s;
    }),
  ]);
  const apiQuery = new URLSearchParams({ sort, ...(q ? { q } : {}) }).toString();

  return (
    <div className="pt-safe">
      <header className="sticky top-0 z-30 bg-surface">
        <div className="flex h-14 items-center justify-between px-5">
          <h1 className="text-[20px] font-bold">수배</h1>
          <Link href="/bounties/new" className={buttonClass("primary", "sm")}>
            <Icon name="plus" size={16} strokeWidth={2.2} />
            수배 걸기
          </Link>
        </div>
        <nav className="flex gap-5 border-b border-line px-5">
          {SORTS.map((s) => (
            <Link
              key={s.id}
              href={s.id === "hot" ? "/bounties" : `/bounties?sort=${s.id}`}
              className={`-mb-px border-b-2 pb-2.5 pt-1 text-[15px] ${sort === s.id ? "border-ink font-bold" : "border-transparent text-muted"}`}
            >
              {s.label}
            </Link>
          ))}
        </nav>
      </header>

      <section className="bg-surface px-5 py-4">
        <p className="text-[14px] text-sub">
          지금 <b className="text-ink">{stats.open.toLocaleString()}개</b> 상품을 찾고 있고, 걸린 현상금은 모두{" "}
          <b className="text-ink">{stats.pot.toLocaleString()}P</b>예요.
        </p>
        <details className="mt-3 rounded-xl bg-fill px-4 py-3 text-[13px] text-sub">
          <summary className="cursor-pointer font-semibold text-ink">수배는 어떻게 진행되나요?</summary>
          <ol className="mt-2 space-y-1.5 leading-relaxed">
            <li>1. 찾는 상품과 목표가를 적고 포인트를 현상금으로 걸어요.</li>
            <li>2. 다른 사람들이 상품을 찾아 링크를 올리고, 참여자들이 평가해요.</li>
            <li>3. 마음에 드는 상품을 채택하면 찾은 사람이 현상금을 받아요. 마감까지 적합한 상품이 없으면 전액 돌려드려요.</li>
            <li>4. 찾은 상품이 팔릴 때마다 찾은 사람·공유한 사람·수배한 사람 모두 포인트를 받아요.</li>
          </ol>
        </details>
      </section>

      <section className="mt-2 divide-y divide-line bg-surface">
        {items.length === 0 ? (
          <Empty title="진행 중인 수배가 없어요" desc="찾고 싶은 상품이 있다면 첫 수배를 걸어보세요" action={{ label: "수배 걸기", href: "/bounties/new" }} />
        ) : (
          <BountyFeed initialCursor={nextCursor} query={apiQuery}>
            {items.map((b) => (
              <BountyCard key={b.id} bounty={b} />
            ))}
          </BountyFeed>
        )}
      </section>
    </div>
  );
}
