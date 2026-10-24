// AuraVault Password Inspector & Passphrase Generator Logic

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const passwordInput = document.getElementById('password-input');
    const toggleVisibilityBtn = document.getElementById('toggle-visibility-btn');
    const eyeIcon = document.getElementById('eye-icon');
    const generateSampleBtn = document.getElementById('generate-sample-btn');
    const clearInputBtn = document.getElementById('clear-input-btn');
    
    const ratingText = document.getElementById('rating-text');
    const strengthProgress = document.getElementById('strength-progress');
    const metricEntropy = document.getElementById('metric-entropy');
    const metricLength = document.getElementById('metric-length');
    const metricPool = document.getElementById('metric-pool');
    
    const crackOnline = document.getElementById('crack-online');
    const crackGpu = document.getElementById('crack-gpu');
    const crackCluster = document.getElementById('crack-cluster');
    
    const auditCheckList = document.getElementById('audit-check-list');
    
    // Passphrase Generator Elements
    const passphraseOutput = document.getElementById('passphrase-output');
    const copyPassphraseBtn = document.getElementById('copy-passphrase-btn');
    const wordCountSlider = document.getElementById('word-count-slider');
    const wordCountVal = document.getElementById('word-count-val');
    const genCapitalize = document.getElementById('gen-capitalize');
    const genNumber = document.getElementById('gen-number');
    const genSymbol = document.getElementById('gen-symbol');
    const separatorSelect = document.getElementById('separator-select');
    const generatePassphraseBtn = document.getElementById('generate-passphrase-btn');
    
    // History Elements
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history-btn');

    // Diceware Wordlist (Compact curated list of unambiguous words)
    const wordlist = [
        "apple", "orbit", "river", "beacon", "cluster", "falcon", "shadow", "velocity",
        "nebula", "crystal", "matrix", "quantum", "zenith", "horizon", "breeze", "canyon",
        "ember", "frost", "glacier", "harbor", "island", "jungle", "kinetic", "lunar",
        "marble", "nomad", "oasis", "prism", "quartz", "radar", "stellar", "tulip",
        "urban", "vortex", "willow", "xenon", "yacht", "zephyr", "amber", "bronze",
        "copper", "delta", "echo", "fusion", "granite", "helix", "iris", "jade",
        "karma", "lotus", "magnet", "neon", "opal", "pulse", "quasar", "resonance",
        "saffron", "titan", "umbra", "vector", "walnut", "ypsilon", "zodiac", "alpine",
        "banyan", "citadel", "dynasty", "eclipse", "flint", "galaxy", "haven", "ignite"
    ];

    const commonDictionary = [
        "password", "123456", "12345678", "123456789", "qwerty", "abc123", "monkey", 
        "master", "dragon", "baseball", "football", "access", "shadow", "trust",
        "welcome", "admin", "letmein", "sunshine", "princess", "football"
    ];

    const keyboardWalks = [
        "qwertyuiop", "asdfghjkl", "zxcvbnm", "1234567890", 
        "qazwsx", "edcrfv", "tgbyhn", "ujmikol", "1q2w3e"
    ];

    let historyData = [];

    // Toggle Password Visibility
    if (toggleVisibilityBtn && passwordInput) {
        toggleVisibilityBtn.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            if (type === 'text') {
                eyeIcon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`;
            } else {
                eyeIcon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
            }
        });
    }

    // Input Event Listener for Password Analysis
    if (passwordInput) {
        passwordInput.addEventListener('input', () => {
            analyzePassword(passwordInput.value);
        });
    }

    // Sample Generator Button
    if (generateSampleBtn && passwordInput) {
        generateSampleBtn.addEventListener('click', () => {
            const samples = [
                'Tr0ub4d0r&9!',
                'Correct-Horse-Battery-Staple-2024',
                'xK#9vL$mP2qR!',
                'password123',
                'stellar_vortex_77#'
            ];
            const randomSample = samples[Math.floor(Math.random() * samples.length)];
            passwordInput.value = randomSample;
            analyzePassword(randomSample);
        });
    }

    if (clearInputBtn && passwordInput) {
        clearInputBtn.addEventListener('click', () => {
            passwordInput.value = '';
            analyzePassword('');
        });
    }

    // Core Password Analysis Function
    function analyzePassword(pwd) {
        if (!pwd) {
            resetInspector();
            return;
        }

        const length = pwd.length;
        let poolSize = 0;
        let hasLower = /[a-z]/.test(pwd);
        let hasUpper = /[A-Z]/.test(pwd);
        let hasDigit = /[0-9]/.test(pwd);
        let hasSymbol = /[^a-zA-Z0-9]/.test(pwd);

        if (hasLower) poolSize += 26;
        if (hasUpper) poolSize += 26;
        if (hasDigit) poolSize += 10;
        if (hasSymbol) poolSize += 33;

        // Calculate Entropy: E = L * log2(R)
        let entropy = 0;
        if (poolSize > 0 && length > 0) {
            entropy = length * Math.log2(poolSize);
        }

        // Update metrics
        metricLength.textContent = `${length} chars`;
        metricPool.textContent = `${poolSize} chars`;
        metricEntropy.textContent = `${entropy.toFixed(1)} bits`;

        // Brute force calculations
        // Combinations = 2^entropy
        updateCrackTimes(entropy);

        // Check vulnerabilities
        const checks = performSecurityAudits(pwd);
        renderAuditChecks(checks);

        // Overall Rating
        updateRatingDisplay(entropy, checks);

        // Add to history if unique or significant length
        if (length >= 6) {
            addToHistory(pwd, entropy);
        }
    }

    function resetInspector() {
        ratingText.textContent = 'Awaiting Input';
        ratingText.style.color = 'var(--text-primary)';
        strengthProgress.style.width = '0%';
        strengthProgress.style.backgroundColor = 'var(--border-color)';
        metricEntropy.textContent = '0 bits';
        metricLength.textContent = '0 chars';
        metricPool.textContent = '0';
        crackOnline.textContent = '-';
        crackGpu.textContent = '-';
        crackCluster.textContent = '-';
        
        const items = auditCheckList.querySelectorAll('.check-item');
        items.forEach(item => {
            item.className = 'check-item pending';
            item.querySelector('.check-icon').textContent = '•';
        });
    }

    function updateCrackTimes(entropy) {
        if (entropy <= 0) {
            crackOnline.textContent = '-';
            crackGpu.textContent = '-';
            crackCluster.textContent = '-';
            return;
        }

        // Total combinations = 2^entropy
        // We calculate seconds = 2^entropy / guessesPerSecond
        // For display, we use log scale approximation or direct seconds
        const secondsOnline = Math.pow(2, entropy) / 100;
        const secondsGpu = Math.pow(2, entropy) / 10000000000;
        const secondsCluster = Math.pow(2, entropy) / 1000000000000;

        crackOnline.textContent = formatTime(secondsOnline);
        crackGpu.textContent = formatTime(secondsGpu);
        crackCluster.textContent = formatTime(secondsCluster);
    }

    function formatTime(seconds) {
        if (seconds < 1) return 'Instant';
        if (seconds < 60) return `${Math.round(seconds)} seconds`;
        if (seconds < 3600) return `${(seconds / 60).toFixed(1)} minutes`;
        if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} hours`;
        if (seconds < 31536000) return `${(seconds / 86400).toFixed(1)} days`;
        if (seconds < 31536000 * 1000) return `${(seconds / 31536000).toFixed(1)} years`;
        if (seconds < 31536000 * 1000000) return `${(seconds / 31536000 / 1000).toFixed(1)} thousand years`;
        if (seconds < 31536000 * 1e9) return `${(seconds / 31536000 / 1000000).toFixed(1)} million years`;
        return 'Centuries+';
    }

    function performSecurityAudits(pwd) {
        const lowerPwd = pwd.toLowerCase();

        const minLength = pwd.length >= 12;
        const hasMixedCase = /[a-z]/.test(pwd) && /[A-Z]/.test(pwd);
        const hasNumSym = /[0-9]/.test(pwd) && /[^a-zA-Z0-9]/.test(pwd);
        
        let noDict = true;
        for (let word of commonDictionary) {
            if (lowerPwd.includes(word)) {
                noDict = false;
                break;
            }
        }

        let noWalk = true;
        for (let walk of keyboardWalks) {
            if (lowerPwd.includes(walk)) {
                noWalk = false;
                break;
            }
        }

        let noRepeat = true;
        // Check 3+ repeating characters or repeating subsegments
        if (/(.)\1{2,}/.test(pwd)) {
            noRepeat = false;
        }

        return {
            minLength,
            hasMixedCase,
            hasNumSym,
            noDict,
            noWalk,
            noRepeat
        };
    }

    function renderAuditChecks(checks) {
        const items = auditCheckList.querySelectorAll('.check-item');
        const keys = ['minLength', 'hasMixedCase', 'hasNumSym', 'noDict', 'noWalk', 'noRepeat'];
        
        items.forEach((item, index) => {
            const key = keys[index];
            const passed = checks[key];
            item.className = `check-item ${passed ? 'pass' : 'fail'}`;
            item.querySelector('.check-icon').textContent = passed ? '✓' : '✕';
        });
    }

    function updateRatingDisplay(entropy, checks) {
        let score = 0;
        if (checks.minLength) score += 20;
        if (checks.hasMixedCase) score += 15;
        if (checks.hasNumSym) score += 15;
        if (checks.noDict) score += 20;
        if (checks.noWalk) score += 15;
        if (checks.noRepeat) score += 15;

        let label = 'Very Weak';
        let color = 'var(--danger-color)';
        let width = Math.min(score, 100);

        if (entropy >= 80 && score >= 80) {
            label = 'Exceptional';
            color = 'var(--success-color)';
        } else if (entropy >= 60 && score >= 60) {
            label = 'Strong';
            color = '#34d399';
        } else if (entropy >= 40 && score >= 40) {
            label = 'Moderate';
            color = 'var(--warning-color)';
        } else if (entropy >= 25) {
            label = 'Weak';
            color = '#fb923c';
        }

        ratingText.textContent = label;
        ratingText.style.color = color;
        strengthProgress.style.width = `${width}%`;
        strengthProgress.style.backgroundColor = color;
    }

    // Passphrase Generator Logic
    if (wordCountSlider && wordCountVal) {
        wordCountSlider.addEventListener('input', () => {
            wordCountVal.textContent = wordCountSlider.value;
        });
    }

    function generatePassphrase() {
        const count = parseInt(wordCountSlider.value) || 4;
        const separator = separatorSelect.value;
        const capitalize = genCapitalize.checked;
        const addNum = genNumber.checked;
        const addSym = genSymbol.checked;

        let selectedWords = [];
        for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * wordlist.length);
            let word = wordlist[randomIndex];
            if (capitalize) {
                word = word.charAt(0).toUpperCase() + word.slice(1);
            }
            selectedWords.push(word);
        }

        let result = selectedWords.join(separator);

        if (addNum) {
            const randomNum = Math.floor(Math.random() * 90) + 10;
            result += separator + randomNum;
        }

        if (addSym) {
            const symbols = ['!', '@', '#', '$', '%', '&', '*'];
            const randomSym = symbols[Math.floor(Math.random() * symbols.length)];
            result += randomSym;
        }

        passphraseOutput.value = result;
        
        // Automatically test generated passphrase in inspector!
        if (passwordInput) {
            passwordInput.value = result;
            analyzePassword(result);
        }
    }

    if (generatePassphraseBtn) {
        generatePassphraseBtn.addEventListener('click', generatePassphrase);
    }

    // Generate initial passphrase on load
    generatePassphrase();

    // Copy Passphrase Button
    if (copyPassphraseBtn && passphraseOutput) {
        copyPassphraseBtn.addEventListener('click', () => {
            if (!passphraseOutput.value) return;
            navigator.clipboard.writeText(passphraseOutput.value).then(() => {
                const originalText = copyPassphraseBtn.innerHTML;
                copyPassphraseBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;
                setTimeout(() => {
                    copyPassphraseBtn.innerHTML = originalText;
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        });
    }

    // Local History Management
    function addToHistory(pwd, entropy) {
        // Mask password for display in ledger (e.g., first 2 chars + ...)
        const masked = pwd.length > 4 ? pwd.substring(0, 2) + '••••' + pwd.substring(pwd.length - 2) : '••••••';
        
        // Avoid duplicate consecutive entries
        if (historyData.length > 0 && historyData[0].raw === pwd) return;

        historyData.unshift({
            raw: pwd,
            masked: masked,
            entropy: entropy.toFixed(1),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        });

        if (historyData.length > 15) {
            historyData.pop();
        }

        renderHistory();
    }

    function renderHistory() {
        if (!historyList) return;

        if (historyData.length === 0) {
            historyList.innerHTML = `<div class="history-empty">No passwords tested in this session yet.</div>`;
            return;
        }

        let html = '';
        historyData.forEach(item => {
            html += `
                <div class="history-item">
                    <span class="history-pwd">${item.masked}</span>
                    <div class="history-meta">
                        <span>${item.entropy} bits</span>
                        <span style="color: var(--text-secondary);">${item.time}</span>
                    </div>
                </div>
            `;
        });
        historyList.innerHTML = html;
    }

    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            historyData = [];
            renderHistory();
        });
    }
});
