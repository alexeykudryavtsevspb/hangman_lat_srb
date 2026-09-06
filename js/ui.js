// js/ui.js

/**
 * Определение ранга и иконки на основе серии побед без ошибок
 */
function getRankInfo(streak = 0) {
  if (streak >= 25) {
    return { title: 'Цар', icon: '👑' };
  }
  if (streak >= 15) {
    return { title: 'Богаташ', icon: '💰' };
  }
  if (streak >= 8) {
    return { title: 'Драг гост', icon: '💵' };
  }
  if (streak >= 3) {
    return { title: 'Намерник', icon: '🍔' };
  }
  return { title: 'Пролазник', icon: '☕' };
}

/**
 * Обновление верхней панели статистики и ранга
 */
function updateScoreBoxUI(stats) {
  const streakDaysEl = document.getElementById('streakDaysValue');
  const streakFreezesEl = document.getElementById('streakFreezesValue');
  const currentStreakEl = document.getElementById('currentStreakValue');
  const recordStreakEl = document.getElementById('recordStreakValue');
  const rankIconEl = document.getElementById('rankIconValue');
  const rankTitleEl = document.getElementById('rankTitleValue');

  if (streakDaysEl) streakDaysEl.textContent = stats.streakDays || 0;
  if (streakFreezesEl) streakFreezesEl.textContent = `${stats.streakFreezes || 0}/3`;
  if (currentStreakEl) currentStreakEl.textContent = stats.currentStreak || 0;
  if (recordStreakEl) recordStreakEl.textContent = stats.recordStreak || 0;

  const rank = getRankInfo(stats.currentStreak || 0);

  if (rankIconEl) rankIconEl.textContent = rank.icon;
  if (rankTitleEl) rankTitleEl.textContent = rank.title;
}

function renderIncubatorUI(activeWords, progressMap) {
  const incubatorBox = document.getElementById('incubatorBox');
  if (!incubatorBox) return;

  incubatorBox.innerHTML = '';
  activeWords.forEach((wordObj) => {
    const slot = document.createElement('span');
    slot.className = 'incubator-slot';
    
    const status = progressMap[wordObj.word] || 'new';
    slot.classList.add(status);

    if (status === 'learned') {
      slot.textContent = '⭐';
    } else if (status === 'in-progress') {
      slot.textContent = '🌱';
    } else {
      slot.textContent = '⚪';
    }
    
    slot.title = wordObj.word;
    incubatorBox.appendChild(slot);
  });
}

function renderWordUI(displayPattern) {
  const wordEl = document.getElementById('word');
  if (wordEl) wordEl.textContent = displayPattern;
}

function updateHangmanImageUI(mistakesCount) {
  const imgEl = document.getElementById('hangmanImage');
  if (imgEl) imgEl.src = `img/hangman${mistakesCount}.jpeg`;
}

function renderKeyboardUI(alphabet, guessedLetters, onLetterClick) {
  const guessesEl = document.getElementById('guesses');
  if (!guessesEl) return;

  guessesEl.innerHTML = '';
  
  // Если alphabet передался как строка ("АБВ..."), превращаем её в массив букв
  const lettersArray = typeof alphabet === 'string' ? alphabet.split('') : (alphabet || []);

  lettersArray.forEach((letter) => {
    const btn = document.createElement('span');
    btn.className = 'guess';
    btn.textContent = letter;
    
    if (guessedLetters.has(letter)) {
      btn.classList.add('disabled');
    } else {
      btn.onclick = () => onLetterClick(letter);
    }
    guessesEl.appendChild(btn);
  });
}

function updateTipBoxUI(text, statusClass = '') {
  const tipBox = document.getElementById('tipBox');
  if (!tipBox) return;

  tipBox.textContent = text;
  tipBox.className = statusClass; // 'win', 'loss' или ''
}

function updateCategoryProgressUI(learnedCount, totalCount) {
  const catProgressEl = document.getElementById('categoryProgressValue');
  if (!catProgressEl) return;

  const percent = totalCount > 0 ? Math.round((learnedCount / totalCount) * 100) : 0;
  catProgressEl.textContent = `🎓 Научено у категорији: ${learnedCount} / ${totalCount} (${percent}%)`;
}