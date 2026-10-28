import {rm,mkdir,cp,readFile} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
await cp('public','dist',{recursive:true});await cp('src','dist/src',{recursive:true});
const html=await readFile('dist/index.html','utf8');
if(!html.includes('./src/main.js'))throw Error('Demo entry not found');
console.log('Built static GenEWrist demo in dist/');
