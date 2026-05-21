#!/usr/bin/env node
// Copies third-party static assets into media/ so the webview can load them.
// Run via `npm run vendor`. Cross-platform (no shell brace expansion).
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mediaDir = join(root, 'media');
const themesDir = join(mediaDir, 'themes');
const nm = join(root, 'node_modules');

mkdirSync(themesDir, { recursive: true });

const copies = [
  // html2canvas runtime (loaded by the webview)
  [join(nm, 'html2canvas/dist/html2canvas.min.js'), join(mediaDir, 'html2canvas.min.js')],
  // GitHub-style markdown stylesheet
  [join(nm, 'github-markdown-css/github-markdown-light.css'), join(mediaDir, 'github-markdown.css')],
  // highlight.js syntax themes
  ...[
    'github',
    'github-dark',
    'atom-one-light',
    'atom-one-dark',
    'monokai',
    'nord',
    'vs2015',
  ].map((name) => [
    join(nm, `highlight.js/styles/${name}.css`),
    join(themesDir, `${name}.css`),
  ]),
  // Dracula lives under the base16 subfolder
  [
    join(nm, 'highlight.js/styles/base16/dracula.css'),
    join(themesDir, 'dracula.css'),
  ],
];

for (const [src, dest] of copies) {
  if (!existsSync(src)) {
    console.error(`vendor: missing source file ${src}`);
    process.exit(1);
  }
  copyFileSync(src, dest);
  console.log(`vendor: ${dest.replace(root + '/', '')}`);
}
