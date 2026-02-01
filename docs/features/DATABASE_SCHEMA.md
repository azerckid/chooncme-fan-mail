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

## Relationships
- **FanLetters** : **Replies** = 1 : N (일반적으로 1:1이겠지만, 재답장 가능성을 열어둠)

## Indexes
- `replies.letter_id` : 빠른 조회를 위한 인덱스
- `fan_letters.received_at` : 최신순 정렬을 위한 인덱스
