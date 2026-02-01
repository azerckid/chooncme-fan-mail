"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

interface ReplyFormProps {
    letterId: number;
    initialReply?: string;
    isSent?: boolean;
}

export function ReplyForm({ letterId, initialReply, isSent }: ReplyFormProps) {
    const [content, setContent] = useState(initialReply || "");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    const handleSubmit = async () => {
        if (!content.trim()) {
            toast.error("답장 내용을 입력해 주세요.");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/letters/${letterId}/reply`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
            });

            if (!response.ok) throw new Error("발송 실패");

            toast.success("답장이 성공적으로 저장되었습니다.");
            router.refresh();
        } catch (error) {
            toast.error("저장 중 오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="border-none shadow-sm bg-white">
            <CardHeader>
                <CardTitle className="text-lg">춘심이의 답장 작성</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Textarea
                    placeholder="팬에게 전할 따뜻한 말을 적어주세요..."
                    className="min-h-[200px] text-base leading-relaxed p-4 bg-neutral-50/50 focus-visible:ring-1 focus-visible:ring-neutral-200"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={isSent}
                />
                <div className="flex justify-end">
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || isSent || !content.trim()}
                        className="gap-2 px-8 py-6 text-lg font-bold rounded-xl"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                        {isSent ? "이미 발송됨" : "답장 저장하기"}
                    </Button>
                </div>
                {isSent && (
                    <p className="text-sm text-neutral-400 text-center italic">
                        이 답장은 이미 이메일로 팬에게 전달되었습니다.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
