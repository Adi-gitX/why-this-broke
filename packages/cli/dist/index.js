#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const recorder_1 = require("@causal/recorder");
const analyzer_1 = require("@causal/analyzer");
const reasoner_1 = require("@causal/reasoner");
const child_process_1 = require("child_process");
commander_1.program
    .name('causal')
    .description('Causal Debugger - Project Lazarus')
    .version('1.0.0');
commander_1.program
    .command('record')
    .description('Record a successful state')
    .action(() => {
    console.log('Recording state...');
    const recorder = new recorder_1.SnapshotRecorder();
    const snapshot = recorder.capture();
    console.log(`Snapshot captured: ${snapshot.id}`);
    // In real impl, save to DB
});
commander_1.program
    .command('debug [refA] [refB]')
    .description('Diagnose a failure between two points (default: HEAD~1 vs HEAD)')
    .action(async (refA = 'HEAD~1', refB = 'HEAD') => {
    console.log(`🔍 Analyzing changes between ${refA} and ${refB}...`);
    // 1. Analyze
    const analyzer = new analyzer_1.Analyzer(process.cwd());
    let lockAContent = '{}';
    let lockBContent = '{}';
    try {
        lockAContent = (0, child_process_1.execSync)(`git show ${refA}:package-lock.json`, { encoding: 'utf-8' });
    }
    catch (e) { }
    try {
        lockBContent = (0, child_process_1.execSync)(`git show ${refB}:package-lock.json`, { encoding: 'utf-8' });
    }
    catch (e) { }
    const fileChanges = await analyzer.analyzeFiles(refA, refB);
    const depChanges = await analyzer.analyzeDeps(JSON.parse(lockAContent), JSON.parse(lockBContent));
    // 2. Reason
    const graph = new reasoner_1.CausalGraph();
    graph.ingest({
        fileChanges,
        depChanges,
        // envChanges...
    });
    const diagnosis = graph.diagnose();
    // 3. Explain
    console.log('\n---------------------------------------------------');
    console.log(diagnosis.summary);
    if (diagnosis.causes.length > 0) {
        console.log('\nTop Probable Causes:');
        diagnosis.causes.forEach((c, i) => {
            console.log(`${i + 1}. [${Math.round(c.confidence * 100)}%] ${c.description}`);
        });
    }
    else {
        console.log('\n(No high-confidence causes found. Showing all changes...)');
        console.log('Files changed:', fileChanges.length);
        console.log('Deps changed:', depChanges.length);
    }
});
commander_1.program.parse();
