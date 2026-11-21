import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { audioToMouthCues, enforceMinHold, levelsToMouthIndices, rmsPerFrame } from "../recipes/audio-lipsync.js";
import { decodeAudioPcm } from "../render/ffmpeg.js";

const MOUTHS = ["closed", "small", "medium", "wide"];
const hasFfmpeg = spawnSync("ffmpeg", ["-version"]).status === 0;

/** Samples with a constant amplitude per animation frame. */
function ampSamples(amps: number[], sampleRate = 8000, fps = 10): Int16Array {
  const per = sampleRate / fps;
  const out = new Int16Array(amps.length * per);
  amps.forEach((a, f) => {
    for (let i = 0; i < per; i += 1) out[f * per + i] = Math.round(a * 32767 * (i % 2 === 0 ? 1 : -1));
  });
  return out;
}

describe("rmsPerFrame", () => {
  it("returns one value per frame window", () => {
    const rms = rmsPerFrame(ampSamples([0, 0.5, 1]), 8000, 10);
    expect(rms).toHaveLength(3);
    expect(rms[0]).toBeCloseTo(0);
    expect(rms[1]).toBeCloseTo(0.5, 2);
    expect(rms[2]).toBeCloseTo(1, 2);
  });
});

describe("levelsToMouthIndices", () => {
  it("maps silence to closed and the loudest frames to the widest mouth", () => {
    const idx = levelsToMouthIndices([0, 0.01, 0.4, 0.7, 1, 1], 4);
    expect(idx[0]).toBe(0);
    expect(idx[1]).toBe(0);
    expect(idx[4]).toBe(3);
    expect(idx[2]).toBeGreaterThan(0);
    expect(idx[2]).toBeLessThan(idx[4]!);
  });
  it("louder never maps to a smaller mouth", () => {
    const rms = Array.from({ length: 50 }, (_, i) => i / 49);
    const idx = levelsToMouthIndices(rms, 5);
    for (let i = 1; i < idx.length; i += 1) expect(idx[i]!).toBeGreaterThanOrEqual(idx[i - 1]!);
  });
  it("handles all-silent audio and needs 2+ mouths", () => {
    expect(levelsToMouthIndices([0, 0, 0], 3)).toEqual([0, 0, 0]);
    expect(() => levelsToMouthIndices([1], 1)).toThrow(/at least 2/);
  });
  it("higher sensitivity opens the mouth more", () => {
    const rms = [0.1, 0.1, 0.1, 1];
    const low = levelsToMouthIndices(rms, 4, 0.5)[0]!;
    const high = levelsToMouthIndices(rms, 4, 2)[0]!;
    expect(high).toBeGreaterThanOrEqual(low);
  });
});

describe("enforceMinHold", () => {
  it("absorbs one-frame flickers into the previous shape", () => {
    expect(enforceMinHold([0, 0, 2, 0, 0, 3, 3, 3], 2)).toEqual([0, 0, 0, 0, 0, 3, 3, 3]);
  });
  it("keeps long enough runs", () => {
    expect(enforceMinHold([1, 1, 2, 2], 2)).toEqual([1, 1, 2, 2]);
  });
});

describe("audioToMouthCues", () => {
  const speech = ampSamples([0, 0, 0.9, 0.9, 0.9, 0.3, 0.3, 0.3, 0, 0, 0, 0]);
  const cues = audioToMouthCues(speech, 8000, { mouths: MOUTHS, fps: 10, startFrame: 11 });

  it("emits a cue only when the mouth changes and offsets by startFrame", () => {
    expect(cues[0]).toEqual({ frame: 11, mouth: "closed" });
    for (let i = 1; i < cues.length; i += 1) expect(cues[i]!.mouth).not.toBe(cues[i - 1]!.mouth);
    expect(cues.map((c) => c.frame)).toEqual([...cues.map((c) => c.frame)].sort((a, b) => a - b));
  });
  it("opens wide on the loud syllable and closes at the end", () => {
    expect(cues.find((c) => c.frame === 13)?.mouth).toBe("wide");
    expect(cues[cues.length - 1]!.mouth).toBe("closed");
  });
});

describe.skipIf(!hasFfmpeg)("decodeAudioPcm (real ffmpeg)", () => {
  it("decodes a generated tone and lip-syncs its loud/quiet/silent parts", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "moho-lip-"));
    const wav = path.join(dir, "v.wav");
    // 0.5 s loud tone, 0.5 s quiet tone, 0.5 s silence at 24 fps.
    const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error",
      "-f", "lavfi", "-i", "sine=f=220:d=0.5", "-f", "lavfi", "-i", "sine=f=220:d=0.5",
      "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono:d=0.5",
      "-filter_complex", "[0]volume=1.0[a];[1]volume=0.12[b];[a][b][2]concat=n=3:v=0:a=1", wav]);
    expect(r.status).toBe(0);

    const samples = await decodeAudioPcm(wav, 16000);
    expect(samples.length).toBeGreaterThan(16000 * 1.4);
    const cues = audioToMouthCues(samples, 16000, { mouths: MOUTHS, fps: 24, startFrame: 1 });
    const at = (frame: number) => [...cues].reverse().find((c) => c.frame <= frame)!.mouth;
    expect(at(6)).toBe("wide");          // loud part
    expect(at(18)).not.toBe("wide");     // quiet part
    expect(at(18)).not.toBe("closed");
    expect(at(30)).toBe("closed");       // silence
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("explains an undecodable file", async () => {
    const bad = path.join(os.tmpdir(), "not-audio.bin");
    fs.writeFileSync(bad, "nope");
    await expect(decodeAudioPcm(bad, 16000)).rejects.toThrow(/could not decode/);
  });
});
