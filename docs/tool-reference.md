# Tool reference

Generated from the code — 87 tools. Do not edit by hand (`npm run docs`).

## System & project

### `system_ping`

Check that Moho is reachable. Returns the Moho version, plugin version and whether a document is open. Call this first in every session.

### `system_selfTest`

Run an end-to-end self test inside Moho (creates a temporary vector layer and bone layer, draws shapes, keyframes a bone, renders a frame, then deletes everything). Returns pass/fail per step. Run it once per Moho install before a long production job: it tells you exactly which API paths work on this Moho build. A document must be open.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `cleanup` | boolean |  | Delete the temporary layers afterwards (default true) |

### `document_getInfo`

Get information about the open document: name, path, size, FPS, start/end frame, duration, layer counts.

### `document_getLayers`

Get the full layer tree (hierarchy) of the open document.

### `document_setFrame`

Move the timeline playhead to a frame.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `frame` | number | yes | Frame number |

### `document_save`

Save the document. Pass filePath to Save As; omit it to save in place.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `filePath` | string |  | Absolute path for Save As (.moho) |

### `document_undo`

Undo the most recent change. Returns success=false when there is nothing to undo.

### `document_redo`

Redo the most recently undone change.

### `document_setCamera`

Animate the document camera at a frame: 3D position (posX/posY/posZ), tilt/pan/roll in radians, and zoom (1 = default, >1 zooms in). Only supplied components are written.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `frame` | number | yes | Frame number |
| `posX` | number |  | Camera X position |
| `posY` | number |  | Camera Y position |
| `posZ` | number |  | Camera Z position (dolly) |
| `tilt` | number |  | Tilt around X (radians) |
| `pan` | number |  | Pan around Y (radians) |
| `roll` | number |  | Roll around Z (radians) |
| `zoom` | number |  | Zoom; 1.0 = default field of view |

### `render_frame`

Render one frame of the document to an image file (png recommended). Unlike document_screenshot it writes to the path you choose, e.g. for thumbnails or storyboards.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `filePath` | string | yes | Absolute output path, e.g. D:\Phim\thumb.png |
| `frame` | number |  | Frame to render (default: current) |

### `project_new`

Create a new empty document and optionally configure it. WARNING: replaces the active document — save first. Typical film settings: 1920x1080 at 24 fps.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `width` | number |  | Pixel width |
| `height` | number |  | Pixel height |
| `fps` | number |  | Frames per second |
| `startFrame` | number |  |  |
| `endFrame` | number |  | Last frame (length = endFrame - startFrame + 1) |
| `backgroundColor` | string |  |  |

### `project_open`

Open an existing .moho project. WARNING: replaces the active document.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `filePath` | string | yes | Absolute path to the .moho file |

### `project_setProperties`

Change settings of the open document: size, FPS, start/end frame, background color. Only supplied fields change.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `width` | number |  |  |
| `height` | number |  |  |
| `fps` | number |  |  |
| `startFrame` | number |  |  |
| `endFrame` | number |  |  |
| `backgroundColor` | string |  |  |

### `project_import`

Import a file as a new layer: image (PNG/JPG/PSD), vector (SVG, EPS/AI), audio (WAV/MP3) or video. Set asImageSequence=true to import a numbered image sequence. Returns the new layer's id when Moho exposes it.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `filePath` | string | yes | Absolute path of the file to import |
| `asImageSequence` | boolean |  | Treat the path as the first image of a sequence (or a folder) |
| `mode` | number |  | Advanced: Moho FileImport mode (default 0) |

### `document_screenshot`

See your work. mode "scene" (default) renders the clean frame; "full" captures the whole Moho window (timeline, layers panel, bones). Take a screenshot after every significant change and compare it with what the user asked for.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `mode` | enum |  |  |
| `frame` | number |  | Frame to render (default: current) |
| `width` | number |  | Scene mode only |
| `height` | number |  | Scene mode only |

### `render_exportVideo`

