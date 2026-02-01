# 프로젝트 상세 로드맵 (Detailed Roadmap)

> 이 문서는 `FULL_ROADMAP.md`를 기반으로 각 Phase별 세부 구현 계획을 구체화한 문서입니다.

---

## 시스템 개요

### 목적
춘심AI가 수신한 팬레터 이메일을 이 시스템의 API를 통해 데이터베이스에 저장하고,
관리자가 대시보드에서 저장된 데이터를 조회할 수 있도록 하는 것.

### 시스템 아키텍처

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                                전체 흐름                                       │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   팬 ──(이메일 발송)──▶ 춘심AI ──(POST /api/letters)──▶ 이 시스템            │
│                           │                                  │                │
│                           │  [이미 구현된 기능]               │                │
│                           │  • 이메일 수신                    ▼                │
│                           │  • 이메일 발송               ┌───────┐            │
│                           │                              │  DB   │            │
│                           │  [분석 기능]                  └───────┘            │
│                           │  • 언어 감지                      │                │
│                           │  • 지역 추정                      ▼                │
│                           │  • 감정 분석               ┌────────────┐         │
│                           │  • 주제 태깅               │ 대시보드    │         │
│                           │                            │ (조회/검색) │         │
│                           │                            └────────────┘         │
│                           │                                  │                │
│                           ◀─────────(답장 데이터 조회)────────┘                │
│                           │                                                   │
│   팬 ◀──(답장 이메일)─────┘                                                   │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

### 역할 분담

| 구성요소 | 역할 |
|----------|------|
| **춘심AI** (외부) | 이메일 수신/발송, **이메일 분석 (언어, 지역, 감정, 주제)**, API 호출 |
| **이 프로젝트** | API 제공, 데이터 저장, 관리자 조회/검색/필터링 대시보드 |

---

## Phase 1: 기반 구축 및 DB 설계 (Foundation & Database) ✅ 완료

### 1.1 Next.js 프로젝트 초기화
- [x] `create-next-app`으로 프로젝트 생성
  - TypeScript 활성화
  - App Router 사용 (app 디렉토리 구조)
  - Tailwind CSS 포함
- [x] Shadcn/UI 설치 및 초기 설정
  ```bash
  npx shadcn-ui@latest init
  ```
- [x] 기본 컴포넌트 설치 (Button, Card, Input, Textarea, Badge, Select 등)
- [x] 프로젝트 디렉토리 구조 정리
  ```
  src/
  ├── app/
  │   ├── api/
  │   │   └── letters/      # 춘심AI가 호출하는 API
  │   ├── dashboard/        # 관리자 대시보드
  │   └── layout.tsx
  ├── components/
  │   ├── ui/               # Shadcn 컴포넌트
  │   └── dashboard/        # 대시보드 전용 컴포넌트
  ├── lib/
  │   ├── db/               # Drizzle 관련
  │   └── utils.ts
  └── types/
  ```

### 1.2 Turso 데이터베이스 설정
- [x] Turso CLI 설치 및 로그인
  ```bash
  brew install tursodatabase/tap/turso
  turso auth login
  ```
- [x] 데이터베이스 생성
  ```bash
  turso db create chooncme-fan-letter
  turso db show chooncme-fan-letter
  ```
- [x] 인증 토큰 생성 및 환경변수 설정
  ```bash
  turso db tokens create chooncme-fan-letter
  ```
- [x] `.env.local` 파일 구성
  ```env
  TURSO_DATABASE_URL=libsql://...
  TURSO_AUTH_TOKEN=...
  API_SECRET_KEY=...          # 춘심AI API 인증용
  ```

### 1.3 Drizzle ORM 설정
- [x] 필수 패키지 설치
  ```bash
  npm install drizzle-orm @libsql/client
  npm install -D drizzle-kit
  ```
- [x] `drizzle.config.ts` 파일 생성
- [x] 데이터베이스 연결 클라이언트 설정 (`src/lib/db/index.ts`)

