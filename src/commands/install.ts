import { existsSync, mkdirSync, cpSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";

const SKILL_NAME = "scout-research";

const AGENT_PATHS: Array<{ name: string; dir: string }> = [
  { name: "Claude Code", dir: join(homedir(), ".claude", "skills", SKILL_NAME) },
  { name: "Codex", dir: join(homedir(), ".codex", "skills", SKILL_NAME) },
  { name: "OpenCode", dir: join(homedir(), ".opencode", "skills", SKILL_NAME) },
  { name: "Gemini", dir: join(homedir(), ".gemini", "skills", SKILL_NAME) },
];

function findSkillSource(): string | null {
  // Check relative to the binary location, then common paths
  const candidates = [
    join(dirname(process.execPath), "skills", "research", "SKILL.md"),
    join(dirname(process.execPath), "..", "skills", "research", "SKILL.md"),
    join(dirname(Bun.main), "..", "skills", "research", "SKILL.md"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

export function run(flags: Record<string, string | boolean>): void {
  if (flags.skills !== true) {
    console.log("Usage: scout install --skills");
    console.log("  Installs scout research skill for your AI coding agents.");
    return;
  }

  const source = findSkillSource();
  if (!source) {
    console.error("Error: SKILL.md not found. Make sure scout is installed properly.");
    process.exit(1);
  }

  let installed = 0;

  for (const agent of AGENT_PATHS) {
    // Only install for agents that have a config dir (i.e. are actually installed)
    const agentRoot = dirname(agent.dir);
    const agentBase = dirname(agentRoot);
    if (!existsSync(agentBase)) continue;

    if (!existsSync(agent.dir)) mkdirSync(agent.dir, { recursive: true });

    const dest = join(agent.dir, "SKILL.md");
    cpSync(source, dest);
    console.log(`  [ok] ${agent.name}: ${dest}`);
    installed++;
  }

  if (installed === 0) {
    // No agent dirs found — install for Claude Code anyway since scout is used there
    const fallback = AGENT_PATHS[0]!;
    if (!existsSync(fallback.dir)) mkdirSync(fallback.dir, { recursive: true });
    cpSync(source, join(fallback.dir, "SKILL.md"));
    console.log(`  [ok] ${fallback.name}: ${join(fallback.dir, "SKILL.md")}`);
    installed = 1;
  }

  console.log(`\n  Installed for ${installed} agent(s). Restart your agent to load the skill.`);
}
