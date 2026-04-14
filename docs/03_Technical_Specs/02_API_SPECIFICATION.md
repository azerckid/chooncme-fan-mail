# API 명세서 (API Specification)

## 1. 개요 (Overview)

본 문서는 춘심이 팬레터 아카이브 API를 호출하는 클라이언트(춘심AI 수집기, 대시보드, 외부 연동 시스템 등)를 위한 REST API 인터페이스 정의입니다. 요청 형식, 응답 형식, 에러 처리, 검증 규칙을 포함하여 구현 시 그대로 참고할 수 있도록 작성했습니다.

- **Base URL:** `https://{your-deployment-url}/api`
- **Content-Type:** 요청/응답 모두 `application/json`
- **문자 인코딩:** UTF-8

---

## 2. 인증 (Authentication)

### 2.1 필수 사항

모든 API 요청은 `Authorization` 헤더를 포함해야 합니다.

| 항목 | 값 |
|------|-----|
| Header 이름 | `Authorization` |
| 형식 | `Bearer {API_SECRET_KEY}` (공백 1칸, Bearer 뒤에 키) |
| API_SECRET_KEY | 서버 환경변수 `API_SECRET_KEY`에 설정된 값과 동일해야 함 |

### 2.2 인증 실패 시

- 헤더 누락, `Bearer ` 접두어 없음, 또는 키 불일치 시 **401 Unauthorized** 를 반환합니다.
- 응답 본문 형식은 아래 "5. 공통 에러 응답 형식"을 따릅니다.

---

## 3. 엔드포인트 (Endpoints)

### 3.1 팬레터 아카이브 저장 (POST /letters)

수집된 이메일 정보와 AI 분석 결과를 시스템에 저장합니다. 동일한 `emailId`로 재전송 시 409 Conflict가 반환됩니다.

| 항목 | 값 |
|------|-----|
| URL | `/letters` (전체 URL: `{Base URL}/letters`) |
| Method | `POST` |

#### 3.1.1 요청 (Request)

**필수 헤더**

| Header | 값 |
|--------|-----|
| `Authorization` | `Bearer {API_SECRET_KEY}` |
| `Content-Type` | `application/json` |

**요청 본문 (Request Body)**

JSON 객체. 필드별 타입·필수 여부·검증 규칙은 "4. 데이터 타입 및 검증 규칙"을 참고하세요.

```json
{
  "emailId": "unique-message-id-123",
  "senderName": "홍길동",
  "senderEmail": "gildong@example.com",
  "content": "춘심아 항상 응원하고 있어!",
  "subject": "팬레터 보냅니다",
  "receivedAt": "2026-02-01T15:00:00Z",
  "language": "ko",
  "country": "KR",
  "sentiment": "positive",
  "sentimentScore": 0.95,
  "topics": ["응원", "안부"]
}
```

#### 3.1.2 응답 (Response)

**성공 (201 Created)**

- 의미: 아카이브 저장 완료. `data.id`는 DB에 부여된 레터의 고유 ID(숫자)입니다.

```json
{
  "success": true,
  "data": {
    "id": 1,
    "message": "Successfully archived."
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| success | boolean | 항상 `true` |
| data.id | number | 저장된 팬레터의 DB ID (자동 증가 정수) |
| data.message | string | `"Successfully archived."` |

**실패 (401 Unauthorized)**

- 발생 조건: `Authorization` 헤더 누락, `Bearer ` 형식 아님, 또는 `API_SECRET_KEY` 불일치.

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing API secret key"
  }
}
```

**실패 (400 Bad Request)**

- 발생 조건: 필수 필드 누락, 타입 오류, 또는 검증 규칙 위반(길이·형식·enum 등). 서버는 Zod 검증을 사용하며, 실패 시 `error.details`에 필드별 오류가 포함됩니다.

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "senderEmail": { "_errors": ["Invalid email address"] },
      "sentimentScore": { "_errors": ["Number must be less than or equal to 1"] }
    }
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| success | boolean | 항상 `false` |
| error.code | string | `"VALIDATION_ERROR"` |
| error.message | string | `"Invalid input data"` |
| error.details | object | (선택) 필드 경로를 키로 하는 객체. 각 값은 `_errors` 배열 등을 가질 수 있음 (Zod `format()` 구조) |

