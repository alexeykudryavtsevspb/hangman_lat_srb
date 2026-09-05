let tip = ".";

// Пути к аудио
let audio_yes = new Audio("audio/yes.wav");
let audio_no = new Audio("audio/no.wav");
let audio_win = new Audio("audio/win.mp3");
let audio_los = new Audio("audio/fajront.mp3");

let score = parseInt(localStorage.getItem('hangman_score')) || 0;
let highScore = parseInt(localStorage.getItem('hangman_high_score')) || 0;

let hintUsed = false;
let game = null; // Глобальный экземпляр текущей игры

// Предзагрузка голосов
if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
    };
}

// --- СИСТЕМА ИНТЕРВАЛЬНОГО ПОВТОРЕНИЯ (SRS) ---

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

// Расчет текущего слова по алгоритму рулетки (Weighted Random Choice)
function selectWeightedWord(words) {
    let stats = loadCategoryStats();
    let now = Date.now();
    
    let weights = words.map(item => {
        let wordKey = item[0].toUpperCase();
        let wordData = stats[wordKey] || { level: 0, totalErrors: 0, lastSeen: 0 };
        
        let level = wordData.level || 0;
        let totalErrors = wordData.totalErrors || 0;
        let lastSeen = wordData.lastSeen || 0;
        
        // 1. Базовый вес по уровню (0 уровень = максимальный приоритет)
        let baseWeights = [100, 40, 15, 5, 2, 1];
        let baseWeight = baseWeights[level] || 1;
        
        // 2. Фактор ошибок (+20% веса за каждую историческую ошибку)
        let errorFactor = 1 + (totalErrors * 0.2);
        
        // 3. Фактор времени (Интервалы: L0=0д, L1=1д, L2=3д, L3=7д, L4=14д, L5=30д)
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
    
    for (let i = 0; i < words.length; i++) {
        randomNum -= weights[i];
        if (randomNum <= 0) {
            return words[i];
        }
    }
    return words[0];
}

// Обновление прогресса слова по итогам раунда
function updateWordProgress(wordText, mistakes, usedHint) {
    let stats = loadCategoryStats();
    let wordKey = wordText.toUpperCase();
    let wordData = stats[wordKey] || { level: 0, totalErrors: 0, lastSeen: 0 };
    
    let currentLevel = wordData.level || 0;
    let totalErrors = wordData.totalErrors || 0;
    
    totalErrors += mistakes;
    
    let newLevel = currentLevel;
    
    if (mistakes >= 3) {
        newLevel = 0; // При частых ошибках/проиграше сбрасываем уровень
    } else if (usedHint) {
        newLevel = Math.max(0, currentLevel - 1); // Подсказка снижает уровень на 1
    } else if (mistakes === 0) {
        newLevel = Math.min(5, currentLevel + 1); // Идеальное решение поднимает уровень
    }
    
    stats[wordKey] = {
        level: newLevel,
        totalErrors: totalErrors,
        lastSeen: Date.now()
    };
    
    saveCategoryStats(stats);
}

// Расчет общего процента изученности категории
function calculateCategoryProgress() {
    let categoryData = getSelectedCategoryData();
    let words = categoryData.words;
    let stats = loadCategoryStats();
    
    let currentPoints = 0;
    let maxPoints = words.length * 5; // Максимальный уровень каждого слова = 5
    
    words.forEach(item => {
        let wordKey = item[0].toUpperCase();
        if (stats[wordKey] && stats[wordKey].level) {
            currentPoints += stats[wordKey].level;
        }
    });
    
    let rawPercentage = maxPoints > 0 ? (currentPoints / maxPoints) * 100 : 0;
    let percentage = Number(rawPercentage.toFixed(1));
    
    return {
        current: currentPoints,
        max: maxPoints,
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
        score = Math.max(0, score - 1);
        localStorage.setItem('hangman_score', score);
        document.getElementById("scoreValue").textContent = score;
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
    let categoryData = getSelectedCategoryData();
    let currentWords = categoryData.words;
    
    let selectedItem = selectWeightedWord(currentWords);
    let word = selectedItem[0];
    tip = selectedItem[1];
    word = word.toUpperCase();
    
    let guessedLetters = [];
    let maskedWord = "";
    let incorrectGuesses = 0;
    
    const allLetters = categoryData.allLetters;
    let won = false;
    let lost = false;
    let scoreUpdated = false;
    const maxGuesses = 7;

    for ( let i = 0; i < word.length; i++ )
    {
        let nextCharacter = word.charAt(i);
        let charCode = nextCharacter.charCodeAt(0);
        let A = 65;
        let Z = 90;
        if( A <= charCode && charCode <= Z )
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
                    if(!scoreUpdated) {
                        score += 1;
                        if (score > highScore) {
                            highScore = score;
                            localStorage.setItem('hangman_high_score', highScore);
                        }
                        localStorage.setItem('hangman_score', score);
                        
                        updateWordProgress(word, incorrectGuesses, hintUsed);
                        scoreUpdated = true;
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
        lost = incorrectGuesses >= maxGuesses;
        if( lost )
        {
            maskedWord = word;
            if(!scoreUpdated) {
                score = Math.max(0, score - 1);
                localStorage.setItem('hangman_score', score);
                
                updateWordProgress(word, incorrectGuesses, hintUsed);
                scoreUpdated = true;
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
        const A = 65;
        const Z = 90;
        const ENTER = 13;
        let isLetter = event.keyCode >= A && event.keyCode <= Z;
        let newGameButton = document.getElementById("newGameButton");
        let gameOver = game ? (game.isWon() || game.isLost()) : false;

        if( isLetter )
        {
            letter = String.fromCharCode( event.keyCode );
        }
        else if( event.keyCode === ENTER && gameOver )
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

    document.getElementById("word").innerHTML = game.getMaskedWord(); 
    
    document.getElementById("scoreValue").textContent = score;
    document.getElementById("highScoreValue").textContent = highScore;
    
    let progress = calculateCategoryProgress();
    let maxWordsInCategory = getSelectedCategoryData().words.length;
    let learnedWordsEquivalent = maxWordsInCategory > 0 ? Math.floor(progress.current / 5) : 0;

    let progressElem = document.getElementById("progressValue");
    if (progressElem) {
        progressElem.textContent = `${learnedWordsEquivalent} / ${maxWordsInCategory} (${progress.percentage}%)`;
    }
    
    let guessesContainer = document.getElementById("guesses");
    guessesContainer.innerHTML = "";
    
    let guessedLetters = game.getGuessedLetters();
    
    game.getAllLetters().forEach( function(letter) {
        let isGuessed = guessedLetters.includes(letter);
        let disabledClass = isGuessed ? " disabled" : "";
        
        let innerHtml = "<span class='guess" + disabledClass + "'>" + letter + "</span>";
        guessesContainer.innerHTML += innerHtml;
    });
    
    let tipBox = document.getElementById('tipBox');
    let hintBtn = document.getElementById("hintButton");
    let newGameButton = document.getElementById("newGameButton");
    let categorySelect = document.getElementById("categorySelect");
    let hangmanImg = document.getElementById("hangmanImage");

    tipBox.textContent = tip;

    // СЕЛЕКТОР КАТЕГОРИИ ВСЕГДА АКТИВЕН
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
        
        if (!hintUsed) {
            if (hintBtn) hintBtn.textContent = "🔊 Слушај фрау (-1 бод)";
        }
        
        newGameButton.disabled = true;
        if (hintBtn) hintBtn.disabled = false;
    }
}

function onCategoryChange() {
    let select = document.getElementById("categorySelect");
    if (select) {
        localStorage.setItem('hangman_category', select.value);
        newGame(); // Мгновенный перезапуск раунда без перезагрузки страницы
    }
}

function newGame()
{
    // Отменяем активную озвучку при смене раунда
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