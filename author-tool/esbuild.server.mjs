import { build } from 'esbuild';

await build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outdir: 'dist-server',
  packages: 'external',
  sourcemap: false,
  banner: {
    // Fix __dirname / __filename for ESM (esbuild doesn't preserve import.meta.url transforms)
    js: `
import { createRequire } from 'module';
import { fileURLToPath as _fileURLToPath } from 'url';
import { dirname as _dirname } from 'path';
`,
  },
});

console.log('Server build complete → dist-server/');
