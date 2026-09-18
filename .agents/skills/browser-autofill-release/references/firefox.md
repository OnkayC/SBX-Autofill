# Firefox installation and verification

Use the available computer-use tool for Firefox UI. Read its current API documentation, then inspect fresh state after each action. Filter accessibility output before emitting it on sensitive pages; prefer add-on management pages for installation checks. An attempted click is not evidence that a dialog opened or an installation succeeded.

## Temporary debug build

Build into a separate directory so the signed production build stays identifiable:

```sh
NODE_ENV=development TARGET_BROWSER=firefox mise exec -- npx webpack --output-path "$PWD/dist/firefox-debug"
```

Open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select the absolute path to `dist/firefox-debug/manifest.json`. Verify the temporary entry, version, and source path. For a rebuilt existing temporary extension, use its **Reload** control and verify the result.

Existing page content scripts may remain stale until the page refreshes. Refresh only when appropriate to the user's page state; never confirm form resubmission blindly. Temporary extensions are development installs, not permanent signed releases.

## Signed XPI installation

1. Identify the intended downloaded XPI and inspect its manifest version and add-on ID before opening it.
2. In `about:debugging#/runtime/this-firefox`, remove a temporary override for this same extension if present. Verify that override is gone. A temporary build can mask the signed version and make an apparent installation misleading.
3. In `about:addons`, open **Tools for all add-ons → Install Add-on From File…** and choose the exact absolute XPI path.
4. Complete Firefox's installation prompt within the user's installation authorization. Preserve unrelated choices such as private-window access. If permissions materially differ from the intended build, investigate the artifact before proceeding.
5. Verify the add-on details show the expected version and enabled state. Preserve its stored settings and rules; do not uninstall the permanent extension or delete profile data as a routine update step.

No restart is normally needed. If a restart proves necessary, notify the user immediately beforehand and preserve tabs. Do not change Firefox signature enforcement or restricted-domain protections to make installation or testing succeed.

For native file pickers, first verify the picker is open. Use **Cmd+Shift+G** with the absolute path, then inspect the selected file and enabled **Open** button. If focus is wrong, focus or raise the observed picker and retry the selection; typing a path into an unopened picker can send it into browser Find instead.

## Autofill smoke testing

Test the action the user reported: a popup AutoFill test must activate the popup button, not merely call the underlying engine. Verify button focus before keyboard activation; avoid Enter on an uncertain login-page focus because it can submit the form.

Use synthetic values when possible and clear them afterward. With real credentials, inspect only field occupancy or boolean match results. Never expose actual usernames, passwords, security answers, or token-bearing URLs in logs or screenshots. Never submit login forms or security challenges.

Check the standalone settings page opens from the popup when that flow changed. Preserve imported custom rules; importing a rules file replaces the stored list, so it is not a harmless smoke-test reset.

When a page receives no content script, distinguish stale scripts, wrong extension version, and Firefox restricted domains before diagnosing an autofill matcher. Firefox protections can block content scripts independently of extension rules; do not weaken those protections to test. Report which UI actions and field outcomes were actually verified, including any missing live-page evidence.
