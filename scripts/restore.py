"""Restore static captures at or before the selected March 2012 homepage.

Usage: python3 scripts/restore.py ARCHIVE.zip [--sample]
Archive markup is untrusted: remove active content and external image requests.
"""
import hashlib
import json
from pathlib import Path, PurePosixPath
from datetime import datetime
import re
import sys
from urllib.parse import urljoin, urlsplit, quote
from urllib.parse import unquote
import zipfile
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1] / 'site'
reference_2006 = '--reference-2006' in sys.argv
CUTOFF = '20060707060247' if reference_2006 else '20120330083533'
prefix = 'archive/2006' if reference_2006 else 'archive'
archive = zipfile.ZipFile(sys.argv[1])
selected = {}
for name in archive.namelist():
    match = re.fullmatch(r'wayback_machine_downloader/(\d{14})/(.+)', name)
    if not match or name.endswith('/') or match[1] > ('20139999999999' if reference_2006 else CUTOFF) or '..' in PurePosixPath(match[2]).parts:
        continue
    stamp, path = match.groups()
    if not reference_2006 and not path.lower().endswith(('.html', '.htm', '.gif', '.png', '.jpg', '.jpeg', '.css')):
        continue
    rank = lambda date: abs((datetime.strptime(date,'%Y%m%d%H%M%S')-datetime.strptime(CUTOFF,'%Y%m%d%H%M%S')).total_seconds())
    if path not in selected or (rank(stamp) < rank(selected[path][0]) if reference_2006 else stamp > selected[path][0]):
        selected[path] = (stamp, name)

if reference_2006:
    queue, reachable, missing = ['index.html'], set(), set()
    while queue:
        path = queue.pop()
        if path in reachable:
            continue
        reachable.add(path)
        if path not in selected:
            missing.add(path)
            continue
        if not path.endswith(('.html', '.htm')):
            continue
        page = BeautifulSoup(archive.read(selected[path][1]), 'html.parser')
        for element in page.select('a[href],img[src]'):
            url = urlsplit(urljoin('http://www.losethos.com/'+path, element.get('href') or element.get('src')))
            if url.hostname in ('losethos.com','www.losethos.com'):
                target = unquote(url.path).lstrip('/') or 'index.html'
                queue.append(target+'index.html' if target.endswith('/') else target)
    selected = {path: selected[path] for path in reachable if path in selected}
    print(json.dumps({'linked_paths':len(reachable),'available':len(selected),'archive_gaps':sorted(missing)}),flush=True)

def restored_link(value, path, stamp, image=False):
    absolute = urljoin('http://www.losethos.com/' + path, value)
    url = urlsplit(absolute)
    if url.scheme == 'mailto' and not image and not url.query and not any(c in absolute for c in '\r\n'):
        return absolute
    if url.scheme not in ('http', 'https'):
        return None
    if url.hostname not in ('losethos.com', 'www.losethos.com'):
        return None if image else absolute
    target = unquote(url.path).lstrip('/') or 'index.html'
    if target.endswith('/'):
        target += 'index.html'
    if target == 'LTCD.ISO' and not reference_2006:
        return '/emulator/losethos.iso'
    if target in selected:
        return '/' + prefix + '/' + quote(target) + ('#' + url.fragment if url.fragment else '')
    return None if image else 'https://web.archive.org/web/' + stamp + '/' + absolute

