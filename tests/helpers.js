'use strict';

/** Builds a complete SystemState with sensible defaults, overriding any part. */
const state = (overrides = {}) => ({
    timestamp: Date.now(),
    runtime: { nodeVersion: 'v20.10.0', npmVersion: '10.2.3', arch: 'arm64', platform: 'darwin' },
    package: { dependencies: {}, devDependencies: {}, resolved: {}, scripts: {} },
    lockfile: { hash: 'lock-a', type: 'npm' },
    environment: { keys: [] },
    git: { commit: 'unknown', branch: 'main', isDirty: false },
    configurations: {},
    ...overrides,
    runtime: { nodeVersion: 'v20.10.0', npmVersion: '10.2.3', arch: 'arm64', platform: 'darwin', ...(overrides.runtime || {}) },
    package: { dependencies: {}, devDependencies: {}, resolved: {}, scripts: {}, ...(overrides.package || {}) },
    lockfile: { hash: 'lock-a', type: 'npm', ...(overrides.lockfile || {}) },
    environment: { keys: [], ...(overrides.environment || {}) },
    git: { commit: 'unknown', branch: 'main', isDirty: false, ...(overrides.git || {}) }
});

const byTitle = (findings, needle) => findings.find(f => (f.title || '').includes(needle) || f.message.includes(needle));

module.exports = { state, byTitle };
