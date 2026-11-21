/**
 * Installs the Lua plugin into Moho's script folders. This replaces the old
 * .bat/.sh installers so `npx moho-studio-mcp install-plugin` works anywhere.
 */

import fs from "node:fs";
import path from "node:path";

export const POLLER_LINE = "tool\tMohoMCP_Poller\t...";
const MENU_FILES = ["MohoMCP_Server.lua", "json.lua"] as const;
const MOHO_FOLDER_NAMES = ["Moho 14", "Moho Pro 14", "Moho 14.5", "Moho Pro 14.5"] as const;

export interface Env { [key: string]: string | undefined }

export interface InstallOptions {
  /** Folder containing MohoMCP_Server.lua, MohoMCP_Poller.lua, json.lua, moho_mcp/. */
  pluginSrc: string;
  /** Moho install folder; default: auto-detect. */
  mohoDir?: string;
  platform?: NodeJS.Platform;
  env?: Env;
  exists?: (p: string) => boolean;
}

export interface InstallResult {
  mohoRoot: string;
  menuDir: string;
  toolDir: string;
  files: string[];
  toolListUpdated: boolean;
}

export class InstallError extends Error {}

export function scriptsDir(mohoRoot: string, platform: NodeJS.Platform): string {
  return platform === "darwin"
    ? path.join(mohoRoot, "Moho Pro.app", "Contents", "Resources", "Support", "Scripts")
    : path.join(mohoRoot, "Resources", "Support", "Scripts");
}

export function candidateRoots(platform: NodeJS.Platform, env: Env): string[] {
  if (env.MOHO_DIR) return [env.MOHO_DIR];
  if (platform === "darwin") {
    return MOHO_FOLDER_NAMES.map((n) => `/Applications/${n}`);
  }
  const bases = [env.ProgramFiles, env["ProgramFiles(x86)"], env.ProgramW6432, "C:\\Program Files", "D:\\Program Files"]
    .filter((b): b is string => Boolean(b));
  const roots = bases.flatMap((b) => MOHO_FOLDER_NAMES.map((n) => path.win32.join(b, n)));
  return [...new Set(roots)];
}

export function findMohoRoot(
  platform: NodeJS.Platform, env: Env, exists: (p: string) => boolean = fs.existsSync,
): string | undefined {
  return candidateRoots(platform, env).find((root) => exists(scriptsDir(root, platform)));
}

function assertPluginSource(src: string): void {
  for (const f of [...MENU_FILES, "MohoMCP_Poller.lua", path.join("moho_mcp", "server.lua")]) {
    if (!fs.existsSync(path.join(src, f))) {
      throw new InstallError(`Plugin source is incomplete: ${path.join(src, f)} is missing.`);
    }
  }
}

function wrapFsError(err: unknown, target: string): never {
  const code = (err as NodeJS.ErrnoException).code;
  if (code === "EPERM" || code === "EACCES") {
    throw new InstallError(
      `No permission to write ${target}. ` +
        (process.platform === "win32"
          ? "Close Moho and re-run this command from a terminal opened with 'Run as administrator'."
          : "Close Moho and re-run with sudo."),
    );
  }
  throw err;
}

function ensureToolRegistered(toolDir: string): boolean {
  const listPath = path.join(toolDir, "_tool_list.txt");
  const current = fs.existsSync(listPath) ? fs.readFileSync(listPath, "utf8") : "";
  if (current.includes("MohoMCP_Poller")) return false;
  const sep = current === "" || current.endsWith("\n") ? "" : "\n";
  fs.writeFileSync(listPath, `${current}${sep}${POLLER_LINE}\n`);
  return true;
}

export function installPlugin(opts: InstallOptions): InstallResult {
  const platform = opts.platform ?? process.platform;
  const env = opts.env ?? process.env;
  const exists = opts.exists ?? fs.existsSync;
  assertPluginSource(opts.pluginSrc);

  const mohoRoot = opts.mohoDir ?? findMohoRoot(platform, env, exists);
  if (!mohoRoot) {
    throw new InstallError(
      "Could not find Moho. Pass the folder explicitly:\n" +
        '  npx moho-studio-mcp install-plugin --moho-dir "C:\\Program Files\\Moho 14"',
    );
  }
  const scripts = scriptsDir(mohoRoot, platform);
  if (!exists(scripts)) {
    throw new InstallError(`${scripts} does not exist — is "${mohoRoot}" really the Moho folder?`);
  }

  const menuDir = path.join(scripts, "Menu", "MohoMCP");
  const toolDir = path.join(scripts, "Tool");
  const files: string[] = [];

  try {
    fs.rmSync(menuDir, { recursive: true, force: true });
    fs.mkdirSync(menuDir, { recursive: true });
    for (const f of MENU_FILES) fs.copyFileSync(path.join(opts.pluginSrc, f), path.join(menuDir, f));
    fs.cpSync(path.join(opts.pluginSrc, "moho_mcp"), path.join(menuDir, "moho_mcp"), { recursive: true });
    fs.copyFileSync(path.join(opts.pluginSrc, "MohoMCP_Poller.lua"), path.join(toolDir, "MohoMCP_Poller.lua"));
    const toolListUpdated = ensureToolRegistered(toolDir);
    collectFiles(menuDir, files);
    files.push(path.join(toolDir, "MohoMCP_Poller.lua"));
    return { mohoRoot, menuDir, toolDir, files, toolListUpdated };
  } catch (err) {
    return wrapFsError(err, scripts);
  }
}

function collectFiles(dir: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(p, out);
    else out.push(p);
  }
}
