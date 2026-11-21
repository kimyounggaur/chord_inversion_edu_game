// ═══ 10 TESTS ═══ 제품에 내장된 46개 검사. 실제 학습 저장은 변경하지 않는다.
function selfTest(options = {}) {
  return withWords({ bassWord: "밑음", invWord: "자리바꿈" }, () => runProductTests(options));
}
function productRuntimeSource() {
  const source = typeof PRODUCT_SOURCE === "string" ? PRODUCT_SOURCE : Array.from(document.scripts).map(s => s.textContent).join("\n");
  return source.split("// ═══ 10 TESTS")[0];
}
function auditProductStorage(mode) {
  const records = new Map();
  const adapter = { getItem: key => records.has(key) ? records.get(key) : null, setItem: (key,value) => records.set(key,value) };
  const store = createSaveStore(adapter), sample = store.defaults();
  sample.settings.volume = 0.43;
  sample.days.d0 = { passed: true, stamp: 1, runs: 2, best: 6 };
  sample.cards = ["root", "inv1"]; sample.scenes = ["S2"]; sample.causes = { top: 5, bass: 2 };
  sample.stats = { jobs: 7, full: 6, pads: 4 };
  sample.active = { day: "d1", idx: 4, results: ["full","half","full","full"], phase: "review", review: [1,3], reviewPos: 1, newCards: ["inv1"] };
  if (mode === "corrupt") {
    return ["{broken", JSON.stringify({version:2}), JSON.stringify({version:1,cards:5})].every(text => {
      records.set(SAVE_KEY,text); const fresh=createSaveStore(adapter), value=fresh.load();
      return value.version===1 && value.active===null && records.get(SAVE_KEY+"_backup")===text;
    });
  }
  if (mode === "fallback") {
    const unavailable=createSaveStore({getItem(){throw new Error("blocked");},setItem(){throw new Error("blocked");}});
    unavailable.load(); unavailable.save(sample);
    const writeBlocked=createSaveStore({getItem(){return null;},setItem(){throw new Error("blocked");}});
    writeBlocked.save(sample);
    return !unavailable.available && unavailable.load().settings.volume===0.43 && !writeBlocked.available && writeBlocked.load().stats.jobs===7;
  }
  store.save(sample); const result=createSaveStore(adapter).load();
  if (mode === "active") return JSON.stringify(result.active)===JSON.stringify(sample.active) && result.active.phase==="review" && result.active.reviewPos===1;
  if (mode === "records") return JSON.stringify(result.cards)===JSON.stringify(sample.cards) && JSON.stringify(result.causes)===JSON.stringify(sample.causes);
  records.set(SAVE_KEY,JSON.stringify({version:1,days:sample.days}));
  const old=createSaveStore(adapter).load();
  return result.version===1 && result.settings.volume===0.43 && result.days.d0.best===6 && old.settings.bassWord==="밑음" && old.stats.pads===0 && old.days.d0.passed;
}

function collectProductTexts() {
  const texts = new Set(), wrong = [], keep = t => { if (t) texts.add(t); };
  const ap=(s,p)=>Object.assign({},s,p||{});
  for (const d of DAYS.concat([SPIKE])) for(const j of d.jobs) {
    const m=build(j,d); let s=F.start(m); keep(m.text); keep(s.msg.text);
    for(let guard=0; guard<8 && m.steps[s.step].kind!=="listen";guard++) {
      const st=m.steps[s.step];
      const chk=t=>{const [code,text]=why(m,t);wrong.push({id:j.id,code,text});keep(text);keep(mend(m,t));};
      if(st.kind==="pick") {
        const answer=st.want==="root"?0:inversion(m.ch,s.v);
        m.ch.tones.forEach((_,k)=>{if(k!==answer)chk(ap(s,{sel:k}));});
        s=ap(s,{sel:answer});
      } else if(st.kind==="ride") {
        for(const x of reach(m.ch,s.v,m.free)) {const t=ap(s,{v:x.v,moved:x.d});if(!right(m,t))chk(t);keep(prompt(m,s.step,x.v));}
        s=ap(s,{v:fixV(m,s)});
      } else {st.choices.forEach((_,i)=>{if(i!==st.answer)chk(ap(s,{choice:i}));});s=ap(s,{choice:st.answer});}
      s=ap(s,F.confirm(m,s));keep(s.msg.text);
    }
  }
  ["먼저 음을 골라 주세요.", "먼저 보기를 골라 주세요.", "더 올라갈 층이 없어요. 내리기를 써 보세요.", "더 내려갈 층이 없어요. 올리기를 써 보세요.", "소리가 멈췄어요. 소리 켜기를 누르고 다시 들어 보세요."].forEach(keep);
  return {texts:[...texts],wrong};
}

