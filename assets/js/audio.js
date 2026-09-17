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
    try {
      if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
      }

      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch((e) => console.warn('Audio resume error', e));
      }
    } catch (err) {
      console.warn('AudioContext init error', err);
    }

    isPlaying = true;
    updateAudioBtnUI();

    if (melodyInterval) {
      clearInterval(melodyInterval);
      melodyInterval = null;
    }

    // Play initial note right away
    playTone(notes[melodySequence[seqIndex % melodySequence.length]], 1.4, 0.08);
    seqIndex++;

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
      audioToggleBtn.setAttribute('aria-label', 'Tắt nhạc nền');
    } else {
      audioToggleBtn.classList.remove('playing');
      audioToggleBtn.setAttribute('title', 'Bật nhạc nền');
      audioToggleBtn.setAttribute('aria-label', 'Bật nhạc nền');
    }
  }

  if (audioToggleBtn) {
    audioToggleBtn.addEventListener('click', toggleAudio);
  }

  // Export functions to global for envelope opener trigger
  window.startBackgroundMusic = startAmbientMelody;
  window.toggleBackgroundMusic = toggleAudio;
})();
