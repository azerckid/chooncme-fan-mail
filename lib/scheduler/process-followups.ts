/**
 * 팔로업 이메일 처리
 * Cron job에서 호출되어 due된 팔로업을 처리
 */

import {
  getPendingFollowUps,
  hasFanRepliedSince,
  cancelFollowUpsForSender,
  updateFollowUpAfterSend,
  getFollowUpContext,
  isFollowUpEnabled,
} from './follow-up';
import { generateFollowUp, calculateDaysSince } from './followup-generator';
import { sendMail } from '@/lib/mail';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ProcessFollowUps');

export interface ProcessFollowUpsResult {
  processed: number;
  sent: number;
  cancelled: number;
  errors: number;
}

/**
 * 모든 due된 팔로업 처리
 */
export async function processFollowUps(): Promise<ProcessFollowUpsResult> {
  const result: ProcessFollowUpsResult = {
    processed: 0,
    sent: 0,
    cancelled: 0,
    errors: 0,
  };

  // 팔로업 기능 비활성화 확인
  if (!isFollowUpEnabled()) {
    logger.info('Follow-up processing is disabled');
    return result;
  }

  const dryRun = process.env.EMAIL_DRY_RUN === 'true';

  try {
    const pendingFollowUps = await getPendingFollowUps();
    logger.info(`Found ${pendingFollowUps.length} pending follow-ups due`);

    for (const followUp of pendingFollowUps) {
      result.processed++;

      try {
        // 1. 컨텍스트 조회
        const context = await getFollowUpContext(followUp.replyId);
        if (!context) {
          logger.warn(`No context found for follow-up ${followUp.id}, skipping`);
          result.errors++;
          continue;
        }

        // 2. 팬이 답장했는지 확인
        const hasReplied = await hasFanRepliedSince(
          followUp.senderEmail,
          context.repliedAt
        );

        if (hasReplied) {
          // 팬이 답장했으면 팔로업 취소
          await cancelFollowUpsForSender(followUp.senderEmail, 'fan_replied');
          result.cancelled++;
          logger.info(
            `Cancelled follow-up for ${followUp.senderEmail} - fan has replied`
          );
          continue;
        }

        // 3. 팔로업 콘텐츠 생성
        const daysSince = calculateDaysSince(context.repliedAt);
        const genResult = await generateFollowUp({
          fanName: context.fanName,
          followUpCount: followUp.followUpCount + 1, // +1: 다음 팔로업 번호
          originalSubject: context.originalSubject,
          originalContent: context.originalContent,
          previousReplyContent: context.replyContent,
          daysSinceReply: daysSince,
        });

        if (!genResult.success || !genResult.followUp) {
          logger.error(
            `Failed to generate follow-up for ${followUp.senderEmail}: ${genResult.error}`
          );
          result.errors++;
          continue;
        }

        // 4. 이메일 발송
        if (!dryRun) {
          await sendMail({
            to: followUp.senderEmail,
            subject: genResult.followUp.subject,
            body: genResult.followUp.body,
          });
        } else {
          logger.info(
            `[DryRun] Would send follow-up to ${followUp.senderEmail}: ${genResult.followUp.subject}`
          );
        }

        // 5. 팔로업 레코드 업데이트
        await updateFollowUpAfterSend(followUp.id);
        result.sent++;

        logger.info(
          `Sent follow-up #${followUp.followUpCount + 1} to ${followUp.senderEmail}${dryRun ? ' (dry-run)' : ''}`
        );

        // Rate limit 방지를 위한 딜레이
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error(`Error processing follow-up ${followUp.id}:`, error);
        result.errors++;
      }
    }
  } catch (error) {
    logger.error('Fatal error in processFollowUps:', error);
    result.errors++;
  }

  return result;
}

/**
 * 팔로업 처리 결과 포맷
 */
export function formatFollowUpResult(result: ProcessFollowUpsResult): string {
  return `[FollowUp] Processed: ${result.processed}, Sent: ${result.sent}, Cancelled: ${result.cancelled}, Errors: ${result.errors}`;
}
