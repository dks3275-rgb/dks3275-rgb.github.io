/**
 * device-check.js
 * iOS Safari(non-standalone)에서 PWA 재가입 문제를 방지하기 위한 감지 로직
 *
 * 사용 방법:
 *   <script src="device-check.js"></script>                    → 함수만 제공 (커스텀 통합용)
 *   <script src="device-check.js" data-auto-block></script>    → DOMContentLoaded에 자동 차단
 *
 * API (window.DeviceCheck):
 *   - isIOS()              : iPad/iPhone/iPod 여부
 *   - isStandalone()       : 홈화면 추가된 PWA 모드 여부
 *   - shouldBlockSignup()  : isIOS && !isStandalone
 *   - renderIOSInstallBlock([opts]) : 차단 오버레이 수동 표시
 *   - autoBlock([opts])    : shouldBlockSignup() 시 오버레이 표시, boolean 반환
 */
(function () {
  'use strict';

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
        || window.navigator.standalone === true;
  }

  function shouldBlockSignup() {
    return isIOS() && !isStandalone();
  }

  function renderIOSInstallBlock(options) {
    options = options || {};
    var title = options.title || '먼저 홈 화면에 추가해주세요';
    var subtitle = options.subtitle || '가입 정보 저장을 위해 앱 설치가 먼저 필요합니다';

    // 기존 가입 모달이 열려 있으면 강제로 닫기 (index.html 대응)
    var existingModal = document.getElementById('modalOverlay');
    if (existingModal) existingModal.style.display = 'none';

    // 중복 생성 방지
    if (document.getElementById('iosInstallBlock')) return;

    function stepHtml(n, text) {
      return '<div style="display:flex;align-items:flex-start;gap:12px;padding:8px 0;">' +
        '<div style="width:24px;height:24px;border-radius:50%;background:#2196f3;color:white;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + n + '</div>' +
        '<div style="font-size:13px;line-height:1.6;color:#1a2a3a;padding-top:1px;">' + text + '</div>' +
      '</div>';
    }

    var overlay = document.createElement('div');
    overlay.id = 'iosInstallBlock';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:9999',
      'background:#f4f6fb',
      'display:flex', 'align-items:center', 'justify-content:center',
      'padding:20px',
      'font-family:"Noto Sans KR",sans-serif',
      'overflow-y:auto'
    ].join(';');

    overlay.innerHTML = [
      '<div style="background:white;border-radius:24px;padding:32px 24px;width:100%;max-width:380px;box-shadow:0 20px 60px rgba(0,0,0,0.15);text-align:center;">',
        // ▼ 이미지 placeholder — 추후 실제 이미지로 교체 예정
        // 예: <img src="install-hero.png" alt="홈 화면에 추가" style="width:88px;height:88px;margin:0 auto 20px;display:block;" />
        '<div style="width:88px;height:88px;margin:0 auto 20px;border-radius:22px;background:linear-gradient(135deg,#2196f3,#1976d2);display:flex;align-items:center;justify-content:center;font-size:44px;box-shadow:0 10px 30px rgba(33,150,243,0.35);">📲</div>',
        '<h2 style="font-size:20px;font-weight:900;color:#1a2a3a;margin-bottom:10px;line-height:1.35;">' + title + '</h2>',
        '<p style="font-size:13px;color:#5a7090;line-height:1.6;margin-bottom:22px;">' + subtitle + '</p>',
        '<div style="background:#f4f6fb;border-radius:14px;padding:14px 18px;margin-bottom:18px;text-align:left;">',
          stepHtml(1, '화면 하단 <span style="display:inline-block;background:white;border:1.5px solid #e4eaf4;padding:1px 6px;border-radius:5px;font-weight:700;">⬆ 공유</span> 버튼을 눌러주세요'),
          stepHtml(2, '<span style="color:#1976d2;font-weight:700;">홈 화면에 추가</span>를 선택해주세요'),
          stepHtml(3, '추가된 <span style="color:#1976d2;font-weight:700;">앱 아이콘</span>으로 다시 접속해주세요'),
        '</div>',
        '<div style="background:#fffbf0;border:1px solid rgba(232,160,32,0.3);border-radius:10px;padding:12px 14px;font-size:12px;color:#92400e;line-height:1.5;text-align:left;">',
          '<strong style="color:#78350f;">⚠️ Safari(사파리)에서만 홈 화면 추가가 가능합니다.</strong><br>',
          '크롬·네이버 등 다른 브라우저로 열렸다면 Safari로 다시 접속해주세요.',
        '</div>',
      '</div>'
    ].join('');

    (document.body || document.documentElement).appendChild(overlay);
  }

  function autoBlock(options) {
    if (shouldBlockSignup()) {
      renderIOSInstallBlock(options);
      return true;
    }
    return false;
  }

  window.DeviceCheck = {
    isIOS: isIOS,
    isStandalone: isStandalone,
    shouldBlockSignup: shouldBlockSignup,
    renderIOSInstallBlock: renderIOSInstallBlock,
    autoBlock: autoBlock
  };

  // data-auto-block 속성이 있는 script 태그로 import된 경우 자동 실행
  var scripts = document.getElementsByTagName('script');
  var autoMode = false;
  for (var i = 0; i < scripts.length; i++) {
    var s = scripts[i];
    if (s.src && s.src.indexOf('device-check.js') !== -1 && s.hasAttribute('data-auto-block')) {
      autoMode = true;
      break;
    }
  }
  if (autoMode) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { autoBlock(); });
    } else {
      autoBlock();
    }
  }
})();
