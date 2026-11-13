/* AuraVault - Client-Side AES-GCM Encrypted Note Vault */

(function () {
    'use strict';

    const STORAGE_KEY = 'auravault_notes_v1';

    let vaultNotes = [];
    let activeNoteId = null;
    let currentTagFilter = null;
    let pendingUnlockId = null;

    // DOM Elements
    const notesListEl = document.getElementById('notes-list');
    const noteCountEl = document.getElementById('note-count');
    const searchInput = document.getElementById('search-input');
    const tagFilterContainer = document.getElementById('tag-filter-container');
    const btnNewNote = document.getElementById('btn-new-note');
    const btnExportVault = document.getElementById('btn-export-vault');
    const importFile = document.getElementById('import-file');
    
    const emptyEditorState = document.getElementById('empty-editor-state');
    const activeEditor = document.getElementById('active-editor');
    const noteTitleInput = document.getElementById('note-title');
    const noteTagsInput = document.getElementById('note-tags');
    const noteDestructCheckbox = document.getElementById('note-destruct');
    const vaultPassphraseInput = document.getElementById('vault-passphrase');
    const vaultPassphraseConfirm = document.getElementById('vault-passphrase-confirm');
    const entropyFill = document.getElementById('entropy-fill');
    const entropyText = document.getElementById('entropy-text');
    const noteContentTextarea = document.getElementById('note-content');
    const notePreviewEl = document.getElementById('note-preview');
    const btnTabWrite = document.getElementById('btn-tab-write');
    const btnTabPreview = document.getElementById('btn-tab-preview');
    const btnSaveNote = document.getElementById('btn-save-note');
    const btnDeleteNote = document.getElementById('btn-delete-note');

    // Modals
    const decryptModal = document.getElementById('decrypt-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const decryptNoteTitleDisplay = document.getElementById('decrypt-note-title-display');
    const unlockPassphraseInput = document.getElementById('unlock-passphrase');
    const decryptErrorEl = document.getElementById('decrypt-error');
    const btnConfirmDecrypt = document.getElementById('btn-confirm-decrypt');
    const btnCancelDecrypt = document.getElementById('btn-cancel-decrypt');

    const destructModal = document.getElementById('destruct-modal');
    const destructNoteBody = document.getElementById('destruct-note-body');
    const btnCloseDestruct = document.getElementById('btn-close-destruct');

    // Initialize application
    function initVault() {
        loadFromLocalStorage();
        renderSidebar();
        renderTagFilters();
        attachEventListeners();
    }

    function loadFromLocalStorage() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                vaultNotes = JSON.parse(data);
            } else {
                vaultNotes = [];
            }
        } catch (e) {
            console.error('Failed to load vault data:', e);
            vaultNotes = [];
        }
    }

    function saveToLocalStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(vaultNotes));
        } catch (e) {
            console.error('Failed to save vault data:', e);
            alert('Storage error: Unable to save to localStorage.');
        }
    }

    // Crypto helpers using Web Crypto API (AES-GCM + PBKDF2)
    async function deriveKey(passphrase, salt) {
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
            ['encrypt', 'decrypt']
        );
    }

    async function encryptData(plaintext, passphrase) {
        const enc = new TextEncoder();
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveKey(passphrase, salt);
        const encryptedContent = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            enc.encode(plaintext)
        );

        return {
            ciphertext: arrayBufferToBase64(encryptedContent),
            iv: arrayBufferToBase64(iv),
            salt: arrayBufferToBase64(salt)
        };
    }

    async function decryptData(ciphertextBase64, ivBase64, saltBase64, passphrase) {
        const dec = new TextDecoder();
        const salt = base64ToArrayBuffer(saltBase64);
        const iv = base64ToArrayBuffer(ivBase64);
        const ciphertext = base64ToArrayBuffer(ciphertextBase64);
        const key = await deriveKey(passphrase, salt);
        const decryptedContent = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            ciphertext
        );
        return dec.decode(decryptedContent);
    }

    function arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    function base64ToArrayBuffer(base64) {
        const binaryString = window.atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    // Password Entropy Calculation
    function calculateEntropy(password) {
        if (!password) return { score: 0, text: 'None', percent: 0 };
        let charsetSize = 0;
        if (/[a-z]/.test(password)) charsetSize += 26;
        if (/[A-Z]/.test(password)) charsetSize += 26;
        if (/[0-9]/.test(password)) charsetSize += 10;
        if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32;

        const entropy = password.length * Math.log2(charsetSize || 1);
        let score = 'Weak';
        let percent = Math.min(100, (entropy / 128) * 100);
        let color = '#ef4444';

        if (entropy > 80) {
            score = 'Strong';
            color = '#22c55e';
        } else if (entropy > 50) {
            score = 'Moderate';
            color = '#f59e0b';
        } else if (entropy > 25) {
            score = 'Fair';
            color = '#eab308';
        }

        return { score, percent, color };
    }

    // UI Rendering Functions
    function renderSidebar() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        notesListEl.innerHTML = '';

        const filtered = vaultNotes.filter(note => {
            const matchesSearch = note.title.toLowerCase().includes(searchTerm) ||
                (note.tags && note.tags.some(t => t.toLowerCase().includes(searchTerm)));
            const matchesTag = currentTagFilter ? (note.tags && note.tags.includes(currentTagFilter)) : true;
            return matchesSearch && matchesTag;
        });

        noteCountEl.textContent = filtered.length;

        if (filtered.length === 0) {
            notesListEl.innerHTML = `<div class="empty-sidebar"><p>No matching vault notes found.</p></div>`;
            return;
        }

        filtered.sort((a, b) => b.updatedAt - a.updatedAt);

        filtered.forEach(note => {
            const card = document.createElement('div');
            card.className = `note-card ${note.id === activeNoteId ? 'active' : ''}`;
            card.dataset.id = note.id;

            const dateStr = new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

            card.innerHTML = `
                <div class="note-card-header">
                    <span class="note-card-title">${escapeHTML(note.title || 'Untitled Note')}</span>
                    <div class="note-card-badges">
                        ${note.selfDestruct ? '<svg class="icon-destruct" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>' : ''}
                        <svg class="icon-encrypted" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    </div>
                </div>
                <div class="note-card-meta">
                    <span>${dateStr}</span>
                    <span>${note.tags && note.tags.length ? note.tags.map(t => '#' + t).join(' ') : 'no tags'}</span>
                </div>
            `;

            card.addEventListener('click', () => selectNote(note.id));
            notesListEl.appendChild(card);
        });
    }

    function renderTagFilters() {
        const tagsSet = new Set();
        vaultNotes.forEach(n => {
            if (n.tags) n.tags.forEach(t => tagsSet.add(t));
        });

        tagFilterContainer.innerHTML = '';
        if (tagsSet.size === 0) return;

        const allPill = document.createElement('button');
        allPill.className = `tag-pill ${!currentTagFilter ? 'active' : ''}`;
        allPill.textContent = 'All tags';
        allPill.addEventListener('click', () => {
            currentTagFilter = null;
            renderTagFilters();
            renderSidebar();
        });
        tagFilterContainer.appendChild(allPill);

        tagsSet.forEach(tag => {
            const pill = document.createElement('button');
            pill.className = `tag-pill ${currentTagFilter === tag ? 'active' : ''}`;
            pill.textContent = '#' + tag;
            pill.addEventListener('click', () => {
                currentTagFilter = tag;
                renderTagFilters();
                renderSidebar();
            });
            tagFilterContainer.appendChild(pill);
        });
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"/]/g, function (s) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;',
                '/': '&#x2F;'
            }[s];
        });
    }

    function selectNote(id) {
        const note = vaultNotes.find(n => n.id === id);
        if (!note) return;

        // If note is already decrypted in session memory or we prompt for passphrase
        pendingUnlockId = id;
        decryptNoteTitleDisplay.textContent = `Note: "${note.title || 'Untitled'}"`;
        unlockPassphraseInput.value = '';
        decryptErrorEl.classList.add('hidden');
        decryptModal.classList.remove('hidden');
        setTimeout(() => unlockPassphraseInput.focus(), 100);
    }

    function openEditorWithDecryptedNote(note, decryptedText) {
        activeNoteId = note.id;
        emptyEditorState.classList.add('hidden');
        activeEditor.classList.remove('hidden');

        noteTitleInput.value = note.title || '';
        noteTagsInput.value = note.tags ? note.tags.join(', ') : '';
        noteDestructCheckbox.checked = !!note.selfDestruct;
        vaultPassphraseInput.value = '';
        vaultPassphraseConfirm.value = '';
        updateEntropyDisplay('');

        noteContentTextarea.value = decryptedText;
        updatePreview(decryptedText);

        // If self destruct is enabled, delete note immediately from vault storage upon viewing
        if (note.selfDestruct) {
            vaultNotes = vaultNotes.filter(n => n.id !== note.id);
            saveToLocalStorage();
            renderSidebar();
            renderTagFilters();

            // Show special self destruct view modal
            destructNoteBody.textContent = decryptedText;
            destructModal.classList.remove('hidden');
            closeEditor();
        } else {
            renderSidebar();
        }
    }

    function closeEditor() {
        activeNoteId = null;
        activeEditor.classList.add('hidden');
        emptyEditorState.classList.remove('hidden');
        renderSidebar();
    }

    function updateEntropyDisplay(pwd) {
        const res = calculateEntropy(pwd);
        entropyFill.style.width = res.percent + '%';
        entropyFill.style.backgroundColor = res.color;
        entropyText.textContent = `Entropy: ${res.score}`;
    }

    function updatePreview(text) {
        notePreviewEl.textContent = text;
    }

    // Event Listeners
    function attachEventListeners() {
        btnNewNote.addEventListener('click', () => {
            const newId = 'note_' + Date.now();
            const newNote = {
                id: newId,
                title: 'New Encrypted Note',
                tags: ['general'],
                selfDestruct: false,
                ciphertext: '',
                iv: '',
                salt: '',
                updatedAt: Date.now()
            };
            vaultNotes.push(newNote);
            saveToLocalStorage();
            renderSidebar();
            renderTagFilters();

            activeNoteId = newId;
            emptyEditorState.classList.add('hidden');
            activeEditor.classList.remove('hidden');
            noteTitleInput.value = newNote.title;
            noteTagsInput.value = 'general';
            noteDestructCheckbox.checked = false;
            vaultPassphraseInput.value = '';
            vaultPassphraseConfirm.value = '';
            updateEntropyDisplay('');
            noteContentTextarea.value = '';
            updatePreview('');
            noteTitleInput.focus();
            noteTitleInput.select();
        });

        searchInput.addEventListener('input', () => {
            renderSidebar();
        });

        vaultPassphraseInput.addEventListener('input', (e) => {
            updateEntropyDisplay(e.target.value);
        });

        btnTabWrite.addEventListener('click', () => {
            btnTabWrite.classList.add('active');
            btnTabPreview.classList.remove('active');
            noteContentTextarea.classList.remove('hidden');
            notePreviewEl.classList.add('hidden');
        });

        btnTabPreview.addEventListener('click', () => {
            btnTabPreview.classList.add('active');
            btnTabWrite.classList.remove('active');
            notePreviewEl.classList.remove('hidden');
            noteContentTextarea.classList.add('hidden');
            updatePreview(noteContentTextarea.value);
        });

        noteContentTextarea.addEventListener('input', (e) => {
            updatePreview(e.target.value);
        });

        btnSaveNote.addEventListener('click', async () => {
            const note = vaultNotes.find(n => n.id === activeNoteId);
            if (!note) return;

            const passphrase = vaultPassphraseInput.value;
            const confirmPass = vaultPassphraseConfirm.value;

            if (!passphrase) {
                alert('Please enter a master passphrase to encrypt this note.');
                vaultPassphraseInput.focus();
                return;
            }

            if (passphrase !== confirmPass) {
                alert('Passphrases do not match. Please verify.');
                vaultPassphraseConfirm.focus();
                return;
            }

            const title = noteTitleInput.value.trim() || 'Untitled Note';
            const tagsRaw = noteTagsInput.value;
            const tags = tagsRaw.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
            const selfDestruct = noteDestructCheckbox.checked;
            const plaintext = noteContentTextarea.value;

            try {
                const encrypted = await encryptData(plaintext, passphrase);
                note.title = title;
                note.tags = tags;
                note.selfDestruct = selfDestruct;
                note.ciphertext = encrypted.ciphertext;
                note.iv = encrypted.iv;
                note.salt = encrypted.salt;
                note.updatedAt = Date.now();

                saveToLocalStorage();
                renderSidebar();
                renderTagFilters();
                alert('Note successfully encrypted and saved to vault!');
            } catch (err) {
                console.error('Encryption failed:', err);
                alert('Encryption failed. See console for details.');
            }
        });

        btnDeleteNote.addEventListener('click', () => {
            if (!confirm('Are you sure you want to permanently delete this note from the vault?')) return;
            vaultNotes = vaultNotes.filter(n => n.id !== activeNoteId);
            saveToLocalStorage();
            renderSidebar();
            renderTagFilters();
            closeEditor();
        });

        // Decrypt Modal Actions
        modalCloseBtn.addEventListener('click', () => {
            decryptModal.classList.add('hidden');
            pendingUnlockId = null;
        });

        btnCancelDecrypt.addEventListener('click', () => {
            decryptModal.classList.add('hidden');
            pendingUnlockId = null;
        });

        unlockPassphraseInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                btnConfirmDecrypt.click();
            }
        });

        btnConfirmDecrypt.addEventListener('click', async () => {
            const note = vaultNotes.find(n => n.id === pendingUnlockId);
            if (!note) return;

            const passphrase = unlockPassphraseInput.value;
            if (!passphrase) {
                decryptErrorEl.textContent = 'Please enter a passphrase.';
                decryptErrorEl.classList.remove('hidden');
                return;
            }

            // If note is brand new and has no ciphertext yet, no need to decrypt
            if (!note.ciphertext) {
                decryptModal.classList.add('hidden');
                openEditorWithDecryptedNote(note, '');
                return;
            }

            try {
                const decrypted = await decryptData(note.ciphertext, note.iv, note.salt, passphrase);
                decryptModal.classList.add('hidden');
                openEditorWithDecryptedNote(note, decrypted);
            } catch (err) {
                console.error('Decryption failed:', err);
                decryptErrorEl.textContent = 'Incorrect passphrase or corrupted encrypted payload.';
                decryptErrorEl.classList.remove('hidden');
            }
        });

        btnCloseDestruct.addEventListener('click', () => {
            destructModal.classList.add('hidden');
        });

        // Export / Import
        btnExportVault.addEventListener('click', () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(vaultNotes, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute('href', dataStr);
            downloadAnchor.setAttribute('download', `auravault_backup_${Date.now()}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        });

        importFile.addEventListener('change', (e) => {
            const fileReader = new FileReader();
            if (e.target.files[0]) {
                fileReader.readAsText(e.target.files[0], 'UTF-8');
                fileReader.onload = (event) => {
                    try {
                        const imported = JSON.parse(event.target.result);
                        if (Array.isArray(imported)) {
                            if (confirm(`Import ${imported.length} notes into vault? This will merge or overwrite existing notes with matching IDs.`)) {
                                // Merge notes
                                const map = new Map(vaultNotes.map(n => [n.id, n]));
                                imported.forEach(n => map.set(n.id, n));
                                vaultNotes = Array.from(map.values());
                                saveToLocalStorage();
                                renderSidebar();
                                renderTagFilters();
                                alert('Vault successfully imported!');
                            }
                        } else {
                            alert('Invalid vault backup format.');
                        }
                    } catch (err) {
                        console.error('Import parse error:', err);
                        alert('Failed to parse JSON backup file.');
                    }
                    importFile.value = '';
                };
            }
        });
    }

    // Run on load
    document.addEventListener('DOMContentLoaded', initVault);

})();
