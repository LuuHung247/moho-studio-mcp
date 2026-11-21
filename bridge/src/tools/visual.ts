/** Screenshot + simulated input: the "see and click" control plane. */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";

const coord = z.number().finite().min(-20000).max(20000);
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { config } from "../config.js";
import type { MohoClient } from "../moho-client.js";
import { captureAppWindow } from "../platform-capture.js";
import { downscalePng, pngSize } from "../render/ffmpeg.js";
import { sendKeys, sendMouseClick, sendMouseDrag } from "../platform-input.js";
import { callMoho, defineCustomTool } from "../tooling/define.js";
import { imageContent, successContent } from "../tooling/results.js";

const SCENE_MAX_WIDTH = 800;
const WINDOW_MAX_WIDTH = 1280;

async function readAndDelete(file: string, maxWidth: number): Promise<{ base64: string; width: number; height: number; originalWidth: number }> {
  const original = pngSize(await fs.promises.readFile(file));
  await downscalePng(file, maxWidth);
  const buf = await fs.promises.readFile(file);
  await fs.promises.unlink(file).catch(() => {});
  const size = pngSize(buf);
  return { base64: buf.toString("base64"), width: size.width, height: size.height, originalWidth: original.width };
}

export function registerVisualTools(server: McpServer, client: MohoClient): void {
  defineCustomTool(server, {
    name: "document_screenshot",
    description:
      'See your work. mode "scene" (default) renders the clean frame; "full" captures the whole Moho window (timeline, layers panel, bones). Take a screenshot after every significant change and compare it with what the user asked for.',
    shape: {
      mode: z.enum(["scene", "full"]).optional(),
      frame: z.number().optional().describe("Frame to render (default: current)"),
      width: z.number().optional().describe("Render width in scene mode (rarely needed)"),
      height: z.number().optional().describe("Render height in scene mode (rarely needed)"),
      maxWidth: z.number().min(0).max(4096).optional().describe("Shrink the returned image to this width to save tokens (default 800 scene / 1280 full; 0 = original size). Use a larger value only to inspect fine detail."),
    },
    handler: async ({ mode, frame, width, height, maxWidth }) => {
      if ((mode ?? "scene") === "full") {
        if (frame !== undefined) await callMoho(client, "document.setFrame", { frame });
        const dir = path.join(os.tmpdir(), "moho-mcp");
        await fs.promises.mkdir(dir, { recursive: true });
        const file = path.join(dir, `capture_${Date.now()}.png`);
        await captureAppWindow(file);
        const img = await readAndDelete(file, maxWidth ?? WINDOW_MAX_WIDTH);
        return imageContent(img.base64, { mode: "full", frame: frame ?? null, width: img.width, height: img.height, originalWidth: img.originalWidth });
      }

      const params: Record<string, unknown> = {};
      if (frame !== undefined) params.frame = frame;
      if (width !== undefined) params.width = width;
      if (height !== undefined) params.height = height;
      const r = (await callMoho(client, "document.screenshot", params, {
        timeout: config.moho.renderTimeout,
      })) as { filePath: string; frame: number; width: number; height: number };
      const img = await readAndDelete(r.filePath, maxWidth ?? SCENE_MAX_WIDTH);
      return imageContent(img.base64, {
        mode: "scene", frame: r.frame, width: img.width, height: img.height, originalWidth: img.originalWidth,
      });
    },
  });

  defineCustomTool(server, {
    name: "input_mouseClick",
    description:
      "Click at window-relative (x, y). Use after document_screenshot(mode='full') to operate parts of Moho that have no API.",
    shape: {
      x: coord,
      y: coord,
      button: z.enum(["left", "right", "middle"]).optional(),
      clickType: z.enum(["single", "double"]).optional(),
    },
    handler: async ({ x, y, button, clickType }) =>
      successContent(await sendMouseClick(x, y, button ?? "left", clickType ?? "single")),
  });

  defineCustomTool(server, {
    name: "input_mouseDrag",
    description: "Drag from (startX, startY) to (endX, endY), window-relative.",
    shape: {
      startX: coord,
      startY: coord,
      endX: coord,
      endY: coord,
      button: z.enum(["left", "right"]).optional(),
      steps: z.number().int().min(1).max(200).optional().describe("Intermediate points (default 10)"),
    },
    handler: async ({ startX, startY, endX, endY, button, steps }) =>
      successContent(await sendMouseDrag(startX, startY, endX, endY, button ?? "left", steps ?? 10)),
  });

  defineCustomTool(server, {
    name: "input_sendKeys",
    description: 'Send a shortcut to Moho, e.g. "ctrl+z", "ctrl+shift+z", "space", "ctrl+s", "f5".',
    shape: { keys: z.string().max(64) },
    handler: async ({ keys }) => successContent(await sendKeys(keys)),
  });
}
