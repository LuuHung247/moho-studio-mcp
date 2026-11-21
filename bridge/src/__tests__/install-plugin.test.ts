import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { candidateRoots, findMohoRoot, installPlugin, InstallError, POLLER_LINE, scriptsDir } from "../cli/install-plugin.js";

let tmp: string;
let pluginSrc: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "moho-inst-"));
  pluginSrc = path.join(tmp, "plugin");
  fs.mkdirSync(path.join(pluginSrc, "moho_mcp", "tools"), { recursive: true });
  for (const f of ["MohoMCP_Server.lua", "MohoMCP_Poller.lua", "json.lua", "moho_mcp/server.lua", "moho_mcp/tools/draw.lua"]) {
    fs.writeFileSync(path.join(pluginSrc, f), `-- ${f}`);
  }
});
afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

function fakeMoho(platform: NodeJS.Platform): string {
  const root = path.join(tmp, "Moho 14");
  const scripts = scriptsDir(root, platform);
  fs.mkdirSync(path.join(scripts, "Menu"), { recursive: true });
  fs.mkdirSync(path.join(scripts, "Tool"), { recursive: true });
  return root;
}

describe("install-plugin", () => {
  it("copies every module (incl. nested tools) and registers the poller", () => {
    const root = fakeMoho("win32");
    const r = installPlugin({ pluginSrc, mohoDir: root, platform: "win32" });
    expect(fs.existsSync(path.join(r.menuDir, "moho_mcp", "tools", "draw.lua"))).toBe(true);
    expect(fs.existsSync(path.join(r.toolDir, "MohoMCP_Poller.lua"))).toBe(true);
    expect(fs.readFileSync(path.join(r.toolDir, "_tool_list.txt"), "utf8")).toBe(`${POLLER_LINE}\n`);
    expect(r.toolListUpdated).toBe(true);
  });

  it("is idempotent, replaces stale files and does not duplicate the tool entry", () => {
    const root = fakeMoho("win32");
    const first = installPlugin({ pluginSrc, mohoDir: root, platform: "win32" });
    fs.writeFileSync(path.join(first.menuDir, "moho_mcp", "stale.lua"), "old");
    const second = installPlugin({ pluginSrc, mohoDir: root, platform: "win32" });
    expect(fs.existsSync(path.join(second.menuDir, "moho_mcp", "stale.lua"))).toBe(false);
    expect(second.toolListUpdated).toBe(false);
    const list = fs.readFileSync(path.join(second.toolDir, "_tool_list.txt"), "utf8");
    expect(list.match(/MohoMCP_Poller/g)).toHaveLength(1);
  });

  it("keeps existing tool-list entries and adds a newline when missing", () => {
    const root = fakeMoho("win32");
    fs.writeFileSync(path.join(scriptsDir(root, "win32"), "Tool", "_tool_list.txt"), "tool\tLM_Other\t...");
    installPlugin({ pluginSrc, mohoDir: root, platform: "win32" });
    const list = fs.readFileSync(path.join(scriptsDir(root, "win32"), "Tool", "_tool_list.txt"), "utf8");
    expect(list).toBe(`tool\tLM_Other\t...\n${POLLER_LINE}\n`);
  });

  it("uses the .app bundle layout on macOS", () => {
    const root = fakeMoho("darwin");
    const r = installPlugin({ pluginSrc, mohoDir: root, platform: "darwin" });
    expect(r.menuDir).toContain(path.join("Moho Pro.app", "Contents", "Resources"));
  });

  it("explains how to proceed when Moho is not found", () => {
    expect(() => installPlugin({ pluginSrc, platform: "win32", env: {}, exists: () => false })).toThrow(/--moho-dir/);
  });

  it("rejects a folder that is not Moho and an incomplete plugin source", () => {
    expect(() => installPlugin({ pluginSrc, mohoDir: tmp, platform: "win32" })).toThrow(InstallError);
    const root = fakeMoho("win32");
    fs.rmSync(path.join(pluginSrc, "moho_mcp", "server.lua"));
    expect(() => installPlugin({ pluginSrc, mohoDir: root, platform: "win32" })).toThrow(/incomplete/);
  });
});

describe("Moho discovery", () => {
  it("MOHO_DIR wins over defaults", () => {
    expect(candidateRoots("win32", { MOHO_DIR: "E:\\Moho" })).toEqual(["E:\\Moho"]);
  });

  it("searches Program Files variants on Windows without duplicates", () => {
    const roots = candidateRoots("win32", { ProgramFiles: "C:\\Program Files", "ProgramFiles(x86)": "C:\\Program Files (x86)" });
    expect(roots).toContain("C:\\Program Files\\Moho 14");
    expect(roots).toContain("C:\\Program Files (x86)\\Moho Pro 14.5");
    expect(new Set(roots).size).toBe(roots.length);
  });

  it("picks the first root whose Scripts folder exists", () => {
    const hit = "C:\\Program Files\\Moho Pro 14";
    const found = findMohoRoot("win32", { ProgramFiles: "C:\\Program Files" }, (p) => p === scriptsDir(hit, "win32"));
    expect(found).toBe(hit);
  });
});
