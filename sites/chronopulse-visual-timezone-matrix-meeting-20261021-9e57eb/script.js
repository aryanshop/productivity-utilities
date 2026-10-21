const POPULAR_TIMEZONES = [
    { city: 'UTC', zone: 'UTC', country: 'Coordinated Universal Time' },
    { city: 'San Francisco', zone: 'America/Los_Angeles', country: 'United States' },
    { city: 'New York', zone: 'America/New_York', country: 'United States' },
    { city: 'Sao Paulo', zone: 'America/Sao_Paulo', country: 'Brazil' },
    { city: 'London', zone: 'Europe/London', country: 'United Kingdom' },
    { city: 'Berlin', zone: 'Europe/Berlin', country: 'Germany' },
    { city: 'Paris', zone: 'Europe/Paris', country: 'France' },
    { city: 'Cairo', zone: 'Africa/Cairo', country: 'Egypt' },
    { city: 'Dubai', zone: 'Asia/Dubai', country: 'United Arab Emirates' },
    { city: 'Mumbai', zone: 'Asia/Kolkata', country: 'India' },
    { city: 'Singapore', zone: 'Asia/Singapore', country: 'Singapore' },
    { city: 'Tokyo', zone: 'Asia/Tokyo', country: 'Japan' },
    { city: 'Sydney', zone: 'Australia/Sydney', country: 'Australia' },
    { city: 'Auckland', zone: 'Pacific/Auckland', country: 'New Zealand' }
];

// Default active timezones
let activeTimezones = [
    'America/San_Francisco',
    'America/New_York',
    'Europe/London',
    'Asia/Tokyo'
];

// DOM Elements
const timezoneSelect = document.getElementById('timezone-select');
const globalTimeSlider = document.getElementById('global-time-slider');
const targetTimeDisplay = document.getElementById('target-time-display');
const targetDateDisplay = document.getElementById('target-date-display');
const timezoneMatrix = document.getElementById('timezone-matrix');
const overlapResults = document.getElementById('overlap-results');
const btnResetNow = document.getElementById('btn-reset-now');
const btnClearAll = document.getElementById('btn-clear-all');

// State variables
let sliderMinutes = 540; // Default 09:00 in minutes from midnight
let isLiveSync = true;   // Whether the slider is tracking real-time 'now'

// Initialize application
function init() {
    populateDropdown();
    setupEventListeners();
    syncSliderToCurrentTime();
    updateApp();
}

function populateDropdown() {
    POPULAR_TIMEZONES.forEach(item => {
        // Normalize zone identifiers if needed
        let tzVal = item.zone;
        if (tzVal === 'America/Los_Angeles') tzVal = 'America/San_Francisco';
        
        const option = document.createElement('option');
        option.value = item.zone;
        option.textContent = `${item.city} (${item.zone}) - ${item.country}`;
        timezoneSelect.appendChild(option);
    });
}

function setupEventListeners() {
    timezoneSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (!val) return;
        if (!activeTimezones.includes(val)) {
            activeTimezones.push(val);
            updateApp();
        }
        timezoneSelect.value = '';
    });

    globalTimeSlider.addEventListener('input', (e) => {
        isLiveSync = false;
        sliderMinutes = parseInt(e.target.value, 10);
        updateApp();
    });

    btnResetNow.addEventListener('click', () => {
        isLiveSync = true;
        syncSliderToCurrentTime();
        updateApp();
    });

    btnClearAll.addEventListener('click', () => {
        activeTimezones = [];
        updateApp();
    });
}

function syncSliderToCurrentTime() {
    const now = new Date();
    sliderMinutes = now.getHours() * 60 + now.getMinutes();
    globalTimeSlider.value = sliderMinutes;
}

// Compute reference date for the slider based on user's local timezone
function getReferenceDateForSlider() {
    const now = new Date();
    const refDate = new Date(now);
    // Construct a base date set to midnight local time, then add sliderMinutes
    refDate.setHours(0, 0, 0, 0);
    refDate.setMinutes(sliderMinutes);
    return refDate;
}

function updateApp() {
    if (isLiveSync) {
        syncSliderToCurrentTime();
    }

    const refDate = getReferenceDateForSlider();
    
    // Update top target display
    const hoursStr = String(Math.floor(sliderMinutes / 60)).padStart(2, '0');
    const minsStr = String(sliderMinutes % 60).padStart(2, '0');
    targetTimeDisplay.textContent = `${hoursStr}:${minsStr}`;
    targetDateDisplay.textContent = refDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

    renderMatrix(refDate);
    calculateOverlaps();
}

