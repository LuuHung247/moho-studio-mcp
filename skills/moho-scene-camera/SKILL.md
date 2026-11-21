---
name: moho-scene-camera
description: Compose a Moho scene — project_new settings, backgrounds, layer order, importing images/SVG/audio, duplicating characters, camera moves (anim_cameraMove, anim_cameraShake), fades, particle effects like rain and snow. Use for "tạo cảnh", "dựng bối cảnh", "camera zoom/pan", "mưa/tuyết", multi-scene projects.
---

# Scene and camera

## New scene
Save current work first, then:
```mcp project_new
{"width": 1920, "height": 1080, "fps": 24, "startFrame": 1, "endFrame": 240, "backgroundColor": "#FFFFFF"}
```
Length: `endFrame = seconds × fps`. One `.moho` file per scene (`document_save` with a path like `D:\Phim\canh1.moho`). Change later with `project_setProperties`.

## Layer structure (bottom → top)
`Sky` → `Far` (hills) → `Mid` → `Ground` → `Props` → `Characters` → `Foreground` → `Effects`. Create each as a vector or group layer; draw with `draw_*` (see `moho-character-art`). Reorder with `layer_placeBehind` / `layer_placeInGroup`. Name layers in the user's language.
```mcp draw_rect
{"layerId": 60, "x": -2.2, "y": -1.2, "width": 4.4, "height": 2.4, "fillColor": "#8FD3FF", "name": "sky"}
```
```mcp draw_polygon
{"layerId": 61, "points": [{"x": -2.2, "y": -1.2}, {"x": -2.2, "y": -0.35}, {"x": -1, "y": -0.2}, {"x": 0.3, "y": -0.4}, {"x": 1.5, "y": -0.25}, {"x": 2.2, "y": -0.4}, {"x": 2.2, "y": -1.2}], "smooth": 1, "fillColor": "#5CB85C", "strokeColor": "#2E7D32", "strokeWidth": 3, "name": "hill"}
```
Draw backgrounds larger than the frame (x ±2.2, y ±1.2) so camera moves never reveal edges.

## Bring in assets
```mcp project_import
{"filePath": "D:\\Phim\\assets\\nen.png"}
```
Works for PNG/JPG/PSD, SVG/EPS, audio (WAV/MP3), video. Returns the new `layerId`. Use `layer_setTransform` to position/scale it. Prefer ASCII paths.

**Reusing a character in the next scene:** there is no cross-document copy through the API. Instead finish the character in scene 1, then for scene 2 `document_save` scene 1, `project_open` it and `document_save` with a NEW path (Save As, e.g. `canh2.moho`), then change the background, length (`project_setProperties`) and animation (keys at the same frames are overwritten; delete leftovers with `animation_deleteKeyframe`). Within one file use `layer_duplicate`.

## Duplicate and vary
```mcp layer_duplicate
{"layerId": 10, "name": "Gau_2"}
```
Then `layer_setTransform` (position/scale) and `mesh_setShapeStyle` (colors) to differentiate.

## Camera
Push-in on a reaction, pan to follow action, slow zoom for mood:
```mcp anim_cameraMove
{"startFrame": 1, "endFrame": 240, "from": {"x": 0, "y": 0, "zoom": 1}, "to": {"x": 0.4, "y": 0, "zoom": 1.15}, "holdFrames": 0}
```
Shake for impacts:
```mcp anim_cameraShake
{"startFrame": 120, "endFrame": 132, "amplitude": 0.04, "interval": 2, "seed": 5}
```
Low-level: `document_setCamera` `{frame, posX, posY, posZ, tilt, pan, roll, zoom}`. Keep zoom ≥ 1 unless the backgrounds are larger than the frame, otherwise the edges show.

## Transitions and depth
- Fade in/out: `anim_fade` on a full-screen black rect layer or on the characters; fade from black: black `draw_rect` layer opacity 1→0.
- Parallax: slide far layers slower than near layers with `anim_layerPath` over the same frames (far 20 %, mid 50 %, near 100 % of the distance).
- Depth blur: `layer_setBlur` on far/near layers; `layer_setShadow` for ground shadows.

## Weather and effects
Particle layer:
```mcp layer_createLayer
{"type": "particle", "name": "Mua"}
```
```mcp particle_setEmitter
{"layerId": 70, "numParticles": 400, "lifetime": 40, "velocity": 1.5, "velocitySpread": 0.3, "directionAngle": -1.57, "directionSpread": 0.1, "accelerationAngle": -1.57, "accelerationRate": 0.5, "sourceWidth": 4, "sourceHeight": 0.1}
```
Rain: down (−π/2), fast, long lines (draw a thin stretched ellipse as the particle art if needed). Snow: slow `velocity` 0.2, big spread, `lifetime` 120. Always screenshot a middle frame — particles only show over time.

## Audio
`project_import` an audio file for reference/sync (you also pass `audioPath` at export). Place cues by `frame = seconds × fps`.

## Checklist
- [ ] Size/fps/length set [ ] Layer order sensible [ ] Backgrounds overscan the camera path [ ] Screenshots at start/middle/end [ ] `document_save`.
