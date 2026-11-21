---
name: moho-character-art
description: Draw vector characters, props and backgrounds in Moho with draw_ellipse, draw_polygon, draw_rect, draw_polyline — body-part layer structure, proportions that match rig_buildHumanoid, colors, styling. Use for "vẽ nhân vật", "tạo con gấu/robot/cây/nhà", "vẽ bối cảnh", designing a cartoon character.
---

# Character art

## Principles
- **One vector layer per body part**, all inside one group named after the character. Separate layers rig cleanly and let you restyle one part (revision).
- Draw back-to-front: later layers sit above earlier ones. Back arm → back leg → torso → front leg → front arm → head → face parts. Fix order with `layer_placeBehind`.
- Flat cartoon style: 5–8 colors, dark outline (`strokeColor` + `strokeWidth` 3–5), no gradients. Name every shape.
- `draw_polygon` with `smooth` 0.6–1 gives organic shapes (torso, hair, ears); `smooth` 0 gives hard corners.

## Procedure
1. Create the group, then each part layer inside it (`parentId` = group id). Record the ids.
```mcp layer_createLayer
{"type": "group", "name": "Gau"}
```
```mcp layer_createLayer
{"type": "vector", "name": "head", "parentId": 10}
```
2. Draw into each part layer.
```mcp draw_ellipse
{"layerId": 11, "cx": 0, "cy": 0.54, "rx": 0.16, "ry": 0.15, "fillColor": "#8B5A2B", "strokeColor": "#3B2412", "strokeWidth": 4, "name": "head_fill"}
```
```mcp draw_polygon
{"layerId": 12, "points": [{"x": -0.12, "y": 0.35}, {"x": 0.12, "y": 0.35}, {"x": 0.13, "y": 0.05}, {"x": -0.13, "y": 0.05}], "smooth": 0.7, "fillColor": "#C68642", "strokeColor": "#3B2412", "strokeWidth": 4, "name": "torso"}
```
```mcp draw_polyline
{"layerId": 13, "points": [{"x": -0.05, "y": 0.47}, {"x": 0, "y": 0.44}, {"x": 0.05, "y": 0.47}], "smooth": 1, "strokeColor": "#3B2412", "strokeWidth": 4, "name": "smile"}
```
3. `document_screenshot` after each 2–3 parts. Fix proportions before continuing.

## Layout that matches `rig_buildHumanoid` (scale 1, defaults x=0, y=−0.05)
Draw parts at these places so the rig fits without re-posing. Character faces the viewer; its LEFT (`_L`) is on screen RIGHT (+x).
| Part | Location (layer units) |
|---|---|
| head | center (0, 0.54), radius ≈ 0.13–0.16 |
| neck | (0, 0.39) |
| torso | from y 0.35 (shoulders) down to y 0.05, half-width ≈ 0.12 |
| pelvis | y −0.05…0.05 |
| upper arm L / R | from (±0.12, 0.35) down to (±0.12, 0.13) |
| forearm | to (±0.12, −0.07) |
| hand | to (±0.12, −0.15) |
| thigh | from (±0.07, −0.05) down to (±0.07, −0.35) |
| shin | to (±0.07, −0.65) |
| foot | at (±0.07, −0.65), pointing outward ≈ 0.1 long |
Total height ≈ 1.3 (y −0.7 … 0.65). For another size, pass `scale` and `x`,`y` to `rig_buildHumanoid` and multiply these numbers.
(This assumes the default bone-origin convention. If bones land wrong, see `moho-troubleshooting`.)

## Face parts
- Eyes/mouth that must change: make a **switch layer** (`layer_createLayer` type `switch`) and create child vector layers inside it, one per state: eyes `open`, `closed`; mouth `rest`, `AI`, `E`, `O`, `U`, `etc`, `FV`, `L`, `MBP`, `WQ`. Draw each state in its child. Animate with `moho-animation` (`anim_blink`, `anim_lipSync`).
- Simple characters: skip switch layers; use `draw_ellipse` eyes and squash them with `anim_blink` `eyeLayerIds`.

## Props and backgrounds
- Background = its own vector layers drawn first (sky `draw_rect` covering x −2…2, y −1.2…1.2; ground; hills via `draw_polygon` smooth 1). See `moho-scene-camera`.
- User-supplied art: `project_import` (PNG/SVG/PSD) instead of drawing.

## Palette hints
Skin `#C68642`/`#F1C27D`, fur brown `#8B5A2B`, outline `#2B1B12`, sky `#8FD3FF`, grass `#5CB85C`, sun `#FFD93D`, cloud `#FFFFFF`. Keep strong value contrast between character and background.
