---
name: moho-technique-images
description: Use bitmap images in Moho — image layers (PNG with alpha), building a cutout character from separate PNG parts, "Warp using bones" image warping, anchor bones, textures, backgrounds, image sequences, and what to do with a single flat character image (e.g. AI-generated art). Use when the user imports or supplies images/photos/AI art and wants them placed, rigged or animated.
---

# Images in Moho

Source: Moho 13.5 Tutorials 4.1–4.3. Parts marked *(our recommendation)* are NOT from the manual. **[API]** = MCP tool; **[GUI]** = Moho window.

## Facts from the manual
- An **image layer** holds ONE image file (or a movie). Use it as a background or inside a bone layer to build a character. Image and vector layers mix freely.
- Use **PNG with an alpha channel** (transparent background); non-rectangular parts need transparency. Make it in an image editor — Moho cannot cut images.
- A new image layer is **centered in the workspace**: position it afterwards with *Transform Layer* → **[API]** `layer_setTransform` (`transX/transY`, `scaleX/scaleY`, `rotation`). Leave a little overlap between neighboring parts (e.g. at the elbow).
- Attach a part to a skeleton by **binding the layer to a bone** (*Bind Layer*) → **[API]** `layer_setParentBone` / `rig_attachLayers` mode `parent`.
- **Image warping:** Layer Settings → *Image* tab → check **Warp using bones** **[GUI]**. Then the skeleton distorts the bitmap; the nearest bone influences each area most. To keep an area still, add an **anchor bone** there and never animate it. Best practice: **break the picture into logical parts** (arms, legs, body as separate images) with separate skeletons/bone layers so a leg bone cannot affect an arm.
- **Textures:** render a preview, copy it into an image editor, paint details on their OWN layer, export that layer as PNG and import it as an image layer on top (bound to the same bones).

## Workflow A — parts already separated (works today)
1. Prepare PNGs with alpha: `head.png, torso.png, upper_arm_L.png, …` (same canvas scale; consistent line style).
2. `layer_createLayer` group "Character"; for each part:
```mcp project_import
{"filePath": "D:\\Phim\\assets\\char\\head.png"}
```
   (returns `layerId`; name it with `layer_setName`.)
3. Position/scale each part so it assembles correctly (`layer_setTransform`), then screenshot and fix overlaps and stacking (`layer_placeBehind`).
4. Joint positions: measure from the assembled screenshot (units: x −1.78…1.78, y −1…1). Build the rig to MATCH the image, not the other way: `rig_buildHumanoid` with `scale`,`x`,`y` set to the character's size and hip position, or `rig_buildSkeleton` with explicit bone positions; then fix joints with `bone_setRestPose`.
5. Put the parts inside the bone layer (`layer_placeInGroup`) and bind rigidly: `rig_attachLayers` mode `parent`.
6. Animate with `anim_*` recipes; check joints in a screenshot at an extreme pose and cover gaps with overlap.
```mcp layer_setTransform
{"layerId": 31, "frame": 1, "transX": 0.12, "transY": 0.35, "scaleX": 0.45, "scaleY": 0.45}
```

## Workflow B — one flat character image (AI-generated or photo)
The manual does not cover cutting a picture into parts. Honest options, best first:
1. **Re-generate as parts** *(recommendation)*: prompt an image generator for the character in a neutral front pose with arms and legs separated from the body, plain flat background, and ask for a **parts sheet** (head, torso, upper/lower arms, hands, thighs, shins, feet, eyes, mouth shapes). Remove the background (rembg or chroma-key with ffmpeg) and crop each part to its own PNG with a script in the shell, then Workflow A.
2. **Warp the whole image with bones** (manual technique, Moho Pro): import the image, put it in a bone layer, add a few bones along the body/limbs plus anchor bones, enable *Warp using bones* **[GUI]**. Gives a floppy "puppet photo" look, fine for simple wobble/talking-head, poor for walking.
3. **Hybrid:** keep the body as one warped image, add vector eyes/mouth (`draw_*`, switch layers) on top for expressions and lip-sync (`moho-technique-lipsync`).
4. **Convert to vector inside Moho (14.5)** **[GUI]**: *Paint Bucket → Trace* mode creates NEW vector shapes from regions of a bitmap (enable *All layers* to use image/video layers as boundaries; *Avoid strokes* / *Pixel expansion* control overlap). Trace each body part on its own vector layer, then rig as usual (`moho-technique-bones-binding`). Alternatively vectorize outside (vtracer/potrace → SVG) and `project_import` the SVG — Moho 14's improved SVG import keeps layers, gradients and masks.
5. **Curvers** (Pro) **[GUI]**: *Draw → Create Curver Layer* over a tail, tentacle, hair or limb image; add points at the bends and animate the curve — the bitmap bends with it, without splitting it. See `moho-whats-new-14`.
Never promise the user a full articulated rig from one flat picture; offer these choices and show screenshots.

## Backgrounds and props
- Import big backgrounds at ≥ 2× frame width if the camera moves; set depth with `transZ` (`moho-technique-depth-effects`).
- Layered PSD: import (`project_import`) keeps layers; check `document_getLayers`.
- Sprite/image sequences: `project_import` with `asImageSequence: true` (`moho-technique-frame-by-frame`).
- Replace art later without re-placing: `image_setSource` `{layerId, filePath}` keeps transform and bone binding.
```mcp image_setSource
{"layerId": 31, "filePath": "D:\\Phim\\assets\\char\\head_v2.png"}
```
- Keep source PNGs ≤ 2048 px per part; huge bitmaps slow preview and render.

## Checklist
- [ ] PNGs have alpha and are named by role. [ ] Parts assembled and screenshotted at rest. [ ] Rig joints match image joints (`bone_setRestPose`). [ ] Parts inside the bone layer and bound. [ ] Extreme-pose test: no tears or missing overlap. [ ] `document_save`.
