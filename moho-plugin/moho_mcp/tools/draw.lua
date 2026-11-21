-- draw.lua
-- High-level vector drawing: one call creates a complete, styled shape.
-- Builds on the same Moho mesh API the low-level mesh tools use
-- (AddLonePoint / AppendPoint / WeldPoints / CreateShape) but removes the
-- 10+ round-trips an AI would otherwise need to draw a single ellipse.

local util = require("moho_mcp.util")

local draw = {}

local MIN_ELLIPSE_SEGMENTS = 4
local MAX_ELLIPSE_SEGMENTS = 64
local DEFAULT_ELLIPSE_SEGMENTS = 8
local MAX_PATH_POINTS = 500

local function isNumber(v)
    return type(v) == "number" and v == v and v ~= math.huge and v ~= -math.huge
end

--- Validate a list of {x, y} tables.
local function validatePoints(points, minCount)
    if type(points) ~= "table" or #points < minCount then
        return "points must be an array of at least " .. minCount .. " {x, y} objects"
    end
    if #points > MAX_PATH_POINTS then
        return "Too many points (max " .. MAX_PATH_POINTS .. ")"
    end
    for i, pt in ipairs(points) do
        if type(pt) ~= "table" or not isNumber(pt.x) or not isNumber(pt.y) then
            return "points[" .. i .. "] must be an object with numeric x and y"
        end
    end
    return nil
end

local function newVec(x, y)
    local v = LM.Vector2:new_local()
    v.x = x
    v.y = y
    return v
end

