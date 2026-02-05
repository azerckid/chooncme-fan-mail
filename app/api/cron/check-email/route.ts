/**
 * POST /api/cron/check-email
 * 외부 cron 서비스에서 호출하는 이메일 처리 엔드포인트
 *
 * 인증: CRON_SECRET 환경변수와 Authorization 헤더 비교
 */

import { NextRequest, NextResponse } from 'next/server';
import { processEmails, formatProcessResult, processFollowUps, formatFollowUpResult } from '@/lib/scheduler';
import { createLogger } from '@/lib/logger';
import { alertError } from '@/lib/alert';

const logger = createLogger('CronAPI');

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. 인증 검증
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      const authHeader = req.headers.get('authorization');
      const providedSecret = authHeader?.replace('Bearer ', '');

      if (providedSecret !== cronSecret) {
        logger.warn('Unauthorized cron request');
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid cron secret' } },
          { status: 401 }
        );
      }
    } else {
      logger.warn('CRON_SECRET not set, skipping authentication');
    }

    // 2. 요청 본문에서 옵션 읽기 (선택)
    let options = {};
    try {
      const body = await req.json();
      options = {
        hoursAgo: body.hoursAgo,
        maxEmails: body.maxEmails,
        verbose: body.verbose ?? false,
      };
    } catch {
      // 빈 본문이면 기본값 사용
    }

    logger.info('Cron job started', options);

    // 3. 이메일 처리 실행
    const result = await processEmails(options);

    logger.info('Cron job completed', {
      duration: Date.now() - startTime,
      fetched: result.fetchedCount,
      fanLetters: result.fanLetterCount,
      archived: result.archivedCount,
      scheduled: result.scheduledCount,
      errors: result.errorCount,
    });

    // 4. 에러가 있으면 알림
    if (result.errorCount > 0) {
      await alertError('Cron 작업 중 오류 발생', `${result.errorCount}건의 오류 발생`, [
        { name: 'Fetched', value: String(result.fetchedCount) },
        { name: 'Errors', value: String(result.errorCount) },
      ]);
    }

    // 5. 팔로업 처리 실행
    logger.info('Processing follow-ups...');
    const followUpResult = await processFollowUps();

    logger.info('Follow-ups processed', {
      processed: followUpResult.processed,
      sent: followUpResult.sent,
      cancelled: followUpResult.cancelled,
      errors: followUpResult.errors,
    });

    // 6. 팔로업 에러가 있으면 알림
    if (followUpResult.errors > 0) {
      await alertError('팔로업 처리 중 오류 발생', `${followUpResult.errors}건의 오류 발생`, [
        { name: 'Processed', value: String(followUpResult.processed) },
        { name: 'Errors', value: String(followUpResult.errors) },
      ]);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        followUps: followUpResult,
        summary: formatProcessResult(result),
        followUpSummary: formatFollowUpResult(followUpResult),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Cron job failed', error);

    // 치명적 오류 알림
    await alertError('Cron 작업 실패', error instanceof Error ? error : errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/check-email
 * 상태 확인용 (헬스체크)
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      dryRunMode: process.env.EMAIL_DRY_RUN === 'true',
    },
  });
}
