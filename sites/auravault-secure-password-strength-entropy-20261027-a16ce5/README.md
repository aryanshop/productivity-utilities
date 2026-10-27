# AuraVault: Secure Password Strength & Entropy Inspector

A privacy-first password strength inspector, cryptographic entropy calculator, and secure offline passphrase generator.

## Purpose & Features
- **Live Cryptographic Entropy Analysis**: Computes Shannon entropy and combinatorial password space ($R^L$) in real-time as you type.
- **Brute-Force Crack Time Estimations**: Simulates cracking times across desktop CPU rigs, high-end GPUs, enterprise clusters, and quantum computing threats (Grover's algorithm).
- **NIST SP 800-63B Compliance Audit**: Checks length, character diversity, repeating sequences, and dictionary patterns against modern NIST guidelines.
- **Pattern & Vulnerability Detection**: Instantly spots keyboard walks, dictionary words, and numeric patterns.
- **Secure Passphrase & Password Generator**: Generate high-entropy Diceware-style passphrases or customizable complex random keys using cryptographically secure random values (`window.crypto`).
- **100% Client-Side Privacy**: Zero network requests, zero data collection, and zero external dependencies.

## Local Run Instructions
1. Download or clone all repository files (`index.html`, `style.css`, `script.js`).
2. Open `index.html` directly in any modern web browser.

## Technology Stack
- Vanilla HTML5, CSS3, and JavaScript (ES6+).
- No external frameworks, build tools, or CDNs.
