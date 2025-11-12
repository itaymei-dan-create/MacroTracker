// elements
const calInput = document.getElementById("calInput");
const proteinInput = document.getElementById("proteinInput");
const addBtn = document.getElementById("addBtn");
const resetBtn = document.getElementById("resetBtn");
const workoutCheck = document.getElementById("workoutCheck");

const totalCalories = document.getElementById("totalCalories");
const totalProtein = document.getElementById("totalProtein");
const workoutStatus = document.getElementById("workoutStatus");
const entriesContainer = document.getElementById("entriesContainer");

const calProgress = document.getElementById("calProgress");
const proteinProgress = document.getElementById("proteinProgress");

// plus/minus buttons
document.getElementById("calPlus").onclick = () => calInput.stepUp();
document.getElementById("calMinus").onclick = () => calInput.stepDown();
document.getElementById("proPlus").onclick = () => proteinInput.stepUp();
document.getElementById("proMinus").onclick = () => proteinInput.stepDown();

// daily goals
const DAILY_CAL_GOAL = 2000;
const DAILY_PROTEIN_GOAL = 150;

// load saved data
let entries = JSON.parse(localStorage.getItem("entries")) || [];
let workoutDone = JSON.parse(localStorage.getItem("workoutDone")) || false;
let archive = JSON.parse(localStorage.getItem("archive")) || {};

// get day key
function getDayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

// update display
function updateDisplay() {
  const todayKey = getDayKey(Date.now());
  const todayEntries = entries.filter(e => getDayKey(e.time) === todayKey);

  const totalCal = todayEntries.reduce((sum, e) => sum + e.cal, 0);
  const totalPro = todayEntries.reduce((sum, e) => sum + e.protein, 0);

  totalCalories.textContent = `Calories: ${totalCal}`;
  totalProtein.textContent = `Protein: ${totalPro}g`;
  workoutStatus.textContent = `Workout: ${workoutDone ? '✅' : '❌'}`;

  calProgress.style.width = Math.min((totalCal / DAILY_CAL_GOAL) * 100, 100) + '%';
  proteinProgress.style.width = Math.min((totalPro / DAILY_PROTEIN_GOAL) * 100, 100) + '%';
  workoutCheck.checked = workoutDone;

  // combine archive + today entries for log
  const allDays = { ...archive };
  if (todayEntries.length > 0) allDays[todayKey] = todayEntries;

  entriesContainer.innerHTML = '';
  Object.keys(allDays).sort((a, b) => new Date(b) - new Date(a)).forEach(day => {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'day-group';

    const dayEntries = allDays[day];
    const dayCal = dayEntries.reduce((sum, e) => sum + e.cal, 0);
    const dayPro = dayEntries.reduce((sum, e) => sum + e.protein, 0);
    const dayWorkout = dayEntries.some(e => e.workout);

    const dayTitle = document.createElement('div');
    dayTitle.className = 'day-title';
    dayTitle.textContent = `${day} | Calories: ${dayCal} | Protein: ${dayPro}g | Workout: ${dayWorkout ? '✅' : '❌'}`;
    
    const dayContent = document.createElement('div');
    dayContent.className = 'day-entries';
    dayContent.style.display = 'none';
    dayTitle.onclick = () => { dayContent.style.display = dayContent.style.display === 'none' ? 'block' : 'none'; };

    dayEntries.forEach(e => {
      const entryDiv = document.createElement('div');
      entryDiv.className = 'entry';
      const time = new Date(e.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      entryDiv.innerHTML = `<span>${e.cal} cal | ${e.protein}g | ${time}</span>`;
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.className = 'deleteBtn';
      delBtn.onclick = () => deleteEntry(entries.indexOf(e));
      entryDiv.appendChild(delBtn);
      dayContent.appendChild(entryDiv);
    });

    dayDiv.appendChild(dayContent);
    entriesContainer.appendChild(dayDiv);
  });
}

// add entry
addBtn.onclick = () => {
  const cal = Number(calInput.value);
  const protein = Number(proteinInput.value);
  if (cal < 0 || protein < 0) { alert("Enter positive numbers."); return; }
  if (!cal && !protein) return;

  entries.push({ cal, protein, time: Date.now(), workout: workoutCheck.checked });
  localStorage.setItem("entries", JSON.stringify(entries));
  calInput.value = '';
  proteinInput.value = '';
  updateDisplay();
};

// delete entry
function deleteEntry(index) {
  entries.splice(index, 1);
  localStorage.setItem("entries", JSON.stringify(entries));
  updateDisplay();
}

// reset day and archive
resetBtn.onclick = () => {
  if (confirm("Reset today's entries?")) {
    const todayKey = getDayKey(Date.now());
    const todayEntries = entries.filter(e => getDayKey(e.time) === todayKey);
    if (todayEntries.length > 0) {
      archive[todayKey] = todayEntries;
      localStorage.setItem("archive", JSON.stringify(archive));
    }
    // clear today
    entries = entries.filter(e => getDayKey(e.time) !== todayKey);
    workoutDone = false;
    localStorage.setItem("entries", JSON.stringify(entries));
    localStorage.setItem("workoutDone", JSON.stringify(workoutDone));
    updateDisplay();
  }
};

// workout toggle
workoutCheck.onchange = () => {
  workoutDone = workoutCheck.checked;
  localStorage.setItem("workoutDone", JSON.stringify(workoutDone));
  updateDisplay();
};

// initial display
updateDisplay();
