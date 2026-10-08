import test from 'node:test';
import assert from 'node:assert/strict';
import {pairComparisonGroups} from '../src/app/buer-pair-comparison.js';
const me={core:{Profile:'5/1: Heretic / Investigator'},centers:['sacral center','splenic center','solar plexus center'],channels:[[60,3],[10,34]],design:{'North Node':{Gate:3,Line:4},Sun:{Gate:17,Line:1}},personality:{Earth:{Gate:10,Line:5}}};
const other={core:{profile:'3/5'},structure:{definedCenters:['sacral','spleen'],channels:[[3,60],[5,15]]},activations:{design:{northNode:{gate:28,line:4},sun:{gate:21,line:5}},personality:{earth:{gate:38,line:3}}}};
test('comparison aligns all eleven fields and distinguishes missing data',()=>{
 const groups=pairComparisonGroups(me,other);assert.equal(groups[0].rows.length,11);
 assert.deepEqual(groups[0].rows[3],['人生角色','5/1','3/5']);
 assert.deepEqual(groups[0].rows[8],['消化','暂无资料','暂无资料']);
 assert.deepEqual(pairComparisonGroups(null,null)[1].rows[0],['头顶','暂无资料','暂无资料']);
});
test('center aliases and unordered channels compare symmetrically without mutation',()=>{
 const before=JSON.stringify([me,other]),groups=pairComparisonGroups(me,other);
 assert.equal(groups[1].rows.length,9);assert.deepEqual(groups[1].rows[6],['脾脏','已定义','已定义']);
 assert.deepEqual(groups[1].rows[7],['情绪','已定义','未定义']);
 assert.deepEqual(groups[2].rows,[['3–60','有','有'],['5–15','无','有'],['10–34','有','无']]);
 assert.equal(JSON.stringify([me,other]),before);
});
test('planet rows use fixed matching order across camelCase and engine keys',()=>{
 const groups=pairComparisonGroups(me,other);assert.equal(groups[3].rows.length,13);assert.equal(groups[4].rows.length,13);
 assert.deepEqual(groups[3].rows[2],['北交点','3.4','28.4']);
 assert.deepEqual(groups[4].rows[1],['地球','10.5','38.3']);
 assert.deepEqual(groups[3].rows[12],['冥王星','暂无资料','暂无资料']);
});
test('English labels and shared translation hook remain available',()=>{
 const groups=pairComparisonGroups(me,other,{language:'en',translate:(k,v)=>`${k}:${v}`});
 assert.deepEqual(groups[0].rows[3],['Profile','Profile:5/1','Profile:3/5']);
 assert.deepEqual(groups[1].rows[6],['spleen','Defined','Defined']);
});
test('verified recalculated properties fill the extended person fields',()=>{
 const properties={Sign:'Satisfaction','Not Self Theme':'Frustration',Digestion:'Calm Touch',Sense:'Outer Vision',Environment:'Artificial Shores'};
 const group=pairComparisonGroups(me,other,{otherProperties:properties})[0];
 assert.deepEqual(group.rows.slice(6).map(r=>r[2]),Object.values(properties));
});
