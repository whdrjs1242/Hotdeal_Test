// 데모 데이터 (개발용)
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
const users = ["딜헌터킹", "알뜰맘", "테크덕후", "자취생존", "직구마스터"];
const ids = [];
for (const [i, n] of users.entries()) {
  const [u] = await sql`
    INSERT INTO users (nickname, ref_code, xp, handle) VALUES (${n}, ${"demo" + i}, ${[2400, 650, 9000, 120, 30][i]}, ${i === 0 ? "dealking" : null})
    ON CONFLICT (nickname) DO UPDATE SET nickname = EXCLUDED.nickname RETURNING id`;
  ids.push(u.id);
}
const img = (seed) => `https://picsum.photos/seed/${seed}/400/400`;
const deals = [
  ["[역대최저] 애플 에어팟 프로 2세대 USB-C", "https://www.coupang.com/vp/products/7334?itemId=1&vendorItemId=2", 239000, 359000, "digital", 42, 1, 0, 3],
  ["삼다수 2L 24병 + 쿠폰가", "https://www.11st.co.kr/products/5555", 13900, 19800, "food", 25, 2, 0, 2],
  ["다이슨 V12 무선청소기 카드할인", "https://www.gmarket.co.kr/item?goodscode=123", 599000, 899000, "appliance", 18, 0, 6, 5],
  ["나이키 에어포스1 전사이즈", "https://www.musinsa.com/products/1234", 89000, 139000, "fashion", 9, 3, 0, 1],
  ["알리 샤오미 보조배터리 20000mAh", "https://ko.aliexpress.com/item/1005.html", 15900, 32000, "overseas", 31, 1, 0, 8],
  ["하기스 네이처메이드 기저귀 4팩", "https://www.ssg.com/item/itemView.ssg?itemId=100", 52000, 76000, "baby", 12, 0, 30, 4],
  ["라운드랩 자작나무 수분크림 1+1", "https://www.oliveyoung.co.kr/store/goods/1", 19900, 36000, "beauty", 7, 0, 0, 0],
];
for (const [i, [title, url, price, orig, cat, up, down, endsInHours, hoursAgo]] of deals.entries()) {
  const created = new Date(Date.now() - hoursAgo * 3600_000);
  const merchant = url.includes("coupang") ? "coupang" : url.includes("11st") ? "11st" : url.includes("gmarket") ? "gmarket"
    : url.includes("musinsa") ? "musinsa" : url.includes("aliexpress") ? "aliexpress" : url.includes("ssg") ? "ssg" : "oliveyoung";
  const network = merchant === "coupang" ? "coupang" : merchant === "aliexpress" ? "aliexpress" : "linkprice";
  const [d] = await sql`
    INSERT INTO deals (user_id, title, original_url, canonical_url, merchant, network, monetized, image_url, price, original_price,
      shipping, category, votes_up, votes_down, click_count, comment_count, ends_at, created_at)
    VALUES (${ids[i % ids.length]}, ${title}, ${url}, ${url}, ${merchant}, ${network}, false, ${img(i + 11)}, ${price}, ${orig},
      '무료배송', ${cat}, ${up}, ${down}, ${up * 7}, 0, ${endsInHours ? new Date(Date.now() + endsInHours * 3600_000) : null}, ${created})
    RETURNING id`;
  await sql`INSERT INTO price_history (canonical_url, price, deal_id, observed_at) VALUES
    (${url}, ${Math.round(orig * 0.9)}, ${d.id}, now() - interval '20 days'),
    (${url}, ${Math.round(orig * 0.8)}, ${d.id}, now() - interval '10 days'),
    (${url}, ${price}, ${d.id}, now())`;
}
await sql.unsafe(`UPDATE deals SET hot_score =
  (sign(votes_up - votes_down * 1.5 + click_count * 0.1 + share_count * 0.5 + comment_count * 0.3)
   * log(greatest(abs(votes_up - votes_down * 1.5 + click_count * 0.1 + share_count * 0.5 + comment_count * 0.3), 1))
   + (extract(epoch from created_at) - 1767225600) / 30000)`);
console.log(`seeded ${users.length} users, ${deals.length} deals`);
await sql.end();