Render the open document to a video file (.mp4, .mov, .webm or .gif). Renders every frame through Moho into a temporary PNG sequence, then encodes with ffmpeg (optionally muxing an audio track). Long scenes take minutes and Moho's UI is busy meanwhile. Frames default to the document's start..end range.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `outputPath` | string | yes | Absolute path of the video to write |
| `startFrame` | number |  |  |
| `endFrame` | number |  |  |
| `fps` | number |  | Default: the document's FPS |
| `audioPath` | string |  | Soundtrack to mux (wav/mp3/aac...) |
| `audioOffset` | number |  | Seconds: >0 skips into the audio, <0 delays it |
| `crf` | number |  | Quality: lower = better (default 18) |
| `keepFrames` | boolean |  | Keep the PNG sequence (frames engine only, default false) |
| `engine` | enum |  | "moho" = Moho's own command-line renderer (headless, includes the project's audio layers; needs the document saved), "frames" = render PNGs through the plugin then ffmpeg, "auto" = try moho, fall back to frames |

### `render_concatVideos`

Join scene videos into one film, in the order given. Fast stream copy by default (all inputs must share codec, size and fps — true for videos from render_exportVideo with the same settings); set reencode=true to normalise mismatched inputs.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `inputs` | array | yes | Absolute paths, in playback order |
| `outputPath` | string | yes |  |
| `reencode` | boolean |  |  |

### `render_addAudio`

Add or replace the soundtrack of an existing video (video stream is copied, audio encoded as AAC).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `videoPath` | string | yes |  |
| `audioPath` | string | yes |  |
| `outputPath` | string | yes |  |

### `render_checkEnvironment`

Verify ffmpeg is installed and reachable before a long export.

## Drawing

### `draw_ellipse`

Draw a filled ellipse/circle (heads, eyes, balls, suns). Coordinates are layer units: the default 16:9 camera shows roughly x -1.78..1.78, y -1..1 (verify with document_screenshot). ry defaults to rx (circle). segments (4-64, default 8) controls smoothness.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the VECTOR layer to draw into |
| `cx` | number | yes |  |
| `cy` | number | yes |  |
| `rx` | number | yes |  |
| `ry` | number |  |  |
| `rotation` | number |  | Radians |
| `segments` | number |  |  |
| `fillColor` | string |  |  |
| `strokeColor` | string |  |  |
| `strokeWidth` | number |  | Stroke width in pixels |
| `name` | string |  | Shape name (helps later restyling) |
| `frame` | number |  | Frame to create at (default 0) |

### `draw_rect`

Draw a rectangle from its bottom-left corner (x, y) with width/height (floors, walls, signs, sky). Coordinates are layer units: the default 16:9 camera shows roughly x -1.78..1.78, y -1..1 (verify with document_screenshot).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the VECTOR layer to draw into |
| `x` | number | yes |  |
| `y` | number | yes |  |
| `width` | number | yes |  |
| `height` | number | yes |  |
| `fillColor` | string |  |  |
| `strokeColor` | string |  |  |
| `strokeWidth` | number |  | Stroke width in pixels |
| `name` | string |  | Shape name (helps later restyling) |
| `frame` | number |  | Frame to create at (default 0) |

### `draw_polygon`

Draw a closed polygon/blob through 3+ points (bodies, hair, hills, clothes). smooth > 0 (try 0.5-1) rounds the corners into organic curves. Coordinates are layer units: the default 16:9 camera shows roughly x -1.78..1.78, y -1..1 (verify with document_screenshot).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the VECTOR layer to draw into |
| `points` | array | yes |  |
| `smooth` | number |  | Corner curvature: 0 = sharp, 1 = fully smooth |
| `filled` | boolean |  |  |
| `fillColor` | string |  |  |
| `strokeColor` | string |  |  |
| `strokeWidth` | number |  | Stroke width in pixels |
| `name` | string |  | Shape name (helps later restyling) |
| `frame` | number |  | Frame to create at (default 0) |

### `draw_polyline`

