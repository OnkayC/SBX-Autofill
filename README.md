# SBX Autofill

SBX Autofill connects Chrome or Firefox to **Strongbox for macOS** to find and
fill website credentials. This repository is Onkay's independently maintained
fork of [Strongbox Browser AutoFill](https://github.com/strongbox-password-safe/browser-autofill).

**Not affiliated with or endorsed by Phoebe Code Limited or Strongbox.**

## Features

- Find matching logins, fill usernames and passwords, and copy individual fields or one-time codes.
- View Strongbox databases and their lock and autofill status from the popup.
- Configure site-specific field selectors and security-question mappings.
- Manage saved rules separately from new-rule setup, with JSON backup and import.
- Use a full-page settings screen and a popup that support system light/dark appearance.

## Requirements and installation

SBX Autofill requires macOS, the Strongbox app, and Strongbox's browser autofill
integration enabled. Strongbox's licensing and database autofill settings still
apply; this fork does not replace the app or unlock paid features.

Installing the extension is only one part of setup: **register the native connector
for the browser you use**, following the sections below. The connector points to
Strongbox's existing helper and lets the extension communicate with the app locally.

| Browser | Extension installation | Native connector setup |
| --- | --- | --- |
| Chrome / Chrome Dev | Load a local build, or use the Private store listing when approved and your Google account is an authorized tester. | [Chrome setup](#onkay-chrome-fork-macos) |
| Firefox | Install a Mozilla-signed fork `.xpi`, or load a local build temporarily for development. | [Firefox setup](#onkay-firefox-fork-native-messaging) |

The Firefox and Chrome builds have separate extension identities and settings.
Disable the official extension before using the fork to avoid duplicate autofill.
Export rules and record preferences before switching; they do not migrate automatically.

## Onkay Firefox fork: native messaging

The private Firefox fork uses extension ID `{1af7308a-5616-4c0d-a14f-14c69f4e0bcd}` and its own native messaging host name, `com.onkay.strongbox`. Keeping a separate host name avoids modifying the manifest managed by Strongbox and survives Strongbox rewriting its official `com.markmcguill.strongbox` manifest.

Create the fork-specific Firefox native messaging manifest at:

```text
~/Library/Application Support/Mozilla/NativeMessagingHosts/com.onkay.strongbox.json
```

with this content:

```json
{
  "allowed_extensions": [
    "{1af7308a-5616-4c0d-a14f-14c69f4e0bcd}"
  ],
  "description": "SBX Autofill native connector",
  "name": "com.onkay.strongbox",
  "path": "/Applications/Strongbox.app/Contents/MacOS/afproxy",
  "type": "stdio"
}
```

The manifest deliberately points to Strongbox's existing `afproxy` executable; no Strongbox application files or signatures are modified. If Strongbox moves that executable in a future release, update only the `path` above.

Do not edit or make Strongbox's official `com.markmcguill.strongbox.json` manifest immutable. If the earlier `uchg` workaround was applied, remove it once:

```sh
chflags nouchg "$HOME/Library/Application Support/Mozilla/NativeMessagingHosts/com.markmcguill.strongbox.json"
```

Strongbox may then manage its official manifest normally, while the fork continues using `com.onkay.strongbox.json`. Restart Firefox after creating or changing either native messaging manifest.

## Onkay Chrome fork (macOS)

After installing dependencies as described in [Development](#development), build the Chrome Manifest V3 extension from the repository root:

```sh
mise exec -- npm run build:chrome
```

For Google Chrome Dev, use `~/Library/Application Support/Google/Chrome Dev/NativeMessagingHosts/com.onkay.strongbox.json` instead of the regular Chrome path below. Register each browser channel you use separately.

The Chrome build uses the same `com.onkay.strongbox` native host as the Firefox
fork, but Chrome needs its own registration. Create this file:

```text
~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.onkay.strongbox.json
```

```json
{
  "allowed_origins": [
    "chrome-extension://mmkljcggfeafndhodagadahcijhhmamj/"
  ],
  "description": "SBX Autofill native connector",
  "name": "com.onkay.strongbox",
  "path": "/Applications/Strongbox.app/Contents/MacOS/afproxy",
  "type": "stdio"
}
```

Verify the executable exists at `path`; if Strongbox is installed elsewhere,
use the executable path from its existing Chrome native-host registration.
Leave `com.markmcguill.strongbox.json` unchanged.

Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**,
and select this repository's `dist/chrome` directory. The manifest's existing
public key fixes the extension ID to `mmkljcggfeafndhodagadahcijhhmamj`, the
fork's separate Chrome Web Store item. Disable the stock extension or an older
unpacked fork using the stock ID (`mnilpkfepdibngheginihjpknnopchbn`) before
using this build, to avoid duplicate autofill. Settings do not transfer across
extension IDs: export custom rules and record preferences before switching,
then import/configure them in the fork. Keep the old extension disabled until
you have verified the migration. Firefox settings and rules are also separate.

Verify the displayed version and enabled state, then open the extension's
**Databases** view to check its Strongbox connection. **Settings** opens a
standalone tab. After rebuilding, use **Reload** on the extension card and
refresh pages that need updated content scripts. Keep `dist/chrome` in place:
this is a local unpacked installation, with updates applied by rebuilding and
reloading rather than through the Chrome Web Store.

The store item is distributed as **Private**, restricted to the publisher's
trusted tester accounts. Once Google approves it, eligible accounts can use its
[direct installation link](https://chromewebstore.google.com/detail/mmkljcggfeafndhodagadahcijhhmamj)
for store-managed updates. The native-host setup above is still required on
each Mac. See the [privacy policy](docs/privacy.md) for data handling and Chrome
Sync details.

## Settings and site rules

Open **Settings** from the extension popup to launch the standalone settings tab,
then select **Site rules**. **Configured rules** lists saved rules with controls to
edit, enable, or delete them. **Set up new rule** provides fields for site origins,
path prefixes, and field selectors, with a live JSON preview. Advanced fields
include security-question mappings. Adding a rule preserves existing rules;
editing a rule preserves its priority in the list.
Under **Configured rules → Edit / import all rules**, **Load file** opens a JSON
document for editing. **Replace all rules** asks for confirmation before replacing
the list; **Download backup** exports the saved configuration.
Settings use the full browser page and follow the system's light/dark appearance.
Popup and inline-menu appearance can be set separately. Preferences save
automatically; rules save with **Add rule** or **Save changes**.
Rules are stored locally in the browser, and none are enabled by default.

Each rule specifies exact `origins`, optional case-sensitive `pathPrefixes`, and
CSS `selectors` for roles such as `username` and `currentPassword`. The first
enabled rule matching the origin and path takes priority. Combine login and
security-question mappings in the same rule when they share an origin and path.

Optional `securityAnswers` entries pair an `answerSelector` with a
`questionSelector`. The displayed question text must uniquely match a custom-field
name in the selected Strongbox entry. Each selector must identify a single
element; overlapping mappings are skipped. Answers must be visible, editable text
or password inputs, with visible question prompts. Put answers in protected
Strongbox custom fields, never in rule JSON. Autofill fills security answers only
on an explicit action, never falls back to the login password, and never submits.

The optional [Atlas rule document](docs/autofill-rules/atlas.json) configures the
previously supported Atlas login and security challenge. Load and import it to
enable that behavior. It includes both observed URL path variants and prompt
variants; all site-specific domains, paths and selectors live in this editable
document rather than extension source code.

For Atlas, name saved custom fields after the **full question text**, in the
language displayed on the page. Input IDs such as `kba3_response` and numbered
display labels do not identify an answer because questions can change while IDs
remain fixed. Matching ignores letter case, repeated whitespace, and trailing
question marks or asterisks. Missing or ambiguous matches are skipped.

## Permissions and privacy

The current Chrome build requests access to HTTP and HTTPS websites so it can
detect forms and show the inline menu without requiring a toolbar click first.
Content scripts also run in matching frames. Narrowing browser site access limits
where those features work; configurable site rules are field-matching instructions,
not browser permission grants.

Native messaging connects to Strongbox on the same Mac. The publisher does not
operate a server that receives your credentials or browsing history, and the
extension has no analytics or advertising service. General preferences use browser
sync storage; site rules use local extension storage. See the
[privacy policy](docs/privacy.md) for the data processed and Chrome Sync details.

## Troubleshooting

If the popup reports that Strongbox is unavailable:

1. Open Strongbox and enable its Chrome / Firefox autofill integration.
2. Check that browser autofill is available under your Strongbox license and enabled for the database.
3. Check the native-host file location for your browser, its extension ID allowlist, and the `afproxy` executable path.
4. Restart the browser after changing the native-host registration, then check **Databases** in the popup.

A database marked **Autofill disabled** needs its autofill setting enabled in
Strongbox. For an unpacked Chrome build, reload the extension after rebuilding
and refresh the website so it loads the updated content scripts.

## Development

Run commands from the repository root with Node.js and npm available. The examples
use `mise exec --` to select the local toolchain; if you manage Node another way,
run the equivalent `npm` commands directly.

```sh
mise exec -- npm ci
mise exec -- npm test
mise exec -- npm run build:chrome
mise exec -- npm run build:firefox
```

Production output is written to `dist/chrome` and `dist/firefox`. Chrome uses
Manifest V3; Firefox has a separate manifest and build. Do not install a Firefox
`.xpi` in Chrome.

For a watch build, use `npm run dev:chrome` or `npm run dev:firefox`. In Firefox,
open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and
select `dist/firefox/manifest.json`. Temporary add-ons are removed when Firefox
restarts; persistent installation requires a Mozilla-signed package.

Use synthetic credentials when testing autofill. Never include real passwords,
security answers, database files, or signing credentials in tests or commits.

## Support

Report bugs and feature requests in [this fork's issue tracker](https://github.com/OnkayC/SBX-Autofill/issues).
Include the browser/version, extension version, steps to reproduce, and whether
the problem concerns the native connection, popup, or a website's form. Redact
private information from logs and screenshots; issues are public.

This fork's changes are maintained here. Upstream Strongbox support is not
responsible for diagnosing fork-specific behavior.

## License and attribution

The extension is licensed under **AGPL-3.0-or-later**; see [LICENSE.md](LICENSE.md).
Original Strongbox Browser AutoFill code is by Mark McGuill and upstream
contributors. This fork preserves their copyright and license notices.

Translations originate from the separately maintained
[Strongbox Babel project](https://github.com/strongbox-password-safe/babel), which
uses the MIT license. Thanks to the upstream code and localization contributors,
and to the Password Safe, KeePass, and KeePassXC projects on which the wider
password-manager ecosystem builds.

## Automated release packages

The **Build release packages** GitHub Actions workflow runs manually from the
Actions tab, on pushes to `main`, on `v*` tag pushes, and for pull requests affecting the build.
It installs locked dependencies, runs tests, and builds both browsers using Node.js 24.
Tag builds require `v<version>` to match the package, lockfile and both manifests.

Download the workflow artifact to get a Chrome upload ZIP, an **unsigned Firefox
ZIP**, the corresponding committed source archive, and SHA-256 checksums. Each
browser ZIP includes its manifest at the root, license and source archive.
Artifacts are retained for 30 days. The build job does not use signing secrets
or submit to either store. The separate signing job runs only for version tags
or an explicit manual signing request. Firefox needs Mozilla signing before
persistent installation in a standard Firefox profile.

For version-tag pushes, a release job waits for both build and signing to succeed,
then publishes a GitHub Release containing the Chrome ZIP, signed Firefox XPI,
source ZIP, and SHA-256 checksums. It uses the same run’s verified artifacts without
rebuilding. Branch, pull-request, and manual runs do not publish GitHub Releases.
Chrome still requires upload and approval through the Chrome Web Store.

### Firefox signing

Push a `v<version>` tag on a commit from `main` to run the signing job in **Build release packages**
automatically after its build job succeeds. The tag must match the package, lockfile and browser manifests.
You can also run **Build release packages** manually on `main`, enable
`sign_firefox`, and supply the committed version. Use a **new Mozilla
version**: deleting Git tags does not free previously submitted AMO versions.

The job uses the `firefox-release` GitHub environment, restricted to `main` and `v*` tags, with
`AMO_JWT_ISSUER` and `AMO_JWT_SECRET` environment secrets. The signing job uses `needs: build` and downloads the packages from the same
workflow run. It checks their SHA-256 checksums, source archive and Firefox
manifest, then validates Firefox and submits through `web-ext sign --channel
unlisted`, and uploads the signed XPI when Mozilla returns it. It does not create
a public AMO listing or submit Chrome. Signing runs are serialized.

Mozilla approval can outlast the 15-minute signing wait. If signing times out,
check the existing submission in AMO before running again; a timeout does not
mean the upload failed. An unsigned/source artifact is retained for diagnosis.
The XPI checks validate its archive, version, identity and signature-file presence;
installation in Firefox remains the final signature and behavior check.
