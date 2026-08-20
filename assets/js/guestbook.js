/**
 * HUST Graduation Invitation - Guestbook & Wishes System
 * Powered by Firebase Firestore
 * Reactions only — one reaction per user per wish (tracked via localStorage)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  increment
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBQ_C6FQOKy8et_04VR2ugaibp-ibFYZWs",
  authDomain: "graduate-web-hhth.firebaseapp.com",
  projectId: "graduate-web-hhth",
  storageBucket: "graduate-web-hhth.firebasestorage.app",
  messagingSenderId: "436733329633",
  appId: "1:436733329633:web:cdd54145b88a2f0d5d77a0",
  measurementId: "G-LM5C3JXS4N"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const wishesCollection = collection(db, "wishes");

let currentWishes = [];
let selectedEmoji = '🎓';

const formEl = document.getElementById('wishForm');
const wishesListEl = document.getElementById('wishesList');
const wishesCountEl = document.getElementById('wishesCount');
const filterSelectEl = document.getElementById('wishesFilter');
const emojiPills = document.querySelectorAll('.emoji-pill');

// ─── LocalStorage helpers for "one reaction per wish" ────────────────────────

const LS_KEY = 'hust_reactions'; // { wishId: 'emoji' }

function getMyReactions() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}');
  } catch { return {}; }
}

function saveMyReaction(wishId, emoji) {
  const map = getMyReactions();
  map[wishId] = emoji;
  localStorage.setItem(LS_KEY, JSON.stringify(map));
}

function removeMyReaction(wishId) {
  const map = getMyReactions();
  delete map[wishId];
  localStorage.setItem(LS_KEY, JSON.stringify(map));
}

function getMyReactionFor(wishId) {
  return getMyReactions()[wishId] || null;
}

// ─── Utility Functions ────────────────────────────────────────────────────────

function getInitials(name) {
  if (!name) return 'H';
  const parts = name.trim().split(' ');
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

// ─── Render Wishes ────────────────────────────────────────────────────────────

function renderWishes(filterValue = 'all') {
  if (!wishesListEl) return;

  let filtered = currentWishes;
  if (filterValue !== 'all') {
    filtered = currentWishes.filter(item => item.relation === filterValue);
  }

  if (wishesCountEl) {
    wishesCountEl.innerText = `${filtered.length} Lời chúc`;
  }

  if (filtered.length === 0) {
    wishesListEl.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--color-text-muted);">
        <p>Chưa có lời chúc nào trong mục này. Hãy là người đầu tiên gửi lời chúc nhé! ✨</p>
      </div>
    `;
    return;
  }

  wishesListEl.innerHTML = filtered.map(wish => {
    const reactions = wish.reactions || {};
    const myReaction = getMyReactionFor(wish.id);

    // Tổng hợp reactions
    let totalReactions = 0;
    let distinctEmojis = [];
    Object.entries(reactions).forEach(([emoji, count]) => {
      if (count > 0) {
        totalReactions += count;
        if (distinctEmojis.length < 3) distinctEmojis.push(emoji);
      }
    });

    const reactionSummaryHtml = totalReactions > 0
      ? `<div class="reaction-summary">
           <span class="reaction-summary-icons">${distinctEmojis.join('')}</span>
           <span class="reaction-summary-count">${totalReactions}</span>
         </div>`
      : '';

    // Label cho nút Thích theo reaction đã chọn
    const likeLabel = myReaction
      ? `${myReaction} Đã thả`
      : `👍 Thả cảm xúc`;

    return `
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
      
      ${reactionSummaryHtml}

      <!-- Reaction Bar -->
      <div class="social-actions-bar">
        <div class="social-reaction-container${myReaction ? ' reacted' : ''}">
          <button class="social-action-btn${myReaction ? ' active' : ''}" title="${myReaction ? 'Bạn đã thả ' + myReaction + '. Di chuột để đổi.' : 'Thả cảm xúc'}">
            ${likeLabel}
          </button>
          ${!myReaction ? `
          <!-- Hover Tooltip for Reactions (chỉ hiện khi chưa thả) -->
          <div class="social-reaction-tooltip">
            <button class="reaction-btn" data-id="${wish.id}" data-type="👍" title="Thích">👍</button>
            <button class="reaction-btn" data-id="${wish.id}" data-type="❤️" title="Yêu thích">❤️</button>
            <button class="reaction-btn" data-id="${wish.id}" data-type="😂" title="Haha">😂</button>
            <button class="reaction-btn" data-id="${wish.id}" data-type="😮" title="Wow">😮</button>
            <button class="reaction-btn" data-id="${wish.id}" data-type="🥲" title="Xúc động">🥲</button>
            <button class="reaction-btn" data-id="${wish.id}" data-type="🎉" title="Chúc mừng">🎉</button>
          </div>` : `
          <!-- Tooltip đổi cảm xúc khi đã thả -->
          <div class="social-reaction-tooltip change-reaction-tooltip">
            <span class="change-label">Đổi cảm xúc:</span>
            <button class="reaction-btn" data-id="${wish.id}" data-type="👍" title="Thích">👍</button>
            <button class="reaction-btn" data-id="${wish.id}" data-type="❤️" title="Yêu thích">❤️</button>
            <button class="reaction-btn" data-id="${wish.id}" data-type="😂" title="Haha">😂</button>
            <button class="reaction-btn" data-id="${wish.id}" data-type="😮" title="Wow">😮</button>
            <button class="reaction-btn" data-id="${wish.id}" data-type="🥲" title="Xúc động">🥲</button>
            <button class="reaction-btn" data-id="${wish.id}" data-type="🎉" title="Chúc mừng">🎉</button>
            <button class="remove-reaction-btn" data-id="${wish.id}" title="Bỏ cảm xúc">✕</button>
          </div>`}
        </div>
      </div>
    </div>
  `}).join('');
}

// ─── Event Delegation ─────────────────────────────────────────────────────────

// Touch support: toggle tooltip on tap for mobile
function isTouchDevice() {
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
}

// Close all open tooltips
function closeAllTooltips() {
  document.querySelectorAll('.social-reaction-tooltip.touch-open').forEach(t => {
    t.classList.remove('touch-open');
  });
}

// Add CSS for touch-open class
const style = document.createElement('style');
style.textContent = `
  @media (hover: none), (pointer: coarse) {
    .social-reaction-tooltip { pointer-events: none; }
    .social-reaction-tooltip.touch-open {
      opacity: 1 !important;
      visibility: visible !important;
      transform: translateX(-50%) translateY(0) !important;
      pointer-events: all;
    }
  }
`;
document.head.appendChild(style);

if (wishesListEl) {
  // Close tooltips when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.social-reaction-container')) {
      closeAllTooltips();
    }
  });

  wishesListEl.addEventListener('click', async (e) => {

    // On touch devices: toggle tooltip when tapping the main action button
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

    // Bỏ cảm xúc
    const removeBtn = e.target.closest('.remove-reaction-btn');
    if (removeBtn) {
      const wishId = removeBtn.getAttribute('data-id');
      const myReaction = getMyReactionFor(wishId);
      if (!myReaction) return;

      try {
        const wishRef = doc(db, 'wishes', wishId);
        await updateDoc(wishRef, {
          [`reactions.${myReaction}`]: increment(-1)
        });
        removeMyReaction(wishId);
        // Re-render locally without waiting for snapshot
        renderWishes(filterSelectEl ? filterSelectEl.value : 'all');
      } catch (err) {
        console.error("Error removing reaction:", err);
      }
      return;
    }

    // Thả / đổi cảm xúc
    const reactBtn = e.target.closest('.reaction-btn');
    if (reactBtn) {
      const wishId = reactBtn.getAttribute('data-id');
      const newReaction = reactBtn.getAttribute('data-type');
      const prevReaction = getMyReactionFor(wishId);

      if (prevReaction === newReaction) return; // Không thay đổi gì

      try {
        const wishRef = doc(db, 'wishes', wishId);
        const updates = {
          [`reactions.${newReaction}`]: increment(1)
        };
        // Giảm reaction cũ nếu có
        if (prevReaction) {
          updates[`reactions.${prevReaction}`] = increment(-1);
        }
        await updateDoc(wishRef, updates);
        saveMyReaction(wishId, newReaction);
        renderWishes(filterSelectEl ? filterSelectEl.value : 'all');
      } catch (err) {
        console.error("Error updating reaction:", err);
      }
      return;
    }
  });
}

// ─── Real-time Firestore Listener ─────────────────────────────────────────────

const q = query(wishesCollection, orderBy("timestamp", "desc"));
onSnapshot(q, (snapshot) => {
  const wishes = [];
  snapshot.forEach((docSnap) => {
    wishes.push({ id: docSnap.id, ...docSnap.data() });
  });
  currentWishes = wishes;
  renderWishes(filterSelectEl ? filterSelectEl.value : 'all');
}, (error) => {
  console.error("Error listening to wishes:", error);
});

// ─── Emoji Pill Selection (Form) ──────────────────────────────────────────────

if (emojiPills.length > 0) {
  emojiPills.forEach(pill => {
    pill.addEventListener('click', () => {
      emojiPills.forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
      selectedEmoji = pill.getAttribute('data-emoji') || '🎓';
    });
  });
}

// ─── Handle Form Submit ───────────────────────────────────────────────────────

if (formEl) {
  formEl.addEventListener('submit', async function (e) {
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

    const submitBtn = formEl.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '⏳ Đang gửi...';
    submitBtn.disabled = true;

    try {
      await addDoc(wishesCollection, {
        name,
        relation,
        message,
        emoji: selectedEmoji,
        timestamp: serverTimestamp(),
        reactions: {
          '❤️': 0,
          '👍': 0,
          '😂': 0,
          '😮': 0,
          '🥲': 0,
          '🎉': 0
        }
      });

      if (window.triggerConfetti) window.triggerConfetti();

      formEl.reset();
      selectedEmoji = '🎓';
      if (emojiPills.length > 0) {
        emojiPills.forEach((p, idx) => {
          if (idx === 0) p.classList.add('selected');
          else p.classList.remove('selected');
        });
      }

      submitBtn.innerHTML = '✨ Đã gửi lời chúc thành công!';
      submitBtn.style.background = 'linear-gradient(135deg, #0D9488 0%, #10B981 100%)';
      setTimeout(() => {
        submitBtn.innerHTML = originalText;
        submitBtn.style.background = '';
        submitBtn.disabled = false;
      }, 3000);

    } catch (error) {
      console.error("Error adding document:", error);
      alert('Đã xảy ra lỗi khi gửi lời chúc. Vui lòng thử lại sau.');
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
}

// ─── Filter change event ──────────────────────────────────────────────────────

if (filterSelectEl) {
  filterSelectEl.addEventListener('change', function () {
    renderWishes(this.value);
  });
}
