'use strict';
(()=>{
// Inputs go only to the in-memory QEMU instance. No guest state is stored.
const input=window.guestInput;
const pad=document.querySelector('#touch-pad');
let pointer=null,lastX=0,lastY=0,buttons=0;
let gestureStart=0,travel=0,lastTap=0,dragging=false,holdTimer;
function clickMouse(mask){input.mouse(0,0,0,mask);setTimeout(()=>input.mouse(0,0,0,buttons),80);}
function bindPointer(surface){
 surface.style.touchAction='none';
 surface.addEventListener('contextmenu',e=>e.preventDefault());
 surface.addEventListener('pointerdown',e=>{
  if(surface.id==='screen'&&e.pointerType!=='touch')return;
  if(pointer!==null)return;
  e.preventDefault();input.interact();pointer=e.pointerId;lastX=e.clientX;lastY=e.clientY;travel=0;gestureStart=performance.now();surface.setPointerCapture(pointer);
  dragging=gestureStart-lastTap<320;
  if(dragging){buttons|=1;input.mouse(0,0,0,buttons);}
  holdTimer=setTimeout(()=>{if(travel<8&&!dragging){clickMouse(2);gestureStart=0;}},550);
 });
 surface.addEventListener('pointermove',e=>{
  if(e.pointerId!==pointer)return;
  e.preventDefault();const dx=e.clientX-lastX,dy=e.clientY-lastY;travel+=Math.hypot(dx,dy);
  if(travel>8)clearTimeout(holdTimer);
  const gain=Math.max(1,Math.min(2.5,640/surface.clientWidth));
  input.mouse(Math.round(dx*gain),Math.round(dy*gain),0,buttons);lastX=e.clientX;lastY=e.clientY;
 });
 const end=e=>{
  if(e.pointerId!==pointer)return;clearTimeout(holdTimer);pointer=null;
  if(dragging){buttons&=~1;input.mouse(0,0,0,buttons);dragging=false;lastTap=0;}
  else if(e.type==='pointerup'&&gestureStart&&travel<8&&performance.now()-gestureStart<550){clickMouse(1);lastTap=performance.now();}
  else input.mouse(0,0,0,buttons);
 };
 surface.addEventListener('pointerup',end);surface.addEventListener('pointercancel',end);
}
if(pad)bindPointer(pad);
bindPointer(document.querySelector('#screen'));
for(const [id,mask] of [['touch-left',1],['touch-right',2]]){
 const button=document.getElementById(id);if(!button)continue;
 button.style.touchAction='none';
 button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);buttons|=mask;input.mouse(0,0,0,buttons);});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>{buttons&=~mask;input.mouse(0,0,0,buttons);});
 button.addEventListener('click',e=>{if(e.detail===0){input.mouse(0,0,0,mask);input.mouse(0,0,0,0);}});
}
const modifiers=new Set();
for(const button of document.querySelectorAll('[data-key]'))button.addEventListener('click',()=>{
 input.interact();const code=button.dataset.key;
 if(['ShiftLeft','ControlLeft','AltLeft'].includes(code)){
  modifiers.has(code)?modifiers.delete(code):modifiers.add(code);button.setAttribute('aria-pressed',String(modifiers.has(code)));return;
 }
 for(const modifier of modifiers)input.key(modifier,true);
 input.key(code,true);setTimeout(()=>{input.key(code,false);for(const modifier of modifiers)input.key(modifier,false);},80);
});
const keyboard=document.querySelector('#keyboard-input');
const toggle=document.querySelector('#keyboard-toggle');
if(toggle)toggle.onclick=()=>{const panel=document.querySelector('#keyboard-panel');panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)keyboard.focus();};
const unshifted="1234567890-=[]\\;',./`";
const shifted='!@#$%^&*()_+{}|:"<>?~';
const punctuation=['Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Digit0','Minus','Equal','BracketLeft','BracketRight','Backslash','Semicolon','Quote','Comma','Period','Slash','Backquote'];
let typing=Promise.resolve();
function typeText(text){
 typing=typing.then(async()=>{
  for(const character of text){
   let code,shift=false;
   if(/[a-z]/i.test(character)){code='Key'+character.toUpperCase();shift=character!==character.toLowerCase();}
   else if(character===' '||character==='\n'||character==='\t')code=({' ':'Space','\n':'Enter','\t':'Tab'})[character];
   else{let index=unshifted.indexOf(character);if(index<0){index=shifted.indexOf(character);shift=index>=0;}code=punctuation[index];}
   if(!code)continue;
   if(shift)input.key('ShiftLeft',true);input.key(code,true);
   await new Promise(resolve=>setTimeout(resolve,40));input.key(code,false);if(shift)input.key('ShiftLeft',false);
   await new Promise(resolve=>setTimeout(resolve,40));
  }
 });
}
if(keyboard){
 keyboard.addEventListener('input',e=>{if(e.isComposing)return;if(e.inputType==='deleteContentBackward'){input.key('Backspace',true);setTimeout(()=>input.key('Backspace',false),80);}else typeText(keyboard.value);keyboard.value='';});
 keyboard.addEventListener('compositionend',()=>{typeText(keyboard.value);keyboard.value='';});
}
window.addEventListener('blur',()=>{buttons=0;pointer=null;modifiers.clear();for(const button of document.querySelectorAll('[aria-pressed]'))button.setAttribute('aria-pressed','false');input.release();});
let installPrompt;
const install=document.querySelector('#install-app');
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;if(install)install.hidden=false;});
if(install)install.onclick=async()=>{if(!installPrompt)return;await installPrompt.prompt();installPrompt=null;install.hidden=true;};
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(error=>console.warn('App installation unavailable:',error.message));
})();
