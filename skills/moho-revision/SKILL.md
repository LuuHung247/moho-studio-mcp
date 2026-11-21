---
name: moho-revision
description: Turn the user's feedback into minimal Moho edits and re-verify — "to hơn", "đổi màu", "đi nhanh hơn", "dời sang trái", "hoàn tác". Use whenever the user reviews a result and asks for changes to drawing, rig, timing, camera or export.
---

# Revision loop

## Loop
1. Restate the request as one or more **concrete edits** (what layer, what value). If ambiguous on a creative choice, ask ONE short question with 2–3 options; otherwise decide.
2. Find ids: `document_getLayers` (tree), `layer_getProperties`, `mesh_getShapes` (shape indexes and colors), `layer_getBones`.
3. Apply the smallest edit. Do not rebuild what can be adjusted.
4. `document_screenshot` the affected frame(s); show before/after if useful (take the "before" first).
5. If wrong → `document_undo` and retry. Save (`document_save`). Re-export only when the user approves the look.

## Feedback → action
| User says (Vietnamese) | Edit |
|---|---|
| "to hơn / nhỏ hơn X%" | `layer_setTransform` `scaleX`,`scaleY` on the group/part (current scale × factor; read it with `layer_getProperties`). Whole character: scale the group. |
| "dời sang trái/phải/lên/xuống" | `layer_setTransform` `transX`/`transY` (frame 1; for moving objects shift every key with `anim_layerPath`). |
| "đổi màu áo/tóc/nền…" | `mesh_getShapes` → shape index → `mesh_setShapeStyle` `fillColor`/`strokeColor` |
| "viền dày/mỏng" | `mesh_setShapeStyle` `strokeWidth` |
| "bỏ viền / bỏ màu nền" | `mesh_setShapeStyle` `hasOutline:false` / `hasFill:false` |
| "đi nhanh/chậm hơn" | re-run `anim_walkCycle` with smaller/larger `frames` (e.g. 24→18 faster), recompute `travel`; same `startFrame` overwrites keys |
| "bước chân to/nhỏ, tay vung nhiều/ít" | `intensity` up/down |
| "chạy thay vì đi" | `anim_runCycle` from the same start frame |
| "chớp mắt nhiều/ít" | re-run `anim_blink` with different `interval` (remove old blinks first with `animation_deleteKeyframe` or `document_undo`) |
| "cảnh dài/ngắn hơn" | `project_setProperties` `endFrame`; retime animation recipes to the new range |
| "camera gần/xa hơn" | `anim_cameraMove` with new `zoom` (≥1) |
| "mờ dần / hiện dần" | `anim_fade` |
| "ẩn/hiện nhân vật" | `layer_setVisibility` |
| "ra phía sau/trước" | `layer_placeBehind` |
| "làm lại từ đầu bước vừa rồi" / "hoàn tác" | `document_undo` (repeat per step; `document_redo` to restore) |
| "giống bản trước" | no snapshot API: tell the user; suggest `document_save` with versioned names (`canh1_v2.moho`) before big changes |

## Rules
- Before a risky edit (rebuild rig, replace layers, `project_*`): `document_save` to a versioned file name first.
- Several changes at once → do them in one `batch_execute` when low-level, then one screenshot.
- Keep a changelog in your reply: 1 line per change, plain Vietnamese ("Đã làm áo màu đỏ, đầu to hơn 20%").
- Stay inside the user's request — do not "improve" other things.
- For exported videos: edits require re-export (`moho-film-export`); say so.