**실패 (409 Conflict)**

- 발생 조건: 요청 본문의 `emailId`와 동일한 값이 이미 DB에 존재함. 중복 수집 방지를 위해 동일 이메일을 다시 보내지 말아야 합니다.

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_EMAIL_ID",
    "message": "This email has already been archived."
  }
}
```

**실패 (500 Internal Server Error)**

- 발생 조건: DB 연결 오류, 예기치 않은 서버 오류 등.

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred."
  }
}
```

#### 3.1.3 호출 예시 (cURL)

```bash
curl -X POST "https://{your-deployment-url}/api/letters" \
  -H "Authorization: Bearer YOUR_API_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "emailId": "unique-message-id-123",
    "senderName": "홍길동",
    "senderEmail": "gildong@example.com",
    "content": "춘심아 항상 응원하고 있어!",
    "subject": "팬레터 보냅니다",
    "receivedAt": "2026-02-01T15:00:00Z",
    "language": "ko",
    "country": "KR",
    "sentiment": "positive",
    "sentimentScore": 0.95,
    "topics": ["응원", "안부"]
  }'
```

---

### 3.2 팬레터 목록 조회 (GET /letters)

저장된 팬레터 목록을 페이지 단위로 조회합니다. 쿼리 파라미터로 검색·필터·페이지네이션을 적용할 수 있습니다.

| 항목 | 값 |
|------|-----|
| URL | `/letters` (전체 URL: `{Base URL}/letters`) |
| Method | `GET` |

#### 3.2.1 요청 (Request)

**필수 헤더**

- `Authorization: Bearer {API_SECRET_KEY}` (위와 동일)

**쿼리 파라미터 (Query Parameters)**

모든 파라미터는 선택(optional)입니다. 미지정 시 기본값이 적용됩니다.

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| page | number (정수) | 1 | 페이지 번호 (1부터 시작) |
| limit | number (정수) | 10 | 한 페이지당 항목 수 |
| search | string | - | 발신자 이름·이메일·본문(content)에 대한 부분 일치 검색 |
| language | string | - | 언어 코드 정확 일치 (예: `ko`, `en`) |
| country | string | - | 국가 코드 정확 일치 (예: `KR`, `US`) |
| sentiment | string | - | `positive` \| `neutral` \| `negative` 중 하나 |
| isRead | string | - | `true` \| `false` (문자열). 읽음 여부 필터 |
| isStarred | string | - | `true` \| `false` (문자열). 별표 여부 필터 |
| isReplied | string | - | `true` \| `false` (문자열). 답장 여부 필터. 미지정 시 전체 조회 |

**동작**

- `isReplied=false`: 답장하지 않은 팬레터만 반환 (`is_replied = false` 또는 `replied_at IS NULL`).
- `isReplied=true`: 답장한 팬레터만 반환.
- 파라미터 생략: 전체 목록 조회.

**예시 URL**

```
GET {Base URL}/letters?page=1&limit=10&language=ko&sentiment=positive
GET {Base URL}/letters?page=1&limit=10&isReplied=false
```

**DB 요구 사항**

- `fan_letters` 테이블에 답장 여부를 저장할 컬럼이 필요합니다: `is_replied` (boolean) 및/또는 `replied_at` (datetime, NULL이면 미답장).

#### 3.2.2 응답 (Response)

**성공 (200 OK)**

