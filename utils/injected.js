// injected.js — threaded rewrite
// Moves the URL-polling loop off the main thread via an inline Worker.
// DOM work is debounced so MutationObserver callbacks never stack.

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

  /* ── overlay + video watching ────────────────────────────────────
     The overlay itself stays in the DOM untouched so its native
     React click handler (mute/unmute) keeps working.
     We only hide its two direct child divs so the UI is invisible
     but taps still fall through to the overlay and fire normally.  */
  var _vidTimer=null;
  function scheduleVideos(){
    if(_vidTimer)return;
    _vidTimer=setTimeout(function(){ _vidTimer=null; watchVideos(); }, 120);
  }

  function watchVideos(){
    document.querySelectorAll('[id^="clipsoverlay"]').forEach(function(el){
      if(el.__rwOverlay)return; el.__rwOverlay=true;

      /* Hide only the two direct child divs:
           children[0] = mute/unmute icon button
           children[1] = info panel (username, caption, audio, actions)
         The overlay wrapper itself is left visible + interactive.   */
      var ch=el.children;
      for(var i=0;i<ch.length;i++){
        ch[i].style.cssText='visibility:hidden!important';
      }
    });

    document.querySelectorAll('video').forEach(function(v){
      if(v.__rwWatched)return; v.__rwWatched=true;
      v.addEventListener('playing',function(){ post({type:'video_playing'}); });
    });
  }

  new MutationObserver(scheduleVideos)
    .observe(document.documentElement,{childList:true,subtree:true});
  watchVideos();

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
