# 데이터베이스 스키마 설계 (Database Schema Design)

## Overview
Drizzle ORM을 사용하여 정의될 예상 스키마 구조입니다.

## 1. Users (Optional - for Admin access)
관리자 접근 제어가 필요할 경우 사용. 초기 단계에서는 생략 가능하거나 단일 계정 사용.

## 2. FanLetters (팬레터 테이블)
팬이 보낸 편지 정보를 저장합니다.

| Column Name | Type | Description |
|---|---|---|
| id | TEXT (UUID) | Primary Key |
| content | TEXT | 팬레터 본문 |
| sender_nickname | TEXT | 보낸 사람 닉네임 |
| sender_contact | TEXT | (Optional) 이메일 또는 연락처 |
| received_at | INTEGER (Timestamp) | 시스템 수신 시각 |
| created_at | INTEGER (Timestamp) | 레코드 생성 시각 |

## 3. Replies (답장 테이블)
춘심이(AI)가 작성한 답장 정보를 저장합니다.

| Column Name | Type | Description |
|---|---|---|
| id | TEXT (UUID) | Primary Key |
| letter_id | TEXT (UUID) | Foreign Key -> FanLetters.id |
| content | TEXT | 답장 본문 |
| sentiment_score | REAL | (Optional) 감정 분석 점수 |
| model_version | TEXT | (Optional) 사용된 AI 모델 버전 |
| replied_at | INTEGER (Timestamp) | 답장 생성 시각 |
| created_at | INTEGER (Timestamp) | 레코드 생성 시각 |

## 4. FollowUps (팔로업 테이블)
답장 발송 후 응답이 없는 팬에게 자동 발송되는 팔로업 스케줄을 관리합니다.

| Column Name | Type | Description |
|---|---|---|
| id | INTEGER | Primary Key (Auto Increment) |
| reply_id | INTEGER | Foreign Key -> Replies.id |
| sender_email | TEXT | 팬 이메일 (비정규화) |
| follow_up_count | INTEGER | 발송된 팔로업 횟수 (0=대기중) |
| next_follow_up_at | TEXT (ISO8601) | 다음 팔로업 예정일 |
| status | TEXT | 상태: pending, completed, cancelled |
| last_sent_at | TEXT (ISO8601) | 마지막 팔로업 발송일 |
| cancel_reason | TEXT | 취소 사유 (fan_replied, new_email_received 등) |
| created_at | TEXT (ISO8601) | 레코드 생성 시각 |
| updated_at | TEXT (ISO8601) | 레코드 수정 시각 |

### 팔로업 간격
- 1번째: 1주 후 (7일)
- 2번째: 2주 후 (14일)
- 3번째: 4주 후 (28일)
- 4번째: 8주 후 (56일) - 마지막

## Relationships
- **FanLetters** : **Replies** = 1 : N (일반적으로 1:1이겠지만, 재답장 가능성을 열어둠)
- **Replies** : **FollowUps** = 1 : 1 (각 답장에 대해 하나의 팔로업 스케줄)

## Indexes
- `replies.letter_id` : 빠른 조회를 위한 인덱스
- `fan_letters.received_at` : 최신순 정렬을 위한 인덱스
- `fan_letters.sender_email` : 발신자별 조회
- `fan_letters.is_replied` : 답장 상태 필터링
- `follow_ups.sender_email` : 발신자별 팔로업 조회
- `follow_ups.status` : 상태별 필터링
- `follow_ups.next_follow_up_at` : due 팔로업 조회
