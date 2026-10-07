#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import { saveSnapshot, readSnapshot, captureState, DEFAULT_SNAPSHOT_PATH } from './snapshot';
import { InferenceEngine } from './engine';
import { explainIssues } from './reporter/explain';
import { DiffResult } from './internal/types';

const VERSION: string = (() => {
    try {
        return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8')).version;
    } catch {
        return 'unknown';
    }
})();

const HELP = `why-broke ${VERSION}
Explains why a build that worked yesterday fails today.

Usage
  why-broke init              Add a postinstall hook so every install refreshes the baseline
  why-broke record            Save the current working state as the baseline
  why-broke check             Compare the current state against the baseline
  why-broke <command...>      Run a command; record on success, diagnose on failure

Options
  -h, --help                  Show this help
  -v, --version               Print the version

Examples
  why-broke npm run build
  why-broke "npm test -- --runInBand"

The baseline lives in ${DEFAULT_SNAPSHOT_PATH}. It holds variable names and file hashes, never values or source.

Exit codes
  check:      0 no drift, 1 drift found, 2 no usable baseline
  <command>:  the command's own exit code
`;

const hasSignal = (findings: DiffResult[]) => findings.some(f => f.type === 'CRITICAL' || f.type === 'WARNING');

const record = (command?: string): void => {
    const spinner = ora('Recording baseline').start();
    try {
        const state = saveSnapshot(DEFAULT_SNAPSHOT_PATH, { command });
        const deps = Object.keys(state.package.resolved).length;
        const configs = Object.keys(state.configurations).length;
        spinner.succeed(`Baseline saved to ${DEFAULT_SNAPSHOT_PATH} (${deps} installed packages, ${configs} config files, ${state.environment.keys.length} env names).`);
    } catch (err) {
        spinner.fail(`Could not write ${DEFAULT_SNAPSHOT_PATH}: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
    }
};

const check = (command?: string): number => {
    const baseline = readSnapshot(DEFAULT_SNAPSHOT_PATH);
    if (!baseline.ok) {
        const why = {
            missing: `No baseline yet (${DEFAULT_SNAPSHOT_PATH} does not exist).`,
            corrupt: `${DEFAULT_SNAPSHOT_PATH} is not valid JSON.`,
            legacy: `${DEFAULT_SNAPSHOT_PATH} was written by an older why-broke.`
        }[baseline.reason];
        console.log(chalk.yellow(why));
        console.log(chalk.dim('Run "why-broke record" the next time the build works, then "why-broke check" when it fails.'));
        return 2;
    }

    const spinner = ora('Comparing against baseline').start();
    const current = captureState({ command });
    const findings = new InferenceEngine().run(baseline.state, current);
    spinner.stop();

    console.log(explainIssues(findings, { baseline: baseline.state, current }));
    return hasSignal(findings) ? 1 : 0;
};

const init = (): void => {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    if (!fs.existsSync(pkgPath)) {
        console.error(chalk.red('No package.json here. Run why-broke init in the project root.'));
        process.exit(1);
    }

    const raw = fs.readFileSync(pkgPath, 'utf-8');
    let pkg: any;
    try {
        pkg = JSON.parse(raw);
    } catch {
        console.error(chalk.red('package.json is not valid JSON.'));
        process.exit(1);
    }

    const declared = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    if (!declared['why-broke']) {
        console.error(chalk.red('why-broke is not a dependency of this project.'));
        console.error('A postinstall hook that calls it would break "npm install" for everyone who clones the repo.');
        console.error(`Install it first: ${chalk.bold('npm install --save-dev why-broke')}, then run init again.`);
        process.exit(1);
    }

    const hook = 'why-broke record';
    pkg.scripts = pkg.scripts || {};
    const existing: string | undefined = pkg.scripts.postinstall;

    if (existing && existing.includes(hook)) {
        console.log(chalk.dim(`postinstall already runs "${hook}". Nothing to do.`));
    } else {
        pkg.scripts.postinstall = existing ? `${existing} && ${hook}` : hook;
        const indent = (/^[ \t]+/m.exec(raw) || ['  '])[0];
        const trailingNewline = raw.endsWith('\n') ? '\n' : '';
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, indent) + trailingNewline);
        console.log(chalk.green(`Added "${hook}" to the postinstall script.`));
    }

    const gitignorePath = path.resolve(process.cwd(), '.gitignore');
    if (fs.existsSync(gitignorePath)) {
        const ignore = fs.readFileSync(gitignorePath, 'utf-8');
        if (!ignore.split(/\r?\n/).some(line => line.trim() === DEFAULT_SNAPSHOT_PATH)) {
            fs.appendFileSync(gitignorePath, `${ignore.endsWith('\n') || ignore.length === 0 ? '' : '\n'}${DEFAULT_SNAPSHOT_PATH}\n`);
            console.log(chalk.green(`Added ${DEFAULT_SNAPSHOT_PATH} to .gitignore.`));
        }
    } else {
        console.log(chalk.yellow(`No .gitignore found. Add ${DEFAULT_SNAPSHOT_PATH} to it; the baseline is per machine and should not be committed.`));
    }

    record();
    console.log(chalk.dim('\nEvery install now refreshes the baseline. When a build fails, run "why-broke check".'));
};

const runWrapped = (commandArgs: string[]): void => {
    const display = commandArgs.join(' ');
    console.log(chalk.dim(`$ ${display}`));

    // A single argument is treated as a shell string (quotes, pipes, &&).
    // Several arguments are passed through untouched so quoting survives.
    const child = commandArgs.length === 1
        ? spawn(commandArgs[0], { shell: true, stdio: 'inherit' })
        : spawn(commandArgs[0], commandArgs.slice(1), { shell: process.platform === 'win32', stdio: 'inherit' });

    child.on('error', err => {
        console.error(chalk.red(`Could not start "${display}": ${err.message}`));
        process.exit(127);
    });

    child.on('exit', (code, signal) => {
        console.log('');
        if (code === 0) {
            record(display);
            process.exit(0);
        }
        const exitCode = code === null ? 1 : code;
        console.log(chalk.red.bold(`Command failed${signal ? ` (${signal})` : ` with exit code ${exitCode}`}. Looking for what changed.`));
        console.log('');
        check(display);
        process.exit(exitCode);
    });
};

const main = (): void => {
    const args = process.argv.slice(2);
    const first = args[0];

    if (!first || first === '-h' || first === '--help' || first === 'help') {
        process.stdout.write(HELP);
        return;
    }
    if (first === '-v' || first === '--version' || first === 'version') {
        console.log(VERSION);
        return;
    }
    if (first === 'record') return record();
    if (first === 'check') process.exit(check());
    if (first === 'init') return init();

    const commandArgs = first === '--' ? args.slice(1) : args;
    if (commandArgs.length === 0) {
        process.stdout.write(HELP);
        process.exit(1);
    }
    runWrapped(commandArgs);
};

main();
