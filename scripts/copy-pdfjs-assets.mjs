/**
 * Copies pdfjs-dist cmaps and standard_fonts into public/ so Vite
 * serves them as static assets at /cmaps/ and /standard_fonts/.
 *
 * Runs automatically via:
 *  - postinstall (after npm install)
 *  - build (before vite build)
 */
import { cpSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const copies = [
  {
    src: join(root, 'node_modules', 'pdfjs-dist', 'cmaps'),
    dest: join(root, 'public', 'cmaps'),
  },
  {
    src: join(root, 'node_modules', 'pdfjs-dist', 'standard_fonts'),
    dest: join(root, 'public', 'standard_fonts'),
  },
];

for (const { src, dest } of copies) {
  if (!existsSync(src)) {
    console.warn(`[copy-pdfjs-assets] Source not found, skipping: ${src}`);
    continue;
  }
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true, force: true });
  console.log(`[copy-pdfjs-assets] Copied ${src} → ${dest}`);
}
