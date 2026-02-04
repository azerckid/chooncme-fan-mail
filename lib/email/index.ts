/**
 * 이메일 모듈 진입점
 */

// 타입
export {
  type EmailMessage,
  type FetchEmailsOptions,
  type FetchEmailsResult,
  type GmailAuthCredentials,
  type ParsedSender,
  parseSender,
} from './types';

// Gmail 클라이언트 및 수집 함수
export {
  createGmailClient,
  createGmailClientFromEnv,
  fetchEmails,
  fetchEmailById,
  fetchRecentEmails,
  fetchUnreadEmails,
  markAsRead,
  addLabel,
} from './fetch';
