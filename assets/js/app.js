/**
 * HUST Graduation Invitation - Main Application Coordinator & Animations
 */

(function () {
  'use strict';

  // Theme: locked to Dark mode
  document.body.dataset.theme = 'dark';
  try { localStorage.removeItem('hust-theme'); } catch { /* ignore */ }
  if (window.LiquidGlassComponent) {
    window.LiquidGlassComponent.setTheme('dark');
  }

  // -------------------------------------------------------------------------
  // 1. ENVELOPE OPENING & CONFETTI
  // -------------------------------------------------------------------------
  const envelopeOverlay = document.getElementById('envelopeOverlay');
  const envelopeWrapper = document.getElementById('envelopeWrapper');
  const openEnvelopeBtn = document.getElementById('openEnvelopeBtn');
  const envelopeSeal = document.getElementById('envelopeSeal');

  let isEnvelopeOpened = false;

  function openEnvelope() {
    if (isEnvelopeOpened || !envelopeWrapper) return;
    isEnvelopeOpened = true;

    // Trigger open animation
    envelopeWrapper.classList.add('is-opening');

    // Trigger celebratory confetti explosion
    triggerConfetti();

    // Start ambient background music
    if (typeof window.startBackgroundMusic === 'function') {
      try {
        window.startBackgroundMusic();
      } catch (err) {
        console.warn('Could not auto-start music:', err);
      }
    }

    // Hide overlay after animation
    setTimeout(() => {
      if (envelopeOverlay) {
        envelopeOverlay.classList.add('opened');
      }
    }, 1200);
  }

  if (openEnvelopeBtn) openEnvelopeBtn.addEventListener('click', openEnvelope);
  if (envelopeSeal) envelopeSeal.addEventListener('click', openEnvelope);
  if (envelopeWrapper) envelopeWrapper.addEventListener('click', openEnvelope);

  // -------------------------------------------------------------------------
  // 2. CELEBRATION CONFETTI (Canvas Confetti + Fallback Particle Engine)
  // -------------------------------------------------------------------------
  const canvas = document.getElementById('confettiCanvas');
  let ctx = null;
  let particles = [];
  let animId = null;

  if (canvas) {
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  const confettiColors = ['#f2c14e', '#b4232f', '#159d8e', '#6bd4c6', '#ffffff', '#ffe4a3'];

  function triggerConfetti(options = {}) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const originY = options.origin && typeof options.origin.y === 'number' ? options.origin.y : 0.65;
    const originX = options.origin && typeof options.origin.x === 'number' ? options.origin.x : 0.5;
    const particleCount = options.count || options.particleCount || 160;

    // 1. If library canvas-confetti is loaded, fire realistic celebration bursts
    if (typeof window.confetti === 'function') {
      const defaults = {
        origin: { x: originX, y: originY },
        zIndex: 10005,
        colors: confettiColors
      };

      function fire(particleRatio, opts) {
        window.confetti(Object.assign({}, defaults, opts, {
          particleCount: Math.floor(particleCount * particleRatio)
        }));
      }

      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });

      if (options.sideCannons !== false) {
        setTimeout(() => {
          window.confetti({
            particleCount: 45,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: Math.min(0.85, originY + 0.1) },
            zIndex: 10005,
            colors: ['#f2c14e', '#159d8e', '#6bd4c6']
          });
          window.confetti({
            particleCount: 45,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: Math.min(0.85, originY + 0.1) },
            zIndex: 10005,
            colors: ['#f2c14e', '#b4232f', '#ffe4a3']
          });
        }, 220);
      }
      return;
    }

    // 2. High-performance self-contained canvas particle fireworks
    if (!canvas || !ctx) return;
    resizeCanvas();
    const newParticles = [];
    const spawnX = canvas.width * originX;
    const spawnY = canvas.height * originY;

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.PI * 2 * Math.random();
      const speed = Math.random() * 15 + 4;
      newParticles.push({
        x: spawnX + (Math.random() - 0.5) * 40,
        y: spawnY + (Math.random() - 0.5) * 40,
        w: Math.random() * 12 + 6,
        h: Math.random() * 8 + 4,
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
        vx: Math.cos(angle) * speed * 0.9,
        vy: -Math.abs(Math.sin(angle) * speed * 1.3) - 3, // Shoot upward like fireworks
        rot: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 12,
        opacity: 1
      });
    }
    particles = particles.concat(newParticles);
    if (!animId) {
      updateFallbackConfetti();
    }
  }

  function updateFallbackConfetti() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // Gravity
      p.rot += p.vRot;
      p.opacity -= 0.007;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    particles = particles.filter(p => p.opacity > 0 && p.y < canvas.height + 50);

    if (particles.length > 0) {
      animId = requestAnimationFrame(updateFallbackConfetti);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    }
  }

  // Export globally
  window.triggerConfetti = triggerConfetti;

  // -------------------------------------------------------------------------
  // 3. SCROLL REVEAL (AOS Lightweight)
  // -------------------------------------------------------------------------
  const revealElements = document.querySelectorAll('.reveal-on-scroll');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(el => revealObserver.observe(el));

  // -------------------------------------------------------------------------
  // 4. NAVBAR & DOCK ACTIVE HIGHLIGHT & SCROLL STATE
  // -------------------------------------------------------------------------
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  const dockItems = document.querySelectorAll('.dock-item');
  const siteNav = document.querySelector('.site-nav');

  function handleScroll() {
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    if (siteNav) {
      if (scrollY > 24) {
        siteNav.classList.add('scrolled');
      } else {
        siteNav.classList.remove('scrolled');
      }
    }

    sections.forEach(sec => {
      const secHeight = sec.offsetHeight;
      const secTop = sec.offsetTop - 120;
      const secId = sec.getAttribute('id');

      if (scrollY >= secTop && scrollY < secTop + secHeight) {
        navLinks.forEach(link => {
          if (link.getAttribute('href') === `#${secId}`) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });

        dockItems.forEach(dock => {
          if (dock.getAttribute('href') === `#${secId}`) {
            dock.classList.add('active');
          } else {
            dock.classList.remove('active');
          }
        });
      }
    });
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
})();
