// js/audio.js

function speakSerbianText(text) {
  if (!('speechSynthesis' in window)) {
    console.warn('Web Speech API не поддерживается в этом браузере.');
    return;
  }

  // Останавливаем предыдущую речь, если она еще звучит
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'sr-RS'; // Сербский язык
  utterance.rate = 0.9;      // Чуть замедленная речь для обучающего эффекта

  // Подбор подходящего голоса
  const voices = window.speechSynthesis.getVoices();
  const srVoice = voices.find(v => v.lang.includes('sr') || v.lang.includes('hr') || v.lang.includes('bs'));
  if (srVoice) {
    utterance.voice = srVoice;
  }

  window.speechSynthesis.speak(utterance);
}