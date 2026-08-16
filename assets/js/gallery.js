/**
 * HUST Graduation Invitation - Photo Gallery & Lightbox
 */

(function () {
  'use strict';

  const galleryItems = document.querySelectorAll('.gallery-item');
  const lightbox = document.getElementById('lightboxModal');
  const lightboxImg = document.getElementById('lightboxImage');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const closeBtn = document.getElementById('lightboxClose');
  const prevBtn = document.getElementById('lightboxPrev');
  const nextBtn = document.getElementById('lightboxNext');

  let currentIndex = 0;
  const photoList = [];

  galleryItems.forEach((item, index) => {
    const img = item.querySelector('.gallery-img');
    const title = item.querySelector('.gallery-overlay-title');
    const tag = item.querySelector('.gallery-overlay-tag');

    const src = img ? img.getAttribute('src') : '';
    const caption = title ? title.innerText : (img ? img.getAttribute('alt') : '');
    const sub = tag ? tag.innerText : '';

    photoList.push({
      src: src,
      caption: caption + (sub ? ` — ${sub}` : '')
    });

    item.addEventListener('click', () => {
      openLightbox(index);
    });
  });

  function openLightbox(index) {
    if (!lightbox || !lightboxImg || photoList.length === 0) return;
    currentIndex = index;
    updateLightboxContent();
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  function updateLightboxContent() {
    if (currentIndex < 0) currentIndex = photoList.length - 1;
    if (currentIndex >= photoList.length) currentIndex = 0;

    const currentPhoto = photoList[currentIndex];
    lightboxImg.src = currentPhoto.src;
    lightboxCaption.innerText = currentPhoto.caption;
  }

  function showNext() {
    currentIndex++;
    updateLightboxContent();
  }

  function showPrev() {
    currentIndex--;
    updateLightboxContent();
  }

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if (nextBtn) nextBtn.addEventListener('click', showNext);
  if (prevBtn) prevBtn.addEventListener('click', showPrev);

  // Close on backdrop click
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) {
        closeLightbox();
      }
    });
  }

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!lightbox || !lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') showNext();
    if (e.key === 'ArrowLeft') showPrev();
  });

  // Touch Swipe for Mobile
  let touchStartX = 0;
  let touchEndX = 0;

  if (lightbox) {
    lightbox.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    lightbox.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    }, { passive: true });
  }

  function handleSwipe() {
    const swipeThreshold = 50;
    if (touchEndX < touchStartX - swipeThreshold) {
      showNext();
    }
    if (touchEndX > touchStartX + swipeThreshold) {
      showPrev();
    }
  }
})();
