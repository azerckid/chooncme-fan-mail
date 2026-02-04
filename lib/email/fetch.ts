/**
 * Gmail API를 사용한 이메일 수집
 */

import { google, gmail_v1 } from 'googleapis';
import {
  EmailMessage,
  FetchEmailsOptions,
  FetchEmailsResult,
  GmailAuthCredentials,
  parseSender,
} from './types';

/**
 * Gmail 클라이언트 생성
 */
export function createGmailClient(credentials: GmailAuthCredentials): gmail_v1.Gmail {
  const oauth2Client = new google.auth.OAuth2(
    credentials.clientId,
    credentials.clientSecret
  );

  oauth2Client.setCredentials({
    refresh_token: credentials.refreshToken,
    access_token: credentials.accessToken,
  });

  // 토큰 자동 갱신 이벤트 리스너
  oauth2Client.on('tokens', (tokens) => {
    if (tokens.access_token) {
      console.log('[Gmail] Access token refreshed');
    }
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

/**
 * 환경변수에서 Gmail 클라이언트 생성
 */
export function createGmailClientFromEnv(): gmail_v1.Gmail {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Gmail credentials not found. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN'
    );
  }

  return createGmailClient({
    clientId,
    clientSecret,
    refreshToken,
  });
}

/**
 * 이메일 목록 조회
 */
export async function fetchEmails(
  gmail: gmail_v1.Gmail,
  options: FetchEmailsOptions = {}
): Promise<FetchEmailsResult> {
  const { maxResults = 50, after, query, labelIds = ['INBOX'] } = options;

  // 검색 쿼리 구성
  let q = query || '';
  if (after) {
    const afterTimestamp = Math.floor(after.getTime() / 1000);
    q += ` after:${afterTimestamp}`;
  }

  // 메시지 목록 조회
  const listResponse = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    labelIds,
    q: q.trim() || undefined,
  });

  const messages = listResponse.data.messages || [];
  const emails: EmailMessage[] = [];

  // 각 메시지 상세 조회
  for (const msg of messages) {
    if (!msg.id) continue;

    try {
      const email = await fetchEmailById(gmail, msg.id);
      if (email) {
        emails.push(email);
      }
    } catch (error) {
      console.error(`[Gmail] Failed to fetch message ${msg.id}:`, error);
    }
  }

  return {
    emails,
    nextPageToken: listResponse.data.nextPageToken || undefined,
    processedCount: emails.length,
  };
}

/**
 * 단일 이메일 상세 조회
 */
export async function fetchEmailById(
  gmail: gmail_v1.Gmail,
  messageId: string
): Promise<EmailMessage | null> {
  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  const message = response.data;
  if (!message.id || !message.threadId) {
    return null;
  }

  const headers = message.payload?.headers || [];
  const getHeader = (name: string): string => {
    const header = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase());
    return header?.value || '';
  };

  const from = getHeader('From');
  const { email: fromEmail, name: fromName } = parseSender(from);

  // 본문 추출
  const { plain, html } = extractBody(message.payload);

  // 날짜 파싱
  const dateHeader = getHeader('Date');
  const receivedAt = dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString();

  // 읽음 여부
  const labelIds = message.labelIds || [];
  const isRead = !labelIds.includes('UNREAD');

  return {
    id: message.id,
    threadId: message.threadId,
    from,
    fromEmail,
    fromName,
    to: getHeader('To'),
    subject: getHeader('Subject'),
    bodyPlain: plain,
    bodyHtml: html || undefined,
    receivedAt,
    labelIds,
    isRead,
  };
}

/**
 * 메시지 페이로드에서 본문 추출
 */
function extractBody(payload?: gmail_v1.Schema$MessagePart): { plain: string; html: string } {
  let plain = '';
  let html = '';

  if (!payload) {
    return { plain, html };
  }

  // 단일 파트인 경우
  if (payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);
    if (payload.mimeType === 'text/plain') {
      plain = decoded;
    } else if (payload.mimeType === 'text/html') {
      html = decoded;
    }
  }

  // 멀티파트인 경우 재귀 탐색
  if (payload.parts) {
    for (const part of payload.parts) {
      const partResult = extractBody(part);
      if (partResult.plain && !plain) plain = partResult.plain;
      if (partResult.html && !html) html = partResult.html;
    }
  }

  // HTML만 있고 plain text가 없으면 HTML에서 텍스트 추출
  if (!plain && html) {
    plain = stripHtml(html);
  }

  return { plain, html };
}

/**
 * Base64 URL-safe 디코딩
 */
function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * HTML에서 텍스트만 추출 (간단한 버전)
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 최근 N시간 이내 메일 조회 (편의 함수)
 */
export async function fetchRecentEmails(
  gmail: gmail_v1.Gmail,
  hoursAgo = 1,
  maxResults = 50
): Promise<FetchEmailsResult> {
  const after = new Date();
  after.setHours(after.getHours() - hoursAgo);

  return fetchEmails(gmail, {
    after,
    maxResults,
  });
}

/**
 * 읽지 않은 메일만 조회 (편의 함수)
 */
export async function fetchUnreadEmails(
  gmail: gmail_v1.Gmail,
  maxResults = 50
): Promise<FetchEmailsResult> {
  return fetchEmails(gmail, {
    query: 'is:unread',
    maxResults,
  });
}

/**
 * 메일을 읽음으로 표시
 */
export async function markAsRead(gmail: gmail_v1.Gmail, messageId: string): Promise<void> {
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      removeLabelIds: ['UNREAD'],
    },
  });
}

/**
 * 메일에 라벨 추가
 */
export async function addLabel(
  gmail: gmail_v1.Gmail,
  messageId: string,
  labelId: string
): Promise<void> {
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      addLabelIds: [labelId],
    },
  });
}
