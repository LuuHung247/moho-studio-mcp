---
name: moho-technique-reuse-references
description: Reuse techniques in Moho — duplicate vs reference layers (linked copies for crowds/repeating props), importing Moho objects from other projects or the library, Save As scene series, content folder, breaking reference links, referencing external files. Use when the same character, prop or background appears many times or across scenes ("dùng lại nhân vật", "nhiều bản sao", "nhân bản", "cảnh tiếp theo").
---

# Reuse and layer references

Source: Moho 13.5 Tutorials 1.4 (import object) and Chapter 7 (Layer Referencing, Pro).

## Choose the right copy
| Need | Method |
|---|---|
| An independent copy to change separately | **[API]** `layer_duplicate` (copy placed above the original; name it) |
| Many copies that must always stay identical to one master (stars, trees, crowd members, repeating props) | **Reference layers** **[GUI]**: select layer → *Reference Layer* button in the Layers panel (one click per instance). Edits to the original update every reference. Each reference has its own transform, so position them at frame 0 with *Transform Layer* |
| Same character in the NEXT scene | **Save-As series** **[API]**: `document_save`, `project_open` it, `document_save` with the new scene's path, then edit the background/length/animation. Keeps rigs and art identical |
| Bring a character/layer from another project | **[GUI]** File → Import → *Moho Object…*, choose the .moho, pick the layer in the Insert Object dialog (copies it in). Then `document_getLayers` to find its new layerId |
| Library assets (props, particle effects) | **[GUI]** File → Import → Moho Object from the content library; set the custom content folder with Help → Set Custom Content Folder |
| Image/vector/audio files | **[API]** `project_import` |

## Reference-layer techniques (Pro)
- **Crowds / repeated props**: one master + N references; vary position, scale, and flip (`layer_setTransform` `scaleX: -1`). Vary timing by offsetting actions per reference.
- **Break the connection**: *Break reference* on a copy to make it independent (when this one must differ); *Update original* connections re-link. Use sparingly to avoid confusion.
- **Referencing for masking**: a reference of a shape can serve as a mask in another group (Tutorial 7.4).
- **External file references**: a layer can reference a layer inside another .moho file (Tutorial 7.5), so a shared character file updates in all scenes. Powerful but fragile if files move — keep one project folder and relative layout.
- Referenced bones/animation: the reference layer follows the original's animation; give each instance its own start offset via actions rather than editing the master.

## Project organization (do this for films)
```
D:\Phim\<ten_phim>\
  assets\      (images, audio, sfx)
  rigs\        (character .moho masters)
  scenes\      canh01.moho, canh02.moho, …
  render\      canh01.mp4, …
  phim.mp4
```
- Name scenes with zero-padded numbers; version before risky edits (`canh01_v2.moho`).
- Characters: build and rig ONE master file; start every scene from a copy of it (Save-As series) so rigs match.
- Keep ASCII paths where possible (Lua file APIs on Windows).

```mcp layer_duplicate
{"layerId": 10, "name": "Cay_2"}
```
```mcp layer_setTransform
{"layerId": 15, "frame": 1, "transX": 0.9, "transY": -0.1, "scaleX": -0.8, "scaleY": 0.8}
```
