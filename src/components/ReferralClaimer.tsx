"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { claimMyReferralCode } from "@/lib/referral";
import { REFERRAL_STORAGE_KEY } from "@/lib/referralStorage";

/**
 * Mounted once app-wide (root layout). RegisterForm stashes a referral code
 * in sessionStorage before a Google OAuth redirect (which navigates fully
 * away and back, losing any in-memory state) — once this component sees an
 * authenticated session with a pending code sitting in storage, it claims it
 * server-side and clears the flag so it never re-fires. No-op on every other
 * page load, since the storage key is normally absent.
 */
export function ReferralClaimer() {
  const { status } = useSession();
  const claimedRef = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || claimedRef.current) return;
    const code = sessionStorage.getItem(REFERRAL_STORAGE_KEY);
    if (!code) return;
    claimedRef.current = true;
    sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
    claimMyReferralCode(code);
  }, [status]);

  return null;
}
