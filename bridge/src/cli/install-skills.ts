/** Copies the agent skills into Codex's and Claude Code's skill folders. */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type SkillTarget = "codex" | "claude";

export interface SkillInstallOptions {
  skillsSrc: string;
  targets: SkillTarget[];
  /** Overrides the destination (single folder) — mainly for tests. */
  dir?: string;
  env?: { [key: string]: string | undefined };
  home?: string;
}

export interface SkillInstallResult {
  destinations: Array<{ target: SkillTarget | "custom"; dir: string; skills: string[] }>;
}

export function skillsDirFor(target: SkillTarget, env: SkillInstallOptions["env"], home: string): string {
  return target === "codex"
    ? path.join(env?.CODEX_HOME ?? path.join(home, ".codex"), "skills")
    : path.join(home, ".claude", "skills");
}

export function listSkills(skillsSrc: string): string[] {
  if (!fs.existsSync(skillsSrc)) throw new Error(`Skills folder not found: ${skillsSrc}`);
  const names = fs.readdirSync(skillsSrc, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(skillsSrc, d.name, "SKILL.md")))
    .map((d) => d.name);
  if (names.length === 0) throw new Error(`No skills found in ${skillsSrc}`);
  return names.sort();
}

export function installSkills(opts: SkillInstallOptions): SkillInstallResult {
  const skills = listSkills(opts.skillsSrc);
  const home = opts.home ?? os.homedir();
  const plan = opts.dir
    ? [{ target: "custom" as const, dir: opts.dir }]
    : opts.targets.map((t) => ({ target: t, dir: skillsDirFor(t, opts.env ?? process.env, home) }));

  for (const { dir } of plan) {
    fs.mkdirSync(dir, { recursive: true });
    for (const name of skills) {
      const dest = path.join(dir, name);
      fs.rmSync(dest, { recursive: true, force: true });
      fs.cpSync(path.join(opts.skillsSrc, name), dest, { recursive: true });
    }
  }
  return { destinations: plan.map((p) => ({ ...p, skills })) };
}