### 1.4 스키마 정의 및 마이그레이션
- [x] `FanLetters` 테이블 스키마 정의 (분석 데이터 포함)
  ```typescript
  // src/lib/db/schema.ts
  import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
  import { sql } from 'drizzle-orm';

  export const fanLetters = sqliteTable('fan_letters', {
    id: integer('id').primaryKey({ autoIncrement: true }),

    // 이메일 메타데이터
    emailId: text('email_id').unique(),           // 원본 이메일 ID (중복 방지)
    subject: text('subject'),                      // 이메일 제목
    senderName: text('sender_name').notNull(),
    senderEmail: text('sender_email').notNull(),

    // 본문
    content: text('content').notNull(),

    // 분석 데이터 (춘심AI가 분석하여 전달)
    language: text('language'),                    // 'ko', 'en', 'ja', 'zh', 'es' 등
    country: text('country'),                      // 'KR', 'US', 'JP', 'CN' 등
    sentiment: text('sentiment'),                  // 'positive', 'neutral', 'negative'
    sentimentScore: real('sentiment_score'),       // 0.0 ~ 1.0 (세부 점수)
    topics: text('topics'),                        // JSON 문자열: ["응원", "질문", "팬아트"]

    // 상태
    isRead: integer('is_read', { mode: 'boolean' }).default(false),
    isStarred: integer('is_starred', { mode: 'boolean' }).default(false),

    // 타임스탬프
    receivedAt: text('received_at'),              // 이메일 수신 시간
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  }, (table) => ({
    // 검색/필터링 성능을 위한 인덱스
    senderEmailIdx: index('idx_sender_email').on(table.senderEmail),
    languageIdx: index('idx_language').on(table.language),
    countryIdx: index('idx_country').on(table.country),
    sentimentIdx: index('idx_sentiment').on(table.sentiment),
    isReadIdx: index('idx_is_read').on(table.isRead),
    receivedAtIdx: index('idx_received_at').on(table.receivedAt),
  }));
  ```
- [x] `Replies` 테이블 스키마 정의
  ```typescript
  export const replies = sqliteTable('replies', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    letterId: integer('letter_id').references(() => fanLetters.id),
    content: text('content').notNull(),

    // 이메일 발송 상태
    emailSent: integer('email_sent', { mode: 'boolean' }).default(false),
    emailSentAt: text('email_sent_at'),

    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  });
  ```
- [x] 마이그레이션 생성 및 실행
  ```bash
  npx drizzle-kit generate
  npx drizzle-kit push
  ```
- [x] Drizzle Studio로 테이블 확인
  ```bash
  npx drizzle-kit studio
  ```

---

## Phase 2: API 개발 (API Development) ✅ 완료

> **핵심**: 춘심AI가 호출하는 API 엔드포인트 구현

### 2.1 API 인증 미들웨어
- [x] API Secret Key 검증 미들웨어 구현
  ```typescript
  // 춘심AI 요청 헤더: Authorization: Bearer <API_SECRET_KEY>
  ```
- [x] 인증 실패 시 401 응답

### 2.2 팬레터 저장 API (`POST /api/letters`)
- [x] API Route 핸들러 생성 (`src/app/api/letters/route.ts`)
- [x] 춘심AI가 전송하는 데이터 구조 정의 (분석 데이터 포함)
  ```typescript
  // 춘심AI → 이 시스템 요청 Body
  {
    // 이메일 기본 정보
    emailId: string;          // 원본 이메일 고유 ID
    subject: string;          // 이메일 제목
    senderName: string;       // 발신자 이름
    senderEmail: string;      // 발신자 이메일
    content: string;          // 이메일 본문
    receivedAt: string;       // 이메일 수신 시간 (ISO 8601)

    // 분석 결과 (춘심AI가 분석)
    language?: string;        // 감지된 언어 코드
    country?: string;         // 추정 국가 코드
    sentiment?: string;       // 감정 분류
    sentimentScore?: number;  // 감정 점수 (0.0 ~ 1.0)
    topics?: string[];        // 주제 태그 배열
  }
  ```
