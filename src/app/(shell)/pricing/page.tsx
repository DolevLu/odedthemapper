import { redirect } from "next/navigation";

/** One simple price now (₪49 per country, one time) - it lives on the landing page next to the destinations. */
export default function PricingPage() {
  redirect("/#destinations");
}
