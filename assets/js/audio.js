/**
 * HUST Graduation Invitation - Background Music Player & Ambient Synthesizer
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. CẤU HÌNH NHẠC NỀN (Tùy chỉnh tại đây)
  // =========================================================================
  const AUDIO_CONFIG = {
    // Đường dẫn tới file nhạc nền (bạn copy file mp3 vào thư mục assets/audio/music.mp3)
    // Hoặc bạn có thể dán link nhạc online dạng: 'https://example.com/bai-hat.mp3'
    src: 'assets/audio/music.mp3?v=2',

    // Âm lượng mặc định: từ 0.0 (tắt) đến 1.0 (100%). Khuyên dùng 0.5 - 0.7
    volume: 0.6,

    // Tự động lặp lại bài hát khi phát hết
    loop: true,

    // Nếu chưa có file MP3, tự động phát giai điệu chuông Ambient thay thế để không bị im lặng
    fallbackToSynth: true
  };

  let isPlaying = false;
  let audioPlayer = null;
  let useSynthFallback = false;
  let audioCtx = null;
  let melodyInterval = null;

  const audioToggleBtn = document.getElementById('audioToggle');

  // =========================================================================
  // 2. KHỞI TẠO HTML5 AUDIO PLAYER (Hỗ trợ file MP3 / M4A / Online)
  // =========================================================================
  function initAudioPlayer() {
    if (audioPlayer) return audioPlayer;

    try {
      audioPlayer = new Audio();
      audioPlayer.src = AUDIO_CONFIG.src;
      audioPlayer.loop = AUDIO_CONFIG.loop;
      audioPlayer.volume = AUDIO_CONFIG.volume;
      audioPlayer.preload = 'auto';

      audioPlayer.addEventListener('play', () => {
        isPlaying = true;
        updateAudioBtnUI();
      });

      audioPlayer.addEventListener('pause', () => {
        if (!useSynthFallback) {
          isPlaying = false;
          updateAudioBtnUI();
        }
      });

      audioPlayer.addEventListener('ended', () => {
        if (!AUDIO_CONFIG.loop) {
          isPlaying = false;
          updateAudioBtnUI();
        }
      });

      // Nếu file nhạc bị lỗi (ví dụ chưa copy file vào hoặc đường dẫn sai)
      audioPlayer.addEventListener('error', (e) => {
        console.info('Chưa tìm thấy file nhạc MP3 (' + AUDIO_CONFIG.src + '), chuyển sang chế độ Ambient Melody.');
        useSynthFallback = true;
        if (isPlaying && AUDIO_CONFIG.fallbackToSynth) {
          startAmbientMelody();
        }
      });
    } catch (err) {
      console.warn('Lỗi khởi tạo Audio:', err);
      useSynthFallback = true;
    }

    return audioPlayer;
  }

  // =========================================================================
  // 3. CHẾ ĐỘ DỰ PHÒNG: WEB AUDIO SYNTHESIZER (Khi chưa có file MP3)
  // =========================================================================
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

    playTone(notes[melodySequence[seqIndex % melodySequence.length]], 1.4, 0.08);
    seqIndex++;

    melodyInterval = setInterval(() => {
      if (!isPlaying) return;
      const noteIdx = melodySequence[seqIndex % melodySequence.length];
      const freq = notes[noteIdx % notes.length];
      
      playTone(freq, 1.4, 0.07);
      
      if (seqIndex % 4 === 0) {
        playTone(notes[0] / 2, 2.5, 0.04);
      }

      seqIndex++;
    }, 600);
  }

  function stopAmbientMelody() {
    if (melodyInterval) {
      clearInterval(melodyInterval);
      melodyInterval = null;
    }
  }

  // =========================================================================
  // 4. CÁC HÀM ĐIỀU KHIỂN PHÁT / DỪNG NHẠC
  // =========================================================================
  function startMusic() {
    initAudioPlayer();

    if (useSynthFallback) {
      startAmbientMelody();
      return;
    }

    if (audioPlayer) {
      audioPlayer.play().then(() => {
        isPlaying = true;
        updateAudioBtnUI();
      }).catch((err) => {
        console.info('Trình duyệt chưa cho phép autoplay hoặc file mp3 chưa sẵn sàng, thử phát Synth:', err);
        if (AUDIO_CONFIG.fallbackToSynth) {
          useSynthFallback = true;
          startAmbientMelody();
        }
      });
    }
  }

  function stopMusic() {
    isPlaying = false;
    if (audioPlayer && !audioPlayer.paused) {
      audioPlayer.pause();
    }
    stopAmbientMelody();
    updateAudioBtnUI();
  }

  function toggleMusic() {
    if (isPlaying) {
      stopMusic();
    } else {
      startMusic();
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
    audioToggleBtn.addEventListener('click', toggleMusic);
  }

  // Xuất các hàm ra global để kích hoạt khi mở phong bì thiệp mời
  window.startBackgroundMusic = startMusic;
  window.toggleBackgroundMusic = toggleMusic;
  window.stopBackgroundMusic = stopMusic;
})();
