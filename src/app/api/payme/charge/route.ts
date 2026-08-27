import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PLANS, type PlanKey } from "@/lib/plans";
import { awardReferralCreditIfEligible } from "@/lib/referral";

const ChargeSchema = z.object({
  subscriptionId: z.string(),
  token: z.string(),
});

/**
 * Exchanges a PayMe hosted-fields token for an actual charge via their
 * generate-sale API, then marks the subscription active on success.
 *
 * Base URL, auth header, and body fields were verified with live probes
 * (fake buyer_key, no real card ever touched) against both
 * https://sandbox.payme.io/api and https://live.payme.io/api — note
 * bare payme.io is just their WordPress marketing site and 301s away, the
 * real production API host is live.payme.io. For a standalone (non-marketplace)
 * account, PAYME_SELLER_ID is the same value as PAYME_API_KEY — confirmed
 * live: passing the API key as seller_payme_id moved the error from "seller
 * not found" to "buyer not found" (i.e. seller lookup succeeded, only the
 * placeholder token failed, as expected). Still run one real transaction in
 * sandbox before ever setting PAYME_TEST_MODE=false.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "יש להתחבר" }, { status: 401 });
  }

  const apiKey = process.env.PAYME_API_KEY;
  const sellerPaymeId = process.env.PAYME_SELLER_ID;
  if (!apiKey || !sellerPaymeId) {
    return NextResponse.json({ error: "PayMe לא מוגדר במלואו בשרת - חסר Seller/Marchant ID" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const parsed = ChargeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }
  const { subscriptionId, token } = parsed.data;

  const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
  if (!subscription || subscription.userId !== session.user.id) {
    return NextResponse.json({ error: "מנוי לא נמצא" }, { status: 404 });
  }
  if (subscription.status === "active") {
    return NextResponse.json({ ok: true });
  }

  const testMode = process.env.PAYME_TEST_MODE !== "false";
  const baseUrl = testMode ? "https://sandbox.payme.io/api" : "https://live.payme.io/api";
  const planName = PLANS[subscription.planKey as PlanKey]?.name ?? "מנוי עודד המנקד";

  let payMeResponse: Response;
  try {
    payMeResponse = await fetch(`${baseUrl}/generate-sale`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        seller_payme_id: sellerPaymeId,
        sale_type: "sale",
        sale_price: subscription.amountCents,
        currency: subscription.currency,
        product_name: planName,
        buyer_key: token,
        // Correlates PayMe's async server-to-server callback (see
        // /api/payme/callback) back to this row — that callback, not this
        // synchronous response, is the authoritative confirmation the sale
        // actually completed (per PayMe's own docs: generate-sale can return
        // a sale_url to redirect the buyer to rather than settling inline).
        transaction_id: subscription.paymentSessionId,
        sale_callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payme/callback`,
      }),
    });
  } catch {
    return NextResponse.json({ error: "לא הצלחנו להתחבר ל-PayMe" }, { status: 502 });
  }

  // Verified against PayMe's real API docs (docs.payme.io/docs/payments —
  // "Generate Sale with Token" + "Sale Callbacks"): the response's own
  // success/failure indicator is `status_code` (0 = success, 1 = error) —
  // NOT `status_error_code`, which only appears on an error response as the
  // error's ID, never as a boolean-ish success flag. The earlier version of
  // this check tested the wrong field entirely, and since a success response
  // never has status_error_code, that field is always falsy either way — an
  // actual PayMe-side failure would have been silently treated as success
  // and activated the subscription anyway.
  const payMeBody = await payMeResponse.json().catch(() => null);
  if (!payMeResponse.ok || !payMeBody || payMeBody.status_code !== 0) {
    const detail = payMeBody?.status_error_details ?? "";
    return NextResponse.json({ error: `התשלום נכשל ${detail ? `- ${detail}` : ""}`.trim() }, { status: 402 });
  }

  // Activate immediately for a fast, correct UX in the normal case (this is
  // a direct token charge, not the redirect/iframe flow — status_code 0
  // here really does mean the card was charged). The /api/payme/callback
  // webhook independently does the exact same update from PayMe's own
  // server-to-server notification, so activation still happens even if this
  // response never reaches us (browser closed, network dropped, mobile app
  // backgrounded — all *after* PayMe already charged the card) — that gap,
  // with zero recovery path, was the original bug this replaced.
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: "active",
      paidAt: new Date(),
      // Only payme_sale_id appears on this synchronous response; the
      // distinct payme_transaction_id only appears on the callback payload
      // (see /api/payme/callback) — this response's own `transaction_id`
      // field just echoes back what we sent (our paymentSessionId).
      ...(payMeBody.payme_sale_id ? { paymeSaleId: String(payMeBody.payme_sale_id) } : {}),
    },
  });
  await awardReferralCreditIfEligible(subscription.userId);
  return NextResponse.json({ ok: true });
}
