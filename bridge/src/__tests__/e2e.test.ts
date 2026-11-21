/**
 * End-to-end: the REAL bridge process (dist/index.js) driven through the MCP
 * client SDK, with a fake Moho plugin answering the file IPC in this process.
 * Verifies the full chain tool -> bridge -> IPC -> (fake) plugin and, when
 * ffmpeg is available, the render_exportVideo / concat pipeline.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { humanoidBones } from "../recipes/humanoid.js";
import { planSkeleton } from "../recipes/skeleton.js";

const BRIDGE = path.resolve(__dirname, "../../dist/index.js");
const hasBuild = fs.existsSync(BRIDGE);
const hasFfmpeg = spawnSync("ffmpeg", ["-version"]).status === 0;

type Handler = (params: Record<string, any>) => unknown;

/** Minimal stand-in for the Lua plugin: polls req_*.json, writes resp_*.json. */
class FakePlugin {
  readonly calls: Array<{ method: string; params: Record<string, any> }> = [];
  private timer?: NodeJS.Timeout;
  private readonly bones = planSkeleton(1, humanoidBones(), 0, "start").operations.map((op, i) => ({
    id: i, name: op.params!.name, angle: op.params!.angle,
    position: { x: op.params!.posX, y: op.params!.posY }, length: op.params!.length, parentId: op.params!.parentBoneId,
  }));
  private nextLayerId = 10;

  readonly handlers: Record<string, Handler> = {
    "system.ping": () => ({ success: true, pluginVersion: "test" }),
    "document.getInfo": () => ({ fps: 24, startFrame: 1, endFrame: 12, filePath: process.env.E2E_DOC ?? "" }),
    "document.save": () => ({ success: true }),
    "layer.createLayer": () => ({ success: true, layerId: this.nextLayerId++ }),
    "layer.getBones": () => this.bones,
    "draw.ellipse": (p) => ({ success: true, shapeIndex: 0, pointIndices: [0, 1, 2, 3], warnings: [], layerId: p.layerId }),
    "batch.execute": (p) => ({
      results: (p.operations as unknown[]).map((_, i) => ({ success: true, index: i + 1, result: {} })),
      summary: { total: p.operations.length },
    }),
    "render.frames": (p) => {
      const count = p.endFrame - p.startFrame + 1;
      fs.mkdirSync(p.dir, { recursive: true });
      const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=63x47:rate=24",
        "-frames:v", String(count), "-start_number", String(p.startFrame), path.join(p.dir, "frame_%05d.png")]);
      if (r.status !== 0) throw new Error(`fake render failed: ${r.stderr}`);
      return { success: true, dir: p.dir, prefix: "frame_", extension: "png", digits: 5, count };
    },
  };

  constructor(private readonly dir: string) {}

  start(): void {
    fs.mkdirSync(this.dir, { recursive: true });
    fs.writeFileSync(path.join(this.dir, "status.json"), JSON.stringify({ running: true }));
    this.timer = setInterval(() => this.pollOnce(), 30);
  }

  stop(): void {
    clearInterval(this.timer);
  }

  private pollOnce(): void {
    for (const f of fs.readdirSync(this.dir)) {
      const m = /^req_(\d+)\.json$/.exec(f);
      if (!m) continue;
      const file = path.join(this.dir, f);
      const req = JSON.parse(fs.readFileSync(file, "utf8"));
      fs.rmSync(file);
      this.calls.push({ method: req.method, params: req.params });
      const handler = this.handlers[req.method];
      let body: object;
      try {
        if (!handler) throw new Error(`no handler for ${req.method}`);
        body = { jsonrpc: "2.0", id: req.id, result: handler(req.params ?? {}) };
      } catch (e) {
        body = { jsonrpc: "2.0", id: req.id, error: { code: -32000, message: (e as Error).message } };
      }
      const resp = path.join(this.dir, `resp_${m[1]}.json`);
      fs.writeFileSync(resp + ".tmp", JSON.stringify(body));
      fs.renameSync(resp + ".tmp", resp);
    }
  }
}

