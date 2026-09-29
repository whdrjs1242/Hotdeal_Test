export const LEVELS = [
  { min: 0, name: "새싹 줍러", emoji: "🌱" },
  { min: 100, name: "줍줍러", emoji: "🧺" },
  { min: 500, name: "딜 헌터", emoji: "🎯" },
  { min: 2000, name: "딜 고수", emoji: "🔥" },
  { min: 8000, name: "딜 레전드", emoji: "👑" },
] as const;

export function levelOf(xp: number) {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].min) idx = i;
  const cur = LEVELS[idx];
  const next = LEVELS[idx + 1];
  const progress = next ? (xp - cur.min) / (next.min - cur.min) : 1;
  return { level: idx + 1, ...cur, next, progress: Math.min(1, Math.max(0, progress)) };
}

/** 행동별 XP. 공유/클릭 XP는 어뷰징 방지를 위해 일일 상한을 둔다(rewards.ts). */
export const XP = {
  postDeal: 10,
  receivedUpvote: 2,
  share: 1,
  shareClick: 1,
  checkin: 5,
  comment: 1,
} as const;
