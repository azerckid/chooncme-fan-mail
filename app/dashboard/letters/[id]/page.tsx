import { db } from "@/db";
import { fanLetters, replies } from "@/db/schema";
import { eq, and, ne, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { ReplyForm } from "@/components/dashboard/letters/reply-form";
import Link from "next/link";
import { ChevronLeft, Calendar, MapPin, Smile, Heart, History } from "lucide-react";
import { DateTime } from "luxon";

async function getLetterDetail(id: number) {
    const item = await db.query.fanLetters.findFirst({
        where: eq(fanLetters.id, id),
    });

    if (!item) return null;

    const reply = await db.query.replies.findFirst({
        where: eq(replies.letterId, id),
    });

    // 같은 발신자의 다른 편지 조회 (최근 5개)
    const senderHistory = await db.query.fanLetters.findMany({
        where: and(
            eq(fanLetters.senderEmail, item.senderEmail),
            ne(fanLetters.id, id)
        ),
        orderBy: [desc(fanLetters.receivedAt)],
        limit: 5,
    });

    // 읽음 표시 업데이트 (비동기)
    if (!item.isRead) {
        await db.update(fanLetters).set({ isRead: true }).where(eq(fanLetters.id, id));
    }

    return { ...item, reply, senderHistory };
}

export default async function LetterDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const data = await getLetterDetail(parseInt(id));

    if (!data) notFound();

    const topics = data.topics ? JSON.parse(data.topics) : [];

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex items-center justify-between">
                <Link
                    href="/dashboard/letters"
                    className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors group"
                >
                    <div className="p-2 rounded-full group-hover:bg-neutral-100">
                        <ChevronLeft className="w-5 h-5" />
                    </div>
                    목록으로 돌아가기
                </Link>
                <div className="flex gap-2">
                    <Badge variant="outline" className="text-neutral-500">{data.emailId}</Badge>
                </div>
            </div>

            <div className="grid gap-8 md:grid-cols-12">
                <div className="md:col-span-8 space-y-8">
                    {/* Fan Letter Content */}
                    <section className="bg-white rounded-3xl p-8 border shadow-sm space-y-6">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center text-white font-bold text-xl">
                                    {data.senderName[0]}
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold">{data.senderName}</h1>
                                    <p className="text-neutral-400 text-sm">{data.senderEmail}</p>
                                </div>
                            </div>
                            <div className="text-right text-neutral-400 text-sm">
                                <div className="flex items-center gap-2 justify-end">
                                    <Calendar className="w-4 h-4" />
                                    {data.receivedAt ? DateTime.fromISO(data.receivedAt).toFormat("yyyy년 MM월 dd일 HH:mm") : "-"}
                                </div>
                            </div>
                        </div>

                        <hr className="border-neutral-100" />

                        <div className="space-y-4">
                            {data.subject && <h2 className="text-xl font-bold text-neutral-900">{data.subject}</h2>}
                            <div className="text-lg leading-relaxed text-neutral-700 whitespace-pre-wrap font-medium">
                                {data.content}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-4">
                            {topics.map((topic: string) => (
                                <Badge key={topic} className="bg-neutral-100 text-neutral-600 hover:bg-neutral-200 border-none px-3 py-1">
                                    #{topic}
                                </Badge>
                            ))}
                        </div>
                    </section>

                    {/* Reply Section */}
                    <ReplyForm
                        letterId={data.id}
                        initialReply={data.reply?.content}
                        isSent={data.reply?.emailSent ?? false}
                    />
                </div>

                {/* Sidebar Info */}
                <div className="md:col-span-4 space-y-6">
                    <Card className="border-none shadow-sm bg-neutral-50/50">
                        <CardHeader>
                            <CardTitle className="text-md flex items-center gap-2">
                                <Smile className="w-4 h-4 text-neutral-500" />
                                분석 리포트
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-xs text-neutral-400 uppercase tracking-wider">감정 분석</p>
                                <div className="flex items-center justify-between font-medium">
                                    <span>
                                        {data.sentiment === 'positive' ? '😊 긍정적' : data.sentiment === 'negative' ? '😢 부정적' : '😐 중립적'}
                                    </span>
                                    <span className="text-neutral-400">{Math.round((data.sentimentScore || 0) * 100)}%</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <p className="text-xs text-neutral-400 uppercase tracking-wider">언어 / 지역</p>
                                <div className="flex items-center gap-2 font-medium">
                                    <MapPin className="w-4 h-4 text-neutral-300" />
                                    {data.language?.toUpperCase()} / {data.country || "알 수 없음"}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="p-6 bg-orange-50 rounded-2xl border border-orange-100 space-y-3">
                        <h4 className="font-bold text-orange-900 flex items-center gap-2 text-sm">
                            <Heart className="w-4 h-4 fill-orange-500 text-orange-500" />
                            춘심님께 드리는 팁
                        </h4>
                        <p className="text-xs text-orange-800 leading-normal">
                            팬분께서 정성스럽게 적어주신 편지입니다.
                            {data.sentiment === 'negative' ? ' 조금 속상한 일이 있으신 것 같아요. 따뜻한 위로를 부탁드려요.' : ' 춘심이의 밝은 에너지를 담아 즐겁게 답장해 주세요!'}
                        </p>
                    </div>

                    {/* Sender History */}
                    {data.senderHistory && data.senderHistory.length > 0 && (
                        <Card className="border-none shadow-sm bg-neutral-50/50">
                            <CardHeader>
                                <CardTitle className="text-md flex items-center gap-2">
                                    <History className="w-4 h-4 text-neutral-500" />
                                    이 팬의 이전 편지 ({data.senderHistory.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {data.senderHistory.map((letter) => (
                                    <Link
                                        key={letter.id}
                                        href={`/dashboard/letters/${letter.id}`}
                                        className="block p-3 rounded-xl bg-white hover:bg-neutral-100 transition-colors border border-neutral-100"
                                    >
                                        <p className="text-sm font-medium text-neutral-900 truncate">
                                            {letter.subject || "(제목 없음)"}
                                        </p>
                                        <p className="text-xs text-neutral-400 mt-1">
                                            {letter.receivedAt
                                                ? DateTime.fromISO(letter.receivedAt).toFormat("yyyy.MM.dd")
                                                : "-"}
                                        </p>
                                    </Link>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
