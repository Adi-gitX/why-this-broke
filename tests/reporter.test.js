'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { explainIssues, formatAge } = require('../dist');
const { state } = require('./helpers');

const strip = s => s.replace(/\x1b\[[0-9;]*m/g, '');

test('formatAge', () => {
    const now = 1_000_000_000_000;
    assert.equal(formatAge(now - 10_000, now), 'just now');
    assert.equal(formatAge(now - 60_000, now), '1 minute ago');
    assert.equal(formatAge(now - 3 * 3_600_000, now), '3 hours ago');
    assert.equal(formatAge(now - 5 * 86_400_000, now), '5 days ago');
});

test('explainIssues groups findings by severity with a baseline header', () => {
    const findings = [
        { type: 'INFO', confidence: 'LOW', category: 'Source', title: '3 files changed', message: 'a, b, c', remedy: 'git diff' },
        { type: 'CRITICAL', confidence: 'HIGH', category: 'Dependencies', title: 'node-fetch 2.6.12 -> 3.0.0', message: 'ESM only.', remedy: 'Pin v2.' },
        { type: 'WARNING', confidence: 'MEDIUM', category: 'Dependencies', title: 'Lockfile changed', message: 'Differs.', remedy: 'npm ci' }
    ];
    const baseline = state({ timestamp: Date.now() - 7_200_000, execution: { command: 'npm run build', cwd: '/x' } });
    const text = strip(explainIssues(findings, { baseline }));

    assert.match(text, /^Baseline recorded 2 hours ago after npm run build \(Node v20.10.0, darwin-arm64\)\./);
    const order = ['Likely cause', 'node-fetch 2.6.12 -> 3.0.0', 'Fix: Pin v2.', 'Possible cause', 'Lockfile changed', 'Also changed', '3 files changed'];
    let last = -1;
    for (const needle of order) {
        const idx = text.indexOf(needle);
        assert.ok(idx > last, `expected "${needle}" after previous item`);
        last = idx;
    }
});

test('explainIssues with no findings says so', () => {
    assert.match(strip(explainIssues([])), /No drift found/);
});

test('explainIssues with only INFO findings says the code is the likely culprit', () => {
    const text = strip(explainIssues([{ type: 'INFO', confidence: 'LOW', category: 'Source', message: 'x', remedy: 'y' }]));
    assert.match(text, /probably in the code itself/);
    assert.ok(!text.includes('Likely cause'));
});
