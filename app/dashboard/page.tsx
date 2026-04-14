import { db } from "@/db";
import { fanLetters, replies } from "@/db/schema";
import { eq, sql, gte, desc, countDistinct } from "drizzle-orm";
import { DateTime } from "luxon";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import {
    Mail,
    MailOpen,
    MessageSquareOff,
    TrendingUp,
    Users,
} from "lucide-react";
import { TrendChart, SentimentChart, LanguageChart } from "@/components/dashboard/charts";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { maskName } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getStats() {
    try {
        // 집계 쿼리 실행
        const counts = await db.select({
            total: sql<number>`count(*)`,
            unread: sql<number>`sum(case when is_read = 0 then 1 else 0 end)`,
        }).from(fanLetters);

        // 고유 발신자 수
        const uniqueSendersResult = await db.select({
            count: sql<number>`count(distinct sender_email)`,
        }).from(fanLetters);

        const unrepliedResult = await db.select({
            count: sql<number>`count(*)`
        })
            .from(fanLetters)
            .where(eq(fanLetters.isReplied, false));

        // 언어별 분포
        const byLanguage = await db.select({
            language: fanLetters.language,
            count: sql<number>`count(*)`
        })
            .from(fanLetters)
            .groupBy(fanLetters.language);

        // 감정별 분포
        const bySentiment = await db.select({
            sentiment: fanLetters.sentiment,
            count: sql<number>`count(*)`
        })
            .from(fanLetters)
            .groupBy(fanLetters.sentiment);

        // 최근 7일 수신 추이
        const sevenDaysAgo = DateTime.now().minus({ days: 7 }).toISODate();
        const recentTrendData7 = await db.select({
            date: sql<string>`date(received_at)`,
            count: sql<number>`count(*)`
        })
            .from(fanLetters)
            .where(gte(fanLetters.receivedAt, sevenDaysAgo || ""))
            .groupBy(sql`date(received_at)`)
            .orderBy(sql`date(received_at)`);

        // 최근 30일 수신 추이
        const thirtyDaysAgo = DateTime.now().minus({ days: 30 }).toISODate();
        const recentTrendData30 = await db.select({
            date: sql<string>`date(received_at)`,
            count: sql<number>`count(*)`
        })
            .from(fanLetters)
            .where(gte(fanLetters.receivedAt, thirtyDaysAgo || ""))
            .groupBy(sql`date(received_at)`)
            .orderBy(sql`date(received_at)`);

        // 7일 날짜 배열 생성
        const recentTrend7 = [];
        for (let i = 6; i >= 0; i--) {
            const date = DateTime.now().minus({ days: i }).toISODate();
            const found = recentTrendData7.find(d => d.date === date);
            recentTrend7.push({
                date,
                count: found?.count || 0
            });
        }

        // 30일 날짜 배열 생성
        const recentTrend30 = [];
        for (let i = 29; i >= 0; i--) {
            const date = DateTime.now().minus({ days: i }).toISODate();
            const found = recentTrendData30.find(d => d.date === date);
            recentTrend30.push({
                date,
                count: found?.count || 0
            });
        }

        const today = DateTime.now().toISODate();
        const todayCount = recentTrendData7.find(d => d.date === today)?.count || 0;

        return {
            total: counts[0]?.total || 0,
            unread: Number(counts[0]?.unread || 0),
            unreplied: unrepliedResult[0]?.count || 0,
            uniqueSenders: uniqueSendersResult[0]?.count || 0,
            todayCount,
            byLanguage: Object.fromEntries(byLanguage.map(x => [x.language || "unknown", x.count])),
            bySentiment: Object.fromEntries(bySentiment.map(x => [x.sentiment || "unknown", x.count])),
            recentTrend7,
            recentTrend30,
        };
    } catch (error) {
        console.error("Stats fetch error:", error);
        return {
            total: 0,
            unread: 0,
            unreplied: 0,
            uniqueSenders: 0,
            todayCount: 0,
            byLanguage: {},
            bySentiment: {},
            recentTrend7: [],
            recentTrend30: [],
        };
    }
}

