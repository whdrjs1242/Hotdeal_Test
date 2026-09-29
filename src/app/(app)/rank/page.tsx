import Link from "next/link";
import { sql } from "@/lib/db";
import { cached } from "@/lib/cache";
import { levelOf } from "@/lib/levels";
import { TopBar } from "@/components/ui";

export const metadata = { title: "이번 주 랭킹" };
export const dynamic = "force-dynamic"; // Redis 캐시(5분)로 부하 제어

interface Row {
  id: number;
  nickname: string;
  handle: string | null;
  xp: number;
  score: number;
  userChar: string | null;
}

/** 주간 랭킹 — 매주 월요일 0시(KST) 초기화 */
export default async function RankPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const tab = (await searchParams).t === "share" ? "share" : "hunter";
  const { hunters, sharers } = await cached("rank:weekly", 300, async () => {
    const weekStart = sql`date_trunc('week', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'`;
    const [hunters, sharers] = await Promise.all([
      sql<Row[]>`
        SELECT u.id, u.nickname, u.handle, u.xp, (SELECT image FROM shop_items WHERE item_key = u.equip_character) AS user_char,
               (sum(d.votes_up - d.votes_down) * 10 + sum(d.click_count) + count(*) * 5)::int AS score
        FROM deals d JOIN users u ON u.id = d.user_id
        WHERE d.created_at >= ${weekStart} AND d.status <> 'hidden'
        GROUP BY u.id ORDER BY score DESC LIMIT 30`,
      sql<Row[]>`
        SELECT u.id, u.nickname, u.handle, u.xp, (SELECT image FROM shop_items WHERE item_key = u.equip_character) AS user_char,
               count(DISTINCT c.ip_hash)::int AS score
        FROM clicks c JOIN users u ON u.id = c.sharer_id
        WHERE c.created_at >= ${weekStart}
        GROUP BY u.id ORDER BY score DESC LIMIT 30`,
    ]);
    return { hunters, sharers };
  });
  const rows = tab === "share" ? sharers : hunters;
  return (
    <>
      <TopBar title="이번 주 랭킹" />
      <nav className="flex gap-5 border-b border-line bg-surface px-5">
        {[
          { id: "hunter", label: "좋은 딜을 찾은 사람" },
          { id: "share", label: "많이 알린 사람" },
        ].map((t) => (
          <Link
            key={t.id}
            href={t.id === "hunter" ? "/rank" : "/rank?t=share"}
            className={`-mb-px border-b-2 pb-2.5 text-[15px] ${tab === t.id ? "border-ink font-bold" : "border-transparent text-muted"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <p className="bg-surface px-5 py-3 text-[13px] text-muted">
        {tab === "share" ? "공유한 링크로 들어온 방문자 수 기준이에요." : "올린 딜의 추천·구매 이동·등록 수를 합산했어요."} 매주 월요일에 초기화돼요.
      </p>
      <ol className="divide-y divide-line bg-surface">
        {rows.map((r, i) => {
          const inner = (
            <>
              <span className={`tnum w-6 text-center text-[16px] font-bold ${i < 3 ? "text-brand" : "text-muted"}`}>{i + 1}</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-fill text-[18px]">{r.userChar ?? r.nickname.slice(0, 1)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{r.nickname}</span>
                <span className="block text-[12px] text-muted">Lv.{levelOf(r.xp).level}</span>
              </span>
              <span className="tnum text-[15px] font-semibold">
                {r.score.toLocaleString()}
                <span className="ml-0.5 text-[12px] font-normal text-muted">{tab === "share" ? "명" : "점"}</span>
              </span>
            </>
          );
          return (
            <li key={r.id}>
              {r.handle ? (
                <Link href={`/@${r.handle}`} className="flex items-center gap-3 px-5 py-3">
                  {inner}
                </Link>
              ) : (
                <div className="flex items-center gap-3 px-5 py-3">{inner}</div>
              )}
            </li>
          );
        })}
        {rows.length === 0 && <li className="px-5 py-12 text-center text-[14px] text-muted">이번 주 기록이 아직 없어요.</li>}
      </ol>
    </>
  );
}
