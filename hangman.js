const youWon = "Победили сте!";
const youLost = "Изгубили сте!";
let tip = ".";

let audio_yes = new Audio("audio/yes.mp3");
let audio_no = new Audio("audio/no.mp3");
let audio_win = new Audio("audio/win.mp3");
let audio_los = new Audio("audio/los.mp3");

let score = parseInt(localStorage.getItem('hangman_score')) || 0;
let highScore = parseInt(localStorage.getItem('hangman_high_score')) || 0;

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

function Game()
{
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
                    audio_win.play().catch(() => {});
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
            audio_los.play().catch(() => {});
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
    
    document.getElementById("hangmanImage").src = "img/hangman" + game.getIncorrectGuesses() + ".jpeg";

    let tipBox = document.getElementById('tipBox');
    let newGameButton = document.getElementById("newGameButton");
    let categorySelect = document.getElementById("categorySelect");
    
    if( game.isWon() )
    {
        tipBox.textContent = youWon + " " + tip;
        tipBox.className = "win";
        newGameButton.disabled = false;
        if (categorySelect) categorySelect.disabled = false;
    }
    else if( game.isLost() )
    {
        tipBox.textContent = youLost + " " + tip;
        tipBox.className = "loss";
        newGameButton.disabled = false;
        if (categorySelect) categorySelect.disabled = false;
    }
    else
    {
        tipBox.textContent = tip;
        tipBox.className = "";
        newGameButton.disabled = true;
        if (categorySelect) categorySelect.disabled = true;
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

// Запуск
initCategorySelect();
let game = new Game();
render( game );
listenForInput( game );