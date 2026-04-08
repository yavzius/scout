#!/usr/bin/env bun

import type { ParsedArgs } from "./types.js";
import { VERSION } from "./lib/config.js";
import * as search from "./commands/search.js";
import * as extract from "./commands/extract.js";
import * as cache from "./commands/cache.js";
import * as setup from "./commands/setup.js";

// ── Help ────────────────────────────────────────────────────────────────────

const HELP = `
scout v${VERSION} — web research CLI

SEARCH
  scout "query"                    Search the web via Exa (default)
  scout "query" --source SOURCE    Use a different source

  Sources: google, news, scholar, hn, reddit (default: exa)
  Run 'scout sources --help' for guidance on when to use each.

  --num N            Number of results (default: 5)
  --deep             Thorough multi-step search (slower, better for complex queries)
  --days N           Results from last N days
  --after DATE       Results after YYYY-MM-DD or year for scholar
  --category CAT     Exa only: news, research paper, company, people, personal site, financial report
  --domains LIST     Exa only: comma-separated domains
  --subreddit NAME   Reddit only: filter to specific subreddit
  --comments         HN only: search comments instead of stories

EXTRACT
  scout '?abc:1,2,3'               Expand results by index (uses stored text, no extra API call)
  scout '?abc:all'                 Expand all results from session
  --raw                            Raw markdown (skip Gemini analysis)
  --limit N                        Max chars for raw mode (default: 8000)
  -c, --context TEXT               Research question for targeted Gemini analysis
  --no-cache                       Bypass extraction cache

  Run 'scout extract --help' for details on how expand works.

DIRECT URL
  scout extract <url>              Extract and analyze any URL via Firecrawl
  scout extract <url> --raw        Raw markdown from any URL

DRILL INTO COMMENTS
  scout "hn:47584540" --source hn                          Load comments for HN story
  scout "reddit:/r/sub/comments/id/slug/" --source reddit  Load comments for Reddit post

  Comment results show author credibility: ★ (established) ★★ (authority)

SETUP
  scout setup                      Show API key status
  scout setup exa|firecrawl|gemini|serper <key>

CACHE
  scout cache                      Show cache stats
  scout cache clear                Clear expired items

EXAMPLES
  scout "how does WebSocket auth work"                          Exa: conceptual, full content
  scout "\"lalilo\" site:reddit.com" --source google            Google: exact match + site filter
  scout "AI tutoring RCT" --source scholar --after 2024         Scholar: papers with citations
  scout "edtech evaluation 2026" --source news                  News: current events
  scout "Claude Code" --source hn --days 30                     HN: tech community takes
  scout "Alpha School" --source reddit                          Reddit: real user opinions
  scout '?a3f:1,3' --raw                                       Expand: full article text
  scout '?a3f:1,3' -c "What are the main criticisms?"          Expand: Gemini-analyzed
`;

const HELP_SOURCES = `
scout sources — when to use each

CHOOSING A SOURCE
  Each source has different strengths. Pick based on what kind of answer you need.

  DEFAULT: Exa (no flag needed)
    Best for: understanding a topic, getting full article content, conceptual/semantic queries
    Returns: AI summaries + full page text (stored for instant expand)
    Weak at: finding specific words buried in comment threads, very fresh news
    Cost: ~$0.01/query
    Use when: "What is X?", "How does X work?", "Compare X and Y"

  --source google
    Best for: exact-match recall, site: filtering, finding niche terms anywhere on the web
    Returns: Google snippets (no stored text — use extract for full content)
    Weak at: conceptual understanding (returns snippets, not summaries)
    Cost: ~$0.001/query
    Use when: '"exact phrase" site:domain.com', finding where something is mentioned
    Tip: Reddit search uses this automatically (searches Google with site:reddit.com)

  --source scholar
    Best for: academic papers, citation counts, finding specific research
    Returns: papers with year + citation count (e.g. "cited 271x")
    Weak at: broad queries (returns survey papers). Use specific terms.
    Cost: ~$0.001/query
    Auto-behavior: quotes first 2 words as a phrase for better results
    Use when: you need evidence, a specific paper, or citation counts
    Tip: use --after YEAR to filter to recent papers

  --source news
    Best for: current events, industry news, timestamped results
    Returns: articles with source name + date
    Weak at: historical or conceptual queries
    Cost: ~$0.001/query
    Use when: "What happened recently with X?", monitoring a topic

  --source hn
    Best for: tech/startup community opinions, high signal-to-noise
    Returns: stories with point counts, or comments with full text
    Weak at: non-tech topics, small result sets
    Cost: free (no API key needed)
    Features:
      --comments          Search comments instead of stories
      --days N            Filter to recent
      "hn:47584540"       Load comments for a specific story (ID shown in results)

  --source reddit
    Best for: real user opinions, parent/teacher/consumer sentiment
    Returns: posts found via Google, comments with ★/★★ karma badges
    Weak at: nothing — uses Google for discovery, Reddit API for comments
    Cost: ~$0.001/query for discovery (free for comments)
    Features:
      --subreddit NAME                               Filter to subreddit
      "reddit:/r/sub/comments/id/slug/" --source reddit  Load comment thread

COMBINING SOURCES
  No single source gives the full picture. For thorough research, use multiple:

  Understanding:  scout "topic"                          (Exa — summaries + content)
  Evidence:       scout "topic" --source scholar          (Scholar — papers + citations)
  Current:        scout "topic" --source news             (News — what's happening now)
  Exact recall:   scout '"term" site:x.com' --source google  (Google — find specific mentions)
  Community:      scout "topic" --source hn               (HN — practitioner opinions)
  Users:          scout "topic" --source reddit            (Reddit — real user experiences)
`;

