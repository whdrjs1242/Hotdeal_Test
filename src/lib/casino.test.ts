import { describe, expect, it } from "vitest";
import { rocketCrashPoint, rouletteMultiplier, slotMultiplier, slotRtp } from "./casino";

describe("카지노 배당", () => {
  it("슬롯 환수율은 90~97% (하우스 엣지 유지)", () => {
    const rtp = slotRtp();
    console.log("slot RTP", rtp.toFixed(4));
    expect(rtp).toBeGreaterThan(0.9);
    expect(rtp).toBeLessThan(0.97);
  });
  it("슬롯 판정", () => {
    expect(slotMultiplier(["🐥", "🐥", "🐥"])).toBe(3000);
    expect(slotMultiplier(["🍒", "🍋", "🍒"])).toBe(2);
    expect(slotMultiplier(["🍋", "🍇", "🔔"])).toBe(0);
  });
  it("룰렛: 0은 외부 베팅 전부 패배", () => {
    expect(rouletteMultiplier(0, { type: "color", value: "red" })).toBe(0);
    expect(rouletteMultiplier(1, { type: "color", value: "red" })).toBe(2);
    expect(rouletteMultiplier(17, { type: "number", value: 17 })).toBe(36);
    expect(rouletteMultiplier(20, { type: "half", value: "high" })).toBe(2);
  });
  it("로켓 환수율 ≈ 99%", () => {
    let paid = 0;
    const N = 200_000;
    for (let i = 1; i <= N; i++) if (rocketCrashPoint(i / (N + 1)) >= 2) paid += 2;
    expect(paid / N).toBeGreaterThan(0.97);
    expect(paid / N).toBeLessThan(1.0);
  });
});
