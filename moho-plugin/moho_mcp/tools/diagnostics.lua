-- diagnostics.lua
-- Health checks. selfTest exercises the real handlers against a throw-away
-- layer so a user (or the AI) can learn in one call which Moho API paths work
-- on this exact Moho build, before starting a long production job.

local util = require("moho_mcp.util")

local diagnostics = {}

local PLUGIN_VERSION = "1.0.0"

function diagnostics.ping(moho, _params)
    local info = { success = true, pluginVersion = PLUGIN_VERSION, documentOpen = false }
    pcall(function() info.mohoVersion = tostring(moho:AppVersion()) end)
    if moho and moho.document then
        info.documentOpen = true
        pcall(function() info.documentName = moho.document:Name() end)
        pcall(function() info.currentFrame = moho.document:CurrentFrame() end)
    end
    return info
end

local function call(method, params, moho)
    local server = require("moho_mcp.server")
    local handler = server.getHandler(method)
    if not handler then
        return nil, "handler not registered: " .. method
    end
    local ok, result, err = pcall(handler, moho, params)
    if not ok then
        return nil, "exception: " .. tostring(result)
    end
    if result == nil then
        return nil, err or "unknown error"
    end
    return result
end

function diagnostics.selfTest(moho, params)
    if not moho or not moho.document then
        return nil, "Open or create a document first"
    end
    params = params or {}
    local cleanup = params.cleanup ~= false

    local steps = {}
    local createdLayers = {}
    local function step(name, fn)
        local ok, detail = pcall(fn)
        local passed = ok and detail ~= false
        steps[#steps + 1] = {
            name = name,
            ok = passed,
            detail = (type(detail) == "string") and detail or nil,
        }
        return passed
    end

    local vectorId, boneId

    step("create vector layer", function()
        local r, e = call("layer.createLayer", { type = "vector", name = "__selftest_vector" }, moho)
        if not r then return e end
        vectorId = r.layerId or r.id
        createdLayers[#createdLayers + 1] = vectorId
        return vectorId ~= nil or "no layer id returned"
    end)

    if vectorId then
        step("draw ellipse", function()
            local r, e = call("draw.ellipse",
                { layerId = vectorId, cx = 0, cy = 0, rx = 0.3, fillColor = "#FF8800", strokeColor = "#000000", strokeWidth = 4 }, moho)
            if not r then return e end
            if #r.warnings > 0 then return table.concat(r.warnings, "; ") end
            return true
        end)
        step("draw rect", function()
            local r, e = call("draw.rect",
                { layerId = vectorId, x = 0.5, y = -0.2, width = 0.3, height = 0.2, fillColor = "#3366FF" }, moho)
            return r and true or e
        end)
        step("draw polyline", function()
            local r, e = call("draw.polyline",
                { layerId = vectorId, points = { { x = -0.8, y = -0.5 }, { x = -0.4, y = -0.4 } }, strokeColor = "#222222", strokeWidth = 6 }, moho)
            return r and true or e
        end)
        step("read shapes back", function()
            local r, e = call("mesh.getShapes", { layerId = vectorId }, moho)
            if not r then return e end
            local n = r.shapes and #r.shapes or r.count or 0
            return n >= 3 or ("expected >= 3 shapes, found " .. tostring(n))
        end)
    end

    step("create bone layer", function()
        local r, e = call("layer.createLayer", { type = "bone", name = "__selftest_bones" }, moho)
        if not r then return e end
        boneId = r.layerId or r.id
        createdLayers[#createdLayers + 1] = boneId
        return boneId ~= nil or "no layer id returned"
    end)

    if boneId then
        step("add 2 chained bones", function()
            local a, e1 = call("bone.addBone", { layerId = boneId, name = "root", length = 0.4 }, moho)
            if not a then return e1 end
            local b, e2 = call("bone.addBone", { layerId = boneId, name = "child", length = 0.3, parentBoneId = a.boneId }, moho)
            return b and true or e2
        end)
        step("keyframe a bone", function()
            local r, e = call("bone.setTransform", { layerId = boneId, boneId = 0, frame = 12, angle = 0.5 }, moho)
            return r and true or e
        end)
    end

    step("render one frame", function()
        local sep = package.config:sub(1, 1)
        local tmp = (os.getenv("TEMP") or os.getenv("TMP") or os.getenv("TMPDIR") or "/tmp")
        local dir = tmp .. sep .. "moho-mcp"
        util.ensureDir(dir)
        local path = dir .. "/selftest.png"
        local r, e = call("render.frame", { filePath = path, frame = 0 }, moho)
        pcall(os.remove, path)
        return r and true or e
    end)

    if cleanup then
        for _, id in ipairs(createdLayers) do
            call("layer.deleteLayer", { layerId = id }, moho)
        end
    end

    local failed = 0
    for _, s in ipairs(steps) do
        if not s.ok then failed = failed + 1 end
    end
    return {
        success = failed == 0,
        passed  = #steps - failed,
        failed  = failed,
        steps   = steps,
        cleanedUp = cleanup,
    }
end

return diagnostics
