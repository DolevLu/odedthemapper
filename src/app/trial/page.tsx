import { redirect } from "next/navigation";

/** The free week was retired (2026-11): every country is a one-time ₪49 purchase now. */
export default function TrialPage() {
  redirect("/#destinations");
}
