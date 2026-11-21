-- test_highlevel.lua
-- Tests for draw / render / project / scene handlers using the mock Moho.

local mockMoho = require("tests.mock_moho")
local draw = require("moho_mcp.tools.draw")
local render = require("moho_mcp.tools.render")
local project = require("moho_mcp.tools.project")
local scene = require("moho_mcp.tools.scene")
local util = require("moho_mcp.util")

local function tmpdir()
    local d = os.tmpname()
    os.remove(d)
    util.ensureDir(d)
    return d
end

local function vectorLayer(moho)
    return moho:AddLayer("vector")
end

-- util ----------------------------------------------------------------------

test("util.parseHex: parses RRGGBB and RRGGBBAA", function()
    local r, g, b, a = util.parseHex("#FF8000")
    assert_eq(r, 1); assert_eq(a, 1)
    assert_true(math.abs(g - 128 / 255) < 1e-9)
    assert_eq(b, 0)
    local _, _, _, a2 = util.parseHex("00000080")
    assert_true(math.abs(a2 - 128 / 255) < 1e-9)
end)

test("util.parseHex: rejects malformed colors", function()
    assert_eq(util.parseHex("#12345"), nil)
    assert_eq(util.parseHex("#GGGGGG"), nil)
    assert_eq(util.parseHex(42), nil)
end)

-- draw ----------------------------------------------------------------------

