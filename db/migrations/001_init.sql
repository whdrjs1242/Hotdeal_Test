-- 줍줍 초기 스키마
-- 대용량 트래픽 전제: 피드 조회는 (status, hot_score) / (status, created_at) 인덱스만 타도록 설계,
-- 카운터는 비정규화 컬럼으로 유지하고 clicks 같은 로그성 테이블은 월 단위 파티셔닝을 권장(docs/ARCHITECTURE.md).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE users (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nickname       TEXT NOT NULL UNIQUE,
  kakao_id       TEXT UNIQUE,
  handle         TEXT UNIQUE,                 -- 크리에이터 채널 주소 (/@handle)
  bio            TEXT,
  avatar_url     TEXT,
  ref_code       TEXT NOT NULL UNIQUE,        -- 공유/초대 코드
  referred_by    BIGINT REFERENCES users(id),
  xp             INTEGER NOT NULL DEFAULT 0,
  points_available INTEGER NOT NULL DEFAULT 0, -- 출금 가능 포인트(1P = 1원)
  points_pending   INTEGER NOT NULL DEFAULT 0, -- 구매확정 대기 포인트
  streak_days    INTEGER NOT NULL DEFAULT 0,
  last_checkin   DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE deals (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id),
  title           TEXT NOT NULL,
  description     TEXT,
  original_url    TEXT NOT NULL,
  canonical_url   TEXT NOT NULL,
  merchant        TEXT NOT NULL,
  network         TEXT NOT NULL,              -- coupang | linkprice | aliexpress | amazon | none
  monetized       BOOLEAN NOT NULL DEFAULT false,
  image_url       TEXT,
  price           INTEGER,
  original_price  INTEGER,
  shipping        TEXT,
  category        TEXT NOT NULL DEFAULT 'etc',
  status          TEXT NOT NULL DEFAULT 'active', -- active | soldout | expired | hidden
  ends_at         TIMESTAMPTZ,
  votes_up        INTEGER NOT NULL DEFAULT 0,
  votes_down      INTEGER NOT NULL DEFAULT 0,
  comment_count   INTEGER NOT NULL DEFAULT 0,
  click_count     INTEGER NOT NULL DEFAULT 0,
  share_count     INTEGER NOT NULL DEFAULT 0,
  report_count    INTEGER NOT NULL DEFAULT 0,
  hot_score       DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX deals_hot_idx      ON deals (status, hot_score DESC, id DESC);
CREATE INDEX deals_new_idx      ON deals (status, id DESC);
CREATE INDEX deals_cat_hot_idx  ON deals (category, status, hot_score DESC, id DESC);
CREATE INDEX deals_ending_idx   ON deals (status, ends_at) WHERE ends_at IS NOT NULL;
CREATE INDEX deals_user_idx     ON deals (user_id, id DESC);
CREATE INDEX deals_canon_idx    ON deals (canonical_url);
CREATE INDEX deals_title_trgm   ON deals USING gin (title gin_trgm_ops);

CREATE TABLE deal_votes (
  deal_id    BIGINT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES users(id),
  value      SMALLINT NOT NULL CHECK (value IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (deal_id, user_id)
);

CREATE TABLE comments (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  deal_id    BIGINT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES users(id),
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX comments_deal_idx ON comments (deal_id, id);

CREATE TABLE reports (
  deal_id    BIGINT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES users(id),
  reason     TEXT NOT NULL,                  -- soldout | price_changed | spam | etc
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (deal_id, user_id)
);

-- 구매 버튼 클릭 로그. id가 제휴 네트워크의 subId로 전달되어 전환(구매)과 공유자를 연결한다.
CREATE TABLE clicks (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  deal_id    BIGINT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  user_id    BIGINT REFERENCES users(id),
  sharer_id  BIGINT REFERENCES users(id),
  network    TEXT NOT NULL,
  ip_hash    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX clicks_deal_idx   ON clicks (deal_id, created_at);
CREATE INDEX clicks_sharer_idx ON clicks (sharer_id, created_at) WHERE sharer_id IS NOT NULL;

CREATE TABLE shares (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  deal_id    BIGINT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  user_id    BIGINT REFERENCES users(id),
  channel    TEXT NOT NULL,                  -- kakao | native | copy | x | ...
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX shares_user_idx ON shares (user_id, created_at);

-- 제휴사 실적 리포트(구매/수수료)
CREATE TABLE conversions (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  network      TEXT NOT NULL,
  external_id  TEXT NOT NULL,                -- 제휴사 주문/실적 id
  click_id     BIGINT REFERENCES clicks(id),
  order_amount INTEGER NOT NULL DEFAULT 0,
  commission   INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'pending', -- pending | confirmed | canceled
  ordered_at   TIMESTAMPTZ,
  raw          JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (network, external_id)
);

-- 포인트 원장. users.points_* 는 이 원장의 캐시다.
CREATE TABLE points_ledger (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id),
  delta         INTEGER NOT NULL,
  kind          TEXT NOT NULL,   -- share_reward | post_reward | referral_reward | checkin | withdraw | admin
  status        TEXT NOT NULL DEFAULT 'pending', -- pending | available | canceled
  conversion_id BIGINT REFERENCES conversions(id),
  memo          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX points_user_idx ON points_ledger (user_id, id DESC);
CREATE UNIQUE INDEX points_conv_uniq ON points_ledger (conversion_id, user_id, kind) WHERE conversion_id IS NOT NULL;

-- 줍줍 알림: 키워드 + 목표가
CREATE TABLE alerts (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  keyword    TEXT NOT NULL,
  max_price  INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, keyword)
);
CREATE INDEX alerts_keyword_trgm ON alerts USING gin (keyword gin_trgm_ops);

CREATE TABLE push_subscriptions (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX push_user_idx ON push_subscriptions (user_id);

CREATE TABLE notifications (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deal_id    BIGINT REFERENCES deals(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,   -- alert_match | reward | hot
  title      TEXT NOT NULL,
  body       TEXT,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON notifications (user_id, id DESC);

-- 같은 상품의 가격 변동 기록 (가격 히스토리 그래프)
CREATE TABLE price_history (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  canonical_url TEXT NOT NULL,
  price         INTEGER NOT NULL,
  deal_id       BIGINT REFERENCES deals(id) ON DELETE SET NULL,
  observed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX price_history_url_idx ON price_history (canonical_url, observed_at);

-- 제휴 딥링크 API 결과 캐시 (쿠팡 등 API 호출 한도 보호)
CREATE TABLE affiliate_link_cache (
  canonical_url TEXT PRIMARY KEY,
  network       TEXT NOT NULL,
  affiliate_url TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
