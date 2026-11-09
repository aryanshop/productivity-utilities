/* AuraKnit Client Logic */

const STORAGE_KEY = 'auraknit_projects_vault_v1';

// Default project data structure
const defaultProjects = [
  {
    id: 'proj-1',
    name: 'Classic Cabled Pullover',
    unit: 'inches',
    swatchMeasuredWidth: 4,
    swatchMeasuredHeight: 4,
    swatchStitches: 20,
    swatchRows: 28,
    targetStitchesPer: 4,
    yarnWeightCategory: 'worsted',
    skeinYardage: 220,
    skeinWeightGrams: 100,
    projectTargetYardage: 1500,
    safetyBuffer: 10,
    fiberContent: '100% Wool',
    garmentType: 'sweater',
    targetBust: 42,
    positiveease: 4,
    garmentLength: 18
  },
  {
    id: 'proj-2',
    name: 'Summer Linen Tee',
    unit: 'cm',
    swatchMeasuredWidth: 10,
    swatchMeasuredHeight: 10,
    swatchStitches: 24,
    swatchRows: 32,
    targetStitchesPer: 4,
    yarnWeightCategory: 'fingering',
    skeinYardage: 400,
    skeinWeightGrams: 100,
    projectTargetYardage: 1200,
    safetyBuffer: 10,
    fiberContent: 'Linen / Cotton Blend',
    garmentType: 'sweater',
    targetBust: 38,
    positiveease: 2,
    garmentLength: 15
  }
];

let state = {
  projects: [],
  activeProjectId: null
};

// DOM Elements
const projectListEl = document.getElementById('project-list');
const projectNameInput = document.getElementById('project-name-input');
const btnNewProject = document.getElementById('btn-new-project');
const btnSaveProject = document.getElementById('btn-save-project');
const btnExport = document.getElementById('btn-export');
const importFile = document.getElementById('import-file');
const saveStatus = document.getElementById('save-status');

// Inputs
const swatchUnit = document.getElementById('swatch-unit');
const unitLabels = document.querySelectorAll('.unit-label');
const swatchMeasuredWidth = document.getElementById('swatch-measured-width');
const swatchMeasuredHeight = document.getElementById('swatch-measured-height');
const swatchStitches = document.getElementById('swatch-stitches');
const swatchRows = document.getElementById('swatch-rows');
const targetStitchesPer = document.getElementById('target-stitches-per');

const yarnWeightCategory = document.getElementById('yarn-weight-category');
const skeinYardage = document.getElementById('skein-yardage');
const skeinWeightGrams = document.getElementById('skein-weight-grams');
const projectTargetYardage = document.getElementById('project-target-yardage');
const safetyBuffer = document.getElementById('safety-buffer');
const fiberContent = document.getElementById('fiber-content');

const garmentType = document.getElementById('garment-type');
const targetBust = document.getElementById('target-bust');
const positiveEase = document.getElementById('positive-ease');
const garmentLength = document.getElementById('garment-length');

// Results
const resStitchDensity = document.getElementById('res-stitch-density');
const resRowDensity = document.getElementById('res-row-density');
const resAspectRatio = document.getElementById('res-aspect-ratio');

const resTotalYardage = document.getElementById('res-total-yardage');
const resSkeinsNeeded = document.getElementById('res-skeins-needed');
const resTotalWeight = document.getElementById('res-total-weight');

const resTotalCircumference = document.getElementById('res-total-circumference');
const resCastOnStitches = document.getElementById('res-cast-on-stitches');
const resTotalRows = document.getElementById('res-total-rows');

// Canvas
const swatchCanvas = document.getElementById('swatch-canvas');
const btnRegenerateSwatch = document.getElementById('btn-regenerate-swatch');
const swatchDimensionsBadge = document.getElementById('swatch-dimensions-badge');

// Initialize Application
function init() {
  loadFromStorage();
  setupTabs();
  setupEventListeners();
  renderProjectList();
  loadActiveProjectIntoForm();
  calculateAndRender();
}

function loadFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        state.projects = parsed;
        state.activeProjectId = parsed[0].id;
        return;
      }
    }
  } catch (e) {
    console.error('Failed to load local storage', e);
  }
  state.projects = JSON.parse(JSON.stringify(defaultProjects));
  state.activeProjectId = state.projects[0].id;
  saveToStorage();
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.projects));
    showSaveStatus('Saved locally');
  } catch (e) {
    showSaveStatus('Error saving!');
  }
}

function showSaveStatus(msg) {
  saveStatus.textContent = msg;
  setTimeout(() => {
    saveStatus.textContent = 'All changes saved locally';
  }, 2500);
}

// Tabs navigation
function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const tabId = 'tab-' + btn.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');

      if (btn.getAttribute('data-tab') === 'visualizer') {
        drawSwatchCanvas();
      }
    });
  });
}

// Render Project Sidebar List
function renderProjectList() {
  projectListEl.innerHTML = '';
  state.projects.forEach(proj => {
    const item = document.createElement('div');
    item.className = 'project-item' + (proj.id === state.activeProjectId ? ' active' : '');
    
    const titleSpan = document.createElement('span');
    titleSpan.textContent = proj.name;
    titleSpan.style.flex = '1';
    titleSpan.addEventListener('click', () => {
      switchProject(proj.id);
    });
    item.appendChild(titleSpan);

    if (state.projects.length > 1) {
      const delBtn = document.createElement('button');
      delBtn.className = 'project-item-del';
      delBtn.textContent = '×';
      delBtn.title = 'Delete Project';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteProject(proj.id);
      });
      item.appendChild(delBtn);
    }

    projectListEl.appendChild(item);
  });
}

function switchProject(id) {
  saveCurrentFormToActiveProject();
  state.activeProjectId = id;
  renderProjectList();
  loadActiveProjectIntoForm();
  calculateAndRender();
}

function deleteProject(id) {
  state.projects = state.projects.filter(p => p.id !== id);
  if (state.activeProjectId === id && state.projects.length > 0) {
    state.activeProjectId = state.projects[0].id;
  }
  saveToStorage();
  renderProjectList();
  loadActiveProjectIntoForm();
  calculateAndRender();
}

function getActiveProject() {
  return state.projects.find(p => p.id === state.activeProjectId) || state.projects[0];
}

function loadActiveProjectIntoForm() {
  const p = getActiveProject();
  if (!p) return;

  projectNameInput.value = p.name;
  swatchUnit.value = p.unit || 'inches';
  swatchMeasuredWidth.value = p.swatchMeasuredWidth;
  swatchMeasuredHeight.value = p.swatchMeasuredHeight;
  swatchStitches.value = p.swatchStitches;
  swatchRows.value = p.swatchRows;
  targetStitchesPer.value = p.targetStitchesPer;

  yarnWeightCategory.value = p.yarnWeightCategory;
  skeinYardage.value = p.skeinYardage;
  skeinWeightGrams.value = p.skeinWeightGrams;
  projectTargetYardage.value = p.projectTargetYardage;
  safetyBuffer.value = p.safetyBuffer;
  fiberContent.value = p.fiberContent;

  garmentType.value = p.garmentType;
  targetBust.value = p.targetBust;
  positiveEase.value = p.positiveease;
  garmentLength.value = p.garmentLength;

  updateUnitLabels();
}

function saveCurrentFormToActiveProject() {
  const p = getActiveProject();
  if (!p) return;

  p.name = projectNameInput.value.trim() || 'Untitled Project';
  p.unit = swatchUnit.value;
  p.swatchMeasuredWidth = parseFloat(swatchMeasuredWidth.value) || 4;
  p.swatchMeasuredHeight = parseFloat(swatchMeasuredHeight.value) || 4;
  p.swatchStitches = parseFloat(swatchStitches.value) || 20;
  p.swatchRows = parseFloat(swatchRows.value) || 28;
  p.targetStitchesPer = parseFloat(targetStitchesPer.value) || 4;

  p.yarnWeightCategory = yarnWeightCategory.value;
  p.skeinYardage = parseFloat(skeinYardage.value) || 200;
  p.skeinWeightGrams = parseFloat(skeinWeightGrams.value) || 100;
  p.projectTargetYardage = parseFloat(projectTargetYardage.value) || 1000;
  p.safetyBuffer = parseFloat(safetyBuffer.value) || 10;
  p.fiberContent = fiberContent.value;

  p.garmentType = garmentType.value;
  p.targetBust = parseFloat(targetBust.value) || 40;
  p.positiveease = parseFloat(positiveEase.value) || 4;
  p.garmentLength = parseFloat(garmentLength.value) || 16;
}

