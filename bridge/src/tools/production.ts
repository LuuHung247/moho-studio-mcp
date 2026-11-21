/** Film production: render frames, encode video, join scenes, add audio. */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { config } from "../config.js";
import type { MohoClient } from "../moho-client.js";
import {
  assertSafePath, buildConcatArgs, buildConcatList, buildEncodeArgs, buildMuxArgs, formatFor, runFfmpeg,
} from "../render/ffmpeg.js";
import { findMohoExecutable, buildMohoRenderArgs, presetFor, runMohoRender } from "../render/moho-cli.js";
import { chunk } from "../tooling/batch.js";
import { LIMITS } from "./schema.js";
import { callMoho, defineCustomTool } from "../tooling/define.js";
import { successContent } from "../tooling/results.js";

interface DocInfo { fps: number; startFrame: number; endFrame: number; filePath?: string }

interface RenderFramesResult { prefix: string; extension: string; digits: number }

/**
 * Moho's Lua uses ANSI file APIs on Windows, so a temp path with non-ASCII
 * characters (e.g. a Vietnamese user name) can make io.open fail. Fall back to
 * a plain ASCII folder on the system drive. MOHO_MCP_RENDER_DIR overrides.
 */
export function renderRoot(tmp: string = os.tmpdir(), env: NodeJS.ProcessEnv = process.env): string {
  if (env.MOHO_MCP_RENDER_DIR) return env.MOHO_MCP_RENDER_DIR;
  const primary = path.join(tmp, "moho-mcp");
  // eslint-disable-next-line no-control-regex
  return /^[\x00-\x7f]*$/.test(primary) ? primary : path.join(path.parse(tmp).root, "moho-mcp");
}

const log = (msg: string): void => {
  process.stderr.write(`[moho-mcp] ${msg}\n`);
};

async function fileSize(p: string): Promise<number> {
  return (await fs.promises.stat(p)).size;
}

async function assertFileExists(p: string, what: string): Promise<void> {
  try {
    await fs.promises.access(p);
  } catch {
    throw new Error(`${what} not found: ${p}`);
  }
}

