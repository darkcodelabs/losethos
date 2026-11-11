'use strict';
const screen = document.querySelector('#screen');
const statusLine = document.querySelector('#status');
const log = document.querySelector('#log');
const power = document.querySelector('#power');
const reset = document.querySelector('#reset');
const ctx = screen.getContext('2d');
function report(text) { log.textContent = (log.textContent + text + '\n').slice(-12000); }
reset.onclick = () => location.reload();
const fullButton=document.querySelector('#full');
fullButton.onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else(document.querySelector('.computer')||screen.parentElement).requestFullscreen?.().catch(e=>report(e.message));};
document.addEventListener('fullscreenchange',()=>{fullButton.textContent=document.fullscreenElement?'Exit full screen':'Full screen';});
const screenPower=document.querySelector('#power-screen');
if(screenPower)screenPower.onclick=()=>power.click();
screen.onclick = e => { screen.focus(); if(e.pointerType==='touch'||matchMedia('(pointer: coarse)').matches)return; if(window.Module?._qemu_input_send_mouse && document.pointerLockElement!==screen) screen.requestPointerLock(); };
document.addEventListener('pointerlockchange',()=>{release();statusLine.textContent=autoMessage||(document.pointerLockElement===screen?'Mouse captured. Press Esc to release.':'Computer running. Click the screen to capture the mouse and keyboard.');});
document.addEventListener('pointerlockerror',()=>report('Mouse capture failed. Click the screen to retry.'));
const keys = {Escape:1,Backquote:41,Backspace:14,Tab:15,Enter:28,ControlLeft:29,ShiftLeft:42,Backslash:43,ShiftRight:54,AltLeft:56,Space:57,CapsLock:58,NumLock:69,ScrollLock:70,ControlRight:0x9d,AltRight:0xb8,Home:0xc7,ArrowUp:0xc8,PageUp:0xc9,ArrowLeft:0xcb,ArrowRight:0xcd,End:0xcf,ArrowDown:0xd0,PageDown:0xd1,Insert:0xd2,Delete:0xd3};
for (const [start,row] of [[2,'Digit1 Digit2 Digit3 Digit4 Digit5 Digit6 Digit7 Digit8 Digit9 Digit0 Minus Equal'],[16,'KeyQ KeyW KeyE KeyR KeyT KeyY KeyU KeyI KeyO KeyP BracketLeft BracketRight'],[30,'KeyA KeyS KeyD KeyF KeyG KeyH KeyJ KeyK KeyL Semicolon Quote'],[44,'KeyZ KeyX KeyC KeyV KeyB KeyN KeyM Comma Period Slash']]) row.split(' ').forEach((key,i) => keys[key]=start+i);
for(let i=1;i<=12;i++) keys['F'+i]=i<=10?58+i:76+i;
const held = new Set();
let manualInput=false,autoStarted=false,autoTimer,autoMessage='';
function interact(){manualInput=true;clearTimeout(autoTimer);autoMessage='';}
function sendKey(code,down){if(!keys[code]||!window.Module?._qemu_input_send_key)return;down?held.add(code):held.delete(code);Module._qemu_input_send_key(keys[code],Number(down));}
window.guestInput={
 key(code,down){interact();sendKey(code,down);},
 mouse(x,y,wheel,buttons){interact();window.Module?._qemu_input_send_mouse?.(x,y,wheel,buttons);},
 release,interact
};
// Exact 8x8 glyphs from the archived OSMain/Font8x8 source. Match all three
// account labels in this disc's 640x480 menu before sending any automatic input.
const menuGlyphs={I:[126,24,24,24,24,24,126,0],n:[0,0,62,102,102,102,102,0],s:[0,0,124,6,60,96,62,0],t:[12,12,62,12,12,12,56,0],a:[0,0,60,96,124,102,124,0],l:[28,24,24,24,24,24,60,0],S:[60,102,6,60,96,102,60,0],f:[56,12,12,62,12,12,12,0],e:[0,0,60,102,126,6,60,0],M:[198,238,254,214,214,198,198,0],o:[0,0,60,102,102,102,60,0],d:[96,96,124,102,102,102,124,0],U:[102,102,102,102,102,102,60,0],r:[0,0,54,110,6,6,6,0]};
function accountMenuVisible(){
 if(screen.width!==640||screen.height!==480)return false;
 const pixels=ctx.getImageData(24,144,64,56).data;
 const color=(x,y)=>{const i=(y*64+x)*4;return pixels[i]*65536+pixels[i+1]*256+pixels[i+2];};
 return [['Install',0],['SafeMode',24],['User',48]].every(([word,y])=>[...word].every((letter,index)=>{
  const x=index*8,bg=color(x,y+7);
  return menuGlyphs[letter].every((row,dy)=>{for(let dx=0;dx<8;dx++)if((color(x+dx,y+dy)!==bg)!==Boolean(row&(1<<dx)))return false;return true;});
 }));
}
function checkAutoLogin(){
 if(manualInput||autoStarted||!accountMenuVisible())return;
 autoStarted=true;autoMessage='Account menu ready. Opening User in 3 seconds. Any input cancels.';
 autoTimer=setTimeout(async()=>{
  if(manualInput||!accountMenuVisible()){autoMessage='';return;}
  autoMessage='Opening User...';
  // The original document menu needs four Down presses, then Space.
  for(const code of ['ArrowDown','ArrowDown','ArrowDown','ArrowDown','Space']){
   if(manualInput){autoMessage='';return;}
   sendKey(code,true);await new Promise(resolve=>setTimeout(resolve,100));sendKey(code,false);
   await new Promise(resolve=>setTimeout(resolve,400));
  }
  autoMessage='';
 },3000);
}

