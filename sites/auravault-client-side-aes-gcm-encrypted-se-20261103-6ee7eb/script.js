document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const secretForm = document.getElementById('secretForm');
    const secretTitleInput = document.getElementById('secretTitle');
    const secretCategorySelect = document.getElementById('secretCategory');
    const secretContentInput = document.getElementById('secretContent');
    const secretPassphraseInput = document.getElementById('secretPassphrase');
    const togglePassBtn = document.getElementById('togglePassBtn');
    const eyeIcon = document.getElementById('eyeIcon');
    const entropyBar = document.getElementById('entropyBar');
    const entropyText = document.getElementById('entropyText');
    const strengthText = document.getElementById('strengthText');
    const generatePassBtn = document.getElementById('generatePassBtn');
    
    const vaultList = document.getElementById('vaultList');
    const searchInput = document.getElementById('searchInput');
    const exportVaultBtn = document.getElementById('exportVaultBtn');
    const importVaultInput = document.getElementById('importVaultInput');
    const clearVaultBtn = document.getElementById('clearVaultBtn');
    const statTotal = document.getElementById('statTotal');
    const statStorage = document.getElementById('statStorage');
    
    // Modal Elements
    const decryptModal = document.getElementById('decryptModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const modalTitle = document.getElementById('modalTitle');
    const modalSecretMeta = document.getElementById('modalSecretMeta');
    const decryptPassphrase = document.getElementById('decryptPassphrase');
    const decryptError = document.getElementById('decryptError');
    const decryptedResultContainer = document.getElementById('decryptedResultContainer');
    const decryptedContent = document.getElementById('decryptedContent');
    const confirmDecryptBtn = document.getElementById('confirmDecryptBtn');
    const copySecretBtn = document.getElementById('copySecretBtn');
    const copyFeedback = document.getElementById('copyFeedback');
    const decryptPassGroup = document.getElementById('decryptPassGroup');

    const STORAGE_KEY = 'auravault_secrets_v1';
    let activeSecretId = null;

    // Initialize vault storage
    function getVault() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to read vault from localStorage', e);
            return [];
        }
    }

    function saveVault(vault) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(vault));
            renderVault();
        } catch (e) {
            alert('Storage limit reached or error saving vault.');
        }
    }

    // Entropy Calculation
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

    function updateEntropyUI(pass) {
        const bits = calculateEntropy(pass);
        entropyText.textContent = `Entropy: ${bits} bits`;
        
        let percentage = Math.min(100, (bits / 128) * 100);
        entropyBar.style.width = `${percentage}%`;
        
        strengthText.className = 'strength-badge';
        if (bits < 40) {
            strengthText.textContent = 'Weak';
            strengthText.classList.add('weak');
            entropyBar.style.backgroundColor = 'var(--danger-color)';
        } else if (bits < 70) {
            strengthText.textContent = 'Fair';
            strengthText.classList.add('fair');
            entropyBar.style.backgroundColor = 'var(--warning-color)';
        } else if (bits < 110) {
            strengthText.textContent = 'Strong';
            strengthText.classList.add('strong');
            entropyBar.style.backgroundColor = 'var(--success-color)';
        } else {
            strengthText.textContent = 'Secure';
            strengthText.classList.add('secure');
            entropyBar.style.backgroundColor = 'var(--accent-color)';
        }
    }

    secretPassphraseInput.addEventListener('input', (e) => {
        updateEntropyUI(e.target.value);
    });

    // Toggle Passphrase Visibility
    togglePassBtn.addEventListener('click', () => {
        const isPassword = secretPassphraseInput.type === 'password';
        secretPassphraseInput.type = isPassword ? 'text' : 'password';
        if (isPassword) {
            eyeIcon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
        } else {
            eyeIcon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
        }
    });

    // Generate Strong Passphrase
    generatePassBtn.addEventListener('click', () => {
        const words = ['alpha', 'bravo', 'cyber', 'delta', 'eagle', 'frost', 'galaxy', 'helix', 'ignite', 'jungle', 'kinetic', 'lunar', 'matrix', 'nebula', 'orbit', 'pulsar', 'quantum', 'radar', 'stellar', 'turbo', 'ultra', 'vortex', 'warp', 'xenon', 'yield', 'zenith'];
        let pass = '';
        for (let i = 0; i < 4; i++) {
            const randWord = words[Math.floor(Math.random() * words.length)];
            const randNum = Math.floor(Math.random() * 90) + 10;
            const randChar = '!@#$%^&*'[Math.floor(Math.random() * 8)];
            pass += (i === 0 ? '' : '-') + randWord + randNum + randChar;
        }
        secretPassphraseInput.value = pass;
        updateEntropyUI(pass);
    });

    // Web Crypto API Helpers (AES-GCM 256-bit + PBKDF2)
    async function deriveKey(passphrase, salt, iterations = 100000) {
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
                iterations: iterations,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    async function encryptData(text, passphrase) {
        const enc = new TextEncoder();
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveKey(passphrase, salt);
        const encrypted = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            enc.encode(text)
        );

        return {
            ciphertext: Array.from(new Uint8Array(encrypted)),
            iv: Array.from(iv),
            salt: Array.from(salt)
        };
    }

    async function decryptData(payload, passphrase) {
        const dec = new TextDecoder();
        const salt = new Uint8Array(payload.salt);
        const iv = new Uint8Array(payload.iv);
        const ciphertext = new Uint8Array(payload.ciphertext);
        const key = await deriveKey(passphrase, salt);
        const decrypted = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            ciphertext
        );
        return dec.decode(decrypted);
    }

    // Form Submit -> Encrypt & Save
    secretForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = secretTitleInput.value.trim();
        const category = secretCategorySelect.value;
        const content = secretContentInput.value;
        const passphrase = secretPassphraseInput.value;

        if (!title || !content || !passphrase) return;

        try {
            const encryptedPayload = await encryptData(content, passphrase);
            const vault = getVault();
            
            const newSecret = {
                id: 'sec_' + Date.now() + Math.random().toString(36).substr(2, 5),
                title,
                category,
                payload: encryptedPayload,
                createdAt: new Date().toISOString()
            };

            vault.unshift(newSecret);
            saveVault(vault);

            // Reset Form
            secretForm.reset();
            updateEntropyUI('');
            alert('Secret encrypted and stored securely in local vault.');
        } catch (err) {
            console.error(err);
            alert('Encryption failed.');
        }
    });

    // Render Vault
    function renderVault() {
        const vault = getVault();
        const query = searchInput.value.toLowerCase();

        const filtered = vault.filter(item => 
            item.title.toLowerCase().includes(query) || item.category.toLowerCase().includes(query)
        );

        statTotal.textContent = vault.length;
        
        // Calculate storage size
        const jsonString = localStorage.getItem(STORAGE_KEY) || '[]';
        const bytes = new Blob([jsonString]).size;
        statStorage.textContent = bytes > 1024 ? (bytes / 1024).toFixed(1) + ' KB' : bytes + ' B';

        if (filtered.length === 0) {
            vaultList.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.778-7.778zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
                    <p>${vault.length === 0 ? 'Your vault is empty.' : 'No matching secrets found.'}</p>
                </div>
            `;
            return;
        }

        vaultList.innerHTML = filtered.map(item => `
            <div class="vault-item">
                <div class="vault-item-info">
                    <span class="vault-item-title">${escapeHTML(item.title)}</span>
                    <div class="vault-item-meta">
                        <span class="tag">${escapeHTML(item.category)}</span>
                        <span>Added: ${new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="vault-item-actions">
                    <button type="button" class="btn small primary" data-action="decrypt" data-id="${item.id}">Decrypt</button>
                    <button type="button" class="btn small secondary" data-action="delete" data-id="${item.id}">Delete</button>
                </div>
            </div>
        `).join('');
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }

    searchInput.addEventListener('input', renderVault);

    // Vault Actions (Decrypt / Delete)
    vaultList.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        const id = btn.getAttribute('data-id');

        if (action === 'delete') {
            if (confirm('Are you sure you want to permanently delete this secret?')) {
                const vault = getVault().filter(item => item.id !== id);
                saveVault(vault);
            }
        } else if (action === 'decrypt') {
            openDecryptModal(id);
        }
    });

    function openDecryptModal(id) {
        activeSecretId = id;
        const vault = getVault();
        const secret = vault.find(s => s.id === id);
        if (!secret) return;

        modalTitle.textContent = `Decrypt: ${secret.title}`;
        modalSecretMeta.textContent = `Category: ${secret.category} | Created: ${new Date(secret.createdAt).toLocaleString()}`;
        decryptPassphrase.value = '';
        decryptError.style.display = 'none';
        decryptedResultContainer.style.display = 'none';
        decryptPassGroup.style.display = 'flex';
        confirmDecryptBtn.style.display = 'inline-block';
        copyFeedback.style.display = 'none';
        
        decryptModal.classList.add('active');
        decryptPassphrase.focus();
    }

    function closeModal() {
        decryptModal.classList.remove('active');
        activeSecretId = null;
        decryptPassphrase.value = '';
        decryptedContent.value = '';
    }

    closeModalBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === decryptModal) closeModal();
    });

    // Confirm Decryption
    confirmDecryptBtn.addEventListener('click', async () => {
        if (!activeSecretId) return;
        const passphrase = decryptPassphrase.value;
        if (!passphrase) return;

        const vault = getVault();
        const secret = vault.find(s => s.id === activeSecretId);
        if (!secret) return;

        try {
            const plainText = await decryptData(secret.payload, passphrase);
            decryptError.style.display = 'none';
            decryptPassGroup.style.display = 'none';
            confirmDecryptBtn.style.display = 'none';
            decryptedContent.value = plainText;
            decryptedResultContainer.style.display = 'block';
        } catch (err) {
            decryptError.style.display = 'block';
        }
    });

    // Copy Decrypted Content
    copySecretBtn.addEventListener('click', () => {
        decryptedContent.select();
        navigator.clipboard.writeText(decryptedContent.value).then(() => {
            copyFeedback.style.display = 'inline';
            setTimeout(() => { copyFeedback.style.display = 'none'; }, 2000);
        }).catch(() => {
            alert('Failed to copy to clipboard.');
        });
    });

    // Export Vault
    exportVaultBtn.addEventListener('click', () => {
        const vaultJson = localStorage.getItem(STORAGE_KEY) || '[]';
        const blob = new Blob([vaultJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `auravault_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Import Vault
    importVaultInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                if (Array.isArray(imported)) {
                    if (confirm('Importing this vault will merge or replace current secrets. Proceed?')) {
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
                        renderVault();
                        alert('Vault imported successfully.');
                    }
                } else {
                    alert('Invalid vault backup file format.');
                }
            } catch (err) {
                alert('Failed to parse JSON backup file.');
            }
            importVaultInput.value = '';
        };
        reader.readAsText(file);
    });

    // Clear Vault
    clearVaultBtn.addEventListener('click', () => {
        if (confirm('WARNING: This will permanently delete all stored encrypted secrets from local storage. Are you sure?')) {
            localStorage.removeItem(STORAGE_KEY);
            renderVault();
        }
    });

    // Initial Render
    renderVault();
});
