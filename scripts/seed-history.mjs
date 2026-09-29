// 대시보드 데모용 90일치 활동 데이터 (개발 전용). npm run db:seed 이후 실행.
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
const DAYS = 90;
const rnd = (a, b) => a + Math.random() * (b - a);
// 성장 곡선: 초반 완만 → 후반 가속 + 주말 효과
const growth = (d) => Math.pow(1 + (DAYS - d) / DAYS, 2.2);
const kst = (daysAgo, hour) => {
  const t = new Date(Date.now() - daysAgo * 86400_000);
  t.setUTCHours(hour - 9, Math.floor(rnd(0, 60)), 0, 0);
  return t > new Date() ? new Date(Date.now() - rnd(0, 3600_000)) : t;
};
// 점심·퇴근 후·밤에 몰리는 시간대 분포
const HOUR_W = [2,1,1,0.5,0.5,0.5,1,2,4,5,5,6,9,8,5,4,4,5,6,7,8,9,10,6];
const pickHour = () => {
  const total = HOUR_W.reduce((a, b) => a + b);
  let r = Math.random() * total;
  for (let h = 0; h < 24; h++) if ((r -= HOUR_W[h]) <= 0) return h;
  return 21;
};
const CATS = ["digital", "appliance", "food", "living", "fashion", "beauty", "baby", "overseas", "coupon"];
const MERCHANTS = [
  ["coupang", "coupang", "https://www.coupang.com/vp/products/"],
  ["11st", "linkprice", "https://www.11st.co.kr/products/"],
  ["gmarket", "linkprice", "https://www.gmarket.co.kr/item?goodscode="],
  ["aliexpress", "aliexpress", "https://ko.aliexpress.com/item/"],
  ["musinsa", "linkprice", "https://www.musinsa.com/products/"],
];
const WORDS = ["역대최저", "타임딜", "카드할인", "1+1", "무료배송", "쿠폰가", "특가"];
const ITEMS = ["에어팟", "갤럭시 버즈", "다이슨 청소기", "생수 2L", "햇반 24개", "기저귀", "나이키 운동화", "선크림", "보조배터리", "모니터", "커피 캡슐", "물티슈"];

const [{ n: base }] = await sql`SELECT count(*)::int AS n FROM users`;
const userIds = (await sql`SELECT id FROM users ORDER BY id`).map((r) => r.id);
let clicksTotal = 0;

