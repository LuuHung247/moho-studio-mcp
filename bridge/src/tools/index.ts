import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MohoClient } from "../moho-client.js";
import { registerPassThrough, type PassThroughSpec } from "../tooling/define.js";
import { registerAnimTools } from "./anim.js";
import { registerBatchTool } from "./batch-tool.js";
import { registerProductionTools } from "./production.js";
import { registerRigTools } from "./rig.js";
import { documentSpecs } from "./specs-document.js";
import { drawSpecs } from "./specs-draw.js";
import { layerSpecs } from "./specs-layer.js";
import { rigSpecs } from "./specs-rig.js";
import { registerVisualTools } from "./visual.js";

/** Every tool that maps 1:1 to a Lua method. */
export const passThroughSpecs: readonly PassThroughSpec[] = [
  ...documentSpecs,
  ...layerSpecs,
  ...rigSpecs,
  ...drawSpecs,
];

export function registerTools(server: McpServer, client: MohoClient): void {
  registerPassThrough(server, client, passThroughSpecs);
  registerVisualTools(server, client);
  registerBatchTool(server, client);
  registerRigTools(server, client);
  registerAnimTools(server, client);
  registerProductionTools(server, client);
}
