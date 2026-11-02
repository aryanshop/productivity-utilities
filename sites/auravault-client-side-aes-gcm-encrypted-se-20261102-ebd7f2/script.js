/* AuraVault - Secure Client-Side AES-GCM Encrypted Note Studio */

const STORAGE_KEY = 'auravault_notes_v1';

// State Management
let vault = {
    notes: []
};
let currentNoteId = null;
let decryptedPlainText = '';

// DOM Elements
const notesListEl = document.getElementById('notes-list');
const emptyVaultStateEl = document.getElementById('empty-vault-state');
const searchInputEl = document.getElementById('search-input');
const btnNewNote = document.getElementById('btn-new-note');
const btnExport = document.getElementById('btn-export');
const importFileEl = document.getElementById('import-file');

const editorPlaceholder = document.getElementById('editor-placeholder');
const editorContainer = document.getElementById('editor-container');

const noteTitleEl = document.getElementById('note-title');
const noteTagsEl = document.getElementById('note-tags');
const noteContentEl = document.getElementById('note-content');
const noteCiphertextEl = document.getElementById('note-ciphertext');
const notePassphraseEl = document.getElementById('note-passphrase');
const unlockPassphraseEl = document.getElementById('unlock-passphrase');

const btnSaveNote = document.getElementById('btn-save-note');
const btnDeleteNote = document.getElementById('btn-delete-note');
const btnLockNote = document.getElementById('btn-lock-note');
const btnUnlock = document.getElementById('btn-unlock');
const btnTogglePass = document.getElementById('btn-toggle-pass');
const btnCopyContent = document.getElementById('btn-copy-content');

const encBadge = document.getElementById('enc-badge');
const lastModifiedEl = document.getElementById('last-modified');
const decryptView = document.getElementById('decrypt-view');
const encryptView = document.getElementById('encrypt-view');
const contentEditorWrapper = document.getElementById('content-editor-wrapper');
const ciphertextWrapper = document.getElementById('ciphertext-wrapper');
const unlockError = document.getElementById('unlock-error');

const entropyFill = document.getElementById('entropy-fill');
const entropyText = document.getElementById('entropy-text');
const toastEl = document.getElementById('toast');

// Initialize Application
function init() {
    loadVault();
    renderNotesList();
    setupEventListeners();
}

function loadVault() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            vault = JSON.parse(data);
        } else {
            // Default welcoming encrypted note
            createDefaultNote();
        }
    } catch (e) {
        console.error('Failed to load vault from localStorage', e);
        vault = { notes: [] };
    }
}

function saveVault() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(vault));
    } catch (e) {
        showToast('Error saving to storage!');
    }
}

function createDefaultNote() {
    const sampleNote = {
        id: generateId(),
        title: 'Welcome to AuraVault',
        tags: ['security', 'guide'],
        updatedAt: new Date().toISOString(),
        isEncrypted: false,
        ciphertext: '',
        iv: '',
        salt: '',
        content: 'Your notes are protected locally using browser Web Crypto API (AES-GCM 256-bit).\n\n1. Enter a master passphrase below.\n2. Click "Encrypt & Lock".\n3. Your plaintext is securely converted into ciphertext.\n4. Export your encrypted backup anytime!'
    };
    vault.notes.push(sampleNote);
    saveVault();
}

function generateId() {
    return 'note_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Crypto Helpers (Web Crypto API)
async function deriveKey(passphrase, saltBytes) {
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
            salt: saltBytes,
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
    const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        enc.encode(plaintext)
    );

    return {
        ciphertext: arrayBufferToBase64(encrypted),
        iv: arrayBufferToBase64(iv),
        salt: arrayBufferToBase64(salt)
    };
}

async function decryptData(ciphertextBase64, ivBase64, saltBase64, passphrase) {
    const dec = new TextDecoder();
    const ciphertext = base64ToArrayBuffer(ciphertextBase64);
    const iv = base64ToArrayBuffer(ivBase64);
    const salt = base64ToArrayBuffer(saltBase64);
    const key = await deriveKey(passphrase, salt);
    const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        ciphertext
    );
    return dec.decode(decrypted);
}

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