async function getRecentLetters() {
    try {
        const letters = await db.query.fanLetters.findMany({
            orderBy: [desc(fanLetters.receivedAt)],
            limit: 5,
        });
        return letters;
    } catch (error) {
        console.error("Recent letters fetch error:", error);
        return [];
    }
}

export default async function DashboardPage() {
    const stats = await getStats();
    const recentLetters = await getRecentLetters();

    const cards = [
        {
            title: "전체 팬레터",
            value: stats.total,
            description: "누적 수신된 모든 편지",
            icon: Mail,
            color: "text-blue-600",
            bg: "bg-blue-50"
        },
        {
            title: "읽지 않은 편지",
            value: stats.unread,
            description: "확인이 필요한 새로운 편지",
            icon: MailOpen,
            color: "text-orange-600",
            bg: "bg-orange-50"
        },
        {
            title: "미답장 현황",
            value: stats.unreplied,
            description: "춘심이의 답장이 대기 중",
            icon: MessageSquareOff,
            color: "text-red-600",
            bg: "bg-red-50"
        },
        {
            title: "오늘의 수신",
            value: stats.todayCount,
            description: "오늘 수신된 편지",
            icon: TrendingUp,
            color: "text-green-600",
            bg: "bg-green-50"
        },
        {
            title: "거래 인원",
            value: stats.uniqueSenders,
            description: "팬레터를 보낸 고유 인원",
            icon: Users,
            color: "text-purple-600",
            bg: "bg-purple-50"
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">좋은 아침입니다, 춘심님!</h2>
                <p className="text-neutral-500 mt-2">오늘도 팬들의 따뜻한 마음이 도착해 있어요.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                {cards.map((card) => (
                    <Card key={card.title} className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-neutral-600">
                                {card.title}
                            </CardTitle>
                            <div className={`${card.bg} p-2 rounded-lg`}>
                                <card.icon className={`w-4 h-4 ${card.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{card.value}</div>
                            <p className="text-xs text-neutral-400 mt-1">
                                {card.description}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 border-none shadow-sm bg-white">
                    <CardHeader>
                        <CardTitle>수신 추이</CardTitle>
                        <CardDescription>일별 팬레터 수신 현황</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <TrendChart data7Days={stats.recentTrend7} data30Days={stats.recentTrend30} />
                    </CardContent>
                </Card>

                <Card className="col-span-3 border-none shadow-sm bg-white">
                    <CardHeader>
                        <CardTitle>감정 분석</CardTitle>
                        <CardDescription>팬레터 감정 분포</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <SentimentChart data={stats.bySentiment} />
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-none shadow-sm bg-white">
                    <CardHeader>
                        <CardTitle>언어별 분포</CardTitle>
                        <CardDescription>글로벌 팬덤 현황</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <LanguageChart data={stats.byLanguage} />
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>최근 수신 편지</CardTitle>
                            <CardDescription>최근 도착한 팬레터</CardDescription>
                        </div>
                        <Link
                            href="/dashboard/letters"
                            className="text-sm text-blue-600 hover:underline"
                        >
                            전체 보기
                        </Link>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {recentLetters.length === 0 ? (
                            <p className="text-neutral-400 text-sm text-center py-8">
                                아직 수신된 편지가 없습니다
                            </p>
                        ) : (
                            recentLetters.map((letter) => (
                                <Link
                                    key={letter.id}
                                    href={`/dashboard/letters/${letter.id}`}
                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-neutral-50 transition-colors border border-neutral-100"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                                            {letter.senderName[0]}
                                        </div>
                                        <div>
                                            <div className="font-medium text-sm flex items-center">
                                                {maskName(letter.senderName)}
                                                {!letter.isRead && (
                                                    <Badge className="ml-2 bg-blue-500 text-[10px]">NEW</Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-neutral-400 truncate max-w-[200px]">
                                                {letter.subject || letter.content.slice(0, 30)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-xs text-neutral-400">
                                        {letter.receivedAt
                                            ? DateTime.fromISO(letter.receivedAt).toRelative({ locale: "ko" })
                                            : "-"}
                                    </div>
                                </Link>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
