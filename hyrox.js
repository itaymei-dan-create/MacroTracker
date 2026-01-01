// ===== CONFIGURATION =====
const STATIONS = ["Sled", "SkiErg", "Row", "Burpee", "WallBall"];
const STORAGE_KEY = "hyrox_combos";
const THEME_KEY = "hyrox_theme";

// ===== STATE =====
let combos = [];
let currentFilter = "all";

// ===== INITIALIZATION =====
function init() {
    loadData();
    if (combos.length === 0) {
        generateCombos();
    }
    setupEventListeners();
    loadTheme();
    render();
    updateComboCount();
}

// ===== DATA MANAGEMENT =====
function generateCombos() {
    combos = [];
    for (let i = 0; i < STATIONS.length; i++) {
        for (let j = 0; j < STATIONS.length; j++) {
            if (i !== j) {
                combos.push({
                    id: `${STATIONS[i]}-${STATIONS[j]}`,
                    station1: STATIONS[i],
                    station2: STATIONS[j],
                    completed: false,
                    times: [],
                    createdAt: Date.now()
                });
            }
        }
    }
    saveData();
}

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(combos));
        return true;
    } catch (e) {
        console.error("Failed to save data:", e);
        showToast("Failed to save data. Storage may be full.");
        return false;
    }
}

function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            combos = JSON.parse(saved);
            // Migrate old data if needed
            combos.forEach(combo => {
                if (!combo.id) {
                    combo.id = `${combo.station1}-${combo.station2}`;
                }
                if (!combo.createdAt) {
                    combo.createdAt = Date.now();
                }
            });
        }
    } catch (e) {
        console.error("Error loading data:", e);
        showToast("Error loading saved data.");
    }
}

// ===== THEME MANAGEMENT =====
function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.classList.add('dark-mode');
        updateThemeToggle(true);
    }
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    updateThemeToggle(isDark);
    showToast(`${isDark ? 'Dark' : 'Light'} mode enabled`);
}

function updateThemeToggle(isDark) {
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
        toggle.textContent = isDark ? '☀️' : '🌙';
        toggle.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
    }
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Filter buttons
    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const newFilter = e.currentTarget.dataset.filter;
            if (newFilter === currentFilter) return;
            
            // Update active state
            document.querySelectorAll('.btn-filter').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
            e.currentTarget.classList.add('active');
            e.currentTarget.setAttribute('aria-pressed', 'true');
            
            currentFilter = newFilter;
            render();
            updateComboCount();
        });
    });

    // Reset button
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', handleReset);
    }

    // Export button
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', handleExport);
    }

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Handle Enter key on inputs
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.classList.contains('time-input')) {
            const comboId = e.target.id.replace('input-', '');
            addTime(comboId);
        }
    });
}

// ===== STATISTICS =====
function calculateStats(times) {
    if (times.length === 0) return null;
    
    const sorted = [...times].sort((a, b) => a - b);
    const fastest = sorted[0];
    const slowest = sorted[sorted.length - 1];
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    
    // Calculate improvement if there are at least 2 times
    let improvement = null;
    if (times.length >= 2) {
        const firstTime = times[0];
        const lastTime = times[times.length - 1];
        improvement = ((firstTime - lastTime) / firstTime) * 100;
    }
    
    return { fastest, slowest, avg, improvement, count: times.length };
}

function updateComboCount() {
    const filteredCombos = getFilteredCombos();
    const countEl = document.getElementById('combo-count');
    if (countEl) {
        countEl.textContent = `Showing ${filteredCombos.length} of ${combos.length} combos`;
    }
}

// ===== FILTERING =====
function getFilteredCombos() {
    return combos.filter(combo => {
        if (currentFilter === 'all') return true;
        if (currentFilter === 'pending') return !combo.completed;
        if (currentFilter === 'completed') return combo.completed;
        return true;
    });
}

