import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
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

// ── CLAUDE.md Integration ───────────────────────────────────────────────────

const CLAUDE_MD_DIR = join(homedir(), ".claude");
const CLAUDE_MD_PATH = join(CLAUDE_MD_DIR, "CLAUDE.md");

const SCOUT_SECTION = `
## Scout CLI

**IMPORTANT: When you need to research or look up information on the web, always prefer using \`scout\` via Bash over the built-in WebSearch/WebFetch tools.** Scout provides higher-quality results through Exa neural search, cleaner extraction via Firecrawl, and structured analysis via Gemini.

Three-stage pipeline: search → extract → analyze.

\`\`\`bash
# Search
scout "query" [options]           # Search the web

# Extract with context (targeted analysis)
scout '?abc:1,2,3' -c "your research question"
scout '?abc:1,2,3' --context-file ./notes.md

# Extract without context
scout '?abc:1,2,3'                # Gemini analysis
scout '?abc:1,2,3' --raw          # Clean markdown only

# Direct URL extraction
scout extract <url>               # Analyze any URL
scout extract <url> --raw         # Raw markdown
\`\`\`

**Search options:** \`--category\` (news, research paper, tweet, company, pdf), \`--days N\`, \`--after/--before DATE\`, \`--domains LIST\`, \`--exclude LIST\`, \`--num N\`

**Extract options:** \`-c\` context, \`--raw\` skip analysis, \`--limit N\` chars, \`--no-cache\`, \`--json\` for piping
`;

function ensureClaudeMd(): { added: boolean } {
  if (!existsSync(CLAUDE_MD_DIR)) mkdirSync(CLAUDE_MD_DIR, { recursive: true });

  if (existsSync(CLAUDE_MD_PATH)) {
    const content = readFileSync(CLAUDE_MD_PATH, "utf-8");
    if (content.includes("## Scout CLI")) {
      return { added: false };
    }
    writeFileSync(CLAUDE_MD_PATH, content.trimEnd() + "\n" + SCOUT_SECTION);
  } else {
    writeFileSync(CLAUDE_MD_PATH, `# Claude Memory\n${SCOUT_SECTION}`);
  }

  return { added: true };
}

// ── Command ─────────────────────────────────────────────────────────────────

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

    // Check if all keys now configured, if so add to CLAUDE.md
    const allConfigured = getApiKeyStatus().every((s) => s.configured);
    if (allConfigured) {
      const { added } = ensureClaudeMd();
      if (added) console.log("✓ Added scout to ~/.claude/CLAUDE.md");
    }

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
    const { added } = ensureClaudeMd();
    if (added) {
      console.log("\n✓ Added scout to ~/.claude/CLAUDE.md");
    } else {
      console.log("\n✓ Claude Code integration already configured.");
    }
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
