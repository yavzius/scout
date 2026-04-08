import type { ParsedArgs, SearchOptions } from "../types.js";
import { loadConfig } from "../lib/config.js";
import { generateSessionId, saveSession } from "../lib/session.js";
import { status, printSearchResults } from "../lib/output.js";
import * as exa from "../providers/exa.js";

export async function run(query: string, args: ParsedArgs): Promise<void> {
  const config = loadConfig();
  const json = args.flags.json === true;

  // Deprecation warnings for removed flags
  if (args.flags.type) console.error("Warning: --type is deprecated. Use --deep for thorough search.");
  if (args.flags.exclude) console.error("Warning: --exclude is deprecated. Use --domains to scope positively.");
  if (args.flags["max-age"]) console.error("Warning: --max-age is deprecated. Use --days or --after for recency.");
  if (args.flags.before) console.error("Warning: --before is deprecated. Use --days or --after.");
  if (args.flags.livecrawl) console.error("Warning: --livecrawl is deprecated. Use --days or --after for recency.");

  const options: SearchOptions = {
    type: args.flags.deep ? "deep" : "auto",
    category: args.flags.category as string | undefined,
    numResults: args.flags.num ? parseInt(args.flags.num as string, 10) : (config.defaults?.numResults ?? 5),
    includeDomains: config.defaults?.includeDomains,
  };

  if (args.flags.days) {
    const d = new Date();
    d.setDate(d.getDate() - parseInt(args.flags.days as string, 10));
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

  status(`\n🔍 "${query}"${params.length ? ` [${params.join(", ")}]` : ""}`);

  const results = await exa.search(query, options);

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
