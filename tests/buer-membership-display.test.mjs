import test from 'node:test';
import assert from 'node:assert/strict';
import {showMembership} from '../src/app/buer-membership.js';

class Element {
  constructor(tag){this.tag=tag;this.children=[];this.hidden=false;this.className='';this.textContent='';this.classList={add(){},remove(){}};}
  append(...children){for(const child of children){child.parent=this;this.children.push(child);}}
  replaceChildren(){this.children=[];}
  before(child){const children=this.parent.children;if(child.parent){const old=child.parent.children;old.splice(old.indexOf(child),1);}child.parent=this.parent;children.splice(children.indexOf(this),0,child);}
  remove(){const children=this.parent.children;children.splice(children.indexOf(this),1);}
  querySelectorAll(selector){return this.children.filter(child=>selector==='.membership-plan'&&child.className==='membership-plan');}
  showModal(){} close(){}
}
test('active membership hides purchase prompts while nonmembers can still see plans',async()=>{
  let dialog;const body=new Element('body');
  globalThis.document={documentElement:{lang:'zh'},body,createElement:tag=>new Element(tag),querySelector:selector=>selector==='#buerMembership'?dialog:null,addEventListener(){}};
  body.append=function(child){child.parent=this;this.children.push(child);if(child.id==='buerMembership')dialog=child;};
  const plugin={subscriptionStatus:async()=>({member:true,products:[{id:'plus.monthly',price:'¥10'}]})};
  globalThis.Capacitor={isNativePlatform:()=>true,Plugins:{PlutoNative:plugin}};
  showMembership();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(dialog.children.find(x=>x.tag==='h2').textContent,'会员已生效');
  assert.equal(dialog.children.some(x=>x.className==='membership-plan'),false);
  assert.equal(dialog.children.find(x=>x.className==='membership-restore').hidden,true);
  assert.equal(dialog.children.find(x=>x.className==='membership-links').children.at(-1).hidden,false);
  plugin.subscriptionStatus=async()=>({member:false,products:[{id:'plus.monthly',price:'¥10'}]});
  showMembership();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(dialog.children.filter(x=>x.className==='membership-plan').length,1);
  assert.equal(dialog.children.find(x=>x.className==='membership-restore').hidden,false);
});
