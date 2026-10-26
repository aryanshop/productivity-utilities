# AuraVault: Cryptographic Vault & Secret Splitting Workbench

AuraVault is a professional, privacy-first client-side security utility and cryptographic sandbox designed for developers, system administrators, and security-conscious individuals.

## Features
1. **Entropy & Strength Inspector**: Evaluates passwords and secrets against NIST guidelines, calculates exact information entropy in bits, and estimates offline brute-force crack resistance across desktop GPUs, enterprise clusters, and quantum computers.
2. **Passphrase Generator**: Generates high-entropy Diceware passphrases or randomized cryptographic tokens with configurable character sets and separators using secure browser crypto APIs.
3. **Secret Sharing (M-of-N Threshold)**: Splits sensitive master secrets into independent threshold shares so that secrets can be safely distributed among guardians and reconstructed when a threshold is met.

## Local Run Instructions
1. Download or clone this repository.
2. Open `index.html` directly in any modern web browser.

## Technology Stack
- 100% Vanilla HTML5, CSS3, and modern JavaScript (ES6+).
- Zero external dependencies, build tools, or network requests. Operates entirely offline in memory.
