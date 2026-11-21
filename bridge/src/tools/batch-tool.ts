import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { config } from "../config.js";
import type { MohoClient } from "../moho-client.js";
import { callMoho, defineCustomTool } from "../tooling/define.js";
import { successContent } from "../tooling/results.js";

export function registerBatchTool(server: McpServer, client: MohoClient): void {
  defineCustomTool(server, {
    name: "batch_execute",
    description:
      "Run many Moho operations in ONE round-trip (~300 ms total instead of ~300 ms each). Use it whenever you have 2+ operations. " +
      'Method names use DOT notation ("bone.setTransform", "draw.ellipse", "layer.createLayer"); params match the tool schemas. ' +
      "Not allowed inside a batch: document.screenshot, render.frames, project.new/open, system.selfTest, batch.execute. " +
      "Returns per-operation results and a summary; use stopOnError when later operations depend on earlier ones.",
    shape: {
      operations: z
        .array(
          z.object({
            method: z.string().describe('e.g. "bone.setTransform"'),
            params: z.record(z.unknown()).optional(),
          }),
        )
        .min(1)
        .max(config.moho.maxBatchSize),
      stopOnError: z.boolean().optional().default(false),
    },
    handler: async ({ operations, stopOnError }) => {
      const timeout = config.moho.requestTimeout + operations.length * config.moho.batchTimeoutPerOp;
      return successContent(
        await callMoho(client, "batch.execute", { operations, stopOnError }, { timeout }),
      );
    },
  });
}
