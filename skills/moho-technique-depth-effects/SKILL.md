---
name: moho-technique-depth-effects
description: Depth and visual-effects techniques in Moho — layer Z depth and parallax with camera moves, camera animation, layer shadow/glow/outline tricks, blur and depth of field, particles, masking effects, physics, 3D layers/models, perspective shadows. Use for "tạo chiều sâu", parallax, hào quang/glow, bóng đổ, mưa tuyết, cảnh 3D, làm mờ nền.
---

# Depth and effects

Source: Moho 13.5 Tutorials 5.5, 5.8, 5.9, 6.1–6.9. **[API]** = MCP tool; **[GUI]** = Moho window.

## Depth with Z (real parallax)
Every layer has a Z position. **Negative Z = farther from the camera** (manual example: nearer hill Z −1, far hill −2, sky −20). When the camera tracks, near layers pass quickly and far layers slowly — like looking from a car. Far layers also appear smaller, so enlarge them (`scaleX/scaleY`) or draw them oversize.
**[API]**
```mcp layer_setTransform
{"layerId": 61, "frame": 1, "transZ": -2}
```
Recipe: ground/characters Z 0; mid-hills −1…−3; far hills −5…−10; sky −20 (and scale it up so it still fills the frame); foreground props Z +0.5 (large, blurred). Then move the camera:
```mcp anim_cameraMove
{"startFrame": 1, "endFrame": 120, "from": {"x": -0.8}, "to": {"x": 0.8}}
```
Check: screenshot frames 1, 60, 120; layers should slide at different speeds and edges must never show (oversize backgrounds). Set Z at frame 0/1 as a static setup (not an animated change).
- **Sort layers by depth** (so a layer moving toward the camera passes in front of others): group Layer Settings → sort option **[GUI]**; animate `transZ` for the passing object.
- Orbit Workspace tool **[GUI]** shows the Z spacing in 3D to debug layouts.

## Camera
**[API]** `anim_cameraMove` (pan x/y, zoom, roll), `anim_cameraShake`, low-level `document_setCamera` (`posX/posY/posZ`, `tilt`, `pan`, `roll`, `zoom`). Camera keys are normal keyframes; set the starting view at frame 1, new key at the end frame. Zoom camera field-of-view (Vertical FOV, 45° typical) **[GUI]** *Zoom Camera* tool. Parallax + slow zoom (1 → 1.1) is the cheapest "cinematic" look.

## Depth of field and atmosphere
- `layer_setBlur` on far/near layers (far: 2–6, foreground: 8–20); animate for focus pulls (key 0 → value → 0).
- Atmospheric perspective: lower `layer_setOpacity` (0.7–0.9) or lighter/bluer fill for far layers.
- Blur is not supported in SWF export; MP4/MOV are fine.

## Shadows, glows, outlines (layer shadow settings)
The layer shadow feature does more than shadows. **[API]** `layer_setShadow` / `layer_setOutline`:
```mcp layer_setShadow
{"layerId": 11, "frame": 1, "enabled": true, "offset": 0, "blur": 16, "color": "#FFE066FF"}
```
- **Glow**: offset 0 (centered), high blur (≈16), bright **fully opaque** color (alpha FF — transparent glows vanish), plus *Expansion* so it extends beyond the shape (**[GUI]**: Layer Settings → Shadows tab → Expansion).
- **Drop shadow**: offset 0.02–0.05, angle −π/4, blur 4–8, color `#00000066`.
- **Outline around a whole group/silhouette**: `layer_setOutline` (`width`, `color`) or shadow with offset 0 and expansion and no blur.
- **Ground/perspective shadows**: duplicate the shape, flatten it (`scaleY` 0.3), darken, `layer_placeBehind`; true perspective shadow tutorial uses a 3D-like skew **[GUI]**.

## Particles
**[API]** `layer_createLayer` type `particle`, then `particle_setEmitter` (count, lifetime, velocity, direction, acceleration, source size).
```mcp particle_setEmitter
{"layerId": 70, "numParticles": 300, "lifetime": 48, "velocity": 0.8, "velocitySpread": 0.4, "directionAngle": 1.57, "directionSpread": 0.5, "accelerationAngle": 1.57, "accelerationRate": 0.2, "sourceWidth": 0.2, "sourceHeight": 0.05}
```
- Particles need art: the particle layer uses the vector layer(s) inside it as the particle shape; draw a small ellipse/star/raindrop in it. Fire/smoke: small orange→grey shapes rising; sparks: tiny bright shapes with gravity (accelerationAngle −π/2).
- Grass/crowds trick **[GUI]**: stationary, many particles with randomized size build grass fields or crowds; depth-of-field via Z.
- Speed up heavy particle scenes: lower `numParticles`, shorten `lifetime`, render sizes smaller **[GUI]** (Tutorial 6.7).
- Pre-made particle effects ship in the content library **[GUI]** (File → Import → Moho Object from Library).

## Masking effects (clouds across a moon, light cones, wipes, windows)
**[GUI]** Group Layer Settings → *Masking*: Group mask "Hide all", child mask layers *Add to mask*/*Subtract from mask*; combine with blur on the mask layer for soft edges. Animate the mask layer's position for wipes/reveals. Fallback in API: opacity fades and layer ordering.

## Physics (Pro)
Objects collide and bounce only if (1) they are **filled** shapes, (2) inside the group that has physics enabled, (3) the group has physics turned on **[GUI]** (Layer Settings → Physics, gravity, bounce/friction). Create the group and the shapes via API (`layer_createLayer` group, `draw_*`), then enable physics and run/bake **[GUI]**; static ground = a sharp-cornered filled shape marked immovable.

## 3D scenes and models
Move layers in Z (above) for 2.5D. True 3D models (Pro): import via File → Import → 3D Model **[GUI]**; rotate/scale the 3D layer with `layer_setTransform`. Keep 3D to props; toon-shade in Layer Settings.

## Quality checklist
- [ ] Backgrounds oversize for camera moves. [ ] Z order matches visual order. [ ] Glows use opaque colors. [ ] Blur not stacked on every layer (render time). [ ] Screenshot at start/middle/end of camera move.
