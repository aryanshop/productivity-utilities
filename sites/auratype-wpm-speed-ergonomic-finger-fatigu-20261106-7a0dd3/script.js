/* AuraType: WPM Speed & Ergonomic Finger Fatigue Lab - script.js */

document.addEventListener('DOMContentLoaded', () => {
  // State management
  const state = {
    activeTab: 'test',
    testMode: 'prose',
    timeLimit: 60,
    timeLeft: 60,
    isRunning: false,
    isFinished: false,
    timerId: null,
    currentIndex: 0,
    errors: 0,
    totalTyped: 0,
    startTime: null,
    charCount: 0,
    keystrokeCounts: {},
    fingerCounts: {
      'Left Pinky': 0,
      'Left Ring': 0,
      'Left Middle': 0,
      'Left Index': 0,
      'Right Index': 0,
      'Right Middle': 0,
      'Right Ring': 0,
      'Right Pinky': 0,
      'Thumb': 0
    },
    history: JSON.parse(localStorage.getItem('auratype_history') || '[]')
  };

  // Finger mapping table for QWERTY
  const fingerMap = {
    '1':'Left Pinky','q':'Left Pinky','a':'Left Pinky','z':'Left Pinky',
    '2':'Left Ring','w':'Left Ring','s':'Left Ring','x':'Left Ring',
    '3':'Left Middle','e':'Left Middle','d':'Left Middle','c':'Left Middle',
    '4':'Left Index','5':'Left Index','r':'Left Index','t':'Left Index','f':'Left Index','g':'Left Index','v':'Left Index','b':'Left Index',
    '6':'Right Index','7':'Right Index','y':'Right Index','u':'Right Index','h':'Right Index','j':'Right Index','n':'Right Index','m':'Right Index',
    '8':'Right Middle','i':'Right Middle','k':'Right Middle',',':'Right Middle',
    '9':'Right Ring','o':'Right Ring','l':'Right Ring','.':'Right Ring',
    '0':'Right Pinky','p':'Right Pinky',';':'Right Pinky','/':'Right Pinky','-':'Right Pinky','=':'Right Pinky','[': 'Right Pinky', ']': 'Right Pinky', '\\': 'Right Pinky', "'": 'Right Pinky',
    ' ': 'Thumb'
  };

  // Sample Prompts
  const samplePrompts = {
    prose: [
      "The quick brown fox jumps over the lazy dog. Programming is the art of telling another human what one wants the computer to do with absolute clarity.",
      "In a hole in the ground there lived a hobbit. Not a nasty, dirty, wet hole, filled with the ends of worms and an oozy smell, nor yet a dry, bare, sandy hole.",
      "Far out in the uncharted backwaters of the unfashionable end of the western spiral arm of the Galaxy lies a small unregarded yellow sun."
    ],
    code: [
      "function calculateErgonomics(keystrokes) { return Object.keys(keystrokes).reduce((acc, k) => acc + keystrokes[k], 0); }",
      "const handleInput = (event) => { if (event.key === 'Enter') { submitForm(); } else { updateState(); } };",
      "class FingerLoadAnalyzer extends Worker { constructor() { super(); this.fatigueIndex = 0.0; } runAnalysis() { return true; } }"
    ],
    symbols: [
      "const [state, setState] = useState({ count: 0, active: true }); if (x >= 0 && y <= 100) { console.log(arr[i]); }",
      "import { Component } from '@angular/core'; @Input() data: Array<string> = []; export interface User { id: number; name: string; }",
      "SELECT u.id, u.name, COUNT(o.order_id) FROM users u LEFT JOIN orders o ON u.id = o.user_id GROUP BY u.id HAVING COUNT(o.order_id) > 5;"
    ],
    custom: [
      "Custom typing session snippet. Type carefully and monitor your finger load balance across the physical home row." 
    ]
  };

  // DOM Elements
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const testModeSelect = document.getElementById('testMode');
  const timeLimitSelect = document.getElementById('timeLimit');
  const restartBtn = document.getElementById('restartBtn');
  const textDisplay = document.getElementById('textDisplay');
  const focusOverlay = document.getElementById('focusOverlay');
  const statWpm = document.getElementById('statWpm');
  const statAcc = document.getElementById('statAcc');
  const statTime = document.getElementById('statTime');
  const statErgo = document.getElementById('statErgo');
  const virtualKeyboard = document.getElementById('virtualKeyboard');
  const fingerBars = document.getElementById('fingerBars');
  const leftHandRatio = document.getElementById('leftHandRatio');
  const rightHandRatio = document.getElementById('rightHandRatio');
  const homeRowRatio = document.getElementById('homeRowRatio');
  const stretchRatio = document.getElementById('stretchRatio');
  const fatigueIndex = document.getElementById('fatigueIndex');
  const ergonomicTips = document.getElementById('ergonomicTips');
  const targetFingerSelect = document.getElementById('targetFinger');
  const generateDrillBtn = document.getElementById('generateDrillBtn');
  const drillDisplay = document.getElementById('drillDisplay');
  const drillInput = document.getElementById('drillInput');
  const drillFeedback = document.getElementById('drillFeedback');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  const historyTableBody = document.getElementById('historyTableBody');

  // Initialize Virtual Keyboard layout
  function initVirtualKeyboard() {
    const rows = [
      ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
      ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
      ['Caps', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'Enter'],
      ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'Shift'],
      [' ', 'Space']
    ];

    virtualKeyboard.innerHTML = '';
    rows.forEach((row, rIdx) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'keyboard-row';
      row.forEach(key => {
        const keyEl = document.createElement('div');
        keyEl.className = 'key-cap';
        let charCode = key;
        if (key === 'Backspace') keyEl.classList.add('w-1-75');
        if (key === 'Tab' || key === '\\') keyEl.classList.add('w-1-5');
        if (key === 'Caps') keyEl.classList.add('w-1-75');
        if (key === 'Enter') keyEl.classList.add('w-2-25');
        if (key === 'Shift') keyEl.classList.add('w-2-25');
        if (key === 'Space') {
          keyEl.classList.add('w-6-25');
          charCode = ' ';
        }
        keyEl.textContent = key === ' ' ? 'SPACE' : key;
        keyEl.dataset.key = charCode.toLowerCase();
        rowEl.appendChild(keyEl);
      });
      virtualKeyboard.appendChild(rowEl);
    });
  }

  // Tab Switching logic
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      state.activeTab = target;

      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      tabContents.forEach(c => c.classList.remove('active'));
      document.getElementById(`tab-${target}`).classList.add('active');

      if (target === 'history') {
        renderHistoryTable();
      }
    });
  });

  // Load current prompt text
  function loadPrompt() {
    const mode = testModeSelect.value;
    const list = samplePrompts[mode] || samplePrompts.prose;
    const promptText = list[Math.floor(Math.random() * list.length)];
    
    state.currentIndex = 0;
    state.errors = 0;
    state.totalTyped = 0;
    state.charCount = promptText.length;
    state.isFinished = false;
    state.keystrokeCounts = {};
    Object.keys(state.fingerCounts).forEach(k => state.fingerCounts[k] = 0);

    textDisplay.innerHTML = '';
    promptText.split('').forEach((char, idx) => {
      const span = document.createElement('span');
      span.textContent = char;
      if (idx === 0) span.className = 'current';
      textDisplay.appendChild(span);
    });

    statWpm.textContent = '0';
    statAcc.textContent = '100%';
    statErgo.textContent = '--';
    state.timeLimit = parseInt(timeLimitSelect.value, 10);
    state.timeLeft = state.timeLimit;
    statTime.textContent = state.timeLimit === 0 ? '∞' : `${state.timeLeft}s`;
    resetHeatmap();
  }

  // Reset timer and state
  function resetTest() {
    if (state.timerId) clearInterval(state.timerId);
    state.isRunning = false;
    state.isFinished = false;
    focusOverlay.classList.remove('hidden');
    loadPrompt();
  }

  // Start Timer
  function startTimer() {
    if (state.isRunning || state.isFinished) return;
    state.isRunning = true;
    state.startTime = Date.now();
    focusOverlay.classList.add('hidden');

    if (state.timeLimit > 0) {
      state.timerId = setInterval(() => {
        state.timeLeft--;
        statTime.textContent = `${state.timeLeft}s`;
        updateLiveStats();
        if (state.timeLeft <= 0) {
          finishTest();
        }
      }, 1000);
    }
  }

  // Handle Typing Keydown
  document.addEventListener('keydown', (e) => {
    if (state.activeTab !== 'test' || state.isFinished) return;

    // Ignore modifier keys alone
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) return;

    // Focus handling
    if (focusOverlay.classList.contains('hidden') === false) {
      startTimer();
    }

    const spans = textDisplay.querySelectorAll('span');
    if (state.currentIndex >= spans.length) return;

    const expectedChar = spans[state.currentIndex].textContent;
    let typedChar = e.key;

    if (e.key === 'Enter') typedChar = '\n';

    // Track keystrokes for heatmap & ergonomics
    const lowerKey = typedChar.toLowerCase();
    state.keystrokeCounts[lowerKey] = (state.keystrokeCounts[lowerKey] || 0) + 1;
    state.totalTyped++;

    const finger = fingerMap[lowerKey] || 'Thumb';
    state.fingerCounts[finger]++;

    updateHeatmapUI(lowerKey);

    if (typedChar === expectedChar) {
      spans[state.currentIndex].className = 'correct';
      state.currentIndex++;
    } else {
      spans[state.currentIndex].className = 'incorrect';
      state.currentIndex++;
      state.errors++;
    }

    if (state.currentIndex < spans.length) {
      spans[state.currentIndex].className = 'current';
    } else {
      finishTest();
    }

    updateLiveStats();
  });

  // Update live statistics
  function updateLiveStats() {
    const elapsedMinutes = state.timeLimit > 0 
      ? (state.timeLimit - state.timeLeft) / 60 
      : (Date.now() - state.startTime) / 60000;

    const safeMinutes = elapsedMinutes > 0 ? elapsedMinutes : 0.0001;
    const wordsTyped = (state.currentIndex / 5);
    const wpm = Math.round(wordsTyped / safeMinutes);
    const accuracy = state.totalTyped > 0 
      ? Math.max(0, Math.round(((state.totalTyped - state.errors) / state.totalTyped) * 100)) 
      : 100;

    statWpm.textContent = isNaN(wpm) ? 0 : wpm;
    statAcc.textContent = `${accuracy}%`;

    // Calculate current ergo score based on home row & finger balance
    const ergoScore = calculateErgonomicScore();
    statErgo.textContent = ergoScore;
  }

  // Finish Test
  function finishTest() {
    if (state.timerId) clearInterval(state.timerId);
    state.isRunning = false;
    state.isFinished = true;
    focusOverlay.classList.remove('hidden');
    focusOverlay.querySelector('.focus-msg span').textContent = 'Test complete! Click or press any key to restart.';

    const wpm = parseInt(statWpm.textContent, 10);
    const accuracy = statAcc.textContent;
    const ergoScore = statErgo.textContent;
    const fatigueRating = fatigueIndex.textContent;

    // Save session to history
    const sessionRecord = {
      date: new Date().toLocaleString(),
      mode: testModeSelect.value,
      wpm,
      accuracy,
      ergoScore,
      fatigueRating
    };

    state.history.unshift(sessionRecord);
    if (state.history.length > 50) state.history.pop();
    localStorage.setItem('auratype_history', JSON.stringify(state.history));

    updateErgonomicsPanel();
  }

  // Heatmap UI updates
  function updateHeatmapUI(key) {
    const keyCaps = virtualKeyboard.querySelectorAll('.key-cap');
    keyCaps.forEach(cap => {
      if (cap.dataset.key === key) {
        const count = state.keystrokeCounts[key] || 0;
        cap.classList.remove('heat-low', 'heat-med', 'heat-high');
        if (count > 5) cap.classList.add('heat-high');
        else if (count > 2) cap.classList.add('heat-med');
        else if (count > 0) cap.classList.add('heat-low');
      }
    });
  }

  function resetHeatmap() {
    const keyCaps = virtualKeyboard.querySelectorAll('.key-cap');
    keyCaps.forEach(cap => {
      cap.classList.remove('heat-low', 'heat-med', 'heat-high');
    });
  }

  // Ergonomics & Finger Load Calculations
  function calculateErgonomicScore() {
    let total = Object.values(state.fingerCounts).reduce((a, b) => a + b, 0);
    if (total === 0) return '--';

    // Home row keys: a, s, d, f, j, k, l, ;
    const homeRowKeys = ['a', 's', 'd', 'f', 'j', 'k', 'l', ';'];
    let homeRowHits = 0;
    Object.keys(state.keystrokeCounts).forEach(k => {
      if (homeRowKeys.includes(k)) homeRowHits += state.keystrokeCounts[k];
    });

    const homeRatio = (homeRowHits / total) * 100;
    if (homeRatio > 65) return 'A+ (Optimal)';
    if (homeRatio > 50) return 'B (Good)';
    if (homeRatio > 35) return 'C (Fair)';
    return 'D (High Stretch)';
  }

  function updateErgonomicsPanel() {
    const total = Object.values(state.fingerCounts).reduce((a, b) => a + b, 0);
    
    fingerBars.innerHTML = '';
    Object.keys(state.fingerCounts).forEach(finger => {
      const count = state.fingerCounts[finger];
      const percent = total > 0 ? Math.round((count / total) * 100) : 0;

      const row = document.createElement('div');
      row.className = 'finger-bar-row';
      row.innerHTML = `
        <div class="finger-bar-info">
          <span>${finger}</span>
          <span>${percent}% (${count} hits)</span>
        </div>
        <div class="finger-bar-track">
          <div class="finger-bar-fill" style="width: ${percent}%"></div>
        </div>
      `;
      fingerBars.appendChild(row);
    });

    // Hand balance
    const leftHits = (state.fingerCounts['Left Pinky'] || 0) + (state.fingerCounts['Left Ring'] || 0) + (state.fingerCounts['Left Middle'] || 0) + (state.fingerCounts['Left Index'] || 0);
    const rightHits = (state.fingerCounts['Right Pinky'] || 0) + (state.fingerCounts['Right Ring'] || 0) + (state.fingerCounts['Right Middle'] || 0) + (state.fingerCounts['Right Index'] || 0);
    const handTotal = (leftHits + rightHits) > 0 ? (leftHits + rightHits) : 1;

    const leftPct = Math.round((leftHits / handTotal) * 100);
    const rightPct = Math.round((rightHits / handTotal) * 100);

    leftHandRatio.textContent = `${leftPct}%`;
    rightHandRatio.textContent = `${rightPct}%`;

    const homeRowKeys = ['a', 's', 'd', 'f', 'j', 'k', 'l', ';'];
    let homeRowHits = 0;
    Object.keys(state.keystrokeCounts).forEach(k => {
      if (homeRowKeys.includes(k)) homeRowHits += state.keystrokeCounts[k];
    });
    const homeRatioVal = total > 0 ? Math.round((homeRowHits / total) * 100) : 0;
    homeRowRatio.textContent = `${homeRatioVal}%`;

    const stretchHits = total - homeRowHits - (state.fingerCounts['Thumb'] || 0);
    const stretchPct = total > 0 ? Math.round((stretchHits / total) * 100) : 0;
    stretchRatio.textContent = `${stretchPct}%`;

    if (leftPct > 65 || rightPct > 65) {
      fatigueIndex.textContent = 'Imbalanced Hand Load';
      ergonomicTips.innerHTML = `
        <h4>Hand Balance Alert</h4>
        <p>Your typing heavily favors one hand (${leftPct > rightPct ? 'Left' : 'Right'}). Practice alternating hand sequences to reduce repetitive strain.</p>
      `;
    } else if (homeRatioVal < 40) {
      fatigueIndex.textContent = 'High Finger Travel';
      ergonomicTips.innerHTML = `
        <h4>Row Stretch Alert</h4>
        <p>Low home row retention detected. Return fingers promptly to the home row (ASDF JKL;) after reaching for top or bottom row keys.</p>
      `;
    } else {
      fatigueIndex.textContent = 'Optimal Ergonomics';
      ergonomicTips.innerHTML = `
        <h4>Excellent Form</h4>
        <p>Your keystroke distribution maintains healthy balance across hands and strong home row anchoring. Keep up the steady cadence!</p>
      `;
    }
  }

  // Weak Finger Drill Generator
  const drillSequences = {
    pinkies: ["a;a; aqaq p;p; qzqz p/p/ as;l", "qazwsxedc,./ p09oiuyt ;lkjhgfds"],
    rings: ["swsw olol wsos lole", "w2o9 s3i8 x2.9"],
    middles: ["dedi kiki edik ikde", "e3i8 d2k9 c,e3"],
    symbols: ["{}[];:() {}[] ();: {}", "a{b}c[d]e(f)g;h:i"],
    alternation: ["asdf jkl; asdf jkl;", "the quick brown fox jumps over lazy dog"]
  };

  generateDrillBtn.addEventListener('click', () => {
    const target = targetFingerSelect.value;
    const list = drillSequences[target] || drillSequences.pinkies;
    const drillText = list[Math.floor(Math.random() * list.length)];
    drillDisplay.textContent = drillText;
    drillInput.value = '';
    drillInput.focus();
    drillFeedback.textContent = 'Type the sequence above to test your finger precision.';
    drillFeedback.style.color = 'var(--text-secondary)';
  });

  drillInput.addEventListener('input', (e) => {
    const targetText = drillDisplay.textContent;
    const typedText = e.target.value;

    if (targetText.startsWith(typedText)) {
      if (typedText === targetText) {
        drillFeedback.textContent = 'Drill completed successfully! Excellent precision.';
        drillFeedback.style.color = 'var(--success)';
      } else {
        drillFeedback.textContent = 'Good progress... keep typing.';
        drillFeedback.style.color = 'var(--accent)';
      }
    } else {
      drillFeedback.textContent = 'Typing mismatch detected. Check finger placement.';
      drillFeedback.style.color = 'var(--danger)';
    }
  });

  // History Table Rendering
  function renderHistoryTable() {
    if (state.history.length === 0) {
      historyTableBody.innerHTML = `<tr><td colspan="6" class="empty-row">No typing sessions recorded yet. Complete a test!</td></tr>`;
      return;
    }

    historyTableBody.innerHTML = '';
    state.history.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.date}</td>
        <td>${item.mode}</td>
        <td><strong>${item.wpm}</strong></td>
        <td>${item.accuracy}</td>
        <td>${item.ergoScore}</td>
        <td>${item.fatigueRating}</td>
      `;
      historyTableBody.appendChild(tr);
    });
  }

  clearHistoryBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear your session history?')) {
      state.history = [];
      localStorage.removeItem('auratype_history');
      renderHistoryTable();
    }
  });

  exportJsonBtn.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `auratype_history_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  // Event listeners for controls
  testModeSelect.addEventListener('change', loadPrompt);
  timeLimitSelect.addEventListener('change', () => {
    state.timeLimit = parseInt(timeLimitSelect.value, 10);
    state.timeLeft = state.timeLimit;
    statTime.textContent = state.timeLimit === 0 ? '∞' : `${state.timeLeft}s`;
  });
  restartBtn.addEventListener('click', resetTest);
  textDisplay.addEventListener('click', () => {
    if (focusOverlay.classList.contains('hidden') === false) {
      startTimer();
    }
  });

  // Initial boot
  initVirtualKeyboard();
  loadPrompt();
});
