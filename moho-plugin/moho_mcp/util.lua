-- util.lua
-- Shared helpers for MohoMCP tool handlers (used by draw, render, project,
-- scene and diagnostics). Older handlers keep their private copies.

local util = {}

--- Look up a layer by absolute ID.
-- @return userdata|nil, string|nil
function util.getLayerById(moho, layerId)
    if not moho or not moho.document then
        return nil, "No active document"
    end
    if type(layerId) ~= "number" then
        return nil, "layerId must be a number"
    end
    local ok, lyr = pcall(function()
        return moho.document:LayerByAbsoluteID(layerId)
    end)
    if not ok or not lyr then
        return nil, "Layer not found with absolute ID " .. tostring(layerId)
    end
    return lyr
end

--- Resolve a vector layer's mesh.
-- @return mesh|nil, layer|nil, string|nil
function util.getMesh(moho, layerId)
    local lyr, err = util.getLayerById(moho, layerId)
    if not lyr then
        return nil, nil, err
    end
    local okVec, isVector = pcall(function() return lyr:IsVectorType() end)
    if not okVec or not isVector then
        return nil, nil, "Layer " .. tostring(layerId) .. " is not a vector layer"
    end
    local okCast, vec = pcall(function() return moho:LayerAsVector(lyr) end)
    if not okCast or not vec then
        return nil, nil, "Failed to cast layer to vector layer"
    end
    local okMesh, meshObj = pcall(function() return vec:Mesh() end)
    if not okMesh or not meshObj then
        return nil, nil, "Failed to access mesh of layer " .. tostring(layerId)
    end
    return meshObj, lyr
end

--- Parse "#RRGGBB" or "#RRGGBBAA" into 0..1 components.
-- @return r, g, b, a  (nil when the string is malformed)
function util.parseHex(hex)
    if type(hex) ~= "string" then
        return nil
    end
    local h = hex:gsub("^#", "")
    if not (#h == 6 or #h == 8) or h:find("[^%x]") then
        return nil
    end
    local r = tonumber(h:sub(1, 2), 16) / 255
    local g = tonumber(h:sub(3, 4), 16) / 255
    local b = tonumber(h:sub(5, 6), 16) / 255
    local a = #h == 8 and tonumber(h:sub(7, 8), 16) / 255 or 1
    return r, g, b, a
end

--- Build an LM.ColorVector from a hex string.
-- @return ColorVector|nil, string|nil
function util.makeColor(hex)
    local r, g, b, a = util.parseHex(hex)
    if not r then
        return nil, "Invalid color '" .. tostring(hex) .. "' (expected #RRGGBB or #RRGGBBAA)"
    end
    local col = LM.ColorVector:new_local()
    col:Set(r, g, b, a)
    return col
end

--- Apply fill/stroke style options to a shape.
-- Every option is optional; failures of individual channels are collected
-- and returned instead of aborting, because Moho builds differ in what the
-- style object exposes.
-- @return table  list of warning strings
function util.applyShapeStyle(shape, opts, frame)
    local warnings = {}
    frame = frame or 0

    local function warn(what, err)
        warnings[#warnings + 1] = what .. ": " .. tostring(err)
    end

    if opts.name ~= nil then
        local ok, err = pcall(function() shape:SetName(tostring(opts.name)) end)
        if not ok then warn("name", err) end
    end

    if opts.fillColor ~= nil then
        local col, cerr = util.makeColor(opts.fillColor)
        if not col then
            warn("fillColor", cerr)
        else
            local ok, err = pcall(function()
                shape.fHasFill = true
                shape.fMyStyle.fFillCol:SetValue(frame, col)
            end)
            if not ok then warn("fillColor", err) end
        end
    end

    if opts.strokeColor ~= nil then
        local col, cerr = util.makeColor(opts.strokeColor)
        if not col then
            warn("strokeColor", cerr)
        else
            local ok, err = pcall(function()
                shape.fHasOutline = true
                shape.fMyStyle.fLineCol:SetValue(frame, col)
            end)
            if not ok then warn("strokeColor", err) end
        end
    end

    if opts.strokeWidth ~= nil then
        local ok, err = pcall(function() shape.fMyStyle.fLineWidth = opts.strokeWidth end)
        if not ok then warn("strokeWidth", err) end
    end

    return warnings
end

--- Make a directory (and parents) without flashing a console window.
-- Characters that could break out of the quoted path in the shell command
-- (cmd.exe and POSIX sh) or expand variables.
local SHELL_UNSAFE = '[%c"%%&|<>^`$;!]'

function util.ensureDir(dir)
    if type(dir) ~= "string" or dir == "" or dir:find(SHELL_UNSAFE) then
        return false
    end
    local sep = package.config:sub(1, 1)
    local cmd
    if sep == "\\" then
        cmd = 'cmd /c mkdir "' .. dir .. '" 2>NUL'
    else
        cmd = 'mkdir -p "' .. dir .. '" 2>/dev/null'
    end
    -- io.popen can be unavailable in restricted Lua builds; directory creation
    -- is best-effort and callers verify the files they write anyway.
    local ok, p = pcall(io.popen, cmd)
    if ok and p then p:close() end
    return true
end

--- True if a file exists and is non-empty.
function util.fileNonEmpty(path)
    local f = io.open(path, "rb")
    if not f then
        return false
    end
    local size = f:seek("end")
    f:close()
    return size ~= nil and size > 0
end

--- Count top-level layers plus all descendants (used to detect imports).
function util.countAllLayers(moho)
    local total = 0
    local function walk(group)
        local n = 0
        pcall(function() n = group:CountLayers() end)
        for i = 0, n - 1 do
            total = total + 1
            local ok, child = pcall(function() return group:Layer(i) end)
            if ok and child then
                local isGroup = false
                pcall(function() isGroup = child:IsGroupType() end)
                if isGroup then
                    local gok, g = pcall(function() return moho:LayerAsGroup(child) end)
                    if gok and g then walk(g) end
                end
            end
        end
    end
    pcall(function() walk(moho.document) end)
    return total
end

return util
