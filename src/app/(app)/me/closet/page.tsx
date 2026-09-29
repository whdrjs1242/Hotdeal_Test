import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getLook } from "@/lib/cosmetics";
import { RARITY } from "@/lib/market";
import { ProfileCard } from "@/components/ProfileCard";
import { EquipButton } from "@/components/EquipButton";
import { TopBar } from "@/components/ui";

export const metadata = { title: "프로필 꾸미기" };

const SLOT_LABEL = { character: "캐릭터", card: "카드 배경", frame: "테두리", title: "칭호" } as const;

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
    <>
      <TopBar title="프로필 꾸미기" />
      <div className="bg-surface px-5 pb-5 pt-2">
        <p className="mb-3 text-[13px] text-muted">미리보기</p>
        <ProfileCard nickname={user.nickname} xp={user.xp} look={look} avatarUrl={user.avatarUrl} />
      </div>
      {(Object.keys(SLOT_LABEL) as (keyof typeof SLOT_LABEL)[]).map((slot) => {
        const mine = items.filter((i) => i.slot === slot);
        return (
          <section key={slot} className="mt-2 bg-surface px-5 py-5">
            <h2 className="text-[16px] font-bold">
              {SLOT_LABEL[slot]} <span className="font-normal text-muted">{mine.length}</span>
            </h2>
            {mine.length > 0 ? (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {mine.map((i) => (
                  <EquipButton key={i.itemKey} slot={slot} itemKey={i.itemKey} equipped={eq[slot] === i.itemKey} name={i.name} rarity={RARITY[i.rarity as keyof typeof RARITY]?.label}>
                    {slot === "card" ? (
                      <span className="block h-8 w-12 rounded" style={{ background: i.image }} />
                    ) : slot === "frame" ? (
                      <span className="block h-8 w-8 rounded-full" style={{ boxShadow: `0 0 0 3px ${i.image}` }} />
                    ) : slot === "title" ? (
                      <span className="text-[11px] font-semibold text-sub">칭호</span>
                    ) : (
                      <span className="text-[28px]">{i.image}</span>
                    )}
                  </EquipButton>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-[14px] text-muted">아직 없어요.</p>
            )}
          </section>
        );
      })}
      <div className="grid grid-cols-2 gap-2 px-5 py-5">
        <Link href="/market?tab=cosmetic" className="press flex h-12 items-center justify-center rounded-xl bg-ink text-[15px] font-semibold text-surface">
          포인트로 사기
        </Link>
        <Link href="/points" className="press flex h-12 items-center justify-center rounded-xl bg-surface text-[15px] font-semibold ring-1 ring-line">
          뽑기·구슬로 얻기
        </Link>
      </div>
    </>
  );
}
