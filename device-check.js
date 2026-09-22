/**
 * device-check.js
 * 아이폰(사파리)에서 홈 화면 추가를 안내한다.
 *
 * ⚠️ 예전에는 아이폰 사파리 진입자를 "전면 차단"했다.
 *    아이폰은 홈 화면에 추가하지 않으면 웹 푸시를 못 받는 게 사실이지만,
 *    그것 때문에 공지·자료실·상담·모의시험까지 모두 막혀 있었다.
 *    QR을 찍고 들어온 학생이 설치 안내만 보고 그냥 나가버리는 게 가장 큰 이탈 지점이었다.
 *
 *    이제는 막지 않는다. 브라우저에서 전부 쓸 수 있고,
 *    "알림을 받으려면 홈 화면에 추가하세요"라고 위쪽에 얇은 띠로 알려주기만 한다.
 *    (안드로이드는 원래 차단이 없었다. 이제 아이폰도 같은 흐름이 된다.)
 *
 * 사용 방법:
 *   <script src="device-check.js"></script>                    → 함수만 제공
 *   <script src="device-check.js" data-auto-block></script>    → 안내 띠 자동 표시
 *
 * API (window.DeviceCheck):
 *   - isIOS()                : iPad/iPhone/iPod 여부
 *   - isStandalone()         : 홈 화면에 추가된 상태인지
 *   - needsInstallForPush()  : 아이폰인데 아직 설치 전 → 알림을 못 받는 상태
 *   - showInstallBanner()    : 위쪽 안내 띠 표시 (닫으면 7일간 안 뜸)
 *   - showInstallGuide()     : 설치 방법 카드 띄우기
 *   - shouldBlockSignup()    : (옛 이름) needsInstallForPush 와 같다. 호환용
 */
