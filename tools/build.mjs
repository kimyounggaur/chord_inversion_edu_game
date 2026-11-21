import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const files = ['theory.js','words.js','flow.js','seeds.js','state.js','stage.js','audio.js','screens.js','input.js','tests.js','ui-audit.js','boot.js'];
const source = files.map(f => '\n// SOURCE ' + f + '\n' + fs.readFileSync(path.join(root, 'src', f),'utf8')).join('\n');
const css = ['style.css','product.css','screens.css','lab.css'].map(f => fs.readFileSync(path.join(root,'src',f),'utf8')).join('\n');
const html = fs.readFileSync(path.join(root,'src/frame.html'),'utf8')
 .replace('/*{{STYLE}}*/', () => css).replace('/*{{SCRIPT}}*/',() => source);
fs.writeFileSync(path.join(root,'dist/index.html'),html);
console.log(JSON.stringify({bytes:Buffer.byteLength(html),files:files.length}));
