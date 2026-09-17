/**
 * Liquid Glass Pointer Cursor (Dual Element: Pinpoint Dot + Inertial Glass Halo)
 */
(function () {
  'use strict';

  const cursor = document.getElementById('cursorGlass');
  const dot = document.getElementById('cursorGlassDot');
  if (!cursor) return;

  const isCoarseOrReduced = window.matchMedia('(pointer: coarse), (prefers-reduced-motion: reduce)').matches;
  if (isCoarseOrReduced) return;

  // Immediately enable custom cursor on fine pointer devices
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.documentElement.classList.add('has-cursor-glass');
  }

  const interactiveSelector = 'a, button, input, textarea, select, [role="button"], [data-cursor-hover], .emoji-pill, .reaction-btn, .social-action-btn, .envelope-wrapper, .floating-accent-badge, .btn';
  
  let targetX = -100;
  let targetY = -100;
  let currentX = -100;
  let currentY = -100;
  let isHovered = false;
  let isVisible = false;
  let frameId = 0;

  function render() {
    frameId = 0;
    // Smooth trailing inertia for outer liquid glass halo
    currentX += (targetX - currentX) * 0.22;
    currentY += (targetY - currentY) * 0.22;

    cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;

    // Instant pinpoint tracking for center dot
    if (dot) {
      dot.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
    }

    if (Math.abs(targetX - currentX) > 0.08 || Math.abs(targetY - currentY) > 0.08) {
      frameId = requestAnimationFrame(render);
    }
  }

  function handlePointerMove(e) {
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;

    if (!document.documentElement.classList.contains('has-cursor-glass')) {
      document.documentElement.classList.add('has-cursor-glass');
    }

    targetX = e.clientX;
    targetY = e.clientY;

    if (!isVisible) {
      currentX = targetX;
      currentY = targetY;
      isVisible = true;
      cursor.classList.add('is-visible');
      if (dot) dot.classList.add('is-visible');
    }

    // Interactive Hover detection
    const el = document.elementFromPoint(targetX, targetY);
    const interactive = el instanceof Element && Boolean(el.closest(interactiveSelector));
    if (interactive !== isHovered) {
      isHovered = interactive;
      cursor.classList.toggle('is-hover', isHovered);
      if (dot) dot.classList.toggle('is-hover', isHovered);
    }

    if (!frameId) {
      frameId = requestAnimationFrame(render);
    }
  }

  function handleMouseDown() {
    cursor.classList.add('is-active');
    if (dot) dot.classList.add('is-active');
  }

  function handleMouseUp() {
    cursor.classList.remove('is-active');
    if (dot) dot.classList.remove('is-active');
  }

  function handleMouseLeave() {
    isVisible = false;
    cursor.classList.remove('is-visible', 'is-hover', 'is-active');
    if (dot) dot.classList.remove('is-visible', 'is-hover', 'is-active');
  }

  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  window.addEventListener('mousedown', handleMouseDown, { passive: true });
  window.addEventListener('mouseup', handleMouseUp, { passive: true });
  document.addEventListener('mouseleave', handleMouseLeave, { passive: true });
})();
