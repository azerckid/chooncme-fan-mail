/**
 * 팬레터 아카이브 (DB 저장)
 * 이메일을 fan_letters 테이블에 저장
 */

import { db } from '@/db';
import { fanLetters } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { EmailMessage } from './types';
import { cancelFollowUpsForSender } from '@/lib/scheduler/follow-up';

/**
 * 아카이브 결과
 */
export interface ArchiveResult {
  success: boolean;
  letterId?: number;
  error?: {
    code: 'DUPLICATE' | 'VALIDATION_ERROR' | 'DB_ERROR';
    message: string;
  };
}

/**
 * 아카이브 입력 (분석 데이터 포함)
 */
export interface ArchiveInput {
  email: EmailMessage;
  /** 분석 데이터 (선택) */
  analysis?: {
    language?: string;
    country?: string;
    sentiment?: 'positive' | 'neutral' | 'negative';
    sentimentScore?: number;
    topics?: string[];
  };
}

/**
 * 단일 이메일 아카이브
 */
export async function archiveEmail(input: ArchiveInput): Promise<ArchiveResult> {
  const { email, analysis } = input;

  try {
    // 1. 중복 확인 (emailId 기준)
    const existing = await db.query.fanLetters.findFirst({
      where: eq(fanLetters.emailId, email.id),
    });

    if (existing) {
      return {
        success: false,
        letterId: existing.id,
        error: {
          code: 'DUPLICATE',
          message: `Email ${email.id} has already been archived (letterId: ${existing.id})`,
        },
      };
    }

    // 2. 이 발신자의 pending 팔로업 취소 (새 이메일을 보냈으므로)
    try {
      const cancelledCount = await cancelFollowUpsForSender(email.fromEmail, 'new_email_received');
      if (cancelledCount > 0) {
        console.log(`[Archive] Cancelled ${cancelledCount} pending follow-ups for ${email.fromEmail}`);
      }
    } catch (followUpError) {
      // 팔로업 취소 실패해도 아카이브는 계속 진행
      console.error('[Archive] Failed to cancel follow-ups:', followUpError);
    }

    // 3. DB 저장
    const result = await db
      .insert(fanLetters)
      .values({
        emailId: email.id,
        subject: email.subject || null,
        senderName: email.fromName,
        senderEmail: email.fromEmail,
        content: email.bodyPlain,
        receivedAt: email.receivedAt,
        language: analysis?.language || null,
        country: analysis?.country || null,
        sentiment: analysis?.sentiment || null,
        sentimentScore: analysis?.sentimentScore ?? null,
        topics: analysis?.topics ? JSON.stringify(analysis.topics) : null,
      })
      .returning({ insertedId: fanLetters.id });

    return {
      success: true,
      letterId: result[0].insertedId,
    };
  } catch (error) {
    console.error('[Archive] Failed to archive email:', error);
    return {
      success: false,
      error: {
        code: 'DB_ERROR',
        message: error instanceof Error ? error.message : 'Unknown database error',
      },
    };
  }
}

/**
 * 여러 이메일 일괄 아카이브
 */
export async function archiveEmails(
  inputs: ArchiveInput[],
  options: {
    /** 아카이브 완료 시 콜백 */
    onArchived?: (email: EmailMessage, result: ArchiveResult) => void;
    /** 중복 시에도 letterId 반환 (기존 ID) */
    returnExistingOnDuplicate?: boolean;
  } = {}
): Promise<Map<string, ArchiveResult>> {
  const { onArchived, returnExistingOnDuplicate = true } = options;
  const results = new Map<string, ArchiveResult>();

  for (const input of inputs) {
    const result = await archiveEmail(input);

    // 중복인 경우 기존 letterId 포함
    if (result.error?.code === 'DUPLICATE' && returnExistingOnDuplicate) {
      result.success = false; // 여전히 실패로 표시하지만 letterId는 있음
    }

    results.set(input.email.id, result);
    onArchived?.(input.email, result);
  }

  return results;
}

/**
 * 이메일이 이미 아카이브되었는지 확인
 */
export async function isEmailArchived(emailId: string): Promise<{ archived: boolean; letterId?: number }> {
  const existing = await db.query.fanLetters.findFirst({
    where: eq(fanLetters.emailId, emailId),
    columns: { id: true },
  });

  return {
    archived: !!existing,
    letterId: existing?.id,
  };
}

/**
 * emailId로 letterId 조회
 */
export async function getLetterIdByEmailId(emailId: string): Promise<number | null> {
  const result = await db.query.fanLetters.findFirst({
    where: eq(fanLetters.emailId, emailId),
    columns: { id: true },
  });

  return result?.id ?? null;
}
