"""Check restored-file integrity, local links, and archive execution boundaries."""
import gzip
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
from urllib.parse import unquote, urlsplit

root = Path(__file__).resolve().parents[1] / 'site'
errors = []
class Check(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path = path

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if 'archive' in self.path.relative_to(root).parts:
            if tag in ('script', 'iframe', 'object', 'embed', 'form') or any(k.startswith('on') for k in attrs):
                errors.append(f'active markup: {self.path}')
        for attr in ('href', 'src'):
            value = attrs.get(attr)
            if not value or value.startswith('#'):
                continue
            url = urlsplit(value)
            if url.scheme or url.netloc:
                continue
            target = root / unquote(url.path).lstrip('/') if url.path.startswith('/') else self.path.parent / unquote(url.path)
            if target.is_dir():
                target = target / 'index.html'
            if not target.is_file():
                errors.append(f'missing link: {self.path.relative_to(root)} -> {value}')

manifest = json.loads((root/'sources/manifest.json').read_text())
older = json.loads((root/'sources/manifest-2006.json').read_text())
for entry in older:
    assert hashlib.sha256((root/'archive/2006'/entry['path']).read_bytes()).hexdigest() == entry['sha256']
for entry in manifest:
    data = (root/'archive'/entry['path']).read_bytes()
    assert hashlib.sha256(data).hexdigest() == entry['sha256'], entry['path']
for file in root.rglob('*.html'):
    Check(file).feed(file.read_text())
assert hashlib.sha1((root/'emulator/losethos.iso').read_bytes()).hexdigest() == '3f6582182c42bd416ba3b748f2600ec206795cce'
assert gzip.decompress((root/'emulator/qemu-system-x86_64.wasm.gz').read_bytes()).startswith(b'\x00asm')
assert not errors, '\n'.join(errors[:20])
print(json.dumps({'restored_files':len(manifest)+len(older), 'checksum_matches':len(manifest)+len(older), 'broken_local_links':0, 'active_archive_content':0, 'iso_checksum_verified':True}))
