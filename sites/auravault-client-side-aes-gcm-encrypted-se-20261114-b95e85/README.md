# AuraVault: Client-Side AES-GCM Encrypted Secret & Note Vault

AuraVault is a privacy-first, zero-knowledge client-side encryption utility and secure note keeper designed for modern web browsers. All cryptographic operations (AES-GCM 256-bit encryption with PBKDF2 key derivation) run locally in your browser via the native Web Crypto API.

## Features

- **Zero-Knowledge Architecture**: Your plain-text secrets and passphrases never leave your browser or get transmitted to any server.
- **Web Crypto API**: Industry-standard AES-GCM encryption with 100,000 PBKDF2 SHA-256 iterations and cryptographically secure random salts and initialization vectors (IV).
- **Entropy Scoring & Generator**: Real-time password strength meter and random secure passphrase generator.
- **Self-Destruct Simulation**: Test viewing sensitive notes with a one-time timed self-destruct view window.
- **Local-First Storage**: Securely stored in browser `localStorage` with full JSON backup export and restore capabilities.
- **Tagging & Instant Search**: Organize credentials, API keys, secure journals, and financial notes with live filtering.

## Local Run Instructions

Since this is a fully static web application requiring no build tools, backend servers, or external dependencies:

1. Clone or download this repository.
2. Open `index.html` directly in any modern web browser (Chrome, Firefox, Safari, Edge).
3. Enjoy secure client-side note vaulting!

## Technologies Used

- Vanilla HTML5 & CSS3 (Custom responsive layout with CSS variables)
- Vanilla JavaScript (ES6+)
- Native Browser Web Crypto API
