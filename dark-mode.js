// AU 일학습병행 - 접근성 전역 스크립트 (글자 크기 조절)
// ※ 다크모드는 2026-05 디자인 리뉴얼과 함께 제거됨 (라이트 모드 단일)
// 모든 페이지에서 <script src="dark-mode.js"></script> 한 줄만 추가하면 자동 적용됨
(function() {
  const FONT_KEY = 'au_font_size';
  const LEGACY_DARK_KEY = 'au_dark_mode';

  // 레거시 다크모드 설정 정리 (기존 사용자가 다크로 저장된 경우 라이트로 리셋)
  try {
    if (localStorage.getItem(LEGACY_DARK_KEY)) {
      localStorage.removeItem(LEGACY_DARK_KEY);
    }
    // 혹시 클래스가 남아 있으면 제거
    document.documentElement.classList.remove('au-dark');
  } catch(e) {}

  // 글자 크기 적용 (FOUC 방지) - zoom 사용 (px 기반 페이지에서도 동작)
  function applyFontSize(pct) {
    const target = document.body || document.documentElement;
    target.style.zoom = (pct / 100);
    // 폴백: rem 기반 콘텐츠를 위해 root font-size도 함께 조정
    document.documentElement.style.fontSize = pct + '%';
  }
  const savedFont = parseInt(localStorage.getItem(FONT_KEY) || '100');
  applyFontSize(savedFont);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => applyFontSize(savedFont));
  }

  // 글자 크기 토글 UI 주입
  const style = document.createElement('style');
  style.textContent = `
    .au-fab-group {
      position: fixed; bottom: 20px; right: 20px;
      display: flex; flex-direction: column; gap: 8px;
      z-index: 9999;
    }
    .au-fab {
      width: 44px; height: 44px; border-radius: 50%;
      background: white; border: 1px solid #E5E8EB;
      font-size: 18px; cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.15s;
    }
    .au-fab:hover { transform: scale(1.06); }
    .au-font-popup {
      position: absolute; right: 56px; bottom: 0;
      background: white; border: 1px solid #E5E8EB;
      border-radius: 12px; padding: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.10);
      display: flex; gap: 6px; align-items: center;
      white-space: nowrap;
    }
    .au-font-btn {
      background: #F2F4F6; border: 1px solid #E5E8EB; border-radius: 8px;
      width: 32px; height: 32px; cursor: pointer; font-weight: 700;
    }
  `;
  document.head.appendChild(style);

  function addToggle() {
    if (document.querySelector('.au-fab-group')) return;
    const group = document.createElement('div');
    group.className = 'au-fab-group';

    const fontBtn = document.createElement('button');
    fontBtn.className = 'au-fab';
    fontBtn.innerHTML = '🔠';
    fontBtn.title = '글자 크기 조절';
    fontBtn.setAttribute('aria-label', '글자 크기 조절');

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

    const fontWrap = document.createElement('div');
    fontWrap.style.position = 'relative';
    fontWrap.appendChild(popup);
    fontWrap.appendChild(fontBtn);

    group.appendChild(fontWrap);
    document.body.appendChild(group);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addToggle);
  } else {
    addToggle();
  }
})();
