import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { fanLetters } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: rawId } = await params;
        const id = parseInt(rawId);
        if (isNaN(id)) {
            return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
        }

        const item = await db.query.fanLetters.findFirst({
            where: eq(fanLetters.id, id),
        });

        if (!item) {
            return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: {
                ...item,
                topics: item.topics ? JSON.parse(item.topics) : [],
            }
        });
    } catch (error) {
        console.error("[API_LETTERS_ID_GET_ERROR]", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: rawId } = await params;
        const id = parseInt(rawId);
        if (isNaN(id)) {
            return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
        }

        const body = await req.json();
        const { isRead, isStarred } = body;

        const updateData: Partial<typeof fanLetters.$inferInsert> = {};
        if (typeof isRead === "boolean") updateData.isRead = isRead;
        if (typeof isStarred === "boolean") updateData.isStarred = isStarred;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 });
        }

        const result = await db.update(fanLetters)
            .set(updateData)
            .where(eq(fanLetters.id, id))
            .returning();

        if (result.length === 0) {
            return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: result[0] });
    } catch (error) {
        console.error("[API_LETTERS_ID_PATCH_ERROR]", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
