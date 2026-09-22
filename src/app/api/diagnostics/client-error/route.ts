import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Sink for src/app/error.tsx's own auto-capture — see that file's comment
 * for why this exists (a "This page couldn't load" report that couldn't be
 * reproduced from outside the reporter's own session/network). Intentionally
 * open to a signed-out caller too (the boundary can catch an error for one),
 * best-effort only: this must never itself throw in a way that blocks the
 * page recovering, so every failure here is swallowed. Not rate-limited —
 * traffic to this route is bounded by how often error.tsx actually catches
 * something, which is the exact signal being measured. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = typeof body?.message === "string" ? body.message.slice(0, 2000) : "";
    if (!message) return NextResponse.json({ ok: false }, { status: 400 });

    const session = await auth().catch(() => null);
    await prisma.clientErrorReport.create({
      data: {
        userId: session?.user?.id ?? null,
        message,
        digest: typeof body?.digest === "string" ? body.digest.slice(0, 200) : null,
        stack: typeof body?.stack === "string" ? body.stack.slice(0, 4000) : null,
        url: typeof body?.url === "string" ? body.url.slice(0, 500) : "unknown",
        userAgent: typeof body?.userAgent === "string" ? body.userAgent.slice(0, 300) : null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("client-error report failed:", err);
    return NextResponse.json({ ok: false }, { status: 200 }); // 200 on purpose — the caller never retries on this
  }
}
