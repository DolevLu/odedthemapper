/** Per-browser daily budget for Google Maps Platform calls made straight from the client (Places search /
 * autocomplete / details, Directions). Those requests are billed to the app's public key and never touch our
 * server, so this is the only in-code brake on them: a casual-abuse / runaway-loop guard, deliberately generous
 * for real trip planning. It is NOT hard protection — someone can clear storage — so the real ceiling must still
 * be a Google Cloud Console quota + budget alert (see the note in lib/apiQuota.ts's callers / the owner hand-off). */
const LIMITS = { places: 600, directions: 150 } as const;

export function takeGoogleBudget(kind: keyof typeof LIMITS, units = 1): boolean {
  try {
    const day = new Date().toISOString().slice(0, 10);
    const key = `gbudget:${kind}`;
    const raw = localStorage.getItem(key);
    let state: { day: string; n: number } = { day, n: 0 };
    if (raw) {
      const parsed = JSON.parse(raw) as { day: string; n: number };
      if (parsed.day === day) state = parsed;
    }
    if (state.n + units > LIMITS[kind]) return false;
    state.n += units;
    localStorage.setItem(key, JSON.stringify(state));
    return true;
  } catch {
    // Storage blocked (private mode etc.) — don't break search over the guard itself.
    return true;
  }
}
