# 줍줍 — 아키텍처 & 운영 가이드

## 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| 웹/API | Next.js 16 (App Router, React 19) | SSR로 SEO + 빠른 첫 화면, API와 한 코드베이스, Vercel/컨테이너 어디든 배포 |
| DB | PostgreSQL 16 (`postgres.js`, 순수 SQL) | ORM 오버헤드 없이 인덱스를 정확히 통제. Supabase/RDS/Neon 모두 호환 |
| 캐시 | Redis (`ioredis`), 없으면 인메모리 | 피드 캐시, 레이트리밋, 딜 리다이렉트 캐시 |
| 스타일 | Tailwind CSS 4 | 모바일 우선 UI, 다크모드 |
| 앱 | PWA(서비스워커·웹푸시·share_target) + Capacitor/TWA 래핑 | 하나의 코드로 웹·안드로이드·iOS |

## 디렉터리

```
src/
  app/                 페이지 & API 라우트
    page.tsx           홈 피드 (핫/최신/마감임박/오늘TOP, 카테고리, 검색)
    deals/[id]/        딜 상세 + opengraph-image(공유 카드)
    go/[id]/           구매 리다이렉트 (클릭 로그 → 제휴 링크 302)
    submit/ alerts/ me/ rank/ login/ admin/
    c/[handle]/        크리에이터 채널 (/@handle 로 rewrite)
    api/               JSON API
  lib/
    affiliate/         링크 정규화 · 머천트 매칭 · 제휴 링크 생성 (쿠팡 API/링크프라이스/알리/아마존)
    rewards.ts         수익 분배 정책 · 실적(전환) 반영 · 포인트 원장
    ranking.ts         핫 점수 / 딜 온도
    deals.ts           피드 쿼리 (커서 페이지네이션)
    dealService.ts     딜 생성 · 미리보기 · 딥링크 캐시
    alerts.ts push.ts  키워드 알림 매칭 · 웹푸시
    net.ts scrape.ts   SSRF 방어 fetch · 상품 메타 추출
  proxy.ts             ?r=공유코드 → 30일 쿠키
db/migrations/         SQL 마이그레이션
```

## 제휴 링크 변환 흐름

1. 사용자가 아무 링크나 붙여넣음 (타인 제휴링크, `link.coupang.com/a/...` 단축링크, 모바일 링크 포함)
2. `prepareLink`: 텍스트에서 URL 추출 → 단축/제휴 링크 리다이렉트 추적 → **추적·타인 제휴 파라미터 제거** → canonical URL
3. 도메인으로 머천트/네트워크 판별 (`merchants.ts`)
4. 구매 클릭 시 `/go/{id}` 가 `clicks` 행을 만들고 그 id를 **subId**로 붙여 최종 URL 생성
   - 쿠팡: 파트너스 딥링크 API(HMAC) 결과를 `affiliate_link_cache` 에 캐시, `subid` 만 클릭별 교체
   - 링크프라이스: `click.php?m=머천트&a=내ID&u_id=subId&tu=원본`
   - 알리: `deep_link.htm?aff_short_key=..&dp=subId`
   - 아마존: `tag`, `ascsubtag`
   - 키가 없는 네트워크는 원본 링크로 이동 (서비스는 정상 동작)
5. 제휴사 실적 리포트(subId 포함)를 `/admin` CSV 업로드 또는 워커가 `ingestConversion()` 호출 → 포인트 원장

> 쿠팡의 `subid` 교체 방식과 링크프라이스 머천트 ID는 계약 후 실제 발급값으로 검증이 필요합니다.

## 수십만 트래픽 대응

**읽기 경로 (트래픽의 95%)**
- 피드: Redis 15초 캐시 + `s-maxage=10, stale-while-revalidate` → 동시 접속자가 늘어도 DB 쿼리는 초당 수 건 수준
- 피드 쿼리는 전부 `(status, hot_score, id)` 등 복합 인덱스의 **커서 범위 스캔** (OFFSET 없음 → 깊은 페이지도 O(limit))
- 핫 점수는 `log10(참여도) + 게시시각/30000` 공식 → 시간 경과로 재계산할 필요가 없어 **전체 재정렬 배치가 없다**. 이벤트가 난 행만 갱신
- 딜 상세: 10초 캐시, 이미지/정적 파일은 CDN
- 구매 리다이렉트: 딜 정보 5분 캐시 → DB는 INSERT 1 + UPDATE 1

