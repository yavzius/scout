import type { SearchSession, ExtractedArticle } from "../types.js";

// ── Status (stderr) ─────────────────────────────────────────────────────────

export function status(message: string): void {
  console.error(message);
}

// ── Search Results ──────────────────────────────────────────────────────────

export function printSearchResults(session: SearchSession, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(session, null, 2));
    return;
  }

  console.log(`[${session.id}] ${session.results.length} results`);

  for (let i = 0; i < session.results.length; i++) {
    const r = session.results[i]!;
    const domain = new URL(r.url).hostname.replace("www.", "");
    const date = r.publishedDate
      ? ` | ${r.publishedDate.includes("T") ? r.publishedDate.slice(0, 10) : r.publishedDate}`
      : "";
    const author = r.author && !domain.includes(r.author.toLowerCase().replace(/\s/g, ""))
      ? ` — ${r.author.slice(0, 30)}`
      : "";

    console.log(`\n${"═".repeat(70)}`);
    console.log(`[${i + 1}] ${r.title.slice(0, 80)}${author} | ${domain}${date}`);
    console.log(r.url);

    const isMetadataSummary = !r.summary || /\d+ (points|comments|pts)/.test(r.summary);
    if (r.text && isMetadataSummary) {
      console.log(`    ${r.text}`);
    } else if (r.summary) {
      console.log(`    ${r.summary}`);
    }
  }

  const topN = Math.min(3, session.results.length);
  const indices = Array.from({ length: topN }, (_, i) => i + 1).join(",");
  console.log(`\nscout '?${session.id}:${indices}'`);
}

// ── Extracted Articles ──────────────────────────────────────────────────────

export function printArticles(articles: ExtractedArticle[], json: boolean): void {
  if (json) {
    console.log(JSON.stringify(articles, null, 2));
    return;
  }

  for (const article of articles) {
    console.log(`\n${"═".repeat(70)}`);
    console.log(`[${article.index}] ${article.title}`);
    console.log(`${"═".repeat(70)}\n`);
    console.log(article.content);
  }
}

// ── Cache Stats ─────────────────────────────────────────────────────────────

export function printCacheStats(
  stats: { valid: number; expired: number; totalSizeKB: string },
  directory: string,
  json: boolean,
): void {
  if (json) {
    console.log(JSON.stringify({ ...stats, directory, ttlHours: 24 }, null, 2));
    return;
  }

  console.log(`Cache: ${stats.valid} valid, ${stats.expired} expired, ${stats.totalSizeKB} KB total`);
  console.log(`Location: ${directory}`);
  console.log("TTL: 24 hours");
  if (stats.expired > 0) {
    console.log("\nRun 'scout cache clear' to remove expired items.");
  }
}
