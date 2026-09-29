import { sql } from "./db";

export const SLOTS = ["character", "card", "frame", "title"] as const;
export type Slot = (typeof SLOTS)[number];

export interface Look {
  character: string | null; // 이모지
  card: string | null; // CSS 배경
  frame: string | null; // 테두리 색
  title: string | null; // 칭호 텍스트
  titleIcon: string | null;
}

/** 사용자가 장착한 꾸미기 (프로필 카드 렌더용) */
export async function getLook(userId: number): Promise<Look> {
  const [r] = await sql<{ character: string | null; card: string | null; frame: string | null; title: string | null; titleIcon: string | null }[]>`
    SELECT ch.image AS character, cd.image AS card, fr.image AS frame, tt.name AS title, tt.image AS title_icon
    FROM users u
    LEFT JOIN shop_items ch ON ch.item_key = u.equip_character
    LEFT JOIN shop_items cd ON cd.item_key = u.equip_card
    LEFT JOIN shop_items fr ON fr.item_key = u.equip_frame
    LEFT JOIN shop_items tt ON tt.item_key = u.equip_title
    WHERE u.id = ${userId}`;
  return r ?? { character: null, card: null, frame: null, title: null, titleIcon: null };
}

/** 장착 (보유한 아이템만). itemKey=null 이면 해제 */
export async function equip(userId: number, slot: Slot, itemKey: string | null) {
  if (itemKey) {
    const [own] = await sql`
      SELECT 1 FROM user_items ui JOIN shop_items i ON i.id = ui.item_id
      WHERE ui.user_id = ${userId} AND i.item_key = ${itemKey} AND i.slot = ${slot}`;
    if (!own) return false;
  }
  const col = sql(`equip_${slot}`);
  await sql`UPDATE users SET ${col} = ${itemKey} WHERE id = ${userId}`;
  return true;
}

/** 목록에서 닉네임 옆에 보여줄 캐릭터 이모지 (SQL 조각) */
export const USER_CHAR_SQL = sql`(SELECT image FROM shop_items WHERE item_key = u.equip_character)`;
