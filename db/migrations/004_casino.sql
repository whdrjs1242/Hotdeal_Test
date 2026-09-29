-- 줍줍 카지노 라운지: 전용 화폐 "줍칩"
-- 규제 설계: 칩은 현금·포인트·상품권으로 절대 바뀌지 않는다(환전 불가).
--  - 얻는 법: 매일 무료 지급, 파산 시 무료 리필, 포인트 → 칩 단방향 교환(하루 한도)
--  - 쓰는 곳: 카지노 게임, 카지노 전용 꾸미기(포인트로는 살 수 없음), 주간 칩 랭킹(명예)

ALTER TABLE users
  ADD COLUMN chips BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN chips_daily_at DATE,
  ADD COLUMN chips_refill_at DATE;

CREATE TABLE chip_ledger (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game       TEXT NOT NULL,       -- daily | refill | convert | slot | roulette | rocket | shop
  bet        BIGINT NOT NULL DEFAULT 0,
  payout     BIGINT NOT NULL DEFAULT 0,
  delta      BIGINT NOT NULL,     -- payout - bet (또는 지급/차감액)
  detail     JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX chip_ledger_user_idx ON chip_ledger (user_id, id DESC);
CREATE INDEX chip_ledger_week_idx ON chip_ledger (created_at, game);

ALTER TABLE shop_items ADD COLUMN price_chips BIGINT;

INSERT INTO shop_items (kind, slot, item_key, name, image, rarity, price_chips, sort) VALUES
  ('cosmetic', 'character', 'char_bunny',    '카지노 바니',     '🐰', 'rare',      30000,  500),
  ('cosmetic', 'character', 'char_frog',     '행운의 개구리',   '🐸', 'rare',      30000,  501),
  ('cosmetic', 'character', 'char_octopus',  '딜러 문어',       '🐙', 'epic',      120000, 502),
  ('cosmetic', 'character', 'char_lion',     '잭팟 사자',       '🦁', 'legendary', 500000, 503),
  ('cosmetic', 'card',      'card_neon',     '네온 카지노 카드', 'linear-gradient(135deg,#0f0c29,#302b63 50%,#ff2e97)', 'epic', 80000, 510),
  ('cosmetic', 'card',      'card_clover',   '네잎클로버 카드', 'linear-gradient(135deg,#b6f5c9,#3fc27a 55%,#fff6a8)', 'rare', 40000, 511),
  ('cosmetic', 'frame',     'frame_neon',    '네온 테두리',     '#ff2e97', 'rare',      50000,  520),
  ('cosmetic', 'title',     'title_lucky',   '행운아',          '🍀', 'common',    10000,  530),
  ('cosmetic', 'title',     'title_highroll','하이롤러',        '🎩', 'epic',      150000, 531),
  ('cosmetic', 'title',     'title_jackpot', '잭팟 주인공',     '💎', 'legendary', 1000000, 532);
