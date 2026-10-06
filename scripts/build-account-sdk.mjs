import { build } from 'esbuild';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
await build({
  stdin: { contents: "export { createClient } from '@supabase/supabase-js';", resolveDir: root },
  outfile: resolve(root, 'vendor/supabase/client.js'), bundle: true, minify: true,
  format: 'esm', platform: 'browser', target: 'es2020', legalComments: 'eof',
});
