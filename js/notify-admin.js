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
       title: '📝 새 신청서 접수',   // db는 넘기지 않는다. 발송기가 알아서 연결한다.
       message: '홍길동 (P-TECH 1학년)',
       url: 'https://dks3275-rgb.github.io/admin.html#apply',
       kind: 'apply'             // 기록용 구분값
     });
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var APP_ID = '6bed6730-b167-48a8-a98d-83cdcb1cbc10';
  // 알림 제목 앞에 붙는 기관명.
  // 웹 푸시는 제목·본문·주소만 보여주므로, 어디서 온 알림인지 알리려면
  // 제목에 직접 붙이는 수밖에 없다. 여기만 고치면 전부 바뀐다.
  var ORG = 'AU안산대학교 일학습병행';
  function withOrg(t) {
    t = String(t || '').trim();
    if (!t) return ORG;
    return t.indexOf(ORG) === 0 ? t : ORG + '\n' + t;
  }
  var WORKER_URL = 'https://damp-leaf-0c5c.dks3275.workers.dev';
  var FS = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
  var FA = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
  var CFG = {
    apiKey: "AIzaSyD6r6R593RIfe8GCMjM3lgQgCcfiF0Rbuc",
    authDomain: "au-ilhaksub.firebaseapp.com",
    projectId: "au-ilhaksub",
    storageBucket: "au-ilhaksub.firebasestorage.app",
    messagingSenderId: "407960160823",
    appId: "1:407960160823:web:1e830d6b0d69e4a7b84db2"
  };

  // ⚠️ 호출하는 쪽에서 db를 받아 쓰면 안 된다.
  //    페이지마다 Firebase SDK 버전이 다를 수 있는데(예: 상담 화면은 10.7.1),
  //    다른 버전으로 만든 db를 10.12.0 함수에 넘기면 타입 검사에서 그대로 터진다.
  //    실제로 그 때문에 상담 알림이 나가지도, 기록되지도 않았다.
  //    그래서 여기서 우리 버전으로 직접 연결한다.
  var _db = null;
  async function getDb(m) {
    if (_db) return _db;
    var a = await import(FA);
    var app = a.getApps().find(function (x) { return x.name === 'notifyAdmin'; })
           || a.initializeApp(CFG, 'notifyAdmin');
    _db = m.getFirestore(app);
    return _db;
  }

  async function send(opts) {
    var out = { ok: false, sent: 0, targets: 0, reason: '' };
    try {
      var m = await import(FS);
      var db = await getDb(m);
      var ref = m.doc(db, 'app_config', 'admin_targets');
      var snap = await m.getDoc(ref);
      var d = snap.exists() ? snap.data() : {};
      var subIds = d.subscriptionIds || [];      // 웹 푸시 구독 ID (이게 가장 확실하다)
      var userIds = d.oneSignalIds || [];        // 예전 방식: 사용자 ID
      out.targets = subIds.length || userIds.length;

      if (!out.targets) {
        out.reason = '등록된 관리자 기기가 없습니다';
        await log(m, opts, out);
        return out;
      }

      var body = {
        app_id: APP_ID,
        headings: { en: withOrg(opts.title), ko: withOrg(opts.title) },
        contents: { en: opts.message, ko: opts.message },
        target_channel: 'push',
        priority: 10,
        // ⚠️ url 과 web_url 을 함께 보내면 OneSignal이 통째로 거부한다.
        //    ("Remove url field when setting app_url or web_url")
        //    웹앱이므로 web_url 하나만 보낸다.
        web_url: opts.url
      };
      // ⚠️ 웹 푸시는 "구독 ID"로 쏘는 게 확실하다.
      //    사용자 ID(onesignal_id)로 보내면 구독이 제대로 안 잡혀 수신자 0명이 되는 일이 있다.
      //    구독 ID가 있으면 그걸 쓰고, 없으면 예전 방식으로 떨어진다.
      if (subIds.length) body.include_subscription_ids = subIds;
      else body.include_aliases = { onesignal_id: userIds };

      var res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      var data = {};
      try { data = await res.json(); } catch (e) {}

      // 성공 판정
      //  · errors 가 있으면 실패 (거부되거나 대상이 없음)
      //  · id 가 돌아오면 접수된 것 = 성공
      //  ⚠️ recipients 로만 판정하면 안 된다. include_aliases 로 보내면
      //     OneSignal이 recipients 를 아예 안 돌려주는데, 그걸 0명으로 읽어
      //     멀쩡히 나간 알림을 '실패'로 표시하던 문제가 있었다.
      var errs = data.errors;
      var hasErr = !!errs && (Array.isArray(errs) ? errs.length > 0 : Object.keys(errs).length > 0);
      out.sent = (data.recipients === undefined || data.recipients === null)
        ? null                      // 서버가 알려주지 않음 (실패가 아니다)
        : Number(data.recipients);
      out.ok = res.ok && !!data.id && !hasErr;
      if (!out.ok) {
        out.reason = hasErr ? JSON.stringify(errs)
          : (!res.ok ? ('HTTP ' + res.status) : '발송 접수 응답이 없습니다');
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

  // 발송 결과를 남긴다 — 관리자 화면이 이걸 읽어 경고와 내역을 보여준다.
  // 마지막 한 건만 남기면 "왜 안 왔는지"를 추적할 수 없어 최근 30건을 함께 쌓는다.
  async function log(m, opts, out) {
    var rec = {
      kind: opts.kind || '',
      title: opts.title || '',
      at: new Date().toISOString(),
      ok: out.ok,
      sent: out.sent,
      targets: out.targets,
      reason: out.reason || '',
      dead: out.dead || []
    };
    try {
      var db = await getDb(m);
      var ref = m.doc(db, 'app_config', 'notify_log');
      var prev = [];
      try {
        var snap = await m.getDoc(ref);
        if (snap.exists()) prev = snap.data().recent || [];
      } catch (e) {}
      await m.setDoc(ref, {
        last: rec,
        recent: [rec].concat(prev).slice(0, 30)
      }, { merge: true });
    } catch (e) { /* 기록 실패는 발송을 막지 않는다 */ }
  }

  window.NotifyAdmin = { send: send, APP_ID: APP_ID, WORKER_URL: WORKER_URL, ORG: ORG, withOrg: withOrg };
})();
