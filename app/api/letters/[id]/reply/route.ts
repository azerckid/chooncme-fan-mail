import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { replies } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: rawId } = await params;
        const letterId = parseInt(rawId);
        if (isNaN(letterId)) {
            return NextResponse.json({ success: false, error: "Invalid Letter ID" }, { status: 400 });
        }

        const item = await db.query.replies.findFirst({
            where: eq(replies.letterId, letterId),
        });

        if (!item) {
            return NextResponse.json({ success: false, error: "Reply not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: item });
    } catch (error) {
        console.error("[API_REPLIES_GET_ERROR]", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: rawId } = await params;
        const letterId = parseInt(rawId);
        if (isNaN(letterId)) {
            return NextResponse.json({ success: false, error: "Invalid Letter ID" }, { status: 400 });
        }

        const { content } = await req.json();
        if (!content) {
            return NextResponse.json({ success: false, error: "Content is required" }, { status: 400 });
        }

        const result = await db.insert(replies).values({
            letterId,
            content,
        }).returning();

        return NextResponse.json({ success: true, data: result[0] }, { status: 201 });
    } catch (error) {
        console.error("[API_REPLIES_POST_ERROR]", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
