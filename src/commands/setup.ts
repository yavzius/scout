import { getApiKeyStatus, saveApiKey } from "../lib/config.js";

const SERVICE_INFO: Record<string, { name: string; url: string; purpose: string }> = {
  exa: {
    name: "Exa",
    url: "https://exa.ai",
    purpose: "web search",
  },
  firecrawl: {
    name: "Firecrawl",
    url: "https://firecrawl.dev",
    purpose: "page extraction",
  },
  gemini: {
    name: "Google Gemini",
    url: "https://aistudio.google.com/apikey",
    purpose: "content analysis",
  },
};

export function run(positional: string[]): void {
  const service = positional[0] as string | undefined;
  const key = positional[1] as string | undefined;

  // scout setup exa <key> — save a key
  if (service && key) {
    const info = SERVICE_INFO[service];
    if (!info) {
      console.error(`Unknown service: ${service}. Use: exa, firecrawl, or gemini`);
      process.exit(1);
    }

    saveApiKey(service as "exa" | "firecrawl" | "gemini", key);
    console.log(`✓ ${info.name} API key saved`);
    return;
  }

  // scout setup — show status and instructions
  const statuses = getApiKeyStatus();

  console.log("\nscout requires three API keys:\n");

  for (const { service: svc, configured } of statuses) {
    const info = SERVICE_INFO[svc]!;
    const icon = configured ? "✓" : "✗";
    const state = configured ? "configured" : "missing";
    console.log(`  ${icon} ${info.name.padEnd(15)} ${state.padEnd(12)} ${info.purpose}`);
  }

  const missing = statuses.filter((s) => !s.configured);

  if (missing.length === 0) {
    console.log("\nAll keys configured. Ready to search.");
    return;
  }

  console.log("\nGet your keys:");

  for (const { service: svc } of missing) {
    const info = SERVICE_INFO[svc]!;
    console.log(`  ${info.name.padEnd(15)} ${info.url}`);
  }

  console.log("\nThen run:");

  for (const { service: svc } of missing) {
    console.log(`  scout setup ${svc} <your-key>`);
  }

  console.log();
}
