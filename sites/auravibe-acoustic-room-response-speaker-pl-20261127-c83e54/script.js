document.addEventListener('DOMContentLoaded', () => {
    // State Management
    const state = {
        length: 5.0,
        width: 4.0,
        height: 2.6,
        wallMaterial: 'drywall',
        speakerDistFront: 0.8,
        speakerSpread: 2.2,
        listenerDepth: 2.5,
        listenerX: 2.0,
        dragging: null // 'leftSpeaker', 'rightSpeaker', 'listener'
    };

    // DOM Elements
    const elLength = document.getElementById('roomLength');
    const elWidth = document.getElementById('roomWidth');
    const elHeight = document.getElementById('roomHeight');
    const elWallMat = document.getElementById('wallMaterial');
    const elSpkFront = document.getElementById('speakerDistFront');
    const elSpkSpread = document.getElementById('speakerSpread');
    const elListenerDepth = document.getElementById('listenerDepth');

    const valLength = document.getElementById('lengthVal');
    const valWidth = document.getElementById('widthVal');
    const valHeight = document.getElementById('heightVal');
    const valSpkFront = document.getElementById('spkFrontVal');
    const valSpkSpread = document.getElementById('spkSpreadVal');
    const valListenerDepth = document.getElementById('listenerDepthVal');

    const btnEquilateral = document.getElementById('btnEquilateral');
    const btnSavePreset = document.getElementById('btnSavePreset');
    const btnExport = document.getElementById('btnExport');
    const presetSelect = document.getElementById('presetSelect');

    const metricTriangle = document.getElementById('metricTriangle');
    const metricTriangleSub = document.getElementById('metricTriangleSub');
    const metricSBIR = document.getElementById('metricSBIR');
    const metricSchroeder = document.getElementById('metricSchroeder');
    const metricAbsorption = document.getElementById('metricAbsorption');
    const modesList = document.getElementById('modesList');

    const canvas = document.getElementById('roomCanvas');
    const ctx = canvas.getContext('2d');

    // Initialize listener X position centered
    state.listenerX = state.width / 2;

    // Event Listeners for UI Controls
    function bindInputs() {
        elLength.addEventListener('input', (e) => {
            state.length = parseFloat(e.target.value);
            valLength.textContent = state.length.toFixed(1);
            if (state.listenerDepth > state.length) {
                state.listenerDepth = state.length * 0.8;
                elListenerDepth.value = state.listenerDepth;
                valListenerDepth.textContent = state.listenerDepth.toFixed(2);
            }
            updateCalculations();
        });

        elWidth.addEventListener('input', (e) => {
            state.width = parseFloat(e.target.value);
            valWidth.textContent = state.width.toFixed(1);
            state.listenerX = state.width / 2;
            if (state.speakerSpread > state.width * 0.9) {
                state.speakerSpread = state.width * 0.8;
                elSpkSpread.value = state.speakerSpread;
                valSpkSpread.textContent = state.speakerSpread.toFixed(2);
            }
            updateCalculations();
        });

        elHeight.addEventListener('input', (e) => {
            state.height = parseFloat(e.target.value);
            valHeight.textContent = state.height.toFixed(1);
            updateCalculations();
        });

        elWallMat.addEventListener('change', (e) => {
            state.wallMaterial = e.target.value;
            updateCalculations();
        });

        elSpkFront.addEventListener('input', (e) => {
            state.speakerDistFront = parseFloat(e.target.value);
            valSpkFront.textContent = state.speakerDistFront.toFixed(2);
            updateCalculations();
        });

        elSpkSpread.addEventListener('input', (e) => {
            state.speakerSpread = parseFloat(e.target.value);
            valSpkSpread.textContent = state.speakerSpread.toFixed(2);
            updateCalculations();
        });

        elListenerDepth.addEventListener('input', (e) => {
            state.listenerDepth = parseFloat(e.target.value);
            valListenerDepth.textContent = state.listenerDepth.toFixed(2);
            updateCalculations();
        });

        btnEquilateral.addEventListener('click', () => {
            // 38% rule for listener depth, speaker spread equal to distance to listener
            state.listenerDepth = +(state.length * 0.38).toFixed(2);
            state.speakerSpread = +(state.listenerDepth * 0.9).toFixed(2);
            state.speakerDistFront = +(state.length * 0.15).toFixed(2);
            
            elListenerDepth.value = state.listenerDepth;
            valListenerDepth.textContent = state.listenerDepth.toFixed(2);
            elSpkSpread.value = state.speakerSpread;
            valSpkSpread.textContent = state.speakerSpread.toFixed(2);
            elSpkFront.value = state.speakerDistFront;
            valSpkFront.textContent = state.speakerDistFront.toFixed(2);
            
            state.listenerX = state.width / 2;
            updateCalculations();
        });

        btnSavePreset.addEventListener('click', savePreset);
        btnExport.addEventListener('click', exportJSON);
        presetSelect.addEventListener('change', loadPreset);

        loadPresetsList();
    }

    // Canvas Drag & Drop Interaction
    function getCanvasCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    function roomToCanvas(rx, ry, padding, scale) {
        return {
            cx: padding + rx * scale,
            cy: canvas.height - padding - ry * scale
        };
    }

    function canvasToRoom(cx, cy, padding, scale) {
        return {
            rx: (cx - padding) / scale,
            ry: (canvas.height - cy - padding) / scale
        };
    }

    function setupCanvasInteractions() {
        const padding = 50;
        const maxDim = Math.max(state.length, state.width);
        const scale = Math.min((canvas.width - padding * 2) / state.width, (canvas.height - padding * 2) / state.length);

        canvas.addEventListener('mousedown', (e) => {
            const pos = getCanvasCoordinates(e);
            const leftSpk = roomToCanvas(state.width/2 - state.speakerSpread/2, state.length - state.speakerDistFront, padding, scale);
            const rightSpk = roomToCanvas(state.width/2 + state.speakerSpread/2, state.length - state.speakerDistFront, padding, scale);
            const listener = roomToCanvas(state.listenerX, state.listenerDepth, padding, scale);

            const hitRadius = 20;
            if (Math.hypot(pos.x - leftSpk.cx, pos.y - leftSpk.cy) < hitRadius || Math.hypot(pos.x - rightSpk.cx, pos.y - rightSpk.cy) < hitRadius) {
                state.dragging = 'speakers';
            } else if (Math.hypot(pos.x - listener.cx, pos.y - listener.cy) < hitRadius) {
                state.dragging = 'listener';
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!state.dragging) return;
            const pos = getCanvasCoordinates(e);
            const roomPos = canvasToRoom(pos.x, pos.y, padding, scale);

            if (state.dragging === 'listener') {
                state.listenerX = Math.max(0.5, Math.min(state.width - 0.5, roomPos.rx));
                state.listenerDepth = Math.max(0.5, Math.min(state.length - 0.5, roomPos.ry));
                elListenerDepth.value = state.listenerDepth;
                valListenerDepth.textContent = state.listenerDepth.toFixed(2);
            } else if (state.dragging === 'speakers') {
                state.speakerDistFront = Math.max(0.1, Math.min(state.length - 0.5, state.length - roomPos.ry));
                state.speakerSpread = Math.max(0.5, Math.min(state.width - 0.5, Math.abs(roomPos.rx - state.width/2) * 2));
                elSpkFront.value = state.speakerDistFront;
                valSpkFront.textContent = state.speakerDistFront.toFixed(2);
                elSpkSpread.value = state.speakerSpread;
                valSpkSpread.textContent = state.speakerSpread.toFixed(2);
            }
            updateCalculations();
        });

        window.addEventListener('mouseup', () => {
            state.dragging = null;
        });
    }

    // Acoustic Math Calculations
    function updateCalculations() {
        const c = 343; // Speed of sound in m/s (20°C)
        
        // Speaker positions
        const leftSpkX = state.width / 2 - state.speakerSpread / 2;
        const leftSpkY = state.length - state.speakerDistFront;
        const rightSpkX = state.width / 2 + state.speakerSpread / 2;
        const rightSpkY = state.length - state.speakerDistFront;

        // Listener distance to speakers
        const distLeft = Math.hypot(state.listenerX - leftSpkX, state.listenerDepth - leftSpkY);
        const distRight = Math.hypot(state.listenerX - rightSpkX, state.listenerDepth - rightSpkY);
        const avgSpeakerDist = (distLeft + distRight) / 2;

        // Equilateral error check
        const triangleDiff = Math.abs(distLeft - state.speakerSpread) * 100;
        metricTriangle.textContent = `${triangleDiff.toFixed(1)} cm`;
        if (triangleDiff < 5) {
            metricTriangleSub.textContent = 'Excellent Equilateral Geometry';
            metricTriangle.style.color = 'var(--success)';
        } else {
            metricTriangleSub.textContent = 'Deviation from ideal 60° triangle';
            metricTriangle.style.color = 'var(--warning)';
        }

        // Primary SBIR Null Frequency (f = c / (4 * distance_to_boundary))
        const sbirFreq = c / (4 * state.speakerDistFront);
        metricSBIR.textContent = `${sbirFreq.toFixed(1)} Hz`;

        // Schroeder Frequency (approximate based on volume and RT60 estimate)
        const volume = state.length * state.width * state.height;
        let rt60 = state.wallMaterial === 'concrete' ? 0.6 : (state.wallMaterial === 'drywall' ? 0.45 : 0.25);
        const schroeder = 2000 * Math.sqrt(rt60 / volume);
        metricSchroeder.textContent = `${schroeder.toFixed(0)} Hz`;

        // Absorption / Reflection dB depth
        let absDepth = state.wallMaterial === 'concrete' ? '-18 dB' : (state.wallMaterial === 'drywall' ? '-12 dB' : '-6 dB');
        metricAbsorption.textContent = absDepth;

        // Axial Room Modes (f_n = n * c / (2 * dimension))
        renderModes(c);

        // Redraw Canvas
        drawRoom();
    }

    function renderModes(c) {
        modesList.innerHTML = '';
        const dimensions = [
            { name: 'Length', val: state.length },
            { name: 'Width', val: state.width },
            { name: 'Height', val: state.height }
        ];

        let modeHTML = '';
        dimensions.forEach(dim => {
            for (let n = 1; n <= 3; n++) {
                const freq = (n * c) / (2 * dim.val);
                if (freq < 300) {
                    modeHTML += `<div class="mode-row">
                        <span class="mode-axis">${dim.name} Mode (${n})</span>
                        <span>${freq.toFixed(1)} Hz</span>
                    </div>`;
                }
            }
        });
        modesList.innerHTML = modeHTML;
    }

    function drawRoom() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const padding = 50;
        const scale = Math.min((canvas.width - padding * 2) / state.width, (canvas.height - padding * 2) / state.length);

        const roomW = state.width * scale;
        const roomH = state.length * scale;
        const originX = padding;
        const originY = canvas.height - padding - roomH;

        // Room Background Grid
        ctx.fillStyle = '#121822';
        ctx.fillRect(originX, originY, roomW, roomH);

        // Grid lines (1m intervals)
        ctx.strokeStyle = '#202a3a';
        ctx.lineWidth = 1;
        for (let x = 0; x <= state.width; x += 1) {
            const cx = originX + x * scale;
            ctx.beginPath();
            ctx.moveTo(cx, originY);
            ctx.lineTo(cx, originY + roomH);
            ctx.stroke();
        }
        for (let y = 0; y <= state.length; y += 1) {
            const cy = originY + y * scale;
            ctx.beginPath();
            ctx.moveTo(originX, cy);
            ctx.lineTo(originX + roomW, cy);
            ctx.stroke();
        }

        // Room Boundary Border
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.strokeRect(originX, originY, roomW, roomH);

        // Acoustic symmetry line (Centerline)
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(originX + roomW / 2, originY);
        ctx.lineTo(originX + roomW / 2, originY + roomH);
        ctx.stroke();
        ctx.setLineDash([]);

        // Early reflection boundary points
        const leftSpkX = state.width / 2 - state.speakerSpread / 2;
        const leftSpkY = state.length - state.speakerDistFront;
        const rightSpkX = state.width / 2 + state.speakerSpread / 2;
        const rightSpkY = state.length - state.speakerDistFront;

        const lSpkC = roomToCanvas(leftSpkX, leftSpkY, padding, scale);
        const rSpkC = roomToCanvas(rightSpkX, rightSpkY, padding, scale);
        const listenerC = roomToCanvas(state.listenerX, state.listenerDepth, padding, scale);

        // Draw speaker-to-listener vectors (Stereo imaging lines)
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(lSpkC.cx, lSpkC.cy);
        ctx.lineTo(listenerC.cx, listenerC.cy);
        ctx.lineTo(rSpkC.cx, rSpkC.cy);
        ctx.stroke();

        // Draw Speakers
        [lSpkC, rSpkC].forEach(spk => {
            ctx.fillStyle = '#f43f5e';
            ctx.beginPath();
            ctx.arc(spk.cx, spk.cy, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        // Draw Listener Sweet Spot
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(listenerC.cx, listenerC.cy, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Preset Management (LocalStorage)
    function savePreset() {
        const name = prompt('Enter a name for this acoustic setup preset:', `Room ${state.length}x${state.width}m`);
        if (!name) return;
        const presets = JSON.parse(localStorage.getItem('auravibe_presets') || '{}');
        presets[name] = { ...state };
        localStorage.setItem('auravibe_presets', JSON.stringify(presets));
        loadPresetsList();
    }

    function loadPresetsList() {
        const presets = JSON.parse(localStorage.getItem('auravibe_presets') || '{}');
        presetSelect.innerHTML = '<option value="">-- Load Preset --</option>';
        Object.keys(presets).forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            presetSelect.appendChild(opt);
        });
    }

    function loadPreset(e) {
        const name = e.target.value;
        if (!name) return;
        const presets = JSON.parse(localStorage.getItem('auravibe_presets') || '{}');
        const p = presets[name];
        if (p) {
            Object.assign(state, p);
            elLength.value = state.length;
            valLength.textContent = state.length.toFixed(1);
            elWidth.value = state.width;
            valWidth.textContent = state.width.toFixed(1);
            elHeight.value = state.height;
            valHeight.textContent = state.height.toFixed(1);
            elWallMat.value = state.wallMaterial;
            elSpkFront.value = state.speakerDistFront;
            valSpkFront.textContent = state.speakerDistFront.toFixed(2);
            elSpkSpread.value = state.speakerSpread;
            valSpkSpread.textContent = state.speakerSpread.toFixed(2);
            elListenerDepth.value = state.listenerDepth;
            valListenerDepth.textContent = state.listenerDepth.toFixed(2);
            updateCalculations();
        }
    }

    function exportJSON() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "auravibe_acoustic_setup.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    }

    // Initialize App
    bindInputs();
    setupCanvasInteractions();
    updateCalculations();
});
