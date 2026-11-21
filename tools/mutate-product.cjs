// Mutates one copy of the actual production source and executes page-test predicates.
const fs = require('node:fs');
const path = require('node:path');
const {runProduct,root} = require('./test-product.cjs');
const mutations = JSON.parse(fs.readFileSync(path.join(__dirname,'mutations.json'),'utf8'));
const baseline = runProduct();
if (baseline.fails.length) throw new Error('Product baseline failed: '+JSON.stringify(baseline.fails));
const rows = [];
for (const [id,file,description,originalFind,originalReplacement] of mutations) {
  const source = fs.readFileSync(path.join(root,'src',file+'.js'),'utf8');
  let find=originalFind, replacement=originalReplacement;
  if (id==='F21') {find=find.replace('INV_SHORT[k]','invShort(k)');replacement=replacement.replace('INV_SHORT[k]','invShort(k)');}
  const matches=source.split(find).length-1;
  if(matches!==1) {rows.push({id,description,status:'NOT_APPLIED',matches});continue;}
  const result=runProduct({[file]:source.replace(find,()=>replacement)});
  rows.push({id,description,status:result.error?'ERROR':result.fails.length?'KILLED':'SURVIVED',failedIds:result.results?.filter(x=>!x.pass).map(x=>x.id),errors:result.error?result.fails:undefined});
}
const result={baseline:{pass:baseline.pass,total:baseline.total},killed:rows.filter(x=>x.status==='KILLED').length,total:rows.length,rows};
fs.mkdirSync(path.join(root,'docs','checks'),{recursive:true});
fs.writeFileSync(path.join(root,'docs','checks','product-mutations.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({baseline:result.baseline,killed:result.killed,total:result.total,unresolved:rows.filter(x=>x.status!=='KILLED')}));
process.exitCode=result.killed===result.total?0:1;