test("draw.ellipse: creates one closed smooth shape", function()
    local moho = mockMoho.new()
    local layer = vectorLayer(moho)
    local res, err = draw.ellipse(moho, { layerId = layer.id, cx = 0, cy = 0, rx = 0.5, fillColor = "#FF0000" })
    assert_true(res, err)
    assert_eq(#res.pointIndices, 8)
    assert_eq(layer.mesh:CountPoints(), 8, "duplicate closing point must be welded away")
    assert_eq(layer.mesh:CountShapes(), 1)
    assert_eq(layer.mesh:Point(0).curvature, 1.0)
    assert_eq(#res.warnings, 0)
end)

test("draw.ellipse: ry defaults to rx and points lie on the ellipse", function()
    local moho = mockMoho.new()
    local layer = vectorLayer(moho)
    assert_true(draw.ellipse(moho, { layerId = layer.id, cx = 1, cy = 2, rx = 3 }))
    for i = 0, 7 do
        local p = layer.mesh:Point(i)
        local d = math.sqrt((p.x - 1) ^ 2 + (p.y - 2) ^ 2)
        assert_true(math.abs(d - 3) < 1e-9, "point " .. i .. " off the circle")
    end
end)

test("draw.ellipse: rejects non-positive radius and bad segments", function()
    local moho = mockMoho.new()
    local layer = vectorLayer(moho)
    local r, e = draw.ellipse(moho, { layerId = layer.id, cx = 0, cy = 0, rx = 0 })
    assert_eq(r, nil); assert_true(e:find("rx", 1, true))
    r, e = draw.ellipse(moho, { layerId = layer.id, cx = 0, cy = 0, rx = 1, segments = 2 })
    assert_eq(r, nil); assert_true(e:find("segments", 1, true))
    assert_eq(layer.mesh:CountPoints(), 0, "validation failures must not touch the mesh")
end)

test("draw.rect: four sharp corners", function()
    local moho = mockMoho.new()
    local layer = vectorLayer(moho)
    local res, err = draw.rect(moho, { layerId = layer.id, x = -1, y = -1, width = 2, height = 1 })
    assert_true(res, err)
    assert_eq(layer.mesh:CountPoints(), 4)
    assert_eq(layer.mesh:Point(0).curvature, 0)
    assert_eq(layer.mesh:Point(2).x, 1)
    assert_eq(layer.mesh:Point(2).y, 0)
end)

test("draw.polygon: needs 3 valid points", function()
    local moho = mockMoho.new()
    local layer = vectorLayer(moho)
    local r, e = draw.polygon(moho, { layerId = layer.id, points = { { x = 0, y = 0 }, { x = 1, y = 0 } } })
    assert_eq(r, nil); assert_true(e:find("at least 3", 1, true))
    r, e = draw.polygon(moho, { layerId = layer.id, points = { { x = 0, y = 0 }, { x = 1, y = 0 }, { x = "a", y = 1 } } })
    assert_eq(r, nil); assert_true(e:find("points[3]", 1, true))
    assert_true(draw.polygon(moho, { layerId = layer.id, smooth = 0.5,
        points = { { x = 0, y = 0 }, { x = 1, y = 0 }, { x = 0.5, y = 1 } } }))
    assert_eq(layer.mesh:Point(0).curvature, 0.5)
end)

test("draw.polyline: open stroke requires strokeColor and is not welded", function()
    local moho = mockMoho.new()
    local layer = vectorLayer(moho)
    local pts = { { x = 0, y = 0 }, { x = 1, y = 1 } }
    local r, e = draw.polyline(moho, { layerId = layer.id, points = pts })
    assert_eq(r, nil); assert_true(e:find("strokeColor", 1, true))
    local res, err = draw.polyline(moho, { layerId = layer.id, points = pts, strokeColor = "#000000" })
    assert_true(res, err)
    assert_eq(layer.mesh.welded, nil)
    assert_eq(layer.mesh.shapes[1].filled, false)
end)

test("draw: reports bad color as a warning, not a failure", function()
    local moho = mockMoho.new()
    local layer = vectorLayer(moho)
    local res = draw.rect(moho, { layerId = layer.id, x = 0, y = 0, width = 1, height = 1, fillColor = "red" })
    assert_true(res)
    assert_eq(#res.warnings, 1)
    assert_true(res.warnings[1]:find("fillColor", 1, true))
end)

test("draw: wrong layer type and unknown layer give clear errors", function()
    local moho = mockMoho.new()
    local bone = moho:AddLayer("bone")
    local r, e = draw.rect(moho, { layerId = bone.id, x = 0, y = 0, width = 1, height = 1 })
    assert_eq(r, nil); assert_true(e:find("not a vector layer", 1, true))
    r, e = draw.rect(moho, { layerId = 999, x = 0, y = 0, width = 1, height = 1 })
    assert_eq(r, nil); assert_true(e:find("not found", 1, true))
end)

test("draw.ellipse: rejects NaN coordinates", function()
    local moho = mockMoho.new()
    local layer = vectorLayer(moho)
    local r, e = draw.ellipse(moho, { layerId = layer.id, cx = 0 / 0, cy = 0, rx = 1 })
    assert_eq(r, nil); assert_true(e:find("cx and cy", 1, true))
end)

-- render --------------------------------------------------------------------

test("render.frames: writes numbered files and restores the current frame", function()
    local moho = mockMoho.new()
    moho.frame = 7
    local dir = tmpdir()
    local res, err = render.frames(moho, { dir = dir, startFrame = 3, endFrame = 5 })
    assert_true(res, err)
    assert_eq(res.count, 3)
    assert_eq(moho.frame, 7)
    for f = 3, 5 do
        assert_true(util.fileNonEmpty(string.format("%s/frame_%05d.png", dir, f)))
    end
    assert_eq(#moho.renders, 3)
end)

test("render.frames: validates the range and the per-call cap", function()
    local moho = mockMoho.new()
    local r, e = render.frames(moho, { dir = "/tmp/x", startFrame = 5, endFrame = 1 })
    assert_eq(r, nil); assert_true(e:find(">=", 1, true))
    r, e = render.frames(moho, { dir = "/tmp/x", startFrame = 0, endFrame = 500 })
    assert_eq(r, nil); assert_true(e:find("Too many frames", 1, true))
    assert_eq(#moho.renders, 0)
end)

test("render.frames: stops at the first failed frame and says how far it got", function()
    local moho = mockMoho.new()
    moho.failRender = true
    local r, e = render.frames(moho, { dir = tmpdir(), startFrame = 1, endFrame = 3 })
    assert_eq(r, nil)
    assert_true(e:find("Frame 1", 1, true))
    assert_true(e:find("rendered 0 frames", 1, true))
end)

test("render.frame: renders a single frame and restores position", function()
    local moho = mockMoho.new()
    moho.frame = 2
    local path = tmpdir() .. "/one.png"
    local res, err = render.frame(moho, { filePath = path, frame = 10 })
    assert_true(res, err)
    assert_eq(moho.frame, 2)
    assert_true(util.fileNonEmpty(path))
end)

-- project -------------------------------------------------------------------

test("project.new: creates a document and applies settings", function()
    local moho = mockMoho.new()
    local res, err = project.new(moho, { width = 1280, height = 720, fps = 30, endFrame = 300, backgroundColor = "#FFFFFF" })
    assert_true(res, err)
    assert_true(moho.newCalled)
    assert_eq(moho.document.width, 1280)
    assert_eq(moho.document.fps, 30)
    assert_eq(moho.document.endFrame, 300)
    assert_eq(moho.document.backCol.r, 255)
    assert_eq(#res.warnings, 0)
end)

test("project.setProperties: rejects out-of-range values before touching the document", function()
    local moho = mockMoho.new()
    local r, e = project.setProperties(moho, { fps = 0 })
    assert_eq(r, nil); assert_true(e:find("fps", 1, true))
    r, e = project.setProperties(moho, { width = 4 })
    assert_eq(r, nil); assert_true(e:find("width", 1, true))
    r, e = project.setProperties(moho, { startFrame = 10, endFrame = 5 })
    assert_eq(r, nil); assert_true(e:find("endFrame", 1, true))
    assert_eq(moho.document.fps, 24)
end)

test("project.import: reports the new layer and routes EPS separately", function()
    local moho = mockMoho.new()
    local res, err = project.import(moho, { filePath = "/art/bg.png" })
    assert_true(res, err)
    assert_eq(res.newLayers, 1)
    assert_eq(moho.imported.path, "/art/bg.png")
    local res2 = project.import(moho, { filePath = "/art/logo.EPS" })
    assert_true(res2)
    assert_true(moho.imported.eps)
end)

test("project.open: passes the path through", function()
    local moho = mockMoho.new()
    assert_true(project.open(moho, { filePath = "/p/scene1.moho" }))
    assert_eq(moho.opened, "/p/scene1.moho")
    local r, e = project.open(moho, { filePath = "" })
    assert_eq(r, nil); assert_true(e)
end)

-- scene ---------------------------------------------------------------------

test("scene.duplicate: returns the id of the copy", function()
    local moho = mockMoho.new()
    local layer = vectorLayer(moho)
    local res, err = scene.duplicate(moho, { layerId = layer.id, name = "copy" })
    assert_true(res, err)
    assert_true(res.layerId ~= layer.id)
    assert_eq(moho.document:LayerByAbsoluteID(res.layerId):Name(), "copy")
    local r, e = scene.duplicate(moho, { layerId = 12345 })
    assert_eq(r, nil); assert_true(e:find("not found", 1, true))
end)

-- security -------------------------------------------------------------------

test("util.ensureDir: refuses shell metacharacters and never spawns a shell", function()
    local spawned = 0
    local realPopen = io.popen
    io.popen = function(cmd) spawned = spawned + 1; return { close = function() end } end
    for _, bad in ipairs({ 'C:\\x" & calc & "', "/tmp/a;rm -rf x", "/tmp/$(id)", "/tmp/a`id`",
        "C:\\%USERPROFILE%\\x", "/tmp/a\nb", "", "/tmp/a|b" }) do
        assert_eq(util.ensureDir(bad), false, "should refuse: " .. bad)
    end
    assert_eq(spawned, 0)
    assert_eq(util.ensureDir("/tmp/moho-ok dir/sub"), true)
    assert_eq(spawned, 1)
    io.popen = realPopen
end)

test("render.frames: a hostile dir is rejected before any frame is rendered", function()
    local moho = mockMoho.new()
    local res = render.frames(moho, { dir = '/tmp/x" & calc & "', startFrame = 1, endFrame = 1 })
    assert_eq(#moho.renders > 0 and res ~= nil and true or false, false)
end)