const HELP_EXTRACT = `
scout extract — how expanding results works

THE FLOW
  1. Search: scout "query" → returns summaries + stores full page text from Exa
  2. Expand: scout '?abc:1,2' → returns stored text instantly (no extra API call)
  3. Or expand with analysis: scout '?abc:1,2' -c "What are the key findings?"

  For Exa results: text is stored during search. Expand is instant and free.
  For HN/Reddit results: short text (<500 chars) shown inline. Expand uses Firecrawl.
  For direct URLs: scout extract <url> always uses Firecrawl.

TOKEN ESTIMATES
  When expanding, token estimates are shown on stderr before content:

    📄 3 article(s):
       [1] Article title... (~2,041 tokens)
       [2] Another article... (~1,379 tokens)
       Total: ~3,420 tokens across 2 article(s)

  Use this to decide: read all? pick the shortest? summarize via -c?

MODES
  --raw               Full markdown text, no Gemini processing
  --raw --limit N     Truncate to N chars (default: 8000)
  -c "question"       Gemini analyzes the content focused on your question
  (no flags)          Gemini analyzes with general summary

COST
  Exa results expand: $0 (already stored)
  Firecrawl extract:  ~$0.01/page
  Gemini analysis:    ~$0.001/page
`;


// ── Arg Parser ──────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): ParsedArgs {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;

    if (arg === "--help" || arg === "-h") {
      flags.help = true;
    } else if (arg === "--version" || arg === "-v") {
      flags.version = true;
    } else if (arg === "--json") {
      flags.json = true;
    } else if (arg === "--raw") {
      flags.raw = true;
    } else if (arg === "--no-cache") {
      flags["no-cache"] = true;
    } else if (arg === "-c" || arg === "--context") {
      const next = argv[i + 1];
      if (next && !next.startsWith("-")) {
        flags.context = next;
        i++;
      }
    } else if (arg === "-cf" || arg === "--context-file") {
      const next = argv[i + 1];
      if (next && !next.startsWith("-")) {
        flags["context-file"] = next;
        i++;
      }
    } else if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith("?")) {
      flags.extract = arg.slice(1);
    } else {
      positional.push(arg);
    }
  }

  // Alias common hallucinated flags
  if (flags["max-results"] && !flags.num) {
    flags.num = flags["max-results"];
    delete flags["max-results"];
  }

  return { flags, positional };
}

// ── Router ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(Bun.argv.slice(2));

  const KNOWN_FLAGS = new Set([
    "help", "version", "json", "raw", "no-cache", "context", "context-file",
    "num", "deep", "type", "category", "after", "before", "days", "domains",
    "exclude", "max-age", "livecrawl", "limit", "max-results", "extract", "provider", "source", "subreddit", "comments",
  ]);

  for (const key of Object.keys(args.flags)) {
    if (!KNOWN_FLAGS.has(key)) {
      console.error(`Warning: Unknown flag --${key} (ignored)`);
    }
  }

  // Subcommand help: scout sources --help, scout extract --help
  if (args.flags.help && args.positional.length > 0) {
    const sub = args.positional[0];
    if (sub === "sources") { console.log(HELP_SOURCES); return; }
    if (sub === "extract") { console.log(HELP_EXTRACT); return; }
  }

  if (args.flags.help || (args.positional.length === 0 && !args.flags.extract && !args.flags.version)) {
    console.log(HELP);
    return;
  }

  if (args.flags.version) {
    console.log(`scout v${VERSION}`);
    return;
  }

  // Extract from session: scout '?abc:1,2,3'
  if (args.flags.extract) {
    await extract.fromSession(args.flags.extract as string, args);
    return;
  }

  const command = args.positional[0];

  // Direct URL extract: scout extract <url>
  if (command === "extract") {
    const url = args.positional[1];
    if (!url) {
      console.error("Usage: scout extract <url>");
      process.exit(1);
    }
    await extract.fromUrl(url, args);
    return;
  }

  // Setup: scout setup [service] [key]
  if (command === "setup") {
    setup.run(args.positional.slice(1));
    return;
  }

  // Cache: scout cache [clear]
  if (command === "cache") {
    cache.run(args.positional[1], args.flags.json === true);
    return;
  }

  // Search: scout search "query" — strip "search" subcommand
  if (command === "search") {
    const query = args.positional.slice(1).join(" ");
    if (!query) {
      console.log(HELP);
      return;
    }
    await search.run(query, args);
    return;
  }

  // Search: scout "query" [options]
  const query = args.positional.join(" ");
  if (!query) {
    console.log(HELP);
    return;
  }

  await search.run(query, args);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
