import test from 'node:test';
import assert from 'node:assert/strict';
import { BUER_CENTER_COLORS } from '../src/renderer/bodygraph-palette.js';

test('defined centers use nine distinct muted colors', () => {
  const colors = Object.values(BUER_CENTER_COLORS);
  assert.equal(colors.length, 9);
  assert.equal(new Set(colors).size, 9);
  for (const color of colors) assert.match(color, /^#[0-9a-f]{6}$/i);
});
