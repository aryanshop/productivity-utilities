# AuraVault

AuraVault is a privacy-first client-side encryption utility and secure secret note generator. It allows users to encrypt sensitive text, passwords, API keys, or private journal entries using AES-GCM via the native browser Web Crypto API with a custom master passphrase.

## Features
- **Client-Side AES-GCM 256-Bit Encryption**: Utilizing browser native `window.crypto.subtle` with PBKDF2 key derivation (100,000 iterations).
- **Zero Telemetry / Local-First**: All data is stored exclusively in your browser's `localStorage`. No data or passphrases ever leave your device.
- **Real-Time Password Entropy Scoring**: Interactive strength indicator evaluates your master passphrases.
- **Self-Destruct Simulation**: Configure notes to automatically incinerate and erase themselves upon being decrypted and viewed.
- **Tagging & Instant Search**: Filter notes by tags or live keyword search across titles and metadata.
- **JSON Backup & Restore**: Export your encrypted vault archive or restore from a backup file.

## Local Run Instructions
1. Download or clone this repository.
2. Open `index.html` directly in any modern web browser (Chrome, Firefox, Safari, Edge).
3. Enjoy a secure, offline workspace!

*Note: Because this is a static client-side web application, clearing your browser site data will remove stored vault items unless you have exported a JSON backup.*