**쓰기 경로**
- 투표/댓글/공유는 행 단위 원자적 증감, 사용자별 레이트리밋
- 같은 IP의 반복 클릭은 카운트·XP 미반영(어뷰징 방지)
- 알림 매칭·딥링크 생성은 `after()`로 응답 이후 처리

**확장 단계 권장**
| 규모 | 조치 |
|---|---|
| ~DAU 5만 | 단일 Postgres(4vCPU) + Redis 1대 + Vercel/컨테이너 2~3대로 충분 |
| ~DAU 30만 | PgBouncer(transaction mode, `DB_PREPARE=false`), 읽기 전용 레플리카로 피드 분리, `clicks` 월 파티셔닝 |
| 그 이상 | 클릭 로그를 Kafka/Redis Stream → 배치 적재, 알림 매칭을 Aho-Corasick 워커로 분리, 검색을 OpenSearch로 |

## 보안

- SSRF: 사용자 URL을 서버가 가져올 때 사설/루프백/링크로컬 주소와 **DNS 해석 결과**까지 차단, 리다이렉트는 hop마다 재검증
- 세션: HS256 JWT, httpOnly/SameSite=Lax 쿠키
- 레이트리밋: 등록·투표·댓글·공유·알림·로그인
- 관리자: `ADMIN_USER_IDS` 화이트리스트
- 크론: `CRON_SECRET` Bearer 토큰

## 배포

### Vercel + Supabase(또는 Neon) + Upstash Redis
1. DB 생성 후 `DATABASE_URL` 설정 → `npm run db:migrate`
2. Vercel에 저장소 연결, `.env.example`의 변수 입력 (`ALLOW_DEV_LOGIN=false`)
3. `vercel.json`의 크론이 5분마다 마감 딜 종료 (`CRON_SECRET` 필요)

### 컨테이너
```bash
docker compose up -d db redis          # 로컬 DB/Redis
docker compose --profile app up -d     # 앱까지 (시작 시 마이그레이션 자동 실행)
```

## 앱스토어 등록

- **안드로이드 (추천: TWA)**: PWA 그대로 Bubblewrap으로 TWA 생성 → `public/.well-known/assetlinks.json` 에 서명 지문 등록 → Play 스토어 업로드. 웹 배포만 하면 앱도 즉시 업데이트.
- **iOS / 안드로이드 (Capacitor)**: `capacitor.config.json` 준비됨.
  ```bash
  npm i -D @capacitor/cli && npm i @capacitor/core @capacitor/ios @capacitor/android
  npx cap add ios && npx cap add android && npx cap sync
  ```
  iOS는 단순 웹뷰 앱이 반려될 수 있으므로 네이티브 푸시(`@capacitor/push-notifications`), 공유 확장(Share Extension) 등 네이티브 기능을 붙여 심사 대응.
- 웹푸시: iOS 16.4+ 는 홈 화면에 추가된 PWA에서만 동작 → 앱 설치 유도 배너 권장

## 오픈 전 체크리스트

- [ ] `AUTH_SECRET`, `CRON_SECRET` 랜덤 값, `ALLOW_DEV_LOGIN=false`
- [ ] 카카오 로그인 앱 등록 (Redirect URI: `{SITE}/api/auth/kakao/callback`)
- [ ] 제휴 계약: 쿠팡 파트너스 API 키, 링크프라이스 affiliate id + 머천트 ID 교체(`merchants.ts`), 리워드 허용 여부 확인 후 `rewardEligible`
- [ ] VAPID 키 생성 `npx web-push generate-vapid-keys`
- [ ] 개인정보처리방침/이용약관, 통신판매중개 고지 필요 여부 검토
- [ ] 포인트 출금: 본인인증 + 기타소득 원천징수 처리 후 오픈
- [ ] OG 이미지 폰트: 운영에선 Noto Sans KR 파일을 번들해 외부 폰트 의존 제거 권장
