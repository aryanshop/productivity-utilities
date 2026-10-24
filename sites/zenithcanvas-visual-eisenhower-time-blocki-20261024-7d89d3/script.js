(function() {
  'use strict';

  // State definition
  let state = {
    tasks: [
      { id: 't1', title: 'Finalize Q3 strategic roadmap', quadrant: 'q2', duration: 60, timeSlot: '09:00', completed: false },
      { id: 't2', title: 'Fix critical production auth bug', quadrant: 'q1', duration: 45, timeSlot: '11:00', completed: false },
      { id: 't3', title: 'Respond to vendor contract emails', quadrant: 'q3', duration: 30, timeSlot: '14:00', completed: false },
      { id: 't4', title: 'Organize desktop folders', quadrant: 'q4', duration: 15, timeSlot: '', completed: true }
    ]
  };

  const STORAGE_KEY = 'zenith_canvas_tasks_v1';

  // DOM Elements
  const navTabs = document.querySelectorAll('.nav-tab');
  const viewContents = document.querySelectorAll('.view-content');
  const taskForm = document.getElementById('task-form');
  const taskTitleInput = document.getElementById('task-title');
  const taskQuadrantSelect = document.getElementById('task-quadrant');
  const taskDurationSelect = document.getElementById('task-duration');
  
  const btnExport = document.getElementById('btn-export');
  const btnImport = document.getElementById('btn-import');
  const fileImport = document.getElementById('file-import');
  const btnClear = document.getElementById('btn-clear');

  const modalOverlay = document.getElementById('task-modal');
  const editForm = document.getElementById('edit-form');
  const editIdInput = document.getElementById('edit-id');
  const editTitleInput = document.getElementById('edit-title');
  const editQuadrantSelect = document.getElementById('edit-quadrant');
  const editDurationSelect = document.getElementById('edit-duration');
  const editTimeSlotSelect = document.getElementById('edit-time-slot');
  const btnModalCancel = document.getElementById('btn-modal-cancel');

  // Hours for timeline (06:00 to 22:00)
  const TIMELINE_HOURS = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];

  // Initialization
  function init() {
    loadFromStorage();
    setupEventListeners();
    render();
  }

  function loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          state.tasks = parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load storage data:', e);
    }
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
    } catch (e) {
      console.error('Failed to save storage data:', e);
    }
  }

  function setupEventListeners() {
    // Navigation tabs
    navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetId = tab.getAttribute('data-target');
        navTabs.forEach(t => t.classList.remove('active'));
        viewContents.forEach(v => v.classList.remove('active'));
        tab.classList.add('active');
        const activeView = document.getElementById(targetId);
        if (activeView) activeView.classList.add('active');
      });
    });

    // Task Form Submission
    if (taskForm) {
      taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = taskTitleInput.value.trim();
        if (!title) return;

        const newTask = {
          id: 't_' + Math.random().toString(36).substr(2, 9),
          title: title,
          quadrant: taskQuadrantSelect.value,
          duration: parseInt(taskDurationSelect.value, 10),
          timeSlot: '',
          completed: false
        };

        state.tasks.push(newTask);
        saveAndRender();
        taskForm.reset();
        taskTitleInput.focus();
      });
    }

    // Export / Import / Clear
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.tasks, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "zenith_canvas_backup.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      });
    }

    if (btnImport && fileImport) {
      btnImport.addEventListener('click', () => fileImport.click());
      fileImport.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
          try {
            const imported = JSON.parse(event.target.result);
            if (Array.isArray(imported)) {
              state.tasks = imported;
              saveAndRender();
              alert('Tasks successfully imported!');
            } else {
              alert('Invalid backup file format.');
            }
          } catch (err) {
            alert('Error parsing JSON file.');
          }
          fileImport.value = '';
        };
        reader.readAsText(file);
      });
    }

    if (btnClear) {
      btnClear.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all tasks?')) {
          state.tasks = [];
          saveAndRender();
        }
      });
    }

    // Edit Modal
    if (editForm) {
      editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = editIdInput.value;
        const task = state.tasks.find(t => t.id === id);
        if (task) {
          task.title = editTitleInput.value.trim();
          task.quadrant = editQuadrantSelect.value;
          task.duration = parseInt(editDurationSelect.value, 10);
          task.timeSlot = editTimeSlotSelect.value;
          saveAndRender();
          closeModal();
        }
      });
    }

    if (btnModalCancel) {
      btnModalCancel.addEventListener('click', closeModal);
    }

    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
      });
    }
  }

  function saveAndRender() {
    saveToStorage();
    render();
  }

  function render() {
    renderMatrix();
    renderTimeline();
    renderAnalytics();
  }

  // 1. Render Matrix View
  function renderMatrix() {
    const quadrants = ['q1', 'q2', 'q3', 'q4'];
    quadrants.forEach(q => {
      const container = document.getElementById('list-' + q);
      const badge = document.getElementById('count-' + q);
      if (!container || !badge) return;

      const qTasks = state.tasks.filter(t => t.quadrant === q);
      badge.textContent = qTasks.length;

      if (qTasks.length === 0) {
        container.innerHTML = `<div class="empty-slot-text">No tasks in this quadrant.</div>`;
        return;
      }

      container.innerHTML = '';
      qTasks.forEach(task => {
        const item = document.createElement('div');
        item.className = `task-item ${task.completed ? 'completed' : ''}`;
        item.innerHTML = `
          <div class="task-info">
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}" title="Toggle Complete">
            <span class="task-title-text" title="${escapeHtml(task.title)}">${escapeHtml(task.title)}</span>
          </div>
          <div class="task-meta">
            ${task.timeSlot ? `<span class="badge-time">${task.timeSlot}</span>` : ''}
            <span class="badge-time">${task.duration}m</span>
          </div>
          <div class="task-actions">
            <button class="btn-icon edit" data-id="${task.id}" title="Edit Task">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon delete" data-id="${task.id}" title="Delete Task">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        `;

        // Bind item actions
        const checkbox = item.querySelector('.task-checkbox');
        checkbox.addEventListener('change', () => {
          task.completed = checkbox.checked;
          saveAndRender();
        });

        const btnEdit = item.querySelector('.btn-icon.edit');
        btnEdit.addEventListener('click', () => openModal(task.id));

        const btnDelete = item.querySelector('.btn-icon.delete');
        btnDelete.addEventListener('click', () => {
          state.tasks = state.tasks.filter(t => t.id !== task.id);
          saveAndRender();
        });

        container.appendChild(item);
      });
    });
  }

  // 2. Render Timeline View
  function renderTimeline() {
    const timelineContainer = document.getElementById('timeline-hours');
    if (!timelineContainer) return;

    timelineContainer.innerHTML = '';
    TIMELINE_HOURS.forEach(hour => {
      const row = document.createElement('div');
      row.className = 'hour-row';

      const slotTasks = state.tasks.filter(t => t.timeSlot === hour);

      row.innerHTML = `
        <div class="hour-label">${hour}</div>
        <div class="hour-slot-content" data-hour="${hour}">
          ${slotTasks.length === 0 ? '<span class="empty-slot-text">Available slot</span>' : ''}
        </div>
      `;

      const contentArea = row.querySelector('.hour-slot-content');
      slotTasks.forEach(task => {
        const pill = document.createElement('div');
        pill.className = `timeline-task-pill ${task.quadrant} ${task.completed ? 'completed' : ''}`;
        pill.innerHTML = `
          <span>${escapeHtml(task.title)}</span>
          <span class="badge-time">${task.duration}m</span>
        `;
        contentArea.appendChild(pill);
      });

      timelineContainer.appendChild(row);
    });
  }

  // 3. Render Analytics View
  function renderAnalytics() {
    const total = state.tasks.length;
    const completed = state.tasks.filter(t => t.completed).length;
    const q2Tasks = state.tasks.filter(t => t.quadrant === 'q2').length;
    const q2Ratio = total > 0 ? Math.round((q2Tasks / total) * 100) : 0;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-completed').textContent = completed;
    document.getElementById('stat-q2-ratio').textContent = q2Ratio + '%';

    // Render SVG Pie Chart for Quadrant Breakdown
    const svg = document.getElementById('chart-quadrants');
    const legend = document.getElementById('legend-quadrants');
    if (!svg || !legend) return;

    const counts = {
      q1: state.tasks.filter(t => t.quadrant === 'q1').length,
      q2: state.tasks.filter(t => t.quadrant === 'q2').length,
      q3: state.tasks.filter(t => t.quadrant === 'q3').length,
      q4: state.tasks.filter(t => t.quadrant === 'q4').length
    };

    const colors = {
      q1: '#ef4444',
      q2: '#3b82f6',
      q3: '#f59e0b',
      q4: '#64748b'
    };

    legend.innerHTML = `
      <div class="legend-item"><div class="legend-color" style="background:${colors.q1}"></div>Q1 Do First (${counts.q1})</div>
      <div class="legend-item"><div class="legend-color" style="background:${colors.q2}"></div>Q2 Schedule (${counts.q2})</div>
      <div class="legend-item"><div class="legend-color" style="background:${colors.q3}"></div>Q3 Delegate (${counts.q3})</div>
      <div class="legend-item"><div class="legend-color" style="background:${colors.q4}"></div>Q4 Eliminate (${counts.q4})</div>
    `;

    if (total === 0) {
      svg.innerHTML = '<circle cx="100" cy="100" r="80" fill="#334155" />';
    } else {
      let cumulativePercent = 0;
      svg.innerHTML = '';
      
      ['q1', 'q2', 'q3', 'q4'].forEach(q => {
        const count = counts[q];
        if (count === 0) return;
        const percent = (count / total) * 100;
        const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
        cumulativePercent += percent;
        const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
        const largeArcFlag = percent > 50 ? 1 : 0;

        const pathData = [
          `M 100 100`,
          `L ${startX} ${startY}`,
          `A 80 80 0 ${largeArcFlag} 1 ${endX} ${endY}`,
          `Z`
        ].join(' ');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', colors[q]);
        svg.appendChild(path);
      });
    }

    // Insight Generation
    const insightEl = document.getElementById('insight-text');
    if (insightEl) {
      if (total === 0) {
        insightEl.textContent = 'Add your first tasks to generate personalized productivity insights.';
      } else if (q2Ratio >= 50) {
        insightEl.textContent = 'Fantastic balance! You are dedicating over 50% of your efforts to Q2 (Important & Not Urgent) tasks, which drives long-term success and minimizes firefighting.';
      } else if (counts.q1 > total * 0.5) {
        insightEl.textContent = 'High Q1 concentration detected! You are spending most of your time putting out fires. Try to proactively plan more Q2 tasks to reduce urgent crises.';
      } else {
        insightEl.textContent = `Your current Q2 focus ratio is ${q2Ratio}%. Try shifting more attention toward Q2 tasks for sustainable productivity and growth.`;
      }
    }
  }

  function getCoordinatesForPercent(percent) {
    const x = Math.cos(2 * Math.PI * (percent / 100)) * 80 + 100;
    const y = Math.sin(2 * Math.PI * (percent / 100)) * 80 + 100;
    return [x, y];
  }

  // Modal Handling
  function openModal(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task || !modalOverlay) return;

    editIdInput.value = task.id;
    editTitleInput.value = task.title;
    editQuadrantSelect.value = task.quadrant;
    editDurationSelect.value = task.duration;

    // Populate time slot options
    editTimeSlotSelect.innerHTML = '<option value="">-- Unassigned --</option>';
    TIMELINE_HOURS.forEach(hour => {
      const opt = document.createElement('option');
      opt.value = hour;
      opt.textContent = hour;
      if (task.timeSlot === hour) opt.selected = true;
      editTimeSlotSelect.appendChild(opt);
    });

    modalOverlay.style.display = 'flex';
    editTitleInput.focus();
  }

  function closeModal() {
    if (modalOverlay) modalOverlay.style.display = 'none';
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  // Run on load
  document.addEventListener('DOMContentLoaded', init);
})();
