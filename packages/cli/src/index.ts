#!/usr/bin/env node
import { saveSnapshot } from './snapshot';
import { analyzeFailure } from './analyze';
import chalk from 'chalk';

const args = process.argv.slice(2);
const command = args[0];

if (command === 'record') {
    saveSnapshot();
    console.log(chalk.green('✔ Success state recorded.'));
} else if (command === 'check') {
    console.log(chalk.blue('Running causal analysis...'));
    const issues = analyzeFailure();

    if (issues.length === 0) {
        console.log(chalk.green('No environment or dependency drift detected. This is likely a logic error in your code.'));
    } else {
        issues.forEach(issue => {
            const color = issue.type === 'CRITICAL' ? chalk.red : chalk.yellow;
            console.log(color.bold(`[${issue.category}] ${issue.message}`));
            console.log(chalk.gray(`  └─ Fix: ${issue.remedy}`));
        });
    }
} else {
    console.log('Usage: why-broke [record|check]');
}
