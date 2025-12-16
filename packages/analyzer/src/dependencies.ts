import { ChangeType } from '@causal/types';

export interface DepChange {
    name: string;
    from: string | null;
    to: string | null;
}

export class DependencyDiffer {
    compare(lockA: any, lockB: any): DepChange[] {
        const depsA = this.flatten(lockA);
        const depsB = this.flatten(lockB);
        const changes: DepChange[] = [];

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

    private flatten(lock: any): Map<string, string> {
        const map = new Map<string, string>();
        if (!lock) return map;
        // Simplified v1/v2/v3 support
        const packages = lock.packages || {};
        const dependencies = lock.dependencies || {};

        if (lock.packages) {
            for (const [key, val] of Object.entries(packages)) {
                if (key === '') continue;
                const name = key.replace(/^node_modules\//, '');
                if ((val as any).version) map.set(name, (val as any).version);
            }
        } else {
            for (const [key, val] of Object.entries(dependencies)) {
                if ((val as any).version) map.set(key, (val as any).version);
            }
        }
        return map;
    }
}
