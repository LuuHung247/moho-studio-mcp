import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { agentsTemplate, initWorkspace, WORKSPACE_FOLDERS } from "../cli/init-workspace.js";

let tmp: string;
let skillsSrc: string;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "moho-ws-"));
  skillsSrc = path.join(tmp, "src-skills");
  fs.mkdirSync(path.join(skillsSrc, "moho-studio"), { recursive: true });
  fs.writeFileSync(path.join(skillsSrc, "moho-studio", "SKILL.md"), "---\nname: moho-studio\ndescription: x\n---\n");
});
afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe("init-workspace", () => {
  it("creates the folder layout (even when the path contains spaces) and AGENTS.md with absolute paths", () => {
    const dir = path.join(tmp, "Ai project", "moho phim");
    const r = initWorkspace({ dir });
    for (const f of WORKSPACE_FOLDERS) expect(fs.statSync(path.join(dir, f)).isDirectory()).toBe(true);
    const agents = fs.readFileSync(path.join(dir, "AGENTS.md"), "utf8");
    expect(agents).toContain(path.join(dir, "scenes"));
    expect(agents).toContain(path.join(dir, "render"));
    expect(r.agentsFile).toBe("created");
    expect(fs.readFileSync(path.join(dir, "state.md"), "utf8")).toContain("Layers (name -> layerId)");
    expect(agents).toContain(path.join(dir, "state.md"));
    expect(fs.existsSync(path.join(dir, "skills"))).toBe(false);
  });

  it("copies the skills into the workspace for any agent, and for Claude Code project scope", () => {
    const dir = path.join(tmp, "ws");
    const r = initWorkspace({ dir, skillsSrc, withSkills: true });
    expect(r.skills).toEqual(["moho-studio"]);
    expect(fs.existsSync(path.join(dir, "skills", "moho-studio", "SKILL.md"))).toBe(true);
    expect(fs.existsSync(path.join(dir, ".claude", "skills", "moho-studio", "SKILL.md"))).toBe(true);
    expect(fs.readFileSync(path.join(dir, "AGENTS.md"), "utf8")).toContain(path.join(dir, "skills", "moho-studio", "SKILL.md"));
  });

  it("never overwrites an existing AGENTS.md and is idempotent", () => {
    const dir = path.join(tmp, "ws2");
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, "AGENTS.md"), "my own rules");
    const r = initWorkspace({ dir });
    expect(r.agentsFile).toBe("kept-existing");
    expect(fs.readFileSync(path.join(dir, "AGENTS.md"), "utf8")).toBe("my own rules");
    expect(initWorkspace({ dir }).created).toEqual([]);
  });

  it("points at the global install when skills are not copied", () => {
    expect(agentsTemplate("/w", false)).toContain("install-skills");
  });
});
