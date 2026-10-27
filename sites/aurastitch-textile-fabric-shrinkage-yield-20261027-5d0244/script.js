document.addEventListener('DOMContentLoaded', () => {
    // Default Pattern Pieces State
    let patternPieces = [
        { id: 1, name: 'Bodice Front (2x)', length: 24, width: 16, count: 2 },
        { id: 2, name: 'Bodice Back (1x on fold)', length: 26, width: 22, count: 1 },
        { id: 3, name: 'Skirt Panels (4x)', length: 30, width: 25, count: 4 },
        { id: 4, name: 'Sleeves (2x)', length: 22, width: 14, count: 2 }
    ];

    // DOM Elements
    const fabricWidthInput = document.getElementById('fabric-width');
    const fabricCostInput = document.getElementById('fabric-cost');
    const shrinkageWarpInput = document.getElementById('shrinkage-warp');
    const shrinkageWeftInput = document.getElementById('shrinkage-weft');
    const patternMatchInput = document.getElementById('pattern-match-extra');
    const unitSystemSelect = document.getElementById('unit-system');
    
    const piecesListContainer = document.getElementById('pieces-list-container');
    const addPieceBtn = document.getElementById('add-piece-btn');
    const resetDefaultsBtn = document.getElementById('reset-defaults-btn');
    const printBtn = document.getElementById('print-btn');

    const metricArea = document.getElementById('metric-area');
    const metricYardage = document.getElementById('metric-yardage');
    const metricCost = document.getElementById('metric-cost');
    const breakdownList = document.getElementById('breakdown-list');
    
    const unitLabelWidths = document.querySelectorAll('.unit-label-width');
    const unitLengthLabels = document.querySelectorAll('.unit-label-length');
    const unitAreaLabel = document.getElementById('unit-area-label');
    const unitLengthLabel = document.getElementById('unit-length-label');
    const boltDimsText = document.getElementById('bolt-dimensions-text');
    const canvas = document.getElementById('layout-canvas');
    const ctx = canvas.getContext('2d');

    // Initialize App
    function init() {
        renderPiecesList();
        calculateAndRender();
        setupEventListeners();
    }

    function setupEventListeners() {
        [fabricWidthInput, fabricCostInput, shrinkageWarpInput, shrinkageWeftInput, patternMatchInput, unitSystemSelect].forEach(element => {
            element.addEventListener('input', () => {
                updateUnitLabels();
                calculateAndRender();
            });
        });

        addPieceBtn.addEventListener('click', () => {
            const newId = patternPieces.length > 0 ? Math.max(...patternPieces.map(p => p.id)) + 1 : 1;
            patternPieces.push({ id: newId, name: `Pattern Piece ${newId}`, length: 15, width: 12, count: 2 });
            renderPiecesList();
            calculateAndRender();
        });

        resetDefaultsBtn.addEventListener('click', () => {
            fabricWidthInput.value = 54;
            fabricCostInput.value = 14.50;
            shrinkageWarpInput.value = 5;
            shrinkageWeftInput.value = 2;
            patternMatchInput.value = 15;
            unitSystemSelect.value = 'imperial';
            patternPieces = [
                { id: 1, name: 'Bodice Front (2x)', length: 24, width: 16, count: 2 },
                { id: 2, name: 'Bodice Back (1x on fold)', length: 26, width: 22, count: 1 },
                { id: 3, name: 'Skirt Panels (4x)', length: 30, width: 25, count: 4 },
                { id: 4, name: 'Sleeves (2x)', length: 22, width: 14, count: 2 }
            ];
            updateUnitLabels();
            renderPiecesList();
            calculateAndRender();
        });

        printBtn.addEventListener('click', () => {
            window.print();
        });
    }

    function updateUnitLabels() {
        const isMetric = unitSystemSelect.value === 'metric';
        unitLabelWidths.forEach(el => el.textContent = isMetric ? 'cm' : 'in');
        unitLengthLabels.forEach(el => el.textContent = isMetric ? 'Meter' : 'Yard');
        unitAreaLabel.textContent = isMetric ? 'sq meters' : 'sq ft';
        unitLengthLabel.textContent = isMetric ? 'Meters' : 'Yards';
    }

    function renderPiecesList() {
        piecesListContainer.innerHTML = '';
        if (patternPieces.length === 0) {
            piecesListContainer.innerHTML = '<p class="hint">No pattern pieces added. Click "+ Add Piece" to begin.</p>';
            return;
        }

        patternPieces.forEach((piece, index) => {
            const card = document.createElement('div');
            card.className = 'piece-card';
            card.innerHTML = `
                <input type="text" value="${piece.name}" data-id="${piece.id}" data-field="name" placeholder="Piece Name">
                <input type="number" value="${piece.length}" min="1" step="0.5" data-id="${piece.id}" data-field="length" placeholder="Length">
                <input type="number" value="${piece.width}" min="1" step="0.5" data-id="${piece.id}" data-field="width" placeholder="Width">
                <input type="number" value="${piece.count}" min="1" step="1" data-id="${piece.id}" data-field="count" placeholder="Count">
                <button type="button" class="btn-icon-danger" data-id="${piece.id}" title="Remove Piece">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            `;
            piecesListContainer.appendChild(card);
        });

        // Bind inputs inside list
        piecesListContainer.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', (e) => {
                const id = parseInt(e.target.getAttribute('data-id'));
                const field = e.target.getAttribute('data-field');
                const piece = patternPieces.find(p => p.id === id);
                if (piece) {
                    if (field === 'name') {
                        piece.name = e.target.value;
                    } else {
                        const val = parseFloat(e.target.value);
                        piece[field] = isNaN(val) ? 0 : val;
                    }
                    calculateAndRender();
                }
            });
        });

        // Bind delete buttons
        piecesListContainer.querySelectorAll('.btn-icon-danger').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                patternPieces = patternPieces.filter(p => p.id !== id);
                renderPiecesList();
                calculateAndRender();
            });
        });
    }

    function calculateAndRender() {
        const isMetric = unitSystemSelect.value === 'metric';
        const fabWidth = parseFloat(fabricWidthInput.value) || 54;
        const fabCostPerUnit = parseFloat(fabricCostInput.value) || 0;
        const shrinkWarp = parseFloat(shrinkageWarpInput.value) || 0;
        const shrinkWeft = parseFloat(shrinkageWeftInput.value) || 0;
        const patternExtra = parseFloat(patternMatchInput.value) || 0;

        // Calculate unadjusted area
        let totalPieceAreaSqUnits = 0;
        let maxPieceWidth = 0;

        patternPieces.forEach(p => {
            const pieceArea = p.length * p.width * p.count;
            totalPieceAreaSqUnits += pieceArea;
            if (p.width > maxPieceWidth) maxPieceWidth = p.width;
        });

        // Factor in shrinkage (pre-treatment allowance means we need more fabric so garments fit after washing)
        // Shrinkage multiplier: e.g. 5% shrinkage means we need 100 / (100 - 5) factor or approx +5% length/width
        const warpFactor = 1 + (shrinkWarp / 100);
        const weftFactor = 1 + (shrinkWeft / 100);
        const matchFactor = 1 + (patternExtra / 100);

        // Convert to sq ft or sq meters for display
        let totalAreaDisplay = 0;
        let totalLengthNeeded = 0; // in inches or cm

        if (isMetric) {
            // Inputs in cm, output sq meters and meters
            totalAreaDisplay = (totalPieceAreaSqUnits / 10000) * warpFactor * weftFactor;
            // Linear estimate based on packing pieces along fabric width
            const effectiveWidth = fabWidth / weftFactor;
            let linearLengthCm = 0;
            patternPieces.forEach(p => {
                const adjustedPieceLen = p.length * warpFactor;
                const adjustedPieceWidth = p.width * weftFactor;
                // Simple nesting approximation
                const rows = Math.ceil(p.count / Math.max(1, Math.floor(fabWidth / adjustedPieceWidth)));
                linearLengthCm += adjustedPieceLen * rows;
            });
            linearLengthCm *= matchFactor;
            totalLengthNeeded = linearLengthCm / 100; // in meters
        } else {
            // Inputs in inches, output sq ft and yards
            totalAreaDisplay = (totalPieceAreaSqUnits / 144) * warpFactor * weftFactor;
            
            let linearLengthInches = 0;
            patternPieces.forEach(p => {
                const adjustedPieceLen = p.length * warpFactor;
                const adjustedPieceWidth = p.width * weftFactor;
                const fitCountPerRow = Math.max(1, Math.floor(fabWidth / adjustedPieceWidth));
                const rows = Math.ceil(p.count / fitCountPerRow);
                linearLengthInches += adjustedPieceLen * rows;
            });
            linearLengthInches *= matchFactor;
            totalLengthNeeded = linearLengthInches / 36; // in yards
        }

        // Minimum safety margin round up
        totalLengthNeeded = Math.ceil(totalLengthNeeded * 10) / 10;
        if (totalLengthNeeded < 0.25) totalLengthNeeded = 0.25;

        const estimatedTotalCost = totalLengthNeeded * fabCostPerUnit;

        // Update Metrics UI
        metricArea.textContent = totalAreaDisplay.toFixed(2);
        metricYardage.textContent = totalLengthNeeded.toFixed(1);
        metricCost.textContent = `$${estimatedTotalCost.toFixed(2)}`;

        // Update Breakdown List
        breakdownList.innerHTML = `
            <li><span>Raw Pattern Area</span><span>${totalAreaDisplay.toFixed(2)} ${isMetric ? 'm²' : 'sq ft'}</span></li>
            <li><span>Warp Allowance (+${shrinkWarp}%)</span><span>${(warpFactor).toFixed(2)}x Multiplier</span></li>
            <li><span>Weft Allowance (+${shrinkWeft}%)</span><span>${(weftFactor).toFixed(2)}x Multiplier</span></li>
            <li><span>Pattern Match / Nap (+${patternExtra}%)</span><span>${(matchFactor).toFixed(2)}x Multiplier</span></li>
            <li><span>Fabric Width Constraint</span><span>${fabWidth} ${isMetric ? 'cm' : 'in'}</span></li>
        `;

        boltDimsText.textContent = `Width: ${fabWidth}${isMetric ? 'cm' : 'in'} | Length: ${totalLengthNeeded} ${isMetric ? 'm' : 'yd'} | Shrinkage: W${shrinkWarp}% / L${shrinkWarp}%`;

        // Draw Layout Blueprint
        drawLayoutCanvas(fabWidth, totalLengthNeeded, isMetric);
    }

    function drawLayoutCanvas(fabWidth, totalLength, isMetric) {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        // Draw fabric bolt background
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(20, 20, w - 40, h - 40);
        
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 20, w - 40, h - 40);

        // Selvedge lines (dashed borders)
        ctx.strokeStyle = '#0f766e';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(20, 25);
        ctx.lineTo(w - 20, 25);
        ctx.moveTo(20, h - 25);
        ctx.lineTo(w - 20, h - 25);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw simulated nested pieces
        let cursorX = 30;
        let cursorY = 35;
        const maxHeightInRow = 60;

        ctx.font = '10px sans-serif';
        patternPieces.forEach((piece, idx) => {
            for (let i = 0; i < piece.count; i++) {
                const boxWidth = Math.min(50, Math.max(25, piece.width * 1.5));
                const boxHeight = Math.min(50, Math.max(25, piece.length * 1.5));

                if (cursorX + boxWidth > w - 30) {
                    cursorX = 30;
                    cursorY += maxHeightInRow + 10;
                }

                if (cursorY + boxHeight < h - 30) {
                    // Piece fill
                    ctx.fillStyle = idx % 2 === 0 ? 'rgba(15, 118, 110, 0.15)' : 'rgba(245, 158, 11, 0.15)';
                    ctx.fillRect(cursorX, cursorY, boxWidth, boxHeight);

                    ctx.strokeStyle = idx % 2 === 0 ? '#0f766e' : '#d97706';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(cursorX, cursorY, boxWidth, boxHeight);

                    // Label
                    ctx.fillStyle = '#1e293b';
                    ctx.fillText(piece.name.split(' ')[0], cursorX + 4, cursorY + 16);
                    
                    cursorX += boxWidth + 8;
                }
            }
        });

        // Draw grainline indicator arrow
        ctx.strokeStyle = '#64748b';
        ctx.fillStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(w - 45, h - 40);
        ctx.lineTo(w - 45, h - 15);
        ctx.stroke();
        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(w - 48, h - 18);
        ctx.lineTo(w - 45, h - 12);
        ctx.lineTo(w - 42, h - 18);
        ctx.fill();
        ctx.font = '9px sans-serif';
        ctx.fillText('GRAIN', w - 62, h - 25);
    }

    init();
});
