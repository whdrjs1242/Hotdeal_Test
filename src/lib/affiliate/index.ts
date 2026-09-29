import { canonicalize, parseShoppingUrl, resolveRedirects } from "./url";
import { findMerchant, merchantById, type Merchant, type Network } from "./merchants";
import { createCoupangDeeplink } from "./coupang";

export { InvalidUrlError } from "./url";
export type { Network, Merchant };

export interface PreparedLink {
  originalUrl: string;
  canonicalUrl: string;
  merchant: Merchant;
  network: Network;
  /** 수익화 가능 여부 (제휴 키가 설정되어 있는 네트워크) */
  monetized: boolean;
}

export function networkConfigured(network: Network): boolean {
  switch (network) {
    case "coupang":
      return Boolean(process.env.COUPANG_ACCESS_KEY && process.env.COUPANG_SECRET_KEY);
    case "linkprice":
      return Boolean(process.env.LINKPRICE_AFFILIATE_ID);
    case "aliexpress":
      return Boolean(process.env.ALIEXPRESS_AFF_SHORT_KEY);
    case "amazon":
      return Boolean(process.env.AMAZON_ASSOCIATE_TAG);
    default:
      return false;
  }
}

/** 사용자가 붙여넣은 아무 쇼핑 링크(타인 제휴링크/단축링크 포함) → 정규화된 상품 링크 */
export async function prepareLink(raw: string): Promise<PreparedLink> {
  const parsed = parseShoppingUrl(raw);
  const resolved = await resolveRedirects(parsed);
  const canonicalUrl = canonicalize(resolved);
  const merchant = findMerchant(new URL(canonicalUrl).hostname);
  return {
    originalUrl: parsed.toString(),
    canonicalUrl,
    merchant,
    network: merchant.network,
    monetized: networkConfigured(merchant.network),
  };
}

/**
 * 클릭 시점의 최종 이동 URL을 만든다.
 * subId(=clicks.id)를 제휴사에 넘겨, 나중에 실적 리포트의 subId로 "누가 공유한 링크로 샀는지"를 역추적한다.
 * @param cachedBase 쿠팡처럼 API로 만든 딥링크 캐시 (없으면 호출자가 getNetworkBase로 생성)
 */
export function buildOutboundUrl(
  canonicalUrl: string,
  merchantId: string,
  subId: string,
  cachedBase?: string | null,
): string {
  const merchant = merchantById(merchantId);
  if (!networkConfigured(merchant.network)) return canonicalUrl;
  switch (merchant.network) {
    case "coupang": {
      if (!cachedBase) return canonicalUrl;
      const u = new URL(cachedBase);
      if (u.pathname.startsWith("/re/")) u.searchParams.set("subid", subId);
      return u.toString();
    }
    case "linkprice": {
      const u = new URL("https://click.linkprice.com/click.php");
      u.searchParams.set("m", merchant.linkpriceMerchant ?? merchant.id);
      u.searchParams.set("a", process.env.LINKPRICE_AFFILIATE_ID!);
      u.searchParams.set("l", "9999");
      u.searchParams.set("l_cd1", "3");
      u.searchParams.set("l_cd2", "0");
      u.searchParams.set("u_id", subId);
      u.searchParams.set("tu", canonicalUrl);
      return u.toString();
    }
    case "aliexpress": {
      const u = new URL("https://s.click.aliexpress.com/deep_link.htm");
      u.searchParams.set("aff_short_key", process.env.ALIEXPRESS_AFF_SHORT_KEY!);
      u.searchParams.set("dl_target_url", canonicalUrl);
      u.searchParams.set("dp", subId);
      return u.toString();
    }
    case "amazon": {
      const u = new URL(canonicalUrl);
      u.searchParams.set("tag", process.env.AMAZON_ASSOCIATE_TAG!);
      u.searchParams.set("ascsubtag", subId);
      return u.toString();
    }
    default:
      return canonicalUrl;
  }
}

/** API 기반 네트워크의 기본 딥링크를 생성 (결과는 affiliate_link_cache에 저장) */
export async function getNetworkBase(canonicalUrl: string, network: Network): Promise<string | null> {
  if (network === "coupang") return createCoupangDeeplink(canonicalUrl).catch(() => null);
  return null;
}