Draw an open stroke through 2+ points (mouths, eyebrows, whiskers, ground lines). strokeColor is required. Coordinates are layer units: the default 16:9 camera shows roughly x -1.78..1.78, y -1..1 (verify with document_screenshot).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the VECTOR layer to draw into |
| `points` | array | yes |  |
| `smooth` | number |  |  |
| `strokeColor` | string | yes | Stroke color as #RRGGBB or #RRGGBBAA |
| `strokeWidth` | number |  |  |
| `name` | string |  |  |
| `frame` | number |  |  |

## Layers & scene

### `layer_getProperties`

Get a layer's properties: type, visibility, lock state, opacity and transform.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |

### `layer_getChildren`

Get the direct children of a group layer.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the group layer |

### `layer_getBones`

List every bone in a bone layer (id, name, position, angle, length, parentId).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the bone layer |

### `layer_createLayer`

Create a layer. If parentId (a group) is given, the new layer is created inside it. Returns the new layerId — keep it, every other tool addresses layers by this id.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `type` | enum | yes | Layer type |
| `name` | string |  | Layer name |
| `parentId` | number |  | Absolute ID of a group to create the layer in (default: document root) |

### `layer_deleteLayer`

Delete a layer by absolute ID (undoable inside Moho).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |

### `layer_duplicate`

Duplicate a layer (and its children); the copy is placed above the original. Use it to clone a character for a second scene or to repeat props.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `name` | string |  | Name for the copy |

### `layer_setName`

Rename a layer.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `name` | string | yes |  |

### `layer_selectLayer`

Select a layer in the Moho UI.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |

### `layer_setVisibility`

Show or hide a layer.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `visible` | boolean | yes |  |

### `layer_setOpacity`

Set layer opacity at a frame (0 transparent .. 1 opaque). Animates when set at several frames.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `frame` | number | yes | Frame number |
| `opacity` | number | yes |  |

### `layer_setTransform`

Set a layer's translation / rotation (radians) / scale at a frame. Only supplied values change. Translation and scale are 3D; Z defaults to the existing value.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `frame` | number | yes | Frame number |
| `transX` | number |  |  |
| `transY` | number |  |  |
| `transZ` | number |  |  |
| `rotation` | number |  | Z rotation in radians |
| `scaleX` | number |  |  |
| `scaleY` | number |  |  |
| `scaleZ` | number |  |  |

### `layer_setParentBone`

Make a layer follow a bone (e.g. parent a hand layer to a wrist bone). boneId = -1 clears. This is how art layers get attached to a rig.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `boneId` | number | yes | Bone index in the parent skeleton, or -1 to clear |

### `layer_placeInGroup`

Move a layer into a group. top=true places it at the top of the stack.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `parentGroupId` | number | yes | Absolute ID of the destination group |
| `top` | boolean |  |  |

### `layer_placeBehind`

Reorder: move a layer behind (below) another layer in the same group.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `behindLayerId` | number | yes |  |

### `layer_activateAction`

Switch into editing a named action (e.g. a smart-bone dial). Keyframes set while it is active are stored in that action. Pass "" or omit to return to the main timeline. ALWAYS return to the main timeline afterwards.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `actionName` | string |  |  |

### `layer_listActions`

List a layer's actions, which one is being edited, and which are smart-bone actions.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |

### `layer_setBlur`

Animate a layer's blur amount (depth of field, focus pulls).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `frame` | number | yes | Frame number |
| `amount` | number | yes |  |

### `layer_setShadow`

Animate a layer's drop shadow. All fields optional; enabled toggles it.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `frame` | number | yes | Frame number |
| `enabled` | boolean |  |  |
| `offset` | number |  |  |
| `blur` | number |  |  |
| `angle` | number |  | Direction in radians |
| `color` | string |  |  |

### `layer_setOutline`

Animate a layer's outline. All fields optional; enabled toggles it.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `frame` | number | yes | Frame number |
| `enabled` | boolean |  |  |
| `width` | number |  |  |
| `color` | string |  |  |

### `switch_setActive`

