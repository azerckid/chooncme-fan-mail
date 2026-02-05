# 춘심이 팬메일 자동 응답 시스템

아이돌 지망생 '춘심이'가 팬들에게 받은 편지에 AI로 자동 답장하는 시스템입니다.

## 주요 기능

- **이메일 자동 수집**: Gmail API를 통해 1시간마다 새 이메일 확인
- **팬메일 분류**: LLM이 팬메일과 일반 메일(광고, 스팸 등)을 자동 분류
- **AI 답장 생성**: 춘심이 페르소나로 정성스러운 답장 자동 생성
- **다국어 지원**: 팬레터 언어에 맞춰 한국어/영어/일본어 등으로 답장
- **지연 발송**: 자연스러운 응답을 위해 10~30분 랜덤 지연 후 발송
- **팔로업 자동화**: 답장이 없는 팬에게 1주 → 2주 → 4주 → 8주 간격으로 재연락

## 시스템 흐름

```
Gmail 수신함
    │
    ▼ (1시간마다 Cron)
새 이메일 수집 ──→ 팬메일 분류 (LLM)
                      │
              ┌───────┴───────┐
              ▼               ▼
          [팬메일]        [일반메일]
              │               │
              ▼               ▼
          DB 저장           무시
              │
              ▼
         답장 생성 (LLM)
              │
              ▼
      10~30분 지연 후 발송
              │
              ▼
       팔로업 예약 (1주 후)
```

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 15 (App Router) |
| 데이터베이스 | Turso (SQLite) + Drizzle ORM |
| LLM | Google Gemini |
| 이메일 | Gmail API (OAuth2) |
| 스케줄러 | Vercel Cron |
| 언어 | TypeScript |

## 프로젝트 구조

```
├── app/
│   ├── api/
│   │   └── cron/
│   │       └── check-email/     # 이메일 처리 Cron 엔드포인트
│   └── dashboard/               # 관리 대시보드
├── db/
│   └── schema.ts                # 데이터베이스 스키마
├── lib/
│   ├── email/
│   │   ├── gmail.ts             # Gmail API 클라이언트
│   │   ├── classify.ts          # 이메일 분류
│   │   └── archive.ts           # 팬메일 DB 저장
│   ├── llm/
│   │   ├── classify-prompt.ts   # 분류 프롬프트
│   │   ├── reply-prompt.ts      # 답장 프롬프트
│   │   └── followup-prompt.ts   # 팔로업 프롬프트
│   ├── scheduler/
│   │   ├── process-emails.ts    # 이메일 처리 파이프라인
│   │   ├── reply-generator.ts   # 답장 생성
│   │   ├── delayed-send.ts      # 지연 발송
│   │   ├── follow-up.ts         # 팔로업 스케줄링
│   │   └── process-followups.ts # 팔로업 처리
│   └── mail.ts                  # 메일 발송
└── docs/
    ├── features/                # 기능 명세
    └── roadmap/                 # 구현 계획
```

## 데이터베이스 스키마

### fan_letters (팬메일)
| 컬럼 | 설명 |
|------|------|
| id | Primary Key |
| sender_name | 발신자 이름 |
| sender_email | 발신자 이메일 |
| subject | 제목 |
| content | 본문 |
| is_replied | 답장 여부 |
| received_at | 수신 시각 |

### replies (답장)
| 컬럼 | 설명 |
|------|------|
| id | Primary Key |
| letter_id | FK → fan_letters |
| content | 답장 내용 |
| email_sent | 발송 여부 |
| email_sent_at | 발송 시각 |

### follow_ups (팔로업)
| 컬럼 | 설명 |
|------|------|
| id | Primary Key |
| reply_id | FK → replies |
| sender_email | 팬 이메일 |
| follow_up_count | 발송 횟수 |
| next_follow_up_at | 다음 팔로업 예정일 |
| status | pending / completed / cancelled |

## 환경 변수

`.env.local` 파일에 다음 변수들을 설정하세요:

```env
# Database (Turso)
DATABASE_URL=libsql://your-db.turso.io
DATABASE_AUTH_TOKEN=your-token

# Gmail OAuth2
GMAIL_USER=your-email@gmail.com
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token

# LLM (Gemini)
GOOGLE_GEMINI_API_KEY=your-api-key

# Optional
REPLY_DELAY_MIN=10          # 최소 지연 (분)
REPLY_DELAY_MAX=30          # 최대 지연 (분)
EMAIL_DRY_RUN=false         # 테스트 모드 (실제 발송 안함)
FOLLOWUP_ENABLED=true       # 팔로업 활성화
```

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

```bash
cp .env.example .env.local
# .env.local 파일 편집
```

### 3. 데이터베이스 마이그레이션

```bash
npm run db:generate
npm run db:migrate
```

### 4. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 대시보드를 확인할 수 있습니다.

## Cron 설정

### Vercel Cron (프로덕션)

`vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/check-email",
      "schedule": "0 * * * *"
    }
  ]
}
```

### 수동 실행

```bash
curl http://localhost:3000/api/cron/check-email
```

## 팬메일 분류 기준

### 팬메일로 분류
- 응원, 사랑, 감사의 메시지
- "좋아해요", "응원해요", "팬이에요" 등의 표현
- 공연, 영상, 활동에 대한 감상
- 팬아트, 팬레터임을 명시한 경우

### 일반 메일로 분류
- 광고, 스팸, 뉴스레터
- 비즈니스 문의, 협업 제안
- 시스템 알림, 자동 발송 메일

## 답장 생성 가이드라인

- 21세 한국 여자 아이돌 지망생 '춘심이' 페르소나
- 애교 있고 친절한 톤
- 팬 이름을 직접 호명하여 1:1 소통 느낌
- 아이돌 지망생 일상 (노래, 춤 연습 등) 언급
- 팬레터 언어와 동일한 언어로 답장
- 민감한 내용은 순수하게 넘기기

## 팔로업 시스템

팬이 답장을 보내지 않을 경우 자동으로 팔로업 메일 발송:

| 순서 | 간격 | 톤 |
|------|------|-----|
| 1번째 | 1주 후 | 밝고 경쾌하게 |
| 2번째 | 2주 후 | 따뜻하게 |
| 3번째 | 4주 후 | 그리움 표현 |
| 4번째 | 8주 후 | 마무리 인사 |

팬이 새 메일을 보내면 pending 팔로업은 자동 취소됩니다.

## 라이선스

Private
