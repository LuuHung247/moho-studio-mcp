import { z } from "zod";
import type { PassThroughSpec } from "../tooling/define.js";
import { frame, hexColor, layerId, LIMITS } from "./schema.js";

const pointIndex = z.number().int().min(0);

/** Bones, mesh/vector drawing primitives, and animation channels. */
export const rigSpecs: PassThroughSpec[] = [
  // ---- bones ----------------------------------------------------------
  {
    method: "bone.getProperties",
    description: "Get a bone's position, angle, scale, length and parent.",
    shape: { layerId, boneId: z.number().int() },
  },
  {
    method: "bone.addBone",
    description:
      "Add a bone to a bone layer. Rest-pose fields are optional. Returns boneId (= index, assigned in creation order). For whole skeletons prefer rig_buildSkeleton / rig_buildHumanoid.",
    shape: {
      layerId: layerId.describe("Absolute ID of the bone layer"),
      name: z.string().optional(),
      posX: z.number().optional(),
      posY: z.number().optional(),
      angle: z.number().optional().describe("Radians"),
      length: z.number().optional(),
      scale: z.number().optional(),
      parentBoneId: z.number().int().optional().describe("Parent bone index, -1 = none"),
    },
  },
  {
    method: "bone.deleteBone",
    description: "Delete a bone. recursive=true also deletes descendants; otherwise children are re-parented.",
    shape: { layerId, boneId: z.number().int(), recursive: z.boolean().optional() },
  },
  {
    method: "bone.setRestPose",
    description:
      "Edit a bone's setup (rest) pose: position, angle, length, scale, parent, name. Unlike bone_setTransform this is not animated.",
    shape: {
      layerId,
      boneId: z.number().int(),
      name: z.string().optional(),
      posX: z.number().optional(),
      posY: z.number().optional(),
      angle: z.number().optional(),
      length: z.number().optional(),
      scale: z.number().optional(),
      parentBoneId: z.number().int().optional(),
    },
  },
  {
    method: "bone.setTransform",
    description:
      "Pose a bone at a frame (creates keyframes): angle (radians), posX/posY, scale. Only supplied values change. Use animation_setInterpolation for easing.",
    shape: {
      layerId,
      boneId: z.number().int(),
      frame,
      angle: z.number().optional(),
      posX: z.number().optional(),
      posY: z.number().optional(),
      scale: z.number().optional(),
    },
  },
  {
    method: "bone.selectBone",
    description: "Select a bone in the Moho UI.",
    shape: { layerId, boneId: z.number().int() },
  },
  {
    method: "bone.createSmartAction",
    description:
      "Create a smart-bone action named after the bone. Then call layer_activateAction with that name, pose bones with bone_setTransform at the dial's frames, and return to the main timeline. See rig_createSmartBone for the whole sequence in one call.",
    shape: { layerId, boneId: z.number().int(), frame: z.number().optional() },
  },
  // ---- mesh / vector ----------------------------------------------------
  {
    method: "mesh.getPoints",
    description: "List the points (vertices) of a vector layer.",
    shape: { layerId: layerId.describe("Absolute ID of the vector layer") },
  },
  {
    method: "mesh.getShapes",
    description: "List the shapes (fills/strokes) of a vector layer with their colors.",
    shape: { layerId },
  },
  {
    method: "mesh.getCurves",
    description:
      "List a vector layer's curves with the mapping from curve-local to mesh-global point indices. Needed before mesh_setBezierHandle.",
    shape: { layerId },
  },
  {
    method: "mesh.addPoint",
    description:
      "Low-level: add a point at (x, y). With connectToPointId it attaches to that point; with startNewCurve (or an empty mesh) it starts a curve; otherwise it appends. For real artwork prefer draw_ellipse / draw_rect / draw_polygon / draw_polyline.",
    shape: {
      layerId,
      x: z.number(),
      y: z.number(),
      frame: z.number().optional(),
      connectToPointId: pointIndex.optional(),
      startNewCurve: z.boolean().optional(),
    },
  },
  {
    method: "mesh.createShape",
    description:
      "Low-level: create a fill/stroke shape from point indices (a closed loop for a filled shape). Colors are hex strings.",
    shape: {
      layerId,
      pointIndices: z.array(pointIndex).min(2).max(LIMITS.pointIndices),
      filled: z.boolean().optional(),
      frame: z.number().optional(),
      name: z.string().optional(),
      fillColor: hexColor("Fill color").optional(),
      strokeColor: hexColor("Stroke color").optional(),
      strokeWidth: z.number().optional(),
    },
  },
  {
    method: "mesh.setPointCurvature",
    description: "Smooth (≈1) or sharpen (0) a vertex. Makes shapes look hand-drawn instead of polygonal.",
    shape: { layerId, pointIndex, curvature: z.number(), frame: z.number().optional() },
  },
  {
    method: "mesh.setBezierHandle",
    description:
      "Set one bezier control handle on a curve point (curve-local index — see mesh_getCurves). prePoint=true targets the incoming handle.",
    shape: {
      layerId,
      curveIndex: z.number().int().min(0),
      curvePointIndex: z.number().int().min(0),
      x: z.number(),
      y: z.number(),
      frame: z.number().optional(),
      prePoint: z.boolean().optional(),
      syncAngles: z.boolean().optional(),
    },
  },
  {
    method: "mesh.bindPoints",
    description:
      "Bind mesh points to a bone so the bone deforms them. boneId: -1 unbind, -2 flexi-bind to all bones, otherwise a bone index. See rig_bindLayerToBone to bind a whole layer.",
    shape: { layerId, pointIndices: z.array(pointIndex).min(1).max(LIMITS.pointIndices), boneId: z.number().int() },
  },
  {
    method: "mesh.setShapeStyle",
    description:
      "Restyle an existing shape: fill/stroke color (animatable via frame), stroke width, name, and hasFill/hasOutline toggles.",
    shape: {
      layerId,
      shapeIndex: z.number().int().min(0),
      frame: z.number().optional(),
      name: z.string().optional(),
      fillColor: hexColor("Fill color").optional(),
      strokeColor: hexColor("Stroke color").optional(),
      strokeWidth: z.number().optional(),
      hasFill: z.boolean().optional(),
      hasOutline: z.boolean().optional(),
    },
  },
  // ---- animation channels -------------------------------------------------
  {
    method: "animation.getKeyframes",
    description: "List keyframes of a channel on a layer.",
    shape: { layerId, channel: z.string() },
  },
  {
    method: "animation.getFrameState",
    description: "Get a layer's full animated state at a frame.",
    shape: { layerId, frame },
  },
  {
    method: "animation.setKeyframe",
    description:
      "Set a keyframe on a channel: a number for scalar channels (rotation, opacity), {x, y} for vec2 channels (translation, scale).",
    shape: {
      layerId,
      channel: z.string(),
      frame,
      value: z.union([z.number(), z.object({ x: z.number(), y: z.number() })]),
    },
  },
  {
    method: "animation.deleteKeyframe",
    description: "Delete a keyframe.",
    shape: { layerId, channel: z.string(), frame },
  },
  {
    method: "animation.setInterpolation",
    description:
      'Set easing on an existing keyframe: "linear", "smooth", "ease_in", "ease_out" or "step". Use "step" for blinks/pops and "smooth" for natural motion.',
    shape: {
      layerId,
      channel: z.string(),
      frame,
      mode: z.enum(["linear", "smooth", "ease_in", "ease_out", "step"]),
    },
  },
];
