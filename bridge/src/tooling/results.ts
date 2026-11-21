/** MCP result helpers shared by every tool. */

export type TextContent = { type: "text"; text: string };
export type ImageContent = { type: "image"; data: string; mimeType: string };

export interface ToolResult {
  [key: string]: unknown;
  content: Array<TextContent | ImageContent>;
  isError?: boolean;
}

export function successContent(result: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
}

export function errorContent(err: unknown): ToolResult {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text", text: message }], isError: true };
}

export function imageContent(base64: string, meta: unknown): ToolResult {
  return {
    content: [
      { type: "image", mimeType: "image/png", data: base64 },
      { type: "text", text: JSON.stringify(meta) },
    ],
  };
}
