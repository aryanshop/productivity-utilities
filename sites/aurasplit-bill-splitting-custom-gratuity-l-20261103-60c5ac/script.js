document.addEventListener('DOMContentLoaded', () => {
    // State Management
    let state = {
        billName: 'Friday Dinner with Friends',
        subtotal: 145.50,
        tax: 13.10,
        discount: 0.00,
        serviceFee: 0.00,
        tipMode: 'percent', // 'percent', 'flat', 'none'
        tipPercent: 20,
        tipFlat: 25.00,
        tipCalcBasis: 'subtotal', // 'subtotal', 'total'
        roundMode: 'none', // 'none', 'dollar', 'up'
        participants: [
            { id: 1, name: 'Alex M.', shares: 1, customItems: 0 },
            { id: 2, name: 'Jordan K.', shares: 1, customItems: 0 },
            { id: 3, name: 'Taylor S.', shares: 1, customItems: 0 },
            { id: 4, name: 'Morgan L.', shares: 1, customItems: 0 }
        ]
    };

    // DOM Elements
    const billNameInput = document.getElementById('bill-name');
    const billSubtotalInput = document.getElementById('bill-subtotal');
    const billTaxInput = document.getElementById('bill-tax');
    const discountAmountInput = document.getElementById('discount-amount');
    const serviceFeeInput = document.getElementById('service-fee');
    const tipModeControl = document.getElementById('tip-mode-control');
    const tipPercentWrapper = document.getElementById('tip-percent-wrapper');
    const tipFlatWrapper = document.getElementById('tip-flat-wrapper');
    const tipPresets = document.getElementById('tip-presets');
    const billTipPercentInput = document.getElementById('bill-tip-percent');
    const billTipFlatInput = document.getElementById('bill-tip-flat');
    const tipCalcBasisSelect = document.getElementById('tip-calc-basis');
    const roundModeSelect = document.getElementById('round-mode');
    
    const participantsListEl = document.getElementById('participants-list');
    const addPersonBtn = document.getElementById('add-person-btn');
    const quickAdd2Btn = document.getElementById('quick-add-2');
    const quickAdd4Btn = document.getElementById('quick-add-4');
    const resetDefaultsBtn = document.getElementById('reset-defaults');

    const resSubtotal = document.getElementById('res-subtotal');
    const resTax = document.getElementById('res-tax');
    const resDiscount = document.getElementById('res-discount');
    const resTip = document.getElementById('res-tip');
    const resGrandTotal = document.getElementById('res-grand-total');
    const individualResultsList = document.getElementById('individual-results-list');
    const copySummaryBtn = document.getElementById('copy-summary-btn');
    const saveSessionBtn = document.getElementById('save-session-btn');
    const copyFeedback = document.getElementById('copy-feedback');

    // Initialization
    function init() {
        loadFromLocalStorage();
        bindInputs();
        renderAll();
    }

    function bindInputs() {
        billNameInput.addEventListener('input', (e) => {
            state.billName = e.target.value;
        });

        billSubtotalInput.addEventListener('input', (e) => {
            state.subtotal = parseFloat(e.target.value) || 0;
            calculateAndRender();
        });

        billTaxInput.addEventListener('input', (e) => {
            state.tax = parseFloat(e.target.value) || 0;
            calculateAndRender();
        });

        discountAmountInput.addEventListener('input', (e) => {
            state.discount = parseFloat(e.target.value) || 0;
            calculateAndRender();
        });

        serviceFeeInput.addEventListener('input', (e) => {
            state.serviceFee = parseFloat(e.target.value) || 0;
            calculateAndRender();
        });

        // Tip Mode Segments
        tipModeControl.querySelectorAll('.seg-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                tipModeControl.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                state.tipMode = e.target.getAttribute('data-mode');
                
                if (state.tipMode === 'percent') {
                    tipPercentWrapper.style.display = 'flex';
                    tipFlatWrapper.style.display = 'none';
                } else if (state.tipMode === 'flat') {
                    tipPercentWrapper.style.display = 'none';
                    tipFlatWrapper.style.display = 'flex';
                } else {
                    tipPercentWrapper.style.display = 'none';
                    tipFlatWrapper.style.display = 'none';
                }
                calculateAndRender();
            });
        });

        // Tip Presets
        tipPresets.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                tipPresets.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const val = parseFloat(e.target.getAttribute('data-val'));
                state.tipPercent = val;
                billTipPercentInput.value = val;
                calculateAndRender();
            });
        });

        billTipPercentInput.addEventListener('input', (e) => {
            state.tipPercent = parseFloat(e.target.value) || 0;
            tipPresets.querySelectorAll('.preset-btn').forEach(b => {
                if (parseFloat(b.getAttribute('data-val')) === state.tipPercent) {
                    b.classList.add('active');
                } else {
                    b.classList.remove('active');
                }
            });
            calculateAndRender();
        });

        billTipFlatInput.addEventListener('input', (e) => {
            state.tipFlat = parseFloat(e.target.value) || 0;
            calculateAndRender();
        });

        tipCalcBasisSelect.addEventListener('change', (e) => {
            state.tipCalcBasis = e.target.value;
            calculateAndRender();
        });

        roundModeSelect.addEventListener('change', (e) => {
            state.roundMode = e.target.value;
            calculateAndRender();
        });

        // Add Person
        addPersonBtn.addEventListener('click', () => {
            const newId = state.participants.length > 0 ? Math.max(...state.participants.map(p => p.id)) + 1 : 1;
            const names = ['Sam', 'Alex', 'Chris', 'Pat', 'Jamie', 'Taylor', 'Jordan', 'Casey', 'Morgan'];
            const randomName = names[Math.floor(Math.random() * names.length)] + ' ' + String.fromCharCode(65 + Math.floor(Math.random() * 26)) + '.';
            state.participants.push({ id: newId, name: randomName, shares: 1, customItems: 0 });
            renderParticipants();
            calculateAndRender();
        });

        quickAdd2Btn.addEventListener('click', () => {
            for (let i = 0; i < 2; i++) {
                const newId = state.participants.length > 0 ? Math.max(...state.participants.map(p => p.id)) + 1 : 1;
                state.participants.push({ id: newId, name: `Guest ${newId}`, shares: 1, customItems: 0 });
            }
            renderParticipants();
            calculateAndRender();
        });

        quickAdd4Btn.addEventListener('click', () => {
            for (let i = 0; i < 4; i++) {
                const newId = state.participants.length > 0 ? Math.max(...state.participants.map(p => p.id)) + 1 : 1;
                state.participants.push({ id: newId, name: `Guest ${newId}`, shares: 1, customItems: 0 });
            }
            renderParticipants();
            calculateAndRender();
        });

        resetDefaultsBtn.addEventListener('click', () => {
            state = {
                billName: 'Friday Dinner with Friends',
                subtotal: 145.50,
                tax: 13.10,
                discount: 0.00,
                serviceFee: 0.00,
                tipMode: 'percent',
                tipPercent: 20,
                tipFlat: 25.00,
                tipCalcBasis: 'subtotal',
                roundMode: 'none',
                participants: [
                    { id: 1, name: 'Alex M.', shares: 1, customItems: 0 },
                    { id: 2, name: 'Jordan K.', shares: 1, customItems: 0 },
                    { id: 3, name: 'Taylor S.', shares: 1, customItems: 0 },
                    { id: 4, name: 'Morgan L.', shares: 1, customItems: 0 }
                ]
            };
            syncFormFromState();
            renderAll();
        });

        copySummaryBtn.addEventListener('click', () => {
            const text = generateReceiptText();
            navigator.clipboard.writeText(text).then(() => {
                copyFeedback.style.display = 'block';
                setTimeout(() => {
                    copyFeedback.style.display = 'none';
                }, 3000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        });

        saveSessionBtn.addEventListener('click', () => {
            saveToLocalStorage();
            saveSessionBtn.textContent = 'Saved!';
            setTimeout(() => {
                saveSessionBtn.textContent = 'Save Session';
            }, 2000);
        });
    }

    function syncFormFromState() {
        billNameInput.value = state.billName;
        billSubtotalInput.value = state.subtotal;
        billTaxInput.value = state.tax;
        discountAmountInput.value = state.discount;
        serviceFeeInput.value = state.serviceFee;
        billTipPercentInput.value = state.tipPercent;
        billTipFlatInput.value = state.tipFlat;
        tipCalcBasisSelect.value = state.tipCalcBasis;
        roundModeSelect.value = state.roundMode;

        tipModeControl.querySelectorAll('.seg-btn').forEach(b => {
            if (b.getAttribute('data-mode') === state.tipMode) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });

        if (state.tipMode === 'percent') {
            tipPercentWrapper.style.display = 'flex';
            tipFlatWrapper.style.display = 'none';
        } else if (state.tipMode === 'flat') {
            tipPercentWrapper.style.display = 'none';
            tipFlatWrapper.style.display = 'flex';
        } else {
            tipPercentWrapper.style.display = 'none';
            tipFlatWrapper.style.display = 'none';
        }
    }

    function renderAll() {
        renderParticipants();
        calculateAndRender();
    }

    function renderParticipants() {
        participantsListEl.innerHTML = '';
        state.participants.forEach((p, index) => {
            const card = document.createElement('div');
            card.className = 'participant-card';
            card.innerHTML = `
                <div class="participant-top">
                    <input type="text" class="participant-name-input" value="${escapeHtml(p.name)}" data-id="${p.id}" placeholder="Name">
                    <button type="button" class="icon-btn delete-person-btn" data-id="${p.id}" title="Remove person">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
                <div class="participant-controls">
                    <div class="control-subgroup">
                        <label>Shares</label>
                        <input type="number" class="participant-shares-input" value="${p.shares}" min="0.5" step="0.5" data-id="${p.id}">
                    </div>
                    <div class="control-subgroup">
                        <label>Custom Item ($)</label>
                        <input type="number" class="participant-custom-input" value="${p.customItems}" min="0" step="0.25" data-id="${p.id}">
                    </div>
                </div>
            `;
            participantsListEl.appendChild(card);
        });

        // Bind participant inputs
        participantsListEl.querySelectorAll('.participant-name-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const id = parseInt(e.target.getAttribute('data-id'));
                const person = state.participants.find(p => p.id === id);
                if (person) person.name = e.target.value;
                calculateAndRender(false); // avoid full redraw while typing name
            });
        });

        participantsListEl.querySelectorAll('.participant-shares-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const id = parseInt(e.target.getAttribute('data-id'));
                const person = state.participants.find(p => p.id === id);
                if (person) person.shares = parseFloat(e.target.value) || 0;
                calculateAndRender();
            });
        });

        participantsListEl.querySelectorAll('.participant-custom-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const id = parseInt(e.target.getAttribute('data-id'));
                const person = state.participants.find(p => p.id === id);
                if (person) person.customItems = parseFloat(e.target.value) || 0;
                calculateAndRender();
            });
        });

        participantsListEl.querySelectorAll('.delete-person-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                if (state.participants.length <= 1) {
                    alert('At least one participant is required.');
                    return;
                }
                state.participants = state.participants.filter(p => p.id !== id);
                renderParticipants();
                calculateAndRender();
            });
        });
    }

    function calculateAndRender() {
        const subtotal = state.subtotal;
        const tax = state.tax;
        const discount = state.discount;
        const serviceFee = state.serviceFee;

        // Calculate Tip
        let totalTip = 0;
        if (state.tipMode === 'percent') {
            const tipBase = state.tipCalcBasis === 'subtotal' ? subtotal : (subtotal + tax - discount + serviceFee);
            totalTip = Math.max(0, tipBase * (state.tipPercent / 100));
        } else if (state.tipMode === 'flat') {
            totalTip = Math.max(0, state.tipFlat);
        } else {
            totalTip = 0;
        }

        const netSubtotal = Math.max(0, subtotal - discount);
        const grandTotal = Math.max(0, netSubtotal + tax + serviceFee + totalTip);

        // Update summary view
        resSubtotal.textContent = `$${subtotal.toFixed(2)}`;
        resTax.textContent = `$${(tax + serviceFee).toFixed(2)}`;
        resDiscount.textContent = `-$${discount.toFixed(2)}`;
        resTip.textContent = `$${totalTip.toFixed(2)}`;
        resGrandTotal.textContent = `$${grandTotal.toFixed(2)}`;

        // Allocate split among participants
        // Step 1: Sum custom items
        const totalCustomItems = state.participants.reduce((sum, p) => sum + p.customItems, 0);
        const remainingSubtotalAfterCustom = Math.max(0, netSubtotal - totalCustomItems);

        // Step 2: Sum shares for remaining pool
        const totalShares = state.participants.reduce((sum, p) => sum + p.shares, 0);

        // Proportional multipliers for tax, fee, discount, tip relative to subtotal
        const taxFeeAndTip = tax + serviceFee + totalTip;
        const baseForProportional = netSubtotal > 0 ? netSubtotal : 1;

        let calculatedParticipants = state.participants.map(p => {
            let sharePortion = totalShares > 0 ? (p.shares / totalShares) * remainingSubtotalAfterCustom : 0;
            let pSubtotalShare = p.customItems + sharePortion;
            
            // Proportion of tax/fee/tip based on their share of net subtotal
            let proportion = pSubtotalShare / baseForProportional;
            let pTaxFeeTipShare = taxFeeAndTip * proportion;
            
            let rawTotal = pSubtotalShare + pTaxFeeTipShare;
            
            let finalTotal = rawTotal;
            if (state.roundMode === 'dollar') {
                finalTotal = Math.round(rawTotal);
            } else if (state.roundMode === 'up') {
                finalTotal = Math.ceil(rawTotal);
            }

            return {
                ...p,
                subtotalShare: pSubtotalShare,
                taxTipShare: pTaxFeeTipShare,
                rawTotal: rawTotal,
                finalTotal: finalTotal
            };
        });

        // Render individual breakdown
        individualResultsList.innerHTML = '';
        calculatedParticipants.forEach(p => {
            const card = document.createElement('div');
            card.className = 'individual-result-card';
            card.innerHTML = `
                <div class="individual-info">
                    <span class="ind-name">${escapeHtml(p.name)}</span>
                    <span class="ind-share">Shares: ${p.shares}${p.customItems > 0 ? ' + $' + p.customItems.toFixed(2) + ' custom' : ''}</span>
                </div>
                <div class="ind-total">$${p.finalTotal.toFixed(2)}</div>
            `;
            individualResultsList.appendChild(card);
        });
    }

    function generateReceiptText() {
        const subtotal = state.subtotal;
        const tax = state.tax;
        const discount = state.discount;
        const serviceFee = state.serviceFee;
        
        let totalTip = 0;
        if (state.tipMode === 'percent') {
            const tipBase = state.tipCalcBasis === 'subtotal' ? subtotal : (subtotal + tax - discount + serviceFee);
            totalTip = Math.max(0, tipBase * (state.tipPercent / 100));
        } else if (state.tipMode === 'flat') {
            totalTip = Math.max(0, state.tipFlat);
        }
        const netSubtotal = Math.max(0, subtotal - discount);
        const grandTotal = Math.max(0, netSubtotal + tax + serviceFee + totalTip);

        const totalCustomItems = state.participants.reduce((sum, p) => sum + p.customItems, 0);
        const remainingSubtotalAfterCustom = Math.max(0, netSubtotal - totalCustomItems);
        const totalShares = state.participants.reduce((sum, p) => sum + p.shares, 0);
        const taxFeeAndTip = tax + serviceFee + totalTip;
        const baseForProportional = netSubtotal > 0 ? netSubtotal : 1;

        let receiptLines = [];
        receiptLines.push(`=== ${state.billName.toUpperCase()} ===`);
        receiptLines.push(`Subtotal: $${subtotal.toFixed(2)}`);
        if (discount > 0) receiptLines.push(`Discount: -$${discount.toFixed(2)}`);
        if (tax > 0) receiptLines.push(`Tax: $${tax.toFixed(2)}`);
        if (serviceFee > 0) receiptLines.push(`Service Fee: $${serviceFee.toFixed(2)}`);
        receiptLines.push(`Gratuity: $${totalTip.toFixed(2)} (${state.tipMode === 'percent' ? state.tipPercent + '%' : 'Flat'})`);
        receiptLines.push(`Grand Total: $${grandTotal.toFixed(2)}`);
        receiptLines.push(`----------------------------------------`);
        receiptLines.push(`INDIVIDUAL SETTLEMENTS:`);

        state.participants.forEach(p => {
            let sharePortion = totalShares > 0 ? (p.shares / totalShares) * remainingSubtotalAfterCustom : 0;
            let pSubtotalShare = p.customItems + sharePortion;
            let proportion = pSubtotalShare / baseForProportional;
            let pTaxFeeTipShare = taxFeeAndTip * proportion;
            let rawTotal = pSubtotalShare + pTaxFeeTipShare;
            let finalTotal = rawTotal;
            if (state.roundMode === 'dollar') {
                finalTotal = Math.round(rawTotal);
            } else if (state.roundMode === 'up') {
                finalTotal = Math.ceil(rawTotal);
            }
            receiptLines.push(`- ${p.name}: $${finalTotal.toFixed(2)} (Shares: ${p.shares}${p.customItems > 0 ? ', Items: $' + p.customItems.toFixed(2) : ''})`);
        });

        receiptLines.push(`----------------------------------------`);
        receiptLines.push(`Generated by AuraSplit Lab`);
        return receiptLines.join('\n');
    }

    function saveToLocalStorage() {
        try {
            localStorage.setItem('aurasplit_session', JSON.stringify(state));
        } catch (e) {
            console.error('Could not save to localStorage', e);
        }
    }

    function loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('aurasplit_session');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && parsed.participants) {
                    state = parsed;
                    syncFormFromState();
                }
            }
        } catch (e) {
            console.error('Could not load from localStorage', e);
        }
    }

    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    init();
});
