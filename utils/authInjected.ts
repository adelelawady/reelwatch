export const AUTH_CHECK_JS = `
(function() {
  var _sent = false;

  function report(loggedIn, username) {
    if (_sent) return;
    _sent = true;
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'auth_result',
      loggedIn: loggedIn,
      username: username || null,
    }));
  }

  function check() {
    try {
      var url = window.location.href;

      if (
        url.includes('/accounts/login') ||
        url.includes('/accounts/emailsignup') ||
        url.includes('/accounts/signup')
      ) {
        report(false, null);
        return;
      }

      var username = null;

      // Method 1: window._sharedData
      try {
        if (
          window._sharedData &&
          window._sharedData.config &&
          window._sharedData.config.viewer
        ) {
          username = window._sharedData.config.viewer.username;
        }
      } catch(e) {}

      // Method 2: scan window keys
      if (!username) {
        try {
          var keys = Object.keys(window);
          for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            if (
              k.startsWith('__') &&
              window[k] &&
              typeof window[k] === 'object' &&
              window[k].username
            ) {
              username = window[k].username;
              break;
            }
          }
        } catch(e) {}
      }

      // Method 3: try meta tags
      if (!username) {
        try {
          var metas = document.querySelectorAll('meta');
          for (var j = 0; j < metas.length; j++) {
            var content = metas[j].getAttribute('content') || '';
            var match = content.match(/@([a-zA-Z0-9._]+)/);
            if (match && match[1]) {
              username = match[1];
              break;
            }
          }
        } catch(e) {}
      }

      var hasCookies = document.cookie.includes('sessionid') ||
                       document.cookie.includes('ds_user_id');

      if (username) {
        report(true, username);
        return;
      }

      if (hasCookies) {
        // Do NOT fall back to 'instagram_user' — report null username
        // so the client generates a unique name instead
        report(true, null);
        return;
      }

      if (url.includes('instagram.com')) {
        setTimeout(check, 2000);
      } else {
        report(false, null);
      }

    } catch(e) {
      setTimeout(check, 2000);
    }
  }

  setTimeout(function() {
    var url = window.location.href;
    report(!url.includes('login'), null);
  }, 12000);

  if (document.readyState === 'complete') {
    setTimeout(check, 800);
  } else {
    window.addEventListener('load', function() {
      setTimeout(check, 800);
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
  ];

  var cookies = document.cookie.split(';');
  var paths = ['/', '/accounts', '/reels'];

  cookies.forEach(function(cookie) {
    var name = cookie.split('=')[0].trim();
    if (!name) return;
    domains.forEach(function(domain) {
      paths.forEach(function(path) {
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT'
          + ';path=' + path
          + ';domain=' + domain;
      });
    });
  });

  try { localStorage.clear(); } catch(e) {}
  try { sessionStorage.clear(); } catch(e) {}

  window.location.href = 'https://www.instagram.com/accounts/logout/?next=%2F';
})();
true;
`;
