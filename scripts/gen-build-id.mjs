// Genera src/lib/buildInfo.ts con data+commit, eseguito prima di ogni build.
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

let sha = 'dev';
try { sha = execSync('git rev-parse --short HEAD').toString().trim(); } catch {}
const date = new Date().toISOString().slice(0, 16).replace('T', ' ');
const id = `${date} · ${sha}`;
writeFileSync('src/lib/buildInfo.ts', `// GENERATO da scripts/gen-build-id.mjs — non modificare.\nexport const BUILD_ID = ${JSON.stringify(id)};\n`);
console.log('build id:', id);
