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

// ── Analyze content with Gemini ─────────────────────────────────────────────

async function analyzeContent(
  content: string,
  title: string,
  url: string,
  context?: string,
): Promise<string | null> {
  try {
    return await gemini.analyze(content, title, url, context);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "EMPTY_PAGE") return null;
    throw err;
  }
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

  // Show token estimates first so agent can decide
  status(`\n--${indices.length} article(s)${context ? " with context" : ""}:\n`);

  let totalTokens = 0;
  const available: Array<{ idx: number; tokens: number; content: string; result: typeof session.results[0] }> = [];

  for (const idx of indices) {
    const result = session.results[idx - 1];
    if (!result) {
      status(`   [${idx}] No result at index ${idx}`);
      continue;
    }

    let content: string | undefined = result.text;

    if (content) {
      status(`   [${idx}] [cached]Using stored text`);
    } else {
      status(`   [${idx}] Fetching via Firecrawl...`);
      const extracted = await firecrawl.scrape(result.url, { noCache });
      if (!extracted.success || !extracted.content) {
        status(`   [${idx}] [fail]Failed (${extracted.error ?? "unknown"})`);
        continue;
      }
      if (extracted.cached) status(`   [${idx}] [cached]Cached`);
      content = extracted.content;
    }

    const errorPageReason = isErrorPage(content);
    if (errorPageReason) {
      status(`   [${idx}] [fail]Skipped (${errorPageReason})`);
      continue;
    }

    const tokens = Math.ceil(content.length / 4);
    totalTokens += tokens;
    available.push({ idx, tokens, content, result });
    status(`   [${idx}] ${result.title.slice(0, 50)}... (~${tokens.toLocaleString()} tokens)`);
  }

  status(`\n   Total: ~${totalTokens.toLocaleString()} tokens across ${available.length} article(s)\n`);

  const articles: ExtractedArticle[] = [];

  for (const { idx, content, result } of available) {
    let finalContent: string;

    if (raw) {
      finalContent = content;
      if (finalContent.length > limit) {
        finalContent = `${finalContent.slice(0, limit)}\n\n[...truncated at ${limit} chars, use --limit N for more]`;
      }
    } else {
      const analyzed = await analyzeContent(content, result.title, result.url, context);
      if (!analyzed) {
        status(`   [${idx}] [fail]Skipped (empty/error page)`);
        continue;
      }
      finalContent = analyzed;
      status(`   [${idx}] [ok]Analyzed`);
    }

    articles.push({
      index: idx,
      title: result.title,
      url: result.url,
      author: result.author,
      content: finalContent,
    });
  }

  if (articles.length === 0) {
    status("No articles extracted.");
    return;
  }

  printArticles(articles, json);
}

// ── Extract Direct URL (always uses Firecrawl) ─────────────────────────────

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
  status(`\n--Extracting [${mode}]${context ? " with context" : ""}: ${url}`);

  const extracted = await firecrawl.scrape(url, { noCache });

  if (!extracted.success || !extracted.content) {
    throw new Error(`Extraction failed: ${extracted.error ?? "unknown error"}`);
  }

  if (extracted.cached) status("[cached]Using cached extraction");

  let content: string;

  if (raw) {
    content = extracted.content;
    if (content.length > limit) {
      content = `${content.slice(0, limit)}\n\n[...truncated at ${limit} chars, use --limit N for more]`;
    }
  } else {
    content = await gemini.analyze(extracted.content, extracted.title ?? url, url, context);
    status(`[ok]Analyzed${extracted.cached ? " (from cache)" : ""}`);
  }

  const article: ExtractedArticle = {
    index: 1,
    title: extracted.title ?? url,
    url,
    content,
  };

  printArticles([article], json);
}
