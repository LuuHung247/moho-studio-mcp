import { describe, expect, it, vi } from "vitest";
import { buildConcatArgs, buildConcatList, buildEncodeArgs, buildMuxArgs, formatFor, runFfmpeg } from "../render/ffmpeg.js";
import { chunk, runBatch } from "../tooling/batch.js";
import type { MohoClient } from "../moho-client.js";

const base = {
  framesDir: "/tmp/f", prefix: "frame_", digits: 5, extension: "png", startNumber: 1, fps: 24,
};

describe("buildEncodeArgs", () => {
  it("encodes mp4 as H.264 with even dimensions and the right input pattern", () => {
    const args = buildEncodeArgs({ ...base, outputPath: "/out/a.mp4" });
    expect(args).toContain("libx264");
    expect(args).toContain("yuv420p");
    expect(args[args.indexOf("-i") + 1]).toBe("/tmp/f/frame_%05d.png");
    expect(args[args.indexOf("-start_number") + 1]).toBe("1");
    expect(args[args.indexOf("-framerate") + 1]).toBe("24");
    expect(args.join(" ")).toContain("trunc(iw/2)*2");
    expect(args[args.length - 1]).toBe("/out/a.mp4");
  });

  it("adds audio only when given, and delays audio for negative offsets", () => {
    expect(buildEncodeArgs({ ...base, outputPath: "/o.mp4" })).not.toContain("aac");
    const withAudio = buildEncodeArgs({ ...base, outputPath: "/o.mp4", audioPath: "/a.wav", audioOffset: -2 });
    expect(withAudio).toContain("aac");
    expect(withAudio[withAudio.indexOf("-itsoffset") + 1]).toBe("2");
  });

  it("builds a palette-based gif without audio", () => {
    const args = buildEncodeArgs({ ...base, outputPath: "/o.gif", audioPath: "/a.wav" });
    expect(args.join(" ")).toContain("palettegen");
    expect(args).not.toContain("/a.wav");
  });

  it("rejects unsupported formats and bad fps", () => {
    expect(() => formatFor("/o.avi")).toThrow(/Unsupported/);
    expect(() => buildEncodeArgs({ ...base, fps: 0, outputPath: "/o.mp4" })).toThrow(/fps/);
  });
});

describe("concat", () => {
  it("escapes single quotes and resolves paths in the list file", () => {
    const list = buildConcatList(["/a/it's.mp4", "/b.mp4"]);
    expect(list).toBe("file '/a/it'\\''s.mp4'\nfile '/b.mp4'\n");
  });

  it("copies streams unless re-encode is requested", () => {
    expect(buildConcatArgs("/l.txt", "/o.mp4", false)).toContain("copy");
    expect(buildConcatArgs("/l.txt", "/o.mp4", true)).toContain("libx264");
  });

  it("muxes audio while copying video", () => {
    const args = buildMuxArgs("/v.mp4", "/a.wav", "/o.mp4");
    expect(args).toEqual(expect.arrayContaining(["-c:v", "copy", "-c:a", "aac"]));
  });
});

describe("runFfmpeg", () => {
  it("explains a missing binary", async () => {
    await expect(runFfmpeg(["-version"], "definitely-not-ffmpeg-xyz")).rejects.toThrow(/ffmpeg not found/);
  });
});

describe("batch chunking", () => {
  it("splits into equal chunks plus a remainder", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 3)).toEqual([]);
    expect(() => chunk([1], 0)).toThrow();
  });

  function clientReturning(resultsPerCall: Array<Array<{ success: boolean; error?: unknown }>>) {
    const send = vi.fn();
    resultsPerCall.forEach((r) => send.mockResolvedValueOnce({ results: r }));
    return { client: { isConnected: () => true, sendRequest: send } as unknown as MohoClient, send };
  }

  it("aggregates counts and reports failures with global indices", async () => {
    const ops = Array.from({ length: 250 }, (_, i) => ({ method: "bone.setTransform", params: { i } }));
    const first = Array.from({ length: 200 }, () => ({ success: true }));
    const second = Array.from({ length: 50 }, (_, i) => (i === 3 ? { success: false, error: { message: "bad bone" } } : { success: true }));
    const { client, send } = clientReturning([first, second]);

    const summary = await runBatch(client, ops);

    expect(send).toHaveBeenCalledTimes(2);
    expect(summary).toMatchObject({ total: 250, succeeded: 249, failed: 1 });
    expect(summary.errors).toEqual([{ index: 203, method: "bone.setTransform", message: "bad bone" }]);
  });

  it("stops after the first failing chunk when asked", async () => {
    const ops = Array.from({ length: 250 }, () => ({ method: "x.y" }));
    const first = Array.from({ length: 200 }, (_, i) => ({ success: i !== 0 }));
    const { client, send } = clientReturning([first]);
    const summary = await runBatch(client, ops, { stopOnError: true });
    expect(send).toHaveBeenCalledTimes(1);
    expect(summary.failed).toBe(1);
  });
});

import { assertSafePath } from "../render/ffmpeg.js";
import { renderRoot } from "../tools/production.js";

describe("path safety", () => {
  it.each(["http://evil/x.mp4", "concat:a|b", "file:/etc/passwd", "pipe:1", "relative/x.mp4", "-i", "/a\nb.mp4", "/a\u0000b"])(
    "rejects %j", (p) => expect(() => assertSafePath(p, "x")).toThrow(),
  );
  it.each(["/home/u/a.mp4", "D:\\Phim\\cảnh 1.mp4", "C:\\Program Files (x86)\\a.wav"])(
    "accepts %j", (p) => {
      // path.isAbsolute is platform specific; only assert POSIX-style on POSIX hosts.
      if (/^[A-Za-z]:\\/.test(p) && process.platform !== "win32") return;
      expect(assertSafePath(p, "x")).toBe(p);
    },
  );
  it("escapes % in the frame pattern directory", () => {
    const args = buildEncodeArgs({ ...base, framesDir: "/tmp/100%", outputPath: "/o.mp4" });
    expect(args[args.indexOf("-i") + 1]).toContain("100%%");
  });
});

describe("renderRoot", () => {
  it("uses the temp folder when it is plain ASCII", () => {
    expect(renderRoot("/tmp", {})).toBe("/tmp/moho-mcp");
  });
  it("falls back to a drive-root folder when the temp path has non-ASCII characters", () => {
    expect(renderRoot("/home/Nguyễn/tmp", {})).toBe("/moho-mcp");
  });
  it("honours MOHO_MCP_RENDER_DIR", () => {
    expect(renderRoot("/tmp", { MOHO_MCP_RENDER_DIR: "D:\\r" })).toBe("D:\\r");
  });
});
