import Link from "next/link";
import { cached } from "@/lib/cache";
import { listBounties, type BountySort } from "@/lib/bounties";
import { sql } from "@/lib/db";
import { compact } from "@/lib/format";
import { BountyCard } from "@/components/BountyCard";
import { BountyFeed } from "@/components/BountyFeed";

export const metadata = { title: "현상금 수배" };

const SORTS: { id: BountySort; label: string }[] = [
  { id: "hot", label: "🔥 인기 수배" },
  { id: "ending", label: "⏰ 마감임박" },
  { id: "new", label: "🆕 새 수배" },
  { id: "found", label: "🎯 발견됨" },
];

export default async function BountiesPage({ searchParams }: { searchParams: Promise<{ sort?: string; q?: string }> }) {
  const sp = await searchParams;
  const sort = (SORTS.some((s) => s.id === sp.sort) ? sp.sort : "hot") as BountySort;
  const q = sp.q?.trim() || null;
  const [{ items, nextCursor }, stats] = await Promise.all([
    q ? listBounties({ sort, q }) : cached(`bounties:${sort}:`, 15, () => listBounties({ sort })),
    cached("bounties:stats", 60, async () => {
      const [s] = await sql<{ open: number; pot: number; hunters: number }[]>`
        SELECT count(*)::int AS open, COALESCE(sum(pot), 0)::int AS pot,
               (SELECT count(DISTINCT user_id)::int FROM deals WHERE bounty_id IS NOT NULL AND created_at > now() - interval '7 days') AS hunters
        FROM bounties WHERE status = 'open' AND expires_at > now()`;
      return s;
    }),
  ]);
  const apiQuery = new URLSearchParams({ sort, ...(q ? { q } : {}) }).toString();

  return (
    <div className="pt-safe">
      <header className="bg-gradient-to-b from-[#2b2118] to-[#3d2c1f] px-4 pb-5 pt-5 text-[#fbe9c9]">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black">🎯 현상금 수배</h1>
          <Link href="/bounties/new" className="rounded-full bg-[#fbe9c9] px-3 py-1.5 text-sm font-bold text-[#2b2118]">
            + 수배지 걸기
          </Link>
        </div>
        <p className="mt-1 text-sm opacity-80">원하는 상품을 걸면 헌터들이 대신 찾아와요</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="진행 중 수배" value={compact(stats.open)} />
          <Stat label="걸린 현상금" value={`${compact(stats.pot)}P`} />
          <Stat label="이번 주 헌터" value={`${compact(stats.hunters)}명`} />
        </div>
        <details className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-xs">
          <summary className="cursor-pointer font-bold">💡 모두가 포인트를 버는 방법</summary>
          <ul className="mt-2 space-y-1.5 leading-relaxed opacity-90">
            <li>
              <b>수배자</b> — 포인트를 걸고 수배지를 올려요. 발견된 상품을 다른 사람들이 살수록 구매 건마다 포인트가 쌓여요.
            </li>
            <li>
              <b>참여자</b> — ‘나도 찾아요’, 댓글, 발견 상품 평가, 공유한 링크로 친구가 들어오면 포인트. 발견 상품을 지인에게 공유해
              구매로 이어지면 추가 포인트.
            </li>
            <li>
              <b>헌터</b> — 수배 상품을 찾아 올리면 채택 시 현상금 획득 + 그 링크로 구매가 일어날 때마다 포인트.
            </li>
          </ul>
        </details>
      </header>

      <nav className="no-scrollbar sticky top-0 z-30 flex gap-4 overflow-x-auto border-b border-line bg-surface/95 px-4 pt-3 backdrop-blur">
        {SORTS.map((s) => (
          <Link
            key={s.id}
            href={s.id === "hot" ? "/bounties" : `/bounties?sort=${s.id}`}
            className={`shrink-0 border-b-2 pb-2 text-[15px] ${sort === s.id ? "border-ink font-bold" : "border-transparent text-sub"}`}
          >
            {s.label}
          </Link>
        ))}
      </nav>

      <section className="space-y-3 px-3 py-3">
        {items.length === 0 ? (
          <div className="py-16 text-center text-sub">
            <div className="text-4xl">🎯</div>
            <p className="mt-2">첫 수배지를 걸어보세요</p>
          </div>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 py-2">
      <div className="text-lg font-black">{value}</div>
      <div className="text-[11px] opacity-70">{label}</div>
    </div>
  );
}
