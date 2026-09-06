// js/main.js

let currentCategory = '';
let currentWordObj = null;
let guessedLetters = new Set();
let mistakes = 0;
const MAX_MISTAKES = 7;

let stats = getSavedStats();
let wordProgress = getSavedProgress();

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  initCategorySelect();
  updateScoreBoxUI(stats);
  startNewGame();
});

function initCategorySelect() {
  const selectEl = document.getElementById('categorySelect');
  if (!selectEl || typeof GAME_CATEGORIES === 'undefined') {
    console.error('GAME_CATEGORIES не найден! Проверь подключение config.js');
    return;
  }

  selectEl.innerHTML = '';
  const categoryKeys = Object.keys(GAME_CATEGORIES);
  
  if (categoryKeys.length === 0) return;

  // Восстанавливаем сохраненную категорию или берем первую
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

  // Получаем активный пул из 10 слов (Инкубатор) и выбираем взвешенное слово
  const activeWords = getActivePool(currentCategory, categoryData.words);
  currentWordObj = selectWeightedWord(activeWords, currentCategory);

  // Алфавит берутся строго из данных текущей категории (allLetters)
  const categoryAlphabet = categoryData.allLetters || [];

  // Обновление UI
  updateHangmanImageUI(mistakes);
  updateWordDisplay();
  renderKeyboardUI(categoryAlphabet, guessedLetters, handleLetterGuess);
  
  // Подсказка (перевод)
  const tipBoxText = currentWordObj[1] || '.';
  updateTipBoxUI(tipBoxText);

  // Обновление инкубатора и прогресса категории
  renderIncubatorUI(activeWords, currentCategory);
  calcAndRenderCategoryProgress(currentCategory, categoryData.words);

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
    updateWordDisplay();
    checkWinCondition();
  } else {
    mistakes++;
    // При любой ошибке сбрасывается текущая серия побед без ошибок
    stats.currentStreak = 0;
    saveStats(stats);
    updateScoreBoxUI(stats);

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
    if (charCode >= 65 && charCode <= 90 || charCode > 127) { // Обычные и кириллические/специальные буквы
      if (guessedLetters.has(char)) {
        display += char;
      } else {
        display += '_';
      }
    } else {
      display += char; // Пробелы, дефисы и знаки препинания оставляем
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
    
    // Обновляем прогресс слова
    updateWordProgress(currentCategory, currentWordObj[0], mistakes, false);
    
    // Регистрируем активность дня для Daily Streak
    registerDailyActivity();

    // Обновляем стрики побед
    stats = getSavedStats();
    stats.currentStreak++;
    if (stats.currentStreak > stats.recordStreak) {
      stats.recordStreak = stats.currentStreak;
    }
    saveStats(stats);
    updateScoreBoxUI(stats);

    speakWord(currentWordObj[0], () => playWinAudio());
    finishGame();
  }
}

function checkLossCondition() {
  if (mistakes >= MAX_MISTAKES) {
    renderWordUI(currentWordObj[0].toUpperCase());
    updateTipBoxUI(`Пораз! Тачно слово: ${currentWordObj[0]}`, 'loss');
    
    // Сбрасываем прогресс слова при поражении
    updateWordProgress(currentCategory, currentWordObj[0], mistakes, false);

    finishGame();
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
    calcAndRenderCategoryProgress(currentCategory, categoryData.words);
  }
}

function useHint() {
  if (currentWordObj && currentWordObj[0]) {
    speakWord(currentWordObj[0]);
  }
}

function calcAndRenderCategoryProgress(catKey, categoryWords) {
  const statsMap = loadCategoryStats(catKey);
  let learnedCount = 0;

  categoryWords.forEach(item => {
    let wordKey = item[0].toUpperCase();
    if (statsMap[wordKey] && statsMap[wordKey].level === 5) {
      learnedCount++;
    }
  });

  updateCategoryProgressUI(learnedCount, categoryWords.length);
}

// Глобальные вызовы для HTML
window.newGame = startNewGame;
window.onCategoryChange = onCategoryChange;
window.useHint = useHint;