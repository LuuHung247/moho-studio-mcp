import { describe, expect, it, vi } from "vitest";
import type { MohoClient } from "../moho-client.js";
import { registerTools } from "../tools/index.js";
import { GROUPS, groupOf, isAllowed, parseToolset, PRESETS } from "../tools/toolsets.js";

function toolNames(env: Record<string, string | undefined>): string[] {
  const names: string[] = [];
  registerTools(
    { tool: (name: string) => void names.push(name) } as never,
    { isConnected: vi.fn(), connect: vi.fn(), sendRequest: vi.fn() } as unknown as MohoClient,
    env,
  );
  return names;
}

describe("toolsets", () => {
  it("defaults to every tool", () => {
    expect(toolNames({}).length).toBe(toolNames({ MOHO_MCP_TOOLSET: "full" }).length);
    expect(toolNames({}).length).toBeGreaterThanOrEqual(85);
  });

  it("every preset only contains known groups and is smaller than full", () => {
    const full = toolNames({}).length;
    for (const [name, groups] of Object.entries(PRESETS)) {
      expect(groups.every((g) => (GROUPS as readonly string[]).includes(g)), name).toBe(true);
      if (name !== "full") expect(toolNames({ MOHO_MCP_TOOLSET: name }).length, name).toBeLessThan(full);
    }
  });

  it("film exposes only export-related groups and always keeps ping and screenshot", () => {
    const names = toolNames({ MOHO_MCP_TOOLSET: "film" });
    expect(new Set(names.map(groupOf))).toEqual(new Set(["system", "document", "project", "render"]));
    expect(names).toContain("system_ping");
    expect(names).toContain("document_screenshot");
    expect(names).not.toContain("draw_ellipse");
  });

  it("anim includes the animation recipes but not drawing or export", () => {
    const names = toolNames({ MOHO_MCP_TOOLSET: "anim" });
    expect(names).toContain("anim_walkCycle");
    expect(names).toContain("bone_setTransform");
    expect(names).not.toContain("draw_ellipse");
    expect(names).not.toContain("render_exportVideo");
  });

  it("combines presets and raw groups, ignoring case and spaces", () => {
    const names = toolNames({ MOHO_MCP_TOOLSET: " Core , render " });
    expect(names).toContain("render_exportVideo");
    expect(names).toContain("layer_createLayer");
    expect(names).not.toContain("anim_walkCycle");
  });

  it("fails fast with a helpful message on a typo", () => {
    expect(() => parseToolset("anmi")).toThrow(/Unknown MOHO_MCP_TOOLSET entries: anmi.*Presets: full, core/);
  });

  it("isAllowed uses the part before the first underscore", () => {
    expect(isAllowed("anim_lipSyncFromAudio", new Set(["anim"]))).toBe(true);
    expect(isAllowed("animation_setKeyframe", new Set(["anim"]))).toBe(false);
  });
});
