/**
 * node-cron 기반 스케줄러
 * 1시간마다 이메일 처리 + 팔로업 처리 실행
 */

import cron, { type ScheduledTask } from 'node-cron';
import { processEmails, formatProcessResult, type ProcessOptions } from './process-emails';
import { processFollowUps, formatFollowUpResult } from './process-followups';

let scheduledTask: ScheduledTask | null = null;
let isRunning = false;

/**
 * 스케줄러 시작 (1시간마다 실행)
 * @param cronExpression cron 표현식, 기본값 '0 * * * *' (매시 정각)
 * @param processOptions 이메일 처리 옵션
 */
export function startScheduler(
  cronExpression = '0 * * * *',
  processOptions: ProcessOptions = {}
): void {
  if (scheduledTask) {
    console.log('[Cron] Scheduler already running');
    return;
  }

  console.log(`[Cron] Starting scheduler with expression: ${cronExpression}`);

  scheduledTask = cron.schedule(cronExpression, async () => {
    if (isRunning) {
      console.log('[Cron] Previous job still running, skipping this cycle');
      return;
    }

    isRunning = true;
    console.log(`[Cron] Job started at ${new Date().toISOString()}`);

    try {
      const result = await processEmails(processOptions);
      console.log(formatProcessResult(result));
      const followUpResult = await processFollowUps();
      console.log(formatFollowUpResult(followUpResult));
    } catch (error) {
      console.error('[Cron] Job failed:', error);
    } finally {
      isRunning = false;
    }
  });

  console.log('[Cron] Scheduler started successfully');
}

/**
 * 스케줄러 중지
 */
export function stopScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('[Cron] Scheduler stopped');
  }
}

/**
 * 스케줄러 상태 확인
 */
export function isSchedulerRunning(): boolean {
  return scheduledTask !== null;
}

/**
 * 수동으로 즉시 실행 (테스트/디버깅용)
 */
export async function runNow(processOptions: ProcessOptions = {}): Promise<void> {
  if (isRunning) {
    console.log('[Cron] Job already running');
    return;
  }

  isRunning = true;
  console.log(`[Cron] Manual run started at ${new Date().toISOString()}`);

  try {
    const result = await processEmails(processOptions);
    console.log(formatProcessResult(result));
    const followUpResult = await processFollowUps();
    console.log(formatFollowUpResult(followUpResult));
  } catch (error) {
    console.error('[Cron] Manual run failed:', error);
  } finally {
    isRunning = false;
  }
}
