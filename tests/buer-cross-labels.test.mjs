import test from 'node:test';
import assert from 'node:assert/strict';
import {chineseCross} from '../src/services/buer-cross-labels.js';
import {INCARNATION_CROSSES} from '../vendor/natalengine/incarnation-crosses.js';
test('all supported cross names have Chinese display labels and preserve gates',()=>{
  for(const names of Object.values(INCARNATION_CROSSES))for(const name of names){
    const translated=chineseCross(`Right Angle Cross of ${name} (35/5 | 63/64)`);
    assert.doesNotMatch(translated,/[a-z]|待翻译/i);assert.ok(translated.endsWith('(35/5 | 63/64)'));
  }
  assert.equal(chineseCross('Left Angle Cross of Prevention (15/10 | 17/18)'),'左角度交叉 · 预防 (15/10 | 17/18)');
});