- 정렬: `receivedAt` 내림차순, 동일 시 `createdAt` 내림차순.

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "emailId": "unique-message-id-123",
        "subject": "팬레터 보냅니다",
        "senderName": "홍길동",
        "senderEmail": "gildong@example.com",
        "content": "춘심아 항상 응원하고 있어!",
        "language": "ko",
        "country": "KR",
        "sentiment": "positive",
        "sentimentScore": 0.95,
        "topics": ["응원", "안부"],
        "isRead": false,
        "isStarred": false,
        "isReplied": false,
        "repliedAt": null,
        "receivedAt": "2026-02-01T15:00:00Z",
        "createdAt": "2026-02-01T16:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalCount": 1,
      "totalPages": 1
    }
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| success | boolean | `true` |
| data.items | array | 팬레터 객체 배열. `topics`는 문자열 배열, `isReplied`/`repliedAt` 포함 |
| data.items[].isReplied | boolean | 해당 팬레터에 답장했는지 여부 |
| data.items[].repliedAt | string \| null | 답장 일시 (ISO 8601). 미답장이면 null |
| data.pagination.page | number | 현재 페이지 번호 |
| data.pagination.limit | number | 요청한 페이지 크기 |
| data.pagination.totalCount | number | 필터 조건에 맞는 전체 개수 |
| data.pagination.totalPages | number | 전체 페이지 수 (ceil(totalCount / limit)) |

**실패 (500 Internal Server Error)**

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Failed to fetch letters"
  }
}
```

#### 3.2.3 호출 예시 (cURL)

```bash
curl -X GET "https://{your-deployment-url}/api/letters?page=1&limit=10&language=ko" \
  -H "Authorization: Bearer YOUR_API_SECRET_KEY"
```

---

### 3.3 답장 발송 (POST /replies/send)

팬에게 이메일 답장을 보냅니다. 서버에서 Gmail(또는 설정된 메일)로 발송하고, DB에 답장 기록을 저장하며 해당 팬레터의 답장 여부를 업데이트합니다.

| 항목 | 값 |
|------|-----|
| URL | `/replies/send` (전체 URL: `{Base URL}/replies/send`) |
| Method | `POST` |

#### 3.3.1 요청 (Request)

**필수 헤더**

| Header | 값 |
|--------|-----|
| `Authorization` | `Bearer {API_SECRET_KEY}` |
| `Content-Type` | `application/json` |

**요청 본문 (Request Body)**

| Field | Type | Required | 검증 규칙 | 설명 |
|-------|------|----------|-----------|------|
| letterId | number (정수) | Yes | 양의 정수, DB에 존재하는 팬레터 ID | 답장 대상 팬레터의 id (GET /letters의 data.items[].id) |
| to | string | Yes | 유효한 이메일 형식 | 수신자 이메일 주소 (팬의 이메일) |
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

#### 3.3.2 응답 (Response)

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
| data.replyId | number | 저장된 답장 레코드 ID (replies 테이블) |

**실패 (401 Unauthorized)**

- 조건: 인증 헤더 누락 또는 API_SECRET_KEY 불일치. 형식은 "5. 공통 에러 응답 형식"과 동일.

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

- 조건: Gmail/메일 발송 오류, DB 오류, 메일 미설정 등.

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Failed to send reply."
  }
}
```

#### 3.3.3 서버 처리 순서 (구현 참고)

1. 요청 본문 검증 (Zod 등): letterId, to, subject, body.
2. Authorization 헤더 검증.
3. `letterId`로 fan_letters 조회; 없으면 404 LETTER_NOT_FOUND.
4. Gmail(또는 사용 중인 메일 API)로 이메일 발송 (From: 서버/춘심이 계정, To: `to`, Subject: `subject`, Body: `body`).
5. replies 테이블에 letter_id, content(body), email_sent=true, email_sent_at 저장.
6. fan_letters 해당 행의 is_replied = true, replied_at = now() 업데이트.
7. 201 응답 반환.

#### 3.3.4 Gmail API / 메일 발송 권한

- 이메일 **발송**을 위해 Gmail API 스코프에 **발송 권한**이 필요합니다.
  - 예: `https://www.googleapis.com/auth/gmail.send` 또는 `https://www.googleapis.com/auth/gmail.compose`
