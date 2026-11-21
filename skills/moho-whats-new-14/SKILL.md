---
name: moho-whats-new-14
description: Moho 14 / 14.5 features an agent should use instead of old workarounds — Paint Bucket Trace/Vector/Recolor, Curvers, Liquid Shapes, merge/add-subtract shapes, SVG import, Freehand styles and line boil, dynamic bones (angle/position/scale, gravity, delay), Audio Phonemes, Live Performance, onion skins, timeline options, EXR/MP4 export, command-line options. Use when choosing a technique on Moho 14.x, or when older tutorials (13.5) conflict.
---

# What's new in Moho 14 → 14.5 (and how to use it)

Sources: Moho 14 Users Manual ("What's New" 14.0–14.5) and Tutorial 11. **[API]** = MCP tool; **[GUI]** = Moho window. Pro-only items are marked.

## Drawing and art
| Feature | Use it for | Notes |
|---|---|---|
| **Paint Bucket: Vector / Trace / Recolor** (14.5) | *Trace* fills a region like a bitmap bucket and creates a NEW vector shape — **also across image/video layers** ("All layers" option); this converts imported/AI bitmap art into vector shapes without tracing software. *Vector* builds shapes from existing points (auto-weld, "Extend curves" closes small gaps). *Recolor* changes a shape's color without new points | **[GUI]**. Trace options: *Avoid strokes*, *Pixel expansion* (overlap under lines) |
| Freehand improvements (14.5) | trim stray tails of crossing strokes, Shift = straight line (45° snaps), better weld of endpoints to mid-curve | **[GUI]** |
| Blob Brush, Eraser (fills + strokes), Multi-Stroke Fill, *Connect & Create*, click-to-click Add Point | faster inking and filling | **[GUI]** |
| **Add / Subtract / Intersect shapes** (Merge Shapes, Pro) | boolean shape building (holes, cut-outs) | **[GUI]** |
| **Freehand styles** (Pro): Wet Ink, Charcoal, Gouache, Rough Ink, Watercolor… | one look across many drawings; edit the style, all strokes update | create a style from a shape (Tutorial 11.19) |
| **Line boil** + *Smart Boil* (Pro) | hand-drawn "wobble"; interval 1 s/2 s/…; 0 = boil only while the character moves | **[GUI]** brush settings |
| **SVG import (improved)** (Pro) | bring layers, gradients, masks from Illustrator/Inkscape/Affinity | **[API]** `project_import` with an .svg |
| Point Colors follow curves | smooth per-point color gradients | **[GUI]** |
| Real-time canvas effects | gradients, soft edge, shadows, blur, noise, blend modes, masking previews match the render | what you see ≈ final render |
| Flip canvas (Shift+F) | check drawings mirrored | **[GUI]** (`input_sendKeys` `shift+f`) |

## Special shapes and warps
- **Liquid Shapes** (Pro): soft metaball-like shapes you combine/subtract/blend and animate in real time — fire, smoke, water, explosions, and simple expressive characters. **[GUI]**.
- **Curvers** and **Compressible Curvers** (Pro): *Draw → Create Curver Layer* adds a warp layer with a curve over an image or vector; add points at bends, match line width, animate the curve to bend tails, hair, snakes, tentacles; compressible = the art compresses/stretches along the curve. Can be rigged with bones/smart bones. **[GUI]**. A great way to animate imported bitmaps without splitting them (`moho-technique-images`).
- Perspective warp / quad warp (Tutorial 10) and Warp Layers (manual chapter 27) for distort effects. **[GUI]**

## Bones and animation
- **Dynamic bones** now work on **angle, position and scale**, each with a **Weight** (bigger = heavier, slower follow-through), plus **Gravity** (Force tool: strength % and direction, both keyframable) — jiggle, ears, hair, tails, bellies without hand keys. **[GUI]** Bone Constraints → Bone Dynamics. Cheaper API alternative: `anim_oscillate`.
- **Delayed Constraints** (Pro): control bones can follow with a delay per bone (script *Delayed Constraints*) — overlapping action in one step. **[GUI]**
- **Link Bones to Layer** replaces "Use selected bones for flexi-binding" (Select Bone tool has a *Link Bones* button) — isolate a bone subset to an art layer (right-arm bones affect only the right-arm art). **[GUI]**
- **360° Smart Bones** (14.4) → `moho-technique-smart-bones`.
- **Timeline** redesign: toggle Frame Zero, onion-skin colors, **relative keyframing**, automatic freezing, freeze/reset pose, default interpolation for new keys, keyframe window. **Onion skins (14.5)**: *Magnetic (before/after)* follows neighboring keyframes; *Shift and Trace* moves onion skins independently; *Reset Placement* in the Onion Skins menu. **[GUI]**
- **Magnet tool** can pull points back toward frame-0 positions (undo part of a deformation). **[GUI]**
- Layers panel filter **Is Animated** shows layers with keyframes (review/retake). **[GUI]**
- **Create Frame-by-Frame animation** improvements (11.09): `moho-technique-frame-by-frame`.

## Audio, speech and live
- **Audio Phonemes** (14.5): analyze a selected audio layer; phoneme labels appear on the timeline as a timing reference for Switch Selector, FBF or Smart Bone lip-sync. Keep that audio layer in the timeline view to see the labels. **[GUI]**
- **Bone Lip Sync** script (14.5): generates mouth keys on a **Mouth** smart bone from phoneme labels inside its action; edit generated keys afterwards. **[GUI]**
- **Live Performance Mode** (14.5): camera (head/face), microphone, keyboard, gamepad drive smart bones and actions; Moho Virtual Webcam streams the result (File → Live Mode with Virtual Webcam; macOS needs the camera extension enabled). **[GUI]**
- Volume lip-sync via switch layer audio source (unchanged): `moho-technique-lipsync`; API route `anim_lipSyncFromAudio`.
- **Video Tracking** improved, now also tracks image sequences (14.5). **[GUI]**

## Export and pipeline
- **MP4/H.264** is the new compatible default (browsers, Discord, social). Also MOV (ProRes alpha, PNG alpha, MJPEG, MPEG4), AVI, animated GIF (≤256 colors, no sound), image sequences PNG/JPEG/BMP/TGA/TIFF/WebP/PSD, **EXR** (16/32-bit float, color spaces), **SVG** sequences, **glTF** (Pro, Tutorial 11.17), PNG color profiles (sRGB/Display P3/None).
- **Command line** (this MCP server uses it automatically): `Moho -r Scene.moho -f MP4 -options "MP4 (MPEG4-AAC)" -o out.mp4 -start 1 -end 240 -log render.log`; EXR: `-exr "bitdepth 16 colorspace rec709 compression zip"`. See `moho-film-export`.
- **Moho Exporter** (batch exporter) keeps finished jobs with status Running/Done/Failed.
- Reference-layer scenes render faster; "Save a copy" in 14.5 can shrink files.
- Scripting is **Lua 5.4.4** (what the MCP plugin runs on).

## When 13.5-era advice conflicts
Prefer the 14.x feature: Link Bones to Layer (not "use selected bones for flexi-binding"), Paint Bucket Trace (not manual tracing), Curvers (not many bones) for tails/tentacles, dynamic bones with gravity (not hand-keyed secondary motion), MP4 default presets.
