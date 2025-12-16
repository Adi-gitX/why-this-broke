"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DependencyDiffer = void 0;
class DependencyDiffer {
    compare(lockA, lockB) {
        const depsA = this.flatten(lockA);
        const depsB = this.flatten(lockB);
        const changes = [];
        const all = new Set([...depsA.keys(), ...depsB.keys()]);
        for (const dep of all) {
            const valA = depsA.get(dep);
            const valB = depsB.get(dep);
            if (valA !== valB) {
                changes.push({ name: dep, from: valA || null, to: valB || null });
            }
        }
        return changes;
    }
    flatten(lock) {
        const map = new Map();
        if (!lock)
            return map;
        // Simplified v1/v2/v3 support
        const packages = lock.packages || {};
        const dependencies = lock.dependencies || {};
        if (lock.packages) {
            for (const [key, val] of Object.entries(packages)) {
                if (key === '')
                    continue;
                const name = key.replace(/^node_modules\//, '');
                if (val.version)
                    map.set(name, val.version);
            }
        }
        else {
            for (const [key, val] of Object.entries(dependencies)) {
                if (val.version)
                    map.set(key, val.version);
            }
        }
        return map;
    }
}
exports.DependencyDiffer = DependencyDiffer;
