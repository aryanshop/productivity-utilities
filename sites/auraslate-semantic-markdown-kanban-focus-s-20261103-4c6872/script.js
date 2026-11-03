/* AuraSlate: Semantic Markdown Kanban & Focus Sprint Board */

const COLUMNS = [
    { id: 'backlog', title: 'Backlog' },
    { id: 'todo', title: 'To Do' },
    { id: 'inprogress', title: 'In Progress' },
    { id: 'review', title: 'Review' },
    { id: 'done', title: 'Done' }
];

const STORAGE_KEY = 'auraslate_kanban_data_v1';

let state = {
    tasks: [],
    searchQuery: '',
    filterPriority: '',
    filterTag: ''
};

// Pomodoro Timer State
let timerState = {
    timeLeft: 25 * 60,
    isRunning: false,
    intervalId: null,
    mode: 'work' // work, break
};

// DOM Elements
const kanbanBoard = document.getElementById('kanbanBoard');
const searchInput = document.getElementById('searchInput');
const priorityFilter = document.getElementById('priorityFilter');
const tagFilter = document.getElementById('tagFilter');
const newCardBtn = document.getElementById('newCardBtn');
const taskModal = document.getElementById('taskModal');
const closeButton = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const taskForm = document.getElementById('taskForm');
const modalTitle = document.getElementById('modalTitle');
const taskIdInput = document.getElementById('taskId');
const taskTitleInput = document.getElementById('taskTitleInput');
const taskColumnSelect = document.getElementById('taskColumnSelect');
const taskPrioritySelect = document.getElementById('taskPrioritySelect');
const taskTagInput = document.getElementById('taskTagInput');
const taskContentInput = document.getElementById('taskContentInput');
const taskContentPreview = document.getElementById('taskContentPreview');
const toastNotification = document.getElementById('toastNotification');
const menuBtn = document.getElementById('menuBtn');
const dropdownMenu = document.getElementById('dropdownMenu');
const exportBtn = document.getElementById('exportBtn');
const importFile = document.getElementById('importFile');
const clearAllBtn = document.getElementById('clearAllBtn');

// Timer DOM
const timerLabel = document.getElementById('timerLabel');
const timerToggleBtn = document.getElementById('timerToggleBtn');
const timerResetBtn = document.getElementById('timerResetBtn');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    renderBoard();
    setupEventListeners();
    updateTagFilterOptions();
});

// Local Storage Functions
function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            state.tasks = JSON.parse(saved);
        } else {
            // Seed demo data
            state.tasks = [
                {
                    id: 'task-1',
                    title: 'Design system typography scale',
                    column: 'backlog',
                    priority: 'high',
                    tags: ['design', 'ui'],
                    content: '### Goals\n- Define modular typography scale\n- Ensure WCAG AA contrast compliance\n- Test with responsive viewports',
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'task-2',
                    title: 'Implement drag and drop Kanban',
                    column: 'inprogress',
                    priority: 'high',
                    tags: ['frontend', 'javascript'],
                    content: '- Use native HTML5 Drag and Drop API\n- Add visual drop indicators\n- Handle touch and desktop gracefully',
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'task-3',
                    title: 'Write project README and documentation',
                    column: 'done',
                    priority: 'medium',
                    tags: ['docs'],
                    content: 'Document local run instructions, features, and privacy guarantees.',
                    createdAt: new Date().toISOString()
                }
            ];
            saveData();
        }
    } catch (err) {
        console.error('Failed to load storage:', err);
        showToast('Error loading saved tasks.');
    }
}

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
        updateTagFilterOptions();
    } catch (err) {
        console.error('Failed to save storage:', err);
        showToast('Error saving data to local storage.');
    }
}

