// Load data from localStorage
function loadFromStorage(key, defaultValue) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error("Error loading from storage:", e);
    return defaultValue;
  }
}

const archive = loadFromStorage("archive", {});
const DAILY_CAL_GOAL = Number(localStorage.getItem("DAILY_CAL_GOAL")) || 2000;
const DAILY_PROTEIN_GOAL = Number(localStorage.getItem("DAILY_PROTEIN_GOAL")) || 150;

// Get elements
const logContainer = document.getElementById("logContainer");
const totalDaysEl = document.getElementById("totalDays");
const workoutDaysEl = document.getElementById("workoutDays");
const avgCaloriesEl = document.getElementById("avgCalories");
const avgProteinEl = document.getElementById("avgProtein");
const streakBanner = document.getElementById("streakBanner");
const exportBtn = document.getElementById("exportBtn");
const themeToggle = document.getElementById("themeToggle");

let currentFilter = 'all';
let expandedDay = null;

// Helper functions
function getDayKey(time) {
  const d = new Date(time);
  return d.toISOString().split('T')[0];
}

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

function getWeekday(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

function isThisWeek(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  return date >= weekAgo && date <= today;
}

function isThisMonth(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
}

function calculateStreak() {
  const sortedDates = Object.keys(archive).sort().reverse();
  if (sortedDates.length === 0) return 0;
  
  let streak = 0;
  const today = getDayKey(Date.now());
  let checkDate = new Date(today + 'T00:00:00');
  
  for (let i = 0; i < sortedDates.length; i++) {
    const dateToCheck = getDayKey(checkDate.getTime());
    
    if (sortedDates.includes(dateToCheck)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streak;
}

// Calculate stats
function calculateStats() {
  const dates = Object.keys(archive);
  const totalDays = dates.length;
  
  let totalCal = 0;
  let totalProtein = 0;
  let workoutDays = 0;
  
  dates.forEach(date => {
    const dayEntries = archive[date];
    const dayCal = dayEntries.reduce((sum, e) => sum + e.cal, 0);
    const dayProtein = dayEntries.reduce((sum, e) => sum + e.protein, 0);
    
    totalCal += dayCal;
    totalProtein += dayProtein;
    
    // Check if any entry had workout marked
    if (dayEntries.some(e => e.workout)) {
      workoutDays++;
    }
  });
  
  const avgCal = totalDays > 0 ? Math.round(totalCal / totalDays) : 0;
  const avgPro = totalDays > 0 ? Math.round(totalProtein / totalDays) : 0;
  
  return { totalDays, workoutDays, avgCal, avgPro };
}

// Display stats
function displayStats() {
  const stats = calculateStats();
  const streak = calculateStreak();
  
  totalDaysEl.textContent = stats.totalDays;
  workoutDaysEl.textContent = stats.workoutDays;
  avgCaloriesEl.textContent = stats.avgCal;
  avgProteinEl.textContent = stats.avgPro + 'g';
  
  // Streak banner
  if (streak > 0) {
    streakBanner.innerHTML = `
      <div class="streak-number">🔥 ${streak}</div>
      <div class="streak-label">Day${streak !== 1 ? 's' : ''} Streak!</div>
    `;
  } else {
    streakBanner.innerHTML = `
      <div class="streak-label">Start tracking to build your streak! 💪</div>
    `;
  }
}

// Filter days
function filterDays(dates) {
  if (currentFilter === 'all') return dates;
  if (currentFilter === 'week') return dates.filter(d => isThisWeek(d));
  if (currentFilter === 'month') return dates.filter(d => isThisMonth(d));
  if (currentFilter === 'workout') {
    return dates.filter(d => archive[d].some(e => e.workout));
  }
  return dates;
}

// Display log
function displayLog() {
  const dates = Object.keys(archive).sort().reverse();
  const filteredDates = filterDays(dates);
  
  if (filteredDates.length === 0) {
    logContainer.innerHTML = '<div class="no-data">No entries yet. Start tracking! 📝</div>';
    return;
  }
  
  logContainer.innerHTML = '';
  
  filteredDates.forEach(date => {
    const dayEntries = archive[date];
    const totalCal = dayEntries.reduce((sum, e) => sum + e.cal, 0);
    const totalProtein = dayEntries.reduce((sum, e) => sum + e.protein, 0);
    const hasWorkout = dayEntries.some(e => e.workout);
    
    const calStatus = totalCal >= DAILY_CAL_GOAL ? 'goal-met' : 'goal-not-met';
    const proteinStatus = totalProtein >= DAILY_PROTEIN_GOAL ? 'goal-met' : 'goal-not-met';
    
    const card = document.createElement('div');
    card.className = 'day-card';
    
    const isExpanded = expandedDay === date;
    
    card.innerHTML = `
      <div class="day-header">
        <div>
          <span class="day-date">${formatDate(date)}</span>
          <span class="day-weekday">${getWeekday(date)}</span>
        </div>
        <span class="workout-badge ${hasWorkout ? 'workout-yes' : 'workout-no'}">
          ${hasWorkout ? '✅ Workout' : '❌ No Workout'}
        </span>
      </div>
      
      <div class="day-stats">
        <div class="day-stat">
          <div class="day-stat-value ${calStatus}">${totalCal}</div>
          <div class="day-stat-label">Calories</div>
          <div class="day-stat-goal">Goal: ${DAILY_CAL_GOAL}</div>
        </div>
        <div class="day-stat">
          <div class="day-stat-value ${proteinStatus}">${totalProtein}g</div>
          <div class="day-stat-label">Protein</div>
          <div class="day-stat-goal">Goal: ${DAILY_PROTEIN_GOAL}g</div>
        </div>
        <div class="day-stat">
          <div class="day-stat-value">${dayEntries.length}</div>
          <div class="day-stat-label">Entries</div>
        </div>
      </div>
      
      <div class="entries-preview ${isExpanded ? 'expanded' : ''}">
        <strong>${isExpanded ? '▼' : '▶'} ${dayEntries.length} meal${dayEntries.length !== 1 ? 's' : ''}</strong>
        ${isExpanded ? generateEntriesHTML(dayEntries, date) : ''}
      </div>
    `;
    
    card.onclick = () => {
      if (expandedDay === date) {
        expandedDay = null;
      } else {
        expandedDay = date;
      }
      displayLog();
    };
    
    logContainer.appendChild(card);
  });
}

// Generate entries HTML
function generateEntriesHTML(entries, date) {
  return entries.map((entry, index) => {
    const time = new Date(entry.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    return `
      <div class="entry-item">
        <div>
          <span class="entry-time">${time}</span> - 
          ${entry.cal} cal, ${entry.protein}g protein
        </div>
        <button class="delete-entry-btn" onclick="deleteEntry('${date}', ${index})">×</button>
      </div>
    `;
  }).join('');
}

// Filter button handlers
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    expandedDay = null;
    displayLog();
  });
});

