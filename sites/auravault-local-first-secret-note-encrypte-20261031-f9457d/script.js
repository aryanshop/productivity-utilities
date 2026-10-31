/* AuraVault - Client-Side AES-GCM Encryption Studio */

document.addEventListener('DOMContentLoaded', () => {
    // Tab Navigation Logic
    const tabButtons = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.panel');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = 'panel-' + btn.id.replace('tab-', '');
            
            tabButtons.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            panels.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            const targetPanel = document.getElementById(targetId);
            if (targetPanel) targetPanel.classList.add('active');
        });
    });

    // Passphrase Visibility Toggle helper
    function setupPasswordToggle(inputEl, btnEl) {
        if (!inputEl || !btnEl) return;
        btnEl.addEventListener('click', () => {
            const isPassword = inputEl.type === 'password';
            inputEl.type = isPassword ? 'text' : 'password';
            btnEl.style.color = isPassword ? 'var(--accent)' : 'var(--text-muted)';
        });
    }

    setupPasswordToggle(document.getElementById('encrypt-passphrase'), document.getElementById('toggle-enc-pass'));
    setupPasswordToggle(document.getElementById('decrypt-passphrase'), document.getElementById('toggle-dec-pass'));

    // Entropy Calculation Helper
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
        const bar = document.getElementById('entropy-bar');
        const text = document.getElementById('entropy-text');
        if (!bar || !text) return;

        const entropy = calculateEntropy(pass);
        let width = Math.min(100, (entropy / 128) * 100);
        let color = 'var(--danger)';
        let label = 'Very Weak';

        if (entropy > 80) {
            color = 'var(--success)';
            label = 'Strong (Cryptographic Grade)';
        } else if (entropy > 55) {
            color = 'var(--accent)';
            label = 'Moderate';
        } else if (entropy > 30) {
            color = 'var(--warning)';
            label = 'Weak';
        }

        bar.style.width = width + '%';
        bar.style.backgroundColor = color;
        text.textContent = `Passphrase strength: ${label} (${entropy} bits of entropy)`;
    }

    const encPassInput = document.getElementById('encrypt-passphrase');
    if (encPassInput) {
        encPassInput.addEventListener('input', (e) => updateEntropyUI(e.target.value));
    }

    // Web Crypto API Helpers
    async function deriveKey(passphrase, salt, usage = ['encrypt', 'decrypt']) {
        const enc = new TextEncoder();
        const keyMaterial = await window.subtle.importKey(
            'raw',
            enc.encode(passphrase),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );
        return window.subtle.deriveKey(
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

    // Encrypt Handler
    const btnEncrypt = document.getElementById('btn-encrypt');
    const secretInput = document.getElementById('secret-input');
    const ciphertextOutput = document.getElementById('ciphertext-output');
    const btnCopyCipher = document.getElementById('btn-copy-cipher');
    const btnDownloadVault = document.getElementById('btn-download-vault');
    const btnSendDecrypt = document.getElementById('btn-send-decrypt');

    let lastEncryptedPayload = null;

    if (btnEncrypt) {
        btnEncrypt.addEventListener('click', async () => {
            const secret = secretInput.value.trim();
            const passphrase = encPassInput.value;
            const expiry = parseInt(document.getElementById('expiry-select').value, 10);

            if (!secret) {
                alert('Please enter secret content to encrypt.');
                return;
            }
            if (!passphrase) {
                alert('Please enter an encryption passphrase.');
                return;
            }

            try {
                btnEncrypt.textContent = 'Encrypting...';
                btnEncrypt.disabled = true;

                const salt = window.crypto.getRandomValues(new Uint8Array(16));
                const iv = window.crypto.getRandomValues(new Uint8Array(12));
                const key = await deriveKey(passphrase, salt, ['encrypt']);

                const enc = new TextEncoder();
                const ciphertext = await window.subtle.encrypt(
                    { name: 'AES-GCM', iv: iv },
                    key,
                    enc.encode(JSON.stringify({
                        content: secret,
                        created: Date.now(),
                        expiryHours: expiry,
                        readsRemaining: expiry > 0 ? 1 : null
                    }))
                );

                const payload = {
                    version: 1,
                    algorithm: 'PBKDF2-AES-GCM',
                    salt: Array.from(salt),
                    iv: Array.from(iv),
                    data: Array.from(new Uint8Array(ciphertext))
                };

                lastEncryptedPayload = payload;
                const jsonString = JSON.stringify(payload, null, 2);
                ciphertextOutput.value = jsonString;

                btnCopyCipher.disabled = false;
                btnDownloadVault.disabled = false;
                btnSendDecrypt.disabled = false;

                btnEncrypt.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Encrypted Successfully`;
                setTimeout(() => {
                    btnEncrypt.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Lock & Encrypt`;
                    btnEncrypt.disabled = false;
                }, 2000);

            } catch (err) {
                console.error(err);
                alert('Encryption failed: ' + err.message);
                btnEncrypt.innerHTML = 'Lock & Encrypt';
                btnEncrypt.disabled = false;
            }
        });
    }

    if (btnCopyCipher) {
        btnCopyCipher.addEventListener('click', () => {
            navigator.clipboard.writeText(ciphertextOutput.value).then(() => {
                const orig = btnCopyCipher.textContent;
                btnCopyCipher.textContent = 'Copied to Clipboard!';
                setTimeout(() => btnCopyCipher.textContent = orig, 2000);
            });
        });
    }

    if (btnDownloadVault) {
        btnDownloadVault.addEventListener('click', () => {
            if (!lastEncryptedPayload) return;
            const blob = new Blob([JSON.stringify(lastEncryptedPayload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `auravault-secret-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    if (btnSendDecrypt) {
        btnSendDecrypt.addEventListener('click', () => {
            const cipherIn = document.getElementById('ciphertext-input');
            if (cipherIn) {
                cipherIn.value = ciphertextOutput.value;
                document.getElementById('tab-decrypt').click();
            }
        });
    }

    // Decrypt Handler
    const btnDecrypt = document.getElementById('btn-decrypt');
    const ciphertextInput = document.getElementById('ciphertext-input');
    const decPassInput = document.getElementById('decrypt-passphrase');
    const plaintextOutput = document.getElementById('plaintext-output');
    const btnCopyPlain = document.getElementById('btn-copy-plain');
    const btnClearDecrypted = document.getElementById('btn-clear-decrypted');

    if (btnDecrypt) {
        btnDecrypt.addEventListener('click', async () => {
            const rawCipher = ciphertextInput.value.trim();
            const passphrase = decPassInput.value;

            if (!rawCipher) {
                alert('Please provide an encrypted payload or JSON envelope.');
                return;
            }
            if (!passphrase) {
                alert('Please enter the decryption passphrase.');
                return;
            }

            try {
                let payload;
                try {
                    payload = JSON.parse(rawCipher);
                } catch (e) {
                    throw new Error('Invalid JSON envelope format.');
                }

                if (!payload.salt || !payload.iv || !payload.data) {
                    throw new Error('Malformed vault payload missing cryptographic vectors.');
                }

                const salt = new Uint8Array(payload.salt);
                const iv = new Uint8Array(payload.iv);
                const data = new Uint8Array(payload.data);

                const key = await deriveKey(passphrase, salt, ['decrypt']);
                const decryptedBuffer = await window.subtle.decrypt(
                    { name: 'AES-GCM', iv: iv },
                    key,
                    data
                );

                const dec = new TextDecoder();
                const jsonStr = dec.decode(decryptedBuffer);
                const secretObj = JSON.parse(jsonStr);

                // Check expiration / burns
                if (secretObj.expiryHours && secretObj.expiryHours > 0 && secretObj.created) {
                    const hoursElapsed = (Date.now() - secretObj.created) / (1000 * 60 * 60);
                    if (hoursElapsed > secretObj.expiryHours) {
                        throw new Error('This secret package has expired and self-destructed.');
                    }
                }

                plaintextOutput.value = secretObj.content;
                btnCopyPlain.disabled = false;
                btnClearDecrypted.disabled = false;

                btnDecrypt.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Decrypted Successfully`;
                setTimeout(() => {
                    btnDecrypt.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a 5 5 0 0 1 9.9-1"></path><circle cx="12" cy="16" r="1"></circle></svg> Decrypt & Reveal`;
                }, 2000);

            } catch (err) {
                console.error(err);
                alert('Decryption failed: Incorrect passphrase or corrupted package.');
                plaintextOutput.value = '';
            }
        });
    }

    if (btnCopyPlain) {
        btnCopyPlain.addEventListener('click', () => {
            navigator.clipboard.writeText(plaintextOutput.value).then(() => {
                const orig = btnCopyPlain.textContent;
                btnCopyPlain.textContent = 'Copied Plaintext!';
                setTimeout(() => btnCopyPlain.textContent = orig, 2000);
            });
        });
    }

    if (btnClearDecrypted) {
        btnClearDecrypted.addEventListener('click', () => {
            plaintextOutput.value = '';
            decPassInput.value = '';
            btnCopyPlain.disabled = true;
            btnClearDecrypted.disabled = true;
        });
    }

    // File Drop Zone Handler
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('vault-file-input');

    if (dropZone && fileInput) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                handleVaultFile(e.dataTransfer.files[0]);
            }
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleVaultFile(e.target.files[0]);
            }
        });
    }

    function handleVaultFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            ciphertextInput.value = e.target.result;
        };
        reader.readAsText(file);
    }

    // Passphrase Generator Lab
    const wordList = [
        "apple", "anchor", "bandit", "bamboo", "castle", "canyon", "delta", "design", "eagle", "ember",
        "falcon", "forest", "galaxy", "glacier", "harbor", "haven", "indigo", "island", "jungle", "jasper",
        "kinetic", "kiosk", "lagoon", "lantern", "matrix", "marble", "nebula", "nomad", "oasis", "orbit",
        "prism", "pulsar", "quartz", "quasar", "rhythm", "ripple", "saffron", "summit", "tundra", "topaz",
        "umbrella", "urban", "vector", "vortex", "walnut", "whisper", "xenon", "zephyr", "zenith", "beacon"
    ];

    const genMode = document.getElementById('gen-mode');
    const groupWordCount = document.getElementById('group-word-count');
    const groupCharLength = document.getElementById('group-char-length');
    const groupSymbols = document.getElementById('group-symbols');
    const wordCountRange = document.getElementById('word-count');
    const wordCountVal = document.getElementById('word-count-val');
    const charLengthRange = document.getElementById('char-length');
    const charLengthVal = document.getElementById('char-length-val');
    const generatedPassOutput = document.getElementById('generated-pass-output');
    const btnRegenerate = document.getElementById('btn-regenerate');
    const btnCopyGen = document.getElementById('btn-copy-gen');
    const genEntropyVal = document.getElementById('gen-entropy-val');
    const genCrackVal = document.getElementById('gen-crack-val');
    const chkUpper = document.getElementById('chk-upper');
    const chkNums = document.getElementById('chk-nums');
    const chkSymbols = document.getElementById('chk-symbols');

    if (genMode) {
        genMode.addEventListener('change', () => {
            if (genMode.value === 'diceware') {
                groupWordCount.style.display = 'flex';
                groupCharLength.style.display = 'none';
                groupSymbols.style.display = 'none';
            } else {
                groupWordCount.style.display = 'none';
                groupCharLength.style.display = 'flex';
                groupSymbols.style.display = 'flex';
            }
            generatePassphrase();
        });
    }

    if (wordCountRange) {
        wordCountRange.addEventListener('input', () => {
            wordCountVal.textContent = wordCountRange.value;
            generatePassphrase();
        });
    }

    if (charLengthRange) {
        charLengthRange.addEventListener('input', () => {
            charLengthVal.textContent = charLengthRange.value;
            generatePassphrase();
        });
    }

    if (chkUpper) chkUpper.addEventListener('change', generatePassphrase);
    if (chkNums) chkNums.addEventListener('change', generatePassphrase);
    if (chkSymbols) chkSymbols.addEventListener('change', generatePassphrase);

    function generatePassphrase() {
        if (!generatedPassOutput) return;
        let pass = '';

        if (genMode.value === 'diceware') {
            const count = parseInt(wordCountRange.value, 10);
            const words = [];
            const randomValues = window.crypto.getRandomValues(new Uint32Array(count));
            for (let i = 0; i < count; i++) {
                const index = randomValues[i] % wordList.length;
                words.push(wordList[index]);
            }
            pass = words.join('-');
        } else {
            const length = parseInt(charLengthRange.value, 10);
            let chars = 'abcdefghijklmnopqrstuvwxyz';
            if (chkUpper.checked) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            if (chkNums.checked) chars += '0123456789';
            if (chkSymbols.checked) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

            const randomValues = window.crypto.getRandomValues(new Uint8Array(length));
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars[randomValues[i] % chars.length];
            }
            pass = result;
        }

        generatedPassOutput.value = pass;

        // Compute entropy & crack estimate
        const entropy = calculateEntropy(pass);
        genEntropyVal.textContent = `${entropy} bits`;

        // Brute force estimate at 100 billion guesses/sec
        const guesses = Math.pow(2, entropy);
        const seconds = guesses / 100000000000;
        let timeStr = '';
        if (seconds < 1) timeStr = 'Instant';
        else if (seconds < 60) timeStr = `${Math.round(seconds)} seconds`;
        else if (seconds < 3600) timeStr = `${Math.round(seconds / 60)} minutes`;
        else if (seconds < 86400) timeStr = `${Math.round(seconds / 3600)} hours`;
        else if (seconds < 31536000) timeStr = `${Math.round(seconds / 86400)} days`;
        else if (seconds < 31536000 * 1000) timeStr = `${Math.round(seconds / 31536000)} years`;
        else timeStr = 'Centuries+';

        genCrackVal.textContent = timeStr;
    }

    if (btnRegenerate) {
        btnRegenerate.addEventListener('click', generatePassphrase);
    }

    if (btnCopyGen) {
        btnCopyGen.addEventListener('click', () => {
            navigator.clipboard.writeText(generatedPassOutput.value).then(() => {
                const orig = btnCopyGen.textContent;
                btnCopyGen.textContent = 'Copied Passphrase!';
                setTimeout(() => btnCopyGen.textContent = orig, 2000);
            });
        });
    }

    // Initial generation
    generatePassphrase();
});
