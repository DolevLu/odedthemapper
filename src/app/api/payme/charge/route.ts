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
    return NextResponse.json({ error: "PayMe לא מוגדר במלואו בשרת — חסר Seller/Marchant ID" }, { status: 500 });
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
      }),
    });
  } catch {
    return NextResponse.json({ error: "לא הצלחנו להתחבר ל-PayMe" }, { status: 502 });
  }

  // PayMe's error shape (confirmed live): { status_code, status_error_code,
  // status_error_details, status_additional_info, session }. Success shape
  // isn't independently confirmed (never reached one — that needs a real
  // card), so treat any non-2xx or any present status_error_code as failure.
  const payMeBody = await payMeResponse.json().catch(() => null);
  if (!payMeResponse.ok || !payMeBody || payMeBody.status_error_code) {
    const detail = payMeBody?.status_error_details ?? "";
    return NextResponse.json({ error: `התשלום נכשל ${detail ? `— ${detail}` : ""}`.trim() }, { status: 402 });
  }

  await prisma.subscription.update({ where: { id: subscription.id }, data: { status: "active" } });
  await awardReferralCreditIfEligible(subscription.userId);
  return NextResponse.json({ ok: true });
}
