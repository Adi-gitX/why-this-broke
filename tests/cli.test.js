'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const CLI = path.join(__dirname, '..', 'dist', 'cli.js');
const run = (cwd, ...args) => spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', env: { ...process.env, FORCE_COLOR: '0' } });
const runWithEnv = (cwd, env, ...args) => spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', env: { ...process.env, FORCE_COLOR: '0', ...env } });

const project = () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'why-broke-cli-'));
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'p', version: '1.0.0', devDependencies: { 'why-broke': '^1.5.0' } }, null, 2) + '\n');
    fs.mkdirSync(path.join(dir, 'node_modules', 'why-broke'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'node_modules', 'why-broke', 'package.json'), '{"name":"why-broke","version":"1.5.0"}');
    fs.writeFileSync(path.join(dir, '.gitignore'), 'node_modules\n');
    return dir;
};

test('cli: --help and --version', () => {
    assert.match(run(os.tmpdir(), '--help').stdout, /Usage/);
    assert.match(run(os.tmpdir(), '--version').stdout, /^\d+\.\d+\.\d+/);
});

test('cli: check without a baseline exits 2, in text and json', () => {
    const dir = project();
    const text = run(dir, 'check');
    assert.equal(text.status, 2);
    assert.match(text.stdout, /No baseline yet/);

    const json = run(dir, 'check', '--json');
    assert.equal(json.status, 2);
    assert.deepEqual(JSON.parse(json.stdout).findings, []);
});

test('cli: init adds the hook and gitignore entry, then record/check round-trip', () => {
    const dir = project();
    const init = run(dir, 'init');
    assert.equal(init.status, 0, init.stderr);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).scripts.postinstall, 'why-broke record');
    assert.match(fs.readFileSync(path.join(dir, '.gitignore'), 'utf8'), /\.why-broke\.json/);
    assert.ok(fs.existsSync(path.join(dir, '.why-broke.json')));

    const clean = run(dir, 'check', '--json');
    assert.equal(clean.status, 0, clean.stdout);
    assert.equal(JSON.parse(clean.stdout).drift, false);

    fs.writeFileSync(path.join(dir, 'tsconfig.json'), '{}');
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'p', version: '1.0.0', dependencies: { zod: '^3.0.0' }, devDependencies: { 'why-broke': '^1.5.0' } }));
    const drift = run(dir, 'check', '--json');
    assert.equal(drift.status, 1);
    const parsed = JSON.parse(drift.stdout);
    assert.equal(parsed.drift, true);
    assert.ok(parsed.findings.some(f => f.title === '1 declared package not installed'));
    assert.ok(parsed.findings.some(f => f.title === 'tsconfig.json added'));
    assert.ok(parsed.findings.every(f => !('causalGraph' in f)));
});

test('cli: init refuses when why-broke is not a dependency', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'why-broke-cli-'));
    fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"p"}');
    const res = run(dir, 'init');
    assert.equal(res.status, 1);
    assert.match(res.stderr, /not a dependency/);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).scripts, undefined);
});

test('cli: wrapped command keeps its exit code and records on success', () => {
    const dir = project();
    const ok = run(dir, 'node', '-e', 'process.exit(0)');
    assert.equal(ok.status, 0, ok.stderr);
    assert.ok(fs.existsSync(path.join(dir, '.why-broke.json')));

    const fail = run(dir, 'node', '-e', 'process.exit(7)');
    assert.equal(fail.status, 7);
    assert.match(fail.stdout, /Command failed with exit code 7/);
});

for (const githubActions of [undefined, 'false', 'true']) {
    test(`cli: check emits annotations only with GITHUB_ACTIONS=${githubActions}`, () => {
        const dir = project();
        const env = { GITHUB_ACTIONS: githubActions };
        fs.writeFileSync(path.join(dir, 'tsconfig.json'), '{}');
        fs.writeFileSync(path.join(dir, 'package-lock.json'), '{}');
        const recorded = runWithEnv(dir, env, 'record');
        assert.equal(recorded.status, 0, recorded.stderr);

        fs.writeFileSync(path.join(dir, 'tsconfig.json'), '{"strict":true}');
        fs.writeFileSync(path.join(dir, 'package-lock.json'), '{"lockfileVersion":3}');
        const text = runWithEnv(dir, env, 'check');
        assert.equal(text.status, 1, text.stderr);
        assert.match(text.stdout, /Likely cause/);
        assert.match(text.stdout, /Possible cause/);
        assert.match(text.stdout, /Fix:/);
        const annotations = text.stdout.split('\n').filter(line => line.startsWith('::'));
        assert.deepEqual(annotations, githubActions === 'true' ? [
            '::error title=tsconfig.json changed::The contents of tsconfig.json differ from the baseline. Fix: See what changed: git log -1 -p -- tsconfig.json (or git diff -- tsconfig.json if it is uncommitted).',
            '::warning title=Lockfile changed::The lockfile differs from the baseline, so transitive dependencies may have moved even where package.json did not. Fix: Run npm ci to install exactly what the lockfile says.'
        ] : []);

        const json = runWithEnv(dir, env, 'check', '--json');
        assert.equal(json.status, 1, json.stderr);
        assert.equal(JSON.parse(json.stdout).drift, true);
        assert.ok(!json.stdout.includes('::error'));
        assert.ok(!json.stdout.includes('::warning'));
    });
}

test('cli: GitHub Actions keeps clean and INFO-only checks at exit 0', () => {
    const dir = project();
    const env = { GITHUB_ACTIONS: 'true' };
    assert.equal(runWithEnv(dir, env, 'record').status, 0);
    const clean = runWithEnv(dir, env, 'check');
    assert.equal(clean.status, 0, clean.stderr);
    assert.match(clean.stdout, /No drift found/);
    assert.ok(!clean.stdout.includes('::'));

    fs.writeFileSync(path.join(dir, 'tsconfig.json'), '{}');
    const info = runWithEnv(dir, env, 'check');
    assert.equal(info.status, 0, info.stderr);
    assert.match(info.stdout, /tsconfig.json added/);
    assert.ok(!info.stdout.includes('::'));
    const json = runWithEnv(dir, env, 'check', '--json');
    assert.equal(json.status, 0, json.stderr);
    const parsed = JSON.parse(json.stdout);
    assert.equal(parsed.drift, false);
    assert.ok(parsed.findings.length > 0);
    assert.ok(parsed.findings.every(f => f.type === 'INFO'));
});

test('cli: GitHub Actions keeps missing-baseline checks at exit 2', () => {
    const dir = project();
    const env = { GITHUB_ACTIONS: 'true' };
    const text = runWithEnv(dir, env, 'check');
    assert.equal(text.status, 2);
    assert.match(text.stdout, /No baseline yet/);
    assert.ok(!text.stdout.includes('::'));
    const json = runWithEnv(dir, env, 'check', '--json');
    assert.equal(json.status, 2);
    assert.deepEqual(JSON.parse(json.stdout).findings, []);
});

test('cli: GitHub Actions keeps a wrapped command exit code with annotations', () => {
    const dir = project();
    const env = { GITHUB_ACTIONS: 'true' };
    fs.writeFileSync(path.join(dir, 'tsconfig.json'), '{}');
    assert.equal(runWithEnv(dir, env, 'record').status, 0);
    fs.writeFileSync(path.join(dir, 'tsconfig.json'), '{"strict":true}');
    const failed = runWithEnv(dir, env, 'node', '-e', 'process.exit(7)');
    assert.equal(failed.status, 7);
    assert.match(failed.stdout, /Command failed with exit code 7/);
    assert.match(failed.stdout, /^::error title=tsconfig.json changed::/m);
});
