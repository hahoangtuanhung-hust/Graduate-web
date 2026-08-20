/**
 * HUST Graduation Invitation - Guestbook & Wishes System
 * Powered by Firebase Firestore
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
  increment,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Configuration provided by user
const firebaseConfig = {
  apiKey: "AIzaSyBQ_C6FQOKy8et_04VR2ugaibp-ibFYZWs",
  authDomain: "graduate-web-hhth.firebaseapp.com",
  projectId: "graduate-web-hhth",
  storageBucket: "graduate-web-hhth.firebasestorage.app",
  messagingSenderId: "436733329633",
  appId: "1:436733329633:web:cdd54145b88a2f0d5d77a0",
  measurementId: "G-LM5C3JXS4N"
};

// Initialize Firebase
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

// Emoji Pill selection for the main form
if (emojiPills.length > 0) {
  emojiPills.forEach(pill => {
    pill.addEventListener('click', () => {
      emojiPills.forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
      selectedEmoji = pill.getAttribute('data-emoji') || '🎓';
    });
  });
}

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

function formatTime(timestamp) {
  if (!timestamp) return "Đang gửi...";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// Render Wishes
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
    const comments = wish.comments || [];
    
    // Calculate total reactions and distinct emojis for the summary
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

    // Build comments HTML (Social style bubble)
    const commentsHtml = comments.map(c => `
      <div class="social-comment-item">
        <div class="social-comment-avatar">${getInitials(c.name)}</div>
        <div class="social-comment-content">
          <div class="social-comment-bubble">
            <div class="social-comment-author">${escapeHtml(c.name)}</div>
            <div class="social-comment-text">${escapeHtml(c.text)}</div>
          </div>
          <div class="social-comment-time">${formatTime(c.time)}</div>
        </div>
      </div>
    `).join('');

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

      <!-- Reactions & Comment Toggle (Social Style) -->
      <div class="social-actions-bar">
        <div class="social-reaction-container">
          <button class="social-action-btn">
            👍 Thích
          </button>
          <!-- Hover Tooltip for Reactions -->
          <div class="social-reaction-tooltip">
            <button class="reaction-btn" data-id="${wish.id}" data-type="👍">👍</button>
            <button class="reaction-btn" data-id="${wish.id}" data-type="❤️">❤️</button>
            <button class="reaction-btn" data-id="${wish.id}" data-type="😂">😂</button>
            <button class="reaction-btn" data-id="${wish.id}" data-type="😮">😮</button>
            <button class="reaction-btn" data-id="${wish.id}" data-type="😢">😢</button>
            <button class="reaction-btn" data-id="${wish.id}" data-type="🎉">🎉</button>
          </div>
        </div>
        
        <button class="social-action-btn comment-toggle-btn" data-id="${wish.id}">
          💬 Bình luận
        </button>
      </div>

      <!-- Comments Section -->
      <div class="comments-section" id="comments-${wish.id}">
        <div class="comment-list">
          ${commentsHtml}
        </div>
        <div class="social-comment-form">
          <div class="social-comment-avatar" style="width: 32px; height: 32px; font-size: 0.8rem;">Bạn</div>
          <div class="social-comment-inputs">
            <input type="text" id="c-name-${wish.id}" placeholder="Tên bạn..." required class="social-name-input">
            <div class="social-textarea-wrapper">
              <textarea id="c-text-${wish.id}" rows="1" placeholder="Viết bình luận..." required class="social-text-input"></textarea>
              <button class="comment-submit-btn" data-id="${wish.id}" title="Gửi">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `}).join('');
}

// Event Delegation for Reactions and Comments
if (wishesListEl) {
  wishesListEl.addEventListener('click', async (e) => {
    // Handle Reaction Click
    const reactBtn = e.target.closest('.reaction-btn');
    if (reactBtn) {
      const wishId = reactBtn.getAttribute('data-id');
      const reactionType = reactBtn.getAttribute('data-type');
      
      try {
        const wishRef = doc(db, 'wishes', wishId);
        await updateDoc(wishRef, {
          [`reactions.${reactionType}`]: increment(1)
        });
        
        // Add local active class just for feedback
        reactBtn.classList.add('active');
        setTimeout(() => reactBtn.classList.remove('active'), 1000);
      } catch (err) {
        console.error("Error updating reaction: ", err);
      }
      return;
    }

    // Handle Comment Toggle
    const toggleBtn = e.target.closest('.comment-toggle-btn');
    if (toggleBtn) {
      const wishId = toggleBtn.getAttribute('data-id');
      const commentSection = document.getElementById(`comments-${wishId}`);
      if (commentSection) {
        commentSection.classList.toggle('show');
      }
      return;
    }

    // Handle Comment Submit
    const submitBtn = e.target.closest('.comment-submit-btn');
    if (submitBtn) {
      const wishId = submitBtn.getAttribute('data-id');
      const nameInput = document.getElementById(`c-name-${wishId}`);
      const textInput = document.getElementById(`c-text-${wishId}`);
      
      const name = nameInput.value.trim();
      const text = textInput.value.trim();
      
      if (!name || !text) {
        alert('Vui lòng nhập tên và nội dung bình luận.');
        return;
      }
      
      const newComment = {
        name: name,
        text: text,
        time: new Date().toISOString()
      };
      
      submitBtn.innerText = 'Đang gửi...';
      submitBtn.disabled = true;

      try {
        const wishRef = doc(db, 'wishes', wishId);
        await updateDoc(wishRef, {
          comments: arrayUnion(newComment)
        });
        nameInput.value = '';
        textInput.value = '';
      } catch (err) {
        console.error("Error adding comment: ", err);
        alert('Lỗi khi gửi bình luận. Vui lòng thử lại.');
      } finally {
        submitBtn.innerText = 'Gửi bình luận';
        submitBtn.disabled = false;
      }
      return;
    }
  });
}

// Real-time listener for wishes
const q = query(wishesCollection, orderBy("timestamp", "desc"));
onSnapshot(q, (snapshot) => {
  const wishes = [];
  snapshot.forEach((doc) => {
    wishes.push({ id: doc.id, ...doc.data() });
  });
  currentWishes = wishes;
  renderWishes(filterSelectEl ? filterSelectEl.value : 'all');
}, (error) => {
  console.error("Error listening to wishes: ", error);
});

// Handle Form Submit
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
        name: name,
        relation: relation,
        message: message,
        emoji: selectedEmoji,
        timestamp: serverTimestamp(),
        reactions: {
          '❤️': 0,
          '👍': 0,
          '🎉': 0
        },
        comments: []
      });

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
      submitBtn.innerHTML = '✨ Đã gửi lời chúc thành công!';
      submitBtn.style.background = 'linear-gradient(135deg, #0D9488 0%, #10B981 100%)';
      setTimeout(() => {
        submitBtn.innerHTML = originalText;
        submitBtn.style.background = '';
        submitBtn.disabled = false;
      }, 3000);
      
    } catch (error) {
      console.error("Error adding document: ", error);
      alert('Đã xảy ra lỗi khi gửi lời chúc. Vui lòng thử lại sau.');
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
}

// Filter change event
if (filterSelectEl) {
  filterSelectEl.addEventListener('change', function () {
    renderWishes(this.value);
  });
}
