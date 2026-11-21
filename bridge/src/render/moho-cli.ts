/**
 * Moho's own command-line renderer (Appendix G of the manual):
 *   Moho.exe -r Scene.moho -f MP4 -options "MP4 (MPEG4-AAC)" -o out.mp4 -start 1 -end 240 -log render.log
 * It renders headless (no UI blocking, includes the project's audio layers),
 * so it is the preferred export engine; the PNG-sequence path stays as fallback.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { candidateRoots, type Env } from "../cli/install-plugin.js";
import { formatFor } from "./ffmpeg.js";

const LOG_TAIL_CHARS = 1200;

export interface MohoRenderOptions {
  docPath: string;
  outputPath: string;
  startFrame?: number;
  endFrame?: number;
  logPath: string;
}

/** Format/preset names as listed in Moho's Export Animation dialog. */
export function presetFor(outputPath: string): { format: string; options?: string } | null {
  const ext = formatFor(outputPath);
  switch (ext) {
    case "mp4": return { format: "MP4", options: "MP4 (MPEG4-AAC)" };
    case "mov": return { format: "MOV", options: "MOV (MPEG4-AAC)" };
    case "gif": return { format: "Animated GIF" };
    default: return null; // webm etc. are not Moho presets
  }
}

export function buildMohoRenderArgs(o: MohoRenderOptions): string[] {
  const preset = presetFor(o.outputPath);
  if (!preset) throw new Error(`Moho cannot render ${path.extname(o.outputPath)} directly`);
  const args = ["-r", o.docPath, "-f", preset.format];
  if (preset.options) args.push("-options", preset.options);
  args.push("-o", o.outputPath);
  if (o.startFrame !== undefined) args.push("-start", String(o.startFrame));
  if (o.endFrame !== undefined) args.push("-end", String(o.endFrame));
  args.push("-log", o.logPath);
  return args;
}

export function candidateExecutables(platform: NodeJS.Platform, env: Env): string[] {
  if (env.MOHO_MCP_MOHO_EXE) return [env.MOHO_MCP_MOHO_EXE];
  const roots = candidateRoots(platform, env);
  if (platform === "darwin") {
    return roots.flatMap((r) => [
      path.join(r, "Moho Pro.app", "Contents", "MacOS", "Moho"),
      path.join(r, "Moho.app", "Contents", "MacOS", "Moho"),
      path.join(r, "Moho Pro.app", "Contents", "MacOS", "Moho Pro"),
    ]);
  }
  return roots.map((r) => path.win32.join(r, "Moho.exe"));
}

export function findMohoExecutable(
  platform: NodeJS.Platform = process.platform,
  env: Env = process.env,
  exists: (p: string) => boolean = fs.existsSync,
): string | undefined {
  return candidateExecutables(platform, env).find((p) => exists(p));
}

function tail(file: string): string {
  try {
    return fs.readFileSync(file, "utf8").slice(-LOG_TAIL_CHARS).trim();
  } catch {
    return "";
  }
}

/** Run Moho's renderer (no shell). Resolves when the output file exists. */
export function runMohoRender(exe: string, args: readonly string[], outputPath: string, logPath: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(exe, [...args], { stdio: "ignore", windowsHide: true });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Moho renderer timed out after ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const produced = fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0;
      if (code === 0 && produced) return resolve();
      reject(new Error(`Moho renderer failed (exit ${code}, output ${produced ? "present" : "missing"}). Log: ${tail(logPath) || "(empty)"}`));
    });
  });
}
