// Shared sessionStorage key between RegisterForm (writes it) and
// ReferralClaimer (reads/clears it) — kept in its own tiny module so
// neither client component needs to import from the other.
export const REFERRAL_STORAGE_KEY = "travi_pending_referral";
