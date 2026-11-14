/* AuraVault Client-Side Encryption & Note Manager */

(function() {
    'use strict';

    // In-memory state
    let vault = [];
    let currentNoteId = null;
    let currentFilter = 'all';
    let searchQuery = '';
    let destructTimerInterval = null;

    // DOM Elements
    const elNotesList = document.getElementById('notes-list');
    const elEmptyState = document.getElementById('empty-state');
    const elNoteEditor = document.getElementById('note-editor');
    const elVaultCount = document.getElementById('vault-count');
    const elSearchNotes = document.getElementById('search-notes');
    const elFileRestore = document.getElementById('file-restore');
    const elToast = document.getElementById('toast');

    // Editor Elements
    const elNoteTitle = document.getElementById('note-title');
    const elNoteTags = document.getElementById('note-tags');
    const elNoteCategory = document.getElementById('note-category');
    const elNotePassphrase = document.getElementById('note-passphrase');
    const elTogglePassVisibility = document.getElementById('toggle-pass-visibility');
    const elEntropyBar = document.getElementById('entropy-bar');
    const elEntropyText = document.getElementById('entropy-text');
    const elNoteContent = document.getElementById('note-content');
    const elContentLabel = document.getElementById('content-label');
    const elEncryptionStatus = document.getElementById('encryption-status-indicator');

    // Buttons
    const btnNewNote = document.getElementById('btn-new-note');
    const btnEmptyNew = document.getElementById('btn-empty-new');
    const btnExport = document.getElementById('btn-export');
    const btnEncrypt = document.getElementById('btn-encrypt');
    const btnDecrypt = document.getElementById('btn-decrypt');
    const btnGeneratePass = document.getElementById('btn-generate-pass');
    const btnCopy = document.getElementById('btn-copy');
    const btnSelfDestruct = document.getElementById('btn-self-destruct');
    const btnDelete = document.getElementById('btn-delete');
    const btnSave = document.getElementById('btn-save');

    // Modal Elements
    const destructModal = document.getElementById('destruct-modal');
    const destructCountdown = document.getElementById('destruct-countdown');
    const destructBody = document.getElementById('destruct-body');
    const btnCloseDestruct = document.getElementById('btn-close-destruct');

    // Filter Chips
    const filterChips = document.querySelectorAll('.chip');

    // --- Storage & Initialization ---
    const STORAGE_KEY = 'auravault_notes_v1';

    function loadVault() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                vault = JSON.parse(saved);
            } else {
                // Create a welcome demo note if vault is empty
                vault = [
                    createSampleNote()
                ];
                saveVaultToStorage();
            }
        } catch (e) {
            console.error('Failed to load vault from localStorage', e);
            vault = [];
        }
    }

    function saveVaultToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(vault));
        } catch (e) {
            showToast('Error saving vault to local storage.', 'error');
        }
    }

    function createSampleNote() {
        return {
            id: 'note_' + Date.now(),
            title: 'Welcome to AuraVault 🔒',
            tags: 'welcome, guide, secure',
            category: 'General',
            encrypted: false,
            content: 'AuraVault runs 100% client-side in your browser using the native Web Crypto API (AES-GCM 256-bit).

1. Type any secret note, API token, or credentials.
2. Enter a strong passphrase.
3. Click [Encrypt Note] to seal your data.
4. Save note to local vault.

Your unencrypted text never leaves your device!',
            updatedAt: new Date().toISOString()
        };
    }

    // --- Crypto Utilities (Web Crypto API PBKDF2 + AES-GCM) ---
    async function deriveKey(passphrase, salt) {
        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            enc.encode(passphrase),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );
        return await window.crypto.subtle.deriveKey(
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
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveKey(passphrase, salt);
        const enc = new TextEncoder();
        const cipherBuffer = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            enc.encode(plaintext)
        );

        // Pack salt, iv, and ciphertext into base64 for safe storage
        const combined = {
            salt: Array.from(salt),
            iv: Array.from(iv),
            data: Array.from(new Uint8Array(cipherBuffer))
        };
        return btoa(JSON.stringify(combined));
    }

    async function decryptData(cipherB64, passphrase) {
        try {
            const combined = JSON.parse(atob(cipherB64));
            const salt = new Uint8Array(combined.salt);
            const iv = new Uint8Array(combined.iv);
            const data = new Uint8Array(combined.data);
            const key = await deriveKey(passphrase, salt);
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                data
            );
            const dec = new TextDecoder();
            return dec.decode(decryptedBuffer);
        } catch (e) {
            throw new Error('Decryption failed. Incorrect passphrase or corrupted ciphertext.');
        }
    }

    // --- Password Entropy Calculation ---
    function calculateEntropy(str) {
        if (!str) return 0;
        let charsetSize = 0;
        if (/[a-z]/.test(str)) charsetSize += 26;
        if (/[A-Z]/.test(str)) charsetSize += 26;
        if (/[0-9]/.test(str)) charsetSize += 10;
        if (/[^a-zA-Z0-9]/.test(str)) charsetSize += 32;
        
        const entropy = str.length * Math.log2(charsetSize || 1);
        return Math.round(entropy);
    }

    function updateEntropyMeter(passphrase) {
        const entropy = calculateEntropy(passphrase);
        let width = Math.min(100, (entropy / 128) * 100);
        let color = '#ef4444';
        let text = 'Weak';

        if (entropy > 80) {
            color = '#10b981';
            text = 'Very Strong';
        } else if (entropy > 60) {
            color = '#38bdf8';
            text = 'Strong';
        } else if (entropy > 40) {
            color = '#f59e0b';
            text = 'Moderate';
        }

        elEntropyBar.style.setProperty('--entropy-width', width + '%');
        elEntropyBar.style.setProperty('--entropy-color', color);
        elEntropyText.textContent = `Entropy: ${entropy} bits (${text})`;
    }

    function generateRandomPassphrase() {
        const words = ['alpha', 'bravo', 'cipher', 'delta', 'echo', 'frost', 'guard', 'helix', 'ignite', 'jade', 'krypton', 'lunar', 'matrix', 'nova', 'orbit', 'pulse', 'quantum', 'radar', 'solar', 'titan', 'ultra', 'vortex', 'wave', 'xenon', 'yield', 'zenith'];
        let pass = '';
        for (let i = 0; i < 4; i++) {
            const randWord = words[Math.floor(Math.random() * words.length)];
            const randNum = Math.floor(Math.random() * 90) + 10;
            pass += (i === 0 ? '' : '-') + randWord + randNum;
        }
        elNotePassphrase.value = pass;
        updateEntropyMeter(pass);
        showToast('Generated strong passphrase.', 'success');
    }

    // --- UI Rendering ---
    function renderNotesList() {
        elNotesList.innerHTML = '';
        
        let filtered = vault.filter(note => {
            const matchesFilter = 
                currentFilter === 'all' ? true :
                currentFilter === 'encrypted' ? note.encrypted :
                currentFilter === 'decrypted' ? !note.encrypted : true;

            const matchesSearch = 
                note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (note.tags && note.tags.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (note.category && note.category.toLowerCase().includes(searchQuery.toLowerCase()));

            return matchesFilter && matchesSearch;
        });

        // Sort by updated time descending
        filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        elVaultCount.textContent = `${vault.length} note${vault.length === 1 ? '' : 's'} in vault`;

        if (filtered.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'note-item';
            emptyEl.style.textAlign = 'center';
            emptyEl.style.color = 'var(--text-muted)';
            emptyEl.style.padding = '1.5rem';
            emptyEl.textContent = 'No matching notes found.';
            elNotesList.appendChild(emptyEl);
            return;
        }

        filtered.forEach(note => {
            const item = document.createElement('div');
            item.className = `note-item ${note.id === currentNoteId ? 'active' : ''}`;
            item.addEventListener('click', () => selectNote(note.id));

            const badgeClass = note.encrypted ? 'badge-encrypted' : 'badge-plaintext';
            const badgeText = note.encrypted ? 'Encrypted' : 'Plaintext';

            const dateStr = new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

            item.innerHTML = `
                <div class="note-item-header">
                    <span class="note-item-title">${escapeHtml(note.title || 'Untitled Note')}</span>
                    <span class="note-item-badge ${badgeClass}">${badgeText}</span>
                </div>
                <div class="note-item-footer">
                    <span>${escapeHtml(note.category || 'General')}</span>
                    <span>${dateStr}</span>
                </div>
            `;
            elNotesList.appendChild(item);
        });
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function selectNote(id) {
        const note = vault.find(n => n.id === id);
        if (!note) return;

        currentNoteId = id;
        elEmptyState.classList.add('hidden');
        elNoteEditor.classList.remove('hidden');

        elNoteTitle.value = note.title;
        elNoteTags.value = note.tags || '';
        elNoteCategory.value = note.category || 'General';
        elNoteContent.value = note.content || '';
        elNotePassphrase.value = '';
        updateEntropyMeter('');

        updateEncryptionUI(note.encrypted);
        renderNotesList();
    }

    function updateEncryptionUI(isEncrypted) {
        if (isEncrypted) {
            elContentLabel.textContent = 'Ciphertext (AES-GCM Encrypted Base64)';
            elEncryptionStatus.innerHTML = 'Status: <span class="status-encrypted">🔒 Securely Encrypted (AES-GCM)</span>';
            elNoteContent.setAttribute('readonly', 'true');
            elNoteContent.style.opacity = '0.85';
            btnEncrypt.classList.add('hidden');
            btnDecrypt.classList.remove('hidden');
        } else {
            elContentLabel.textContent = 'Plaintext Secret Content';
            elEncryptionStatus.innerHTML = 'Status: <span class="status-plain">⚠️ Unencrypted Plaintext</span>';
            elNoteContent.removeAttribute('readonly');
            elNoteContent.style.opacity = '1';
            btnEncrypt.classList.remove('hidden');
            btnDecrypt.classList.add('hidden');
        }
    }

    function createNewNote() {
        const newNote = {
            id: 'note_' + Date.now(),
            title: 'New Secure Note',
            tags: '',
            category: 'General',
            encrypted: false,
            content: '',
            updatedAt: new Date().toISOString()
        };
        vault.unshift(newNote);
        saveVaultToStorage();
        selectNote(newNote.id);
        showToast('Created new note.', 'success');
    }

    // --- Actions ---
    async function handleEncrypt() {
        const note = vault.find(n => n.id === currentNoteId);
        if (!note) return;
        const pass = elNotePassphrase.value;
        if (!pass) {
            showToast('Please enter an encryption passphrase.', 'error');
            return;
        }

        try {
            const ciphertext = await encryptData(elNoteContent.value, pass);
            note.content = ciphertext;
            note.encrypted = true;
            note.title = elNoteTitle.value;
            note.tags = elNoteTags.value;
            note.category = elNoteCategory.value;
            note.updatedAt = new Date().toISOString();

            saveVaultToStorage();
            updateEncryptionUI(true);
            renderNotesList();
            showToast('Note encrypted successfully with AES-GCM!', 'success');
        } catch (e) {
            showToast('Encryption failed: ' + e.message, 'error');
        }
    }

    async function handleDecrypt() {
        const note = vault.find(n => n.id === currentNoteId);
        if (!note) return;
        const pass = elNotePassphrase.value;
        if (!pass) {
            showToast('Please enter the decryption passphrase.', 'error');
            return;
        }

        try {
            const plaintext = await decryptData(note.content, pass);
            elNoteContent.value = plaintext;
            note.content = plaintext;
            note.encrypted = false;
            note.title = elNoteTitle.value;
            note.tags = elNoteTags.value;
            note.category = elNoteCategory.value;
            note.updatedAt = new Date().toISOString();

            saveVaultToStorage();
            updateEncryptionUI(false);
            renderNotesList();
            showToast('Note decrypted successfully!', 'success');
        } catch (e) {
            showToast('Decryption failed. Incorrect passphrase.', 'error');
        }
    }

    function handleSave() {
        const note = vault.find(n => n.id === currentNoteId);
        if (!note) return;

        note.title = elNoteTitle.value;
        note.tags = elNoteTags.value;
        note.category = elNoteCategory.value;
        if (!note.encrypted) {
            note.content = elNoteContent.value;
        }
        note.updatedAt = new Date().toISOString();

        saveVaultToStorage();
        renderNotesList();
        showToast('Note saved to local vault.', 'success');
    }

    function handleDelete() {
        if (!currentNoteId) return;
        if (!confirm('Are you sure you want to delete this note from the vault?')) return;

        vault = vault.filter(n => n.id !== currentNoteId);
        saveVaultToStorage();
        currentNoteId = null;
        elNoteEditor.classList.add('hidden');
        elEmptyState.classList.remove('hidden');
        renderNotesList();
        showToast('Note deleted.', 'success');
    }

    function handleCopy() {
        navigator.clipboard.writeText(elNoteContent.value).then(() => {
            showToast('Content copied to clipboard!', 'success');
        }).catch(() => {
            showToast('Failed to copy content.', 'error');
        });
    }

    // --- Self-Destruct Simulation ---
    function handleSelfDestruct() {
        const note = vault.find(n => n.id === currentNoteId);
        if (!note) return;

        if (note.encrypted) {
            showToast('Please decrypt the note before launching self-destruct simulation.', 'error');
            return;
        }

        destructBody.textContent = elNoteContent.value || '(Empty note)';
        destructModal.classList.remove('hidden');

        let countdown = 60;
        destructCountdown.textContent = countdown;

        if (destructTimerInterval) clearInterval(destructTimerInterval);
        destructTimerInterval = setInterval(() => {
            countdown--;
            destructCountdown.textContent = countdown;
            if (countdown <= 0) {
                closeDestructModal();
                showToast('Self-destruct view expired.', 'error');
            }
        }, 1000);
    }

    function closeDestructModal() {
        if (destructTimerInterval) clearInterval(destructTimerInterval);
        destructModal.classList.add('hidden');
        destructBody.textContent = '';
    }

    // --- Export / Import Backup ---
    function exportVault() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(vault, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `auravault_backup_${new Date().toISOString().slice(0,10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showToast('Vault backup exported successfully.', 'success');
    }

    function importVault(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const imported = JSON.parse(e.target.result);
                if (Array.isArray(imported)) {
                    if (confirm(`Import ${imported.length} notes? This will merge or overwrite current local vault.`)) {
                        vault = imported;
                        saveVaultToStorage();
                        renderNotesList();
                        if (vault.length > 0) selectNote(vault[0].id);
                        showToast('Vault restored successfully!', 'success');
                    }
                } else {
                    showToast('Invalid backup file format.', 'error');
                }
            } catch (err) {
                showToast('Failed to parse JSON backup file.', 'error');
            }
            elFileRestore.value = '';
        };
        reader.readAsText(file);
    }

    // --- Toast Notifications ---
    let toastTimeout = null;
    function showToast(message, type = 'success') {
        elToast.textContent = message;
        elToast.className = `toast ${type}`;
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            elToast.className = 'toast hidden';
        }, 3000);
    }

    // --- Event Listeners ---
    btnNewNote.addEventListener('click', createNewNote);
    btnEmptyNew.addEventListener('click', createNewNote);
    btnExport.addEventListener('click', exportVault);
    elFileRestore.addEventListener('change', importVault);

    btnEncrypt.addEventListener('click', handleEncrypt);
    btnDecrypt.addEventListener('click', handleDecrypt);
    btnSave.addEventListener('click', handleSave);
    btnDelete.addEventListener('click', handleDelete);
    btnCopy.addEventListener('click', handleCopy);
    btnSelfDestruct.addEventListener('click', handleSelfDestruct);
    btnCloseDestruct.addEventListener('click', closeDestructModal);

    btnGeneratePass.addEventListener('click', generateRandomPassphrase);

    elNotePassphrase.addEventListener('input', (e) => {
        updateEntropyMeter(e.target.value);
    });

    elTogglePassVisibility.addEventListener('click', () => {
        const type = elNotePassphrase.getAttribute('type') === 'password' ? 'text' : 'password';
        elNotePassphrase.setAttribute('type', type);
    });

    elSearchNotes.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderNotesList();
    });

    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilter = chip.getAttribute('data-filter');
            renderNotesList();
        });
    });

    // Initialize
    loadVault();
    renderNotesList();
    if (vault.length > 0) {
        selectNote(vault[0].id);
    }

})();
