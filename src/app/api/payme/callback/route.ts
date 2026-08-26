import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { awardReferralCreditIfEligible } from "@/lib/referral";

/**
 * PayMe's own server-to-server sale notification (docs.payme.io/docs/guides
 * — "Sale Callbacks"). This is the authoritative confirmation a charge
 * actually completed — /api/payme/charge already activates the subscription
 * on its own synchronous response for a fast UX, but that request can fail
 * to ever reach us (browser closed, network dropped, mobile app
 * backgrounded) *after* PayMe already charged the card, with no recovery.
 * This webhook is that recovery path, delivered independently by PayMe
 * regardless of what happened to the browser's own request.
 *
 * Body is application/x-www-form-urlencoded, NOT JSON (confirmed in PayMe's
 * docs) — every field arrives as a string.
 *
 * Signature verification (payme_signature) is NOT implemented: PayMe's
 * public docs show the field exists but never document the algorithm that
 * produces it (not MD5-of-anything-obvious we could confirm, not the HMAC
 * scheme HSBC's unrelated "PayMe" product uses). Confirm the real algorithm
 * with PayMe support/the merchant dashboard before treating this as fully
 * hardened — in the meantime the practical exposure is bounded, since a
 * forged callback can only affect a `transaction_id` matching an existing
 * subscription's own server-generated, unguessable `paymentSessionId` (a
 * cuid), never create a new charge or move real money.
 */
export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const raw = await request.text();
  const params = contentType.includes("json") ? new URLSearchParams(JSON.parse(raw)) : new URLSearchParams(raw);

  const transactionId = params.get("transaction_id");
  const statusCode = params.get("status_code");
  const notifyType = params.get("notify_type");
  const payMeSaleId = params.get("payme_sale_id");
  const payMeTransactionId = params.get("payme_transaction_id");

  if (!transactionId) {
    console.error("PayMe callback missing transaction_id", raw);
    return NextResponse.json({ ok: true }); // 200 regardless — nothing useful to retry
  }

  const subscription = await prisma.subscription.findUnique({ where: { paymentSessionId: transactionId } });
  if (!subscription) {
    console.error("PayMe callback: no subscription for transaction_id", transactionId);
    return NextResponse.json({ ok: true });
  }

  const paymeRefs = {
    ...(payMeSaleId ? { paymeSaleId: payMeSaleId } : {}),
    ...(payMeTransactionId ? { paymeTransactionId: payMeTransactionId } : {}),
  };

  if (statusCode === "0" && (notifyType === "sale-complete" || notifyType === "sale-authorized")) {
    if (subscription.status !== "active") {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: "active", paidAt: new Date(), ...paymeRefs },
      });
      await awardReferralCreditIfEligible(subscription.userId);
    } else if (Object.keys(paymeRefs).length > 0) {
      await prisma.subscription.update({ where: { id: subscription.id }, data: paymeRefs });
    }
  } else if (notifyType === "refund" || notifyType === "sale-chargeback") {
    // Money was returned or disputed — revoke access. A reversed chargeback
    // (sale-chargeback-refund) is deliberately NOT handled here: restoring
    // paid access automatically from a webhook alone is a real-money
    // decision worth a human looking at, not a default.
    await prisma.subscription.update({ where: { id: subscription.id }, data: { status: "canceled", ...paymeRefs } });
  } else if (notifyType === "sale-failure") {
    console.error("PayMe reported sale-failure for subscription", subscription.id, params.get("status_error_details"));
  }

  return NextResponse.json({ ok: true });
}
