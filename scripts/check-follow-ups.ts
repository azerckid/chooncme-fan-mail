/**
 * 팔로업 대상(pending) 목록 조회
 * npx tsx scripts/check-follow-ups.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { listAllPendingFollowUps } from '../lib/scheduler/follow-up';
import { DateTime } from 'luxon';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

async function main() {
  const items = await listAllPendingFollowUps();
  const now = DateTime.utc().toISO() ?? '';

  console.log('=== 팔로업 대상 (답장 보냈으나 팬 답장 없음) ===');
  console.log('총', items.length, '건\n');

  if (items.length === 0) {
    console.log('대상 없음.');
    return;
  }

  for (const row of items) {
    const isDue = row.nextFollowUpAt <= now;
    console.log(`- ${row.senderEmail}`);
    console.log(`  다음 팔로업: ${row.nextFollowUpAt} ${isDue ? '(발송 예정)' : ''}`);
    console.log(`  팔로업 횟수: ${row.followUpCount}, id: ${row.id}`);
    console.log('');
  }

  const dueCount = items.filter((r) => r.nextFollowUpAt <= now).length;
  console.log('발송 예정(due):', dueCount, '건');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
