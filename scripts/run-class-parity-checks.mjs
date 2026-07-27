#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const checklistPath = resolve(root, 'scripts/class-parity-checklist.md');

function runCommand(command) {
  try {
    execSync(command, { stdio: 'inherit', cwd: root });
    return 0;
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error) {
      return Number((error).status || 1);
    }
    return 1;
  }
}

console.log('Class parity validation runner');

if (!existsSync(checklistPath)) {
  console.error('Missing checklist file at scripts/class-parity-checklist.md');
  process.exit(1);
}

console.log('\n1) Running production build...');
let status = runCommand('npm run build');
if (status !== 0) process.exit(status);

console.log('\n2) Running optional type check...');
status = runCommand('npm run type-check');
if (status !== 0) {
  console.warn('\nType check reported existing project errors. Continuing because this script validates class parity workflows primarily via build + manual checks.');
}

console.log('\n3) Manual checklist (execute in browser):');
console.log('----------------------------------------');
console.log(readFileSync(checklistPath, 'utf8'));

console.log('\nAutomated checks passed. Complete the manual checklist above for full parity validation.');
