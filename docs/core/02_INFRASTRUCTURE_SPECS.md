# 2. 인프라 및 아키텍처 명세 (Infrastructure & Architecture Specifications)

## 기술 스택 (Tech Stack)
### Core
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Runtime:** Node.js (LTS)

### Styling & UI
- **CSS Framework:** Tailwind CSS
- **Component Library:** Shadcn/UI (Radix UI based)
- **Icons:** Lucide React

### Database & Data
- **Database:** Turso (libSQL) - Serverless SQLite
- **ORM:** Drizzle ORM - Type-safe, lightweight
- **Validation:** Zod - Runtime schema validation

### DevOps & Tools
- **Package Manager:** npm or pnpm
- **Version Control:** Git

## 시스템 아키텍처 (System Architecture)
1. **API Layer (Next.js Route Handlers):**
   - 외부 AI 서비스로부터 데이터를 수신하는 REST API 제공.
   - 데이터 유효성 검사 (Zod) 및 DB 저장 처리.
2. **Database Layer (Turso):**
   - 엣지 호환 가능한 SQLite DB.
   - 팬레터와 답장 데이터를 관계형으로 저장.
3. **Dashboard Layer (React Server Components):**
   - 저장된 데이터를 조회하는 관리자 인터페이스.
   - 서버 사이드 렌더링(SSR)을 통한 빠른 데이터 로딩.

## 환경 변수 (Environment Variables)
- `DATABASE_URL`: Turso 데이터베이스 연결 URL
- `DATABASE_AUTH_TOKEN`: Turso 인증 토큰
- `API_SECRET_KEY`: 외부 서비스 통신 보안을 위한 인증 키 (Optional but recommended)
