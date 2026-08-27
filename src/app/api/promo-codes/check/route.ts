import { NextResponse } from "next/server";
import { resolvePromoCode } from "@/lib/promoCodes";

/** Public, read-only discount lookup for the checkout form's live preview
 * (see DestinationPicker/OrgConfirmButton) — only ever returns a discount
 * fraction, never the code's partner name, usage count, or existence as a
 * distinct "invalid" vs "no code" state, so it can't be used to enumerate
 * real codes. */
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  const promo = await resolvePromoCode(code);
  return NextResponse.json({ discount: promo?.discount ?? 0 });
}
