import chalk from 'chalk';
import { DiffResult, CausalGraph, ChangeType } from '../internal/types';

export const explainIssues = (issues: DiffResult[]): string => {
    let output = '';

    // Filter for causal graphs if available
    const causalIssues = issues.filter(i => i.causalGraph);
    const standardIssues = issues.filter(i => !i.causalGraph);

    if (causalIssues.length > 0) {
        output += chalk.bold.underline('\n🔍 Causal Analysis:\n\n');

        causalIssues.forEach(issue => {
            // For MVP, we take the first root cause node from the graph
            const graph = issue.causalGraph!;
            const rootNode = graph.nodes.find(n => graph.rootCauseIds.includes(n.id));

            if (rootNode) {
                output += formatStory(rootNode, issue);
            } else {
                // Fallback
                output += formatStandard(issue);
            }
        });
    }

    if (standardIssues.length > 0) {
        if (causalIssues.length > 0) output += chalk.bold('\nOther potential issues:\n');
        standardIssues.forEach(issue => {
            output += formatStandard(issue);
        });
    }

    return output;
};

const formatStory = (rootNode: any, issue: DiffResult): string => {
    let text = '';
    const diff = rootNode.diff;

    // Header
    const color = issue.confidence === 'HIGH' ? chalk.red.bold : chalk.yellow.bold;
    const subject = rootNode.id.split(':').slice(1).join(':') || rootNode.id;
    text += `${color('FAILED')} due to ${chalk.bold(subject)}\n`;

    // World A (It worked before)
    text += chalk.green(`\n  ✅ It worked before because:\n`);
    if (diff) {
        text += `     • Version was ${chalk.bold(diff.prev)}\n`;
        if (rootNode.changeType === ChangeType.BOUNDARY) {
            text += `     • The ecosystem rules were different (e.g. CJS/ESM)\n`;
        }
    } else {
        text += `     • System state matched known working configuration.\n`;
    }

    // World B (It broke now)
    text += chalk.red(`\n  ❌ It broke because:\n`);
    if (diff) {
        text += `     • Version is now ${chalk.bold(diff.curr)}\n`;
    }
    text += `     • ${issue.message}\n`;

    // Conclusion
    text += chalk.cyan(`\n  💡 Logic:\n`);
    text += `     JavaScript did exactly what you asked. Your assumptions changed.\n`;

    // Fix
    text += chalk.gray(`\n  🛠  Fix Strategy:\n`);
    text += `     ${issue.remedy}\n\n`;

    return text;
};

const formatStandard = (issue: DiffResult): string => {
    const color = issue.type === 'CRITICAL' ? chalk.red : chalk.yellow;
    return `${color.bold(`[${issue.category}]`)} ${issue.message}\n` +
        chalk.gray(`  └─ Fix: ${issue.remedy}\n`);
};
