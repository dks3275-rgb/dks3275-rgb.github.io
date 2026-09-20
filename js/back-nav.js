/* ══════════════════════════════════════════════════════════
   back-nav.js — 휴대폰 뒤로가기로 "한 단계씩" 되돌아가게 만든다.

   왜 필요한가
     한 페이지 안에서 화면을 감췄다 보였다 하는 방식(display none/block)은
     브라우저 기록에 아무것도 남기지 않는다. 그래서 안에서 세 단계를 들어가도
     휴대폰 뒤로가기를 누르면 그 단계를 되돌리는 게 아니라 페이지를 통째로 나가
     "처음부터 다시" 하는 것처럼 보인다.

   쓰는 법
     1) 화면을 실제로 그리는 함수를 만들어 등록한다.
          BackNav.init(state => { ...그 단계를 보여주는 코드... }, 루트상태);
     2) 한 단계 들어갈 때  → BackNav.go(상태)
     3) 뒤로 버튼을 누를 때 → BackNav.back()
        (직접 화면을 바꾸지 말고 back()을 부르면 기록과 화면이 항상 같이 움직인다)

   상태(state)는 문자열이든 객체든 상관없다. 기록에 저장됐다가
   뒤로가기 때 그대로 되돌아온다.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var renderFn = null;
  var rootState = null;
  var started = false;

  function draw(state) {
    if (!renderFn) return;
    try { renderFn(state); }
    catch (e) { console.warn('[BackNav] 화면 그리기 실패:', e); }
  }

  window.BackNav = {
    /**
     * @param {(state:any)=>void} fn  상태를 받아 그 화면을 보여주는 함수
     * @param {any} root              첫 화면(루트)의 상태값
     */
    init: function (fn, root) {
      renderFn = fn;
      rootState = (root === undefined ? 'root' : root);
      if (started) return;
      started = true;
      // 첫 화면을 기록에 심어둔다. 여기서 뒤로가기를 누르면 페이지를 벗어난다(정상).
      try { history.replaceState({ bn: rootState }, ''); } catch (e) {}
      window.addEventListener('popstate', function (ev) {
        var s = (ev.state && 'bn' in ev.state) ? ev.state.bn : rootState;
        draw(s);
      });
    },

    /**
     * 한 단계 들어간다. 화면 전환은 부르는 쪽에서 이미 했다고 보고
     * 여기서는 기록만 쌓는다. (같은 일을 두 번 하지 않기 위해)
     */
    go: function (state) {
      if (!started) return;
      try { history.pushState({ bn: state }, ''); } catch (e) {}
    },

    /** 단계는 그대로 두고 상태값만 갈아끼운다 (같은 화면에서 내용만 바뀔 때) */
    replace: function (state) {
      if (!started) return;
      try { history.replaceState({ bn: state }, ''); } catch (e) {}
    },

    /** 뒤로 한 단계. 화면은 popstate가 알아서 되돌린다. */
    back: function () { history.back(); },

    /** 지금 첫 화면인지 */
    atRoot: function () {
      var s = history.state && history.state.bn;
      return JSON.stringify(s) === JSON.stringify(rootState);
    },

    /** 지금 상태값 */
    current: function () {
      return (history.state && 'bn' in history.state) ? history.state.bn : rootState;
    }
  };
})();