function updateUnitLabels() {
  const u = swatchUnit.value === 'inches' ? 'in' : 'cm';
  unitLabels.forEach(el => el.textContent = u);
}

// Calculations and UI updates
function calculateAndRender() {
  updateUnitLabels();

  const mw = parseFloat(swatchMeasuredWidth.value) || 4;
  const mh = parseFloat(swatchMeasuredHeight.value) || 4;
  const st = parseFloat(swatchStitches.value) || 20;
  const rw = parseFloat(swatchRows.value) || 28;
  const basis = parseFloat(targetStitchesPer.value) || 4;

  // Gauge densities per basis unit
  const stitchesPerUnit = (st / mw) * basis;
  const rowsPerUnit = (rw / mh) * basis;
  const aspectRatio = (st / mw) / (rw / mh);

  resStitchDensity.textContent = stitchesPerUnit.toFixed(2);
  resRowDensity.textContent = rowsPerUnit.toFixed(2);
  resAspectRatio.textContent = aspectRatio.toFixed(2);

  // Yarn calculations
  const targetYards = parseFloat(projectTargetYardage.value) || 1000;
  const buffer = parseFloat(safetyBuffer.value) || 10;
  const totalYardsWithBuffer = targetYards * (1 + buffer / 100);
  const sYardage = parseFloat(skeinYardage.value) || 200;
  const sWeight = parseFloat(skeinWeightGrams.value) || 100;

  const skeinsNeededCount = Math.ceil(totalYardsWithBuffer / sYardage);
  const totalWeightGrams = skeinsNeededCount * sWeight;

  resTotalYardage.textContent = Math.round(totalYardsWithBuffer).toLocaleString();
  resSkeinsNeeded.textContent = skeinsNeededCount;
  resTotalWeight.textContent = totalWeightGrams >= 1000 ? (totalWeightGrams / 1000).toFixed(2) + 'kg' : totalWeightGrams + 'g';

  // Garment sizing
  const tBust = parseFloat(targetBust.value) || 40;
  const pEase = parseFloat(positiveEase.value) || 4;
  const gLen = parseFloat(garmentLength.value) || 16;

  const totalCirc = tBust + pEase;
  // Convert totalCirc to unit basis
  // Stitches per 1 inch / 1 cm
  const singleStitchDensity = st / mw;
  const singleRowDensity = rw / mh;

  const castOn = Math.round(totalCirc * singleStitchDensity);
  const totalVertRows = Math.round(gLen * singleRowDensity);

  resTotalCircumference.textContent = totalCirc.toFixed(1);
  resCastOnStitches.textContent = castOn;
  resTotalRows.textContent = totalVertRows;

  swatchDimensionsBadge.textContent = `Grid: ${Math.round(st)} st x ${Math.round(rw)} rows`;
}

