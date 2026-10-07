'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { captureState, saveSnapshot, readSnapshot, parseEnvFileKeys, analyzeFailure } = require('../dist');

const makeProject = () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'why-broke-'));
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
        name: 'fixture',
        dependencies: { alpha: '^1.0.0', beta: '^2.0.0' },
        devDependencies: { gamma: '^3.0.0' }
    }));
    const install = (name, manifest) => {
        const pkgDir = path.join(dir, 'node_modules', name);
        fs.mkdirSync(pkgDir, { recursive: true });
        fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify(manifest));
    };
    install('alpha', { name: 'alpha', version: '1.2.3' });
    install('beta', { name: 'beta', version: '2.0.0', type: 'module' });
    fs.writeFileSync(path.join(dir, 'package-lock.json'), '{"lockfileVersion":3}');
    fs.writeFileSync(path.join(dir, 'tsconfig.json'), '{"compilerOptions":{}}');
    fs.writeFileSync(path.join(dir, '.env'), 'DATABASE_URL=postgres://secret\n# comment\nexport FEATURE_FLAG=1\n');
    fs.writeFileSync(path.join(dir, '.env.example'), 'DATABASE_URL=\nFEATURE_FLAG=\nSTRIPE_KEY=\n');
    return dir;
};

test('parseEnvFileKeys returns names only, skipping comments and blanks', () => {
    const dir = makeProject();
    assert.deepEqual(parseEnvFileKeys(path.join(dir, '.env')), ['DATABASE_URL', 'FEATURE_FLAG']);
    assert.deepEqual(parseEnvFileKeys(path.join(dir, 'does-not-exist')), []);
});

test('captureState reads installed versions from node_modules, not from npm ls', () => {
    const dir = makeProject();
    const stateNow = captureState({ cwd: dir });

    assert.deepEqual(stateNow.package.resolved.alpha, { version: '1.2.3', resolved: undefined, type: 'commonjs' });
    assert.equal(stateNow.package.resolved.beta.type, 'module');
    assert.equal(stateNow.package.resolved.gamma, undefined, 'declared but not installed');
    assert.equal(stateNow.lockfile.type, 'npm');
    assert.match(stateNow.lockfile.hash, /^[0-9a-f]{64}$/);
    assert.ok(stateNow.configurations['tsconfig.json']);
    assert.equal(stateNow.execution, undefined);
});

test('captureState merges .env names and never stores values', () => {
    const dir = makeProject();
    const stateNow = captureState({ cwd: dir });
    assert.ok(stateNow.environment.keys.includes('DATABASE_URL'));
    assert.ok(stateNow.environment.keys.includes('FEATURE_FLAG'));
    assert.deepEqual(stateNow.environment.declared, ['DATABASE_URL', 'FEATURE_FLAG', 'STRIPE_KEY']);
    assert.ok(!JSON.stringify(stateNow).includes('postgres://secret'));
});

test('captureState drops terminal and editor noise from the environment', () => {
    const dir = makeProject();
    process.env.TERM_SESSION_ID = 'noise';
    process.env.VSCODE_PID = '123';
    process.env.MY_APP_SETTING = 'keep';
    try {
        const keys = captureState({ cwd: dir }).environment.keys;
        assert.ok(!keys.includes('TERM_SESSION_ID'));
        assert.ok(!keys.includes('VSCODE_PID'));
        assert.ok(!keys.includes('PWD'));
        assert.ok(keys.includes('MY_APP_SETTING'));
    } finally {
        delete process.env.TERM_SESSION_ID;
        delete process.env.VSCODE_PID;
        delete process.env.MY_APP_SETTING;
    }
});

test('saveSnapshot and readSnapshot round-trip, and reject unusable files', () => {
    const dir = makeProject();
    const file = path.join(dir, '.why-broke.json');
    const written = saveSnapshot(file, { cwd: dir, command: 'npm test' });
    const read = readSnapshot(file);
    assert.equal(read.ok, true);
    assert.equal(read.state.timestamp, written.timestamp);
    assert.deepEqual(read.state.execution, { command: 'npm test', cwd: dir });

    assert.deepEqual(readSnapshot(path.join(dir, 'nope.json')), { ok: false, reason: 'missing' });
    fs.writeFileSync(file, '{not json');
    assert.deepEqual(readSnapshot(file), { ok: false, reason: 'corrupt' });
    fs.writeFileSync(file, JSON.stringify({ runtime: { nodeVersion: 'v1' } }));
    assert.deepEqual(readSnapshot(file), { ok: false, reason: 'legacy' });
});

test('analyzeFailure end to end: a dependency bump after the baseline is the top finding', () => {
    const dir = makeProject();
    const file = path.join(dir, '.why-broke.json');
    saveSnapshot(file, { cwd: dir });

    // Simulate "npm install" pulling alpha@2 and someone deleting tsconfig.
    fs.writeFileSync(path.join(dir, 'node_modules', 'alpha', 'package.json'), JSON.stringify({ name: 'alpha', version: '2.0.0' }));
    fs.unlinkSync(path.join(dir, 'tsconfig.json'));

    const findings = analyzeFailure(file, { cwd: dir });
    const titles = findings.map(f => f.title);
    assert.ok(titles.includes('alpha 1.2.3 -> 2.0.0'));
    assert.ok(titles.includes('tsconfig.json deleted'));
    assert.equal(findings[0].type, 'CRITICAL');

    const none = analyzeFailure(path.join(dir, 'missing.json'), { cwd: dir });
    assert.equal(none.length, 1);
    assert.equal(none[0].title, 'No usable baseline');
});
