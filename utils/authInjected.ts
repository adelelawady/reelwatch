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

      // Method 2: scan window keys for username
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

      // Method 3: ds_user_id cookie
      var hasCookies = document.cookie.includes('sessionid') ||
                       document.cookie.includes('ds_user_id');

      if (username) {
        report(true, username);
        return;
      }

      if (hasCookies) {
        report(true, 'instagram_user');
        return;
      }

      // Still on instagram but no proof yet — retry
      if (url.includes('instagram.com')) {
        setTimeout(check, 2000);
      } else {
        report(false, null);
      }

    } catch(e) {
      setTimeout(check, 2000);
    }
  }

  // Watchdog — fire after 12s regardless
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
