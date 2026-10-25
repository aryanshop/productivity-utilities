document.addEventListener('DOMContentLoaded', () => {
  // State Management
  let tasks = JSON.parse(localStorage.getItem('chronoknit_tasks')) || [
    { id: '1', title: 'Deep Work & Strategic Architecture', start: '09:00', end: '11:30', type: 'deep' },
    { id: '2', title: 'Circadian Reset & Hydration Break', start: '11:30', end: '12:00', type: 'break' },
    { id: '3', title: 'Client Syncs & Email Triage', start: '13:00', end: '15:00', type: 'shallow' },
    { id: '4', title: 'Cardio & Physical Movement', start: '17:00', end: '18:00', type: 'physical' }
  ];

  let wakeTimeInput = document.getElementById('wakeTime');
  let sleepDurationSelect = document.getElementById('sleepDuration');
  let chronotypeSelect = document.getElementById('chronotype');
  let optimalBedtimeEl = document.getElementById('optimalBedtime');
  let circadianCanvas = document.getElementById('circadianCanvas');
  let taskForm = document.getElementById('taskForm');
  let scheduleList = document.getElementById('scheduleList');
  let taskCountBadge = document.getElementById('taskCountBadge');
  let statTotalHours = document.getElementById('statTotalHours');
  let statSleepCycles = document.getElementById('statSleepCycles');
  let statBurnoutRisk = document.getElementById('statBurnoutRisk');

  // Event Listeners
  wakeTimeInput.addEventListener('change', updateCircadianCalculations);
  sleepDurationSelect.addEventListener('change', updateCircadianCalculations);
  chronotypeSelect.addEventListener('change', updateCircadianCalculations);
  document.getElementById('btnCalculateSleep').addEventListener('click', updateCircadianCalculations);
  
  taskForm.addEventListener('submit', handleAddTask);
  document.getElementById('btnClear').addEventListener('click', handleClearAll);
  document.getElementById('btnExport').addEventListener('click', handleExport);
  document.getElementById('btnImportTrigger').addEventListener('click', () => document.getElementById('fileImport').click());
  document.getElementById('fileImport').addEventListener('change', handleImport);

  // Initial Render
  updateCircadianCalculations();
  renderTasks();

  function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  function minutesToTime(totalMinutes) {
    totalMinutes = (totalMinutes + 1440) % 1440;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  function updateCircadianCalculations() {
    const wakeMins = timeToMinutes(wakeTimeInput.value);
    const durationMins = parseInt(sleepDurationSelect.value, 10);
    
    // Bedtime = wake time minus desired sleep duration
    const bedtimeMins = wakeMins - durationMins;
    optimalBedtimeEl.textContent = minutesToTime(bedtimeMins);

    const cycles = (durationMins / 90).toFixed(1);
    statSleepCycles.textContent = cycles;

    drawCircadianWave();
  }

  function handleAddTask(e) {
    e.preventDefault();
    const title = document.getElementById('taskTitle').value.trim();
    const start = document.getElementById('taskStart').value;
    const end = document.getElementById('taskEnd').value;
    const type = document.getElementById('taskType').value;

    if (timeToMinutes(end) <= timeToMinutes(start)) {
      alert('End time must be later than start time.');
      return;
    }

    const newTask = {
      id: Date.now().toString(),
      title,
      start,
      end,
      type
    };

    tasks.push(newTask);
    tasks.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
    saveAndRefresh();
    taskForm.reset();
    document.getElementById('taskStart').value = end; // Convenience default
  }

  window.deleteTask = function(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveAndRefresh();
  };

  function handleClearAll() {
    if (confirm('Are you sure you want to clear all scheduled blocks?')) {
      tasks = [];
      saveAndRefresh();
    }
  }

  function saveAndRefresh() {
    localStorage.setItem('chronoknit_tasks', JSON.stringify(tasks));
    renderTasks();
    drawCircadianWave();
  }

  function renderTasks() {
    scheduleList.innerHTML = '';
    taskCountBadge.textContent = `${tasks.length} Block${tasks.length === 1 ? '' : 's'}`;

    if (tasks.length === 0) {
      scheduleList.innerHTML = `
        <div class="empty-state">
          <p>No time blocks added yet. Start by scheduling your first activity!</p>
        </div>
      `;
      statTotalHours.textContent = '0h';
      statBurnoutRisk.textContent = 'Low';
      return;
    }

    let totalMins = 0;
    let consecutiveDeepMins = 0;
    let maxConsecutiveDeep = 0;

    tasks.forEach(task => {
      const startMins = timeToMinutes(task.start);
      const endMins = timeToMinutes(task.end);
      const duration = endMins - startMins;
      totalMins += duration;

      if (task.type === 'deep') {
        consecutiveDeepMins += duration;
        if (consecutiveDeepMins > maxConsecutiveDeep) maxConsecutiveDeep = consecutiveDeepMins;
      } else if (task.type === 'break') {
        consecutiveDeepMins = 0;
      }

      const item = document.createElement('div');
      item.className = `schedule-item type-${task.type}`;
      item.innerHTML = `
        <div class="task-info">
          <span class="task-title">${escapeHTML(task.title)}</span>
          <span class="task-time">${task.start} &ndash; ${task.end} (${Math.round(duration/60*10)/10}h)</span>
        </div>
        <div class="task-actions">
          <span class="task-type-pill">${task.type}</span>
          <button class="btn-delete" onclick="deleteTask('${task.id}')" title="Delete block">&times;</button>
        </div>
      `;
      scheduleList.appendChild(item);
    });

    const totalHours = Math.round(totalMins / 60 * 10) / 10;
    statTotalHours.textContent = `${totalHours}h`;

    // Evaluate Burnout Risk
    if (maxConsecutiveDeep > 180 || totalHours > 10) {
      statBurnoutRisk.textContent = 'High';
      statBurnoutRisk.style.color = 'var(--accent-physical)';
    } else if (maxConsecutiveDeep > 120 || totalHours > 8) {
      statBurnoutRisk.textContent = 'Moderate';
      statBurnoutRisk.style.color = '#fbbf24';
    } else {
      statBurnoutRisk.textContent = 'Low';
      statBurnoutRisk.style.color = 'var(--accent-break)';
    }
  }

  function drawCircadianWave() {
    if (!circadianCanvas) return;
    const ctx = circadianCanvas.getContext('2d');
    const width = circadianCanvas.width;
    const height = circadianCanvas.height;

    ctx.clearRect(0, 0, width, height);

    // Background grid lines for hours (0 to 24)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 24; i += 3) {
      const x = (i / 24) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px system-ui';
      ctx.fillText(`${String(i).padStart(2, '0')}:00`, x + 4, height - 8);
    }

    // Draw Scheduled Tasks blocks as colored bands on canvas
    tasks.forEach(task => {
      const startMins = timeToMinutes(task.start);
      const endMins = timeToMinutes(task.end);
      const startX = (startMins / 1440) * width;
      const endX = (endMins / 1440) * width;
      
      let color = 'rgba(99, 102, 241, 0.25)';
      if (task.type === 'shallow') color = 'rgba(56, 189, 248, 0.25)';
      if (task.type === 'break') color = 'rgba(52, 211, 153, 0.25)';
      if (task.type === 'physical') color = 'rgba(244, 63, 94, 0.25)';

      ctx.fillStyle = color;
      ctx.fillRect(startX, 0, endX - startX, height - 20);
    });

    // Draw Circadian Energy Curve based on chronotype peak
    const chronotype = chronotypeSelect.value;
    let peakHour = 11; // default intermediate
    if (chronotype === 'morning') peakHour = 10;
    if (chronotype === 'evening') peakHour = 15;

    ctx.beginPath();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;

    for (let x = 0; x < width; x += 2) {
      const hour = (x / width) * 24;
      // Sinusoidal energy curve formula peaking around chronotype peak hour
      const angle = ((hour - peakHour + 6) / 24) * 2 * Math.PI;
      const normalizedSine = (Math.sin(angle) + 1) / 2; // 0 to 1
      const y = height - 25 - (normalizedSine * (height - 45));

      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Draw wave gradient fill
    ctx.lineTo(width, height - 20);
    ctx.lineTo(0, height - 20);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
    gradient.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  function handleExport() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "chronoknit_schedule.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  function handleImport(e) {
    const fileReader = new FileReader();
    if (e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = event => {
        try {
          const imported = JSON.parse(event.target.result);
          if (Array.isArray(imported)) {
            tasks = imported;
            saveAndRefresh();
            alert('Schedule imported successfully!');
          } else {
            alert('Invalid JSON format.');
          }
        } catch (err) {
          alert('Error parsing JSON file.');
        }
      };
    }
  }

  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }
});
