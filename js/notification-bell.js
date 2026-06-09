/**
 * 알림 종(🔔) 위젯 — 모든 페이지 공통
 *
 * 사용법:
 *   <script type="module" src="./js/notification-bell.js"></script>
 *   (스크립트만 끼우면 자동으로 우측 상단에 종 아이콘이 떠. 추가 호출 X)
 *
 * 동작:
 *   - notices(공지) / library(자료실 새 자료) / notifications(관리자 푸시) 3개 컬렉션을 최근 30일치 합쳐서 표시
 *   - localStorage.userInfo.category로 대상 필터
 *   - 종 위에 안 읽은 개수 빨간 배지
 *   - 종을 누르면 배지만 사라지고 리스트는 남음 (인스타 패턴) — lastSeenAt을 localStorage에 저장
 *   - 항목 클릭:
 *       · 공지 → notice.html
 *       · 자료실 → library.html
 *       · 푸시 알림 → 액션 없음 (펼침 토글)
 *   - 30일 지난 알림은 자동 제외
 */

import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, collection, query, orderBy, getDocs, limit }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const FB_CFG = {
  apiKey: 'AIzaSyD6r6R593RIfe8GCMjM3lgQgCcfiF0Rbuc',
  authDomain: 'au-ilhaksub.firebaseapp.com',
  projectId: 'au-ilhaksub',
  storageBucket: 'au-ilhaksub.firebasestorage.app',
  messagingSenderId: '407960160823',
  appId: '1:407960160823:web:1e830d6b0d69e4a7b84db2'
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const LS_LAST_SEEN = 'notifBell.lastSeenAt';
const MAX_ITEMS = 50;

// 사용자 카테고리 가져오기
function getUserCategory() {
  try {
    const ui = JSON.parse(localStorage.getItem('userInfo') || '{}');
    return ui.category || null;
  } catch { return null; }
}

// 사용자에게 보일 알림인지 판단 (target 매칭)
function matchesUser(target, userCategory) {
  if (!userCategory) return false;          // 카테고리 미설정 → 안 보임
  if (!target || target === 'all') return true;
  return target === userCategory;
}

// Firestore 데이터 가져오기 (3개 컬렉션)
async function fetchAllItems(db, userCategory) {
  const cutoff = Date.now() - THIRTY_DAYS_MS;
  const items = [];

  // 1) 공지사항 (notices)
  try {
    const snap = await getDocs(query(collection(db, 'notices'), orderBy('createdAt', 'desc'), limit(MAX_ITEMS)));
    snap.docs.forEach(d => {
      const data = d.data();
      const ts = typeof data.createdAt === 'number' ? data.createdAt
              : (data.createdAt?.toMillis?.() ?? 0);
      if (ts < cutoff) return;
      if (!matchesUser(data.target, userCategory)) return;
      items.push({
        id: 'notice_' + d.id,
        kind: 'notice',
        icon: '📢',
        title: data.title || '공지사항',
        body: stripHtml(data.content || '').slice(0, 80),
        ts,
        href: 'notice.html'
      });
    });
  } catch(e) { console.warn('[notif-bell] notices 조회 실패', e); }

  // 2) 자료실 새 자료 (library)
  try {
    const snap = await getDocs(query(collection(db, 'library'), orderBy('createdAt', 'desc'), limit(MAX_ITEMS)));
    snap.docs.forEach(d => {
      const data = d.data();
      const ts = typeof data.createdAt === 'number' ? data.createdAt
              : (data.createdAt?.toMillis?.() ?? 0);
      if (ts < cutoff) return;
      if (!matchesUser(data.target, userCategory)) return;
      items.push({
        id: 'lib_' + d.id,
        kind: 'library',
        icon: '📚',
        title: data.title || '새 자료',
        body: (data.category || '') + (data.subCategory ? ' · ' + data.subCategory : ''),
        ts,
        href: 'library.html'
      });
    });
  } catch(e) { console.warn('[notif-bell] library 조회 실패', e); }

  // 3) 관리자 푸시 알림 (notifications)
  try {
    const snap = await getDocs(query(collection(db, 'notifications'), orderBy('displayAt', 'desc'), limit(MAX_ITEMS)));
    const now = Date.now();
    snap.docs.forEach(d => {
      const data = d.data();
      const ts = data.displayAt || data.createdAt || 0;
      if (ts < cutoff) return;
      if (ts > now) return;                       // 미래 예약 → 시간 안 됨
      if (!matchesUser(data.target, userCategory)) return;
      items.push({
        id: 'push_' + d.id,
        kind: 'push',
        icon: '🔔',
        title: data.title || '알림',
        body: (data.message || '').slice(0, 100),
        ts,
        href: null
      });
    });
  } catch(e) { console.warn('[notif-bell] notifications 조회 실패', e); }

  // 시간순 내림차순 정렬 + 상한
  items.sort((a, b) => b.ts - a.ts);
  return items.slice(0, MAX_ITEMS);
}

function stripHtml(s) {
  const tmp = document.createElement('div');
  tmp.innerHTML = String(s);
  return tmp.textContent || tmp.innerText || '';
}

function formatTime(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return '방금';
  if (m < 60) return m + '분 전';
  if (h < 24) return h + '시간 전';
  if (d < 7) return d + '일 전';
  const dt = new Date(ts);
  return `${dt.getMonth() + 1}.${dt.getDate()}`;
}

// 스타일 주입
function injectStyles() {
  if (document.getElementById('notif-bell-style')) return;
  const css = `
    .notif-bell-wrap {
      position: fixed;
      top: calc(env(safe-area-inset-top, 0px) + 12px);
      right: calc(env(safe-area-inset-right, 0px) + 12px);
      z-index: 2147483000; font-family: 'Noto Sans KR', sans-serif;
    }
    .notif-bell-btn {
      width: 42px; height: 42px; border-radius: 50%;
      border: 1.5px solid rgba(49,130,246,0.25);
      background: #ffffff;
      box-shadow: 0 3px 10px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04);
      font-size: 20px; cursor: pointer; position: relative;
      transition: transform 0.15s, box-shadow 0.15s;
      padding: 0; line-height: 1;
    }
    .notif-bell-btn:hover { transform: scale(1.05); box-shadow: 0 5px 14px rgba(0,0,0,0.22); }
    .notif-bell-btn:active { transform: scale(0.95); }
    .notif-bell-badge {
      position: absolute; top: -2px; right: -2px;
      min-width: 18px; height: 18px; padding: 0 5px;
      background: #ff3b30; color: #fff; border-radius: 9px;
      font-size: 11px; font-weight: 700; line-height: 18px;
      box-shadow: 0 1px 4px rgba(255,59,48,0.4);
      display: none;
    }
    .notif-bell-badge.show { display: inline-block; }
    .notif-bell-panel {
      position: absolute; top: 48px; right: 0;
      width: 320px; max-height: 440px;
      background: #fff; border-radius: 14px;
      box-shadow: 0 8px 28px rgba(0,0,0,0.18);
      overflow: hidden; display: none;
      animation: notifBellSlideIn 0.18s ease-out;
    }
    .notif-bell-panel.open { display: flex; flex-direction: column; }
    @keyframes notifBellSlideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
    .notif-bell-header {
      padding: 14px 16px; border-bottom: 1px solid #f0f0f0;
      font-size: 14px; font-weight: 700; color: #1a1a1a;
      display: flex; justify-content: space-between; align-items: center;
    }
    .notif-bell-list { flex: 1; overflow-y: auto; }
    .notif-bell-item {
      display: flex; gap: 10px; padding: 12px 16px;
      border-bottom: 1px solid #f5f5f5;
      cursor: pointer; transition: background 0.12s;
      position: relative;
    }
    .notif-bell-item:hover { background: #f8f9fa; }
    .notif-bell-item.has-action { cursor: pointer; }
    .notif-bell-item.no-action { cursor: default; }
    .notif-bell-item.unread::before {
      content: ''; position: absolute; left: 6px; top: 50%;
      width: 6px; height: 6px; border-radius: 50%;
      background: #ff3b30; transform: translateY(-50%);
    }
    .notif-bell-icon { font-size: 18px; flex-shrink: 0; line-height: 1.3; }
    .notif-bell-body { flex: 1; min-width: 0; }
    .notif-bell-title { font-size: 13.5px; font-weight: 600; color: #1a1a1a; margin-bottom: 3px; line-height: 1.3; }
    .notif-bell-msg { font-size: 12px; color: #555; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .notif-bell-msg.expanded { white-space: normal; }
    .notif-bell-time { font-size: 11px; color: #999; margin-top: 4px; }
    .notif-bell-empty {
      padding: 40px 20px; text-align: center; color: #999; font-size: 13px;
    }
    .notif-bell-loading { padding: 30px 20px; text-align: center; color: #999; font-size: 13px; }
    /* 다크모드 대응 */
    @media (prefers-color-scheme: dark) {
      body.dark-mode .notif-bell-btn { background: rgba(40,40,40,0.92); color: #fff; }
      body.dark-mode .notif-bell-panel { background: #2a2a2a; color: #eee; }
      body.dark-mode .notif-bell-header { border-bottom-color: #3a3a3a; color: #fff; }
      body.dark-mode .notif-bell-item { border-bottom-color: #3a3a3a; }
      body.dark-mode .notif-bell-item:hover { background: #353535; }
      body.dark-mode .notif-bell-title { color: #fff; }
      body.dark-mode .notif-bell-msg { color: #bbb; }
    }
  `;
  const style = document.createElement('style');
  style.id = 'notif-bell-style';
  style.textContent = css;
  document.head.appendChild(style);
}

// 위젯 DOM 생성
function createWidget() {
  if (document.getElementById('notifBellWrap')) return null;
  const wrap = document.createElement('div');
  wrap.id = 'notifBellWrap';
  wrap.className = 'notif-bell-wrap';
  wrap.innerHTML = `
    <button class="notif-bell-btn" id="notifBellBtn" aria-label="알림">
      🔔<span class="notif-bell-badge" id="notifBellBadge">0</span>
    </button>
    <div class="notif-bell-panel" id="notifBellPanel">
      <div class="notif-bell-header">
        <span>알림</span>
      </div>
      <div class="notif-bell-list" id="notifBellList">
        <div class="notif-bell-loading">불러오는 중...</div>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);
  return wrap;
}

// 안 읽은 개수 계산
function countUnread(items) {
  const lastSeen = Number(localStorage.getItem(LS_LAST_SEEN) || 0);
  return items.filter(it => it.ts > lastSeen).length;
}

// 리스트 렌더
function renderList(items) {
  const listEl = document.getElementById('notifBellList');
  if (!listEl) return;
  if (items.length === 0) {
    listEl.innerHTML = '<div class="notif-bell-empty">📭 새 알림이 없어요</div>';
    return;
  }
  const lastSeen = Number(localStorage.getItem(LS_LAST_SEEN) || 0);
  listEl.innerHTML = items.map(it => {
    const unread = it.ts > lastSeen ? 'unread' : '';
    const action = it.href ? 'has-action' : 'no-action';
    return `
      <div class="notif-bell-item ${unread} ${action}" data-href="${it.href || ''}" data-id="${it.id}">
        <div class="notif-bell-icon">${it.icon}</div>
        <div class="notif-bell-body">
          <div class="notif-bell-title">${escapeHtml(it.title)}</div>
          <div class="notif-bell-msg" data-msg="${escapeHtml(it.body)}">${escapeHtml(it.body)}</div>
          <div class="notif-bell-time">${formatTime(it.ts)}</div>
        </div>
      </div>
    `;
  }).join('');

  // 클릭 핸들러
  listEl.querySelectorAll('.notif-bell-item').forEach(el => {
    el.addEventListener('click', () => {
      const href = el.getAttribute('data-href');
      if (href) {
        location.href = href;
      } else {
        // 푸시 알림은 펼치기 토글
        const msg = el.querySelector('.notif-bell-msg');
        if (msg) msg.classList.toggle('expanded');
      }
    });
  });
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function updateBadge(count) {
  const badge = document.getElementById('notifBellBadge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.classList.add('show');
  } else {
    badge.classList.remove('show');
  }
}

// 초기화
async function init() {
  const userCategory = getUserCategory();
  if (!userCategory) return;  // userInfo 없으면 위젯 비표시
  injectStyles();
  const wrap = createWidget();
  if (!wrap) return;  // 이미 존재하면 새로 안 만듦

  let items = [];
  let loaded = false;

  // Firestore 초기화
  const app = getApps().length ? getApps()[0] : initializeApp(FB_CFG);
  const db = getFirestore(app);

  // 데이터 로드 (백그라운드)
  async function loadAndRender() {
    try {
      items = await fetchAllItems(db, userCategory);
      loaded = true;
      const unread = countUnread(items);
      updateBadge(unread);
      // 패널이 열려있으면 즉시 렌더
      if (document.getElementById('notifBellPanel').classList.contains('open')) {
        renderList(items);
      }
    } catch(e) {
      console.warn('[notif-bell] 로드 실패', e);
    }
  }
  loadAndRender();

  // 종 클릭 핸들러
  const btn = document.getElementById('notifBellBtn');
  const panel = document.getElementById('notifBellPanel');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = panel.classList.toggle('open');
    if (isOpen) {
      // 패널 열림 → 리스트 렌더 + lastSeenAt 갱신 + 배지 제거
      if (loaded) renderList(items);
      localStorage.setItem(LS_LAST_SEEN, String(Date.now()));
      updateBadge(0);
    }
  });

  // 패널 바깥 클릭 시 닫기
  document.addEventListener('click', (e) => {
    if (!panel.classList.contains('open')) return;
    if (panel.contains(e.target) || btn.contains(e.target)) return;
    panel.classList.remove('open');
  });
}

// DOM 준비되면 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
