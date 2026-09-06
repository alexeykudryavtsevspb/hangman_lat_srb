// js/audio.js

const audioCache = {};

/**
 * Универсальная функция проигрывания звуковых файлов из папки audio/
 */
function playAudio(filename) {
  if (!audioCache[filename]) {
    audioCache[filename] = new Audio(`audio/${filename}`);
  }
  
  const sound = audioCache[filename];
  sound.currentTime = 0;
  sound.play().catch(err => console.warn(`Не удалось проиграть звук ${filename}:`, err));
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
 * Подбор наиболее подходящего голоса для латыни (Итальянский/Испанский идеальны по фонетике)
 */
function getBestVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  
  return voices.find(v => v.lang === 'it-IT') ||
         voices.find(v => v.lang.startsWith('it')) ||
         voices.find(v => v.lang.startsWith('es')) || null;
}

/**
 * Озвучка латинского слова с автоматическим фоллбэком на Google TTS
 */
function speakWord(text, onEndCallback) {
  if (!text) {
    if (onEndCallback) onEndCallback();
    return;
  }

  const cleanText = text.toLowerCase().trim();

  // 1. Пробуем встроенный синтезатор браузера
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const bestVoice = getBestVoice();

    if (bestVoice) {
      const utterance = new SpeechSynthesisUtterance(cleanText);
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

  // 2. Фоллбэк: Запрос к Google TTS (Латынь tl=la)
  const encodedText = encodeURIComponent(cleanText);
  const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=la&client=tw-ob`;
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

function speakSerbianText(text) {
  speakWord(text);
}