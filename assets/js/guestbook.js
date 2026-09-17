/**
 * HUST Graduation Invitation - Guestbook & Wishes System
 * Supports multi-emoji selection for wishes and multi-emoji reactions for comments
 * Works both with Firebase Firestore (real-time) and offline/file:/// LocalStorage fallback.
 */

(function () {
  'use strict';

  // ─── Firebase Configuration ──────────────────────────────────────────────────
  const firebaseConfig = {
    apiKey: "AIzaSyBQ_C6FQOKy8et_04VR2ugaibp-ibFYZWs",
    authDomain: "graduate-web-hhth.firebaseapp.com",
    projectId: "graduate-web-hhth",
    storageBucket: "graduate-web-hhth.firebasestorage.app",
    messagingSenderId: "436733329633",
    appId: "1:436733329633:web:cdd54145b88a2f0d5d77a0",
    measurementId: "G-LM5C3JXS4N"
  };

  let db = null;
  let wishesCollection = null;

  if (typeof firebase !== 'undefined') {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      db = firebase.firestore();
      wishesCollection = db.collection("wishes");
    } catch (err) {
      console.warn("Firebase initialization skipped or failed:", err);
    }
  }

  // ─── LocalStorage & Fallback Seed Data ───────────────────────────────────────
  const LS_LOCAL_WISHES = 'hust_guestbook_local_wishes';
  const LS_REACTIONS_KEY = 'hust_multi_reactions'; // { [wishId]: ['❤️', '🎉'] }

  const DEFAULT_WISHES = [
    {
      id: "sample-1",
      name: "Nguyễn Văn An",
      message: "Chúc mừng tân kỹ sư Bách Khoa! Chúc Hùng luôn gặt hái được nhiều thành công rực rỡ trên con đường sự nghiệp sắp tới! 🎓🚀",
      emojis: ["🎓", "🚀"],
      emoji: "🎓🚀",
      timestamp: { seconds: Math.floor(Date.now() / 1000) - 3600 },
      reactions: { '❤️': 8, '👍': 12, '😂': 0, '😮': 1, '🥲': 0, '🎉': 6 }
    },
    {
      id: "sample-2",
      name: "Trần Thị Mai",
      message: "Tự hào về cậu bạn cùng bàn năm nào quá! Chúc mừng bạn tốt nghiệp xuất sắc nha! 💐🎉💖",
      emojis: ["💐", "🎉", "💖"],
      emoji: "💐🎉💖",
      timestamp: { seconds: Math.floor(Date.now() / 1000) - 7200 },
      reactions: { '❤️': 15, '👍': 9, '😂': 1, '😮': 0, '🥲': 2, '🎉': 11 }
    },
    {
      id: "sample-3",
      name: "Thầy Lê Hoàng Long",
      message: "Chúc mừng em Hùng đã hoàn thành xuất sắc đồ án tốt nghiệp. Chúc em luôn giữ vững tinh thần người Bách Khoa!",
      emojis: ["🎓", "🌟"],
      emoji: "🎓🌟",
      timestamp: { seconds: Math.floor(Date.now() / 1000) - 14400 },
      reactions: { '❤️': 22, '👍': 19, '😂': 0, '😮': 0, '🥲': 4, '🎉': 14 }
    }
  ];

  function getLocalWishes() {
    try {
      const stored = localStorage.getItem(LS_LOCAL_WISHES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Could not read local wishes:", e);
    }
    return DEFAULT_WISHES;
  }

  function saveLocalWishes(wishes) {
    try {
      localStorage.setItem(LS_LOCAL_WISHES, JSON.stringify(wishes));
    } catch (e) {
      console.warn("Could not save local wishes:", e);
    }
  }

  // ─── Multi-Reactions Helpers ────────────────────────────────────────────────
  function getMyReactionsFor(wishId) {
    try {
      const data = JSON.parse(localStorage.getItem(LS_REACTIONS_KEY) || '{}');
      const list = data[wishId];
      if (Array.isArray(list)) return list;
      if (typeof list === 'string' && list) return [list];
      return [];
    } catch {
      return [];
    }
  }

  function toggleMyReaction(wishId, emoji) {
    try {
      const data = JSON.parse(localStorage.getItem(LS_REACTIONS_KEY) || '{}');
      let list = Array.isArray(data[wishId]) ? data[wishId] : (data[wishId] ? [data[wishId]] : []);
      const idx = list.indexOf(emoji);
      const isAdded = (idx === -1);
      if (isAdded) {
        list.push(emoji);
      } else {
        list.splice(idx, 1);
      }
      data[wishId] = list;
      localStorage.setItem(LS_REACTIONS_KEY, JSON.stringify(data));
      return isAdded;
    } catch (err) {
      console.warn("Could not update reaction locally:", err);
      return true;
    }
  }

  // ─── App State ──────────────────────────────────────────────────────────────
  let currentWishes = getLocalWishes();
  let selectedEmojis = ['🎓'];

  const formEl = document.getElementById('wishForm');
  const wishesListEl = document.getElementById('wishesList');
  const wishesCountEl = document.getElementById('wishesCount');
  const emojiPills = document.querySelectorAll('.emoji-pill');

  // ─── Multi-Emoji Selection in Form ──────────────────────────────────────────
  function syncEmojiSelection() {
    const pills = document.querySelectorAll('.emoji-pill');
    pills.forEach((pill) => {
      const emoji = pill.getAttribute('data-emoji');
      const isSelected = selectedEmojis.includes(emoji);
      pill.classList.toggle('selected', isSelected);
      pill.setAttribute('aria-pressed', String(isSelected));
    });
  }

  if (emojiPills.length > 0) {
    emojiPills.forEach((pill) => {
      pill.addEventListener('click', (e) => {
        e.preventDefault();
        const emoji = pill.getAttribute('data-emoji') || '🎓';
        const selectedIndex = selectedEmojis.indexOf(emoji);

        if (selectedIndex >= 0) {
          // Bỏ chọn emoji nếu đã chọn, nhưng giữ lại tối thiểu 1 emoji
          if (selectedEmojis.length > 1) {
            selectedEmojis.splice(selectedIndex, 1);
          }
        } else {
          // Thêm emoji vào danh sách chọn nhiều
          selectedEmojis.push(emoji);
        }

        syncEmojiSelection();
      });
    });
    syncEmojiSelection();
  }

  // ─── Utilities ──────────────────────────────────────────────────────────────
  function getInitials(name) {
    if (!name) return 'BK';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatTime(timestamp) {
    let date;
    if (timestamp) {
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else if (typeof timestamp === 'number') {
        date = new Date(timestamp);
      } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else {
        date = new Date();
      }
    } else {
      date = new Date();
    }

    if (isNaN(date.getTime())) date = new Date();

    const now = new Date();
    const diffSec = Math.max(0, Math.floor((now - date) / 1000));

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    const exactDateTime = `${hours}:${minutes} • ${day}/${month}/${year}`;

    if (diffSec < 60) {
      return `${exactDateTime} (vừa xong)`;
    }
    if (diffSec < 3600) {
      const m = Math.max(1, Math.floor(diffSec / 60));
      return `${exactDateTime} (${m} phút trước)`;
    }
    if (diffSec < 86400) {
      const h = Math.floor(diffSec / 3600);
      return `${exactDateTime} (${h} giờ trước)`;
    }
    if (diffSec < 86400 * 7) {
      const d = Math.floor(diffSec / 86400);
      return `${exactDateTime} (${d} ngày trước)`;
    }
    return exactDateTime;
  }

  // ─── Render Wishes Wall ─────────────────────────────────────────────────────
  function renderWishes() {
    if (!wishesListEl) return;

    if (wishesCountEl) {
      wishesCountEl.innerText = `${currentWishes.length} Lời chúc`;
    }

    if (currentWishes.length === 0) {
      wishesListEl.innerHTML = `
        <div class="wish-empty-state">
          <p>Chưa có lời chúc nào. Hãy là người đầu tiên gửi lời chúc tốt nghiệp nhé! ✨</p>
        </div>
      `;
      return;
    }

    wishesListEl.innerHTML = currentWishes.map((wish) => {
      const reactions = wish.reactions || {};
      const myReactions = getMyReactionsFor(wish.id);
      
      const wishEmojis = Array.isArray(wish.emojis) && wish.emojis.length > 0
        ? wish.emojis
        : (wish.emoji ? [wish.emoji] : ['🎓']);

      const emojiDisplay = wishEmojis
        .map(e => `<span aria-hidden="true">${escapeHtml(e)}</span>`)
        .join('');

      // Tổng hợp reactions
      let totalReactions = 0;
      let distinctEmojis = [];
      Object.entries(reactions).forEach(([emoji, count]) => {
        if (count > 0) {
          totalReactions += count;
          if (distinctEmojis.length < 4) distinctEmojis.push(emoji);
        }
      });

      const reactionSummaryHtml = totalReactions > 0
        ? `<div class="reaction-summary">
             <span class="reaction-summary-icons">${distinctEmojis.join('')}</span>
             <span class="reaction-summary-count">${totalReactions}</span>
           </div>`
        : '';

      const hasReacted = myReactions.length > 0;
      const likeLabel = hasReacted
        ? `${myReactions.join(' ')} Đã thả (${myReactions.length})`
        : `👍 Thả cảm xúc`;

      const allReactionTypes = ['👍', '❤️', '😂', '😮', '🥲', '🎉'];
      const timeStr = formatTime(wish.timestamp);

      return `
      <div class="wish-card" data-id="${wish.id}">
        <div class="wish-card-header">
          <div class="wish-author-info">
            <div class="wish-avatar">${getInitials(wish.name)}</div>
            <div class="wish-meta">
              <div class="wish-author-name">${escapeHtml(wish.name)}</div>
              <div class="wish-time" title="Thời gian gửi">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.75;">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>${timeStr}</span>
              </div>
            </div>
          </div>
          <div class="wish-emoji-reaction" title="Biểu tượng cảm xúc">${emojiDisplay}</div>
        </div>
        <div class="wish-message">${escapeHtml(wish.message)}</div>
        
        ${reactionSummaryHtml}

        <!-- Multi-Reaction Bar -->
        <div class="social-actions-bar">
          <div class="social-reaction-container${hasReacted ? ' reacted' : ''}">
            <button class="social-action-btn${hasReacted ? ' active' : ''}" type="button" title="Thả hoặc đổi cảm xúc">
              ${likeLabel}
            </button>
            
            <!-- Hover/Tap Tooltip for Reactions (Chọn được nhiều biểu tượng cảm xúc) -->
            <div class="social-reaction-tooltip">
              <span class="change-label" style="display:block; font-size:0.7rem; color:rgba(255,255,255,0.7); margin-bottom:4px; text-align:center;">
                ${hasReacted ? 'Chọn thêm hoặc bỏ chọn:' : 'Chọn cảm xúc (chọn nhiều):'}
              </span>
              <div style="display:flex; gap:6px; align-items:center;">
                ${allReactionTypes.map(rEmoji => {
                  const isUserChosen = myReactions.includes(rEmoji);
                  return `<button class="reaction-btn${isUserChosen ? ' user-reacted' : ''}" type="button" data-id="${wish.id}" data-type="${rEmoji}" title="${isUserChosen ? 'Bỏ chọn ' + rEmoji : 'Thả ' + rEmoji}" style="${isUserChosen ? 'background:rgba(21,157,142,0.35); border-radius:50%; box-shadow:0 0 8px rgba(78,205,196,0.6);' : ''}">${rEmoji}</button>`;
                }).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
      `;
    }).join('');
  }

  // Initial render
  renderWishes();

  // ─── Real-time Firestore Sync & Listener ────────────────────────────────────
  if (wishesCollection) {
    try {
      wishesCollection.orderBy("timestamp", "desc").onSnapshot(
        (snapshot) => {
          const wishes = [];
          snapshot.forEach((docSnap) => {
            wishes.push({ id: docSnap.id, ...docSnap.data() });
          });
          if (wishes.length > 0) {
            currentWishes = wishes;
            saveLocalWishes(wishes);
            renderWishes();
          }
        },
        (error) => {
          console.warn("Firestore onSnapshot error, using local wishes:", error);
          currentWishes = getLocalWishes();
          renderWishes();
        }
      );
    } catch (err) {
      console.warn("Could not bind Firestore listener:", err);
    }
  }

  // ─── Event Delegation for Reactions ─────────────────────────────────────────
  function isTouchDevice() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  }

  function closeAllTooltips() {
    document.querySelectorAll('.social-reaction-tooltip.touch-open').forEach((t) => {
      t.classList.remove('touch-open');
    });
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.social-reaction-container')) {
      closeAllTooltips();
    }
  });

  if (wishesListEl) {
    wishesListEl.addEventListener('click', async (e) => {
      // Touch support: toggle reaction tooltip on mobile
      if (isTouchDevice()) {
        const mainBtn = e.target.closest('.social-action-btn');
        if (mainBtn && mainBtn.closest('.social-reaction-container')) {
          e.stopPropagation();
          const container = mainBtn.closest('.social-reaction-container');
          const tooltip = container.querySelector('.social-reaction-tooltip');
          if (tooltip) {
            const isOpen = tooltip.classList.contains('touch-open');
            closeAllTooltips();
            if (!isOpen) tooltip.classList.add('touch-open');
            return;
          }
        }
      }

      // Handle clicking a reaction emoji button (toggles on / off)
      const reactBtn = e.target.closest('.reaction-btn');
      if (reactBtn) {
        e.preventDefault();
        e.stopPropagation();

        const wishId = reactBtn.getAttribute('data-id');
        const reactionType = reactBtn.getAttribute('data-type');
        if (!wishId || !reactionType) return;

        const isAdded = toggleMyReaction(wishId, reactionType);
        const delta = isAdded ? 1 : -1;

        // Cập nhật state nội bộ ngay lập tức để người dùng thấy phản hồi
        const targetWish = currentWishes.find(w => w.id === wishId);
        if (targetWish) {
          if (!targetWish.reactions) targetWish.reactions = {};
          targetWish.reactions[reactionType] = Math.max(0, (targetWish.reactions[reactionType] || 0) + delta);
          saveLocalWishes(currentWishes);
          renderWishes();
        }

        // Đồng bộ lên Firebase Firestore nếu có kết nối
        if (db && wishesCollection) {
          try {
            const wishRef = wishesCollection.doc(wishId);
            await wishRef.update({
              [`reactions.${reactionType}`]: firebase.firestore.FieldValue.increment(delta)
            });
          } catch (err) {
            console.warn("Could not sync reaction to Firebase:", err);
          }
        }
      }
    });
  }

  // ─── Handle Form Submit ─────────────────────────────────────────────────────
  if (formEl) {
    formEl.addEventListener('submit', async function (e) {
      e.preventDefault();

      const nameInput = document.getElementById('guestName');
      const messageInput = document.getElementById('guestMessage');

      const name = nameInput ? nameInput.value.trim() : '';
      const message = messageInput ? messageInput.value.trim() : '';

      if (!name || !message) {
        alert('Vui lòng nhập họ tên và lời chúc của bạn nhé!');
        return;
      }

      const submitBtn = formEl.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '⏳ Đang gửi...';
      submitBtn.disabled = true;

      const newWish = {
        id: "wish_" + Date.now(),
        name: name,
        message: message,
        emojis: [...selectedEmojis],
        emoji: selectedEmojis.join(''),
        timestamp: { seconds: Math.floor(Date.now() / 1000) },
        reactions: {
          '❤️': 0,
          '👍': 0,
          '😂': 0,
          '😮': 0,
          '🥲': 0,
          '🎉': 0
        }
      };

      // 1. Thêm vào danh sách local ngay lập tức
      currentWishes.unshift(newWish);
      saveLocalWishes(currentWishes);
      renderWishes();

      // 2. Bắn pháo giấy chúc mừng
      if (typeof window.triggerConfetti === 'function') {
        window.triggerConfetti();
      }

      // 3. Reset form và biểu tượng cảm xúc
      formEl.reset();
      selectedEmojis = ['🎓'];
      syncEmojiSelection();

      // 4. Đồng bộ lên Firebase Firestore nếu khả dụng
      if (wishesCollection) {
        try {
          const docRef = await wishesCollection.add({
            name: newWish.name,
            message: newWish.message,
            emojis: newWish.emojis,
            emoji: newWish.emoji,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            reactions: newWish.reactions
          });
          newWish.id = docRef.id;
          saveLocalWishes(currentWishes);
        } catch (error) {
          console.warn("Firestore write error, saved locally instead:", error);
        }
      }

      submitBtn.innerHTML = '✨ Đã gửi lời chúc thành công!';
      submitBtn.classList.add('is-success');

      setTimeout(() => {
        submitBtn.innerHTML = originalText;
        submitBtn.classList.remove('is-success');
        submitBtn.disabled = false;
      }, 2500);
    });
  }

})();
