import test from 'node:test';
import assert from 'node:assert/strict';
import {channelGuidance,compositeGuidance,sectionFoundation,stampGuide,guideV2,guideText} from '../src/services/buer-pair-guidance.js';
import {PAIR_SECTIONS,pairManualPrompt} from '../src/services/buer-pair-manual.js';
import {CHANNELS} from '../src/engine/human-design-engine.js';
test('every canonical connection has a plain-language discussion prompt without inventing channel names',()=>{
 for(const [g] of CHANNELS){const card=channelGuidance(g.join('–'));assert.ok(card.title&&card.action&&card.theme);assert.ok(!/\d/.test(card.title+card.action));}
 assert.equal(channelGuidance('99–100'),null);assert.match(channelGuidance('27–50').action,/听你说/);assert.match(channelGuidance('25–51').action,/允许拒绝/);
});
test('only calculated connections create suggestions; absent data stays unknown',()=>{
 assert.deepEqual(compositeGuidance({available:false}),[]);
 const cards=compositeGuidance({available:true,electromagnetic:['27–50'],dominanceMe:['18–58']});assert.equal(cards.length,2);assert.match(cards[0].basis,/双方各有一端/);assert.match(cards[1].basis,/你有完整连接/);
});
test('six distinct readable foundations preserve the approved order and decision boundaries',()=>{
 assert.deepEqual(PAIR_SECTIONS.map(x=>x[0]),['overview','communication','friction','rhythm','repair','practice']);
 const titles=PAIR_SECTIONS.map(([key])=>sectionFoundation(key,{},{}).title);assert.equal(new Set(titles).size,6);
 assert.match(sectionFoundation('friction',{core:{'Inner Authority':'荐骨'}},{authority:'情绪'}).basis,/荐骨.*情绪/);
 const old=Object.fromEntries(PAIR_SECTIONS.map(([k])=>[k,'旧文']));assert.equal(guideV2(old),false);const next=stampGuide(old);assert.equal(guideV2(next),true);assert.equal(guideText(next.overview),'旧文');
 for(const [key] of PAIR_SECTIONS)assert.match(pairManualPrompt(),new RegExp(key));
});
