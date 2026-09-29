import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { cached } from "@/lib/cache";
import { listDeals } from "@/lib/deals";
import { levelOf } from "@/lib/levels";
import { compact } from "@/lib/format";
import { DealCard } from "@/components/DealCard";
import { Empty } from "@/components/ui";
import { ProfileCard } from "@/components/ProfileCard";
import { getLook } from "@/lib/cosmetics";

type Props = { params: Promise<{ handle: string }> };

interface Creator {
  id: number;
  nickname: string;
  handle: string;
  bio: string | null;
  xp: number;
  refCode: string;
  avatarUrl: string | null;
  dealCount: number;
  upvotes: number;
}

const loadCreator = (handle: string) =>
  cached(`creator:${handle}`, 60, async () => {
    const [c] = await sql<Creator[]>`
      SELECT u.id, u.nickname, u.handle, u.bio, u.xp, u.ref_code, u.avatar_url,
             (SELECT count(*)::int FROM deals WHERE user_id = u.id AND status <> 'hidden') AS deal_count,
             (SELECT COALESCE(sum(votes_up),0)::int FROM deals WHERE user_id = u.id) AS upvotes
      FROM users u WHERE u.handle = ${handle.toLowerCase()}`;
    return c ?? null;
  });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await loadCreator(decodeURIComponent((await params).handle));
  if (!c) return {};
  return { title: `${c.nickname}의 핫딜 채널`, description: c.bio ?? `${c.nickname}님이 고른 오늘의 핫딜` };
}

/**
 * 크리에이터 핫딜 채널 (link-in-bio SaaS).
 * 이 페이지의 모든 딜 링크엔 크리에이터 ref 코드가 붙어, 팔로워 유입·구매가 크리에이터의 기여 포인트로 쌓인다.
 */
export default async function ChannelPage({ params }: Props) {
  const c = await loadCreator(decodeURIComponent((await params).handle));
  if (!c) notFound();
  const [deals, look] = await Promise.all([listDeals({ sort: "new", userId: c.id, limit: 30 }), getLook(c.id)]);
  const lv = levelOf(c.xp);
  return (
    <div className="pt-safe min-h-dvh">
      <header className="bg-surface px-5 pb-5 pt-8">
        <ProfileCard
          nickname={c.nickname}
          xp={c.xp}
          look={look}
          avatarUrl={c.avatarUrl}
          stats={[
            { label: "올린 딜", value: c.dealCount },
            { label: "받은 추천", value: c.upvotes },
            { label: "레벨", value: lv.level },
            { label: "경험치", value: c.xp },
          ]}
        />
        <p className="mt-3 text-[14px] text-sub">
          <span className="text-muted">@{c.handle}</span>
          {c.bio && <span className="ml-2">{c.bio}</span>}
        </p>
      </header>
      <h2 className="mt-2 bg-surface px-5 pt-5 text-[17px] font-bold">{c.nickname}님이 고른 핫딜</h2>
      <section className="divide-y divide-line bg-surface">
        {deals.items.map((d) => (
          <DealCard key={d.id} deal={d} refCode={c.refCode} />
        ))}
        {deals.items.length === 0 && <Empty title="아직 올린 딜이 없어요" />}
      </section>
      <footer className="py-8 text-center text-[13px] text-muted">
        <Link href={`/?r=${c.refCode}`} className="font-semibold text-brand">
          줍줍
        </Link>
        에서 나만의 핫딜 채널을 만들어보세요
      </footer>
    </div>
  );
}
