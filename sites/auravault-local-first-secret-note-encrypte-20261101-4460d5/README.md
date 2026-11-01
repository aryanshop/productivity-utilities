# AuraVault: Local-First Secret Note & Encrypted Share Studio

AuraVault is a client-side zero-knowledge cryptography utility designed to protect sensitive credentials, private notes, API keys, and confidential text directly within your web browser without relying on external servers or data transmission.

## Key Features

1. **AES-GCM 256-bit Encryption**: Employs industry-standard authenticated encryption with PBKDF2 (100,000 iterations) for robust password-based key derivation.
2. **Zero-Knowledge Architecture**: All encryption and decryption operations occur entirely client-side using the native browser `window.crypto.subtle` API. Plaintext data never leaves your device.
3. **Passphrase Entropy Scoring**: Evaluates password strength in real-time with visual indicators and includes a high-entropy passphrase generator.
4. **Self-Destruct View Simulation**: Optional setting to immediately purge the encrypted note from the vault upon successful decryption view.
5. **Local Backup & Restore**: Export and import your encrypted vault database securely as a local JSON file.
6. **Offline QR Code Generator**: Generate offline QR code representations for quick air-gapped data transfer.

## Local Run Instructions

Since AuraVault is built with vanilla HTML, CSS, and JavaScript with no external dependencies or build tooling:

1. Download or clone the repository files (`index.html`, `style.css`, `script.js`).
2. Open `index.html` directly in any modern web browser (Chrome, Firefox, Safari, Edge).

*Note: Due to browser security restrictions regarding the Web Crypto API, some features require running via `file://` or a local static development server (e.g., `npx serve` or Python's `http.server`).*

## Privacy & Security Disclaimer

- AuraVault stores encrypted payloads locally in your browser's `localStorage`.
- If you lose your encryption passphrase, **there is no recovery mechanism** due to the zero-knowledge design.
- Always backup your vault before clearing browser data.
