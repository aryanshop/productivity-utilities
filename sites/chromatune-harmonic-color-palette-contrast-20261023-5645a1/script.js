document.addEventListener('DOMContentLoaded', () => {
    // State Management
    let state = {
        baseColor: '#4f46e5',
        harmony: 'analogous',
        shadeCount: 5,
        visionFilter: 'normal',
        activeTab: 'css',
        palette: []
    };

    // DOM Elements
    const baseColorInput = document.getElementById('base-color-input');
    const baseColorText = document.getElementById('base-color-text');
    const harmonySelect = document.getElementById('harmony-select');
    const shadeCountRange = document.getElementById('shade-count-range');
    const shadeCountVal = document.getElementById('shade-count-val');
    const btnRandomize = document.getElementById('btn-randomize');
    const btnExport = document.getElementById('btn-export');
    const swatchContainer = document.getElementById('swatch-container');
    const paletteCountBadge = document.getElementById('palette-count-badge');
    const visionFilter = document.getElementById('vision-filter');
    const contrastTable = document.getElementById('contrast-table');
    
    // Sandbox UI elements
    const prevBadgeEl = document.getElementById('prev-badge-el');
    const prevBtnPrimary = document.getElementById('prev-btn-primary');
    const prevBtnSecondary = document.getElementById('prev-btn-secondary');
    const prevBannerEl = document.getElementById('prev-banner-el');

    // Modal Elements
    const exportModal = document.getElementById('export-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const codeOutput = document.getElementById('code-output');
    const btnCopyCode = document.getElementById('btn-copy-code');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const toast = document.getElementById('toast');

    // Color Conversion Utilities
    function hexToRgb(hex) {
        let cleanHex = hex.replace('#', '');
        if (cleanHex.length === 3) {
            cleanHex = cleanHex.split('').map(c => c + c).join('');
        }
        const num = parseInt(cleanHex, 16);
        return {
            r: (num >> 16) & 255,
            g: (num >> 8) & 255,
            b: num & 255
        };
    }

    function rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: h * 360, s: s * 100, l: l * 100 };
    }

    function hslToRgb(h, s, l) {
        h = ((h % 360) + 360) % 360;
        s /= 100; l /= 100;
        let c = (1 - Math.abs(2 * l - 1)) * s,
            x = c * (1 - Math.abs((h / 60) % 2 - 1)),
            m = l - c / 2,
            r = 0, g = 0, b = 0;

        if (0 <= h && h < 60) { r = c; g = x; b = 0; }
        else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
        else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
        else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
        else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
        else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

        return {
            r: (r + m) * 255,
            g: (g + m) * 255,
            b: (b + m) * 255
        };
    }

    function hslToHex(h, s, l) {
        const rgb = hslToRgb(h, s, l);
        return rgbToHex(rgb.r, rgb.g, rgb.b);
    }

    // Color Vision Deficiency Filters
    function applyVisionSimulation(hex, mode) {
        if (mode === 'normal') return hex;
        const rgb = hexToRgb(hex);
        let r = rgb.r, g = rgb.g, b = rgb.b;
        
        let rf = r, gf = g, bf = b;
        if (mode === 'protanopia') {
            rf = 0.56667 * r + 0.43333 * g + 0.0 * b;
            gf = 0.55833 * r + 0.44167 * g + 0.0 * b;
            bf = 0.0 * r + 0.24167 * g + 0.75833 * b;
        } else if (mode === 'deuteranopia') {
            rf = 0.625 * r + 0.375 * g + 0.0 * b;
            gf = 0.7 * r + 0.3 * g + 0.0 * b;
            bf = 0.0 * r + 0.3 * g + 0.7 * b;
        } else if (mode === 'tritanopia') {
            rf = 0.95 * r + 0.05 * g + 0.0 * b;
            gf = 0.0 * r + 0.43333 * g + 0.56667 * b;
            bf = 0.0 * r + 0.475 * g + 0.525 * b;
        } else if (mode === 'achromatopsia') {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            rf = gf = bf = gray;
        }
        return rgbToHex(rf, gf, bf);
    }

    // WCAG Luminance and Contrast Calculations
    function getLuminance(r, g, b) {
        const a = [r, g, b].map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }

    function getContrastRatio(hex1, hex2) {
        const rgb1 = hexToRgb(hex1);
        const rgb2 = hexToRgb(hex2);
        const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
        const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);
        return (brightest + 0.05) / (darkest + 0.05);
    }

    // Palette Generation Generator
    function generatePalette() {
        const rgb = hexToRgb(state.baseColor);
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        const count = state.shadeCount;
        const palette = [];

        let hues = [];
        switch (state.harmony) {
            case 'complementary':
                hues = [hsl.h, (hsl.h + 180) % 360];
                break;
            case 'analogous':
                hues = [(hsl.h - 30 + 360) % 360, hsl.h, (hsl.h + 30) % 360];
                break;
            case 'triadic':
                hues = [hsl.h, (hsl.h + 120) % 360, (hsl.h + 240) % 360];
                break;
            case 'split':
                hues = [hsl.h, (hsl.h + 150) % 360, (hsl.h + 210) % 360];
                break;
            case 'monochromatic':
                hues = [hsl.h];
                break;
        }

        // Generate varied shades/tones across the harmonious hues
        let index = 0;
        hues.forEach((h, hIdx) => {
            for (let i = 0; i < Math.ceil(count / hues.length); i++) {
                if (palette.length >= count) break;
                // Vary lightness based on step
                const lFactor = 15 + (i * (70 / Math.max(1, Math.ceil(count / hues.length) - 1)));
                const sFactor = Math.max(30, Math.min(95, hsl.s));
                const hex = hslToHex(h, sFactor, lFactor);
                
                let role = 'Primary';
                if (palette.length === 0) role = 'Base';
                else if (hIdx > 0) role = 'Harmonic ' + (hIdx + 1);
                else role = `Shade ${palette.length + 1}`;

                palette.push({
                    role: role,
                    hex: hex,
                    simulatedHex: applyVisionSimulation(hex, state.visionFilter)
                });
            }
        });

        state.palette = palette;
        renderPalette();
        renderContrastMatrix();
        updateSandbox();
    }

    // Render UI Elements
    function renderPalette() {
        swatchContainer.innerHTML = '';
        paletteCountBadge.textContent = `${state.palette.length} swatches`;

        state.palette.forEach((item, idx) => {
            const card = document.createElement('div');
            card.className = 'swatch-card';

            const colorBox = document.createElement('div');
            colorBox.className = 'swatch-color';
            colorBox.style.backgroundColor = item.simulatedHex;
            colorBox.title = 'Click to copy HEX';
            colorBox.addEventListener('click', () => {
                copyToClipboard(item.hex);
            });

            const info = document.createElement('div');
            info.className = 'swatch-info';
            
            const role = document.createElement('span');
            role.className = 'swatch-role';
            role.textContent = item.role;

            const hexText = document.createElement('span');
            hexText.className = 'swatch-hex';
            hexText.textContent = item.hex;

            info.appendChild(role);
            info.appendChild(hexText);

            card.appendChild(colorBox);
            card.appendChild(info);
            swatchContainer.appendChild(card);
        });
    }

    function renderContrastMatrix() {
        contrastTable.innerHTML = '';
        if (state.palette.length === 0) return;

        // Header row
        const thead = document.createElement('tr');
        const thCorner = document.createElement('th');
        thCorner.textContent = 'Text \ BG';
        thead.appendChild(thCorner);

        state.palette.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col.hex;
            th.style.color = col.hex;
            thead.appendChild(th);
        });
        contrastTable.appendChild(thead);

        // Rows
        state.palette.forEach(rowItem => {
            const tr = document.createElement('tr');
            const thRow = document.createElement('th');
            thRow.textContent = rowItem.hex;
            thRow.style.color = rowItem.hex;
            tr.appendChild(thRow);

            state.palette.forEach(colItem => {
                const td = document.createElement('td');
                const ratio = getContrastRatio(rowItem.hex, colItem.hex);
                const ratioFormatted = ratio.toFixed(1) + ':1';
                
                if (rowItem.hex === colItem.hex) {
                    td.textContent = '-';
                    td.style.color = 'var(--text-muted)';
                } else {
                    const span = document.createElement('div');
                    span.style.display = 'flex';
                    span.style.flexDirection = 'column';
                    span.style.gap = '0.2rem';
                    
                    const textRatio = document.createElement('span');
                    textRatio.textContent = ratioFormatted;
                    textRatio.style.fontWeight = '600';

                    const badge = document.createElement('span');
                    if (ratio >= 4.5) {
                        badge.className = 'pass-badge';
                        badge.textContent = 'WCAG AA';
                    } else {
                        badge.className = 'fail-badge';
                        badge.textContent = 'Fail';
                    }

                    span.appendChild(textRatio);
                    span.appendChild(badge);
                    td.appendChild(span);
                }
                tr.appendChild(td);
            });
            contrastTable.appendChild(tr);
        });
    }

    function updateSandbox() {
        if (state.palette.length === 0) return;
        const primary = state.palette[0].simulatedHex;
        const secondary = state.palette[1] ? state.palette[1].simulatedHex : primary;
        const accent = state.palette[2] ? state.palette[2].simulatedHex : primary;

        prevBadgeEl.style.backgroundColor = primary;
        prevBadgeEl.style.color = getContrastRatio(primary, '#ffffff') > 4.5 ? '#ffffff' : '#0f172a';
        
        prevBtnPrimary.style.backgroundColor = primary;
        prevBtnPrimary.style.color = getContrastRatio(primary, '#ffffff') > 4.5 ? '#ffffff' : '#0f172a';

        prevBtnSecondary.style.backgroundColor = secondary;
        prevBtnSecondary.style.color = getContrastRatio(secondary, '#ffffff') > 4.5 ? '#ffffff' : '#0f172a';

        prevBannerEl.style.backgroundColor = accent + '22';
        prevBannerEl.style.borderColor = accent;
        prevBannerEl.style.color = accent;
    }

    function copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                showToast(`Copied ${text} to clipboard!`);
            }).catch(() => {
                fallbackCopyText(text);
            });
        } else {
            fallbackCopyText(text);
        }
    }

    function fallbackCopyText(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
            document.execCommand('copy');
            showToast(`Copied ${text} to clipboard!`);
        } catch (err) {
            showToast('Failed to copy');
        }
        document.body.removeChild(textarea);
    }

    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    }

    // Event Listeners
    baseColorInput.addEventListener('input', (e) => {
        const val = e.target.value;
        baseColorText.value = val;
        state.baseColor = val;
        generatePalette();
    });

    baseColorText.addEventListener('input', (e) => {
        const val = e.target.value;
        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
            baseColorInput.value = val;
            state.baseColor = val;
            generatePalette();
        }
    });

    harmonySelect.addEventListener('change', (e) => {
        state.harmony = e.target.value;
        generatePalette();
    });

    shadeCountRange.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        shadeCountVal.textContent = val;
        state.shadeCount = val;
        generatePalette();
    });

    visionFilter.addEventListener('change', (e) => {
        state.visionFilter = e.target.value;
        generatePalette();
    });

    btnRandomize.addEventListener('click', () => {
        const randomHex = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
        baseColorInput.value = randomHex;
        baseColorText.value = randomHex;
        state.baseColor = randomHex;
        generatePalette();
    });

    // Export Modal Actions
    btnExport.addEventListener('click', () => {
        updateExportCode();
        exportModal.classList.add('active');
        exportModal.setAttribute('aria-hidden', 'false');
    });

    modalCloseBtn.addEventListener('click', () => {
        exportModal.classList.remove('active');
        exportModal.setAttribute('aria-hidden', 'true');
    });

    exportModal.addEventListener('click', (e) => {
        if (e.target === exportModal) {
            exportModal.classList.remove('active');
            exportModal.setAttribute('aria-hidden', 'true');
        }
    });

    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            tabBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.activeTab = e.target.getAttribute('data-tab');
            updateExportCode();
        });
    });

    function updateExportCode() {
        if (state.activeTab === 'css') {
            let css = ':root {
';
            state.palette.forEach((item, idx) => {
                const name = item.role.toLowerCase().replace(/\s+/g, '-');
                css += `  --chroma-${name}: ${item.hex};
`;
            });
            css += '}';
            codeOutput.textContent = css;
        } else {
            const jsonObj = {};
            state.palette.forEach(item => {
                jsonObj[item.role] = item.hex;
            });
            codeOutput.textContent = JSON.stringify(jsonObj, null, 2);
        }
    }

    btnCopyCode.addEventListener('click', () => {
        copyToClipboard(codeOutput.textContent);
    });

    // Initial Load
    generatePalette();
});
