document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const bookWidthInput = document.getElementById('book-width');
    const bookHeightInput = document.getElementById('book-height');
    const pageCountInput = document.getElementById('page-count');
    const bindingStyleSelect = document.getElementById('binding-style');
    const paperWeightSelect = document.getElementById('paper-weight');
    const parentSheetSelect = document.getElementById('parent-sheet');
    const grainPrefSelect = document.getElementById('grain-pref');
    const signaturePagesSelect = document.getElementById('signature-pages');

    const metricBulk = document.getElementById('metric-bulk');
    const metricBulkMm = document.getElementById('metric-bulk-mm');
    const metricSigs = document.getElementById('metric-sigs');
    const metricSigsSub = document.getElementById('metric-sigs-sub');
    const metricSheets = document.getElementById('metric-sheets');
    const metricSheetsSub = document.getElementById('metric-sheets-sub');
    const metricWeight = document.getElementById('metric-weight');
    const metricWeightLbs = document.getElementById('metric-weight-lbs');

    const grainStatusBadge = document.getElementById('grain-status-badge');
    const grainExplanation = document.getElementById('grain-explanation');

    const specTrimmed = document.getElementById('spec-trimmed');
    const specParent = document.getElementById('spec-parent');
    const specUps = document.getElementById('spec-ups');
    const specThread = document.getElementById('spec-thread');
    const specBoard = document.getElementById('spec-board');
    const specGlue = document.getElementById('spec-glue');

    const resetBtn = document.getElementById('reset-btn');
    const exportBtn = document.getElementById('export-btn');
    const canvas = document.getElementById('schema-canvas');
    const ctx = canvas.getContext('2d');

    function calculateBookbinding() {
        const width = parseFloat(bookWidthInput.value) || 5.5;
        const height = parseFloat(bookHeightInput.value) || 8.5;
        const pages = parseInt(pageCountInput.value) || 128;
        const binding = bindingStyleSelect.value;
        const selectedOption = paperWeightSelect.options[paperWeightSelect.selectedIndex];
        const caliper = parseFloat(selectedOption.getAttribute('data-caliper')) || 0.0042;
        const gsm = parseInt(selectedOption.value) || 90;

        const parentOpt = parentSheetSelect.options[parentSheetSelect.selectedIndex];
        const parentW = parseFloat(parentOpt.getAttribute('data-w')) || 17;
        const parentH = parseFloat(parentOpt.getAttribute('data-h')) || 11;

        const grainPref = grainPrefSelect.value;
        const sigPagesVal = signaturePagesSelect.value;

        // 1. Spine Thickness (Bulk) calculation
        // Formula: Bulk = (Total Sheets / 2) * Caliper * Cover Factor
        const totalSheets = pages / 2;
        const bulkInches = totalSheets * caliper;
        const bulkMm = bulkInches * 25.4;

        metricBulk.textContent = `${bulkInches.toFixed(3)} in`;
        metricBulkMm.textContent = `${bulkMm.toFixed(1)} mm`;

        // 2. Signatures & Sheets calculation
        let pagesPerSig = sigPagesVal === 'single' ? 2 : parseInt(sigPagesVal);
        if (binding === 'saddle' || binding === 'stab') {
            pagesPerSig = pages; // Single pamphlet or full block
        }

        const numSignatures = Math.ceil(pages / pagesPerSig);
        metricSigs.textContent = numSignatures;
        metricSigsSub.textContent = binding === 'stab' ? 'Single block binding' : `${pagesPerSig} pages per signature`;

        // Imposition & Parent sheet yield check
        // Check how many finished book spreads fit on parent sheet
        // Book spread is (width * 2) x height
        const spreadW = width * 2;
        const spreadH = height;

        // Try normal orientation and rotated orientation
        let fitNormal = Math.floor(parentW / spreadW) * Math.floor(parentH / spreadH);
        let fitRotated = Math.floor(parentW / spreadH) * Math.floor(parentH / spreadW);
        let maxFit = Math.max(fitNormal, fitRotated);
        if (maxFit < 1) maxFit = 1; // fallback

        // Parent sheets required for job
        // Each signature sheet folded gives (maxFit * 2) pages or similar. Let's compute precisely:
        // A folded signature of N pages needs (N / 4) sheets of parent paper if 4 pages per sheet (standard folio/quart)
        const sheetsPerSig = sigPagesVal === 'single' ? 1 : Math.max(1, pagesPerSig / 4);
        const baseParentSheets = Math.ceil(numSignatures * sheetsPerSig);
        const totalWithWaste = Math.ceil(baseParentSheets * 1.10); // 10% waste buffer

        metricSheets.textContent = totalWithWaste;
        metricSheetsSub.textContent = `Includes 10% makeready buffer (${baseParentSheets} net)`;

        // 3. Weight calculation
        // Area of parent sheet in square meters
        const parentAreaSqM = (parentW * 0.0254) * (parentH * 0.0254);
        const sheetWeightGrams = parentAreaSqM * gsm;
        const totalGrams = sheetWeightGrams * totalWithWaste;
        const totalLbs = totalGrams * 0.00220462;

        metricWeight.textContent = totalGrams > 1000 ? `${(totalGrams / 1000).toFixed(2)} kg` : `${Math.round(totalGrams)} g`;
        metricWeightLbs.textContent = `${totalLbs.toFixed(2)} lbs`;

        // 4. Grain Direction Check
        // Grain should run parallel to the binding edge (spine) so pages turn smoothly.
        // Spine runs along 'height'. Thus grain should be parallel to height.
        let grainMatch = true;
        if (parentH < height || (parentW < spreadW && parentH < spreadW)) {
            grainMatch = false;
        }
        if (grainPref === 'perpendicular') {
            grainMatch = false;
        }

        if (grainMatch) {
            grainStatusBadge.className = 'badge badge-success';
            grainStatusBadge.innerHTML = '<span class="dot"></span> Grain Direction: Optimal (Parallel to Spine)';
            grainExplanation.innerHTML = `<strong>Grain Check:</strong> Parent sheet layout allows paper grain to run parallel to the spine. The book will open flat and pages will turn naturally without spring-back.`;
        } else {
            grainStatusBadge.className = 'badge badge-warning';
            grainStatusBadge.innerHTML = '<span class="dot"></span> Grain Direction: Cross-Grain Warning';
            grainExplanation.innerHTML = `<strong>Grain Check Warning:</strong> Parent sheet dimensions force paper grain perpendicular to the spine. Pages may resist opening and create cockling along the gutter. Consider rotating parent sheet or selecting a larger format.`;
        }

        // 5. Update Specs Card
        specTrimmed.textContent = `${spreadW.inch || spreadW}" x ${height}" (Spread)`;
        specParent.textContent = `${parentW}" x ${parentH}" (${parentOpt.text.split(' ')[0]})`;
        specUps.textContent = `${maxFit} spread(s) per parent sheet`;

        if (binding === 'case') {
            specThread.textContent = 'Linen Cord (No. 35 / Waxed) + Mull';
            specBoard.textContent = `${bulkInches > 0.5 ? '100pt' : '80pt'} Greyboard (2.0 mm)`;
            specGlue.textContent = 'PVA Neutral pH + PVA/Paste mix';
        } else if (binding === 'saddle') {
            specThread.textContent = 'No. 20 Bookbinding Staple or Waxed Thread';
            specBoard.textContent = 'Self-cover (No hardcover board)';
            specGlue.textContent = 'Optional Saddle Stitch Wire';
        } else if (binding === 'coptic') {
            specThread.textContent = 'Heavy Waxed Linen Thread (4-ply)';
            specBoard.textContent = 'Exposed Heavyweight Cover Board (1.5mm)';
            specGlue.textContent = 'None (Hand-sewn exposed binding)';
        } else {
            specThread.textContent = 'Waxed Cord / Embroidery Floss';
            specBoard.textContent = 'Double Cover Stock Panels';
            specGlue.textContent = 'Eyelet / Corner Reinforcement';
        }

        drawSchema(width, height, parentW, parentH, numSignatures, grainMatch);
    }

    function drawSchema(bookW, bookH, parentW, parentH, numSigs, grainOk) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const cw = canvas.width;
        const ch = canvas.height;

        // Draw background grid
        ctx.strokeStyle = '#263244';
        ctx.lineWidth = 1;
        const step = 20;
        for (let x = 0; x < cw; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, ch);
            ctx.stroke();
        }
        for (let y = 0; y < ch; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(cw, y);
            ctx.stroke();
        }

        // Draw parent sheet representation on left side
        const scaleP = Math.min(260 / parentW, 320 / parentH);
        const pDrawW = parentW * scaleP;
        const pDrawH = parentH * scaleP;
        const pX = 60;
        const pY = (ch - pDrawH) / 2;

        // Parent sheet fill
        ctx.fillStyle = '#1e2634';
        ctx.fillRect(pX, pY, pDrawW, pDrawH);
        ctx.strokeStyle = grainOk ? '#34d399' : '#f59e0b';
        ctx.lineWidth = 2;
        ctx.strokeRect(pX, pY, pDrawW, pDrawH);

        // Parent sheet label
        ctx.fillStyle = '#f0f4f8';
        ctx.font = 'bold 12px system-ui';
        ctx.fillText(`Parent Sheet (${parentW}" × ${parentH}")`, pX + 10, pY - 10);

        // Draw grain lines on parent sheet
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
        ctx.lineWidth = 1;
        for (let gx = pX + 20; gx < pX + pDrawW; gx += 25) {
            ctx.beginPath();
            ctx.moveTo(gx, pY);
            ctx.lineTo(gx, pY + pDrawH);
            ctx.stroke();
        }

        // Draw Signature Stack on right side
        const sigX = cw - 260;
        const sigY = ch / 2;

        ctx.fillStyle = '#f0f4f8';
        ctx.font = 'bold 12px system-ui';
        ctx.fillText(`Signature Stack (${numSigs} Signatures)`, sigX, sigY - 110);

        // Draw stacked book signatures with depth
        const stackW = 160;
        const sigHeight = 16;
        const totalStackH = numSigs * 5 + sigHeight;

        for (let i = 0; i < Math.min(numSigs, 12); i++) {
            const offsetY = i * 4;
            ctx.fillStyle = i % 2 === 0 ? '#252f42' : '#2e3b50';
            ctx.fillRect(sigX, sigY - 80 + offsetY, stackW, sigHeight);
            ctx.strokeStyle = '#475569';
            ctx.strokeRect(sigX, sigY - 80 + offsetY, stackW, sigHeight);

            // Spine stitch marks
            ctx.fillStyle = '#d97706';
            ctx.fillRect(sigX + 10, sigY - 80 + offsetY + 6, 6, 4);
            ctx.fillRect(sigX + stackW - 16, sigY - 80 + offsetY + 6, 6, 4);
        }

        if (numSigs > 12) {
            ctx.fillStyle = '#94a3b8';
            ctx.font = '11px system-ui';
            ctx.fillText(`+ ${numSigs - 12} more signatures in block`, sigX, sigY + 70);
        }

        // Center divider graphic
        ctx.strokeStyle = '#2e3b50';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cw / 2, 40);
        ctx.lineTo(cw / 2, ch - 40);
        ctx.stroke();

        // Legend
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px system-ui';
        ctx.fillText('1. Press Imposition & Grain', pX, ch - 15);
        ctx.fillText('2. Section Assembly', sigX, ch - 15);
    }

    // Event Listeners
    [bookWidthInput, bookHeightInput, pageCountInput, bindingStyleSelect, paperWeightSelect, parentSheetSelect, grainPrefSelect, signaturePagesSelect].forEach(element => {
        element.addEventListener('input', calculateBookbinding);
        element.addEventListener('change', calculateBookbinding);
    });

    resetBtn.addEventListener('click', () => {
        bookWidthInput.value = '5.5';
        bookHeightInput.value = '8.5';
        pageCountInput.value = '128';
        bindingStyleSelect.value = 'case';
        paperWeightSelect.value = '90';
        parentSheetSelect.value = 'tabloid';
        grainPrefSelect.value = 'parallel';
        signaturePagesSelect.value = '16';
        calculateBookbinding();
    });

    exportBtn.addEventListener('click', () => {
        const specs = {
            app: 'AuraVellum Bookbinding Laboratory',
            timestamp: new Date().toISOString(),
            book: {
                width: bookWidthInput.value,
                height: bookHeightInput.value,
                pageCount: pageCountInput.value,
                bindingStyle: bindingStyleSelect.value,
                paperGsm: paperWeightSelect.value,
                parentSheet: parentSheetSelect.value,
                signaturePages: signaturePagesSelect.value
            },
            results: {
                spineBulkInches: metricBulk.textContent,
                signaturesRequired: metricSigs.textContent,
                parentSheetsNeeded: metricSheets.textContent,
                totalWeight: metricWeight.textContent
            }
        };

        const blob = new Blob([JSON.stringify(specs, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'auravellum-project-spec.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Initial calculation on load
    calculateBookbinding();
});
