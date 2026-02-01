import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { replies } from "@/db/schema";
import { eq } from "drizzle-orm";

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

        const { emailSent } = await req.json();
        if (typeof emailSent !== "boolean") {
            return NextResponse.json({ success: false, error: "emailSent (boolean) is required" }, { status: 400 });
        }

        const result = await db.update(replies)
            .set({
                emailSent,
                emailSentAt: emailSent ? new Date().toISOString() : null
            })
            .where(eq(replies.id, id))
            .returning();

        if (result.length === 0) {
            return NextResponse.json({ success: false, error: "Reply not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: result[0] });
    } catch (error) {
        console.error("[API_REPLIES_ID_PATCH_ERROR]", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
