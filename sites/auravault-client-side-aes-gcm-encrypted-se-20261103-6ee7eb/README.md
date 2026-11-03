# AuraVault

AuraVault is a privacy-first, client-side cryptographic secret note and credential vault. It leverages the native browser Web Crypto API (AES-GCM 256-bit encryption with PBKDF2 key derivation) to securely encrypt sensitive text entirely within your browser before storing it in local storage.

## Features

- **Zero-Knowledge Architecture**: All encryption and decryption happen client-side. No plaintext or passwords ever leave your device or touch a server.
- **AES-GCM & PBKDF2**: Military-grade 256-bit authenticated encryption with 100,000 PBKDF2 iterations for brute-force resistance.
- **Password Entropy & Strength Inspector**: Real-time bit entropy calculation and strength scoring.
- **Secure Passphrase Generator**: Built-in generator for high-entropy master passphrases.
- **Backup & Restore**: Export your encrypted vault to a secure JSON file or import backups across devices.
- **Search & Categorization**: Easily organize and filter credentials by tags (Credentials, Secure Notes, API Keys, Personal).

## Local Run Instructions

1. Download or clone the repository containing `index.html`, `style.css`, and `script.js`.
2. Open `index.html` directly in any modern web browser (Chrome, Firefox, Safari, Edge).
3. Because it uses the native Web Crypto API, running via `file://` or any static web server (like `npx serve` or `python3 -m http.server`) works instantly.

## Technology Stack

- Pure Vanilla HTML5, CSS3, and JavaScript (ES6+)
- Native Web Crypto API (`window.crypto.subtle`)
- LocalStorage API for persistence
- Zero external libraries, fonts, or tracking scripts.
