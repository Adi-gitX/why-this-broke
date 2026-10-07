# Security

## What why-broke reads and writes

why-broke reads `package.json`, the lockfile, the manifests in `node_modules`, a fixed list of configuration files, `.env`-style files and the process environment. It writes one file, `.why-broke.json`, in the project root.

The snapshot stores variable names, file hashes, version numbers, the git commit, and the command and working directory of the wrapped run. It does not store variable values, file contents or source code, and it never sends anything over the network. There are two runtime dependencies, `chalk` and `ora`, and the package ships no install scripts.

## Reporting a vulnerability

If you find a way for why-broke to leak a secret, write outside the project root, or execute something it should not, please report it privately through [GitHub's private vulnerability reporting](https://github.com/Adi-gitX/why-this-broke/security/advisories/new) rather than a public issue.

You will get an acknowledgement within a few days. Fixes ship as a patch release with a changelog entry crediting the reporter unless they prefer otherwise.

## Supported versions

Only the latest minor release receives fixes.
