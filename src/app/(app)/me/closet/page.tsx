import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getLook } from "@/lib/cosmetics";
import { RARITY } from "@/lib/market";
import { ProfileCard } from "@/components/ProfileCard";
import { EquipButton } from "@/components/EquipButton";
import { BackButton } from "@/components/BackButton";

export const metadata = { title: "꾸미기" };

const SLOT_LABEL = { character: "캐릭터", card: "프로필 카드", frame: "테두리", title: "칭호" } as const;

export default async function ClosetPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me/closet");
  const [look, items, [eq]] = await Promise.all([
    getLook(user.id),
    sql<{ itemKey: string; name: string; image: string; rarity: string; slot: keyof typeof SLOT_LABEL }[]>`
      SELECT i.item_key, i.name, i.image, i.rarity, i.slot FROM user_items ui JOIN shop_items i ON i.id = ui.item_id
      WHERE ui.user_id = ${user.id} AND i.kind = 'cosmetic' ORDER BY i.slot, i.sort`,
    sql<Record<string, string | null>[]>`
      SELECT equip_character AS character, equip_card AS card, equip_frame AS frame, equip_title AS title FROM users WHERE id = ${user.id}`,
  ]);
  return (
    <div className="pt-safe pb-8">
      <div className="flex h-12 items-center gap-2 px-2">
        <BackButton />
        <span className="text-sm font-semibold">꾸미기 옷장</span>
      </div>
      <div className="px-3">
        <ProfileCard nickname={user.nickname} xp={user.xp} look={look} avatarUrl={user.avatarUrl} />
      </div>
      {(Object.keys(SLOT_LABEL) as (keyof typeof SLOT_LABEL)[]).map((slot) => {
        const mine = items.filter((i) => i.slot === slot);
        return (
          <section key={slot} className="mt-4 px-3">
            <h2 className="px-1 text-sm font-black">{SLOT_LABEL[slot]}</h2>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {mine.map((i) => (
                <EquipButton
                  key={i.itemKey}
                  slot={slot}
                  itemKey={i.itemKey}
                  equipped={eq[slot] === i.itemKey}
                  name={i.name}
                  color={RARITY[i.rarity as keyof typeof RARITY]?.color}
                >
                  {slot === "card" ? (
                    <span className="block h-8 w-12 rounded" style={{ background: i.image }} />
                  ) : slot === "frame" ? (
                    <span className="block h-8 w-8 rounded-full" style={{ boxShadow: `0 0 0 3px ${i.image}` }} />
                  ) : (
                    <span className="text-3xl">{i.image}</span>
                  )}
                </EquipButton>
              ))}
              {mine.length === 0 && (
                <Link href="/market?tab=cosmetic" className="col-span-4 rounded-xl bg-surface py-4 text-center text-xs text-sub ring-1 ring-line">
                  아직 없어요 · 상점이나 뽑기에서 얻어보세요
                </Link>
              )}
            </div>
          </section>
        );
      })}
      <div className="mt-6 grid grid-cols-2 gap-2 px-3">
        <Link href="/market?tab=cosmetic" className="rounded-xl bg-ink py-3 text-center text-sm font-bold text-surface">
          꾸미기 상점
        </Link>
        <Link href="/points" className="rounded-xl bg-[#4a3aa7] py-3 text-center text-sm font-bold text-white">
          🎰 뽑기
        </Link>
      </div>
    </div>
  );
}
