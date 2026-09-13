// js/main.js

let currentCategory = '';
let currentWordObj = null; // [ "Word", "Translation", "Optional Extra Info" ]
let guessedLetters = new Set();
let mistakes = 0;
const MAX_MISTAKES = 7;

let stats = getSavedStats();

document.addEventListener('DOMContentLoaded', () => {
  initCategorySelect();
  initSettingsUI();
  stats = getSavedStats();
  refreshStatsUI();
  listenForKeyboardInput();
  startNewGame();
});

// Helper function to combine tip and extra info with a vertical bar
function getLossOrHintTip(wordObj) {
  if (!wordObj) return '';
  const baseTip = wordObj[1] || '';
  const extraTip = wordObj[2] ? ` | ${wordObj[2]}` : '';
  return baseTip + extraTip;
}

// Refresh stats UI and percentage
function refreshStatsUI() {
  const categoryData = typeof GAME_CATEGORIES !== 'undefined' ? GAME_CATEGORIES[currentCategory] : null;
  const categoryWords = categoryData ? categoryData.words : [];
  
  let totalLevelSum = 0;
  const totalWordsCount = categoryWords.length;

  if (totalWordsCount > 0) {
    const statsMap = loadCategoryStats(currentCategory);
    categoryWords.forEach(item => {
      let wordKey = item[0].toUpperCase();
      let wordData = statsMap[wordKey] || { level: 0 };
      // Limit level to max 5
      let level = Math.min(5, wordData.level || 0);
      totalLevelSum += level;
    });
  }

  // Calculate average percentage with decimal point
  let maxPossibleScore = totalWordsCount * 5;
  let progressPercentage = maxPossibleScore > 0 ? (totalLevelSum / maxPossibleScore) * 100 : 0;
  let formattedPercentage = progressPercentage.toFixed(1);

  updateScoreBoxUI(stats, { 
    learnedPercent: formattedPercentage, 
    total: totalWordsCount 
  });
}

// Initialize category dropdown select
function initCategorySelect() {
  const selectEl = document.getElementById('categorySelect');
  if (!selectEl || typeof GAME_CATEGORIES === 'undefined') {
    console.error('GAME_CATEGORIES not found! Check config.js connection');
    return;
  }

  selectEl.innerHTML = '';
  const categoryKeys = Object.keys(GAME_CATEGORIES);
  
  if (categoryKeys.length === 0) return;

  let savedCategory = localStorage.getItem('hangman_category');
  if (!savedCategory || !GAME_CATEGORIES[savedCategory]) {
    savedCategory = categoryKeys[0];
  }

  categoryKeys.forEach((catKey) => {
    const opt = document.createElement('option');
    opt.value = catKey;
    opt.textContent = GAME_CATEGORIES[catKey].title || catKey;
    if (catKey === savedCategory) {
      opt.selected = true;
    }
    selectEl.appendChild(opt);
  });

  currentCategory = selectEl.value;
  setSpeechLanguage(GAME_CATEGORIES[currentCategory].lang);
}

// Handle category change from UI dropdown
function onCategoryChange() {
  const selectEl = document.getElementById('categorySelect');
  if (selectEl) {
    currentCategory = selectEl.value;
    setSpeechLanguage(GAME_CATEGORIES[currentCategory].lang);
    localStorage.setItem('hangman_category', currentCategory);
    startNewGame();
  }
}

// Start a new game round
function startNewGame() {
  stopLongAudio();

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }

  guessedLetters.clear();
  mistakes = 0;

  const categoryData = GAME_CATEGORIES[currentCategory];
  if (!categoryData || !categoryData.words || categoryData.words.length === 0) {
    console.warn('No words found in category:', currentCategory);
    return;
  }

  const activeWords = getActivePool(currentCategory, categoryData.words);
  currentWordObj = selectWeightedWord(activeWords, currentCategory);

  const categoryAlphabet = categoryData.allLetters || [];

  updateHangmanImageUI(mistakes);
  updateWordDisplay();
  renderKeyboardUI(categoryAlphabet, guessedLetters, handleLetterGuess);
  
  const tipBoxText = currentWordObj[1] || '.';
  updateTipBoxUI(tipBoxText);

  renderIncubatorUI(activeWords, currentCategory);
  refreshStatsUI();

  const newGameBtn = document.getElementById('newGameButton');
  if (newGameBtn) newGameBtn.disabled = true;
  
  const hintBtn = document.getElementById('hintButton');
  if (hintBtn) {
    hintBtn.textContent = "🔊 Слушај фрау";
    hintBtn.disabled = false;
  }
}

// Handle letter guess action
function handleLetterGuess(letter) {
  if (guessedLetters.has(letter) || mistakes >= MAX_MISTAKES) return;

  guessedLetters.add(letter);

  const cleanWord = currentWordObj[0].toUpperCase();
  if (cleanWord.includes(letter)) {
    playYesAudio();
    updateWordDisplay();
    checkWinCondition();
  } else {
    playNoAudio();
    mistakes++;
    
    stats.currentStreak = 0;
    saveStats(stats);
    refreshStatsUI();

    updateHangmanImageUI(mistakes);
    checkLossCondition();
  }

  const categoryAlphabet = GAME_CATEGORIES[currentCategory]?.allLetters || [];
  renderKeyboardUI(categoryAlphabet, guessedLetters, handleLetterGuess);
}

