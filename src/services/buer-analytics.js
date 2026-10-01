import {CONSENT_KEY,usageEvent} from '../../shared/buer-analytics-contract.js';

export function createUsage({storage,surface='h5',send,setNativeConsent=async()=>{}}) {
  let enabled=false,epoch=0,ready=Promise.resolve(),lastActive=null;
  const track=(name,fields={})=>{
    const event=usageEvent(name,fields,surface),generation=epoch;
    if(!enabled||!event)return;
    void ready.then(()=>{if(enabled&&epoch===generation)return send(event);}).catch(()=>{});
  };
  const consent=(value)=>{
    enabled=value===true;epoch++;lastActive=null;
    try{storage?.setItem(CONSENT_KEY,enabled?'yes':'no');}catch{}
    const granted=enabled;
    const generation=epoch;
    try { ready=Promise.resolve(setNativeConsent(granted)).catch(()=>{if(epoch===generation)enabled=false;}); }
    catch { enabled=false;ready=Promise.resolve(); }
  };
  const sample=(now,visible)=>{
    if(!enabled||!visible){lastActive=null;return;}
    if(lastActive!==null){const seconds=(now-lastActive)/1000;if(seconds>0&&seconds<=35)track('active_time',{value:seconds});}
    lastActive=now;
  };
  const start=()=>{let value=false;try{value=storage?.getItem(CONSENT_KEY)==='yes';}catch{}consent(value);track('visit');};
  return {track,consent,sample,start,get enabled(){return enabled;}};
}
let current;
export const trackUsage=(name,fields)=>current?.track(name,fields);
export function initUsage() {
  if(current)return;
  const native=globalThis.Capacitor?.isNativePlatform?.()===true;
  const allowed=native||(location.protocol==='https:'&&location.hostname==='buer.wonderelian.com');
  if(!allowed)return;
  let storage;try{storage=localStorage;}catch{}
  const plugin=native?(globalThis.Capacitor.Plugins?.BuerAnalytics||globalThis.Capacitor.registerPlugin('BuerAnalytics')):null;
  current=createUsage({storage,surface:native?'ios':'h5',
    send:event=>native?plugin.record(event):window.dispatchEvent(new CustomEvent('buer:usage',{detail:event})),
    setNativeConsent:enabled=>native?plugin.consent({enabled}):window.dispatchEvent(new CustomEvent('buer:usage-consent',{detail:{enabled}})),
  });
  current.start();
  const label=document.createElement('label');label.className='settings-row';
  const input=document.createElement('input');input.type='checkbox';input.checked=current.enabled;input.id='buerUsageConsent';
  const text=document.createElement('span');const title=document.createElement('strong'),hint=document.createElement('small');text.append(title,hint);label.append(text,input);
  const render=()=>{const zh=document.documentElement.lang.startsWith('zh');title.textContent=zh?'分享使用统计，帮助豆豆龙改进':'Share usage statistics';hint.textContent=zh?'默认关闭。向 Google Analytics / Firebase 发送使用时长和操作结果，含假名化设备标识；不含对话、出生信息、访谈或经历正文。可随时关闭。':'Off by default. Sends duration and action outcomes with pseudonymous device identifiers to Google Analytics / Firebase. No chat, birth details, answers or stories. Turn off at any time.';};
  render();document.addEventListener('buer:language',render);document.querySelector('#settingsDialog .settings-list')?.append(label);
  input.onchange=()=>{current.consent(input.checked);previous='';if(input.checked){current.track('visit');screen();}};
  let previous='';
  function screen(){const next=document.body.dataset.workspace||'home';if(next!==previous){previous=next;current.track('screen',{screen:next});}}
  new MutationObserver(screen).observe(document.body,{attributes:true,attributeFilter:['data-workspace']});screen();
  let lastInteraction=performance.now();
  for(const name of ['pointerdown','keydown','scroll'])window.addEventListener(name,()=>{lastInteraction=performance.now();},{passive:true});
  const sample=()=>current.sample(performance.now(),document.visibilityState==='visible'&&performance.now()-lastInteraction<60000);
  setInterval(sample,30000);document.addEventListener('visibilitychange',sample);window.addEventListener('pagehide',()=>current.sample(performance.now(),false));sample();
}