// Export data
exportBtn.onclick = () => {
  const data = {
    archive,
    goals: { 
      DAILY_CAL_GOAL, 
      DAILY_PROTEIN_GOAL 
    },
    stats: calculateStats(),
    exportDate: new Date().toISOString()
  };
  
  const dataStr = JSON.stringify(data, null, 2);
  const blob = new Blob([dataStr], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `macro-tracker-log-${getDayKey(Date.now())}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  alert("Log data exported successfully!");
};

// Delete individual entry from a past day
function deleteEntry(date, index) {
  if (!confirm("Delete this entry from the log?")) return;
  
  const updatedArchive = loadFromStorage("archive", {});
  
  if (updatedArchive[date]) {
    updatedArchive[date].splice(index, 1);
    
    // If no entries left for that day, remove the day entirely
    if (updatedArchive[date].length === 0) {
      delete updatedArchive[date];
    }
    
    try {
      localStorage.setItem("archive", JSON.stringify(updatedArchive));
      alert("Entry deleted!");
      location.reload(); // Refresh to show updated data
    } catch (e) {
      alert("Failed to delete entry.");
    }
  }
}

// Make deleteEntry available globally
window.deleteEntry = deleteEntry;

// Dark mode toggle
themeToggle.onclick = () => {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  themeToggle.textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('darkMode', isDark);
};

// Load dark mode preference
if (localStorage.getItem('darkMode') === 'true') {
  document.body.classList.add('dark-mode');
  themeToggle.textContent = '☀️';
}

// Initialize
displayStats();
displayLog();