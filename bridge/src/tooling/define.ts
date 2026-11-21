/**
 * Declarative tool registration.
 *
 * Most MOHO tools are a 1:1 mapping from an MCP tool to a JSON-RPC method on
 * the Lua side. Those are declared as data (`PassThroughSpec`) and registered
 * by one shared function, instead of 50 copies of the same try/catch handler.
 * Tools that do real work in the bridge (rendering, rig building, recipes)
 * use `defineCustomTool`.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z, type ZodRawShape } from "zod";
import type { MohoClient } from "../moho-client.js";
import { errorContent, successContent, type ToolResult } from "./results.js";

export interface PassThroughSpec {
  /** Lua JSON-RPC method, e.g. "bone.setTransform". Tool name = method with "." -> "_". */
  method: string;
  description: string;
  shape: ZodRawShape;
  /** Override the default request timeout (ms). */
  timeoutMs?: number;
}

export interface CustomToolSpec<S extends ZodRawShape> {
  name: string;
  description: string;
  shape: S;
  handler: (args: z.infer<z.ZodObject<S>>) => Promise<ToolResult>;
}

/** Tool name for a Lua method: "bone.setTransform" -> "bone_setTransform". */
export function toolNameFor(method: string): string {
  return method.replace(/\./g, "_");
}

/** Connect lazily, then send. The single place that talks to the client. */
export async function callMoho(
  client: MohoClient,
  method: string,
  params: Record<string, unknown> = {},
  options?: { timeout?: number },
): Promise<unknown> {
  if (!client.isConnected()) {
    await client.connect();
  }
  return client.sendRequest(method, params, options);
}

/** Drop undefined values so optional params are not serialised as null. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

export function registerPassThrough(
  server: McpServer,
  client: MohoClient,
  specs: readonly PassThroughSpec[],
): void {
  for (const spec of specs) {
    server.tool(
      toolNameFor(spec.method),
      spec.description,
      spec.shape,
      async (args: Record<string, unknown>) => {
        try {
          const result = await callMoho(
            client,
            spec.method,
            compact(args),
            spec.timeoutMs !== undefined ? { timeout: spec.timeoutMs } : undefined,
          );
          return successContent(result);
        } catch (err) {
          return errorContent(err);
        }
      },
    );
  }
}

export function defineCustomTool<S extends ZodRawShape>(
  server: McpServer,
  spec: CustomToolSpec<S>,
): void {
  // The SDK's overloads cannot infer a generic shape; erase it at this single
  // boundary. Handler arguments are validated by the zod shape before the call.
  const shape: ZodRawShape = spec.shape;
  server.tool(spec.name, spec.description, shape, async (args: Record<string, unknown>) => {
    try {
      return await spec.handler(args as z.infer<z.ZodObject<S>>);
    } catch (err) {
      return errorContent(err);
    }
  });
}
