/**
 * Gmail OAuth2 refresh token 발급 스크립트
 *
 * 사용 전:
 * 1. .env.local에 GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET 설정
 * 2. Google Cloud Console > API 및 서비스 > 사용자 인증 정보 >
 *    사용 중인 데스크톱 클라이언트 선택 > "승인된 리디렉션 URI"에
 *    http://localhost:3456/callback 추가 후 저장
 *    (redirect_uri_mismatch 오류 시 이 단계 필수)
 *
 * 실행:
 *   npx tsx scripts/get-gmail-refresh-token.ts
 *
 * 브라우저가 열리면 Google 로그인 후 Gmail 권한 허용.
 * scope: 읽기, 수정, 발송(gmail.send) 포함. 수집+발송 모두 이 토큰으로 가능.
 * 터미널에 출력된 refresh_token을 .env.local의 GOOGLE_REFRESH_TOKEN에 넣고 저장.
 * 적용 후: pm2 restart email-worker
 */

import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { exec } from 'child_process';
import { google } from 'googleapis';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const REDIRECT_PORT = 3456;
const REDIRECT_PATH = '/callback';
const SCOPES = [
  'https://mail.google.com/', // SMTP 발송에 필요. 읽기/수정/발송 포함
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
];

function openBrowser(url: string): void {
  const op = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${op} "${url}"`, () => {});
}

async function main(): Promise<void> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET이 .env.local에 있어야 합니다.');
    process.exit(1);
  }

  const redirectUri = `http://localhost:${REDIRECT_PORT}${REDIRECT_PATH}`;
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });

  const server = http.createServer(async (req, res) => {
    if (!req.url?.startsWith(REDIRECT_PATH)) {
      res.writeHead(404).end();
      return;
    }
    const u = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
    const code = u.searchParams.get('code');
    if (!code) {
      res.writeHead(400);
      res.end('?code= 가 없습니다. 브라우저에서 다시 시도하세요.');
      return;
    }
    try {
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      const refreshToken = tokens.refresh_token;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(
        '<!DOCTYPE html><html><body><p>인증 완료. 이 창을 닫고 터미널에서 refresh_token을 확인하세요.</p></body></html>'
      );
      if (refreshToken) {
        console.log('\n=== GOOGLE_REFRESH_TOKEN (아래 값을 .env.local에 넣으세요) ===\n');
        console.log(refreshToken);
        console.log('\n========================================\n');
      } else {
        console.log('이미 발급된 refresh_token이 있어 새로 발급되지 않았을 수 있습니다. 기존 토큰이 만료되었다면 Google 계정에서 앱 접근 권한을 해제한 뒤 다시 실행하세요.');
      }
    } catch (e) {
      console.error('토큰 교환 실패:', e);
      res.writeHead(500);
      res.end('토큰 교환 실패. 터미널 로그를 확인하세요.');
    } finally {
      server.close();
    }
  });

  server.listen(REDIRECT_PORT, () => {
    console.log(`리디렉션 수신: http://localhost:${REDIRECT_PORT}${REDIRECT_PATH}`);
    console.log('브라우저에서 Google 로그인 후 권한을 허용하세요.\n');
    openBrowser(authUrl);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
