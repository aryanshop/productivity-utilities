/* ChronoCraft Application Logic */

document.addEventListener('DOMContentLoaded', () => {
  // State Management
  let projectState = {
    title: "Q3 Product Launch & Ecosystem Redesign",
    startDate: new Date().toISOString().split('T')[0],
    zoomScale: 36, // width per day in pixels for gantt
    tasks: [
      {
        id: "task-1",
        name: "Stakeholder & User Research",
        phase: "Research & Discovery",
        duration: 5,
        dependency: "",
        status: "completed"
      },
      {
        id: "task-2",
        name: "Market Competitor Benchmark",
        phase: "Research & Discovery",
        duration: 4,
        dependency: "task-1",
        status: "completed"
      },
      {
        id: "task-3",
        name: "Wireframe UX Workflows",
        phase: "Design & Prototyping",
        duration: 7,
        dependency: "task-2",
        status: "in-progress"
      },
      {
        id: "task-4",
        name: "Design System UI Kit Components",
        phase: "Design & Prototyping",
        duration: 6,
        dependency: "task-3",
        status: "todo"
      },
      {
        id: "task-5",
        name: "Frontend Scaffolding & Routing",
        phase: "Development & Build",
        duration: 8,
        dependency: "task-4",
        status: "todo"
      },
      {
        id: "task-6",
        name: "API Integration & State Stores",
        phase: "Development & Build",
        duration: 10,
        dependency: "task-5",
        status: "todo"
      },
      {
        id: "task-7",
        name: "End-to-End QA & Bug Fixing",
        phase: "Testing & QA",
        duration: 5,
        dependency: "task-6",
        status: "todo"
      },
      {
        id: "task-8",
        name: "Public Release & Marketing Blast",
        phase: "Launch & Marketing",
        duration: 3,
        dependency: "task-7",
        status: "todo"
      }
    ]
  };

  // Load saved state if exists
  const savedData = localStorage.getItem('chronocraft_project');
  if (savedData) {
    try {
      projectState = JSON.parse(savedData);
    } catch (e) {
      console.error("Error loading saved state", e);
    }
  }

  // DOM Elements
  const titleInput = document.getElementById('project-title');
  const startDateInput = document.getElementById('project-start');
  const statTotal = document.getElementById('stat-total');
  const statCompleted = document.getElementById('stat-completed');
  const statDays = document.getElementById('stat-days');
  const statProgressFill = document.getElementById('stat-progress-fill');
  const statProgressText = document.getElementById('stat-progress-text');

  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  const tasksTbody = document.getElementById('tasks-tbody');
  const btnAddTask = document.getElementById('btn-add-task');
  const btnNewProject = document.getElementById('btn-new-project');
  const btnExport = document.getElementById('btn-export');
  const importFile = document.getElementById('import-file');
  const btnPrint = document.getElementById('btn-print');

  // Modal Elements
  const taskModal = document.getElementById('task-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalCancel = document.getElementById('modal-cancel');
  const taskForm = document.getElementById('task-form');
  const modalTitleText = document.getElementById('modal-title-text');
  const taskIdInput = document.getElementById('task-id');
  const modalTaskName = document.getElementById('modal-task-name');
  const modalTaskPhase = document.getElementById('modal-task-phase');
  const modalTaskDuration = document.getElementById('modal-task-duration');
  const modalTaskDep = document.getElementById('modal-task-dep');
  const modalTaskStatus = document.getElementById('modal-task-status');

  // Gantt Elements
  const ganttSidebar = document.getElementById('gantt-sidebar');
  const ganttTimelineHeader = document.getElementById('gantt-timeline-header');
  const ganttBarsContainer = document.getElementById('gantt-bars-container');
  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');

  // Summary Elements
  const reportProjectName = document.getElementById('report-project-name');
  const reportDateRange = document.getElementById('report-date-range');
  const reportSummaryText = document.getElementById('report-summary-text');
  const reportPhasesList = document.getElementById('report-phases-list');
  const reportChecklist = document.getElementById('report-checklist');

  // Initialization
  startDateInput.value = projectState.startDate;
  titleInput.value = projectState.title;

  function saveState() {
    localStorage.setItem('chronocraft_project', JSON.stringify(projectState));
  }

  // Compute task start offsets based on dependency chain
  function computeTaskOffsets() {
    const taskMap = {};
    projectState.tasks.forEach(t => {
      taskMap[t.id] = { ...t, startOffset: 0, endOffset: t.duration };
    });

    let changed = true;
    let iterations = 0;
    while (changed && iterations < 100) {
      changed = false;
      iterations++;
      projectState.tasks.forEach(t => {
        if (t.dependency && taskMap[t.dependency]) {
          const predEnd = taskMap[t.dependency].endOffset;
          if (taskMap[t.id].startOffset < predEnd) {
            taskMap[t.id].startOffset = predEnd;
            taskMap[t.id].endOffset = predEnd + t.duration;
            changed = true;
          }
        }
      });
    }
    return taskMap;
  }

  // Render All Views
  function renderAll() {
    renderDashboard();
    renderTaskTable();
    renderGanttChart();
    renderSummary();
    saveState();
  }

  // 1. Dashboard Metrics
  function renderDashboard() {
    const total = projectState.tasks.length;
    const completed = projectState.tasks.filter(t => t.status === 'completed').length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    const taskMap = computeTaskOffsets();
    let maxEnd = 0;
    Object.values(taskMap).forEach(t => {
      if (t.endOffset > maxEnd) maxEnd = t.endOffset;
    });

    statTotal.textContent = total;
    statCompleted.textContent = completed;
    statDays.textContent = `${maxEnd} days`;
    statProgressFill.style.width = `${percent}%`;
    statProgressText.textContent = `${percent}%`;
  }

  // 2. Task Table Render
  function renderTaskTable() {
    tasksTbody.innerHTML = '';
    const taskMap = computeTaskOffsets();

    if (projectState.tasks.length === 0) {
      tasksTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 2rem;">No tasks defined. Click "Add New Task" to begin.</td></tr>`;
      return;
    }

    projectState.tasks.forEach(task => {
      const computed = taskMap[task.id] || { startOffset: 0 };
      const depTask = projectState.tasks.find(t => t.id === task.dependency);
      const depName = depTask ? depTask.name : 'None';
      const phaseClass = `phase-${task.phase.replace(/\s+/g, '-').replace(/&/g, '')}`;

      let statusIcon = '';
      if (task.status === 'completed') {
        statusIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      } else if (task.status === 'in-progress') {
        statusIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="3"></circle></svg>';
      } else {
        statusIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"></circle></svg>';
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <button class="status-badge ${task.status}" title="Toggle Status" data-id="${task.id}">
            ${statusIcon}
          </button>
        </td>
        <td>
          <div class="task-title-cell">
            <span class="task-name">${escapeHtml(task.name)}</span>
            <span class="task-phase-badge ${phaseClass}">${escapeHtml(task.phase)}</span>
          </div>
        </td>
        <td>${task.duration} days</td>
        <td>Day ${computed.startOffset}</td>
        <td>${escapeHtml(depName)}</td>
        <td>
          <div class="action-btns">
            <button class="btn-icon edit" data-id="${task.id}" title="Edit Task">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="btn-icon delete" data-id="${task.id}" title="Delete Task">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      `;
      tasksTbody.appendChild(tr);
    });

    // Bind Table Action Listeners
    tasksTbody.querySelectorAll('.status-badge').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.getAttribute('data-id');
        const t = projectState.tasks.find(x => x.id === id);
        if (t) {
          if (t.status === 'todo') t.status = 'in-progress';
          else if (t.status === 'in-progress') t.status = 'completed';
          else t.status = 'todo';
          renderAll();
        }
      });
    });

    tasksTbody.querySelectorAll('.btn-icon.edit').forEach(btn => {
      btn.addEventListener('click', () => {
        openModal(btn.getAttribute('data-id'));
      });
    });

    tasksTbody.querySelectorAll('.btn-icon.delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        projectState.tasks = projectState.tasks.filter(t => t.id !== id);
        // Remove dependency references
        projectState.tasks.forEach(t => {
          if (t.dependency === id) t.dependency = "";
        });
        renderAll();
      });
    });
  }

  // 3. Gantt Chart Render
  function renderGanttChart() {
    ganttSidebar.innerHTML = `<div class="gantt-header-cell">Task Name</div>`;
    ganttTimelineHeader.innerHTML = '';
    ganttBarsContainer.innerHTML = '';

    if (projectState.tasks.length === 0) {
      ganttSidebar.innerHTML += `<div class="gantt-sidebar-row" style="color: var(--text-secondary);">No tasks</div>`;
      return;
    }

    const taskMap = computeTaskOffsets();
    let maxSpan = 10;
    Object.values(taskMap).forEach(t => {
      if (t.endOffset > maxSpan) maxSpan = t.endOffset;
    });
    maxSpan += 3; // buffer

    // Render Timeline Header Days
    const colWidth = projectState.zoomScale;
    for (let d = 0; d <= maxSpan; d++) {
      const dayCol = document.createElement('div');
      dayCol.className = 'gantt-day-column';
      dayCol.style.width = `${colWidth}px`;
      dayCol.style.minWidth = `${colWidth}px`;
      dayCol.innerHTML = `<span>D${d}</span>`;
      ganttTimelineHeader.appendChild(dayCol);
    }
    ganttTimelineHeader.style.width = `${(maxSpan + 1) * colWidth}px`;

    // Render Rows & Bars
    projectState.tasks.forEach(task => {
      const computed = taskMap[task.id];

      // Sidebar row
      const sRow = document.createElement('div');
      sRow.className = 'gantt-sidebar-row';
      sRow.textContent = task.name;
      ganttSidebar.appendChild(sRow);

      // Chart row
      const cRow = document.createElement('div');
      cRow.className = 'gantt-row';
      cRow.style.width = `${(maxSpan + 1) * colWidth}px`;

      const leftPos = computed.startOffset * colWidth;
      const barWidth = Math.max(task.duration * colWidth, colWidth);

      let barColor = 'var(--accent-primary)';
      if (task.phase === 'Research & Discovery') barColor = '#3b82f6';
      else if (task.phase === 'Design & Prototyping') barColor = '#ec4899';
      else if (task.phase === 'Development & Build') barColor = '#10b981';
      else if (task.phase === 'Testing & QA') barColor = '#f59e0b';
      else if (task.phase === 'Launch & Marketing') barColor = '#8b5cf6';

      const bar = document.createElement('div');
      bar.className = 'gantt-bar';
      bar.style.left = `${leftPos}px`;
      bar.style.width = `${barWidth}px`;
      bar.style.backgroundColor = barColor;
      bar.textContent = `${task.name} (${task.duration}d)`;

      cRow.appendChild(bar);
      ganttBarsContainer.appendChild(cRow);
    });
  }

  // 4. Executive Summary Report Render
  function renderSummary() {
    reportProjectName.textContent = projectState.title || "Untitled Project";
    const startDateFormatted = projectState.startDate || new Date().toISOString().split('T')[0];
    reportDateRange.textContent = `Project Start Date: ${startDateFormatted}`;

    const totalTasks = projectState.tasks.length;
    const taskMap = computeTaskOffsets();
    let maxEnd = 0;
    Object.values(taskMap).forEach(t => {
      if (t.endOffset > maxEnd) maxEnd = t.endOffset;
    });

    reportSummaryText.textContent = `This project comprises ${totalTasks} defined tasks across multiple functional phases. The estimated critical path timeline spans ${maxEnd} business days from inception to completion.`;

    // Phase Breakdown calculation
    const phases = {};
    projectState.tasks.forEach(t => {
      if (!phases[t.phase]) phases[t.phase] = { count: 0, completed: 0, days: 0 };
      phases[t.phase].count++;
      phases[t.phase].days += t.duration;
      if (t.status === 'completed') phases[t.phase].completed++;
    });

    reportPhasesList.innerHTML = '';
    if (Object.keys(phases).length === 0) {
      reportPhasesList.innerHTML = '<p style="color: var(--text-secondary);">No phase data available.</p>';
    } else {
      Object.entries(phases).forEach(([phaseName, data]) => {
        const div = document.createElement('div');
        div.className = 'report-phase-item';
        div.innerHTML = `
          <span class="report-phase-name">${escapeHtml(phaseName)}</span>
          <span class="report-phase-stats">${data.count} tasks (${data.days} days) &bull; ${data.completed}/${data.count} done</span>
        `;
        reportPhasesList.appendChild(div);
      });
    }

    // Checklist Render
    reportChecklist.innerHTML = '';
    if (projectState.tasks.length === 0) {
      reportChecklist.innerHTML = '<li>No tasks found.</li>';
    } else {
      projectState.tasks.forEach(t => {
        const li = document.createElement('li');
        const isDone = t.status === 'completed';
        const checkboxIcon = isDone ? 
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>' :
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2"><circle cx="12" cy="12" r="9"></circle></svg>';
        
        li.innerHTML = `${checkboxIcon} <span><strong>${escapeHtml(t.name)}</strong> (${escapeHtml(t.phase)}, ${t.duration} days)</span>`;
        reportChecklist.appendChild(li);
      });
    }
  }

  // Modal Handling
  function openModal(editId = null) {
    taskForm.reset();
    // Populate dependency select options
    modalTaskDep.innerHTML = '<option value="">None (Starts at Project Beginning)</option>';
    projectState.tasks.forEach(t => {
      if (!editId || t.id !== editId) {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.name;
        modalTaskDep.appendChild(opt);
      }
    });

    if (editId) {
      modalTitleText.textContent = "Edit Task";
      const task = projectState.tasks.find(t => t.id === editId);
      if (task) {
        taskIdInput.value = task.id;
        modalTaskName.value = task.name;
        modalTaskPhase.value = task.phase;
        modalTaskDuration.value = task.duration;
        modalTaskDep.value = task.dependency;
        modalTaskStatus.value = task.status;
      }
    } else {
      modalTitleText.textContent = "Add New Task";
      taskIdInput.value = '';
    }

    taskModal.classList.add('active');
    modalTaskName.focus();
  }

  function closeModalFunc() {
    taskModal.classList.remove('active');
  }

  btnAddTask.addEventListener('click', () => openModal());
  modalCloseBtn.addEventListener('click', closeModalFunc);
  modalCancel.addEventListener('click', closeModalFunc);
  taskModal.addEventListener('click', (e) => {
    if (e.target === taskModal) closeModalFunc();
  });

  // Save Task Form Submission
  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = taskIdInput.value;
    const name = modalTaskName.value.trim();
    const phase = modalTaskPhase.value;
    const duration = parseInt(modalTaskDuration.value) || 1;
    const dependency = modalTaskDep.value;
    const status = modalTaskStatus.value;

    if (!name) return;

    if (id) {
      // Update existing
      const task = projectState.tasks.find(t => t.id === id);
      if (task) {
        task.name = name;
        task.phase = phase;
        task.duration = duration;
        task.dependency = dependency;
        task.status = status;
      }
    } else {
      // Create new
      const newTask = {
        id: 'task-' + Date.now(),
        name,
        phase,
        duration,
        dependency,
        status
      };
      projectState.tasks.push(newTask);
    }

    closeModalFunc();
    renderAll();
  });

  // Project Title & Start Date Listeners
  titleInput.addEventListener('input', () => {
    projectState.title = titleInput.value;
    renderSummary();
    saveState();
  });

  startDateInput.addEventListener('change', () => {
    projectState.startDate = startDateInput.value;
    renderSummary();
    saveState();
  });

  // Tabs Switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      const targetTab = btn.getAttribute('data-tab');
      document.getElementById(`panel-${targetTab}`).classList.add('active');
    });
  });

  // Zoom Controls for Gantt
  zoomInBtn.addEventListener('click', () => {
    if (projectState.zoomScale < 60) {
      projectState.zoomScale += 8;
      renderGanttChart();
    }
  });

  zoomOutBtn.addEventListener('click', () => {
    if (projectState.zoomScale > 20) {
      projectState.zoomScale -= 8;
      renderGanttChart();
    }
  });

  // New Project Button
  btnNewProject.addEventListener('click', () => {
    if (confirm("Create a new blank project? Unsaved changes will be replaced.")) {
      projectState = {
        title: "New Project Blueprint",
        startDate: new Date().toISOString().split('T')[0],
        zoomScale: 36,
        tasks: []
      };
      titleInput.value = projectState.title;
      startDateInput.value = projectState.startDate;
      renderAll();
    }
  });

  // Export JSON
  btnExport.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projectState, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${projectState.title.toLowerCase().replace(/\s+/g, '-')}-chronocraft.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  // Import JSON
  importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (parsed && Array.isArray(parsed.tasks)) {
          projectState = parsed;
          titleInput.value = projectState.title || '';
          startDateInput.value = projectState.startDate || new Date().toISOString().split('T')[0];
          renderAll();
          alert("Project imported successfully!");
        } else {
          alert("Invalid project JSON file structure.");
        }
      } catch (err) {
        alert("Failed to parse JSON file.");
      }
      importFile.value = '';
    };
    reader.readAsText(file);
  });

  // Print Report
  btnPrint.addEventListener('click', () => {
    window.print();
  });

  // Utility Escape HTML
  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Initial Render
  renderAll();
});
