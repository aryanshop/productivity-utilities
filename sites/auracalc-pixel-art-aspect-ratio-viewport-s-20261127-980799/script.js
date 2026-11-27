document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const presetSelect = document.getElementById('presetSelect');
    const spriteWidthInput = document.getElementById('spriteWidth');
    const spriteHeightInput = document.getElementById('spriteHeight');
    const targetResWidthInput = document.getElementById('targetResWidth');
    const targetResHeightInput = document.getElementById('targetResHeight');
    const scaleModeSelect = document.getElementById('scaleMode');
    const paletteSelect = document.getElementById('paletteSelect');
    const resetBtn = document.getElementById('resetBtn');
    const randomizeBtn = document.getElementById('randomizeBtn');
    const copyCssBtn = document.getElementById('copyCssBtn');

    const pixelCanvas = document.getElementById('pixelCanvas');
    const viewportContainer = document.getElementById('viewportContainer');
    const inspectorContainer = document.getElementById('inspectorContainer');
    const miniGrid = document.getElementById('miniGrid');
    const viewToggleBtns = document.querySelectorAll('.toggle-btn');

    const statScale = document.getElementById('statScale');
    const statRenderSize = document.getElementById('statRenderSize');
    const statBleed = document.getElementById('statBleed');
    const statPixels = document.getElementById('statPixels');

    const diagAspect = document.getElementById('diagAspect');
    const diagFit = document.getElementById('diagFit');
    const diagMem = document.getElementById('diagMem');
    const diagDensity = document.getElementById('diagDensity');
    const cssCodeOutput = document.getElementById('cssCodeOutput');

    // Palettes
    const palettes = {
        gameboy: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
        pico8: ['#000000', '#1D2B53', '#7E2553', '#008751', '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8', '#FF004D', '#FFA300', '#FFEC27', '#00E436', '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA'],
        cyberpunk: ['#050505', '#ff0055', '#00f0ff', '#ffe600'],
        monochrome: ['#111111', '#555555', '#aaaaaa', '#ffffff']
    };

    // State
    let currentView = 'preview'; // 'preview' or 'grid'
    let pixelData = [];
    let isDrawing = false;

    // Initialize random pattern buffer
    function initPixelBuffer(w, h) {
        pixelData = [];
        const currentPalette = palettes[paletteSelect.value] || palettes.gameboy;
        for (let y = 0; y < h; y++) {
            const row = [];
            for (let x = 0; x < w; x++) {
                // Create subtle default pattern or random art
                const val = (Math.sin(x * 0.3) + Math.cos(y * 0.3) > 0) ? 1 : 0;
                row.push(val % currentPalette.length);
            }
            pixelData.push(row);
        }
    }

    // Preset configuration handler
    presetSelect.addEventListener('change', () => {
        const val = presetSelect.value;
        if (val === 'gb') {
            spriteWidthInput.value = 160;
            spriteHeightInput.value = 144;
        } else if (val === 'nes') {
            spriteWidthInput.value = 256;
            spriteHeightInput.value = 240;
        } else if (val === 'snes') {
            spriteWidthInput.value = 256;
            spriteHeightInput.value = 224;
        } else if (val === 'pico8') {
            spriteWidthInput.value = 128;
            spriteHeightInput.value = 128;
        } else if (val === 'retro32') {
            spriteWidthInput.value = 32;
            spriteHeightInput.value = 32;
        }
        updateLaboratory();
    });

    // View Toggle Handlers
    viewToggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            viewToggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.view;
            
            if (currentView === 'preview') {
                viewportContainer.classList.remove('hidden');
                inspectorContainer.classList.add('hidden');
                renderCanvasPreview();
            } else {
                viewportContainer.classList.add('hidden');
                inspectorContainer.classList.remove('hidden');
                renderMiniGrid();
            }
        });
    });

    // Core calculation and render loop
    function updateLaboratory() {
        const sw = Math.max(8, parseInt(spriteWidthInput.value) || 160);
        const sh = Math.max(8, parseInt(spriteHeightInput.value) || 144);
        const tw = Math.max(320, parseInt(targetResWidthInput.value) || 1920);
        const th = Math.max(200, parseInt(targetResHeightInput.value) || 1080);
        const mode = scaleModeSelect.value;
        const paletteName = paletteSelect.value;
        const palette = palettes[paletteName] || palettes.gameboy;

        // Resize pixel buffer if dimensions changed
        if (pixelData.length !== sh || (pixelData[0] && pixelData[0].length !== sw)) {
            initPixelBuffer(sw, sh);
        }

        // Calculate integer scale
        let scaleX = Math.floor(tw / sw);
        let scaleY = Math.floor(th / sh);
        let scale = Math.min(scaleX, scaleY);
        if (scale < 1) scale = 1;

        let renderW = sw * scale;
        let renderH = sh * scale;
        let fitDescription = 'Letterboxed (Pillarbox)';

        if (mode === 'fit') {
            const ratioX = tw / sw;
            const ratioY = th / sh;
            const exactRatio = Math.min(ratioX, ratioY);
            renderW = Math.round(sw * exactRatio);
            renderH = Math.round(sh * exactRatio);
            fitDescription = 'Aspect Fit (Smooth)';
        } else if (mode === 'stretch') {
            renderW = tw;
            renderH = th;
            fitDescription = 'Stretch to Fill';
        }

        // Update metrics
        statScale.textContent = `${scale}x`;
        statRenderSize.textContent = `${renderW} x ${renderH} px`;
        
        const isClean = (mode === 'integer' || (renderW % sw === 0 && renderH % sh === 0));
        statBleed.textContent = isClean ? 'None (Clean)' : 'Sub-pixel Interp';
        statBleed.className = isClean ? 'metric-value success' : 'metric-value warning';

        const totalPixels = sw * sh;
        statPixels.textContent = `${totalPixels.toLocaleString()} px`;

        // Diagnostics info
        const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
        const divisor = gcd(sw, sh);
        diagAspect.textContent = `${sw / divisor}:${sh / divisor} (${(sw / sh).toFixed(2)})`;
        diagFit.textContent = fitDescription;
        
        // Memory footprint: 4 bytes per RGBA pixel
        const memKb = (totalPixels * 4) / 1024;
        diagMem.textContent = `${memKb.toFixed(1)} KB`;
        diagDensity.textContent = window.devicePixelRatio > 1 ? `Retina (${window.devicePixelRatio}x)` : 'Standard (1x)';

        // CSS Code snippet update
        const cssSnippet = `.pixel-sprite {
  width: ${renderW}px;
  height: ${renderH}px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}`;;
        cssCodeOutput.textContent = cssSnippet;

        // Render actual canvas
        renderCanvasPreview(sw, sh, palette, renderW, renderH);
        if (currentView === 'grid') {
            renderMiniGrid();
        }
    }

    function renderCanvasPreview(sw, sh, palette, renderW, renderH) {
        const w = sw || parseInt(spriteWidthInput.value);
        const h = sh || parseInt(spriteHeightInput.value);
        const currentPalette = palette || palettes[paletteSelect.value];

        pixelCanvas.width = w;
        pixelCanvas.height = h;
        pixelCanvas.style.width = `${renderW || (w * 4)}px`;
        pixelCanvas.style.height = `${renderH || (h * 4)}px`;

        const ctx = pixelCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        const imgData = ctx.createImageData(w, h);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const colorIdx = (pixelData[y] && pixelData[y][x]) || 0;
                const hex = currentPalette[colorIdx % currentPalette.length];
                
                // Parse hex to RGB
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);

                const idx = (y * w + x) * 4;
                imgData.data[idx] = r;
                imgData.data[idx + 1] = g;
                imgData.data[idx + 2] = b;
                imgData.data[idx + 3] = 255;
            }
        }
        ctx.putImageData(imgData, 0, 0);
    }

    function renderMiniGrid() {
        const w = parseInt(spriteWidthInput.value);
        const h = parseInt(spriteHeightInput.value);
        const currentPalette = palettes[paletteSelect.value] || palettes.gameboy;

        // Limit inspector size for performance if dimensions are massive
        const maxInspect = 64;
        const renderW = Math.min(w, maxInspect);
        const renderH = Math.min(h, maxInspect);

        miniGrid.style.gridTemplateColumns = `repeat(${renderW}, minmax(8px, 1fr))`;
        miniGrid.innerHTML = '';

        for (let y = 0; y < renderH; y++) {
            for (let x = 0; x < renderW; x++) {
                const cell = document.createElement('div');
                cell.className = 'pixel-cell';
                const colorIdx = (pixelData[y] && pixelData[y][x]) || 0;
                cell.style.backgroundColor = currentPalette[colorIdx % currentPalette.length];
                
                cell.addEventListener('mousedown', (e) => {
                    isDrawing = true;
                    togglePixel(y, x, renderW, renderH);
                });
                cell.addEventListener('mouseover', (e) => {
                    if (isDrawing) {
                        togglePixel(y, x, renderW, renderH);
                    }
                });

                miniGrid.appendChild(cell);
            }
        }
    }

    window.addEventListener('mouseup', () => {
        isDrawing = false;
    });

    function togglePixel(y, x, maxW, maxH) {
        if (!pixelData[y]) pixelData[y] = [];
        const currentPalette = palettes[paletteSelect.value] || palettes.gameboy;
        let current = pixelData[y][x] || 0;
        pixelData[y][x] = (current + 1) % currentPalette.length;
        renderMiniGrid();
        renderCanvasPreview();
    }

    // Randomize sample art
    randomizeBtn.addEventListener('click', () => {
        const w = parseInt(spriteWidthInput.value);
        const h = parseInt(spriteHeightInput.value);
        const currentPalette = palettes[paletteSelect.value] || palettes.gameboy;
        
        pixelData = [];
        for (let y = 0; y < h; y++) {
            const row = [];
            for (let x = 0; x < w; x++) {
                row.push(Math.floor(Math.random() * currentPalette.length));
            }
            pixelData.push(row);
        }
        updateLaboratory();
    });

    // Reset defaults
    resetBtn.addEventListener('click', () => {
        presetSelect.value = 'gb';
        spriteWidthInput.value = 160;
        spriteHeightInput.value = 144;
        targetResWidthInput.value = 1920;
        targetResHeightInput.value = 1080;
        scaleModeSelect.value = 'integer';
        paletteSelect.value = 'gameboy';
        initPixelBuffer(160, 144);
        updateLaboratory();
    });

    // Copy CSS button
    copyCssBtn.addEventListener('click', () => {
        const code = cssCodeOutput.textContent;
        navigator.clipboard.writeText(code).then(() => {
            const originalText = copyCssBtn.textContent;
            copyCssBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyCssBtn.textContent = originalText;
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy', err);
        });
    });

    // Event listeners on inputs
    [spriteWidthInput, spriteHeightInput, targetResWidthInput, targetResHeightInput, scaleModeSelect, paletteSelect].forEach(element => {
        element.addEventListener('input', updateLaboratory);
        element.addEventListener('change', updateLaboratory);
    });

    // Initial boot
    initPixelBuffer(160, 144);
    updateLaboratory();
});
