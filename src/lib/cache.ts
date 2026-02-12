import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { CachedExtract } from "../types.js";

const CACHE_DIR = join(homedir(), ".cache", "scout", "extracts");
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 50;

// ── Hash ────────────────────────────────────────────────────────────────────

function hashUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) - hash) + url.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// ── Read / Write ────────────────────────────────────────────────────────────

export function getCachedExtract(url: string): CachedExtract | null {
  if (!existsSync(CACHE_DIR)) return null;

  const file = join(CACHE_DIR, `${hashUrl(url)}.json`);
  if (!existsSync(file)) return null;

  try {
    const data = JSON.parse(readFileSync(file, "utf-8")) as CachedExtract;
    if (Date.now() - data.timestamp > TTL_MS) {
      unlinkSync(file);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function saveCachedExtract(url: string, content: string, title: string): void {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

  const file = join(CACHE_DIR, `${hashUrl(url)}.json`);
  const entry: CachedExtract = { url, content, title, timestamp: Date.now() };
  writeFileSync(file, JSON.stringify(entry));

  pruneCache();
}

// ── Maintenance ─────────────────────────────────────────────────────────────

function pruneCache(): void {
  if (!existsSync(CACHE_DIR)) return;

  const entries = readdirSync(CACHE_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const path = join(CACHE_DIR, f);
      return { path, mtime: statSync(path).mtime.getTime() };
    })
    .sort((a, b) => b.mtime - a.mtime);

  for (const entry of entries.slice(MAX_ENTRIES)) {
    unlinkSync(entry.path);
  }
}

export function getCacheStats(): { valid: number; expired: number; totalSizeKB: string } {
  if (!existsSync(CACHE_DIR)) {
    return { valid: 0, expired: 0, totalSizeKB: "0" };
  }

  let totalSize = 0;
  let valid = 0;
  let expired = 0;

  for (const file of readdirSync(CACHE_DIR).filter((f) => f.endsWith(".json"))) {
    const path = join(CACHE_DIR, file);
    totalSize += statSync(path).size;

    try {
      const data = JSON.parse(readFileSync(path, "utf-8")) as CachedExtract;
      if (Date.now() - data.timestamp > TTL_MS) expired++;
      else valid++;
    } catch {
      expired++;
    }
  }

  return { valid, expired, totalSizeKB: (totalSize / 1024).toFixed(1) };
}

export function clearCache(): number {
  if (!existsSync(CACHE_DIR)) return 0;

  const files = readdirSync(CACHE_DIR).filter((f) => f.endsWith(".json"));
  for (const file of files) unlinkSync(join(CACHE_DIR, file));
  return files.length;
}

export { CACHE_DIR, TTL_MS };
