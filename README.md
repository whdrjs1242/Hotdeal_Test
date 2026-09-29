# 🔥 줍줍 (JupJup)

**원하는 가격을 걸어두세요. 헌터들이 찾아옵니다.** 모바일 퍼스트 핫딜 공유 + 현상금 수배 플랫폼

- **현상금 수배**: 수배자가 포인트를 걸고 원하는 상품을 수배 → 헌터가 찾아오고, 참여자가 평가·공유
- 수배자·참여자·헌터 모두 포인트 적립 (구매 기여 30/20/10%, 현상금, 글·댓글·추천·답변 활동 포인트)
- **포인트 마켓**(상품권·제휴 상품·꾸미기), **게임**(최저가 맞히기·무료 럭키박스·꾸미기 뽑기), **캐릭터·프로필 카드**, **살까말까 질문**
- **줍줍 라운지** `/casino`: 슬롯·룰렛·로켓 미니 카지노 (환전 불가 전용 칩, 확률·환수율 공개)
- 공유된 쇼핑 링크는 서버에서 자동으로 운영자 제휴 링크로 변환 (쿠팡 파트너스 / 링크프라이스 / 알리익스프레스 / 아마존)
- 운영 대시보드 `/admin`: 수수료·성장·수배 퍼널·포인트 발행/소모·시간대 히트맵·마켓 발송 처리
- **키워드 + 목표가 푸시 알림**, 딜 온도(°C), 마감 카운트다운, 가격 히스토리, 품절 크라우드 제보
- 헌터 레벨 · 주간 랭킹 · 출석 스트릭 · 친구 초대 보너스
- **크리에이터 채널** `/@handle`: 인플루언서용 link-in-bio 핫딜 페이지 (SaaS)
- PWA (홈 화면 설치, 웹푸시, 다른 앱에서 "공유 → 줍줍"), Capacitor/TWA로 앱스토어 등록

기획 의도와 성장 전략은 [`docs/PRODUCT.md`](docs/PRODUCT.md), 기술 구조·확장·배포·앱 등록은 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)에 정리돼 있습니다.

## 빠른 시작

```bash
cp .env.example .env
docker compose up -d db redis      # 또는 로컬 Postgres/Redis
npm install
npm run db:migrate
npm run db:seed                    # 데모 데이터 (선택)
npm run db:seed:history            # 대시보드용 90일치 활동 데이터 (선택)
npm run dev                        # http://localhost:3000
```

개발 중에는 `ALLOW_DEV_LOGIN=true` 로 닉네임만 입력해 로그인할 수 있습니다.
관리자 화면(`/admin`)은 `ADMIN_USER_IDS` 에 사용자 id를 넣으면 열립니다.

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` | 타입 체크 |
| `npm test` | 단위 테스트 (링크 정규화, 제휴 링크, 수익 분배, 랭킹 등) |
| `npm run db:migrate` | `db/migrations/*.sql` 적용 |
| `npm run db:seed` | 데모 데이터 |

## 제휴 설정

`.env` 에 키를 넣은 네트워크만 수익화되고, 나머지는 원본 링크로 이동합니다.

| 변수 | 네트워크 |
|---|---|
| `COUPANG_ACCESS_KEY`, `COUPANG_SECRET_KEY` | 쿠팡 파트너스 Open API (딥링크) |
| `LINKPRICE_AFFILIATE_ID` | 링크프라이스 (11번가, G마켓, 옥션, SSG, 롯데ON, 무신사, 올리브영 등 — 머천트 ID는 `src/lib/affiliate/merchants.ts`) |
| `ALIEXPRESS_AFF_SHORT_KEY` | 알리익스프레스 |
| `AMAZON_ASSOCIATE_TAG` | 아마존 어소시에이트 |

실적(구매) 데이터는 `/admin` 에서 CSV(`network,external_id,sub_id,order_amount,commission,status`)로 올리면
`sub_id`(클릭 ID)로 공유자·게시자를 찾아 포인트를 적립합니다. 같은 주문을 `confirmed`/`canceled` 로 다시 올리면 상태가 갱신됩니다.
