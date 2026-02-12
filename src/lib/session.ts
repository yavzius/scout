import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { SearchSession } from "../types.js";

const SESSION_DIR = join(homedir(), ".cache", "scout", "sessions");
const EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours
const MAX_SESSIONS = 10;

// ── ID ──────────────────────────────────────────────────────────────────────

export function generateSessionId(): string {
  return Math.random().toString(16).slice(2, 5);
}

// ── Read / Write ────────────────────────────────────────────────────────────

export function saveSession(session: SearchSession): void {
  if (!existsSync(SESSION_DIR)) mkdirSync(SESSION_DIR, { recursive: true });

  writeFileSync(join(SESSION_DIR, `${session.id}.json`), JSON.stringify(session, null, 2));
  writeFileSync(join(SESSION_DIR, "latest.json"), JSON.stringify(session, null, 2));

  pruneSessions();
}

export function loadSession(sessionId?: string): SearchSession | null {
  if (!existsSync(SESSION_DIR)) return null;

  let filePath: string;

  if (sessionId) {
    filePath = join(SESSION_DIR, `${sessionId}.json`);
    if (!existsSync(filePath)) {
      const match = readdirSync(SESSION_DIR).find(
        (f) => f.startsWith(sessionId) && f.endsWith(".json"),
      );
      if (match) filePath = join(SESSION_DIR, match);
      else return null;
    }
  } else {
    filePath = join(SESSION_DIR, "latest.json");
  }

  if (!existsSync(filePath)) return null;

  try {
    const data = JSON.parse(readFileSync(filePath, "utf-8")) as SearchSession;
    if (Date.now() - data.timestamp > EXPIRY_MS) return null;
    return data;
  } catch {
    return null;
  }
}

// ── Maintenance ─────────────────────────────────────────────────────────────

function pruneSessions(): void {
  if (!existsSync(SESSION_DIR)) return;

  const sessions = readdirSync(SESSION_DIR)
    .filter((f) => f !== "latest.json" && f.endsWith(".json"))
    .map((f) => {
      const path = join(SESSION_DIR, f);
      return { path, mtime: statSync(path).mtime.getTime() };
    })
    .sort((a, b) => b.mtime - a.mtime);

  for (const session of sessions.slice(MAX_SESSIONS)) {
    unlinkSync(session.path);
  }
}
