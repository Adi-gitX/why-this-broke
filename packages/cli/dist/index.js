#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const snapshot_1 = require("./snapshot");
const analyze_1 = require("./analyze");
const chalk_1 = __importDefault(require("chalk"));
const args = process.argv.slice(2);
const command = args[0];
if (command === 'record') {
    (0, snapshot_1.saveSnapshot)();
    console.log(chalk_1.default.green('✔ Success state recorded.'));
}
else if (command === 'check') {
    console.log(chalk_1.default.blue('Running causal analysis...'));
    const issues = (0, analyze_1.analyzeFailure)();
    if (issues.length === 0) {
        console.log(chalk_1.default.green('No environment or dependency drift detected. This is likely a logic error in your code.'));
    }
    else {
        issues.forEach(issue => {
            const color = issue.type === 'CRITICAL' ? chalk_1.default.red : chalk_1.default.yellow;
            console.log(color.bold(`[${issue.category}] ${issue.message}`));
            console.log(chalk_1.default.gray(`  └─ Fix: ${issue.remedy}`));
        });
    }
}
else {
    console.log('Usage: why-broke [record|check]');
}
