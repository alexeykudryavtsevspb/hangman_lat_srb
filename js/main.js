// js/main.js

let currentCategory = '';
let currentWordObj = null; // [ "Слово", "Перевод" ]
let guessedLetters = new Set();
let mistakes = 0;
const MAX_MISTAKES = 7;

let stats = getSavedStats();

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
  initCategorySelect();
  stats = getSavedStats();
  refreshStatsUI();
  listenForKeyboardInput();
  startNewGame();
});

function refreshStatsUI() {
  const categoryData = typeof GAME_CATEGORIES !== 'undefined' ? GAME_CATEGORIES[currentCategory] : null;
  const categoryWords = categoryData ? categoryData.words : [];
  
  let learnedCount = 0;
  if (categoryWords.length > 0) {
    const statsMap = loadCategoryStats(currentCategory);
    categoryWords.forEach(item => {
      let wordKey = item[0].toUpperCase();
      if (statsMap[wordKey] && statsMap[wordKey].level >= 5) {
        learnedCount++;
      }
    });
  }

  updateScoreBoxUI(stats, { learned: learnedCount, total: categoryWords.length });
}

function initCategorySelect() {
  const selectEl = document.getElementById('categorySelect');
  if (!selectEl || typeof GAME_CATEGORIES === 'undefined') {
    console.error('GAME_CATEGORIES не найден! Проверь подключение config.js');
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
}

function onCategoryChange() {
  const selectEl = document.getElementById('categorySelect');
  if (selectEl) {
    currentCategory = selectEl.value;
    localStorage.setItem('hangman_category', currentCategory);
    startNewGame();
  }
}

function startNewGame() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }

  guessedLetters.clear();
  mistakes = 0;

  const categoryData = GAME_CATEGORIES[currentCategory];
  if (!categoryData || !categoryData.words || categoryData.words.length === 0) {
    console.warn('Нет слов в выбранной категории:', currentCategory);
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

function updateWordDisplay() {
  if (!currentWordObj) return;

  const cleanWord = currentWordObj[0].toUpperCase();
  let display = '';

  for (let char of cleanWord) {
    let charCode = char.charCodeAt(0);
    if ((charCode >= 65 && charCode <= 90) || charCode > 127) {
      if (guessedLetters.has(char)) {
        display += char;
      } else {
        display += '_';
      }
    } else {
      display += char;
    }
  }

  renderWordUI(display);
}

function checkWinCondition() {
  const cleanWord = currentWordObj[0].toUpperCase();
  const isWon = [...cleanWord].every(char => {
    let charCode = char.charCodeAt(0);
    let isLetter = (charCode >= 65 && charCode <= 90) || charCode > 127;
    return !isLetter || guessedLetters.has(char);
  });

  if (isWon) {
    updateWordDisplay();
    updateTipBoxUI(currentWordObj[1] || 'Победа!', 'win');
    
    updateWordProgress(currentCategory, currentWordObj[0], mistakes, false);
    registerDailyActivity();

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

function checkLossCondition() {
  if (mistakes >= MAX_MISTAKES) {
    renderWordUI(currentWordObj[0].toUpperCase());
    updateTipBoxUI(`Пораз! Тачно слово: ${currentWordObj[0]}`, 'loss');
    
    updateWordProgress(currentCategory, currentWordObj[0], mistakes, false);

    finishGame(false);
    speakWord(currentWordObj[0], () => playLossAudio());
  }
}

function finishGame(isWon) {
  const hangmanImg = document.getElementById("hangmanImage");
  if (hangmanImg) {
    hangmanImg.src = isWon ? "img/hangman_win.jpeg" : `img/hangman${mistakes}.jpeg`;
  }

  const newGameBtn = document.getElementById('newGameButton');
  if (newGameBtn) newGameBtn.disabled = false;

  const hintBtn = document.getElementById('hintButton');
  if (hintBtn) hintBtn.disabled = true;

  const categoryData = GAME_CATEGORIES[currentCategory];
  if (categoryData) {
    const activeWords = getActivePool(currentCategory, categoryData.words);
    renderIncubatorUI(activeWords, currentCategory);
    refreshStatsUI();
  }
}

function useHint() {
  if (currentWordObj && currentWordObj[0]) {
    speakWord(currentWordObj[0]);
    const hintBtn = document.getElementById("hintButton");
    if (hintBtn) hintBtn.textContent = "🔊 Слушај поново";
  }
}

function listenForKeyboardInput() {
  document.addEventListener('keydown', (event) => {
    // Игнорируем горячие клавиши браузера (Ctrl+R, Alt+Tab, Cmd+Shift и т.д.)
    if (event.ctrlKey || event.altKey || event.metaKey) return;

    const pressedKey = event.key.toUpperCase();
    const categoryAlphabet = GAME_CATEGORIES[currentCategory]?.allLetters || [];
    
    // Проверяем, завершен ли текущий раунд
    const cleanWord = currentWordObj ? currentWordObj[0].toUpperCase() : '';
    const isGameOver = mistakes >= MAX_MISTAKES || (cleanWord && [...cleanWord].every(char => {
      let code = char.charCodeAt(0);
      return (code < 65 || (code > 90 && code <= 127)) || guessedLetters.has(char);
    }));

    // 1. Управление новой игрой
    // Escape работает всегда, а Enter/Space — только когда раунд окончен
    if (event.key === 'Escape' || ((event.key === 'Enter' || event.key === ' ') && isGameOver)) {
      event.preventDefault(); // Предотвращаем скролл страницы от пробела
      startNewGame();
      return;
    }

    // 2. Ввод букв (только во время активной игры)
    if (!isGameOver && categoryAlphabet.includes(pressedKey)) {
      // Если буква ещё не нажималась — угадываем, иначе игнорируем без ошибок
      if (!guessedLetters.has(pressedKey)) {
        handleLetterGuess(pressedKey);
      }
    }
  });
}

// Глобальное выравнивание функций для HTML
window.newGame = startNewGame;
window.onCategoryChange = onCategoryChange;
window.useHint = useHint;