// ═══ 2 FLOW ═══ 문제 모델과 흐름. 씨앗에서 정답, 보기, 까닭, 문장을 만든다. 화면과 소리를 부르지 않는다
const ASK_KO = { low: "밑음 찾기", root: "근음 찾기", both: "둘 다 찾기", make: "만들기", name: "이름 붙이기", same: "함정 탐정", fix: "이름표 수리" };
const INV_SHORT = ["기본 위치", "첫째", "둘째", "셋째"];

// 조사: 앞말의 받침을 보고 고른다. 음이름 글자(C~B)와 m(마이너)은 받침이 없고, 7(칠)과 ♯(샵) ♭(플랫)은 받침이 있다
const lastOf = (w) => Array.from(w).pop();
function batchim(w) {                                                             // 0 받침 없음, 1 받침 있음, 2 ㄹ받침
  const c = lastOf(w), u = c.codePointAt(0);
  if (u >= 0xac00 && u <= 0xd7a3) { const f = (u - 0xac00) % 28; return f === 0 ? 0 : f === 8 ? 2 : 1; }
  if (c >= "0" && c <= "9") return "178".includes(c) ? 2 : "036".includes(c) ? 1 : 0;
  return ACC_TXT.includes(c) && c ? 1 : 0;
}
const josa = (w, pair) => w + pair.split("/")[batchim(w) ? 0 : 1];                // josa("C", "은/는") → "C는"
const ro = (w) => w + (batchim(w) === 1 ? "으로" : "로");
const ye = (w) => w + (batchim(w) ? "이에요" : "예요");
const raseo = (w) => w + (batchim(w) ? "이라서" : "라서");

