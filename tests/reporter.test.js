'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { explainIssues, formatAge } = require('../dist');
const { formatGitHubAnnotations } = require('../dist/reporter/explain');
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

test('formatGitHubAnnotations maps CRITICAL and WARNING findings and skips INFO', () => {
    const findings = [
        { type: 'CRITICAL', title: 'Config changed', message: 'Contents differ.', remedy: 'Restore it.' },
        { type: 'INFO', title: 'File added', message: 'New file.', remedy: 'Expected.' },
        { type: 'WARNING', title: 'Lockfile changed', message: 'Dependencies moved.', remedy: 'npm ci' }
    ];
    assert.equal(formatGitHubAnnotations(findings), [
        '::error title=Config changed::Contents differ. Fix: Restore it.',
        '::warning title=Lockfile changed::Dependencies moved. Fix: npm ci'
    ].join('\n'));
});

test('formatGitHubAnnotations escapes command data and title properties', () => {
    const finding = {
        type: 'CRITICAL',
        title: '100%, file: config\r\nchanged',
        message: '50% done\r\n::warning::literal %0A',
        remedy: 'Reset %\rthen\nretry: now, please.'
    };
    assert.equal(formatGitHubAnnotations([finding]),
        '::error title=100%25%2C file%3A config%0D%0Achanged::50%25 done%0D%0A::warning::literal %250A Fix: Reset %25%0Dthen%0Aretry: now, please.');
});

test('formatGitHubAnnotations supports findings without a title', () => {
    assert.equal(formatGitHubAnnotations([{ type: 'WARNING', message: 'Changed.', remedy: 'Retry.' }]),
        '::warning::Changed. Fix: Retry.');
});

test('formatGitHubAnnotations emits nothing for no findings or only INFO', () => {
    assert.equal(formatGitHubAnnotations([]), '');
    assert.equal(formatGitHubAnnotations([{ type: 'INFO', message: 'Changed.', remedy: 'Expected.' }]), '');
});
