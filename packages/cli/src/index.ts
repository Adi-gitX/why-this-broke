#!/usr/bin/env node

import { program } from 'commander';
import { SnapshotRecorder } from '@causal/recorder';
import { Analyzer } from '@causal/analyzer';
import { CausalGraph } from '@causal/reasoner';
import { execSync } from 'child_process';

program
    .name('causal')
    .description('Causal Debugger - Project Lazarus')
    .version('1.0.0');

program
    .command('record')
    .description('Record a successful state')
    .action(() => {
        console.log('Recording state...');
        const recorder = new SnapshotRecorder();
        const snapshot = recorder.capture();
        console.log(`Snapshot captured: ${snapshot.id}`);
        // In real impl, save to DB
    });

program
    .command('debug [refA] [refB]')
    .description('Diagnose a failure between two points (default: HEAD~1 vs HEAD)')
    .action(async (refA = 'HEAD~1', refB = 'HEAD') => {
        console.log(`🔍 Analyzing changes between ${refA} and ${refB}...`);

        // 1. Analyze
        const analyzer = new Analyzer(process.cwd());

        let lockAContent = '{}';
        let lockBContent = '{}';

        try {
            lockAContent = execSync(`git show ${refA}:package-lock.json`, { encoding: 'utf-8' });
        } catch (e) { }

        try {
            lockBContent = execSync(`git show ${refB}:package-lock.json`, { encoding: 'utf-8' });
        } catch (e) { }

        const fileChanges = await analyzer.analyzeFiles(refA, refB);
        const depChanges = await analyzer.analyzeDeps(JSON.parse(lockAContent), JSON.parse(lockBContent));

        // 2. Reason
        const graph = new CausalGraph();
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
        } else {
            console.log('\n(No high-confidence causes found. Showing all changes...)');
            console.log('Files changed:', fileChanges.length);
            console.log('Deps changed:', depChanges.length);
        }
    });

program.parse();
