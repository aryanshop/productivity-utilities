# AuraVault: Client-Side AES-GCM Encrypted Secret & Note Studio

AuraVault is a 100% client-side, zero-knowledge secret note and credential vault designed for absolute data privacy. It leverages the native browser Web Crypto API (AES-GCM 256-bit with PBKDF2 key derivation) to securely encrypt sensitive text, API keys, passwords, and private journal entries right inside your browser.

## Features
- **Client-Side Cryptography**: Uses native `window.crypto.subtle` AES-GCM encryption. Your master passphrases never leave your machine.
- **Password Entropy Meter**: Real-time feedback on passphrase strength and bit complexity.
- **Local-First Storage**: All notes persist safely in browser `localStorage` with zero server communication or external trackers.
- **Backup & Restore**: Export and import your encrypted vault data securely as a local JSON archive.
- **Instant Search**: Filter notes instantly by title or tags.

## Local Run Instructions
1. Download or clone the project repository.
2. Open `index.html` directly in any modern web browser (Chrome, Firefox, Safari, Edge).
3. No build step, server, or npm packages required!

## Static Project Disclaimer
This is a purely static front-end application. All cryptography is executed locally in your browser session.
