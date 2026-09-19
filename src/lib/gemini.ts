// Gemini retires and overloads model names often (an alias can answer 503 for
// minutes; whole model families come back 404). Try a short chain instead of
// hard-coding one, and only give up when every model has failed.
const MODELS = ["gemini-flash-latest", "gemini-3.5-flash", "gemini-3.1-flash-lite"];
const RETRY_STATUSES = new Set([404, 429, 500, 503]);

/** POSTs a generateContent request, falling through the model chain on
 * overload/retirement. Returns the first OK response, else the last response
 * seen (so callers can log the status), else null when nothing was reachable
 * or there is no API key. */
export async function geminiGenerate(body: unknown, timeoutMs = 20000): Promise<Response | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  let last: Response | null = null;
  for (const model of MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) return res;
      last = res;
      if (!RETRY_STATUSES.has(res.status)) return res;
    } catch {
      // timeout or network error on this model - try the next one
    }
  }
  return last;
}
