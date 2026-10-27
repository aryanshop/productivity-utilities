document.addEventListener('DOMContentLoaded', () => {
    // State Management
    let state = {
        fabricWidth: 54, // inches
        unitSystem: 'yards',
        warpShrink: 5, // %
        weftShrink: 3, // %
        layoutExtra: 15, // %
        fabricCost: 12.50,
        pieces: [
            { id: 1, name: 'Bodice Front', qty: 2, length: 22, width: 16 },
            { id: 2, name: 'Bodice Back', qty: 1, length: 24, width: 18 },
            { id: 3, name: 'Sleeve', qty: 2, length: 26, width: 14 }
        ]
    };

    // DOM Elements
    const fabricWidthSelect = document.getElementById('fabric-width');
    const unitSystemSelect = document.getElementById('unit-system');
    const warpShrinkInput = document.getElementById('warp-shrink');
    const weftShrinkInput = document.getElementById('weft-shrink');
    const layoutExtraInput = document.getElementById('layout-extra');
    const fabricCostInput = document.getElementById('fabric-cost');
    
    const addPieceForm = document.getElementById('add-piece-form');
    const pieceNameInput = document.getElementById('piece-name');
    const pieceQtyInput = document.getElementById('piece-qty');
    const pieceLenInput = document.getElementById('piece-len');
    const pieceWdtInput = document.getElementById('piece-wdt');
    const pieceTbody = document.getElementById('piece-tbody');

    const resRawYards = document.getElementById('res-raw-yards');
    const resRawMeters = document.getElementById('res-raw-meters');
    const resBuyYards = document.getElementById('res-buy-yards');
    const resBuyMeters = document.getElementById('res-buy-meters');
    const resCost = document.getElementById('res-cost');
    const resArea = document.getElementById('res-area');
    const shrinkageAlert = document.getElementById('shrinkage-alert');

    const btnPresetShirt = document.getElementById('preset-shirt');
    const btnPresetTrousers = document.getElementById('preset-trousers');
    const btnPresetClear = document.getElementById('preset-clear');
    const btnExport = document.getElementById('btn-export');
    const btnPrint = document.getElementById('btn-print');
    const canvas = document.getElementById('layout-canvas');
    const ctx = canvas.getContext('2d');

    // Event Listeners for Controls
    fabricWidthSelect.addEventListener('change', (e) => {
        state.fabricWidth = parseFloat(e.target.value);
        calculateAndRender();
    });

    unitSystemSelect.addEventListener('change', (e) => {
        state.unitSystem = e.target.value;
        calculateAndRender();
    });

    warpShrinkInput.addEventListener('input', (e) => {
        state.warpShrink = parseFloat(e.target.value) || 0;
        calculateAndRender();
    });

    weftShrinkInput.addEventListener('input', (e) => {
        state.weftShrink = parseFloat(e.target.value) || 0;
        calculateAndRender();
    });

    layoutExtraInput.addEventListener('input', (e) => {
        state.layoutExtra = parseFloat(e.target.value) || 0;
        calculateAndRender();
    });

    fabricCostInput.addEventListener('input', (e) => {
        state.fabricCost = parseFloat(e.target.value) || 0;
        calculateAndRender();
    });

    // Add Piece Form Handler
    addPieceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = pieceNameInput.value.trim();
        const qty = parseInt(pieceQtyInput.value);
        const length = parseFloat(pieceLenInput.value);
        const width = parseFloat(pieceWdtInput.value);

        if (!name || isNaN(qty) || isNaN(length) || isNaN(width)) return;

        const newPiece = {
            id: Date.now(),
            name,
            qty,
            length,
            width
        };

        state.pieces.push(newPiece);
        pieceNameInput.value = '';
        pieceQtyInput.value = '1';
        calculateAndRender();
    });

    // Presets
    btnPresetShirt.addEventListener('click', () => {
        state.fabricWidth = 54;
        fabricWidthSelect.value = '54';
        state.pieces = [
            { id: 1, name: 'Shirt Front', qty: 2, length: 30, width: 18 },
            { id: 2, name: 'Shirt Back', qty: 1, length: 30, width: 22 },
            { id: 3, name: 'Sleeve', qty: 2, length: 25, width: 16 },
            { id: 4, name: 'Collar & Stand', qty: 2, length: 18, width: 5 }
        ];
        calculateAndRender();
    });

    btnPresetTrousers.addEventListener('click', () => {
        state.fabricWidth = 60;
        fabricWidthSelect.value = '60';
        state.pieces = [
            { id: 1, name: 'Front Leg', qty: 2, length: 42, width: 18 },
            { id: 2, name: 'Back Leg', qty: 2, length: 42, width: 22 },
            { id: 3, name: 'Waistband', qty: 1, length: 36, width: 5 },
            { id: 4, name: 'Pocket Facings', qty: 4, length: 8, width: 6 }
        ];
        calculateAndRender();
    });

    btnPresetClear.addEventListener('click', () => {
        state.pieces = [];
        calculateAndRender();
    });

    // Export and Print
    btnExport.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "aurastitch_project.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });

    btnPrint.addEventListener('click', () => {
        window.print();
    });

    // Delete piece helper attached to window or delegated
    window.removePiece = function(id) {
        state.pieces = state.pieces.filter(p => p.id !== id);
        calculateAndRender();
    };

    // Core Calculation & Rendering Logic
    function calculateAndRender() {
        renderPieceTable();

        // 1. Calculate total area of pieces in square inches
        let totalPieceAreaSqIn = 0;
        let maxPieceWidth = 0;
        let linearInchesEquivalent = 0;

        state.pieces.forEach(p => {
            const effectiveLength = p.length * (1 + state.warpShrink / 100);
            const effectiveWidth = p.width * (1 + state.weftShrink / 100);
            totalPieceAreaSqIn += (effectiveLength * effectiveWidth) * p.qty;
            if (p.width > maxPieceWidth) {
                maxPieceWidth = p.width;
            }

 সংস্করণ estimation using linear nesting approximation
            // We layout pieces sequentially along the fabric width
            linearInchesEquivalent += (effectiveLength * Math.ceil((p.width * p.qty) / state.fabricWidth));
        });

        // If pieces are small, estimate based on area packing + waste factor
        const usableWidth = state.fabricWidth * 0.90; // account for selvedge
        let rawInchesByArea = totalPieceAreaSqIn / usableWidth;
        
        // Take the maximum of sequential approximation or dense area packing
        let rawInches = Math.max(linearInchesEquivalent, rawInchesByArea);
        
        // Apply layout waste / pattern matching factor
        let totalInchesWithWaste = rawInches * (1 + state.layoutExtra / 100);
        
        let rawYards = totalInchesWithWaste / 36;
        let buyYards = Math.ceil(rawYards * 4) / 4; // Round up to nearest quarter yard
        if (buyYards < 0.25 && state.pieces.length > 0) buyYards = 0.25;

        let rawMeters = rawYards * 0.9144;
        let buyMeters = Math.ceil(rawMeters * 10) / 10;

        let estimatedCost = buyYards * state.fabricCost;
        let totalSqFt = (totalPieceAreaSqIn / 144).toFixed(1);

        // Update Metrics Display
        resRawYards.textContent = rawYards.toFixed(2) + ' yds';
        resRawMeters.textContent = rawMeters.toFixed(2) + ' m';
        
        resBuyYards.textContent = buyYards.toFixed(2) + ' yds';
        resBuyMeters.textContent = buyMeters.toFixed(2) + ' m';
        
        resCost.textContent = '$' + estimatedCost.toFixed(2);
        resArea.textContent = totalSqFt + ' sq ft pieces';

        // Shrinkage warning update
        shrinkageAlert.innerHTML = `<strong>Pre-Wash Advisory:</strong> With ${state.warpShrink}% warp and ${state.weftShrink}% weft shrinkage, washing fabric prior to cutting is strongly advised. Finished pieces account for added ease.`;

        drawLayoutCanvas(buyYards);
    }

    function renderPieceTable() {
        pieceTbody.innerHTML = '';
        if (state.pieces.length === 0) {
            pieceTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">No pieces added. Add pieces or load a preset.</td></tr>`;
            return;
        }

        state.pieces.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${escapeHtml(p.name)}</strong></td>
                <td>${p.qty}</td>
                <td>${p.length}" &times; ${p.width}"</td>
                <td><button type="button" class="btn btn-danger" onclick="removePiece(${p.id})">Remove</button></td>
            `;
            pieceTbody.appendChild(tr);
        });
    }

    function drawLayoutCanvas(totalYards) {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        // Draw Fabric Roll Background
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, w, h);

        // Fabric channel boundary
        const margin = 20;
        const fabricBoxWidth = w - (margin * 2);
        const fabricBoxHeight = h - (margin * 2);

        ctx.fillStyle = '#334155';
        ctx.fillRect(margin, margin, fabricBoxWidth, fabricBoxHeight);

        // Draw Selvedge lines (top and bottom border)
        ctx.strokeStyle = '#64748b';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(margin, margin);
        ctx.lineTo(w - margin, margin);
        ctx.moveTo(margin, h - margin);
        ctx.lineTo(w - margin, h - margin);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw simulated nested blocks representing cut pieces
        let currentX = margin + 10;
        let currentY = margin + 10;
        let rowHeight = 0;

        const scaleX = (fabricBoxWidth - 20) / Math.max(totalYards * 36, 100);

        state.pieces.forEach((p, idx) => {
            const boxW = Math.max(p.length * scaleX * 3, 25); // scaled length
            const boxH = Math.min(p.width * 2, fabricBoxHeight - 20);

            if (currentX + boxW > w - margin - 10) {
                currentX = margin + 10;
                currentY += rowHeight + 10;
                rowHeight = 0;
            }

            if (currentY + boxH < h - margin) {
                // Colors for pieces
                const colors = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899'];
                ctx.fillStyle = colors[idx % colors.length];
                ctx.fillRect(currentX, currentY, boxW, boxH);

                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.strokeRect(currentX, currentY, boxW, boxH);

                // Label piece
                ctx.fillStyle = '#ffffff';
                ctx.font = '10px sans-serif';
                if (boxW > 30) {
                    ctx.fillText(p.name.substring(0, 8), currentX + 4, currentY + 14);
                }

                currentX += boxW + 8;
                if (boxH > rowHeight) rowHeight = boxH;
            }
        });

        // Draw dimensions indicator on canvas
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px sans-serif';
        ctx.fillText(`Fabric Width: ${state.fabricWidth}" | Est. Length: ${(totalYards).toFixed(2)} yds`, margin, h - 6);
    }

    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    // Initial render
    calculateAndRender();
});