// ===== RENDERING =====
function render() {
    const grid = document.getElementById('combo-grid');
    if (!grid) return;

    const filteredCombos = getFilteredCombos();

    // Update overall stats
    const completedCount = combos.filter(c => c.completed).length;
    const totalTime = combos.reduce((sum, combo) => {
        const stats = calculateStats(combo.times);
        return sum + (stats ? stats.avg : 0);
    }, 0);
    const completionPercent = combos.length > 0 
        ? Math.round((completedCount / combos.length) * 100) 
        : 0;

    updateElement('total-combos', combos.length);
    updateElement('completed-combos', completedCount);
    updateElement('total-time', totalTime.toFixed(1));
    updateElement('completion-percent', `${completionPercent}%`);

    // Render combo cards
    if (filteredCombos.length === 0) {
        grid.innerHTML = '<div class="empty-state">No combos match this filter. Try selecting a different filter.</div>';
        return;
    }

    grid.innerHTML = filteredCombos.map((combo, index) => {
        const stats = calculateStats(combo.times);
        const statsText = stats 
            ? `Fastest: ${stats.fastest.toFixed(1)}min | Slowest: ${stats.slowest.toFixed(1)}min | Avg: ${stats.avg.toFixed(1)}min | Attempts: ${stats.count}`
            : 'No times recorded yet. Add your first time!';

        const timesBadges = combo.times.map((time, idx) => 
            `<span class="time-badge" title="Attempt ${idx + 1}">
                ${time.toFixed(1)}min 
                <span class="remove" onclick="removeTime('${combo.id}', ${idx})" role="button" aria-label="Remove time" tabindex="0">×</span>
            </span>`
        ).join('');

        return `
            <div class="combo-card ${combo.completed ? 'completed' : ''}" style="--index: ${index}">
                <div class="checkbox-wrapper">
                    <input 
                        type="checkbox" 
                        ${combo.completed ? 'checked' : ''} 
                        onchange="toggleComplete('${combo.id}')"
                        aria-label="Mark ${combo.station1} + ${combo.station2} as completed"
                        id="check-${combo.id}">
                </div>
                
                <div class="combo-info">
                    <label for="check-${combo.id}" class="combo-title">
                        ${combo.station1} + ${combo.station2}
                    </label>
                    <div class="combo-stats">${statsText}</div>
                    ${combo.times.length > 0 ? `<div class="times-list">${timesBadges}</div>` : ''}
                </div>
                
                <div class="time-input-section">
                    <div class="time-input-wrapper">
                        <input 
                            type="number" 
                            class="time-input" 
                            placeholder="Time (min)" 
                            step="0.1"
                            min="0"
                            id="input-${combo.id}"
                            aria-label="Enter time in minutes for ${combo.station1} + ${combo.station2}">
                        <button 
                            class="btn-add" 
                            onclick="addTime('${combo.id}')"
                            aria-label="Add time">
                            Add
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateElement(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// ===== EVENT HANDLERS =====
function toggleComplete(comboId) {
    const combo = combos.find(c => c.id === comboId);
    if (!combo) return;

    combo.completed = !combo.completed;
    
    if (saveData()) {
        render();
        showToast(combo.completed ? 'Combo marked as completed! 🎉' : 'Combo marked as pending');
    }
}

function addTime(comboId) {
    const input = document.getElementById(`input-${comboId}`);
    if (!input) return;

    const value = parseFloat(input.value);
    
    if (isNaN(value)) {
        showToast('Please enter a valid number');
        input.focus();
        return;
    }

    if (value <= 0) {
        showToast('Time must be greater than 0');
        input.focus();
        return;
    }

    if (value > 999) {
        showToast('Time seems too high. Please check your input.');
        input.focus();
        return;
    }

    const combo = combos.find(c => c.id === comboId);
    if (!combo) return;

    combo.times.push(value);
    
    if (saveData()) {
        input.value = '';
        render();
        showToast(`Time added: ${value.toFixed(1)} minutes`);
    }
}

function removeTime(comboId, index) {
    const combo = combos.find(c => c.id === comboId);
    if (!combo || !combo.times[index]) return;

    const removedTime = combo.times[index];
    
    if (!confirm(`Delete time of ${removedTime.toFixed(1)} minutes?`)) {
        return;
    }

    combo.times.splice(index, 1);
    
    if (saveData()) {
        render();
        showToast('Time deleted');
    }
}

function handleReset() {
    const totalCombos = combos.length;
    const completedCount = combos.filter(c => c.completed).length;
    const totalTimes = combos.reduce((sum, c) => sum + c.times.length, 0);

    const message = `Are you sure you want to reset ALL data?\n\nThis will delete:\n• ${totalCombos} combos\n• ${completedCount} completed combos\n• ${totalTimes} recorded times\n\nThis action cannot be undone!`;

    if (!confirm(message)) return;

    // Second confirmation for safety
    if (!confirm('Are you ABSOLUTELY sure? This will permanently delete all your data.')) return;

    try {
        localStorage.removeItem(STORAGE_KEY);
        generateCombos();
        render();
        updateComboCount();
        showToast('All data has been reset');
    } catch (e) {
        console.error('Failed to reset:', e);
        showToast('Failed to reset data. Please try again.');
    }
}

function handleExport() {
    try {
        const exportData = {
            version: "1.0",
            exportDate: new Date().toISOString(),
            combos: combos,
            stats: {
                totalCombos: combos.length,
                completed: combos.filter(c => c.completed).length,
                totalAttempts: combos.reduce((sum, c) => sum + c.times.length, 0),
                totalTrainingTime: combos.reduce((sum, c) => {
                    const stats = calculateStats(c.times);
                    return sum + (stats ? stats.avg * stats.count : 0);
                }, 0)
            }
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `hyrox-relay-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('Data exported successfully! 📥');
    } catch (e) {
        console.error('Export failed:', e);
        showToast('Failed to export data. Please try again.');
    }
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    const messageEl = document.getElementById('toast-message');
    
    if (!toast || !messageEl) return;

    messageEl.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// ===== GLOBAL FUNCTIONS =====
// Make functions available globally for inline event handlers
window.toggleComplete = toggleComplete;
window.addTime = addTime;
window.removeTime = removeTime;

// ===== START APPLICATION =====
// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ===== ERROR HANDLING =====
window.addEventListener('error', (e) => {
    console.error('Application error:', e);
    showToast('An error occurred. Please refresh the page.');
});

// ===== EXPORT FOR TESTING =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateStats,
        generateCombos,
        getFilteredCombos
    };
}