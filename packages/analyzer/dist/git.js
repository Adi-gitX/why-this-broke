"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitDiffer = void 0;
const child_process_1 = require("child_process");
class GitDiffer {
    cwd;
    constructor(cwd = process.cwd()) {
        this.cwd = cwd;
    }
    diff(refA, refB = 'HEAD') {
        try {
            const output = (0, child_process_1.execSync)(`git diff --name-only ${refA} ${refB}`, { cwd: this.cwd, encoding: 'utf-8' });
            return output.split('\n').filter(Boolean).map(s => s.trim());
        }
        catch (e) {
            return [];
        }
    }
}
exports.GitDiffer = GitDiffer;
