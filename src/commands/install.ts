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

function findSkillDir(): string | null {
  const candidates = [
    join(dirname(process.execPath), "skills", "research"),
    join(dirname(process.execPath), "..", "skills", "research"),
    join(dirname(Bun.main), "..", "skills", "research"),
  ];
  for (const p of candidates) {
    if (existsSync(join(p, "SKILL.md"))) return p;
  }
  return null;
}

export function run(flags: Record<string, string | boolean>): void {
  if (flags.skills !== true) {
    console.log("Usage: scout install --skills");
    console.log("  Installs scout research skill for your AI coding agents.");
    return;
  }

  const sourceDir = findSkillDir();
  if (!sourceDir) {
    console.error("Error: skill files not found. Make sure scout is installed properly.");
    process.exit(1);
  }

  let installed = 0;

  for (const agent of AGENT_PATHS) {
    const agentRoot = dirname(agent.dir);
    const agentBase = dirname(agentRoot);
    if (!existsSync(agentBase)) continue;

    cpSync(sourceDir, agent.dir, { recursive: true });
    console.log(`  [ok] ${agent.name}: ${agent.dir}`);
    installed++;
  }

  if (installed === 0) {
    const fallback = AGENT_PATHS[0]!;
    cpSync(sourceDir, fallback.dir, { recursive: true });
    console.log(`  [ok] ${fallback.name}: ${fallback.dir}`);
    installed = 1;
  }

  console.log(`\n  Installed for ${installed} agent(s). Restart your agent to load the skill.`);
}
