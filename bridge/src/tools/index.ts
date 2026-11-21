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
import { isAllowed, parseToolset } from "./toolsets.js";

/** Every tool that maps 1:1 to a Lua method. */
export const passThroughSpecs: readonly PassThroughSpec[] = [
  ...documentSpecs,
  ...layerSpecs,
  ...rigSpecs,
  ...drawSpecs,
];

/** Wrap the server so tools outside the selected toolset are silently not registered. */
function filtered(server: McpServer, toolset: ReadonlySet<string>): McpServer {
  return new Proxy(server, {
    get(target, prop, receiver) {
      if (prop === "tool") {
        return (name: string, ...rest: unknown[]) =>
          isAllowed(name, toolset)
            ? (target.tool as (...a: unknown[]) => unknown).call(target, name, ...rest)
            : undefined;
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

export function registerTools(
  server: McpServer,
  client: MohoClient,
  env: { [key: string]: string | undefined } = process.env,
): void {
  const toolset = parseToolset(env.MOHO_MCP_TOOLSET);
  const s = filtered(server, toolset);
  registerPassThrough(s, client, passThroughSpecs);
  registerVisualTools(s, client);
  registerBatchTool(s, client);
  registerRigTools(s, client);
  registerAnimTools(s, client);
  registerProductionTools(s, client);
}
