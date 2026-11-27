document.addEventListener('DOMContentLoaded', () => {
    // State Management
    const STORAGE_KEY = 'aura_forge_workspace_v1';
    
    let state = {
        tasks: [
            { id: '1', title: 'Complete project proposal draft', quadrant: 'q2', completed: false },
            { id: '2', title: 'Fix critical authentication bug', quadrant: 'q1', completed: false },
            { id: '3', title: 'Review team status updates', quadrant: 'q3', completed: true },
            { id: '4', title: 'Clean up desktop files', quadrant: 'q4', completed: false }
        ],
        timeBlocks: [
            { id: 'b1', title: 'Deep Work: Core Architecture', start: 9, duration: 2, category: 'deep-work' },
            { id: 'b2', title: 'Team Sync & Standup', start: 11, duration: 1, category: 'meeting' },
            { id: 'b3', title: 'Lunch & Walk', start: 12, duration: 1, category: 'break' }
        ]
    };

    // Load local storage if available
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            if (parsed && parsed.tasks && parsed.timeBlocks) {
                state = parsed;
            }
        } catch (e) {
            console.error('Failed to parse saved state:', e);
        }
    }

    function saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        renderAll();
    }

    // Navigation Tabs
    const navBtns = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab') + '-tab';
            
            navBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(t => t.classList.remove('active'));
            
            btn.classList.add('active');
            const targetEl = document.getElementById(targetTab);
            if (targetEl) {
                targetEl.classList.add('active');
                if (targetTab === 'analytics-tab') {
                    drawDistributionChart();
                }
            }
        });
    });

    // Task Form Handling
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskQuadrant = document.getElementById('task-quadrant');

    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = taskInput.value.trim();
        if (!title) return;

        const newTask = {
            id: 't_' + Date.now(),
            title: title,
            quadrant: taskQuadrant.value,
            completed: false
        };

        state.tasks.push(newTask);
        taskInput.value = '';
        saveState();
    });

    // Time Block Form Handling
    const blockForm = document.getElementById('block-form');
    const blockTitle = document.getElementById('block-title');
    const blockStart = document.getElementById('block-start');
    const blockDuration = document.getElementById('block-duration');
    const blockCategory = document.getElementById('block-category');

    blockForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = blockTitle.value.trim();
        if (!title) return;

        const startHour = parseInt(blockStart.value, 10);
        const durationHours = parseInt(blockDuration.value, 10);

        // Remove overlapping blocks in the same hours
        state.timeBlocks = state.timeBlocks.filter(b => {
            const bEnd = b.start + b.duration;
            const newEnd = startHour + durationHours;
            // Check for overlap
            return !(startHour < bEnd && newEnd > b.start);
        });

        const newBlock = {
            id: 'b_' + Date.now(),
            title: title,
            start: startHour,
            duration: durationHours,
            category: blockCategory.value
        };

        state.timeBlocks.push(newBlock);
        blockTitle.value = '';
        saveState();
    });

    // Render Functions
    function renderTasks() {
        ['q1', 'q2', 'q3', 'q4'].forEach(q => {
            const container = document.getElementById(`list-${q}`);
            if (!container) return;
            container.innerHTML = '';

            const qTasks = state.tasks.filter(t => t.quadrant === q);
            if (qTasks.length === 0) {
                container.innerHTML = '<p class="hint" style="font-size:0.85rem; text-align:center; padding:10px;">No tasks in this quadrant.</p>';
                return;
            }

            qTasks.forEach(task => {
                const item = document.createElement('div');
                item.className = `task-item ${task.completed ? 'completed' : ''}`;
                item.innerHTML = `
                    <div class="task-content">
                        <input type="checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}" class="task-toggle">
                        <span>${escapeHtml(task.title)}</span>
                    </div>
                    <div class="task-actions">
                        <button class="icon-btn delete" data-id="${task.id}" title="Delete Task">
                            &times;
                        </button>
                    </div>
                `;
                container.appendChild(item);
            });
        });

        // Bind task action listeners
        document.querySelectorAll('.task-toggle').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const id = e.target.getAttribute('data-id');
                const task = state.tasks.find(t => t.id === id);
                if (task) {
                    task.completed = e.target.checked;
                    saveState();
                }
            });
        });

        document.querySelectorAll('.task-item .delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                state.tasks = state.tasks.filter(t => t.id !== id);
                saveState();
            });
        });
    }

    function renderTimeline() {
        const container = document.getElementById('timeline-slots');
        if (!container) return;
        container.innerHTML = '';

        const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
        
        // Map hours to blocks occupying them
        hours.forEach(hour => {
            const slotDiv = document.createElement('div');
            slotDiv.className = 'time-slot';

            const timeLabel = document.createElement('div');
            timeLabel.className = 'time-label';
            timeLabel.textContent = formatHour(hour);
            slotDiv.appendChild(timeLabel);

            const contentDiv = document.createElement('div');
            contentDiv.className = 'time-content';

            // Find if any block starts at this hour or spans through
            const block = state.timeBlocks.find(b => hour >= b.start && hour < b.start + b.duration);
            
            if (block) {
                // Only render the pill on the starting hour for cleaner layout
                if (hour === block.start) {
                    const pill = document.createElement('div');
                    pill.className = `block-pill ${block.category}`;
                    pill.innerHTML = `
                        <span>${escapeHtml(block.title)} (${block.duration}h)</span>
                        <button class="icon-btn delete" data-id="${block.id}" title="Remove Block">&times;</button>
                    `;
                    contentDiv.appendChild(pill);
                } else {
                    contentDiv.innerHTML = `<span class="hint" style="font-size:0.8rem; font-style:italic;">↳ Continued from ${formatHour(block.start)}</span>`;
                }
            } else {
                contentDiv.innerHTML = `<span class="hint" style="font-size:0.8rem; opacity:0.4;">Available</span>`;
            }

            slotDiv.appendChild(contentDiv);
            container.appendChild(slotDiv);
        });

        // Bind block delete listeners
        document.querySelectorAll('.block-pill .delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                state.timeBlocks = state.timeBlocks.filter(b => b.id !== id);
                saveState();
            });
        });
    }

    function renderAnalytics() {
        const totalTasks = state.tasks.length;
        const completedTasks = state.tasks.filter(t => t.completed).length;
        const totalHours = state.timeBlocks.reduce((acc, b) => acc + b.duration, 0);
        const efficiency = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        document.getElementById('stat-total-tasks').textContent = totalTasks;
        document.getElementById('stat-completed-tasks').textContent = completedTasks;
        document.getElementById('stat-hours-scheduled').textContent = totalHours + 'h';
        document.getElementById('stat-efficiency').textContent = efficiency + '%';

        drawDistributionChart();
    }

    function drawDistributionChart() {
        const canvas = document.getElementById('distribution-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Tally hours by category
        const categories = { 'deep-work': 0, 'meeting': 0, 'admin': 0, 'break': 0 };
        state.timeBlocks.forEach(b => {
            if (categories[b.category] !== undefined) {
                categories[b.category] += b.duration;
            }
        });

        const total = Object.values(categories).reduce((a, b) => a + b, 0);
        const colors = {
            'deep-work': '#38bdf8',
            'meeting': '#f59e0b',
            'admin': '#64748b',
            'break': '#4ade80'
        };

        if (total === 0) {
            ctx.fillStyle = '#94a3b8';
            ctx.font = '14px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText('No time blocks scheduled yet.', canvas.width / 2, canvas.height / 2);
            return;
        }

        // Draw simple horizontal bar breakdown
        let currentX = 20;
        const barY = 80;
        const barHeight = 40;
        const maxBarWidth = canvas.width - 40;

        Object.keys(categories).forEach(cat => {
            const hours = categories[cat];
            if (hours === 0) return;

            const width = (hours / total) * maxBarWidth;
            
            ctx.fillStyle = colors[cat] || '#334155';
            ctx.fillRect(currentX, barY, width, barHeight);

            currentX += width;
        });

        // Draw legend
        let legendX = 20;
        const legendY = 150;
        ctx.font = '12px system-ui';
        ctx.textAlign = 'left';

        Object.keys(categories).forEach(cat => {
            const hours = categories[cat];
            ctx.fillStyle = colors[cat];
            ctx.fillRect(legendX, legendY, 12, 12);

            ctx.fillStyle = '#f8fafc';
            ctx.fillText(`${cat.replace('-', ' ')} (${hours}h)`, legendX + 18, legendY + 11);
            legendX += 100;
        });
    }

    function formatHour(hour) {
        const h = hour % 12 === 0 ? 12 : hour % 12;
        const ampm = hour >= 12 ? 'PM' : 'AM';
        return `${h.toString().padStart(2, '0')}:00 ${ampm}`;
    }

    function escapeHtml(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }

    // Import / Export / Reset
    document.getElementById('btn-export').addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute("href", dataStr);
        dlAnchor.setAttribute("download", `aura_forge_backup_${new Date().toISOString().slice(0,10)}.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
    });

    document.getElementById('import-file').addEventListener('change', (e) => {
        const fileReader = new FileReader();
        if (e.target.files[0]) {
            fileReader.readAsText(e.target.files[0], "UTF-8");
            fileReader.onload = (event) => {
                try {
                    const imported = JSON.parse(event.target.result);
                    if (imported && imported.tasks && imported.timeBlocks) {
                        state = imported;
                        saveState();
                        alert('Workspace successfully imported!');
                    } else {
                        alert('Invalid backup file format.');
                    }
                } catch (err) {
                    alert('Failed to parse JSON file.');
                }
            };
        }
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all tasks and time blocks?')) {
            state = { tasks: [], timeBlocks: [] };
            saveState();
        }
    });

    function renderAll() {
        renderTasks();
        renderTimeline();
        renderAnalytics();
    }

    // Initial Render
    renderAll();
});
