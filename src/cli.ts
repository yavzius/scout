#!/usr/bin/env bun

import type { ParsedArgs } from "./types.js";
import { VERSION } from "./lib/config.js";
import * as search from "./commands/search.js";
import * as extract from "./commands/extract.js";
import * as cache from "./commands/cache.js";
import * as setup from "./commands/setup.js";

// ── Help ────────────────────────────────────────────────────────────────────

const HELP = `
scout v${VERSION} — Fast, structured web research from the terminal

SEARCH
  scout "query" [options]

  --type TYPE        auto, neural, keyword (default: auto)
  --category CAT     news, research paper, tweet, company, people, pdf
  --after DATE       Results after DATE (YYYY-MM-DD)
  --before DATE      Results before DATE
  --days N           Results from last N days
  --domains LIST     Comma-separated domains to include
  --exclude LIST     Comma-separated domains to exclude
  --livecrawl MODE   never, fallback, preferred, always
  --num N            Number of results (default: 15)

EXTRACT
  scout '?abc:1,2,3'            Extract and analyze results 1, 2, 3
  scout '?abc:all'              Extract top 5 results
  scout '?:1,2'                 Extract from most recent session

  -c, --context TEXT            Research question for targeted analysis
  -cf, --context-file PATH      Read context from file
  --raw                         Clean markdown only (skip analysis)
  --limit N                     Chars for raw mode (default: 8000)
  --no-cache                    Bypass cache, force fresh extraction

DIRECT EXTRACT
  scout extract <url>           Analyze any URL
  scout extract <url> --raw     Get raw markdown

SETUP
  scout setup                   Show API key status
  scout setup exa <key>         Save Exa API key
  scout setup firecrawl <key>   Save Firecrawl API key
  scout setup gemini <key>      Save Gemini API key

CACHE
  scout cache                   Show cache stats
  scout cache clear             Clear extraction cache

OPTIONS
  --json                        Output as JSON (for piping)
  --version                     Show version
  --help                        Show this help
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

  return { flags, positional };
}

// ── Router ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(Bun.argv.slice(2));

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
