# SBX Autofill

SBX Autofill is an independent fork of the open-source Strongbox Browser AutoFill
extension, maintained by Onkay. It works with Strongbox for macOS and is not
affiliated with or endorsed by Phoebe Code Limited or Strongbox.

The original Strongbox extension's official distributions are:

- Chrome/Chromium: https://chrome.google.com/webstore/detail/strongbox-autofill/mnilpkfepdibngheginihjpknnopchbn
- Firefox: https://addons.mozilla.org/firefox/addon/strongbox-autofill/

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
  "description": "Strongbox Browser AutoFill Extension - Onkay Fork",
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

Build the Chrome Manifest V3 extension from the repository root:

```sh
mise exec -- npm run build:chrome
```

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
  "description": "Strongbox Browser AutoFill Extension - Onkay Fork",
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

## Configurable site rules (Onkay fork)

Open **Settings** from the extension popup to launch the standalone settings tab,
then select **Rules** to edit, import/export, enable,
or delete site rules. **Load file** opens a JSON document for editing; **Import**
validates and saves it. Import replaces the whole rule list, so export and merge
existing rules first if you want to retain them. Changes apply to open pages.
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

# Localization - Help Wanted
If you would like to see Strongbox translated into your language just get in touch (support@strongboxsafe.com) and we'll get you access to our localization platform. Localization and translation is managed through the parallel Babel project. This is managed under the MIT licence to avoid issues with the Apple's App Store and ownership:

https://github.com/strongbox-password-safe/babel

Big thank you to all the localization contributors

- Chinese - GY & Attis & Anonymous
- Czech - S474N
- Dutch - Wishes to remain anonymous
- French - Charles-Ivan Chesneau
- German - @Slummi
- Greek - John Spiropoulos
- Italian - Marco Ermini
- Japanese - Anonymous
- Norwegian - Ole Aldric
- Polish - Łukasz Oryński
- Portuguese (PT-BR) - Wolfgang Marcos
- Russian - Wishes to remain anonymous
- Spanish - Wishes to remain anonymous
- Swedish - Jari Häkkinen
- Turkish - evreka
- Ukrainian - Artem Polivanchuk

# License Notes (AGPL)
This code provided here is licensed under the GNU AGPL by default, except for localization which is managed under the MIT Licence in the Babel sub project. Copyright/Ownership is held by Mark McGuill.

# Supporting Development
There are several ways you can help support continuous development. 

### App Store Purchase
Obviously if you purchase a subscription or lifetime licence Apple's App Stores that's really helpful. 

### Leave a Review
If you like the app, you can always help out by leaving a *5 star review* in the App Store(s) (Apple, Mozilla or Google's stores). This is very helpful, and helps get the word out about Strongbox. If you can, please leave a positive comment too. You can review the App on Apple here:

Apple App Store: https://apps.apple.com/app/strongbox-password-safe/id897283731
Chrome/Chromium: https://chrome.google.com/webstore/detail/strongbox-autofill/mnilpkfepdibngheginihjpknnopchbn
Firefox: https://addons.mozilla.org/firefox/addon/strongbox-autofill/

# Help / Tech Support
If you're having trouble, please checkout the following sources:

- [Online Support](https://strongboxsafe.com/support/) 
- [Twitter @StrongboxSafe](https://twitter.com/StrongboxSafe "@StrongboxSafe") 
- [Reddit r/strongbox](https://www.reddit.com/r/strongbox/ "r/strongbox")

Another important step is to restart your device, it's surprising how often this can fix issues.

# Build Issues
The code is provided here in the spirit transparency, security and openness. Anyone can view the code and verify that everything is above board, the algorithms are correct and there are no backdoors or other malicious features present. Please do not file issues about build trouble or problems, they will be closed as "won't fix". What is here is all of the functional code used in building Strongbox Browser AutoFill, other non functional files (e.g. artwork, images, auxilliary and build configs) are not present. Translation strings files are managed in the separate Babel repository. 

# Open Source not Open Contribution
At the moment, we are not accepting pull requests and do not want to manage contributions from others. The code here is under the AGPL which Apple will not allow in the App Store. The code is provided here in the spirit of transparency, security and openness.

# Acknowledgements
Kudos to Rony Shapiro, Bruce Schneier and all the Password Safe team for their amazing work and the original Password Safe format and application.

The official KeePass site is here:

https://keepass.info/

Credit to Dominik Reichl and all the KeePass team for their incredible technical skill, for coming up with a great format, and their seminal KeePass app. 

Hats off to the KeePassXC team for their fantastic cross platform apps. 

https://keepassxc.org/
