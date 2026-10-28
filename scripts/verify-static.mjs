import {readFile,stat,readdir} from 'node:fs/promises';
import {resolve,dirname,sep,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('dist');
async function all(dir){
 const entries=await readdir(dir,{withFileTypes:true});
 return (await Promise.all(entries.map(e=>e.isDirectory()?all(resolve(dir,e.name)):[resolve(dir,e.name)]))).flat();
}
const paths=await all(root);
assert(paths.some(x=>x===resolve(root,'index.html')),'index missing');
assert(paths.some(x=>x===resolve(root,'style.css')),'style missing');
assert(paths.some(x=>x===resolve(root,'src/main.js')),'entry missing');
const source=await readFile(resolve(root,'index.html'),'utf8');
for(const spec of ['./style.css','./src/main.js']){
 assert(source.includes(spec),'missing relative reference '+spec);
}
for(const path of paths.filter(x=>extname(x)==='.js')){
 const source=await readFile(path,'utf8');
 const matches=[...source.matchAll(/\b(?:from\s*|import\s*\()\s*['"](\.[^'"]+)['"]/g)];
 for(const [,specifier] of matches){
  const target=resolve(dirname(path),specifier);
  assert(target.startsWith(root+sep),'escaped output directory');
  await stat(target);
 }
}
for(const [prefix,index] of [['/','index.html'],['/GenEWrist/','index.html']]){
 const href=new URL('./src/main.js','https://example.test'+prefix+index).pathname;
 assert.equal(href,prefix+'src/main.js');
}
console.log('Static build OK: '+paths.length+' files, modules and /GenEWrist/ subpath assets');
