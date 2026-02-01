import { db } from "@/db";
import { fanLetters, replies } from "@/db/schema";
import { eq, sql, isNull } from "drizzle-orm";
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
    Globe,
    SmilePlus
} from "lucide-react";

async function getStats() {
    try {
        // 집계 쿼리 실행
        const counts = await db.select({
            total: sql<number>`count(*)`,
            unread: sql<number>`sum(case when is_read = 0 then 1 else 0 end)`,
        }).from(fanLetters);

        const unrepliedResult = await db.select({
            count: sql<number>`count(*)`
        })
            .from(fanLetters)
            .leftJoin(replies, eq(fanLetters.id, replies.letterId))
            .where(isNull(replies.id));

        return {
            total: counts[0]?.total || 0,
            unread: Number(counts[0]?.unread || 0),
            unreplied: unrepliedResult[0]?.count || 0,
        };
    } catch (error) {
        console.error("Stats fetch error:", error);
        return { total: 0, unread: 0, unreplied: 0 };
    }
}

export default async function DashboardPage() {
    const stats = await getStats();

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
            value: 0, // 임시
            description: "최근 24시간 내 수신",
            icon: TrendingUp,
            color: "text-green-600",
            bg: "bg-green-50"
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">좋은 아침입니다, 춘심님!</h2>
                <p className="text-neutral-500 mt-2">오늘도 팬들의 따뜻한 마음이 도착해 있어요.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
                        <CardTitle>최근 수신 데이터 분석</CardTitle>
                        <CardDescription>언어 및 감정별 분포 현황</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center text-neutral-400 italic">
                        데이터가 축적되면 시각화 차트가 표시됩니다.
                    </CardContent>
                </Card>

                <Card className="col-span-3 border-none shadow-sm bg-white">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-neutral-400" />
                            <CardTitle>지역별 수신</CardTitle>
                        </div>
                        <CardDescription>글로벌 팬덤 분포</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center text-neutral-400 italic">
                        지역 추정 데이터 준비 중
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
