# Kafana

A lightweight, mobile-responsive Hangman game built with HTML5, CSS3, and Vanilla JavaScript, set in an atmospheric *kafana* theme. Designed for vocabulary learning across multiple languages and categories (Latin, Serbian verbs, anatomical terms, and phrases) with spaced repetition, smart speech synthesis, and customizable audio.

## Project Structure

```text
.
├── audio/            # Sound effects & pre-generated audio files (e.g., audio/sr/)
│   └── sr/           # Language-specific audio & _mapping.js
├── css/              # Stylesheets
├── img/              # Hangman stages & favicons
├── js/               # Application logic modules
│   ├── audio.js      # Speech synthesis & audio management
│   ├── config.js     # Categories definition & language settings
│   ├── main.js       # Core game loop & event handlers
│   ├── storage.js    # LocalStorage handling & SRS progression
│   ├── ui.js         # DOM rendering functions
│   └── words_*.js    # Dictionary files (anatomy, Serbian verbs, phrases, etc.)
├── tools/            # Helper scripts (e.g., TTS audio generation)
│   └── tts/          # Audio generation scripts
├── index.html        # Main HTML entry point
└── README.md

```

## Features

* **Multi-Language & Multi-Category Support:** Built for diverse vocabulary lists with configurable per-category language engines.
* **Spaced Repetition & Incubator:** Tracks learning progress for each word with levels and visual indicators.
* **Smart Audio Synthesis:** Pronounces words using browser speech synthesis (with language-specific fallbacks and pre-generated audio support) plus sound effect toggles.
* **Persistent Stats & Streaks:** Tracks current win streaks, high scores, and daily activity via `localStorage`.
* **Dynamic Keyboard & Input:** Supports on-screen virtual keyboard and physical keyboard input (with auto-restart on `Enter`/`Space` and `Escape`).
* **Kafana Atmosphere & Localization:** Clean UI with hints, extra details, and distinct visual feedback.

---

## How to Add a New Word List (Dictionary)

Adding a new dictionary takes 3 simple steps:

### 1. Create a new JavaScript file in `js/`

Create a new file inside the `js/` directory (e.g., `js/words_geography.js`). Each entry can have either 2 elements `[Word, Translation]` or 3 elements `[Word, Translation, Extra Info]`:

```javascript
const words_geography = [
    ["Roma", "Главни град Италије", "Италија"],
    ["Beograd", "Главни град Србије"],
    ["Paris", "Главни град Француске", "Француска"]
];

```

### 2. Register the dictionary in `js/config.js`

Open `js/config.js` and add your new category to the `GAME_CATEGORIES` object. Specify its title, language code (`lang`), word array, and required alphabet (`allLetters`):

```javascript
const GAME_CATEGORIES = {
    // ... other categories
    "geography": {
        title: "Географија",
        lang: "sr",
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

---

## Optional: Audio Generation (TTS)

If you need to generate or update audio pronunciations (for example, for Serbian via `tools/tts/generate_audio.py`):

### 1. How to run the script

From the root directory of the project in your terminal:

```bash
python tools/tts/generate_audio.py <path_to_js_file> <language: sr | la | ru | en>

```

Example:

```bash
python tools/tts/generate_audio.py js/words_serbia.js sr

```

### 2. What the script does automatically

* **Parses the JS file** — extracts all text phrases/words from the arrays.
* **Updates `_mapping.js**` — writes or expands the global object (e.g., `window.AUDIO_MAPPING_SR`, `_LA`, `_RU`, `_EN`), mapping source text to ASCII filenames.
* **Resolves collisions** — if two different words result in the same filename, it appends a suffix (`_2`, `_3`, etc.).
* **Generates `.mp3` files** — uses Google TTS (gTTS) to create missing audio files inside `audio/<lang>/`.
* **Cleans up orphaned files** — if you delete a word from the JS dictionary, the script automatically removes the corresponding `.mp3` from disk.

### 3. HTML Integration

In your `index.html`, make sure the mapping file for the active language is loaded *before* the main `audio.js`:

```html
<script src="audio/sr/_mapping.js"></script>
<script src="js/audio.js"></script>

```

### 4. File Structure

* `audio/<lang>/_mapping.js` — single source of truth mapping Word/Phrase => Filename.
* `audio/<lang>/FILENAME.mp3` — physical audio files.
