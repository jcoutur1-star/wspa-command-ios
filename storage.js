// ─── SAVE-DATA LAYER ─────────────────────────────────────────────────────────
// The game reads its saves synchronously, so this keeps an in-memory copy and
// mirrors every write to (a) the phone's native storage (Capacitor Preferences,
// inside the iOS app) and (b) localStorage as a backup. In a normal web browser
// there is no Capacitor, so it simply uses localStorage like before.
(function(){
  var PREFIX="wspa_";
  var cache={};
  var Prefs=(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Preferences)||null;

  function lsGet(k){try{return window.localStorage.getItem(k);}catch(e){return null;}}
  function lsSet(k,v){try{window.localStorage.setItem(k,v);}catch(e){}}
  function lsKeys(){
    var out=[];
    try{for(var i=0;i<window.localStorage.length;i++){var k=window.localStorage.key(i);if(k&&k.indexOf(PREFIX)===0)out.push(k);}}catch(e){}
    return out;
  }

  var store={
    getItem:function(k){return Object.prototype.hasOwnProperty.call(cache,k)?cache[k]:null;},
    setItem:function(k,v){
      v=String(v);cache[k]=v;lsSet(k,v);
      if(Prefs){try{Prefs.set({key:k,value:v}).catch(function(){});}catch(e){}}
    },
    removeItem:function(k){
      delete cache[k];
      try{window.localStorage.removeItem(k);}catch(e){}
      if(Prefs){try{Prefs.remove({key:k}).catch(function(){});}catch(e){}}
    }
  };

  function hydrate(){
    // 1) start from localStorage (also carries over any older browser saves)
    lsKeys().forEach(function(k){cache[k]=lsGet(k);});
    if(!Prefs)return Promise.resolve();
    // 2) native storage wins where it has a value; copy anything it lacks into it
    return Prefs.keys().then(function(res){
      var keys=(res&&res.keys||[]).filter(function(k){return k.indexOf(PREFIX)===0;});
      return Promise.all(keys.map(function(k){
        return Prefs.get({key:k}).then(function(r){if(r&&r.value!==null&&r.value!==undefined)cache[k]=r.value;});
      })).then(function(){
        Object.keys(cache).forEach(function(k){if(keys.indexOf(k)===-1)Prefs.set({key:k,value:cache[k]}).catch(function(){});});
      });
    }).catch(function(){});
  }

  // Never block the game from starting for more than 2 seconds.
  var timeout=new Promise(function(res){setTimeout(res,2000);});
  store.ready=Promise.race([hydrate(),timeout]);
  window.gameStorage=store;
})();
