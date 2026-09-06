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

// Удобные обертки для конкретных событий
function playYesAudio() { playAudio('yes.wav'); }
function playNoAudio() { playAudio('no.wav'); }
function playWinAudio() { playAudio('win.mp3'); }
function playLossAudio() { playAudio('los.mp3'); }

/**
 * Озвучка сербского текста с коллбеком после завершения речи
 */
function speakWord(text, onEndCallback) {
  if (!('speechSynthesis' in window)) {
    console.warn('Web Speech API не поддерживается.');
    if (onEndCallback) onEndCallback();
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'sr-RS';
  utterance.rate = 0.9;

  const voices = window.speechSynthesis.getVoices();
  const srVoice = voices.find(v => v.lang.includes('sr') || v.lang.includes('hr') || v.lang.includes('bs'));
  if (srVoice) {
    utterance.voice = srVoice;
  }

  if (onEndCallback) {
    utterance.onend = onEndCallback;
    utterance.onerror = onEndCallback;
  }

  window.speechSynthesis.speak(utterance);
}

// Старая функция для совместимости
function speakSerbianText(text) {
  speakWord(text);
}