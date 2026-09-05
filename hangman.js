let tip = ".";

// Пути к аудио
let audio_yes = new Audio("audio/yes.wav");
let audio_no = new Audio("audio/no.wav");
let audio_win = new Audio("audio/win.mp3");
let audio_los = new Audio("audio/fajront.mp3");

// Считываем счет и рекорд из localStorage
let score = parseInt(localStorage.getItem('hangman_score')) || 0;
let highScore = parseInt(localStorage.getItem('hangman_high_score')) || 0;

let hintUsed = false;

// Предзагрузка голосов для Chrome
if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
    };
}

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

// Поиск наилучшего голоса для латыни (Итальянский / Испанский)
function getBestVoice() {
    if (!('speechSynthesis' in window)) return null;
    let voices = window.speechSynthesis.getVoices();
    
    return voices.find(v => v.lang === 'it-IT') ||
           voices.find(v => v.lang.startsWith('it')) ||
           voices.find(v => v.lang.startsWith('es')) || null;
}

// Улучшенная функция озвучки
function speakWord(text, onEndCallback) {
    let cleanText = text.toLowerCase().trim();

    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();

        let bestVoice = getBestVoice();

        if (bestVoice) {
            let utterance = new SpeechSynthesisUtterance(cleanText);
            // ЯВНОЕ НАЗНАЧЕНИЕ ГОЛОСА (решает проблему с чтением на en-US)
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

    // ФОЛБЭК: Если голосовой движок недоступен или голос не найден
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

    if (typeof game !== 'undefined') {
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

function Game()
{
    hintUsed = false;
    let categoryData = getSelectedCategoryData();
    let currentWords = categoryData.words;
    let index = Math.floor(Math.random() * currentWords.length);
    let word = currentWords[index][0];
    tip = currentWords[index][1];
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

function listenForInput( game ) 
{
    let guessLetter = function( letter )
    {
        if( letter && game.getAllLetters().includes(letter) )
        {
            let gameStillGoing = !game.isWon() && !game.isLost();
            if( gameStillGoing )
            {
                game.guess( letter );
                render( game );
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
        let gameOver = game.isWon() || game.isLost();

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

function render( game )
{
    document.getElementById("word").innerHTML = game.getMaskedWord(); 
    
    document.getElementById("scoreValue").textContent = score;
    document.getElementById("highScoreValue").textContent = highScore;
    
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

    if( game.isWon() )
    {
        hangmanImg.src = "img/hangman_win.jpeg";
        tipBox.className = "win";
        newGameButton.disabled = false;
        if (categorySelect) categorySelect.disabled = false;
        if (hintBtn) hintBtn.disabled = true;
    }
    else if( game.isLost() )
    {
        hangmanImg.src = "img/hangman" + game.getIncorrectGuesses() + ".jpeg";
        tipBox.className = "loss";
        newGameButton.disabled = false;
        if (categorySelect) categorySelect.disabled = false;
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
        if (categorySelect) categorySelect.disabled = true;
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
    history.go(0);
}

// Запуск игры
initCategorySelect();
let game = new Game();
render( game );
listenForInput( game );