// Canvas Swatch Visualizer Drawing
function drawSwatchCanvas() {
  if (!swatchCanvas) return;
  const ctx = swatchCanvas.getContext('2d');
  const width = swatchCanvas.width;
  const height = swatchCanvas.height;

  ctx.clearRect(0, 0, width, height);

  // Background
  ctx.fillStyle = '#faf6f0';
  ctx.fillRect(0, 0, width, height);

  const st = parseInt(swatchStitches.value) || 20;
  const rw = parseInt(swatchRows.value) || 28;

  const cellWidth = Math.min(24, Math.max(8, (width - 60) / st));
  const cellHeight = Math.min(24, Math.max(8, (height - 60) / rw));

  const startX = (width - (st * cellWidth)) / 2;
  const startY = (height - (rw * cellHeight)) / 2;

  // Draw grid stitches (representing stockinette knit V's)
  for (let r = 0; r < rw; r++) {
    for (let c = 0; c < st; c++) {
      const x = startX + (c * cellWidth);
      const y = startY + (r * cellHeight);

      // Alternating knit texture color
      ctx.fillStyle = ((r + c) % 2 === 0) ? '#b85d38' : '#d47853';
      ctx.strokeStyle = '#9c4b2b';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.roundRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2, 3);
      ctx.fill();
      ctx.stroke();

      // Draw tiny 'V' shape representation if cells are large enough
      if (cellWidth > 14 && cellHeight > 14) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + cellWidth * 0.3, y + cellHeight * 0.3);
        ctx.lineTo(x + cellWidth * 0.5, y + cellHeight * 0.7);
        ctx.lineTo(x + cellWidth * 0.7, y + cellHeight * 0.3);
        ctx.stroke();
      }
    }
  }

  // Draw border outline
  ctx.strokeStyle = '#2c2420';
  ctx.lineWidth = 2;
  ctx.strokeRect(startX, startY, st * cellWidth, rw * cellHeight);
}

// Event Listeners
function setupEventListeners() {
  const liveInputs = [
    swatchUnit, swatchMeasuredWidth, swatchMeasuredHeight,
    swatchStitches, swatchRows, targetStitchesPer,
    yarnWeightCategory, skeinYardage, skeinWeightGrams,
    projectTargetYardage, safetyBuffer, fiberContent,
    garmentType, targetBust, positiveEase, garmentLength
  ];

  liveInputs.forEach(input => {
    if (input) {
      input.addEventListener('input', () => {
        calculateAndRender();
        saveCurrentFormToActiveProject();
      });
      input.addEventListener('change', () => {
        calculateAndRender();
        saveCurrentFormToActiveProject();
        renderProjectList();
      });
    }
  });

  projectNameInput.addEventListener('input', () => {
    saveCurrentFormToActiveProject();
    renderProjectList();
  });

  btnSaveProject.addEventListener('click', () => {
    saveCurrentFormToActiveProject();
    saveToStorage();
    renderProjectList();
  });

  btnNewProject.addEventListener('click', () => {
    saveCurrentFormToActiveProject();
    const newId = 'proj-' + Date.now();
    const newProj = {
      id: newId,
      name: 'New Fiber Project',
      unit: 'inches',
      swatchMeasuredWidth: 4,
      swatchMeasuredHeight: 4,
      swatchStitches: 20,
      swatchRows: 28,
      targetStitchesPer: 4,
      yarnWeightCategory: 'worsted',
      skeinYardage: 200,
      skeinWeightGrams: 100,
      projectTargetYardage: 1200,
      safetyBuffer: 10,
      fiberContent: '100% Wool',
      garmentType: 'sweater',
      targetBust: 40,
      positiveease: 4,
      garmentLength: 16
    };
    state.projects.unshift(newProj);
    state.activeProjectId = newId;
    saveToStorage();
    renderProjectList();
    loadActiveProjectIntoForm();
    calculateAndRender();
  });

  btnRegenerateSwatch.addEventListener('click', () => {
    drawSwatchCanvas();
  });

  // Export JSON Vault
  btnExport.addEventListener('click', () => {
    saveCurrentFormToActiveProject();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.projects, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "auraknit_fiber_projects.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  // Import JSON Vault
  importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported) && imported.length > 0) {
          state.projects = imported;
          state.activeProjectId = imported[0].id;
          saveToStorage();
          renderProjectList();
          loadActiveProjectIntoForm();
          calculateAndRender();
          showSaveStatus('Vault imported successfully');
        }
      } catch (err) {
        alert('Invalid JSON project file.');
      }
    };
    reader.readAsText(file);
    importFile.value = '';
  });
}

// Run on load
document.addEventListener('DOMContentLoaded', init);
