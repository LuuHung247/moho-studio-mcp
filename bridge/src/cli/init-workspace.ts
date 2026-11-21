/**
 * Creates a ready-to-use workspace folder: the film-project layout, an AGENTS.md
 * (read automatically by Codex and other agents) holding absolute paths and the
 * working rules, and optionally a copy of the skills so nothing depends on a
 * global install.
 */

import fs from "node:fs";
import path from "node:path";
import { installSkills } from "./install-skills.js";

export const WORKSPACE_FOLDERS = ["assets", "rigs", "scenes", "render"] as const;

export interface InitWorkspaceOptions {
  dir: string;
  skillsSrc?: string;
  /** Copy skills into <dir>/skills and <dir>/.claude/skills. */
  withSkills?: boolean;
}

export interface InitWorkspaceResult {
  dir: string;
  created: string[];
  agentsFile: "created" | "kept-existing";
  skills: string[];
}

export function agentsTemplate(dir: string, withSkills: boolean): string {
  const p = (...parts: string[]) => path.join(dir, ...parts);
  const skillPath = withSkills ? p("skills", "moho-studio", "SKILL.md") : "the installed skill `moho-studio` (run: npx -y <release .tgz URL> install-skills)";
  return `# Moho animation workspace

You control Moho Pro through the \`moho\` MCP server. The user speaks Vietnamese and does not code: answer in Vietnamese, show results with screenshots, keep technical detail out of replies.

**Start here:** read ${skillPath}. It routes every request to a task skill.

## Folder layout (absolute paths — use these, never other folders)
| Purpose | Folder |
|---|---|
| Source images, audio, SVG | \`${p("assets")}\` |
| Character masters (rigged .moho) | \`${p("rigs")}\` |
| One .moho per scene (canh01.moho, canh02.moho …) | \`${p("scenes")}\` |
| Rendered videos and the final film | \`${p("render")}\` |

## Rules
- Save scenes with \`document_save\` to \`scenes/\`; version before risky edits (canh01_v2.moho).
- Export videos with \`render_exportVideo\` to \`render/\`; join scenes with \`render_concatVideos\`.
- Use absolute paths. Prefer ASCII file names (no diacritics) — Moho's Lua file APIs on Windows can fail on non-ASCII paths.
- Call \`system_ping\` first; if it fails, follow the skill \`moho-session-check\`.
- Never overwrite the user's files in \`assets/\` or \`rigs/\`; copy first.
`;
}

export function initWorkspace(opts: InitWorkspaceOptions): InitWorkspaceResult {
  const dir = path.resolve(opts.dir);
  const created: string[] = [];
  fs.mkdirSync(dir, { recursive: true });
  for (const f of WORKSPACE_FOLDERS) {
    const target = path.join(dir, f);
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
      created.push(target);
    }
  }

  const agents = path.join(dir, "AGENTS.md");
  let agentsFile: InitWorkspaceResult["agentsFile"] = "kept-existing";
  if (!fs.existsSync(agents)) {
    fs.writeFileSync(agents, agentsTemplate(dir, opts.withSkills === true), "utf8");
    agentsFile = "created";
  }

  let skills: string[] = [];
  if (opts.withSkills) {
    if (!opts.skillsSrc) throw new Error("skillsSrc is required with withSkills");
    const r = installSkills({ skillsSrc: opts.skillsSrc, targets: [], dir: path.join(dir, "skills") });
    installSkills({ skillsSrc: opts.skillsSrc, targets: [], dir: path.join(dir, ".claude", "skills") });
    skills = r.destinations[0]?.skills ?? [];
  }
  return { dir, created, agentsFile, skills };
}