(function () {
  'use strict';

  var DISMISS_KEY = 'iosInstallBannerDismissedAt';
  var SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
        || window.navigator.standalone === true;
  }

  // 아이폰인데 아직 홈 화면에 추가하지 않음 = 알림만 못 받는 상태 (사용은 가능)
  function needsInstallForPush() {
    return isIOS() && !isStandalone();
  }

  function dismissed() {
    try {
      var at = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
      return at && (Date.now() - at < SEVEN_DAYS);
    } catch (e) { return false; }
  }

  // ── 설치 방법 카드 (닫을 수 있다) ──
  function showInstallGuide() {
    if (document.getElementById('iosInstallGuide')) return;

    function step(n, text) {
      return '<div style="display:flex;align-items:flex-start;gap:12px;padding:8px 0;">' +
        '<div style="width:24px;height:24px;border-radius:50%;background:#2196f3;color:white;font-size:12px;' +
        'font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + n + '</div>' +
        '<div style="font-size:13px;line-height:1.6;color:#1a2a3a;padding-top:1px;">' + text + '</div></div>';
    }

    var ov = document.createElement('div');
    ov.id = 'iosInstallGuide';
    ov.setAttribute('role', 'dialog');
    ov.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(15,30,60,0.55);' +
      'display:flex;align-items:center;justify-content:center;padding:20px;' +
      'font-family:"Noto Sans KR",sans-serif;overflow-y:auto;';
    ov.innerHTML =
      '<div style="background:white;border-radius:24px;padding:28px 24px;width:100%;max-width:380px;' +
      'box-shadow:0 20px 60px rgba(0,0,0,0.2);text-align:center;">' +
        '<div style="width:72px;height:72px;margin:0 auto 16px;border-radius:20px;' +
        'background:linear-gradient(135deg,#2196f3,#1976d2);display:flex;align-items:center;' +
        'justify-content:center;font-size:36px;">📲</div>' +
        '<h2 style="font-size:19px;font-weight:900;color:#1a2a3a;margin-bottom:8px;">홈 화면에 추가하기</h2>' +
        '<p style="font-size:13px;color:#5a7090;line-height:1.6;margin-bottom:18px;">' +
          '추가하면 <b style="color:#1976d2">알림</b>을 받을 수 있고,<br>앱처럼 바로 열 수 있어요.</p>' +
        '<div style="background:#f4f6fb;border-radius:14px;padding:14px 18px;margin-bottom:14px;text-align:left;">' +
          step(1, '화면 아래 <span style="display:inline-block;background:white;border:1.5px solid #e4eaf4;' +
                  'padding:1px 6px;border-radius:5px;font-weight:700;">⬆ 공유</span> 버튼을 눌러주세요') +
          step(2, '<span style="color:#1976d2;font-weight:700;">홈 화면에 추가</span>를 선택해주세요') +
          step(3, '추가된 <span style="color:#1976d2;font-weight:700;">앱 아이콘</span>으로 열어주세요') +
        '</div>' +
        '<div style="background:#fffbf0;border:1px solid rgba(232,160,32,0.3);border-radius:10px;' +
        'padding:11px 13px;font-size:12px;color:#92400e;line-height:1.5;text-align:left;margin-bottom:16px;">' +
          '<b style="color:#78350f;">Safari(사파리)에서만 추가할 수 있어요.</b><br>' +
          '크롬·네이버로 열렸다면 사파리로 다시 접속해주세요.</div>' +
        '<button id="iosGuideClose" style="width:100%;padding:14px;border:none;border-radius:12px;' +
        'background:#f0f4f8;color:#4a5568;font-size:14px;font-weight:700;font-family:inherit;cursor:pointer;">' +
        '나중에 할게요</button>' +
      '</div>';
    (document.body || document.documentElement).appendChild(ov);

    function close() { var e = document.getElementById('iosInstallGuide'); if (e) e.remove(); }
    ov.addEventListener('click', function (ev) { if (ev.target === ov) close(); });
    var btn = document.getElementById('iosGuideClose');
    if (btn) btn.onclick = close;
  }

  // ── 위쪽 안내 띠 ──
  function showInstallBanner() {
    if (!needsInstallForPush() || dismissed()) return;
    if (document.getElementById('iosInstallBanner')) return;

    var bar = document.createElement('div');
    bar.id = 'iosInstallBanner';
    bar.style.cssText = 'position:sticky;top:0;z-index:900;background:#1976d2;color:white;' +
      'padding:9px 12px;display:flex;align-items:center;gap:8px;' +
      'font-family:"Noto Sans KR",sans-serif;font-size:12.5px;line-height:1.45;';
    bar.innerHTML =
      '<span style="flex:1;min-width:0;">📲 <b>알림</b>을 받으려면 홈 화면에 추가해주세요</span>' +
      '<button id="iosBannerHow" style="background:rgba(255,255,255,0.22);border:none;color:white;' +
      'font-size:11.5px;font-weight:700;padding:5px 10px;border-radius:7px;font-family:inherit;' +
      'cursor:pointer;white-space:nowrap;">방법 보기</button>' +
      '<button id="iosBannerClose" aria-label="닫기" style="background:none;border:none;color:white;' +
      'font-size:17px;line-height:1;padding:2px 4px;cursor:pointer;opacity:0.8;">×</button>';

    var body = document.body || document.documentElement;
    body.insertBefore(bar, body.firstChild);

    document.getElementById('iosBannerHow').onclick = showInstallGuide;
    document.getElementById('iosBannerClose').onclick = function () {
      try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (e) {}
      bar.remove();
    };
  }

  window.DeviceCheck = {
    isIOS: isIOS,
    isStandalone: isStandalone,
    needsInstallForPush: needsInstallForPush,
    showInstallBanner: showInstallBanner,
    showInstallGuide: showInstallGuide,
    // 옛 이름 호환 — 이제 "막는다"는 뜻이 아니라 "알림만 못 받는다"는 뜻
    shouldBlockSignup: function () { return false; },
    renderIOSInstallBlock: showInstallGuide,
    autoBlock: function () { showInstallBanner(); return false; }
  };

  // data-auto-block 속성이 붙어 있으면 안내 띠를 띄운다 (막지 않는다)
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
      document.addEventListener('DOMContentLoaded', showInstallBanner);
    } else {
      showInstallBanner();
    }
  }
})();