Choose which child of a switch layer is visible from a frame onward. Use switch layers for mouth shapes (lip-sync), eye states (open/closed/blink) and swap-art expressions. Pass childName or childIndex.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the switch layer |
| `frame` | number | yes | Frame number |
| `childName` | string |  |  |
| `childIndex` | number |  |  |

### `switch_getActive`

Read which child of a switch layer is visible at a frame.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `frame` | number |  |  |

### `image_setSource`

Set the file on an image layer (PNG/JPG/PSD, image sequence folder, or movie).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `filePath` | string | yes |  |

### `image_getSource`

Read an image layer's source path, pixel size and movie/PSD/sequence flags.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |

### `particle_setEmitter`

Configure a particle layer (rain, snow, sparks, smoke). All settings optional; FinalizeSettings runs automatically.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `numParticles` | number |  |  |
| `displayNumParticles` | number |  |  |
| `lifetime` | number |  | Particle lifetime in frames |
| `velocity` | number |  |  |
| `velocitySpread` | number |  |  |
| `directionAngle` | number |  | Radians |
| `directionSpread` | number |  | Radians |
| `accelerationAngle` | number |  | Radians, e.g. -PI/2 for gravity |
| `accelerationRate` | number |  |  |
| `damping` | number |  |  |
| `evenlySpaced` | boolean |  |  |
| `orientation` | boolean |  |  |
| `freeFloating` | boolean |  |  |
| `fullSpeedStart` | boolean |  |  |
| `randomStartTime` | boolean |  |  |
| `sourceWidth` | number |  |  |
| `sourceHeight` | number |  |  |
| `sourceDepth` | number |  |  |
| `randomSeed` | number |  |  |

## Rigging

### `bone_getProperties`

Get a bone's position, angle, scale, length and parent.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `boneId` | number | yes |  |

### `bone_addBone`

Add a bone to a bone layer. Rest-pose fields are optional. Returns boneId (= index, assigned in creation order). For whole skeletons prefer rig_buildSkeleton / rig_buildHumanoid.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the bone layer |
| `name` | string |  |  |
| `posX` | number |  |  |
| `posY` | number |  |  |
| `angle` | number |  | Radians |
| `length` | number |  |  |
| `scale` | number |  |  |
| `parentBoneId` | number |  | Parent bone index, -1 = none |

### `bone_deleteBone`

Delete a bone. recursive=true also deletes descendants; otherwise children are re-parented.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `boneId` | number | yes |  |
| `recursive` | boolean |  |  |

### `bone_setRestPose`

Edit a bone's setup (rest) pose: position, angle, length, scale, parent, name. Unlike bone_setTransform this is not animated.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `boneId` | number | yes |  |
| `name` | string |  |  |
| `posX` | number |  |  |
| `posY` | number |  |  |
| `angle` | number |  |  |
| `length` | number |  |  |
| `scale` | number |  |  |
| `parentBoneId` | number |  |  |

### `bone_setTransform`

Pose a bone at a frame (creates keyframes): angle (radians), posX/posY, scale. Only supplied values change. Use animation_setInterpolation for easing.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `boneId` | number | yes |  |
| `frame` | number | yes | Frame number |
| `angle` | number |  |  |
| `posX` | number |  |  |
| `posY` | number |  |  |
| `scale` | number |  |  |

### `bone_selectBone`

Select a bone in the Moho UI.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `boneId` | number | yes |  |

### `bone_createSmartAction`

Create a smart-bone action named after the bone. Then call layer_activateAction with that name, pose bones with bone_setTransform at the dial's frames, and return to the main timeline. See rig_createSmartBone for the whole sequence in one call.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `boneId` | number | yes |  |
| `frame` | number |  |  |

### `rig_buildSkeleton`

Build a whole skeleton in one call from a list of named bones (parents must come before children). Creates the bone layer unless layerId is given. Returns bone name -> bone index, which the other rig_/anim_ tools and bone_setTransform use.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number |  | Existing bone layer; omitted = create a new one |
| `layerName` | string |  |  |
| `parentId` | number |  | Group to create the bone layer in |
| `bones` | array | yes |  |

