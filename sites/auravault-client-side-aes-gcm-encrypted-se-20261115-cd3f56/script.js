/**
 * AuraVault - Client-Side AES-GCM Encrypted Secret & Note Vault
 * Uses Web Crypto API (PBKDF2 + AES-GCM) for secure client-side zero-knowledge encryption.
 */

(function() {
    'use strict';

    // Application State
    let secrets = [];
    let activeSecretId = null;
    let masterKeyCache = null;
    let saltCache = null;

    // DOM Elements
    const masterPassphraseInput = document.getElementById('masterPassphrase');
    const togglePassBtn = document.getElementById('togglePassBtn');
    const entropyBar = document.getElementById('entropyBar');
    const entropyText = document.getElementById('entropyText');
    const newSecretBtn = document.getElementById('newSecretBtn');
    const welcomeNewBtn = document.getElementById('welcomeNewBtn');
    const lockVaultBtn = document.getElementById('lockVaultBtn');
    const searchSecretsInput = document.getElementById('searchSecrets');
    const secretList = document.getElementById('secretList');
    const exportVaultBtn = document.getElementById('exportVaultBtn');
    const importVaultInput = document.getElementById('importVaultInput');

    const welcomeState = document.getElementById('welcomeState');
    const editorState = document.getElementById('editorState');
    const secretTitleInput = document.getElementById('secretTitle');
    const secretTagsInput = document.getElementById('secretTags');
    const secretCategorySelect = document.getElementById('secretCategory');
    const secretContentTextarea = document.getElementById('secretContent');
    const decryptedOverlay = document.getElementById('decryptedOverlay');
    const charCountEl = document.getElementById('charCount');
    const lastUpdatedEl = document.getElementById('lastUpdated');
    const copyContentBtn = document.getElementById('copyContentBtn');
    const deleteSecretBtn = document.getElementById('deleteSecretBtn');
    const saveSecretBtn = document.getElementById('saveSecretBtn');
    const toastEl = document.getElementById('toast');

    // Initialization
    function init() {
        loadFromLocalStorage();
        setupEventListeners();
        renderSecretList();
    }

    function setupEventListeners() {
        masterPassphraseInput.addEventListener('input', handlePassphraseInput);
        togglePassBtn.addEventListener('click', togglePassVisibility);
        newSecretBtn.addEventListener('click', createNewSecret);
        welcomeNewBtn.addEventListener('click', createNewSecret);
        lockVaultBtn.addEventListener('click', lockVault);
        searchSecretsInput.addEventListener('input', renderSecretList);
        
        saveSecretBtn.addEventListener('click', saveActiveSecret);
        deleteSecretBtn.addEventListener('click', deleteActiveSecret);
        copyContentBtn.addEventListener('click', copyContentToClipboard);
        
        secretContentTextarea.addEventListener('input', updateCharCount);

        exportVaultBtn.addEventListener('click', exportVaultJSON);
        importVaultInput.addEventListener('change', importVaultJSON);

        // Auto-save on shortcut (Ctrl+S)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (activeSecretId) saveActiveSecret();
            }
        });
    }

    // Toast Notification
    function showToast(message, duration = 3000) {
        toastEl.textContent = message;
        toastEl.classList.remove('hidden');
        setTimeout(() => {
            toastEl.classList.add('hidden');
        }, duration);
    }

    // Password Entropy & Key Derivation
    function handlePassphraseInput() {
        const val = masterPassphraseInput.value;
        const entropy = calculateEntropy(val);
        updateEntropyMeter(entropy);

        if (val.length >= 8) {
            deriveKey(val).then(success => {
                if (success) {
                    decryptedOverlay.style.display = 'none';
                    if (activeSecretId) {
                        loadSecretIntoEditor(activeSecretId);
                    }
                }
            });
        } else {
            masterKeyCache = null;
            decryptedOverlay.style.display = 'flex';
        }
    }

    function calculateEntropy(str) {
        if (!str) return 0;
        let charsetSize = 0;
        if (/[a-z]/.test(str)) charsetSize += 26;
        if (/[A-Z]/.test(str)) charsetSize += 26;
        if (/[0-9]/.test(str)) charsetSize += 10;
        if (/[^a-zA-Z0-9]/.test(str)) charsetSize += 32;
        
        const entropy = str.length * Math.log2(charsetSize || 1);
        return Math.min(Math.round(entropy), 128);
    }

    function updateEntropyMeter(entropy) {
        const percentage = Math.min((entropy / 80) * 100, 100);
        entropyBar.style.width = percentage + '%';
        
        if (entropy < 30) {
            entropyBar.style.backgroundColor = 'var(--accent-danger)';
            entropyText.textContent = 'Weak passphrase (< 30 bits)';
        } else if (entropy < 60) {
            entropyBar.style.backgroundColor = '#f59e0b';
            entropyText.textContent = 'Moderate passphrase (Good)';
        } else {
            entropyBar.style.backgroundColor = 'var(--accent-success)';
            entropyText.textContent = 'Strong passphrase (Excellent)';
        }
    }

    function togglePassVisibility() {
        if (masterPassphraseInput.type === 'password') {
            masterPassphraseInput.type = 'text';
            togglePassBtn.textContent = '🔒';
        } else {
            masterPassphraseInput.type = 'password';
            togglePassBtn.textContent = '👁️';
        }
    }

    // Web Crypto API Helpers
    async function getOrCreateSalt() {
        let storedSalt = localStorage.getItem('auravault_salt');
        if (storedSalt) {
            return base64ToUint8(storedSalt);
        } else {
            const salt = window.crypto.getRandomValues(new Uint8Array(16));
            localStorage.setItem('auravault_salt', uint8ToBase64(salt));
            return salt;
        }
    }

    async function deriveKey(passphrase) {
        try {
            const salt = await getOrCreateSalt();
            saltCache = salt;
            const enc = new TextEncoder();
            const keyMaterial = await window.crypto.subtle.importKey(
                "raw",
                enc.encode(passphrase),
                { name: "PBKDF2" },
                false,
                ["deriveKey"]
            );

            masterKeyCache = await window.crypto.subtle.deriveKey(
                {
                    name: "PBKDF2",
                    salt: salt,
                    iterations: 100000,
                    hash: "SHA-256"
                },
                keyMaterial,
                { name: "AES-GCM", length: 256 },
                false,
                ["encrypt", "decrypt"]
            );
            return true;
        } catch (e) {
            console.error('Key derivation failed', e);
            return false;
        }
    }

    async function encryptData(plaintext) {
        if (!masterKeyCache) throw new Error('Master key not derived');
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const enc = new TextEncoder();
        const ciphertext = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            masterKeyCache,
            enc.encode(plaintext)
        );

        return {
            ciphertext: uint8ToBase64(new Uint8Array(ciphertext)),
            iv: uint8ToBase64(iv)
        };
    }

    async function decryptData(ciphertextBase64, ivBase64) {
        if (!masterKeyCache) return '[Locked: Enter Master Passphrase]';
        try {
            const ciphertext = base64ToUint8(ciphertextBase64);
            const iv = base64ToUint8(ivBase64);
            const decrypted = await window.crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: iv
                },
                masterKeyCache,
                ciphertext
            );
            const dec = new TextDecoder();
            return dec.decode(decrypted);
        } catch (e) {
            return '[Decryption Failed: Incorrect Passphrase]';
        }
    }

    // Utility Base64 converters
    function uint8ToBase64(u8Arr) {
        let CHUNK_SIZE = 0x8000;
        let index = 0;
        let length = u8Arr.length;
        let result = '';
        while (index < length) {
            let slice = u8Arr.subarray(index, Math.min(index + CHUNK_SIZE, length));
            result += String.fromCharCode.apply(null, slice);
            index += CHUNK_SIZE;
        }
        return btoa(result);
    }

    function base64ToUint8(str) {
        let binaryString = atob(str);
        let len = binaryString.length;
        let bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    // Vault State Management
    function loadFromLocalStorage() {
        const data = localStorage.getItem('auravault_secrets');
        if (data) {
            try {
                secrets = JSON.parse(data);
            } catch (e) {
                secrets = [];
            }
        } else {
            // Sample Initial Secret
            secrets = [];
        }
    }

    function saveToLocalStorage() {
        localStorage.setItem('auravault_secrets', JSON.stringify(secrets));
    }

    function lockVault() {
        masterPassphraseInput.value = '';
        masterKeyCache = null;
        updateEntropyMeter(0);
        entropyText.textContent = 'Passphrase required for decrypt';
        if (activeSecretId) {
            loadSecretIntoEditor(activeSecretId);
        }
        showToast('Vault locked successfully');
    }

    // Secret CRUD Operations
    function createNewSecret() {
        const newSec = {
            id: 'sec_' + Date.now(),
            title: 'Untitled Secret',
            category: 'secure-note',
            tags: 'general',
            ciphertext: '',
            iv: '',
            updatedAt: new Date().toISOString()
        };
        secrets.unshift(newSec);
        saveToLocalStorage();
        renderSecretList();
        selectSecret(newSec.id);
    }

    async function saveActiveSecret() {
        if (!activeSecretId) return;
        if (!masterKeyCache) {
            showToast('Error: Enter master passphrase to encrypt and save.');
            return;
        }

        const secret = secrets.find(s => s.id === activeSecretId);
        if (!secret) return;

        const title = secretTitleInput.value.trim() || 'Untitled Secret';
        const tags = secretTagsInput.value.trim();
        const category = secretCategorySelect.value;
        const content = secretContentTextarea.value;

        try {
            const encrypted = await encryptData(content);
            secret.title = title;
            secret.tags = tags;
            secret.category = category;
            secret.ciphertext = encrypted.ciphertext;
            secret.iv = encrypted.iv;
            secret.updatedAt = new Date().toISOString();

            saveToLocalStorage();
            renderSecretList();
            lastUpdatedEl.textContent = 'Saved at ' + new Date().toLocaleTimeString();
            showToast('Secret encrypted & saved securely.');
        } catch (e) {
            showToast('Encryption failed: ' + e.message);
        }
    }

    function deleteActiveSecret() {
        if (!activeSecretId) return;
        if (confirm('Are you sure you want to delete this secret permanently?')) {
            secrets = secrets.filter(s => s.id !== activeSecretId);
            saveToLocalStorage();
            renderSecretList();
            activeSecretId = null;
            welcomeState.style.display = 'flex';
            editorState.style.display = 'none';
            showToast('Secret deleted.');
        }
    }

    async function selectSecret(id) {
        activeSecretId = id;
        renderSecretList();
        welcomeState.style.display = 'none';
        editorState.style.display = 'flex';
        await loadSecretIntoEditor(id);
    }

    async function loadSecretIntoEditor(id) {
        const secret = secrets.find(s => s.id === id);
        if (!secret) return;

        secretTitleInput.value = secret.title;
        secretTagsInput.value = secret.tags;
        secretCategorySelect.value = secret.category;
        lastUpdatedEl.textContent = 'Updated: ' + new Date(secret.updatedAt).toLocaleString();

        if (secret.ciphertext) {
            if (masterKeyCache) {
                const decrypted = await decryptData(secret.ciphertext, secret.iv);
                secretContentTextarea.value = decrypted;
                decryptedOverlay.style.display = 'none';
            } else {
                secretContentTextarea.value = '';
                decryptedOverlay.style.display = 'flex';
            }
        } else {
            secretContentTextarea.value = '';
            decryptedOverlay.style.display = 'none';
        }
        updateCharCount();
    }

    function updateCharCount() {
        const len = secretContentTextarea.value.length;
        charCountEl.textContent = len + ' characters';
    }

    function copyContentToClipboard() {
        const val = secretContentTextarea.value;
        if (!val) return;
        navigator.clipboard.writeText(val).then(() => {
            showToast('Content copied to clipboard.');
        });
    }

    // Rendering List & Filtering
    function renderSecretList() {
        const query = searchSecretsInput.value.toLowerCase();
        secretList.innerHTML = '';

        const filtered = secrets.filter(s => 
            s.title.toLowerCase().includes(query) || 
            s.tags.toLowerCase().includes(query) ||
            s.category.toLowerCase().includes(query)
        );

        if (filtered.length === 0) {
            secretList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">No secrets found</div>';
            return;
        }

        filtered.forEach(s => {
            const item = document.createElement('div');
            item.className = 'secret-item' + (s.id === activeSecretId ? ' active' : '');
            
            let icon = '📝';
            if (s.category === 'credential') icon = '🔑';
            else if (s.category === 'api-key') icon = '⚡';
            else if (s.category === 'journal') icon = '📔';

            item.innerHTML = `
                <div class="secret-item-header">
                    <span class="secret-item-title">${icon} ${escapeHtml(s.title)}</span>
                    <span class="secret-item-type">${s.category}</span>
                </div>
                <div class="secret-item-meta">
                    <span>${escapeHtml(s.tags || 'no tags')}</span>
                    <span>${new Date(s.updatedAt).toLocaleDateString()}</span>
                </div>
            `;
            item.addEventListener('click', () => selectSecret(s.id));
            secretList.appendChild(item);
        });
    }

    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    // Backup / Restore JSON
    function exportVaultJSON() {
        const backupData = {
            version: 1,
            exportedAt: new Date().toISOString(),
            salt: localStorage.getItem('auravault_salt'),
            secrets: secrets
        };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'auravault-backup-' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Vault encrypted backup exported.');
    }

    function importVaultJSON(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const parsed = JSON.parse(evt.target.result);
                if (parsed.secrets && Array.isArray(parsed.secrets)) {
                    if (confirm('Importing this backup will merge or overwrite current local secrets. Proceed?')) {
                        if (parsed.salt) {
                            localStorage.setItem('auravault_salt', parsed.salt);
                        }
                        secrets = parsed.secrets;
                        saveToLocalStorage();
                        renderSecretList();
                        showToast('Vault backup imported successfully.');
                    }
                } else {
                    alert('Invalid backup format.');
                }
            } catch (err) {
                alert('Failed to parse JSON backup file.');
            }
            importVaultInput.value = '';
        };
        reader.readAsText(file);
    }

    // Initialize on load
    init();

})();
