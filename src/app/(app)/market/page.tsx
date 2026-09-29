import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listShopItems, ownedItemIds, RARITY } from "@/lib/market";
import { BuyButton } from "@/components/BuyButton";
import { TopBar } from "@/components/ui";

export const metadata = { title: "포인트 교환" };

const TABS = [
  { id: "giftcard", label: "상품권" },
  { id: "product", label: "상품" },
  { id: "cosmetic", label: "꾸미기" },
] as const;

export default async function MarketPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: tabParam } = await searchParams;
  const tab = (TABS.find((t) => t.id === tabParam)?.id ?? "giftcard") as (typeof TABS)[number]["id"];
  const user = await getCurrentUser();
  const [items, owned] = await Promise.all([listShopItems(), user ? ownedItemIds(user.id) : new Set<number>()]);
  const list = items.filter((i) => i.kind === tab);

  return (
    <>
      <TopBar title="포인트 교환" right={<span className="tnum text-[15px] font-semibold">{(user?.pointsAvailable ?? 0).toLocaleString()}P</span>} />
      <nav className="flex gap-5 border-b border-line bg-surface px-5">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/market?tab=${t.id}`}
            className={`-mb-px border-b-2 pb-2.5 text-[15px] ${tab === t.id ? "border-ink font-bold" : "border-transparent text-muted"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <ul className="divide-y divide-line bg-surface">
        {list.map((i) => {
          const soldOut = i.stock != null && i.stock <= 0;
          const isOwned = owned.has(i.id);
          const rarity = RARITY[i.rarity as keyof typeof RARITY];
          return (
            <li key={i.id} id={`item-${i.id}`} className="flex items-center gap-3.5 px-5 py-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-fill text-[30px]">
                {i.slot === "card" ? (
                  <span className="block h-10 w-14 rounded-md" style={{ background: i.image ?? undefined }} />
                ) : i.slot === "frame" ? (
                  <span className="block h-10 w-10 rounded-full" style={{ boxShadow: `0 0 0 3px ${i.image}` }} />
                ) : i.slot === "title" ? (
                  <span className="text-[12px] font-semibold text-sub">칭호</span>
                ) : i.image?.startsWith("http") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.image} alt="" className="h-full w-full object-cover" />
                ) : i.kind === "cosmetic" ? (
                  i.image
                ) : (
                  <span className="text-[12px] font-semibold text-sub">{i.kind === "giftcard" ? "상품권" : "상품"}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                {i.kind === "cosmetic" && <p className="text-[12px] text-muted">{rarity?.label}</p>}
                <p className="text-[15px] font-semibold leading-snug">{i.name}</p>
                <p className="text-[12px] text-muted">
                  {i.description ?? ""}
                  {i.maxPerUserMonth ? ` · 한 달 ${i.maxPerUserMonth}회` : ""}
                  {i.stock != null && !soldOut ? ` · ${i.stock}개 남음` : ""}
                </p>
                <p className="tnum mt-0.5 text-[15px] font-bold">{i.pricePoints != null ? `${i.pricePoints.toLocaleString()}P` : "뽑기로만 얻을 수 있어요"}</p>
              </div>
              {i.pricePoints != null && (
                <BuyButton
                  item={{ id: i.id, name: i.name, kind: i.kind, price: i.pricePoints }}
                  disabled={soldOut || isOwned}
                  label={isOwned ? "보유 중" : soldOut ? "품절" : "교환"}
                  loggedIn={!!user}
                  balance={user?.pointsAvailable ?? 0}
                />
              )}
            </li>
          );
        })}
      </ul>
      <p className="px-5 py-5 text-[12px] leading-relaxed text-muted">
        상품권은 입력한 휴대폰 번호로, 상품은 배송지로 영업일 기준 3일 안에 보내드려요. 발송 전에는 취소할 수 있어요. 포인트는 현금으로 바꿀 수 없어요.
      </p>
    </>
  );
}
