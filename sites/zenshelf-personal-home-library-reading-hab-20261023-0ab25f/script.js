/* ZenShelf JavaScript Application Logic */

document.addEventListener('DOMContentLoaded', () => {
  // State Management
  let appData = {
    books: [],
    sessions: [],
    quotes: [],
    goal: 12
  };

  // LocalStorage Key
  const STORAGE_KEY = 'zenshelf_library_data_v1';

  // Load initial data
  function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        appData = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved data', e);
      }
    } else {
      // Seed with initial sample data
      appData = {
        books: [
          {
            id: 'book-1',
            title: 'Dune',
            author: 'Frank Herbert',
            genre: 'Sci-Fi',
            pages: 412,
            currentPage: 412,
            status: 'Finished',
            notes: 'An absolute masterpiece of world-building and political intrigue.'
          },
          {
            id: 'book-2',
            title: 'Atomic Habits',
            author: 'James Clear',
            genre: 'Self-Improvement',
            pages: 320,
            currentPage: 145,
            status: 'Currently Reading',
            notes: 'Practical advice on building systems over goals.'
          },
          {
            id: 'book-3',
            title: 'Project Hail Mary',
            author: 'Andy Weir',
            genre: 'Sci-Fi',
            pages: 496,
            currentPage: 0,
            status: 'Want to Read',
            notes: 'Recommended by a friend.'
          }
        ],
        sessions: [
          {
            id: 'sess-1',
            bookId: 'book-2',
            bookTitle: 'Atomic Habits',
            duration: 1800,
            pagesRead: 25,
            date: new Date(Date.now() - 86400000).toISOString()
          }
        ],
        quotes: [
          {
            id: 'q-1',
            bookId: 'book-1',
            bookTitle: 'Dune',
            text: 'I must not fear. Fear is the mind-killer. Fear is the little-death that brings total obliteration.',
            page: 14
          }
        ],
        goal: 12
      };
      saveData();
    }
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  }

  // Tab Switching
  const navBtns = document.querySelectorAll('.nav-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      
      navBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(t => t.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(`${targetTab}-tab`).classList.add('active');

      if (targetTab === 'tracker') {
        updateActiveBookDropdown();
      }
    });
  });

  // DOM Elements - Library
  const bookGrid = document.getElementById('book-grid');
  const emptyLibrary = document.getElementById('empty-library');
  const searchInput = document.getElementById('search-input');
  const filterStatus = document.getElementById('filter-status');
  const statTotal = document.getElementById('stat-total');
  const statReading = document.getElementById('stat-reading');
  const statFinished = document.getElementById('stat-finished');
  const statPages = document.getElementById('stat-pages');

  // Render Library
  function renderLibrary() {
    const query = searchInput.value.toLowerCase().trim();
    const statusFilter = filterStatus.value;

    const filtered = appData.books.filter(book => {
      const matchesQuery = book.title.toLowerCase().includes(query) ||
                             book.author.toLowerCase().includes(query) ||
                             (book.genre && book.genre.toLowerCase().includes(query));
      const matchesStatus = statusFilter === 'all' || book.status === statusFilter;
      return matchesQuery && matchesStatus;
    });

    // Update Stats
    statTotal.textContent = appData.books.length;
    statReading.textContent = appData.books.filter(b => b.status === 'Currently Reading').length;
    statFinished.textContent = appData.books.filter(b => b.status === 'Finished').length;
    
    const totalPagesRead = appData.books.reduce((acc, b) => acc + (Number(b.currentPage) || 0), 0);
    statPages.textContent = totalPagesRead.toLocaleString();

    // Update Goal Widget
    updateGoalWidget();

    if (filtered.length === 0) {
      bookGrid.innerHTML = '';
      emptyLibrary.classList.remove('hidden');
      return;
    }

    emptyLibrary.classList.add('hidden');
    bookGrid.innerHTML = filtered.map(book => {
      const total = Number(book.pages) || 100;
      const current = Number(book.currentPage) || 0;
      const percent = Math.min(100, Math.round((current / total) * 100));
      
      let badgeClass = 'badge-want';
      if (book.status === 'Currently Reading') badgeClass = 'badge-reading';
      if (book.status === 'Finished') badgeClass = 'badge-finished';
      if (book.status === 'DNF') badgeClass = 'badge-dnf';

      return `
        <div class="book-card">
          <div>
            <div class="book-header">
              <h3 class="book-title">${escapeHTML(book.title)}</h3>
              <span class="badge ${badgeClass}">${book.status}</span>
            </div>
            <p class="book-author">by ${escapeHTML(book.author)}</p>
            <div class="book-details">
              ${book.genre ? `<span><strong>Genre:</strong> ${escapeHTML(book.genre)}</span>` : ''}
              <span><strong>Pages:</strong> ${current} / ${total}</span>
              ${book.notes ? `<p style="margin-top:0.4rem; font-style:italic;">"${escapeHTML(book.notes)}"</p>` : ''}
            </div>
            <div class="progress-container">
              <div class="progress-info">
                <span>Progress</span>
                <span>${percent}%</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${percent}%"></div>
              </div>
            </div>
          </div>
          <div class="book-actions">
            <button class="secondary-btn" onclick="window.editBook('${book.id}')">Edit</button>
            <button class="danger-btn" onclick="window.deleteBook('${book.id}')">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  }

  searchInput.addEventListener('input', renderLibrary);
  filterStatus.addEventListener('change', renderLibrary);

  // Book Modal Logic
  const bookModal = document.getElementById('book-modal');
  const openAddModalBtn = document.getElementById('open-add-modal-btn');
  const closeBookModal = document.getElementById('close-book-modal');
  const cancelBookModal = document.getElementById('cancel-book-modal');
  const bookForm = document.getElementById('book-form');
  const bookModalTitle = document.getElementById('book-modal-title');

  openAddModalBtn.addEventListener('click', () => {
    bookForm.reset();
    document.getElementById('book-id').value = '';
    bookModalTitle.textContent = 'Add New Book';
    bookModal.classList.add('active');
  });

  function closeModalFunc() {
    bookModal.classList.remove('active');
  }

  closeBookModal.addEventListener('click', closeModalFunc);
  cancelBookModal.addEventListener('click', closeModalFunc);

  bookForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('book-id').value;
    const title = document.getElementById('book-title').value.trim();
    const author = document.getElementById('book-author').value.trim();
    const genre = document.getElementById('book-genre').value.trim();
    const pages = parseInt(document.getElementById('book-pages').value) || 100;
    const status = document.getElementById('book-status').value;
    const currentPage = parseInt(document.getElementById('book-current-page').value) || 0;
    const notes = document.getElementById('book-notes').value.trim();

    if (id) {
      // Edit
      const index = appData.books.findIndex(b => b.id === id);
      if (index !== -1) {
        appData.books[index] = { id, title, author, genre, pages, status, currentPage, notes };
      }
    } else {
      // Create
      const newBook = {
        id: 'book-' + Date.now(),
        title,
        author,
        genre,
        pages,
        status,
        currentPage: status === 'Finished' ? pages : currentPage,
        notes
      };
      appData.books.push(newBook);
    }

    saveData();
    renderLibrary();
    closeModalFunc();
  });

  window.editBook = function(id) {
    const book = appData.books.find(b => b.id === id);
    if (!book) return;

    document.getElementById('book-id').value = book.id;
    document.getElementById('book-title').value = book.title;
    document.getElementById('book-author').value = book.author;
    document.getElementById('book-genre').value = book.genre || '';
    document.getElementById('book-pages').value = book.pages || '';
    document.getElementById('book-status').value = book.status;
    document.getElementById('book-current-page').value = book.currentPage || 0;
    document.getElementById('book-notes').value = book.notes || '';

    bookModalTitle.textContent = 'Edit Book';
    bookModal.classList.add('active');
  };

  window.deleteBook = function(id) {
    if (confirm('Are you sure you want to delete this book?')) {
      appData.books = appData.books.filter(b => b.id !== id);
      saveData();
      renderLibrary();
    }
  };

  // Reading Session Timer Logic
  let timerInterval = null;
  let secondsElapsed = 0;
  const timerDisplay = document.getElementById('timer-display');
  const timerStartBtn = document.getElementById('timer-start-btn');
  const timerPauseBtn = document.getElementById('timer-pause-btn');
  const timerStopBtn = document.getElementById('timer-stop-btn');
  const activeBookSelect = document.getElementById('active-book-select');
  const sessionLogForm = document.getElementById('session-log-form');
  const pagesReadInput = document.getElementById('pages-read-input');
  const saveSessionBtn = document.getElementById('save-session-btn');
  const sessionList = document.getElementById('session-list');

  function updateActiveBookDropdown() {
    const readingBooks = appData.books.filter(b => b.status === 'Currently Reading' || b.status === 'Want to Read');
    activeBookSelect.innerHTML = '<option value="">-- Choose a book --</option>' +
      readingBooks.map(b => `<option value="${b.id}">${escapeHTML(b.title)} by ${escapeHTML(b.author)}</option>`).join('');
  }

  function formatTime(sec) {
    const h = String(Math.floor(sec / 3600)).padStart(2, '0');
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  timerStartBtn.addEventListener('click', () => {
    if (!activeBookSelect.value) {
      alert('Please select a book for this reading session first.');
      return;
    }
    activeBookSelect.disabled = true;
    timerStartBtn.disabled = true;
    timerPauseBtn.disabled = false;
    timerStopBtn.disabled = false;
    sessionLogForm.classList.add('hidden');

    timerInterval = setInterval(() => {
      secondsElapsed++;
      timerDisplay.textContent = formatTime(secondsElapsed);
    }, 1000);
  });

  timerPauseBtn.addEventListener('click', () => {
    clearInterval(timerInterval);
    timerStartBtn.disabled = false;
    timerPauseBtn.disabled = true;
    timerStartBtn.textContent = 'Resume Timer';
  });

  timerStopBtn.addEventListener('click', () => {
    clearInterval(timerInterval);
    timerStartBtn.disabled = false;
    timerStartBtn.textContent = 'Start Timer';
    timerPauseBtn.disabled = true;
    timerStopBtn.disabled = true;
    sessionLogForm.classList.remove('hidden');
  });

  saveSessionBtn.addEventListener('click', () => {
    const bookId = activeBookSelect.value;
    const book = appData.books.find(b => b.id === bookId);
    const pagesRead = parseInt(pagesReadInput.value) || 0;

    if (book) {
      book.currentPage = Math.min(Number(book.pages) || 100, (Number(book.currentPage) || 0) + pagesRead);
      if (book.currentPage >= book.pages) {
        book.status = 'Finished';
      } else if (book.status === 'Want to Read') {
        book.status = 'Currently Reading';
      }
    }

    const newSession = {
      id: 'sess-' + Date.now(),
      bookId,
      bookTitle: book ? book.title : 'Unknown Book',
      duration: secondsElapsed,
      pagesRead,
      date: new Date().toISOString()
    };

    appData.sessions.unshift(newSession);
    saveData();
    renderLibrary();
    renderSessions();

    // Reset timer
    secondsElapsed = 0;
    timerDisplay.textContent = '00:00:00';
    sessionLogForm.classList.add('hidden');
    activeBookSelect.disabled = false;
    pagesReadInput.value = '0';
  });

  function renderSessions() {
    if (appData.sessions.length === 0) {
      sessionList.innerHTML = '<li class="session-item">No reading sessions logged yet.</li>';
      return;
    }

    sessionList.innerHTML = appData.sessions.slice(0, 15).map(s => {
      const dateStr = new Date(s.date).toLocaleDateString();
      const mins = Math.round(s.duration / 60);
      return `
        <li class="session-item">
          <div class="session-item-info">
            <strong>${escapeHTML(s.bookTitle)}</strong>
            <span>${mins} mins &bull; ${s.pagesRead} pages read</span>
          </div>
          <span>${dateStr}</span>
        </li>
      `;
    }).join('');
  }

  // Quote Vault Logic
  const quoteGrid = document.getElementById('quote-grid');
  const emptyQuotes = document.getElementById('empty-quotes');
  const quoteModal = document.getElementById('quote-modal');
  const openQuoteModalBtn = document.getElementById('open-quote-modal-btn');
  const closeQuoteModal = document.getElementById('close-quote-modal');
  const cancelQuoteModal = document.getElementById('cancel-quote-modal');
  const quoteForm = document.getElementById('quote-form');
  const quoteBookSelect = document.getElementById('quote-book-select');

  openQuoteModalBtn.addEventListener('click', () => {
    quoteForm.reset();
    quoteBookSelect.innerHTML = '<option value="">-- Select Book --</option>' +
      appData.books.map(b => `<option value="${b.id}">${escapeHTML(b.title)}</option>`).join('');
    quoteModal.classList.add('active');
  });

  function closeQuoteModalFunc() {
    quoteModal.classList.remove('active');
  }

  closeQuoteModal.addEventListener('click', closeQuoteModalFunc);
  cancelQuoteModal.addEventListener('click', closeQuoteModalFunc);

  quoteForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = document.getElementById('quote-text').value.trim();
    const bookId = quoteBookSelect.value;
    const book = appData.books.find(b => b.id === bookId);
    const page = document.getElementById('quote-page').value;

    const newQuote = {
      id: 'q-' + Date.now(),
      bookId,
      bookTitle: book ? book.title : 'General Note',
      text,
      page: page ? Number(page) : null
    };

    appData.quotes.unshift(newQuote);
    saveData();
    renderQuotes();
    closeQuoteModalFunc();
  });

  function renderQuotes() {
    if (appData.quotes.length === 0) {
      quoteGrid.innerHTML = '';
      emptyQuotes.classList.remove('hidden');
      return;
    }

    emptyQuotes.classList.add('hidden');
    quoteGrid.innerHTML = appData.quotes.map(q => `
      <div class="quote-card">
        <p class="quote-body">&ldquo;${escapeHTML(q.text)}&rdquo;</p>
        <div class="quote-footer">
          <span>&mdash; <strong>${escapeHTML(q.bookTitle)}</strong> ${q.page ? `(p. ${q.page})` : ''}</span>
          <button class="text-btn" style="color: var(--danger);" onclick="window.deleteQuote('${q.id}')">Delete</button>
        </div>
      </div>
    `).join('');
  }

  window.deleteQuote = function(id) {
    if (confirm('Delete this quote?')) {
      appData.quotes = appData.quotes.filter(q => q.id !== id);
      saveData();
      renderQuotes();
    }
  };

  // Analytics & Goal Logic
  const goalText = document.getElementById('goal-text');
  const goalProgressBar = document.getElementById('goal-progress-bar');
  const editGoalBtn = document.getElementById('edit-goal-btn');
  const goalModal = document.getElementById('goal-modal');
  const closeGoalModal = document.getElementById('close-goal-modal');
  const cancelGoalModal = document.getElementById('cancel-goal-modal');
  const goalForm = document.getElementById('goal-form');
  const goalInput = document.getElementById('goal-input');

  function updateGoalWidget() {
    const finishedCount = appData.books.filter(b => b.status === 'Finished').length;
    const goal = Number(appData.goal) || 12;
    const percent = Math.min(100, Math.round((finishedCount / goal) * 100));

    goalText.textContent = `${finishedCount} / ${goal} books read`;
    goalProgressBar.style.width = `${percent}%`;
  }

  editGoalBtn.addEventListener('click', () => {
    goalInput.value = appData.goal;
    goalModal.classList.add('active');
  });

  function closeGoalModalFunc() {
    goalModal.classList.remove('active');
  }

  closeGoalModal.addEventListener('click', closeGoalModalFunc);
  cancelGoalModal.addEventListener('click', closeGoalModalFunc);

  goalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    appData.goal = parseInt(goalInput.value) || 12;
    saveData();
    updateGoalWidget();
    closeGoalModalFunc();
  });

  // Data Backup & Restore
  const exportBtn = document.getElementById('export-btn');
  const importFile = document.getElementById('import-file');
  const resetBtn = document.getElementById('reset-btn');

  exportBtn.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8,";
    const data = encodeURIComponent(JSON.stringify(appData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr + data);
    downloadAnchor.setAttribute("download", `zenshelf_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  importFile.addEventListener('change', (e) => {
    const fileReader = new FileReader();
    if (e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed && Array.isArray(parsed.books)) {
            appData = parsed;
            saveData();
            renderLibrary();
            renderSessions();
            renderQuotes();
            alert('Library backup successfully imported!');
          } else {
            alert('Invalid backup file format.');
          }
        } catch (err) {
          alert('Error parsing JSON file.');
        }
      };
    }
  });

  resetBtn.addEventListener('click', () => {
    if (confirm('WARNING: This will delete all books, sessions, and quotes. Are you absolutely sure?')) {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  });

  // Utility Escaping
  function escapeHTML(str) {
    return str ? String(str).replace(/[&<>'"/]/g, s => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
      '/': '&#x2F;'
    }[s])) : '';
  }

  // Initial Render
  loadData();
  renderLibrary();
  renderSessions();
  renderQuotes();
});