- [x] Zod 스키마 정의
  ```typescript
  // src/lib/validations/letter.ts
  export const createLetterSchema = z.object({
    // 필수 필드
    emailId: z.string().min(1),
    senderName: z.string().min(1).max(100),
    senderEmail: z.string().email(),
    content: z.string().min(1),

    // 선택 필드
    subject: z.string().optional(),
    receivedAt: z.string().datetime().optional(),

    // 분석 데이터 (선택)
    language: z.string().length(2).optional(),  // ISO 639-1
    country: z.string().length(2).optional(),   // ISO 3166-1 alpha-2
    sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
    sentimentScore: z.number().min(0).max(1).optional(),
    topics: z.array(z.string()).optional(),
  });
  ```
- [x] 중복 저장 방지 (emailId 기준)
- [x] topics 배열을 JSON 문자열로 변환하여 저장
- [x] 응답 포맷
  ```typescript
  // 성공: { success: true, data: { id: number } }
  // 실패: { success: false, error: { message: string, code: string } }
  ```

### 2.3 팬레터 조회 API (대시보드용)
- [x] `GET /api/letters` - 목록 조회 (필터링/검색 지원)
  - Query params:
    - `page`, `limit` - 페이지네이션
    - `search` - 발신자 이름/이메일 검색
    - `language` - 언어 필터 (ko, en, ja 등)
    - `country` - 국가 필터 (KR, US, JP 등)
    - `sentiment` - 감정 필터 (positive, neutral, negative)
    - `isRead` - 읽음 상태 필터 (true, false)
    - `isStarred` - 즐겨찾기 필터
    - `startDate`, `endDate` - 기간 필터
  - 최신순 정렬 (receivedAt DESC)
- [x] `GET /api/letters/[id]` - 단일 조회
- [x] `PATCH /api/letters/[id]` - 상태 업데이트
  - 읽음 상태 (`isRead`)
  - 즐겨찾기 (`isStarred`)

### 2.4 통계 API
- [x] `GET /api/stats` - 대시보드 통계
  ```typescript
  // 응답 예시
  {
    total: number;           // 전체 팬레터 수
    unread: number;          // 안읽은 수
    unreplied: number;       // 미답장 수
    todayCount: number;      // 오늘 수신 수
    byLanguage: { ko: number, en: number, ... };
    bySentiment: { positive: number, neutral: number, negative: number };
    recentTrend: [...];      // 최근 7일 수신 추이
  }
  ```

### 2.5 답장 API
- [x] `POST /api/letters/[id]/reply` - 답장 저장
  - 대시보드에서 작성한 답장을 DB에 저장
  - 춘심AI가 이 데이터를 조회하여 이메일 발송
- [x] `GET /api/letters/[id]/reply` - 답장 조회
- [x] `GET /api/replies/pending` - 미발송 답장 목록 (춘심AI용)
- [x] `PATCH /api/replies/[id]` - 이메일 발송 상태 업데이트
  - 춘심AI가 이메일 발송 후 호출

### 2.6 API 문서 및 테스트
- [x] API 명세서 작성 (`docs/api/API_SPEC.md`)
- [ ] Postman/Bruno 컬렉션 생성
- [ ] 테스트 케이스
  - 정상 저장 (분석 데이터 포함/미포함)
  - 중복 emailId 처리
  - 필터링/검색 동작 확인
  - 인증 실패
  - 유효하지 않은 데이터

---

## Phase 3: 대시보드 개발 (Dashboard Implementation) ✅ 완료

> **핵심**: 관리자가 팬레터를 조회/검색/분석하는 UI

### 3.1 레이아웃 및 공통 컴포넌트
- [x] 대시보드 레이아웃 구현 (`app/dashboard/layout.tsx`)
  - 헤더 (춘심이 로고/타이틀)
  - 사이드바 (네비게이션, 필터 영역)
