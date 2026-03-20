// injected.js — threaded rewrite + overlay tap test + audio state indicator

export const INJECTED_JS = `(function(){
  if(window.__rw)return;window.__rw=true;

  /* ── helpers ─────────────────────────────────────────────────── */
  var rn=window.ReactNativeWebView;
  function post(obj){ if(rn)rn.postMessage(JSON.stringify(obj)); }

  /* ── nav / login-banner hiding ───────────────────────────────── */
  var navHidden=false;

  function hideNav(){
    if(navHidden)return;
    var svg=document.querySelector('svg[aria-label="Home"]');
    if(!svg)return;
    var el=svg;
    for(var i=0;i<10;i++){
      var p=el.parentElement; if(!p)break;
      var r=p.getBoundingClientRect();
      var n=p.querySelectorAll('svg[aria-label]').length;
      if(r.width>=window.innerWidth*0.8&&r.height>0&&r.height<120&&n>=4){
        p.style.cssText='display:none!important';
        navHidden=true; return;
      }
      if(r.height>120&&n<4)break;
      el=p;
    }
  }

  function hideLoginBanners(){
    document.querySelectorAll('a').forEach(function(a){
      var t=(a.textContent||'').trim();
      if(t!=='Log in'&&t!=='Open app')return;
      var p=a.parentElement;
      for(var i=0;i<8;i++){
        if(!p)break;
        var r=p.getBoundingClientRect();
        if(r.width>=window.innerWidth*0.8&&r.height>0&&r.height<100){
          p.style.cssText='display:none!important'; break;
        }
        p=p.parentElement;
      }
    });
  }

  var _navTimer=null;
  function scheduleNav(){
    if(navHidden)return;
    if(_navTimer)return;
    _navTimer=setTimeout(function(){ _navTimer=null; hideNav(); }, 80);
  }

  var navObs=new MutationObserver(scheduleNav);
  navObs.observe(document.documentElement,{childList:true,subtree:true});
  [0,300,800,2000].forEach(function(t){ setTimeout(hideNav,t); });
  setTimeout(hideLoginBanners, 1000);

  /* ── audio state indicator ───────────────────────────────────────
     Pill sitting to the right of the test button.
     States:
       waiting  – grey,  no video found yet
       muted    – red,   video exists but muted=true
       live     – green, video playing + muted=false              */
  var _statePill = null;

  var STATE = {
    WAITING: { label:'⏳ waiting', bg:'rgba(80,80,80,0.85)',  border:'rgba(255,255,255,0.25)' },
    MUTED:   { label:'🔇 muted',   bg:'rgba(180,30,30,0.85)', border:'rgba(255,100,100,0.5)'  },
    LIVE:    { label:'🔊 live',    bg:'rgba(20,140,60,0.85)', border:'rgba(80,255,130,0.5)'   },
  };

  function setPillState(key){
    if(!_statePill)return;
    var s = STATE[key] || STATE.WAITING;
    _statePill.textContent = s.label;
    _statePill.style.background = s.bg;
    _statePill.style.borderColor = s.border;
  }

  /* Poll the active video every second and update the pill */
  function pollAudioState(){
    var vid = document.querySelector('video');
    if(!vid){
      setPillState('WAITING'); return;
    }
    if(vid.muted || vid.volume === 0){
      setPillState('MUTED');
    } else {
      setPillState('LIVE');
    }
  }
  setInterval(pollAudioState, 800);

  /* ── overlay + video watching ────────────────────────────────── */
  var _vidTimer=null;
  function scheduleVideos(){
    if(_vidTimer)return;
    _vidTimer=setTimeout(function(){ _vidTimer=null; watchVideos(); }, 120);
  }

  function watchVideos(){
    document.querySelectorAll('[id^="clipsoverlay"]').forEach(function(el){
      if(el.__rwOverlay)return; el.__rwOverlay=true;
      var ch=el.children;
      for(var i=0;i<ch.length;i++){
        ch[i].style.cssText='visibility:hidden!important';
      }
    });

    document.querySelectorAll('video').forEach(function(v){
      if(v.__rwWatched)return; v.__rwWatched=true;
      v.addEventListener('playing', function(){ post({type:'video_playing'}); });
      /* Update pill immediately on mute/unmute events from any source */
      v.addEventListener('volumechange', function(){ pollAudioState(); });
    });
  }

  new MutationObserver(scheduleVideos)
    .observe(document.documentElement,{childList:true,subtree:true});
  watchVideos();

  /* ── TEST BUTTON + STATE PILL ────────────────────────────────── */
  function fireClickAt(x, y, target){
    var opts={ bubbles:true, cancelable:true, view:window,
               clientX:x, clientY:y, screenX:x, screenY:y };
    try {
      var touch = new Touch({ identifier:1, target:target,
                               clientX:x, clientY:y,
                               screenX:x, screenY:y,
                               pageX:x,   pageY:y,
                               radiusX:1, radiusY:1, rotationAngle:0, force:1 });
      var tOpts = { bubbles:true, cancelable:true, touches:[touch],
                    targetTouches:[touch], changedTouches:[touch] };
      target.dispatchEvent(new TouchEvent('touchstart', tOpts));
      target.dispatchEvent(new TouchEvent('touchend',
        Object.assign({}, tOpts, { touches:[], targetTouches:[] })));
    } catch(e){}
    target.dispatchEvent(new PointerEvent('pointerdown', opts));
    target.dispatchEvent(new PointerEvent('pointerup',   opts));
    target.dispatchEvent(new MouseEvent('click',         opts));
  }

  function tapOverlay(){
    var overlay = document.querySelector('[id^="clipsoverlay"]');
    if(!overlay){
      post({type:'test_tap', status:'no_overlay'});
      return;
    }
    var r  = overlay.getBoundingClientRect();
    var cx = r.left + r.width  / 2;
    var cy = r.top  + r.height / 2;
    fireClickAt(cx, cy, overlay);
    post({type:'test_tap', status:'fired', x:cx, y:cy, overlayId:overlay.id});
    /* Slight delay so muted state has time to flip before we re-poll */
    setTimeout(pollAudioState, 120);
  }

  var PILL_CSS = [
    'position:fixed',
    'top:60px',
    'z-index:2147483647',
    'color:#fff',
    'border:1.5px solid rgba(255,255,255,0.4)',
    'border-radius:8px',
    'padding:8px 14px',
    'font-size:13px',
    'font-family:system-ui,sans-serif',
    'pointer-events:none',       /* pill is display-only, not tappable */
    'white-space:nowrap',
    'transition:background 0.3s,border-color 0.3s',
  ].join(';');

  var BTN_CSS = [
    'position:fixed',
    'top:60px',
    'left:12px',
    'z-index:2147483647',
    'background:rgba(0,0,0,0.75)',
    'color:#fff',
    'border:1.5px solid rgba(255,255,255,0.4)',
    'border-radius:8px',
    'padding:8px 14px',
    'font-size:13px',
    'font-family:system-ui,sans-serif',
    'cursor:pointer',
    'pointer-events:auto',
    '-webkit-tap-highlight-color:transparent',
  ].join(';');

  function addTestUI(){
    if(document.getElementById('__rw_test_btn'))return;

    var btn = document.createElement('button');
    btn.id  = '__rw_test_btn';
    btn.style.cssText = BTN_CSS;
    btn.textContent = '🔊 TAP TEST';
    btn.addEventListener('click', function(e){ e.stopPropagation(); tapOverlay(); });

    var pill = document.createElement('div');
    pill.id  = '__rw_audio_pill';
    pill.style.cssText = PILL_CSS;
    /* Position pill just to the right of the button (button ~110px wide) */
    pill.style.left = '130px';
    pill.style.background  = STATE.WAITING.bg;
    pill.style.borderColor = STATE.WAITING.border;
    pill.textContent = STATE.WAITING.label;
    _statePill = pill;

    var root = document.body || document.documentElement;
    root.appendChild(btn);
    root.appendChild(pill);

    pollAudioState();
  }

  if(document.body){ addTestUI(); }
  else { document.addEventListener('DOMContentLoaded', addTestUI); }

  /* ── URL change + auth detection ─────────────────────────────── */
  function ping(url){
    if(url.indexOf('/accounts/login')!==-1||url.indexOf('/?next=')!==-1)
      post({type:'auth',status:'logged_out'});
    else if(url.indexOf('/reels/')!==-1||url.indexOf('/p/')!==-1||url.indexOf('/u/')!==-1)
      post({type:'auth',status:'logged_in'});
  }

  var last=location.href; ping(last);

  var ch=new MessageChannel();
  ch.port1.onmessage=function(){
    var cur=location.href;
    if(cur!==last){
      last=cur; ping(cur); navHidden=false;
      post({type:'url_change',url:cur});
      scheduleNav();
    }
  };

  var workerSrc=
    'self.onmessage=function(e){'+
    '  var p=e.ports[0];'+
    '  setInterval(function(){ p.postMessage(null); },800);'+
    '};';
  var blob=new Blob([workerSrc],{type:'text/javascript'});
  var blobUrl=URL.createObjectURL(blob);
  var worker=new Worker(blobUrl);
  URL.revokeObjectURL(blobUrl);
  worker.postMessage(null,[ch.port2]);

  post({type:'ready'});

})(); true;`;
