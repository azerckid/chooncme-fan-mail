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

// 분류 함수
export {
  classifyEmail,
  classifyEmails,
  filterFanLetters,
  partitionEmails,
  type ClassificationResult,
} from './classify';

// 아카이브 함수
export {
  archiveEmail,
  archiveEmails,
  isEmailArchived,
  getLetterIdByEmailId,
  type ArchiveResult,
  type ArchiveInput,
} from './archive';
