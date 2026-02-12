import type { ParsedArgs, SearchOptions } from "../types.js";
import { loadConfig } from "../lib/config.js";
import { generateSessionId, saveSession } from "../lib/session.js";
import { status, printSearchResults } from "../lib/output.js";
import * as exa from "../providers/exa.js";

export async function run(query: string, args: ParsedArgs): Promise<void> {
  const config = loadConfig();
  const json = args.flags.json === true;

  const options: SearchOptions = {
    type: (args.flags.type as SearchOptions["type"]) ?? config.defaults?.searchType,
    category: args.flags.category as string | undefined,
    numResults: args.flags.num ? parseInt(args.flags.num as string, 10) : (config.defaults?.numResults ?? 15),
    livecrawl: args.flags.livecrawl as SearchOptions["livecrawl"],
    includeDomains: config.defaults?.includeDomains,
    excludeDomains: config.defaults?.excludeDomains,
  };

  if (args.flags.after) {
    options.startPublishedDate = `${args.flags.after as string}T00:00:00.000Z`;
  }
  if (args.flags.before) {
    options.endPublishedDate = `${args.flags.before as string}T23:59:59.000Z`;
  }
  if (args.flags.days) {
    const d = new Date();
    d.setDate(d.getDate() - parseInt(args.flags.days as string, 10));
    options.startPublishedDate = d.toISOString();
  }
  if (args.flags.domains) {
    options.includeDomains = (args.flags.domains as string).split(",").map((s) => s.trim());
  }
  if (args.flags.exclude) {
    options.excludeDomains = (args.flags.exclude as string).split(",").map((s) => s.trim());
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
