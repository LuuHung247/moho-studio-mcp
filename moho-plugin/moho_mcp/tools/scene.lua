-- scene.lua
-- Scene composition helpers.

local util = require("moho_mcp.util")

local scene = {}

--- Duplicate a layer (the copy is placed above the original).
function scene.duplicate(moho, params)
    if not params or params.layerId == nil then
        return nil, "Missing required parameter: layerId"
    end
    local lyr, err = util.getLayerById(moho, params.layerId)
    if not lyr then
        return nil, err
    end

    moho.document:PrepUndo(lyr)
    local ok, copy = pcall(function() return moho.document:DuplicateLayer(lyr) end)
    if not ok or not copy then
        return nil, "DuplicateLayer failed: " .. tostring(copy)
    end

    local newId = nil
    pcall(function() newId = moho.document:LayerAbsoluteID(copy) end)
    if params.name ~= nil then
        pcall(function() copy:SetName(tostring(params.name)) end)
    end

    moho.document:SetDirty()
    return { success = true, sourceLayerId = params.layerId, layerId = newId }
end

return scene