- [ ] 춘심이 테마 색상 정의
  ```css
  --chooncme-primary: #...;
  --chooncme-secondary: #...;
  --chooncme-accent: #...;
  ```

### 3.2 대시보드 홈 (`/dashboard`)
- [x] 통계 카드 표시
  - 전체 팬레터 수
  - 안읽은 편지 수
  - 미답장 편지 수
  - 오늘 수신 수
- [x] 언어별/감정별 차트 (recharts 사용)
- [x] 최근 수신 편지 미리보기 (최근 5개)

### 3.3 팬레터 목록 페이지 (`/dashboard/letters`)
- [x] 서버 컴포넌트로 데이터 페칭
- [x] **검색 기능**
  - 발신자 이름/이메일 검색
  - 특정 팬의 모든 편지 조회
- [x] **필터링 기능**
  - 언어별 필터 (한국어, 영어, 일본어, 중국어 등)
  - 국가별 필터
  - 감정별 필터 (긍정, 중립, 부정)
  - 읽음/안읽음
  - 즐겨찾기
  - 기간 필터
- [x] 팬레터 카드 컴포넌트
  - 발신자 이름 / 이메일
  - 제목
  - 내용 미리보기 (50자)
  - 수신 시간 (상대 시간 표시)
  - **언어 뱃지** (🇰🇷, 🇺🇸, 🇯🇵 등)
  - **감정 뱃지** (😊 긍정, 😐 중립, 😢 부정)
  - 읽음/안읽음 상태
  - 즐겨찾기 토글
  - 답장 여부 표시
- [x] 페이지네이션 UI
- [x] 빈 상태 UI (편지가 없을 때)

### 3.4 팬레터 상세 페이지 (`/dashboard/letters/[id]`)
- [x] 이메일 메타데이터 표시
  - 발신자, 제목, 수신 시간
  - **언어, 국가, 감정 분석 결과**
  - **주제 태그**
- [x] 팬레터 전체 내용 표시
- [x] 같은 발신자의 이전 편지 목록 (히스토리)
- [x] 답장 작성 폼
  - Textarea
  - 저장 버튼 (DB 저장 → 춘심AI가 이메일 발송)
- [x] 기존 답장 표시 (있는 경우)
  - 이메일 발송 상태 표시
- [x] 뒤로가기 네비게이션

### 3.5 UI/UX 개선
- [x] 로딩 상태 (Skeleton UI)
- [x] 토스트 알림 (저장 성공/에러)
- [x] 반응형 디자인 (모바일 대응)
- [ ] 키보드 단축키 (j/k 네비게이션, s 즐겨찾기 등 - 선택사항)

---

## Phase 4: 배포 및 최종 점검 (Deployment & QA) ⏳ 미완료

### 4.1 Vercel 배포
- [ ] Vercel 프로젝트 연결
  ```bash
  vercel link
  ```
- [ ] 환경변수 설정 (Vercel Dashboard)
  - `TURSO_DATABASE_URL`
  - `TURSO_AUTH_TOKEN`
  - `API_SECRET_KEY`
- [ ] 프리뷰 배포 테스트
- [ ] 프로덕션 배포

### 4.2 운영 환경 설정
- [ ] 프로덕션용 Turso DB 생성 (필요시)
- [ ] DB 연결 확인
- [ ] API 응답 시간 체크
- [ ] 인덱스 성능 확인

### 4.3 통합 테스트 (춘심AI 연동)
- [ ] 춘심AI → API 팬레터 저장 테스트 (분석 데이터 포함)
- [ ] 대시보드에서 조회/검색/필터 확인
- [ ] 답장 작성 → 춘심AI 이메일 발송 확인
- [ ] 에러 시나리오 테스트
  - API 인증 실패
  - 네트워크 에러
  - 잘못된 데이터 형식

