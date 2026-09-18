# Validate, publish, and sign

## Establish the release state

Inspect Git status, current branch, recent commits/tags, and remotes. This fork uses `onkay`; `origin` is the upstream Strongbox repository. Verify the destination before pushing. Fetch the fork and compare ancestry before preparing the release.

If local history was soft-reset, preserve staged and working-tree changes while reconciling with published history. Choose the recovery from the actual graph; do not blindly reset, force-push, or replace published tags. Stage only intended files after reviewing the diff.

Choose an unused release version. Keep these JSON properties equal:

- `package.json`: root `version`.
- `package-lock.json`: root `version` and `packages[""].version`.
- `src/manifest.firefox.json` and `src/manifest.chrome.json`: root `version`.

Edit those properties specifically. A global version-string replacement can corrupt unrelated dependency versions. Parse the files afterward and check equality. Mozilla may reject reusing an already submitted version for different contents.

## Validate the release tree

Use the repository's mise environment:

```sh
mise exec -- npm test
mise exec -- npx eslint <changed-typescript-and-tsx-files>
mise exec -- npm run build:firefox
mise exec -- web-ext lint --source-dir dist/firefox --output json
git diff --check
git diff --cached --check
```

Replace the ESLint placeholder with actual changed files, or omit that command when none apply. Inspect the extension lint JSON summary for errors and report actual warning counts. Compare any legacy lint failures against the base rather than silently accepting new failures or requiring unrelated cleanup. For behavior changes, run focused regression checks and the relevant Firefox smoke test from [firefox.md](firefox.md).

Verify the production manifest version and that the artifact was built from the intended release tree. Keep generated output and credentials out of the staged diff.

## Signed Git publication

Create and verify a signed commit and matching signed `v<version>` tag using the configured Git signer. Do not weaken signing configuration if the signer is unavailable.

```sh
git commit -S -m '<change-summary>'
git verify-commit HEAD
git tag -s 'v<version>' -m 'Release v<version>'
git verify-tag 'v<version>'
mkdir -p web-ext-artifacts
git archive --format=zip --output='web-ext-artifacts/strongbox-autofill-<version>-source.zip' HEAD
git push --atomic onkay <branch> 'v<version>'
```

Substitute verified values, then verify the remote branch and peeled tag resolve to the intended commit with `git ls-remote`. The source archive comes from the committed tree, not a recursive zip of the checkout. Reuse an already verified release commit/tag when continuing a partially completed release.

## Mozilla unlisted signing

The local fnox environment provides `JWT_issuer` and `JWT_secret`. Keep their values out of output and command arguments. Pass them to web-ext through `WEB_EXT_API_KEY` and `WEB_EXT_API_SECRET` in the subprocess environment. Do not print fnox configuration or enable verbose credential logging.

Run this from the repo root only for an authorized signing submission, after the production build and source archive match the release:

```sh
fnox exec -- python3 - <<'PY'
import json
import os
from pathlib import Path
import subprocess
import sys

version = json.loads(Path('package.json').read_text())['version']
source = Path('web-ext-artifacts') / f'strongbox-autofill-{version}-source.zip'
manifest = json.loads(Path('dist/firefox/manifest.json').read_text())
if manifest['version'] != version or not source.is_file():
    sys.exit('Release build or source archive does not match the release setup')
names = ('JWT_issuer', 'JWT_secret')
if any(not os.environ.get(name) for name in names):
    sys.exit('Required signing credentials are unavailable in fnox')
secrets = [os.environ[name] for name in names]
env = os.environ.copy()
env['WEB_EXT_API_KEY'], env['WEB_EXT_API_SECRET'] = secrets
process = subprocess.Popen([
    'mise', 'exec', '--', 'web-ext', 'sign',
    '--source-dir', 'dist/firefox',
    '--artifacts-dir', 'web-ext-artifacts',
    '--channel', 'unlisted',
    '--upload-source-code', str(source),
    '--approval-timeout', '900000', '--no-input',
], env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
for line in process.stdout:
    for secret in secrets:
        line = line.replace(secret, '[REDACTED]')
    print(line, end='', flush=True)
sys.exit(process.wait())
PY
```

Keep the execution session ID and poll that session with bounded waits. Approval may take minutes. On a later “check,” resume the existing process first and inspect its output and artifact directory. If it timed out or status is uncertain, establish the existing submission's state before retrying; do not create duplicate submissions. Missing credentials or a signing rejection should be reported with the concrete blocker, without repeated identical retries.

Completion requires successful signing output and the downloaded XPI. Capture the actual filename from web-ext rather than assuming its naming scheme. Inspect the archive's manifest version, add-on ID, and Mozilla signature entries. Signature-file presence is only a structural check; Firefox accepting the signed package provides installation evidence. Report pending approval truthfully until download succeeds.
