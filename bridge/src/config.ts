import path from "node:path";
import os from "node:os";

const defaultIpcDir = process.env.MOHO_MCP_IPC_DIR ||
  path.join(os.tmpdir(), "moho-mcp");

export const config = {
  moho: {
    ipcDir: defaultIpcDir,
    pollInterval: 100,      // ms between checking for response files
    requestTimeout: 10000,  // ms before a request times out
    renderTimeout: 30000,   // ms timeout for render/screenshot requests
    batchTimeoutPerOp: 500, // additional ms per operation in a batch
    maxBatchSize: 200,      // maximum number of operations in a single batch (matches batch.lua)
    renderChunkFrames: 24,  // frames rendered per IPC call when exporting video
    renderTimeoutPerFrame: 4000, // ms budget per frame for render.frames
  },
  ffmpegPath: process.env.MOHO_MCP_FFMPEG || "ffmpeg",
  /**
   * Where a child bone's rest position is measured from.
   * "start": relative to the parent bone's start (tip attach = parent length, 0).
   * "tip": relative to the parent bone's tip (tip attach = 0, 0).
   * Verify once with rig_buildHumanoid + a full screenshot; switch via MOHO_MCP_BONE_ORIGIN.
   */
  boneOrigin: (process.env.MOHO_MCP_BONE_ORIGIN === "tip" ? "tip" : "start") as "start" | "tip",
  server: {
    name: "moho-mcp",
    version: "1.2.0",
  },
} as const;
