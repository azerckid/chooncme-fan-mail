import { db } from "@/db";
import { fanLetters, replies } from "@/db/schema";
import { eq, and, or, like, desc, sql } from "drizzle-orm";
import {
    Card,
    CardContent
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { maskName, maskEmail } from "@/lib/utils";
import {
    Search,
    Filter,
    ChevronRight,
    Star,
    Clock,
    Mail
} from "lucide-react";
import { DateTime } from "luxon";

async function getLetters(searchParams: { [key: string]: string | undefined }) {
    const { search, isStarred, language } = searchParams;

    const conditions = [];
    if (isStarred === "true") conditions.push(eq(fanLetters.isStarred, true));
    if (language) conditions.push(eq(fanLetters.language, language));
    if (search) {
        conditions.push(
            or(
                like(fanLetters.senderName, `%${search}%`),
                like(fanLetters.senderEmail, `%${search}%`),
                like(fanLetters.content, `%${search}%`)
            )
        );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const letters = await db.select({
        id: fanLetters.id,
        senderName: fanLetters.senderName,
        senderEmail: fanLetters.senderEmail,
        subject: fanLetters.subject,
        content: fanLetters.content,
        receivedAt: fanLetters.receivedAt,
        language: fanLetters.language,
        sentiment: fanLetters.sentiment,
        isRead: fanLetters.isRead,
        isStarred: fanLetters.isStarred,
        hasReply: sql<boolean>`case when ${replies.id} is not null then 1 else 0 end`,
    })
        .from(fanLetters)
        .leftJoin(replies, eq(fanLetters.id, replies.letterId))
        .where(whereClause)
        .orderBy(desc(fanLetters.receivedAt))
        .limit(50);

    return letters;
}

export default async function LettersPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
    const resolvedSearchParams = await searchParams;
    const letters = await getLetters(resolvedSearchParams);

    const getSentimentEmoji = (sentiment: string | null) => {
        switch (sentiment) {
            case "positive": return "😊";
            case "neutral": return "😐";
            case "negative": return "😢";
            default: return "😶";
        }
    };

    const getLanguageLabel = (lang: string | null) => {
        const map: Record<string, string> = { ko: "🇰🇷 한국어", en: "🇺🇸 영어", ja: "🇯🇵 일본어", zh: "🇨🇳 중국어" };
        return lang ? map[lang] || lang.toUpperCase() : "알 수 없음";
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">팬레터 목록</h2>
                    <p className="text-neutral-500">팬들의 소중한 메시지를 관리합니다.</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <Input placeholder="이름, 내용 검색..." className="pl-10" />
                    </div>
                    <Button variant="outline" className="gap-2">
                        <Filter className="w-4 h-4" />
                        필터
                    </Button>
                </div>
            </div>

            <div className="grid gap-4">
                {letters.length === 0 ? (
                    <div className="py-20 text-center bg-neutral-50 rounded-xl border-2 border-dashed border-neutral-200">
                        <Mail className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-neutral-600">수신된 편지가 없습니다.</h3>
                        <p className="text-neutral-400">새로운 소식을 기다려 볼까요?</p>
                    </div>
                ) : (
                    letters.map((letter) => (
                        <Link key={letter.id} href={`/dashboard/letters/${letter.id}`}>
                            <Card className={`group border-none shadow-sm hover:shadow-md transition-all ${!letter.isRead ? 'bg-white border-l-4 border-l-black' : 'bg-neutral-50/50'}`}>
                                <CardContent className="p-0">
                                    <div className="flex items-start p-6 gap-6">
                                        <div className="flex-1 space-y-3 min-w-0">
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-lg text-neutral-900 truncate">
                                                    {maskName(letter.senderName)}
                                                </span>
                                                <span className="text-sm text-neutral-400 truncate hidden md:inline">
                                                    {maskEmail(letter.senderEmail)}
                                                </span>
                                                <div className="flex gap-2">
                                                    <Badge variant="secondary" className="bg-white border-neutral-200">
                                                        {getLanguageLabel(letter.language)}
                                                    </Badge>
                                                    <Badge variant="secondary" className="bg-white border-neutral-200 gap-1">
                                                        <span>{getSentimentEmoji(letter.sentiment)}</span>
                                                        {letter.sentiment === 'positive' ? '긍정' : letter.sentiment === 'negative' ? '부정' : '중립'}
                                                    </Badge>
                                                    {letter.hasReply && (
                                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                                                            답장완료
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-neutral-600 line-clamp-1 text-base tracking-tight leading-relaxed">
                                                {letter.subject || letter.content}
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end justify-between gap-4 h-full shrink-0">
                                            <div className="flex items-center gap-3 text-neutral-400 text-sm">
                                                <Clock className="w-3.5 h-3.5" />
                                                {letter.receivedAt ? DateTime.fromISO(letter.receivedAt).toFormat("yyyy.MM.dd HH:mm") : "-"}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {letter.isStarred && <Star className="w-4 h-4 text-orange-400 fill-orange-400" />}
                                                <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-neutral-900 transition-colors" />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
