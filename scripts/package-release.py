"""Package production builds; no store publication or Mozilla signing."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import zipfile

root = Path(__file__).resolve().parents[1]
os.chdir(root)


def read_json(path):
    return json.loads(Path(path).read_text())


version = read_json('package.json')['version']
lock = read_json('package-lock.json')
versions = [lock['version'], lock['packages']['']['version']]
for browser in ('chrome', 'firefox'):
    versions.append(read_json(f'src/manifest.{browser}.json')['version'])
    manifest = read_json(f'dist/{browser}/manifest.json')
    versions.append(manifest['version'])
    expected = 3 if browser == 'chrome' else 2
    if manifest['manifest_version'] != expected:
        raise SystemExit(f'Unexpected {browser} manifest format')
if any(value != version for value in versions):
    raise SystemExit('Package, lockfile, source and built manifest versions must match')
if os.environ.get('GITHUB_REF_TYPE') == 'tag':
    if os.environ.get('GITHUB_REF_NAME') != f'v{version}':
        raise SystemExit('Release tag must match the package version')

output = root / 'dist/packages'
output.mkdir(parents=True, exist_ok=True)
source = output / f'sbx-autofill-{version}-source.zip'
subprocess.run(['git', 'archive', '--format=zip', f'--output={source}', 'HEAD'], check=True)
artifacts = [source]
for browser in ('chrome', 'firefox'):
    build = root / 'dist' / browser
    suffix = 'chrome.zip' if browser == 'chrome' else 'firefox-unsigned.zip'
    archive = output / f'sbx-autofill-{version}-{suffix}'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as package:
        for path in sorted(build.rglob('*')):
            if path.is_file():
                relative = path.relative_to(build)
                if path.is_symlink() or path.suffix in ('.map', '.zip', '.xpi') or any(
                    part.startswith('.') or part == 'node_modules' for part in relative.parts
                ):
                    raise SystemExit(f'Unexpected build artifact: {relative}')
                package.write(path, relative)
        package.write(root / 'LICENSE.md', 'LICENSE.md')
        package.write(source, 'source.zip')
    with zipfile.ZipFile(archive) as package:
        if package.testzip() is not None or 'manifest.json' not in package.namelist():
            raise SystemExit(f'Invalid archive: {archive.name}')
    artifacts.append(archive)

(output / 'SHA256SUMS.txt').write_text(''.join(
    f'{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}\n'
    for path in artifacts
))
print(f'Packaged version {version}: Chrome ZIP, unsigned Firefox ZIP, source ZIP and checksums')
