---
name: moho-gui-reference
description: Map of Moho 14's tools, windows and menus — where each function lives (Draw/Fill/Bone/Layer/Camera/Special tools, Layer Settings tabs, Style window, File/Edit/Draw/Bone/Animation/Scripts/View/Window/Help menus) and how to reach it through GUI automation. Use when an agent must operate Moho's interface (no API) and needs to know the exact tool, tab or menu name.
---

# Moho 14 interface map

Names below come from the Moho 14 Users Manual's table of contents. Use them to plan GUI automation (`moho-advanced-gui-fallback`): screenshot the full window, find the named tool/menu, click, verify. Keyboard shortcuts: MCP resources `moho://shortcuts` and `moho://tools`. "(Pro Only)" items need Moho Pro.

## How to operate the interface reliably
1. `document_screenshot` `{"mode": "full"}` first; locate the toolbar (tools are grouped Draw, Fill, Bone, Layer, Camera, Workspace, Special; the palette is "smart" and shows only tools relevant to the selected layer type and time — at frame 0 some bone/animation tools differ).
2. Click a tool icon; its **tool options bar** at the top shows settings. The **current-tool icon under the File menu** has *Reset Tool* / *Reset All Tools* — run *Reset All Tools* before following any recipe so defaults match.
3. Menus are at the top (File, Edit, Draw, Bone, Animation, Scripts, View, Window, Help). Open a menu by clicking its title, then the item; confirm with a screenshot. Many menu commands have shortcuts — prefer `input_sendKeys` when known.
4. Layer properties: **double-click a layer** in the Layers window → *Layer Settings* tabs (list below).
5. Frame 0 is the setup frame; animation edits need the playhead at frame ≥ 1 (timeline ruler: click a frame number, or `document_setFrame`).
6. Dialogs block automation: close them (OK/Cancel) before the next API call; check with a screenshot.

## Tools (chapters 3–8)
**Ch. 3 The Draw Tools** — Working with Bezier Curves; Creating Boolean Shapes; Select Points; Transform Points; Add Point; Curvature; Freehand; Draw Shape; Delete Edge; Magnet (Pro Only); Blob Brush; Eraser; Point Reduction; Scatter Brush; Perspective Points (Pro Only); Shear Points (Pro Only); Bend Points (Pro Only); Noise (Pro Only)

**Ch. 4 Fill Tools** — Select Shape; Create Shape; Paint Bucket; Delete Shape; Line Width; Hide Edge; Stroke Exposure (Pro Only); Curve Profile (Pro Only); Working with Fills; Color Points

**Ch. 5 Bone Tools** — Select Bone; Add Bone; Transform Bone; Manipulate Bones; Reparent Bone; Bone Strength; Sketch Bones; Offset Bone; Bind Layer; Bind Points; Bone Physics (Pro Only); Smart Bones (Pro Only); Force; Create a Vitruvian Group; Rigging Vitruvian Bones; Animating Vitruvian Bones

**Ch. 6 Layer Tools** — Transform Layer; Set Origin; Follow Path; Rotate Layer XY (Pro Only); Shear Layer (Pro Only); Layer Selector; Insert Text; Creating Word Balloons (Pro Only); Eyedropper

**Ch. 7 Camera and Workspace Tools** — Camera Tools; Workspace Tools

**Ch. 8 Special Tools** — Switch Layer; Particle Layer (Pro Only); Crop; Image Masking; Video Tracking

## Windows and settings (chapters 9–17)
- **Layer Settings tabs** (double-click a layer): General, Shadows, Motion Blur, Masking, Vectors (incl. *Animated shape order*), Depth Sort, Image (*Warp using bones*), Audio, Switch (*audio sync source* for lip-sync), Particles (Pro), 3D Options (Pro), Note (Pro), Physics (Pro), Bones (binding mode: flexible/region).
- **Style window**: Fills, Stroke (colors, line width, effects such as Gradient, Soft Edge), styles list ("Advanced" shows more options).
- **Timeline**: keyframes (right-click for interpolation, *Cycle…*), channels, onion skins, Frame Zero toggle.
- **Actions window** (Window → Actions, Pro): Mainline vs actions, *Insert Reference*, smart-bone actions.
- **Character Wizard** (Window → Character Wizard): `moho-character-wizard`. **Library** window: ready-made content.

## Menus (chapters 18–25)

**Ch. 18 File Menu** — New; New Workspace (Pro Only); New from Template (Pro Only); Open...; Open Recent; Close; Close All; Save; Save As...; Revert; Gather Media; Export as Version 9 File (Pro Only); Export as Version 10 File (Pro Only); Export as Version 11 File (Pro Only); Remove Comments & Tags; Project Settings...; Import; Real-Time Media Connection (Pro Only); Import Notes and Tips; Photoshop Tips; Show in Explorer (Windows only); Show in Finder (Mac only); Refresh Media; Preview; Preview No Antialiasing (Pro Only); Preview Animation (Pro Only); Export Animation...; Export Animation with Previous Settings; Moho Exporter (Pro Only); Export FBX (Pro Only); Export to Video Game (glTF); Export Styles (Pro Only); Export Frame to SVG; Export OBJ (Pro Only); Export POV (Pro Only); Export Soundtrack (Pro Only); Open Custom Content Folder; Quit

