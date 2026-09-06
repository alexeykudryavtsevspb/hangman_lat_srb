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
  startNewGame();
});

function refreshStatsUI() {
  const categoryData = typeof GAME_CATEGORIES !== 'undefined' ? GAME_CATEGORIES[currentCategory] : null;
  const categoryWords = categoryData ? categoryData.words : [];
  
  // Расчет выученных слов для категории
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
  guessedLetters.clear();
  mistakes = 0;

  const categoryData = GAME_CATEGORIES[currentCategory];
  if (!categoryData || !categoryData.words || categoryData.words.length === 0) {
    console.warn('Нет слов в выбранной категории:', currentCategory);
    return;
  }

  // Получаем активный пул слов (Инкубатор) и выбираем слово
  const activeWords = getActivePool(currentCategory, categoryData.words);
  currentWordObj = selectWeightedWord(activeWords, currentCategory);

  const categoryAlphabet = categoryData.allLetters || [];

  // Обновление UI
  updateHangmanImageUI(mistakes);
  updateWordDisplay();
  renderKeyboardUI(categoryAlphabet, guessedLetters, handleLetterGuess);
  
  // Подсказка (перевод)
  const tipBoxText = currentWordObj[1] || '.';
  updateTipBoxUI(tipBoxText);

  // Обновление Инкубатора и легенды
  renderIncubatorUI(activeWords, currentCategory);
  refreshStatsUI();

  const newGameBtn = document.getElementById('newGameButton');
  if (newGameBtn) newGameBtn.disabled = true;
  
  const hintBtn = document.getElementById('hintButton');
  if (hintBtn) hintBtn.disabled = false;
}

function handleLetterGuess(letter) {
  if (guessedLetters.has(letter) || mistakes >= MAX_MISTAKES) return;

  guessedLetters.add(letter);

  const cleanWord = currentWordObj[0].toUpperCase();
  if (cleanWord.includes(letter)) {
    playYesAudio(); // Звук угаданной буквы
    updateWordDisplay();
    checkWinCondition();
  } else {
    playNoAudio(); // Звук неверной буквы
    mistakes++;
    
    // При ошибке сбрасываем серию побед без ошибок
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
    
    // Прогресс по слову
    updateWordProgress(currentCategory, currentWordObj[0], mistakes, false);
    
    // Активность для Daily Streak
    registerDailyActivity();

    // Обновляем статистику
    stats = getSavedStats();
    stats.currentStreak++;
    if (stats.currentStreak > stats.recordStreak) {
      stats.recordStreak = stats.currentStreak;
    }
    saveStats(stats);
    refreshStatsUI();

    // Сначала произносим слово, затем воспроизводим победный трек win.mp3
    speakWord(currentWordObj[0], () => playWinAudio());
    finishGame();
  }
}

function checkLossCondition() {
  if (mistakes >= MAX_MISTAKES) {
    renderWordUI(currentWordObj[0].toUpperCase());
    updateTipBoxUI(`Пораз! Тачно слово: ${currentWordObj[0]}`, 'loss');
    
    updateWordProgress(currentCategory, currentWordObj[0], mistakes, false);

    finishGame();
    // Сначала произносим слово, затем воспроизводим звук поражения los.mp3
    speakWord(currentWordObj[0], () => playLossAudio());
  }
}

function finishGame() {
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
  }
}

document.addEventListener('keydown', (event) => {
  // Игнорируем сочетания клавиш вроде Ctrl+R, Alt+Tab и т.д.
  if (event.ctrlKey || event.altKey || event.metaKey) return;

  const pressedKey = event.key.toUpperCase();
  const categoryAlphabet = GAME_CATEGORIES[currentCategory]?.allLetters || [];

  // Проверяем:
  // 1. Есть ли буква в алфавите текущей категории
  // 2. Не нажималась ли она уже ранее
  if (categoryAlphabet.includes(pressedKey) && !guessedLetters.has(pressedKey)) {
    handleLetterGuess(pressedKey);
  }
});

// Глобальное выравнивание функций для HTML
window.newGame = startNewGame;
window.onCategoryChange = onCategoryChange;
window.useHint = useHint;