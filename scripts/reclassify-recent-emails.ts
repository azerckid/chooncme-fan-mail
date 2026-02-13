/**
 * 최근 수신 메일을 다시 분류 (일반으로 잘못 분류된 팬메일 확인용)
 * npx tsx scripts/reclassify-recent-emails.ts
 * 옵션: 환경변수 EMAIL_HOURS_AGO 또는 기본 3시간
 */

import dotenv from 'dotenv';
import path from 'path';
import { createGmailClientFromEnv, fetchRecentEmails, classifyEmail, type ClassificationResult } from '../lib/email';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const HOURS_AGO = process.env.EMAIL_HOURS_AGO ? parseInt(process.env.EMAIL_HOURS_AGO, 10) : 3;
const SAFE_HOURS = Number.isFinite(HOURS_AGO) && HOURS_AGO > 0 ? HOURS_AGO : 3;

async function main() {
  const gmail = createGmailClientFromEnv();
  const { emails } = await fetchRecentEmails(gmail, SAFE_HOURS, 50);

  console.log(`=== 최근 ${SAFE_HOURS}시간 수신 메일 재분류 (${emails.length}건) ===\n`);

  const generalList: { email: (typeof emails)[0]; result: ClassificationResult }[] = [];

  for (const email of emails) {
    const result = await classifyEmail(email);
    const subj = (email.subject ?? '').slice(0, 50);
    const from = email.fromEmail ?? email.from?.slice(0, 40) ?? '';
    console.log(`[${result.classification}] (${result.confidence.toFixed(2)}) ${from}`);
    console.log(`  제목: ${subj}${(email.subject?.length ?? 0) > 50 ? '...' : ''}`);
    if (result.reason) console.log(`  이유: ${result.reason}`);
    console.log('');
    if (result.classification === 'general') generalList.push({ email, result });
    await new Promise((r) => setTimeout(r, 500));
  }

  const fanCount = emails.length - generalList.length;
  console.log('--- 요약 ---');
  console.log(`팬레터: ${fanCount}건, 일반: ${generalList.length}건`);
  if (generalList.length > 0) {
    console.log('\n일반으로 분류된 메일 (팬메일일 수 있으면 제목/이유 확인):');
    generalList.forEach(({ email, result }) => {
      console.log(`  - ${email.fromEmail} | ${(email.subject ?? '').slice(0, 40)} | ${result.reason}`);
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
