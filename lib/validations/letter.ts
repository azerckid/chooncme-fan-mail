import { z } from "zod";

export const createLetterSchema = z.object({
    // 필수 필드
    emailId: z.string().min(1, "Email ID is required"),
    senderName: z.string().min(1, "Sender name is required").max(100),
    senderEmail: z.string().email("Invalid email address"),
    content: z.string().min(1, "Content cannot be empty"),

    // 선택 필드
    subject: z.string().optional(),
    receivedAt: z.string().datetime().optional(), // ISO 8601 string expected

    // 분석 데이터 (선택)
    language: z.string().length(2).optional(),  // ISO 639-1 (e.g. 'ko', 'en')
    country: z.string().length(2).optional(),   // ISO 3166-1 alpha-2 (e.g. 'KR', 'US')
    sentiment: z.enum(["positive", "neutral", "negative", "love", "support", "joy", "gratitude", "longing", "sadness", "concern", "neutral"]).optional(),
    sentimentScore: z.number().min(0).max(1).optional(),
    topics: z.array(z.string()).optional(),
});

export type CreateLetterInput = z.infer<typeof createLetterSchema>;
