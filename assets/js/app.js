/**
 * HUST Graduation Invitation - Main Application Coordinator & Animations
 */

(function () {
  'use strict';

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

    // Trigger confetti
    triggerConfetti();

    // Try starting ambient music
    if (window.startBackgroundMusic) {
      window.startBackgroundMusic();
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
  // 2. CONFETTI CANNON (Canvas particle effect)
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

  const confettiColors = ['#D4AF37', '#1D4ED8', '#0D9488', '#F59E0B', '#EF4444', '#64DFDF', '#FDE68A'];

  function createConfettiParticles(count = 120) {
    const particlesArr = [];
    for (let i = 0; i < count; i++) {
      particlesArr.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 50,
        w: Math.random() * 10 + 6,
        h: Math.random() * 6 + 4,
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 4 + 3,
        rot: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 8,
        opacity: 1
      });
    }
    return particlesArr;
  }

  function updateConfetti() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vRot;
      p.opacity -= 0.0035;

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
      animId = requestAnimationFrame(updateConfetti);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animId);
    }
  }

  window.triggerConfetti = function () {
    if (!canvas || !ctx) return;
    particles = particles.concat(createConfettiParticles(100));
    if (!animId || particles.length <= 100) {
      updateConfetti();
    }
  };

  // -------------------------------------------------------------------------
  // 3. SCROLL REVEAL (AOS Lightweight)
  // -------------------------------------------------------------------------
  const revealElements = document.querySelectorAll('.reveal-on-scroll');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -50px 0px'
  });

  revealElements.forEach(el => revealObserver.observe(el));

  // -------------------------------------------------------------------------
  // 4. NAVBAR & DOCK ACTIVE HIGHLIGHT
  // -------------------------------------------------------------------------
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  const dockItems = document.querySelectorAll('.dock-item');

  function highlightNavigation() {
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

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

  window.addEventListener('scroll', highlightNavigation, { passive: true });
})();
