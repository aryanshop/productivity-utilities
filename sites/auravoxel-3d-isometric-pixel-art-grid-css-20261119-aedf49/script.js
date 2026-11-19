;
(function() {
    'App State & Palettes'
    const PALETTES = {
        cyberpunk: ['#0f172a', '#f43f5e', '#ec4899', '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b'],
        pastel: ['#fef08a', '#fed7aa', '#fecdd3', '#e9d5ff', '#c7d2fe', '#bae6fd', '#a7f3d0', '#fbcfe8'],
        gameboy: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
        monolith: ['#18181b', '#27272a', '#3f3f46', '#52525b', '#71717a', '#a1a1aa', '#d4d4d8', '#fafafa']
    };

    let state = {
        gridSize: 16,
        currentZ: 0,
        maxZ: 15,
        activeTool: 'draw',
        currentPaletteKey: 'pastel',
        currentColor: '#e9d5ff',
        voxels: {}, // Key: "x,y,z" -> color hex
        history: [],
        zoom: 1,
        panX: 0,
        panY: 0,
        isPanning: false,
        startX: 0,
        startY: 0
    };

    // DOM Elements
    const canvas = document.getElementById('voxelCanvas');
    const ctx = canvas.getContext('2d');
    const scrollArea = document.getElementById('canvas-scroll-area');
    const gridSizeRange = document.getElementById('grid-size-range');
    const gridSizeLabel = document.getElementById('grid-size-label');
    const gridSizeLabel2 = document.getElementById('grid-size-label-2');
    const currentLayerVal = document.getElementById('current-layer-val');
    const btnLayerUp = document.getElementById('btn-layer-up');
    const btnLayerDown = document.getElementById('btn-layer-down');
    const palettePresetSelect = document.getElementById('palette-preset');
    const colorPaletteContainer = document.getElementById('color-palette');
    const customColorPicker = document.getElementById('custom-color-picker');
    const hexDisplay = document.getElementById('hex-display');
    const statVoxels = document.getElementById('stat-voxels');
    const statLayers = document.getElementById('stat-layers');
    const statColors = document.getElementById('stat-colors');
    const statBytes = document.getElementById('stat-bytes');
    const btnUndo = document.getElementById('btn-undo');
    const btnClear = document.getElementById('btn-clear');
    const btnZoomReset = document.getElementById('btn-zoom-reset');
    const btnExportJson = document.getElementById('btn-export-json');
    const btnCopyCss = document.getElementById('btn-copy-css');
    const cssCodeOutput = document.getElementById('css-code-output');
    const copyToast = document.getElementById('copy-toast');
    const toolBtns = document.querySelectorAll('.tool-btn');

    // Isometric Constants
    const TILE_W = 48;
    const TILE_H = 24;
    const VOXEL_H = 16;

    function init() {
        loadFromStorage();
        setupEventListeners();
        buildPaletteUI();
        resizeCanvas();
        centerView();
        render();
    }

    function setupEventListeners() {
        // Tool selection
        toolBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                toolBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.activeTool = btn.dataset.tool;
            });
        });

        // Grid Size
        gridSizeRange.addEventListener('input', (e) => {
            state.gridSize = parseInt(e.target.value);
            gridSizeLabel.textContent = state.gridSize;
            gridSizeLabel2.textContent = state.gridSize;
            render();
        });

        // Layers
        btnLayerUp.addEventListener('click', () => {
            if (state.currentZ < 15) {
                state.currentZ++;
                currentLayerVal.textContent = state.currentZ;
                render();
            }
        });

        btnLayerDown.addEventListener('click', () => {
            if (state.currentZ > 0) {
                state.currentZ--;
                currentLayerVal.textContent = state.currentZ;
                render();
            }
        });

        // Palette Preset
        palettePresetSelect.addEventListener('change', (e) => {
            state.currentPaletteKey = e.target.value;
            buildPaletteUI();
        });

        // Custom Color Picker
        customColorPicker.addEventListener('input', (e) => {
            state.currentColor = e.target.value;
            hexDisplay.textContent = state.currentColor;
            document.querySelectorAll('.palette-swatch').forEach(s => s.classList.remove('active'));
        });

        // Canvas Mouse Interactions
        canvas.addEventListener('mousedown', onCanvasMouseDown);
        canvas.addEventListener('mousemove', onCanvasMouseMove);
        window.addEventListener('mouseup', onCanvasMouseUp);
        canvas.addEventListener('wheel', onCanvasWheel, { passive: false });

        // Action buttons
        btnUndo.addEventListener('click', undo);
        btnClear.addEventListener('click', clearGrid);
        btnZoomReset.addEventListener('click', centerView);
        btnExportJson.addEventListener('click', exportJSON);
        btnCopyCss.addEventListener('click', copyCSSCode);

        // Keyboard Shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                undo();
            }
            if (e.key.toLowerCase() === 'b') setTool('draw');
            if (e.key.toLowerCase() === 'e') setTool('erase');
            if (e.key.toLowerCase() === 'i') setTool('picker');
            if (e.key.toLowerCase() === 'f') setTool('fill');
        });
    }

    function setTool(toolName) {
        toolBtns.forEach(b => {
            if (b.dataset.tool === toolName) {
                b.classList.add('active');
                state.activeTool = toolName;
            } else {
                b.classList.remove('active');
            }
        });
    }

    function buildPaletteUI() {
        colorPaletteContainer.innerHTML = '';
        const colors = PALETTES[state.currentPaletteKey] || PALETTES.pastel;
        state.currentColor = colors[0];
        customColorPicker.value = state.currentColor;
        hexDisplay.textContent = state.currentColor;

        colors.forEach((hex, idx) => {
            const swatch = document.createElement('div');
            swatch.className = 'palette-swatch' + (idx === 0 ? ' active' : '');
            swatch.style.backgroundColor = hex;
            swatch.title = hex;
            swatch.addEventListener('click', () => {
                document.querySelectorAll('.palette-swatch').forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
                state.currentColor = hex;
                customColorPicker.value = hex;
                hexDisplay.textContent = hex;
            });
            colorPaletteContainer.appendChild(swatch);
        });
    }

    function resizeCanvas() {
        const rect = scrollArea.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
    }

    window.addEventListener('resize', () => {
        resizeCanvas();
        render();
    });

    function centerView() {
        state.zoom = 1;
        const originX = canvas.width / 2;
        const originY = canvas.height / 3;
        state.panX = originX;
        state.panY = originY;
        render();
    }

    // Coordinate Transforms
    function screenToIso(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        // Adjust for pan and zoom
        const rx = (x - state.panX) / state.zoom;
        const ry = (y - state.panY) / state.zoom;

        // Inverse isometric projection
        const halfW = TILE_W / 2;
        const halfH = TILE_H / 2;

        for (let gx = 0; gx < state.gridSize; gx++) {
            for (let gy = 0; gy < state.gridSize; gy++) {
                const screenX = (gx - gy) * halfW;
                const screenY = (gx + gy) * halfH - (state.currentZ * VOXEL_H);

                // Check bounding box of isometric tile
                const dx = rx - screenX;
                const dy = ry - screenY;

                if (Math.abs(dx / halfW) + Math.abs(dy / halfH) <= 1) {
                    return { gx, gy };
                }
            }
        }
        return null;
    }

    // Mouse Handlers
    let isMouseDown = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    function onCanvasMouseDown(e) {
        isMouseDown = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        if (e.button === 2 || e.altKey || e.shiftKey) {
            state.isPanning = true;
            return;
        }

        if (e.button === 0) {
            handleCanvasInteraction(e.clientX, e.clientY);
        }
    }

    function onCanvasMouseMove(e) {
        if (!isMouseDown) return;

        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        if (state.isPanning || e.buttons === 4) {
            state.panX += dx;
            state.panY += dy;
            render();
        } else if (state.activeTool === 'draw' || state.activeTool === 'erase') {
            handleCanvasInteraction(e.clientX, e.clientY);
        }
    }

    function onCanvasMouseUp() {
        isMouseDown = false;
        state.isPanning = false;
    }

    function onCanvasWheel(e) {
        e.preventDefault();
        const zoomFactor = 1.1;
        if (e.deltaY < 0) {
            state.zoom = Math.min(state.zoom * zoomFactor, 3.0);
        } else {
            state.zoom = Math.max(state.zoom / zoomFactor, 0.4);
        }
        render();
    }

    function handleCanvasInteraction(clientX, clientY) {
        const coords = screenToIso(clientX, clientY);
        if (!coords) return;

        const key = `${coords.gx},${coords.gy},${state.currentZ}`;

        if (state.activeTool === 'draw') {
            if (state.voxels[key] !== state.currentColor) {
                saveHistory();
                state.voxels[key] = state.currentColor;
                render();
                saveToStorage();
            }
        } else if (state.activeTool === 'erase') {
            if (state.voxels[key]) {
                saveHistory();
                delete state.voxels[key];
                render();
                saveToStorage();
            }
        } else if (state.activeTool === 'picker') {
            if (state.voxels[key]) {
                state.currentColor = state.voxels[key];
                customColorPicker.value = state.currentColor;
                hexDisplay.textContent = state.currentColor;
                setTool('draw');
            }
        } else if (state.activeTool === 'fill') {
            bucketFill(coords.gx, coords.gy, state.currentZ, state.currentColor);
        }
    }

    function bucketFill(startX, startY, z, newColor) {
        const targetKey = `${startX},${startY},${z}`;
        const targetColor = state.voxels[targetKey] || null;
        if (targetColor === newColor) return;

        saveHistory();
        const queue = [[startX, startY]];
        const visited = new Set();

        while (queue.length > 0) {
            const [x, y] = queue.shift();
            if (x < 0 || x >= state.gridSize || y < 0 || y >= state.gridSize) continue;

            const k = `${x},${y},${z}`;
            if (visited.has(k)) continue;
            visited.add(k);

            const currentCol = state.voxels[k] || null;
            if (currentCol === targetColor) {
                if (newColor === null) {
                    delete state.voxels[k];
                } else {
                    state.voxels[k] = newColor;
                }
                queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
            }
        }
        render();
        saveToStorage();
    }

    function saveHistory() {
        const snapshot = JSON.parse(JSON.stringify(state.voxels));
        state.history.push(snapshot);
        if (state.history.length > 30) state.history.shift();
        btnUndo.disabled = false;
    }

    function undo() {
        if (state.history.length === 0) return;
        state.voxels = state.history.pop();
        if (state.history.length === 0) {
            btnUndo.disabled = true;
        }
        render();
        saveToStorage();
    }

    function clearGrid() {
        if (Object.keys(state.voxels).length === 0) return;
        if (confirm('Are you sure you want to clear all voxels?')) {
            saveHistory();
            state.voxels = {};
            render();
            saveToStorage();
        }
    }

    // Rendering Engine
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(state.panX, state.panY);
        ctx.scale(state.zoom, state.zoom);

        drawGridFloor();
        drawVoxels();

        ctx.restore();
        updateStats();
        updateCSSCode();
    }

    function drawGridFloor() {
        const halfW = TILE_W / 2;
        const halfH = TILE_H / 2;

        ctx.strokeStyle = 'rgba(71, 85, 105, 0.35)';
        ctx.lineWidth = 1;

        for (let gx = 0; gx < state.gridSize; gx++) {
            for (let gy = 0; gy < state.gridSize; gy++) {
                const screenX = (gx - gy) * halfW;
                const screenY = (gx + gy) * halfH;

                ctx.beginPath();
                ctx.moveTo(screenX, screenY - halfH);
                ctx.lineTo(screenX + halfW, screenY);
                ctx.lineTo(screenX, screenY + halfH);
                ctx.lineTo(screenX - halfW, screenY);
                ctx.closePath();
                ctx.stroke();

                // Highlight active layer base grid
                if (state.currentZ === 0) {
                    const key = `${gx},${gy},0`;
                    if (!state.voxels[key]) {
                        ctx.fillStyle = 'rgba(99, 102, 241, 0.02)';
                        ctx.fill();
                    }
                }
            }
        }
    }

    function drawVoxels() {
        const halfW = TILE_W / 2;
        const halfH = TILE_H / 2;

        // Sort voxels by isometric depth order (painter's algorithm)
        const voxelKeys = Object.keys(state.voxels);
        voxelKeys.sort((a, b) => {
            const [ax, ay, az] = a.split(',').map(Number);
            const [bx, by, bz] = b.split(',').map(Number);
            if (az !== bz) return az - bz;
            return (ax + ay) - (bx + by);
        });

        voxelKeys.forEach(key => {
            const [gx, gy, gz] = key.map(Number);
            const color = state.voxels[key];
            if (!color) return;

            const screenX = (gx - gy) * halfW;
            const screenY = (gx + gy) * halfH - (gz * VOXEL_H);

            drawVoxelCube(screenX, screenY, color);
        });
    }

    function drawVoxelCube(x, y, baseColor) {
        const halfW = TILE_W / 2;
        const halfH = TILE_H / 2;
        const h = VOXEL_H;

        const topColor = baseColor;
        const leftColor = shadeColor(baseColor, -20);
        const rightColor = shadeColor(baseColor, -40);

        // Top Face
        ctx.fillStyle = topColor;
        ctx.beginPath();
        ctx.moveTo(x, y - halfH);
        ctx.lineTo(x + halfW, y);
        ctx.lineTo(x, y + halfH);
        ctx.lineTo(x - halfW, y);
        ctx.closePath();
        ctx.fill();

        // Left Face
        ctx.fillStyle = leftColor;
        ctx.beginPath();
        ctx.moveTo(x - halfW, y);
        ctx.lineTo(x, y + halfH);
        ctx.lineTo(x, y + halfH + h);
        ctx.lineTo(x - halfW, y + h);
        ctx.closePath();
        ctx.fill();

        // Right Face
        ctx.fillStyle = rightColor;
        ctx.beginPath();
        ctx.moveTo(x + halfW, y);
        ctx.lineTo(x, y + halfH);
        ctx.lineTo(x, y + halfH + h);
        ctx.lineTo(x + halfW, y + h);
        ctx.closePath();
        ctx.fill();
    }

    function shadeColor(color, percent) {
        let f = parseInt(color.slice(1), 16);
        let t = percent < 0 ? 0 : 255;
        let p = percent < 0 ? -percent : percent;
        let R = f >> 16;
        let G = (f >> 8) & 0x00ff;
        let B = f & 0x0000ff;
        let nR = Math.round((t - R) * (p / 100) + R);
        let nG = Math.round((t - G) * (p / 100) + G);
        let nB = Math.round((t - B) * (p / 100) + B);
        return `#${(0x1000000 + (nR < 255 ? (nR < 0 ? 0 : nR) : 255) * 0x10000 + (nG < 255 ? (nG < 0 ? 0 : nG) : 255) * 0x100 + (nB < 255 ? (nB < 0 ? 0 : nB) : 255)).toString(16).slice(1)}`;
    }

    // Statistics & Code Synthesizer
    function updateStats() {
        const keys = Object.keys(state.voxels);
        const count = keys.length;
        statVoxels.textContent = count;

        const layersSet = new Set();
        const colorsSet = new Set();
        keys.forEach(k => {
            const [gx, gy, gz] = k.split(',');
            layersSet.add(gz);
            colorsSet.add(state.voxels[k]);
        });

        statLayers.textContent = layersSet.size;
        statColors.textContent = colorsSet.size;

        const jsonStr = JSON.stringify(state.voxels);
        const bytes = new Blob([jsonStr]).size;
        statBytes.textContent = bytes < 1024 ? `${bytes} bytes` : `${(bytes / 1024).toFixed(1)} KB`;
    }

    function updateCSSCode() {
        const keys = Object.keys(state.voxels);
        if (keys.length === 0) {
            cssCodeOutput.textContent = `/* Paint on the grid to generate CSS code */\n.auravoxel-element {\n  width: 12px;\n  height: 12px;\n  box-shadow: 0 0 0 #000;\n}`;
            return;
        }

        const shadows = [];
        const halfW = 12;
        const halfH = 6;
        const vH = 8;

        keys.forEach(k => {
            const [gx, gy, gz] = k.map(Number);
            const color = state.voxels[k];
            const px = (gx - gy) * halfW;
            const py = (gx + gy) * halfH - (gz * vH);
            shadows.push(`${px}px ${py}px 0 0 ${color}`);
        });

        const css = `.auravoxel-art {\n  position: relative;\n  width: 12px;\n  height: 12px;\n  box-shadow:\n    ` + shadows.join(',\n    ') + `;\n}`;
        cssCodeOutput.textContent = css;
    }

    function copyCSSCode() {
        const text = cssCodeOutput.textContent;
        navigator.clipboard.writeText(text).then(() => {
            copyToast.classList.remove('hidden');
            setTimeout(() => {
                copyToast.classList.add('hidden');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text', err);
        });
    }

    function exportJSON() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.voxels, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `auravoxel_model_${Date.now()}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    }

    function saveToStorage() {
        try {
            localStorage.setItem('auravoxel_workspace', JSON.stringify({
                gridSize: state.gridSize,
                voxels: state.voxels
            }));
        } catch (e) {
            console.error('Storage error', e);
        }
    }

    function loadFromStorage() {
        try {
            const saved = localStorage.getItem('auravoxel_workspace');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.gridSize) {
                    state.gridSize = parsed.gridSize;
                    gridSizeRange.value = state.gridSize;
                    gridSizeLabel.textContent = state.gridSize;
                    gridSizeLabel2.textContent = state.gridSize;
                }
                if (parsed.voxels) {
                    state.voxels = parsed.voxels;
                }
            }
        } catch (e) {
            console.error('Load error', e);
        }
    }

    init();
})();
