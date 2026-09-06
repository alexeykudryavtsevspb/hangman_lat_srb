// js/ui.js

function getRankInfo(streak = 0) {
  if (streak >= 25) return { title: 'Цар', icon: '👑' };
  if (streak >= 15) return { title: 'Богаташ', icon: '💰' };
  if (streak >= 8)  return { title: 'Драг гост', icon: '💵' };
  if (streak >= 3)  return { title: 'Намерник', icon: '🍔' };
  return { title: 'Пролазник', icon: '☕' };
}

function updateScoreBoxUI(stats, categoryStats = { learned: 0, total: 0 }) {
  const streakDays = stats.streakDays || 0;
  const streakFreezes = `${stats.streakFreezes || 0}/3`;
  const currentStreak = stats.currentStreak || 0;
  const recordStreak = stats.recordStreak || 0;
  const rank = getRankInfo(currentStreak);

  // Расчет процента прогресса по категории
  const learned = categoryStats.learned || 0;
  const total = categoryStats.total || 0;
  const percent = total > 0 ? Math.round((learned / total) * 100) : 0;

  // 1. Верхняя мини-панель
  const streakDaysEl = document.getElementById('streakDaysValue');
  const streakFreezesEl = document.getElementById('streakFreezesValue');
  const currentStreakEl = document.getElementById('currentStreakValue');
  const recordStreakEl = document.getElementById('recordStreakValue');
  const rankIconEl = document.getElementById('rankIconValue');
  const categoryPercentEl = document.getElementById('categoryPercentValue');

  if (streakDaysEl) streakDaysEl.textContent = streakDays;
  if (streakFreezesEl) streakFreezesEl.textContent = streakFreezes;
  if (currentStreakEl) currentStreakEl.textContent = currentStreak;
  if (recordStreakEl) recordStreakEl.textContent = recordStreak;
  if (rankIconEl) rankIconEl.textContent = rank.icon;
  if (categoryPercentEl) categoryPercentEl.textContent = `${percent}%`;

  // 2. Нижний блок-легенда
  const legendDaysEl = document.getElementById('legendDaysValue');
  const legendFreezesEl = document.getElementById('legendFreezesValue');
  const legendCurrentEl = document.getElementById('legendCurrentStreak');
  const legendRecordEl = document.getElementById('legendRecordStreak');
  const legendRankIconEl = document.getElementById('legendRankIcon');
  const legendRankTitleEl = document.getElementById('legendRankTitle');
  const legendCategoryProgressEl = document.getElementById('legendCategoryProgress');

  if (legendDaysEl) legendDaysEl.textContent = streakDays;
  if (legendFreezesEl) legendFreezesEl.textContent = streakFreezes;
  if (legendCurrentEl) legendCurrentEl.textContent = currentStreak;
  if (legendRecordEl) legendRecordEl.textContent = recordStreak;
  if (legendRankIconEl) legendRankIconEl.textContent = rank.icon;
  if (legendRankTitleEl) legendRankTitleEl.textContent = rank.title;
  if (legendCategoryProgressEl) legendCategoryProgressEl.textContent = `${learned}/${total} (${percent}%)`;
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