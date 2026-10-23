document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const baseSizeInput = document.getElementById('base-size');
    const baseSizeVal = document.getElementById('base-size-val');
    const scaleRatioSelect = document.getElementById('scale-ratio');
    const baseLineHeightInput = document.getElementById('base-line-height');
    const baseLineHeightVal = document.getElementById('base-line-height-val');
    const gridUnitInput = document.getElementById('grid-unit');
    const gridUnitVal = document.getElementById('grid-unit-val');
    const toggleGridCheckbox = document.getElementById('toggle-grid');
    const toggleSnappingCheckbox = document.getElementById('toggle-snapping');
    const gridOverlay = document.getElementById('baseline-grid-overlay');
    const scaleReadout = document.getElementById('scale-readout');
    const previewCanvas = document.getElementById('preview-canvas');
    const rhythmScore = document.getElementById('rhythm-score');
    
    const modeButtons = document.querySelectorAll('.mode-btn');
    const btnReset = document.getElementById('btn-reset');
    const btnExport = document.getElementById('btn-export');
    const exportModal = document.getElementById('export-modal');
    const closeModal = document.getElementById('close-modal');
    const btnCopyCode = document.getElementById('btn-copy-code');
    const cssCodeOutput = document.getElementById('css-code-output');

    // State
    let state = {
        baseSize: 16,
        scaleRatio: 1.200,
        baseLineHeight: 1.5,
        gridUnit: 4,
        showGrid: true,
        snapping: true,
        viewMode: 'desktop'
    };

    // Modular Scale Steps calculation (-2 to +5)
    function computeScaleValues() {
        const base = state.baseSize;
        const ratio = state.scaleRatio;
        return {
            'minus-2': Math.round((base / (ratio * ratio)) * 100) / 100,
            'minus-1': Math.round((base / ratio) * 100) / 100,
            '0': base,
            '1': Math.round((base * ratio) * 100) / 100,
            '2': Math.round((base * ratio * ratio) * 100) / 100,
            '3': Math.round((base * ratio * ratio * ratio) * 100) / 100,
            '4': Math.round((base * ratio * ratio * ratio * ratio) * 100) / 100,
            '5': Math.round((base * ratio * ratio * ratio * ratio * ratio) * 100) / 100,
        };
    }

    function updateUI() {
        // Update readouts
        baseSizeVal.textContent = `${state.baseSize}px`;
        baseLineHeightVal.textContent = state.baseLineHeight;
        gridUnitVal.textContent = `${state.gridUnit}px`;

        const scaleValues = computeScaleValues();

        // Set CSS Variables on document root for preview canvas
        const root = document.documentElement;
        root.style.setProperty('--computed-base-size', `${state.baseSize}px`);
        root.style.setProperty('--computed-line-height', state.baseLineHeight);
        
        for (const [key, val] of Object.entries(scaleValues)) {
            root.style.setProperty(`--step-${key}`, val);
        }

        // Update grid overlay size matching baseline rhythm
        const computedLineHeightPx = state.baseSize * state.baseLineHeight;
        gridOverlay.style.backgroundSize = `100% ${computedLineHeightPx}px`;
        gridOverlay.classList.toggle('active', state.showGrid);

        // Populate Scale Readout Sidebar
        scaleReadout.innerHTML = '';
        const stepNames = {
            'minus-2': 'Caption (-2)',
            'minus-1': 'Small (-1)',
            '0': 'Base (0)',
            '1': 'H4 (+1)',
            '2': 'H3 (+2)',
            '3': 'H2 (+3)',
            '4': 'Display 1 (+4)',
            '5': 'Display 2 (+5)'
        };

        for (const [key, val] of Object.entries(scaleValues)) {
            const item = document.createElement('div');
            item.className = 'scale-item';
            item.innerHTML = `
                <span class="scale-name">${stepNames[key] || key}</span>
                <span class="scale-value">${val}px</span>
            `;
            scaleReadout.appendChild(item);
        }

        // Vertical Rhythm Score calculation check
        // Perfect rhythm happens when computedLineHeightPx is a clean multiple of gridUnit
        const remainder = computedLineHeightPx % state.gridUnit;
        if (remainder < 0.1 || Math.abs(remainder - state.gridUnit) < 0.1) {
            rhythmScore.textContent = 'Vertical Rhythm: Perfect Grid Alignment';
            rhythmScore.style.color = 'var(--success)';
        } else {
            rhythmScore.textContent = `Vertical Rhythm: Off by ~${remainder.toFixed(1)}px`;
            rhythmScore.style.color = 'var(--accent)';
        }
    }

    // Event Listeners for Controls
    baseSizeInput.addEventListener('input', (e) => {
        state.baseSize = parseFloat(e.target.value);
        updateUI();
    });

    scaleRatioSelect.addEventListener('change', (e) => {
        state.scaleRatio = parseFloat(e.target.value);
        updateUI();
    });

    baseLineHeightInput.addEventListener('input', (e) => {
        state.baseLineHeight = parseFloat(e.target.value);
        updateUI();
    });

    gridUnitInput.addEventListener('input', (e) => {
        state.gridUnit = parseFloat(e.target.value);
        updateUI();
    });

    toggleGridCheckbox.addEventListener('change', (e) => {
        state.showGrid = e.target.checked;
        gridOverlay.classList.toggle('active', state.showGrid);
    });

    toggleSnappingCheckbox.addEventListener('change', (e) => {
        state.snapping = e.target.checked;
        previewCanvas.classList.toggle('snapped', state.snapping);
    });

    // Viewport Mode Switcher
    modeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            modeButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const mode = e.target.getAttribute('data-mode');
            previewCanvas.className = `preview-canvas ${mode}`;
            state.viewMode = mode;
        });
    });

    // Reset Defaults
    btnReset.addEventListener('click', () => {
        state = {
            baseSize: 16,
            scaleRatio: 1.200,
            baseLineHeight: 1.5,
            gridUnit: 4,
            showGrid: true,
            snapping: true,
            viewMode: 'desktop'
        };
        baseSizeInput.value = state.baseSize;
        scaleRatioSelect.value = state.scaleRatio;
        baseLineHeightInput.value = state.baseLineHeight;
        gridUnitInput.value = state.gridUnit;
        toggleGridCheckbox.checked = state.showGrid;
        toggleSnappingCheckbox.checked = state.snapping;
        
        modeButtons.forEach(b => b.classList.remove('active'));
        document.querySelector('[data-mode="desktop"]').classList.add('active');
        previewCanvas.className = 'preview-canvas desktop';
        
        updateUI();
    });

    // Export Modal Handling
    btnExport.addEventListener('click', () => {
        const scaleValues = computeScaleValues();
        const cssSnippet = `/* ZenithType Typography Tokens */
:root {
  --type-base: ${state.baseSize}px;
  --type-ratio: ${state.scaleRatio};
  --type-line-height: ${state.baseLineHeight};
  --grid-unit: ${state.gridUnit}px;

  /* Modular Scale Step Variables */
  --step--2: ${scaleValues['minus-2']}px;
  --step--1: ${scaleValues['minus-1']}px;
  --step-0: ${scaleValues['0']}px;
  --step-1: ${scaleValues['1']}px;
  --step-2: ${scaleValues['2']}px;
  --step-3: ${scaleValues['3']}px;
  --step-4: ${scaleValues['4']}px;
  --step-5: ${scaleValues['5']}px;
}`;

        cssCodeOutput.textContent = cssSnippet;
        exportModal.classList.add('active');
        exportModal.setAttribute('aria-hidden', 'false');
    });

    closeModal.addEventListener('click', () => {
        exportModal.classList.remove('active');
        exportModal.setAttribute('aria-hidden', 'true');
    });

    exportModal.addEventListener('click', (e) => {
        if (e.target === exportModal) {
            exportModal.classList.remove('active');
            exportModal.setAttribute('aria-hidden', 'true');
        }
    });

    btnCopyCode.addEventListener('click', () => {
        const textToCopy = cssCodeOutput.textContent;
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalText = btnCopyCode.textContent;
            btnCopyCode.textContent = 'Copied to Clipboard!';
            setTimeout(() => {
                btnCopyCode.textContent = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    });

    // Initial Render
    updateUI();
});
