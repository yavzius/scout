// ── Search ──────────────────────────────────────────────────────────────────

export interface SearchResult {
  title: string;
  url: string;
  author?: string;
  publishedDate?: string;
  summary?: string;
  text?: string;
}

export interface SearchSession {
  id: string;
  query: string;
  results: SearchResult[];
  timestamp: number;
}

export interface SearchOptions {
  type?: "auto" | "deep";
  category?: string;
  numResults?: number;
  startPublishedDate?: string;
  includeDomains?: string[];
}

// ── Extract ─────────────────────────────────────────────────────────────────

export interface CachedExtract {
  url: string;
  content: string;
  title: string;
  timestamp: number;
}

export interface ExtractResult {
  success: boolean;
  content?: string;
  title?: string;
  error?: string;
  cached?: boolean;
}

export interface ExtractedArticle {
  index: number;
  title: string;
  url: string;
  author?: string;
  content: string;
}

// ── Exa API ─────────────────────────────────────────────────────────────────

export interface ExaSearchBody {
  query: string;
  numResults: number;
  type: string;
  category?: string;
  startPublishedDate?: string;
  includeDomains?: string[];
  contents: {
    summary?: { query: string };
    text?: boolean | { maxCharacters: number };
  };
}

export interface ExaResult {
  title?: string;
  url: string;
  author?: string;
  publishedDate?: string;
  summary?: string;
  text?: string;
}

export interface ExaSearchResponse {
  results: ExaResult[];
  costDollars?: { total: number };
}

// ── Firecrawl API ───────────────────────────────────────────────────────────

export interface FirecrawlScrapeBody {
  url: string;
  formats: string[];
  onlyMainContent: boolean;
  excludeTags: string[];
  removeBase64Images: boolean;
  blockAds: boolean;
  timeout: number;
}

export interface FirecrawlScrapeResponse {
  success: boolean;
  data?: {
    markdown?: string;
    metadata?: {
      title?: string;
    };
  };
}

// ── Gemini API ──────────────────────────────────────────────────────────────

export interface GeminiRequestBody {
  contents: Array<{ parts: Array<{ text: string }> }>;
  generationConfig: { temperature: number };
}

export interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

// ── Config ──────────────────────────────────────────────────────────────────

export interface ScoutConfig {
  defaults?: {
    numResults?: number;
    includeDomains?: string[];
  };
}

// ── CLI ─────────────────────────────────────────────────────────────────────

export interface ParsedArgs {
  flags: Record<string, string | boolean>;
  positional: string[];
}
