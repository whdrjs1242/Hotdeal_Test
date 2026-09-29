-- 현상금 수배 시스템 + 활동 보상 + 포인트 현금화
-- 역할: 수배자(수배지 등록, 포인트 지불) / 참여자(참여·댓글·평가·공유) / 헌터(수배 상품 발견)

CREATE TABLE bounties (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES users(id),     -- 수배자
  title             TEXT NOT NULL,                             -- 찾는 상품
  description       TEXT,                                      -- 조건 (색상, 용량, 정품 등)
  target_price      INTEGER,                                   -- 목표가 (이하)
  category          TEXT NOT NULL DEFAULT 'etc',
  image_url         TEXT,
  stake             INTEGER NOT NULL,                          -- 수배자가 건 포인트
  pot               INTEGER NOT NULL,                          -- 현재 현상금 (수배자 + 참여자 추가분)
  status            TEXT NOT NULL DEFAULT 'open',              -- open | awarded | expired | canceled
  expires_at        TIMESTAMPTZ NOT NULL,
  participant_count INTEGER NOT NULL DEFAULT 0,
  comment_count     INTEGER NOT NULL DEFAULT 0,
  share_count       INTEGER NOT NULL DEFAULT 0,
  found_count       INTEGER NOT NULL DEFAULT 0,
  awarded_deal_id   BIGINT,
  hot_score         DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX bounties_hot_idx    ON bounties (status, hot_score DESC, id DESC);
CREATE INDEX bounties_new_idx    ON bounties (status, id DESC);
CREATE INDEX bounties_expire_idx ON bounties (status, expires_at);
CREATE INDEX bounties_user_idx   ON bounties (user_id, id DESC);
CREATE INDEX bounties_title_trgm ON bounties USING gin (title gin_trgm_ops);

-- 참여자 ("나도 찾아요") + 현상금 추가분
CREATE TABLE bounty_participants (
  bounty_id    BIGINT NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
  user_id      BIGINT NOT NULL REFERENCES users(id),
  contributed  INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (bounty_id, user_id)
);
CREATE INDEX bounty_participants_user_idx ON bounty_participants (user_id);

CREATE TABLE bounty_comments (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bounty_id  BIGINT NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES users(id),
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX bounty_comments_idx ON bounty_comments (bounty_id, id);

-- 헌터가 찾은 상품 = 수배에 연결된 딜 (핫딜 피드에도 함께 노출)
ALTER TABLE deals ADD COLUMN bounty_id BIGINT REFERENCES bounties(id);
CREATE INDEX deals_bounty_idx ON deals (bounty_id, votes_up DESC) WHERE bounty_id IS NOT NULL;
ALTER TABLE bounties ADD CONSTRAINT bounties_awarded_fk FOREIGN KEY (awarded_deal_id) REFERENCES deals(id);

-- 공유 링크로 실제 유저가 들어온 기록 (공유자 활동 보상 근거, 하루·방문자 단위 중복 제거)
CREATE TABLE share_arrivals (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sharer_id   BIGINT NOT NULL REFERENCES users(id),
  target_type TEXT NOT NULL,          -- deal | bounty
  target_id   BIGINT NOT NULL,
  ip_hash     TEXT NOT NULL,
  day         DATE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sharer_id, target_type, target_id, ip_hash, day)
);
CREATE INDEX share_arrivals_sharer_idx ON share_arrivals (sharer_id, created_at);

-- 포인트 원장 멱등 키 (같은 행동에 두 번 지급 방지)
ALTER TABLE points_ledger ADD COLUMN ref_key TEXT;
CREATE UNIQUE INDEX points_ref_uniq ON points_ledger (user_id, kind, ref_key) WHERE ref_key IS NOT NULL;
CREATE INDEX points_kind_day_idx ON points_ledger (user_id, kind, created_at);

-- 포인트 현금화 신청
CREATE TABLE withdrawals (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id),
  points        INTEGER NOT NULL,
  amount_krw    INTEGER NOT NULL,
  bank_name     TEXT NOT NULL,
  account_enc   TEXT NOT NULL,        -- AES-GCM 암호화된 계좌번호
  account_last4 TEXT NOT NULL,
  holder_name   TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'requested', -- requested | paid | rejected
  memo          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at  TIMESTAMPTZ
);
CREATE INDEX withdrawals_status_idx ON withdrawals (status, id);
CREATE INDEX withdrawals_user_idx ON withdrawals (user_id, id DESC);
