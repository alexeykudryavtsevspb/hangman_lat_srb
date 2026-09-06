let tip = ".";

// Пути к аудио
let audio_yes = new Audio("audio/yes.wav");
let audio_no = new Audio("audio/no.wav");
let audio_win = new Audio("audio/win.mp3");
let audio_los = new Audio("audio/fajront.mp3");

// Счётчик серии и рекорда побед без ошибок
let currentStreak = parseInt(localStorage.getItem('hangman_current_streak')) || 0;
let recordStreak = parseInt(localStorage.getItem('hangman_record_streak')) || 0;

let hintUsed = false;
let game = null; // Глобальный экземпляр текущей игры

// Предзагрузка голосов
if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
    };
}

// --- СИСТЕМА СТРИКОВ И ЗАМОРОЗОК (DAILY STREAK) ---

function getStreakData() {
    let defaultData = {
        days: 0,
        freezes: 0,
        lastPlayDate: null,
        daysForNextFreeze: 0,
        dailyNormMet: false
    };
    return JSON.parse(localStorage.getItem('hangman_daily_streak_data')) || defaultData;
}

function saveStreakData(data) {
    localStorage.setItem('hangman_daily_streak_data', JSON.stringify(data));
}

function checkDailyStreak() {
    let streakData = getStreakData();
    let today = new Date().toDateString();

    if (!streakData.lastPlayDate) {
        return streakData;
    }

    if (streakData.lastPlayDate === today) {
        return streakData;
    }

    let lastDate = new Date(streakData.lastPlayDate);
    let currDate = new Date(today);
    let diffTime = currDate - lastDate;
    let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
        // Прошёл ровно 1 день — сбрасываем флаг дневной нормы
        streakData.dailyNormMet = false;
    } else if (diffDays > 1) {
        // Пропущено больше 1 дня
        let missedDays = diffDays - 1;
        
        while (missedDays > 0 && streakData.freezes > 0) {
            streakData.freezes--;
            missedDays--;
        }

        if (missedDays > 0) {
            // Заморозок не хватило — стрик сбрасывается
            streakData.days = 0;
            streakData.daysForNextFreeze = 0;
        }
        streakData.dailyNormMet = false;
    }

    saveStreakData(streakData);
    return streakData;
}

function registerDailyActivity() {
    let streakData = checkDailyStreak();
    let today = new Date().toDateString();

    if (!streakData.dailyNormMet) {
        streakData.dailyNormMet = true;
        streakData.days += 1;
        streakData.daysForNextFreeze += 1;

        // За каждые 7 дней стрика получаем +1 заморозку (максимум 3)
        if (streakData.daysForNextFreeze >= 7) {
            streakData.daysForNextFreeze = 0;
            if (streakData.freezes < 3) {
                streakData.freezes += 1;
            }
        }
    }

    streakData.lastPlayDate = today;
    saveStreakData(streakData);
}

// --- СИСТЕМА РАНГОВ ---

function getRankInfo(streak) {
    if (streak >= 50) return { title: "Газда", icon: "🏦" };
    if (streak >= 30) return { title: "Богаташ", icon: "🧰" };
    if (streak >= 15) return { title: "Драг гост", icon: "💵" };
    if (streak >= 5)  return { title: "Намерник", icon: "💰" };
    return { title: "Пролазник", icon: "🪙" };
}

// --- СИСТЕМА ИНТЕРВАЛЬНОГО ПОВТОРЕНИЯ И АКТИВНОГО ПУЛА (10 СЛОВ) ---

function getCategoryStatsKey() {
    let selectedCategory = localStorage.getItem('hangman_category') || Object.keys(GAME_CATEGORIES)[0];
    return 'hangman_stats_' + selectedCategory;
}

function loadCategoryStats() {
    let key = getCategoryStatsKey();
    return JSON.parse(localStorage.getItem(key)) || {};
}

function saveCategoryStats(stats) {
    let key = getCategoryStatsKey();
    localStorage.setItem(key, JSON.stringify(stats));
}

