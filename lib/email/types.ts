/**
 * 이메일 관련 타입 정의
 */

/**
 * 수신된 이메일 메시지
 */
export interface EmailMessage {
  /** Gmail 메시지 고유 ID */
  id: string;
  /** 스레드 ID */
  threadId: string;
  /** 발신자 (예: "홍길동 <hong@example.com>") */
  from: string;
  /** 발신자 이메일만 추출 */
  fromEmail: string;
  /** 발신자 이름만 추출 (없으면 이메일 앞부분) */
  fromName: string;
  /** 수신자 */
  to: string;
  /** 메일 제목 */
  subject: string;
  /** 본문 (plain text) */
  bodyPlain: string;
  /** 본문 (HTML, 있는 경우) */
  bodyHtml?: string;
  /** 수신 일시 (ISO8601) */
  receivedAt: string;
  /** Gmail 라벨 ID 목록 */
  labelIds?: string[];
  /** 읽음 여부 */
  isRead: boolean;
}

/**
 * 이메일 수집 옵션
 */
export interface FetchEmailsOptions {
  /** 최대 가져올 메일 수 (기본: 50) */
  maxResults?: number;
  /** 이 시간(Date) 이후의 메일만 가져오기 */
  after?: Date;
  /** Gmail 검색 쿼리 (예: "is:unread") */
  query?: string;
  /** 특정 라벨만 가져오기 (기본: INBOX) */
  labelIds?: string[];
}

/**
 * Gmail OAuth2 인증 정보
 */
export interface GmailAuthCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessToken?: string;
}

/**
 * 이메일 수집 결과
 */
export interface FetchEmailsResult {
  /** 수집된 메일 목록 */
  emails: EmailMessage[];
  /** 다음 페이지 토큰 (페이지네이션 시 사용) */
  nextPageToken?: string;
  /** 처리된 메일 수 */
  processedCount: number;
}

/**
 * 이메일 발신자 정보 파싱 결과
 */
export interface ParsedSender {
  email: string;
  name: string;
}

/**
 * 발신자 문자열에서 이메일과 이름 추출
 * 예: "홍길동 <hong@example.com>" -> { name: "홍길동", email: "hong@example.com" }
 */
export function parseSender(from: string): ParsedSender {
  // "이름 <이메일>" 형식
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return {
      name: match[1].trim().replace(/^["']|["']$/g, ''),
      email: match[2].trim(),
    };
  }

  // 이메일만 있는 경우
  const emailOnly = from.match(/<?([^\s<>]+@[^\s<>]+)>?/);
  if (emailOnly) {
    const email = emailOnly[1];
    const name = email.split('@')[0];
    return { name, email };
  }

  // 파싱 실패 시 원본 반환
  return { name: from, email: from };
}
