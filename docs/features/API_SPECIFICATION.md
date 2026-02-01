# API 명세서 (API Specification)

## 1. 개요 (Overview)
본 문서는 외부 AI 시스템(또는 클라이언트)이 춘심이 팬레터 아카이브 시스템에 데이터를 전송할 때 사용하는 REST API 인터페이스를 정의합니다.

- **Base URL:** `https://{your-deployment-url}/api`
- **Content-Type:** `application/json`

## 2. 인증 (Authentication)
(선택 사항) 운영 환경에서는 헤더에 API Key를 포함하여 보안을 강화할 것을 권장합니다.
- Header: `x-api-key: {YOUR_API_SECRET_KEY}`

## 3. 엔드포인트 (Endpoints)

### 3.1 팬레터 및 답장 수신 (Ingest Letter & Reply)
팬이 보낸 팬레터와 이에 대해 생성된 AI 답장을 동시에 저장합니다.

- **URL:** `/letters`
- **Method:** `POST`

#### 요청 본문 (Request Body)
```json
{
  "letter": {
    "content": "춘심아 안녕? 오늘 날씨가 참 좋다. 산책은 다녀왔니?",
    "senderNickname": "지나가는나그네",
    "senderContact": "user@example.com" // 선택 사항
  },
  "reply": {
    "content": "아이고~ 나그네님! 날씨 좋다고 산책이라니, 내 관절 걱정은 안 해줌? 농담이고, 마당 한 바퀴 돌고 왔슈!",
    "sentimentScore": 0.85, // 0.0 ~ 1.0 (긍정/부정) - 선택 사항
    "modelVersion": "gemini-1.5-pro" // 선택 사항
  }
}
```

#### 응답 (Response)

**성공 (200 OK)**
```json
{
  "success": true,
  "data": {
    "letterId": "uuid-string",
    "replyId": "uuid-string",
    "message": "Successfully archived."
  }
}
```

**실패 (400 Bad Request)**
- 필수 필드 누락 시
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [ ...ZodError... ]
  }
}
```

**실패 (500 Internal Server Error)**
- DB 연결 오류 등 서버 문제

## 4. 데이터 타입 상세 (Data Types)

### Letter Input
| Field | Type | Required | Description |
|---|---|---|---|
| content | string | Yes | 팬레터 원문 (최소 1자, 최대 5000자) |
| senderNickname | string | Yes | 보낸 사람 닉네임 (최대 50자) |
| senderContact | string | No | 이메일 등 연락처 정보 |

### Reply Input
| Field | Type | Required | Description |
|---|---|---|---|
| content | string | Yes | AI가 생성한 답장 내용 |
| sentimentScore | number | No | 감정 분석 결과 (0~1 사이 실수) |
| modelVersion | string | No | 사용된 모델 정보 |
