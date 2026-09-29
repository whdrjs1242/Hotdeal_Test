import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { deltaPct, loadDashboard, RANGES, type RangeDays } from "@/lib/dashboard";
import { cached } from "@/lib/cache";
import { merchantById } from "@/lib/affiliate/merchants";
import { CATEGORIES } from "@/lib/categories";
import { compact, won, timeAgo } from "@/lib/format";
import { TrendChart } from "@/components/dash/TrendChart";
import { BarList } from "@/components/dash/BarList";
import { Funnel } from "@/components/dash/Funnel";
import { Heatmap } from "@/components/dash/Heatmap";
import { StatTile } from "@/components/dash/StatTile";
import { AdminConversionUpload, AdminDealStatus, WithdrawalActions } from "@/components/Admin";

export const metadata = { title: "운영 대시보드" };

const NETWORK_LABEL: Record<string, string> = {
  coupang: "쿠팡",
  linkprice: "링크프라이스",
  aliexpress: "알리익스프레스",
  amazon: "아마존",
  none: "일반 링크",
};
const POINT_GROUPS: { label: string; kinds: string[] }[] = [
  { label: "헌터", kinds: ["hunter_reward", "post_reward"] },
  { label: "공유자", kinds: ["share_reward"] },
  { label: "수배자", kinds: ["bounty_reward"] },
  { label: "현상금 지급", kinds: ["bounty_prize"] },
  { label: "참여 활동", kinds: ["activity"] },
  { label: "초대·가입", kinds: ["referral_reward", "signup_bonus", "checkin"] },
];

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.id)) notFound();
  const { range } = await searchParams;
  const days = (RANGES.find((r) => String(r) === range) ?? 30) as RangeDays;
  const d = await cached(`dash:${days}`, 60, () => loadDashboard(days));

  const t = d.totals;
  const p = d.prevTotals;
  const series = (k: keyof typeof t) => d.daily.map((r) => r[k]);
  const dayLabels = d.daily.map((r) => r.day);
  const pointsBy = (kinds: string[]) =>
    d.points.filter((x) => kinds.includes(x.kind)).reduce((a, x) => a + x.pending + x.available, 0);
  const rewardOut = pointsBy(["hunter_reward", "post_reward", "share_reward", "bounty_reward"]);
  const netRevenue = t.commission - rewardOut;
  const cvr = t.clicks ? (t.orders / t.clicks) * 100 : 0;
  const pendingCashout = d.withdrawals.reduce((a, w) => a + w.amountKrw, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
      <header className="flex flex-wrap items-center gap-3 py-5">
        <Link href="/" className="text-xl font-black" style={{ color: "var(--d-accent)" }}>
          줍줍
        </Link>
        <h1 className="text-lg font-bold">운영 대시보드</h1>
        <nav className="ml-auto flex rounded-xl p-1 text-sm" style={{ background: "var(--d-surface)", boxShadow: "0 0 0 1px var(--d-ring)" }}>
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/admin?range=${r}`}
              className="rounded-lg px-3 py-1.5 font-semibold"
              style={r === days ? { background: "var(--d-ink)", color: "var(--d-surface)" } : { color: "var(--d-ink-2)" }}
            >
              최근 {r}일
            </Link>
          ))}
        </nav>
      </header>

      {/* 히어로: 기간 수수료 */}
      <section className="card grid gap-6 p-6 md:grid-cols-[1.2fr_2fr]">
        <div>
          <div className="text-sm text-[var(--d-ink-2)]">최근 {days}일 제휴 수수료</div>
          <div className="mt-1 text-5xl font-bold tracking-tight">{won(t.commission)}</div>
          <Delta cur={t.commission} prev={p.commission} />
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <Kv k="구매 기여 포인트 지급" v={`${compact(rewardOut)}P`} />
            <Kv k="플랫폼 순수익(추정)" v={won(netRevenue)} />
            <Kv k="주문 수" v={`${t.orders.toLocaleString()}건`} />
            <Kv k="구매 전환율" v={`${cvr.toFixed(2)}%`} />
          </dl>
        </div>
        <div>
          <div className="mb-1 text-sm font-semibold">일별 수수료</div>
          <TrendChart days={dayLabels} series={[{ key: "c", label: "수수료", color: "var(--d-s1)", values: series("commission") }]} unit="원" />
        </div>
      </section>

      {/* KPI 타일 (변화율: 직전 동일 기간 대비) */}
      <section className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <StatTile label="신규 가입" value={compact(t.signups)} delta={deltaPct(t.signups, p.signups)} trend={series("signups")} />
        <StatTile label="초대 가입" value={compact(t.referred)} delta={deltaPct(t.referred, p.referred)} trend={series("referred")} />
        <StatTile label="새 핫딜" value={compact(t.deals)} delta={deltaPct(t.deals, p.deals)} trend={series("deals")} />
        <StatTile label="구매 이동" value={compact(t.clicks)} delta={deltaPct(t.clicks, p.clicks)} trend={series("clicks")} />
        <StatTile label="공유 유입" value={compact(t.arrivals)} delta={deltaPct(t.arrivals, p.arrivals)} trend={series("arrivals")} />
        <StatTile label="새 수배지" value={compact(t.bounties)} delta={deltaPct(t.bounties, p.bounties)} trend={series("bounties")} />
        <StatTile label="수배 발견 상품" value={compact(t.finds)} delta={deltaPct(t.finds, p.finds)} trend={series("finds")} />
        <StatTile label="주문" value={compact(t.orders)} delta={deltaPct(t.orders, p.orders)} trend={series("orders")} />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="구매 이동" sub="구매 버튼 클릭 · 공유 링크 경유 포함">
          <TrendChart
            days={dayLabels}
            series={[
              { key: "all", label: "전체 구매 이동", color: "var(--d-s1)", values: series("clicks") },
              { key: "share", label: "공유 링크 경유", color: "var(--d-s2)", values: series("shareClicks") },
            ]}
            unit="회"
          />
        </Card>
        <Card title="성장" sub="신규 가입 중 친구 초대로 들어온 비율이 바이럴 지표">
          <TrendChart
            days={dayLabels}
            series={[
              { key: "s", label: "신규 가입", color: "var(--d-s1)", values: series("signups") },
              { key: "r", label: "초대 가입", color: "var(--d-s2)", values: series("referred") },
            ]}
            unit="명"
          />
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="현상금 수배 퍼널" sub={`최근 ${days}일 등록된 수배지`}>
          <Funnel
            steps={[
              { label: "수배지 등록", value: d.funnel.created },
              { label: "참여자 1명 이상", value: d.funnel.joined },
              { label: "상품 발견", value: d.funnel.found },
              { label: "채택·해결", value: d.funnel.awarded },
            ]}
          />
        </Card>
        <Card title="포인트 지급 구성" sub="역할별 적립 (확정 + 대기) · 헌터·공유자·수배자는 구매 기여분">
          <BarList items={POINT_GROUPS.map((g) => ({ label: g.label, value: pointsBy(g.kinds) }))} unit="P" />
        </Card>
        <Card title="판매처 네트워크별 구매 이동">
          <BarList items={d.byNetwork.map((n) => ({ label: NETWORK_LABEL[n.network] ?? n.network, value: n.clicks }))} unit="회" />
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="언제 사러 가나요?" sub="요일 × 시간대 구매 이동 (KST) — 푸시·타임딜 발송 시간 참고" className="lg:col-span-2">
          <Heatmap cells={d.heat} />
        </Card>
        <Card title="카테고리별 구매 이동">
          <BarList
            items={d.byCategory.slice(0, 8).map((c) => ({
              label: CATEGORIES.find((x) => x.id === c.category)?.name ?? c.category,
              value: c.clicks,
              sub: `딜 ${c.deals}개`,
            }))}
            unit="회"
          />
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="많이 팔린 딜 TOP" className="lg:col-span-1">
          <Table
            head={["딜", "구매 이동"]}
            rows={d.topDeals.map((x) => [
              <Link key="t" href={`/deals/${x.id}`} className="line-clamp-1 hover:underline">
                <span className="text-[var(--d-muted)]">{merchantById(x.merchant).name}</span> {x.title}
              </Link>,
              x.clicks.toLocaleString(),
            ])}
          />
        </Card>
        <Card title="인기 수배지">
          <Table
            head={["수배", "참여", "현상금"]}
            rows={d.hotBounties.map((b) => [
              <Link key="t" href={`/bounties/${b.id}`} className="line-clamp-1 hover:underline">
                {b.status === "awarded" ? "🏆 " : ""}
                {b.title}
              </Link>,
              b.participantCount.toLocaleString(),
              `${compact(b.pot)}P`,
            ])}
          />
        </Card>
        <Card title="공유 인플루언서 TOP" sub="공유 링크로 데려온 순 방문자">
          <Table
            head={["유저", "방문자", "초대"]}
            rows={d.topSharers.map((s) => [
              s.handle ? (
                <Link key="n" href={`/@${s.handle}`} className="hover:underline">
                  {s.nickname}
                </Link>
              ) : (
                s.nickname
              ),
              s.visitors.toLocaleString(),
              s.invited.toLocaleString(),
            ])}
          />
        </Card>
      </section>

      <h2 className="mt-8 text-base font-bold">운영</h2>
      <section className="mt-3 grid gap-4 lg:grid-cols-3">
        <Card title={`현금화 신청 ${d.withdrawals.length}건`} sub={`송금 대기 ${won(pendingCashout)}`} className="lg:col-span-2">
          {d.withdrawals.length === 0 ? (
            <p className="py-6 text-center text-xs text-[var(--d-muted)]">대기 중인 신청이 없어요</p>
          ) : (
            <ul className="divide-y divide-[var(--d-grid)] text-sm">
              {d.withdrawals.map((w) => (
                <li key={w.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <div className="min-w-40 flex-1">
                    <b>{w.nickname}</b> <span className="text-xs text-[var(--d-muted)]">{timeAgo(w.createdAt)}</span>
                    <div className="tnum text-xs text-[var(--d-ink-2)]">
                      {w.points.toLocaleString()}P → <b className="text-[var(--d-ink)]">{won(w.amountKrw)}</b> · {w.bankName} ****{w.accountLast4} ·{" "}
                      {w.holderName}
                    </div>
                  </div>
                  <WithdrawalActions id={w.id} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="서비스 현황">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Kv k="전체 회원" v={d.live.users.toLocaleString()} />
            <Kv k="진행 중 딜" v={d.live.activeDeals.toLocaleString()} />
            <Kv k="키워드 알림" v={d.live.alerts.toLocaleString()} />
            <Kv k="푸시 구독 기기" v={d.live.pushSubs.toLocaleString()} />
            <Kv k="크리에이터 채널" v={d.live.creators.toLocaleString()} />
          </dl>
        </Card>
        <Card title="제휴 실적 업로드 (CSV)" sub="network,external_id,sub_id,order_amount,commission,status — 같은 주문 재업로드 시 상태만 갱신" className="lg:col-span-2">
          <AdminConversionUpload />
        </Card>
        <Card title="신고된 딜">
          <ul className="divide-y divide-[var(--d-grid)] text-sm">
            {d.reported.map((x) => (
              <li key={x.id} className="flex items-center gap-2 py-2">
                <Link href={`/deals/${x.id}`} className="line-clamp-1 flex-1">
                  <span className="tnum text-xs text-[var(--d-bad)]">⚠ {x.reportCount}</span> {x.title}
                </Link>
                <AdminDealStatus id={x.id} status={x.status} />
              </li>
            ))}
            {d.reported.length === 0 && <li className="py-3 text-xs text-[var(--d-muted)]">신고 없음</li>}
          </ul>
        </Card>
      </section>
    </div>
  );
}

function Card({ title, sub, children, className = "" }: { title: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`card p-5 ${className}`}>
      <h3 className="text-sm font-semibold">{title}</h3>
      {sub && <p className="mt-0.5 text-xs text-[var(--d-muted)]">{sub}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-[var(--d-muted)]">{k}</dt>
      <dd className="mt-0.5 font-semibold">{v}</dd>
    </div>
  );
}

function Delta({ cur, prev }: { cur: number; prev: number }) {
  const pct = deltaPct(cur, prev);
  if (pct == null) return <div className="mt-1 text-sm text-[var(--d-muted)]">직전 기간 데이터 없음</div>;
  return (
    <div className="tnum mt-1 text-sm font-semibold" style={{ color: pct >= 0 ? "var(--d-good)" : "var(--d-bad)" }}>
      {pct >= 0 ? "▲" : "▼"} {Math.abs(pct)}% <span className="font-normal text-[var(--d-muted)]">직전 동기간 {won(prev)} 대비</span>
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  if (!rows.length) return <p className="py-6 text-center text-xs text-[var(--d-muted)]">데이터가 없어요</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-[var(--d-muted)]">
          {head.map((h, i) => (
            <th key={h} className={`whitespace-nowrap pb-2 font-normal ${i ? "pl-3 text-right" : ""}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--d-grid)]">
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j} className={`py-2 ${j ? "tnum whitespace-nowrap pl-3 text-right" : "max-w-0 w-full"}`}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
