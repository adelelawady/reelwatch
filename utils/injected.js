export const INJECTED_JS = `(function(){
  if(window.__rw)return;window.__rw=true;

  // Only hide nav once, not on every mutation
  var navHidden=false;

  function hideNav(){
    if(navHidden)return;

    // Find nav container by counting SVG aria-labels
    // Stop walking up as soon as we find it — don't go further
    var svg=document.querySelector('svg[aria-label="Home"]');
    if(!svg)return;

    var el=svg;
    for(var i=0;i<10;i++){
      var p=el.parentElement;
      if(!p)break;
      var r=p.getBoundingClientRect();
      var svgCount=p.querySelectorAll('svg[aria-label]').length;
      // Nav bar: full width, short height (50-70px), 4+ svg icons
      if(r.width>=window.innerWidth*0.8&&r.height>0&&r.height<120&&svgCount>=4){
        p.style.cssText='display:none!important';
        navHidden=true;
        return;
      }
      // Safety: never hide something taller than 120px (that's the page)
      if(r.height>120&&svgCount<4)break;
      el=p;
    }
  }

  // Run on mutations but only until nav is found
  var obs=new MutationObserver(function(){
    hideNav();
    if(navHidden)obs.disconnect();
  });
  obs.observe(document.documentElement,{childList:true,subtree:true});
  [0,300,800,2000].forEach(function(t){setTimeout(hideNav,t);});

  // Hide login/open-app bar by text — run once after load
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