- Gmail SMTP(App Password) 또는 OAuth2 사용 시, 환경변수 예: `GMAIL_USER`, `GMAIL_APP_PASSWORD` 또는 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`.

#### 3.3.5 호출 예시 (cURL)

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

## 4. 데이터 타입 및 검증 규칙 (POST /letters 전용)

POST `/letters` 요청 본문의 각 필드는 아래 타입·필수 여부·검증 규칙을 따릅니다. 이를 위반하면 **400 Bad Request**와 `VALIDATION_ERROR`가 반환됩니다.

| Field | Type | Required | 검증 규칙 | 설명 |
|-------|------|----------|-----------|------|
| emailId | string | Yes | 최소 1자 (공백만 있으면 안 됨) | 중복 방지를 위한 고유 이메일 ID |
| senderName | string | Yes | 최소 1자, 최대 100자 | 발신자 이름 |
| senderEmail | string | Yes | 유효한 이메일 형식 | 발신자 이메일 주소 |
| content | string | Yes | 최소 1자 (공백만 있으면 안 됨) | 팬레터 원문 |
| subject | string | No | - | 이메일 제목 |
| receivedAt | string | No | ISO 8601 datetime (예: `2026-02-01T15:00:00Z`) | 이메일 수신 일시 |
| language | string | No | 정확히 2자 (예: `ko`, `en`) | 언어 코드 (ISO 639-1) |
| country | string | No | 정확히 2자 (예: `KR`, `US`) | 국가 코드 (ISO 3166-1 alpha-2) |
| sentiment | string | No | `positive` \| `neutral` \| `negative` 중 하나 | 감정 분석 결과 |
| sentimentScore | number | No | 0 이상 1 이하 (실수) | 감정 점수 |
| topics | string[] | No | 문자열 배열 (원소는 문자열) | 분석된 키워드/주제 목록 |

**참고**

- 선택 필드를 보내지 않아도 됩니다. 보낼 경우에만 위 규칙이 적용됩니다.
- `receivedAt`은 시간대 포함 ISO 8601 형식이어야 하며, `Z`(UTC) 또는 `+09:00` 등 오프셋을 포함할 수 있습니다.
- `language`, `country`는 길이 2로 제한됩니다 (대소문자 구분).

---

## 5. 공통 에러 응답 형식

에러 시 응답 본문은 아래 구조를 따릅니다. 클라이언트는 `success === false`일 때 `error.code`로 분기 처리하는 것을 권장합니다.

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human-readable message",
    "details": { }
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| success | boolean | 항상 `false` |
| error | object | 에러 정보 |
| error.code | string | 에러 종류 (예: `UNAUTHORIZED`, `VALIDATION_ERROR`, `DUPLICATE_EMAIL_ID`, `INTERNAL_SERVER_ERROR`) |
| error.message | string | 사용자/로그용 메시지 |
| error.details | object | (선택) 400 검증 오류 시 필드별 상세. 그 외에는 없을 수 있음 |

**에러 코드 정리**

| code | HTTP Status | 의미 |
|------|-------------|------|
| UNAUTHORIZED | 401 | 인증 실패 (헤더 누락 또는 키 불일치) |
| VALIDATION_ERROR | 400 | 요청 본문 검증 실패 (필드 누락/형식/범위 위반) |
| DUPLICATE_EMAIL_ID | 409 | 동일 emailId로 이미 아카이브됨 (POST /letters 전용) |
| LETTER_NOT_FOUND | 404 | 해당 letterId의 팬레터가 없음 (POST /replies/send 전용) |
| INTERNAL_SERVER_ERROR | 500 | 서버 내부 오류 |

---

## 6. 문서 이력

- 명세 확장: API 사용처 기준 요청/응답/에러 본문·검증 규칙·GET 목록 조회·호출 예시 추가.
- 미답장 조회: GET /letters에 isReplied 쿼리 파라미터 및 응답 필드 isReplied, repliedAt 추가. DB is_replied/replied_at 명시.
- 답장 발송: POST /replies/send 명세 추가 (요청/응답/처리 순서/Gmail 권한/cURL). 공통 에러 코드 LETTER_NOT_FOUND(404) 추가.
