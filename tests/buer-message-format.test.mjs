import test from 'node:test';
import assert from 'node:assert/strict';
import {messageSegments} from '../src/app/buer-message-format.js';
test('assistant emphasis supports multiple spans, paragraphs and partial streaming spans',()=>{
 assert.deepEqual(messageSegments('先**听见自己**，再**做决定**。'),[{text:'先',bold:false},{text:'听见自己',bold:true},{text:'，再',bold:false},{text:'做决定',bold:true},{text:'。',bold:false}]);
 assert.deepEqual(messageSegments('**尚未结束'),[{text:'尚未结束',bold:true}]);
 assert.deepEqual(messageSegments('**第一行\n第二行**'),[{text:'第一行\n第二行',bold:true}]);
 assert.deepEqual(messageSegments('**<img onerror=alert(1)>**'),[{text:'<img onerror=alert(1)>',bold:true}]);
});
