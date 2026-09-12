import styles from './study-ui.css?inline';

/** Native modal semantics keep notes, focus and scrolling together on every screen. */
export function installStudyDialog(panel,opener,close){
  const dialog=document.createElement('dialog');
  dialog.id=panel.id;dialog.className=panel.className;dialog.hidden=true;
  dialog.append(...panel.childNodes);panel.replaceWith(dialog);
  const heading=dialog.querySelector('h2');heading.id=`${dialog.id}-title`;
  dialog.setAttribute('aria-labelledby',heading.id);
  opener.setAttribute('aria-controls',dialog.id);opener.setAttribute('aria-haspopup','dialog');
  function setOpen(open){
    if(open){dialog.hidden=false;if(!dialog.open)dialog.showModal();close.focus();}
    else{dialog.close();dialog.hidden=true;opener.focus();}
    opener.setAttribute('aria-expanded',String(open));
  }
  dialog.addEventListener('cancel',event=>{event.preventDefault();setOpen(false);});
  return setOpen;
}

/** Move the existing controls, retaining values and listeners across rotation/resizing. */
export function installMobileStudy(){
  const style=document.createElement('style');style.textContent=styles;document.head.append(style);
  const mobile=matchMedia('(max-width:760px), (max-width:1024px) and (max-height:500px)');
  const cloud=!!document.querySelector('#app');
  const playback=document.querySelector(cloud?'.playback':'footer');
  const stage=document.querySelector(cloud?'.stage':'main');
  const settings=document.createElement('details');settings.className='mobile-settings';
  const summary=document.createElement('summary');summary.textContent=cloud?'Altitude layers':'Scene settings';settings.append(summary);
  const content=document.createElement('div');content.className='mobile-settings-content';settings.append(content);playback.after(settings);
  const panels=[...document.querySelectorAll(cloud?'.layer-panel':'.inspector,.height-controls,.weather-controls')].map(node=>{
    const marker=document.createComment('desktop control position');node.before(marker);return {node,marker};
  });
  const interaction=document.createElement('div');interaction.className='mobile-interaction';
  const button=document.createElement('button');button.type='button';button.textContent='Move view';button.setAttribute('aria-pressed','false');
  const hint=document.createElement('span');hint.id='touch-help';hint.textContent='Swipe to scroll';button.setAttribute('aria-describedby',hint.id);
  interaction.append(button,hint);stage.append(interaction);
  const canvas=stage.querySelector('canvas');
  let moving=false;
  function setMoving(value){
    moving=value;stage.classList.toggle('touch-explore',value);button.setAttribute('aria-pressed',String(value));
    button.textContent=value?'Done moving':'Move view';hint.textContent=value?'Drag to orbit · pinch to zoom':'Swipe to scroll';
  }
  button.addEventListener('click',()=>setMoving(!moving));
  // Capture above the canvas, before OrbitControls and station picking. Browsing
  // the page must not unexpectedly move the camera or interrupt a flyover.
  for(const type of ['pointerdown','pointermove','pointerup','wheel'])stage.addEventListener(type,event=>{
    if(mobile.matches&&!moving&&event.target===canvas)event.stopImmediatePropagation();
  },{capture:true,passive:true});
  function layout(){
    setMoving(false);settings.hidden=!mobile.matches;interaction.hidden=!mobile.matches;
    if(canvas){if(mobile.matches)canvas.setAttribute('aria-describedby',hint.id);else canvas.removeAttribute('aria-describedby');}
    for(const {node,marker} of panels){if(mobile.matches)content.append(node);else marker.after(node);}
    content.append(returnButton);
  }
  const returnButton=document.createElement('button');returnButton.type='button';returnButton.className='return-to-scene';returnButton.textContent='Back to scene';content.append(returnButton);
  function returnToScene(){
    settings.open=false;
    const focus=stage.querySelector('#back-to-network:not([hidden])')??canvas;
    focus?.focus({preventScroll:true});
    stage.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
  }
  returnButton.addEventListener('click',returnToScene);
  document.querySelector('#station')?.addEventListener('change',()=>{if(mobile.matches)returnToScene();});
  mobile.addEventListener('change',layout);layout();
}
