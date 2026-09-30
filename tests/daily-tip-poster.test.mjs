import test from 'node:test';
import assert from 'node:assert/strict';
import { wrapPosterText } from '../src/renderer/daily-tip-poster.js';

const context = { measureText: text => ({ width: [...text].length * 10 }) };

test('Chinese wrapping keeps closing punctuation off the start of a line without losing text', () => {
  const text = '做事前先说清楚自己需要什么，让合作轻松一点。';
  const lines = wrapPosterText(context, text, 130);
  assert.equal(lines.join(''), text);
  assert.ok(lines.every(line => !/^[，。！？；：、）”’]/u.test(line)));
  assert.ok(lines.every(line => context.measureText(line).width <= 130));
});

test('English wrapping preserves complete words and explicit paragraphs', () => {
  assert.deepEqual(wrapPosterText(context, 'One useful thought\nKeep it simple', 120), ['One useful', 'thought', 'Keep it', 'simple']);
});
