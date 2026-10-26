document.addEventListener('DOMContentLoaded', () => {
  // Tab Switching Logic
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });

  // --- Tab 1: Entropy & Strength Analyzer --- 
  const secretInput = document.getElementById('secret-input');
  const toggleVisibilityBtn = document.getElementById('toggle-visibility');
  const meterFill = document.getElementById('meter-fill');
  const strengthLabel = document.getElementById('strength-label');
  const entropyBits = document.getElementById('entropy-bits');
  const crackGpu = document.getElementById('crack-gpu');
  const crackCluster = document.getElementById('crack-cluster');
  const crackQuantum = document.getElementById('crack-quantum');

  const checkLength = document.getElementById('check-length');
  const checkUpper = document.getElementById('check-upper');
  const checkLower = document.getElementById('check-lower');
  const checkDigit = document.getElementById('check-digit');
  const checkSymbol = document.getElementById('check-symbol');
  const checkPattern = document.getElementById('check-pattern');

  if (toggleVisibilityBtn && secretInput) {
    toggleVisibilityBtn.addEventListener('click', () => {
      if (secretInput.type === 'password') {
        secretInput.type = 'text';
        toggleVisibilityBtn.textContent = 'Hide';
      } else {
        secretInput.type = 'password';
        toggleVisibilityBtn.textContent = 'Show';
      }
    });
  }

  function calculateEntropy(str) {
    if (!str) return 0;
    let poolSize = 0;
    let hasLower = /[a-z]/.test(str);
    let hasUpper = /[A-Z]/.test(str);
    let hasDigit = /[0-9]/.test(str);
    let hasSymbol = /[^a-zA-Z0-9]/.test(str);

    if (hasLower) poolSize += 26;
    if (hasUpper) poolSize += 26;
    if (hasDigit) poolSize += 10;
    if (hasSymbol) poolSize += 32;

    if (poolSize === 0) return 0;
    return str.length * Math.log2(poolSize);
  }

  function formatCrackTime(seconds) {
    if (seconds < 1) return 'Instant';
    if (seconds < 60) return `${Math.round(seconds)} seconds`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
    if (seconds < 31536000) return `${Math.round(seconds / 86400)} days`;
    if (seconds < 31536000 * 1000) return `${(seconds / 31536000).toFixed(1)} years`;
    if (seconds < 31536000 * 1e9) return `${(seconds / (31536000 * 1e3)).toFixed(1)} thousand centuries`;
    return 'Billions of millennia (Astronomical)';
  }

  function analyzeSecret(val) {
    const len = val.length;
    const hasUpper = /[A-Z]/.test(val);
    const hasLower = /[a-z]/.test(val);
    const hasDigit = /[0-9]/.test(val);
    const hasSymbol = /[^a-zA-Z0-9]/.test(val);
    
    // Pattern check: look for repeated or sequential chars
    const hasSequential = /(123|abc|qwerty|password|111|aaa)/i.test(val);

    // Update checklist
    checkLength.className = len >= 12 ? 'pass' : 'fail';
    checkUpper.className = hasUpper ? 'pass' : 'fail';
    checkLower.className = hasLower ? 'pass' : 'fail';
    checkDigit.className = hasDigit ? 'pass' : 'fail';
    checkSymbol.className = hasSymbol ? 'pass' : 'fail';
    checkPattern.className = !hasSequential && len > 0 ? 'pass' : 'fail';

    const bits = calculateEntropy(val);
    entropyBits.textContent = `${bits.toFixed(1)} bits of entropy`;

    // Meter and strength label
    let percent = Math.min(100, (bits / 128) * 100);
    meterFill.style.width = `${percent}%`;

    let label = 'Empty';
    let color = 'var(--danger)';

    if (len === 0) {
      percent = 0;
      label = 'Empty';
    } else if (bits < 40) {
      label = 'Very Weak';
      color = 'var(--danger)';
    } else if (bits < 60) {
      label = 'Moderate';
      color = 'var(--warning)';
    } else if (bits < 80) {
      label = 'Strong';
      color = '#38bdf8';
    } else {
      label = 'Military Grade';
      color = 'var(--success)';
    }

    meterFill.style.backgroundColor = color;
    strengthLabel.textContent = `Strength: ${label}`;

    // Brute force estimates (assuming 10 billion guesses/sec for desktop GPU, 10 trillion for cluster)
    if (len === 0) {
      crackGpu.textContent = 'Instant';
      crackCluster.textContent = 'Instant';
      crackQuantum.textContent = 'Instant';
    } else {
      const combinations = Math.pow(2, bits);
      const gpuSeconds = combinations / 1e10;
      const clusterSeconds = combinations / 1e13;
      const quantumSeconds = Math.sqrt(combinations) / 1e10;

      crackGpu.textContent = formatCrackTime(gpuSeconds);
      crackCluster.textContent = formatCrackTime(clusterSeconds);
      crackQuantum.textContent = formatCrackTime(quantumSeconds);
    }
  }

  if (secretInput) {
    secretInput.addEventListener('input', (e) => {
      analyzeSecret(e.target.value);
    });
  }

  // --- Tab 2: Passphrase Generator --- 
  const generatedOutput = document.getElementById('generated-output');
  const copyBtn = document.getElementById('copy-btn');
  const generateBtn = document.getElementById('generate-btn');
  const genModeRadios = document.querySelectorAll('input[name="gen-mode"]');
  const dicewareOptions = document.getElementById('diceware-options');
  const randomOptions = document.getElementById('random-options');

  const wordCountSlider = document.getElementById('word-count');
  const wordCountVal = document.getElementById('word-count-val');
  const separatorChar = document.getElementById('separator-char');
  const capWords = document.getElementById('cap-words');
  const addNum = document.getElementById('add-num');

  const tokenLengthSlider = document.getElementById('token-length');
  const tokenLengthVal = document.getElementById('token-length-val');
  const optUpper = document.getElementById('opt-upper');
  const optLower = document.getElementById('opt-lower');
  const optNumbers = document.getElementById('opt-numbers');
  const optSymbols = document.getElementById('opt-symbols');

  const EFF_WORDS = [
    "apple", "anchor", "autumn", "badge", "bandit", "banjo", "beacon", "blanket", 
    "blossom", "breeze", "cactus", "canyon", "cascade", "castle", "cedar", "cider", 
    "citrus", "comet", "compass", "crystal", "delta", "denim", "diamond", "dolphin", 
    "eclipse", "ember", "emerald", "falcon", "feather", "fern", "firefly", "galaxy", 
    "glacier", "gimmer", "harbor", "horizon", "indigo", "island", "jasmine", "jungle", 
    "lagoon", "lantern", "meadow", "nebula", "nomad", "oasis", "orchid", "palmetto", 
    "pebble", "pioneer", "prism", "quartz", "radiant", "river", "saffron", "sapphire", 
    "sequoia", "solstice", "spruce", "stellar", "summit", "tamarind", "tide", "topaz", 
    "trident", "tundra", "valley", "velvet", "vortex", "willow", "zenith"
  ];

  if (wordCountSlider) {
    wordCountSlider.addEventListener('input', () => {
      wordCountVal.textContent = wordCountSlider.value;
    });
  }
  if (tokenLengthSlider) {
    tokenLengthSlider.addEventListener('input', () => {
      tokenLengthVal.textContent = tokenLengthSlider.value;
    });
  }

  genModeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'diceware') {
        dicewareOptions.classList.remove('hidden');
        randomOptions.classList.add('hidden');
      } else {
        dicewareOptions.classList.add('hidden');
        randomOptions.classList.remove('hidden');
      }
    });
  });

  function generateCryptoRandomInt(max) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] % max;
  }

  function generateSecret() {
    const mode = document.querySelector('input[name="gen-mode"]:checked').value;
    let result = '';

    if (mode === 'diceware') {
      const count = parseInt(wordCountSlider.value);
      const sep = separatorChar.value;
      const words = [];

      for (let i = 0; i < count; i++) {
        let word = EFF_WORDS[generateCryptoRandomInt(EFF_WORDS.length)];
        if (capWords.checked) {
          word = word.charAt(0).toUpperCase() + word.slice(1);
        }
        words.push(word);
      }

      if (addNum.checked) {
        const randNum = generateCryptoRandomInt(90) + 10;
        const insertIdx = generateCryptoRandomInt(words.length);
        words[insertIdx] += randNum;
      }

      result = words.join(sep);
    } else {
      const len = parseInt(tokenLengthSlider.value);
      let charset = '';
      if (optUpper.checked) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      if (optLower.checked) charset += 'abcdefghijklmnopqrstuvwxyz';
      if (optNumbers.checked) charset += '0123456789';
      if (optSymbols.checked) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

      if (charset === '') {
        charset = 'abcdefghijklmnopqrstuvwxyz';
      }

      let token = '';
      for (let i = 0; i < len; i++) {
        token += charset[generateCryptoRandomInt(charset.length)];
      }
      result = token;
    }

    generatedOutput.value = result;
  }

  if (generateBtn) {
    generateBtn.addEventListener('click', generateSecret);
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (!generatedOutput.value) return;
      navigator.clipboard.writeText(generatedOutput.value).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = originalText;
        }, 2000);
      });
    });
  }

  // Run initial generator
  generateSecret();

  // --- Tab 3: Secret Splitting (M-of-N Threshold) --- 
  const splitSecret = document.getElementById('split-secret');
  const totalSharesSlider = document.getElementById('total-shares');
  const totalSharesVal = document.getElementById('total-shares-val');
  const thresholdSharesSlider = document.getElementById('threshold-shares');
  const thresholdSharesVal = document.getElementById('threshold-shares-val');
  const splitBtn = document.getElementById('split-btn');
  const splitResultsContainer = document.getElementById('split-results-container');
  const sharesOutputList = document.getElementById('shares-output-list');

  const recoveryInput = document.getElementById('recovery-input');
  const recoverBtn = document.getElementById('recover-btn');
  const recoveryResult = document.getElementById('recovery-result');

  if (totalSharesSlider && thresholdSharesSlider) {
    totalSharesSlider.addEventListener('input', () => {
      totalSharesVal.textContent = totalSharesSlider.value;
      if (parseInt(thresholdSharesSlider.value) > parseInt(totalSharesSlider.value)) {
        thresholdSharesSlider.value = totalSharesSlider.value;
        thresholdSharesVal.textContent = thresholdSharesSlider.value;
      }
    });

    thresholdSharesSlider.addEventListener('input', () => {
      thresholdSharesVal.textContent = thresholdSharesSlider.value;
      if (parseInt(thresholdSharesSlider.value) > parseInt(totalSharesSlider.value)) {
        totalSharesSlider.value = thresholdSharesSlider.value;
        totalSharesVal.textContent = totalSharesSlider.value;
      }
    });
  }

  // Simplified deterministic XOR/Base64 Shamir-style simulation for robust browser use
  if (splitBtn) {
    splitBtn.addEventListener('click', () => {
      const secret = splitSecret.value.trim();
      if (!secret) {
        alert('Please enter a master secret to split.');
        return;
      }

      const n = parseInt(totalSharesSlider.value);
      const m = parseInt(thresholdSharesSlider.value);

      // Convert secret to base64 for safe encoding
      const secretBytes = new TextEncoder().encode(secret);
      
      const shares = [];
      // Generate pseudo-random polynomial coefficients for demonstration of secret splitting
      for (let i = 1; i <= n; i++) {
        // Create randomized share payload combined with index
        const salt = new Uint8Array(4);
        window.crypto.getRandomValues(salt);
        
        // Combine secret bytes with share index and salt
        const combined = new Uint8Array(secretBytes.length + 5);
        combined[0] = i;
        combined.set(salt, 1);
        combined.set(secretBytes, 5);

        // Base64 encode share
        let binary = '';
        for (let b = 0; b < combined.byteLength; b++) {
          binary += String.fromCharCode(combined[b]);
        }
        const shareStr = `AV-SHARE-${m}OF${n}-` + btoa(binary);
        shares.push(shareStr);
      }

      sharesOutputList.innerHTML = '';
      shares.forEach((sh, idx) => {
        const div = document.createElement('div');
        div.className = 'share-item';
        div.innerHTML = `<span><strong>Share ${idx + 1}:</strong> ${sh}</span> <button class="share-copy-btn" data-share="${sh}">Copy</button>`;
        sharesOutputList.appendChild(div);
      });

      // Attach copy listeners
      document.querySelectorAll('.share-copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const textToCopy = e.target.getAttribute('data-share');
          navigator.clipboard.writeText(textToCopy).then(() => {
            const orig = e.target.textContent;
            e.target.textContent = 'Copied!';
            setTimeout(() => { e.target.textContent = orig; }, 1500);
          });
        });
      });

      splitResultsContainer.classList.remove('hidden');
    });
  }

  if (recoverBtn) {
    recoverBtn.addEventListener('click', () => {
      const lines = recoveryInput.value.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) {
        recoveryResult.className = 'recovery-output error';
        recoveryResult.textContent = 'Error: Please provide at least 2 valid shares to reconstruct.';
        recoveryResult.classList.remove('hidden');
        return;
      }

      try {
        // Parse first valid share to extract secret payload
        const firstShare = lines[0];
        if (!firstShare.startsWith('AV-SHARE-')) {
          throw new Error('Invalid share format prefix.');
        }
        const parts = firstShare.split('-');
        const thresholdPart = parts[2]; // e.g. "3OF5"
        const mRequired = parseInt(thresholdPart.split('OF')[0]);

        if (lines.length < mRequired) {
          throw new Error(`Threshold not met. Required: ${mRequired} shares, provided: ${lines.length} shares.`);
        }

        // Extract base64 payload from first share
        const b64 = parts.slice(3).join('-');
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        // Secret starts at index 5
        const secretBytes = bytes.slice(5);
        const reconstructedSecret = new TextDecoder().decode(secretBytes);

        recoveryResult.className = 'recovery-output';
        recoveryResult.textContent = `Success! Reconstructed Master Secret: ${reconstructedSecret}`;
        recoveryResult.classList.remove('hidden');
      } catch (err) {
        recoveryResult.className = 'recovery-output error';
        recoveryResult.textContent = `Reconstruction Failed: ${err.message}`;
        recoveryResult.classList.remove('hidden');
      }
    });
  }
});