### 4.4 문서화 및 마무리
- [ ] API 문서 작성 (`docs/api/`) - 춘심AI 연동 가이드
- [ ] 완료 보고서 작성 (`docs/reports/`)
- [ ] README.md 업데이트

---

## 의존성 관계 다이어그램

```
Phase 1.1 (Next.js 초기화) ✅
    │
    ├── Phase 1.2 (Turso 설정) ✅ ──┐
    │                               │
    └── Phase 1.3 (Drizzle 설정) ✅ ┴── Phase 1.4 (스키마/마이그레이션) ✅
                                            │
                                            ▼
                                    Phase 2 (API 개발) ✅
                                      │         │
                    ┌─────────────────┘         └─────────────────┐
                    ▼                                             ▼
            춘심AI 연동 테스트 ⏳                         Phase 3 (대시보드) ✅
                    │                                             │
                    └─────────────────┬───────────────────────────┘
                                      ▼
                              Phase 4 (배포/QA) ⏳
```

---

## 기술 스택 요약

| 분류 | 기술 |
|------|------|
| Framework | Next.js 16+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + Shadcn/UI |
| Database | Turso (libSQL) |
| ORM | Drizzle ORM |
| Validation | Zod |
| Charts | Recharts |
| Deployment | Vercel |
| External | 춘심AI (이메일 수신/발송/분석) |

---

## 데이터 분류 체계

### 언어 코드 (ISO 639-1)
| 코드 | 언어 |
|------|------|
| `ko` | 한국어 |
| `en` | 영어 |
| `ja` | 일본어 |
| `zh` | 중국어 |
| `es` | 스페인어 |
| `pt` | 포르투갈어 |
| ... | 기타 |

### 국가 코드 (ISO 3166-1 alpha-2)
| 코드 | 국가 |
|------|------|
| `KR` | 한국 |
| `US` | 미국 |
| `JP` | 일본 |
| `CN` | 중국 |
| ... | 기타 |

### 감정 분류
| 값 | 설명 | 점수 범위 |
|----|------|-----------|
| `positive` | 긍정적 | 0.6 ~ 1.0 |
| `neutral` | 중립적 | 0.4 ~ 0.6 |
| `negative` | 부정적 | 0.0 ~ 0.4 |

### 주제 태그 예시
- `응원`, `감사`, `질문`, `요청`, `팬아트`, `생일축하`, `콘서트`, `앨범`, `굿즈` 등

---

## API 엔드포인트 요약

| Method | Endpoint | 호출 주체 | 설명 | 상태 |
|--------|----------|-----------|------|------|
| `POST` | `/api/letters` | 춘심AI | 팬레터 저장 (분석 데이터 포함) | ✅ |
| `GET` | `/api/letters` | 대시보드 | 목록 조회 (검색/필터 지원) | ✅ |
| `GET` | `/api/letters/[id]` | 대시보드 | 상세 조회 | ✅ |
| `PATCH` | `/api/letters/[id]` | 대시보드 | 상태 업데이트 (읽음/즐겨찾기) | ✅ |
| `GET` | `/api/stats` | 대시보드 | 통계 조회 | ✅ |
| `POST` | `/api/letters/[id]/reply` | 대시보드 | 답장 저장 | ✅ |
| `GET` | `/api/letters/[id]/reply` | 춘심AI | 답장 조회 | ✅ |
| `GET` | `/api/replies/pending` | 춘심AI | 미발송 답장 목록 | ✅ |
| `PATCH` | `/api/replies/[id]` | 춘심AI | 발송 상태 업데이트 | ✅ |

---

## 진행 상태 요약

| Phase | 진행률 | 상태 |
|-------|--------|------|
| Phase 1: 기반 구축 | 100% | ✅ 완료 |
| Phase 2: API 개발 | 100% | ✅ 완료 |
| Phase 3: 대시보드 | 100% | ✅ 완료 |
| Phase 4: 배포/QA | 0% | ⏳ 대기 |

---

*마지막 업데이트: 2026-02-01*
