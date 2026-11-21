// Isolated regressions for production navigation, persistence, and lab model replacement.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const findings = [];
function runtime() {
  const memory = new Map(), elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { id, innerHTML: '', dataset: {}, style: {}, classList: { toggle() {} } });
    return elements.get(id);
  };
  const context = vm.createContext({ console,
    window: { localStorage: { getItem: key => memory.get(key) || null, setItem: (key, value) => memory.set(key, value) } },
    document: { getElementById: element }, render() {}, audioStops: 0,
    stopRun() { context.audioStops++; }, sound() {}, applyAudioSettings() {},
  });
  for (const name of ['theory', 'words', 'flow', 'seeds', 'state', 'stage', 'input']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'src', name + '.js'), 'utf8'), context, { filename: name + '.js' });
  }
  // UI rendering is exercised separately in-browser. These tests inspect state and stored bytes.
  vm.runInContext('render = () => {};', context);
  return { run: source => vm.runInContext(source, context), memory, elements, context };
}
function test(name, operation) {
  try { findings.push({ name, status: 'PASS', observed: operation() }); }
  catch (error) { findings.push({ name, status: 'FAIL', error: error.stack }); }
}
test('Developer spike cannot change or invalidate existing learning save', () => {
  const rt = runtime();
  rt.run('saveData.days.d0={passed:true,stamp:2,runs:1,best:7};Store.save(saveData);setState({debug:true});openJob(SPIKE,0,[],freshSession())');
  const before = rt.memory.get('ces_save_v1');
  for (let i = 0; i < 10; i++) rt.run('setState({s:Object.assign({},App.s,{step:App.m.steps.length-1})});nextJob()');
  assert.equal(rt.memory.get('ces_save_v1'), before);
  assert.equal(rt.run('Store.load().days.d0.best'), 7);
  assert.equal(rt.memory.has('ces_save_v1_backup'), false);
  assert.equal(rt.run('App.screen'), 'close');
  return { spikeRuns: 10, savedBytesUnchanged: true, preexistingBest: 7 };
});
test('Review position survives reload and completion remains 6/7', () => {
  const rt = runtime();
  rt.run('saveData.scenes=["S1"];saveData.settings.soundChecked=true;setState({debug:true});startDay("d0")');
  assert.equal(rt.run('App.debug'), false);
  rt.run('setState({s:Object.assign({},App.s,{step:App.m.steps.length-1,assisted:true})});nextJob()');
  for (let i = 1; i <= 5; i++) rt.run('setState({s:Object.assign({},App.s,{step:App.m.steps.length-1})});nextJob()');
  assert.equal(rt.run('App.session.phase'), 'review');
  assert.equal(rt.run('App.idx'), 0);
  rt.run('saveData=Store.load();setState({debug:true});resumeDay()');
  assert.equal(rt.run('App.debug'), false);
  assert.equal(rt.run('App.session.phase'), 'review');
  rt.run('setState({s:Object.assign({},App.s,{step:App.m.steps.length-1})});nextJob()');
  assert.equal(rt.run('App.idx'), 6);
  rt.run('setState({s:Object.assign({},App.s,{step:App.m.steps.length-1})});nextJob();nextJob()');
  assert.equal(rt.run('App.closeData.full'), 6);
  assert.equal(rt.run('App.closeData.passed'), true);
  assert.equal(rt.run('saveData.days.d0.runs'), 1);
  assert.equal(rt.run('saveData.stats.jobs'), 7);
  return { reviewRestored: true, firstPassFull: 6, denominator: 7, completedJobs: 7, completedDays: 1 };
});
test('Lab chord identity changes with quality and cancels preceding audio', () => {
  const rt = runtime();
  rt.run('enterLab();mount(App.m)');
  const triad = rt.run('App.m.id');
  assert.equal((rt.elements.get('tokens').innerHTML.match(/class="tok"/g) || []).length, 3);
  const before = rt.context.audioStops;
  rt.run('makeLabChord("CM7")');
  const seventh = rt.run('App.m.id');
  assert.notEqual(triad, seventh);
  assert.ok(rt.context.audioStops > before);
  rt.run('if(mounted!==App.m.id)mount(App.m)');
  assert.equal((rt.elements.get('tokens').innerHTML.match(/class="tok"/g) || []).length, 4);
  rt.run('makeLabChord("C");if(mounted!==App.m.id)mount(App.m)');
  assert.equal((rt.elements.get('tokens').innerHTML.match(/class="tok"/g) || []).length, 3);
  return { initialId: triad, seventhId: seventh, tokenCounts: [3, 4, 3], oldAudioCancelled: true };
});
test('Lab interaction leaves original active session and records unchanged', () => {
  const rt = runtime();
  rt.run('saveData.settings.soundChecked=true;startDay("d0")');
  const before = rt.memory.get('ces_save_v1');
  rt.run('enterLab();makeLabChord("CM7");onTap(2);onRide(1);recordPad();goScreen("map")');
  assert.equal(rt.memory.get('ces_save_v1'), before);
  rt.run('saveData=Store.load();resumeDay()');
  assert.equal(rt.run('App.m.id'), 'd0-01');
  return { savedBytesUnchanged: true, resumedRun: 'd0-01' };
});
test('All eight days preserve 63 original results and grant twelve cards', () => {
  const rt = runtime();
  rt.run('saveData.settings.soundChecked=true');
  for (let day = 0; day < 8; day++) {
    rt.run(`startDay('d${day}')`);
    for (let guard = 0; guard < 30 && rt.run('App.screen') !== 'close'; guard++) {
      if (rt.run('App.screen') === 'scene') { rt.run('sceneContinue()'); continue; }
      rt.run(`
        while(App.m.steps[App.s.step].kind!=='listen') {
          const st=App.m.steps[App.s.step];
          if(st.kind==='pick') setFlow(F.tap(App.m,App.s,st.want==='root'?0:inversion(App.m.ch,App.s.v)));
          else if(st.kind==='ride') setFlow({v:fixV(App.m,App.s),moved:1});
          else setFlow(F.pick(App.m,App.s,st.answer));
          setFlow(F.confirm(App.m,App.s));
        }
        nextJob();
      `);
    }
    assert.equal(rt.run('App.screen'), 'close');
    assert.equal(rt.run(`saveData.days.d${day}.stamp`), 2);
  }
  assert.equal(rt.run('saveData.stats.jobs'), 63);
  assert.equal(rt.run('saveData.stats.full'), 63);
  assert.equal(rt.run('saveData.cards.length'), 12);
  assert.equal(rt.run('saveData.scenes.length'), 8);
  return { days: 8, originalJobs: 63, full: 63, cards: 12, scenes: 8 };
});
const report = { date: new Date().toISOString(), environment: 'Node ' + process.version, scope: 'production state and storage, isolated VM with UI renderer stub', checks: findings, pass: findings.filter(x => x.status === 'PASS').length, total: findings.length };
fs.mkdirSync(path.join(root, 'docs/checks'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/checks/state-regression.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass === report.total ? 0 : 1;
