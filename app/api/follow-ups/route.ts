/**
 * 팔로업 대상 목록 조회
 * GET /api/follow-ups
 * 답장은 보냈으나 아직 팬 답장이 없는 건(pending) 목록
 */

import { NextResponse } from 'next/server';
import { listAllPendingFollowUps } from '@/lib/scheduler/follow-up';
import { DateTime } from 'luxon';

export async function GET() {
  try {
    const items = await listAllPendingFollowUps();
    const now = DateTime.utc().toISO() ?? '';

    const withDue = items.map((row) => ({
      ...row,
      isDue: row.nextFollowUpAt <= now,
    }));

    return NextResponse.json({
      success: true,
      data: {
        items: withDue,
        total: items.length,
        dueCount: withDue.filter((x) => x.isDue).length,
      },
    });
  } catch (error) {
    console.error('[API follow-ups GET]', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
