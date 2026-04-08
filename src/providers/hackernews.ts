import type { SearchResult } from "../types.js";

const BASE_URL = "https://hn.algolia.com/api/v1";

interface HNHit {
  title?: string;
  url: string | null;
  author: string;
  points: number | null;
  num_comments?: number;
  created_at: string;
  objectID: string;
  story_text?: string;
  comment_text?: string;
  story_title?: string;
  story_url?: string;
}

interface HNResponse {
  hits: HNHit[];
}

function stripHtml(html: string): string {
  return html
    .replace(/<a[^>]*href="([^"]*)"[^>]*>[^<]*<\/a>/g, "$1")
    .replace(/&#x2F;/g, "/")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/<\/?[^>]+(>|$)/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function search(
  query: string,
  options: { numResults?: number; days?: number; minPoints?: number; comments?: boolean } = {},
): Promise<SearchResult[]> {
  const tag = options.comments ? "comment" : "story";

  const params = new URLSearchParams({
    query,
    hitsPerPage: String(options.numResults ?? 10),
    tags: tag,
  });

  const filters: string[] = [];
  if (options.minPoints && !options.comments) filters.push(`points>${options.minPoints}`);
  if (options.days) {
    const since = Math.floor(Date.now() / 1000) - options.days * 86400;
    filters.push(`created_at_i>${since}`);
  }
  if (filters.length) params.set("numericFilters", filters.join(","));

  const response = await fetch(`${BASE_URL}/search?${params}`);
  if (!response.ok) {
    throw new Error(`HN API error (${response.status})`);
  }

  const data = (await response.json()) as HNResponse;

  if (options.comments) {
    return data.hits.map((hit) => ({
      title: hit.story_title ?? "(comment)",
      url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
      author: hit.author,
      publishedDate: hit.created_at,
      summary: `Comment on: ${hit.story_title ?? "unknown"}`,
      text: hit.comment_text ? stripHtml(hit.comment_text) : undefined,
    }));
  }

  return data.hits.map((hit) => ({
    title: hit.title ?? "(no title)",
    url: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
    author: hit.author,
    publishedDate: hit.created_at,
    summary: `${hit.points ?? 0} points, ${hit.num_comments ?? 0} comments · hn:${hit.objectID}`,
    text: hit.story_text ? stripHtml(hit.story_text) : undefined,
  }));
}

async function getHnKarma(authors: string[]): Promise<Map<string, number>> {
  const unique = [...new Set(authors)];
  const results = await Promise.all(
    unique.map(async (author) => {
      try {
        const res = await fetch(`https://hacker-news.firebaseio.com/v0/user/${author}.json`);
        if (!res.ok) return [author, 0] as const;
        const data = (await res.json()) as { karma?: number };
        return [author, data.karma ?? 0] as const;
      } catch {
        return [author, 0] as const;
      }
    }),
  );
  return new Map(results);
}

function credBadge(karma: number): string {
  if (karma >= 10000) return " ★★";
  if (karma >= 1000) return " ★";
  return "";
}

export async function comments(
  storyId: string,
  options: { numResults?: number; query?: string } = {},
): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    tags: `comment,story_${storyId}`,
    hitsPerPage: String(options.numResults ?? 15),
  });
  if (options.query) params.set("query", options.query);

  const response = await fetch(`${BASE_URL}/search?${params}`);
  if (!response.ok) {
    throw new Error(`HN API error (${response.status})`);
  }

  const data = (await response.json()) as HNResponse;

  const karmaMap = await getHnKarma(data.hits.map((h) => h.author));

  return data.hits.map((hit) => {
    const karma = karmaMap.get(hit.author) ?? 0;
    const badge = credBadge(karma);
    return {
      title: `${hit.author}${badge} (${karma.toLocaleString()} karma)`,
      url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
      author: hit.author,
      publishedDate: hit.created_at,
      summary: hit.comment_text ? undefined : `by ${hit.author}`,
      text: hit.comment_text ? stripHtml(hit.comment_text) : undefined,
    };
  });
}
