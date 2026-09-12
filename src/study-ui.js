import styles from './study-ui.css?inline';

/** Native modal semantics keep notes, focus and scrolling together on every screen. */
export function installStudyDialog(panel,opener,close){
  const dialog=document.createElement('dialog');
  dialog.id=panel.id;dialog.className=panel.className;dialog.hidden=true;
  dialog.append(...panel.childNodes);panel.replaceWith(dialog);
  const heading=dialog.querySelector('h2');heading.id=`${dialog.id}-title`;
  dialog.setAttribute('aria-labelledby',heading.id);
  opener.setAttribute('aria-expanded','false');opener.setAttribute('aria-controls',dialog.id);opener.setAttribute('aria-haspopup','dialog');
  function setOpen(open){
    if(open){dialog.hidden=false;if(!dialog.open)dialog.showModal();close.focus();}
    else{dialog.close();dialog.hidden=true;opener.focus();}
    opener.setAttribute('aria-expanded',String(open));
  }
  dialog.addEventListener('cancel',event=>{event.preventDefault();setOpen(false);});
  dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setOpen(false);}});
  return setOpen;
}

/** Move the existing controls, retaining values and listeners across rotation/resizing. */
export function installMobileStudy(){
  const style=document.createElement('style');style.textContent=styles;document.head.append(style);
  const mobile=matchMedia('(max-width:760px), (max-width:1024px) and (max-height:500px)');
  const cloud=!!document.querySelector('#app');
  const playback=document.querySelector(cloud?'.playback':'footer');
  const stage=document.querySelector(cloud?'.stage':'main');
  let settings=document.createElement('section');settings.className='mobile-settings';settings.id='mobile-settings';
  const heading=document.createElement('h2');heading.textContent='Controls';
  const closeButton=document.createElement('button');closeButton.className='close-controls';closeButton.type='button';closeButton.textContent='×';closeButton.setAttribute('aria-label','Close controls');
  settings.append(closeButton,heading);
  const content=document.createElement('div');content.className='mobile-settings-content';settings.append(content);playback.after(settings);
  const selectors=cloud?'.view-controls,.nights,.layer-panel,.playback-foot':'.camera-controls,.inspector,.height-controls,.weather-controls,#coverage,.footnote';
  const priority=node=>node.matches('.camera-controls,.view-controls')?0:node.matches('.nights')?1:2;
  const panels=[...document.querySelectorAll(selectors)].sort((a,b)=>priority(a)-priority(b)).map(node=>{
    const marker=document.createComment('desktop control position');node.before(marker);return {node,marker};
  });
  const interaction=document.createElement('div');interaction.className='mobile-interaction';
  const controlsButton=document.createElement('button');controlsButton.type='button';controlsButton.textContent='Controls';interaction.append(controlsButton);stage.append(interaction);
  const button=document.createElement('button');button.type='button';button.className='move-view';button.textContent='Move view';button.setAttribute('aria-pressed','false');
  const hint=document.createElement('p');hint.id='touch-help';hint.textContent='Swipe the scene to scroll. Choose Move view to orbit and pinch to zoom.';button.setAttribute('aria-describedby',hint.id);
  content.append(button,hint);
  const setSettingsOpen=installStudyDialog(settings,controlsButton,closeButton);settings=document.getElementById('mobile-settings');
  closeButton.addEventListener('click',()=>setSettingsOpen(false));
  const canvas=stage.querySelector('canvas');
  let moving=false;
  function setMoving(value){
    moving=value;stage.classList.toggle('touch-explore',value);button.setAttribute('aria-pressed',String(value));
    button.textContent=value?'Done moving':'Move view';controlsButton.textContent=value?'Done moving':'Controls';controlsButton.setAttribute('aria-haspopup',value?'false':'dialog');
  }
  button.addEventListener('click',()=>{setMoving(true);returnToScene();});
  controlsButton.addEventListener('click',()=>{if(moving)setMoving(false);else setSettingsOpen(true);});
  // Capture above the canvas, before OrbitControls and station picking. Browsing
  // the page must not unexpectedly move the camera or interrupt a flyover.
  for(const type of ['pointerdown','pointermove','pointerup','wheel'])stage.addEventListener(type,event=>{
    if(mobile.matches&&!moving&&event.target===canvas)event.stopImmediatePropagation();
  },{capture:true,passive:true});
  function layout(){
    setMoving(false);if(!mobile.matches&&settings.open)setSettingsOpen(false);settings.hidden=!mobile.matches;interaction.hidden=!mobile.matches;
    if(canvas){if(mobile.matches)canvas.setAttribute('aria-describedby',hint.id);else canvas.removeAttribute('aria-describedby');}
    for(const {node,marker} of panels){if(mobile.matches)content.append(node);else marker.after(node);}
    content.append(returnButton);
  }
  const returnButton=document.createElement('button');returnButton.type='button';returnButton.className='return-to-scene';returnButton.textContent='Back to scene';content.append(returnButton);
  function returnToScene(){
    setSettingsOpen(false);
    const focus=stage.querySelector('#back-to-network:not([hidden])')??canvas;
    focus?.focus({preventScroll:true});
    stage.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
  }
  returnButton.addEventListener('click',returnToScene);
  for(const {node} of panels)if(node.matches('.camera-controls,.view-controls'))node.addEventListener('click',event=>{if(mobile.matches&&event.target.closest('button'))returnToScene();});
  document.querySelector('#station')?.addEventListener('change',()=>{if(mobile.matches)returnToScene();});
  mobile.addEventListener('change',layout);layout();
}
