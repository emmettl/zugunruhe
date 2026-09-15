// Hosting-only navigation and link repair; the frozen study's source stays intact.
import { installStudySound } from './study-sound.js';
const base=new URL(/* @vite-ignore */ '../',import.meta.url);
const frozen=document.documentElement.hasAttribute('data-frozen-study');
const styles=document.createElement('style');
styles.textContent=`.site-navigation{display:flex;align-items:center;gap:3px;margin-left:auto;white-space:nowrap}.site-navigation a{font:12px Inter,system-ui,sans-serif;text-decoration:none;color:#9994aa;padding:8px 10px;border-radius:4px}.site-navigation a[aria-current=page]{color:#ece1f3;background:#c6b2ea12}.site-navigation a:hover{color:white}.site-navigation a:focus-visible{outline:2px solid #9cdde5;outline-offset:2px}header:has(.site-navigation){gap:20px}@media(max-width:760px){.site-navigation a{font-size:11px;padding:8px 7px}header:has(.site-navigation){gap:12px}.site-navigation{gap:0}}`;
if(!frozen)document.head.append(styles);
function update(){
  if(!frozen)installStudySound();
  for(const a of document.querySelectorAll('a[href]')){
    const href=a.getAttribute('href');
    if(href==='/'||href.startsWith('/studies/'))a.setAttribute('href',base.pathname+href.slice(1));
  }
  const header=document.querySelector('header');
  if(!frozen&&header&&!header.querySelector('.site-navigation')){
    header.querySelector('.previous')?.remove();
    const nav=document.createElement('nav');nav.className='site-navigation';nav.setAttribute('aria-label','Studies');
    for(const [file,label] of [['','Cloud'],['network.html','Islands'],['continent.html','Sea'],['currents.html','Currents'],['night.html','Night'],['air.html','Air'],['season.html','Season']]){
      const a=document.createElement('a');a.href=new URL(file,base).href;a.textContent=label;
      const path=location.pathname.replace(/\.html$/,'').replace(/\/$/,'');
      const target=new URL(file,base).pathname.replace(/\.html$/,'').replace(/\/$/,'');
      if(path===target||(file==='air.html'&&path===target+'-station')||(file==='season.html'&&path===target+'-data')||(!file&&path===target+'/index'))a.setAttribute('aria-current','page');
      nav.append(a);
    }
    header.append(nav);
  }
}
new MutationObserver(update).observe(document.documentElement,{childList:true,subtree:true});update();
// Same hostname-guarded collection identifier as the other editions.
if(location.hostname==='emmettl.github.io'){
  const beacon=document.createElement('script');beacon.defer=true;beacon.src='https://static.cloudflareinsights.com/beacon.min.js';
  beacon.dataset.cfBeacon=JSON.stringify({token:'4ccf90b57ee64eaa93f8ceaaaf90b41e'});document.head.append(beacon);
}
