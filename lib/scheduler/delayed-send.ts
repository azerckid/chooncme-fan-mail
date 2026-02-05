/**
 * 지연 발송 로직
 * 10~30분 사이 랜덤 지연 후 답장 메일 발송
 */

import { db } from '@/db';
import { fanLetters, replies } from '@/db/schema';
import { sendMail } from '@/lib/mail';
import { eq } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { createFollowUp, isFollowUpEnabled } from './follow-up';

/**
 * 지연 발송 옵션
 */
export interface DelayedSendOptions {
  /** 최소 지연 (분), 기본 10 */
  minDelayMinutes?: number;
  /** 최대 지연 (분), 기본 30 */
  maxDelayMinutes?: number;
  /** 드라이런 모드 (실제 발송하지 않음) */
  dryRun?: boolean;
}

/**
 * 발송 요청 정보
 */
export interface SendRequest {
  letterId: number;
  to: string;
  subject: string;
  body: string;
}

/**
 * 발송 결과
 */
export interface SendResult {
  success: boolean;
  replyId?: number;
  error?: string;
  sentAt?: string;
}

/**
 * 10~30분 사이 랜덤 지연 시간 계산 (밀리초)
 */
export function calculateRandomDelay(minMinutes = 10, maxMinutes = 30): number {
  const minMs = minMinutes * 60 * 1000;
  const maxMs = maxMinutes * 60 * 1000;
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

/**
 * 환경변수에서 지연 시간 설정 읽기
 */
export function getDelayConfig(): { minMinutes: number; maxMinutes: number } {
  const minMinutes = parseInt(process.env.REPLY_DELAY_MIN || '10', 10);
  const maxMinutes = parseInt(process.env.REPLY_DELAY_MAX || '30', 10);
  return { minMinutes, maxMinutes };
}

/**
 * 드라이런 모드 여부 확인
 */
export function isDryRunMode(): boolean {
  return process.env.EMAIL_DRY_RUN === 'true';
}

/**
 * 즉시 답장 발송 (DB 저장 포함)
 */
export async function sendReplyImmediately(request: SendRequest): Promise<SendResult> {
  const { letterId, to, subject, body } = request;
  const dryRun = isDryRunMode();

  try {
    // 1. letter 존재 확인
    const letter = await db.query.fanLetters.findFirst({
      where: eq(fanLetters.id, letterId),
    });

    if (!letter) {
      return {
        success: false,
        error: `Letter not found: ${letterId}`,
      };
    }

    // 2. 이미 답장했는지 확인
    if (letter.isReplied) {
      return {
        success: false,
        error: `Already replied to letter: ${letterId}`,
      };
    }

    const nowIso = DateTime.utc().toISO() ?? new Date().toISOString();

    // 3. 메일 발송 (드라이런이 아닌 경우)
    if (!dryRun) {
      await sendMail({ to, subject, body });
    } else {
      console.log(`[DryRun] Would send email to ${to}: ${subject}`);
    }

    // 4. replies 테이블에 저장
    const [inserted] = await db
      .insert(replies)
      .values({
        letterId,
        content: body,
        emailSent: !dryRun,
        emailSentAt: dryRun ? null : nowIso,
      })
      .returning({ id: replies.id });

    // 5. fan_letters 업데이트
    await db
      .update(fanLetters)
      .set({
        isReplied: true,
        repliedAt: nowIso,
      })
      .where(eq(fanLetters.id, letterId));

    console.log(
      `[Send] Reply sent${dryRun ? ' (dry-run)' : ''}: letterId=${letterId}, replyId=${inserted?.id}`
    );

    // 6. 팔로업 추적 레코드 생성
    if (isFollowUpEnabled() && inserted?.id) {
      try {
        await createFollowUp(inserted.id, to);
      } catch (followUpError) {
        // 팔로업 생성 실패해도 답장 발송은 성공으로 처리
        console.error('[Send] Failed to create follow-up tracking:', followUpError);
      }
    }

    return {
      success: true,
      replyId: inserted?.id,
      sentAt: nowIso,
    };
  } catch (error) {
    console.error('[Send] Failed to send reply:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 지연 후 답장 발송 (setTimeout 사용)
 * 참고: PM2 재시작 시 예약이 사라짐
 */
export function scheduleDelayedSend(
  request: SendRequest,
  options: DelayedSendOptions = {}
): { scheduledAt: Date; delayMs: number; cancel: () => void } {
  const { minMinutes, maxMinutes } = getDelayConfig();
  const minDelay = options.minDelayMinutes ?? minMinutes;
  const maxDelay = options.maxDelayMinutes ?? maxMinutes;

  const delayMs = calculateRandomDelay(minDelay, maxDelay);
  const scheduledAt = new Date(Date.now() + delayMs);

  console.log(
    `[Schedule] Reply scheduled: letterId=${request.letterId}, delay=${Math.round(delayMs / 60000)}min, at=${scheduledAt.toISOString()}`
  );

  const timeoutId = setTimeout(async () => {
    const result = await sendReplyImmediately(request);
    if (!result.success) {
      console.error(`[Schedule] Delayed send failed: ${result.error}`);
    }
  }, delayMs);

  return {
    scheduledAt,
    delayMs,
    cancel: () => clearTimeout(timeoutId),
  };
}

/**
 * 여러 답장을 지연 발송으로 예약
 */
export function scheduleMultipleDelayedSends(
  requests: SendRequest[],
  options: DelayedSendOptions = {}
): Map<number, { scheduledAt: Date; delayMs: number; cancel: () => void }> {
  const results = new Map<number, { scheduledAt: Date; delayMs: number; cancel: () => void }>();

  for (const request of requests) {
    const scheduled = scheduleDelayedSend(request, options);
    results.set(request.letterId, scheduled);
  }

  return results;
}