--- Core routine shared by every draw.* method.
-- @param spec table  { points, closed, filled, curvature }
local function buildShape(moho, params, spec)
    if not params or params.layerId == nil then
        return nil, "Missing required parameter: layerId"
    end

    local meshObj, lyr, err = util.getMesh(moho, params.layerId)
    if not meshObj then
        return nil, err
    end

    local frame = params.frame or 0
    if not isNumber(frame) then
        return nil, "frame must be a number"
    end

    moho.document:PrepUndo(lyr)
    pcall(function() moho:SetSelLayer(lyr) end)

    local before = meshObj:CountPoints()
    local pts = spec.points
    local n = #pts

    local addOk, addErr = pcall(function()
        for i, pt in ipairs(pts) do
            if i == 1 then
                meshObj:AddLonePoint(newVec(pt.x, pt.y), frame)
            else
                meshObj:AppendPoint(newVec(pt.x, pt.y), frame)
            end
        end
        if spec.closed then
            -- Close the loop: append a duplicate of the first point, then weld
            -- it back onto the first point.
            meshObj:AppendPoint(newVec(pts[1].x, pts[1].y), frame)
            meshObj:WeldPoints(before + n, before, frame)
        end
    end)
    if not addOk then
        return nil, "Failed to build points: " .. tostring(addErr)
    end

    local after = meshObj:CountPoints()
    if after - before ~= n then
        return nil, "Unexpected point count after drawing (expected "
            .. n .. " new points, got " .. (after - before) .. ")"
    end

    local indices = {}
    for i = 0, n - 1 do
        indices[#indices + 1] = before + i
    end

    -- Curvature: ellipses want smooth points, rectangles want corners.
    if spec.curvature ~= nil then
        for _, idx in ipairs(indices) do
            pcall(function()
                meshObj:Point(idx):SetCurvature(spec.curvature, frame)
            end)
        end
    end

    -- Select exactly the new points so CreateShape sees them.
    pcall(function() meshObj:SelectNone() end)
    for _, idx in ipairs(indices) do
        pcall(function() meshObj:Point(idx).fSelected = true end)
    end

    local shapesBefore = meshObj:CountShapes()
    local wantsStroke = params.strokeColor ~= nil or params.strokeWidth ~= nil
    local filled = spec.filled
    local skipFill = not filled
    local skipLine = (not wantsStroke) and filled

    local createOk, createErr = pcall(function()
        moho:CreateShape(filled, false, frame, true, false, skipFill, skipLine)
    end)
    if not createOk then
        return nil, "CreateShape failed: " .. tostring(createErr)
    end

    local shapesAfter = meshObj:CountShapes()
    if shapesAfter <= shapesBefore then
        return nil, "Points were added but Moho created no shape (points: "
            .. indices[1] .. ".." .. indices[#indices] .. ")"
    end

    local shapeIndex = shapesAfter - 1
    local warnings = {}
    local okShape, shape = pcall(function() return meshObj:Shape(shapeIndex) end)
    if okShape and shape then
        warnings = util.applyShapeStyle(shape, params, frame)
    end

    moho.document:SetDirty()

    return {
        success      = true,
        layerId      = params.layerId,
        shapeIndex   = shapeIndex,
        pointIndices = indices,
        warnings     = warnings,
    }
end

--- Ellipse / circle.
function draw.ellipse(moho, params)
    params = params or {}
    if not isNumber(params.cx) or not isNumber(params.cy) then
        return nil, "cx and cy must be numbers"
    end
    local rx = params.rx
    local ry = params.ry or params.rx
    if not isNumber(rx) or not isNumber(ry) or rx <= 0 or ry <= 0 then
        return nil, "rx (and optional ry) must be positive numbers"
    end

    local segments = params.segments or DEFAULT_ELLIPSE_SEGMENTS
    if not isNumber(segments) or segments < MIN_ELLIPSE_SEGMENTS
        or segments > MAX_ELLIPSE_SEGMENTS then
        return nil, "segments must be between " .. MIN_ELLIPSE_SEGMENTS
            .. " and " .. MAX_ELLIPSE_SEGMENTS
    end
    segments = math.floor(segments)

    local rotation = params.rotation or 0
    local cosR, sinR = math.cos(rotation), math.sin(rotation)
    local pts = {}
    for i = 0, segments - 1 do
        local t = (i / segments) * 2 * math.pi
        local lx, ly = rx * math.cos(t), ry * math.sin(t)
        pts[#pts + 1] = {
            x = params.cx + lx * cosR - ly * sinR,
            y = params.cy + lx * sinR + ly * cosR,
        }
    end

    return buildShape(moho, params, {
        points = pts, closed = true, filled = params.filled ~= false,
        curvature = params.curvature or 1.0,
    })
end

--- Axis-aligned rectangle given its bottom-left corner and size.
function draw.rect(moho, params)
    params = params or {}
    if not isNumber(params.x) or not isNumber(params.y) then
        return nil, "x and y must be numbers"
    end
    if not isNumber(params.width) or not isNumber(params.height)
        or params.width <= 0 or params.height <= 0 then
        return nil, "width and height must be positive numbers"
    end

    local x, y, w, h = params.x, params.y, params.width, params.height
    return buildShape(moho, params, {
        points = {
            { x = x,     y = y },
            { x = x + w, y = y },
            { x = x + w, y = y + h },
            { x = x,     y = y + h },
        },
        closed = true, filled = params.filled ~= false,
        curvature = params.curvature or 0,
    })
end

--- Closed polygon / blob. smooth > 0 rounds the corners.
function draw.polygon(moho, params)
    params = params or {}
    local perr = validatePoints(params.points, 3)
    if perr then
        return nil, perr
    end
    return buildShape(moho, params, {
        points = params.points, closed = true, filled = params.filled ~= false,
        curvature = params.smooth or 0,
    })
end

--- Open stroke (hair, mouth line, eyebrow, ground line...).
function draw.polyline(moho, params)
    params = params or {}
    local perr = validatePoints(params.points, 2)
    if perr then
        return nil, perr
    end
    if params.strokeColor == nil then
        return nil, "strokeColor is required for an open line"
    end
    return buildShape(moho, params, {
        points = params.points, closed = false, filled = false,
        curvature = params.smooth or 0,
    })
end

return draw
