/**
 * Small liquid-glass pointer lens for fine pointer devices.
 * It stays separate from the full-screen Three.js glass renderer so it can
 * follow the pointer without triggering layout or repainting every surface.
 */
(function () {
  'use strict';

  const cursor = document.getElementById('cursorGlass');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!cursor || reducedMotion) return;

  const interactiveSelector = 'a, button, input, textarea, select, [role="button"], [data-cursor-hover]';
  const easing = 0.2;
  let targetX = -100;
  let targetY = -100;
  let currentX = targetX;
  let currentY = targetY;
  let currentScale = 0.8;
  let targetScale = 0.8;
  let frameId = 0;
  let isVisible = false;

  function scheduleRender() {
    if (!frameId) frameId = requestAnimationFrame(render);
  }

  function render() {
    frameId = 0;
    currentX += (targetX - currentX) * easing;
    currentY += (targetY - currentY) * easing;
    currentScale += (targetScale - currentScale) * easing;
    cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) scale(${currentScale})`;

    if (
      Math.abs(targetX - currentX) > 0.1 ||
      Math.abs(targetY - currentY) > 0.1 ||
      Math.abs(targetScale - currentScale) > 0.01
    ) {
      scheduleRender();
    }
  }

  function updateHoverState(x, y) {
    const element = document.elementFromPoint(x, y);
    const isInteractive = element instanceof Element && Boolean(element.closest(interactiveSelector));
    targetScale = isInteractive ? 1.45 : 0.8;
    cursor.classList.toggle('is-hover', isInteractive);
  }

  function handlePointerMove(event) {
    if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;

    if (!document.documentElement.classList.contains('has-cursor-glass')) {
      document.documentElement.classList.add('has-cursor-glass');
    }

    targetX = event.clientX;
    targetY = event.clientY;
    updateHoverState(targetX, targetY);

    if (!isVisible) {
      currentX = targetX;
      currentY = targetY;
      isVisible = true;
      cursor.classList.add('is-visible');
    }

    scheduleRender();
  }

  function hideCursor() {
    isVisible = false;
    cursor.classList.remove('is-visible', 'is-hover');
    targetScale = 0.8;
  }

  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  if (!('PointerEvent' in window)) {
    window.addEventListener('mousemove', handlePointerMove, { passive: true });
  }
  window.addEventListener('blur', hideCursor, { passive: true });
  document.addEventListener('pointerout', (event) => {
    if (!event.relatedTarget) hideCursor();
  }, { passive: true });
})();
