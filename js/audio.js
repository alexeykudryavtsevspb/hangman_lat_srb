// js/audio.js

const audioCache = {};
let soundEffectsEnabled = true; // Sound effects enabled by default
let currentSpeechLang = 'la'; // Default speech language ('la', 'sr', 'en', 'ru')

/**
 * Set speech language
 */
function setSpeechLanguage(lang) {
  if (lang) {
    currentSpeechLang = lang;
  }
}

/**
 * Toggle sound effects
 */
function setSoundEffectsEnabled(enabled) {
  soundEffectsEnabled = enabled;
  if (!enabled) {
    stopLongAudio();
  }
}

/**
 * Universal function to play sound files from the audio/ folder
 */
function playAudio(filename) {
  if (!soundEffectsEnabled) return;

  if (!audioCache[filename]) {
    audioCache[filename] = new Audio(`audio/${filename}`);
  }
  
  const sound = audioCache[filename];
  sound.currentTime = 0;
  sound.play().catch(err => console.warn(`Failed to play sound ${filename}:`, err));
}

/**
 * Immediately stops playback of all long audio files
 */
function stopLongAudio() {
  ['win.mp3', 'fajront.mp3', 'los.mp3'].forEach((filename) => {
    if (audioCache[filename]) {
      audioCache[filename].pause();
      audioCache[filename].currentTime = 0;
    }
  });
}

// Sound effects shortcuts
function playYesAudio() { playAudio('yes.wav'); }
function playNoAudio() { playAudio('no.wav'); }
function playWinAudio() { playAudio('win.mp3'); }
function playLossAudio() { playAudio('fajront.mp3'); }

// Preload browser voices
if ('speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}

/**
 * Pick the best matching voice depending on the language with fallbacks
 */
function getBestVoice(lang = currentSpeechLang) {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();

  switch (lang) {
    case 'la':
      return voices.find(v => v.lang === 'it-IT') ||
             voices.find(v => v.lang.startsWith('it')) ||
             voices.find(v => v.lang.startsWith('es')) || null;

    case 'sr':
      return voices.find(v => v.lang === 'sr-RS' || v.lang === 'sr') ||
             voices.find(v => v.lang.startsWith('sr')) ||
             voices.find(v => v.lang.startsWith('hr')) ||
             voices.find(v => v.lang.startsWith('bs')) || null;

    case 'en':
      return voices.find(v => v.lang === 'en-US') ||
             voices.find(v => v.lang === 'en-GB') ||
             voices.find(v => v.lang.startsWith('en')) || null;

    case 'ru':
      return voices.find(v => v.lang === 'ru-RU') ||
             voices.find(v => v.lang.startsWith('ru')) || null;

    default:
      return voices.find(v => v.lang.startsWith(lang)) || null;
  }
}

/**
 * Fallback speech synthesis using Web Speech API
 */
function fallbackSpeechSynth(text, targetLang, onEndCallback) {
  const cleanText = text.toLowerCase().trim();

  if (!('speechSynthesis' in window)) {
    if (onEndCallback) onEndCallback();
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(cleanText);
  
  const langMap = {
    'la': 'it-IT',
    'sr': 'sr-RS',
    'hr': 'hr-HR',
    'en': 'en-US',
    'ru': 'ru-RU'
  };

  utterance.lang = langMap[targetLang] || targetLang;

  const bestVoice = getBestVoice(targetLang);
  if (bestVoice) {
    utterance.voice = bestVoice;
    utterance.lang = bestVoice.lang;
  }

  utterance.rate = targetLang === 'la' ? 0.8 : 0.9;

  if (onEndCallback) {
    utterance.onend = onEndCallback;
    utterance.onerror = (e) => {
      console.warn("Speech synthesis error:", e);
      onEndCallback();
    };
  }

  window.speechSynthesis.speak(utterance);
}

/**
 * Speak word: checks mapping table from window.AUDIO_MAPPING_<LANG>,
 * plays audio/<lang>/<filename>.mp3 if mapped, otherwise falls back to speech synthesis.
 */
function speakWord(text, onEndCallback) {
  if (!text) {
    if (onEndCallback) onEndCallback();
    return;
  }

  const targetLang = currentSpeechLang || 'la';
  const mappingVarName = `AUDIO_MAPPING_${targetLang.toUpperCase()}`;
  const mapping = window[mappingVarName] || {};
  const filename = mapping[text];

  if (filename) {
    const audioPath = `audio/${targetLang}/${filename}.mp3`;
    const sound = new Audio(audioPath);
    let finished = false;

    const finish = () => {
      if (!finished) {
        finished = true;
        if (onEndCallback) onEndCallback();
      }
    };

    sound.onended = finish;
    sound.onerror = () => {
      fallbackSpeechSynth(text, targetLang, finish);
    };

    sound.play().catch(() => {
      fallbackSpeechSynth(text, targetLang, finish);
    });
    return;
  }

  // Fallback if phrase is not found in mapping table
  fallbackSpeechSynth(text, targetLang, onEndCallback);
}