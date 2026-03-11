import { readFileSync } from "fs";
import type { ParsedArgs, ExtractedArticle } from "../types.js";
import { keys } from "../lib/config.js";
import { loadSession } from "../lib/session.js";
import { status, printArticles } from "../lib/output.js";
import * as firecrawl from "../providers/firecrawl.js";
import * as gemini from "../providers/gemini.js";
import { isErrorPage } from "../lib/validate.js";

// ── Context Loading ─────────────────────────────────────────────────────────

function loadContext(args: ParsedArgs): string | undefined {
  if (args.flags.context) return args.flags.context as string;

  if (args.flags["context-file"]) {
    try {
      return readFileSync(args.flags["context-file"] as string, "utf-8").trim();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to read context file: ${message}`);
    }
  }

  return undefined;
}

// ── Single Article Processing ───────────────────────────────────────────────

async function processArticle(
  index: number,
  title: string,
  url: string,
  author: string | undefined,
  raw: boolean,
  noCache: boolean,
  limit: number,
  context?: string,
): Promise<ExtractedArticle | null> {
  status(`   [${index}] ${title.slice(0, 50)}...`);

  const extracted = await firecrawl.scrape(url, { noCache });

  if (!extracted.success || !extracted.content) {
    const reason = extracted.error ?? "unknown";
    status(`   [${index}] ✗ Failed (${reason})`);
    return null;
  }

  if (extracted.cached) status(`   [${index}] ⚡ Cached`);

  // Check for error pages before sending to Gemini
  const errorPageReason = isErrorPage(extracted.content);
  if (errorPageReason) {
    status(`   [${index}] ✗ Skipped (${errorPageReason})`);
    return null;
  }

  let content: string;

  if (raw) {
    content = extracted.content;
    if (content.length > limit) {
      content = `${content.slice(0, limit)}\n\n[...truncated at ${limit} chars, use --limit N for more]`;
    }
  } else {
    try {
      content = await gemini.analyze(extracted.content, title, url, context);
      status(`   [${index}] ✓ Analyzed${extracted.cached ? " (from cache)" : ""}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === "EMPTY_PAGE") {
        status(`   [${index}] ✗ Skipped (empty/error page)`);
        return null;
      }
      throw err;
    }
  }

  return { index, title, url, author, content };
}

// ── Extract from Session ────────────────────────────────────────────────────

export async function fromSession(command: string, args: ParsedArgs): Promise<void> {
  const json = args.flags.json === true;
  const raw = args.flags.raw === true;
  const noCache = args.flags["no-cache"] === true;
  const limit = args.flags.limit ? parseInt(args.flags.limit as string, 10) : 8000;
  const context = loadContext(args);

  if (!raw && !keys.gemini) {
    throw new Error("GEMINI_API_KEY not set (use --raw for markdown only)");
  }

  // Parse session ID and indices from "abc:1,2,3"
  let sessionId: string | undefined;
  let action: string;

  if (command.includes(":")) {
    const colonIndex = command.indexOf(":");
    sessionId = command.slice(0, colonIndex) || undefined;
    action = command.slice(colonIndex + 1);
  } else {
    action = command;
  }

  const session = loadSession(sessionId);
  if (!session) {
    throw new Error(sessionId ? `No session: ${sessionId}` : "No recent search. Run a search first.");
  }

  const indices = action === "all"
    ? session.results.map((_, i) => i + 1)
    : action.split(/[,\s]+/).map(Number).filter((n) => !isNaN(n));

  if (indices.length === 0) {
    throw new Error(`Invalid selection: ${action}. Use numbers like '1,2,3' or 'all'`);
  }

  const mode = raw ? "raw" : "analyze";
  status(`\n📄 Extracting ${indices.length} article(s) [${mode}]${context ? " with context" : ""}...\n`);

  const promises = indices.map((idx) => {
    const result = session.results[idx - 1];
    if (!result) {
      status(`   [${idx}] No result at index ${idx}`);
      return Promise.resolve(null);
    }
    return processArticle(idx, result.title, result.url, result.author, raw, noCache, limit, context);
  });

  const articles = (await Promise.all(promises)).filter((a): a is ExtractedArticle => a !== null);

  if (articles.length === 0) {
    status("No articles extracted.");
    return;
  }

  printArticles(articles, json);
}

// ── Extract Direct URL ──────────────────────────────────────────────────────

export async function fromUrl(url: string, args: ParsedArgs): Promise<void> {
  const json = args.flags.json === true;
  const raw = args.flags.raw === true;
  const noCache = args.flags["no-cache"] === true;
  const limit = args.flags.limit ? parseInt(args.flags.limit as string, 10) : 8000;
  const context = loadContext(args);

  if (!raw && !keys.gemini) {
    throw new Error("GEMINI_API_KEY not set (use --raw for markdown only)");
  }

  const mode = raw ? "raw" : "analyze";
  status(`\n📄 Extracting [${mode}]${context ? " with context" : ""}: ${url}`);

  const extracted = await firecrawl.scrape(url, { noCache });

  if (!extracted.success || !extracted.content) {
    throw new Error(`Extraction failed: ${extracted.error ?? "unknown error"}`);
  }

  if (extracted.cached) status("⚡ Using cached extraction");

  let content: string;

  if (raw) {
    content = extracted.content;
    if (content.length > limit) {
      content = `${content.slice(0, limit)}\n\n[...truncated at ${limit} chars, use --limit N for more]`;
    }
  } else {
    content = await gemini.analyze(extracted.content, extracted.title ?? url, url, context);
    status(`✓ Analyzed${extracted.cached ? " (from cache)" : ""}`);
  }

  const article: ExtractedArticle = {
    index: 1,
    title: extracted.title ?? url,
    url,
    content,
  };

  printArticles([article], json);
}
