# losethos.org

A preservation project documenting the lore of Terry A. Davis. Restores the July 7, 2006 LoseThos
website and boots the original operating system entirely inside each visitor's
browser. Preserved by [Corian Kennedy](https://keybase.io/corykennedy).

Public source repository: https://github.com/darkcodelabs/losethos

## Run

`python3 scripts/serve.py` serves http://127.0.0.1:18867 with the cross-origin
isolation headers required by QEMU's WebAssembly threads. No build or package
installation is required to serve the site.

`python3 scripts/verify_browser.py http://127.0.0.1:18867 /path/to/chromium`
uses installed Python Playwright to boot two independent browser contexts,
check memory isolation, check that persistent stores remain empty, and prove
refresh discards the session. Screenshots and counters go to
`~/.local/state/losethos/`. Inspect the screenshots for successful guest boot.

The website has no account system. LoseThos's original account selector remains:
User opens after three idle seconds when the original account menu is detected.
Touch controls and an on-screen keyboard support mobile devices. No guest state is persisted.

`python3 scripts/verify_static.py` checks archive checksums, local links,
active-content removal and ISO integrity.

## Restore archive files

`python3 scripts/restore.py /path/to/losethos-wayback.zip --sample` processes
three paths. Omit `--sample` to recover only missing files. The archive is
`websites/losethos.com/losethos.com - wayback_machine_downloader.zip` from
https://archive.org/details/TerryADavis_TempleOS_Archive.
This development script uses installed BeautifulSoup. The checked-in files
require no Python dependencies at runtime. Sources and checksums are published
in `site/sources/manifest.json`.

The root homepage uses the exact July 7, 2006 capture selected by the owner.
Run the restore command with `--reference-2006` to rebuild that homepage and
its 36 reachable archived files. A small floating power control leaves the
original table layout intact. `/archive/2006/index.html` preserves the capture;
`/archive/index.html` retains the later 2012 homepage. The emulator runs the
explicitly labeled 2012 live CD.

## Security and provenance

Recovered HTML is untrusted. The restoration strips active content, repairs
links, and removes tracking requests. Archived pages also have a restrictive
CSP. The guest receives no network adapter and all memory stays in its tab.

See `/sources/` for historical sources, restoration changes, QEMU GPLv2 source
links, the build integration source archive, and upstream BIOS licenses.
