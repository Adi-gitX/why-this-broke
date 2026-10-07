/**
 * Migrations that are known to break builds that worked on the previous major.
 * Each rule matches on the major version before and after the change.
 * Keep entries factual and specific; a vague entry is worse than none.
 */
export interface BreakingChangeRule {
    /** Returns true when a move from `from` major to `to` major triggers this rule. */
    applies: (from: number, to: number) => boolean;
    reason: string;
    fix: string;
}

const crosses = (boundary: number) => (from: number, to: number) => from < boundary && to >= boundary;

export const KNOWN_BREAKING_CHANGES: Record<string, BreakingChangeRule[]> = {
    'node-fetch': [{
        applies: crosses(3),
        reason: 'node-fetch 3 is published as ES modules only. require("node-fetch") throws ERR_REQUIRE_ESM.',
        fix: 'Use await import("node-fetch"), switch to the global fetch on Node 18+, or pin node-fetch@2.'
    }],
    chalk: [{
        applies: crosses(5),
        reason: 'chalk 5 is ES modules only. require("chalk") throws ERR_REQUIRE_ESM in CommonJS projects.',
        fix: 'Pin chalk@4 for CommonJS, or convert the importing file to ESM.'
    }],
    ora: [{
        applies: crosses(6),
        reason: 'ora 6 is ES modules only and cannot be loaded with require().',
        fix: 'Pin ora@5 for CommonJS, or use await import("ora").'
    }],
    nanoid: [{
        applies: crosses(4),
        reason: 'nanoid 4 is ES modules only and cannot be loaded with require().',
        fix: 'Pin nanoid@3 for CommonJS, or use await import("nanoid").'
    }],
    got: [{
        applies: crosses(12),
        reason: 'got 12 is ES modules only and cannot be loaded with require().',
        fix: 'Pin got@11 for CommonJS, or use await import("got").'
    }],
    execa: [{
        applies: crosses(6),
        reason: 'execa 6 is ES modules only and cannot be loaded with require().',
        fix: 'Pin execa@5 for CommonJS, or use await import("execa").'
    }],
    inquirer: [{
        applies: crosses(9),
        reason: 'inquirer 9 is ES modules only and cannot be loaded with require().',
        fix: 'Pin inquirer@8 for CommonJS, or migrate to the @inquirer/prompts packages.'
    }],
    uuid: [{
        applies: crosses(7),
        reason: 'uuid 7+ removed the default export and deep imports such as require("uuid/v4").',
        fix: 'Import named generators: const { v4: uuidv4 } = require("uuid").'
    }],
    axios: [{
        applies: crosses(1),
        reason: 'axios 1.0 changed the headers object to AxiosHeaders and ships an ESM build that Jest resolves by default, which fails with "Cannot use import statement outside a module".',
        fix: 'Pin axios@0.27, or in Jest map axios to its CommonJS build: moduleNameMapper { "^axios$": "axios/dist/node/axios.cjs" }.'
    }],
    eslint: [{
        applies: crosses(9),
        reason: 'ESLint 9 uses flat config (eslint.config.js) by default and ignores .eslintrc files.',
        fix: 'Migrate with npx @eslint/migrate-config .eslintrc.json, or set ESLINT_USE_FLAT_CONFIG=false while you migrate.'
    }],
    prettier: [{
        applies: crosses(3),
        reason: 'Prettier 3 changed the default trailingComma to "all" and loads plugins asynchronously, so format checks and older plugins fail.',
        fix: 'Set "trailingComma": "es5" to keep the old output, and update Prettier plugins to versions that support 3.x.'
    }],
    tailwindcss: [{
        applies: crosses(4),
        reason: 'Tailwind 4 replaced tailwind.config.js with CSS-based configuration, moved the PostCSS plugin to @tailwindcss/postcss, and dropped the @tailwind directives.',
        fix: 'Run npx @tailwindcss/upgrade, or pin tailwindcss@3.'
    }],
    webpack: [{
        applies: crosses(5),
        reason: 'webpack 5 no longer polyfills Node core modules (buffer, crypto, stream, path) for the browser.',
        fix: 'Add resolve.fallback entries for the modules you need, or pin webpack@4.'
    }],
    jest: [{
        applies: crosses(28),
        reason: 'Jest 28 stopped bundling jest-environment-jsdom, so testEnvironment: "jsdom" fails until it is installed.',
        fix: 'Run npm install -D jest-environment-jsdom.'
    }],
    'react-router-dom': [{
        applies: crosses(6),
        reason: 'react-router-dom 6 removed Switch, Redirect, useHistory and the component prop on Route.',
        fix: 'Replace Switch with Routes, component= with element=, and useHistory with useNavigate, or pin react-router-dom@5.'
    }],
    next: [{
        applies: crosses(15),
        reason: 'Next.js 15 made cookies(), headers(), draftMode() and route params asynchronous, so synchronous access fails type checking.',
        fix: 'Run npx @next/codemod@canary upgrade latest, or await those APIs manually.'
    }],
    express: [{
        applies: crosses(5),
        reason: 'Express 5 changed route path matching (path-to-regexp 8): bare "*" wildcards and optional "?" segments are no longer valid.',
        fix: 'Rename wildcards to "/*splat" and optional params to "{/:param}", or pin express@4.'
    }]
};
