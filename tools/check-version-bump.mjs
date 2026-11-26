// Trava de versao e commit (SPEC-0011): impede publicar com a mesma versao se houver alteracao em src/ ou public/.
// Uso: node tools/check-version-bump.mjs [--require-clean] [--base <ref>]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const requireClean = args.includes('--require-clean');
const baseIdx = args.indexOf('--base');
const explicitBase = baseIdx >= 0 ? args[baseIdx + 1] : null;

const GIT_ENV = { ...process.env, GIT_CONFIG_GLOBAL: 'NUL', GIT_CONFIG_SYSTEM: 'NUL' };
function git(gitArgs) {
  try {
    return execFileSync('git', gitArgs, { encoding: 'utf8', env: GIT_ENV, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

const currentPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const currentBe = currentPkg.version;
const feSource = fs.readFileSync(path.join('public', 'js', 'version.js'), 'utf8');
const feMatch = feSource.match(/FRONTEND_VERSION\s*=\s*['"]([^'"]+)['"]/);
const currentFe = feMatch ? feMatch[1] : null;

if (!currentBe || !currentFe) {
  console.error('ERRO: versao BE (package.json) ou FE (public/js/version.js) ausente.');
  process.exit(1);
}

if (requireClean) {
  const dirty = git(['status', '--porcelain', '--', 'src/', 'public/', 'package.json', 'docs/', 'test/', 'tools/']);
  if (dirty) {
    console.error('ERRO: ha alteracoes nao commitadas. Sempre comite antes de publicar:\n' + dirty);
    process.exit(1);
  }
}

const branch = git(['branch', '--show-current']);
let baseRef = explicitBase;
if (!baseRef) {
  if (branch && branch !== 'main' && git(['rev-parse', '--verify', 'main'])) {
    baseRef = 'main';
  } else if (git(['rev-parse', '--verify', 'HEAD~1'])) {
    baseRef = 'HEAD~1';
  }
}

if (!baseRef) {
  console.log(`OK: BE v${currentBe} · FE v${currentFe} (sem commit base anterior para comparar).`);
  process.exit(0);
}

const changedFiles = [
  ...git(['diff', '--name-only', `${baseRef}..HEAD`]).split(/\r?\n/),
  ...git(['diff', '--name-only']).split(/\r?\n/),
  ...git(['diff', '--cached', '--name-only']).split(/\r?\n/)
].filter(Boolean);

const srcChanged = changedFiles.some(f => f.startsWith('src/'));
const publicChanged = changedFiles.some(f => f.startsWith('public/'));

if (srcChanged) {
  const basePkgRaw = git(['show', `${baseRef}:package.json`]);
  const baseBe = basePkgRaw ? JSON.parse(basePkgRaw).version : null;
  if (baseBe && baseBe === currentBe) {
    console.error(`ERRO: houve alteracao em src/ desde ${baseRef}, mas package.json continua na versao ${currentBe}. Incremente antes de publicar.`);
    process.exit(1);
  }
}

if (publicChanged) {
  const baseFeRaw = git(['show', `${baseRef}:public/js/version.js`]);
  const baseFeMatch = baseFeRaw.match(/FRONTEND_VERSION\s*=\s*['"]([^'"]+)['"]/);
  const baseFe = baseFeMatch ? baseFeMatch[1] : null;
  if (baseFe && baseFe === currentFe) {
    console.error(`ERRO: houve alteracao em public/ desde ${baseRef}, mas public/js/version.js continua na versao ${currentFe}. Incremente antes de publicar.`);
    process.exit(1);
  }
}

console.log(`OK: trava de versao aprovada (BE v${currentBe} · FE v${currentFe}, base ${baseRef}).`);
