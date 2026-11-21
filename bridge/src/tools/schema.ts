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
