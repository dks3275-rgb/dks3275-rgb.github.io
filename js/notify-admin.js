/* ══════════════════════════════════════════════════════════
   notify-admin.js — 관리자에게 알림 보내기 (한 가지 경로로 통일)

   예전에는 두 갈래였다.
     · 신청서 → app_config/admin_targets 의 OneSignal ID 목록으로 발송
     · 1:1 상담 → OneSignal 태그(role=admin) 필터로 발송
   태그는 브라우저 데이터를 지우면 날아가고, ID 목록은 기기가 바뀌면
   옛 값이 남는다. 게다가 OneSignal은 수신자가 0명이어도 200 OK를 주기 때문에
   "보냈다"는 로그만 남고 아무도 못 받는 일이 생겼다.

   그래서 이 파일이 하는 일
     ① 발송 경로를 ID 목록 하나로 통일
     ② 응답을 열어 실제 수신자 수를 확인
     ③ 결과를 app_config/notify_log 에 기록 (관리자 화면에서 경고를 띄울 근거)
     ④ 더 이상 살아있지 않은 ID를 찾아 기록 (정리는 관리자 화면에서)

   쓰는 법
     await NotifyAdmin.send({
       db,                       // Firestore 인스턴스
       title: '📝 새 신청서 접수',
       message: '홍길동 (P-TECH 1학년)',
       url: 'https://dks3275-rgb.github.io/admin.html#apply',
       kind: 'apply'             // 기록용 구분값
     });
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var APP_ID = '6bed6730-b167-48a8-a98d-83cdcb1cbc10';
  var WORKER_URL = 'https://damp-leaf-0c5c.dks3275.workers.dev';
  var FS = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

  async function send(opts) {
    var out = { ok: false, sent: 0, targets: 0, reason: '' };
    try {
      var m = await import(FS);
      var ref = m.doc(opts.db, 'app_config', 'admin_targets');
      var snap = await m.getDoc(ref);
      var targets = snap.exists() ? (snap.data().oneSignalIds || []) : [];
      out.targets = targets.length;

      if (!targets.length) {
        out.reason = '등록된 관리자 기기가 없습니다';
        await log(m, opts, out);
        return out;
      }

      var res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_id: APP_ID,
          headings: { en: opts.title, ko: opts.title },
          contents: { en: opts.message, ko: opts.message },
          include_aliases: { onesignal_id: targets },
          target_channel: 'push',
          priority: 10,
          // ⚠️ url 과 web_url 을 함께 보내면 OneSignal이 통째로 거부한다.
          //    ("Remove url field when setting app_url or web_url")
          //    웹앱이므로 web_url 하나만 보낸다.
          web_url: opts.url
        })
      });

      var data = {};
      try { data = await res.json(); } catch (e) {}

      // OneSignal은 아무도 못 받아도 200을 준다. recipients를 직접 봐야 한다.
      out.sent = Number(data.recipients || 0);
      out.ok = out.sent > 0;
      if (!out.ok) {
        out.reason = (data.errors && JSON.stringify(data.errors))
          || ('수신자 0명 (HTTP ' + res.status + ')');
      }

      // 더 이상 유효하지 않은 ID는 기록만 남긴다.
      // (여기는 로그인하지 않은 학생 화면이라 목록을 직접 고칠 권한이 없고,
      //  고칠 수 있게 열어두면 누군가 관리자 목록을 비워버릴 수 있다.
      //  실제 정리는 관리자 화면에서 한다.)
      out.dead = collectDead(data);

      await log(m, opts, out);
      return out;
    } catch (e) {
      out.reason = '발송 오류: ' + (e && e.message ? e.message : e);
      try {
        var m2 = await import(FS);
        await log(m2, opts, out);
      } catch (e2) {}
      return out;
    }
  }

  // 응답에서 "이제 없는 기기" 목록을 뽑아낸다 (OneSignal 응답 형식이 여러 가지다)
  function collectDead(data) {
    var dead = [];
    try {
      var e = data && data.errors;
      if (!e) return dead;
      if (Array.isArray(e)) return dead;                   // 문자열 배열이면 개별 ID를 알 수 없다
      if (e.invalid_aliases && e.invalid_aliases.onesignal_id) {
        dead = dead.concat(e.invalid_aliases.onesignal_id);
      }
      if (e.invalid_player_ids) dead = dead.concat(e.invalid_player_ids);
      if (e.invalid_external_user_ids) dead = dead.concat(e.invalid_external_user_ids);
    } catch (err) {}
    return dead.filter(Boolean);
  }

  // 마지막 발송 결과를 남긴다 — 관리자 화면이 이걸 읽어 경고를 띄운다
  async function log(m, opts, out) {
    try {
      await m.setDoc(m.doc(opts.db, 'app_config', 'notify_log'), {
        last: {
          kind: opts.kind || '',
          title: opts.title || '',
          at: new Date().toISOString(),
          ok: out.ok,
          sent: out.sent,
          targets: out.targets,
          reason: out.reason || '',
          dead: out.dead || []
        }
      }, { merge: true });
    } catch (e) { /* 기록 실패는 발송을 막지 않는다 */ }
  }

  window.NotifyAdmin = { send: send, APP_ID: APP_ID, WORKER_URL: WORKER_URL };
})();
