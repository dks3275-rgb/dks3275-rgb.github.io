// AU 일학습병행 - 인앱 브라우저 자동 우회 스크립트
// 카톡/네이버/인스타 등에서 열렸을 때 외부 브라우저(Chrome/Safari)로 자동 이동
(function() {
  if (window.__AU_INAPP_CHECKED__) return;
  window.__AU_INAPP_CHECKED__ = true;

  const ua = (navigator.userAgent || '').toLowerCase();

  // 인앱 브라우저 감지
  const isKakao = /kakaotalk/.test(ua);
  const isNaver = /naver|whale/.test(ua);
  const isInstagram = /instagram/.test(ua);
  const isFacebook = /fban|fbav/.test(ua);
  const isLine = /line/.test(ua);
  const isInApp = isKakao || isNaver || isInstagram || isFacebook || isLine;
  if (!isInApp) return;

  const isAndroid = /android/.test(ua);
  const isIOS = /iphone|ipad|ipod/.test(ua);

  const url = location.href;
  const host = location.host + location.pathname + location.search + location.hash;

  // 카카오톡: 외부 브라우저 열기 가능
  if (isKakao) {
    if (isAndroid) {
      // 안드로이드: intent URL로 Chrome 강제 호출
      const intentUrl = 'intent://' + host + '#Intent;scheme=https;package=com.android.chrome;end';
      location.href = intentUrl;
      // 폴백: 카톡 외부 브라우저 호출 가능 시
      setTimeout(() => {
        try { location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url); } catch(e) {}
      }, 500);
      return;
    }
    if (isIOS) {
      // iOS 카카오톡: kakaotalk:// 외부 브라우저 호출
      location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url);
      // 사용자 안내 표시 (자동 이동 실패 시 대비)
      showInAppGuide('카카오톡', 'iOS');
      return;
    }
  }

  // 네이버 인앱: 자동 이동 어렵 → 안내 표시만
  if (isNaver) {
    showInAppGuide('네이버 앱', isIOS ? 'iOS' : 'Android');
    return;
  }

  // 인스타그램: 안드로이드만 일부 우회 가능
  if (isInstagram) {
    if (isAndroid) {
      const intentUrl = 'intent://' + host + '#Intent;scheme=https;package=com.android.chrome;end';
      location.href = intentUrl;
      setTimeout(() => showInAppGuide('인스타그램', 'Android'), 1500);
      return;
    }
    showInAppGuide('인스타그램', 'iOS');
    return;
  }

  // Line / Facebook
  if (isLine || isFacebook) {
    if (isAndroid) {
      const intentUrl = 'intent://' + host + '#Intent;scheme=https;package=com.android.chrome;end';
      location.href = intentUrl;
      setTimeout(() => showInAppGuide(isLine ? 'Line' : 'Facebook', 'Android'), 1500);
      return;
    }
    showInAppGuide(isLine ? 'Line' : 'Facebook', 'iOS');
    return;
  }

  // 안내 오버레이 표시
  function showInAppGuide(appName, os) {
    const overlay = document.createElement('div');
    overlay.id = 'au-inapp-overlay';
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99999;
      display:flex;align-items:center;justify-content:center;padding:20px;
      font-family:'Noto Sans KR',sans-serif;
    `;
    const browserName = os === 'iOS' ? 'Safari' : 'Chrome';
    const guide = os === 'iOS'
      ? `우측 상단의 <b>···</b> 또는 <b>공유</b> 버튼<br>→ "<b>Safari로 열기</b>" 선택`
      : `우측 상단의 <b>⋮</b> 또는 <b>···</b> 메뉴<br>→ "<b>다른 브라우저로 열기</b>" 또는 "<b>Chrome으로 열기</b>"`;
    overlay.innerHTML = `
      <div style="background:white;border-radius:20px;padding:32px 24px;max-width:340px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.4);">
        <div style="font-size:64px;margin-bottom:12px;">⚠️</div>
        <div style="font-size:18px;font-weight:800;color:#1a2a3a;margin-bottom:8px;">
          ${appName} 인앱 브라우저로 열렸어요
        </div>
        <div style="font-size:14px;color:#5a7090;line-height:1.6;margin-bottom:18px;">
          앱 설치 및 푸시 알림을 위해<br>
          <b>${browserName}</b>에서 다시 열어주세요
        </div>
        <div style="background:#fef3c7;border-radius:10px;padding:14px;font-size:13px;line-height:1.7;color:#78350f;text-align:left;margin-bottom:14px;">
          📌 <b>여는 방법</b><br>${guide}
        </div>
        <button id="au-inapp-copy" style="
          width:100%;padding:14px;background:#2196f3;color:white;border:none;
          border-radius:10px;font-family:inherit;font-size:14px;font-weight:700;
          cursor:pointer;margin-bottom:8px;
        ">📋 주소 복사하기</button>
        <button id="au-inapp-close" style="
          width:100%;padding:10px;background:white;color:#5a7090;
          border:1.5px solid #e4eaf4;border-radius:10px;font-family:inherit;
          font-size:13px;cursor:pointer;
        ">그래도 계속 보기</button>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('au-inapp-copy').onclick = () => {
      const url = location.href;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => alert('주소가 복사됐어요!\n' + browserName + '에 붙여넣어 주세요.'));
      } else {
        const ta = document.createElement('textarea');
        ta.value = url; document.body.appendChild(ta);
        ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
        alert('주소가 복사됐어요!\n' + browserName + '에 붙여넣어 주세요.');
      }
    };
    document.getElementById('au-inapp-close').onclick = () => overlay.remove();
  }
})();
