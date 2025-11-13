// Safe localStorage wrapper
function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    alert("Failed to save data. Storage may be full or unavailable.");
    return false;
  }
}

function loadFromStorage(key, defaultValue) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error("Error loading from storage:", e);
    return defaultValue;
  }
}

// elements
const calInput = document.getElementById("calInput");
const proteinInput = document.getElementById("proteinInput");
const addBtn = document.getElementById("addBtn");
const setGoalBtn = document.getElementById("setGoalBtn");
const workoutCheck = document.getElementById("workoutCheck");
const addPresetBtn = document.getElementById("addPresetBtn");
const customPresetsDiv = document.getElementById("customPresets");
const themeToggle = document.getElementById("themeToggle");

const totalCalories = document.getElementById("totalCalories");
const totalProtein = document.getElementById("totalProtein");
const workoutStatus = document.getElementById("workoutStatus");
const entriesDiv = document.getElementById("entries");
const statsSummary = document.getElementById("statsSummary");
const netCalValue = document.getElementById("netCalValue");
const setBurnBtn = document.getElementById("setBurnBtn");

const calProgress = document.getElementById("calProgress");
const proteinProgress = document.getElementById("proteinProgress");

const undoNotification = document.getElementById("undoNotification");
const undoBtn = document.getElementById("undoBtn");

// default daily goals
let DAILY_CAL_GOAL = Number(localStorage.getItem("DAILY_CAL_GOAL")) || 2000;
let DAILY_PROTEIN_GOAL = Number(localStorage.getItem("DAILY_PROTEIN_GOAL")) || 150;
let DAILY_BURN = Number(localStorage.getItem("DAILY_BURN")) || 0;

// load saved data
let entries = loadFromStorage("entries", []);
let workoutDone = loadFromStorage("workoutDone", false);
let archive = loadFromStorage("archive", {});
let customPresets = loadFromStorage("customPresets", []);
let lastDeleted = null;
let undoTimeout = null;

