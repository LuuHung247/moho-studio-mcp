/**
 * Skills are instructions for AI agents, so wrong tool names or parameters in
 * them cause real failures. These tests check every skill against the real
 * tool registry: names exist, ```mcp examples validate against the zod schemas.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { MohoClient } from "../moho-client.js";
import { registerTools } from "../tools/index.js";

const SKILLS_DIR = path.resolve(__dirname, "../../../skills");
const skillNames = fs.readdirSync(SKILLS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

const shapes = new Map<string, z.ZodRawShape>();
registerTools(
  { tool: (name: string, _d: string, shape: z.ZodRawShape) => void shapes.set(name, shape) } as never,
  { isConnected: vi.fn(), connect: vi.fn(), sendRequest: vi.fn() } as unknown as MohoClient,
);

const read = (name: string) => fs.readFileSync(path.join(SKILLS_DIR, name, "SKILL.md"), "utf8").replace(/\r\n/g, "\n");

function frontmatter(text: string): Record<string, string> {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!m) throw new Error("missing frontmatter");
  return Object.fromEntries(
    m[1]!.split("\n").map((l) => {
      const i = l.indexOf(":");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
  );
}

const TOOL_REF = /`((?:system|project|draw|layer|rig|anim|render|document|bone|mesh|animation|switch|image|particle|input|batch)_[A-Za-z]+)`/g;

describe("skills", () => {
  it("ships the expected set", () => {
    expect([...skillNames].sort()).toEqual([
      "moho-advanced-gui-fallback", "moho-animation", "moho-delegation", "moho-character-art", "moho-character-wizard", "moho-film-export",
      "moho-gui-reference", "moho-revision", "moho-technique-smart-bones", "moho-whats-new-14",
      "moho-rigging", "moho-scene-camera", "moho-session-check", "moho-studio",
      "moho-technique-bones-binding", "moho-technique-depth-effects", "moho-technique-drawing",
      "moho-technique-frame-by-frame", "moho-technique-images", "moho-technique-lipsync", "moho-technique-reuse-references",
      "moho-technique-timeline-actions", "moho-troubleshooting",
    ].sort());
  });

  describe.each(skillNames)("%s", (name) => {
    const text = read(name);

    it("has valid frontmatter whose name matches the folder", () => {
      const fm = frontmatter(text);
      expect(fm.name).toBe(name);
      expect(fm.description!.length).toBeGreaterThan(60);
      expect(fm.description!.length).toBeLessThanOrEqual(1024);
    });

    it("mentions only tools that exist", () => {
      const unknown = [...text.matchAll(TOOL_REF)].map((m) => m[1]!).filter((t) => !shapes.has(t));
      expect([...new Set(unknown)]).toEqual([]);
    });

    it("references only skills that exist", () => {
      const refs = [...text.matchAll(/`(moho-[a-z-]+)`/g)].map((m) => m[1]!);
      expect(refs.filter((r) => !skillNames.includes(r))).toEqual([]);
    });

    it("has examples that validate against the real tool schemas", () => {
      const fences = [...text.matchAll(/```mcp ([A-Za-z_]+)\n([\s\S]*?)\n```/g)];
      for (const [, tool, body] of fences) {
        const shape = shapes.get(tool!);
        expect(shape, `unknown tool ${tool}`).toBeDefined();
        const args = JSON.parse(body!);
        const unknownKeys = Object.keys(args).filter((k) => !(k in shape!));
        expect(unknownKeys, `${tool}: unknown parameters`).toEqual([]);
        const res = z.object(shape!).safeParse(args);
        expect(res.success ? "ok" : res.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`), `${tool} example`).toBe("ok");
      }
    });
  });

  it("every task skill is reachable from the router", () => {
    const router = read("moho-studio");
    for (const n of skillNames.filter((s) => s !== "moho-studio")) expect(router).toContain(`\`${n}\``);
  });

  it("has substantial worked examples overall", () => {
    const total = skillNames.reduce((n, s) => n + [...read(s).matchAll(/```mcp /g)].length, 0);
    expect(total).toBeGreaterThanOrEqual(40);
  });
});
