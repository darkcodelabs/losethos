"""Boot two isolated browsers, prove memory isolation and discard-on-refresh.

Pass the base URL and installed Chromium executable. Screenshots and counters
go outside the repository. Inspect the screenshots to confirm the guest UI.
"""
import json
from pathlib import Path
import sys
import time
from playwright.sync_api import sync_playwright

base, chromium = sys.argv[1:3]
output = Path.home() / '.local/state/losethos'
output.mkdir(parents=True, exist_ok=True)
started = time.time()
def counter(**values):
    (output/'browser-progress.json').write_text(json.dumps({'started':started, **values}))

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=chromium)
    contexts = [browser.new_context(viewport={'width':1100,'height':1000}) for _ in range(2)]
    pages = [context.new_page() for context in contexts]
    failures = []
    for page in pages:
        page.on('pageerror', lambda error: failures.append(str(error)))
        page.goto(base+'/boot.html')
        page.click('#power')
    for page in pages:
        page.wait_for_function('window.renderCount > 5', timeout=120000)
    counter(phase='two VMs rendering', sessions=2, errors=len(failures))
    pages[0].click('#screen')
    pages[0].wait_for_function('document.pointerLockElement === document.querySelector("#screen")')
    pages[0].evaluate('document.exitPointerLock()')
    pages[0].wait_for_function('document.pointerLockElement === null')
    pages[0].evaluate("Module.FS.writeFile('/session-proof', 'visitor one')")
    assert pages[1].evaluate("!Module.FS.analyzePath('/session-proof').exists")
    for seconds in (30,60,90):
        pages[0].wait_for_timeout(30000)
        for index,page in enumerate(pages):
            page.screenshot(path=str(output/f'boot-{index+1}-{seconds}.png'))
        counter(phase='guest boot', sessions=2, elapsed_seconds=seconds,
                frames=[page.evaluate('window.renderCount') for page in pages], errors=len(failures))
    audio = pages[0].evaluate('window.guestAudio')
    assert audio['state'] == 'running' and audio['bytes'] > 0 and audio['min'] < 0 < audio['max'], audio
    # The quiet lower half of the guest desktop contains its own cursor.
    cursor = """() => {const c=document.querySelector('#screen'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let x=0,y=0,n=0;for(let j=300;j<c.height-10;j++)for(let i=20;i<c.width-20;i++){let k=(j*c.width+i)*4;if(d[k]<32&&d[k+1]<32&&d[k+2]<32){x+=i;y+=j;n++;}}return {x:x/n,y:y/n,pixels:n};}"""
    pages[0].click('#screen')
    pages[0].wait_for_function('document.pointerLockElement === document.querySelector("#screen")')
    pages[0].mouse.move(700,750)
    pages[0].wait_for_timeout(1000)
    before = pages[0].evaluate(cursor)
    pages[0].mouse.move(620,700)
    pages[0].wait_for_timeout(1000)
    after = pages[0].evaluate(cursor)
    assert before['pixels'] > 0 and after['pixels'] > 0 and before != after, (before,after)
    pages[0].keyboard.press('Escape')
    # Browser automation may deliver Escape to the guest rather than the browser.
    pages[0].evaluate('document.exitPointerLock()')
    pages[0].wait_for_function('document.pointerLockElement === null')
    for page in pages:
        page.locator('#screen').focus()
        for step in range(4):
            page.keyboard.press('ArrowDown', delay=100)
            page.wait_for_timeout(400)
            if page == pages[0]:
                page.screenshot(path=str(output/f'select-user-{step+1}.png'))
        page.keyboard.press('Space')
    pages[0].wait_for_timeout(30000)
    counter(phase='User account selection sent', sessions=2, errors=len(failures))
    pages[0].screenshot(path=str(output/'keyboard.png'))
    for page in pages:
        assert page.evaluate('localStorage.length === 0 && sessionStorage.length === 0')
        assert page.evaluate('indexedDB.databases().then(x => x.length)') == 0
        assert page.evaluate('caches.keys().then(x => x.length)') == 0
    pages[0].click('#reset')
    pages[0].wait_for_load_state('load')
    assert pages[0].locator('#power').is_enabled()
    assert pages[0].evaluate('typeof window.Module') == 'undefined'
    pages[0].click('#power')
    pages[0].wait_for_function('window.renderCount > 5',timeout=120000)
    assert pages[0].evaluate("!Module.FS.analyzePath('/session-proof').exists")
    assert not failures, failures
    result={'sessions':2,'memory_isolated':True,'persistent_stores':0,'reset_discards_memory':True,'errors':0,'mouse_capture_release':True,'guest_cursor_before':before,'guest_cursor_after':after,'guest_audio':audio}
    counter(phase='passed',**result)
    print(json.dumps(result),flush=True)
    browser.close()
