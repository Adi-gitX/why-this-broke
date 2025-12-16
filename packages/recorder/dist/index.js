"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnapshotRecorder = void 0;
const child_process_1 = require("child_process");
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class SnapshotRecorder {
    cwd;
    constructor(cwd = process.cwd()) {
        this.cwd = cwd;
    }
    capture() {
        return {
            id: crypto_1.default.randomUUID(),
            timestamp: new Date().toISOString(),
            git: this.captureGit(),
            node: this.captureNode(),
            env: this.captureEnv(),
            dependencies: this.captureDeps()
        };
    }
    captureGit() {
        try {
            const hash = (0, child_process_1.execSync)('git rev-parse HEAD', { cwd: this.cwd, encoding: 'utf-8' }).trim();
            const branch = (0, child_process_1.execSync)('git rev-parse --abbrev-ref HEAD', { cwd: this.cwd, encoding: 'utf-8' }).trim();
            const author = (0, child_process_1.execSync)('git log -1 --pretty=format:\'%an\'', { cwd: this.cwd, encoding: 'utf-8' }).trim();
            const message = (0, child_process_1.execSync)('git log -1 --pretty=format:\'%s\'', { cwd: this.cwd, encoding: 'utf-8' }).trim();
            // Check dirty
            const status = (0, child_process_1.execSync)('git status --porcelain', { cwd: this.cwd, encoding: 'utf-8' });
            return { hash, branch, author, message, dirty: status.length > 0 };
        }
        catch (e) {
            // In case not a git repo or no commits yet
            return { hash: 'unknown', branch: 'unknown', author: 'unknown', message: 'unknown', dirty: false };
        }
    }
    captureNode() {
        return {
            version: process.version,
            platform: process.platform,
            arch: process.arch
        };
    }
    captureEnv() {
        const keys = Object.keys(process.env).sort();
        // Hash keys AND values (redacted approach: we don't store values, just hash of full string)
        // To detect specific modifications, we might want to hash each manually, but for "fingerprint" one hash is okay.
        // Better for debug: Hash of ALL key-value pairs
        const content = keys.map(k => `${k}=${process.env[k]}`).join('\n');
        const keysHash = crypto_1.default.createHash('sha256').update(content).digest('hex');
        return { keysHash };
    }
    captureDeps() {
        try {
            const lockPath = path_1.default.join(this.cwd, 'package-lock.json');
            if (fs_1.default.existsSync(lockPath)) {
                const content = fs_1.default.readFileSync(lockPath);
                return { lockfileHash: crypto_1.default.createHash('sha256').update(content).digest('hex') };
            }
        }
        catch (e) { }
        return { lockfileHash: '' };
    }
}
exports.SnapshotRecorder = SnapshotRecorder;