// Entropy calculator for password strength feedback
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
    const bits = calculateEntropy(passphrase);
    let percent = Math.min(100, (bits / 128) * 100);
    entropyFill.style.width = percent + '%';

    let strength = 'Very Weak';
    let color = 'var(--danger)';
    if (bits > 80) {
        strength = 'Strong';
        color = 'var(--success)';
    } else if (bits > 55) {
        strength = 'Moderate';
        color = 'var(--warning)';
    } else if (bits > 30) {
        strength = 'Weak';
        color = '#f97316';
    }
    entropyFill.style.background = color;
    entropyText.textContent = `Entropy: ~${bits} bits (${strength})`;
}

// Rendering UI
function renderNotesList(filterQuery = '') {
    notesListEl.innerHTML = '';
    const query = filterQuery.toLowerCase();

    const filteredNotes = vault.notes.filter(note => {
        const matchTitle = note.title.toLowerCase().includes(query);
        const matchTags = note.tags && note.tags.some(t => t.toLowerCase().includes(query));
        return matchTitle || matchTags;
    });

    if (filteredNotes.length === 0) {
        emptyVaultStateEl.classList.remove('hidden');
    } else {
        emptyVaultStateEl.classList.add('hidden');
    }

    filteredNotes.forEach(note => {
        const li = document.createElement('li');
        li.className = `note-item ${note.id === currentNoteId ? 'active' : ''}`;
        li.addEventListener('click', () => selectNote(note.id));

        const dateStr = new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        
        let tagsHtml = '';
        if (note.tags && note.tags.length > 0) {
            tagsHtml = '<div class="tags-preview">' + note.tags.map(t => `<span class="tag-pill">#${escapeHtml(t.trim())}</span>`).join('') + '</div>';
        }

        const lockStatusIcon = note.isEncrypted ? '🔒' : '🔓';

        li.innerHTML = `
            <div class="note-item-header">
                <span class="note-item-title">${lockStatusIcon} ${escapeHtml(note.title || 'Untitled Note')}</span>
                <span class="note-item-date">${dateStr}</span>
            </div>
            <div class="note-item-snippet">${note.isEncrypted ? 'Encrypted secret payload' : escapeHtml(note.content.substring(0, 50))}</div>
            ${tagsHtml}
        `;
        notesListEl.appendChild(li);
    });
}