// 씨앗으로 섞기: 같은 문제는 늘 같은 순서
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
function shuffled(arr, seed) { const r = rng(seed), a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// 문제 모델: 씨앗(방식, 화음, 처음 배치, 목표)에서 단계와 정답을 만든다
function build(job, day = {}) {
  const ch = chord(job.chord), v0 = byMember(voicing(ch, job.from)), nm = (k) => pcName(ch.tones[k]);
  const m = { id: job.id, ask: job.ask, tag: ASK_KO[job.ask], ch, v0, help: !!job.help, final: !!job.final, free: job.free !== undefined ? !!job.free : !!day.free,
    roles: job.roles !== false, plain: !!job.plain, blind: !!job.blind, row: job.row ? voicing(ch, job.row).map((x) => x.k) : null, steps: [], by: "", text: "" };
  if (job.ask === "low") { m.steps.push({ kind: "pick", want: "bass" }); m.text = m.plain ? "가장 낮은 음을 골라 주세요." : "밑음을 골라 주세요."; }
  if (job.ask === "root") { m.steps.push({ kind: "pick", want: "root", tool: m.blind }); m.text = m.blind ? "이름표가 가려졌어요. 근음을 찾아 주세요." : "근음을 골라 주세요."; }
  if (job.ask === "both") { m.steps.push({ kind: "pick", want: "root" }, { kind: "pick", want: "bass" }); m.text = "근음과 밑음을 차례로 골라 주세요."; }
  if (job.ask === "make") {
    const to = job.to;
    if (to === "keep") { m.by = "keep"; m.target = { keep: true }; m.text = "밑음은 그대로 두고 다른 음 하나를 옮겨 주세요."; }
    else if (to.inv !== undefined) { m.by = "inv"; m.target = { k: to.inv }; m.text = josa(invName(to.inv), "을/를") + " 만들어 주세요."; }
    else if (to.sym) { const s = slash(to.sym); m.by = "sym"; m.target = { k: s && s.ch.id === ch.id ? s.k : -1 }; m.text = josa(symOfInv(ch, Math.max(0, m.target.k)), "을/를") + " 만들어 주세요."; }
    else { const p = pc(to.bass); m.by = "bass"; m.target = { k: ch.tones.findIndex((t) => t.l === p.l && t.a === p.a) }; m.text = josa(pcName(p), "이/가") + " 가장 낮게 서도록 만들어 주세요."; }
    m.steps.push({ kind: "ride" });
  }
  if (job.ask === "name") {
    const t = inversion(ch, v0);
    let cs = ch.tones.map((_, k) => ({ label: job.by === "sym" ? symOfInv(ch, k) : invShort(k), tag: "inv", k }));
    if (job.by === "sym" && job.trap && t) cs = shuffled([cs[t], cs[0], { label: nm(t) + "/" + nm(0), tag: "swap" }, { label: nm(t) + ch.sym.slice(nm(0).length), tag: "newroot" }], hash(job.id));
    m.by = job.by === "sym" ? "sym" : "inv";
    m.steps.push({ kind: "choose", choices: cs, answer: cs.findIndex((c) => c.tag === "inv" && c.k === t) });
    m.text = m.by === "sym" ? "이 화음의 이름표를 골라 주세요." : "이 화음은 어느 자리일까요?";
  }
  if (job.ask === "same") {
    m.vb = byMember(voicing(ch, job.b));
    m.steps.push({ kind: "judge", choices: [{ label: "같아요" }, { label: "달라요" }], answer: inversion(ch, v0) === inversion(ch, m.vb) ? 0 : 1 });
    m.text = "A와 B는 같은 자리바꿈일까요?";
  }
  if (job.ask === "fix") {                                                        // 잘못 붙은 이름표: 화음 이름이 틀렸나, 밑음이 틀렸나, 둘 다인가
    const t = inversion(ch, v0), lab = slash(job.label), okCh = lab.ch.id === ch.id, okBass = lab.bass.l === ch.tones[t].l && lab.bass.a === ch.tones[t].a;
    m.label = lab.ch.sym + (job.label.includes("/") ? "/" + pcName(lab.bass) : "");
    m.labelOk = [okCh, okBass];
    m.steps.push({ kind: "cause", choices: [{ label: "화음 이름" }, { label: "밑음" }, { label: "둘 다" }], answer: okCh ? 1 : okBass ? 0 : 2 });
    m.steps.push({ kind: "choose", choices: ch.tones.map((_, k) => ({ label: symOfInv(ch, k), tag: "inv", k })), answer: t });
    m.by = "sym"; m.text = "잘못 붙은 이름표를 고쳐 주세요.";
  }
  m.steps.push({ kind: "listen" });
  m.tag = translateWords(m.tag);
  m.text = translateWords(m.text);
  for (const st of m.steps) if (st.choices) st.choices.forEach(c => { c.label = translateWords(c.label); });
  return m;
}

const kept = (m, v) => { const b = inversion(m.ch, m.v0); return inversion(m.ch, v) === b && v[b].o === m.v0[b].o && !sameV(v, m.v0); };   // 밑음은 그 자리, 윗음만 옮김
function right(m, s) {                                                            // 지금 단계의 답이 맞는가. 자리바꿈은 가장 낮은 음으로만 판정한다
  const st = m.steps[s.step];
  if (st.kind === "pick") return s.sel === (st.want === "root" ? 0 : inversion(m.ch, s.v));
  if (st.kind === "ride") return m.target.keep ? kept(m, s.v) : inversion(m.ch, s.v) === m.target.k;
  return s.choice === st.answer;
}
function fixV(m, s) {                                                             // 두 번째 오답 뒤에 고쳐 줄 배치: 지금 배치에서 가장 적게 옮겨 닿는 정답
  const pool = m.target.keep ? reach(m.ch, m.v0, true).filter((x) => kept(m, x.v)) : reach(m.ch, s.v, m.free).filter((x) => inversion(m.ch, x.v) === m.target.k);
  return pool.sort((a, b) => a.d - b.d)[0].v;
}

// 안내 문구: 단계의 첫 안내, 오답의 까닭(1차), 교정(2차), 마무리
function prompt(m, i, v) {
  const st = m.steps[i], b = inversion(m.ch, v), nb = pcName(m.ch.tones[b]);
  if (st.kind === "pick" && st.want === "bass") return m.plain ? "높이를 보고 가장 낮은 음을 골라요." : m.help ? "밑음은 지금 가장 낮은 음이에요." : m.ask === "both" ? "이번에는 밑음을 골라요." : "밑음을 고르고 확정을 눌러요.";
  if (st.kind === "pick") return m.blind ? (m.help ? "올리기와 내리기로 3도씩 쌓아 보세요. 맨 아래가 근음이에요." : "3도로 쌓아 근음을 찾아요.") : m.help ? "근음은 화음 이름에 적힌 음이에요." : "근음을 고르고 확정을 눌러요.";
  if (st.kind === "ride") return m.help ? (m.plain ? "지금 가장 낮은 음은 " + ye(nb) + "." : "지금 밑음은 " + nb + ", " + ye(degKo(b)) + ". " + ye(invName(b)) + ".") : m.free ? "옮길 음을 누르고 올리기나 내리기를 눌러요." : "올리기와 내리기로 줄을 바꾸고 확정을 눌러요.";
  if (st.kind === "choose") return m.ask === "fix" ? "바른 이름표를 골라요." : m.by === "sym" ? (m.help ? "슬래시 오른쪽이 밑음이에요. 이름표를 골라요." : "이름표를 고르고 확정을 눌러요.") : m.help ? "밑음이 몇 음인지 보고 골라요." : "자리를 고르고 확정을 눌러요.";
  if (st.kind === "judge") return "A와 B를 번갈아 보고 골라요.";
  if (st.kind === "cause") return "이름표 " + josa(m.label, "과/와") + " 줄을 견주어 틀린 곳을 골라요.";
  return "";
}
function why(m, s) {                                                              // 1차 오답: 내 답이 어떤 생각에서 나왔는지 가려 까닭을 말한다. [부호, 문구]
  const st = m.steps[s.step], ch = m.ch, v = s.v, b = inversion(ch, v), topK = v[topIx(ch, v)].k, nm = (k) => pcName(ch.tones[k]);
  if (st.kind === "pick" && st.want === "bass") {
    const k = s.sel;
    if (m.row && !s.sorted && k === m.row[0]) return ["order", "맨 앞에 선 음이 아니에요. 줄 선 순서 말고 높이를 보세요."];
    if (k === 0 && !m.plain) return ["root", josa(nm(k), "은/는") + " 근음이에요. 밑음은 지금 가장 낮은 음이에요."];
    if (k === topK) return ["top", josa(nm(k), "은/는") + " 가장 높은 음이에요. 가장 낮은 음을 찾아요."];
    return ["higher", nm(k) + "보다 낮은 음이 있어요. 높이를 다시 보세요."];
  }
  if (st.kind === "pick") {
    const k = s.sel;
    if (m.blind) return k === b ? ["bass", "가장 낮다고 근음은 아니에요. 3도씩 쌓이게 옮겨 보세요."] : ["stack", nm(k) + " 위로는 3도씩 쌓이지 않아요. 고르게 쌓이는 맨 아래 음을 찾아요."];
    return k === b ? ["bass", josa(nm(k), "은/는") + " 지금 밑음이에요. 근음은 화음 이름에 적힌 음이에요."] : ["member", josa(nm(k), "은/는") + " " + ye(degKo(k)) + ". 근음은 화음 이름에 적힌 음이에요."];
  }
  if (st.kind === "ride") {
    if (m.target.keep) return sameV(v, m.v0) ? ["still", "아직 아무도 옮기지 않았어요. 윗음 하나를 골라 옮겨 보세요."] : b !== inversion(ch, m.v0) ? ["bass", "밑음이 " + ro(nm(b)) + " 바뀌었어요. 밑음은 두고 윗음만 옮겨요."] : ["floor", "밑음이 다른 층으로 갔어요. 밑음은 두고 윗음만 옮겨요."];
    const t = m.target.k;
    if (sameV(v, m.v0)) return ["still", "아직 그대로예요. 올리기나 내리기로 음을 옮겨 보세요."];
    if (topK === t) return ["top", josa(nm(t), "이/가") + " 가장 높이 올라갔어요. 가장 낮아야 밑음이에요."];
    if (m.by === "bass") return ["bass", "지금 가장 낮은 음은 " + ye(nm(b)) + ". " + josa(nm(t), "이/가") + " 가장 낮아야 해요."];
    if (m.by === "sym") return ["sym", "지금 이름표는 " + ye(symOfInv(ch, b)) + ". " + (t ? "슬래시 오른쪽의 음이" : "슬래시가 없으면 근음이") + " 가장 낮아야 해요."];
    return ["inv", "지금 밑음은 " + nm(b) + ", " + ye(degKo(b)) + ". " + ye(invName(b)) + "."];
  }
  if (st.kind === "judge") {
    const ba = inversion(ch, m.v0), bb = inversion(ch, m.vb), lift = m.vb.every((x, i) => x.o - m.v0[i].o === m.vb[0].o - m.v0[0].o);
    return st.answer === 0 ? ["shape", (lift ? "모두 똑같이 옮겼을 뿐이에요." : "윗음의 자리만 달라요.") + " 밑음은 둘 다 " + ye(nm(ba)) + "."] : ["bass", "밑음이 " + nm(ba) + "에서 " + ro(nm(bb)) + " 바뀌었어요. 자리바꿈도 달라요."];
  }
  if (st.kind === "cause") {
    const t = st.answer;
    if (t === 2) return ["both", "한 군데만이 아니에요. 화음 이름과 밑음을 모두 견주어 보세요."];
    if (s.choice === 2) return ["one", (t === 1 ? "화음 이름은 맞아요." : "밑음은 맞아요.") + " 틀린 곳은 한 군데예요."];
    return t === 1 ? ["chordok", "화음 이름은 맞아요. 구성음이 그대로예요. 밑음을 보세요."] : ["bassok", "가장 낮은 음은 이름표대로예요. 화음 이름을 보세요."];
  }
  const c = st.choices[s.choice], t = st.choices[st.answer].k;
  if (m.by === "inv") {
    if (c.k === topK && topK !== t) return ["top", "가장 높은 음이 아니라 가장 낮은 음으로 정해요."];
    if (c.k === t + 1) return ["ord", "하나 밀렸어요. 근음이 밑음일 때가 기본 위치예요."];
    if (c.k === 0) return ["root", "기본 위치는 근음이 밑음일 때예요. 지금 밑음을 보세요."];
    return ["inv", "밑음이 몇 음인지 보세요. " + (ch.n === 4 ? "3음 첫째, 5음 둘째, 7음 셋째예요." : "3음이면 첫째, 5음이면 둘째예요.")];
  }
  if (c.tag === "swap") return ["swap", "슬래시 왼쪽이 화음, 오른쪽이 밑음이에요."];
  if (c.tag === "newroot") return ["newroot", "밑음이 바뀌어도 화음 이름은 그대로예요."];
  if (c.k === 0) return ["noslash", "밑음이 근음이 아니면 슬래시 뒤에 밑음을 적어요."];
  if (t === 0) return ["slash", "밑음이 근음이면 슬래시를 붙이지 않아요."];
  return ["bass", "슬래시 오른쪽에는 지금 가장 낮은 음을 적어요."];
}
function mend(m, s) {                                                             // 2차 오답: 답을 놓아 주고 까닭을 말한다. 확정을 기다린다
  const st = m.steps[s.step], ch = m.ch, b = inversion(ch, s.v), nm = (k) => pcName(ch.tones[k]);
  if (st.kind === "pick" && st.want === "bass") return "가장 낮은 음은 " + ye(nm(b)) + ". 골라 두었어요. 확정을 눌러요.";
  if (st.kind === "pick") return (m.blind ? "3도로 쌓으면 맨 아래가 " + ye(nm(0)) : ch.sym + "의 근음은 " + ye(nm(0))) + ". 골라 두었어요. 확정을 눌러요.";
  if (st.kind === "ride") {
    if (m.target.keep) return "윗음 하나만 옮겼어요. 밑음은 그대로예요. 확정을 눌러요.";
    const t = m.target.k;
    return (m.by === "inv" ? degKo(t) + " " + josa(nm(t), "이/가") + " 밑음이면 " + ye(invName(t)) : m.by === "sym" ? josa(symOfInv(ch, t), "은/는") + " " + josa(nm(t), "이/가") + " 가장 낮아요" : josa(nm(t), "이/가") + " 가장 낮게 섰어요") + ". 고쳐 두었어요. 확정을 눌러요.";
  }
  if (st.kind === "judge") return why(m, s)[1];                                   // 둘 중 하나라 2차가 없다
  if (st.kind === "cause") return ["밑음은 맞고 화음 이름이 달라요.", "화음 이름은 맞고 밑음이 달라요.", "화음 이름도 밑음도 달라요."][st.answer] + " 골라 두었어요. 확정을 눌러요.";
  const t = st.choices[st.answer].k;
  return (m.by === "inv" ? "밑음 " + josa(nm(t), "은/는") + " " + ye(degKo(t)) + ". " + ye(invName(t)) : "가장 낮은 음이 " + raseo(nm(t)) + " " + ye(symOfInv(ch, t))) + ". 골라 두었어요. 확정을 눌러요.";
}
function summary(m, v) {                                                          // 마무리: 듣기 단계에 띄우는 한 줄
  const ch = m.ch, b = inversion(ch, v), nm = (k) => pcName(ch.tones[k]);
  if (m.plain) return "가장 낮은 음은 " + ye(nm(b)) + ". 낮은 음부터 들어 보세요.";
  if (m.ask === "same") {
    const bb = inversion(ch, m.vb);
    return b === bb ? "둘 다 밑음이 " + ye(nm(b)) + ". " + ye(invName(b)) + "." : "밑음이 " + josa(nm(b), "과/와") + " " + ro(nm(bb)) + " 달라요. " + josa(invShort(b), "과/와") + " " + ye(invShort(bb)) + ".";
  }
  return symOfInv(ch, b) + ". 근음 " + nm(0) + ", 밑음 " + nm(b) + ". " + ye(invName(b)) + ".";
}

// 흐름 함수: (모델, 상태, 입력)을 받아 바뀔 값만 돌려준다. 상태를 직접 고치지 않는다
const say = (tone, text, code = "") => ({ tone, text: translateWords(text), code });
const F = {
  start: (m) => ({ step: 0, v: m.v0, sel: null, choice: null, ab: 0, tries: 0, assisted: false, sorted: !m.row, off: [], fixed: false, moved: 0, last: null, done: false, msg: say("", prompt(m, 0, m.v0)) }),
  tap(m, s, k) {                                                                  // 무대의 음을 누른다: 고르기에서는 답, 만들기에서는 탈 음. 누르는 것만으로는 채점하지 않는다
    const st = m.steps[s.step];
    if (st.kind === "pick") return s.off.includes(k) ? null : { sel: k };
    if (st.kind === "ride" && m.free) return { sel: s.sel === k ? null : k };
    return null;
  },
  ride(m, s, d) {                                                                 // 올리기(+1), 내리기(−1). 탈 음을 고르지 않았으면 가장 낮은 음이 오르고 가장 높은 음이 내린다
    const st = m.steps[s.step], ch = m.ch;
    if (st.kind !== "ride" && !st.tool) return null;
    const i = st.kind === "ride" && m.free && s.sel !== null ? s.sel : d > 0 ? bassIx(ch, s.v) : topIx(ch, s.v), w = move(s.v, i, d);
    if (!inFrame(ch, w)) return { msg: say("warn", d > 0 ? "더 올라갈 층이 없어요. 내리기를 써 보세요." : "더 내려갈 층이 없어요. 올리기를 써 보세요.", "edge") };
    return { v: w, moved: s.moved + 1, fixed: false, last: { k: s.v[i].k, from: s.v[i].o, to: w[i].o, n: s.moved + 1 }, msg: say("", prompt(m, s.step, w)) };
  },
  pick(m, s, i) { const st = m.steps[s.step]; return st.choices && !s.off.includes(i) ? { choice: i } : null; },
  flip: (m, s, w) => (m.ask === "same" && s.ab !== w ? { ab: w } : null),          // A와 B를 번갈아 본다
  reset(m, s) { const st = m.steps[s.step]; return st.kind === "ride" || st.tool ? { v: m.v0, moved: 0, sel: st.kind === "ride" ? null : s.sel, fixed: false, last: null, msg: say("", prompt(m, s.step, m.v0)) } : null; },
  confirm(m, s) {                                                                 // 채점은 여기서만 한다
    const st = m.steps[s.step];
    if (st.kind === "listen") return { done: true };
    if (st.kind === "pick" && s.sel === null) return { msg: say("warn", "먼저 음을 골라 주세요.", "empty") };
    if (st.choices && s.choice === null) return { msg: say("warn", "먼저 보기를 골라 주세요.", "empty") };
    if (right(m, s)) {
      const nx = s.step + 1, last = m.steps[nx].kind === "listen";
      return { step: nx, sel: null, choice: null, tries: 0, off: [], fixed: false, sorted: true, moved: 0, last: null, msg: say("good", last ? summary(m, s.v) : prompt(m, nx, s.v)) };
    }
    if (s.tries === 0 || st.kind === "judge") {                                   // 1차: 결과를 그대로 두고 까닭을 말한다. 틀린 보기는 끈다
      const [code, text] = why(m, s);
      return Object.assign({ tries: 1, assisted: true, msg: say("bad", text, code) }, st.kind === "pick" ? { off: s.off.concat(s.sel), sel: null } : st.choices ? { off: s.off.concat(s.choice), choice: null } : {});
    }
    const text = mend(m, s);                                                      // 2차: 답을 놓아 주고 확정을 기다린다
    if (st.kind === "pick") { const a = st.want === "root" ? 0 : inversion(m.ch, s.v); return { tries: 2, fixed: true, sel: a, off: m.ch.tones.map((_, k) => k).filter((k) => k !== a), msg: say("bad", text, "mend") }; }
    if (st.kind === "ride") return { tries: 2, fixed: true, v: fixV(m, s), sel: null, last: null, msg: say("bad", text, "mend") };
    return { tries: 2, fixed: true, choice: st.answer, off: st.choices.map((_, i) => i).filter((i) => i !== st.answer), msg: say("bad", text, "mend") };
  },
  result: (s) => (s.assisted ? "half" : "full"),                                  // ● 한 번에, ◐ 도움 받음
};

// 화면에 보일 것: 판단하기 전에는 답이 되는 표시를 가린다
function show(m, s) {
  const st = m.steps[s.step], L = st.kind === "listen", ch = m.ch, v = m.ask === "same" && s.ab ? m.vb : s.v;
  const o = order(ch, v), rank = [], sorted = s.sorted || !m.row, askRoot = st.kind === "pick" && st.want === "root", askBass = st.kind === "pick" && st.want === "bass", b = v[o[0]].k;
  o.forEach((i, r) => { rank[v[i].k] = r; });
  return {
    kind: st.kind, v, n: ch.n, bass: b, sorted, col: ch.tones.map((_, k) => (sorted ? rank[k] : m.row.indexOf(k))),
    roles: !m.plain && (L || (m.roles && !askRoot)),                              // 구성음 이름과 근음 표지판
    lamp: L || (sorted && !askBass && (askRoot || st.kind === "judge" ? m.help : true)),   // 밑음 자리의 불
    plate: m.plain ? "" : L ? symOfInv(ch, b) : m.blind ? "?" : m.ask === "fix" ? m.label : st.kind === "ride" && m.help ? symOfInv(ch, b) : ch.sym,
    sub: m.plain || (m.blind && !L) ? "" : ch.ko, bad: m.ask === "fix" && !L, gaps: m.blind && m.help && !L,
    canRide: st.kind === "ride" || !!st.tool, canTap: st.kind === "pick" || (st.kind === "ride" && m.free), ab: m.ask === "same" ? s.ab : -1,
    esc: st.kind === "ride" || !!st.tool, rider: st.kind === "ride" && m.free ? s.sel : null,   // 에스컬레이터 예고선: 탈 음(고르지 않았으면 가장 낮은 음과 가장 높은 음)이 갈 자리
  };
}

// 출제 검사: 씨앗이 풀 수 있는가, 함정이 정답과 다른가
function audit(job, day = {}) {
  const e = [], m = build(job, day), ch = m.ch, need = (c, t) => { if (!c) e.push(job.id + ": " + t); };
  need(isPlain(ch, m.v0) && inFrame(ch, m.v0), "처음 배치는 구성음이 하나씩이고 무대 안이어야 한다");
  need(vAscii(ch, m.v0) === job.from, "처음 배치는 낮은 음부터 적는다");
  if (m.row) need(m.row.length === ch.n && new Set(m.row).size === ch.n && m.row.every((k) => k >= 0) && m.row[0] !== inversion(ch, m.v0), "섞인 줄은 같은 음들이고 맨 앞이 밑음이 아니어야 한다");
  if (m.ask === "make" && m.target.keep) need(m.free && reach(ch, m.v0, true).some((x) => x.d === 1 && kept(m, x.v)), "밑음을 두고 한 번에 옮길 윗음이 있어야 한다");
  if (m.ask === "make" && !m.target.keep) {
    need(m.target.k >= 0 && m.target.k !== inversion(ch, m.v0), "목표는 이 화음의 구성음이고 처음 자리와 달라야 한다");
    need(reach(ch, m.v0, m.free).some((x) => inversion(ch, x.v) === m.target.k), "허용된 조작으로 목표에 닿아야 한다");
  }
  for (const st of m.steps) if (st.choices) need(st.answer >= 0 && st.answer < st.choices.length && new Set(st.choices.map((c) => c.label)).size === st.choices.length, "보기는 서로 다르고 정답이 그 안에 있어야 한다");
  if (m.ask === "same") need(isPlain(ch, m.vb) && inFrame(ch, m.vb) && !sameV(m.v0, m.vb) && vAscii(ch, m.vb) === job.b, "B는 무대 안에 있고 A와 다른 배치여야 한다");
  if (m.ask === "fix") need(m.label !== symbolOf(ch, m.v0) && !(m.labelOk[0] && m.labelOk[1]), "이름표가 틀려 있어야 한다");
  if (m.blind) need(inversion(ch, m.v0) !== 0, "이름표를 가린 문제는 기본 위치로 내지 않는다");
  if (m.ask === "root" && !m.blind) need(inversion(ch, m.v0) !== 0 || m.help, "근음 찾기는 근음이 밑음이 아닌 배치로 낸다(첫 안내 문제는 예외)");
  if (job.final) need(!m.help, "마감 문제에는 도움이 없어야 한다");
  return e;
}

// 소리의 예약표: 무엇을 몇 초 뒤에 얼마나 길게 낼지 정한다. 소리를 내는 쪽은 이 표를 그대로 예약한다
const STEP_S = 0.5, TOGETHER_S = 1.3;
function planListen(ch, v) {                                                      // 듣기: 낮은 음부터 하나씩(밑음이 먼저), 그다음 함께
  const o = order(ch, v), n = o.length, ev = [];
  o.forEach((i, r) => ev.push({ at: r * STEP_S, dur: STEP_S * 0.92, midi: midiAt(ch, v[i]), k: v[i].k, peak: 0.3 }));
  o.forEach((i) => ev.push({ at: n * STEP_S + 0.1, dur: TOGETHER_S, midi: midiAt(ch, v[i]), k: v[i].k, peak: 0.6 / n }));
  return { ev, end: n * STEP_S + 0.1 + TOGETHER_S + 0.1, n };
}
const planRide = (ch, last) => [{ at: 0, dur: 0.12, midi: midi({ l: ch.tones[last.k].l, a: ch.tones[last.k].a, o: last.from }), k: last.k, peak: 0.22 }, { at: 0.13, dur: 0.42, midi: midi({ l: ch.tones[last.k].l, a: ch.tones[last.k].a, o: last.to }), k: last.k, peak: 0.3 }];   // 옮긴 음: 옛 높이, 새 높이
function planPad(ch, v, upper) {                                                  // 두 손 패드: 밑음만, 또는 밑음을 뺀 윗음만
  const o = order(ch, v), pick = upper ? o.slice(1) : o.slice(0, 1);
  return pick.map((i) => ({ at: 0, dur: 0.7, midi: midiAt(ch, v[i]), k: v[i].k, peak: upper ? 0.5 / pick.length : 0.34 }));
}
