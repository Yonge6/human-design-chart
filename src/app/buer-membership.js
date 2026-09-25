const zh=()=>document.documentElement.lang.startsWith('zh');
const native=()=>globalThis.Capacitor?.isNativePlatform?.();
const plugin=()=>globalThis.Capacitor?.Plugins?.PlutoNative||globalThis.Capacitor?.registerPlugin?.('PlutoNative');
let state={products:[]};
export async function chatAccess(){
  if(native()) {state=await plugin().subscriptionStatus();return {installationId:state.installationId,transactionJWS:state.transactionJWS};}
  let id=localStorage.getItem('buer-installation-id');if(!id){id=crypto.randomUUID();localStorage.setItem('buer-installation-id',id);}return {installationId:id};
}
export function showMembership(){
  let dialog=document.querySelector('#buerMembership');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='buerMembership';dialog.className='buer-membership';document.body.append(dialog);}
  dialog.replaceChildren();
  const add=(tag,text,cls)=>{const el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;dialog.append(el);return el;};
  const close=add('button',zh()?'关闭':'Close','membership-close');close.onclick=()=>dialog.close();
  add('h2',zh()?'给自己多一点空间':'More room to reflect');
  add('p',zh()?'每日免费对话 3 条。会员不限每日条数，保留合理的使用频率限制。':'3 free conversations daily. Members have no daily message limit; reasonable rate limits apply.');
  add('p',zh()?'成功完成的回复才计数，每日 UTC 00:00 重置。免费功能不需要订阅。':'Only completed replies count. Free messages reset at 00:00 UTC. A subscription is optional.','membership-note');
  const status=add('p',zh()?'正在读取订阅…':'Loading subscriptions…','membership-status');status.role='status';
  if(!native()){status.textContent=zh()?'请在 iPhone App 内查看会员。':'Subscriptions are available in the iPhone app.';dialog.showModal();return;}
  const render=async()=>{
    try{state=await plugin().subscriptionStatus();status.textContent=state.member?(zh()?'会员已生效':'Membership active'):'';
      if(!state.products?.length)status.textContent=zh()?'订阅暂不可用，请稍后重试。':'Subscriptions are temporarily unavailable. Please try again later.';
      for(const suffix of ['monthly','annual']){
        const p=state.products?.find(p=>p.id.endsWith(suffix));if(!p)continue;
        const b=add('button',`${suffix==='monthly'?(zh()?'月订阅':'Monthly'):(zh()?'年订阅':'Annual')} · ${p.price} / ${suffix==='monthly'?(zh()?'月':'month'):(zh()?'年':'year')}`,'membership-plan');
        status.before(b);
        b.onclick=async()=>{b.disabled=true;try{const result=await plugin().purchaseSubscription({productId:p.id});status.textContent=result.member?(zh()?'会员已生效，可以继续对话。':'Membership active. You can continue chatting.'):result.pending?(zh()?'购买等待批准。':'Purchase pending approval.'):'';}catch{status.textContent=zh()?'未能完成购买，请稍后重试。':'Unable to complete purchase. Please try again.';}finally{b.disabled=false;}};
      }
    }catch{status.textContent=zh()?'无法连接 App Store，请稍后重试。':'Unable to connect to the App Store. Please try again.';}
  };
  void render();
  const restore=add('button',zh()?'恢复购买':'Restore purchases','membership-restore');restore.onclick=async()=>{restore.disabled=true;try{const result=await plugin().restoreSubscriptions();status.textContent=result.member?(zh()?'已恢复会员。':'Membership restored.'):(zh()?'没有找到有效订阅。':'No active subscription found.');}catch{status.textContent=zh()?'恢复失败，请稍后重试。':'Restore failed. Please try again.';}finally{restore.disabled=false;}};
  add('p',zh()?'订阅自动续订，费用由 Apple 账户收取。你可随时在系统订阅设置中管理或取消，下一个周期开始前至少 24 小时取消可避免续费。':'Payment is charged to your Apple Account. Subscriptions renew automatically unless cancelled at least 24 hours before the current period ends. Manage or cancel in Apple subscription settings.','membership-note');
  const links=add('div','', 'membership-links');for(const [title,url]of [[zh()?'隐私政策':'Privacy policy','https://buer.wonderelian.com/privacy.html'],[zh()?'使用条款':'Terms of use','https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'],[zh()?'管理订阅':'Manage subscriptions','https://apps.apple.com/account/subscriptions']]){const a=document.createElement('a');a.textContent=title;a.href=url;a.target='_blank';a.rel='noopener';links.append(a);}
  dialog.showModal();
}
export function initMembership(){
  const b=document.createElement('button');b.type='button';b.className='membership-entry';const render=()=>b.textContent=zh()?'会员与订阅':'Membership & subscriptions';render();document.addEventListener('buer:language',render);b.onclick=showMembership;document.querySelector('#settingsDialog .settings-list')?.before(b);
}
export async function ensureAIConsent(){
  try{if(localStorage.getItem('buer-ai-consent-v2')==='yes')return true;}catch{}
  return new Promise(resolve=>{
    const d=document.createElement('dialog');d.className='buer-membership';
    const h=document.createElement('h2');h.textContent=zh()?'开始 AI 对话前':'Before your first AI conversation';
    const p=document.createElement('p');p.textContent=zh()?'你的对话内容会发送至我们的服务器和 DeepSeek，用于生成回复。若勾选“结合我的说明书”，会发送匿名人类图摘要；勾选“结合成长档案”会发送你允许参考的访谈回答与相关经历。生成行动指南会发送访谈回答。不会自动发送出生资料，但你写入经历或对话的个人信息会随内容一起发送。请勿输入不希望共享的敏感信息。':'Your messages are sent to our server and DeepSeek to generate replies. If you enable “Use my Life Manual”, we send an anonymous reading summary. Profile context includes permitted reflection answers and relevant stories. Generating a guide sends your reflection answers. Birth details are not automatically attached, but personal information you write in shared stories or messages is included. Avoid entering sensitive information you do not wish to share.';
    const actions=document.createElement('div');actions.className='ai-consent-actions';
    const no=document.createElement('button');no.className='consent-secondary';no.textContent=zh()?'暂不使用':'Not now';no.onclick=()=>d.close();
    const yes=document.createElement('button');yes.className='consent-primary';yes.textContent=zh()?'同意并继续':'Agree and continue';let agreed=false;yes.onclick=()=>{agreed=true;try{localStorage.setItem('buer-ai-consent-v2','yes');}catch{}d.close();};
    actions.append(no,yes);d.append(h,p,actions);d.addEventListener('close',()=>{d.remove();resolve(agreed)});document.body.append(d);d.showModal();
  });
}
