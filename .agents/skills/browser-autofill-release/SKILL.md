---
name: browser-autofill-release
description: Build and release this Strongbox browser-autofill fork, sign Firefox extensions through Mozilla, check pending signing, and install signed or temporary debug builds in Firefox.
---

# Browser AutoFill release

Run commands from the repository root. Use the current worktree and manifests as authority for versions and extension identity.

## Choose the requested operation

- **Commit, push, sign:** follow [release.md](references/release.md), including validation and Mozilla unlisted signing.
- **Check:** resume an existing signing process and inspect its artifacts using [release.md](references/release.md). A status request is not a new signing submission.
- **Install:** follow [firefox.md](references/firefox.md). After a signed release, install that signed XPI; use a temporary build when the user requests debug or unsigned installation.
- **Build or verify debug:** use the development build and smoke-test procedure in [firefox.md](references/firefox.md).

Perform only the requested stages; retain authorization already given in the conversation. Installing an existing artifact does not require a version bump or another release.

## Shared constraints

- Keep credentials and local artifacts ignored: `fnox.toml`, environment files, `node_modules/`, `dist/`, `web-ext-artifacts/`, and `.codegraph/`. Inspect ignore behavior without reading secret files.
- CodeRabbit is retired and is not a release gate.
- During autofill verification, never submit a form, answer a challenge, or log in. Report field occupancy or matching results without printing passwords, answers, session URLs, or raw credential payloads.
- Preserve the user's extension settings and stored rules. Determine the add-on ID from the built manifest; do not replace it with an email address or invent a new identity.

Finish with evidence appropriate to the request: validation results, verified pushed refs, pending versus completed Mozilla signing, actual artifact path, or Firefox's installed version and enabled state. Git signatures and Mozilla XPI signatures are separate outcomes.