// 자가검사에 더할 단언 열하나. 스파이크의 자가검사 30개가 놓친 변이를 잡는다. 제품의 검사(12.1절)에 넣는다.
function plusTest() {
  const fails = []; let pass = 0, total = 0;
  const T = (name, fn) => { total++; let ok = false; try { ok = fn() === true; } catch (e) { ok = false; } if (ok) pass++; else fails.push(name); };
  const ap = (s, p) => Object.assign({}, s, p || {});
  const job = (id) => { for (const d of DAYS.concat([SPIKE])) for (const j of d.jobs) if (j.id === id) return build(j, d); return null; };
  const fin = (id) => {                                                           // 바른 길로 끝냈을 때의 마무리 문구
    const m = job(id); let s = F.start(m), g = 0;
    while (m.steps[s.step].kind !== "listen" && g++ < 8) {
      const st = m.steps[s.step];
      if (st.kind === "pick") s = ap(s, { sel: st.want === "root" ? 0 : inversion(m.ch, s.v) });
      else if (st.kind === "ride") { if (!right(m, s)) s = ap(s, { v: fixV(m, s), moved: 1 }); }
      else s = ap(s, { choice: st.answer });
      s = ap(s, F.confirm(m, s));
    }
    return s.msg.text;
  };
  const C = chord("C");
  T("TH-13+ 폭이 꼭 한 옥타브면 밀집이 아니다", () => !isClose(C, voicing(C, "E4 C5 E5")) && isClose(C, voicing(C, "E4 G4 C5")) && !isClose(C, voicing(C, "E4 C5 G5")));
  T("TH-03+ 구성음의 이름은 근음, 3음, 5음, 7음", () => [0, 1, 2, 3].map(degKo).join(" ") === "근음 3음 5음 7음");
  T("TH-04+ 화면의 이름: B♭m7 = B♭ D♭ F A♭, D = D F♯ A", () => chord("Bbm7").tones.map(pcName).join(" ") === "B♭ D♭ F A♭" && chord("D").tones.map(pcName).join(" ") === "D F♯ A");
  T("FL-02+ 마무리 문구가 잠금 정답표(부록 B.6)와 같다", () => fin("d0-07") === "가장 낮은 음은 G예요. 낮은 음부터 들어 보세요." && fin("d1-03") === "C/G. 근음 C, 밑음 G. 둘째 자리바꿈이에요." && fin("d2-08") === "F/C. 근음 F, 밑음 C. 둘째 자리바꿈이에요."
    && fin("d3-02") === "Am/C. 근음 A, 밑음 C. 첫째 자리바꿈이에요." && fin("d4-04") === "CM7/B. 근음 C, 밑음 B. 셋째 자리바꿈이에요." && fin("d5-08") === "FM7/E. 근음 F, 밑음 E. 셋째 자리바꿈이에요."
    && fin("d6-08") === "밑음이 E와 G로 달라요. 첫째와 둘째예요." && fin("d7-08") === "E♭/B♭. 근음 E♭, 밑음 B♭. 둘째 자리바꿈이에요.");
  T("FL-03+ 2차 오답 뒤에 답이 놓여 있고 그대로 확정하면 넘어간다", () => { const m = job("d1-03"); let s = F.start(m); s = ap(s, { sel: 1 }); s = ap(s, F.confirm(m, s)); s = ap(s, { sel: 2 }); s = ap(s, F.confirm(m, s)); const ok = s.tries === 2 && s.fixed && s.sel === 0 && s.msg.code === "mend" && s.step === 0; s = ap(s, F.confirm(m, s)); return ok && s.step === 1; });
  T("FL-03+ 틀리게 옮긴 뒤 확정해도 배치가 그대로다", () => { const m = job("d2-03"); let s = F.start(m); s = ap(s, F.ride(m, s, 1)); const before = vAscii(m.ch, s.v); s = ap(s, F.confirm(m, s)); return before === "E4 G4 C5" && s.tries === 1 && s.step === 0 && vAscii(m.ch, s.v) === before; });
  T("FL-03+ 2차에 고쳐 준 배치는 가장 적게 옮긴 답이다", () => { const m = job("d2-04"); let s = F.start(m); s = ap(s, F.confirm(m, s)); s = ap(s, F.confirm(m, s)); return s.fixed && vAscii(m.ch, s.v) === "C5 E5 G5"; });
  T("FL-05+ 밑음 두기: 밑음이 다른 층으로 가면 맞지 않다", () => { const m = job("d6-03"), s = F.start(m); return right(m, ap(s, { v: byMember(voicing(m.ch, "C4 G4 E5")) })) && !right(m, ap(s, { v: byMember(voicing(m.ch, "C5 E5 G5")) })) && !right(m, ap(s, { v: byMember(voicing(m.ch, "E4 G4 C5")) })) && !right(m, s); });
  T("FL-06+ 섞인 줄은 맞히면 낮은 순서로 다시 선다", () => { const m = job("d0-03"); let s = F.start(m); const w0 = show(m, s); s = ap(s, { sel: inversion(m.ch, s.v) }); s = ap(s, F.confirm(m, s)); const w1 = show(m, s); return !w0.sorted && w1.sorted && w1.lamp && JSON.stringify(w1.col) === "[2,0,1]"; });
  T("FL-07+ 밑음을 묻는 동안 밑음 자리의 불이 꺼져 있다", () => { const a = job("d1-06"), b = job("d1-03"); let s = F.start(b); s = ap(s, { sel: 0 }); s = ap(s, F.confirm(b, s)); return show(a, F.start(a)).lamp === false && b.steps[s.step].want === "bass" && show(b, s).lamp === false; });
  T("GN-02+ 함정 탐정의 답이 8.3절의 표와 같다", () => ["d6-01", "d6-02", "d6-05", "d6-06", "d6-08"].map((id) => job(id).steps[0].answer).join("") === "01001");
  return { pass, total, fails };
}

