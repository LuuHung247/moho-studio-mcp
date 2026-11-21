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
import { sendKeys, sendMouseClick, sendMouseDrag } from "../platform-input.js";
import { callMoho, defineCustomTool } from "../tooling/define.js";
import { imageContent, successContent } from "../tooling/results.js";

async function readAndDelete(file: string): Promise<string> {
  const buf = await fs.promises.readFile(file);
  await fs.promises.unlink(file).catch(() => {});
  return buf.toString("base64");
}

export function registerVisualTools(server: McpServer, client: MohoClient): void {
  defineCustomTool(server, {
    name: "document_screenshot",
    description:
      'See your work. mode "scene" (default) renders the clean frame; "full" captures the whole Moho window (timeline, layers panel, bones). Take a screenshot after every significant change and compare it with what the user asked for.',
    shape: {
      mode: z.enum(["scene", "full"]).optional(),
      frame: z.number().optional().describe("Frame to render (default: current)"),
      width: z.number().optional().describe("Scene mode only"),
      height: z.number().optional().describe("Scene mode only"),
    },
    handler: async ({ mode, frame, width, height }) => {
      if ((mode ?? "scene") === "full") {
        if (frame !== undefined) await callMoho(client, "document.setFrame", { frame });
        const dir = path.join(os.tmpdir(), "moho-mcp");
        await fs.promises.mkdir(dir, { recursive: true });
        const file = path.join(dir, `capture_${Date.now()}.png`);
        const dims = await captureAppWindow(file);
        return imageContent(await readAndDelete(file), { mode: "full", frame: frame ?? null, ...dims });
      }

      const params: Record<string, unknown> = {};
      if (frame !== undefined) params.frame = frame;
      if (width !== undefined) params.width = width;
      if (height !== undefined) params.height = height;
      const r = (await callMoho(client, "document.screenshot", params, {
        timeout: config.moho.renderTimeout,
      })) as { filePath: string; frame: number; width: number; height: number };
      return imageContent(await readAndDelete(r.filePath), {
        mode: "scene", frame: r.frame, width: r.width, height: r.height,
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
