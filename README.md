# Hangman Game (Vešala)

A lightweight, mobile-responsive Hangman game built with HTML, CSS, and Vanilla JavaScript. Features classic Latin word guessing with Serbian (Cyrillic) hints, persistent score and high-score tracking, and multiple dictionary support.

## How to Add a New Word List (Dictionary)

Adding a new dictionary takes just 3 simple steps:

### 1. Create a new JavaScript file
Create a new file in the root directory (e.g., `words_geography.js`) and define your array of words and hints:

```javascript
const words_geography = [
    ["Roma", "Главни град Италије"],
    ["Beograd", "Главни град Србије"],
    ["Paris", "Главни град Француске"]
];

```

### 2. Register the dictionary in `config.js`

Open `config.js` and add your new category to the `GAME_CATEGORIES` object. Specify its title, variable name, and required alphabet:

```javascript
const GAME_CATEGORIES = {
    "latin": {
        title: "Речи",
        words: words_latin,
        allLetters: "ABCDEFGHILMNOPQRSTUVXYZ"
    },
    "phrases": {
        title: "Познате фразе",
        words: words_phrases,
        allLetters: "ABCDEFGHILMNOPQRSTUVXYZ"
    },
    "geography": {
        title: "Географија",
        words: words_geography,
        allLetters: "ABCDEFGHILMNOPQRSTUVXYZ"
    }
};

```

### 3. Include the file in `index.html`

Add a script tag for your new file right before `config.js`:

```html
    <!-- Word Lists -->
    <script src="words_latin.js?v=9"></script>
    <script src="words_phrases.js?v=9"></script>
    <script src="words_geography.js?v=9"></script>

    <!-- App Configuration & Logic -->
    <script src="config.js?v=9"></script>
    <script src="hangman.js?v=9"></script>

```

That's it! The new category will automatically appear in the drop-down menu on the page.

## Features

* **Persistent Scoring:** Tracks current score and high score across browser sessions using `localStorage`.
* **Dynamic Keyboard:** Custom letter sets dynamically adapt per active dictionary.
* **Serbian Localization:** Game interface and hints are in Serbian (Cyrillic).
