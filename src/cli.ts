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
            spinner.succeed(chalk.green('Success state recorded.'));
        } catch (e) {
            spinner.fail(chalk.red('Failed to record state.'));
            process.exit(1);
        }
    } else if (command === 'check') {
        const spinner = ora('Analyzing causality...').start();

        const issues = analyzeFailure();
        spinner.stop();

        if (issues.length === 0) {
            console.log(chalk.green('✔ No environment or dependency drift detected.'));
            console.log(chalk.gray('  This is likely a logic error in your code. Check your recent git diffs.'));
        } else {
            issues.forEach(issue => {
                const color = issue.type === 'CRITICAL' ? chalk.red : chalk.yellow;
                const confidenceBadge = issue.confidence === 'HIGH' ? chalk.bgRed.white.bold(' HIGH ') :
                    issue.confidence === 'MEDIUM' ? chalk.bgYellow.black(' MED ') :
                        chalk.bgGray.white(' LOW ');

                console.log(`\n${confidenceBadge} ` + color.bold(`[${issue.category}]`));
                console.log(chalk.white(`       ${issue.message}`));
                console.log(chalk.gray(`       └─ Fix: ${issue.remedy}`));
            });
            process.exit(1);
        }
    } else if (command === 'init') {
        process.stdout.write(`
\x1b[36m   _      __\x1b[35m  __           \x1b[33m    ____            __      
\x1b[36m  | | /| / /\x1b[35m / /_  __ __  \x1b[33m   / __ )_________  / /_____ 
\x1b[36m  | |/ |/ / \x1b[35m/ __ \\/ / / /  \x1b[33m  / __  / ___/ __ \\/ //_/ _ \\
\x1b[36m  |__/|__/ \x1b[35m/_/ /_/\\__, /   \x1b[33m /_____/_/   \\____/_/  \\___/
\x1b[35m                 /____/                                 
\x1b[32m  🦅 Stop guessing. Start reasoning.\x1b[0m\n\n`);

        const spinner = ora('Initializing automatic drift detection...').start();
        const fs = require('fs');
        const path = require('path');
        const pkgPath = path.resolve(process.cwd(), 'package.json');

        if (!fs.existsSync(pkgPath)) {
            spinner.fail(chalk.red('No package.json found. Run this in your project root.'));
            process.exit(1);
        }

        try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            process.stdout.write('\n'); // break line after spinner

            // 1. Add postinstall hook
            if (!pkg.scripts) pkg.scripts = {};
            if (pkg.scripts.postinstall && pkg.scripts.postinstall.includes('why-broke record')) {
                spinner.info(chalk.blue('  Autopilot is already configured (postinstall hook exists).'));
            } else {
                const oldPostinstall = pkg.scripts.postinstall;
                const newCmd = 'why-broke record';
                pkg.scripts.postinstall = oldPostinstall ? `${oldPostinstall} && ${newCmd}` : newCmd;
                fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
                spinner.succeed(chalk.green('  Added "postinstall" hook. Baseline will update on every npm install.'));
            }

            console.log(chalk.gray('\n  ✨ You are set! We will now track your dependencies automatically.'));

        } catch (e) {
            spinner.fail(chalk.red('Failed to update package.json.'));
            process.exit(1);
        }

    } else if (command) {
        const userCmd = args.join(' ');
        console.log(chalk.dim(`> ${userCmd}`));

        // Use spawn to inherit colors/stdio exactly
        const { spawn } = require('child_process');
        const child = spawn(userCmd, { shell: true, stdio: 'inherit' });

        child.on('exit', async (code: number) => {
            console.log(''); // spacer
            if (code === 0) {
                // Success -> Record
                const spinner = ora('Command succeeded. Updating causal baseline...').start();
                saveSnapshot();
                await new Promise(r => setTimeout(r, 500));
                spinner.succeed(chalk.green('Baseline updated.'));
                process.exit(0);
            } else {
                // Failure -> Check
                console.log(chalk.bold.red('✖ Command failed. Diagnosing cause...'));
                const issues = analyzeFailure();
                if (issues.length === 0) {
                    console.log(chalk.gray('  No obvious environment drift found. Check output above.'));
                } else {
                    issues.forEach(issue => {
                        const color = issue.type === 'CRITICAL' ? chalk.red : chalk.yellow;
                        console.log(color.bold(`\n[${issue.category}] ${issue.message}`));
                        console.log(chalk.gray(`  └─ Fix: ${issue.remedy}`));
                    });
                }
                process.exit(code || 1);
            }
        });

    } else {
        console.log(chalk.bold('why-broke') + ' - Causal Debugger');
        console.log('Usage:');
        console.log(chalk.blue('  why-broke init') + '      Setup automatic recording (Recommended)');
        console.log(chalk.blue('  why-broke <command>') + '   Run command and auto-record/check');
        console.log(chalk.blue('  why-broke record') + '    Manually save current working state');
        console.log(chalk.blue('  why-broke check ') + '    Manually compare failing state');
    }
};

run();
