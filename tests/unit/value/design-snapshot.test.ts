import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';

it('freezes published data without mixing in local analyses or seed prices', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'value-snapshot-'));
  try {
    const source = path.join(root, 'publish-repo'), out = path.join(root, 'frozen');
    cpSync('tests/fixtures/value/store', source, { recursive: true });
    const git = (...args: string[]) => execFileSync('git', ['-C', source, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    git('init', '-b', 'main'); git('add', '.');
    git('-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-m', 'snapshot');
    mkdirSync(path.join(root, 'prices'));
    writeFileSync(path.join(root, 'prices/US.json'), '{"KO.US":[1,"2026-09-30","seed"]}');
    mkdirSync(path.join(root, 'analysis'));
    writeFileSync(path.join(root, 'analysis/KO.US.json'), '{"id":"KO.US","valuation":null}');
    execFileSync(process.execPath, ['--import', 'tsx', 'scripts/value/design-snapshot.ts', out], { env: { ...process.env, VALUE_CORPUS_DIR: root }, stdio: 'pipe' });
    for (const file of ['meta.json', 'index/default.json', 'index/US.json', 'prices/US.json', 'dossiers/027.json']) {
      expect(readFileSync(path.join(out, file), 'utf8')).toBe(readFileSync(path.join(source, file), 'utf8'));
    }
    expect(JSON.parse(readFileSync(path.join(out, 'qa-provenance.json'), 'utf8'))).toMatchObject({ commit: git('rev-parse', 'HEAD'), mode: 'published-copy', providerCalls: 0 });
  } finally { rmSync(root, { recursive: true, force: true }); }
});
