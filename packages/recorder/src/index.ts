import { SystemSnapshot } from '@causal/types';
import { execSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export class SnapshotRecorder {
    private cwd: string;

    constructor(cwd: string = process.cwd()) {
        this.cwd = cwd;
    }

    capture(): SystemSnapshot {
        return {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            git: this.captureGit(),
            node: this.captureNode(),
            env: this.captureEnv(),
            dependencies: this.captureDeps()
        };
    }

    private captureGit() {
        try {
            const hash = execSync('git rev-parse HEAD', { cwd: this.cwd, encoding: 'utf-8' }).trim();
            const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: this.cwd, encoding: 'utf-8' }).trim();
            const author = execSync('git log -1 --pretty=format:\'%an\'', { cwd: this.cwd, encoding: 'utf-8' }).trim();
            const message = execSync('git log -1 --pretty=format:\'%s\'', { cwd: this.cwd, encoding: 'utf-8' }).trim();
            // Check dirty
            const status = execSync('git status --porcelain', { cwd: this.cwd, encoding: 'utf-8' });
            return { hash, branch, author, message, dirty: status.length > 0 };
        } catch (e) {
            // In case not a git repo or no commits yet
            return { hash: 'unknown', branch: 'unknown', author: 'unknown', message: 'unknown', dirty: false };
        }
    }

    private captureNode() {
        return {
            version: process.version,
            platform: process.platform,
            arch: process.arch
        };
    }

    private captureEnv() {
        const keys = Object.keys(process.env).sort();
        // Hash keys AND values (redacted approach: we don't store values, just hash of full string)
        // To detect specific modifications, we might want to hash each manually, but for "fingerprint" one hash is okay.
        // Better for debug: Hash of ALL key-value pairs
        const content = keys.map(k => `${k}=${process.env[k]}`).join('\n');
        const keysHash = crypto.createHash('sha256').update(content).digest('hex');
        return { keysHash };
    }

    private captureDeps() {
        try {
            const lockPath = path.join(this.cwd, 'package-lock.json');
            if (fs.existsSync(lockPath)) {
                const content = fs.readFileSync(lockPath);
                return { lockfileHash: crypto.createHash('sha256').update(content).digest('hex') };
            }
        } catch (e) { }
        return { lockfileHash: '' };
    }
}