function selectNote(id) {
    currentNoteId = id;
    const note = vault.notes.find(n => n.id === id);
    if (!note) return;

    renderNotesList(searchInputEl.value);

    editorPlaceholder.classList.add('hidden');
    editorContainer.classList.remove('hidden');

    noteTitleEl.value = note.title;
    noteTagsEl.value = note.tags ? note.tags.join(', ') : '';
    lastModifiedEl.textContent = 'Updated: ' + new Date(note.updatedAt).toLocaleString();

    if (note.isEncrypted) {
        encBadge.textContent = 'Locked (Encrypted)';
        encBadge.className = 'badge badge-locked';
        decryptView.classList.remove('hidden');
        encryptView.classList.add('hidden');
        contentEditorWrapper.classList.add('hidden');
        ciphertextWrapper.classList.remove('hidden');
        noteCiphertextEl.value = note.ciphertext;
        unlockPassphraseEl.value = '';
        unlockError.classList.add('hidden');
    } else {
        encBadge.textContent = 'Unlocked (Plaintext)';
        encBadge.className = 'badge badge-unlocked';
        decryptView.classList.add('hidden');
        encryptView.classList.remove('hidden');
        contentEditorWrapper.classList.remove('hidden');
        ciphertextWrapper.classList.add('hidden');
        noteContentEl.value = note.content;
        notePassphraseEl.value = '';
        updateEntropyMeter('');
    }
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// Event Listeners Setup
function setupEventListeners() {
    btnNewNote.addEventListener('click', () => {
        const newNote = {
            id: generateId(),
            title: 'New Secret Note',
            tags: ['secret'],
            updatedAt: new Date().toISOString(),
            isEncrypted: false,
            ciphertext: '',
            iv: '',
            salt: '',
            content: ''
        };
        vault.notes.unshift(newNote);
        saveVault();
        selectNote(newNote.id);
    });

    searchInputEl.addEventListener('input', (e) => {
        renderNotesList(e.target.value);
    });

    btnSaveNote.addEventListener('click', () => {
        const note = vault.notes.find(n => n.id === currentNoteId);
        if (!note) return;

        note.title = noteTitleEl.value.trim() || 'Untitled Note';
        note.tags = noteTagsEl.value.split(',').map(t => t.trim()).filter(Boolean);
        note.updatedAt = new Date().toISOString();

        if (!note.isEncrypted) {
            note.content = noteContentEl.value;
        }

        saveVault();
        renderNotesList(searchInputEl.value);
        lastModifiedEl.textContent = 'Updated: ' + new Date(note.updatedAt).toLocaleString();
        showToast('Note saved successfully.');
    });

    btnDeleteNote.addEventListener('click', () => {
        if (!confirm('Are you sure you want to delete this note?')) return;
        vault.notes = vault.notes.filter(n => n.id !== currentNoteId);
        saveVault();
        currentNoteId = null;
        editorContainer.classList.add('hidden');
        editorPlaceholder.classList.remove('hidden');
        renderNotesList(searchInputEl.value);
        showToast('Note deleted.');
    });

    notePassphraseEl.addEventListener('input', (e) => {
        updateEntropyMeter(e.target.value);
    });

    btnTogglePass.addEventListener('click', () => {
        if (notePassphraseEl.type === 'password') {
            notePassphraseEl.type = 'text';
            btnTogglePass.textContent = '🙈';
        } else {
            notePassphraseEl.type = 'password';
            btnTogglePass.textContent = '👁';
        }
    });

    // Encrypt & Lock Note
    btnLockNote.addEventListener('click', async () => {
        const note = vault.notes.find(n => n.id === currentNoteId);
        if (!note) return;

        const passphrase = notePassphraseEl.value;
        if (!passphrase) {
            alert('Please enter a master passphrase to encrypt this note.');
            return;
        }

        try {
            const plaintext = noteContentEl.value;
            const encryptedObj = await encryptData(plaintext, passphrase);

            note.isEncrypted = true;
            note.ciphertext = encryptedObj.ciphertext;
            note.iv = encryptedObj.iv;
            note.salt = encryptedObj.salt;
            note.content = ''; // Clear plaintext from storage object
            note.updatedAt = new Date().toISOString();

            saveVault();
            selectNote(note.id);
            showToast('Note encrypted & locked securely!');
        } catch (e) {
            console.error(e);
            showToast('Encryption failed!');
        }
    });

    // Unlock Note
    btnUnlock.addEventListener('click', async () => {
        const note = vault.notes.find(n => n.id === currentNoteId);
        if (!note) return;

        const passphrase = unlockPassphraseEl.value;
        if (!passphrase) return;

        try {
            const plaintext = await decryptData(note.ciphertext, note.iv, note.salt, passphrase);
            note.isEncrypted = false;
            note.content = plaintext;
            note.ciphertext = '';
            note.iv = '';
            note.salt = '';
            note.updatedAt = new Date().toISOString();

            saveVault();
            selectNote(note.id);
            showToast('Note unlocked successfully!');
        } catch (e) {
            unlockError.classList.remove('hidden');
        }
    });

    btnCopyContent.addEventListener('click', () => {
        navigator.clipboard.writeText(noteContentEl.value).then(() => {
            showToast('Plaintext copied to clipboard');
        }).catch(() => {
            showToast('Failed to copy');
        });
    });

    // Export Backup
    btnExport.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(vault, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `auravault_backup_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showToast('Vault backup exported.');
    });

    // Import Backup
    importFileEl.addEventListener('change', (e) => {
        const fileReader = new FileReader();
        if (e.target.files[0]) {
            fileReader.readAsText(e.target.files[0], "UTF-8");
            fileReader.onload = (event) => {
                try {
                    const importedVault = JSON.parse(event.target.result);
                    if (importedVault && Array.isArray(importedVault.notes)) {
                        vault = importedVault;
                        saveVault();
                        renderNotesList();
                        editorContainer.classList.add('hidden');
                        editorPlaceholder.classList.remove('hidden');
                        showToast('Vault imported successfully!');
                    } else {
                        throw new Error('Invalid format');
                    }
                } catch (err) {
                    alert('Invalid AuraVault JSON backup file.');
                }
            };
        }
    });
}

function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.remove('hidden');
    setTimeout(() => {
        toastEl.classList.add('hidden');
    }, 3000);
}

// Run initialization
init();
