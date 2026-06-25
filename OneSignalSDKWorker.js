// OneSignal 푸시 알림 Service Worker (기존)
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// ──────────────────────────────────────────────────────────────────
// 콘텐츠 캐싱 정책 — 캐시 문제 영구 해결
// QR 코드를 바꿀 수 없는 상황에서도 사용자가 항상 최신 코드를 받게 함
// 정책: HTML/JS/CSS는 network-first (항상 최신), 오프라인 시 캐시 폴백
// 이미지·폰트·외부 리소스는 브라우저 기본 캐시 정책 유지
// ──────────────────────────────────────────────────────────────────

const CACHE_NAME = 'au-content-v1';

// 새 SW가 설치되면 즉시 활성화 (대기 안 함)
self.addEventListener('install', event => {
  self.skipWaiting();
});

// 활성화되면 즉시 모든 페이지 제어 + 옛 캐시 정리
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await self.clients.claim();
    try {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    } catch (e) { /* 캐시 정리 실패해도 무시 */ }
  })());
});

// fetch 가로채기: HTML/JS/CSS는 항상 네트워크 우선
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  // 같은 origin만 처리 — 외부 CDN, OneSignal API, Firebase 등은 제외
  if (url.origin !== self.location.origin) return;

  // 처리 대상: 페이지 이동(navigate), HTML(document), JS, CSS
  const dest = req.destination;
  const isPageNav = req.mode === 'navigate';
  const isContent = dest === 'document' || dest === 'script' || dest === 'style';
  if (!isPageNav && !isContent) return;

  event.respondWith((async () => {
    try {
      // Network-first: 항상 최신 받음 (cache: no-store로 브라우저 HTTP 캐시도 우회)
      const response = await fetch(req, { cache: 'no-store' });
      // 성공 응답은 캐시에 백업 (오프라인 폴백용)
      if (response && response.status === 200 && response.type === 'basic') {
        try {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(req, response.clone());
        } catch (e) { /* 캐시 저장 실패는 무시 — 응답은 정상 반환 */ }
      }
      return response;
    } catch (e) {
      // 네트워크 실패 → 캐시 폴백
      const cached = await caches.match(req);
      if (cached) return cached;
      // 캐시도 없으면 그대로 실패 (브라우저 기본 오프라인 페이지)
      throw e;
    }
  })());
});
