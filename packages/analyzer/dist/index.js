"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Analyzer = void 0;
const git_1 = require("./git");
const dependencies_1 = require("./dependencies");
class Analyzer {
    git;
    deps;
    constructor(cwd) {
        this.git = new git_1.GitDiffer(cwd);
        this.deps = new dependencies_1.DependencyDiffer();
    }
    async analyzeFiles(refA, refB) {
        return this.git.diff(refA, refB);
    }
    async analyzeDeps(lockA, lockB) {
        return this.deps.compare(lockA, lockB);
    }
}
exports.Analyzer = Analyzer;
