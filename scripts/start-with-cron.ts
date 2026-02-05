/**
 * PM2 진입점: 이메일 자동 처리 워커
 *
 * 사용법:
 *   npx tsx scripts/start-with-cron.ts
 *
 * PM2로 실행:
 *   pm2 start "npx tsx scripts/start-with-cron.ts" --name "email-worker"
 *
 * 또는 빌드 후:
 *   npx tsc scripts/start-with-cron.ts --outDir dist
 *   pm2 start dist/scripts/start-with-cron.js --name "email-worker"
 */

import dotenv from 'dotenv';
import path from 'path';
import { startScheduler, runNow, stopScheduler } from '../lib/scheduler/cron';

// Next/다른 스크립트와 동일하게 .env.local 우선 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config(); // .env 폴백

// 환경변수 검증
function validateEnv(): void {
  const required = [
    'DATABASE_URL',
    'GOOGLE_GEMINI_API_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REFRESH_TOKEN',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('[Worker] Missing required environment variables:', missing.join(', '));
    process.exit(1);
  }

  // 메일 발송 설정 확인
  const hasMailConfig =
    process.env.GMAIL_APP_PASSWORD ||
    (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN);

  if (!hasMailConfig) {
    console.warn('[Worker] Warning: Email sending may not be configured properly');
  }

  console.log('[Worker] Environment validation passed');
}

// 시그널 핸들러 (graceful shutdown)
function setupSignalHandlers(): void {
  const shutdown = (signal: string) => {
    console.log(`[Worker] Received ${signal}, shutting down...`);
    stopScheduler();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// 메인 실행
async function main(): Promise<void> {
  console.log('===========================================');
  console.log('  Email Auto-Processing Worker');
  console.log('  Started at:', new Date().toISOString());
  console.log('===========================================');

  // 환경 검증
  validateEnv();

  // 시그널 핸들러 설정
  setupSignalHandlers();

  // 드라이런 모드 확인
  if (process.env.EMAIL_DRY_RUN === 'true') {
    console.log('[Worker] DRY-RUN MODE: Emails will not be actually sent');
  }

  // cron 표현식 (환경변수 또는 기본값)
  const cronExpression = process.env.CRON_EXPRESSION || '0 * * * *';
  console.log(`[Worker] Cron expression: ${cronExpression}`);

  // 시작 시 즉시 한 번 실행 옵션
  const runImmediately = process.env.RUN_ON_START === 'true' || process.argv.includes('--run-now');

  if (runImmediately) {
    console.log('[Worker] Running immediately on start...');
    await runNow({ verbose: true });
  }

  // 스케줄러 시작
  startScheduler(cronExpression, { verbose: true });

  console.log('[Worker] Worker is now running. Press Ctrl+C to stop.');
}

main().catch((error) => {
  console.error('[Worker] Fatal error:', error);
  process.exit(1);
});
