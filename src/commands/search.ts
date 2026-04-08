import type { ParsedArgs, SearchOptions } from "../types.js";
import { loadConfig } from "../lib/config.js";
import { generateSessionId, saveSession } from "../lib/session.js";
import { status, printSearchResults } from "../lib/output.js";
import * as exa from "../providers/exa.js";
import * as hackernews from "../providers/hackernews.js";
import * as reddit from "../providers/reddit.js";
import * as serper from "../providers/serper.js";

export async function run(query: string, args: ParsedArgs): Promise<void> {
  const config = loadConfig();
  const json = args.flags.json === true;
  const source = args.flags.source as string | undefined;

  // Deprecation warnings for removed flags
  if (args.flags.type) console.error("Warning: --type is deprecated. Use --deep for thorough search.");
  if (args.flags.exclude) console.error("Warning: --exclude is deprecated. Use --domains to scope positively.");
  if (args.flags["max-age"]) console.error("Warning: --max-age is deprecated. Use --days or --after for recency.");
  if (args.flags.before) console.error("Warning: --before is deprecated. Use --days or --after.");
  if (args.flags.livecrawl) console.error("Warning: --livecrawl is deprecated. Use --days or --after for recency.");

  const numResults = args.flags.num ? parseInt(args.flags.num as string, 10) : (config.defaults?.numResults ?? 5);
  const days = args.flags.days ? parseInt(args.flags.days as string, 10) : undefined;

  // Route to the right provider
  if (source === "hn" || source === "hackernews") {
    // Load comments for a specific story, optionally filtered:
    //   scout "hn:47584540" --source hn           → all top comments
    //   scout "hn:47584540 pricing" --source hn   → comments mentioning "pricing"
    const hnMatch = query.match(/^hn:(\d+)\s*(.*)?$/);
    if (hnMatch) {
      const storyId = hnMatch[1];
      const filter = hnMatch[2]?.trim() || undefined;
      status(`\n-- HN comments for story ${storyId}${filter ? ` [${filter}]` : ""}`);
      const results = await hackernews.comments(storyId, { numResults, query: filter });
      return finalize(results, query, json);
    }

    const isComments = args.flags.comments === true;
    status(`\n-- "${query}" [HN${isComments ? " comments" : ""}]`);
    const results = await hackernews.search(query, { numResults, days, comments: isComments });
    return finalize(results, query, json);
  }

  if (source === "reddit") {
    // Load comments for a specific post: scout "reddit:/r/edtech/comments/abc123/title" --source reddit
    const redditMatch = query.match(/^reddit:(\/r\/[^\s]+)/);
    if (redditMatch) {
      status(`\n-- Reddit comments for ${redditMatch[1]}`);
      const results = await reddit.comments(redditMatch[1], { numResults });
      return finalize(results, query, json);
    }

    const subreddit = args.flags.subreddit as string | undefined;
    status(`\n-- "${query}" [Reddit${subreddit ? ` r/${subreddit}` : ""}]`);
    const results = await reddit.search(query, { numResults, days, subreddit });
    return finalize(results, query, json);
  }

  if (source === "google" || source === "g") {
    status(`\n-- "${query}" [Google]`);
    const results = await serper.search(query, { numResults });
    return finalize(results, query, json);
  }

  if (source === "news") {
    status(`\n-- "${query}" [News]`);
    const results = await serper.news(query, { numResults });
    return finalize(results, query, json);
  }

  if (source === "scholar") {
    const yearFrom = args.flags.after ? parseInt(args.flags.after as string, 10) : undefined;
    status(`\n-- "${query}" [Scholar${yearFrom ? ` from ${yearFrom}` : ""}]`);
    const results = await serper.scholar(query, { numResults, yearFrom });
    return finalize(results, query, json);
  }

  // Default: Exa
  const options: SearchOptions = {
    type: args.flags.deep ? "deep" : "auto",
    category: args.flags.category as string | undefined,
    numResults,
    includeDomains: config.defaults?.includeDomains,
  };

  if (days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    options.startPublishedDate = d.toISOString();
  } else if (args.flags.after) {
    options.startPublishedDate = `${args.flags.after as string}T00:00:00.000Z`;
  }
  if (args.flags.domains) {
    options.includeDomains = (args.flags.domains as string).split(",").map((s) => s.trim());
  }

  // Status line
  const params: string[] = [];
  if (options.type) params.push(`type=${options.type}`);
  if (options.category) params.push(`category=${options.category}`);
  if (options.startPublishedDate) params.push(`after=${options.startPublishedDate.slice(0, 10)}`);
  if (options.includeDomains) params.push(`domains=${options.includeDomains.join(",")}`);

  status(`\n-- "${query}"${params.length ? ` [${params.join(", ")}]` : ""}`);

  const results = await exa.search(query, options);
  return finalize(results, query, json);
}

function finalize(
  results: Array<{ title: string; url: string; author?: string; publishedDate?: string; summary?: string; text?: string }>,
  query: string,
  json: boolean,
): void {
  if (results.length === 0) {
    status("No results found.");
    if (json) console.log(JSON.stringify({ results: [] }));
    return;
  }

  const session = {
    id: generateSessionId(),
    query,
    results,
    timestamp: Date.now(),
  };

  saveSession(session);
  printSearchResults(session, json);
}
