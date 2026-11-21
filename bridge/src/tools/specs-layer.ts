import { z } from "zod";
import type { PassThroughSpec } from "../tooling/define.js";
import { frame, hexColor, layerId } from "./schema.js";

const LAYER_TYPES = ["vector", "group", "bone", "image", "switch", "particle", "note", "patch", "audio"] as const;

/** Layer queries, creation, hierarchy and effects. */
export const layerSpecs: PassThroughSpec[] = [
  {
    method: "layer.getProperties",
    description: "Get a layer's properties: type, visibility, lock state, opacity and transform.",
    shape: { layerId },
  },
  {
    method: "layer.getChildren",
    description: "Get the direct children of a group layer.",
    shape: { layerId: layerId.describe("Absolute ID of the group layer") },
  },
  {
    method: "layer.getBones",
    description: "List every bone in a bone layer (id, name, position, angle, length, parentId).",
    shape: { layerId: layerId.describe("Absolute ID of the bone layer") },
  },
  {
    method: "layer.createLayer",
    description:
      "Create a layer. If parentId (a group) is given, the new layer is created inside it. Returns the new layerId — keep it, every other tool addresses layers by this id.",
    shape: {
      type: z.enum(LAYER_TYPES).describe("Layer type"),
      name: z.string().optional().describe("Layer name"),
      parentId: z.number().optional().describe("Absolute ID of a group to create the layer in (default: document root)"),
    },
  },
  {
    method: "layer.deleteLayer",
    description: "Delete a layer by absolute ID (undoable inside Moho).",
    shape: { layerId },
  },
  {
    method: "layer.duplicate",
    description:
      "Duplicate a layer (and its children); the copy is placed above the original. Use it to clone a character for a second scene or to repeat props.",
    shape: { layerId, name: z.string().optional().describe("Name for the copy") },
  },
  {
    method: "layer.setName",
    description: "Rename a layer.",
    shape: { layerId, name: z.string() },
  },
  {
    method: "layer.selectLayer",
    description: "Select a layer in the Moho UI.",
    shape: { layerId },
  },
  {
    method: "layer.setVisibility",
    description: "Show or hide a layer.",
    shape: { layerId, visible: z.boolean() },
  },
  {
    method: "layer.setOpacity",
    description: "Set layer opacity at a frame (0 transparent .. 1 opaque). Animates when set at several frames.",
    shape: { layerId, frame, opacity: z.number().min(0).max(1) },
  },
  {
    method: "layer.setTransform",
    description:
      "Set a layer's translation / rotation (radians) / scale at a frame. Only supplied values change. Translation and scale are 3D; Z defaults to the existing value.",
    shape: {
      layerId,
      frame,
      transX: z.number().optional(),
      transY: z.number().optional(),
      transZ: z.number().optional(),
      rotation: z.number().optional().describe("Z rotation in radians"),
      scaleX: z.number().optional(),
      scaleY: z.number().optional(),
      scaleZ: z.number().optional(),
    },
  },
  {
    method: "layer.setParentBone",
    description:
      "Make a layer follow a bone (e.g. parent a hand layer to a wrist bone). boneId = -1 clears. This is how art layers get attached to a rig.",
    shape: { layerId, boneId: z.number().int().describe("Bone index in the parent skeleton, or -1 to clear") },
  },
  {
    method: "layer.placeInGroup",
    description: "Move a layer into a group. top=true places it at the top of the stack.",
    shape: {
      layerId,
      parentGroupId: z.number().int().describe("Absolute ID of the destination group"),
      top: z.boolean().optional(),
    },
  },
  {
    method: "layer.placeBehind",
    description: "Reorder: move a layer behind (below) another layer in the same group.",
    shape: { layerId, behindLayerId: z.number().int() },
  },
  {
    method: "layer.activateAction",
    description:
      'Switch into editing a named action (e.g. a smart-bone dial). Keyframes set while it is active are stored in that action. Pass "" or omit to return to the main timeline. ALWAYS return to the main timeline afterwards.',
    shape: { layerId, actionName: z.string().optional() },
  },
  {
    method: "layer.listActions",
    description: "List a layer's actions, which one is being edited, and which are smart-bone actions.",
    shape: { layerId },
  },
  {
    method: "layer.setBlur",
    description: "Animate a layer's blur amount (depth of field, focus pulls).",
    shape: { layerId, frame, amount: z.number().min(0) },
  },
  {
    method: "layer.setShadow",
    description: "Animate a layer's drop shadow. All fields optional; enabled toggles it.",
    shape: {
      layerId,
      frame,
      enabled: z.boolean().optional(),
      offset: z.number().optional(),
      blur: z.number().optional(),
      angle: z.number().optional().describe("Direction in radians"),
      color: hexColor("Shadow color").optional(),
    },
  },
  {
    method: "layer.setOutline",
    description: "Animate a layer's outline. All fields optional; enabled toggles it.",
    shape: {
      layerId,
      frame,
      enabled: z.boolean().optional(),
      width: z.number().optional(),
      color: hexColor("Outline color").optional(),
    },
  },
  {
    method: "switch.setActive",
    description:
      "Choose which child of a switch layer is visible from a frame onward. Use switch layers for mouth shapes (lip-sync), eye states (open/closed/blink) and swap-art expressions. Pass childName or childIndex.",
    shape: {
      layerId: layerId.describe("Absolute ID of the switch layer"),
      frame,
      childName: z.string().optional(),
      childIndex: z.number().int().optional(),
    },
  },
  {
    method: "switch.getActive",
    description: "Read which child of a switch layer is visible at a frame.",
    shape: { layerId, frame: z.number().optional() },
  },
  {
    method: "image.setSource",
    description: "Set the file on an image layer (PNG/JPG/PSD, image sequence folder, or movie).",
    shape: { layerId, filePath: z.string() },
  },
  {
    method: "image.getSource",
    description: "Read an image layer's source path, pixel size and movie/PSD/sequence flags.",
    shape: { layerId },
  },
  {
    method: "particle.setEmitter",
    description:
      "Configure a particle layer (rain, snow, sparks, smoke). All settings optional; FinalizeSettings runs automatically.",
    shape: {
      layerId,
      numParticles: z.number().optional(),
      displayNumParticles: z.number().optional(),
      lifetime: z.number().optional().describe("Particle lifetime in frames"),
      velocity: z.number().optional(),
      velocitySpread: z.number().optional(),
      directionAngle: z.number().optional().describe("Radians"),
      directionSpread: z.number().optional().describe("Radians"),
      accelerationAngle: z.number().optional().describe("Radians, e.g. -PI/2 for gravity"),
      accelerationRate: z.number().optional(),
      damping: z.number().optional(),
      evenlySpaced: z.boolean().optional(),
      orientation: z.boolean().optional(),
      freeFloating: z.boolean().optional(),
      fullSpeedStart: z.boolean().optional(),
      randomStartTime: z.boolean().optional(),
      sourceWidth: z.number().optional(),
      sourceHeight: z.number().optional(),
      sourceDepth: z.number().optional(),
      randomSeed: z.number().optional(),
    },
  },
];
