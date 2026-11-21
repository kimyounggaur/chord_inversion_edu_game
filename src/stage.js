// Inline music symbols use the same artwork in notes, cards, choices and prose.
function escapeMusicText(text) {
  return String(text).replace(/[&<>"']/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[c]));
}
function musicHTML(text) {
  const symbols = {
    "♯": '<svg class="accidental" data-symbol="♯" viewBox="0 0 12 22" aria-hidden="true" focusable="false"><path d="M4 2v18M8 1v18M1 8l10-3v4L1 12zM1 15l10-3v4L1 19z"/></svg>',
    "♭": '<svg class="accidental" data-symbol="♭" viewBox="0 0 11 22" aria-hidden="true" focusable="false"><path d="M3 1v19C13 15 11 7 3 12M3 12c4-2 5 2 0 6"/></svg>',
    "𝄪": '<svg class="accidental" data-symbol="𝄪" viewBox="0 0 14 22" aria-hidden="true" focusable="false"><path d="M2 6l10 10M12 6L2 16M2 6h3M2 6v3M12 6H9M12 6v3M2 16h3M2 16v-3M12 16H9M12 16v-3"/></svg>',
    "𝄫": '<svg class="accidental double-flat" data-symbol="𝄫" viewBox="0 0 18 22" aria-hidden="true" focusable="false"><path d="M2 1v19C12 15 10 7 2 12M2 12c4-2 5 2 0 6M10 1v19C20 15 18 7 10 12M10 12c4-2 5 2 0 6"/></svg>'
  };
  const spoken = {"♯":"샵", "♭":"플랫", "𝄪":"겹샵", "𝄫":"겹플랫"};
  return Array.from(String(text)).map(c => symbols[c] ? `<span class="music-acc" role="img" aria-label="${spoken[c]}">${symbols[c]}</span>` : escapeMusicText(c)).join("");
}
function musicTextOf(element) {
  return Array.from(element.childNodes).map(node => {
    if (node.nodeType === 3) return node.textContent;
    if (node.dataset && node.dataset.symbol) return node.dataset.symbol;
    return musicTextOf(node);
  }).join("");
}
function drawAccidental(a, x, y, size) {
  if (!a) return "";
  const char = ACC_TXT[a + 2];
  const svg = musicHTML(char).match(/<svg[\s\S]*?<\/svg>/)[0];
  return svg.replace("<svg ", `<svg x="${x}" y="${y - size * 1.4}" style="width:${size * 1.6}px;height:${size * 2.8}px" `);
}
// ═══ 5 VIEW ═══ 틀은 한 번만 만든다. 무대 안은 그릴 내용이 바뀔 때만 다시 그린다
let G = null, mounted = "", chipsKey = "", dynKey = "";
const CLEF = "M0.25 3.65C-0.8 4.1-1.35 2.65-0.35 2.4C0.65 2.2 1.05 3.35 0.25 3.65C1.0 3.3 0.5 0.6 0.1-1.8C-0.3-4.1-0.6-6.2 0.15-7.1C1.0-6.45 1.25-5.1 0.65-4.4C0.0-3.6-1.6-2.4-1.6-1.0C-1.6 0.6-0.05 1.25 1.1 0.65C2.35-0.05 1.15-1.8 0.05-1.25C-0.85-0.8-0.65 0.35 0.2 0.5";
function layout() {                                                               // 무대의 치수: 오선 한 자리의 높이 s를 무대 높이에서 정한다. 한 무대 한 배율
  const st = $("stage"), W = st.clientWidth, H = st.clientHeight, n = App.m.ch.n;
  const kbH = 46, areaH = H - kbH - 6, th = 44, padH = 22;
  const s = Math.max(8, Math.min(18, Math.floor((areaH - th - padH - 2) / (FRAME.hi - FRAME.lo)), Math.floor((W - 216) / 8.6)));   // 높이와 폭에서 정한다. 음 넷이 44px 넘게 서야 한다
  const top = Math.max(1, Math.floor((areaH - (th + (FRAME.hi - FRAME.lo) * s + padH)) / 2));
  const clefW = Math.round(s * 3.3), blockW = Math.round(s * 5.3), x0 = clefW + blockW + 6, colW = (W - x0 - 2) / n, tw = Math.min(54, Math.floor(colW - 6));
  return { W, H, n, kbH, kbY: H - kbH, s, th, tw, top, clefW, blockW, x0, colW, floor: top + th + (FRAME.hi - FRAME.lo) * s + 3,
    y: (p) => top + th / 2 + (FRAME.hi - p) * s, x: (c) => x0 + colW * (c + 0.5), kw: W / (FRAME.hi - FRAME.lo + 1) };
}
const whiteAt = (i) => ({ l: i % STEPS, a: 0, o: note("C4").o + Math.floor(i / STEPS) });   // 무대의 i번째 흰건반
function keyOf(mid) {                                                             // 건반 번호 → 건반 띠의 자리. 흰건반이면 그 칸, 검은건반이면 왼쪽 흰건반의 칸
  for (let i = 0; i <= FRAME.hi - FRAME.lo; i++) { const w = midi(whiteAt(i)); if (w === mid) return { i, black: false }; if (w + 1 === mid && MAJOR[i % STEPS] === 2) return { i, black: true }; }
  return null;
}
function drawStatic() {
  const g = G, lo = FRAME.lo;
  let h = "";
  for (const r of [2, 4, 6, 8, 10]) h += `<line class="staffline" x1="3" x2="${g.W - 3}" y1="${g.y(lo + r)}" y2="${g.y(lo + r)}"/>`;
  h += `<line class="divider" x1="${g.x0 - 3}" x2="${g.x0 - 3}" y1="${g.y(lo + 10)}" y2="${g.y(lo + 2)}"/>`;
  h += `<g transform="translate(${3 + g.clefW * 0.56} ${g.y(lo + 4)}) scale(${g.s} ${g.s})"><path class="clef" d="${CLEF}" stroke-width="0.28"/></g>`;
  for (let i = 0; i <= FRAME.hi - lo; i++) h += `<rect class="wkey" x="${i * g.kw}" y="${g.kbY}" width="${g.kw}" height="${g.kbH}"/>`;
  for (let i = 0; i < FRAME.hi - lo; i++) if (MAJOR[i % STEPS] === 2) h += `<rect class="bkey" x="${(i + 1) * g.kw - g.kw * 0.3}" y="${g.kbY}" width="${g.kw * 0.6}" height="${g.kbH * 0.58}" rx="2"/>`;
  $("bgStatic").innerHTML = h;
}
const ROLE_VAR = (k) => `var(--r${k})`;
function drawDyn(w) {                                                             // 덧줄, 쌓은 화음, 밑음 자리의 빛, 틈, 건반의 불
  const g = G, ch = App.m.ch, lo = FRAME.lo, o = order(ch, w.v);
  let h = "";
  const ledger = (cx, half, p) => { const r = p - lo; let s = ""; if (r <= 0) s += `<line class="ledger" x1="${cx - half}" x2="${cx + half}" y1="${g.y(lo)}" y2="${g.y(lo)}"/>`; for (const q of [12, 14]) if (r >= q) s += `<line class="ledger" x1="${cx - half}" x2="${cx + half}" y1="${g.y(lo + q)}" y2="${g.y(lo + q)}"/>`; return s; };
  const rx = g.s * 1.22, ry = g.s * 0.9, bx = g.clefW + g.blockW * 0.36;
  let prev = null, shifted = false;
  o.forEach((i) => {                                                              // 쌓은 화음(세로): 2도로 붙은 음은 옆으로 비켜 적는다
    const p = posAt(ch, w.v[i]), k = w.v[i].k; shifted = prev !== null && p - prev === 1 && !shifted; prev = p;
    const cx = bx + (shifted ? rx * 2 - 2 : 0);
    h += ledger(cx, rx + 5, p) + `<ellipse class="head" cx="${cx}" cy="${g.y(p)}" rx="${rx}" ry="${ry}" transform="rotate(-18 ${cx} ${g.y(p)})" style="fill:${w.roles ? ROLE_VAR(k) : "var(--plainTok)"}"/>`;
    h += drawAccidental(ch.tones[k].a, cx - rx - g.s * 1.65, g.y(p), g.s);
    h += ledger(g.x(w.col[k]), g.tw / 2 + 6, p);
  });
  if (w.esc) for (const d of [1, -1]) {                                           // 에스컬레이터: 탈 음에서 내릴 자리까지 비스듬한 길. 무대 밖이면 그리지 않는다
    const i = w.rider !== null ? w.rider : d > 0 ? o[0] : o[o.length - 1], nv = move(w.v, i, d), k = w.v[i].k; if (!inFrame(ch, nv)) continue;
    const x1 = g.x(w.col[k]), y1 = g.y(posAt(ch, w.v[i])), x2 = g.x(order(ch, nv).indexOf(i)), y2 = g.y(posAt(ch, nv[i]));
    const len = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / len, uy = (y2 - y1) / len, ax = x2 - ux * 9, ay = y2 - uy * 9;
    let stair = `M${x1} ${y1}`;
    const stairCount = 7;
    for (let step = 1; step <= stairCount; step++) {
      const px = x1 + (ax - x1) * step / stairCount;
      const py = y1 + (ay - y1) * step / stairCount;
      stair += `H${px}V${py}`;
    }
    h += `<g class="esc ${d > 0 ? "up" : "down"}"><line class="band" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><path class="steps" d="${stair}"/><line class="rail" x1="${x1}" y1="${y1 - 8}" x2="${ax}" y2="${ay - 8}"/><path class="tip" d="M${x2} ${y2}L${ax - uy * 6} ${ay + ux * 6}L${ax + uy * 6} ${ay - ux * 6}Z"/></g>`;
  }
  if (w.lamp) { const yb = g.y(posAt(ch, w.v[o[0]])) + g.th / 2; h += `<rect class="beam" x="${g.x(0) - 6}" y="${yb}" width="12" height="${Math.max(0, g.floor - yb)}"/>`; }
  if (w.gaps) gaps(ch, w.v).forEach((d, j) => { const a = w.v[o[j]], b = w.v[o[j + 1]], cx = (g.x(w.col[a.k]) + g.x(w.col[b.k])) / 2, cy = (g.y(posAt(ch, a)) + g.y(posAt(ch, b))) / 2; h += `<g class="gap"><rect x="${cx - 15}" y="${cy - 9}" width="30" height="18" rx="9"/><text x="${cx}" y="${cy + 4.5}">${d}도</text></g>`; });
  o.forEach((i, r) => {                                                           // 건반 띠: 지금 울릴 건반. 가장 왼쪽이 밑음
    const key = keyOf(midiAt(ch, w.v[i])), k = w.v[i].k; if (!key) return;
    const fill = w.roles ? ROLE_VAR(k) : "#ffe9a8";
    h += key.black ? `<rect x="${(key.i + 1) * g.kw - g.kw * 0.3}" y="${g.kbY}" width="${g.kw * 0.6}" height="${g.kbH * 0.58}" rx="2" style="fill:${fill};stroke:var(--ink);stroke-width:1.5"/>` : `<rect x="${key.i * g.kw + 1}" y="${g.kbY + g.kbH * 0.6}" width="${g.kw - 2}" height="${g.kbH * 0.4 - 1}" style="fill:${fill};stroke:var(--ink);stroke-width:1"/>`;
    const mark = (r === 0 && w.lamp ? "밑" : "") || (k === 0 && w.roles ? "근" : "");
    if (mark && !key.black) h += `<text class="keymark" x="${(key.i + 0.5) * g.kw}" y="${g.kbY + g.kbH - 5}">${mark}</text>`;
  });
  $("bgDyn").innerHTML = h;
}
function mount(m) {                                                               // 문제가 바뀔 때 한 번: 음 단추를 만든다
  $("tokens").innerHTML = m.ch.tones.map((_, k) => `<button type="button" class="tok" data-k="${k}"><b></b><small></small></button>`).join("");
  mounted = m.id; chipsKey = ""; dynKey = ""; G = null;
}
function chipsFor(m, s, w) {                                                      // 조작부의 보기: 고르기에서는 음, 그 밖에는 보기
  const st = m.steps[s.step];
  if (st.kind === "pick") return w.col.map((c, k) => ({ c, k })).sort((a, b) => a.c - b.c).map(({ k }) => ({ id: k, label: pcName(m.ch.tones[k]) }));
  if (st.choices) return st.choices.map((c, i) => ({ id: i, label: c.label }));
  return [];
}
function renderRun() {
  const { m, s } = App, root = $("app");
  root.classList.toggle("narrow", window.innerHeight < 620);
  $("dayName").textContent = App.screen === "lab" ? "자유 실험실" : App.day.name;
  $("dots").innerHTML = App.day.jobs.map((_, i) => `<i class="${i < App.results.length ? App.results[i].r : i === App.idx && App.screen === "run" ? "now" : ""}"></i>`).join("");
  $("dots").setAttribute("aria-label", `운행 ${App.day.jobs.length}건 가운데 ${Math.min(App.idx + 1, App.day.jobs.length)}번째`);
  if (mounted !== m.id) mount(m);
  const w = currentView(), st = m.steps[s.step], L = st.kind === "listen", ch = m.ch;
  $("askTag").textContent = translateWords(m.tag); $("askText").innerHTML = musicHTML(translateWords(m.text));
  $("plate").className = (w.plate ? "" : "none") + (w.bad ? " is-bad" : "");
  $("plateName").innerHTML = musicHTML(w.plate || "–"); $("plateSub").textContent = w.bad ? "잘못 붙음" : w.sub || (w.plate === "?" ? "가려짐" : "");
  $("plate").setAttribute("aria-label", w.plate ? "이름표 " + w.plate : "");
  const key = [$("stage").clientWidth, $("stage").clientHeight, ch.n].join("x");
  if (!G || G.key !== key) { G = layout(); G.key = key; drawStatic(); dynKey = ""; }
  const g = G, o = order(ch, w.v);
  document.querySelectorAll("#tokens .tok").forEach((el) => {
    const k = +el.dataset.k, x = w.v[k], nm = pcName(ch.tones[k]);
    el.style.width = g.tw + "px"; el.style.height = g.th + "px";
    el.style.transform = `translate(${g.x(w.col[k]) - g.tw / 2}px, ${g.y(posAt(ch, x)) - g.th / 2}px)`;
    el.firstChild.innerHTML = musicHTML(nm); el.lastChild.textContent = w.roles ? degKo(k) : ""; el.lastChild.hidden = !w.roles;
    el.className = "tok" + (w.roles ? " r" + k : "") + (s.sel === k && w.canTap ? " is-sel" : "") + (st.kind === "pick" && s.off.includes(k) && !s.fixed ? " is-off" : "");
    el.disabled = !w.canTap || (st.kind === "pick" && s.off.includes(k));
    el.setAttribute("aria-label", pcSay(ch.tones[k]) + " " + x.o + (w.roles ? ", " + degKo(k) : "") + (w.lamp && k === w.bass ? (m.plain ? ", 가장 낮은 음" : ", " + translateWords("밑음")) : ""));
    if (w.canTap) el.setAttribute("aria-pressed", String(s.sel === k)); else el.removeAttribute("aria-pressed");
  });
  const lamp = $("lamp"), lw = m.plain ? 62 : 44;
  lamp.hidden = !w.sorted; lamp.className = w.lamp ? "is-lit" : ""; lamp.textContent = w.lamp ? (m.plain ? "가장 낮음" : translateWords("밑음")) : "?";
  lamp.style.width = lw + "px"; lamp.style.transform = `translate(${g.x(0) - lw / 2}px, ${g.floor}px)`;
  const dk = JSON.stringify([w.v, w.col, w.roles, w.lamp, w.gaps, w.esc, w.rider]);
  if (dk !== dynKey) { dynKey = dk; drawDyn(w); }
  $("readout").innerHTML = musicHTML(translateWords(s.msg.text)); $("readout").className = s.msg.tone;
  // 조작부: 묶음을 미리 두고 보이기만 바꾼다
  const ride = st.kind === "ride", tool = !!st.tool, chips = chipsFor(m, s, w), ck = m.id + ":" + s.step + ":" + chips.map((c) => c.id + translateWords(c.label)).join(",");
  $("btnA").hidden = $("btnB").hidden = w.ab < 0;
  $("btnA").className = "seg" + (w.ab === 0 ? " is-sel" : ""); $("btnB").className = "seg" + (w.ab === 1 ? " is-sel" : "");
  $("btnA").setAttribute("aria-pressed", String(w.ab === 0)); $("btnB").setAttribute("aria-pressed", String(w.ab === 1));
  $("btnDown").hidden = $("btnUp").hidden = !(ride || tool);
  $("btnDown").className = $("btnUp").className = "ride" + (tool ? " mini" : "");
  $("btnDown").lastElementChild.hidden = $("btnUp").lastElementChild.hidden = tool;
  $("btnDown").setAttribute("aria-label", "내리기"); $("btnUp").setAttribute("aria-label", "올리기");
  $("btnReset").hidden = !ride;
  $("chips").hidden = !chips.length;
  if (chips.length && ck !== chipsKey) { chipsKey = ck; $("chips").innerHTML = chips.map((c) => `<button type="button" class="chip" data-id="${c.id}">${musicHTML(translateWords(c.label))}</button>`).join(""); }
  const cur = st.kind === "pick" ? s.sel : s.choice;
  document.querySelectorAll("#chips .chip").forEach((el) => { const id = +el.dataset.id, off = s.off.includes(id) && !(s.fixed && id === cur); el.className = "chip" + (id === cur ? " is-sel" : "") + (off ? " is-off" : ""); el.disabled = off; el.setAttribute("aria-pressed", String(id === cur)); });
  $("padBass").hidden = $("padUpper").hidden = !L;
  $("padBass").textContent = m.plain ? "낮은 음 치기" : translateWords("밑음 치기");
  $("btnHear").textContent = L ? "다시 듣기" : "듣기";
  $("btnOk").textContent = L ? (App.idx + 1 < App.day.jobs.length ? "다음" : "마감하기") : "확정";
}
// Run the identity check against the same note buttons used by the lesson.
function auditTokenIdentity() {
  if (!App.m || !App.s) return false;
  renderRun();
  const before = Array.from($("tokens").children);
  renderRun();
  const after = Array.from($("tokens").children);
  return before.length === App.m.ch.n && before.every((node, i) => node === after[i]);
}

function auditRenderedTheory() {
  if (!App.m || !App.s) return false;
  renderRun();
  const w = currentView(), ch = App.m.ch;
  const tokens = Array.from($("tokens").children);
  return tokens.length === ch.n && tokens.every(el => {
    const k = Number(el.dataset.k);
    return musicTextOf(el.firstChild) === pcName(ch.tones[k]) &&
      el.lastChild.textContent === (w.roles ? degKo(k) : "");
  }) && musicTextOf($("plateName")) === (w.plate || "–");
}