### `rig_buildHumanoid`

Create a ready-made front-facing humanoid skeleton (hip, spine, neck, head, shoulders, arms, hands, legs, feet) named so anim_walkCycle / anim_wave work immediately. Character's left (_L) is on the screen's right. ALWAYS verify with document_screenshot(mode='full'); if bones are visibly mis-attached, restart Moho's bridge with MOHO_MCP_BONE_ORIGIN=tip.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerName` | string |  |  |
| `parentId` | number |  |  |
| `scale` | number |  | 1 = 1.3 units tall |
| `x` | number |  |  |
| `y` | number |  | World Y of the hip (default -0.05) |

### `rig_attachLayers`

Attach artwork layers to bones. mode "parent" makes the whole layer follow one bone (rigid parts: head, hands, props). "bind" binds every point of a vector layer to one bone. "flexi" flexi-binds the layer to ALL bones (bendy limbs, torso). boneName refers to a bone in the given bone layer.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `boneLayerId` | number | yes |  |
| `attachments` | array | yes |  |

### `rig_createSmartBone`

Create a smart bone (Moho Pro) in one call. A smart bone ties the CONTROL bone's rotation to an action: while the action plays from frame 0 (neutral) to its last frame, the control bone rotates 0 -> controlAngle and the other bones/layers move as recorded. The tool creates the action named after the control bone, records every pose inside it, keys the control bone itself to controlAngle at the last frame, then returns to the main timeline. Use a long enough action (24+ frames) so in-betweens are smooth. Make the last-frame pose the extreme one (e.g. head turned fully).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Bone layer |
| `controlBoneId` | number | yes | The bone that becomes the dial |
| `controlAngle` | number |  | Radians the control bone reaches at the last frame (default PI/2 = 90 degrees) |
| `poses` | array | yes |  |

## Mesh

### `mesh_getPoints`

List the points (vertices) of a vector layer.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the vector layer |

### `mesh_getShapes`

List the shapes (fills/strokes) of a vector layer with their colors.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |

### `mesh_getCurves`

List a vector layer's curves with the mapping from curve-local to mesh-global point indices. Needed before mesh_setBezierHandle.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |

### `mesh_addPoint`

Low-level: add a point at (x, y). With connectToPointId it attaches to that point; with startNewCurve (or an empty mesh) it starts a curve; otherwise it appends. For real artwork prefer draw_ellipse / draw_rect / draw_polygon / draw_polyline.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `x` | number | yes |  |
| `y` | number | yes |  |
| `frame` | number |  |  |
| `connectToPointId` | number |  |  |
| `startNewCurve` | boolean |  |  |

### `mesh_createShape`

Low-level: create a fill/stroke shape from point indices (a closed loop for a filled shape). Colors are hex strings.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `pointIndices` | array | yes |  |
| `filled` | boolean |  |  |
| `frame` | number |  |  |
| `name` | string |  |  |
| `fillColor` | string |  |  |
| `strokeColor` | string |  |  |
| `strokeWidth` | number |  |  |

### `mesh_setPointCurvature`

Smooth (≈1) or sharpen (0) a vertex. Makes shapes look hand-drawn instead of polygonal.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `pointIndex` | number | yes |  |
| `curvature` | number | yes |  |
| `frame` | number |  |  |

### `mesh_setBezierHandle`

Set one bezier control handle on a curve point (curve-local index — see mesh_getCurves). prePoint=true targets the incoming handle.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `curveIndex` | number | yes |  |
| `curvePointIndex` | number | yes |  |
| `x` | number | yes |  |
| `y` | number | yes |  |
| `frame` | number |  |  |
| `prePoint` | boolean |  |  |
| `syncAngles` | boolean |  |  |

### `mesh_bindPoints`

Bind mesh points to a bone so the bone deforms them. boneId: -1 unbind, -2 flexi-bind to all bones, otherwise a bone index. See rig_bindLayerToBone to bind a whole layer.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `pointIndices` | array | yes |  |
| `boneId` | number | yes |  |

