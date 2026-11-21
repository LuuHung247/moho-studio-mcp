---
name: moho-technique-lipsync
description: Lip-sync and talking techniques in Moho — automatic amplitude lip-sync (anim_lipSyncFromAudio, equals Moho's "audio sync source"), phoneme lip-sync from Papagayo data, manual cues, switch-layer mouth setup, audio import, Bone Audio Wiggle for photo heads. Use for "cho nhân vật nói", "khớp môi", "lip sync", dialogue scenes.
---

# Lip-sync techniques

Source: Moho 13.5 Tutorials 4.4, 5.1, 5.2. A **switch layer** holds several sub-layers but shows only one at a time — each sub-layer is a mouth shape.

## 0. Prepare the mouth (once per character)
1. **[API]** `layer_createLayer` type `switch` named "Mouth" (inside the head/bone layer), then a vector child per shape (`parentId` = switch layer) and draw each with `draw_*`.
2. Bind the whole switch layer to the head bone: `layer_setParentBone` (or `rig_attachLayers` mode `parent`). A mouth must follow the head.
3. **Order the children for amplitude sync: bottom = closed … top = wide open.** Create them in that order (later = above). Number/names are free (3–6 shapes is plenty): e.g. `closed`, `small`, `medium`, `wide`.
4. For phoneme sync name children after phonemes (Papagayo default set): `rest, AI, E, O, U, etc, FV, L, MBP, WQ`.

## 1. Automatic (amplitude) lip-sync — fastest
Quiet audio → closed mouth, loud → widest. Works best on clean speech without music/noise.
```mcp anim_lipSyncFromAudio
{"switchLayerId": 40, "audioPath": "D:\\Phim\\thoai1.wav", "mouths": ["closed", "small", "medium", "wide"], "startFrame": 1}
```
- The tool decodes the file with ffmpeg, measures loudness per frame, and writes `switch` keys only where the mouth changes. `sensitivity` (0.3–3) makes the mouth open more/less easily; `minHoldFrames` removes flicker.
- Also import the audio into the scene for playback/export: `project_import` (audio) — or pass `audioPath` to `render_exportVideo`.
- Afterwards screenshot 3–4 frames of loud/quiet speech and adjust `sensitivity`. Add head nods (`anim_oscillate` on the head bone) and blinks (`anim_blink`) so the face is alive.
- **[GUI]** equivalent inside Moho: double-click the switch layer → *Switch* tab → *Select audio sync source* → pick the .wav. (Audio file must be selected there; Moho then writes the keys.)

## 2. Phoneme lip-sync (accurate)
1. Write the dialogue in Papagayo (free, Lost Marble) → export a switch data file `.dat` (needs the phoneme-named children above).
2. **[GUI]** Switch tab → *Select audio sync source* → choose the `.dat` file; import the matching audio (File → Import → Audio File, the lower section of the menu).
3. No Papagayo? Build cues yourself from the script and timing and use the manual tool below.

## 3. Manual cues
```mcp anim_lipSync
{"switchLayerId": 40, "cues": [{"frame": 1, "mouth": "rest"}, {"frame": 8, "mouth": "AI"}, {"frame": 13, "mouth": "O"}, {"frame": 20, "mouth": "MBP"}, {"frame": 26, "mouth": "rest"}]}
```
Rules: every phrase starts and ends with the closed/rest shape; M, B, P always close the lips; hold each vowel 2–4 frames at 24 fps; skip tiny consonants; frame = round(seconds × fps). Voice-activity timing without Papagayo: `ffmpeg -i voice.wav -af silencedetect=noise=-35dB:d=0.12 -f null -` in a shell.

## 4. Talking head from a photo (Pro)
Image layer inside a bone layer; bones around the mouth, extra anchor bones around the border to hold the rest still; one control bone drives the others via constraints. Scripts → Sound → **Bone Audio Wiggle** (select the bone, choose the audio, Max angle ~180, Frame step 2) keys the bone angle from volume. **[GUI]** only.

## Quality checklist
- [ ] Mouth follows the head bone. [ ] Closed shape at silence. [ ] Audio plays in sync (same start frame as the cues). [ ] Spot-check screenshots at loud syllables. [ ] Sound exported (`render_exportVideo` `audioPath`).
