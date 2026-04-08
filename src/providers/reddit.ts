import type { SearchResult } from "../types.js";
import { keys } from "../lib/config.js";

// ── Types ───────────────────────────────────────────────────────────────────

interface RedditComment {
  data: {
    author: string;
    score: number;
    body: string;
    created_utc: number;
  };
}

interface RedditThreadResponse {
  data: {
    children: RedditComment[];
  };
}

interface SerperResult {
  title: string;
  link: string;
  snippet: string;
  date?: string;
}

interface SerperResponse {
  organic: SerperResult[];
}

interface RedditUserResponse {
  data: { total_karma: number };
}

// ── Search (via Google site:reddit.com) ─────────────────────────────────────

export async function search(
  query: string,
  options: { numResults?: number; days?: string; subreddit?: string } = {},
): Promise<SearchResult[]> {
  const apiKey = keys.serper;
  if (!apiKey) {
    throw new Error("SERPER_API_KEY not set. Run 'scout setup serper <key>'");
  }

  let q = `${query} site:reddit.com`;
  if (options.subreddit) {
    q = `${query} site:reddit.com/r/${options.subreddit}`;
  }

  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q,
      num: options.numResults ?? 10,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Serper API error (${response.status}): ${text}`);
  }

  const data = (await response.json()) as SerperResponse;

  return (data.organic ?? [])
    .filter((r) => r.link.includes("reddit.com"))
    .map((r) => {
      const permalink = extractPermalink(r.link);
      return {
        title: r.title.replace(/ - Reddit$/, "").replace(/ : r\/\w+$/, ""),
        url: r.link,
        publishedDate: r.date,
        summary: permalink
          ? `${r.snippet} · reddit:${permalink}`
          : r.snippet,
      };
    });
}

function extractPermalink(url: string): string | undefined {
  const match = url.match(/(\/r\/[^/]+\/comments\/[^/]+\/[^/]*)/);
  return match ? match[1] + "/" : undefined;
}

// ── Comments ────────────────────────────────────────────────────────────────

async function getRedditKarma(authors: string[]): Promise<Map<string, number>> {
  const unique = [...new Set(authors.filter((a) => a !== "[deleted]"))];
  const results = await Promise.all(
    unique.map(async (author) => {
      try {
        const res = await fetch(`https://www.reddit.com/user/${author}/about.json`, {
          headers: { "User-Agent": "scout-cli/0.1" },
        });
        if (!res.ok) return [author, 0] as const;
        const data = (await res.json()) as RedditUserResponse;
        return [author, data.data.total_karma ?? 0] as const;
      } catch {
        return [author, 0] as const;
      }
    }),
  );
  return new Map(results);
}

function credBadge(karma: number): string {
  if (karma >= 50000) return " ★★";
  if (karma >= 5000) return " ★";
  return "";
}

export async function comments(
  permalink: string,
  options: { numResults?: number } = {},
): Promise<SearchResult[]> {
  const limit = options.numResults ?? 20;
  const url = `https://www.reddit.com${permalink}.json?sort=top&limit=${limit}`;

  const response = await fetch(url, {
    headers: { "User-Agent": "scout-cli/0.1" },
  });

  if (!response.ok) {
    throw new Error(`Reddit API error (${response.status})`);
  }

  const data = (await response.json()) as RedditThreadResponse[];
  if (!data[1]?.data?.children) return [];

  const filtered = data[1].data.children
    .filter((c) => c.data.body && c.data.body !== "[deleted]" && c.data.body !== "[removed]");

  const karmaMap = await getRedditKarma(filtered.map((c) => c.data.author));

  return filtered.map((c) => {
    const karma = karmaMap.get(c.data.author) ?? 0;
    const badge = credBadge(karma);
    return {
      title: `${c.data.author}${badge} (${c.data.score} pts, ${karma.toLocaleString()} karma)`,
      url: `https://www.reddit.com${permalink}`,
      author: c.data.author,
      publishedDate: new Date(c.data.created_utc * 1000).toISOString(),
      summary: undefined,
      text: c.data.body,
    };
  });
}
