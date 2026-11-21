---
name: moho-advanced-gui-fallback
description: Low-level Moho control when high-level tools are not enough — batch_execute, mesh_addPoint/mesh_createShape, bezier handles, curvature, bone binding, actions, and driving the Moho GUI with document_screenshot + input_mouseClick/input_mouseDrag/input_sendKeys. Use for unsupported features, custom shapes, Papagayo lip-sync, filters, or when draw_/rig_/anim_ tools fail.
---

# Advanced tools and GUI fallback

## Low-level via `batch_execute`
One round-trip for up to 200 operations; method names use DOT notation and the same parameters as the tools:
```mcp batch_execute
{"operations": [
  {"method": "layer.createLayer", "params": {"type": "vector", "name": "leaf"}},
  {"method": "layer.setOpacity", "params": {"layerId": 80, "frame": 1, "opacity": 0.8}}
], "stopOnError": true}
```
Not allowed in a batch: `document.screenshot`, `render.frames`, `project.new/open`, `system.selfTest`, `batch.execute`. A batch cannot use the result of an earlier operation (ids): create layers first, read ids, then batch the rest.

## Custom shapes the `draw_*` tools cannot make
1. `mesh_addPoint` — first call on an empty mesh starts a curve (`x`,`y`); later calls append; `connectToPointId` attaches to an existing point; `startNewCurve: true` starts a separate curve.
2. `mesh_setPointCurvature` (0 sharp … 1 smooth) for soft shapes; `mesh_getCurves` then `mesh_setBezierHandle` for exact curves.
3. `mesh_createShape` with the point indices (a closed loop for a fill); style with `fillColor`/`strokeColor`. Restyle later with `mesh_setShapeStyle`.
4. Inspect with `mesh_getPoints` / `mesh_getShapes`.
Soft deformation: `mesh_bindPoints` (`boneId` −1 unbind, −2 flexi-bind to all bones).

## Actions, smart bones, switch layers
`layer_listActions`, `layer_activateAction` (empty `actionName` returns to the main timeline — ALWAYS return), `bone_createSmartAction`. Switch layers: `switch_setActive` / `switch_getActive`.

## GUI automation (last resort)
Use it for anything the API lacks: Moho's *Switch → Lip Sync (Papagayo)* import, filters, preferences, tools with no scripting. Loop:
1. `document_screenshot` `{"mode": "full"}` → look at the real Moho window (timeline, menus, tool palette).
2. Act: 
```mcp input_mouseClick
{"x": 640, "y": 52, "button": "left", "clickType": "single"}
```
```mcp input_sendKeys
{"keys": "ctrl+shift+z"}
```
`input_mouseDrag` `{startX,startY,endX,endY,steps}` for sliders, timeline scrubbing, drawing.
3. Screenshot again and verify the effect. Repeat in small steps. Coordinates are relative to the Moho window's top-left (not the screen); recompute after any window move or resize.
4. Shortcuts reference: MCP resources `moho://shortcuts` and `moho://tools`.

Cautions: input goes to the foreground Moho window — don't act while the user is typing elsewhere; never click *Delete*, *Quit*, or overwrite dialogs without confirming with the user; `document_save` before long GUI sequences; Windows and macOS only.

## When to stop and tell the user
Say plainly (Vietnamese) when a feature cannot be automated reliably, what the manual steps are, and offer to continue after they do it. Do not fake results.
