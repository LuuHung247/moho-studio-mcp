import { z } from "zod";
import type { PassThroughSpec } from "../tooling/define.js";
import { frame, hexColor } from "./schema.js";

/** Document, project lifecycle, camera, history and health. */
export const documentSpecs: PassThroughSpec[] = [
  {
    method: "system.ping",
    description:
      "Check that Moho is reachable. Returns the Moho version, plugin version and whether a document is open. Call this first in every session.",
    shape: {},
  },
  {
    method: "system.selfTest",
    description:
      "Run an end-to-end self test inside Moho (creates a temporary vector layer and bone layer, draws shapes, keyframes a bone, renders a frame, then deletes everything). Returns pass/fail per step. Run it once per Moho install before a long production job: it tells you exactly which API paths work on this Moho build. A document must be open.",
    shape: { cleanup: z.boolean().optional().describe("Delete the temporary layers afterwards (default true)") },
    timeoutMs: 60000,
  },
  {
    method: "document.getInfo",
    description:
      "Get information about the open document: name, path, size, FPS, start/end frame, duration, layer counts.",
    shape: {},
  },
  {
    method: "document.getLayers",
    description: "Get the full layer tree (hierarchy) of the open document.",
    shape: {},
  },
  {
    method: "document.setFrame",
    description: "Move the timeline playhead to a frame.",
    shape: { frame },
  },
  {
    method: "document.save",
    description: "Save the document. Pass filePath to Save As; omit it to save in place.",
    shape: { filePath: z.string().optional().describe("Absolute path for Save As (.moho)") },
    timeoutMs: 30000,
  },
  {
    method: "document.undo",
    description: "Undo the most recent change. Returns success=false when there is nothing to undo.",
    shape: {},
  },
  {
    method: "document.redo",
    description: "Redo the most recently undone change.",
    shape: {},
  },
  {
    method: "document.setCamera",
    description:
      "Animate the document camera at a frame: 3D position (posX/posY/posZ), tilt/pan/roll in radians, and zoom (1 = default, >1 zooms in). Only supplied components are written.",
    shape: {
      frame,
      posX: z.number().optional().describe("Camera X position"),
      posY: z.number().optional().describe("Camera Y position"),
      posZ: z.number().optional().describe("Camera Z position (dolly)"),
      tilt: z.number().optional().describe("Tilt around X (radians)"),
      pan: z.number().optional().describe("Pan around Y (radians)"),
      roll: z.number().optional().describe("Roll around Z (radians)"),
      zoom: z.number().optional().describe("Zoom; 1.0 = default field of view"),
    },
  },
  {
    method: "render.frame",
    description:
      "Render one frame of the document to an image file (png recommended). Unlike document_screenshot it writes to the path you choose, e.g. for thumbnails or storyboards.",
    shape: {
      filePath: z.string().describe("Absolute output path, e.g. D:\\Phim\\thumb.png"),
      frame: z.number().optional().describe("Frame to render (default: current)"),
    },
    timeoutMs: 30000,
  },
  {
    method: "project.new",
    description:
      "Create a new empty document and optionally configure it. WARNING: replaces the active document — save first. Typical film settings: 1920x1080 at 24 fps.",
    shape: {
      width: z.number().optional().describe("Pixel width"),
      height: z.number().optional().describe("Pixel height"),
      fps: z.number().optional().describe("Frames per second"),
      startFrame: z.number().optional(),
      endFrame: z.number().optional().describe("Last frame (length = endFrame - startFrame + 1)"),
      backgroundColor: hexColor("Background color").optional(),
    },
    timeoutMs: 20000,
  },
  {
    method: "project.open",
    description: "Open an existing .moho project. WARNING: replaces the active document.",
    shape: { filePath: z.string().describe("Absolute path to the .moho file") },
    timeoutMs: 30000,
  },
  {
    method: "project.setProperties",
    description:
      "Change settings of the open document: size, FPS, start/end frame, background color. Only supplied fields change.",
    shape: {
      width: z.number().optional(),
      height: z.number().optional(),
      fps: z.number().optional(),
      startFrame: z.number().optional(),
      endFrame: z.number().optional(),
      backgroundColor: hexColor("Background color").optional(),
    },
  },
  {
    method: "project.import",
    description:
      "Import a file as a new layer: image (PNG/JPG/PSD), vector (SVG, EPS/AI), audio (WAV/MP3) or video. Set asImageSequence=true to import a numbered image sequence. Returns the new layer's id when Moho exposes it.",
    shape: {
      filePath: z.string().describe("Absolute path of the file to import"),
      asImageSequence: z.boolean().optional().describe("Treat the path as the first image of a sequence (or a folder)"),
      mode: z.number().optional().describe("Advanced: Moho FileImport mode (default 0)"),
    },
    timeoutMs: 30000,
  },
];

