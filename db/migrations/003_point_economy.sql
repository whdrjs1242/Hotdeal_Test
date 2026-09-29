-- 포인트 경제 개편: 현금화 대신 포인트 마켓(상품권·제휴 상품·꾸미기) + 게임 + 질문
-- 포인트는 플랫폼 안에서만 쓰인다 (현금 출금 없음)

DROP TABLE IF EXISTS withdrawals;

-- 마켓 상품
CREATE TABLE shop_items (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind                TEXT NOT NULL,          -- giftcard | product | cosmetic
  slot                TEXT,                   -- cosmetic 전용: character | card | frame | title
  item_key            TEXT UNIQUE,            -- cosmetic 식별 키 (예: char_fox)
  name                TEXT NOT NULL,
  description         TEXT,
  image               TEXT,                   -- 이미지 URL 또는 이모지
  rarity              TEXT NOT NULL DEFAULT 'common', -- common | rare | epic | legendary
  price_points        INTEGER,                -- NULL 이면 직접 구매 불가(뽑기 전용)
  stock               INTEGER,                -- NULL 이면 무제한
  max_per_user_month  INTEGER,                -- 상품권 과소비 방지
  active              BOOLEAN NOT NULL DEFAULT true,
  sort                INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX shop_items_kind_idx ON shop_items (active, kind, sort);

-- 마켓 주문 (상품권·실물은 운영자가 발송, 꾸미기는 즉시 지급)
CREATE TABLE orders (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id),
  item_id       BIGINT NOT NULL REFERENCES shop_items(id),
  price_points  INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'requested', -- requested | fulfilled | canceled
  contact_enc   TEXT,                          -- 암호화된 받는 사람 연락처/주소
  delivery_enc  TEXT,                          -- 암호화된 쿠폰 번호/송장
  memo          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  fulfilled_at  TIMESTAMPTZ
);
CREATE INDEX orders_status_idx ON orders (status, id);
CREATE INDEX orders_user_idx ON orders (user_id, id DESC);

-- 보유 꾸미기 아이템
CREATE TABLE user_items (
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id     BIGINT NOT NULL REFERENCES shop_items(id),
  source      TEXT NOT NULL DEFAULT 'shop', -- shop | gacha | reward
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);

ALTER TABLE users
  ADD COLUMN equip_character TEXT,
  ADD COLUMN equip_card TEXT,
  ADD COLUMN equip_frame TEXT,
  ADD COLUMN equip_title TEXT;

-- 게임 기록 (하루 횟수 제한·중복 방지)
CREATE TABLE game_plays (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game       TEXT NOT NULL,           -- price_quiz | lucky_box | gacha
  day        DATE NOT NULL,
  state      JSONB NOT NULL DEFAULT '{}',
  reward     INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX game_plays_user_day_idx ON game_plays (user_id, game, day);

-- 질문 (포인트를 걸고 묻기 → 채택 답변자에게 지급)
CREATE TABLE questions (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id            BIGINT NOT NULL REFERENCES users(id),
  title              TEXT NOT NULL,
  body               TEXT,
  reward             INTEGER NOT NULL,
  status             TEXT NOT NULL DEFAULT 'open', -- open | answered | closed
  answer_count       INTEGER NOT NULL DEFAULT 0,
  accepted_answer_id BIGINT,
  expires_at         TIMESTAMPTZ NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX questions_status_idx ON questions (status, id DESC);
CREATE INDEX questions_user_idx ON questions (user_id, id DESC);

CREATE TABLE answers (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id     BIGINT NOT NULL REFERENCES users(id),
  body        TEXT NOT NULL,
  votes_up    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX answers_question_idx ON answers (question_id, votes_up DESC, id);

CREATE TABLE answer_votes (
  answer_id  BIGINT NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (answer_id, user_id)
);

ALTER TABLE questions ADD CONSTRAINT questions_accepted_fk FOREIGN KEY (accepted_answer_id) REFERENCES answers(id);

-- ---------- 기본 상품 카탈로그 (운영자가 관리자 화면에서 추가·수정) ----------
INSERT INTO shop_items (kind, name, description, image, price_points, stock, max_per_user_month, sort) VALUES
  ('giftcard', 'GS25 모바일상품권 3천원', '문자로 쿠폰 발송', '🏪', 3300, NULL, 5, 10),
  ('giftcard', 'CU 모바일상품권 5천원', '문자로 쿠폰 발송', '🏪', 5500, NULL, 5, 11),
  ('giftcard', '스타벅스 아메리카노 T', '문자로 쿠폰 발송', '☕', 5000, NULL, 5, 12),
  ('giftcard', '문화상품권 1만원', '문자로 핀번호 발송', '🎫', 11000, NULL, 3, 13),
  ('giftcard', '배달 쿠폰 1만원', '문자로 쿠폰 발송', '🛵', 11000, NULL, 3, 14),
  ('product',  '줍줍 에코백', '배송지로 발송 (한정 수량)', '👜', 9000, 100, 1, 20),
  ('product',  '삼다수 2L × 6', '배송지로 발송', '💧', 7000, 200, 2, 21);

INSERT INTO shop_items (kind, slot, item_key, name, image, rarity, price_points, sort) VALUES
  ('cosmetic', 'character', 'char_chick',   '병아리 줍러',  '🐥', 'common',    300, 100),
  ('cosmetic', 'character', 'char_cat',     '고양이 헌터',  '🐱', 'common',    300, 101),
  ('cosmetic', 'character', 'char_dog',     '댕댕 헌터',    '🐶', 'common',    300, 102),
  ('cosmetic', 'character', 'char_fox',     '여우 사냥꾼',  '🦊', 'rare',      NULL, 103),
  ('cosmetic', 'character', 'char_panda',   '판다 수집가',  '🐼', 'rare',      NULL, 104),
  ('cosmetic', 'character', 'char_tiger',   '호랑이 딜러',  '🐯', 'epic',      NULL, 105),
  ('cosmetic', 'character', 'char_unicorn', '유니콘',       '🦄', 'epic',      NULL, 106),
  ('cosmetic', 'character', 'char_dragon',  '황금 드래곤',  '🐲', 'legendary', NULL, 107),
  ('cosmetic', 'card',  'card_sunset',  '노을 카드',   'linear-gradient(135deg,#ff9a5a,#ff4d6d)', 'common', 500, 200),
  ('cosmetic', 'card',  'card_mint',    '민트 카드',   'linear-gradient(135deg,#43e0b3,#2a78d6)', 'common', 500, 201),
  ('cosmetic', 'card',  'card_night',   '밤하늘 카드', 'linear-gradient(135deg,#1e1b4b,#4a3aa7 60%,#e87ba4)', 'rare', NULL, 202),
  ('cosmetic', 'card',  'card_gold',    '골드 카드',   'linear-gradient(135deg,#f6d365,#c98500 55%,#fff1b8)', 'legendary', NULL, 203),
  ('cosmetic', 'frame', 'frame_fire',   '불꽃 테두리', '#ff4d2e', 'rare', 800, 300),
  ('cosmetic', 'frame', 'frame_gold',   '황금 테두리', '#eda100', 'epic', NULL, 301),
  ('cosmetic', 'title', 'title_early',  '얼리 헌터',   '🌅', 'common', 400, 400),
  ('cosmetic', 'title', 'title_sniper', '최저가 저격수', '🎯', 'rare', NULL, 401),
  ('cosmetic', 'title', 'title_legend', '전설의 줍줍러', '👑', 'legendary', NULL, 402);
