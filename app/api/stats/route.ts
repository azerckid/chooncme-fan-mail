import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { fanLetters, replies } from "@/db/schema";
import { eq, sql, isNull, gte, and } from "drizzle-orm";
import { DateTime } from "luxon";

export async function GET(_req: NextRequest) {
    try {
        // 1. 전체 수 및 상태별 수 집계
        const counts = await db.select({
            total: sql<number>`count(*)`,
            unread: sql<number>`sum(case when is_read = 0 then 1 else 0 end)`,
        }).from(fanLetters);

        // 2. 미답장 수 집계 (Left Join 사용)
        const unrepliedResult = await db.select({
            count: sql<number>`count(*)`
        })
            .from(fanLetters)
            .leftJoin(replies, eq(fanLetters.id, replies.letterId))
            .where(isNull(replies.id));

        // 3. 언어별 분포
        const byLanguage = await db.select({
            language: fanLetters.language,
            count: sql<number>`count(*)`
        })
            .from(fanLetters)
            .groupBy(fanLetters.language);

        // 4. 감정별 분포
        const bySentiment = await db.select({
            sentiment: fanLetters.sentiment,
            count: sql<number>`count(*)`
        })
            .from(fanLetters)
            .groupBy(fanLetters.sentiment);

        // 5. 최근 7일 수신 추이
        const sevenDaysAgo = DateTime.now().minus({ days: 7 }).toISODate();
        const recentTrendData = await db.select({
            date: sql<string>`date(received_at)`,
            count: sql<number>`count(*)`
        })
            .from(fanLetters)
            .where(and(
                gte(fanLetters.receivedAt, sevenDaysAgo || ""),
            ))
            .groupBy(sql`date(received_at)`)
            .orderBy(sql`date(received_at)`);

        // 7일 날짜 배열 생성 (데이터 없는 날도 0으로 표시)
        const recentTrend = [];
        for (let i = 6; i >= 0; i--) {
            const date = DateTime.now().minus({ days: i }).toISODate();
            const found = recentTrendData.find(d => d.date === date);
            recentTrend.push({
                date,
                count: found?.count || 0
            });
        }

        // 6. 오늘 수신 수
        const today = DateTime.now().toISODate();
        const todayCount = recentTrendData.find(d => d.date === today)?.count || 0;

        return NextResponse.json({
            success: true,
            data: {
                total: counts[0]?.total || 0,
                unread: Number(counts[0]?.unread || 0),
                unreplied: unrepliedResult[0]?.count || 0,
                todayCount,
                byLanguage: Object.fromEntries(byLanguage.map(x => [x.language || "unknown", x.count])),
                bySentiment: Object.fromEntries(bySentiment.map(x => [x.sentiment || "unknown", x.count])),
                recentTrend,
            }
        });

    } catch (error) {
        console.error("[API_STATS_GET_ERROR]", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
