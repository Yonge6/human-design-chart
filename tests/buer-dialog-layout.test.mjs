import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('global confirmation dialogs remain outside the hideable manual workspace', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  for (const id of ['deleteHistoryDialog', 'confirmationDialog', 'historyOptOutDialog']) {
    assert.ok(html.includes(`id="${id}"`));
    assert.ok(!main.includes(`id="${id}"`), `${id} must remain visible when the manual is hidden`);
  }
});
