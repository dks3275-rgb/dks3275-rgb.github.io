// AU 일학습병행 - 다크모드 + 글자크기 전역 스크립트
// 모든 페이지에서 <script src="dark-mode.js"></script> 한 줄만 추가하면 자동 적용됨
(function() {
  const KEY = 'au_dark_mode';
  const FONT_KEY = 'au_font_size';

  // 글자 크기 적용 (FOUC 방지) - zoom 사용 (px 기반 페이지에서도 동작)
  function applyFontSize(pct) {
    // body가 없으면 html에 적용 (FOUC 방지)
    const target = document.body || document.documentElement;
    target.style.zoom = (pct / 100);
    // 폴백: rem 기반 콘텐츠를 위해 root font-size도 함께 조정
    document.documentElement.style.fontSize = pct + '%';
  }
  const savedFont = parseInt(localStorage.getItem(FONT_KEY) || '100');
  applyFontSize(savedFont);
  // body 준비 후 다시 적용 (초기 로드 시 body 없을 수 있음)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => applyFontSize(savedFont));
  }

  // 초기 적용 (FOUC 방지를 위해 즉시)
  function applyMode(mode) {
    if (mode === 'dark') {
      document.documentElement.classList.add('au-dark');
    } else {
      document.documentElement.classList.remove('au-dark');
    }
  }

  const saved = localStorage.getItem(KEY) || 'light';
  applyMode(saved);

  // 다크모드 CSS 주입
  const style = document.createElement('style');
  style.textContent = `
    html.au-dark {
      --au-dark-bg: #0f1419;
      --au-dark-card: #1a212b;
      --au-dark-border: #2d3748;
      --au-dark-text: #e2e8f0;
      --au-dark-text2: #a0aec0;
      filter: none;
    }
    html.au-dark body { background: var(--au-dark-bg) !important; color: var(--au-dark-text) !important; }
    html.au-dark .container, html.au-dark .card, html.au-dark .notice-card,
    html.au-dark .resource-card, html.au-dark .menu-card, html.au-dark .info-box,
    html.au-dark .consulting-card, html.au-dark .modal-content, html.au-dark .meta,
    html.au-dark .step-box, html.au-dark .contact-box, html.au-dark .category-card,
    html.au-dark .stat-card, html.au-dark .filter-select, html.au-dark .form-input,
    html.au-dark input[type="text"], html.au-dark input[type="email"],
    html.au-dark input[type="password"], html.au-dark input[type="number"],
    html.au-dark input[type="search"], html.au-dark input[type="date"],
    html.au-dark input[type="time"], html.au-dark input[type="datetime-local"],
    html.au-dark textarea, html.au-dark select {
      background: var(--au-dark-card) !important;
      color: var(--au-dark-text) !important;
      border-color: var(--au-dark-border) !important;
    }
    html.au-dark .notice-title, html.au-dark .card-title, html.au-dark h1,
    html.au-dark h2, html.au-dark h3, html.au-dark .card-info { color: var(--au-dark-text) !important; }
    html.au-dark .notice-preview, html.au-dark .card-desc, html.au-dark .empty,
    html.au-dark .loading, html.au-dark .card-meta, html.au-dark .text2 {
      color: var(--au-dark-text2) !important;
    }
    /* 헤더는 살짝만 어둡게 */
    html.au-dark .header { background: #1565c0 !important; }
    /* 자료실 카테고리 카드 텍스트 */
    html.au-dark .category-name { color: #90caf9 !important; }
    /* 토글 버튼들 */
    .au-fab-group {
      position: fixed; bottom: 20px; right: 20px;
      display: flex; flex-direction: column; gap: 8px;
      z-index: 9999;
    }
    .au-fab {
      width: 44px; height: 44px; border-radius: 50%;
      background: white; border: 1.5px solid #e4eaf4;
      font-size: 18px; cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s;
    }
    .au-fab:hover { transform: scale(1.1); }
    html.au-dark .au-fab {
      background: #2d3748; border-color: #4a5568; color: #e2e8f0;
    }
    .au-font-popup {
      position: absolute; right: 56px; bottom: 0;
      background: white; border: 1.5px solid #e4eaf4;
      border-radius: 12px; padding: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      display: flex; gap: 6px; align-items: center;
      white-space: nowrap;
    }
    html.au-dark .au-font-popup { background: #2d3748; border-color: #4a5568; color: #e2e8f0; }
    .au-font-btn {
      background: #f4f6fb; border: 1px solid #e4eaf4; border-radius: 8px;
      width: 32px; height: 32px; cursor: pointer; font-weight: 700;
    }
    html.au-dark .au-font-btn { background: #1a212b; border-color: #4a5568; color: #e2e8f0; }
  `;
  document.head.appendChild(style);

  // 토글 버튼들 추가 (DOM 준비 후)
  function addToggle() {
    if (document.querySelector('.au-fab-group')) return;
    const group = document.createElement('div');
    group.className = 'au-fab-group';

    // 글자 크기 버튼
    const fontBtn = document.createElement('button');
    fontBtn.className = 'au-fab';
    fontBtn.innerHTML = '🔠';
    fontBtn.title = '글자 크기 조절';
    fontBtn.setAttribute('aria-label', '글자 크기 조절');

    // 글자 크기 팝업
    const popup = document.createElement('div');
    popup.className = 'au-font-popup';
    popup.style.display = 'none';
    popup.innerHTML = `
      <button class="au-font-btn" data-action="dec">−</button>
      <span id="auFontPct" style="min-width:42px;text-align:center;font-weight:600;font-size:13px;">100%</span>
      <button class="au-font-btn" data-action="inc">+</button>
      <button class="au-font-btn" data-action="reset" title="초기화" style="font-size:11px;">⟲</button>
    `;
    function refreshFont() {
      const cur = parseInt(localStorage.getItem(FONT_KEY) || '100');
      document.documentElement.style.fontSize = cur + '%';
      const pctEl = popup.querySelector('#auFontPct');
      if (pctEl) pctEl.textContent = cur + '%';
    }
    popup.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (!action) return;
      let cur = parseInt(localStorage.getItem(FONT_KEY) || '100');
      // 5단계 프리셋: 80 → 100 → 130 → 160 → 200
      const presets = [80, 100, 130, 160, 200];
      if (action === 'inc') {
        const next = presets.find(p => p > cur);
        cur = next || 200;
      } else if (action === 'dec') {
        const reversed = [...presets].reverse();
        const prev = reversed.find(p => p < cur);
        cur = prev || 80;
      } else if (action === 'reset') {
        cur = 100;
      }
      localStorage.setItem(FONT_KEY, cur);
      applyFontSize(cur);
      refreshFont();
    });
    fontBtn.onclick = () => {
      popup.style.display = popup.style.display === 'none' ? 'flex' : 'none';
      refreshFont();
    };
    document.addEventListener('click', (e) => {
      if (!group.contains(e.target)) popup.style.display = 'none';
    });

    // 다크모드 버튼
    const darkBtn = document.createElement('button');
    darkBtn.className = 'au-fab';
    darkBtn.setAttribute('aria-label', '다크모드 전환');
    darkBtn.title = '다크모드 전환';
    function refreshDark() {
      const cur = localStorage.getItem(KEY) || 'light';
      darkBtn.innerHTML = cur === 'dark' ? '☀️' : '🌙';
    }
    darkBtn.onclick = function() {
      const cur = localStorage.getItem(KEY) || 'light';
      const next = cur === 'dark' ? 'light' : 'dark';
      localStorage.setItem(KEY, next);
      applyMode(next);
      refreshDark();
    };
    refreshDark();

    const fontWrap = document.createElement('div');
    fontWrap.style.position = 'relative';
    fontWrap.appendChild(popup);
    fontWrap.appendChild(fontBtn);

    group.appendChild(fontWrap);
    group.appendChild(darkBtn);
    document.body.appendChild(group);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addToggle);
  } else {
    addToggle();
  }
})();
