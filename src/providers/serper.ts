import type { SearchResult } from "../types.js";
import { keys } from "../lib/config.js";
import { status } from "../lib/output.js";

// ── Types ───────────────────────────────────────────────────────────────────

interface SerperResult {
  title: string;
  link: string;
  snippet: string;
  date?: string;
}

interface SerperResponse {
  organic: SerperResult[];
  answerBox?: { snippet?: string; title?: string; link?: string };
  peopleAlsoAsk?: Array<{ question: string }>;
  relatedSearches?: Array<{ query: string }>;
}

interface SerperNewsResult {
  title: string;
  link: string;
  snippet: string;
  date?: string;
  source?: string;
}

interface SerperNewsResponse {
  news: SerperNewsResult[];
}

interface SerperScholarResult {
  title: string;
  link: string;
  snippet: string;
  year?: number;
  citedBy?: number;
}

interface SerperScholarResponse {
  organic: SerperScholarResult[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getKey(): string {
  const apiKey = keys.serper;
  if (!apiKey) throw new Error("SERPER_API_KEY not set. Run 'scout setup serper <key>'");
  return apiKey;
}

async function post(endpoint: string, body: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(`https://google.serper.dev/${endpoint}`, {
    method: "POST",
    headers: {
      "X-API-KEY": getKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Serper API error (${response.status}): ${text}`);
  }

  return response.json();
}

// ── Web Search ──────────────────────────────────────────────────────────────

export async function search(
  query: string,
  options: { numResults?: number } = {},
): Promise<SearchResult[]> {
  const data = (await post("search", {
    q: query,
    num: options.numResults ?? 10,
  })) as SerperResponse;

  if (data.answerBox?.snippet) {
    status(`\n   Answer: ${data.answerBox.snippet}`);
  }
  if (data.peopleAlsoAsk?.length) {
    status(`   Also asked: ${data.peopleAlsoAsk.map((q) => q.question).join(" | ")}`);
  }
  if (data.relatedSearches?.length) {
    status(`   Related: ${data.relatedSearches.map((r) => r.query).join(" | ")}`);
  }

  return (data.organic ?? []).map((r) => ({
    title: r.title,
    url: r.link,
    publishedDate: r.date,
    summary: r.snippet,
  }));
}

// ── News Search ─────────────────────────────────────────────────────────────

export async function news(
  query: string,
  options: { numResults?: number } = {},
): Promise<SearchResult[]> {
  const limit = options.numResults ?? 10;
  const data = (await post("news", { q: query, num: limit })) as SerperNewsResponse;

  return (data.news ?? []).slice(0, limit).map((r) => ({
    title: r.title,
    url: r.link,
    publishedDate: r.date,
    summary: r.source ? `${r.source} — ${r.snippet}` : r.snippet,
  }));
}

// ── Scholar Search ──────────────────────────────────────────────────────────

function autoQuoteForScholar(query: string): string {
  if (query.includes('"')) return query;
  const words = query.split(/\s+/);
  if (words.length <= 2) return `"${query}"`;
  const phrase = words.slice(0, 2).join(" ");
  const rest = words.slice(2).join(" ");
  return `"${phrase}" ${rest}`;
}

export async function scholar(
  query: string,
  options: { numResults?: number; yearFrom?: number } = {},
): Promise<SearchResult[]> {
  const limit = options.numResults ?? 10;
  const body: Record<string, unknown> = {
    q: autoQuoteForScholar(query),
    num: limit,
  };
  if (options.yearFrom) body.yearFrom = options.yearFrom;

  const data = (await post("scholar", body)) as SerperScholarResponse;

  let results = data.organic ?? [];
  if (options.yearFrom) {
    results = results.filter((r) => !r.year || r.year >= options.yearFrom!);
  }

  return results.slice(0, limit).map((r) => ({
    title: r.title,
    url: r.link,
    summary: [
      r.year ? `${r.year}` : null,
      r.citedBy ? `cited ${r.citedBy}x` : null,
      r.snippet,
    ].filter(Boolean).join(" · "),
  }));
}