function runProductTests(options = {}) {
  const fails = [], results = []; let pass = 0, total = 0;
  const extra = plusTest();
  const T = (name, fn) => {
    const id = name.split(" ")[0];
    if (options.engineOnly && /^(ST|SV|CT)-/.test(id)) return;
    total++; let ok = false, detail = "";
    try { ok = fn() === true && !extra.fails.some((f) => f.startsWith(id + "+")); }
    catch (error) { detail = error.message; }
    results.push({ id, name, pass: ok, detail });
    if (ok) pass++; else fails.push(name + (detail ? " — " + detail : ""));
  };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b), names = (id) => chord(id).tones.map(pcAscii).join(" ");
  const all = DAYS.concat([SPIKE]).flatMap((d) => d.jobs.map((j) => [j, d]));
  const walk = (j, d, wrong) => {                                                 // 화면 없이 운행 하나를 끝까지: 바른 길 또는 단계마다 틀리는 길
    const m = build(j, d); let s = F.start(m), g = 0; const ap = (p) => { if (p) s = Object.assign({}, s, p); };
    while (m.steps[s.step].kind !== "listen" && g++ < 8) {
      const st = m.steps[s.step], a = st.kind === "pick" ? (st.want === "root" ? 0 : inversion(m.ch, s.v)) : st.answer;
      for (let t = 0; t < (wrong ? (st.kind === "judge" ? 1 : 2) : 0); t++) { if (st.kind === "pick") ap({ sel: m.ch.tones.map((_, k) => k).find((k) => k !== a && !s.off.includes(k)) }); else if (st.choices) ap({ choice: st.choices.map((_, i) => i).find((i) => i !== a && !s.off.includes(i)) }); ap(F.confirm(m, s)); }
      if (st.kind === "pick") ap({ sel: a }); else if (st.kind === "ride") { if (!right(m, s)) ap({ v: fixV(m, s), moved: 1 }); } else ap({ choice: a });
      ap(F.confirm(m, s));
    }
    return m.steps[s.step].kind === "listen" && F.result(s);
  };
  T("TH-01 자연음 반음값은 장음계 공식의 누적합", () => same(NAT, [0, 2, 4, 5, 7, 9, 11]) && OCT === 12 && STEPS === 7 && M3 === 4 && m3 === 3);
  T("TH-02 주파수 공식", () => hz(69) === 440 && Math.abs(hz(60) - 261.6256) < 1e-3 && Math.abs(hz(81) - 880) < 1e-9);
  T("TH-03 구성음 C, Am, G7, CM7", () => names("C") === "C E G" && names("Am") === "A C E" && names("G7") === "G B D F" && names("CM7") === "C E G B");
  T("TH-04 글자는 한 칸씩 건넌다(C♯M7의 E♯, B♯)", () => names("C#M7") === "C# E# G# B#" && names("Bbm7") === "Bb Db F Ab" && names("D") === "D F# A");
  T("TH-05 오선 자리는 글자와 옥타브로만", () => pos(note("C4")) === 28 && pos(note("Cb4")) === 28 && midi(note("Cb4")) === 59 && FRAME.hi - FRAME.lo === 14);
  T("TH-06 초안: CM7을 올리면 E G B C, G B C E, B C E G", () => { const ch = chord("CM7"); let v = byMember(voicing(ch, "C4 E4 G4 B4")); const out = []; for (let i = 0; i < 5; i++) { out.push(vAscii(ch, v) + "=" + symbolOf(ch, v)); v = rideUp(ch, v); } return same(out, ["C4 E4 G4 B4=CM7", "E4 G4 B4 C5=CM7/E", "G4 B4 C5 E5=CM7/G", "B4 C5 E5 G5=CM7/B", "C5 E5 G5 B5=CM7"]); });
  T("TH-07 초안: C를 올리면 E G C, G C E, C E G", () => { const ch = chord("C"); let v = byMember(voicing(ch, "C4 E4 G4")); const out = []; for (let i = 0; i < 4; i++) { out.push(vAscii(ch, v)); v = rideUp(ch, v); } return same(out, ["C4 E4 G4", "E4 G4 C5", "G4 C5 E5", "C5 E5 G5"]); });
  T("TH-08 내리기는 올리기를 되돌린다", () => ["C", "Am", "G7", "FM7", "Eb"].every((id) => { const ch = chord(id), v = closeV(ch, 0, 14); return sameV(rideDown(ch, rideUp(ch, v)), v) && sameV(rideUp(ch, rideDown(ch, v)), v); }));
  T("TH-09 구성음 수만큼 올리면 모두 한 옥타브 위", () => ["C", "Dm", "CM7", "G7"].every((id) => { const ch = chord(id), v = closeV(ch, 0, 14); let w = v; for (let i = 0; i < ch.n; i++) w = rideUp(ch, w); return w.every((x, i) => x.o === v[i].o + 1) && inversion(ch, w) === 0; }));
  T("TH-10 자리바꿈은 가장 낮은 음으로(E3 C4 G4, E3 G4 C5)", () => { const ch = chord("C"); return inversion(ch, voicing(ch, "E3 C4 G4")) === 1 && inversion(ch, voicing(ch, "E3 G4 C5")) === 1 && inversion(ch, voicing(ch, "G4 C5 E3")) === 1; });
  T("TH-11 겹친 음이 있어도 밑음 기준", () => { const ch = chord("C"); return inversion(ch, voicing(ch, "E3 C4 G4 C5")) === 1 && inversion(ch, voicing(ch, "G3 C4 E4 G4")) === 2; });
  T("TH-12 슬래시: C/E 자리바꿈, C/D 화음 밖, CM7/B 셋째", () => slash("C/E").kind === "inversion" && slash("C/D").kind === "outside" && slash("C").kind === "root" && slash("CM7/B").k === 3);
  T("TH-13 기본 위치는 3도로만, 자리바꿈에는 틈", () => { const c = chord("C"), m7 = chord("CM7"); return same(gaps(c, voicing(c, "C4 E4 G4")), [3, 3]) && same(gaps(c, voicing(c, "E4 G4 C5")), [3, 4]) && same(gaps(m7, voicing(m7, "E4 G4 B4 C5")), [3, 3, 2]); });
  T("TH-14 글자만으로 근음 찾기", () => rootLetter([2, 4, 0]) === 0 && rootLetter([5, 0, 3]) === 3 && rootLetter([4, 6, 0, 2]) === 0);
  T("TH-15 옥타브를 어떻게 놓아도 근음은 그대로", () => ["C", "Am", "G7", "Dm7"].every((id) => { const ch = chord(id); return reach(ch, closeV(ch, 0), true).every((x) => rootLetter(x.v.map((y) => ch.tones[y.k].l)) === ch.root.l && inFrame(ch, x.v)); }));
  T("TH-16 무대 안의 밀집 배치 수: C 5, CM7 6", () => reach(chord("C"), closeV(chord("C"), 0), false).length === 5 && reach(chord("CM7"), closeV(chord("CM7"), 0), false).length === 6);
  T("FL-01 조사", () => josa("C", "은/는") === "C는" && josa("F♯", "은/는") === "F♯은" && ro("B♭") === "B♭으로" && ye("첫째 자리바꿈") === "첫째 자리바꿈이에요" && ye("기본 위치") === "기본 위치예요" && josa("CM7", "을/를") === "CM7을" && raseo("B♭") === "B♭이라서" && raseo("C") === "C라서");
  T("GN-01 씨앗 73건이 모두 출제 검사를 통과한다", () => all.length === 73 && all.every(([j, d]) => audit(j, d).length === 0 && build(j,d).steps.filter(st => st.kind === "choose").every(st => st.choices.length === (j.trap ? 4 : chord(j.chord).n) && !(chord(j.chord).n === 3 && st.choices.some(c => c.k === 3)))));
  T("GN-02 운행일별 운행 수 7 8 8 8 8 8 8 8", () => same(DAYS.map((d) => d.jobs.length), [7, 8, 8, 8, 8, 8, 8, 8]) && DAYS.every((d) => d.jobs[d.jobs.length - 1].final));
  T("FL-02 바른 길: 모든 운행이 ●로 끝난다", () => all.every(([j, d]) => walk(j, d, false) === "full"));
  T("FL-03 틀린 길: 두 번 틀리면 고쳐 주고 ◐로 끝난다", () => all.every(([j, d]) => walk(j, d, true) === "half"));
  T("FL-04 고르지 않은 확정은 채점하지 않는다", () => { const m = build(DAYS[1].jobs[2], DAYS[1]), s = F.start(m), p = F.confirm(m, s); return p.msg.code === "empty" && p.tries === undefined; });
  T("FL-05 무대 밖으로는 옮기지 않는다", () => { const m = build(DAYS[2].jobs[0], DAYS[2]), p = F.ride(m, F.start(m), -1); return p.v === undefined && p.msg.code === "edge"; });
  T("FL-06 섞인 줄에서는 밑음 자리의 불을 끈다", () => { const m = build(DAYS[0].jobs[2], DAYS[0]), w = show(m, F.start(m)); return !w.sorted && !w.lamp && same(w.col, [1, 2, 0]); });
  T("FL-07 근음을 묻는 동안 구성음 이름을 가린다", () => { const m = build(DAYS[1].jobs[2], DAYS[1]); return show(m, F.start(m)).roles === false; });
  T("FL-08 이름표 수리: Am/E는 밑음이 틀림, 바른 이름표 Am/C", () => { const m = build(DAYS[7].jobs[0], DAYS[7]); return m.label === "Am/E" && m.steps[0].answer === 1 && m.steps[1].choices[m.steps[1].answer].label === "Am/C"; });
  T("FL-09 함정 보기: F/C의 보기에 C/F와 C가 있다", () => same(build(DAYS[5].jobs[4], DAYS[5]).steps[0].choices.map((c) => c.label).sort(), ["C", "C/F", "F", "F/C"]));
  T("AU-01 듣기의 예약표: 낮은 음부터 0.5초 간격, 그다음 함께", () => { const ch = chord("C"), p = planListen(ch, byMember(voicing(ch, "E4 G4 C5"))); return same(p.ev.map((e) => [e.midi, Math.round(e.at * 100) / 100]), [[64, 0], [67, 0.5], [72, 1], [64, 1.6], [67, 1.6], [72, 1.6]]); });
  T("AU-02 옮긴 음의 소리: 옛 높이, 새 높이", () => same(planRide(chord("C"), { k: 0, from: 4, to: 5 }).map((e) => e.midi), [60, 72]));
  T("AU-03 두 손 패드: 밑음만, 윗음만", () => { const ch = chord("CM7"), v = byMember(voicing(ch, "E4 G4 B4 C5")); return same(planPad(ch, v, false).map((e) => e.midi), [64]) && same(planPad(ch, v, true).map((e) => e.midi), [67, 71, 72]); });
  T("GN-03 모든 화음의 모든 자리 배치가 무대 안", () => {
    const ids = [...new Set(DAYS.flatMap(d => d.jobs.map(j => j.chord)))];
    return ids.length === 14 && ids.every(id => { const ch = chord(id); return ch.tones.every((_,k) => inFrame(ch, closeV(ch,k))); });
  });
  T("GN-04 만들기의 최소 조작과 도움 수", () => {
    const jobs = DAYS.flatMap(d => d.jobs.map(j => [j,d]));
    return jobs.filter(([j]) => j.help).length === 12 && jobs.filter(([j]) => j.ask === "make").every(([j,d]) => {
      const m = build(j,d), r = reach(m.ch,m.v0,m.free).filter(x => right(m, Object.assign(F.start(m), {v:x.v})));
      return r.length > 0 && Math.min(...r.map(x => x.d)) >= 1 && Math.min(...r.map(x => x.d)) <= 3;
    });
  });
  T("FL-10 모든 틀린 응답에 까닭이 있음", () => collectProductTexts().wrong.length === 231 && collectProductTexts().wrong.every(x => typeof x.code === "string" && x.code.length > 0 && typeof x.text === "string" && x.text.length > 0));
  T("FL-11 금지 문구와 문장 길이", () => collectProductTexts().texts.every(t => !/정답|오답|틀렸어요|병행조/.test(t) && Array.from(t).length <= 44));
  T("AU-04 실제 예약 함수의 관측", () => auditAudioReservation());
  T("ST-01 허용된 순방향 전이", () => all.every(([j,d]) => {
    const m = build(j,d); let s = F.start(m);
    for (let guard=0; guard<10 && m.steps[s.step].kind !== "listen"; guard++) {
      const old=s.step, st=m.steps[s.step];
      if (st.kind === "pick") s=Object.assign({},s,F.tap(m,s,st.want === "root" ? 0 : inversion(m.ch,s.v)));
      else if (st.kind === "ride") s=Object.assign({},s,{v:fixV(m,s)});
      else s=Object.assign({},s,F.pick(m,s,st.answer));
      const p=F.confirm(m,s); if (p.step !== old+1 || p.done) return false; s=Object.assign({},s,p);
    }
    return m.steps[s.step].kind === "listen" && F.confirm(m,s).done === true;
  }));
  T("ST-02 상태 갱신의 단일 통로", () => {
    const code=productRuntimeSource();
    return /Object\.assign\(App,\s*patch\)/.test(setState.toString()) && !/\bApp\.\w+\s*=(?!=)/.test(code);
  });
  T("ST-03 같은 운행의 음 노드 보존", () => auditTokenIdentity());
  T("ST-04 진행 위치의 저장 복원", () => auditProductStorage("active"));
  T("SV-01 저장 v1 왕복", () => auditProductStorage("roundtrip"));
  T("SV-02 손상과 미래 버전 원문 보존", () => auditProductStorage("corrupt"));
  T("SV-03 저장 거부시 메모리 폴백", () => auditProductStorage("fallback"));
  T("SV-04 까닭과 카드 저장 왕복", () => auditProductStorage("records"));
  T("CT-01 표시가 엔진 출력과 같음", () => auditRenderedTheory());
  T("CT-02 낱말 전환과 조사", () => withWords({bassWord:"베이스",invWord:"전위"}, () => {
    const m=build(DAYS[2].jobs[0],DAYS[2]), s=F.start(m), text=say("good",summary(m,s.v)).text;
    return translateWords("밑음은 지금 가장 낮은 음이에요.").startsWith("베이스는") && /전위|기본위치/.test(text) && !/자리바꿈|밑음/.test(text) && josa("베이스","은/는")==="베이스는";
  }));
  T("CT-03 이론과 주파수의 계산식", () => {
    const code=productRuntimeSource();
    return !/const\s+(?:CHORD_TABLE|INVERSION_TABLE|FREQ_TABLE|FREQUENCIES)\b/.test(code) && /Math\.pow/.test(hz.toString()) && /MAJOR\.slice/.test(code) && /semi\s*\+=/.test(chord.toString());
  });
  return { pass, total, fails, results };
}

