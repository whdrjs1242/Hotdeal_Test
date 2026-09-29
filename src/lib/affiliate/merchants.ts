export type Network = "coupang" | "linkprice" | "aliexpress" | "amazon" | "none";

export interface Merchant {
  id: string;
  name: string;
  /** hostname suffix 매칭 (m.coupang.com, www.coupang.com → coupang.com) */
  hosts: string[];
  network: Network;
  /** 링크프라이스 머천트 ID (network=linkprice 일 때) */
  linkpriceMerchant?: string;
  /**
   * 구매 수수료를 사용자에게 포인트로 나눠줘도 되는지.
   * 일부 제휴 프로그램(예: 쿠팡 파트너스)은 리워드/캐시백형 구매 유도를 약관으로 금지하므로
   * 기본값은 false로 두고 계약/약관 확인 후 켠다. false면 활동 포인트(플랫폼 예산)만 지급.
   */
  rewardEligible: boolean;
}

// 머천트 ID는 제휴 계약 후 실제 값으로 교체한다.
export const MERCHANTS: Merchant[] = [
  { id: "coupang", name: "쿠팡", hosts: ["coupang.com", "coupa.ng"], network: "coupang", rewardEligible: false },
  { id: "11st", name: "11번가", hosts: ["11st.co.kr"], network: "linkprice", linkpriceMerchant: "11st", rewardEligible: true },
  { id: "gmarket", name: "G마켓", hosts: ["gmarket.co.kr"], network: "linkprice", linkpriceMerchant: "gmarket", rewardEligible: true },
  { id: "auction", name: "옥션", hosts: ["auction.co.kr"], network: "linkprice", linkpriceMerchant: "auction", rewardEligible: true },
  { id: "ssg", name: "SSG", hosts: ["ssg.com"], network: "linkprice", linkpriceMerchant: "ssg", rewardEligible: true },
  { id: "lotteon", name: "롯데ON", hosts: ["lotteon.com"], network: "linkprice", linkpriceMerchant: "lotteon", rewardEligible: true },
  { id: "himart", name: "하이마트", hosts: ["e-himart.co.kr"], network: "linkprice", linkpriceMerchant: "himart", rewardEligible: true },
  { id: "musinsa", name: "무신사", hosts: ["musinsa.com"], network: "linkprice", linkpriceMerchant: "musinsa", rewardEligible: true },
  { id: "oliveyoung", name: "올리브영", hosts: ["oliveyoung.co.kr"], network: "linkprice", linkpriceMerchant: "oliveyoung", rewardEligible: true },
  { id: "aliexpress", name: "알리익스프레스", hosts: ["aliexpress.com", "aliexpress.us", "a.aliexpress.com"], network: "aliexpress", rewardEligible: true },
  { id: "amazon", name: "아마존", hosts: ["amazon.com", "amazon.co.jp", "amzn.to", "amzn.asia"], network: "amazon", rewardEligible: false },
  { id: "naver", name: "네이버쇼핑", hosts: ["naver.com", "naver.me"], network: "none", rewardEligible: false },
  { id: "kurly", name: "컬리", hosts: ["kurly.com"], network: "none", rewardEligible: false },
];

export const UNKNOWN_MERCHANT: Merchant = {
  id: "etc",
  name: "기타",
  hosts: [],
  network: "none",
  rewardEligible: false,
};

export function findMerchant(hostname: string): Merchant {
  const host = hostname.toLowerCase();
  return (
    MERCHANTS.find((m) => m.hosts.some((h) => host === h || host.endsWith(`.${h}`))) ?? UNKNOWN_MERCHANT
  );
}

export function merchantById(id: string): Merchant {
  return MERCHANTS.find((m) => m.id === id) ?? UNKNOWN_MERCHANT;
}
