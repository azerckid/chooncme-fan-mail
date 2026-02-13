/**
 * 일반으로 잘못 분류되어 답장 못 받은 메일 1통을 팬레터로 처리 (아카이브 + 답장 발송)
 * 사용: npx tsx scripts/process-one-as-fan.ts [Gmail메시지ID]
 * 메시지ID 생략 시: 최근 24시간 수신 중 제목 "You're beautiful", joecsak@icloud.com 검색 후 처리
 */

import dotenv from 'dotenv';
import path from 'path';
import { createGmailClientFromEnv, fetchRecentEmails, fetchEmailById } from '../lib/email';
import { archiveEmail, isEmailArchived } from '../lib/email';
import { generateReplyFromEmail } from '../lib/scheduler/reply-generator';
import { sendReplyImmediately } from '../lib/scheduler/delayed-send';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const TARGET_SUBJECT = "You're beautiful";
const TARGET_FROM = 'joecsak@icloud.com';

async function main() {
  const messageId = process.argv[2];
  let email;

  if (messageId) {
    const gmail = createGmailClientFromEnv();
    email = await fetchEmailById(gmail, messageId);
    if (!email) {
      console.error('해당 메시지 ID로 메일을 찾을 수 없습니다:', messageId);
      process.exit(1);
    }
  } else {
    const gmail = createGmailClientFromEnv();
    const { emails } = await fetchRecentEmails(gmail, 48, 50);
    email = emails.find(
      (e) =>
        ((e.subject ?? '').includes(TARGET_SUBJECT) || (e.subject ?? '').toLowerCase().includes('beautiful')) &&
        (e.fromEmail ?? e.from ?? '').toLowerCase().includes(TARGET_FROM.toLowerCase())
    );
    if (!email) {
      console.error(`최근 48시간 수신 메일에서 "${TARGET_SUBJECT}" 또는 beautiful / ${TARGET_FROM} 를 찾지 못했습니다.`);
      process.exit(1);
    }
    console.log('대상 메일:', email.subject, '|', email.fromEmail);
  }

  const { archived, letterId: existingId } = await isEmailArchived(email.id);
  let letterId: number;

  if (archived && existingId) {
    letterId = existingId;
    console.log('이미 아카이브됨 letterId=', letterId);
  } else {
    const archiveResult = await archiveEmail({ email });
    if (!archiveResult.success || !archiveResult.letterId) {
      if (archiveResult.error?.code === 'DUPLICATE' && archiveResult.letterId) {
        letterId = archiveResult.letterId;
        console.log('중복(기존) letterId=', letterId);
      } else {
        console.error('아카이브 실패:', archiveResult.error?.message);
        process.exit(1);
      }
    } else {
      letterId = archiveResult.letterId;
      console.log('아카이브 완료 letterId=', letterId);
    }
  }

  const replyResult = await generateReplyFromEmail(email);
  if (!replyResult.success || !replyResult.reply) {
    console.error('답장 생성 실패:', replyResult.error);
    process.exit(1);
  }

  const sendResult = await sendReplyImmediately({
    letterId,
    to: email.fromEmail,
    subject: replyResult.reply.subject,
    body: replyResult.reply.body,
  });

  if (!sendResult.success) {
    console.error('답장 발송 실패:', sendResult.error);
    process.exit(1);
  }

  console.log('완료: 답장 발송됨', sendResult.sentAt);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
