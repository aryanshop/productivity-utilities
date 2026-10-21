document.addEventListener('DOMContentLoaded', () => {
  // Application State
  let state = {
    goal: {
      title: 'Launch SaaS Micro-Product & Reach $1k MRR',
      category: 'Career & Skill',
      deadline: '2025-12-31',
      why: 'Achieve financial sovereignty and build creative independence.'
    },
    milestones: [
      { id: 'm1', title: 'Validate target user pain points & conduct 10 interviews', phase: 'Phase 1: Foundation', impact: 'High', effort: 'Medium', notes: 'Focus on indie hacker communities.', completed: true },
      { id: 'm2', title: 'Wireframe core UI and user authentication flow', phase: 'Phase 1: Foundation', impact: 'High', effort: 'Low', notes: 'Keep UI minimal using system fonts.', completed: true },
      { id: 'm3', title: 'Develop MVP backend & database schema', phase: 'Phase 2: Momentum', impact: 'High', effort: 'High', notes: 'Deploy on lightweight serverless architecture.', completed: false },
      { id: 'm4', title: 'Integrate Stripe billing & checkout webhook', phase: 'Phase 2: Momentum', impact: 'High', effort: 'Medium', notes: 'Test thoroughly in sandbox mode.', completed: false },
      { id: 'm5', title: 'Launch on ProductHunt & HackerNews', phase: 'Phase 3: Mastery', impact: 'High', effort: 'High', notes: 'Prepare press kit and launch video.', completed: false },
      { id: 'm6', title: 'Optimize conversion rate & onboarding funnel', phase: 'Phase 3: Mastery', impact: 'Medium', effort: 'Low', notes: 'Analyze drop-off points with lightweight analytics.', completed: false }
    ],
    habits: [
      { id: 'h1', name: '30 mins uninterrupted deep work', cue: 'Right after morning tea', streak: 5, completedToday: true },
      { id: 'h2', name: 'Review daily pipeline & task backlog', cue: 'Before closing laptop at night', streak: 3, completedToday: false }
    ]
  };

  // LocalStorage Key
  const STORAGE_KEY = 'zenithgoal_state_v1';

  // Load State
  function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        state = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved state', e);
      }
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  // DOM Elements
  const goalForm = document.getElementById('goal-form');
  const goalTitleInput = document.getElementById('goal-title');
  const goalCategoryInput = document.getElementById('goal-category');
  const goalDeadlineInput = document.getElementById('goal-deadline');
  const goalWhyInput = document.getElementById('goal-why');

  const statTotal = document.getElementById('stat-total');
  const statCompleted = document.getElementById('stat-completed');
  const statStreak = document.getElementById('stat-streak');
  const globalProgressBar = document.getElementById('global-progress-bar');

  const milestonesContainer = document.getElementById('milestones-container');
  const habitsContainer = document.getElementById('habits-container');
  const habitForm = document.getElementById('habit-form');

  const modal = document.getElementById('milestone-modal');
  const milestoneItemForm = document.getElementById('milestone-item-form');
  const modalTitle = document.getElementById('modal-title');
  const itemIdInput = document.getElementById('item-id');
  const itemTitleInput = document.getElementById('item-title');
  const itemPhaseInput = document.getElementById('item-phase');
  const itemImpactInput = document.getElementById('item-impact');
  const itemEffortInput = document.getElementById('item-effort');
  const itemNotesInput = document.getElementById('item-notes');

  // Tabs
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  // Filter chips
  const filterChips = document.querySelectorAll('.filter-chip');
  let currentFilter = 'all';

  // Init
  function init() {
    loadState();
    populateGoalForm();
    renderAll();
    setupEventListeners();
  }

  function populateGoalForm() {
    goalTitleInput.value = state.goal.title;
    goalCategoryInput.value = state.goal.category;
    goalDeadlineInput.value = state.goal.deadline;
    goalWhyInput.value = state.goal.why;
  }

  function renderAll() {
    renderStats();
    renderMilestones();
    renderHabits();
    renderMatrix();
  }

  // Render Stats & Progress
  function renderStats() {
    const total = state.milestones.length;
    const completed = state.milestones.filter(m => m.completed).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    statTotal.textContent = total;
    statCompleted.textContent = completed;
    globalProgressBar.style.width = `${pct}%`;

    // Calculate max habit streak
    const maxStreak = state.habits.reduce((max, h) => Math.max(max, h.streak), 0);
    statStreak.textContent = `${maxStreak}d`;
  }

  // Render Milestones
  function renderMilestones() {
    milestonesContainer.innerHTML = '';

    const filtered = state.milestones.filter(m => {
      if (currentFilter === 'all') return true;
      return m.phase === currentFilter;
    });

    if (filtered.length === 0) {
      milestonesContainer.innerHTML = `<p class="section-desc">No micro-tasks found in this phase.</p>`;
      return;
    }

    filtered.forEach(m => {
      const card = document.createElement('div');
      card.className = `milestone-card ${m.completed ? 'completed' : ''}`;
      card.innerHTML = `
        <input type="checkbox" class="milestone-checkbox" ${m.completed ? 'checked' : ''} data-id="${m.id}">
        <div class="milestone-body">
          <div class="milestone-header-row">
            <span class="milestone-title">${escapeHtml(m.title)}</span>
            <div class="milestone-tags">
              <span class="badge badge-phase">${escapeHtml(m.phase)}</span>
              <span class="badge badge-impact">${escapeHtml(m.impact)} Impact</span>
            </div>
          </div>
          ${m.notes ? `<p class="milestone-notes">${escapeHtml(m.notes)}</p>` : ''}
        </div>
        <div class="milestone-actions">
          <button class="icon-btn edit" data-id="${m.id}" title="Edit Task">✏️</button>
          <button class="icon-btn delete" data-id="${m.id}" title="Delete Task">🗑️</button>
        </div>
      `;
      milestonesContainer.appendChild(card);
    });
  }

  // Render Habits
  function renderHabits() {
    habitsContainer.innerHTML = '';

    if (state.habits.length === 0) {
      habitsContainer.innerHTML = `<p class="section-desc">No daily habits defined yet.</p>`;
      return;
    }

    state.habits.forEach(h => {
      const card = document.createElement('div');
      card.className = 'habit-card';
      card.innerHTML = `
        <div class="habit-info">
          <h4>${escapeHtml(h.name)}</h4>
          <span class="habit-cue">Trigger: ${escapeHtml(h.cue)}</span>
        </div>
        <div class="habit-footer">
          <button class="btn ${h.completedToday ? 'btn-primary' : 'btn-secondary'} btn-sm habit-check-btn" data-id="${h.id}">
            ${h.completedToday ? '✓ Completed Today' : 'Mark Done'}
          </button>
          <span class="streak-count">🔥 ${h.streak} Day Streak</span>
        </div>
      `;
      habitsContainer.appendChild(card);
    });
  }

  // Render Matrix
  function renderMatrix() {
    const quickWins = document.getElementById('quad-quick-wins');
    const majorProjects = document.getElementById('quad-major-projects');
    const fillIns = document.getElementById('quad-fill-ins');
    const timeWasters = document.getElementById('quad-time-wasters');

    quickWins.innerHTML = '';
    majorProjects.innerHTML = '';
    fillIns.innerHTML = '';
    timeWasters.innerHTML = '';

    state.milestones.forEach(m => {
      const chip = document.createElement('div');
      chip.className = 'matrix-chip';
      chip.innerHTML = `<span>${escapeHtml(m.title)}</span>`;

      if (m.impact === 'High' && (m.effort === 'Low' || m.effort === 'Medium')) {
        quickWins.appendChild(chip);
      } else if (m.impact === 'High' && m.effort === 'High') {
        majorProjects.appendChild(chip);
      } else if (m.impact !== 'High' && m.effort === 'Low') {
        fillIns.appendChild(chip);
      } else {
        timeWasters.appendChild(chip);
      }
    });
  }

  // Event Listeners Setup
  function setupEventListeners() {
    // Goal Form Submit
    goalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      state.goal.title = goalTitleInput.value;
      state.goal.category = goalCategoryInput.value;
      state.goal.deadline = goalDeadlineInput.value;
      state.goal.why = goalWhyInput.value;
      saveState();
      triggerConfetti();
    });

    // Tabs
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const targetTab = document.getElementById(`tab-${btn.dataset.tab}`);
        if (targetTab) targetTab.classList.add('active');
      });
    });

    // Filter Chips
    filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentFilter = chip.dataset.filter;
        renderMilestones();
      });
    });

    // Milestones interaction (checkbox, edit, delete)
    milestonesContainer.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      if (!id) return;

      if (e.target.classList.contains('milestone-checkbox')) {
        const m = state.milestones.find(item => item.id === id);
        if (m) {
          m.completed = e.target.checked;
          saveState();
          renderStats();
          renderMilestones();
          if (m.completed) triggerConfetti();
        }
      } else if (e.target.classList.contains('delete')) {
        state.milestones = state.milestones.filter(item => item.id !== id);
        saveState();
        renderAll();
      } else if (e.target.classList.contains('edit')) {
        openMilestoneModal(id);
      }
    });

    // Open Modal for Add
    document.getElementById('btn-add-milestone').addEventListener('click', () => {
      openMilestoneModal(null);
    });

    // Close Modal
    document.querySelectorAll('.close-modal').forEach(el => {
      el.addEventListener('click', () => {
        modal.classList.remove('active');
      });
    });

    // Milestone Item Form Submit
    milestoneItemForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = itemIdInput.value;
      const title = itemTitleInput.value;
      const phase = itemPhaseInput.value;
      const impact = itemImpactInput.value;
      const effort = itemEffortInput.value;
      const notes = itemNotesInput.value;

      if (id) {
        // Edit
        const m = state.milestones.find(item => item.id === id);
        if (m) {
          m.title = title;
          m.phase = phase;
          m.impact = impact;
          m.effort = effort;
          m.notes = notes;
        }
      } else {
        // Add
        const newM = {
          id: 'm_' + Date.now(),
          title,
          phase,
          impact,
          effort,
          notes,
          completed: false
        };
        state.milestones.push(newM);
      }

      saveState();
      renderAll();
      modal.classList.remove('active');
    });

    // Habit Form Submit
    habitForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('habit-name').value;
      const cue = document.getElementById('habit-cue').value;

      const newH = {
        id: 'h_' + Date.now(),
        name,
        cue,
        streak: 1,
        completedToday: false
      };

      state.habits.push(newH);
      saveState();
      renderHabits();
      renderStats();
      habitForm.reset();
    });

    // Habit check-in
    habitsContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('habit-check-btn')) {
        const id = e.target.dataset.id;
        const h = state.habits.find(item => item.id === id);
        if (h) {
          h.completedToday = !h.completedToday;
          if (h.completedToday) {
            h.streak += 1;
            triggerConfetti();
          } else {
            h.streak = Math.max(0, h.streak - 1);
          }
          saveState();
          renderHabits();
          renderStats();
        }
      }
    });

    // Export / Import / Reset
    document.getElementById('btn-export').addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8,"+ encodeURIComponent(JSON.stringify(state, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `zenithgoal_backup_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });

    const importFile = document.getElementById('import-file');
    document.getElementById('btn-import').addEventListener('click', () => {
      importFile.click();
    });

    importFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed && parsed.goal && parsed.milestones) {
            state = parsed;
            saveState();
            populateGoalForm();
            renderAll();
            alert('Data imported successfully!');
          } else {
            alert('Invalid backup file structure.');
          }
        } catch (err) {
          alert('Error parsing JSON file.');
        }
      };
      reader.readAsText(file);
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all data to default?')) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
      }
    });
  }

  function openMilestoneModal(id) {
    if (id) {
      const m = state.milestones.find(item => item.id === id);
      if (m) {
        modalTitle.textContent = 'Edit Micro-Milestone';
        itemIdInput.value = m.id;
        itemTitleInput.value = m.title;
        itemPhaseInput.value = m.phase;
        itemImpactInput.value = m.impact;
        itemEffortInput.value = m.effort || 'Medium';
        itemNotesInput.value = m.notes || '';
      }
    } else {
      modalTitle.textContent = 'Add Micro-Milestone';
      itemIdInput.value = '';
      milestoneItemForm.reset();
    }
    modal.classList.add('active');
  }

  // Utility: HTML Escape
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Confetti Animation
  function triggerConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];

    for (let i = 0; i < 75; i++) {
      particles.push({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.7) * 12,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.02 + 0.01
      });
    }

    function update() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3; // gravity
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(index, 1);
          return;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      if (particles.length > 0) {
        requestAnimationFrame(update);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    update();
  }

  // Run App
  init();
});
