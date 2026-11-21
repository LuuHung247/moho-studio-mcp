import { z } from "zod";
import type { PassThroughSpec } from "../tooling/define.js";
import { hexColor, layerId, point2 } from "./schema.js";

const style = {
  fillColor: hexColor("Fill color").optional(),
  strokeColor: hexColor("Stroke color").optional(),
  strokeWidth: z.number().positive().optional().describe("Stroke width in pixels"),
  name: z.string().optional().describe("Shape name (helps later restyling)"),
  frame: z.number().optional().describe("Frame to create at (default 0)"),
};

const target = { layerId: layerId.describe("Absolute ID of the VECTOR layer to draw into") };

const COORDS =
  " Coordinates are layer units: the default 16:9 camera shows roughly x -1.78..1.78, y -1..1 (verify with document_screenshot).";

/** One-call vector drawing. */
export const drawSpecs: PassThroughSpec[] = [
  {
    method: "draw.ellipse",
    description:
      "Draw a filled ellipse/circle (heads, eyes, balls, suns)." + COORDS +
      " ry defaults to rx (circle). segments (4-64, default 8) controls smoothness.",
    shape: {
      ...target,
      cx: z.number(),
      cy: z.number(),
      rx: z.number().positive(),
      ry: z.number().positive().optional(),
      rotation: z.number().optional().describe("Radians"),
      segments: z.number().int().min(4).max(64).optional(),
      ...style,
    },
  },
  {
    method: "draw.rect",
    description: "Draw a rectangle from its bottom-left corner (x, y) with width/height (floors, walls, signs, sky)." + COORDS,
    shape: {
      ...target,
      x: z.number(),
      y: z.number(),
      width: z.number().positive(),
      height: z.number().positive(),
      ...style,
    },
  },
  {
    method: "draw.polygon",
    description:
      "Draw a closed polygon/blob through 3+ points (bodies, hair, hills, clothes). smooth > 0 (try 0.5-1) rounds the corners into organic curves." + COORDS,
    shape: {
      ...target,
      points: z.array(point2).min(3).max(500),
      smooth: z.number().optional().describe("Corner curvature: 0 = sharp, 1 = fully smooth"),
      filled: z.boolean().optional(),
      ...style,
    },
  },
  {
    method: "draw.polyline",
    description:
      "Draw an open stroke through 2+ points (mouths, eyebrows, whiskers, ground lines). strokeColor is required." + COORDS,
    shape: {
      ...target,
      points: z.array(point2).min(2).max(500),
      smooth: z.number().optional(),
      strokeColor: hexColor("Stroke color"),
      strokeWidth: z.number().positive().optional(),
      name: z.string().optional(),
      frame: z.number().optional(),
    },
  },
];
