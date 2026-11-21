// Product UI regression driver. Every answer and move uses the rendered controls.
let uiAuditRunning = false;
async function startUiAudit(button) {
  if (uiAuditRunning) return;
  uiAuditRunning = true;
  const output = document.getElementById("uiAuditResults");
  const report = { started: new Date().toISOString(), source: "isolated srcdoc product", layoutSetup: "openJob fixture entry", paths: [], layouts: [], progression: [], failures: [], errors: [], clicks: 0, keyboard: "NOT_RUN", devices: "NOT_RUN" };
  const update = message => { if (output) output.textContent = message; };
  if (button) button.disabled = true;
  let frame;
  try {
    const page = document.documentElement.cloneNode(true);
    page.querySelectorAll("iframe[data-ui-audit]").forEach(node => node.remove());
    const bootstrap = document.createElement("script");
    bootstrap.textContent = 'const auditMemory = new Map([["ces_save_v1",JSON.stringify({version:1,settings:{muted:true,motion:"reduced"}})]]);Object.defineProperty(window,"localStorage",{configurable:true,value:{getItem:k=>auditMemory.get(k)||null,setItem:(k,v)=>auditMemory.set(k,String(v)),removeItem:k=>auditMemory.delete(k)}});Object.defineProperty(window,"AudioContext",{configurable:true,value:undefined});Object.defineProperty(window,"webkitAudioContext",{configurable:true,value:undefined});window.__auditErrors=[];window.addEventListener("error",e=>window.__auditErrors.push(e.message));';
    page.querySelector("head").prepend(bootstrap);
    const bridge = document.createElement("script");
    bridge.textContent = 'window.__auditBridge={order,midiAt,inFrame,sameV,vAscii,right,fixV,musicTextOf,translateWords,summary,planListen};';
    page.querySelector("body").append(bridge);
    frame = document.createElement("iframe");
    frame.dataset.uiAudit = "true";
    frame.title = "제품 자동 검사 격리 화면";
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;left:-12000px;top:0;width:390px;height:844px;border:0;pointer-events:none";
    const ready = new Promise((resolve, reject) => { frame.onload = resolve; frame.onerror = () => reject(new Error("검사 화면을 열지 못했어요")); });
    frame.srcdoc = "<!DOCTYPE html>" + page.outerHTML;
    document.body.append(frame);
    await ready;
    const win = frame.contentWindow, doc = frame.contentDocument;
    if (!win.__spike || !win.__auditBridge) throw new Error("제품 검사 인터페이스를 열지 못했어요");
    const api = win.__spike, theory = win.__auditBridge;
    const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
    const require = (condition, detail) => { if (!condition) throw new Error(detail); };
    function press(selector) {
      const node = doc.querySelector(selector);
      require(node && !node.disabled && node.getBoundingClientRect().width > 0, "누를 수 없는 단추 " + selector);
      node.click(); report.clicks++;
    }
    async function openJobHash(day, index) {
      const hash = "#" + day.id + "-" + (index + 1);
      if (win.location.hash === hash) win.location.hash = "#test";
      await pause(0);
      win.location.hash = hash;
      const deadline=Date.now()+5000;
      while(Date.now()<deadline) {
        await pause(16);
        if (api.App.screen === "run" && api.App.m.id === day.jobs[index].id && api.App.s.step === 0) return;
      }
      throw new Error("운행 진입 실패 " + hash + " 실제 " + JSON.stringify({hash:win.location.hash,screen:api.App.screen,id:api.App.m?.id,step:api.App.s?.step}));
    }
    function snapshotNodes() { return Array.from(doc.querySelectorAll("#tokens .tok")); }
    function checkNodes(nodes) {
      const after=snapshotNodes();
      require(after.length===nodes.length && after.every((node,i)=>node===nodes[i]), "같은 운행에서 음 노드가 바뀌었어요");
    }
    function checkText() {
      const {m,s}=api.App, view=api.currentView();
      for (const node of snapshotNodes()) {
        const k=+node.dataset.k;
        const expected=m.ch.tones[k];
        const spelling="CDEFGAB"[expected.l]+["𝄫","♭","","♯","𝄪"][expected.a+2];
        require(theory.musicTextOf(node.firstChild)===spelling,"음 표기가 달라요 "+m.id);
      }
      const actual=theory.musicTextOf(doc.querySelector("#readout"));
      require(actual===theory.translateWords(s.msg.text),"판독 문구가 달라요 "+m.id);
      require(theory.musicTextOf(doc.querySelector("#plateName"))===(view.plate||"–"),"이름표가 달라요 "+m.id);
    }
    function routeToAnswer(m,s) {
      const key=v=>v.map(x=>x.k+":"+x.o).join(",");
      const queue=[{v:s.v,path:[]}], seen=new Set([key(s.v)]);
      for(let head=0;head<queue.length;head++) {
        const item=queue[head];
        if(theory.right(m,Object.assign({},s,{v:item.v}))) return item.path;
        const order=theory.order(m.ch,item.v);
        const moves=m.free?item.v.flatMap((_,k)=>[{k,d:1},{k,d:-1}]):[{k:order[0],d:1},{k:order[order.length-1],d:-1}];
        for(const move of moves) {
          const v=item.v.map((x,i)=>({k:x.k,o:x.o+(i===move.k?move.d:0)}));
          const id=key(v);
          if(!theory.inFrame(m.ch,v)||seen.has(id))continue;
          seen.add(id);queue.push({v,path:item.path.concat(move)});
        }
      }
      throw new Error("허용 조작으로 답에 닿지 못했어요 "+m.id);
    }
    function moveToAnswer(m,s) {
      for(const move of routeToAnswer(m,s)) {
        if(m.free && api.App.s.sel!==move.k) press('#tokens .tok[data-k="'+move.k+'"]');
        press(move.d>0?"#btnUp":"#btnDown");
      }
    }
    function chooseAnswer(m,s,wrong) {
      const step=m.steps[s.step];
      if(step.kind==="pick") {
        const answer=step.want==="root"?0:api.currentView().bass;
        const choice=wrong?m.ch.tones.map((_,k)=>k).find(k=>k!==answer&&!s.off.includes(k)):answer;
        require(choice!==undefined,"다른 음이 없어요 "+m.id);
        press('#tokens .tok[data-k="'+choice+'"]');
      } else if(step.kind==="ride") {
        if(!wrong) moveToAnswer(m,s);
        else if(theory.right(m,s)) {
          const before=theory.vAscii(m.ch,s.v);press("#btnReset");
          require(theory.vAscii(m.ch,api.App.s.v)!==before||!theory.right(m,api.App.s),"틀린 만들기를 구성할 수 없어요");
        }
      } else {
        const choice=wrong?step.choices.map((_,i)=>i).find(i=>i!==step.answer&&!s.off.includes(i)):step.answer;
        require(choice!==undefined,"다른 보기가 없어요 "+m.id);
        press('#chips .chip[data-id="'+choice+'"]');
      }
    }
    function solveCurrent(wrong) {
      const m=api.App.m, nodes=snapshotNodes();
      for(let guard=0;guard<12 && m.steps[api.App.s.step].kind!=="listen";guard++) {
        const start=api.App.s.step, step=m.steps[start];
        if(wrong) {
          const attempts=step.kind==="judge"?1:2;
          for(let attempt=0;attempt<attempts;attempt++) {
            chooseAnswer(m,api.App.s,true);press("#btnOk");checkNodes(nodes);checkText();
            require(api.App.s.step===start,"교정 전에 단계가 이동했어요 "+m.id);
          }
          if(step.kind!=="judge") require(api.App.s.fixed,"2차 교정이 없어요 "+m.id);
        }
        chooseAnswer(m,api.App.s,false);press("#btnOk");checkNodes(nodes);checkText();
        require(api.App.s.step===start+1,"확정 후 다음 단계가 열리지 않아요 "+m.id);
      }
      require(m.steps[api.App.s.step].kind==="listen","듣기 단계에 닿지 못했어요 "+m.id);
      require(api.F.result(api.App.s)===(wrong?"half":"full"),"운행 기록이 달라요 "+m.id);
    }
    function inspectLayout(width,height) {
      const errors=[], rect=id=>doc.getElementById(id).getBoundingClientRect();
      const near=(a,b)=>Math.abs(a-b)<1;
      if(doc.documentElement.scrollWidth>width+1||doc.documentElement.scrollHeight>height+1)errors.push("페이지 넘침");
      for(const id of ["hud","card","stage","readout","controls"]) {
        const r=rect(id);if(r.left<-.5||r.top<-.5||r.right>width+.5||r.bottom>height+.5)errors.push(id+" 경계");
      }
      const nodes=snapshotNodes(), stage=rect("stage");
      for(const node of nodes) {
        const r=node.getBoundingClientRect();
        if(r.width<43.5||r.height<43.5)errors.push("음 터치 크기");
        if(r.left<stage.left||r.right>stage.right||r.top<stage.top||r.bottom>stage.bottom-46)errors.push("음 무대 경계");
      }
      for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++) {
        const a=nodes[i].getBoundingClientRect(),b=nodes[j].getBoundingClientRect();
        if(a.left<b.right-.5&&a.right>b.left+.5&&a.top<b.bottom-.5&&a.bottom>b.top+.5)errors.push("음 겹침");
      }
      for(const node of doc.querySelectorAll("#controls button,#hud button")) {
        const r=node.getBoundingClientRect();if(!r.width||!r.height)continue;
        if(r.width<43.5||r.height<43.5)errors.push("단추 터치 크기 "+node.id);
      }
      if(!near(rect("hud").height,44)||!near(rect("readout").height,40)||!near(rect("controls").height,104))errors.push("고정 줄 높이");
      for(const id of ["askText","readout"]) {
        const node=doc.getElementById(id),style=win.getComputedStyle(node),r=node.getBoundingClientRect();
        if(node.scrollHeight>r.height+1)errors.push(id+" 잘림");
        if(parseFloat(style.fontSize)<12)errors.push(id+" 글자 크기");
      }
      return [...new Set(errors)];
    }
    update("운행 63건의 바른 길과 교정 경로를 확인하고 있어요.");
    for(const wrong of [false,true])for(const day of api.DAYS)for(let index=0;index<day.jobs.length;index++) {
      const id=day.jobs[index].id;
      try {await openJobHash(day,index);solveCurrent(wrong);report.paths.push({id,wrong,pass:true});}
      catch(error){report.paths.push({id,wrong,pass:false,error:error.message});report.failures.push({section:"path",id,wrong,error:error.message});}
      if(report.paths.length%12===0){update("운행 경로 "+report.paths.length+"/126 확인 중");await pause(0);}
    }
    const sizes=[[320,545],[320,568],[360,600],[360,640],[390,664],[390,844],[430,932],[800,600]];
    for(const [width,height] of sizes) {
      frame.style.width=width+"px";frame.style.height=height+"px";await pause(90);
      for(const day of api.DAYS)for(let index=0;index<day.jobs.length;index++) {
        let errors=[];
        try {api.openJob(day,index,[]);errors=inspectLayout(width,height);}
        catch(error){errors=[error.message];}
        const row={id:day.jobs[index].id,width,height,pass:errors.length===0,errors};
        report.layouts.push(row);if(errors.length)report.failures.push({section:"layout",...row});
      }
      update("화면 조합 "+report.layouts.length+"/504 확인 중");
    }
    frame.style.width="390px";frame.style.height="844px";await pause(90);
    win.location.hash="";
    const titleDeadline=Date.now()+5000;
    while(api.App.screen!=="title"&&Date.now()<titleDeadline)await pause(16);
    require(api.App.screen==="title","타이틀 진입 실패");
    press('[data-action="nav"][data-screen="map"]');
    for(const day of api.DAYS) {
      press('[data-action="day"][data-day="'+day.id+'"]');
      for(let guard=0;guard<40 && api.App.screen!=="close";guard++) {
        if(api.App.screen==="scene") {press('[data-action="scene-next"]');continue;}
        const soundNo=doc.querySelector('[data-sound-check="no"]');if(soundNo&&soundNo.getBoundingClientRect().width>0){press('[data-sound-check="no"]');continue;}
        require(api.App.screen==="run","진도 화면 중단 "+api.App.screen);
        const id=api.App.m.id;solveCurrent(false);press("#btnOk");
        report.progression.push({id,pass:true});
      }
      require(api.App.screen==="close","마감 실패 "+day.id);
      require(api.saveData.days[day.id]?.passed,"운행일 통과 기록 실패 "+day.id);
      require(api.saveData.days[day.id].best===day.jobs.length,"최고 기록 실패 "+day.id);
      press('[data-action="nav"][data-screen="map"]');
    }
    require(report.progression.length===63,"정규 진도 합계가 달라요");
    require(api.saveData.stats.pads===0,"패드 없이 완주 기록이 달라요");
    press('[data-action="nav"][data-screen="title"]');
    const storedBefore=JSON.stringify(api.saveData);
    press('[data-action="lab"]');press("#btnUp");press("#homeBtn");
    require(JSON.stringify(api.saveData)===storedBefore,"실험실에서 기록이 바뀌었어요");
    report.lab={pass:true,recordUnchanged:true};
    report.errors=win.__auditErrors.slice();
    if(report.errors.length)report.failures.push({section:"console",errors:report.errors});
  } catch(error) {report.failures.push({section:"driver",error:error.message});}
  finally {
    if(frame)frame.remove();
    report.finished=new Date().toISOString();
    report.pass=report.failures.length===0&&report.paths.length===126&&report.layouts.length===504&&report.progression.length===63;
    window.__uiAuditReport=report;
    update(JSON.stringify(report,null,2));
    if(button)button.disabled=false;
    uiAuditRunning=false;
  }
  return report;
}