def restore(path, stamp, name):
    raw = archive.read(name)
    if not path.endswith(('.html', '.htm')):
        return raw
    soup = BeautifulSoup(raw, 'html.parser')
    for element in soup.select('script,iframe,object,embed,form,input,button,link,base,meta[http-equiv],svg,math'):
        element.decompose()
    for element in soup.find_all(True):
        for attr in list(element.attrs):
            if attr.lower().startswith('on') or attr.lower() in ('srcdoc', 'srcset', 'action', 'formaction'):
                del element[attr]
        if element.has_attr('style') and re.search(r'url\s*\(|expression|@import', element['style'], re.I):
            del element['style']
        if element.name == 'style' and re.search(r'url\s*\(|expression|@import', element.get_text(), re.I):
            element.decompose()
            continue
        for attr in ('href', 'src', 'background'):
            if not element.has_attr(attr):
                continue
            val = str(element[attr])
            if val.startswith('#') and attr == 'href':
                continue
            value = restored_link(val, path, stamp, image=attr != 'href')
            if value:
                element[attr] = value
            else:
                del element[attr]
    if soup.head:
        meta = soup.new_tag('meta', charset='utf-8'); soup.head.insert(0, meta)
        viewport = soup.new_tag('meta', attrs={'name':'viewport', 'content':'width=device-width, initial-scale=1'}); soup.head.append(viewport)
        if not reference_2006:
            css = soup.new_tag('link', rel='stylesheet', href='/memorial.css'); soup.head.append(css)
    if soup.body:
        note = BeautifulSoup('<div class="archive-note">Historical capture: ' + stamp[:4] + '-' + stamp[4:6] + '-' + stamp[6:8] + '. <a href="/">Home</a> | <a href="/boot.html">Power on LoseThos</a> | <a href="/sources/">Sources and changes</a></div>', 'html.parser')
        soup.body.append(note)
    return str(soup).encode()

sample = '--sample' in sys.argv
items = list(sorted(selected.items()))[:3] if sample else sorted(selected.items())
contents = {path: restore(path, stamp, name) for path, (stamp, name) in items}
before = sum(not (ROOT/prefix/path).exists() or (ROOT/prefix/path).read_bytes() != contents[path] for path, _ in items)
print(json.dumps({'selected':len(selected), 'sample':sample, 'gap_before':before}), flush=True)
manifest = []
for path, (stamp, name) in items:
    destination = ROOT / prefix / path
    if not destination.exists() or destination.read_bytes() != contents[path]:
        content = contents[path]
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(content)
    manifest.append({'path':path, 'timestamp':stamp, 'sha256':hashlib.sha256(destination.read_bytes()).hexdigest(), 'source':'https://web.archive.org/web/'+stamp+'/http://www.losethos.com/'+path})
if not sample:
    (ROOT / 'sources' / ('manifest-2006.json' if reference_2006 else 'manifest.json')).write_text(json.dumps(manifest, indent=2))
    if reference_2006:
        soup = BeautifulSoup((ROOT/prefix/'index.html').read_text(), 'html.parser')
        soup.select_one('.archive-note').decompose()
        soup.title.string = 'LoseThos | Terry A. Davis lore'
        controls = BeautifulSoup('''<aside class="lore-controls" aria-label="LoseThos launcher"><div class="titlebar">Power on LoseThos</div><div class="content"><a class="power" href="/boot.html">Power on LoseThos</a><p>Temporary browser session</p><nav><a href="/sources/#start-here">New to LoseThos?</a><a href="/sources/">Lore &amp; sources</a></nav></div></aside>
<p class="preservation-credit"><a href="https://keybase.io/corykennedy">Preserved by Corian Kennedy.</a></p>
<style>.lore-controls{position:fixed;right:20px;top:20px;z-index:10;width:310px;max-width:calc(100vw - 24px);background:#fff;color:#000080;border:3px double #000080;font:bold 15px/1.45 "Courier New",Courier,monospace}.lore-controls .titlebar{background:#000080;color:#fff;text-align:center;padding:1px 4px}.lore-controls .content{padding:12px}.lore-controls .power{display:block;background:#000080;color:#fff;padding:14px 12px;text-decoration:none;font-size:20px}.lore-controls .power:hover{background:#0000cc}.lore-controls p{color:#000;margin:12px 0 18px}.lore-controls nav{display:flex;flex-direction:column;align-items:start;gap:13px}.lore-controls nav a{color:#0000ee;font-size:16px}.lore-controls nav a:visited{color:purple}.lore-controls a:focus-visible{outline:2px dashed #800000;outline-offset:2px}.preservation-credit{font:13px/1.5 "Courier New",Courier,monospace}@media(max-width:1000px){.lore-controls{top:auto;bottom:12px;right:12px;width:270px}.lore-controls .content{padding:8px}.lore-controls .power{padding:8px;font-size:17px}.lore-controls p{margin:8px 0}.lore-controls nav{gap:7px}}</style>''','html.parser')
        soup.body.append(controls)
        (ROOT/'index.html').write_text(str(soup))
print(json.dumps({'processed':len(items), 'gap_after':sum(not (ROOT/prefix/path).exists() for path,_ in items), 'errors':0}), flush=True)
