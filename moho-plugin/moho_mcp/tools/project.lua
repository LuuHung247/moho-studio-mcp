-- project.lua
-- Document lifecycle: create, open, configure and import into projects.

local util = require("moho_mcp.util")

local project = {}

local MIN_DIMENSION = 16
local MAX_DIMENSION = 16384
local MAX_FPS = 240

--- Apply document-level settings. Returns a list of what was applied and a
-- list of warnings (a single failing setter must not abort the others).
local function applySettings(moho, p)
    local doc = moho.document
    local applied, warnings = {}, {}

    local function try(label, fn)
        local ok, err = pcall(fn)
        if ok then
            applied[#applied + 1] = label
        else
            warnings[#warnings + 1] = label .. ": " .. tostring(err)
        end
    end

    if p.width ~= nil or p.height ~= nil then
        local w = p.width or doc:Width()
        local h = p.height or doc:Height()
        try("size", function() doc:SetShape(w, h) end)
    end
    if p.fps ~= nil then
        try("fps", function() doc:SetFps(p.fps) end)
    end
    if p.startFrame ~= nil then
        try("startFrame", function() doc:SetStartFrame(p.startFrame) end)
    end
    if p.endFrame ~= nil then
        try("endFrame", function() doc:SetEndFrame(p.endFrame) end)
    end
    if p.backgroundColor ~= nil then
        local r, g, b = util.parseHex(p.backgroundColor)
        if not r then
            warnings[#warnings + 1] = "backgroundColor: expected #RRGGBB"
        else
            try("backgroundColor", function()
                local c = LM.rgb_color:new_local()
                c.r, c.g, c.b = math.floor(r * 255 + 0.5),
                    math.floor(g * 255 + 0.5), math.floor(b * 255 + 0.5)
                c.a = 255
                doc:SetBackCol(c)
            end)
        end
    end

    pcall(function() doc:SetDirty() end)
    return applied, warnings
end

local function validateSettings(p)
    for _, key in ipairs({ "width", "height" }) do
        local v = p[key]
        if v ~= nil and (type(v) ~= "number" or v < MIN_DIMENSION or v > MAX_DIMENSION) then
            return key .. " must be a number between " .. MIN_DIMENSION .. " and " .. MAX_DIMENSION
        end
    end
    if p.fps ~= nil and (type(p.fps) ~= "number" or p.fps <= 0 or p.fps > MAX_FPS) then
        return "fps must be a number in (0, " .. MAX_FPS .. "]"
    end
    for _, key in ipairs({ "startFrame", "endFrame" }) do
        if p[key] ~= nil and (type(p[key]) ~= "number" or p[key] < 0) then
            return key .. " must be a non-negative number"
        end
    end
    if p.startFrame and p.endFrame and p.endFrame < p.startFrame then
        return "endFrame must be >= startFrame"
    end
    return nil
end

local function describe(moho)
    local doc = moho.document
    local info = {}
    pcall(function() info.name = doc:Name() end)
    pcall(function() info.width = doc:Width() end)
    pcall(function() info.height = doc:Height() end)
    pcall(function() info.fps = doc:Fps() end)
    pcall(function() info.startFrame = doc:StartFrame() end)
    pcall(function() info.endFrame = doc:EndFrame() end)
    return info
end

--- Create a new empty document (optionally configured).
function project.new(moho, params)
    params = params or {}
    local verr = validateSettings(params)
    if verr then
        return nil, verr
    end
    local ok, err = pcall(function() moho:FileNew() end)
    if not ok then
        return nil, "FileNew failed: " .. tostring(err)
    end
    if not moho.document then
        return nil, "FileNew did not produce an active document"
    end
    local applied, warnings = applySettings(moho, params)
    return { success = true, applied = applied, warnings = warnings, document = describe(moho) }
end

--- Open an existing .moho file.
function project.open(moho, params)
    if not params or type(params.filePath) ~= "string" or params.filePath == "" then
        return nil, "filePath must be a non-empty string"
    end
    local ok, err = pcall(function() moho:FileOpen(params.filePath) end)
    if not ok then
        return nil, "FileOpen failed: " .. tostring(err)
    end
    return { success = true, document = moho.document and describe(moho) or nil }
end

--- Change settings of the open document.
function project.setProperties(moho, params)
    if not moho or not moho.document then
        return nil, "No active document"
    end
    params = params or {}
    local verr = validateSettings(params)
    if verr then
        return nil, verr
    end
    local applied, warnings = applySettings(moho, params)
    return { success = true, applied = applied, warnings = warnings, document = describe(moho) }
end

--- Import an image / vector / audio / video file as a new layer.
function project.import(moho, params)
    if not moho or not moho.document then
        return nil, "No active document"
    end
    if not params or type(params.filePath) ~= "string" or params.filePath == "" then
        return nil, "filePath must be a non-empty string"
    end

    local before = util.countAllLayers(moho)
    local lower = params.filePath:lower()

    local ok, err
    if params.asImageSequence == true then
        ok, err = pcall(function() moho:FileImportImageSequence(params.filePath) end)
    elseif lower:match("%.eps$") or lower:match("%.ai$") then
        ok, err = pcall(function() moho:ImportEPS(params.filePath) end)
    else
        ok, err = pcall(function() moho:FileImport(params.filePath, params.mode or 0) end)
        if not ok then
            -- Some builds only accept the one-argument form.
            ok, err = pcall(function() moho:FileImport(params.filePath) end)
        end
    end
    if not ok then
        return nil, "Import failed: " .. tostring(err)
    end

    local after = util.countAllLayers(moho)
    local layerId = nil
    pcall(function()
        layerId = moho.document:LayerAbsoluteID(moho.layer)
    end)

    if after <= before then
        return nil, "Import call succeeded but no new layer appeared (unsupported file type or cancelled dialog?)"
    end
    return { success = true, newLayers = after - before, layerId = layerId }
end

return project
