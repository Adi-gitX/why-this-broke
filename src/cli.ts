#!/usr/bin/env node
import { saveSnapshot } from './snapshot';
import { analyzeFailure } from './analyze';
import chalk from 'chalk';
import ora from 'ora';

const args = process.argv.slice(2);
const command = args[0];

const run = async () => {
    if (command === 'record') {
        const spinner = ora('Snapshotting system state...').start();
        try {
            saveSnapshot();
            // Artificial delay for UX "magic" feel
            await new Promise(r => setTimeout(r, 600));
            spinner.succeed(chalk.green('Success state recorded.'));
        } catch (e) {
            spinner.fail(chalk.red('Failed to record state.'));
            process.exit(1);
        }
    } else if (command === 'check') {
        const spinner = ora('Analyzing causality...').start();
        // Artificial delay to show we are "thinking"
        await new Promise(r => setTimeout(r, 800));

        const issues = analyzeFailure();
        spinner.stop();

        if (issues.length === 0) {
            console.log(chalk.green('✔ No environment or dependency drift detected.'));
            console.log(chalk.gray('  This is likely a logic error in your code. Check your recent git diffs.'));
        } else {
            issues.forEach(issue => {
                const color = issue.type === 'CRITICAL' ? chalk.red : chalk.yellow;
                console.log(color.bold(`\n[${issue.category}] ${issue.message}`));
                console.log(chalk.gray(`  └─ Fix: ${issue.remedy}`));
            });
            process.exit(1);
        }
    } else {
        console.log(chalk.bold('why-broke') + ' - Causal Debugger');
        console.log('Usage:');
        console.log(chalk.blue('  why-broke record') + '  Save current working state');
        console.log(chalk.blue('  why-broke check ') + '  Compare failing state to saved state');
    }
};

run();
