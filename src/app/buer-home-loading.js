// Intentionally dependency-free: feedback must not wait for the app module graph.
(() => {
  const timer=setTimeout(()=>{
    if(!document.body.hasAttribute('data-home-pending'))return;
    const status=document.querySelector('#homeBootStatus');
    if(status)status.textContent='加载时间较长，正在等待网络响应。你可以继续等待或重新加载。';
    const retry=document.querySelector('#homeBootRetry');if(retry)retry.hidden=false;
  },10000);
  document.addEventListener('buer:home-ready',()=>clearTimeout(timer),{once:true});
})();
