// injected.js — startup watchdog safe version

export const INJECTED_JS = `(function(){
  var rn=window.ReactNativeWebView;
  function post(obj){ if(rn)rn.postMessage(JSON.stringify(obj)); }

  // Second injection run (injectedJavaScript fires after
  // injectedJavaScriptBeforeContentLoaded which already ran).
  // Just re-confirm ready so the native watchdog is satisfied.
  if(window.__rw){
    post({type:'ready'});
    return;
  }
  window.__rw=true;

  /* ── startup error guard — removed once ready is posted ──────── */
  var _startupDone=false;

  function onStartupError(e){
    if(_startupDone)return;
    post({ type:'inject_error', msg:(e.message||String(e)),
           src:(e.filename||''), line:(e.lineno||0) });
  }
  function onStartupRejection(e){
    if(_startupDone)return;
    post({ type:'inject_error',
           msg:String(e.reason&&(e.reason.message||e.reason)||'rejection') });
  }
  window.addEventListener('error',              onStartupError);
  window.addEventListener('unhandledrejection', onStartupRejection);

  /* ── URL change handler ──────────────────────────────────────── */
  var last=location.href;

  function onUrlChange(url){
    if(url===last)return;
    last=url;
    ping(url);
    navHidden=false;
    post({type:'url_change',url:url});
    scheduleNav();
  }

  var _push=history.pushState.bind(history);
  history.pushState=function(state,title,url){
    _push(state,title,url); onUrlChange(location.href);
  };
  var _replace=history.replaceState.bind(history);
  history.replaceState=function(state,title,url){
    _replace(state,title,url); onUrlChange(location.href);
  };
  window.addEventListener('popstate',function(){ onUrlChange(location.href); });

  function ping(url){
    if(url.indexOf('/accounts/login')!==-1||url.indexOf('/?next=')!==-1)
      post({type:'auth',status:'logged_out'});
    else if(url.indexOf('/reels/')!==-1||url.indexOf('/p/')!==-1||url.indexOf('/u/')!==-1)
      post({type:'auth',status:'logged_in'});
  }
  ping(last);

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
      v.addEventListener('playing',     function(){ post({type:'video_playing'}); });
      v.addEventListener('volumechange',function(){ pollAudioState(); });
    });
  }

  new MutationObserver(scheduleVideos)
    .observe(document.documentElement,{childList:true,subtree:true});
  watchVideos();

  /* ── audio state indicator ───────────────────────────────────── */
  var _statePill=null;
  var STATE={
    WAITING:{ label:'⏳ waiting', bg:'rgba(80,80,80,0.85)',  border:'rgba(255,255,255,0.25)' },
    MUTED:  { label:'🔇 muted',   bg:'rgba(180,30,30,0.85)', border:'rgba(255,100,100,0.5)'  },
    LIVE:   { label:'🔊 live',    bg:'rgba(20,140,60,0.85)', border:'rgba(80,255,130,0.5)'   },
  };

  function setPillState(key){
    if(!_statePill)return;
    var s=STATE[key]||STATE.WAITING;
    _statePill.textContent=s.label;
    _statePill.style.background=s.bg;
    _statePill.style.borderColor=s.border;
  }

  function pollAudioState(){
    var vid=document.querySelector('video');
    if(!vid){ setPillState('WAITING'); return; }
    setPillState((vid.muted||vid.volume===0)?'MUTED':'LIVE');
  }
  setInterval(pollAudioState, 800);

  /* ── test button ─────────────────────────────────────────────── */
  function fireClickAt(x,y,target){
    var opts={bubbles:true,cancelable:true,view:window,
              clientX:x,clientY:y,screenX:x,screenY:y};
    try{
      var touch=new Touch({identifier:1,target:target,
                            clientX:x,clientY:y,screenX:x,screenY:y,
                            pageX:x,pageY:y,radiusX:1,radiusY:1,
                            rotationAngle:0,force:1});
      var tOpts={bubbles:true,cancelable:true,touches:[touch],
                 targetTouches:[touch],changedTouches:[touch]};
      target.dispatchEvent(new TouchEvent('touchstart',tOpts));
      target.dispatchEvent(new TouchEvent('touchend',
        Object.assign({},tOpts,{touches:[],targetTouches:[]})));
    }catch(e){}
    target.dispatchEvent(new PointerEvent('pointerdown',opts));
    target.dispatchEvent(new PointerEvent('pointerup',  opts));
    target.dispatchEvent(new MouseEvent('click',        opts));
  }

  function tapOverlay(){
    var overlay=document.querySelector('[id^="clipsoverlay"]');
    if(!overlay){ post({type:'test_tap',status:'no_overlay'}); return; }
    var r=overlay.getBoundingClientRect();
    var cx=r.left+r.width/2, cy=r.top+r.height/2;
    fireClickAt(cx,cy,overlay);
    post({type:'test_tap',status:'fired',x:cx,y:cy,overlayId:overlay.id});
    setTimeout(pollAudioState,120);
  }

  function addTestUI(){
    if(document.getElementById('__rw_test_btn'))return;
    var btn=document.createElement('button');
    btn.id='__rw_test_btn';
    btn.textContent='🔊 TAP TEST';
    btn.style.cssText=[
      'position:fixed','top:60px','left:12px','z-index:2147483647',
      'background:rgba(0,0,0,0.75)','color:#fff',
      'border:1.5px solid rgba(255,255,255,0.4)','border-radius:8px',
      'padding:8px 14px','font-size:13px','font-family:system-ui,sans-serif',
      'cursor:pointer','pointer-events:auto',
      '-webkit-tap-highlight-color:transparent',
    ].join(';');
    btn.addEventListener('click',function(e){ e.stopPropagation(); tapOverlay(); });

    var pill=document.createElement('div');
    pill.id='__rw_audio_pill';
    pill.style.cssText=[
      'position:fixed','top:60px','left:130px','z-index:2147483647',
      'color:#fff','border:1.5px solid rgba(255,255,255,0.4)',
      'border-radius:8px','padding:8px 14px','font-size:13px',
      'font-family:system-ui,sans-serif','pointer-events:none',
      'white-space:nowrap','transition:background 0.3s,border-color 0.3s',
    ].join(';');
    pill.style.background=STATE.WAITING.bg;
    pill.style.borderColor=STATE.WAITING.border;
    pill.textContent=STATE.WAITING.label;
    _statePill=pill;

    var root=document.body||document.documentElement;
    root.appendChild(btn);
    root.appendChild(pill);
    pollAudioState();
  }

  if(document.body){ addTestUI(); }
  else{ document.addEventListener('DOMContentLoaded',addTestUI); }

  /* ── ready — disarm startup error listeners ──────────────────── */
  _startupDone=true;
  window.removeEventListener('error',              onStartupError);
  window.removeEventListener('unhandledrejection', onStartupRejection);
  post({type:'ready'});

})(); true;`;
