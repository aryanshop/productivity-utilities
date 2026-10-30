// AuraSlate: Local Kanban & Focus Sprint Board

const COLUMNS = [
  { id: 'backlog', title: 'Backlog', color: '#94a3b8' },
  { id: 'todo', title: 'To Do', color: '#6366f1' },
  { id: 'in-progress', title: 'In Progress', color: '#f59e0b' },
  { id: 'done', title: 'Done', color: '#22c55e' }
];

let tasks = [
  {
    id: 'task-1',
    title: 'Design initial UX wireframes',
    status: 'backlog',
    priority: 'high',
    tags: ['design', 'ux'],
    content: '### Goals\n- Sketch desktop layouts\n- Define color tokens\n- Review accessibility contrast',
    createdAt: Date.now() - 86400000 * 2
  },
  {
    id: 'task-2',
    title: 'Implement drag and drop state',
    status: 'in-progress',
    priority: 'high',
    tags: ['frontend', 'feature'],
    content: '- [x] Setup HTML5 drag events\n- [ ] Fix column highlight bug\n- [ ] Test on touch devices',
    createdAt: Date.now() - 86400000
  },
  {
    id: 'task-3',
    title: 'Write project README documentation',
    status: 'todo',
    priority: 'medium',
    tags: ['docs'],
    content: 'Detail local run instructions and architecture overview.',
    createdAt: Date.now() - 3600000 * 5
  },
  {
    id: 'task-4',
    title: 'Clean up CSS variables',
    status: 'done',
    priority: 'low',
    tags: ['refactor'],
    content: 'Removed redundant declarations and ensured dark mode consistency.',
    createdAt: Date.now() - 3600000 * 24
  }
];

// DOM Elements
const kanbanBoard = document.getElementById('kanban-board');
const searchInput = document.getElementById('search-input');
const priorityFilter = document.getElementById('priority-filter');
const clearCompletedBtn = document.getElementById('clear-completed-btn');
const addTaskBtn = document.getElementById('add-task-btn');
const focusModeBtn = document.getElementById('focus-mode-btn');
const exportBtn = document.getElementById('export-btn');
const importFile = document.getElementById('import-file');

