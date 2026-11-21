import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installSkills, listSkills, skillsDirFor } from "../cli/install-skills.js";

let tmp: string;
let src: string;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "moho-sk-"));
  src = path.join(tmp, "skills");
  for (const n of ["a-skill", "b-skill"]) {
    fs.mkdirSync(path.join(src, n, "references"), { recursive: true });
    fs.writeFileSync(path.join(src, n, "SKILL.md"), `---\nname: ${n}\ndescription: x\n---\n`);
    fs.writeFileSync(path.join(src, n, "references", "r.md"), "ref");
  }
  fs.mkdirSync(path.join(src, "not-a-skill"));
});
afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe("install-skills", () => {
  it("lists only folders that contain SKILL.md", () => {
    expect(listSkills(src)).toEqual(["a-skill", "b-skill"]);
  });

  it("installs to Codex and Claude folders (CODEX_HOME honoured)", () => {
    const home = path.join(tmp, "home");
    const codexHome = path.join(tmp, "codexhome");
    const r = installSkills({ skillsSrc: src, targets: ["codex", "claude"], home, env: { CODEX_HOME: codexHome } });
    expect(r.destinations.map((d) => d.dir)).toEqual([path.join(codexHome, "skills"), path.join(home, ".claude", "skills")]);
    expect(fs.existsSync(path.join(codexHome, "skills", "a-skill", "references", "r.md"))).toBe(true);
    expect(fs.existsSync(path.join(home, ".claude", "skills", "b-skill", "SKILL.md"))).toBe(true);
  });

  it("replaces an older installed copy but leaves other skills alone", () => {
    const dir = path.join(tmp, "dest");
    fs.mkdirSync(path.join(dir, "a-skill"), { recursive: true });
    fs.writeFileSync(path.join(dir, "a-skill", "stale.md"), "old");
    fs.mkdirSync(path.join(dir, "someone-elses"), { recursive: true });
    installSkills({ skillsSrc: src, targets: [], dir });
    expect(fs.existsSync(path.join(dir, "a-skill", "stale.md"))).toBe(false);
    expect(fs.existsSync(path.join(dir, "someone-elses"))).toBe(true);
  });

  it("defaults to ~/.codex when CODEX_HOME is unset", () => {
    expect(skillsDirFor("codex", {}, "/h")).toBe(path.join("/h", ".codex", "skills"));
  });

  it("fails clearly on a missing or empty source", () => {
    expect(() => installSkills({ skillsSrc: path.join(tmp, "nope"), targets: ["codex"] })).toThrow(/not found/);
    expect(() => installSkills({ skillsSrc: path.join(src, "not-a-skill"), targets: ["codex"] })).toThrow(/No skills/);
  });
});
