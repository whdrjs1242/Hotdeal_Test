import { describe, expect, it, beforeEach } from "vitest";
import { canonicalize, isPrivateHost, parseShoppingUrl } from "./url";
import { buildOutboundUrl } from "./index";
import { findMerchant } from "./merchants";
import { coupangAuthHeader } from "./coupang";

describe("canonicalize", () => {
  it("쿠팡 모바일/타인 제휴 파라미터를 제거하고 상품 식별자만 남긴다", () => {
    expect(
      canonicalize("https://m.coupang.com/vm/products/123?itemId=9&vendorItemId=7&lptag=AF999&subid=x&traceid=t&q=1"),
    ).toBe("https://www.coupang.com/vp/products/123?itemId=9&vendorItemId=7");
  });

  it("utm, fbclid 등 추적 파라미터를 제거한다", () => {
    expect(canonicalize("https://www.example.com/p/1?utm_source=a&fbclid=b&color=red#top")).toBe(
      "https://www.example.com/p/1?color=red",
    );
  });

  it("아마존 링크는 /dp/ASIN 으로 축약한다", () => {
    expect(canonicalize("https://www.amazon.com/Some-Thing/dp/b0abcdefgh/ref=sr_1?tag=someone-20&keywords=x")).toBe(
      "https://www.amazon.com/dp/B0ABCDEFGH",
    );
  });

  it("텍스트 속 링크도 추출한다", () => {
    expect(parseShoppingUrl("이거 싸요!! https://www.11st.co.kr/products/1 ㄱㄱ").hostname).toBe("www.11st.co.kr");
  });
});

describe("SSRF 방어", () => {
  it.each(["localhost", "127.0.0.1", "10.1.2.3", "192.168.0.1", "169.254.169.254", "172.20.0.1", "[::1]", "metadata.internal"])(
    "%s 차단",
    (h) => expect(isPrivateHost(h)).toBe(true),
  );
  it("공인 도메인 허용", () => expect(isPrivateHost("www.coupang.com")).toBe(false));
  it("내부 주소 링크 거부", () => expect(() => parseShoppingUrl("http://127.0.0.1/admin")).toThrow());
});

describe("buildOutboundUrl", () => {
  beforeEach(() => {
    process.env.LINKPRICE_AFFILIATE_ID = "A100";
    process.env.AMAZON_ASSOCIATE_TAG = "jupjup-20";
    process.env.COUPANG_ACCESS_KEY = "ak";
    process.env.COUPANG_SECRET_KEY = "sk";
  });

  it("링크프라이스 딥링크에 subId(u_id)를 싣는다", () => {
    const out = new URL(buildOutboundUrl("https://www.11st.co.kr/products/1", "11st", "42"));
    expect(out.hostname).toBe("click.linkprice.com");
    expect(out.searchParams.get("a")).toBe("A100");
    expect(out.searchParams.get("u_id")).toBe("42");
    expect(out.searchParams.get("tu")).toBe("https://www.11st.co.kr/products/1");
  });

  it("쿠팡은 캐시된 landingUrl의 subid를 클릭별로 교체한다", () => {
    const base = "https://link.coupang.com/re/AFFSDP?lptag=AF1&subid=&pageKey=123";
    const out = new URL(buildOutboundUrl("https://www.coupang.com/vp/products/123", "coupang", "77", base));
    expect(out.searchParams.get("subid")).toBe("77");
    expect(out.searchParams.get("lptag")).toBe("AF1");
  });

  it("아마존은 내 태그로 교체한다", () => {
    const out = new URL(buildOutboundUrl("https://www.amazon.com/dp/B0ABCDEFGH", "amazon", "5"));
    expect(out.searchParams.get("tag")).toBe("jupjup-20");
  });

  it("미설정 네트워크는 원본 링크", () => {
    delete process.env.LINKPRICE_AFFILIATE_ID;
    expect(buildOutboundUrl("https://www.11st.co.kr/products/1", "11st", "1")).toBe("https://www.11st.co.kr/products/1");
  });
});

describe("merchant", () => {
  it("서브도메인 매칭", () => expect(findMerchant("m.coupang.com").id).toBe("coupang"));
  it("모르는 쇼핑몰은 etc", () => expect(findMerchant("shop.example.com").id).toBe("etc"));
  it("유사 도메인 오탐 방지", () => expect(findMerchant("notcoupang.com").id).toBe("etc"));
});

describe("coupang HMAC", () => {
  it("signed-date 형식과 서명을 만든다", () => {
    const h = coupangAuthHeader("POST", "/v2/x", "ak", "sk", new Date("2026-09-29T02:43:05Z"));
    expect(h).toMatch(/^CEA algorithm=HmacSHA256, access-key=ak, signed-date=260929T024305Z, signature=[0-9a-f]{64}$/);
  });
});