for (let d = DAYS - 1; d >= 0; d--) {
  const g = growth(d);
  const weekend = [0, 6].includes(new Date(Date.now() - d * 86400_000).getDay()) ? 1.25 : 1;
  // 가입 (35%는 초대)
  const signups = Math.round(rnd(3, 8) * g * weekend);
  for (let i = 0; i < signups; i++) {
    const referrer = userIds.length && Math.random() < 0.35 ? userIds[Math.floor(Math.random() * userIds.length)] : null;
    const [u] = await sql`
      INSERT INTO users (nickname, ref_code, referred_by, xp, created_at)
      VALUES (${"줍러" + (base + userIds.length + 1)}, ${"h" + Math.random().toString(36).slice(2, 10)}, ${referrer},
              ${Math.floor(rnd(0, 3000))}, ${kst(d, pickHour())})
      RETURNING id`;
    userIds.push(u.id);
  }
  // 딜
  const dealCount = Math.round(rnd(2, 5) * g * weekend);
  const dealIds = [];
  for (let i = 0; i < dealCount; i++) {
    const [merchant, network, prefix] = MERCHANTS[Math.floor(Math.random() * MERCHANTS.length)];
    const price = Math.round(rnd(5, 400)) * 1000;
    const url = prefix + Math.floor(rnd(1e5, 1e7));
    const up = Math.floor(rnd(0, 40) * g);
    const [row] = await sql`
      INSERT INTO deals (user_id, title, original_url, canonical_url, merchant, network, monetized, price, original_price,
                         category, votes_up, votes_down, created_at, status)
      VALUES (${userIds[Math.floor(Math.random() * userIds.length)]},
              ${`[${WORDS[i % WORDS.length]}] ${ITEMS[Math.floor(Math.random() * ITEMS.length)]} ${Math.floor(rnd(1, 9))}종`},
              ${url}, ${url}, ${merchant}, ${network}, true, ${price}, ${Math.round(price * rnd(1.15, 1.8))},
              ${CATS[Math.floor(Math.random() * CATS.length)]}, ${up}, ${Math.floor(up * rnd(0, 0.15))},
              ${kst(d, pickHour())}, ${d > 7 ? "expired" : "active"})
      RETURNING id, network`;
    dealIds.push(row);
  }
  // 클릭 (40%는 공유 링크 경유), 공유, 전환(3%)
  const clickCount = Math.round(rnd(40, 90) * g * weekend);
  const pool = dealIds.length ? dealIds : [{ id: 1, network: "coupang" }];
  const clicks = [];
  for (let i = 0; i < clickCount; i++) {
    const deal = pool[Math.floor(Math.random() * pool.length)];
    clicks.push({
      deal_id: deal.id,
      sharer_id: Math.random() < 0.4 ? userIds[Math.floor(Math.random() * Math.min(userIds.length, 40))] : null,
      network: deal.network,
      ip_hash: "h" + Math.floor(Math.random() * clickCount * 0.8),
      created_at: kst(d, pickHour()),
    });
  }
  const ins = await sql`INSERT INTO clicks ${sql(clicks)} RETURNING id, deal_id, sharer_id`;
  clicksTotal += ins.length;
  for (const deal of pool) {
    const n = ins.filter((c) => c.dealId === deal.id).length;
    if (n) await sql`UPDATE deals SET click_count = click_count + ${n} WHERE id = ${deal.id}`;
  }
  const shares = Array.from({ length: Math.round(clickCount * rnd(0.12, 0.2)) }, () => ({
    deal_id: pool[Math.floor(Math.random() * pool.length)].id,
    user_id: userIds[Math.floor(Math.random() * userIds.length)],
    channel: ["kakao", "native", "copy"][Math.floor(Math.random() * 3)],
    created_at: kst(d, pickHour()),
  }));
  if (shares.length) await sql`INSERT INTO shares ${sql(shares)}`;
  for (const c of ins) {
    if (Math.random() > 0.03) continue;
    const amount = Math.round(rnd(10, 300)) * 1000;
    await sql`
      INSERT INTO conversions (network, external_id, click_id, order_amount, commission, status, created_at)
      VALUES ('linkprice', ${"SEED" + c.id}, ${c.id}, ${amount}, ${Math.round(amount * rnd(0.02, 0.05))},
              ${d > 14 ? "confirmed" : d > 1 && Math.random() < 0.1 ? "canceled" : d > 14 ? "confirmed" : "pending"},
              ${kst(d, pickHour())})
      ON CONFLICT DO NOTHING`;
  }
}

// 포인트 원장: 공유자 30% / 게시자 20%
await sql`
  INSERT INTO points_ledger (user_id, delta, kind, status, conversion_id, created_at)
  SELECT cl.sharer_id, floor(cv.commission * 0.3)::int, 'share_reward',
         CASE cv.status WHEN 'confirmed' THEN 'available' WHEN 'canceled' THEN 'canceled' ELSE 'pending' END, cv.id, cv.created_at
  FROM conversions cv JOIN clicks cl ON cl.id = cv.click_id WHERE cl.sharer_id IS NOT NULL
  ON CONFLICT DO NOTHING`;
await sql`
  INSERT INTO points_ledger (user_id, delta, kind, status, conversion_id, created_at)
  SELECT d.user_id, floor(cv.commission * 0.2)::int, 'post_reward',
         CASE cv.status WHEN 'confirmed' THEN 'available' WHEN 'canceled' THEN 'canceled' ELSE 'pending' END, cv.id, cv.created_at
  FROM conversions cv JOIN clicks cl ON cl.id = cv.click_id JOIN deals d ON d.id = cl.deal_id
  ON CONFLICT DO NOTHING`;
await sql`
  UPDATE users u SET points_available = COALESCE(s.a, 0), points_pending = COALESCE(s.p, 0)
  FROM (SELECT user_id, sum(delta) FILTER (WHERE status='available') a, sum(delta) FILTER (WHERE status='pending') p
        FROM points_ledger GROUP BY user_id) s WHERE s.user_id = u.id`;
await sql.unsafe(`UPDATE deals SET hot_score =
  (sign(votes_up - votes_down * 1.5 + click_count * 0.1 + share_count * 0.5 + comment_count * 0.3)
   * log(greatest(abs(votes_up - votes_down * 1.5 + click_count * 0.1 + share_count * 0.5 + comment_count * 0.3), 1))
   + (extract(epoch from created_at) - 1767225600) / 30000)`);
await sql`UPDATE users SET handle = 'user' || id WHERE handle IS NULL AND id % 17 = 0`;
console.log(`seeded ${DAYS} days: ${userIds.length} users, ${clicksTotal} clicks`);
await sql.end();
