import { describe, expect, it } from "vitest";
import { CAPSULE, SCRATCH, rtpOf, scratchGrid, updownOdds, UPDOWN } from "./play";

describe("놀이터 확률", () => {
  it("뽑기 캡슐 환급률 85~95%", () => {
    const r = rtpOf(CAPSULE.table, CAPSULE.cost);
    expect(r).toBeGreaterThan(0.85);
    expect(r).toBeLessThan(0.95);
  });
  it("긁는 쿠폰 환급률 85~95%", () => {
    const r = rtpOf(SCRATCH.table, SCRATCH.cost);
    expect(r).toBeGreaterThan(0.85);
    expect(r).toBeLessThan(0.95);
  });
  it("긁는 쿠폰: 당첨이면 그 금액만 3칸, 꽝이면 어떤 금액도 3칸이 아니다", () => {
    for (let i = 0; i < 500; i++) {
      for (const prize of [0, 100, 10000]) {
        const g = scratchGrid(prize);
        expect(g).toHaveLength(9);
        const counts = new Map<number, number>();
        g.forEach((a) => counts.set(a, (counts.get(a) ?? 0) + 1));
        const triples = [...counts].filter(([, c]) => c >= 3).map(([a]) => a);
        expect(triples).toEqual(prize ? [prize] : []);
      }
    }
  });
  it("가격 업다운: 배당 × 확률 ≈ 0.95", () => {
    const pool = Array.from({ length: 100 }, (_, i) => ({ id: i, title: "", image: null, merchant: "", price: (i + 1) * 1000 }));
    const o = updownOdds(pool, 30000);
    expect(o.up! * o.pUp).toBeLessThanOrEqual(UPDOWN.edge);
    expect(o.up! * o.pUp).toBeGreaterThan(0.93);
    expect(updownOdds(pool, 1000).down).toBeNull();
  });
});