// helper: get day key
function getDayKey(time) {
  const d = new Date(time);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

// check for new day and auto-archive
function checkNewDay() {
  const lastCheck = localStorage.getItem("lastCheckDate");
  const today = getDayKey(Date.now());
  
  if (lastCheck && lastCheck !== today && entries.length > 0) {
    // Auto-archive yesterday's data
    archive[lastCheck] = entries.map(e => ({...e}));
    saveToStorage("archive", archive);
    entries = [];
    workoutDone = false;
    saveToStorage("entries", entries);
    saveToStorage("workoutDone", workoutDone);
    
    // Show notification
    setTimeout(() => {
      alert(`✅ Yesterday's data archived!\n\nStarted fresh for ${formatDateShort(today)}`);
    }, 500);
  }
  
  localStorage.setItem("lastCheckDate", today);
}

// Format date nicely
function formatDateShort(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// render custom presets
function renderPresets() {
  customPresetsDiv.innerHTML = '';
  
  if (customPresets.length === 0) {
    customPresetsDiv.innerHTML = '<p style="color: #999; font-size: 14px;">No presets yet. Create one!</p>';
    return;
  }
  
  customPresets.forEach((preset, index) => {
    const btn = document.createElement('button');
    btn.className = 'quick-add-btn';
    btn.innerHTML = `${preset.name} (${preset.cal}cal, ${preset.protein}g) <span class="delete-preset">×</span>`;
    
    btn.onclick = (e) => {
      if (e.target.classList.contains('delete-preset')) {
        if (confirm(`Delete preset "${preset.name}"?`)) {
          customPresets.splice(index, 1);
          saveToStorage("customPresets", customPresets);
          renderPresets();
        }
      } else {
        quickAdd(preset.cal, preset.protein);
      }
    };
    
    customPresetsDiv.appendChild(btn);
  });
}

// add new preset
addPresetBtn.onclick = () => {
  const name = prompt("Enter preset name (e.g., 'My Protein Shake'):");
  if (!name || name.trim() === '') return;
  
  const cal = prompt("Enter calories for this preset:");
  if (cal === null) return;
  
  const protein = prompt("Enter protein (g) for this preset:");
  if (protein === null) return;
  
  const calNum = Number(cal);
  const proteinNum = Number(protein);
  
  if (isNaN(calNum) || isNaN(proteinNum) || calNum < 0 || proteinNum < 0) {
    alert("Please enter valid positive numbers.");
    return;
  }
  
  customPresets.push({
    name: name.trim(),
    cal: calNum,
    protein: proteinNum
  });
  
  saveToStorage("customPresets", customPresets);
  renderPresets();
  alert(`Preset "${name}" created!`);
};

// update display
function updateDisplay() {
  const totalCal = entries.reduce((sum, e) => sum + e.cal, 0);
  const totalPro = entries.reduce((sum, e) => sum + e.protein, 0);

  totalCalories.textContent = `Calories: ${totalCal} / ${DAILY_CAL_GOAL}`;
  totalProtein.textContent = `Protein: ${totalPro}g / ${DAILY_PROTEIN_GOAL}g`;
  workoutStatus.textContent = `Workout: ${workoutDone ? '✅' : '❌'}`;
  
  // Net calories
  const netCal = totalCal - DAILY_BURN;
  netCalValue.textContent = `${netCal} (${totalCal} - ${DAILY_BURN} burned)`;
  netCalValue.style.color = netCal > 0 ? '#4CAF50' : '#e74c3c';

  // Progress bars with color coding
  const calPercent = Math.min((totalCal / DAILY_CAL_GOAL) * 100, 100);
  const proteinPercent = Math.min((totalPro / DAILY_PROTEIN_GOAL) * 100, 100);
  
  calProgress.style.width = calPercent + '%';
  proteinProgress.style.width = proteinPercent + '%';

  // Color coding for progress
  calProgress.className = 'progress-bar';
  if (totalCal >= DAILY_CAL_GOAL) calProgress.classList.add('exceeded');
  else if (totalCal >= DAILY_CAL_GOAL * 0.8) calProgress.classList.add('warning');

  proteinProgress.className = 'progress-bar';
  if (totalPro >= DAILY_PROTEIN_GOAL) proteinProgress.classList.add('exceeded');
  else if (totalPro >= DAILY_PROTEIN_GOAL * 0.8) proteinProgress.classList.add('warning');

  workoutCheck.checked = workoutDone;

  // Stats summary
  const remainingCal = DAILY_CAL_GOAL - totalCal;
  const remainingProtein = DAILY_PROTEIN_GOAL - totalPro;
  
  let summaryHTML = '';
  if (remainingCal > 0) {
    summaryHTML += `<div class="positive">🎯 ${remainingCal} calories remaining</div>`;
  } else if (remainingCal < 0) {
    summaryHTML += `<div class="negative">⚠️ ${Math.abs(remainingCal)} calories over goal</div>`;
  } else {
    summaryHTML += `<div class="positive">✅ Calorie goal met!</div>`;
  }
  
  if (remainingProtein > 0) {
    summaryHTML += `<div class="positive">🎯 ${remainingProtein}g protein remaining</div>`;
  } else if (remainingProtein < 0) {
    summaryHTML += `<div class="positive">💪 ${Math.abs(remainingProtein)}g over protein goal!</div>`;
  } else {
    summaryHTML += `<div class="positive">✅ Protein goal met!</div>`;
  }
  
  statsSummary.innerHTML = summaryHTML;

  // display entries
  entriesDiv.innerHTML = '';
  entries.forEach((e, i) => {
    const entryDiv = document.createElement('div');
    entryDiv.className = 'entry';
    const time = new Date(e.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    entryDiv.innerHTML = `<span>${e.cal} cal | ${e.protein}g | ${time}</span>`;
    
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'entry-buttons';
    
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.className = 'editBtn';
    editBtn.onclick = () => editEntry(i);
    
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.className = 'deleteBtn';
    delBtn.onclick = () => deleteEntry(i);
    
    buttonsDiv.appendChild(editBtn);
    buttonsDiv.appendChild(delBtn);
    entryDiv.appendChild(buttonsDiv);
    entriesDiv.appendChild(entryDiv);
  });
}

// quick add function
function quickAdd(cal, protein) {
  entries.push({ cal, protein, time: Date.now(), workout: workoutCheck.checked });
  saveToStorage("entries", entries);
  updateDisplay();
}

// add entry
addBtn.onclick = () => {
  const cal = Number(calInput.value);
  const protein = Number(proteinInput.value);

  // Better validation
  if (isNaN(cal) || isNaN(protein)) {
    alert("Please enter valid numbers for calories and protein.");
    return;
  }

  if (cal < 0 || protein < 0) {
    alert("Please enter positive values for calories and protein.");
    return;
  }

  if (cal === 0 && protein === 0) {
    alert("Please enter at least calories or protein values.");
    return;
  }

  entries.push({ cal, protein, time: Date.now(), workout: workoutCheck.checked });
  saveToStorage("entries", entries);

  calInput.value = '';
  proteinInput.value = '';

  updateDisplay();
};

// edit entry
function editEntry(index) {
  const entry = entries[index];
  calInput.value = entry.cal;
  proteinInput.value = entry.protein;
  workoutCheck.checked = entry.workout || false;
  
  // Remove the entry so user can add it back with new values
  entries.splice(index, 1);
  saveToStorage("entries", entries);
  updateDisplay();
  
  // Focus on first input
  calInput.focus();
}

// delete individual entry with undo
function deleteEntry(index) {
  lastDeleted = { entry: {...entries[index]}, index };
  entries.splice(index, 1);
  saveToStorage("entries", entries);
  updateDisplay();
  showUndoNotification();
}

// show undo notification
function showUndoNotification() {
  undoNotification.style.display = 'block';
  
  // Clear existing timeout
  if (undoTimeout) clearTimeout(undoTimeout);
  
  // Auto-hide after 5 seconds
  undoTimeout = setTimeout(() => {
    undoNotification.style.display = 'none';
    lastDeleted = null;
  }, 5000);
}

// undo delete
undoBtn.onclick = () => {
  if (lastDeleted) {
    entries.splice(lastDeleted.index, 0, lastDeleted.entry);
    saveToStorage("entries", entries);
    updateDisplay();
    undoNotification.style.display = 'none';
    lastDeleted = null;
    if (undoTimeout) clearTimeout(undoTimeout);
  }
};

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

// reset day and archive with better confirmation
/*
// REMOVED - Auto archives at midnight now
resetBtn.onclick = () => {
  const totalCal = entries.reduce((sum, e) => sum + e.cal, 0);
  const totalPro = entries.reduce((sum, e) => sum + e.protein, 0);
  
  if(confirm(`Reset today's data?\n\nCalories: ${totalCal}\nProtein: ${totalPro}g\nWorkout: ${workoutDone ? 'Yes' : 'No'}\n\nThis will archive the data.`)) {
    const todayKey = getDayKey(Date.now());
    if(entries.length > 0) {
      archive[todayKey] = entries.map(e => ({...e}));
      saveToStorage("archive", archive);
    }
    entries = [];
    workoutDone = false;
    saveToStorage("entries", entries);
    saveToStorage("workoutDone", workoutDone);
    updateDisplay();
  }
};
*/

// workout toggle
workoutCheck.onchange = () => {
  workoutDone = workoutCheck.checked;
  saveToStorage("workoutDone", workoutDone);
  updateDisplay();
};

// set daily goals
setGoalBtn.onclick = () => {
  const calGoal = prompt("Enter your daily calorie goal:", DAILY_CAL_GOAL);
  if (calGoal === null) return; // User cancelled
  
  const proteinGoal = prompt("Enter your daily protein goal:", DAILY_PROTEIN_GOAL);
  if (proteinGoal === null) return; // User cancelled

  const calNum = Number(calGoal);
  const proteinNum = Number(proteinGoal);

  if(isNaN(calNum) || isNaN(proteinNum) || calNum <= 0 || proteinNum <= 0) {
    alert("Please enter valid positive numbers for both goals.");
    return;
  }

  DAILY_CAL_GOAL = calNum;
  DAILY_PROTEIN_GOAL = proteinNum;
  localStorage.setItem("DAILY_CAL_GOAL", DAILY_CAL_GOAL);
  localStorage.setItem("DAILY_PROTEIN_GOAL", DAILY_PROTEIN_GOAL);
  updateDisplay();
  alert(`Goals updated!\nCalories: ${DAILY_CAL_GOAL}\nProtein: ${DAILY_PROTEIN_GOAL}g`);
};

// set daily burn
setBurnBtn.onclick = () => {
  const burn = prompt("Enter calories you burn per day (exercise + metabolism):", DAILY_BURN);
  if (burn === null) return;
  
  const burnNum = Number(burn);
  if (isNaN(burnNum) || burnNum < 0) {
    alert("Please enter a valid positive number.");
    return;
  }
  
  DAILY_BURN = burnNum;
  localStorage.setItem("DAILY_BURN", DAILY_BURN);
  updateDisplay();
  alert(`Daily burn set to ${DAILY_BURN} calories!`);
};

// Allow Enter key to add entry
calInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    proteinInput.focus();
  }
});

proteinInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addBtn.click();
  }
});

// Initialize
checkNewDay();
renderPresets();
updateDisplay();