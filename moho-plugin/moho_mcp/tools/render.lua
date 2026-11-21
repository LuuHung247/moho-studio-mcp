-- render.lua
-- Render the scene to image files. Used by the bridge to build PNG sequences
-- that ffmpeg then encodes into video.

local util = require("moho_mcp.util")

local render = {}

local MAX_FRAMES_PER_CALL = 120
local FILE_NUMBER_DIGITS = 5

local function normalizeDir(dir)
    local d = dir:gsub("\\", "/")
    return (d:gsub("/+$", ""))
end

local function restoreFrame(moho, frame)
    pcall(function() moho:SetCurFrame(frame) end)
end

--- Render one frame to filePath (format chosen by Moho from the extension).
function render.frame(moho, params)
    if not moho or not moho.document then
        return nil, "No active document"
    end
    params = params or {}
    if type(params.filePath) ~= "string" or params.filePath == "" then
        return nil, "filePath must be a non-empty string"
    end

    local original = moho.document:CurrentFrame()
    if params.frame ~= nil then
        if type(params.frame) ~= "number" then
            return nil, "frame must be a number"
        end
        local ok, err = pcall(function() moho:SetCurFrame(params.frame) end)
        if not ok then
            return nil, "Failed to set frame: " .. tostring(err)
        end
    end

    local okRender, errRender = pcall(function() moho:FileRender(params.filePath) end)
    local rendered = okRender and util.fileNonEmpty(params.filePath)
    restoreFrame(moho, original)

    if not okRender then
        return nil, "FileRender failed: " .. tostring(errRender)
    end
    if not rendered then
        return nil, "Render finished but no file was written at " .. params.filePath
    end
    return { success = true, filePath = params.filePath, frame = params.frame or original }
end

--- Render a contiguous frame range to numbered files: <dir>/<prefix>NNNNN.png
-- The file number equals the frame number so chunked calls line up.
function render.frames(moho, params)
    if not moho or not moho.document then
        return nil, "No active document"
    end
    params = params or {}
    if type(params.dir) ~= "string" or params.dir == "" then
        return nil, "dir must be a non-empty string"
    end
    if type(params.startFrame) ~= "number" or type(params.endFrame) ~= "number" then
        return nil, "startFrame and endFrame must be numbers"
    end
    if params.endFrame < params.startFrame then
        return nil, "endFrame must be >= startFrame"
    end
    local count = params.endFrame - params.startFrame + 1
    if count > MAX_FRAMES_PER_CALL then
        return nil, "Too many frames in one call: " .. count
            .. " (max " .. MAX_FRAMES_PER_CALL .. "); the bridge chunks automatically"
    end

    local dir = normalizeDir(params.dir)
    local prefix = params.prefix or "frame_"
    local ext = params.extension or "png"
    if not util.ensureDir(dir) then
        return nil, "dir contains characters that are not allowed: " .. dir
    end

    local original = moho.document:CurrentFrame()
    local written = {}
    local failure = nil

    for frame = params.startFrame, params.endFrame do
        local path = string.format("%s/%s%0" .. FILE_NUMBER_DIGITS .. "d.%s",
            dir, prefix, frame, ext)
        local ok, err = pcall(function()
            moho:SetCurFrame(frame)
            moho:FileRender(path)
        end)
        if not ok then
            failure = "Frame " .. frame .. ": " .. tostring(err)
            break
        end
        if not util.fileNonEmpty(path) then
            failure = "Frame " .. frame .. ": no file written at " .. path
            break
        end
        written[#written + 1] = frame
    end

    restoreFrame(moho, original)

    if failure then
        return nil, failure .. " (rendered " .. #written .. " frames before failing)"
    end
    return {
        success    = true,
        dir        = dir,
        prefix     = prefix,
        extension  = ext,
        digits     = FILE_NUMBER_DIGITS,
        startFrame = params.startFrame,
        endFrame   = params.endFrame,
        count      = #written,
    }
end

return render
