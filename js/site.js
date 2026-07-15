(function() {
  var box = document.getElementById('q');
  var items = document.querySelectorAll('[data-search]');
  var none = document.getElementById('noresults');
  function run() {
    var q = box.value.trim().toLowerCase();
    var shownMain = 0;
    items.forEach(function(el) {
      var hit = !q || el.getAttribute('data-search').indexOf(q) !== -1;
      el.style.display = hit ? '' : 'none';
      if (hit && el.classList.contains('item')) shownMain++;
    });
    none.style.display = (q && shownMain === 0) ? 'block' : 'none';
    document.querySelectorAll('.river-sep').forEach(function(sep) {
      sep.style.display = q ? 'none' : '';
    });
  }
  // Search wiring only exists on the river pages (index/reviews/brand). Guarded
  // so this same file can be reused on the prose pages (advertise/support), which
  // have no #q/#searchform — without it, box.addEventListener would throw and
  // abort the whole IIFE before the theme toggle below ever runs.
  if (box) {
    box.addEventListener('input', run);
    var searchform = document.getElementById('searchform');
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
})();