**Ch. 19 Edit Menu** — Undo; Redo; Cut, Copy, Paste; Paste Relative; Clear; Copy Layer (Pro Only); Paste Layer (Pro Only); Normalize Layer Scale (Pro Only); Reset Layer Scale Normalization (Pro Only); Select All; Select None; Select Inverse; Select Connected; Edit Keyboard Shortcuts; Preferences...; Using Custom Resource Images

**Ch. 20 Draw Menu** — Insert Text...; Snap to Grid (Pro Only); Reset Line Width (Pro Only); Random Line Width... (Pro Only); Peak; Smooth; Raise Shape; Lower Shape; Raise to Front; Lower to Back; Trace Image...; Create Mesh Layer; Triangulate 2D Mesh; Create Curver Layer; Create Compressible Curver Layer (Pro Only); Hide Selected Points; Show All Points; Hide Shape; Show All Shapes; Freeze Points; Freeze Selected Points; Freeze Visible Points; Reset Points; Reset All Points

**Ch. 21 Bone Menu** — Release Points; Flexi-Bind Points; Release Layer; Flexi-Bind Layer; Release Layer And Points; Link Bones To Layer; Create Smooth Joint for Bone Pair (Pro Only); Use All Bones for Flexi-Binding; Reset All Bone Rigging; Hide Selected Bones; Hide or Show Shy Bones (Pro Only); Hide Controlled Bones; Show All Bones; Track Bone to Video...; Make Smart Bone Dial... (Pro Only); Enable All Vitruvian Bones; Disable All Vitruvian Bones; Freeze Pose; Freeze Selected Bones; Freeze Visible Bones; Reset Bone; Reset All Bones

**Ch. 22 Animation Menu** — Allow Frame Skipping; Enable Bone Dynamics (Pro Only); Reset All Layer Channels; Consolidate Layer Channels; Set Layer Start Time; Align Layer with Camera; Select All Keyframes; Rescale Keyframes...; Copy Current Frame...; Add Keyframe; Auto-Freeze Keyframes; Clear Animation; Un-Mute All Channels; Copy Deep Frame; Copy Deep Frame Range; Paste Deep Frame(s); Track Layer to Video...; Nudge Physics Object... (Pro Only); Mute Audio; Restart Audio Track; Audio Level...; Restart Movie

**Ch. 23 Scripts Menu (Pro Only)** — 3D; Animation; Bone; Camera; Draw; Image; Layer Effects; Particle Effects; Script Writing; Sound; Text; Tiling; Visibility; Warp; Other Popular Scripts...; Scripting Documentation...; Install Script...

**Ch. 24 View Menu** — Reset; Zoom In; Zoom to Layer; Zoom to Selection; Zoom Out; Direction (Pro Only); Enable Grid (Pro Only); Grid Settings... (Pro Only); Disable Grid Snapping (Pro Only); Show 3D Axes (Pro Only); Video Safe Zones (Pro Only); Show Rule Of Thirds; Show Output Only; Show Play & View Controls; Show Timeline Options; Timeline Channels... (Pro Only); Enable Onion Skins (Pro Only); Select Tracing Image... (Pro Only); Show Tracing Image (Pro Only); Show Curves (Pro Only); Auto Hide Curves (Pro Only); Fade Unselected Layers (Pro Only); Active Switch Layer (Pro Only); Design Mode (Pro Only); Return to Mainline (Pro Only); FBX Preview Mode (Pro Only); Stereo (Pro Only); Show Document Tabs

**Ch. 25 Window Menu** — Tools; Layers; Layer Comps; Timeline; Style; Keyframe; Actions (Pro Only); Docking; Audio Recording; Character Wizard; Library; Blend Morphs; Layer Settings; Switch Selection; Toggle Secondary Windows

## Menu commands you will use most
- **File → New / Open / Save / Save As**, **File → Import** (Image, Audio File, Moho Object… for pulling layers from other projects, 3D model, SVG), **File → Export Animation…** (formats and presets), **File → Project Settings…** (size, fps, frame range, background), **File → Preview**.
- **Edit → Undo/Redo, Select All/None/Inverse, Copy/Paste**, **Edit → Preferences** (Custom Content Folder, tablet input).
- **Draw →** boolean shape operations, *Create Curver Layer*, Reset Points; **Bone →** Make Smart Bone Dial, Link Bones to Layer, Freeze/Reset bones; **Animation →** Clear Animation, Add Keyframe, Layer start time.
- **Scripts →** (Pro) Sound (*Bone Audio Wiggle*), Camera, Draw, Warp, Delayed Constraints, Bone Lip Sync; scripting documentation lives under Help.
- **View →** Grid, Show Curves, Timeline options; **Window →** Tools, Layers, Timeline, Style, Actions, Library, Layer Settings, Character Wizard.
