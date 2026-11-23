document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const baseFontSizeInput = document.getElementById('baseFontSize');
    const valBaseFontSize = document.getElementById('val-baseFontSize');
    const modularScaleSelect = document.getElementById('modularScale');
    const baseLineHeightInput = document.getElementById('baseLineHeight');
    const valBaseLineHeight = document.getElementById('val-baseLineHeight');
    const fontFamilySelect = document.getElementById('fontFamily');

    const contentWidthInput = document.getElementById('contentWidth');
    const valContentWidth = document.getElementById('val-contentWidth');
    const baselineGridSizeInput = document.getElementById('baselineGridSize');
    const valBaselineGridSize = document.getElementById('val-baselineGridSize');
    const showBaselineOverlayCheck = document.getElementById('showBaselineOverlay');
    const showColumnBoundsCheck = document.getElementById('showColumnBounds');

    const cssCodeOutput = document.getElementById('cssCodeOutput');
    const copyCssBtn = document.getElementById('copyCssBtn');
    const presetNameInput = document.getElementById('presetNameInput');
    const savePresetBtn = document.getElementById('savePresetBtn');
    const presetList = document.getElementById('presetList');

    const pillScale = document.getElementById('pill-scale');
    const pillBody = document.getElementById('pill-body');
    const pillMeasure = document.getElementById('pill-measure');

    const toggleModeBtn = document.getElementById('toggleModeBtn');
    const resetDefaultsBtn = document.getElementById('resetDefaultsBtn');
    const canvasViewport = document.querySelector('.canvas-viewport');
    const baselineOverlayLayer = document.getElementById('baselineOverlayLayer');
    const columnBoundsLayer = document.getElementById('columnBoundsLayer');
    const previewArticle = document.getElementById('previewArticle');
    const toast = document.getElementById('toast');

    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // State
    let presets = JSON.parse(localStorage.getItem('auravellum_presets')) || [
        { id: 1, name: 'Editorial Modern', base: 16, scale: 1.25, lh: 1.5, width: 720, grid: 24, font: 'sans-serif' },
        { id: 2, name: 'Literary Classic', base: 18, scale: 1.333, lh: 1.65, width: 680, grid: 28, font: 'georgia' }
    ];

    // Tab Switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const targetId = 'tab-' + btn.getAttribute('data-tab');
            const target = document.getElementById(targetId);
            if (target) target.classList.add('active');
        });
    });

    // Main calculation & style injector
    function updateTypography() {
        const baseSize = parseFloat(baseFontSizeInput.value);
        const scaleRatio = parseFloat(modularScaleSelect.value);
        const lineMultiplier = parseFloat(baseLineHeightInput.value);
        const contentWidth = parseInt(contentWidthInput.value, 10);
        const baselineGrid = parseInt(baselineGridSizeInput.value, 10);
        const fontChoice = fontFamilySelect.value;

        // Update readouts
        valBaseFontSize.textContent = baseSize;
        valBaseLineHeight.textContent = lineMultiplier;
        valContentWidth.textContent = contentWidth;
        valBaselineGridSize.textContent = baselineGrid;

        // Compute type scale steps (h1 to h6 equivalent)
        const h1Size = (baseSize * Math.pow(scaleRatio, 4)).toFixed(1);
        const h2Size = (baseSize * Math.pow(scaleRatio, 3)).toFixed(1);
        const h3Size = (baseSize * Math.pow(scaleRatio, 2)).toFixed(1);
        const h4Size = (baseSize * scaleRatio).toFixed(1);
        const bodySize = baseSize;

        const computedLineHeight = (baseSize * lineMultiplier).toFixed(1);

        // Apply to preview article
        previewArticle.style.fontSize = bodySize + 'px';
        previewArticle.style.lineHeight = lineMultiplier;
        previewArticle.style.maxWidth = contentWidth + 'px';

        // Font family class
        previewArticle.className = 'typography-preview ' + fontChoice;

        // Specific heading scaling
        const h1 = previewArticle.querySelector('h1');
        const h2 = previewArticle.querySelector('h2');
        const h3 = previewArticle.querySelector('h3');
        
        if (h1) h1.style.fontSize = h1Size + 'px';
        if (h2) h2.style.fontSize = h2Size + 'px';
        if (h3) h3.style.fontSize = h3Size + 'px';

        // Baseline Overlay CSS background size adjustment
        baselineOverlayLayer.style.backgroundSize = `100% ${baselineGrid}px`;
        columnBoundsLayer.style.width = contentWidth + 'px';

        // Estimate character measure (approx 0.55 * bodySize for average proportional font)
        const charWidth = bodySize * 0.52;
        const charsPerLine = Math.round(contentWidth / charWidth);

        // Update metrics pills
        pillScale.textContent = `Scale: ${scaleRatio}`;
        pillBody.textContent = `Body: ${bodySize}px / ${computedLineHeight}px`;
        pillMeasure.textContent = `Measure: ~${charsPerLine}ch`;

        // Generate CSS code output
        const cssSnippet = `:root {
  --font-size-base: ${baseSize}px;
  --modular-scale: ${scaleRatio};
  --line-height-base: ${lineMultiplier};
  --baseline-grid: ${baselineGrid}px;
  --content-max-width: ${contentWidth}px;

  --font-size-h1: ${h1Size}px;
  --font-size-h2: ${h2Size}px;
  --font-size-h3: ${h3Size}px;
}

body {
  font-size: var(--font-size-base);
  line-height: var(--line-height-base);
  max-width: var(--content-max-width);
}`;

        if (cssCodeOutput) cssCodeOutput.textContent = cssSnippet;
    }

    // Event Listeners for inputs
    [baseFontSizeInput, modularScaleSelect, baseLineHeightInput, fontFamilySelect, contentWidthInput, baselineGridSizeInput].forEach(element => {
        if (element) {
            element.addEventListener('input', updateTypography);
        }
    });

    // Overlays toggle
    if (showBaselineOverlayCheck) {
        showBaselineOverlayCheck.addEventListener('change', () => {
            if (showBaselineOverlayCheck.checked) {
                baselineOverlayLayer.classList.add('active');
            } else {
                baselineOverlayLayer.classList.remove('active');
            }
        });
    }

    if (showColumnBoundsCheck) {
        showColumnBoundsCheck.addEventListener('change', () => {
            if (showColumnBoundsCheck.checked) {
                columnBoundsLayer.classList.add('active');
            } else {
                columnBoundsLayer.classList.remove('active');
            }
        });
    }

    // Dark/Light Theme Preview Toggle
    let isDarkPreview = false;
    if (toggleModeBtn) {
        toggleModeBtn.addEventListener('click', () => {
            isDarkPreview = !isDarkPreview;
            if (isDarkPreview) {
                canvasViewport.classList.add('dark-theme');
                toggleModeBtn.textContent = '☀️';
            } else {
                canvasViewport.classList.remove('dark-theme');
                toggleModeBtn.textContent = '🌙';
            }
        });
    }

    // Reset Defaults
    if (resetDefaultsBtn) {
        resetDefaultsBtn.addEventListener('click', () => {
            baseFontSizeInput.value = 16;
            modularScaleSelect.value = '1.25';
            baseLineHeightInput.value = 1.5;
            fontFamilySelect.value = 'sans-serif';
            contentWidthInput.value = 720;
            baselineGridSizeInput.value = 24;
            updateTypography();
            showToast('Reset to default settings');
        });
    }

    // Copy CSS Button
    if (copyCssBtn) {
        copyCssBtn.addEventListener('click', () => {
            const codeText = cssCodeOutput ? cssCodeOutput.textContent : '';
            navigator.clipboard.writeText(codeText).then(() => {
                showToast('CSS Copied to clipboard!');
            }).catch(() => {
                showToast('Failed to copy');
            });
        });
    }

    // Toast helper
    function showToast(message) {
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    }

    // Presets Management
    function renderPresets() {
        if (!presetList) return;
        presetList.innerHTML = '';

        if (presets.length === 0) {
            presetList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.8125rem;">No saved presets yet.</p>';
            return;
        }

        presets.forEach(p => {
            const item = document.createElement('div');
            item.className = 'preset-item';
            item.innerHTML = `
                <div class="preset-info">
                    <span>${escapeHtml(p.name)}</span>
                    <small>Base: ${p.base}px | Scale: ${p.scale} | Width: ${p.width}px</small>
                </div>
                <div class="preset-btns">
                    <button class="preset-load" data-id="${p.id}">Load</button>
                    <button class="preset-del" data-id="${p.id}">×</button>
                </div>
            `;
            presetList.appendChild(item);
        });

        // Bind preset buttons
        presetList.querySelectorAll('.preset-load').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.getAttribute('data-id'), 10);
                const found = presets.find(x => x.id === id);
                if (found) {
                    baseFontSizeInput.value = found.base;
                    modularScaleSelect.value = found.scale;
                    baseLineHeightInput.value = found.lh;
                    contentWidthInput.value = found.width;
                    baselineGridSizeInput.value = found.grid;
                    fontFamilySelect.value = found.font;
                    updateTypography();
                    showToast(`Loaded preset: ${found.name}`);
                }
            });
        });

        presetList.querySelectorAll('.preset-del').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.getAttribute('data-id'), 10);
                presets = presets.filter(x => x.id !== id);
                localStorage.setItem('auravellum_presets', JSON.stringify(presets));
                renderPresets();
                showToast('Preset deleted');
            });
        });
    }

    if (savePresetBtn) {
        savePresetBtn.addEventListener('click', () => {
            const name = presetNameInput ? presetNameInput.value.trim() : '';
            if (!name) {
                showToast('Please enter a preset name');
                return;
            }

            const newPreset = {
                id: Date.now(),
                name: name,
                base: parseFloat(baseFontSizeInput.value),
                scale: parseFloat(modularScaleSelect.value),
                lh: parseFloat(baseLineHeightInput.value),
                width: parseInt(contentWidthInput.value, 10),
                grid: parseInt(baselineGridSizeInput.value, 10),
                font: fontFamilySelect.value
            };

            presets.push(newPreset);
            localStorage.setItem('auravellum_presets', JSON.stringify(presets));
            if (presetNameInput) presetNameInput.value = '';
            renderPresets();
            showToast(`Preset "${name}" saved!`);
        });
    }

    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    // Initial setup
    updateTypography();
    renderPresets();
});
