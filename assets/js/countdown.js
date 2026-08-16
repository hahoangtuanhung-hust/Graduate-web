/**
 * HUST Graduation Invitation - Countdown Timer
 */

(function () {
  'use strict';

  // Set Target Date: August 30, 2026 at 08:00:00 AM (ICT / GMT+7)
  const targetDate = new Date('2026-08-30T08:00:00+07:00').getTime();

  const daysEl = document.getElementById('cdDays');
  const hoursEl = document.getElementById('cdHours');
  const minutesEl = document.getElementById('cdMinutes');
  const secondsEl = document.getElementById('cdSeconds');

  function updateCountdown() {
    const now = new Date().getTime();
    const distance = targetDate - now;

    if (distance <= 0) {
      if (daysEl) daysEl.innerText = '00';
      if (hoursEl) hoursEl.innerText = '00';
      if (minutesEl) minutesEl.innerText = '00';
      if (secondsEl) secondsEl.innerText = '00';
      const titleEl = document.querySelector('.countdown-title');
      if (titleEl) {
        titleEl.innerHTML = '🎉 LỄ TỐT NGHIỆP ĐANG DIỄN RA TẠI BÁCH KHOA HÀ NỘI! 🎉';
      }
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    if (daysEl) daysEl.innerText = String(days).padStart(2, '0');
    if (hoursEl) hoursEl.innerText = String(hours).padStart(2, '0');
    if (minutesEl) minutesEl.innerText = String(minutes).padStart(2, '0');
    if (secondsEl) secondsEl.innerText = String(seconds).padStart(2, '0');
  }

  setInterval(updateCountdown, 1000);
  updateCountdown();

  // Setup Add to Calendar handler
  window.addToGoogleCalendar = function () {
    const title = encodeURIComponent("Lễ Tốt Nghiệp Đại Học Bách Khoa Hà Nội - Hà Hoàng Tuấn Hùng");
    const details = encodeURIComponent("Trân trọng kính mời quý thầy cô, gia đình và bạn bè tới tham dự Lễ Trao Bằng Tốt Nghiệp K65 Đại học Bách Khoa Hà Nội.\nĐịa điểm: Hội trường C2 & Quảng trường C1 - ĐH Bách Khoa Hà Nội.");
    const location = encodeURIComponent("Hội trường C2, Đại học Bách Khoa Hà Nội, Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội");
    // Format: YYYYMMDDTHHmmssZ
    const startTime = "20260830T010000Z"; // 08:00 GMT+7 = 01:00 UTC
    const endTime = "20260830T050000Z";   // 12:00 GMT+7 = 05:00 UTC

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${details}&location=${location}&sf=true&output=xml`;
    window.open(googleCalendarUrl, '_blank');
  };
})();
