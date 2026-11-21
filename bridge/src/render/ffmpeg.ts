/** ffmpeg argument builders (pure) and a safe runner (no shell). */

import { spawn } from "node:child_process";
import path from "node:path";
import { config } from "../config.js";

export type VideoFormat = "mp4" | "webm" | "gif" | "mov";

const FORMATS: readonly VideoFormat[] = ["mp4", "webm", "gif", "mov"];
const EVEN_DIMENSIONS = "scale=trunc(iw/2)*2:trunc(ih/2)*2";
const DEFAULT_CRF = 18;

const UNSAFE_PATH_CHARS = /[\u0000-\u001f]/;
const URL_SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]+:\/\//;

/**
 * Paths go to ffmpeg as arguments (never a shell), but ffmpeg itself treats
 * "http://...", "concat:..." and leading "-" specially and the concat list is
 * line based. Only plain absolute local paths without control characters pass.
 */
export function assertSafePath(p: string, what: string): string {
  if (UNSAFE_PATH_CHARS.test(p)) throw new Error(`${what}: path contains control characters`);
  if (URL_SCHEME.test(p) || /^(concat|file|pipe|subfile|data):/i.test(p)) {
    throw new Error(`${what}: only local file paths are allowed`);
  }
  if (!path.isAbsolute(p)) throw new Error(`${what}: use an absolute path (got "${p}")`);
  return p;
}

export function formatFor(outputPath: string): VideoFormat {
  const ext = path.extname(outputPath).slice(1).toLowerCase();
  if (!(FORMATS as readonly string[]).includes(ext)) {
    throw new Error(`Unsupported output extension ".${ext}". Use one of: ${FORMATS.join(", ")}`);
  }
  return ext as VideoFormat;
}

export interface EncodeOptions {
  framesDir: string;
  prefix: string;
  digits: number;
  extension: string;
  startNumber: number;
  fps: number;
  outputPath: string;
  audioPath?: string;
  /** Seconds of audio to skip (positive) or silence to add before it (negative). */
  audioOffset?: number;
  crf?: number;
}

export function buildEncodeArgs(o: EncodeOptions): string[] {
  if (!(o.fps > 0)) throw new Error("fps must be positive");
  const format = formatFor(o.outputPath);
  const escapedDir = o.framesDir.replace(/%/g, "%%");
  const pattern = path.join(escapedDir, `${o.prefix}%0${o.digits}d.${o.extension}`);

  const args = ["-y", "-hide_banner", "-loglevel", "error",
    "-framerate", String(o.fps), "-start_number", String(o.startNumber), "-i", pattern];

  if (o.audioPath && format !== "gif") {
    if (o.audioOffset && o.audioOffset < 0) args.push("-itsoffset", String(-o.audioOffset));
    if (o.audioOffset && o.audioOffset > 0) args.push("-ss", String(o.audioOffset));
    args.push("-i", o.audioPath);
  }

  switch (format) {
    case "mp4":
    case "mov":
      args.push("-vf", EVEN_DIMENSIONS, "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-crf", String(o.crf ?? DEFAULT_CRF), "-preset", "medium");
      if (o.audioPath) args.push("-c:a", "aac", "-b:a", "192k", "-shortest");
      if (format === "mp4") args.push("-movflags", "+faststart");
      break;
    case "webm":
      args.push("-vf", EVEN_DIMENSIONS, "-c:v", "libvpx-vp9", "-pix_fmt", "yuv420p",
        "-crf", String(Math.max(o.crf ?? 30, 25)), "-b:v", "0");
      if (o.audioPath) args.push("-c:a", "libopus", "-shortest");
      break;
    case "gif":
      args.push("-vf", "split[a][b];[a]palettegen[p];[b][p]paletteuse");
      break;
  }
  args.push(o.outputPath);
  return args;
}

