document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('flow-canvas');
    const ctx = canvas.getContext('2d');
    const wrapper = document.getElementById('canvas-wrapper');

    // State Management
    let nodes = [];
    let connections = [];
    let selectedNode = null;
    let activeTool = 'select'; // 'select' | 'connect'
    let connectingSource = null;
    
    // Viewport transforms
    let panX = 0;
    let panY = 0;
    let zoom = 1;
    let isPanning = false;
    let startPanX = 0;
    let startPanY = 0;

    // Dragging Nodes
    let draggingNode = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    // Simulation State
    let isSimulating = false;
    let simulationTimer = null;
    let activeSimulationNodeId = null;

    // DOM Elements
    const inspectorContent = document.getElementById('inspector-content');
    const simConsole = document.getElementById('sim-console');
    const statusNodes = document.getElementById('status-nodes');
    const statusConnections = document.getElementById('status-connections');
    const statusMode = document.getElementById('status-mode');

    function resizeCanvas() {
        canvas.width = wrapper.clientWidth;
        canvas.height = wrapper.clientHeight;
        draw();
    }

    window.addEventListener('resize', resizeCanvas);

    // Initialize default flow
    function initDefaultFlow() {
        nodes = [
            { id: 'node_1', type: 'start', title: 'Init System', x: 100, y: 150, width: 140, height: 60, payload: 'boot_ok' },
            { id: 'node_2', type: 'state', title: 'Idle Ready', x: 320, y: 150, width: 140, height: 60, payload: 'await_event' },
            { id: 'node_3', type: 'decision', title: 'Check Event', x: 560, y: 140, width: 140, height: 80, payload: 'isValid?' },
            { id: 'node_4', type: 'action', title: 'Process Data', x: 810, y: 80, width: 140, height: 60, payload: 'exec_job' },
            { id: 'node_5', type: 'end', title: 'Halt / Error', x: 810, y: 240, width: 140, height: 60, payload: 'error_exit' }
        ];
        connections = [
            { from: 'node_1', to: 'node_2', label: 'start' },
            { from: 'node_2', to: 'node_3', label: 'trigger' },
            { from: 'node_3', to: 'node_4', label: 'true' },
            { from: 'node_3', to: 'node_5', label: 'false' }
        ];
        updateStatus();
        draw();
    }

    // Coordinate transforms
    function screenToCanvas(screenX, screenY) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (screenX - rect.left - panX) / zoom,
            y: (screenY - rect.top - panY) / zoom
        };
    }

    // Render Loop
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(panX, panY);
        ctx.scale(zoom, zoom);

        // Draw Grid Pattern
        drawGrid();

        // Draw Connections
        connections.forEach(conn => {
            const source = nodes.find(n => n.id === conn.from);
            const target = nodes.find(n => n.id === conn.to);
            if (source && target) {
                drawConnection(source, target, conn.label);
            }
        });

        // Draw active connecting line preview
        if (connectingSource && currentMousePos) {
            const source = nodes.find(n => n.id === connectingSource);
            if (source) {
                drawPreviewConnection(source, currentMousePos);
            }
        }

        // Draw Nodes
        nodes.forEach(node => {
            drawNode(node);
        });

        ctx.restore();
    }

    function drawGrid() {
        const gridSize = 40;
        const left = -panX / zoom;
        const top = -panY / zoom;
        const right = left + canvas.width / zoom;
        const bottom = top + canvas.height / zoom;

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;

        const startX = Math.floor(left / gridSize) * gridSize;
        const startY = Math.floor(top / gridSize) * gridSize;

        ctx.beginPath();
        for (let x = startX; x < right; x += gridSize) {
            ctx.moveTo(x, top);
            ctx.lineTo(x, bottom);
        }
        for (let y = startY; y < bottom; y += gridSize) {
            ctx.moveTo(left, y);
            ctx.lineTo(right, y);
        }
        ctx.stroke();
    }

    function getNodeColor(type) {
        switch(type) {
            case 'start': return '#10b981';
            case 'state': return '#3b82f6';
            case 'decision': return '#f59e0b';
            case 'action': return '#8b5cf6';
            case 'end': return '#f43f5e';
            default: return '#3b82f6';
        }
    }

    function drawNode(node) {
        const isSelected = selectedNode && selectedNode.id === node.id;
        const isActiveSim = activeSimulationNodeId === node.id;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = isSelected || isActiveSim ? 12 : 6;
        ctx.shadowOffsetY = 3;

        // Node background shape
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = isActiveSim ? '#10b981' : (isSelected ? '#3b82f6' : '#334155');
        ctx.lineWidth = isSelected || isActiveSim ? 2.5 : 1;

        if (node.type === 'decision') {
            // Diamond shape
            ctx.beginPath();
            ctx.moveTo(node.x + node.width / 2, node.y);
            ctx.lineTo(node.x + node.width, node.y + node.height / 2);
            ctx.lineTo(node.x + node.width / 2, node.y + node.height);
            ctx.lineTo(node.x, node.y + node.height / 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (node.type === 'start' || node.type === 'end') {
            // Rounded pill shape
            const r = node.height / 2;
            ctx.beginPath();
            ctx.roundRect(node.x, node.y, node.width, node.height, r);
            ctx.fill();
            ctx.stroke();
        } else {
            // Standard rounded rectangle
            ctx.beginPath();
            ctx.roundRect(node.x, node.y, node.width, node.height, 8);
            ctx.fill();
            ctx.stroke();
        }

        ctx.restore();

        // Color indicator bar/dot
        const color = getNodeColor(node.type);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(node.x + 16, node.y + node.height / 2, 5, 0, Math.PI * 2);
        ctx.fill();

        // Text label
        ctx.fillStyle = '#f8fafc';
        ctx.font = '500 13px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        const textX = node.x + 30;
        const textMaxWidth = node.width - 40;
        ctx.fillText(node.title, textX, node.y + node.height / 2, textMaxWidth);
    }

    function drawConnection(source, target, label) {
        const startX = source.x + source.width / 2;
        const startY = source.y + source.height / 2;
        const endX = target.x + target.width / 2;
        const endY = target.y + target.height / 2;

        const dx = endX - startX;
        const dy = endY - startY;
        const angle = Math.atan2(dy, dx);

        // Offset endpoints to node borders approx
        const offset = 15;
        const fromX = startX + Math.cos(angle) * (source.width / 2);
        const fromY = startY + Math.sin(angle) * (source.height / 2);
        const toX = endX - Math.cos(angle) * (target.width / 2);
        const toY = endY - Math.sin(angle) * (target.height / 2);

        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        
        // Curvature
        const cpX = (fromX + toX) / 2;
        const cpY = (fromY + toY) / 2 - Math.abs(dx) * 0.1;
        ctx.quadraticCurveTo(cpX, cpY, toX, toY);
        ctx.stroke();

        // Arrowhead
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - 10 * Math.cos(angle - Math.PI / 6), toY - 10 * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - 10 * Math.cos(angle + Math.PI / 6), toY - 10 * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();

        // Label
        if (label) {
            ctx.fillStyle = '#94a3b8';
            ctx.font = '11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(label, cpX, cpY - 8);
        }
    }

    function drawPreviewConnection(source, targetPos) {
        const startX = source.x + source.width / 2;
        const startY = source.y + source.height / 2;
        
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(targetPos.x, targetPos.y);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    let currentMousePos = null;

    // Mouse Interactions
    canvas.addEventListener('mousedown', (e) => {
        const pos = screenToCanvas(e.clientX, e.clientY);

        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            // Pan mode
            isPanning = true;
            startPanX = e.clientX - panX;
            startPanY = e.clientY - panY;
            return;
        }

        // Find clicked node (reverse order for top-most)
        const clickedNode = [...nodes].reverse().find(node => {
            return pos.x >= node.x && pos.x <= node.x + node.width &&
                   pos.y >= node.y && pos.y <= node.y + node.height;
        });

        if (activeTool === 'connect') {
            if (clickedNode) {
                if (!connectingSource) {
                    connectingSource = clickedNode.id;
                    logToConsole(`Select target node to connect from '${clickedNode.title}'`, 'warning');
                } else if (connectingSource !== clickedNode.id) {
                    // Create connection
                    const exists = connections.some(c => c.from === connectingSource && c.to === clickedNode.id);
                    if (!exists) {
                        connections.push({ from: connectingSource, to: clickedNode.id, label: 'next' });
                        logToConsole(`Connected nodes successfully`, 'success');
                    }
                    connectingSource = null;
                    activeTool = 'select';
                    document.getElementById('tool-select').classList.add('active');
                    document.getElementById('tool-connect').classList.remove('active');
                    statusMode.textContent = 'Mode: Select / Edit';
                }
                updateStatus();
                draw();
            }
            return;
        }

        if (clickedNode) {
            selectedNode = clickedNode;
            draggingNode = clickedNode;
            dragOffsetX = pos.x - clickedNode.x;
            dragOffsetY = pos.y - clickedNode.y;
            renderInspector();
        } else {
            selectedNode = null;
            renderInspector();
            // Start canvas pan on empty space
            isPanning = true;
            startPanX = e.clientX - panX;
            startPanY = e.clientY - panY;
        }
        draw();
    });

    canvas.addEventListener('mousemove', (e) => {
        const pos = screenToCanvas(e.clientX, e.clientY);
        currentMousePos = pos;

        if (isPanning) {
            panX = e.clientX - startPanX;
            panY = e.clientY - startPanY;
            draw();
            return;
        }

        if (draggingNode) {
            draggingNode.x = pos.x - dragOffsetX;
            draggingNode.y = pos.y - dragOffsetY;
            draw();
            return;
        }

        if (connectingSource) {
            draw();
        }
    });

    window.addEventListener('mouseup', () => {
        isPanning = false;
        draggingNode = null;
    });

    // Zoom with wheel
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = 1.1;
        if (e.deltaY < 0) {
            zoom = Math.min(zoom * zoomFactor, 2.5);
        } else {
            zoom = Math.max(zoom / zoomFactor, 0.4);
        }
        draw();
    }, { passive: false });

    // Drag and Drop from Palette
    document.querySelectorAll('.palette-btn').forEach(btn => {
        btn.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', btn.dataset.type);
        });
    });

    wrapper.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    wrapper.addEventListener('drop', (e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('text/plain');
        if (!type) return;

        const pos = screenToCanvas(e.clientX, e.clientY);
        const newNode = {
            id: 'node_' + Date.now(),
            type: type,
            title: type.charAt(0).toUpperCase() + type.slice(1) + ' Node',
            x: pos.x - 70,
            y: pos.y - 30,
            width: 140,
            height: type === 'decision' ? 80 : 60,
            payload: 'default_payload'
        };

        nodes.push(newNode);
        selectedNode = newNode;
        renderInspector();
        updateStatus();
        draw();
        logToConsole(`Created new ${type} node`, 'success');
    });

    // Inspector Panel Rendering
    function renderInspector() {
        if (!selectedNode) {
            inspectorContent.innerHTML = `<p class="hint-text">Select any node on the canvas to configure its properties, triggers, and payload variables.</p>`;
            return;
        }

        inspectorContent.innerHTML = `
            <div class="form-group">
                <label>Node ID</label>
                <input type="text" class="form-input" value="${selectedNode.id}" disabled>
            </div>
            <div class="form-group">
                <label>Node Title</label>
                <input type="text" id="prop-title" class="form-input" value="${selectedNode.title}">
            </div>
            <div class="form-group">
                <label>Payload / Trigger Value</label>
                <input type="text" id="prop-payload" class="form-input" value="${selectedNode.payload}">
            </div>
            <button id="btn-delete-node" class="btn btn-danger" style="width: 100%; margin-top: 0.5rem;">Delete Node</button>
        `;

        document.getElementById('prop-title').addEventListener('input', (e) => {
            selectedNode.title = e.target.value;
            draw();
        });

        document.getElementById('prop-payload').addEventListener('input', (e) => {
            selectedNode.payload = e.target.value;
        });

        document.getElementById('btn-delete-node').addEventListener('click', () => {
            connections = connections.filter(c => c.from !== selectedNode.id && c.to !== selectedNode.id);
            nodes = nodes.filter(n => n.id !== selectedNode.id);
            selectedNode = null;
            renderInspector();
            updateStatus();
            draw();
            logToConsole('Deleted node and associated connections', 'warning');
        });
    }

    // Simulation Logic
    function toggleSimulation() {
        if (isSimulating) {
            stopSimulation();
        } else {
            startSimulation();
        }
    }

    function startSimulation() {
        const startNode = nodes.find(n => n.type === 'start');
        if (!startNode) {
            logToConsole('Simulation error: No Start State found on canvas.', 'error');
            return;
        }

        isSimulating = true;
        document.getElementById('btn-sim-toggle').innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg><span>Stop Simulation</span>`;
        simConsole.innerHTML = '';
        logToConsole('Simulation started from Start State...', 'success');

        activeSimulationNodeId = startNode.id;
        draw();

        simulationTimer = setInterval(() => {
            const currentConn = connections.find(c => c.from === activeSimulationNodeId);
            if (currentConn) {
                const nextNode = nodes.find(n => n.id === currentConn.to);
                if (nextNode) {
                    activeSimulationNodeId = nextNode.id;
                    logToConsole(`Transitioned to '${nextNode.title}' [Payload: ${nextNode.payload}]`, 'success');
                    draw();
                    if (nextNode.type === 'end') {
                        logToConsole('Reached End State. Simulation completed.', 'success');
                        stopSimulation();
                    }
                } else {
                    stopSimulation();
                }
            } else {
                logToConsole('Flow halted: No outbound connection from active state.', 'warning');
                stopSimulation();
            }
        }, 1500);
    }

    function stopSimulation() {
        isSimulating = false;
        clearInterval(simulationTimer);
        activeSimulationNodeId = null;
        document.getElementById('btn-sim-toggle').innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg><span>Run Simulation</span>`;
        draw();
    }

    function logToConsole(msg, type = 'info') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        simConsole.appendChild(entry);
        simConsole.scrollTop = simConsole.scrollHeight;
    }

    function updateStatus() {
        statusNodes.textContent = `Nodes: ${nodes.length}`;
        statusConnections.textContent = `Connections: ${connections.length}`;
    }

    // Toolbar controls
    document.getElementById('tool-select').addEventListener('click', () => {
        activeTool = 'select';
        connectingSource = null;
        document.getElementById('tool-select').classList.add('active');
        document.getElementById('tool-connect').classList.remove('active');
        statusMode.textContent = 'Mode: Select / Edit';
        draw();
    });

    document.getElementById('tool-connect').addEventListener('click', () => {
        activeTool = 'connect';
        document.getElementById('tool-connect').classList.add('active');
        document.getElementById('tool-select').classList.remove('active');
        statusMode.textContent = 'Mode: Connect Nodes';
        logToConsole('Connection Mode: Click source node then target node.', 'info');
    });

    document.getElementById('zoom-in').addEventListener('click', () => {
        zoom = Math.min(zoom * 1.2, 2.5);
        draw();
    });

    document.getElementById('zoom-out').addEventListener('click', () => {
        zoom = Math.max(zoom / 1.2, 0.4);
        draw();
    });

    document.getElementById('zoom-reset').addEventListener('click', () => {
        zoom = 1;
        panX = 0;
        panY = 0;
        draw();
    });

    document.getElementById('btn-sim-toggle').addEventListener('click', toggleSimulation);

    document.getElementById('btn-clear').addEventListener('click', () => {
        if (confirm('Clear entire flow canvas?')) {
            nodes = [];
            connections = [];
            selectedNode = null;
            renderInspector();
            updateStatus();
            draw();
            logToConsole('Cleared canvas workspace.', 'warning');
        }
    });

    // Export JSON
    document.getElementById('btn-export').addEventListener('click', () => {
        const data = { nodes, connections };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `auraflow-diagram-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        logToConsole('Exported flow diagram to JSON backup', 'success');
    });

    // Import JSON
    document.getElementById('file-import').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.nodes && data.connections) {
                    nodes = data.nodes;
                    connections = data.connections;
                    selectedNode = null;
                    renderInspector();
                    updateStatus();
                    draw();
                    logToConsole('Successfully imported flow diagram', 'success');
                } else {
                    alert('Invalid flow diagram JSON format.');
                }
            } catch (err) {
                alert('Error parsing JSON file.');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    // Initial setup
    initDefaultFlow();
    resizeCanvas();
});
