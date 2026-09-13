// js/audio.js

const audioCache = {};
let soundEffectsEnabled = true; // По умолчанию звуковые эффекты включены
let currentSpeechLang = 'la'; // Язык озвучки по умолчанию ('la', 'sr', 'en', 'ru')

/**
 * Установка языка озвучки
 */
function setSpeechLanguage(lang) {
  if (lang) {
    currentSpeechLang = lang;
  }
}

/**
 * Переключатель звуковых эффектов
 */
function setSoundEffectsEnabled(enabled) {
  soundEffectsEnabled = enabled;
  if (!enabled) {
    stopLongAudio();
  }
}

/**
 * Универсальная функция проигрывания звуковых файлов из папки audio/
 */
function playAudio(filename) {
  if (!soundEffectsEnabled) return;

  if (!audioCache[filename]) {
    audioCache[filename] = new Audio(`audio/${filename}`);
  }
  
  const sound = audioCache[filename];
  sound.currentTime = 0;
  sound.play().catch(err => console.warn(`Не удалось проиграть звук ${filename}:`, err));
}

/**
 * Мгновенно останавливает воспроизведение всех длинных аудиофайлов
 */
function stopLongAudio() {
  ['win.mp3', 'fajront.mp3', 'los.mp3'].forEach((filename) => {
    if (audioCache[filename]) {
      audioCache[filename].pause();
      audioCache[filename].currentTime = 0;
    }
  });
}

// Звуковые эффекты
function playYesAudio() { playAudio('yes.wav'); }
function playNoAudio() { playAudio('no.wav'); }
function playWinAudio() { playAudio('win.mp3'); }
function playLossAudio() { playAudio('fajront.mp3'); }

// Предзагрузка голосов для браузера
if ('speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}

/**
 * Подбор наиболее подходящего голоса в зависимости от языка с учетом фоллбэков
 */
function getBestVoice(lang = currentSpeechLang) {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();

  switch (lang) {
    case 'la':
      // Латынь: фоллбэк на итальянский или испанский по фонетике
      return voices.find(v => v.lang === 'it-IT') ||
             voices.find(v => v.lang.startsWith('it')) ||
             voices.find(v => v.lang.startsWith('es')) || null;

    case 'sr':
      // Сербский: фоллбэк на хорватский (hr) или боснийский (bs)
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
 * Озвучка слова с учетом текущего языка и фоллбэком на Google TTS
 */
function speakWord(text, onEndCallback) {
  if (!text) {
    if (onEndCallback) onEndCallback();
    return;
  }

  const cleanText = text.toLowerCase().trim();
  const targetLang = currentSpeechLang || 'la';

  // 1. Пробуем встроенный синтезатор браузера
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const bestVoice = getBestVoice(targetLang);

    if (bestVoice) {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.voice = bestVoice;
      utterance.lang = bestVoice.lang;
      utterance.rate = targetLang === 'la' ? 0.8 : 0.9;

      if (onEndCallback) {
        utterance.onend = onEndCallback;
        utterance.onerror = onEndCallback;
      }

      window.speechSynthesis.speak(utterance);
      return;
    }
  }

  // 2. Фоллбэк: Запрос к Google TTS
  const encodedText = encodeURIComponent(cleanText);
  const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=${targetLang}&client=tw-ob`;
  const ttsAudio = new Audio(ttsUrl);

  if (onEndCallback) {
    ttsAudio.onended = onEndCallback;
    ttsAudio.onerror = onEndCallback;
  }

  ttsAudio.play().catch((err) => {
    console.warn("Ошибка проигрывания Google TTS:", err);
    if (onEndCallback) onEndCallback();
  });
}