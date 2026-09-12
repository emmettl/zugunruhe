// Shared by the three editable studies; saved builds retain their original controls.
export function installPlaybackKeyboard({timeline,play,blocked=()=>false}){
  const help='Space or P: play/pause. Left/Right: back/forward 5 minutes. Shift + Left/Right: 30 minutes. Home/End: start/end. Scrubbing pauses.';
  play.title='Play / pause (Space or P)';play.setAttribute('aria-keyshortcuts','Space P');
  timeline.title=help;timeline.setAttribute('aria-keyshortcuts','Space P ArrowLeft ArrowRight Shift+ArrowLeft Shift+ArrowRight Home End');
  const canvas=document.querySelector('canvas');
  if(canvas){canvas.tabIndex=0;canvas.title=help;}
  document.addEventListener('keydown',event=>{
    if(event.defaultPrevented||event.isComposing||event.ctrlKey||event.metaKey||event.altKey||blocked()||document.querySelector('dialog[open]'))return;
    const target=event.target;
    // Native form controls, links and buttons must keep their own key actions.
    // The play button and the timeline are intentionally part of these shortcuts.
    if(target!==timeline&&target!==play&&(target?.isContentEditable||target?.closest?.('input,select,textarea,button,a,[role="textbox"],[role="combobox"],[role="slider"]')))return;
    if(event.code==='Space'||event.key===' '||event.key.toLowerCase()==='p'){
      event.preventDefault();if(!event.repeat)play.click();return;
    }
    const current=Number(timeline.value),min=Number(timeline.min),max=Number(timeline.max);
    const step=event.shiftKey?6:1; // Each timeline unit is five minutes.
    let next;
    if(event.key==='ArrowLeft')next=current-step;
    else if(event.key==='ArrowRight')next=current+step;
    else if(event.key==='Home')next=min;
    else if(event.key==='End')next=max;
    else return;
    event.preventDefault();timeline.value=Math.max(min,Math.min(max,next));
    timeline.dispatchEvent(new Event('input',{bubbles:true}));
  });
}
