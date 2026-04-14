# API 명세 추가: 미답장 조회 필터 및 답장 발송

본 문서는 기존 춘심이 팬레터 아카이브 API 명세에 **추가한** 두 가지(미답장 조회 필터, 답장 발송 API)를 정의합니다.  
chooncme-fan-letter 프로젝트에서 구현 시 기존 명세(인증, 에러 형식, Base URL 등)와 동일한 규칙을 따릅니다.

## 구현 상태 (Implementation Status)

**구현 완료.** 상세 API 스펙·요청/응답·에러 코드·cURL 예시는 **`docs/03_Technical_Specs/02_API_SPECIFICATION.md`** 를 참고하세요.

| 항목 | 구현 내용 | 위치 |
|------|-----------|------|
| GET /letters 확장 | 쿼리 파라미터 `isReplied`, 응답 필드 `isReplied`, `repliedAt` | `app/api/letters/route.ts` |
| DB 답장 여부 | `fan_letters.is_replied`, `fan_letters.replied_at` 컬럼 추가 | `db/schema.ts`, `drizzle/0001_fan_letters_replied.sql` |
| POST /replies/send | 요청 검증(Zod), letter 조회, 메일 발송(nodemailer), replies 저장, fan_letters 갱신 | `app/api/replies/send/route.ts`, `lib/validations/sendReply.ts`, `lib/mail.ts` |
| 공통 에러 | LETTER_NOT_FOUND (404) | `docs/03_Technical_Specs/02_API_SPECIFICATION.md` 섹션 5 |

