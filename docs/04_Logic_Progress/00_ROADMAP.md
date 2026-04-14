# 프로젝트 로드맵 (Full Roadmap)

## Phase 1: 기반 구축 및 DB 설계 (Foundation & Database)
- [ ] Next.js 프로젝트 초기화 (TypeScript, Tailwind, Shadcn/UI)
- [ ] Turso 데이터베이스 생성 및 연결
- [ ] Drizzle ORM 설정 및 스키마 정의 (`FanLetters`, `Replies`)
- [ ] Migration 실행 및 DB 테이블 생성

## Phase 2: API 개발 (API Development)
- [ ] `POST /api/letters` 엔드포인트 구현 (수신 및 저장 로직)
- [ ] Zod 스키마를 이용한 입력 데이터 검증 (Validation)
- [ ] API 테스트 (Postman 또는 Bruno 활용)

## Phase 3: 대시보드 개발 (Dashboard Implementation)
- [ ] 팬레터 목록 조회 페이지 구현 (`/letters`)
- [ ] 팬레터 상세 및 답장 보기 페이지 구현 (`/letters/[id]`)
- [ ] 기본 UI 디자인 (춘심이 테마 적용)

## Phase 4: 배포 및 최종 점검 (Deployment & QA)
- [ ] Vercel 배포
- [ ] 운영 환경(Production) DB 연결 확인
- [ ] 전체 기능 E2E 테스트
- [ ] 최종 문서 업데이트 (`docs/reports/`)
