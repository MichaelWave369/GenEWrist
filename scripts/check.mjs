import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
async function list(dir){const found=await readdir(dir,{withFileTypes:true});return (await Promise.all(found.map(x=>x.isDirectory()?list(dir+'/'+x.name):[dir+'/'+x.name]))).flat();}
const paths=(await Promise.all(['src','scripts','tests'].map(list))).flat().filter(p=>/\.(m?js)$/.test(p));
for(const path of paths){const result=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});if(result.status!==0)throw Error(path+': '+result.stderr);}
console.log('Syntax OK: '+paths.length+' files');
