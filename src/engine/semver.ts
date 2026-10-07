export interface ParsedVersion {
    major: number;
    minor: number;
    patch: number;
    prerelease?: string;
}

/** Minimal semver parser. Returns undefined for anything that is not "x.y.z[-pre]". */
export const parseVersion = (version: string): ParsedVersion | undefined => {
    const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(version.trim());
    if (!match) return undefined;
    return {
        major: parseInt(match[1], 10),
        minor: parseInt(match[2], 10),
        patch: parseInt(match[3], 10),
        prerelease: match[4]
    };
};

export type BumpKind = 'major' | 'minor' | 'patch' | 'prerelease' | 'unknown';

/** Classifies the difference between two versions. 0.x minor bumps count as major. */
export const classifyBump = (from: string, to: string): BumpKind => {
    const a = parseVersion(from);
    const b = parseVersion(to);
    if (!a || !b) return 'unknown';
    if (a.major !== b.major) return 'major';
    if (a.minor !== b.minor) return a.major === 0 ? 'major' : 'minor';
    if (a.patch !== b.patch) return a.major === 0 && a.minor === 0 ? 'major' : 'patch';
    if (a.prerelease !== b.prerelease) return 'prerelease';
    return 'unknown';
};