// Update masked word display on screen
function updateWordDisplay() {
  if (!currentWordObj) return;

  const cleanWord = currentWordObj[0].toUpperCase();
  const categoryAlphabet = GAME_CATEGORIES[currentCategory]?.allLetters || [];
  const alphabetSet = new Set(categoryAlphabet);
  let display = '';

  for (let char of cleanWord) {
    if (alphabetSet.has(char)) {
      if (guessedLetters.has(char)) {
        display += char;
      } else {
        display += '_';
      }
    } else {
      // Keep spaces, hyphens, and symbols as they are
      display += char;
    }
  }

  renderWordUI(display);
}

// Check if player won the round
function checkWinCondition() {
  const cleanWord = currentWordObj[0].toUpperCase();
  const categoryAlphabet = GAME_CATEGORIES[currentCategory]?.allLetters || [];
  const alphabetSet = new Set(categoryAlphabet);

  const isWon = [...cleanWord].every(char => {
    if (!alphabetSet.has(char)) return true;
    return guessedLetters.has(char);
  });

  if (isWon) {
    updateWordDisplay();
    // Show only translation with win style (no extra text)
    updateTipBoxUI(getLossOrHintTip(currentWordObj), 'win');
    
    updateWordProgress(currentCategory, currentWordObj[0], mistakes, false);

    stats = getSavedStats();
    stats.currentStreak++;
    if (stats.currentStreak > stats.recordStreak) {
      stats.recordStreak = stats.currentStreak;
    }
    saveStats(stats);
    refreshStatsUI();

    finishGame(true);
    speakWord(currentWordObj[0], () => playWinAudio());
  }
}

// Check if player lost the round
function checkLossCondition() {
  if (mistakes >= MAX_MISTAKES) {
    renderWordUI(currentWordObj[0].toUpperCase());
    
    // Show tip + extra tip separated by vertical bar with loss style
    updateTipBoxUI(getLossOrHintTip(currentWordObj), 'loss');
    
    updateWordProgress(currentCategory, currentWordObj[0], mistakes, false);

    // Reset win streak
    stats = getSavedStats();
    stats.currentStreak = 0;
    saveStats(stats);
    refreshStatsUI();

    finishGame(false);
    speakWord(currentWordObj[0], () => playLossAudio());
  }
}

// Finalize game state (win or loss)
function finishGame(isWon) {
  registerDailyActivity();

  const hangmanImg = document.getElementById("hangmanImage");
  if (hangmanImg) {
    hangmanImg.src = isWon ? "img/hangman_win.jpeg" : `img/hangman${mistakes}.jpeg`;
  }

  const newGameBtn = document.getElementById('newGameButton');
  if (newGameBtn) newGameBtn.disabled = false;

  const hintBtn = document.getElementById('hintButton');
  if (hintBtn) {
    // Keep hint button enabled so user can listen again
    hintBtn.disabled = false;
  }

  const categoryData = GAME_CATEGORIES[currentCategory];
  if (categoryData) {
    const activeWords = getActivePool(currentCategory, categoryData.words);
    renderIncubatorUI(activeWords, currentCategory);
    refreshStatsUI();
  }
}

// Handle hint / listen button click
function useHint() {
  if (!currentWordObj || !currentWordObj[0]) return;
  if (mistakes >= MAX_MISTAKES) return;

  // Speak word without error sound
  speakWord(currentWordObj[0]);

  // Count as one mistake
  mistakes++;
  
  stats.currentStreak = 0;
  saveStats(stats);
  refreshStatsUI();

  updateHangmanImageUI(mistakes);
  checkLossCondition();

  // Keep hint button active and update label
  const hintBtn = document.getElementById("hintButton");
  if (hintBtn) {
    hintBtn.textContent = "🔊 Слушај поново";
    hintBtn.disabled = false;
  }
}

// Listen for keyboard input (physical keyboard)
function listenForKeyboardInput() {
  document.addEventListener('keydown', (event) => {
    // Ignore browser shortcuts (Ctrl+R, Alt+Tab, etc.)
    if (event.ctrlKey || event.altKey || event.metaKey) return;

    const pressedKey = event.key.toUpperCase();
    const categoryAlphabet = GAME_CATEGORIES[currentCategory]?.allLetters || [];
    const alphabetSet = new Set(categoryAlphabet);
    
    // Check if current round is over
    const cleanWord = currentWordObj ? currentWordObj[0].toUpperCase() : '';
    const isGameOver = mistakes >= MAX_MISTAKES || (cleanWord && [...cleanWord].every(char => {
      if (!alphabetSet.has(char)) return true;
      return guessedLetters.has(char);
    }));

    // 1. New game control (Escape always works, Enter/Space work only when round is over)
    if (event.key === 'Escape' || ((event.key === 'Enter' || event.key === ' ') && isGameOver)) {
      event.preventDefault(); // Prevent page scroll on spacebar
      startNewGame();
      return;
    }

    // 2. Letter input (only during active game)
    if (!isGameOver && categoryAlphabet.includes(pressedKey)) {
      if (!guessedLetters.has(pressedKey)) {
        handleLetterGuess(pressedKey);
      }
    }
  });
}

// Initialize sound effects settings
function initSettingsUI() {
  const soundCheckbox = document.getElementById('soundEffectsToggle');
  if (!soundCheckbox) return;

  const savedSoundPref = localStorage.getItem('hangman_sound_effects');
  const isEnabled = savedSoundPref !== null ? savedSoundPref === 'true' : true;

  soundCheckbox.checked = isEnabled;
  setSoundEffectsEnabled(isEnabled);

  soundCheckbox.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    setSoundEffectsEnabled(enabled);
    localStorage.setItem('hangman_sound_effects', enabled);
  });
}

// Export functions to global scope for HTML events
window.newGame = startNewGame;
window.onCategoryChange = onCategoryChange;
window.useHint = useHint;