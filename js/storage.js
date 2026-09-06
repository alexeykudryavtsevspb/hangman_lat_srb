// js/storage.js

function getSavedStats() {
  let streakData = JSON.parse(localStorage.getItem('hangman_daily_streak_data')) || {
    days: 0,
    freezes: 0,
    lastPlayDate: null,
    daysForNextFreeze: 0,
    dailyNormMet: false
  };

  return {
    streakDays: streakData.days,
    streakFreezes: streakData.freezes,
    currentStreak: parseInt(localStorage.getItem('hangman_current_streak')) || 0,
    recordStreak: parseInt(localStorage.getItem('hangman_record_streak')) || 0
  };
}

function saveStats(stats) {
  localStorage.setItem('hangman_current_streak', stats.currentStreak);
  localStorage.setItem('hangman_record_streak', stats.recordStreak);
}

function registerDailyActivity() {
  let streakData = JSON.parse(localStorage.getItem('hangman_daily_streak_data')) || {
    days: 0, freezes: 0, lastPlayDate: null, daysForNextFreeze: 0, dailyNormMet: false
  };
  let today = new Date().toDateString();

  if (!streakData.dailyNormMet) {
    streakData.dailyNormMet = true;
    streakData.days += 1;
    streakData.daysForNextFreeze += 1;

    if (streakData.daysForNextFreeze >= 7) {
      streakData.daysForNextFreeze = 0;
      if (streakData.freezes < 3) streakData.freezes += 1;
    }
  }

  streakData.lastPlayDate = today;
  localStorage.setItem('hangman_daily_streak_data', JSON.stringify(streakData));
}

function loadCategoryStats(catKey) {
  return JSON.parse(localStorage.getItem('hangman_stats_' + catKey)) || {};
}

function saveCategoryStats(catKey, stats) {
  localStorage.setItem('hangman_stats_' + catKey, JSON.stringify(stats));
}

function getActivePool(catKey, allWords) {
  let poolKey = 'hangman_active_pool_' + catKey;
  let stats = loadCategoryStats(catKey);
  let poolData = JSON.parse(localStorage.getItem(poolKey)) || { words: [], lastCheckDate: null };
  let today = new Date().toDateString();

  if (poolData.lastCheckDate !== today) {
    poolData.words = poolData.words.filter(wordText => {
      let wordKey = wordText.toUpperCase();
      let level = stats[wordKey] ? stats[wordKey].level : 0;
      return level < 5;
    });
    poolData.lastCheckDate = today;
  }

  if (poolData.words.length < 10) {
    let activeSet = new Set(poolData.words.map(w => w.toUpperCase()));
    let candidates = allWords.filter(item => {
      let wordKey = item[0].toUpperCase();
      let level = stats[wordKey] ? stats[wordKey].level : 0;
      return !activeSet.has(wordKey) && level < 5;
    });

    if (candidates.length === 0) {
      candidates = allWords.filter(item => !activeSet.has(item[0].toUpperCase()));
    }

    while (poolData.words.length < 10 && candidates.length > 0) {
      let randomIndex = Math.floor(Math.random() * candidates.length);
      let chosenWord = candidates.splice(randomIndex, 1)[0];
      poolData.words.push(chosenWord[0]);
    }
  }

  localStorage.setItem(poolKey, JSON.stringify(poolData));
  return allWords.filter(item => poolData.words.map(w => w.toUpperCase()).includes(item[0].toUpperCase()));
}

function selectWeightedWord(activeWords, catKey) {
  let stats = loadCategoryStats(catKey);
  let now = Date.now();
  if (!activeWords || activeWords.length === 0) return null;

  let weights = activeWords.map(item => {
    let wordKey = item[0].toUpperCase();
    let wordData = stats[wordKey] || { level: 0, totalErrors: 0, lastSeen: 0 };
    let level = wordData.level || 0;
    let baseWeights = [100, 40, 15, 5, 2, 1];
    let baseWeight = baseWeights[level] || 1;
    let errorFactor = 1 + ((wordData.totalErrors || 0) * 0.2);
    
    let intervals = [0, 1, 3, 7, 14, 30];
    let targetIntervalDays = intervals[level] || 30;
    let timeFactor = 1;
    if (wordData.lastSeen > 0 && targetIntervalDays > 0) {
      let daysPassed = (now - wordData.lastSeen) / (1000 * 60 * 60 * 24);
      timeFactor = 1 + Math.pow(daysPassed / targetIntervalDays, 2);
    }
    return baseWeight * errorFactor * timeFactor;
  });

  let totalWeight = weights.reduce((a, b) => a + b, 0);
  let randomNum = Math.random() * totalWeight;

  for (let i = 0; i < activeWords.length; i++) {
    randomNum -= weights[i];
    if (randomNum <= 0) return activeWords[i];
  }
  return activeWords[0];
}

function updateWordProgress(catKey, wordText, mistakes, usedHint) {
  let stats = loadCategoryStats(catKey);
  let wordKey = wordText.toUpperCase();
  let wordData = stats[wordKey] || { level: 0, totalErrors: 0, lastSeen: 0 };

  let currentLevel = wordData.level || 0;
  let totalErrors = (wordData.totalErrors || 0) + mistakes;
  let newLevel = currentLevel;

  if (mistakes >= 3) {
    newLevel = 0;
  } else if (usedHint) {
    newLevel = Math.max(0, currentLevel - 1);
  } else if (mistakes === 0) {
    newLevel = Math.min(5, currentLevel + 1);
  }

  stats[wordKey] = { level: newLevel, totalErrors: totalErrors, lastSeen: Date.now() };
  saveCategoryStats(catKey, stats);
}

function getSavedProgress() { 
  return {}; 
}