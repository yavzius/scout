import type { SearchOptions, ExaSearchBody, ExaSearchResponse, SearchResult } from "../types.js";
import { keys } from "../lib/config.js";
import { status } from "../lib/output.js";

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
      text: true,
    },
  };

  if (options.startPublishedDate) body.startPublishedDate = options.startPublishedDate;
  if (options.category) body.category = options.category;
  if (options.includeDomains?.length) body.includeDomains = options.includeDomains;

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

  if (data.costDollars) {
    status(`   ~$${data.costDollars.total.toFixed(4)}`);
  }

  return data.results.map((r) => ({
    title: r.title ?? "(no title)",
    url: r.url,
    author: r.author,
    publishedDate: r.publishedDate,
    summary: r.summary ?? "",
    text: r.text,
  }));
}
