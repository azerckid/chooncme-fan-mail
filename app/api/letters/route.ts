import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { fanLetters } from "@/db/schema";
import { createLetterSchema } from "@/lib/validations/letter";
import { eq, and, or, like, desc, sql, gte, lte } from "drizzle-orm";

export async function POST(req: NextRequest) {
    try {
        // 1. API Secret Key 인증 (Bearer Token 방식)
        const authHeader = req.headers.get("authorization");
        const secretKey = process.env.API_SECRET_KEY;

        if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.split(" ")[1] !== secretKey) {
            return NextResponse.json(
                { success: false, error: { code: "UNAUTHORIZED", message: "Invalid or missing API secret key" } },
                { status: 401 }
            );
        }

        // 2. 요청 바디 파싱
        const body = await req.json();

        // 3. Zod 스키마 검증
        const validation = createLetterSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Invalid input data",
                        details: validation.error.format()
                    }
                },
                { status: 400 }
            );
        }

        const data = validation.data;

        // 4. 중복 확인 (emailId 기준)
        const existing = await db.query.fanLetters.findFirst({
            where: eq(fanLetters.emailId, data.emailId),
        });

        if (existing) {
            return NextResponse.json(
                { success: false, error: { code: "DUPLICATE_EMAIL_ID", message: "This email has already been archived." } },
                { status: 409 }
            );
        }

        // 5. DB 저장
        // topics 배열은 JSON 문자열로 저장
        const result = await db.insert(fanLetters).values({
            emailId: data.emailId,
            subject: data.subject,
            senderName: data.senderName,
            senderEmail: data.senderEmail,
            content: data.content,
            receivedAt: data.receivedAt,
            language: data.language,
            country: data.country,
            sentiment: data.sentiment,
            sentimentScore: data.sentimentScore,
            topics: data.topics ? JSON.stringify(data.topics) : null,
        }).returning({ insertedId: fanLetters.id });

        return NextResponse.json(
            {
                success: true,
                data: {
                    id: result[0].insertedId,
                    message: "Successfully archived."
                }
            },
            { status: 201 }
        );

    } catch (error) {
        console.error("[API_LETTERS_POST_ERROR]", error);
        return NextResponse.json(
            { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred." } },
            { status: 500 }
        );
    }
}
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        // 페이지네이션 파라미터
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const offset = (page - 1) * limit;

        // 필터링 파라미터
        const search = searchParams.get("search");
        const language = searchParams.get("language");
        const country = searchParams.get("country");
        const sentiment = searchParams.get("sentiment");
        const isRead = searchParams.get("isRead");
        const isStarred = searchParams.get("isStarred");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        // Drizzle 조건 구성
        const conditions = [];

        if (search) {
            conditions.push(
                or(
                    like(fanLetters.senderName, `%${search}%`),
                    like(fanLetters.senderEmail, `%${search}%`),
                    like(fanLetters.content, `%${search}%`)
                )
            );
        }

        if (language) conditions.push(eq(fanLetters.language, language));
        if (country) conditions.push(eq(fanLetters.country, country));
        if (sentiment) conditions.push(eq(fanLetters.sentiment, sentiment));
        if (isRead !== null && isRead !== undefined) conditions.push(eq(fanLetters.isRead, isRead === "true"));
        if (isStarred !== null && isStarred !== undefined) conditions.push(eq(fanLetters.isStarred, isStarred === "true"));
        if (startDate) conditions.push(gte(fanLetters.receivedAt, startDate));
        if (endDate) conditions.push(lte(fanLetters.receivedAt, endDate));

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // 데이터 조회
        const data = await db.query.fanLetters.findMany({
            where: whereClause,
            limit: limit,
            offset: offset,
            orderBy: [desc(fanLetters.receivedAt), desc(fanLetters.createdAt)],
        });

        // 전체 카운트 조회 (페이지네이션용)
        const allData = await db.select({ count: sql<number>`count(*)` }).from(fanLetters).where(whereClause);
        const totalCount = allData[0]?.count || 0;

        return NextResponse.json({
            success: true,
            data: {
                items: data.map(item => ({
                    ...item,
                    topics: item.topics ? JSON.parse(item.topics) : [],
                })),
                pagination: {
                    page,
                    limit,
                    totalCount,
                    totalPages: Math.ceil(totalCount / limit),
                }
            }
        });

    } catch (error) {
        console.error("[API_LETTERS_GET_ERROR]", error);
        return NextResponse.json(
            { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch letters" } },
            { status: 500 }
        );
    }
}
