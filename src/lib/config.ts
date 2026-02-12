import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { ScoutConfig } from "../types.js";

const CONFIG_DIR = join(homedir(), ".config", "scout");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

export const VERSION = "0.1.0";

// ── API Keys ────────────────────────────────────────────────────────────────

const KEY_SERVICES = ["exa", "firecrawl", "gemini"] as const;
type Service = (typeof KEY_SERVICES)[number];

function loadApiKey(service: Service): string | undefined {
  const envKey = `${service.toUpperCase()}_API_KEY`;
  const envValue = Bun.env[envKey];
  if (envValue) return envValue;

  const filePath = join(homedir(), ".config", service, "api_key");
  if (existsSync(filePath)) {
    return readFileSync(filePath, "utf-8").trim();
  }

  return undefined;
}

export function saveApiKey(service: Service, key: string): void {
  const dir = join(homedir(), ".config", service);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "api_key"), key.trim(), { mode: 0o600 });
}

export function getApiKeyStatus(): Array<{ service: Service; configured: boolean }> {
  return KEY_SERVICES.map((service) => ({
    service,
    configured: loadApiKey(service) !== undefined,
  }));
}

export const keys = {
  exa: loadApiKey("exa"),
  firecrawl: loadApiKey("firecrawl"),
  gemini: loadApiKey("gemini"),
};

// ── Config File ─────────────────────────────────────────────────────────────

export function loadConfig(): ScoutConfig {
  if (!existsSync(CONFIG_PATH)) return {};

  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as ScoutConfig;
  } catch {
    return {};
  }
}