### `mesh_setShapeStyle`

Restyle an existing shape: fill/stroke color (animatable via frame), stroke width, name, and hasFill/hasOutline toggles.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `shapeIndex` | number | yes |  |
| `frame` | number |  |  |
| `name` | string |  |  |
| `fillColor` | string |  |  |
| `strokeColor` | string |  |  |
| `strokeWidth` | number |  |  |
| `hasFill` | boolean |  |  |
| `hasOutline` | boolean |  |  |

## Animation

### `animation_getKeyframes`

List keyframes of a channel on a layer.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `channel` | string | yes |  |

### `animation_getFrameState`

Get a layer's full animated state at a frame.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `frame` | number | yes | Frame number |

### `animation_setKeyframe`

Set a keyframe on a channel: a number for scalar channels (rotation, opacity), {x, y} for vec2 channels (translation, scale).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `channel` | string | yes |  |
| `frame` | number | yes | Frame number |
| `value` | union | yes |  |

### `animation_deleteKeyframe`

Delete a keyframe.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `channel` | string | yes |  |
| `frame` | number | yes | Frame number |

### `animation_setInterpolation`

Set easing on an existing keyframe: "linear", "smooth", "ease_in", "ease_out" or "step". Use "step" for blinks/pops and "smooth" for natural motion.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Absolute ID of the layer |
| `channel` | string | yes |  |
| `frame` | number | yes | Frame number |
| `mode` | enum | yes |  |

### `anim_walkCycle`

Animate a walk cycle on a humanoid rig (bones are found by name — rig_buildHumanoid names them correctly). Keys are placed so the cycle loops seamlessly; Moho smooths between them. Character faces +x (right).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Bone layer ID |
| `startFrame` | number |  |  |
| `cycles` | number |  | Number of full cycles (2 steps each) |
| `frames` | number |  | Frames per cycle |
| `travel` | number |  | Hip X travel per cycle (0 = in place) |
| `intensity` | number |  | Multiplier on swing, bounce and lean (default 1) |

### `anim_runCycle`

Animate a run cycle on a humanoid rig (bones are found by name — rig_buildHumanoid names them correctly). Keys are placed so the cycle loops seamlessly; Moho smooths between them. Character faces +x (right).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Bone layer ID |
| `startFrame` | number |  |  |
| `cycles` | number |  | Number of full cycles (2 steps each) |
| `frames` | number |  | Frames per cycle |
| `travel` | number |  | Hip X travel per cycle (0 = in place) |
| `intensity` | number |  | Multiplier on swing, bounce and lean (default 1) |

### `anim_wave`

Raise an arm, wave the forearm, lower it (greeting). Side L = character's left (screen right).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Bone layer ID |
| `startFrame` | number |  |  |
| `side` | enum |  |  |
| `duration` | number |  | Total frames of the gesture |
| `swings` | number |  |  |
| `amplitude` | number |  | Forearm swing in radians |

### `anim_oscillate`

Sine-wave one bone property around its rest value: breathing (spine scale), nodding (head angle), tail wag, floating (posY), swinging pendulum. The loop returns to its start value.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes | Bone layer ID |
| `startFrame` | number |  |  |
| `boneId` | number | yes |  |
| `property` | enum | yes |  |
| `amplitude` | number | yes |  |
| `period` | number | yes | Frames per oscillation |
| `cycles` | number |  |  |
| `phase` | number |  | Radians |

### `anim_blink`

Add natural, irregular blinking over a frame range. Either drive a SWITCH layer (switchLayerId + openChild + closedChild names) or squash eye layers vertically (eyeLayerIds). Pass `at` for exact frames; otherwise blinks are generated deterministically from `seed`.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `startFrame` | number |  |  |
| `endFrame` | number | yes |  |
| `at` | array |  |  |
| `interval` | number |  | Average frames between blinks (default 72) |
| `seed` | number |  |  |
| `closedFor` | number |  | Frames eyes stay closed (default 3) |
| `switchLayerId` | number |  |  |
| `openChild` | string |  |  |
| `closedChild` | string |  |  |
| `eyeLayerIds` | array |  |  |

