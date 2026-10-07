import chalk from 'chalk';
import { DiffResult, SystemState } from '../internal/types';

export interface ReportContext {
    baseline?: SystemState;
    current?: SystemState;
}

/** Human-readable relative time, e.g. "2 hours ago". */
export const formatAge = (timestamp: number, now: number = Date.now()): string => {
    const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
    if (seconds < 60) return 'just now';
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
};

const SECTIONS: Array<{ type: DiffResult['type']; one: string; many: string; color: chalk.Chalk; bullet: string }> = [
    { type: 'CRITICAL', one: 'Likely cause', many: 'Likely causes', color: chalk.red, bullet: '!' },
    { type: 'WARNING', one: 'Possible cause', many: 'Possible causes', color: chalk.yellow, bullet: '?' },
    { type: 'INFO', one: 'Also changed', many: 'Also changed', color: chalk.dim, bullet: '-' }
];

const formatFinding = (finding: DiffResult, color: chalk.Chalk, bullet: string): string => {
    const headline = finding.title || finding.message;
    const lines = [`  ${color.bold(bullet)} ${chalk.bold(headline)}  ${chalk.dim(`[${finding.category}]`)}`];
    if (finding.title && finding.message) lines.push(`    ${finding.message}`);
    lines.push(`    ${chalk.cyan('Fix:')} ${finding.remedy}`);
    return lines.join('\n');
};

/** Renders findings as terminal text. Pass a context to print a baseline header. */
export const explainIssues = (findings: DiffResult[], context: ReportContext = {}): string => {
    const out: string[] = [];

    if (context.baseline) {
        const b = context.baseline;
        const when = formatAge(b.timestamp);
        const after = b.execution?.command ? ` after ${chalk.bold(b.execution.command)}` : '';
        out.push(chalk.dim(`Baseline recorded ${when}${after} (Node ${b.runtime.nodeVersion}, ${b.runtime.platform}-${b.runtime.arch}).`));
        out.push('');
    }

    if (findings.length === 0) {
        out.push(chalk.green('No drift found. Runtime, dependencies, configuration and environment match the baseline.'));
        return out.join('\n');
    }

    const counts = { CRITICAL: 0, WARNING: 0, INFO: 0 };
    for (const f of findings) counts[f.type] += 1;
    for (const section of SECTIONS) {
        const items = findings.filter(f => f.type === section.type);
        if (items.length === 0) continue;
        out.push(section.color.bold(items.length === 1 ? section.one : section.many));
        for (const item of items) out.push(formatFinding(item, section.color, section.bullet));
        out.push('');
    }

    if (counts.CRITICAL + counts.WARNING === 0) {
        out.push(chalk.dim('Nothing above is a strong signal. The cause is probably in the code itself.'));
    }

    return out.join('\n').trimEnd();
};