/** ffmpeg concat-demuxer list file content. Single quotes are escaped. */
export function buildConcatList(inputs: readonly string[]): string {
  return inputs.map((p) => `file '${path.resolve(p).replace(/'/g, "'\\''")}'`).join("\n") + "\n";
}

export function buildConcatArgs(listPath: string, outputPath: string, reencode: boolean): string[] {
  const base = ["-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", listPath];
  const codec = reencode
    ? ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", String(DEFAULT_CRF), "-c:a", "aac"]
    : ["-c", "copy"];
  return [...base, ...codec, outputPath];
}

export function buildMuxArgs(videoPath: string, audioPath: string, outputPath: string): string[] {
  return ["-y", "-hide_banner", "-loglevel", "error", "-i", videoPath, "-i", audioPath,
    "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", outputPath];
}

const STDERR_TAIL_CHARS = 1500;

/** Run ffmpeg with an argument array (never through a shell). */
export function runFfmpeg(args: readonly string[], binary: string = config.ffmpegPath): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, [...args], { stdio: ["ignore", "ignore", "pipe"], windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (d: Buffer) => {
      stderr = (stderr + d.toString()).slice(-STDERR_TAIL_CHARS);
    });
    child.on("error", (err: NodeJS.ErrnoException) => {
      reject(
        err.code === "ENOENT"
          ? new Error(
              `ffmpeg not found ("${binary}"). Install ffmpeg and add it to PATH, or set MOHO_MCP_FFMPEG to its full path.`,
            )
          : err,
      );
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.trim()}`));
    });
  });
}

const MAX_CAPTURE_BYTES = 256 * 1024 * 1024;

/** Decode audio to mono signed 16-bit PCM and return the raw samples. */
export function decodeAudioPcm(audioPath: string, sampleRate: number, binary: string = config.ffmpegPath): Promise<Int16Array> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, ["-v", "error", "-i", audioPath, "-vn", "-ac", "1", "-ar", String(sampleRate), "-f", "s16le", "pipe:1"],
      { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    const chunks: Buffer[] = [];
    let total = 0;
    let stderr = "";
    child.stdout.on("data", (d: Buffer) => {
      total += d.length;
      if (total > MAX_CAPTURE_BYTES) {
        child.kill();
        reject(new Error("Audio is too long to analyse in memory"));
        return;
      }
      chunks.push(d);
    });
    child.stderr.on("data", (d: Buffer) => { stderr = (stderr + d.toString()).slice(-STDERR_TAIL_CHARS); });
    child.on("error", (err: NodeJS.ErrnoException) =>
      reject(err.code === "ENOENT" ? new Error(`ffmpeg not found ("${binary}"). Install ffmpeg or set MOHO_MCP_FFMPEG.`) : err));
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg could not decode the audio (code ${code}): ${stderr.trim()}`));
      const buf = Buffer.concat(chunks);
      resolve(new Int16Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 2)).slice());
    });
  });
}

/**
 * Shrink a PNG so a screenshot costs far fewer model tokens (image tokens scale
 * with pixel count: 1920x1080 ≈ 2.8k tokens, 800x450 ≈ 0.5k). Never throws:
 * without ffmpeg the original is kept.
 * @returns the width the file ended up with (0 if unknown).
 */
export async function downscalePng(file: string, maxWidth: number, binary: string = config.ffmpegPath): Promise<void> {
  if (!(maxWidth > 0)) return;
  const out = `${file}.small.png`;
  try {
    await runFfmpeg(["-y", "-loglevel", "error", "-i", file, "-vf", `scale='min(iw,${Math.floor(maxWidth)})':-2`, out], binary);
    const { rename } = await import("node:fs/promises");
    await rename(out, file);
  } catch {
    const { rm } = await import("node:fs/promises");
    await rm(out, { force: true });
  }
}

/** Width and height from a PNG header (no decoding). */
export function pngSize(buf: Buffer): { width: number; height: number } {
  if (buf.length < 24 || buf.toString("ascii", 1, 4) !== "PNG") return { width: 0, height: 0 };
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}
