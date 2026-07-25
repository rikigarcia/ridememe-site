(function() {
  var box = document.getElementById('q');
  var items = document.querySelectorAll('[data-search]');
  var none = document.getElementById('noresults');

  // T-07: the river renders only the top clusters, so the DOM filter alone cannot
  // find a headline we fetched but did not display. The full index lives in its own
  // file — compact rows [title, source, link, ts, region] — and is fetched the first
  // time someone actually searches, so readers who never search pay nothing for it.
  // Pages without the data-index attribute (brand/topic/reviews) keep DOM-only
  // search, exactly as before. A failed fetch degrades to DOM-only silently.
  var fireBox = document.getElementById('firehits');
  var fireList = document.getElementById('firehitslist');
  var indexUrl = null;
  var fire = null;
  var indexState = 'idle';   // idle -> loading -> ready | failed

  function withIndex(then) {
    if (indexState === 'ready' || indexState === 'failed' || !indexUrl) return then();
    if (indexState === 'loading') return;          // in flight; its own callback re-runs
    indexState = 'loading';
    fetch(indexUrl, { credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (rows) { fire = rows; indexState = 'ready'; then(); })
      .catch(function () { indexState = 'failed'; });
  }

  function domLinks() {
    var set = {};
    document.querySelectorAll('.item a[href], .fire a[href]').forEach(function(a) {
      set[a.getAttribute('href')] = 1;
    });
    return set;
  }

  function renderFirehose(q) {
    if (!fire || !fireBox || !fireList) return 0;
    if (!q) { fireBox.hidden = true; fireList.textContent = ''; return 0; }
    var onPage = domLinks();
    var out = document.createDocumentFragment();
    var n = 0;
    for (var i = 0; i < fire.length && n < 50; i++) {
      var row = fire[i];
      if ((row[0] + ' ' + row[1]).toLowerCase().indexOf(q) === -1) continue;
      if (onPage[row[2]]) continue;           // already visible in the river
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = row[2];
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = row[0];                 // textContent: never inject markup
      var s = document.createElement('span');
      s.className = 'srcname';
      s.textContent = ' ' + row[1];
      li.appendChild(a);
      li.appendChild(s);
      out.appendChild(li);
      n++;
    }
    fireList.textContent = '';
    fireList.appendChild(out);
    fireBox.hidden = n === 0;
    return n;
  }

  function run() {
    var q = box.value.trim().toLowerCase();
    var shownMain = 0;
    items.forEach(function(el) {
      var hit = !q || el.getAttribute('data-search').indexOf(q) !== -1;
      el.style.display = hit ? '' : 'none';
      if (hit && el.classList.contains('item')) shownMain++;
    });
    document.querySelectorAll('.river-sep').forEach(function(sep) {
      sep.style.display = q ? 'none' : '';
    });
    // The DOM filter above is instant and never waits on the network. The index
    // fills in the rest as soon as it lands; re-reading box.value here (rather than
    // closing over q) keeps a slow fetch from painting results for a stale query.
    function settle() {
      var cur = box.value.trim().toLowerCase();
      var extra = renderFirehose(cur);
      none.style.display = (cur && shownMain === 0 && extra === 0) ? 'block' : 'none';
    }
    if (q) { withIndex(settle); } else { settle(); }
  }
  // Search wiring only exists on the river pages (index/reviews/brand). Guarded
  // so this same file can be reused on the prose pages (advertise/support), which
  // have no #q/#searchform — without it, box.addEventListener would throw and
  // abort the whole IIFE before the theme toggle below ever runs.
  if (box) {
    var searchform = document.getElementById('searchform');
    indexUrl = searchform && searchform.getAttribute('data-index');
    // Warm the index on focus so the first keystroke usually has it already.
    if (indexUrl) box.addEventListener('focus', function() { withIndex(function() { run(); }); }, { once: true });
    box.addEventListener('input', run);
    if (searchform) searchform.addEventListener('submit', function(e) { e.preventDefault(); run(); });
  }
  document.querySelectorAll('.flt').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.flt').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var f = btn.getAttribute('data-filter');
      document.querySelectorAll('.item').forEach(function(el) {
        if (!f) { el.style.display = ''; return; }
        var reg = el.getAttribute('data-region') || '';
        var show = (f === 'ph' && reg === 'ph')
                || (f === 'world' && (reg === 'global' || reg === 'asia'));
        el.style.display = show ? '' : 'none';
      });
      document.querySelectorAll('.river-sep').forEach(function(sep) {
        sep.style.display = (f === 'ph') ? 'none' : '';
      });
      none.style.display = 'none';
      // Region filter is a different lens than search — clear any firehose hits so
      // the two never stack up confusingly.
      if (fireBox) { fireBox.hidden = true; }
    });
  });
  document.querySelectorAll('.copy').forEach(function(b) {
    b.addEventListener('click', function() {
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(b.getAttribute('data-link')).then(function() {
        var t = b.textContent;
        b.textContent = 'Copied'; b.classList.add('done');
        setTimeout(function() { b.textContent = t; b.classList.remove('done'); }, 1500);
      });
    });
  });
  // PWA install — an always-visible Install button that works on every browser:
  // a native prompt on Android / desktop Chrome & Edge, and Share-menu steps on
  // iOS / Safari (which expose no web install API). Hidden once installed/dismissed.
  var deferredInstall = null;
  var installbar = document.getElementById('installbar');
  var installtxt = document.getElementById('installtxt');
  var installgo = document.getElementById('installgo');
  var installx = document.getElementById('installx');
  var standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  var dismissed = false;
  try { dismissed = sessionStorage.getItem('ridememe-install') === '1'; } catch (e) {}
  if (installbar && (standalone || dismissed)) installbar.hidden = true;
  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();              // capture so our button can fire it on demand
    deferredInstall = e;
  });
  if (installgo) installgo.addEventListener('click', function() {
    if (deferredInstall) {           // Android / desktop Chrome & Edge — native prompt
      deferredInstall.prompt();
      deferredInstall.userChoice.then(function() { deferredInstall = null; if (installbar) installbar.hidden = true; });
      return;
    }
    var ua = navigator.userAgent;      // no web install API here — show manual steps
    var iOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var safari = /Safari/.test(ua) && !/Chrome|Chromium|CriOS|Edg|Android/.test(ua);
    if (installtxt) {
      if (iOS) installtxt.textContent = 'To install: tap the Share icon, then “Add to Home Screen”.';
      else if (safari) installtxt.textContent = 'To install: click Share, then “Add to Dock”.';
      else installtxt.textContent = 'To install: open your browser menu and choose “Install RideMeme”.';
    }
    installgo.style.display = 'none';
  });
  if (installx) installx.addEventListener('click', function() {
    if (installbar) installbar.hidden = true;    // session dismiss; reappears next session
    try { sessionStorage.setItem('ridememe-install', '1'); } catch (e) {}
  });
  window.addEventListener('appinstalled', function() {
    if (installbar) installbar.hidden = true;
  });
  // Newsletter signup — the single approved auto-popup (once/session, delayed).
  var nlm = document.getElementById('nlmodal');
  if (nlm) {
    var nlSeen = false;
    try { nlSeen = sessionStorage.getItem('ridememe-nl') === '1'; } catch (e) {}
    var showNl = function() {
      if (nlSeen) return; nlSeen = true;
      try { sessionStorage.setItem('ridememe-nl', '1'); } catch (e) {}
      nlm.hidden = false;
    };
    var nlTimer = setTimeout(showNl, 40000);
    var onNlScroll = function() {
      if ((window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight * 0.5) {
        clearTimeout(nlTimer); window.removeEventListener('scroll', onNlScroll); showNl();
      }
    };
    window.addEventListener('scroll', onNlScroll, { passive: true });
    var closeNl = function() { nlm.hidden = true; };
    document.getElementById('nlclose').addEventListener('click', closeNl);
    nlm.addEventListener('click', function(e) { if (e.target === nlm) closeNl(); });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeNl(); });
    var nlf = nlm.querySelector('form');
    if (nlf) nlf.addEventListener('submit', function() { setTimeout(closeNl, 400); });
  }
  // GCash tip modal — click-to-open only (no auto-popup, by design). Guarded, so
  // it no-ops when the Tip button isn't emitted (support.qr_image unset).
  var tb = document.getElementById('tipbtn'), tm = document.getElementById('tipmodal');
  if (tb && tm) {
    var tc = document.getElementById('tipclose');
    var closeTip = function() { tm.classList.remove('open'); };
    tb.addEventListener('click', function() { tm.classList.add('open'); });
    if (tc) tc.addEventListener('click', closeTip);
    tm.addEventListener('click', function(e) { if (e.target === tm) closeTip(); });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeTip(); });
  }
  // Dark-mode toggle — overrides the OS preference and remembers the choice.
  var themebtn = document.getElementById('themebtn');
  if (themebtn) {
    themebtn.addEventListener('click', function() {
      var cur = document.documentElement.getAttribute('data-theme');
      if (!cur) cur = 'light';
      var next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('ridememe-theme', next); } catch (e) {}
    });
  }
  // "New since your last visit" — mark stories newer than the last visit.
  // First-ever visit marks nothing (no baseline); updates the baseline after.
  try {
    var VKEY = 'ridememe_lastvisit';
    var prev = parseInt(localStorage.getItem(VKEY) || '0', 10);
    if (prev > 0) {
      document.querySelectorAll('.item[data-ts]').forEach(function(el) {
        if (parseInt(el.getAttribute('data-ts'), 10) > prev) el.classList.add('fresh');
      });
    }
    localStorage.setItem(VKEY, Math.floor(Date.now() / 1000));
  } catch (e) {}

  // PWA service worker — auto-update, zero user friction.
  // When a new SW activates (chrome changes, cache strategy bumps), the page
  // reloads once. We also call registration.update() on open / foreground so
  // an installed mobile PWA picks up changes without clear-site-data steps.
  if ('serviceWorker' in navigator) {
    var swRefreshing = false;
    var softReload = function () {
      if (swRefreshing) return;
      swRefreshing = true;
      location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', softReload);
    navigator.serviceWorker.addEventListener('message', function (e) {
      if (e.data && e.data.type === 'RM_SW_UPDATED') softReload();
    });
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      var poke = function () { try { reg.update(); } catch (err) {} };
      poke();
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') poke();
      });
      // Same cadence as the hourly rebuild — catch a new SW if the PWA stays open.
      setInterval(poke, 60 * 60 * 1000);
    }).catch(function () {});
  }
})();