describe.skipIf(!hasBuild)("bridge end-to-end (fake Moho)", () => {
  const ipcDir = fs.mkdtempSync(path.join(os.tmpdir(), "moho-e2e-ipc-"));
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "moho-e2e-out-"));
  const plugin = new FakePlugin(ipcDir);
  let client: Client;

  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const res = (await client.callTool({ name, arguments: args })) as { content: Array<{ text: string }>; isError?: boolean };
    return { res, text: res.content[0]!.text, json: () => JSON.parse(res.content[0]!.text) };
  };

  const fakeDir = fs.mkdtempSync(path.join(os.tmpdir(), "moho-fake-exe-"));
  const fakeExe = path.join(fakeDir, "fake-moho.sh");
  const argsLog = path.join(fakeDir, "args.log");
  const failFlag = path.join(fakeDir, "fail.flag");
  const docPath = path.join(fakeDir, "scene.moho");

  beforeAll(async () => {
    // A stand-in for Moho's command-line renderer: records its arguments and writes the -o file.
    fs.writeFileSync(docPath, "fake moho document");
    process.env.E2E_DOC = docPath;
    fs.writeFileSync(fakeExe, `#!/bin/sh
echo "$@" >> "${argsLog}"
[ -f "${failFlag}" ] && exit 1
while [ $# -gt 0 ]; do [ "$1" = "-o" ] && out="$2"; shift; done
printf 'rendered-by-fake-moho' > "$out"
`, { mode: 0o755 });
    plugin.start();
    client = new Client({ name: "e2e", version: "0" });
    await client.connect(new StdioClientTransport({
      command: process.execPath, args: [BRIDGE],
      env: { ...process.env, MOHO_MCP_IPC_DIR: ipcDir, MOHO_MCP_MOHO_EXE: fakeExe, E2E_DOC: docPath } as Record<string, string>,
    }));
  });

  afterAll(async () => {
    await client.close();
    plugin.stop();
    fs.rmSync(ipcDir, { recursive: true, force: true });
    fs.rmSync(outDir, { recursive: true, force: true });
    fs.rmSync(fakeDir, { recursive: true, force: true });
  });

  it("lists 80+ tools and the production playbook resource", async () => {
    const { tools } = await client.listTools();
    expect(tools.length).toBeGreaterThanOrEqual(80);
    const { resources } = await client.listResources();
    expect(resources.map((r) => r.uri)).toContain("moho://guide/production");
  });

  it("validates arguments before they reach Moho", async () => {
    const before = plugin.calls.length;
    const { res } = await call("draw_ellipse", { layerId: 1, cx: 0, cy: 0, rx: -1 }).catch((e) => ({ res: { isError: true } as any, e }));
    expect(res.isError).toBe(true);
    expect(plugin.calls.length).toBe(before);
  });

  it("forwards a draw call", async () => {
    const { json } = await call("draw_ellipse", { layerId: 4, cx: 0, cy: 0, rx: 0.3, fillColor: "#FF8800" });
    expect(json().success).toBe(true);
    expect(plugin.calls.at(-1)).toMatchObject({ method: "draw.ellipse", params: { layerId: 4, rx: 0.3 } });
  });

  it("builds a humanoid and animates a walk in batches", async () => {
    const rig = (await call("rig_buildHumanoid", { scale: 1 })).json();
    expect(rig.bones.head).toBeTypeOf("number");

    const walk = (await call("anim_walkCycle", { layerId: rig.layerId, cycles: 2, startFrame: 1 })).json();
    expect(walk.recipe).toBe("walkCycle");
    expect(walk.failed).toBe(0);
    expect(walk.keyframeOperations).toBeGreaterThan(50);
    const batchCalls = plugin.calls.filter((c) => c.method === "batch.execute");
    expect(batchCalls.some((c) => c.params.operations.some((o: any) => o.method === "bone.setTransform"))).toBe(true);
    expect(batchCalls.every((c) => c.params.operations.length <= 200)).toBe(true);
  });

  it.skipIf(!hasFfmpeg)("lip-syncs a real audio file end to end", async () => {
    const wav = path.join(outDir, "voice.wav");
    const gen = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "sine=f=200:d=0.5",
      "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono:d=0.5", "-filter_complex", "[0][1]concat=n=2:v=0:a=1", wav]);
    expect(gen.status).toBe(0);
    const before = plugin.calls.length;
    const r = (await call("anim_lipSyncFromAudio", {
      switchLayerId: 40, audioPath: wav, mouths: ["closed", "small", "wide"], startFrame: 1,
    })).json();
    expect(r.failed).toBe(0);
    const ops = plugin.calls.slice(before).filter((c) => c.method === "batch.execute").flatMap((c) => c.params.operations);
    expect(ops.every((o: any) => o.method === "switch.setActive" && o.params.layerId === 40)).toBe(true);
    expect(ops[0].params.childName).toBeDefined();
    expect(ops.some((o: any) => o.params.childName === "wide")).toBe(true);
    expect(ops[ops.length - 1].params.childName).toBe("closed");
  });

  it.skipIf(process.platform === "win32")("exports with Moho's command-line renderer when available", async () => {
    fs.rmSync(failFlag, { force: true });
    fs.writeFileSync(argsLog, "");
    const out = path.join(outDir, "cli.mp4");
    const before = plugin.calls.length;
    const r = (await call("render_exportVideo", { outputPath: out, startFrame: 2, endFrame: 8 })).json();
    expect(r.engine).toBe("moho");
    expect(fs.readFileSync(out, "utf8")).toBe("rendered-by-fake-moho");
    const args = fs.readFileSync(argsLog, "utf8");
    expect(args).toContain(`-r ${docPath}`);
    expect(args).toContain("-f MP4 -options MP4 (MPEG4-AAC)");
    expect(args).toContain("-start 2 -end 8");
    // the current state is saved before rendering, and no frames were rendered through the plugin
    const methods = plugin.calls.slice(before).map((c) => c.method);
    expect(methods).toContain("document.save");
    expect(methods).not.toContain("render.frames");
  });

  it.skipIf(process.platform === "win32" || !hasFfmpeg)("falls back to frame export when Moho's renderer fails", async () => {
    fs.writeFileSync(failFlag, "1");
    const out = path.join(outDir, "fallback.mp4");
    const r = (await call("render_exportVideo", { outputPath: out })).json();
    expect(r.engine).toBe("frames");
    expect(r.mohoEngineError).toMatch(/Moho renderer failed/);
    expect(fs.existsSync(out)).toBe(true);
    fs.rmSync(failFlag, { force: true });
  });

  it.skipIf(process.platform === "win32")("engine 'moho' reports the failure instead of falling back", async () => {
    fs.writeFileSync(failFlag, "1");
    const { res, text } = await call("render_exportVideo", { outputPath: path.join(outDir, "strict.mp4"), engine: "moho" });
    expect(res.isError).toBe(true);
    expect(text).toMatch(/Moho renderer failed/);
    fs.rmSync(failFlag, { force: true });
  });

  it("rejects unsafe audio paths before touching ffmpeg", async () => {
    const { res } = await call("anim_lipSyncFromAudio", { switchLayerId: 1, audioPath: "http://evil/x.wav", mouths: ["a", "b"] });
    expect(res.isError).toBe(true);
  });

  it("surfaces plugin errors as MCP errors", async () => {
    plugin.handlers["layer.getProperties"] = () => { throw new Error("Layer not found with absolute ID 99"); };
    const { res, text } = await call("layer_getProperties", { layerId: 99 });
    expect(res.isError).toBe(true);
    expect(text).toContain("Layer not found");
  });

  it.skipIf(!hasFfmpeg)("exports a video, then joins two scenes", async () => {
    const a = path.join(outDir, "scene1.mp4");
    const b = path.join(outDir, "scene2.mp4");
    const first = (await call("render_exportVideo", { outputPath: a, engine: "frames" })).json();
    expect(first).toMatchObject({ frames: 12, fps: 24, durationSeconds: 0.5 });
    expect(first.bytes).toBeGreaterThan(500);
    expect((await call("render_exportVideo", { outputPath: b, startFrame: 1, endFrame: 6, engine: "frames" })).json().frames).toBe(6);

    const film = path.join(outDir, "film.mp4");
    const joined = (await call("render_concatVideos", { inputs: [a, b], outputPath: film })).json();
    expect(joined.inputs).toBe(2);

    const probe = spawnSync("ffprobe", ["-v", "error", "-count_frames", "-select_streams", "v:0",
      "-show_entries", "stream=nb_read_frames,width,height", "-of", "csv=p=0", film]);
    // 63x47 source must have been rounded to even dimensions for H.264.
    expect(probe.stdout.toString().trim()).toBe("62,46,18");
  });

  it.skipIf(!hasFfmpeg)("removes the temporary frames after exporting", async () => {
    const before = fs.readdirSync(path.join(os.tmpdir(), "moho-mcp")).filter((n) => n.startsWith("render_")).length;
    await call("render_exportVideo", { outputPath: path.join(outDir, "x.mp4"), endFrame: 3, engine: "frames" });
    const after = fs.readdirSync(path.join(os.tmpdir(), "moho-mcp")).filter((n) => n.startsWith("render_")).length;
    expect(after).toBe(before);
  });
});
