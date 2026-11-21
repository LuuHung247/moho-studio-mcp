/** Sub-commands handled before the MCP server starts. */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { config } from "../config.js";
import { findMohoRoot, installPlugin, InstallError, scriptsDir } from "./install-plugin.js";
import { installSkills, type SkillTarget } from "./install-skills.js";

const PACKAGE_ROOT = path.resolve(__dirname, "..", "..");
const PLUGIN_SRC = path.join(PACKAGE_ROOT, "plugin");
const SKILLS_SRC = path.join(PACKAGE_ROOT, "skills");

const HELP = `moho-studio-mcp ${config.server.version}

Usage:
  moho-studio-mcp                     Start the MCP server (stdio) — this is what Codex/Claude run
  moho-studio-mcp install-plugin      Copy the Lua plugin into Moho  [--moho-dir <folder>]
  moho-studio-mcp install-skills      Copy the agent skills for Codex / Claude Code  [--target codex|claude|all] [--dir <folder>]
  moho-studio-mcp doctor              Check Node, ffmpeg, Moho and the plugin
  moho-studio-mcp --version
`;

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

function runInstall(args: string[]): number {
  try {
    const r = installPlugin({ pluginSrc: PLUGIN_SRC, mohoDir: flag(args, "--moho-dir") });
    console.log(`Moho found at: ${r.mohoRoot}`);
    console.log(`Installed ${r.files.length} files to ${r.menuDir}`);
    console.log(r.toolListUpdated ? "Registered MohoMCP_Poller in the tool list." : "MohoMCP_Poller already registered.");
    console.log("\nNext: restart Moho, then Scripts > MohoMCP > Start/Stop MohoMCP Server,");
    console.log("and select the 'MohoMCP Poller' tool (last toolbar group).");
    return 0;
  } catch (err) {
    console.error(err instanceof InstallError ? `ERROR: ${err.message}` : err);
    return 1;
  }
}

function runInstallSkills(args: string[]): number {
  const t = flag(args, "--target") ?? "all";
  if (!["codex", "claude", "all"].includes(t)) {
    console.error('ERROR: --target must be "codex", "claude" or "all"');
    return 1;
  }
  const targets: SkillTarget[] = t === "all" ? ["codex", "claude"] : [t as SkillTarget];
  try {
    const r = installSkills({ skillsSrc: SKILLS_SRC, targets, dir: flag(args, "--dir") });
    for (const d of r.destinations) console.log(`Installed ${d.skills.length} skills to ${d.dir}`);
    console.log("\nRestart the agent so it picks them up. Start a task with: \"Dùng skill moho-studio để ...\"");
    return 0;
  } catch (err) {
    console.error(`ERROR: ${(err as Error).message}`);
    return 1;
  }
}

function check(label: string, ok: boolean, detail: string, optional = false): boolean {
  console.log(`${ok ? "[ok]  " : optional ? "[warn]" : "[FAIL]"} ${label}: ${detail}`);
  return ok;
}

function runDoctor(): number {
  const results: boolean[] = [];
  const major = Number(process.versions.node.split(".")[0]);
  results.push(check("Node.js", major >= 20, process.version + (major >= 20 ? "" : " (need 20+)")));

  const ff = spawnSync(config.ffmpegPath, ["-version"], { encoding: "utf8" });
  results.push(check("ffmpeg", ff.status === 0,
    ff.status === 0 ? (ff.stdout.split("\n")[0] ?? "") : `not found ("${config.ffmpegPath}") — needed only for exporting video`));

  const platform = process.platform;
  const root = findMohoRoot(platform, process.env);
  results.push(check("Moho", Boolean(root), root ?? "not found — use install-plugin --moho-dir <folder>"));

  if (root) {
    const installed = path.join(scriptsDir(root, platform), "Menu", "MohoMCP", "MohoMCP_Server.lua");
    results.push(check("Plugin installed", fs.existsSync(installed), installed));
  }

  const status = path.join(config.moho.ipcDir, "status.json");
  let running = false;
  try { running = JSON.parse(fs.readFileSync(status, "utf8")).running === true; } catch { /* not running */ }
  check("Plugin server running (optional)", running,
    running ? `status file at ${status}` : "start it in Moho: Scripts > MohoMCP > Start/Stop MohoMCP Server", true);

  const asciiTemp = /^[\x00-\x7f]*$/.test(os.tmpdir());
  check("ASCII temp folder (Windows/Lua)", asciiTemp,
    asciiTemp ? os.tmpdir() : `${os.tmpdir()} has non-ASCII characters; set TEMP/TMP to C:\\Temp if requests time out`, true);

  return results.every(Boolean) ? 0 : 1;
}

/** @returns exit code when a sub-command ran, or null to start the server. */
export function runCli(argv: string[]): number | null {
  const [cmd, ...rest] = argv;
  switch (cmd) {
    case "install-plugin": return runInstall(rest);
    case "install-skills": return runInstallSkills(rest);
    case "doctor": return runDoctor();
    case "--version": case "-v": console.log(config.server.version); return 0;
    case "--help": case "-h": case "help": console.log(HELP); return 0;
    default: return null;
  }
}