function release() { if (!window.Module?._qemu_input_send_key) return; for(const key of held) Module._qemu_input_send_key(keys[key],0); held.clear(); Module._qemu_input_send_mouse(0,0,0,0); }
for(const event of ['keydown','keyup']) screen.addEventListener(event,e=>{if(!keys[e.code]||!window.Module?._qemu_input_send_key)return;e.preventDefault();interact();if(e.repeat)return;sendKey(e.code,event==='keydown');});
screen.addEventListener('blur',release);
window.addEventListener('blur',release);
for(const event of ['mousemove','mousedown','mouseup','wheel']) screen.addEventListener(event,e=>{if(!window.Module?._qemu_input_send_mouse||document.pointerLockElement!==screen)return;e.preventDefault();interact();if(event==='mousedown')screen.focus();const buttons=(e.buttons&1)|((e.buttons&2))|((e.buttons&4));Module._qemu_input_send_mouse(event==='mousemove'?e.movementX:0,event==='mousemove'?e.movementY:0,event==='wheel'?-Math.sign(e.deltaY):0,buttons);},{passive:false});
screen.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('mouseup',()=>{if(window.Module?._qemu_input_send_mouse)Module._qemu_input_send_mouse(0,0,0,0);});
power.onclick = async () => {
 power.disabled=true; if(screenPower){screenPower.disabled=true;screenPower.textContent="Powered on";} reset.disabled=false;
 try {
  if(!crossOriginIsolated||typeof SharedArrayBuffer==='undefined')throw Error('This browser cannot start the isolated emulator. Try current Chrome or Firefox over HTTPS.');
  const audio=new AudioContext({sampleRate:44100});
  await audio.resume();
  let audioTime=0,headerBytes=44;
  window.guestAudio={bytes:0,nonzeroSamples:0,buffers:0,min:0,max:0,state:audio.state};
  function playAudio(bytes){
   const skip=Math.min(headerBytes,bytes.length);headerBytes-=skip;bytes=bytes.subarray(skip);
   if(!bytes.length)return;
   const samples=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),buffer=audio.createBuffer(1,bytes.length/2,44100),channel=buffer.getChannelData(0);
   for(let i=0;i<channel.length;i++){const sample=samples.getInt16(i*2,true);channel[i]=sample/32768;if(sample)guestAudio.nonzeroSamples++;guestAudio.min=Math.min(guestAudio.min,sample);guestAudio.max=Math.max(guestAudio.max,sample);}
   guestAudio.bytes+=bytes.length;guestAudio.buffers++;
   const source=audio.createBufferSource();source.buffer=buffer;source.connect(audio.destination);
   audioTime=Math.max(audio.currentTime+0.02,audioTime);source.start(audioTime);audioTime+=buffer.duration;
  }
  statusLine.textContent='Downloading the original disc and emulator...';
  const names=['losethos.iso',...(await (await fetch('/emulator/bios.json')).json())];
  const [files,wasmBinary]=await Promise.all([
   Promise.all(names.map(async name=>{const r=await fetch('/emulator/'+name);if(!r.ok)throw Error(name+': HTTP '+r.status);return [name,new Uint8Array(await r.arrayBuffer())];})),
   (async()=>{const r=await fetch('/emulator/qemu-system-x86_64.wasm.gz');if(!r.ok)throw Error('Emulator: HTTP '+r.status);return new Uint8Array(await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());})()
  ]);
  window.Module={
   wasmBinary,
   arguments:['-m','512M','-smp','1','-cdrom','/pack/losethos.iso','-boot','d','-vga','std','-display','none','-rtc','base=localtime','-accel','tcg,tb-size=500','-nic','none','-audiodev','wav,id=guest,path=/dev/guest-audio,out.frequency=44100,out.channels=1,out.format=s16','-machine','pcspk-audiodev=guest','-no-reboot','-L','/pack'],
   locateFile:path=>'/emulator/'+path,mainScriptUrlOrBlob:'/emulator/qemu-system-x86_64.js',
   pty:{readable:false,writable:false,onReadable(){},onSignal(){},read(){return '';},write(){},kill(){},resize(){}},
   print:report,printErr:report,onAbort:reason=>{statusLine.textContent='Emulator stopped: '+reason;},
   preRun:[()=>{const dev=Module.FS.makedev(64,0);Module.FS.registerDevice(dev,{open:stream=>{stream.seekable=false;},write:(stream,buffer,offset,length)=>{playAudio(buffer.slice(offset,offset+length));return length;}});Module.FS.mkdev('/dev/guest-audio',438,dev);Module.FS.mkdir('/pack');for(const [name,data] of files)Module.FS.writeFile('/pack/'+name,data);}],
   onRuntimeInitialized(){
    statusLine.textContent='Computer powered on. Waiting for LoseThos to boot...';
    let ready=false;
    window.renderCount=0;
    setInterval(()=>{
     if(!ready){ready=Boolean(Module._qemu_setup_display());if(!ready)return;}
     if(!Module._qemu_display_check_dirty())return;
     const w=Module._qemu_display_width(),h=Module._qemu_display_height(),stride=Module._qemu_display_stride(),ptr=Module._qemu_display_data();
     if(!ptr||w<=0||h<=0||w>2048||h>2048)return;
     const mem=new Uint8Array(wasmMemory.buffer),rgba=new Uint8ClampedArray(w*h*4);
     for(let y=0;y<h;y++)for(let x=0;x<w;x++){const s=ptr+y*stride+x*4,d=(y*w+x)*4;rgba[d]=mem[s+2];rgba[d+1]=mem[s+1];rgba[d+2]=mem[s];rgba[d+3]=255;}
     if(screen.width!==w||screen.height!==h){screen.width=w;screen.height=h;}
     ctx.putImageData(new ImageData(rgba,w,h),0,0);window.renderCount++;checkAutoLogin();
     statusLine.textContent=autoMessage||(document.pointerLockElement===screen?'Mouse captured. Press Esc to release.':'Computer running. Click the screen to capture the mouse and keyboard.');
    },50);
   }
  };
  const script=document.createElement('script');script.src='/emulator/qemu-system-x86_64.js';script.onerror=()=>{statusLine.textContent='Emulator download failed. Refresh to retry.';};document.head.append(script);
 } catch(error){statusLine.textContent=error.message;report(error.message);}
};
