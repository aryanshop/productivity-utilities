# ZenShelf: Personal Home Library & Reading Vault

ZenShelf is a local-first, privacy-focused personal library manager and reading habit tracker built with vanilla HTML, CSS, and JavaScript. It allows book lovers and avid readers to catalogue their physical and digital book collections, track real-time reading sessions with a built-in stopwatch, monitor progress against annual reading goals, save memorable quotes, and manage their data entirely within their browser using LocalStorage.

## Features

1. **Personal Library Catalogue**: 
   - Add, edit, and organize books by title, author, genre, total pages, current page, reading status (*Want to Read*, *Currently Reading*, *Finished*, *DNF*), and personal notes.
   - Live search and filter by status instantly.

2. **Active Reading Session Stopwatch**: 
   - Start a reading session timer to log your reading duration.
   - Automatically record pages read during the session and update your overall book progress.

3. **Memorable Quote Vault**: 
   - Capture and store your favorite passages and quotes while reading, linked directly to their book source and page numbers.

4. **Reading Goals & Analytics**: 
   - Set and track annual reading challenges with dynamic progress indicators and completion percentages.

5. **Local Data Backup & Restore**: 
   - Export your entire library database as a JSON file or restore from a previous backup with zero cloud dependency.

## Local Run Instructions

Because ZenShelf is fully static and client-side, you can run it instantly:

1. Download or clone the repository containing `index.html`, `style.css`, and `script.js`.
2. Double-click `index.html` to open it directly in any modern web browser.
   *(Alternatively, run a local static server such as `npx serve` or Python's `http.server` for optimal asset loading).*-

## Technologies Used
- Semantic HTML5
- Modern CSS3 (CSS Variables, Flexbox, CSS Grid, responsive design)
- Vanilla JavaScript (ES6+)
- Browser LocalStorage for persistence
