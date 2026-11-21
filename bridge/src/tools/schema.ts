/** Reusable zod fragments so descriptions stay consistent across tools. */
import { z } from "zod";

export const layerId = z.number().int().describe("Absolute ID of the layer");
export const frame = z.number().describe("Frame number");
export const optionalFrame = (what = "Frame to keyframe at (default 0 = setup pose)") =>
  z.number().optional().describe(what);
export const hexColor = (what = "Color") =>
  z.string().regex(/^#?[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/, "expected #RRGGBB or #RRGGBBAA").describe(`${what} as #RRGGBB or #RRGGBBAA`);
export const channelName = z
  .string()
  .describe('Animation channel (e.g. "translation", "rotation", "scale", "opacity", "shear")');
export const point2 = z.object({ x: z.number(), y: z.number() });

/**
 * Hard caps for every array parameter. Zod 3 accumulates one issue object per
 * invalid element, so an unbounded array lets a malformed call exhaust memory
 * (GHSA-mrhx-c7xc-m3w5). registry.test.ts fails if any array lacks a max.
 */
export const LIMITS = {
  /** Point/vertex index lists (a vector layer rarely exceeds a few thousand points). */
  pointIndices: 20000,
  /** Layer ID lists (fades, eye layers). */
  layerIds: 500,
  /** Keyframe times / cues / path keys in one call. */
  keys: 1000,
  /** Poses in a smart-bone dial and bones per pose. */
  poses: 200,
  bonesPerPose: 100,
  /** Videos joined in one film. */
  videos: 500,
} as const;
