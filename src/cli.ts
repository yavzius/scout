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
  scout "query"                    Search the web (default: 5 results)
  scout search "query"             Same as above

  --num N            Number of results (default: 5)
  --deep             Thorough multi-step search (slower, better for complex queries)
  --days N           Results from last N days
  --category CAT     news, research paper, company, people, personal site, financial report
  --domains LIST     Comma-separated domains to search
  --after DATE       Results after YYYY-MM-DD

EXTRACT
  scout '?abc:1,2,3'               Extract results by index
  scout '?abc:all'                 Extract all results from session
  -c, --context TEXT               Research question for targeted analysis
  --raw                            Raw markdown (skip Gemini analysis)
  --limit N                        Max chars for raw mode (default: 8000)
  --no-cache                       Bypass extraction cache

DIRECT
  scout extract <url>              Extract and analyze any URL
  scout extract <url> --raw        Get raw markdown from any URL

SETUP
  scout setup                      Show API key status
  scout setup exa <key>            Save Exa API key
  scout setup firecrawl <key>      Save Firecrawl key
  scout setup gemini <key>         Save Gemini key

CACHE
  scout cache                      Show cache stats
  scout cache clear                Clear cache

EXAMPLES
  scout "best js sandbox libraries 2025" --num 5
  scout '?a3f:1,3' -c "What isolation method does each use?"
  scout extract https://example.com/article -c "Key findings?"
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
    "exclude", "max-age", "livecrawl", "limit", "max-results", "extract", "provider",
  ]);

  for (const key of Object.keys(args.flags)) {
    if (!KNOWN_FLAGS.has(key)) {
      console.error(`Warning: Unknown flag --${key} (ignored)`);
    }
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
