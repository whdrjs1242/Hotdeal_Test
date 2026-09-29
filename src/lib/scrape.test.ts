import { describe, expect, it } from "vitest";
import { parseProductMeta } from "./scrape";
import { hotScore, temperature, discountRate } from "./ranking";
import { splitCommission } from "./rewards";
import { levelOf } from "./levels";

describe("parseProductMeta", () => {
  it("OG 태그와 JSON-LD 가격을 읽는다", () => {
    const html = `<html><head>
      <meta property="og:title" content="에어팟 프로 &amp; 케이스">
      <meta content="/img/a.jpg" property="og:image">
      <script type="application/ld+json">{"@type":"Product","name":"x","offers":{"price":"199,000"}}</script>
    </head></html>`;
    const m = parseProductMeta(html, new URL("https://shop.example.com/p/1"));
    expect(m.title).toBe("에어팟 프로 & 케이스");
    expect(m.image).toBe("https://shop.example.com/img/a.jpg");
    expect(m.price).toBe(199000);
  });
});

describe("ranking", () => {
  it("같은 참여도면 최신 딜이 위", () => {
    const base = { votesUp: 10, votesDown: 0, clickCount: 0, shareCount: 0, commentCount: 0 };
    expect(hotScore({ ...base, createdAt: new Date("2026-09-29T10:00:00Z") })).toBeGreaterThan(
      hotScore({ ...base, createdAt: new Date("2026-09-29T08:00:00Z") }),
    );
  });
  it("참여도가 10배면 약 8시간 먼저 올라온 효과", () => {
    const t = new Date("2026-09-29T00:00:00Z");
    const a = hotScore({ votesUp: 100, votesDown: 0, clickCount: 0, shareCount: 0, commentCount: 0, createdAt: t });
    const b = hotScore({ votesUp: 10, votesDown: 0, clickCount: 0, shareCount: 0, commentCount: 0, createdAt: t });
    expect(a - b).toBeCloseTo(1, 5);
  });
  it("온도와 할인율", () => {
    expect(temperature(0, 0)).toBe(36.5);
    expect(temperature(10, 1)).toBe(46.5);
    expect(discountRate(7000, 10000)).toBe(30);
    expect(discountRate(10000, null)).toBe(0);
  });
});

describe("splitCommission", () => {
  const base = { commission: 1000, hunterId: 1, sharerId: 2, buyerId: 3, bountyPosterId: null, rewardEligible: true };
  it("헌터 30%, 공유자 20%", () => {
    expect(splitCommission(base)).toEqual([
      { userId: 1, delta: 300, kind: "hunter_reward" },
      { userId: 2, delta: 200, kind: "share_reward" },
    ]);
  });
  it("수배에서 발견된 딜이면 수배자 10% 추가", () => {
    expect(splitCommission({ ...base, bountyPosterId: 4 })).toContainEqual({ userId: 4, delta: 100, kind: "bounty_reward" });
  });
  it("본인 구매분은 본인 몫 제외", () => {
    expect(splitCommission({ ...base, buyerId: 2 }).map((l) => l.kind)).toEqual(["hunter_reward"]);
    expect(splitCommission({ ...base, bountyPosterId: 3 }).map((l) => l.kind)).not.toContain("bounty_reward");
  });
  it("분배 불가 판매처는 지급 안 함", () => {
    expect(splitCommission({ ...base, rewardEligible: false })).toEqual([]);
  });
});

describe("levels", () => {
  it("XP → 레벨", () => {
    expect(levelOf(0).name).toBe("새내기");
    expect(levelOf(600).level).toBe(3);
    expect(levelOf(99999).progress).toBe(1);
  });
});
