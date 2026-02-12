import type { SearchSession, ExtractedArticle } from "../types.js";

const SEPARATOR = "═".repeat(70);

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

  console.log(`\n[scout:${session.id}] ${session.results.length} results:\n`);

  const display = session.results.slice(0, 10);

  for (let i = 0; i < display.length; i++) {
    const r = display[i]!;
    const date = r.publishedDate ? ` [${r.publishedDate.slice(0, 10)}]` : "";
    const author = r.author ? ` — ${r.author.slice(0, 30)}` : "";
    const domain = new URL(r.url).hostname.replace("www.", "");

    console.log(`[${i + 1}] ${r.title.slice(0, 70)}${date}`);
    console.log(`    ${domain}${author}`);
    if (r.summary) {
      const truncated = r.summary.length > 90 ? `${r.summary.slice(0, 90)}...` : r.summary;
      console.log(`    "${truncated}"`);
    }
    console.log();
  }

  console.log(`Extract: scout '?${session.id}:1,2,3' or scout '?${session.id}:all'`);
}

// ── Extracted Articles ──────────────────────────────────────────────────────

export function printArticles(articles: ExtractedArticle[], json: boolean): void {
  if (json) {
    console.log(JSON.stringify(articles, null, 2));
    return;
  }

  for (const article of articles) {
    console.log(`\n${SEPARATOR}`);
    console.log(`[${article.index}] ${article.title}`);
    console.log(article.url);
    if (article.author) console.log(`Author: ${article.author}`);
    console.log(`${SEPARATOR}\n`);
    console.log(article.content);
    console.log();
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