### `anim_lipSync`

Set mouth shapes over time on a switch layer. cues = [{frame, mouth}] where mouth is the child layer name (e.g. rest, AI, E, O, U, MBP, FV, L, etc.). Derive cue frames from the dialogue timing: frame = seconds * fps.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `switchLayerId` | number | yes |  |
| `cues` | array | yes |  |

### `anim_lipSyncFromAudio`

Automatic lip-sync like Moho's 'audio sync source': analyses the loudness of an audio file and sets a switch layer's mouth shape per frame (quiet = first/closed child, loud = last/wide-open child). Pass the mouth children ordered CLOSED -> OPEN. Works best with clean speech (no music/noise). For phoneme-accurate sync use Papagayo data through the Moho GUI.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `switchLayerId` | number | yes |  |
| `audioPath` | string | yes | Absolute path of the voice file (wav/mp3/…) |
| `mouths` | array | yes | Child layer names ordered from closed to wide open |
| `startFrame` | number |  | Frame where the audio starts |
| `fps` | number |  | Default: the document's FPS |
| `sensitivity` | number |  |  |
| `minHoldFrames` | number |  |  |

### `anim_layerPath`

Move/rotate/scale a layer through keyframes in one call: keys = [{frame, x?, y?, rotation?, scale?}]. For props, whole characters sliding across the scene, bouncing balls, floating clouds.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerId` | number | yes |  |
| `keys` | array | yes |  |

### `anim_fade`

Fade layers in or out (opacity from -> to over a frame range). Use 0 -> 1 to fade in, 1 -> 0 to fade out.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `layerIds` | array | yes |  |
| `from` | number | yes |  |
| `to` | number | yes |  |
| `startFrame` | number | yes |  |
| `endFrame` | number | yes |  |

### `anim_cameraMove`

Camera move between two poses: pan (x/y), push-in / pull-out (zoom), roll. Examples: push-in = zoom 1 -> 1.4; pan right = x 0 -> 1.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `startFrame` | number | yes |  |
| `endFrame` | number | yes |  |
| `from` | object | yes |  |
| `to` | object | yes |  |
| `holdFrames` | number |  |  |

### `anim_cameraShake`

Camera shake for impacts, explosions or handheld feel; returns to the base position at endFrame.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `startFrame` | number | yes |  |
| `endFrame` | number | yes |  |
| `amplitude` | number | yes | Peak offset in layer units (0.02 subtle, 0.1 violent) |
| `interval` | number |  |  |
| `seed` | number |  |  |
| `base` | object |  |  |

## Interaction

### `input_mouseClick`

Click at window-relative (x, y). Use after document_screenshot(mode='full') to operate parts of Moho that have no API.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `x` | number | yes |  |
| `y` | number | yes |  |
| `button` | enum |  |  |
| `clickType` | enum |  |  |

### `input_mouseDrag`

Drag from (startX, startY) to (endX, endY), window-relative.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `startX` | number | yes |  |
| `startY` | number | yes |  |
| `endX` | number | yes |  |
| `endY` | number | yes |  |
| `button` | enum |  |  |
| `steps` | number |  | Intermediate points (default 10) |

### `input_sendKeys`

Send a shortcut to Moho, e.g. "ctrl+z", "ctrl+shift+z", "space", "ctrl+s", "f5".

| Parameter | Type | Required | Description |
|---|---|---|---|
| `keys` | string | yes |  |

### `batch_execute`

Run many Moho operations in ONE round-trip (~300 ms total instead of ~300 ms each). Use it whenever you have 2+ operations. Method names use DOT notation ("bone.setTransform", "draw.ellipse", "layer.createLayer"); params match the tool schemas. Not allowed inside a batch: document.screenshot, render.frames, project.new/open, system.selfTest, batch.execute. Returns per-operation results and a summary; use stopOnError when later operations depend on earlier ones.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `operations` | array | yes |  |
| `stopOnError` | optional |  |  |
