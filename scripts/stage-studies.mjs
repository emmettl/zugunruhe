import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),dist=path.join(root,'dist');
const shell=fs.readdirSync(path.join(dist,'assets')).find(name=>/^site-shell-[\w-]+\.js$/.test(name));
if(!shell)throw new Error('Missing hosting adapter entry');
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for(const id of ['01-layers','02-archipelago']){
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'studies',id+'-manifest.json')));
  for(const [name,expected] of Object.entries({...manifest.buildFiles,['studies/'+manifest.sourceArchive]:manifest.sourceSha256})){
    if(sha(path.join(root,name))!==expected)throw new Error('Frozen study changed: '+name);
  }
}
fs.cpSync(path.join(root,'studies'),path.join(dist,'studies'),{recursive:true});
for(const id of ['01-layers','02-archipelago']){
  const file=path.join(dist,'studies',id,'index.html');
  // Only the hosted HTML gains a link adapter and hostname-guarded analytics.
  // Preserved source, archive and renderer assets remain byte-for-byte unchanged.
  const html=fs.readFileSync(file,'utf8').replace('<html lang="en">','<html lang="en" data-frozen-study>')
    .replace('</head>',`<script type="module" src="../../assets/${shell}"></script></head>`);
  fs.writeFileSync(file,html);
}
fs.writeFileSync(path.join(dist,'.nojekyll'),'');
console.log('Staged both verified frozen studies with portable hosting links.');
