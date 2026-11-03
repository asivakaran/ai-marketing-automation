import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { extractSession, verifySessionToken } from "@/lib/auth";

type Action = "generate-draft" | "respond";

export async function POST(req: NextRequest) {
  const token = extractSession(req);
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Sign in first." } },
      { status: 401 }
    );
  }

  const body = (await req.json()) as { action?: Action; reviewId?: string; response?: string };
  if (!body.reviewId || !body.action) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION", message: "reviewId and action are required." } },
      { status: 400 }
    );
  }

  const review = await db.review.findFirst({
    where: { id: body.reviewId, tenantId: session.tenantId },
  });
  if (!review) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Review not found." } },
      { status: 404 }
    );
  }

  if (body.action === "generate-draft") {
    // Deterministic drafting (mock-AI). When OPENAI_API_KEY is set this is where a
    // lib/ai.ts call would generate the draft — kept simple by design for the weekend build.
    const first = review.authorName.split(" ")[0] ?? "there";
    const draft =
      review.rating >= 4
        ? `Thank you for the kind words, ${first}! I'll pass this on to the team — reviews like this are what keep the standards high. If you ever need anything, you know where we are. — Dave, ${review.platform === "GOOGLE" ? "Google" : "Facebook"} team at Apex Roofing`
        : `Thank you for the honest feedback, ${first} — and I'm sorry your experience fell short. That isn't the standard we hold ourselves to. Please call the office on 01494 555010 and ask for Dave directly; I'd like to put it right. — Dave, Apex Roofing`;

    await db.review.update({
      where: { id: review.id },
      data: { draftResponse: draft, status: "DRAFTED" },
    });
    return NextResponse.json({ success: true, data: { draft } });
  }

  if (body.action === "respond") {
    const response = body.response?.trim() || review.draftResponse || "";
    if (!response) {
      return NextResponse.json(
        { success: false, error: { code: "NO_RESPONSE", message: "Nothing to publish." } },
        { status: 400 }
      );
    }
    await db.review.update({
      where: { id: review.id },
      data: { response, respondedAt: new Date(), status: "RESPONDED" },
    });
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: "review.responded",
        entity: "review",
        entityId: review.id,
        meta: { platform: review.platform, rating: review.rating },
      },
    });
    return NextResponse.json({ success: true, data: { responded: true } });
  }

  return NextResponse.json(
    { success: false, error: { code: "BAD_ACTION", message: "Unknown action." } },
    { status: 400 }
  );
}
