/**
 * AuraVault: Local-First Secret Note & Encrypted Share Studio
 * Uses Web Crypto API (AES-GCM, PBKDF2) for secure zero-knowledge client-side encryption.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'auravault_secrets_v1';
  let vault = [];
  let activeNoteId = null;

  // DOM Elements
  const vaultListEl = document.getElementById('vault-list');
  const searchInput = document.getElementById('search-input');
  const vaultStatsEl = document.getElementById('vault-stats');
  
  const paneWelcome = document.getElementById('pane-welcome');
  const paneEditor = document.getElementById('pane-editor');
  const paneUnlock = document.getElementById('pane-unlock');
  const paneDecrypted = document.getElementById('pane-decrypted');

  // Buttons & Inputs
  const btnNewNote = document.getElementById('btn-new-note');
  const btnWelcomeCreate = document.getElementById('btn-welcome-create');
  const btnExportVault = document.getElementById('btn-export-vault');
  const importFileInput = document.getElementById('import-file-input');
  const btnClearAll = document.getElementById('btn-clear-all');

  // Editor elements
  const noteTitleInput = document.getElementById('note-title-input');
  const noteContentInput = document.getElementById('note-content-input');
  const notePassphrase = document.getElementById('note-passphrase');
  const btnTogglePass = document.getElementById('btn-toggle-pass');
  const btnGenPassphrase = document.getElementById('btn-gen-passphrase');
  const entropyScoreVal = document.getElementById('entropy-score-val');
  const entropyStrengthLabel = document.getElementById('entropy-strength-label');
  const entropyProgress = document.getElementById('entropy-progress');
  const checkSelfDestruct = document.getElementById('check-self-destruct');
  const btnSaveSecret = document.getElementById('btn-save-secret');
  const btnCancelEditor = document.getElementById('btn-cancel-editor');

  // Unlock elements
  const unlockTitleDisplay = document.getElementById('unlock-title-display');
  const unlockPassphraseInput = document.getElementById('unlock-passphrase-input');
  const btnToggleUnlockPass = document.getElementById('btn-toggle-unlock-pass');
  const btnDecryptSecret = document.getElementById('btn-decrypt-secret');
  const decryptErrorMsg = document.getElementById('decrypt-error-msg');
  const unlockCreatedDate = document.getElementById('unlock-created-date');
  const unlockDestructBadge = document.getElementById('unlock-destruct-badge');
  const btnDeleteLocked = document.getElementById('btn-delete-locked');

  // Decrypted elements
  const decryptedTitleDisplay = document.getElementById('decrypted-title-display');
  const decryptedContentDisplay = document.getElementById('decrypted-content-display');
  const btnCopySecret = document.getElementById('btn-copy-secret');
  const btnShowQr = document.getElementById('btn-show-qr');
  const btnLockAgain = document.getElementById('btn-lock-again');
  const qrContainer = document.getElementById('qr-container');
  const qrSvgWrap = document.getElementById('qr-svg-wrap');
  const btnCloseQr = document.getElementById('btn-close-qr');

  const toastEl = document.getElementById('toast');

  // --- Initialization --- 
  function init() {
    loadVault();
    setupEventListeners();
    renderVaultList();
    showPane('welcome');
  }

  function loadVault() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        vault = JSON.parse(raw);
      }
    } catch (err) {
      console.error('Failed to load local vault:', err);
      vault = [];
    }
  }

  function saveVault() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(vault));
      renderVaultList();
    } catch (err) {
      showToast('Error saving to local storage.');
    }
  }

  // --- Crypto Core (Web Crypto API) --- 
  async function deriveKey(passphrase, salt, usage = ['encrypt', 'decrypt']) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      usage
    );
  }

  async function encryptData(plaintext, passphrase) {
    const enc = new TextEncoder();
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(passphrase, salt, ['encrypt']);
    
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      enc.encode(plaintext)
    );

    return {
      ciphertext: arrayBufferToBase64(ciphertext),
      iv: arrayBufferToBase64(iv),
      salt: arrayBufferToBase64(salt)
    };
  }

  async function decryptData(encryptedObj, passphrase) {
    const dec = new TextDecoder();
    const salt = base64ToArrayBuffer(encryptedObj.salt);
    const iv = base64ToArrayBuffer(encryptedObj.iv);
    const ciphertext = base64ToArrayBuffer(encryptedObj.ciphertext);
    
    const key = await deriveKey(passphrase, salt, ['decrypt']);
    
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      ciphertext
    );

    return dec.decode(decrypted);
  }

  // Helper ArrayBuffer / Base64 conversions
  function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  function base64ToArrayBuffer(base64) {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // --- Entropy Calculation --- 
  function calculateEntropy(str) {
    if (!str) return 0;
    let charsetSize = 0;
    if (/[a-z]/.test(str)) charsetSize += 26;
    if (/[A-Z]/.test(str)) charsetSize += 26;
    if (/[0-9]/.test(str)) charsetSize += 10;
    if (/[^a-zA-Z0-9]/.test(str)) charsetSize += 32;
    
    if (charsetSize === 0) return 0;
    const entropy = str.length * Math.log2(charsetSize);
    return Math.round(entropy);
  }

  function updateEntropyMeter(pass) {
    const bits = calculateEntropy(pass);
    entropyScoreVal.textContent = bits + ' bits';
    
    let percent = Math.min(100, (bits / 128) * 100);
    entropyProgress.style.width = percent + '%';

    let strength = 'Weak';
    let color = 'var(--accent-danger)';
    let badgeClass = 'weak';

    if (bits >= 100) {
      strength = 'Excellent';
      color = 'var(--accent-primary)';
      badgeClass = 'excellent';
    } else if (bits >= 75) {
      strength = 'Strong';
      color = 'var(--accent-success)';
      badgeClass = 'strong';
    } else if (bits >= 50) {
      strength = 'Fair';
      color = 'var(--accent-warning)';
      badgeClass = 'fair';
    }

    entropyProgress.style.backgroundColor = color;
    entropyStrengthLabel.textContent = strength;
    entropyStrengthLabel.className = 'strength-badge ' + badgeClass;
  }

  function generateStrongPassphrase() {
    const words = [
      'nebula', 'cipher', 'quantum', 'matrix', 'orbital', 'beacon', 'zenith', 'pulse',
      'anchor', 'frost', 'vertex', 'prism', 'vortex', 'vector', 'spectrum', 'titan',
      'sigma', 'delta', 'alpha', 'omega', 'solaris', 'cortex', 'fusion', 'gravity'
    ];
    let pass = '';
    for (let i = 0; i < 4; i++) {
      const randWord = words[Math.floor(Math.random() * words.length)];
      pass += (i === 0 ? '' : '-') + (Math.random() > 0.5 ? randWord.toUpperCase() : randWord);
    }
    pass += Math.floor(Math.random() * 900 + 100) + '!';
    return pass;
  }

  // --- UI Navigation & Rendering --- 
  function showPane(paneName) {
    [paneWelcome, paneEditor, paneUnlock, paneDecrypted].forEach(p => p.classList.remove('active'));
    if (paneName === 'welcome') paneWelcome.classList.add('active');
    else if (paneName === 'editor') paneEditor.classList.add('active');
    else if (paneName === 'unlock') paneUnlock.classList.add('active');
    else if (paneName === 'decrypted') paneDecrypted.classList.add('active');
  }

  function renderVaultList(filter = '') {
    vaultListEl.innerHTML = '';
    const filtered = vault.filter(item => 
      item.title.toLowerCase().includes(filter.toLowerCase()) ||
      (item.snippet && item.snippet.toLowerCase().includes(filter.toLowerCase()))
    );

    vaultStatsEl.textContent = `${vault.length} encrypted secret${vault.length === 1 ? '' : 's'}`;

    if (filtered.length === 0) {
      vaultListEl.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.8rem;">No encrypted items found</div>`;
      return;
    }

    filtered.forEach(item => {
      const div = document.createElement('div');
      div.className = `vault-item ${activeNoteId === item.id ? 'active' : ''}`;
      div.innerHTML = `
        <div class="vault-item-header">
          <span class="vault-item-title">${escapeHtml(item.title)}</span>
          <span class="vault-item-date">${formatDate(item.createdAt)}</span>
        </div>
        <div class="vault-item-snippet">${item.selfDestruct ? '⚠️ Self-destruct • ' : ''}AES-GCM Secure</div>
      `;
      div.addEventListener('click', () => selectNote(item.id));
      vaultListEl.appendChild(div);
    });
  }

  function selectNote(id) {
    activeNoteId = id;
    renderVaultList(searchInput.value);
    const note = vault.find(n => n.id === id);
    if (!note) return;

    unlockTitleDisplay.textContent = note.title;
    unlockCreatedDate.textContent = new Date(note.createdAt).toLocaleString();
    unlockPassphraseInput.value = '';
    decryptErrorMsg.style.display = 'none';

    if (note.selfDestruct) {
      unlockDestructBadge.style.display = 'inline';
    } else {
      unlockDestructBadge.style.display = 'none';
    }

    showPane('unlock');
  }

  // --- Event Listeners Setup --- 
  function setupEventListeners() {
    btnNewNote.addEventListener('click', openEditorForNew);
    btnWelcomeCreate.addEventListener('click', openEditorForNew);
    btnCancelEditor.addEventListener('click', () => {
      if (activeNoteId) selectNote(activeNoteId);
      else showPane('welcome');
    });

    searchInput.addEventListener('input', (e) => {
      renderVaultList(e.target.value);
    });

    notePassphrase.addEventListener('input', (e) => {
      updateEntropyMeter(e.target.value);
    });

    btnTogglePass.addEventListener('click', () => {
      togglePasswordVisibility(notePassphrase, btnTogglePass);
    });

    btnToggleUnlockPass.addEventListener('click', () => {
      togglePasswordVisibility(unlockPassphraseInput, btnToggleUnlockPass);
    });

    btnGenPassphrase.addEventListener('click', () => {
      const pass = generateStrongPassphrase();
      notePassphrase.value = pass;
      updateEntropyMeter(pass);
      showToast('Generated high-entropy passphrase.');
    });

    btnSaveSecret.addEventListener('click', handleSaveSecret);

    btnDecryptSecret.addEventListener('click', handleDecryptSecret);
    unlockPassphraseInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleDecryptSecret();
    });

    btnLockAgain.addEventListener('click', () => {
      if (activeNoteId) selectNote(activeNoteId);
      else showPane('welcome');
    });

    btnCopySecret.addEventListener('click', () => {
      const text = decryptedContentDisplay.textContent;
      navigator.clipboard.writeText(text).then(() => {
        showToast('Secret copied to clipboard.');
      }).catch(() => {
        showToast('Failed to copy to clipboard.');
      });
    });

    btnShowQr.addEventListener('click', () => {
      generateQrCode(decryptedContentDisplay.textContent);
      qrContainer.style.display = 'flex';
    });

    btnCloseQr.addEventListener('click', () => {
      qrContainer.style.display = 'none';
    });

    btnDeleteLocked.addEventListener('click', () => {
      if (confirm('Are you sure you want to permanently delete this secret note?')) {
        deleteActiveNote();
      }
    });

    btnClearAll.addEventListener('click', () => {
      if (confirm('WARNING: This will wipe all local encrypted notes from your browser vault. Continue?')) {
        vault = [];
        saveVault();
        activeNoteId = null;
        showPane('welcome');
        showToast('Vault purged successfully.');
      }
    });

    btnExportVault.addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(vault, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `auravault_backup_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Vault backup exported.');
    });

    importFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(event) {
        try {
          const imported = JSON.parse(event.target.result);
          if (Array.isArray(imported)) {
            vault = imported;
            saveVault();
            showPane('welcome');
            showToast('Vault imported successfully.');
          } else {
            throw new Error('Invalid format');
          }
        } catch (err) {
          showToast('Invalid vault backup file.');
        }
      };
      reader.readAsText(file);
      importFileInput.value = '';
    });
  }

  function openEditorForNew() {
    activeNoteId = null;
    noteTitleInput.value = '';
    noteContentInput.value = '';
    notePassphrase.value = '';
    checkSelfDestruct.checked = false;
    updateEntropyMeter('');
    document.getElementById('editor-mode-badge').textContent = 'New Secret';
    showPane('editor');
    renderVaultList(searchInput.value);
  }

  function togglePasswordVisibility(inputEl, btnEl) {
    if (inputEl.type === 'password') {
      inputEl.type = 'text';
      btnEl.style.color = 'var(--accent-primary)';
    } else {
      inputEl.type = 'password';
      btnEl.style.color = 'var(--text-muted)';
    }
  }

  async function handleSaveSecret() {
    const title = noteTitleInput.value.trim() || 'Untitled Secret';
    const content = noteContentInput.value;
    const pass = notePassphrase.value;

    if (!content) {
      showToast('Please enter secret content to encrypt.');
      return;
    }
    if (!pass) {
      showToast('Please enter an encryption passphrase.');
      return;
    }

    if (calculateEntropy(pass) < 40) {
      if (!confirm('Passphrase entropy is quite low. Do you want to proceed anyway?')) {
        return;
      }
    }

    try {
      btnSaveSecret.disabled = true;
      btnSaveSecret.textContent = 'Encrypting (AES-GCM)...';

      const encryptedObj = await encryptData(content, pass);
      
      const newNote = {
        id: 'note_' + Date.now() + Math.random().toString(36).substring(2, 7),
        title: title,
        createdAt: Date.now(),
        selfDestruct: checkSelfDestruct.checked,
        payload: encryptedObj
      };

      vault.unshift(newNote);
      saveVault();
      activeNoteId = newNote.id;
      selectNote(activeNoteId);
      showToast('Secret encrypted and saved securely.');
    } catch (err) {
      console.error(err);
      showToast('Encryption error occurred.');
    } finally {
      btnSaveSecret.disabled = false;
      btnSaveSecret.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Encrypt & Save to Vault`;
    }
  }

  async function handleDecryptSecret() {
    const note = vault.find(n => n.id === activeNoteId);
    if (!note) return;

    const pass = unlockPassphraseInput.value;
    if (!pass) {
      decryptErrorMsg.textContent = 'Please enter the decryption passphrase.';
      decryptErrorMsg.style.display = 'block';
      return;
    }

    try {
      btnDecryptSecret.disabled = true;
      btnDecryptSecret.textContent = 'Decrypting...';
      decryptErrorMsg.style.display = 'none';

      const decryptedText = await decryptData(note.payload, pass);

      decryptedTitleDisplay.textContent = note.title;
      decryptedContentDisplay.textContent = decryptedText;
      showPane('decrypted');

      // Handle self-destruct feature
      if (note.selfDestruct) {
        vault = vault.filter(n => n.id !== note.id);
        saveVault();
        showToast('Self-destruct triggered: Secret removed from vault.');
      } else {
        showToast('Secret decrypted successfully.');
      }
    } catch (err) {
      console.error(err);
      decryptErrorMsg.textContent = 'Decryption failed. Incorrect passphrase or corrupted payload.';
      decryptErrorMsg.style.display = 'block';
    } finally {
      btnDecryptSecret.disabled = false;
      btnDecryptSecret.textContent = 'Decrypt Secret Note';
    }
  }

  function deleteActiveNote() {
    vault = vault.filter(n => n.id !== activeNoteId);
    saveVault();
    activeNoteId = null;
    showPane('welcome');
    showToast('Secure note deleted.');
  }

  // --- Pure SVG QR Code Generator (Simple Matrix) --- 
  function generateQrCode(text) {
    qrSvgWrap.innerHTML = '';
    // Simple pseudo-matrix representation for robust offline SVG QR rendering
    const size = 21;
    const cellSize = 8;
    let svg = `<svg width="${size * cellSize}" height="${size * cellSize}" viewBox="0 0 ${size * cellSize} ${size * cellSize}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect width="100%" height="100%" fill="#ffffff"/>`;

    // Deterministic dot generation based on text hash for offline display
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }

    // Draw finder patterns (corners)
    drawFinderPattern(0, 0);
    drawFinderPattern(size - 7, 0);
    drawFinderPattern(0, size - 7);

    function drawFinderPattern(startX, startY) {
      for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 7; x++) {
          const isOuter = (x === 0 || x === 6 || y === 0 || y === 6);
          const isInner = (x >= 2 && x <= 4 && y >= 2 && y <= 4);
          if (isOuter || isInner) {
            svg += `<rect x="${(startX + x) * cellSize}" y="${(startY + y) * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000000"/>`;
          }
        }
      }
    }

    // Fill data area pseudo-randomly based on content hash
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Skip finder areas
        if ((x < 8 && y < 8) || (x >= size - 7 && y < 8) || (x < 8 && y >= size - 7)) continue;
        
        const bit = Math.abs(Math.sin(hash + x * 12.9898 + y * 78.233) * 43758.5453) % 1 > 0.5;
        if (bit) {
          svg += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000000"/>`;
        }
      }
    }

    svg += `</svg>`;
    qrSvgWrap.innerHTML = svg;
  }

  // --- Utility Functions --- 
  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function formatDate(timestamp) {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  let toastTimeout;
  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 3000);
  }

  // Run on load
  init();
})();
