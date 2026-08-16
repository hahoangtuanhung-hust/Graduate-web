/**
 * HUST Graduation Invitation - Guestbook & Wishes System
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'hust_graduation_wishes_v1';

  // Default initial wishes if local storage is empty
  const defaultWishes = [
    {
      id: 'wish_1',
      name: 'GS. TS. Nguyễn Văn Minh',
      relation: 'Thầy cô',
      relationClass: 'teacher',
      message: 'Chúc mừng em Tuấn Hùng đã hoàn thành xuất sắc chặng đường 5 năm tại Trường CNTT&TT - ĐH Bách Khoa Hà Nội! Chúc em luôn giữ vững ngọn lửa đam mê công nghệ và gặt hái nhiều thành công rực rỡ.',
      emoji: '🎓',
      time: '15/08/2026 09:30'
    },
    {
      id: 'wish_2',
      name: 'Bố Mẹ & Em Gái',
      relation: 'Gia đình',
      relationClass: 'family',
      message: 'Tự hào về con trai của bố mẹ vô cùng! Cả nhà sẽ có mặt đông đủ tại Hội trường C2 từ sáng sớm để chúc mừng tân Kỹ sư Bách Khoa.',
      emoji: '💐',
      time: '15/08/2026 14:15'
    },
    {
      id: 'wish_3',
      name: 'Team Đồ Án K64 SoICT',
      relation: 'Bạn bè / Đồng môn',
      relationClass: 'friend',
      message: 'Sau bao đêm cày deadline tại Thư viện Tạ Quang Bửu thì ngày này cũng tới rồi! Chúc mừng người anh em tốt nghiệp loại Xuất Sắc, cùng nhau vươn ra biển lớn nào bro! 🚀',
      emoji: '🎉',
      time: '16/08/2026 10:00'
    },
    {
      id: 'wish_4',
      name: 'Nguyễn Thu Trang (K65 Bách Khoa)',
      relation: 'Bạn bè / Đồng môn',
      relationClass: 'friend',
      message: 'Chúc mừng anh Hùng đã chính thức cầm trên tay tấm bằng Kỹ sư Bách Khoa danh giá! Chúc anh sự nghiệp thăng hoa, rực rỡ và luôn tràn đầy năng lượng tích cực ạ!',
      emoji: '🌟',
      time: '16/08/2026 11:45'
    }
  ];

  // Load wishes
  function getStoredWishes() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Error reading from localStorage', e);
    }
    return defaultWishes;
  }

  function saveWishes(wishes) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wishes));
    } catch (e) {
      console.warn('Error writing to localStorage', e);
    }
  }

  let currentWishes = getStoredWishes();
  let selectedEmoji = '🎓';

  const formEl = document.getElementById('wishForm');
  const wishesListEl = document.getElementById('wishesList');
  const wishesCountEl = document.getElementById('wishesCount');
  const filterSelectEl = document.getElementById('wishesFilter');
  const emojiPills = document.querySelectorAll('.emoji-pill');

  // Emoji Pill selection
  if (emojiPills.length > 0) {
    emojiPills.forEach(pill => {
      pill.addEventListener('click', () => {
        emojiPills.forEach(p => p.classList.remove('selected'));
        pill.classList.add('selected');
        selectedEmoji = pill.getAttribute('data-emoji') || '🎓';
      });
    });
  }

  // Get initial letters for avatar
  function getInitials(name) {
    if (!name) return 'H';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  // Escape HTML to prevent XSS
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Render Wishes
  function renderWishes(filterValue = 'all') {
    if (!wishesListEl) return;

    let filtered = currentWishes;
    if (filterValue !== 'all') {
      filtered = currentWishes.filter(item => item.relation === filterValue);
    }

    if (wishesCountEl) {
      wishesCountEl.innerText = `${currentWishes.length} Lời chúc`;
    }

    if (filtered.length === 0) {
      wishesListEl.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--color-text-muted);">
          <p>Chưa có lời chúc nào trong mục này. Hãy là người đầu tiên gửi lời chúc nhé! ✨</p>
        </div>
      `;
      return;
    }

    wishesListEl.innerHTML = filtered.map(wish => `
      <div class="wish-card" data-id="${wish.id}">
        <div class="wish-card-header">
          <div class="wish-author-info">
            <div class="wish-avatar">${getInitials(wish.name)}</div>
            <div>
              <div class="wish-author-name">${escapeHtml(wish.name)}</div>
              <span class="wish-relation-badge">${escapeHtml(wish.relation)}</span>
            </div>
          </div>
          <div class="wish-emoji-reaction">${wish.emoji || '🎓'}</div>
        </div>
        <div class="wish-message">${escapeHtml(wish.message)}</div>
        <div class="wish-time">${escapeHtml(wish.time)}</div>
      </div>
    `).join('');
  }

  // Handle Form Submit
  if (formEl) {
    formEl.addEventListener('submit', function (e) {
      e.preventDefault();

      const nameInput = document.getElementById('guestName');
      const relationInput = document.getElementById('guestRelation');
      const messageInput = document.getElementById('guestMessage');

      const name = nameInput ? nameInput.value.trim() : '';
      const relation = relationInput ? relationInput.value : 'Bạn bè / Đồng môn';
      const message = messageInput ? messageInput.value.trim() : '';

      if (!name || !message) {
        alert('Vui lòng nhập họ tên và lời chúc của bạn nhé!');
        return;
      }

      const now = new Date();
      const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const newWish = {
        id: 'wish_' + Date.now(),
        name: name,
        relation: relation,
        message: message,
        emoji: selectedEmoji,
        time: timeStr
      };

      currentWishes.unshift(newWish);
      saveWishes(currentWishes);

      // Re-render
      renderWishes(filterSelectEl ? filterSelectEl.value : 'all');

      // Trigger Confetti
      if (window.triggerConfetti) {
        window.triggerConfetti();
      }

      // Reset form
      formEl.reset();
      selectedEmoji = '🎓';
      if (emojiPills.length > 0) {
        emojiPills.forEach((p, idx) => {
          if (idx === 0) p.classList.add('selected');
          else p.classList.remove('selected');
        });
      }

      // Success notification
      const submitBtn = formEl.querySelector('button[type="submit"]');
      if (submitBtn) {
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '✨ Đã gửi lời chúc thành công!';
        submitBtn.style.background = 'linear-gradient(135deg, #0D9488 0%, #10B981 100%)';
        setTimeout(() => {
          submitBtn.innerHTML = originalText;
          submitBtn.style.background = '';
        }, 3000);
      }
    });
  }

  // Filter change event
  if (filterSelectEl) {
    filterSelectEl.addEventListener('change', function () {
      renderWishes(this.value);
    });
  }

  // Initial render
  renderWishes();
})();
