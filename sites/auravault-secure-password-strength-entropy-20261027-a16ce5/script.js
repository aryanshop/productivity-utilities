document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('password-input');
    const toggleVisibilityBtn = document.getElementById('toggle-visibility');
    const eyeIcon = document.getElementById('eye-icon');
    const strengthLabelText = document.getElementById('strength-label-text');
    const entropyBitsText = document.getElementById('entropy-bits-text');
    const strengthBar = document.getElementById('strength-bar');

    const metricCharset = document.getElementById('metric-charset');
    const metricShannon = document.getElementById('metric-shannon');

    const crackCpu = document.getElementById('crack-cpu');
    const crackGpu = document.getElementById('crack-gpu');
    const crackCluster = document.getElementById('crack-cluster');
    const crackQuantum = document.getElementById('crack-quantum');

    const nistLength = document.getElementById('nist-length');
    const nistNoRepeat = document.getElementById('nist-no-repeat');
    const nistNoDict = document.getElementById('nist-no-dict');
    const nistEntropy = document.getElementById('nist-entropy');

    const vulnContainer = document.getElementById('vuln-container');

    // Generator Elements
    const tabBtns = document.querySelectorAll('.tab-btn');
    const passphraseOptions = document.getElementById('passphrase-options');
    const randomOptions = document.getElementById('random-options');
    const generateBtn = document.getElementById('generate-btn');

    const wordCountSlider = document.getElementById('word-count');
    const wordCountVal = document.getElementById('word-count-val');
    const capWordCheck = document.getElementById('cap-word');
    const numWordCheck = document.getElementById('num-word');

    const charLengthSlider = document.getElementById('char-length');
    const charLengthVal = document.getElementById('char-length-val');
    const incUpper = document.getElementById('inc-upper');
    const incLower = document.getElementById('inc-lower');
    const incNums = document.getElementById('inc-nums');
    const incSyms = document.getElementById('inc-syms');

    let generatorMode = 'passphrase';

    // Diceware wordlist sample for realistic secure passphrases
    const dicewareWords = [
        "apple", "anchor", "autumn", "badge", "bandit", "banjo", "beacon", "blanket", 
        "blossom", "breeze", "bubble", "cactus", "canyon", "castle", "cedar", "cider", 
        "cloud", "cluster", "comet", "compass", "coral", "cortex", "cosmos", "crater", 
        "crystal", "cuckoo", "cyclone", "dagger", "daisy", "delta", "denim", "desert", 
        "diamond", "digital", "dolphin", "drift", "dynamo", "eclipse", "emerald", "engine", 
        "falcon", "feather", "fern", "fiddle", "flint", "forest", "fossil", "galaxy", 
        "glacier", "glover", "granite", "gravity", "harbor", "hazel", "helium", "horizon", 
        "humming", "iceberg", "indigo", "island", "jungle", "kinetic", "lagoon", "lantern", 
        "lavender", "lichen", "magnet", "marble", "meadow", "meteor", "mirage", "monsoon", 
        "mosaic", "nebula", "nomad", "oasis", "obsidian", "octagon", "opal", "orbit", 
        "orchid", "osprey", "pacific", "palms", "papaya", "pebble", "phantom", "phoenix", 
        "planet", "plasma", "plateau", "prism", "pulse", "quantum", "quartz", "quasar", 
        "rabbit", "radian", "raptor", "raven", "reef", "ripple", "river", "roam", 
        "rocket", "ruby", "runic", "saffron", "satellite", "savannah", "scout", "seismic", 
        "shadow", "sierra", "silicon", "silver", "sirius", "solstice", "sonata", "spark", 
        "spruce", "stellar", "storm", "summit", "sunburst", "sylvan", "talon", "tango", 
        "tempest", "thermal", "thorn", "thunder", "topaz", "torrent", "totem", "trident", 
        "tundra", "typhoon", "valiant", "vanguard", "vector", "velvet", "vortex", "walnut", 
        "wander", "whisper", "Willow", "winter", "wizard", "zephyr", "zinc", "zodiac"
    ];

    // Toggle password visibility
    if (toggleVisibilityBtn) {
        toggleVisibilityBtn.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            eyeIcon.innerHTML = isPassword 
                ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>'
                : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
        });
    }

    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            generatorMode = btn.getAttribute('data-mode');
            if (generatorMode === 'passphrase') {
                passphraseOptions.classList.remove('hidden');
                randomOptions.classList.add('hidden');
            } else {
                passphraseOptions.classList.add('hidden');
                randomOptions.classList.remove('hidden');
            }
        });
    });

    wordCountSlider.addEventListener('input', (e) => {
        wordCountVal.textContent = e.target.value;
    });

    charLengthSlider.addEventListener('input', (e) => {
        charLengthVal.textContent = e.target.value;
    });

    // Generate Secure Secret
    generateBtn.addEventListener('click', () => {
        let secret = '';
        if (generatorMode === 'passphrase') {
            const count = parseInt(wordCountSlider.value);
            let words = [];
            for (let i = 0; i < count; i++) {
                const randomIndex = Math.floor(Math.random() * dicewareWords.length);
                let word = dicewareWords[randomIndex];
                if (capWordCheck.checked) {
                    word = word.charAt(0).toUpperCase() + word.slice(1);
                }
                words.push(word);
            }
            secret = words.join('-');
            if (numWordCheck.checked) {
                const randNum = Math.floor(Math.random() * 90) + 10;
                secret += '-' + randNum;
            }
        } else {
            const length = parseInt(charLengthSlider.value);
            let charset = '';
            if (incUpper.checked) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            if (incLower.checked) charset += 'abcdefghijklmnopqrstuvwxyz';
            if (incNums.checked) charset += '0123456789';
            if (incSyms.checked) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

            if (charset === '') {
                charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            }

            const array = new Uint32Array(length);
            window.crypto.getRandomValues(array);
            for (let i = 0; i < length; i++) {
                secret += charset[array[i] % charset.length];
            }
        }

        passwordInput.value = secret;
        analyzePassword(secret);
    });

    passwordInput.addEventListener('input', (e) => {
        analyzePassword(e.target.value);
    });

    function analyzePassword(pwd) {
        if (!pwd) {
            strengthLabelText.innerHTML = 'Strength: <strong>Empty</strong>';
            entropyBitsText.textContent = '0 bits';
            strengthBar.style.width = '0%';
            strengthBar.style.backgroundColor = 'var(--danger)';
            metricCharset.textContent = '0';
            metricShannon.textContent = '0.0 bits';
            crackCpu.textContent = 'Instant';
            crackCpu.className = 'crack-time instant';
            crackGpu.textContent = 'Instant';
            crackGpu.className = 'crack-time instant';
            crackCluster.textContent = 'Instant';
            crackCluster.className = 'crack-time instant';
            crackQuantum.textContent = 'Instant';
            crackQuantum.className = 'crack-time instant';
            updateNistChecklist(pwd, 0);
            vulnContainer.innerHTML = '<span class="no-vulns">Enter a password to inspect resilience.</span>';
            return;
        }

        // Character set calculation
        let hasLower = /[a-z]/.test(pwd);
        let hasUpper = /[A-Z]/.test(pwd);
        let hasNums = /[0-9]/.test(pwd);
        let hasSyms = /[^a-zA-Z0-9]/.test(pwd);

        let poolSize = 0;
        if (hasLower) poolSize += 26;
        if (hasUpper) poolSize += 26;
        if (hasNums) poolSize += 10;
        if (hasSyms) poolSize += 32;

        metricCharset.textContent = poolSize > 0 ? poolSize : 1;

        // Shannon Entropy calculation
        const len = pwd.length;
        let freq = {};
        for (let i = 0; i < len; i++) {
            let char = pwd[i];
            freq[char] = (freq[char] || 0) + 1;
        }

        let shannonEntropy = 0;
        for (let char in freq) {
            let p = freq[char] / len;
            shannonEntropy -= p * (Math.log(p) / Math.LN2);
        }
        let totalShannon = shannonEntropy * len;

        // Combinatorial Entropy (log2(poolSize^len))
        let combinatorialEntropy = poolSize > 0 ? len * (Math.log(poolSize) / Math.LN2) : 0;
        let effectiveEntropy = Math.min(totalShannon, combinatorialEntropy);

        metricShannon.textContent = effectiveEntropy.toFixed(1) + ' bits';
        entropyBitsText.textContent = Math.round(effectiveEntropy) + ' bits';

        // Strength Rating
        let strengthPercent = Math.min(100, (effectiveEntropy / 128) * 100);
        strengthBar.style.width = strengthPercent + '%';

        let strengthText = 'Very Weak';
        let barColor = 'var(--danger)';

        if (effectiveEntropy > 100) {
            strengthText = 'Exceptional';
            barColor = '#38bdf8';
        } else if (effectiveEntropy > 80) {
            strengthText = 'Strong';
            barColor = 'var(--success)';
        } else if (effectiveEntropy > 60) {
            strengthText = 'Moderate';
            barColor = 'var(--warning)';
        } else if (effectiveEntropy > 35) {
            strengthText = 'Weak';
            barColor = '#f97316';
        }

        strengthLabelText.innerHTML = `Strength: <strong style="color: ${barColor}">${strengthText}</strong>`;
        strengthBar.style.backgroundColor = barColor;

        // Crack Times
        // CPU: 1e9 / sec, GPU: 1e11 / sec, Cluster: 1e13 / sec, Quantum: sqrt(guesses)
        const combinations = Math.pow(2, effectiveEntropy);
        
        crackCpu.textContent = formatCrackTime(combinations / 1e9);
        crackCpu.className = getCrackClass(combinations / 1e9);

        crackGpu.textContent = formatCrackTime(combinations / 1e11);
        crackGpu.className = getCrackClass(combinations / 1e11);

        crackCluster.textContent = formatCrackTime(combinations / 1e13);
        crackCluster.className = getCrackClass(combinations / 1e13);

        const quantumGuesses = Math.sqrt(combinations);
        crackQuantum.textContent = formatCrackTime(quantumGuesses / 1e12);
        crackQuantum.className = getCrackClass(quantumGuesses / 1e12);

        updateNistChecklist(pwd, effectiveEntropy);
        detectVulnerabilities(pwd);
    }

    function formatCrackTime(seconds) {
        if (seconds < 0.001) return 'Instant';
        if (seconds < 1) return '< 1 sec';
        if (seconds < 60) return Math.round(seconds) + ' secs';
        if (seconds < 3600) return (seconds / 60).toFixed(1) + ' mins';
        if (seconds < 86400) return (seconds / 3600).toFixed(1) + ' hours';
        if (seconds < 31536000) return (seconds / 86400).toFixed(1) + ' days';
        if (seconds < 31536000 * 1000) return (seconds / 31536000).toFixed(1) + ' years';
        if (seconds < 31536000 * 1e9) return (seconds / (31536000 * 1000)).toFixed(1) + ' millennia';
        return 'Centuries+';
    }

    function getCrackClass(seconds) {
        if (seconds < 60) return 'crack-time instant';
        if (seconds < 31536000 * 10) return 'crack-time weak';
        return 'crack-time strong';
    }

    function updateNistChecklist(pwd, entropy) {
        // Length check (>= 8)
        if (pwd.length >= 8) {
            nistLength.className = 'check-pass';
            nistLength.querySelector('.status-icon').textContent = '✓';
        } else {
            nistLength.className = 'check-fail';
            nistLength.querySelector('.status-icon').textContent = '✕';
        }

        // Repeat check
        const hasExcessiveRepeats = /(.)\1{3,}/.test(pwd);
        if (!hasExcessiveRepeats) {
            nistNoRepeat.className = 'check-pass';
            nistNoRepeat.querySelector('.status-icon').textContent = '✓';
        } else {
            nistNoRepeat.className = 'check-fail';
            nistNoRepeat.querySelector('.status-icon').textContent = '✕';
        }

        // Common dictionary check (simple simulation)
        const lower = pwd.toLowerCase();
        const commonWords = ['password', '123456', 'qwerty', 'admin', 'welcome', 'letmein', 'monkey', 'dragon'];
        let hasCommon = commonWords.some(w => lower.includes(w));
        if (!hasCommon) {
            nistNoDict.className = 'check-pass';
            nistNoDict.querySelector('.status-icon').textContent = '✓';
        } else {
            nistNoDict.className = 'check-fail';
            nistNoDict.querySelector('.status-icon').textContent = '✕';
        }

        // Entropy check (>= 64 bits)
        if (entropy >= 64) {
            nistEntropy.className = 'check-pass';
            nistEntropy.querySelector('.status-icon').textContent = '✓';
        } else {
            nistEntropy.className = 'check-fail';
            nistEntropy.querySelector('.status-icon').textContent = '✕';
        }
    }

    function detectVulnerabilities(pwd) {
        vulnContainer.innerHTML = '';
        let vulns = [];

        if (pwd.length > 0 && pwd.length < 8) {
            vulns.push('Password is shorter than the recommended NIST minimum of 8 characters.');
        }

        if (/^[0-9]+$/.test(pwd)) {
            vulns.push('Contains strictly numeric digits. Susceptible to instant pin/number cracking.');
        }

        if (/^[a-zA-Z]+$/.test(pwd)) {
            vulns.push('Contains only alphabetical letters. Lacks numeric and symbol complexity.');
        }

        if (/(123|abc|qwe|asd|zxc)/i.test(pwd)) {
            vulns.push('Contains common keyboard walks or sequential patterns.');
        }

        if (/(.)\1{2,}/.test(pwd)) {
            vulns.push('Contains repeating character sequences (e.g., "aaa" or "111").');
        }

        const lower = pwd.toLowerCase();
        if (lower.includes('password') || lower.includes('admin') || lower.includes('1234')) {
            vulns.push('Contains easily guessable dictionary terms or credentials.');
        }

        if (vulns.length === 0 && pwd.length > 0) {
            vulnContainer.innerHTML = '<span class="no-vulns">No major vulnerabilities detected. Keep building strong secrets!</span>';
        } else {
            vulns.forEach(v => {
                const badge = document.createElement('div');
                badge.className = 'vuln-badge';
                badge.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> ${v}`;
                vulnContainer.appendChild(badge);
            });
        }
    }
});
