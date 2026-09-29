import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listShopItems, ownedItemIds, RARITY } from "@/lib/market";
import { BuyButton } from "@/components/BuyButton";

export const metadata = { title: "포인트 마켓" };

const TABS = [
  { id: "giftcard", label: "🎫 상품권" },
  { id: "product", label: "📦 제휴 상품" },
  { id: "cosmetic", label: "🦊 꾸미기" },
] as const;

export default async function MarketPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: tabParam } = await searchParams;
  const tab = (TABS.find((t) => t.id === tabParam)?.id ?? "giftcard") as (typeof TABS)[number]["id"];
  const user = await getCurrentUser();
  const [items, owned] = await Promise.all([listShopItems(), user ? ownedItemIds(user.id) : new Set<number>()]);
  const list = items.filter((i) => i.kind === tab);

  return (
    <div className="pt-safe">
      <header className="flex items-end justify-between bg-surface px-4 pb-3 pt-5">
        <div>
          <h1 className="text-xl font-black">🛍️ 포인트 마켓</h1>
          <p className="text-xs text-sub">모은 포인트로 상품권·제휴 상품·꾸미기를 교환하세요</p>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-sub">내 포인트</div>
          <div className="text-lg font-black text-brand">{(user?.pointsAvailable ?? 0).toLocaleString()}P</div>
        </div>
      </header>
      <nav className="sticky top-0 z-30 flex gap-4 border-b border-line bg-surface/95 px-4 pt-2 backdrop-blur">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/market?tab=${t.id}`}
            className={`border-b-2 pb-2 text-[15px] ${tab === t.id ? "border-ink font-bold" : "border-transparent text-sub"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <section className="grid grid-cols-2 gap-2 p-3">
        {list.map((i) => {
          const soldOut = i.stock != null && i.stock <= 0;
          const isOwned = owned.has(i.id);
          const rarity = RARITY[i.rarity as keyof typeof RARITY];
          return (
            <div key={i.id} id={`item-${i.id}`} className="flex flex-col rounded-2xl bg-surface p-3 ring-1 ring-line">
              <div className="flex h-24 items-center justify-center rounded-xl bg-canvas text-5xl">
                {i.slot === "card" ? (
                  <span className="block h-14 w-24 rounded-lg shadow" style={{ background: i.image ?? undefined }} />
                ) : i.slot === "frame" ? (
                  <span className="block h-14 w-14 rounded-full" style={{ boxShadow: `0 0 0 4px ${i.image}, 0 0 14px ${i.image}` }} />
                ) : i.image?.startsWith("http") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.image} alt="" className="h-full w-full rounded-xl object-cover" />
                ) : (
                  i.image
                )}
              </div>
              {i.kind === "cosmetic" && (
                <span className="mt-2 text-[10px] font-bold" style={{ color: rarity?.color }}>
                  {rarity?.label} · {{ character: "캐릭터", card: "프로필 카드", frame: "테두리", title: "칭호" }[i.slot ?? ""]}
                </span>
              )}
              <div className="mt-1 line-clamp-2 text-sm font-semibold leading-snug">{i.name}</div>
              {i.description && <div className="line-clamp-1 text-[11px] text-sub">{i.description}</div>}
              <div className="mt-auto pt-2">
                {i.pricePoints == null ? (
                  <Link href="/points" className="block rounded-xl bg-canvas py-2 text-center text-xs font-bold text-sub">
                    🎰 뽑기에서만 획득
                  </Link>
                ) : (
                  <BuyButton
                    item={{ id: i.id, name: i.name, kind: i.kind, price: i.pricePoints }}
                    disabled={soldOut || isOwned}
                    label={isOwned ? "보유 중" : soldOut ? "품절" : `${i.pricePoints.toLocaleString()}P`}
                    loggedIn={!!user}
                    balance={user?.pointsAvailable ?? 0}
                  />
                )}
                {i.stock != null && !soldOut && <div className="mt-1 text-center text-[10px] text-sub">남은 수량 {i.stock}</div>}
              </div>
            </div>
          );
        })}
      </section>
      <p className="px-4 pb-6 text-[11px] leading-relaxed text-sub">
        상품권은 입력한 휴대폰 번호로, 제휴 상품은 배송지로 영업일 기준 3일 안에 보내드려요. 교환한 포인트는 발송 전까지 취소를 요청할 수
        있어요. 포인트는 현금으로 바꿀 수 없어요.
      </p>
    </div>
  );
}