function renderMatrix(refDate) {
    timezoneMatrix.innerHTML = '';

    if (activeTimezones.length === 0) {
        timezoneMatrix.innerHTML = '<div class="card"><p class="placeholder-text">No timezones selected. Use the dropdown above to add cities.</p></div>';
        return;
    }

    activeTimezones.forEach(tz => {
        const card = document.createElement('div');
        card.className = 'tz-card';

        // Format time for this specific timezone based on refDate
        const optionsTime = { timeZone: tz, hour: 'numeric', minute: 'numeric', hour12: false };
        const formatterTime = new Intl.DateTimeFormat('en-US', optionsTime);
        
        // Get exact time components in target tz
        const timeParts = formatterTime.formatToParts(refDate);
        let tzHour = 0;
        let tzMinute = 0;
        timeParts.forEach(p => {
            if (p.type === 'hour') tzHour = parseInt(p.value, 10);
            if (p.type === 'minute') tzMinute = parseInt(p.value, 10);
        });

        const tzTotalMinutes = tzHour * 60 + tzMinute;

        // Format date and offset
        const optionsDate = { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' };
        const dateStr = new Intl.DateTimeFormat('en-US', optionsDate).format(refDate);
        
        // Compute offset string
        const offsetStr = getTzOffsetString(refDate, tz);

        // Extract clean city name
        const cityName = tz.includes('/') ? tz.split('/')[1].replace(/_/g, ' ') : tz;

        // Mini 24h bar representation
        let miniBarHtml = '<div class="tz-hours-mini-bar">';
        for (let h = 0; h < 24; h++) {
            // Check if hour h in this timezone is working hour (9 AM - 6 PM)
            const isWork = h >= 9 && h < 18;
            const isCurrentHour = (h === tzHour);
            
            let classList = 'mini-hour-block';
            if (isWork) classList += ' is-work';
            if (isCurrentHour) classList += ' is-current';
            
            miniBarHtml += `<div class="${classList}" title="${String(h).padStart(2, '0')}:00"></div>`;
        }
        miniBarHtml += '</div>';

        card.innerHTML = `
            <div class="tz-info">
                <span class="tz-city">${cityName}</span>
                <span class="tz-country">${tz}</span>
                <span class="tz-offset">${offsetStr}</span>
            </div>
            <div class="tz-clock-display">
                <span class="tz-time">${hoursToFormattedString(tzHour, tzMinute)}</span>
                <span class="tz-date-diff">${dateStr}</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-end;">
                ${miniBarHtml}
                <button class="btn-remove" onclick="removeTimezone('${tz}')" title="Remove timezone">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
        `;

        timezoneMatrix.appendChild(card);
    });
}

function hoursToFormattedString(h, m) {
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    return `${hh}:${mm}`;
}

function getTzOffsetString(date, timeZone) {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone }));
    const diffMins = (tzDate - utcDate) / (1000 * 60);
    const absMins = Math.abs(diffMins);
    const hrs = Math.floor(absMins / 60);
    const mins = absMins % 60;
    const sign = diffMins >= 0 ? '+' : '-';
    return `UTC ${sign}${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

window.removeTimezone = function(tz) {
    activeTimezones = activeTimezones.filter(item => item !== tz);
    updateApp();
};

function calculateOverlaps() {
    if (activeTimezones.length < 2) {
        overlapResults.innerHTML = '<p class="placeholder-text">Add at least two timezones to calculate overlapping meeting windows.</p>';
        return;
    }

    // Test all 24 hours (in 1-hour increments) of the reference date
    const baseRef = getReferenceDateForSlider();
    let validWindows = [];
    
    // Scan 24 hours
    for (let hour = 0; hour < 24; hour++) {
        let testDate = new Date(baseRef);
        testDate.setHours(hour, 0, 0, 0);
        
        let allWorking = true;
        
        for (const tz of activeTimezones) {
            const options = { timeZone: tz, hour: 'numeric', hour12: false };
            const formatter = new Intl.DateTimeFormat('en-US', options);
            const tzHour = parseInt(formatter.format(testDate), 10);
            
            // Working hours defined as 9 AM (9) to 6 PM (18)
            if (tzHour < 9 || tzHour >= 18) {
                allWorking = false;
                break;
            }
        }
        
        if (allWorking) {
            validWindows.push(hour);
        }
    }

    if (validWindows.length === 0) {
        overlapResults.innerHTML = '<div class="no-overlap">No common working hour window (09:00 - 18:00) found for all selected locations simultaneously.</div>';
        return;
    }n
    // Group continuous hours into ranges
    let ranges = [];
    let start = validWindows[0];
    let prev = start;
    
    for (let i = 1; i < validWindows.length; i++) {
        if (validWindows[i] === prev + 1) {
            prev = validWindows[i];
        } else {
            ranges.push({ start: start, end: prev + 1 });
            start = validWindows[i];
            prev = start;
        }
    }
    ranges.push({ start: start, end: prev + 1 });

    overlapResults.innerHTML = '';
    ranges.forEach(range => {
        const startStr = `${String(range.start).padStart(2, '0')}:00`;
        const endStr = `${String(range.end % 24).padStart(2, '0')}:00`;
        
        // Convert the reference range to local time or first timezone view for clarity
        const badge = document.createElement('div');
        badge.className = 'overlap-badge';
        badge.innerHTML = `
            <span>Optimal Window Found</span>
            <span class="overlap-time">${startStr} &ndash; ${endStr} <span style="font-size:0.8rem; font-weight:normal; color: var(--text-secondary);">(User Reference Time)</span></span>
        `;
        overlapResults.appendChild(badge);
    });
}

// Run initialization on load
window.addEventListener('DOMContentLoaded', init);
