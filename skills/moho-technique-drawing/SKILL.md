---
name: moho-technique-drawing
description: Moho vector-drawing techniques from the official tutorials — frame 0 rule, closed curves and welding, shapes with holes, hidden edges, varying line width, shape ordering (incl. animated), brushes, layer masking, styles — with which are MCP tools [API] vs GUI-only [GUI]. Use when drawing needs more than draw_ellipse/polygon: outlines that stop, holes, depth order, recolorable palettes, soft shading.
---

# Drawing techniques (Moho Pro)

Source: Moho 13.5 Tutorial Manual (Drawing chapter); 14.x behaves the same unless noted. **[API]** = doable with MCP tools. **[GUI]** = only via the Moho window (see `moho-advanced-gui-fallback`).

## Core rules
- **Frame 0 is the setup frame.** Original drawings, new shapes and bone rest poses are made at frame 0. Edits at frame ≥ 1 are *animation* keys, not changes to the artwork. All `draw_*` / `mesh_*` tools default to frame 0 — keep it, except when you intentionally animate a shape. Animation starts at frame 1.
- A **fill needs closed curves.** Closing a curve = welding its endpoints into one point. `draw_*` tools weld for you. In low-level work attach the last point to the first (`mesh_addPoint` with `connectToPointId` = index of the first point).
- Welding also keeps neighboring shapes joined during animation: shapes that must stay glued (arm to shoulder) should share welded points. In cutout style prefer overlapping rounded shapes instead.
- Name layers and shapes (`name` param). Draw large parts first, details on top.

## Techniques
| Need | How |
|---|---|
| Filled blob/organic shape | **[API]** `draw_polygon` with `smooth` 0.6–1 |
| Perfect circle/oval | **[API]** `draw_ellipse` (`segments` 8; 12+ for big circles) |
| Open line (mouth, brow, hair strand) | **[API]** `draw_polyline` with `strokeColor`, `strokeWidth` |
| **Shape with a hole** (donut, window, eye ring) | **[API]** Easiest: draw the hole shape on top in the background color. True hole: build two closed loops with `mesh_addPoint` (outer, then inner), then ONE `mesh_createShape` listing the point indices of BOTH loops — Moho treats inner curves as holes. Verify with `document_screenshot` |
| Outline that stops partway (nose/ear joining a head without a line) | **[GUI]** *Hide Edge* tool, click the edges to hide (drag across if nothing happens). API alternative: draw the fill shapes without stroke (`strokeWidth` omitted) and add the visible outline as a separate `draw_polyline` |
| Tapered / varying line width (arm drawn as a stroke, hair, brush-ink look) | **[GUI]** *Line Width* tool on points; widths are percentages so they survive bending. Trick: create a stroke-shape twice on the same curve; recolor the upper one as the fill |
| Paint-brush look on outlines | **[GUI]** *Freehand* tool + brush in Style panel (variable width, taper start/end) |
| Change which shape is in front | **[GUI]** *Select Shape*, then Up/Down arrow (Shift+arrow = to top/bottom). API: put parts on separate layers and use `layer_placeBehind` — preferred for rigs |
| Shape order that changes over time (a hand passing behind then in front of a body) | **[GUI]** Layer Settings → *Vectors* tab → check *Animated shape order*, then re-order at later frames. API alternative: two layers + `layer_setVisibility`, or swap with a switch layer (`moho-technique-frame-by-frame`) |
| Recolor many shapes at once / consistent palette | **[GUI]** *Styles* (Style window → Advanced; define "Skin", "Outline"…; shapes using a style change together). **[API]** `mesh_getShapes` → `mesh_setShapeStyle` per shape; keep a table palette-name → hex → shape list |
| Soft shading, gradients, soft edge | **[GUI]** Style window fill effects / gradient; or draw a darker `draw_polygon` with `fillColor` alpha (`#RRGGBBAA`) on top |
| Mask: show art only inside a shape (light cones, windows, wipes) | **[GUI]** group Layer Settings → *Masking* tab (Group mask "Hide all", then mask layers set to *Add to mask* / *Subtract*). Reference: Tutorial 2.7 |
| Tracing/reference image under drawing | **[API]** `project_import` the image, `layer_setOpacity` 0.4, `layer_placeBehind`, lock/hide when done |

## Shape-style hygiene (so revisions are easy)
1. Give each semantic part its own shape name: `skin`, `outline`, `shirt`, `hair`.
2. Store the palette in your notes and in the screenshot review; recolor with `mesh_setShapeStyle` (`fillColor`/`strokeColor`; animatable by `frame`).
3. Outline thickness: 3–5 px for characters at 1080p, 2–3 for backgrounds, bolder (6+) for hero props.

```mcp mesh_setShapeStyle
{"layerId": 12, "shapeIndex": 0, "fillColor": "#E0A96D", "strokeColor": "#3B2412", "strokeWidth": 4}
```
```mcp draw_polyline
{"layerId": 13, "points": [{"x": -0.06, "y": 0.5}, {"x": -0.02, "y": 0.52}, {"x": 0.04, "y": 0.5}], "smooth": 1, "strokeColor": "#3B2412", "strokeWidth": 5, "name": "brow"}
```
