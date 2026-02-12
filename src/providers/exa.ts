import type { SearchOptions, ExaSearchBody, ExaSearchResponse, SearchResult } from "../types.js";
import { keys } from "../lib/config.js";

const BASE_URL = "https://api.exa.ai";

export async function search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
  const apiKey = keys.exa;
  if (!apiKey) {
    throw new Error("EXA_API_KEY not set. Run 'scout setup' for instructions.");
  }

  const body: ExaSearchBody = {
    query,
    numResults: options.numResults ?? 15,
    type: options.type ?? "auto",
    contents: {
      summary: { query },
      highlights: { numSentences: 2, highlightsPerUrl: 1 },
    },
  };

  if (options.startPublishedDate) body.startPublishedDate = options.startPublishedDate;
  if (options.endPublishedDate) body.endPublishedDate = options.endPublishedDate;
  if (options.category) body.category = options.category;
  if (options.includeDomains?.length) body.includeDomains = options.includeDomains;
  if (options.excludeDomains?.length) body.excludeDomains = options.excludeDomains;
  if (options.livecrawl) body.livecrawl = options.livecrawl;

  const response = await fetch(`${BASE_URL}/search`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Exa API error (${response.status}): ${text}`);
  }

  const data = (await response.json()) as ExaSearchResponse;

  return data.results.map((r) => ({
    title: r.title ?? "(no title)",
    url: r.url,
    author: r.author,
    publishedDate: r.publishedDate,
    summary: r.summary ?? r.highlights?.[0] ?? "",
  }));
}
