import Link from "next/link";
import { sql } from "@/lib/db";
import { cached } from "@/lib/cache";
import { levelOf } from "@/lib/levels";
import { compact } from "@/lib/format";

export const metadata = { title: "헌터 랭킹" };
export const dynamic = "force-dynamic"; // Redis 캐시(5분)로 부하 제어

interface Row {
  id: number;
  nickname: string;
  handle: string | null;
  xp: number;
  score: number;
}

/** 주간 시즌 랭킹 — 매주 월요일 0시(KST) 리셋 */
export default async function RankPage() {
  const { hunters, sharers } = await cached("rank:weekly", 300, async () => {
    const weekStart = sql`date_trunc('week', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'`;
    const [hunters, sharers] = await Promise.all([
      sql<Row[]>`
        SELECT u.id, u.nickname, u.handle, u.xp,
               (sum(d.votes_up - d.votes_down) * 10 + sum(d.click_count) + count(*) * 5)::int AS score
        FROM deals d JOIN users u ON u.id = d.user_id
        WHERE d.created_at >= ${weekStart} AND d.status <> 'hidden'
        GROUP BY u.id ORDER BY score DESC LIMIT 30`,
      sql<Row[]>`
        SELECT u.id, u.nickname, u.handle, u.xp, count(DISTINCT c.ip_hash)::int AS score
        FROM clicks c JOIN users u ON u.id = c.sharer_id
        WHERE c.created_at >= ${weekStart}
        GROUP BY u.id ORDER BY score DESC LIMIT 30`,
    ]);
    return { hunters, sharers };
  });

  return (
    <div className="pt-safe">
      <header className="bg-gradient-to-b from-brand to-[#ff2e55] px-4 pb-6 pt-6 text-white">
        <h1 className="text-2xl font-black">🏆 이번 주 헌터 랭킹</h1>
        <p className="mt-1 text-sm opacity-90">매주 월요일 리셋 · TOP 3 에게 시즌 뱃지와 보너스 포인트</p>
      </header>
      <Board title="🎯 딜 헌터 (좋은 딜을 가장 많이 찾은 사람)" rows={hunters} unit="점" />
      <Board title="📣 인플루언서 (공유로 가장 많이 데려온 사람)" rows={sharers} unit="명 유입" />
    </div>
  );
}

function Board({ title, rows, unit }: { title: string; rows: Row[]; unit: string }) {
  const medal = ["🥇", "🥈", "🥉"];
  return (
    <section className="mt-2 bg-surface">
      <h2 className="px-4 pt-4 text-sm font-bold">{title}</h2>
      <ol className="mt-2 divide-y divide-line">
        {rows.map((r, i) => {
          const lv = levelOf(r.xp);
          const inner = (
            <>
              <span className="w-8 text-center text-lg font-black">{medal[i] ?? i + 1}</span>
              <span className="text-xl">{lv.emoji}</span>
              <span className="flex-1 truncate font-semibold">{r.nickname}</span>
              <span className="text-sm font-bold text-brand">
                {compact(r.score)}
                <span className="ml-0.5 text-xs font-normal text-sub">{unit}</span>
              </span>
            </>
          );
          return (
            <li key={r.id}>
              {r.handle ? (
                <Link href={`/@${r.handle}`} className="flex items-center gap-3 px-4 py-3">
                  {inner}
                </Link>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3">{inner}</div>
              )}
            </li>
          );
        })}
        {rows.length === 0 && <li className="px-4 py-8 text-center text-sm text-sub">이번 주 1등의 주인공이 되어보세요!</li>}
      </ol>
    </section>
  );
}
