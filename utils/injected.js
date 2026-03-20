export const INJECTED_JS = `(function(){
  if(window.__rw)return;window.__rw=true;

  // Only hide nav once, not on every mutation
  var navHidden=false;

  function hideNav(){
    if(navHidden)return;
    var svg=document.querySelector('svg[aria-label="Home"]');
    if(!svg)return;
    var el=svg;
    for(var i=0;i<10;i++){
      var p=el.parentElement;
      if(!p)break;
      var r=p.getBoundingClientRect();
      var svgCount=p.querySelectorAll('svg[aria-label]').length;
      if(r.width>=window.innerWidth*0.8&&r.height>0&&r.height<120&&svgCount>=4){
        p.style.cssText='display:none!important';
        navHidden=true;
        return;
      }
      if(r.height>120&&svgCount<4)break;
      el=p;
    }
  }

  var obs=new MutationObserver(function(){
    hideNav();
    if(navHidden)obs.disconnect();
  });
  obs.observe(document.documentElement,{childList:true,subtree:true});
  [0,300,800,2000].forEach(function(t){setTimeout(hideNav,t);});

  setTimeout(function(){
    document.querySelectorAll('a').forEach(function(a){
      var t=(a.textContent||'').trim();
      if(t==='Log in'||t==='Open app'){
        var p=a.parentElement;
        for(var i=0;i<8;i++){
          if(!p)break;
          var r=p.getBoundingClientRect();
          if(r.width>=window.innerWidth*0.8&&r.height>0&&r.height<100){
            p.style.cssText='display:none!important';
            break;
          }
          p=p.parentElement;
        }
      }
    });
  },1000);

  // Signal when a video starts playing — hides placeholder
  function watchVideos(){
    document.querySelectorAll('video').forEach(function(v){
      if(v.__rwWatched)return;
      v.__rwWatched=true;
      v.addEventListener('playing',function(){
        var rn=window.ReactNativeWebView;
        if(rn)rn.postMessage(JSON.stringify({type:'video_playing'}));
      });
    });
  }
  new MutationObserver(function(){watchVideos();})
    .observe(document.documentElement,{childList:true,subtree:true});
  watchVideos();

  function ping(url){
    var rn=window.ReactNativeWebView;if(!rn)return;
    if(url.indexOf('/accounts/login')!==-1||url.indexOf('/?next=')!==-1)
      rn.postMessage(JSON.stringify({type:'auth',status:'logged_out'}));
    else if(url.indexOf('/reels/')!==-1||url.indexOf('/p/')!==-1||url.indexOf('/u/')!==-1)
      rn.postMessage(JSON.stringify({type:'auth',status:'logged_in'}));
  }

  var last=location.href;ping(last);
  setInterval(function(){
    var cur=location.href;
    if(cur!==last){
      last=cur;ping(cur);navHidden=false;
      var rn=window.ReactNativeWebView;
      if(rn)rn.postMessage(JSON.stringify({type:'url_change',url:cur}));
    }
  },800);

  var rn=window.ReactNativeWebView;
  if(rn)rn.postMessage(JSON.stringify({type:'ready'}));
})(); true;`;