메일 발송은 nodemailer 사용. 환경변수: `GMAIL_USER`, `GMAIL_APP_PASSWORD` 또는 OAuth2 (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`).

**데이터베이스 반영:** 스키마/마이그레이션 파일만으로는 실제 DB가 바뀌지 않습니다. `fan_letters`에 `is_replied`, `replied_at` 컬럼을 넣으려면 마이그레이션을 실행해야 합니다. `.env.local`에 `DATABASE_URL`, `DATABASE_AUTH_TOKEN` 설정 후 프로젝트 루트에서 `npm run db:migrate`(또는 `npx drizzle-kit migrate`)를 실행하세요. 적용 대상: `drizzle/0001_fan_letters_replied.sql`.

---

## 1. 미답장 조회 필터 (GET /letters 확장)

### 1.1 목적

- 저장된 팬레터 중 **아직 답장하지 않은** 메일만 조회할 수 있도록 GET /letters에 쿼리 파라미터를 추가합니다.
- 춘심이(또는 클라이언트)가 `GET /api/letters?isReplied=false` 로 호출하면 미답장 팬레터만 받을 수 있습니다.

### 1.2 GET /letters 쿼리 파라미터 추가

기존 3.2.1 쿼리 파라미터 테이블에 아래 한 행을 **추가**합니다.

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| isReplied | string | - | `true` \| `false` (문자열). 답장 여부 필터. 미지정 시 전체 조회 |

**동작**

- `isReplied=false`: 답장하지 않은 팬레터만 반환 (예: `is_replied = false` 또는 `replied_at IS NULL` 인 행만).
- `isReplied=true`: 답장한 팬레터만 반환.
- 파라미터 생략: 기존과 동일하게 전체 목록 조회.

**예시 URL**

```
GET {Base URL}/letters?page=1&limit=10&isReplied=false
```

### 1.3 응답 데이터에 포함할 필드

GET /letters 응답의 각 item에 **답장 여부**를 나타내는 필드가 있으면 클라이언트에서 활용하기 좋습니다. 기존 응답 스키마에 아래를 추가하는 것을 권장합니다.

| 필드 | 타입 | 설명 |
|------|------|------|
| isReplied | boolean | 해당 팬레터에 답장했는지 여부 |
| repliedAt | string (optional) | 답장 일시 (ISO 8601). 미답장이면 null 또는 생략 |

(이미 `is_replied`, `replied_at` 등으로 DB에 저장하고 있다면, 응답 시 위 이름으로 매핑하면 됩니다.)

### 1.4 DB/스키마 요구 사항

- `fan_letters` 테이블(또는 동일 역할 테이블)에 **답장 여부**를 저장할 컬럼이 필요합니다.
  - 예: `is_replied` (boolean) 또는 `replied_at` (datetime, NULL이면 미답장).
- GET /letters 목록 조회 시 `isReplied` 쿼리 파라미터에 따라 해당 컬럼으로 필터링합니다.

---

## 2. 답장 발송 API (POST /replies/send)

### 2.1 목적

- 춘심이(또는 클라이언트)가 **팬에게 이메일 답장**을 보낼 수 있도록 전용 엔드포인트를 제공합니다.
- 서버에서 Gmail API(또는 사용 중인 메일 발송 수단)를 호출해 실제 이메일을 발송하고, DB에 답장 기록을 저장 및 해당 팬레터의 답장 여부를 업데이트합니다.

### 2.2 엔드포인트 개요

| 항목 | 값 |
|------|-----|
| URL | `/replies/send` (전체 URL: `{Base URL}/replies/send`) |
| Method | `POST` |

### 2.3 요청 (Request)

**필수 헤더**

| Header | 값 |
|--------|-----|
| `Authorization` | `Bearer {API_SECRET_KEY}` |
| `Content-Type` | `application/json` |

**요청 본문 (Request Body)**

JSON 객체. 필드는 아래와 같습니다.

| Field | Type | Required | 검증 규칙 | 설명 |
|-------|------|----------|-----------|------|
| letterId | number (정수) | Yes | DB에 존재하는 팬레터 ID | 답장 대상 팬레터의 id (GET /letters의 data.items[].id) |
| to | string | Yes | 유효한 이메일 형식 | 수신자 이메일 주소 (팬의 이메일, 예: fan_letters.sender_email) |
| subject | string | Yes | 최소 1자, 최대 200자 | 답장 메일 제목 |
| body | string | Yes | 최소 1자 | 답장 메일 본문 (plain text 또는 HTML은 서버 정책에 따름) |

**요청 예시**

```json
{
  "letterId": 1,
  "to": "gildong@example.com",
  "subject": "Re: 팬레터 보냅니다 - 춘심이",
  "body": "홍길동님, 소중한 팬레터 감사해요!\n\n춘심이도 항상 응원해 주셔서 힘이 나요..."
}
```

### 2.4 응답 (Response)

**성공 (201 Created)**

- 의미: 답장 메일 발송 완료 및 DB 반영 완료.

```json
{
  "success": true,
  "data": {
    "message": "Reply sent successfully.",
    "replyId": 1
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| success | boolean | 항상 `true` |
| data.message | string | `"Reply sent successfully."` |
| data.replyId | number (optional) | 저장된 답장 레코드의 ID (replies 테이블 등) |

**실패 (401 Unauthorized)**

- 조건: 인증 헤더 누락 또는 API_SECRET_KEY 불일치. 형식은 기존 명세 "5. 공통 에러 응답 형식"과 동일.

**실패 (400 Bad Request)**

- 조건: 필수 필드 누락, 타입 오류, 이메일 형식 오류 등.

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": { }
  }
}
```

**실패 (404 Not Found)**

- 조건: `letterId`에 해당하는 팬레터가 DB에 없음.

```json
{
  "success": false,
  "error": {
    "code": "LETTER_NOT_FOUND",
    "message": "Letter not found."
  }
}
```

**실패 (500 Internal Server Error)**

- 조건: Gmail API 오류, DB 오류, 메일 발송 실패 등.

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Failed to send reply."
  }
}
```

### 2.5 서버 측 처리 순서 (구현 참고)

1. 요청 본문 검증 (Zod 등): letterId, to, subject, body.
2. Authorization 헤더 검증.
3. `letterId`로 fan_letters 조회; 없으면 404.
4. Gmail API(또는 사용 중인 메일 API)로 이메일 발송 (From: 서버/춘심이 계정, To: `to`, Subject: `subject`, Body: `body`).
5. 답장 기록 저장: replies 테이블에 letter_id, body, sent_at 등 저장.
6. fan_letters 해당 행의 is_replied = true (또는 replied_at = now()) 업데이트.
7. 201 응답 반환.

### 2.6 Gmail API 권한

- 이메일 **발송**을 위해 Gmail API 스코프에 **발송 권한**이 필요합니다.
  - 예: `https://www.googleapis.com/auth/gmail.send` 또는 `https://www.googleapis.com/auth/gmail.compose`
- 현재 gmail.readonly만 사용 중이라면, 스코프 추가 후 OAuth 토큰을 다시 발급해야 합니다.

### 2.7 호출 예시 (cURL)

```bash
curl -X POST "https://{your-deployment-url}/api/replies/send" \
  -H "Authorization: Bearer YOUR_API_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "letterId": 1,
    "to": "gildong@example.com",
    "subject": "Re: 팬레터 보냅니다 - 춘심이",
    "body": "홍길동님, 소중한 팬레터 감사해요!"
  }'
```

---

## 3. 에러 코드 추가 (공통 섹션 확장)

기존 "5. 공통 에러 응답 형식"의 에러 코드 테이블에 아래를 추가합니다.

| code | HTTP Status | 의미 |
|------|-------------|------|
| LETTER_NOT_FOUND | 404 | 해당 letterId의 팬레터가 없음 (POST /replies/send 전용) |

---

## 4. 문서 이력

- 최초 작성: 미답장 조회 필터(isReplied), 답장 발송 API(POST /replies/send) 명세 추가.
- 구현 반영: 위 명세대로 코드 및 02_API_SPECIFICATION.md 반영 완료. 본 문서에 구현 상태 섹션 및 구현 위치 표 추가.
