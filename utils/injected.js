// ─────────────────────────────────────────────────────────────────────────────
//  injected.js
//  DEV / PROD structured injection.
//
//  KEY FIX: Instagram renders all reel slides simultaneously in the DOM with
//  position:absolute + transform:translate3d(0,851px,0) etc.
//  The CURRENT slide always has transform:translate3d(0px, 0px, 0px).
//  ActiveVideo now finds the video inside that specific container instead of
//  guessing by paused state — which was unreliable.
// ─────────────────────────────────────────────────────────────────────────────

export const INJECTED_JS = `(function(){

/* ═══════════════════════════════════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════════════════════════════════ */
var CFG = {
  ENV:               'dev',
  NAV_DEBOUNCE:      80,
  VIDEO_DEBOUNCE:    150,
  AUDIO_POLL:        2000,
  NAV_RETRY_TIMES:   [0, 300, 800, 2000],
  LOGIN_BANNER_DELAY: 1000,
  PANEL_MAX_LOGS:    80,
  PANEL_HEIGHT:      220,
  OVERLAY_MUTE_IDX:  0,
  OVERLAY_INFO_IDX:  1,
};

/* ═══════════════════════════════════════════════════════════════════════════
   BOOT GUARD
═══════════════════════════════════════════════════════════════════════════ */
var rn = window.ReactNativeWebView;
function post(obj){ if(rn) rn.postMessage(JSON.stringify(obj)); }

if(window.__rw){ post({type:'ready'}); return; }
window.__rw = true;

/* ═══════════════════════════════════════════════════════════════════════════
   LOGGER
═══════════════════════════════════════════════════════════════════════════ */
var LOG = (function(){
  var _el = null;
  function _push(lvl, args){
    if(CFG.ENV !== 'dev') return;
    var msg = Array.prototype.slice.call(args).map(function(a){
      return typeof a === 'object' ? JSON.stringify(a) : String(a);
    }).join(' ');
    if(_el){
      var d = document.createElement('div');
      d.style.cssText = 'padding:1px 4px;border-bottom:1px solid rgba(255,255,255,0.06);' +
        (lvl==='ERR'?'color:#ff6b6b':lvl==='WARN'?'color:#ffd93d':'color:#c8f5c8');
      d.textContent = '['+lvl+'] '+msg;
      _el.appendChild(d);
      _el.scrollTop = _el.scrollHeight;
      while(_el.childElementCount > CFG.PANEL_MAX_LOGS) _el.removeChild(_el.firstChild);
    }
  }
  return {
    setEl: function(el){ _el = el; },
    info:  function(){ _push('INFO', arguments); },
    warn:  function(){ _push('WARN', arguments); },
    err:   function(){ _push('ERR',  arguments); },
  };
})();

/* ═══════════════════════════════════════════════════════════════════════════
   STARTUP ERROR GUARD
═══════════════════════════════════════════════════════════════════════════ */
var _startupDone = false;
function _onStartupError(e){
  if(_startupDone) return;
  post({type:'inject_error', msg:(e.message||String(e)), src:(e.filename||''), line:(e.lineno||0)});
}
function _onStartupRejection(e){
  if(_startupDone) return;
  post({type:'inject_error', msg:String(e.reason&&(e.reason.message||e.reason)||'rejection')});
}
window.addEventListener('error',              _onStartupError);
window.addEventListener('unhandledrejection', _onStartupRejection);

/* ═══════════════════════════════════════════════════════════════════════════
   VISIBILITY SPOOF
═══════════════════════════════════════════════════════════════════════════ */
var VisibilitySpoof = {
  init: function(){
    try {
      Object.defineProperty(document,'visibilityState',{get:function(){ return 'visible'; },configurable:true});
      Object.defineProperty(document,'hidden',         {get:function(){ return false; },     configurable:true});
    } catch(e){ LOG.warn('spoof failed',e.message); }
    document.addEventListener('visibilitychange',function(e){
      e.stopImmediatePropagation();
    },{capture:true,passive:false});
    LOG.info('VisibilitySpoof ready');
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   ACTIVE VIDEO
   Instagram keeps ALL reel slides in the DOM at once.
   Each slide sits in a container with:
     transform: translate3d(0px, Npx, 0px)   — off-screen slides
     transform: translate3d(0px, 0px, 0px)   — CURRENT slide
   OR style contains "transform: none"        — also current on first load.

   We find the current slide container, then grab its <video>.
   This is reliable regardless of paused/playing state.
═══════════════════════════════════════════════════════════════════════════ */
var ActiveVideo = {
  _v: null,

  _findCurrent: function(){
    var slides = document.querySelectorAll('[style*="transform"]');
    for(var i=0; i<slides.length; i++){
      var el = slides[i];
      var t  = el.style.transform || '';
      if(t === 'none' || t === 'translate3d(0px, 0px, 0px)'){
        var v = el.querySelector('video');
        if(v) return v;
      }
    }
    var all = document.querySelectorAll('video');
    for(var j=0; j<all.length; j++){
      if(!all[j].paused) return all[j];
    }
    return all.length ? all[0] : null;
  },

  refresh: function(){
    var found = this._findCurrent();
    if(found !== this._v){
      this._v = found;
      LOG.info('ActiveVideo updated', found ? found.src.slice(-40) : 'none');
      AudioState.poll();
    }
    return this._v;
  },

  get: function(){
    return this._findCurrent();
  },

  mute: function(){
    var v = this.get();
    if(v){ v.muted = !v.muted; AudioState.poll(); LOG.info('muted:', v.muted); }
    else { LOG.warn('mute: no active video'); }
  },
  play: function(){
    var v = this.get();
    if(v) v.play().catch(function(e){ LOG.err('play()', e.message); });
    else  LOG.warn('play: no active video');
  },
  pause: function(){
    var v = this.get();
    if(v){ v.pause(); LOG.info('paused'); }
    else  LOG.warn('pause: no active video');
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   ROUTER
═══════════════════════════════════════════════════════════════════════════ */
var Router = {
  _last: location.href,
  init: function(){
    var self = this;
    var _push    = history.pushState.bind(history);
    var _replace = history.replaceState.bind(history);
    history.pushState    = function(s,t,u){ _push(s,t,u);    self._onChange(location.href); };
    history.replaceState = function(s,t,u){ _replace(s,t,u); self._onChange(location.href); };
    window.addEventListener('popstate', function(){ self._onChange(location.href); });
    this._ping(this._last);
    LOG.info('Router ready', this._last);
  },
  _onChange: function(url){
    if(url===this._last) return;
    this._last = url;
    this._ping(url);
    NavHider.reset();
    post({type:'url_change',url:url});
    NavHider.schedule();
    setTimeout(function(){ ActiveVideo.refresh(); AudioState.poll(); }, 300);
    LOG.info('url_change', url);
  },
  _ping: function(url){
    if(url.indexOf('/accounts/login')!==-1||url.indexOf('/?next=')!==-1){
      post({type:'auth',status:'logged_out'}); LOG.warn('auth: logged_out');
    } else if(url.indexOf('/reels/')!==-1||url.indexOf('/p/')!==-1||url.indexOf('/u/')!==-1){
      post({type:'auth',status:'logged_in'}); LOG.info('auth: logged_in');
    }
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   NAV HIDER
═══════════════════════════════════════════════════════════════════════════ */
var NavHider = {
  _hidden: false, _timer: null, _obs: null,
  init: function(){
    var self = this;
    this._obs = new MutationObserver(function(){
      self.schedule();
      if(self._hidden){ self._obs.disconnect(); }
    });
    this._obs.observe(document.documentElement,{childList:true,subtree:true});
    CFG.NAV_RETRY_TIMES.forEach(function(t){ setTimeout(function(){ self.hide(); },t); });
    setTimeout(function(){ self._hideBanners(); }, CFG.LOGIN_BANNER_DELAY);
    LOG.info('NavHider ready');
  },
  reset: function(){ this._hidden = false; },
  schedule: function(){
    var self = this;
    if(this._hidden||this._timer) return;
    this._timer = setTimeout(function(){ self._timer=null; self.hide(); }, CFG.NAV_DEBOUNCE);
  },
  hide: function(){
    if(this._hidden) return;
    var svg = document.querySelector('svg[aria-label="Home"]');
    if(!svg) return;
    var el = svg;
    for(var i=0;i<10;i++){
      var p=el.parentElement; if(!p) break;
      var r=p.getBoundingClientRect();
      var n=p.querySelectorAll('svg[aria-label]').length;
      if(r.width>=window.innerWidth*0.8&&r.height>0&&r.height<120&&n>=4){
        p.style.cssText='display:none!important';
        this._hidden=true; LOG.info('nav hidden'); return;
      }
      if(r.height>120&&n<4) break;
      el=p;
    }
  },
  _hideBanners: function(){
    document.querySelectorAll('a').forEach(function(a){
      var t=(a.textContent||'').trim();
      if(t!=='Log in'&&t!=='Open app') return;
      var p=a.parentElement;
      for(var i=0;i<8;i++){
        if(!p) break;
        var r=p.getBoundingClientRect();
        if(r.width>=window.innerWidth*0.8&&r.height>0&&r.height<100){
          p.style.cssText='display:none!important'; break;
        }
        p=p.parentElement;
      }
    });
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   OVERLAY CONTROLS
═══════════════════════════════════════════════════════════════════════════ */
var OverlayControls = {
  _hidden: true,
  _applyTo: function(el){
    var vis = this._hidden ? 'visibility:hidden!important' : 'visibility:visible!important';
    var ch = el.children;
    if(ch[CFG.OVERLAY_MUTE_IDX]) ch[CFG.OVERLAY_MUTE_IDX].style.cssText = vis;
    if(ch[CFG.OVERLAY_INFO_IDX]) ch[CFG.OVERLAY_INFO_IDX].style.cssText = vis;
  },
  register: function(el){ this._applyTo(el); },
  _applyAll: function(){
    var self = this;
    document.querySelectorAll('[id^="clipsoverlay"]').forEach(function(el){ self._applyTo(el); });
  },
  hide:     function(){ this._hidden=true;  this._applyAll(); },
  show:     function(){ this._hidden=false; this._applyAll(); },
  toggle:   function(){ this._hidden ? this.show() : this.hide(); return !this._hidden; },
  isHidden: function(){ return this._hidden; },
};

/* ═══════════════════════════════════════════════════════════════════════════
   VIDEO WATCHER
═══════════════════════════════════════════════════════════════════════════ */
var VideoWatcher = {
  _timer: null,
  init: function(){
    var self = this;
    new MutationObserver(function(){ self.schedule(); })
      .observe(document.documentElement,{childList:true,subtree:true});
    this.scan();
    LOG.info('VideoWatcher ready');
  },
  schedule: function(){
    var self = this;
    if(this._timer) return;
    this._timer = setTimeout(function(){ self._timer=null; self.scan(); }, CFG.VIDEO_DEBOUNCE);
  },
  scan: function(){
    var overlays = 0, videos = 0;

    document.querySelectorAll('[id^="clipsoverlay"]').forEach(function(el){
      if(el.__rwOverlay) return; el.__rwOverlay = true;
      OverlayControls.register(el);
      overlays++;
    });

    document.querySelectorAll('video').forEach(function(v){
      if(v.__rwWatched) return; v.__rwWatched = true;
      v.addEventListener('playing', function(){
        post({type:'video_playing'});
        ActiveVideo.refresh();
        AudioState.poll();
      });
      v.addEventListener('volumechange', function(){ AudioState.poll(); });
      videos++;
    });

    if(overlays||videos) LOG.info('scan: overlays='+overlays+' videos='+videos);
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   AUDIO STATE
═══════════════════════════════════════════════════════════════════════════ */
var AudioState = {
  _pill: null,
  _states: {
    WAITING:{ label:'⏳ waiting', bg:'rgba(80,80,80,0.85)',  border:'rgba(255,255,255,0.25)' },
    MUTED:  { label:'🔇 muted',   bg:'rgba(180,30,30,0.85)', border:'rgba(255,100,100,0.5)'  },
    LIVE:   { label:'🔊 live',    bg:'rgba(20,140,60,0.85)', border:'rgba(80,255,130,0.5)'   },
  },
  setPill: function(el){ this._pill = el; },
  set: function(key){
    if(!this._pill) return;
    var s = this._states[key]||this._states.WAITING;
    this._pill.textContent=s.label;
    this._pill.style.background=s.bg;
    this._pill.style.borderColor=s.border;
  },
  poll: function(){
    var v = ActiveVideo.get();
    if(!v){ this.set('WAITING'); return; }
    this.set((v.muted||v.volume===0)?'MUTED':'LIVE');
  },
  startPolling: function(){
    var self = this;
    setInterval(function(){ self.poll(); }, CFG.AUDIO_POLL);
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   TAP ENGINE
═══════════════════════════════════════════════════════════════════════════ */
var TapEngine = {
  fire: function(x,y,target){
    var opts={bubbles:true,cancelable:true,view:window,clientX:x,clientY:y,screenX:x,screenY:y};
    try{
      var touch=new Touch({identifier:1,target:target,clientX:x,clientY:y,screenX:x,screenY:y,
                           pageX:x,pageY:y,radiusX:1,radiusY:1,rotationAngle:0,force:1});
      var tOpts={bubbles:true,cancelable:true,touches:[touch],targetTouches:[touch],changedTouches:[touch]};
      target.dispatchEvent(new TouchEvent('touchstart',tOpts));
      target.dispatchEvent(new TouchEvent('touchend',Object.assign({},tOpts,{touches:[],targetTouches:[]})));
    }catch(e){}
    target.dispatchEvent(new PointerEvent('pointerdown',opts));
    target.dispatchEvent(new PointerEvent('pointerup',  opts));
    target.dispatchEvent(new MouseEvent('click',        opts));
    LOG.info('tap at',x.toFixed(0)+','+y.toFixed(0));
  },
  tapOverlay: function(){
    var v = ActiveVideo.get();
    var overlay = null;

    if(v){
      var p = v.parentElement;
      for(var i=0; i<15; i++){
        if(!p) break;
        var o = p.querySelector('[id^="clipsoverlay"]');
        if(o){ overlay = o; break; }
        p = p.parentElement;
      }
    }
    if(!overlay) overlay = document.querySelector('[id^="clipsoverlay"]');
    if(!overlay){ post({type:'test_tap',status:'no_overlay'}); LOG.warn('no overlay'); return; }

    var r  = overlay.getBoundingClientRect();
    var cx = r.left+r.width/2;
    var cy = r.top+r.height/2;
    this.fire(cx,cy,overlay);
    post({type:'test_tap',status:'fired',x:cx,y:cy,overlayId:overlay.id});
    setTimeout(function(){ ActiveVideo.refresh(); AudioState.poll(); },120);
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   DEV PANEL
═══════════════════════════════════════════════════════════════════════════ */
var DevPanel = {
  _bodyEl: null, _logEl: null, _visible: true,

  init: function(){
    if(CFG.ENV !== 'dev') return;
    if(document.getElementById('__rw_panel')) return;
    var self = this;

    var panel = document.createElement('div');
    panel.id = '__rw_panel';
    panel.style.cssText = [
      'position:fixed','top:10px','right:10px','width:300px','z-index:2147483647',
      'background:rgba(10,10,20,0.93)','border:1px solid rgba(255,255,255,0.15)',
      'border-radius:10px','overflow:hidden','font-family:system-ui,monospace',
      'font-size:11px','color:#fff','box-shadow:0 4px 24px rgba(0,0,0,0.7)',
    ].join(';');

    var tb = this._row('rgba(255,255,255,0.07)','6px 10px');
    tb.style.justifyContent = 'space-between';
    var title = document.createElement('span');
    title.textContent = '🛠 RW DEV';
    title.style.cssText = 'font-weight:700;font-size:12px';
    var badge = document.createElement('span');
    badge.textContent = CFG.ENV.toUpperCase();
    badge.style.cssText = 'background:rgba(100,200,100,0.25);border-radius:4px;padding:1px 6px;font-size:10px;color:#7dff7d';
    var right = document.createElement('span');
    right.style.cssText = 'display:flex;gap:6px;align-items:center';
    right.appendChild(badge);
    right.appendChild(this._btn('HIDE',  function(){ self._toggleBody(); }));
    right.appendChild(this._btn('CLEAR', function(){ if(self._logEl) self._logEl.innerHTML=''; }));
    tb.appendChild(title); tb.appendChild(right);
    panel.appendChild(tb);

    var body = document.createElement('div');
    this._bodyEl = body;

    var r1 = this._row('rgba(255,255,255,0.04)','6px 8px');
    r1.style.cssText += ';flex-wrap:wrap;gap:6px';
    r1.appendChild(this._btn('🔊 Tap',    function(){ TapEngine.tapOverlay(); }));
    r1.appendChild(this._btn('🔇 Mute',   function(){ ActiveVideo.mute(); }));
    r1.appendChild(this._btn('▶ Play',    function(){ ActiveVideo.play(); }));
    r1.appendChild(this._btn('⏸ Pause',   function(){ ActiveVideo.pause(); }));
    r1.appendChild(this._btn('🔄 Reload', function(){ setTimeout(function(){ location.reload(); },200); }));
    r1.appendChild(this._btn('📋 Post',   function(){ post({type:'dev_ping',ts:Date.now()}); LOG.info('dev_ping'); }));
    body.appendChild(r1);

    var r2 = this._row('rgba(255,255,255,0.02)','6px 8px');
    r2.style.cssText += ';flex-wrap:wrap;gap:6px';
    var lbl = document.createElement('span');
    lbl.textContent = 'View:';
    lbl.style.cssText = 'opacity:0.5;font-size:10px;white-space:nowrap;align-self:center';
    r2.appendChild(lbl);

    var btnVC = this._btn(this._vcLabel(), function(){
      OverlayControls.toggle();
      btnVC.textContent = self._vcLabel();
    });
    btnVC.style.minWidth = '140px';
    r2.appendChild(btnVC);

    var muteHidden = false;
    r2.appendChild(this._btn('🔇 Icon', function(){
      muteHidden = !muteHidden;
      document.querySelectorAll('[id^="clipsoverlay"]').forEach(function(el){
        var ch = el.children[CFG.OVERLAY_MUTE_IDX];
        if(ch) ch.style.cssText = muteHidden ? 'visibility:hidden!important' : '';
      });
    }));

    var infoHidden = false;
    r2.appendChild(this._btn('ℹ Info', function(){
      infoHidden = !infoHidden;
      document.querySelectorAll('[id^="clipsoverlay"]').forEach(function(el){
        var ch = el.children[CFG.OVERLAY_INFO_IDX];
        if(ch) ch.style.cssText = infoHidden ? 'visibility:hidden!important' : '';
      });
    }));
    body.appendChild(r2);

    var sr = this._row('rgba(255,255,255,0.03)','5px 10px');
    sr.style.gap = '8px';
    var pill = document.createElement('div');
    pill.style.cssText = 'border:1px solid rgba(255,255,255,0.3);border-radius:6px;padding:3px 10px;font-size:11px;pointer-events:none;transition:background 0.3s,border-color 0.3s';
    AudioState.setPill(pill);
    AudioState.poll();

    var counter = document.createElement('span');
    counter.style.cssText = 'opacity:0.6;font-size:10px';
    setInterval(function(){
      var v = ActiveVideo.get();
      var n = document.querySelectorAll('[id^="clipsoverlay"]').length;
      counter.textContent = 'ov:'+n+' vid:'+(v?'✓'+(v.paused?'⏸':'▶'):'✗');
    }, 2000);
    sr.appendChild(pill); sr.appendChild(counter);
    body.appendChild(sr);

    var logEl = document.createElement('div');
    logEl.style.cssText = 'height:'+CFG.PANEL_HEIGHT+'px;overflow-y:auto;padding:4px 0;font-size:10px;line-height:1.5';
    LOG.setEl(logEl);
    this._logEl = logEl;
    body.appendChild(logEl);

    panel.appendChild(body);
    (document.body||document.documentElement).appendChild(panel);
    LOG.info('DevPanel mounted');
  },

  _vcLabel: function(){ return OverlayControls.isHidden() ? '👁 Show View Controls' : '🙈 Hide View Controls'; },
  _toggleBody: function(){ this._visible=!this._visible; this._bodyEl.style.display=this._visible?'':'none'; },
  _row: function(bg,padding){
    var d=document.createElement('div');
    d.style.cssText='display:flex;align-items:center;background:'+bg+';padding:'+padding;
    return d;
  },
  _btn: function(label,onClick){
    var b=document.createElement('button');
    b.textContent=label;
    b.style.cssText=[
      'background:rgba(255,255,255,0.1)','color:#fff',
      'border:1px solid rgba(255,255,255,0.2)','border-radius:5px',
      'padding:3px 8px','font-size:10px','font-family:inherit',
      'cursor:pointer','pointer-events:auto',
      '-webkit-tap-highlight-color:transparent','white-space:nowrap',
    ].join(';');
    b.addEventListener('click',function(e){ e.stopPropagation(); onClick(); });
    return b;
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════════════════════════════════ */
VisibilitySpoof.init();
Router.init();
NavHider.init();
VideoWatcher.init();
AudioState.startPolling();

if(document.body){ DevPanel.init(); }
else { document.addEventListener('DOMContentLoaded', function(){ DevPanel.init(); }); }

window.__rwSetEnv = function(env){ CFG.ENV=env; LOG.info('ENV:',env); };

/* Exposed to RN — call via injectJavaScript to tap the current overlay.
   Used after server-navigated video starts playing to sync mute state. */
window.__rwTapOverlay = function(){ TapEngine.tapOverlay(); };

_startupDone = true;
window.removeEventListener('error',              _onStartupError);
window.removeEventListener('unhandledrejection', _onStartupRejection);
post({type:'ready'});
LOG.info('boot complete');

})(); true;`;
