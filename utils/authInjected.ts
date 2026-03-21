export const AUTH_CHECK_JS = `
(function() {
  if (window.__rwAuthSent) return;
  window.__rwAuthSent = true;

  function report(loggedIn, username) {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'auth_result',
      loggedIn: loggedIn,
      username: username || null,
    }));
  }

  function tryGetUsername() {
    var username = null;

    try {
      if (
        window._sharedData &&
        window._sharedData.config &&
        window._sharedData.config.viewer
      ) {
        username = window._sharedData.config.viewer.username;
        if (username) return username;
      }
    } catch(e) {}

    try {
      var keys = Object.keys(window);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        try {
          if (k.startsWith('__') && window[k] && typeof window[k] === 'object') {
            var obj = window[k];
            if (obj.username) return obj.username;
            if (obj.data && obj.data.username) return obj.data.username;
            if (obj.user && obj.user.username) return obj.user.username;
          }
        } catch(e) {}
      }
    } catch(e) {}

    try {
      var scripts = document.querySelectorAll('script[type="application/json"]');
      for (var s = 0; s < scripts.length; s++) {
        var text = scripts[s].textContent || '';
        var match = text.match(/"username":"([a-zA-Z0-9._]+)"/);
        if (match && match[1]) return match[1];
      }
    } catch(e) {}

    try {
      var allScripts = document.querySelectorAll('script:not([src])');
      for (var j = 0; j < allScripts.length; j++) {
        var sc = allScripts[j].textContent || '';
        if (sc.length > 50000) continue; // skip huge bundles
        var vm = sc.match(/"username":"([a-zA-Z0-9._]+)"/);
        if (vm && vm[1]) return vm[1];
      }
    } catch(e) {}

    return null;
  }

  // ── Cookie-only check — fastest and most reliable ──────────
  // ds_user_id cookie is set when logged in, cleared on logout.
  // We can also read the user ID from it.
  function checkCookies() {
    var cookies = {};
    document.cookie.split(';').forEach(function(c) {
      var parts = c.trim().split('=');
      if (parts.length >= 2) {
        cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
      }
    });

    var hasSession = !!cookies['sessionid'];
    var hasUserId  = !!cookies['ds_user_id'];

    return {
      loggedIn: hasSession || hasUserId,
      userId: cookies['ds_user_id'] || null,
    };
  }

  function run() {
    try {
      var url = window.location.href;

      // Definite logged-out pages
      if (
        url.includes('/accounts/login') ||
        url.includes('/accounts/signup') ||
        url.includes('/accounts/logout') ||
        url.includes('/accounts/emailsignup')
      ) {
        report(false, null);
        return;
      }

      // Cookie check first — instant, no DOM needed
      var cookieResult = checkCookies();

      if (!cookieResult.loggedIn) {
        // No session cookie — definitely logged out
        report(false, null);
        return;
      }

      // Has session cookie — logged in. Try to get username.
      var username = tryGetUsername();
      report(true, username);

    } catch(e) {
      report(false, null);
    }
  }

  // Run immediately — don't wait for load event
  // Cookie check doesn't need DOM
  run();

  // Also run after DOM ready in case username is in page data
  if (document.readyState !== 'complete') {
    window.addEventListener('load', function() {
      if (!window.__rwAuthSent2) {
        window.__rwAuthSent2 = true;
        // Re-check username only (already know logged in from cookies)
        var username = tryGetUsername();
        if (username) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'auth_username_update',
            username: username,
          }));
        }
      }
    });
  }
})();
true;
`;

export const LOGOUT_JS = `
(function() {
  var domains = [
    '.instagram.com',
    'instagram.com',
    'www.instagram.com',
    '.cdninstagram.com',
  ];
  var paths = ['/', '/accounts', '/reels', '/stories', '/direct'];

  try {
    document.cookie.split(';').forEach(function(cookie) {
      var name = cookie.split('=')[0].trim();
      if (!name) return;
      domains.forEach(function(domain) {
        paths.forEach(function(path) {
          document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT'
            + ';path=' + path + ';domain=' + domain + ';secure';
          document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT'
            + ';path=' + path + ';domain=' + domain;
        });
      });
    });
  } catch(e) {}

  try { localStorage.clear(); } catch(e) {}
  try { sessionStorage.clear(); } catch(e) {}

  try {
    if (window.indexedDB && indexedDB.databases) {
      indexedDB.databases().then(function(dbs) {
        dbs.forEach(function(db) {
          try { indexedDB.deleteDatabase(db.name); } catch(e) {}
        });
      });
    }
  } catch(e) {}

  window.location.replace(
    'https://www.instagram.com/accounts/logout/?next=%2Faccounts%2Flogin%2F'
  );
})();
true;
`;

export const POST_LOGOUT_CHECK_JS = `
(function() {
  function confirm() {
    var cookies = document.cookie;
    var hasSession = cookies.includes('sessionid') || cookies.includes('ds_user_id');
    var url = window.location.href;
    var onLoginPage = url.includes('/accounts/login') || url.includes('/accounts/logout');
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'logout_complete',
      confirmed: onLoginPage || !hasSession,
    }));
  }
  if (document.readyState === 'complete') {
    setTimeout(confirm, 400);
  } else {
    window.addEventListener('load', function() { setTimeout(confirm, 400); });
  }
})();
true;
`;
