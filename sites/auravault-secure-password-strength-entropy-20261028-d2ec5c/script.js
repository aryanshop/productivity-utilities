document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('password-input');
    const toggleVisibilityBtn = document.getElementById('toggle-visibility');
    const eyeIcon = document.getElementById('eye-icon');
    
    const strengthLabelText = document.getElementById('strength-label-text');
    const entropyBitsText = document.getElementById('entropy-bits-text');
    const meterFill = document.getElementById('meter-fill');
    
    const timeCpu = document.getElementById('time-cpu');
    const timeGpu = document.getElementById('time-gpu');
    const timeCluster = document.getElementById('time-cluster');
    const timeState = document.getElementById('time-state');
    
    const diagnosticsList = document.getElementById('diagnostics-list');
    
    const genType = document.getElementById('gen-type');
    const wordCountRow = document.getElementById('word-count-row');
    const charLengthRow = document.getElementById('char-length-row');
    const wordCountRange = document.getElementById('word-count');
    const wordCountVal = document.getElementById('word-count-val');
    const charLengthRange = document.getElementById('char-length');
    const charLengthVal = document.getElementById('char-length-val');
    const genSymbols = document.getElementById('gen-symbols');
    const genNumbers = document.getElementById('gen-numbers');
    const genUppercase = document.getElementById('gen-uppercase');
    const generateBtn = document.getElementById('generate-btn');
    const copyBtn = document.getElementById('copy-btn');
    const copyNotification = document.getElementById('copy-notification');

    // Diceware wordlist sample for realistic secure passphrases
    const dicewareWords = [
        "apple", "anchor", "autumn", "badge", "bandit", "banjo", "beacon", "blanket", 
        "blossom", "breeze", "cactus", "canyon", "cascade", "castle", "cedar", "circle", 
        "clover", "comet", "compass", "crystal", "cypress", "dawn", "delta", "diamond", 
        "dolphin", "drift", "eagle", "eclipse", "emerald", "engine", "falcon", "feather", 
        "fern", "forest", "galaxy", "glacier", "glen", "granite", "grove", "harbor", 
        "horizon", "island", "jade", "jasmine", "journey", "jungle", "lagoon", "lantern", 
        "laurel", "meadow", "melody", "mercury", "midnight", "mirage", "monarch", "nebula", 
        "oasis", "ocean", "orchid", "palms", "pebble", "phoenix", "pine", "planet", 
        "plasma", "prism", "pulse", "quartz", "quasar", "radiant", "raven", "reef", 
        "ripple", "river", "ruby", "sapphire", "scout", "shadow", "sierra", "solstice", 
        "spruce", "star", "stream", "summit", "sunrise", "sunset", "tempest", "thunder", 
        "tide", "timber", "torrent", "tundra", "valley", "vortex", "wave", "whisper", 
        "Willow", "winter", "zenith", "zephyr"
    ];

    // Toggle password visibility
    let isVisible = false;
    toggleVisibilityBtn.addEventListener('click', () => {
        isVisible = !isVisible;
        passwordInput.type = isVisible ? 'text' : 'password';
        if (isVisible) {
            eyeIcon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
        } else {
            eyeIcon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
        }
    });

    // Generator type UI switch
    genType.addEventListener('change', () => {
        if (genType.value === 'passphrase') {
            wordCountRow.style.display = 'flex';
            charLengthRow.style.display = 'none';
        } else {
            wordCountRow.style.display = 'none';
            charLengthRow.style.display = 'flex';
        }
    });

    wordCountRange.addEventListener('input', () => {
        wordCountVal.textContent = wordCountRange.value;
    });

    charLengthRange.addEventListener('input', () => {
        charLengthVal.textContent = charLengthRange.value;
    });

    // Cryptographically secure password / passphrase generation
    function generatePassword() {
        if (genType.value === 'passphrase') {
            const count = parseInt(wordCountRange.value, 10);
            const selectedWords = [];
            const array = new Uint32Array(count);
            window.crypto.getRandomValues(array);
            for (let i = 0; i < count; i++) {
                const index = array[i] % dicewareWords.length;
                let word = dicewareWords[index];
                if (genUppercase.checked && i === 0) {
                    word = word.charAt(0).toUpperCase() + word.slice(1);
                }
                selectedWords.push(word);
            }
            let passphrase = selectedWords.join('-');
            if (genNumbers.checked) {
                const numArr = new Uint8Array(1);
                window.crypto.getRandomValues(numArr);
                passphrase += (numArr[0] % 90 + 10);
            }
            if (genSymbols.checked) {
                const syms = '!@#$%^&*';
                const symArr = new Uint8Array(1);
                window.crypto.getRandomValues(symArr);
                passphrase += syms[symArr[0] % syms.length];
            }
            passwordInput.value = passphrase;
        } else {
            const length = parseInt(charLengthRange.value, 10);
            let chars = 'abcdefghijklmnopqrstuvwxyz';
            if (genUppercase.checked) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            if (genNumbers.checked) chars += '0123456789';
            if (genSymbols.checked) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
            
            const array = new Uint8Array(length);
            window.crypto.getRandomValues(array);
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars[array[i] % chars.length];
            }
            passwordInput.value = result;
        }
        analyzePassword(passwordInput.value);
    }

    generateBtn.addEventListener('click', generatePassword);

    // Copy button
    copyBtn.addEventListener('click', () => {
        if (!passwordInput.value) return;
        navigator.clipboard.writeText(passwordInput.value).then(() => {
            copyNotification.style.display = 'block';
            setTimeout(() => {
                copyNotification.style.display = 'none';
            }, 2000);
        });
    });

    passwordInput.addEventListener('input', (e) => {
        analyzePassword(e.target.value);
    });

    // Core Analysis Engine
    function analyzePassword(pwd) {
        if (!pwd) {
            strengthLabelText.textContent = 'Rating: Empty';
            entropyBitsText.textContent = '0 bits';
            meterFill.style.width = '0%';
            meterFill.style.backgroundColor = 'var(--border-color)';
            timeCpu.textContent = 'Instant';
            timeGpu.textContent = 'Instant';
            timeCluster.textContent = 'Instant';
            timeState.textContent = 'Instant';
            diagnosticsList.innerHTML = '<li class="diag-item neutral">Enter a password to begin diagnostics.</li>';
            return;
        }

        // Calculate character space size (pool size)
        let poolSize = 0;
        let hasLower = /[a-z]/.test(pwd);
        let hasUpper = /[A-Z]/.test(pwd);
        let hasNum = /[0-9]/.test(pwd);
        let hasSym = /[^a-zA-Z0-9]/.test(pwd);

        if (hasLower) poolSize += 26;
        if (hasUpper) poolSize += 26;
        if (hasNum) poolSize += 10;
        if (hasSym) poolSize += 32;

        // Calculate Shannon / combinatorial entropy
        // E = L * log2(R)
        const length = pwd.length;
        let entropy = poolSize > 0 ? length * Math.log2(poolSize) : 0;

        // Penalties for patterns
        let penalties = [];
        
        // Repetition check
        if (/(.)\1{2,}/.test(pwd)) {
            entropy *= 0.85;
            penalties.push({ pass: false, text: 'Contains repeating consecutive characters.' });
        } else {
            penalties.push({ pass: true, text: 'No excessive consecutive character repetition.' });
        }

        // Sequential check (e.g. 1234, abcd)
        const sequences = ['abcdefghijklmnopqrstuvwxyz', '0123456789', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
        let hasSeq = false;
        const lowerPwd = pwd.toLowerCase();
        for (let seq of sequences) {
            for (let i = 0; i < seq.length - 3; i++) {
                const sub = seq.substr(i, 4);
                if (lowerPwd.includes(sub)) {
                    hasSeq = true;
                    break;
                }
            }
            if (hasSeq) break;
        }

        if (hasSeq) {
            entropy *= 0.8;
            penalties.push({ pass: false, text: 'Contains standard keyboard walks or sequences.' });
        } else {
            penalties.push({ pass: true, text: 'Free of common keyboard walks or numeric sequences.' });
        }

        entropy = Math.max(0, Math.round(entropy * 10) / 10);

        // Strength categorization
        let rating = 'Very Weak';
        let color = 'var(--danger)';
        let widthPct = 10;

        if (entropy >= 120) {
            rating = 'Military-Grade';
            color = 'var(--success)';
            widthPct = 100;
        } else if (entropy >= 80) {
            rating = 'Strong';
            color = '#10b981';
            widthPct = 75;
        } else if (entropy >= 60) {
            rating = 'Moderate';
            color = 'var(--warning)';
            widthPct = 50;
        } else if (entropy >= 35) {
            rating = 'Weak';
            color = '#f97316';
            widthPct = 25;
        }

        strengthLabelText.textContent = `Rating: ${rating}`;
        entropyBitsText.textContent = `${entropy} bits`;
        meterFill.style.width = `${widthPct}%`;
        meterFill.style.backgroundColor = color;

        // Brute force estimates
        // Total combinations = 2^entropy
        // Speeds: CPU = 1e10, GPU = 1e11, Cluster = 1e12, State = 1e14 hashes/sec
        const combinations = Math.pow(2, entropy);
        timeCpu.textContent = formatCrackTime(combinations / 1e10);
        timeGpu.textContent = formatCrackTime(combinations / 1e11);
        timeCluster.textContent = formatCrackTime(combinations / 1e12);
        timeState.textContent = formatCrackTime(combinations / 1e14);

        // NIST compliance checks
        let nistChecks = [
            {
                pass: length >= 8,
                text: `Minimum length of 8 characters (${length}/8+ checked).`
            },
            {
                pass: length >= 12,
                text: `Recommended NIST length of 12+ characters (${length}/12+ checked).`
            },
            {
                pass: !isCommonDictionaryWord(lowerPwd),
                text: 'Not found in common weak passphrase dictionaries.'
            }
        ];

        let allChecks = [...nistChecks, ...penalties];
        diagnosticsList.innerHTML = '';
        allChecks.forEach(check => {
            const li = document.createElement('li');
            li.className = `diag-item ${check.pass ? 'pass' : 'fail'}`;
            li.innerHTML = `
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    ${check.pass ? '<polyline points="20 6 9 17 4 12"></polyline>' : '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>'}
                </svg>
                <span>${check.text}</span>
            `;
            diagnosticsList.appendChild(li);
        });
    }

    function isCommonDictionaryWord(pwd) {
        const commons = ['password', '123456', 'qwerty', 'admin', 'welcome', 'letmein', 'monkey', 'dragon', 'master', 'football'];
        return commons.includes(pwd);
    }

    function formatCrackTime(seconds) {
        if (seconds < 0.000001) return 'Instant';
        if (seconds < 1) return 'Less than a second';
        
        const minute = 60;
        const hour = minute * 60;
        const day = hour * 24;
        const year = day * 365.25;
        const century = year * 100;
        const millennium = century * 10;
        const millionYears = millennium * 1000;
        const billionYears = millionYears * 1000;
        const universeAge = 13.8e9 * year;

        if (seconds > universeAge * 1000) return 'Centuries beyond universe lifespan';
        if (seconds >= billionYears) return (seconds / billionYears).toFixed(1) + ' Billion Years';
        if (seconds >= millionYears) return (seconds / millionYears).toFixed(1) + ' Million Years';
        if (seconds >= century) return (seconds / century).toFixed(1) + ' Centuries';
        if (seconds >= year) return (seconds / year).toFixed(1) + ' Years';
        if (seconds >= day) return (seconds / day).toFixed(1) + ' Days';
        if (seconds >= hour) return (seconds / hour).toFixed(1) + ' Hours';
        if (seconds >= minute) return (seconds / minute).toFixed(1) + ' Minutes';
        return Math.round(seconds) + ' Seconds';
    });
</script>