export function registerProductionTools(server: McpServer, client: MohoClient): void {
  defineCustomTool(server, {
    name: "render_exportVideo",
    description:
      "Render the open document to a video file (.mp4, .mov, .webm or .gif). Renders every frame through Moho into a temporary PNG sequence, then encodes with ffmpeg (optionally muxing an audio track). Long scenes take minutes and Moho's UI is busy meanwhile. Frames default to the document's start..end range.",
    shape: {
      outputPath: z.string().describe("Absolute path of the video to write"),
      startFrame: z.number().int().optional(),
      endFrame: z.number().int().optional(),
      fps: z.number().positive().optional().describe("Default: the document's FPS"),
      audioPath: z.string().optional().describe("Soundtrack to mux (wav/mp3/aac...)"),
      audioOffset: z.number().optional().describe("Seconds: >0 skips into the audio, <0 delays it"),
      crf: z.number().min(0).max(51).optional().describe("Quality: lower = better (default 18)"),
      keepFrames: z.boolean().optional().describe("Keep the PNG sequence (frames engine only, default false)"),
      engine: z.enum(["auto", "moho", "frames"]).default("auto").describe('"moho" = Moho\'s own command-line renderer (headless, includes the project\'s audio layers; needs the document saved), "frames" = render PNGs through the plugin then ffmpeg, "auto" = try moho, fall back to frames'),
    },
    handler: async (args) => {
      formatFor(assertSafePath(args.outputPath, "outputPath")); // fail fast on a bad path/extension
      if (args.audioPath) await assertFileExists(assertSafePath(args.audioPath, "audioPath"), "Audio file");

      const info = (await callMoho(client, "document.getInfo")) as DocInfo;
      const start = args.startFrame ?? info.startFrame;
      const end = args.endFrame ?? info.endFrame;
      const fps = args.fps ?? info.fps;
      if (end < start) throw new Error(`endFrame (${end}) is before startFrame (${start})`);

      const wantsMoho = args.engine !== "frames" && presetFor(args.outputPath) !== null && fps === info.fps;
      const mohoExe = wantsMoho ? findMohoExecutable() : undefined;
      let mohoError: string | undefined;

      if (mohoExe && info.filePath) {
        try {
          await fs.promises.mkdir(path.dirname(args.outputPath), { recursive: true });
          await callMoho(client, "document.save", {}, { timeout: 30000 }); // render the current state
          const logPath = path.join(renderRoot(), `moho_render_${Date.now()}.log`);
          await fs.promises.mkdir(path.dirname(logPath), { recursive: true });
          const target = args.audioPath ? path.join(renderRoot(), `moho_video_${Date.now()}${path.extname(args.outputPath)}`) : args.outputPath;
          const mohoArgs = buildMohoRenderArgs({
            docPath: info.filePath, outputPath: target, logPath,
            startFrame: args.startFrame, endFrame: args.endFrame,
          });
          const budget = 60000 + (end - start + 1) * 4000;
          log(`rendering with Moho command line (${mohoExe})`);
          await runMohoRender(mohoExe, mohoArgs, target, logPath, budget);
          if (args.audioPath) {
            await runFfmpeg(buildMuxArgs(target, args.audioPath, args.outputPath));
            await fs.promises.rm(target, { force: true });
          }
          return successContent({
            engine: "moho", outputPath: args.outputPath, frames: end - start + 1, fps,
            durationSeconds: Number(((end - start + 1) / fps).toFixed(2)), bytes: await fileSize(args.outputPath),
          });
        } catch (err) {
          mohoError = (err as Error).message;
          if (args.engine === "moho") throw err;
          log(`Moho command-line render failed, falling back to frame export: ${mohoError.slice(0, 200)}`);
        }
      } else if (args.engine === "moho") {
        throw new Error(mohoExe ? "The document has no file path: save it first (document_save with filePath)." : "Moho executable not found. Set MOHO_MCP_MOHO_EXE to Moho.exe, or use engine \"frames\".");
      }

      const framesDir = path.join(renderRoot(), `render_${Date.now()}`);
      await fs.promises.mkdir(framesDir, { recursive: true });
      await fs.promises.mkdir(path.dirname(args.outputPath), { recursive: true });

      const frames = Array.from({ length: end - start + 1 }, (_, i) => start + i);
      let meta: RenderFramesResult | undefined;

      try {
        for (const part of chunk(frames, config.moho.renderChunkFrames)) {
          const timeout = config.moho.requestTimeout + part.length * config.moho.renderTimeoutPerFrame;
          meta = (await callMoho(client, "render.frames", {
            dir: framesDir, startFrame: part[0], endFrame: part[part.length - 1],
          }, { timeout })) as RenderFramesResult;
          log(`rendered frames ${part[0]}..${part[part.length - 1]} of ${start}..${end}`);
        }
        if (!meta) throw new Error("Nothing was rendered");

        await runFfmpeg(buildEncodeArgs({
          framesDir, prefix: meta.prefix, digits: meta.digits, extension: meta.extension,
          startNumber: start, fps, outputPath: args.outputPath,
          audioPath: args.audioPath, audioOffset: args.audioOffset, crf: args.crf,
        }));
      } finally {
        if (!args.keepFrames) await fs.promises.rm(framesDir, { recursive: true, force: true });
      }

      return successContent({
        engine: "frames",
        ...(mohoError ? { mohoEngineError: mohoError.slice(0, 300) } : {}),
        outputPath: args.outputPath,
        frames: frames.length,
        fps,
        durationSeconds: Number((frames.length / fps).toFixed(2)),
        bytes: await fileSize(args.outputPath),
        framesDir: args.keepFrames ? framesDir : null,
      });
    },
  });

  defineCustomTool(server, {
    name: "render_concatVideos",
    description:
      "Join scene videos into one film, in the order given. Fast stream copy by default (all inputs must share codec, size and fps — true for videos from render_exportVideo with the same settings); set reencode=true to normalise mismatched inputs.",
    shape: {
      inputs: z.array(z.string().max(4096)).min(2).max(LIMITS.videos).describe("Absolute paths, in playback order"),
      outputPath: z.string(),
      reencode: z.boolean().optional(),
    },
    handler: async ({ inputs, outputPath, reencode }) => {
      formatFor(assertSafePath(outputPath, "outputPath"));
      for (const p of inputs) await assertFileExists(assertSafePath(p, "input"), "Input video");
      await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

      const listPath = path.join(renderRoot(), `concat_${Date.now()}.txt`);
      await fs.promises.mkdir(path.dirname(listPath), { recursive: true });
      await fs.promises.writeFile(listPath, buildConcatList(inputs), "utf8");
      try {
        await runFfmpeg(buildConcatArgs(listPath, outputPath, reencode ?? false));
      } finally {
        await fs.promises.rm(listPath, { force: true });
      }
      return successContent({ outputPath, inputs: inputs.length, bytes: await fileSize(outputPath) });
    },
  });

  defineCustomTool(server, {
    name: "render_addAudio",
    description: "Add or replace the soundtrack of an existing video (video stream is copied, audio encoded as AAC).",
    shape: { videoPath: z.string(), audioPath: z.string(), outputPath: z.string() },
    handler: async ({ videoPath, audioPath, outputPath }) => {
      assertSafePath(videoPath, "videoPath");
      assertSafePath(audioPath, "audioPath");
      assertSafePath(outputPath, "outputPath");
      await assertFileExists(videoPath, "Video");
      await assertFileExists(audioPath, "Audio file");
      await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
      await runFfmpeg(buildMuxArgs(videoPath, audioPath, outputPath));
      return successContent({ outputPath, bytes: await fileSize(outputPath) });
    },
  });

  defineCustomTool(server, {
    name: "render_checkEnvironment",
    description: "Verify ffmpeg is installed and reachable before a long export.",
    shape: {},
    handler: async () => {
      try {
        await runFfmpeg(["-version"]);
        return successContent({ ffmpeg: "ok", binary: config.ffmpegPath });
      } catch (err) {
        return successContent({ ffmpeg: "missing", binary: config.ffmpegPath, detail: (err as Error).message });
      }
    },
  });
}