function getActivePoolKey() {
    let selectedCategory = localStorage.getItem('hangman_category') || Object.keys(GAME_CATEGORIES)[0];
    return 'hangman_active_pool_' + selectedCategory;
}

// Загрузка и обновление активной 10-ки слов
function getActivePool() {
    let categoryData = getSelectedCategoryData();
    let allWords = categoryData.words;
    let poolKey = getActivePoolKey();
    let stats = loadCategoryStats();
    
    let poolData = JSON.parse(localStorage.getItem(poolKey)) || { words: [], lastCheckDate: null };
    let today = new Date().toDateString();

    // Если наступил новый день — освобождаем слоты с выученными словами (уровень 5)
    if (poolData.lastCheckDate !== today) {
        poolData.words = poolData.words.filter(wordText => {
            let wordKey = wordText.toUpperCase();
            let level = stats[wordKey] ? stats[wordKey].level : 0;
            return level < 5; // Выученные слова уходят в архив
        });
        poolData.lastCheckDate = today;
    }

    // Если в активном пуле меньше 10 слов, добираем новые из категории
    if (poolData.words.length < 10) {
        let activeSet = new Set(poolData.words.map(w => w.toUpperCase()));
        
        let candidates = allWords.filter(item => {
            let wordKey = item[0].toUpperCase();
            let level = stats[wordKey] ? stats[wordKey].level : 0;
            return !activeSet.has(wordKey) && level < 5;
        });

        // Если неизученных слов не осталось, берем любые не вошедшие в пул
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
    
    // Возвращаем полные объекты слов для текущего пула
    return allWords.filter(item => poolData.words.map(w => w.toUpperCase()).includes(item[0].toUpperCase()));
}

// Выбор слова по weighted random только из активной 10-ки
function selectWeightedWord(activeWords) {
    let stats = loadCategoryStats();
    let now = Date.now();

    if (activeWords.length === 0) return getSelectedCategoryData().words[0];
    
    let weights = activeWords.map(item => {
        let wordKey = item[0].toUpperCase();
        let wordData = stats[wordKey] || { level: 0, totalErrors: 0, lastSeen: 0 };
        
        let level = wordData.level || 0;
        let totalErrors = wordData.totalErrors || 0;
        let lastSeen = wordData.lastSeen || 0;
        
        let baseWeights = [100, 40, 15, 5, 2, 1];
        let baseWeight = baseWeights[level] || 1;
        let errorFactor = 1 + (totalErrors * 0.2);
        
        let intervals = [0, 1, 3, 7, 14, 30];
        let targetIntervalDays = intervals[level] || 30;
        
        let timeFactor = 1;
        if (lastSeen > 0 && targetIntervalDays > 0) {
            let daysPassed = (now - lastSeen) / (1000 * 60 * 60 * 24);
            timeFactor = 1 + Math.pow(daysPassed / targetIntervalDays, 2);
        }
        
        return baseWeight * errorFactor * timeFactor;
    });

    let totalWeight = weights.reduce((a, b) => a + b, 0);
    let randomNum = Math.random() * totalWeight;
    
    for (let i = 0; i < activeWords.length; i++) {
        randomNum -= weights[i];
        if (randomNum <= 0) {
            return activeWords[i];
        }
    }
    return activeWords[0];
}

// Обновление прогресса слова
function updateWordProgress(wordText, mistakes, usedHint) {
    let stats = loadCategoryStats();
    let wordKey = wordText.toUpperCase();
    let wordData = stats[wordKey] || { level: 0, totalErrors: 0, lastSeen: 0 };
    
    let currentLevel = wordData.level || 0;
    let totalErrors = wordData.totalErrors || 0;
    totalErrors += mistakes;
    
    let newLevel = currentLevel;
    
    if (mistakes >= 3) {
        newLevel = 0;
    } else if (usedHint) {
        newLevel = Math.max(0, currentLevel - 1);
    } else if (mistakes === 0) {
        newLevel = Math.min(5, currentLevel + 1);
    }
    
    stats[wordKey] = {
        level: newLevel,
        totalErrors: totalErrors,
        lastSeen: Date.now()
    };
    
    saveCategoryStats(stats);
}

// Расчет категории (для нижнего индикатора)
function calculateCategoryProgress() {
    let categoryData = getSelectedCategoryData();
    let words = categoryData.words;
    let stats = loadCategoryStats();
    
    let learnedCount = 0;
    let totalWords = words.length;

    words.forEach(item => {
        let wordKey = item[0].toUpperCase();
        if (stats[wordKey] && stats[wordKey].level === 5) {
            learnedCount++;
        }
    });

    let percentage = totalWords > 0 ? ((learnedCount / totalWords) * 100).toFixed(1) : 0;

    return {
        learned: learnedCount,
        total: totalWords,
        percentage: percentage
    };
}

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

function initCategorySelect() {
    let select = document.getElementById("categorySelect");
    if (!select) return;

    select.innerHTML = "";
    let savedCategory = localStorage.getItem('hangman_category');
    
    if (!savedCategory || !GAME_CATEGORIES[savedCategory]) {
        savedCategory = Object.keys(GAME_CATEGORIES)[0];
        localStorage.setItem('hangman_category', savedCategory);
    }

    for (let key in GAME_CATEGORIES) {
        let opt = document.createElement("option");
        opt.value = key;
        opt.textContent = GAME_CATEGORIES[key].title;
        if (key === savedCategory) {
            opt.selected = true;
        }
        select.appendChild(opt);
    }
}

function getSelectedCategoryData() {
    let selectedCategory = localStorage.getItem('hangman_category');
    if (GAME_CATEGORIES[selectedCategory]) {
        return GAME_CATEGORIES[selectedCategory];
    }
    let firstKey = Object.keys(GAME_CATEGORIES)[0];
    return GAME_CATEGORIES[firstKey];
}

function getBestVoice() {
    if (!('speechSynthesis' in window)) return null;
    let voices = window.speechSynthesis.getVoices();
    
    return voices.find(v => v.lang === 'it-IT') ||
           voices.find(v => v.lang.startsWith('it')) ||
           voices.find(v => v.lang.startsWith('es')) || null;
}

function speakWord(text, onEndCallback) {
    let cleanText = text.toLowerCase().trim();

    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        let bestVoice = getBestVoice();

        if (bestVoice) {
            let utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.voice = bestVoice;
            utterance.lang = bestVoice.lang;
            utterance.rate = 0.8;

            if (onEndCallback) {
                utterance.onend = onEndCallback;
                utterance.onerror = onEndCallback;
            }

            window.speechSynthesis.speak(utterance);
            return;
        }
    }

    let encodedText = encodeURIComponent(cleanText);
    let ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=la&client=tw-ob`;
    let ttsAudio = new Audio(ttsUrl);

    if (onEndCallback) {
        ttsAudio.onended = onEndCallback;
        ttsAudio.onerror = onEndCallback;
    }

    ttsAudio.play().catch(() => {
        if (onEndCallback) onEndCallback();
    });
}

function useHint() {
    let hintBtn = document.getElementById("hintButton");

    if (game) {
        speakWord(game.getWord());
    }

    if (!hintUsed) {
        hintUsed = true;
        if (hintBtn) {
            hintBtn.textContent = "🔊 Слушај поново";
        }
    }
}

// --- ЛОГИКА ИГРЫ ---

function Game()
{
    hintUsed = false;
    let activeWords = getActivePool();
    let selectedItem = selectWeightedWord(activeWords);
    
    let word = selectedItem[0];
    tip = selectedItem[1];
    word = word.toUpperCase();
    
    let guessedLetters = [];
    let maskedWord = "";
    let incorrectGuesses = 0;
    
    const categoryData = getSelectedCategoryData();
    const allLetters = categoryData.allLetters;
    let won = false;
    let lost = false;
    let roundProcessed = false;
    const maxGuesses = 7;

    for ( let i = 0; i < word.length; i++ )
    {
        let nextCharacter = word.charAt(i);
        let charCode = nextCharacter.charCodeAt(0);
        if( 65 <= charCode && charCode <= 90 )
        {
            nextCharacter = "_";
        }
        maskedWord += nextCharacter;
    }

    let guess = function( letter )
    {
        letter = letter.toUpperCase();
        if( !guessedLetters.includes( letter ) && !won && !lost )
        {   
            guessedLetters.push(letter);
            
            if( word.includes( letter ) )
            {
                let matchingIndexes = [];
                for ( let i = 0; i < word.length; i++ ) 
                {
                    if( word.charAt(i) === letter )
                    {
                        matchingIndexes.push( i );
                    }
                }

                matchingIndexes.forEach( function(index) {
                    maskedWord = replace( maskedWord, index, letter );
                }); 

                won = maskedWord === word;
                
                if(won) {
                    maskedWord = word;
                    if(!roundProcessed) {
                        currentStreak += 1;
                        if (currentStreak > recordStreak) {
                            recordStreak = currentStreak;
                            localStorage.setItem('hangman_record_streak', recordStreak);
                        }
                        localStorage.setItem('hangman_current_streak', currentStreak);
                        
                        updateWordProgress(word, incorrectGuesses, hintUsed);
                        registerDailyActivity();
                        roundProcessed = true;
                    }
                    speakWord(word, function() {
                        audio_win.play().catch(() => {});
                    });
                } else {
                    audio_yes.play().catch(() => {});
                }
            }
            else
            {
                handleIncorrectGuess();
            }
        }
    }

    let handleIncorrectGuess = function()
    {
        incorrectGuesses++;
        
        // Любая ошибка сбрасывает текущую серию побед
        currentStreak = 0;
        localStorage.setItem('hangman_current_streak', 0);

        lost = incorrectGuesses >= maxGuesses;
        if( lost )
        {
            maskedWord = word;
            if(!roundProcessed) {
                updateWordProgress(word, incorrectGuesses, hintUsed);
                roundProcessed = true;
            }
            speakWord(word, function() {
                audio_los.play().catch(() => {});
            });
        }
        else
        {
            audio_no.play().catch(() => {});
        }
    }

    return {
        "getWord": function(){ return word; },
        "getMaskedWord": function(){ return maskedWord; },
        "guess": guess,
        "getAllLetters": function(){ return [...allLetters]; },
        "getGuessedLetters": function(){ return guessedLetters; },
        "getIncorrectGuesses": function(){ return incorrectGuesses; },
        "isWon": function(){ return won; },
        "isLost": function(){ return lost; }
    };
}

function replace( value, index, replacement ) 
{
    return value.substring(0, index) + replacement + value.substring(index + replacement.length);
}

function listenForInput() 
{
    let guessLetter = function( letter )
    {
        if( game && letter && game.getAllLetters().includes(letter) )
        {
            let gameStillGoing = !game.isWon() && !game.isLost();
            if( gameStillGoing )
            {
                game.guess( letter );
                render();
            }
        }
    };

    let handleClick = function( event )
    {
        if (event.target.classList.contains('guess') && !event.target.classList.contains('disabled'))
        {
            guessLetter( event.target.innerHTML.trim() );
        }
    }

    let handleKeyPress = function( event )
    {
        let letter = null;
        let isLetter = event.keyCode >= 65 && event.keyCode <= 90;
        let newGameButton = document.getElementById("newGameButton");
        let gameOver = game ? (game.isWon() || game.isLost()) : false;

        if( isLetter )
        {
            letter = String.fromCharCode( event.keyCode );
        }
        else if( event.keyCode === 13 && gameOver )
        {
            newGameButton.click();
        }
        guessLetter( letter );
    }

    document.addEventListener('keydown', handleKeyPress );
    document.body.addEventListener('click', handleClick );
}

function render()
{
    if (!game) return;

    // 1. Отображение зашифрованного слова
    document.getElementById("word").innerHTML = game.getMaskedWord(); 
    
    // 2. Рендер верхней панели (ScoreBox)
    let streakData = checkDailyStreak();
    let rankInfo = getRankInfo(currentStreak);

    let streakDaysElem = document.getElementById("streakDaysValue");
    let streakFreezesElem = document.getElementById("streakFreezesValue");
    let rankTitleElem = document.getElementById("rankTitleValue");
    let rankIconElem = document.getElementById("rankIconValue");
    let currentStreakElem = document.getElementById("currentStreakValue");
    let recordStreakElem = document.getElementById("recordStreakValue");

    if (streakDaysElem) streakDaysElem.textContent = streakData.days;
    if (streakFreezesElem) streakFreezesElem.textContent = `${streakData.freezes}/3`;
    if (rankTitleElem) rankTitleElem.textContent = rankInfo.title;
    if (rankIconElem) rankIconElem.textContent = rankInfo.icon;
    if (currentStreakElem) currentStreakElem.textContent = currentStreak;
    if (recordStreakElem) recordStreakElem.textContent = recordStreak;

    // 3. Рендер Инкубатора (10 активных карточек)
    let incubatorBox = document.getElementById("incubatorBox");
    if (incubatorBox) {
        incubatorBox.innerHTML = "";
        let activeWords = getActivePool();
        let stats = loadCategoryStats();

        activeWords.forEach(item => {
            let wordKey = item[0].toUpperCase();
            let level = stats[wordKey] ? stats[wordKey].level : 0;
            
            let slot = document.createElement("span");
            slot.className = "incubator-slot";

            if (level === 5) {
                slot.textContent = "⭐";
                slot.classList.add("learned");
            } else if (level > 0) {
                slot.textContent = "🌱";
                slot.classList.add("in-progress");
            } else {
                slot.textContent = "⚪";
                slot.classList.add("new");
            }
            incubatorBox.appendChild(slot);
        });
    }

    // 4. Нижний индикатор прогресса категории
    let categoryProgress = calculateCategoryProgress();
    let categoryProgressElem = document.getElementById("categoryProgressValue");
    if (categoryProgressElem) {
        categoryProgressElem.textContent = `🎓 Научено у категорији: ${categoryProgress.learned} / ${categoryProgress.total} (${categoryProgress.percentage}%)`;
    }

    // 5. Рендер буквенной клавиатуры
    let guessesContainer = document.getElementById("guesses");
    guessesContainer.innerHTML = "";
    let guessedLetters = game.getGuessedLetters();
    
    game.getAllLetters().forEach( function(letter) {
        let isGuessed = guessedLetters.includes(letter);
        let disabledClass = isGuessed ? " disabled" : "";
        guessesContainer.innerHTML += "<span class='guess" + disabledClass + "'>" + letter + "</span>";
    });
    
    // 6. Подсказки и состояние картинок
    let tipBox = document.getElementById('tipBox');
    let hintBtn = document.getElementById("hintButton");
    let newGameButton = document.getElementById("newGameButton");
    let categorySelect = document.getElementById("categorySelect");
    let hangmanImg = document.getElementById("hangmanImage");

    tipBox.textContent = tip;
    if (categorySelect) categorySelect.disabled = false;

    if( game.isWon() )
    {
        hangmanImg.src = "img/hangman_win.jpeg";
        tipBox.className = "win";
        newGameButton.disabled = false;
        if (hintBtn) hintBtn.disabled = true;
    }
    else if( game.isLost() )
    {
        hangmanImg.src = "img/hangman" + game.getIncorrectGuesses() + ".jpeg";
        tipBox.className = "loss";
        newGameButton.disabled = false;
        if (hintBtn) hintBtn.disabled = true;
    }
    else
    {
        hangmanImg.src = "img/hangman" + game.getIncorrectGuesses() + ".jpeg";
        tipBox.className = "";
        if (!hintUsed && hintBtn) hintBtn.textContent = "🔊 Слушај фрау";
        newGameButton.disabled = true;
        if (hintBtn) hintBtn.disabled = false;
    }
}

function onCategoryChange() {
    let select = document.getElementById("categorySelect");
    if (select) {
        localStorage.setItem('hangman_category', select.value);
        newGame();
    }
}

function newGame()
{
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    game = new Game();
    render();
}

// Запуск игры
initCategorySelect();
listenForInput();
newGame();