// Task Modal Elements
const taskModal = document.getElementById('task-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelModalBtn = document.getElementById('cancel-modal-btn');
const taskForm = document.getElementById('task-form');
const modalTitle = document.getElementById('modal-title');
const taskIdInput = document.getElementById('task-id');
const taskTitleInput = document.getElementById('task-title-input');
const taskStatusSelect = document.getElementById('task-status-select');
const taskPrioritySelect = document.getElementById('task-priority-select');
const taskTagsInput = document.getElementById('task-tags-input');
const taskContentInput = document.getElementById('task-content-input');
const taskPreviewPane = document.getElementById('task-preview-pane');
const tabBtns = document.querySelectorAll('.tab-btn');

// Timer Modal Elements
const timerModal = document.getElementById('timer-modal');
const closeTimerBtn = document.getElementById('close-timer-btn');
const timerTimeDisplay = document.getElementById('timer-time');
const timerStatusText = document.getElementById('timer-status-text');
const timerStartBtn = document.getElementById('timer-start-btn');
const timerPauseBtn = document.getElementById('timer-pause-btn');
const timerResetBtn = document.getElementById('timer-reset-btn');
const presetBtns = document.querySelectorAll('.preset-btn');

// Timer State
let timerInterval = null;
let timerDurationSeconds = 25 * 60;
let timerRemainingSeconds = 25 * 60;
let isTimerRunning = false;

// Load from localStorage if available
function initStorage() {
  const saved = localStorage.getItem('auraslate_tasks');
  if (saved) {
    try {
      tasks = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load saved tasks', e);
    }
  }
}

function saveStorage() {
  localStorage.setItem('auraslate_tasks', JSON.stringify(tasks));
}

// Simple Markdown Parser for Preview & Notes
function parseMarkdown(text) {
  if (!text) return '<span style="color: var(--text-secondary);">No notes added...</span>';
  
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold & Italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Checklists
  html = html.replace(/^- \[x\] (.*$)/gim, '<div style="display:flex;align-items:center;gap:0.4rem;"><input type="checkbox" checked disabled> <span>$1</span></div>');
  html = html.replace(/^- \[ \] (.*$)/gim, '<div style="display:flex;align-items:center;gap:0.4rem;"><input type="checkbox" disabled> <span>$1</span></div>');

  // Bullet Lists
  html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  // Line breaks
  html = html.replace(/\n/g, '<br>');

  return html;
}

// Render Kanban Board
function renderBoard() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const priorityFilterVal = priorityFilter.value;

  kanbanBoard.innerHTML = '';

  COLUMNS.forEach(col => {
    const colTasks = tasks.filter(t => {
      const matchesStatus = t.status === col.id;
      const matchesSearch = searchTerm === '' || 
        t.title.toLowerCase().includes(searchTerm) || 
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(searchTerm)));
      const matchesPriority = priorityFilterVal === 'all' || t.priority === priorityFilterVal;
      
      return matchesStatus && matchesSearch && matchesPriority;
    });

    const colEl = document.createElement('div');
    colEl.className = 'kanban-column';
    colEl.dataset.columnId = col.id;

    colEl.innerHTML = `
      <div class="column-header">
        <div class="column-title-wrap">
          <span style="width: 10px; height: 10px; border-radius: 50%; background-color: ${col.color}; display: inline-block;"></span>
          <span>${col.title}</span>
        </div>
        <span class="task-count">${colTasks.length}</span>
      </div>
      <div class="column-tasks" data-column="${col.id}">
        ${colTasks.length === 0 ? '<div style="text-align: center; color: var(--text-secondary); font-size: 0.8rem; padding: 1.5rem 0;">No tasks</div>' : ''}
      </div>
    `;

    const tasksContainer = colEl.querySelector('.column-tasks');

    colTasks.forEach(task => {
      const cardEl = document.createElement('div');
      cardEl.className = 'task-card';
      cardEl.draggable = true;
      cardEl.dataset.taskId = task.id;

      const tagsHtml = task.tags && task.tags.length > 0 
        ? `<div class="task-tags">${task.tags.map(tag => `<span class="tag">#${tag.trim()}</span>`).join('')}</div>`
        : '';

      cardEl.innerHTML = `
        <div class="task-card-header">
          <span class="task-title">${escapeHtml(task.title)}</span>
          <span class="priority-badge priority-${task.priority}">${task.priority}</span>
        </div>
        ${tagsHtml}
        <div class="task-snippet">${parseMarkdown(task.content)}</div>
        <div class="task-card-footer">
          <span>${new Date(task.createdAt).toLocaleDateString()}</span>
          <div class="task-actions">
            <button class="icon-btn edit" title="Edit Task">✏️</button>
            <button class="icon-btn delete" title="Delete Task">🗑️</button>
          </div>
        </div>
      `;

      // Drag and drop event listeners
      cardEl.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', task.id);
        cardEl.classList.add('dragging');
      });

      cardEl.addEventListener('dragend', () => {
        cardEl.classList.remove('dragging');
      });

      // Edit & Delete handlers
      cardEl.querySelector('.edit').addEventListener('click', () => openEditModal(task.id));
      cardEl.querySelector('.delete').addEventListener('click', () => deleteTask(task.id));

      tasksContainer.appendChild(cardEl);
    });

    // Column Drop Target Events
    tasksContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    tasksContainer.addEventListener('drop', (e) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData('text/plain');
      if (taskId) {
        moveTaskStatus(taskId, col.id);
      }
    });

    kanbanBoard.appendChild(colEl);
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Task Operations
function moveTaskStatus(taskId, newStatus) {
  const task = tasks.find(t => t.id === taskId);
  if (task && task.status !== newStatus) {
    task.status = newStatus;
    saveStorage();
    renderBoard();
  }
}

function deleteTask(taskId) {
  if (confirm('Are you sure you want to delete this task?')) {
    tasks = tasks.filter(t => t.id !== taskId);
    saveStorage();
    renderBoard();
  }
}

function openCreateModal() {
  modalTitle.textContent = 'Create New Task';
  taskIdInput.value = '';
  taskTitleInput.value = '';
  taskStatusSelect.value = 'backlog';
  taskPrioritySelect.value = 'medium';
  taskTagsInput.value = '';
  taskContentInput.value = '';
  taskPreviewPane.innerHTML = '';
  taskModal.classList.add('active');
  taskTitleInput.focus();
}

function openEditModal(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  modalTitle.textContent = 'Edit Task';
  taskIdInput.value = task.id;
  taskTitleInput.value = task.title;
  taskStatusSelect.value = task.status;
  taskPrioritySelect.value = task.priority;
  taskTagsInput.value = task.tags ? task.tags.join(', ') : '';
  taskContentInput.value = task.content || '';
  taskPreviewPane.innerHTML = parseMarkdown(task.content);
  taskModal.classList.add('active');
  taskTitleInput.focus();
}

function closeModal() {
  taskModal.classList.remove('active');
}

