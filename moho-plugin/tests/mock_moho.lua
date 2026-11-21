-- mock_moho.lua
-- A tiny in-memory stand-in for Moho's ScriptInterface, just rich enough to
-- exercise the high-level handlers (draw, render, project, scene,
-- diagnostics) outside of Moho. It models the call semantics the handlers
-- rely on; it is NOT a full emulation.

local M = {}

-- LM namespace ---------------------------------------------------------------
local function constructor()
    return setmetatable({}, { __index = {
        new_local = function() return {} end,
    } })
end

function M.install_globals()
    LM = {
        Vector2 = constructor(),
        ColorVector = setmetatable({}, { __index = { new_local = function()
            local c = {}
            function c:Set(r, g, b, a) self.r, self.g, self.b, self.a = r, g, b, a end
            return c
        end } }),
        rgb_color = constructor(),
    }
end

-- Mesh -----------------------------------------------------------------------
local function new_mesh()
    local mesh = { points = {}, shapes = {}, last = nil }

    local function make_point(vec)
        local pt = { x = vec.x, y = vec.y, fSelected = false, curvature = nil }
        function pt:SetCurvature(c) self.curvature = c end
        return pt
    end

    function mesh:CountPoints() return #self.points end
    function mesh:CountShapes() return #self.shapes end
    function mesh:Point(i) return self.points[i + 1] end
    function mesh:Shape(i) return self.shapes[i + 1] end
    function mesh:SelectNone() for _, p in ipairs(self.points) do p.fSelected = false end end
    function mesh:AddLonePoint(vec) self.points[#self.points + 1] = make_point(vec) end
    function mesh:AppendPoint(vec) self.points[#self.points + 1] = make_point(vec) end
    function mesh:WeldPoints(moving, solid)
        assert(moving ~= solid, "cannot weld a point to itself")
        table.remove(self.points, moving + 1)
        self.welded = (self.welded or 0) + 1
    end
    return mesh
end

-- Layers ---------------------------------------------------------------------
local function new_layer(doc, kind, id)
    local layer = { id = id, kind = kind, name = kind .. id }
    function layer:Name() return self.name end
    function layer:SetName(n) self.name = n end
    function layer:LayerType() return self.kind end
    function layer:IsVectorType() return self.kind == "vector" end
    function layer:IsBoneType() return self.kind == "bone" end
    function layer:IsGroupType() return self.kind == "group" end
    if kind == "vector" then layer.mesh = new_mesh() end
    return layer
end

-- Document + moho ------------------------------------------------------------
function M.new()
    M.install_globals()
    local moho = { frame = 0, renders = {}, files = {}, calls = {} }

    local doc = { layers = {}, nextId = 1, width = 1920, height = 1080, fps = 24,
        startFrame = 1, endFrame = 240, dirty = false }
    moho.document = doc

    function doc:CurrentFrame() return moho.frame end
    function doc:Width() return self.width end
    function doc:Height() return self.height end
    function doc:Fps() return self.fps end
    function doc:StartFrame() return self.startFrame end
    function doc:EndFrame() return self.endFrame end
    function doc:Name() return "mock.moho" end
    function doc:SetShape(w, h) self.width, self.height = w, h end
    function doc:SetFps(f) self.fps = f end
    function doc:SetStartFrame(f) self.startFrame = f end
    function doc:SetEndFrame(f) self.endFrame = f end
    function doc:SetBackCol(c) self.backCol = c end
    function doc:SetDirty() self.dirty = true end
    function doc:PrepUndo() end
    function doc:CountLayers() return #self.layers end
    function doc:Layer(i) return self.layers[i + 1] end
    function doc:LayerByAbsoluteID(id)
        for _, l in ipairs(self.layers) do if l.id == id then return l end end
        return nil
    end
    function doc:LayerAbsoluteID(layer) return layer.id end
    function doc:DuplicateLayer(layer)
        local copy = new_layer(self, layer.kind, self.nextId)
        self.nextId = self.nextId + 1
        self.layers[#self.layers + 1] = copy
        return copy
    end

    function moho:AddLayer(kind)
        local l = new_layer(doc, kind, doc.nextId)
        doc.nextId = doc.nextId + 1
        doc.layers[#doc.layers + 1] = l
        self.layer = l
        return l
    end
    function moho:LayerAsVector(l) return { Mesh = function() return l.mesh end } end
    function moho:LayerAsGroup(l) return l end
    function moho:SetSelLayer(l) self.layer = l end
    function moho:SetCurFrame(f) self.frame = f end
    function moho:AppVersion() return "14.5-mock" end

    function moho:CreateShape(filled)
        local sel = {}
        for _, p in ipairs(self.layer.mesh.points) do
            if p.fSelected then sel[#sel + 1] = p end
        end
        local minPts = filled and 3 or 2
        if #sel < minPts then return end
        local shape = { filled = filled, pointCount = #sel, fMyStyle = {
            fFillCol = { SetValue = function(s, f, c) s.value = c end },
            fLineCol = { SetValue = function(s, f, c) s.value = c end },
        } }
        function shape:SetName(n) self.name = n end
        local mesh = self.layer.mesh
        mesh.shapes[#mesh.shapes + 1] = shape
    end

    function moho:FileRender(path)
        self.renders[#self.renders + 1] = path
        if not self.failRender then
            local f = assert(io.open(path, "wb")); f:write("PNG"); f:close()
        end
    end
    function moho:FileNew() self.newCalled = true end
    function moho:FileOpen(path) self.opened = path end
    function moho:FileImport(path, mode)
        self.imported = { path = path, mode = mode }
        self:AddLayer("image")
    end
    function moho:ImportEPS(path) self.imported = { path = path, eps = true }; self:AddLayer("vector") end

    return moho
end

return M
