/**
 * HUST Graduation Invitation - Ambient Background Music (Web Audio Synthesizer & Audio Player)
 */

(function () {
  'use strict';

  let isPlaying = false;
  let audioCtx = null;
  let melodyInterval = null;

  const audioToggleBtn = document.getElementById('audioToggle');

  // Gentle Graduation Melodic Chords & Notes (Pentatonic ambient progression in C Major / G Major)
  const notes = [
    261.63, // C4
    293.66, // D4
    329.63, // E4
    392.00, // G4
    440.00, // A4
    523.25, // C5
    587.33, // D5
    659.25  // E5
  ];

  const melodySequence = [
    0, 2, 4, 3, 5, 4, 2, 1,
    0, 3, 4, 2, 5, 7, 6, 4,
    3, 4, 5, 2, 4, 3, 1, 0
  ];

  let seqIndex = 0;

  function playTone(freq, duration = 1.2, volume = 0.08) {
    if (!audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn('Audio tone error', e);
    }
  }

  function startAmbientMelody() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    isPlaying = true;
    updateAudioBtnUI();

    // Play subtle chord progression
    melodyInterval = setInterval(() => {
      if (!isPlaying) return;
      const noteIdx = melodySequence[seqIndex % melodySequence.length];
      const freq = notes[noteIdx % notes.length];
      
      // Play main melody note
      playTone(freq, 1.4, 0.07);
      
      // Occasionally play soft harmonic bass
      if (seqIndex % 4 === 0) {
        playTone(notes[0] / 2, 2.5, 0.04);
      }

      seqIndex++;
    }, 600);
  }

  function stopAmbientMelody() {
    isPlaying = false;
    if (melodyInterval) {
      clearInterval(melodyInterval);
      melodyInterval = null;
    }
    updateAudioBtnUI();
  }

  function toggleAudio() {
    if (isPlaying) {
      stopAmbientMelody();
    } else {
      startAmbientMelody();
    }
  }

  function updateAudioBtnUI() {
    if (!audioToggleBtn) return;
    if (isPlaying) {
      audioToggleBtn.classList.add('playing');
      audioToggleBtn.setAttribute('title', 'Tắt nhạc nền');
      audioToggleBtn.innerHTML = `
        <div class="equalizer-icon">
          <span class="equalizer-bar"></span>
          <span class="equalizer-bar"></span>
          <span class="equalizer-bar"></span>
        </div>
      `;
    } else {
      audioToggleBtn.classList.remove('playing');
      audioToggleBtn.setAttribute('title', 'Bật nhạc nền');
      audioToggleBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <line x1="23" y1="9" x2="17" y2="15"></line>
          <line x1="17" y1="9" x2="23" y2="15"></line>
        </svg>
      `;
    }
  }

  if (audioToggleBtn) {
    audioToggleBtn.addEventListener('click', toggleAudio);
  }

  // Export functions to global for envelope opener trigger
  window.startBackgroundMusic = startAmbientMelody;
  window.toggleBackgroundMusic = toggleAudio;
})();
