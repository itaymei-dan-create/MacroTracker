// elements
const calInput = document.getElementById("calInput");
const proteinInput = document.getElementById("proteinInput");
const addBtn = document.getElementById("addBtn");
const resetBtn = document.getElementById("resetBtn");
const setGoalBtn = document.getElementById("setGoalBtn");
const workoutCheck = document.getElementById("workoutCheck");

const totalCalories = document.getElementById("totalCalories");
const totalProtein = document.getElementById("totalProtein");
const workoutStatus = document.getElementById("workoutStatus");
const entriesDiv = document.getElementById("entries");

const calProgress = document.getElementById("calProgress");
const proteinProgress = document.getElementById("proteinProgress");

// default daily goals
let DAILY_CAL_GOAL = Number(localStorage.getItem("DAILY_CAL_GOAL")) || 2000;
let DAILY_PROTEIN_GOAL = Number(localStorage.getItem("DAILY_PROTEIN_GOAL")) || 150;

// load saved data
let entries = JSON.parse(localStorage.getItem("entries")) || [];
let workoutDone = JSON.parse(localStorage.getItem("workoutDone")) || false;
let archive = JSON.parse(localStorage.getItem("archive")) || {};

// helper: get day key
function getDayKey(time) {
  const d = new Date(time);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

// update display
function updateDisplay() {
  const totalCal = entries.reduce((sum, e) => sum + e.cal, 0);
  const totalPro = entries.reduce((sum, e) => sum + e.protein, 0);

  totalCalories.textContent = `Calories: ${totalCal} / ${DAILY_CAL_GOAL}`;
  totalProtein.textContent = `Protein: ${totalPro}g / ${DAILY_PROTEIN_GOAL}g`;
  workoutStatus.textContent = `Workout: ${workoutDone ? '✅' : '❌'}`;

  calProgress.style.width = Math.min((totalCal / DAILY_CAL_GOAL) * 100, 100) + '%';
  proteinProgress.style.width = Math.min((totalPro / DAILY_PROTEIN_GOAL) * 100, 100) + '%';

  workoutCheck.checked = workoutDone;

  // display entries
  entriesDiv.innerHTML = '';
  entries.forEach((e, i) => {
    const entryDiv = document.createElement('div');
    entryDiv.className = 'entry';
    const time = new Date(e.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    entryDiv.innerHTML = `<span>${e.cal} cal | ${e.protein}g | ${time}</span>`;
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.className = 'deleteBtn';
    delBtn.onclick = () => deleteEntry(i);
    entryDiv.appendChild(delBtn);
    entriesDiv.appendChild(entryDiv);
  });
}

// add entry
addBtn.onclick = () => {
  const cal = Number(calInput.value);
  const protein = Number(proteinInput.value);

  if (!cal && cal !== 0 || !protein && protein !== 0 || cal < 0 || protein < 0) {
    alert("Please enter positive values for calories and protein.");
    return;
  }

  entries.push({ cal, protein, time: Date.now(), workout: workoutCheck.checked });
  localStorage.setItem("entries", JSON.stringify(entries));

  calInput.value = '';
  proteinInput.value = '';

  updateDisplay();
};

// delete individual entry
function deleteEntry(index) {
  entries.splice(index, 1);
  localStorage.setItem("entries", JSON.stringify(entries));
  updateDisplay();
}

// reset day and archive
resetBtn.onclick = () => {
  if(confirm("Reset today's entries?")) {
    const todayKey = getDayKey(Date.now());
    if(entries.length > 0) {
      archive[todayKey] = entries.map(e => ({...e})); // copy current entries
      localStorage.setItem("archive", JSON.stringify(archive));
    }
    entries = [];
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

// set daily goals
setGoalBtn.onclick = () => {
  const calGoal = prompt("Enter your daily calorie goal:", DAILY_CAL_GOAL);
  const proteinGoal = prompt("Enter your daily protein goal:", DAILY_PROTEIN_GOAL);

  if(calGoal && proteinGoal && Number(calGoal) > 0 && Number(proteinGoal) > 0) {
    DAILY_CAL_GOAL = Number(calGoal);
    DAILY_PROTEIN_GOAL = Number(proteinGoal);
    localStorage.setItem("DAILY_CAL_GOAL", DAILY_CAL_GOAL);
    localStorage.setItem("DAILY_PROTEIN_GOAL", DAILY_PROTEIN_GOAL);
    updateDisplay();
  } else {
    alert("Please enter valid positive numbers for both goals.");
  }
};

// initial display
updateDisplay();