// Render Kanban Board
function renderBoard() {
    kanbanBoard.innerHTML = '';

    COLUMNS.forEach(col => {
        const columnEl = document.createElement('div');
        columnEl.className = 'kanban-column';
        columnEl.dataset.columnId = col.id;

        const filteredTasks = state.tasks.filter(task => {
            if (task.column !== col.id) return false;
            if (state.searchQuery) {
                const q = state.searchQuery.toLowerCase();
                const matchTitle = task.title.toLowerCase().includes(q);
                const matchContent = task.content.toLowerCase().includes(q);
                if (!matchTitle && !matchContent) return false;
            }
            if (state.filterPriority && task.priority !== state.filterPriority) {
                return false;
            }
            if (state.filterTag && !task.tags.includes(state.filterTag)) {
                return false;
            }
            return true;
        });

        columnEl.innerHTML = `
            <div class="column-header">
                <div class="column-title-wrap">
                    <span>${col.title}</span>
                    <span class="column-count">${filteredTasks.length}</span>
                </div>
                <button class="btn-icon add-in-col" data-column="${col.id}" title="Add task in ${col.title}">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
            </div>
            <div class="column-body" data-column-id="${col.id}">
            </div>
        `;

        const bodyEl = columnEl.querySelector('.column-body');
        if (filteredTasks.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'task-snippet';
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.padding = '20px 0';
            emptyMsg.textContent = 'No tasks';
            bodyEl.appendChild(emptyMsg);
        } else {
            filteredTasks.forEach(task => {
                const cardEl = createTaskCardElement(task);
                bodyEl.appendChild(cardEl);
            });
        }

        // Drag and drop event listeners for column body
        bodyEl.addEventListener('dragover', e => {
            e.preventDefault();
            columnEl.classList.add('drag-over');
        });

        bodyEl.addEventListener('dragleave', () => {
            columnEl.classList.remove('drag-over');
        });

        bodyEl.addEventListener('drop', e => {
            e.preventDefault();
            columnEl.classList.remove('drag-over');
            const taskId = e.dataTransfer.getData('text/plain');
            if (taskId) {
                moveTask(taskId, col.id);
            }
        });

        kanbanBoard.appendChild(columnEl);
    });

    // Attach column specific add button handlers
    document.querySelectorAll('.add-in-col').forEach(btn => {
        btn.addEventListener('click', () => {
            openModalForCreate(btn.dataset.column);
        });
    });
}

function createTaskCardElement(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.draggable = true;
    card.dataset.taskId = task.id;

    card.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', task.id);
        setTimeout(() => card.classList.add('dragging'), 0);
    });

    card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
    });

    // Click card to edit
    card.addEventListener('click', e => {
        if (e.target.closest('button')) return; // ignore action buttons
        openModalForEdit(task.id);
    });

    const tagsHtml = task.tags.map(tag => `<span class="task-tag">#${tag}</span>`).join('');
    const dateStr = new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    card.innerHTML = `
        <div class="task-card-header">
            <div class="task-title">${escapeHtml(task.title)}</div>
            <div class="task-priority-indicator priority-${task.priority}" title="Priority: ${task.priority}"></div>
        </div>
        ${task.content ? `<div class="task-snippet">${escapeHtml(getSnippet(task.content))}</div>` : ''}
        ${tagsHtml ? `<div class="task-tags">${tagsHtml}</div>` : ''}
        <div class="task-footer">
            <span class="task-date">${dateStr}</span>
            <div class="task-actions">
                <button class="btn-icon delete-task" data-id="${task.id}" title="Delete Task">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        </div>
    `;

    card.querySelector('.delete-task').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTask(task.id);
    });

    return card;
}

// Task Operations
function moveTask(taskId, newColumn) {
    const task = state.tasks.find(t => t.id === taskId);
    if (task && task.column !== newColumn) {
        task.column = newColumn;
        saveData();
        renderBoard();
        showToast(`Moved to ${getColumnTitle(newColumn)}`);
    }
}

function deleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
        state.tasks = state.tasks.filter(t => t.id !== taskId);
        saveData();
        renderBoard();
        showToast('Task deleted');
    }
}