// Form Submit Handler
taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = taskIdInput.value;
  const title = taskTitleInput.value.trim();
  const status = taskStatusSelect.value;
  const priority = taskPrioritySelect.value;
  const tags = taskTagsInput.value ? taskTagsInput.value.split(',').map(t => t.trim()).filter(Boolean) : [];
  const content = taskContentInput.value;

  if (!title) return;

  if (id) {
    // Update existing
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.title = title;
      task.status = status;
      task.priority = priority;
      task.tags = tags;
      task.content = content;
    }
  } else {
    // Create new
    const newTask = {
      id: 'task-' + Date.now(),
      title,
      status,
      priority,
      tags,
      content,
      createdAt: Date.now()
    };
    tasks.push(newTask);
  }

  saveStorage();
  renderBoard();
  closeModal();
});

// Markdown Tab Switching
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    if (tab === 'write') {
      taskContentInput.classList.remove('hidden');
      taskPreviewPane.classList.add('hidden');
    } else {
      taskContentInput.classList.add('hidden');
      taskPreviewPane.classList.remove('hidden');
      taskPreviewPane.innerHTML = parseMarkdown(taskContentInput.value);
    }
  });
});

// Clear Done Tasks
clearCompletedBtn.addEventListener('click', () => {
  if (confirm('Remove all tasks in the Done column?')) {
    tasks = tasks.filter(t => t.status !== 'done');
    saveStorage();
    renderBoard();
  }
});

// Search & Filter listeners
searchInput.addEventListener('input', renderBoard);
priorityFilter.addEventListener('change', renderBoard);

// Modal buttons
addTaskBtn.addEventListener('click', openCreateModal);
closeModalBtn.addEventListener('click', closeModal);
cancelModalBtn.addEventListener('click', closeModal);
taskModal.addEventListener('click', (e) => {
  if (e.target === taskModal) closeModal();
});

// Focus Sprint Timer Logic
function openTimerModal() {
  timerModal.classList.add('active');
}

function closeTimerModal() {
  timerModal.classList.remove('active');
  pauseTimer();
}

function updateTimerDisplay() {
  const mins = Math.floor(timerRemainingSeconds / 60);
  const secs = timerRemainingSeconds % 60;
  timerTimeDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function startTimer() {
  if (isTimerRunning) return;
  isTimerRunning = true;
  timerStartBtn.disabled = true;
  timerPauseBtn.disabled = false;
  timerStatusText.textContent = 'Stay focused! You got this.';

  timerInterval = setInterval(() => {
    if (timerRemainingSeconds > 0) {
      timerRemainingSeconds--;
      updateTimerDisplay();
    } else {
      pauseTimer();
      timerStatusText.textContent = 'Sprint completed! Great job! 🎉';
    }
  }, 1000);
}

function pauseTimer() {
  isTimerRunning = false;
  clearInterval(timerInterval);
  timerStartBtn.disabled = false;
  timerPauseBtn.disabled = true;
  if (timerRemainingSeconds > 0 && timerRemainingSeconds < timerDurationSeconds) {
    timerStatusText.textContent = 'Sprint paused.';
  }
}

function resetTimer() {
  pauseTimer();
  timerRemainingSeconds = timerDurationSeconds;
  updateTimerDisplay();
  timerStatusText.textContent = 'Ready to focus?';
}

focusModeBtn.addEventListener('click', openTimerModal);
closeTimerBtn.addEventListener('click', closeTimerModal);
timerModal.addEventListener('click', (e) => {
  if (e.target === timerModal) closeTimerModal();
});

timerStartBtn.addEventListener('click', startTimer);
timerPauseBtn.addEventListener('click', pauseTimer);
timerResetBtn.addEventListener('click', resetTimer);

presetBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    presetBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const mins = parseInt(btn.dataset.time, 10);
    timerDurationSeconds = mins * 60;
    timerRemainingSeconds = timerDurationSeconds;
    pauseTimer();
    updateTimerDisplay();
  });
});

// Export / Import JSON
exportBtn.addEventListener('click', () => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `auraslate_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
});

importFile.addEventListener('change', (e) => {
  const fileReader = new FileReader();
  if (e.target.files[0]) {
    fileReader.readAsText(e.target.files[0], "UTF-8");
    fileReader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported)) {
          tasks = imported;
          saveStorage();
          renderBoard();
          alert('Successfully imported tasks!');
        } else {
          alert('Invalid JSON structure.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
      importFile.value = '';
    };
  }
});

// Initial setup
initStorage();
renderBoard();
updateTimerDisplay();
