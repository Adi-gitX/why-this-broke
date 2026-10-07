'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
    RuntimeDetector, DependencyDetector, SemanticDependencyDetector,
    ConfigDetector, EnvDetector, InferenceEngine, classifyBump, parseVersion
} = require('../dist');
const { state, byTitle } = require('./helpers');

test('semver: parse and classify bumps', () => {
    assert.deepEqual(parseVersion('v18.2.0'), { major: 18, minor: 2, patch: 0, prerelease: undefined });
    assert.equal(parseVersion('latest'), undefined);
    assert.equal(classifyBump('2.6.12', '3.0.0'), 'major');
    assert.equal(classifyBump('1.2.0', '1.3.0'), 'minor');
    assert.equal(classifyBump('1.2.0', '1.2.9'), 'patch');
    assert.equal(classifyBump('0.27.2', '0.28.0'), 'major', '0.x minor bumps are breaking by convention');
    assert.equal(classifyBump('1.0.0', 'nonsense'), 'unknown');
});

test('runtime: node major change is critical, minor change is a warning', () => {
    const detector = new RuntimeDetector();
    const critical = detector.detect(state({ runtime: { nodeVersion: 'v18.19.0' } }), state({ runtime: { nodeVersion: 'v20.10.0' } }));
    assert.equal(critical.length, 1);
    assert.equal(critical[0].type, 'CRITICAL');
    assert.equal(critical[0].title, 'Node v18.19.0 -> v20.10.0');

    const warning = detector.detect(state({ runtime: { nodeVersion: 'v20.9.0' } }), state({ runtime: { nodeVersion: 'v20.10.0' } }));
    assert.equal(warning[0].type, 'WARNING');

    assert.equal(detector.detect(state(), state()).length, 0);
});

test('runtime: platform change asks for a reinstall', () => {
    const findings = new RuntimeDetector().detect(state({ runtime: { arch: 'x64' } }), state({ runtime: { arch: 'arm64' } }));
    assert.equal(findings.length, 1);
    assert.match(findings[0].remedy, /reinstall/);
});

test('dependencies: declared but not installed is the first thing reported', () => {
    const current = state({ package: { dependencies: { express: '^4.18.0', zod: '^3.0.0' }, resolved: { express: { version: '4.18.2' } } } });
    const findings = new DependencyDetector().detect(state(), current);
    const notInstalled = byTitle(findings, 'not installed');
    assert.ok(notInstalled);
    assert.equal(notInstalled.type, 'CRITICAL');
    assert.match(notInstalled.message, /zod/);
    assert.match(notInstalled.remedy, /npm ci/);
});

test('dependencies: an empty node_modules is reported once, not per package', () => {
    const current = state({ package: { dependencies: { a: '1', b: '1', c: '1' } } });
    const findings = new DependencyDetector().detect(state(), current);
    assert.equal(findings.filter(f => f.type === 'CRITICAL').length, 1);
    assert.equal(findings[0].title, 'node_modules is missing');
});

test('dependencies: lockfile change is a warning, package manager switch is critical', () => {
    const detector = new DependencyDetector();
    const changed = detector.detect(state({ lockfile: { hash: 'a' } }), state({ lockfile: { hash: 'b' } }));
    assert.equal(changed[0].type, 'WARNING');
    assert.equal(changed[0].title, 'Lockfile changed');

    const switched = detector.detect(state({ lockfile: { hash: 'a', type: 'npm' } }), state({ lockfile: { hash: 'b', type: 'pnpm' } }));
    assert.equal(switched[0].type, 'CRITICAL');
    assert.match(switched[0].remedy, /pnpm install/);
});

test('dependencies: added, changed and removed ranges in package.json', () => {
    const before = state({ package: { dependencies: { react: '^17.0.0', lodash: '^4.0.0' } } });
    const after = state({ package: { dependencies: { react: '^18.0.0', dayjs: '^1.0.0' }, resolved: { react: { version: '18.2.0' }, dayjs: { version: '1.11.0' } } } });
    const findings = new DependencyDetector().detect(before, after);
    assert.equal(byTitle(findings, 'react range changed').type, 'WARNING');
    assert.equal(byTitle(findings, 'dayjs added').type, 'INFO');
    assert.equal(byTitle(findings, 'lodash removed').type, 'CRITICAL');
});

test('installed versions: a known migration gets the specific explanation', () => {
    const before = state({ package: { resolved: { 'node-fetch': { version: '2.6.12', type: 'commonjs' } } } });
    const after = state({ package: { resolved: { 'node-fetch': { version: '3.3.2', type: 'module' } } } });
    const [finding] = new SemanticDependencyDetector().detect(before, after);
    assert.equal(finding.type, 'CRITICAL');
    assert.equal(finding.title, 'node-fetch 2.6.12 -> 3.3.2');
    assert.match(finding.message, /ERR_REQUIRE_ESM/);
    assert.match(finding.remedy, /pin node-fetch@2/);
    assert.equal(finding.causalGraph.rootCauseIds[0], 'dep-change:node-fetch');
});