function getColumnTitle(colId) {
    const col = COLUMNS.find(c => c.id === colId);
    return col ? col.title : colId;
}

function getSnippet(markdown) {
    // Strip markdown symbols for clean snippet
    return markdown.replace(/[#*`_\-\[\]()]/g, '').trim();
}

function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Simple Markdown Parser for Preview
function parseMarkdown(md) {
    if (!md) return '<p style="color: var(--text-muted);">No content</p>';
    let html = escapeHtml(md);
    
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Bold & Italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Bullet lists
    html = html.replace(/^- (.*$)/gim, '<ul><li>$1</li></ul>');
    // Fix nested ul duplicates
    html = html.replace(/<\/ul>\s*<ul>/gim, '');

    // Line breaks
    html = html.replace(/\n/g, '<br>');
    return html;
}

// Modal Controls
function openModalForCreate(columnId = 'backlog') {
    modalTitle.textContent = 'Create New Task';
    taskIdInput.value = '';
    taskTitleInput.value = '';
    taskColumnSelect.value = columnId;
    taskPrioritySelect.value = 'medium';
    taskTagInput.value = '';
    taskContentInput.value = '';
    taskContentPreview.innerHTML = '';
    switchTab('write');
    taskModal.classList.add('show');
    taskTitleInput.focus();
}

function openModalForEdit(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    modalTitle.textContent = 'Edit Task';
    taskIdInput.value = task.id;
    taskTitleInput.value = task.title;
    taskColumnSelect.value = task.column;
    taskPrioritySelect.value = task.priority;
    taskTagInput.value = task.tags.join(', ');
    taskContentInput.value = task.content;
    taskContentPreview.innerHTML = parseMarkdown(task.content);
    switchTab('write');
    taskModal.classList.add('show');
    taskTitleInput.focus();
}

function closeModal() {
    taskModal.classList.remove('show');
}

function switchTab(tabName) {
    const writeBtn = document.querySelector('[data-tab="write"]');
    const previewBtn = document.querySelector('[data-tab="preview"]');
    
    if (tabName === 'write') {
        writeBtn.classList.add('active');
        previewBtn.classList.remove('active');
        taskContentInput.style.display = 'block';
        taskContentPreview.style.display = 'none';
    } else {
        previewBtn.classList.add('active');
        writeBtn.classList.remove('active');
        taskContentInput.style.display = 'none';
        taskContentPreview.style.display = 'block';
        taskContentPreview.innerHTML = parseMarkdown(taskContentInput.value);
    }
}

// Tag Filter Options
function updateTagFilterOptions() {
    const allTags = new Set();
    state.tasks.forEach(t => t.tags.forEach(tag => allTags.add(tag)));
    
    const currentVal = tagFilter.value;
    tagFilter.innerHTML = '<option value="">All Tags</option>';
    allTags.forEach(tag => {
        const opt = document.createElement('option');
        opt.value = tag;
        opt.textContent = `#${tag}`;
        tagFilter.appendChild(opt);
    });
    tagFilter.value = currentVal;
}

// Pomodoro Timer Logic
function updateTimerDisplay() {
    const mins = Math.floor(timerState.timeLeft / 60);
    const secs = timerState.timeLeft % 60;
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    timerLabel.textContent = `${timerState.mode === 'work' ? 'Focus' : 'Break'}: ${timeStr}`;
    document.title = `(${timeStr}) AuraSlate`;
}

function toggleTimer() {
    if (timerState.isRunning) {
        clearInterval(timerState.intervalId);
        timerState.isRunning = false;
        timerToggleBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
        showToast('Sprint paused');
    } else {
        timerState.isRunning = true;
        timerToggleBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
        showToast(timerState.mode === 'work' ? 'Focus sprint started!' : 'Break started!');
        
        timerState.intervalId = setInterval(() => {
            if (timerState.timeLeft > 0) {
                timerState.timeLeft--;
                updateTimerDisplay();
            } else {
                clearInterval(timerState.intervalId);
                timerState.isRunning = false;
                timerToggleBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
                
                if (timerState.mode === 'work') {
                    showToast('Focus session complete! Take a 5 min break.');
                    timerState.mode = 'break';
                    timerState.timeLeft = 5 * 60;
                } else {
                    showToast('Break over! Ready for next sprint?');
                    timerState.mode = 'work';
                    timerState.timeLeft = 25 * 60;
                }
                updateTimerDisplay();
            }
        }, 1000);
    }
}

function resetTimer() {
    clearInterval(timerState.intervalId);
    timerState.isRunning = false;
    timerState.mode = 'work';
    timerState.timeLeft = 25 * 60;
    timerToggleBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
    updateTimerDisplay();
    showToast('Timer reset to 25:00');
}

// Toast Notification Helper
function showToast(message) {
    toastNotification.textContent = message;
    toastNotification.classList.add('show');
    setTimeout(() => {
        toastNotification.classList.remove('show');
    }, 3000);
}

// Event Listeners Setup
function setupEventListeners() {
    newCardBtn.addEventListener('click', () => openModalForCreate('backlog'));
    closeButton.addEventListener('click', closeModal);
    cancelModalBtn.addEventListener('click', closeModal);

    // Click outside modal to close
    taskModal.addEventListener('click', (e) => {
        if (e.target === taskModal) closeModal();
    });

    // Tab switching in modal
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });

    // Task Form Submit
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = taskIdInput.value;
        const title = taskTitleInput.value.trim();
        const column = taskColumnSelect.value;
        const priority = taskPrioritySelect.value;
        const tagsRaw = taskTagInput.value;
        const content = taskContentInput.value;

        const tags = tagsRaw
            .split(',')
            .map(t => t.trim().toLowerCase().replace(/^#/, ''))
            .filter(t => t.length > 0);

        if (!title) return;

        if (id) {
            // Edit existing
            const task = state.tasks.find(t => t.id === id);
            if (task) {
                task.title = title;
                task.column = column;
                task.priority = priority;
                task.tags = tags;
                task.content = content;
                showToast('Task updated successfully');
            }
        } else {
            // Create new
            const newTask = {
                id: 'task-' + Date.now(),
                title,
                column,
                priority,
                tags,
                content,
                createdAt: new Date().toISOString()
            };
            state.tasks.push(newTask);
            showToast('Task created successfully');
        }

        saveData();
        renderBoard();
        closeModal();
    });

    // Search & Filter listeners
    searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderBoard();
    });

    priorityFilter.addEventListener('change', (e) => {
        state.filterPriority = e.target.value;
        renderBoard();
    });

    tagFilter.addEventListener('change', (e) => {
        state.filterTag = e.target.value;
        renderBoard();
    });

    // Dropdown menu toggle
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });

    document.addEventListener('click', () => {
        dropdownMenu.classList.remove('show');
    });

    // Export JSON Backup
    exportBtn.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.tasks, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `auraslate_backup_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showToast('Exported workspace backup successfully');
    });

    // Import JSON Backup
    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const importedTasks = JSON.parse(event.target.result);
                if (Array.isArray(importedTasks)) {
                    state.tasks = importedTasks;
                    saveData();
                    renderBoard();
                    showToast('Workspace imported successfully');
                } else {
                    alert('Invalid JSON structure for tasks.');
                }
            } catch (err) {
                alert('Failed to parse JSON file.');
            }
        };
        reader.readAsText(file);
        importFile.value = '';
    });

    // Reset Workspace
    clearAllBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all tasks? This cannot be undone unless you exported a backup.')) {
            state.tasks = [];
            saveData();
            renderBoard();
            showToast('Workspace reset');
        }
    });

    // Timer buttons
    timerToggleBtn.addEventListener('click', toggleTimer);
    timerResetBtn.addEventListener('click', resetTimer);
    updateTimerDisplay();
}
