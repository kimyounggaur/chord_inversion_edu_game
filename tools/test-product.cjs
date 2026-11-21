// Executes the same pure predicates shipped by the product's page test runner.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const files = ['words', 'theory', 'flow', 'seeds', 'state', 'audio', 'tests'];
function runProduct(overrides = {}) {
  const source = Object.fromEntries(files.map(name => [name, overrides[name] ?? fs.readFileSync(path.join(root, 'src', name + '.js'), 'utf8')]));
  const context = vm.createContext({console, window:{}, document:{addEventListener(){}}, performance:{now:()=>0}, PRODUCT_SOURCE:Object.values(source).join('\n'), setTimeout, clearTimeout});
  try {
    for (const name of files) vm.runInContext(source[name], context, {filename:name+'.js',timeout:3000});
    return vm.runInContext('selfTest({engineOnly:true})',context,{timeout:30000});
  } catch(error) { return {pass:0,total:0,fails:[String(error)],error:true}; }
}
if (require.main === module) {
  const result = runProduct();
  fs.mkdirSync(path.join(root,'docs','checks'),{recursive:true});
  fs.writeFileSync(path.join(root,'docs','checks','engine-page-tests.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
  process.exitCode = result.fails.length ? 1 : 0;
}
module.exports={runProduct,root};