test('installed versions: an unknown package that turns ESM is still caught', () => {
    const before = state({ package: { resolved: { 'some-lib': { version: '1.4.0', type: 'commonjs' } } } });
    const after = state({ package: { resolved: { 'some-lib': { version: '2.0.0', type: 'module' } } } });
    const [finding] = new SemanticDependencyDetector().detect(before, after);
    assert.equal(finding.type, 'CRITICAL');
    assert.match(finding.message, /"type": "module"/);
});

test('installed versions: severity follows the size of the bump', () => {
    const detector = new SemanticDependencyDetector();
    const run = (from, to) => detector.detect(
        state({ package: { resolved: { lib: { version: from } } } }),
        state({ package: { resolved: { lib: { version: to } } } })
    )[0];
    assert.equal(run('1.0.0', '2.0.0').type, 'CRITICAL');
    assert.equal(run('1.0.0', '1.1.0').type, 'WARNING');
    assert.equal(run('1.0.0', '1.0.1').type, 'INFO');
    assert.equal(detector.detect(state({ package: { resolved: { lib: { version: '1.0.0' } } } }), state({ package: { resolved: { lib: { version: '1.0.0' } } } })).length, 0);
});

test('config: changed, deleted and added files', () => {
    const before = state({ configurations: { 'tsconfig.json': 'aaa', 'Dockerfile': 'bbb' } });
    const after = state({ configurations: { 'tsconfig.json': 'ccc', 'vite.config.ts': 'ddd' } });
    const findings = new ConfigDetector().detect(before, after);
    assert.equal(byTitle(findings, 'tsconfig.json changed').type, 'CRITICAL');
    assert.equal(byTitle(findings, 'Dockerfile deleted').type, 'CRITICAL');
    assert.equal(byTitle(findings, 'vite.config.ts added').type, 'INFO');
});

test('env: variables that disappeared since the baseline', () => {
    const before = state({ environment: { keys: ['API_KEY', 'DATABASE_URL', 'NODE_ENV'] } });
    const after = state({ environment: { keys: ['NODE_ENV'] } });
    const [finding] = new EnvDetector().detect(before, after);
    assert.equal(finding.type, 'CRITICAL');
    assert.match(finding.message, /API_KEY, DATABASE_URL/);
});

test('env: keys newly declared in .env.example but not set', () => {
    const before = state({ environment: { keys: ['A'], declared: ['A'] } });
    const after = state({ environment: { keys: ['A'], declared: ['A', 'STRIPE_KEY'] } });
    const [finding] = new EnvDetector().detect(before, after);
    assert.match(finding.title, /1 new variable in .env.example/);
    assert.match(finding.message, /STRIPE_KEY/);

    // Already-set declared keys and keys declared before the baseline do not fire.
    const quiet = new EnvDetector().detect(state({ environment: { keys: ['A'], declared: ['A', 'B'] } }), state({ environment: { keys: ['A'], declared: ['A', 'B'] } }));
    assert.equal(quiet.length, 0);
});

test('env: a legacy baseline without environment data does not crash', () => {
    const before = state();
    delete before.environment;
    assert.equal(new EnvDetector().detect(before, state()).length, 0);
});

test('engine: findings are ordered by severity then confidence', () => {
    const before = state({
        runtime: { nodeVersion: 'v18.0.0' },
        configurations: {},
        package: { resolved: { lib: { version: '1.0.0' } } }
    });
    const after = state({
        runtime: { nodeVersion: 'v20.0.0' },
        configurations: { 'jest.config.js': 'x' },
        package: { resolved: { lib: { version: '1.0.1' } } }
    });
    const findings = new InferenceEngine().run(before, after);
    const types = findings.map(f => f.type);
    assert.deepEqual(types, [...types].sort((a, b) => ({ CRITICAL: 0, WARNING: 1, INFO: 2 })[a] - ({ CRITICAL: 0, WARNING: 1, INFO: 2 })[b]));
    assert.equal(findings[0].title, 'Node v18.0.0 -> v20.0.0');
});

test('engine: a throwing detector becomes a finding instead of crashing the run', () => {
    const engine = new InferenceEngine([{ detect() { throw new Error('boom'); } }]);
    const [finding] = engine.run(state(), state());
    assert.equal(finding.type, 'INFO');
    assert.match(finding.message, /boom/);
});
