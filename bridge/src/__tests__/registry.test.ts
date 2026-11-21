import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { MohoClient } from "../moho-client.js";
import { passThroughSpecs, registerTools } from "../tools/index.js";
import { toolNameFor } from "../tooling/define.js";

const pluginDir = path.resolve(__dirname, "../../../moho-plugin");

interface Registered {
  name: string;
  description: string;
  shape: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<{ content: Array<{ text: string }>; isError?: boolean }>;
}

function makeServer() {
  const tools: Registered[] = [];
  return {
    tools,
    tool(name: string, description: string, shape: Record<string, unknown>, handler: Registered["handler"]) {
      tools.push({ name, description, shape, handler });
    },
  };
}

function makeClient(overrides: Partial<Record<keyof MohoClient, unknown>> = {}) {
  return {
    isConnected: vi.fn().mockReturnValue(true),
    connect: vi.fn().mockResolvedValue(undefined),
    sendRequest: vi.fn().mockResolvedValue({ ok: true }),
    ...overrides,
  } as unknown as MohoClient & {
    isConnected: ReturnType<typeof vi.fn>;
    sendRequest: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
  };
}

function luaMethodsIn(file: string, pattern: RegExp): string[] {
  const src = fs.readFileSync(path.join(pluginDir, file), "utf8");
  return [...src.matchAll(pattern)].map((m) => m[1] as string);
}

/** Collect the path of every array schema without a max length (zod 4 internals). */
export function unboundedArrays(schema: any, where: string, out: string[] = []): string[] {
  const def = schema?.def;
  if (!def) return out;
  switch (def.type) {
    case "array": {
      const bounded = (def.checks ?? []).some((c: any) => c._zod?.def?.check === "max_length" || c.check === "max_length");
      if (!bounded) out.push(where);
      unboundedArrays(def.element, `${where}[]`, out);
      break;
    }
    case "object":
      for (const [k, v] of Object.entries(def.shape)) unboundedArrays(v, `${where}.${k}`, out);
      break;
    case "optional":
    case "nullable":
    case "default":
      unboundedArrays(def.innerType, where, out);
      break;
    case "union":
      def.options.forEach((o: unknown, i: number) => unboundedArrays(o, `${where}|${i}`, out));
      break;
    case "record":
      unboundedArrays(def.valueType, `${where}{}`, out);
      break;
  }
  return out;
}

describe("tool registry", () => {
  let server: ReturnType<typeof makeServer>;
  let client: ReturnType<typeof makeClient>;

  beforeEach(() => {
    server = makeServer();
    client = makeClient();
    registerTools(server as never, client);
  });

  it("registers unique tool names", () => {
    const names = server.tools.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("gives every tool a meaningful description", () => {
    for (const t of server.tools) {
      expect(t.description.length, t.name).toBeGreaterThan(10);
    }
  });

  it("the array-bound scanner really detects unbounded arrays (guards against a vacuous pass)", () => {
    expect(unboundedArrays(z.array(z.number()), "a")).toEqual(["a"]);
    expect(unboundedArrays(z.array(z.number()).max(3), "a")).toEqual([]);
    expect(unboundedArrays(z.object({ x: z.array(z.string()).optional() }), "o")).toEqual(["o.x"]);
    expect(unboundedArrays(z.object({ x: z.array(z.object({ y: z.array(z.number()).max(2) })).max(2) }), "o")).toEqual([]);
    expect(unboundedArrays(z.object({ x: z.array(z.object({ y: z.array(z.number()) })).max(2) }), "o")).toEqual(["o.x[].y"]);
  });

  it("bounds every array parameter (zod memory-exhaustion advisory GHSA-mrhx-c7xc-m3w5)", () => {
    const offenders = server.tools.flatMap((t) =>
      Object.entries(t.shape).flatMap(([k, v]) => unboundedArrays(v, `${t.name}.${k}`)),
    );
    expect(offenders).toEqual([]);
  });

  it("exposes the high-level production tools", () => {
    const names = server.tools.map((t) => t.name);
    for (const n of [
      "draw_ellipse", "draw_polygon", "rig_buildHumanoid", "rig_attachLayers", "anim_walkCycle",
      "anim_blink", "anim_cameraMove", "render_exportVideo", "render_concatVideos",
      "project_new", "project_import", "system_selfTest", "batch_execute", "document_screenshot",
    ]) {
      expect(names, n).toContain(n);
    }
  });

  it("only pass-through tools whose Lua method is in the plugin allow-list", () => {
    const allowed = new Set(luaMethodsIn("moho_mcp/validator.lua", /\["([a-zA-Z]+\.[a-zA-Z]+)"\]\s*=\s*true/g));
    const missing = passThroughSpecs.map((s) => s.method).filter((m) => !allowed.has(m));
    expect(missing).toEqual([]);
  });

  it("only pass-through tools whose Lua method is registered by the plugin loader", () => {
    const loader = fs.readFileSync(path.join(pluginDir, "MohoMCP_Server.lua"), "utf8");
    const missing = passThroughSpecs.map((s) => s.method).filter((m) => !loader.includes(`"${m}"`));
    expect(missing).toEqual([]);
  });

  it("every method in the Lua allow-list is reachable from some tool", () => {
    const allowed = luaMethodsIn("moho_mcp/validator.lua", /\["([a-zA-Z]+\.[a-zA-Z]+)"\]\s*=\s*true/g);
    const reachable = new Set<string>([
      ...passThroughSpecs.map((s) => s.method),
      "batch.execute", "document.screenshot", // custom tools
      "render.frames", // used by the export pipeline
    ]);
    const orphans = allowed.filter((m) => !reachable.has(m));
    expect(orphans).toEqual([]);
  });

  describe("pass-through handler", () => {
    const find = (method: string) => server.tools.find((t) => t.name === toolNameFor(method))!;

    it("forwards params and drops undefined values", async () => {
      await find("bone.setTransform").handler({ layerId: 3, boneId: 1, frame: 12, angle: 0.5, posX: undefined });
      expect(client.sendRequest).toHaveBeenCalledWith(
        "bone.setTransform",
        { layerId: 3, boneId: 1, frame: 12, angle: 0.5 },
        undefined,
      );
    });

    it("connects lazily when the client is not connected", async () => {
      client.isConnected.mockReturnValue(false);
      await find("document.getInfo").handler({});
      expect(client.connect).toHaveBeenCalledOnce();
    });

    it("returns JSON text on success", async () => {
      client.sendRequest.mockResolvedValue({ name: "scene1" });
      const res = await find("document.getInfo").handler({});
      expect(JSON.parse(res.content[0]!.text)).toEqual({ name: "scene1" });
      expect(res.isError).toBeUndefined();
    });

    it("turns client errors into MCP error results", async () => {
      client.sendRequest.mockRejectedValue(new Error("Moho is busy"));
      const res = await find("document.getInfo").handler({});
      expect(res.isError).toBe(true);
      expect(res.content[0]!.text).toBe("Moho is busy");
    });

    it("uses the longer timeout for slow methods", async () => {
      await find("system.selfTest").handler({});
      expect(client.sendRequest.mock.calls[0]![2]).toEqual({ timeout: 60000 });
    });
  });
});
