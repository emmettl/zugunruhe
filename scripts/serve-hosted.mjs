import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('dist'),port=Number(process.env.PORT??4187);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.zip':'application/zip'};
http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/zugunruhe'){res.writeHead(301,{Location:'/zugunruhe/'+url.search});res.end();return;}
  if(!url.pathname.startsWith('/zugunruhe/')){res.writeHead(404);res.end();return;}
  let file=path.resolve(root,'.'+decodeURIComponent(url.pathname.slice('/zugunruhe'.length)));
  if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(404);res.end();return;}
  try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');const data=fs.readFileSync(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end();}
}).listen(port,'127.0.0.1',()=>console.log(`Hosted preview: http://127.0.0.1:${port}/zugunruhe/`));
