'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const { captureState, InferenceEngine } = require('../dist');

test('Benchmark: Snapshot capture performance', () => {
    const start = performance.now();
    const iterations = 20;
    for (let i = 0; i < iterations; i++) {
        captureState();
    }
    const duration = performance.now() - start;
    const avgMs = duration / iterations;
    console.log(`  Capture latency: ${avgMs.toFixed(2)} ms / op`);
    assert.ok(avgMs < 500, `Capture time (${avgMs} ms) should be under 500 ms`);
});

test('Benchmark: Inference engine analysis latency', () => {
    const snapA = captureState();
    const snapB = captureState();

    const engine = new InferenceEngine();
    const start = performance.now();
    const iterations = 100;
    for (let i = 0; i < iterations; i++) {
        engine.run(snapA, snapB);
    }
    const duration = performance.now() - start;
    const avgMs = duration / iterations;
    console.log(`  Engine analysis latency: ${avgMs.toFixed(2)} ms / op`);
    assert.ok(avgMs < 50, `Engine analysis time (${avgMs} ms) should be under 50 ms`);
});
