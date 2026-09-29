export const CATEGORIES = [
  { id: "all", name: "전체" },
  { id: "digital", name: "디지털" },
  { id: "appliance", name: "가전" },
  { id: "food", name: "식품" },
  { id: "living", name: "생활" },
  { id: "fashion", name: "패션" },
  { id: "beauty", name: "뷰티" },
  { id: "baby", name: "육아" },
  { id: "travel", name: "여행" },
  { id: "overseas", name: "해외직구" },
  { id: "coupon", name: "쿠폰/이벤트" },
  { id: "etc", name: "기타" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as string[];

/** 제목 키워드로 카테고리 자동 추천 */
const HINTS: [string, RegExp][] = [
  ["digital", /(노트북|아이패드|갤럭시|아이폰|맥북|ssd|모니터|키보드|마우스|이어폰|에어팟|충전기|태블릿|그래픽카드)/i],
  ["appliance", /(냉장고|세탁기|청소기|에어컨|건조기|공기청정기|전자레인지|밥솥|선풍기|tv|티비)/i],
  ["food", /(라면|생수|커피|햇반|과자|고기|닭가슴살|김치|우유|간편식|음료|쌀)/i],
  ["living", /(휴지|물티슈|세제|샴푸|치약|수건|생리대|주방|수납)/i],
  ["fashion", /(나이키|아디다스|운동화|패딩|티셔츠|청바지|가방|신발|자켓)/i],
  ["beauty", /(선크림|로션|크림|쿠션|립|향수|토너|마스크팩|올리브영)/i],
  ["baby", /(기저귀|분유|유모차|카시트|아기|유아)/i],
  ["travel", /(항공권|호텔|숙박|여행|리조트|펜션)/i],
  ["coupon", /(쿠폰|이벤트|적립|페이백|할인코드)/i],
];

export function guessCategory(title: string, merchant?: string): CategoryId {
  if (merchant === "aliexpress" || merchant === "amazon") return "overseas";
  for (const [id, re] of HINTS) if (re.test(title)) return id as CategoryId;
  return "etc";
}
