import type { ExtractResult, FirecrawlScrapeResponse } from "../types.js";
import { keys } from "../lib/config.js";
import { getCachedExtract, saveCachedExtract } from "../lib/cache.js";

const BASE_URL = "https://api.firecrawl.dev";

const EXCLUDE_TAGS = [
  "nav", "footer", "aside",
  ".sidebar", ".comments", ".comment", ".share", ".social",
  ".related", ".recommended", ".newsletter", ".subscription",
  ".advertisement", ".ad", ".popup", ".modal", ".cookie",
  "#comments", "#sidebar", "#footer",
  "[class*='share']", "[class*='social']", "[class*='related']",
  "[class*='comment']", "[class*='newsletter']", "[class*='subscribe']",
];

interface ScrapeOptions {
  noCache?: boolean;
}

export async function scrape(url: string, options: ScrapeOptions = {}): Promise<ExtractResult> {
  if (!options.noCache) {
    const cached = getCachedExtract(url);
    if (cached) {
      return { success: true, content: cached.content, title: cached.title, cached: true };
    }
  }

  const apiKey = keys.firecrawl;
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY not set. Run 'scout setup' for instructions.");
  }

  const response = await fetch(`${BASE_URL}/v1/scrape`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
      excludeTags: EXCLUDE_TAGS,
      removeBase64Images: true,
      blockAds: true,
      timeout: 60000,
    }),
  });

  const data = (await response.json()) as FirecrawlScrapeResponse;

  if (!data.success || !data.data?.markdown) {
    return { success: false, error: `Firecrawl scrape failed (${response.status})` };
  }

  const content = data.data.markdown;
  const title = data.data.metadata?.title ?? url;

  saveCachedExtract(url, content, title);

  return { success: true, content, title };
}
