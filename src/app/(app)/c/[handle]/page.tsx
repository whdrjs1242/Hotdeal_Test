import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { cached } from "@/lib/cache";
import { listDeals } from "@/lib/deals";
import { levelOf } from "@/lib/levels";
import { compact } from "@/lib/format";
import { DealCard } from "@/components/DealCard";

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
  const deals = await listDeals({ sort: "new", userId: c.id, limit: 30 });
  const lv = levelOf(c.xp);
  return (
    <div className="pt-safe min-h-dvh">
      <header className="bg-gradient-to-b from-brand-soft to-canvas px-6 pb-6 pt-10 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-surface text-4xl shadow">
          {c.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            lv.emoji
          )}
        </div>
        <h1 className="mt-3 text-xl font-black">{c.nickname}</h1>
        <p className="text-xs text-sub">
          @{c.handle} · {lv.emoji} {lv.name}
        </p>
        {c.bio && <p className="mt-2 text-sm">{c.bio}</p>}
        <div className="mt-3 flex justify-center gap-6 text-sm">
          <span>
            <b>{compact(c.dealCount)}</b> 딜
          </span>
          <span>
            <b>{compact(c.upvotes)}</b> 🔥
          </span>
        </div>
      </header>
      <section className="divide-y divide-line">
        {deals.items.map((d) => (
          <DealCard key={d.id} deal={d} refCode={c.refCode} />
        ))}
        {deals.items.length === 0 && <p className="py-16 text-center text-sm text-sub">아직 올린 딜이 없어요</p>}
      </section>
      <footer className="py-8 text-center text-xs text-sub">
        <Link href={`/?r=${c.refCode}`} className="font-bold text-brand">
          줍줍
        </Link>
        에서 나만의 핫딜 채널 만들기
      </footer>
    </div>
  );
}
