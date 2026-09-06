# Hangman Game (Вешала / Латински језик)

A lightweight, mobile-responsive Hangman game built with HTML5, CSS3, and Vanilla JavaScript. Designed for learning Latin words and phrases with Serbian (Cyrillic) hints, spaced repetition progress tracking, smart browser speech synthesis, and multi-category support.

## Project Structure

```text
.
├── audio/            # Sound effects (win, loss, success, fail)
├── css/              # Stylesheets
├── img/              # Hangman stages & favicons
├── js/               # Application logic modules
│   ├── audio.js      # Speech synthesis & audio management
│   ├── config.js     # Categories definition & global config
│   ├── main.js       # Core game loop & event handlers
│   ├── storage.js    # LocalStorage handling & SRS progression
│   ├── ui.js         # DOM rendering functions
│   ├── words_*.js    # Dictionary files (anatomija, phrases, test, etc.)
└── index.html        # Main HTML entry point

```

## Features

* **Spaced Repetition & Incubator:** Tracks learning progress for each word (levels 0 to 5) with visual indicators (⚪, 🌱, ⭐).
* **Smart Audio Synthesis:** Pronounces Latin words using browser speech synthesis (with fallback to Italian/Spanish phonetics and Google TTS) plus quick-toggle sound settings.
* **Persistent Stats & Streaks:** Tracks current win streaks, high scores, and daily activity via `localStorage`.
* **Dynamic Keyboard & Input:** Supports on-screen virtual keyboard and physical keyboard input (with auto-restart on `Enter`/`Space` and `Escape`).
* **Serbian Localization:** Game interface, menus, and hints are fully localized in Serbian (Cyrillic).

---

## How to Add a New Word List (Dictionary)

Adding a new dictionary takes just 3 simple steps:

### 1. Create a new JavaScript file in `js/`

Create a new file inside the `js/` directory (e.g., `js/words_geography.js`) and define your array of words and hints:

```javascript
const words_geography = [
    ["Roma", "Главни град Италије"],
    ["Beograd", "Главни град Србије"],
    ["Paris", "Главни град Француске"]
];

```

### 2. Register the dictionary in `js/config.js`

Open `js/config.js` and add your new category to the `GAME_CATEGORIES` object. Specify its title, variable name, and required alphabet:

```javascript
const GAME_CATEGORIES = {
    // ... other categories
    "geography": {
        title: "Географија",
        words: words_geography,
        allLetters: "ABCDEFGHILMNOPQRSTUVXYZ"
    }
};

```

### 3. Include the file in `index.html`

Add a script tag for your new dictionary file inside `index.html` before the core app modules:

```html
    <!-- Word Lists -->
    <script src="js/words_anatomija_1.js?v=9"></script>
    <script src="js/words_phrases.js?v=9"></script>
    <script src="js/words_geography.js?v=9"></script>

    <!-- App Modules -->
    <script src="js/config.js?v=9"></script>
    <script src="js/storage.js?v=9"></script>
    <script src="js/ui.js?v=9"></script>
    <script src="js/audio.js?v=9"></script>
    <script src="js/main.js?v=9"></script>

```

That's it! The new category will automatically appear in the drop-down selection menu on the page.
