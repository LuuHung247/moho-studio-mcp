/**
 * Amplitude-driven lip-sync, equivalent to Moho's "Select audio sync source"
 * on a switch layer: quiet audio shows the first (closed) mouth, loud audio the
 * last (wide-open) mouth, in between the intermediate mouths. The Moho API
 * cannot analyse audio, so the bridge does it and emits switch keyframes.
 */

import type { MouthCue } from "./face-camera.js";

export interface LipSyncOptions {
  /** Mouth child names ordered from CLOSED to WIDE OPEN. */
  mouths: readonly string[];
  fps: number;
  /** Frame that corresponds to the start of the audio. */
  startFrame: number;
  /** 0.5 = needs louder audio to open, 2 = opens easily. Default 1. */
  sensitivity?: number;
  /** Shortest time (frames) a mouth shape is held, avoids flicker. Default 2. */
  minHoldFrames?: number;
}

const SILENCE_FRACTION = 0.08;
const REFERENCE_PERCENTILE = 0.95;
const LEVEL_CURVE = 0.7;

/** RMS (0..1) of consecutive windows, one window per animation frame. */
export function rmsPerFrame(samples: Int16Array, sampleRate: number, fps: number): number[] {
  const windowSize = Math.max(1, Math.round(sampleRate / fps));
  const out: number[] = [];
  for (let start = 0; start < samples.length; start += windowSize) {
    const end = Math.min(samples.length, start + windowSize);
    let sum = 0;
    for (let i = start; i < end; i += 1) {
      const v = (samples[i] as number) / 32768;
      sum += v * v;
    }
    out.push(Math.sqrt(sum / (end - start)));
  }
  return out;
}

function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] as number;
}

/** Map frame loudness to mouth indices (0 = closed). */
export function levelsToMouthIndices(rms: readonly number[], mouthCount: number, sensitivity = 1): number[] {
  if (mouthCount < 2) throw new Error("Need at least 2 mouth shapes (closed ... open)");
  const reference = percentile(rms, REFERENCE_PERCENTILE);
  if (reference <= 0) return rms.map(() => 0);
  return rms.map((v) => {
    const level = Math.min(1, (v / reference) * sensitivity);
    if (level < SILENCE_FRACTION) return 0;
    const shaped = Math.pow(level, LEVEL_CURVE);
    return Math.min(mouthCount - 1, Math.max(1, Math.round(shaped * (mouthCount - 1))));
  });
}

/** Remove runs shorter than minHold by merging them into the previous shape. */
export function enforceMinHold(indices: readonly number[], minHold: number): number[] {
  const out = [...indices];
  let runStart = 0;
  for (let i = 1; i <= out.length; i += 1) {
    if (i === out.length || out[i] !== out[runStart]) {
      const length = i - runStart;
      if (length < minHold && runStart > 0) {
        for (let k = runStart; k < i; k += 1) out[k] = out[runStart - 1] as number;
      }
      runStart = i;
    }
  }
  return out;
}

export function audioToMouthCues(samples: Int16Array, sampleRate: number, o: LipSyncOptions): MouthCue[] {
  if (!(o.fps > 0)) throw new Error("fps must be positive");
  const rms = rmsPerFrame(samples, sampleRate, o.fps);
  const indices = enforceMinHold(levelsToMouthIndices(rms, o.mouths.length, o.sensitivity ?? 1), o.minHoldFrames ?? 2);

  const cues: MouthCue[] = [];
  let last = -1;
  indices.forEach((idx, i) => {
    if (idx !== last) {
      cues.push({ frame: o.startFrame + i, mouth: o.mouths[idx] as string });
      last = idx;
    }
  });
  // End on the closed mouth after the audio finishes.
  if (last !== 0) cues.push({ frame: o.startFrame + indices.length, mouth: o.mouths[0] as string });
  return cues;
}
