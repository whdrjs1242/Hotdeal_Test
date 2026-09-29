/**
 * 핫 점수 (Reddit hot 공식 변형).
 * 점수 = log10(참여도) + 게시시각/DECAY 이므로 "시간이 지나며 점수가 떨어지는" 재계산 배치가 필요 없다.
 * 이벤트(투표/클릭/공유/댓글)가 일어난 딜 한 행만 갱신하면 되므로 트래픽이 커져도 비용이 일정하다.
 */
export const DECAY_SECONDS = 30_000; // 약 8.3시간마다 참여도 10배가 있어야 같은 순위 유지
const EPOCH = 1_767_225_600; // 2026-01-01 KST 기준 (점수 크기 줄이기용)

export interface Engagement {
  votesUp: number;
  votesDown: number;
  clickCount: number;
  shareCount: number;
  commentCount: number;
  createdAt: Date;
}

export function engagementOf(e: Omit<Engagement, "createdAt">) {
  return e.votesUp - e.votesDown * 1.5 + e.clickCount * 0.1 + e.shareCount * 0.5 + e.commentCount * 0.3;
}

export function hotScore(e: Engagement): number {
  const x = engagementOf(e);
  const order = Math.log10(Math.max(Math.abs(x), 1));
  const sign = x > 0 ? 1 : x < 0 ? -1 : 0;
  const seconds = e.createdAt.getTime() / 1000 - EPOCH;
  return Number((sign * order + seconds / DECAY_SECONDS).toFixed(7));
}

/** SQL에서 같은 공식을 쓰기 위한 식 (deals 행 기준) */
export const HOT_SCORE_SQL = `
  (sign(votes_up - votes_down * 1.5 + click_count * 0.1 + share_count * 0.5 + comment_count * 0.3)
   * log(greatest(abs(votes_up - votes_down * 1.5 + click_count * 0.1 + share_count * 0.5 + comment_count * 0.3), 1))
   + (extract(epoch from created_at) - ${EPOCH}) / ${DECAY_SECONDS})`;

/** 딜 온도 (°C) — 투표 기반 직관 지표. 기본 36.5도에서 시작 */
export function temperature(votesUp: number, votesDown: number) {
  return Math.round((36.5 + votesUp * 1.2 - votesDown * 2) * 10) / 10;
}

export function discountRate(price?: number | null, originalPrice?: number | null) {
  if (!price || !originalPrice || originalPrice <= price) return 0;
  return Math.round((1 - price / originalPrice) * 100);
}
