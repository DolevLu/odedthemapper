/** Server-side helpers for "share a reel into Travi": find the link inside whatever text the share sheet handed us,
 * recognize the platform, and read the public preview metadata of the post (caption, author, thumbnail) the same way a
 * link preview does. Only a fixed list of social hosts is ever fetched (no arbitrary-URL fetching = no SSRF), redirects
 * are followed manually and re-checked at every hop, and the response size/time is capped. No paid API is involved:
 * TikTok's public oEmbed endpoint and the Open Graph tags Instagram/Facebook publish for link previews. */

export type SocialPlatform = "instagram" | "tiktok" | "facebook";

const HOSTS: { re: RegExp; platform: SocialPlatform }[] = [
  { re: /(^|\.)instagram\.com$/i, platform: "instagram" },
  { re: /(^|\.)instagr\.am$/i, platform: "instagram" },
  { re: /(^|\.)tiktok\.com$/i, platform: "tiktok" },
  { re: /(^|\.)facebook\.com$/i, platform: "facebook" },
  { re: /(^|\.)fb\.watch$/i, platform: "facebook" },
  { re: /(^|\.)fb\.me$/i, platform: "facebook" },
];

export function platformForHost(host: string): SocialPlatform | null {
  return HOSTS.find((h) => h.re.test(host))?.platform ?? null;
}

export function platformForUrl(url: string): SocialPlatform | null {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? platformForHost(u.hostname) : null;
  } catch {
    return null;
  }
}

/** First supported social URL inside free text (a share sheet usually sends "caption text https://..."). */
export function extractSocialUrl(raw: string): string | null {
  const matches = raw.match(/https?:\/\/[^\s<>"')\]]+/gi) ?? [];
  for (const m of matches) {
    const cleaned = m.replace(/[.,;!?]+$/, "");
    if (platformForUrl(cleaned)) return cleaned;
  }
  return null;
}

/** Drops tracking junk (igsh=, utm_*, fbclid...) so the same reel always maps to the same stored link. */
export function canonicalSocialUrl(url: string): string {
  try {
    const u = new URL(url);
    for (const k of [...u.searchParams.keys()]) {
      if (/^(igsh|igshid|utm_.+|fbclid|_r|_t|is_from_webapp|sender_device|sender_web_id|share_.+|refer|checksum|u_code|timestamp|user_id|sec_user_id|tt_from|_d|share_app_id)$/i.test(k)) u.searchParams.delete(k);
    }
    u.hash = "";
    return u.toString();
  } catch {
    return url;
  }
}

const MAX_BYTES = 1_500_000;
const UA = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";

async function fetchText(url: string, accept = "text/html", hops = 4): Promise<{ text: string; finalUrl: string } | null> {
  let current = url;
  for (let i = 0; i <= hops; i++) {
    if (!platformForUrl(current)) return null; // every hop must stay on an allowed social host
    let res: Response;
    try {
      res = await fetch(current, { redirect: "manual", headers: { "User-Agent": UA, Accept: accept, "Accept-Language": "en-US,en;q=0.8" }, signal: AbortSignal.timeout(8000) });
    } catch {
      return null;
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return null;
      try {
        current = new URL(loc, current).toString();
      } catch {
        return null;
      }
      continue;
    }
    if (!res.ok) return null;
    const reader = res.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      size += value.length;
    }
    reader.cancel().catch(() => {});
    return { text: new TextDecoder("utf-8").decode(Buffer.concat(chunks)), finalUrl: current };
  }
  return null;
}

const decodeEntities = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

function metaContent(html: string, prop: string): string | null {
  const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, "i");
  const m = html.match(re1) ?? html.match(re2);
  return m ? decodeEntities(m[1]).trim() || null : null;
}

export type SocialPost = {
  platform: SocialPlatform;
  url: string;
  canonicalUrl: string;
  title: string | null;
  caption: string | null;
  author: string | null;
  thumbnail: string | null;
};

/** Instagram/Facebook put "123 likes, 4 comments - user on Date: "the caption"" in og:description. */
function captionFromOg(description: string | null, title: string | null): { caption: string | null; author: string | null } {
  let author: string | null = null;
  let caption: string | null = null;
  if (description) {
    const quoted = description.match(/:\s*["“]([\s\S]*)["”]\.?\s*$/);
    if (quoted) caption = quoted[1].trim();
    const a = description.match(/-\s*([\w.]+)\s+on\s+[A-Z]/);
    if (a) author = a[1];
  }
  if (!caption && title) {
    const q = title.match(/on (?:Instagram|Facebook):\s*["“]([\s\S]*)["”]$/);
    if (q) caption = q[1].trim();
    const a = title.match(/^(.+?)\s+on (?:Instagram|Facebook)/);
    if (a && !author) author = a[1].trim();
  }
  if (!caption) caption = description ?? title;
  return { caption: caption ? caption.slice(0, 1500) : null, author };
}

export async function readSocialPost(url: string): Promise<SocialPost | null> {
  const platform = platformForUrl(url);
  if (!platform) return null;
  const canonicalUrl = canonicalSocialUrl(url);

  if (platform === "tiktok") {
    // Short links (vm./vt.tiktok.com) are resolved by the oEmbed endpoint itself.
    const o = await fetchText(`https://www.tiktok.com/oembed?url=${encodeURIComponent(canonicalUrl)}`, "application/json");
    if (o) {
      try {
        const j = JSON.parse(o.text) as { title?: string; author_name?: string; thumbnail_url?: string };
        if (j.title || j.thumbnail_url) {
          return { platform, url, canonicalUrl, title: j.title?.slice(0, 200) ?? null, caption: (j.title ?? "").slice(0, 1500) || null, author: j.author_name ?? null, thumbnail: j.thumbnail_url ?? null };
        }
      } catch {
        /* fall through to OG */
      }
    }
  }

  const page = await fetchText(canonicalUrl);
  if (!page) return null;
  const html = page.text;
  const ogTitle = metaContent(html, "og:title");
  const ogDesc = metaContent(html, "og:description") ?? metaContent(html, "description");
  const ogImage = metaContent(html, "og:image");
  if (!ogTitle && !ogDesc && !ogImage) return null;
  const { caption, author } = captionFromOg(ogDesc, ogTitle);
  return { platform, url, canonicalUrl: canonicalSocialUrl(page.finalUrl), title: ogTitle?.slice(0, 200) ?? null, caption, author, thumbnail: ogImage };
}

/** Cheap, no-AI place hints from the caption: a 📍 line, "Location:", and city-ish hashtags. Used as the fallback
 * when AI is unavailable or over its daily cap, and as extra context for the AI when it is. */
export function heuristicHints(caption: string | null): { pinLines: string[]; hashtags: string[]; mentions: string[] } {
  const text = caption ?? "";
  const pinLines = text
    .split(/\n|·|\|/)
    .map((l) => l.trim())
    .filter((l) => /📍|📌|🗺|location\s*:|where\s*:|איפה\s*:|מיקום\s*:/i.test(l))
    .map((l) => l.replace(/📍|📌|🗺️?|location\s*:|where\s*:|איפה\s*:|מיקום\s*:/gi, "").trim())
    .filter(Boolean)
    .slice(0, 4);
  const hashtags = [...text.matchAll(/#([\p{L}\p{N}_]+)/gu)].map((m) => m[1]).slice(0, 25);
  const mentions = [...text.matchAll(/@([\w.]+)/g)].map((m) => m[1]).slice(0, 10);
  return { pinLines, hashtags, mentions };
}
