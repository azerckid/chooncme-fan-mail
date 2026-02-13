/**
 * 팔로업 이메일 스케줄링 및 관리
 * 지수 백오프: 1주 → 2주 → 4주 → 8주
 */

import { db } from '@/db';
import { followUps, fanLetters, replies } from '@/db/schema';
import { eq, and, lte, gt, asc } from 'drizzle-orm';
import { DateTime } from 'luxon';

// 팔로업 간격 (일 단위): 1주, 2주, 4주, 8주
export const FOLLOW_UP_INTERVALS_DAYS = [7, 14, 28, 56];
export const MAX_FOLLOW_UPS = 4;

/**
 * 다음 팔로업 날짜 계산
 * @param count 현재 팔로업 카운트 (0 = 첫 팔로업 예약)
 */
export function calculateNextFollowUpDate(count: number): string {
  const daysToAdd =
    FOLLOW_UP_INTERVALS_DAYS[count] ??
    FOLLOW_UP_INTERVALS_DAYS[FOLLOW_UP_INTERVALS_DAYS.length - 1] * 2;

  return DateTime.utc().plus({ days: daysToAdd }).toISO()!;
}

/**
 * 팔로업 레코드 생성 (답장 발송 후 호출)
 */
export async function createFollowUp(replyId: number, senderEmail: string): Promise<number> {
  const nextAt = calculateNextFollowUpDate(0);

  const [inserted] = await db
    .insert(followUps)
    .values({
      replyId,
      senderEmail,
      followUpCount: 0,
      nextFollowUpAt: nextAt,
      status: 'pending',
    })
    .returning({ id: followUps.id });

  console.log(
    `[FollowUp] Created: id=${inserted.id}, senderEmail=${senderEmail}, nextAt=${nextAt}`
  );

  return inserted.id;
}

/**
 * 특정 발신자의 pending 팔로업 모두 취소
 * 팬이 새 이메일을 보냈을 때 호출
 */
export async function cancelFollowUpsForSender(
  senderEmail: string,
  reason: string = 'fan_replied'
): Promise<number> {
  const now = DateTime.utc().toISO()!;

  const result = await db
    .update(followUps)
    .set({
      status: 'cancelled',
      cancelReason: reason,
      updatedAt: now,
    })
    .where(
      and(eq(followUps.senderEmail, senderEmail), eq(followUps.status, 'pending'))
    );

  const count = result.rowsAffected ?? 0;
  if (count > 0) {
    console.log(`[FollowUp] Cancelled ${count} follow-ups for ${senderEmail}: ${reason}`);
  }

  return count;
}

/**
 * due된 pending 팔로업 목록 조회 (발송 예정 시점이 지난 것만)
 */
export async function getPendingFollowUps(): Promise<
  Array<{
    id: number;
    replyId: number;
    senderEmail: string;
    followUpCount: number;
    nextFollowUpAt: string;
  }>
> {
  const now = DateTime.utc().toISO()!;

  return db.query.followUps.findMany({
    where: and(eq(followUps.status, 'pending'), lte(followUps.nextFollowUpAt, now)),
  });
}

/**
 * 팔로업 대상 전체 목록 조회 (답장은 보냈으나 아직 팬 답장 없는 건)
 * status=pending인 모든 건. nextFollowUpAt 기준 정렬.
 */
export async function listAllPendingFollowUps(): Promise<
  Array<{
    id: number;
    replyId: number;
    senderEmail: string;
    followUpCount: number;
    nextFollowUpAt: string;
    lastSentAt: string | null;
    createdAt: string | null;
  }>
> {
  const rows = await db.query.followUps.findMany({
    where: eq(followUps.status, 'pending'),
    columns: {
      id: true,
      replyId: true,
      senderEmail: true,
      followUpCount: true,
      nextFollowUpAt: true,
      lastSentAt: true,
      createdAt: true,
    },
    orderBy: [asc(followUps.nextFollowUpAt)],
  });

  return rows;
}

/**
 * 팬이 특정 날짜 이후로 새 이메일을 보냈는지 확인
 */
export async function hasFanRepliedSince(
  senderEmail: string,
  sinceDate: string
): Promise<boolean> {
  const newLetter = await db.query.fanLetters.findFirst({
    where: and(eq(fanLetters.senderEmail, senderEmail), gt(fanLetters.receivedAt, sinceDate)),
    columns: { id: true },
  });

  return !!newLetter;
}

/**
 * 팔로업 발송 후 업데이트
 * - 카운트 증가
 * - 다음 팔로업 날짜 설정 (또는 완료 처리)
 */
export async function updateFollowUpAfterSend(followUpId: number): Promise<void> {
  const followUp = await db.query.followUps.findFirst({
    where: eq(followUps.id, followUpId),
  });

  if (!followUp) return;

  const newCount = followUp.followUpCount + 1;
  const now = DateTime.utc().toISO()!;

  // 최대 팔로업 횟수에 도달했는지 확인
  if (newCount >= MAX_FOLLOW_UPS) {
    await db
      .update(followUps)
      .set({
        status: 'completed',
        followUpCount: newCount,
        lastSentAt: now,
        updatedAt: now,
      })
      .where(eq(followUps.id, followUpId));

    console.log(`[FollowUp] Completed: id=${followUpId}, reached max follow-ups`);
  } else {
    // 다음 팔로업 예약
    const nextAt = calculateNextFollowUpDate(newCount);

    await db
      .update(followUps)
      .set({
        followUpCount: newCount,
        nextFollowUpAt: nextAt,
        lastSentAt: now,
        updatedAt: now,
      })
      .where(eq(followUps.id, followUpId));

    console.log(`[FollowUp] Updated: id=${followUpId}, count=${newCount}, nextAt=${nextAt}`);
  }
}

/**
 * 팔로업 컨텍스트 조회 (원본 편지 + 답장 정보)
 */
export async function getFollowUpContext(replyId: number): Promise<{
  fanName: string;
  senderEmail: string;
  originalSubject: string;
  originalContent: string;
  replyContent: string;
  repliedAt: string;
} | null> {
  const reply = await db.query.replies.findFirst({
    where: eq(replies.id, replyId),
  });

  if (!reply) return null;

  const letter = await db.query.fanLetters.findFirst({
    where: eq(fanLetters.id, reply.letterId),
  });

  if (!letter) return null;

  return {
    fanName: letter.senderName,
    senderEmail: letter.senderEmail,
    originalSubject: letter.subject ?? '',
    originalContent: letter.content,
    replyContent: reply.content,
    repliedAt: letter.repliedAt ?? reply.createdAt ?? '',
  };
}

/**
 * 팔로업 활성화 여부 확인
 */
export function isFollowUpEnabled(): boolean {
  return process.env.FOLLOWUP_ENABLED !== 'false';
}

/**
 * 최대 팔로업 횟수 (환경변수에서 읽음)
 */
export function getMaxFollowUps(): number {
  const max = parseInt(process.env.FOLLOWUP_MAX_COUNT || '', 10);
  return isNaN(max) ? MAX_FOLLOW_UPS : max;
}
