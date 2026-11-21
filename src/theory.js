// ═══ 1 THEORY ═══ 이론 엔진. 표를 두지 않고 공식 둘(장음계, 3도 쌓기)에서 만든다. 화면과 소리를 부르지 않는다
const MAJOR = [2, 2, 1, 2, 2, 2, 1];                                              // 장음계 공식: 온 온 반 온 온 온 반
const LETTERS = "CDEFGAB";
const NAT = MAJOR.slice(0, -1).reduce((a, s) => a.concat(a[a.length - 1] + s), [0]);   // 자연음의 반음값 = 공식의 누적합
const OCT = MAJOR.reduce((a, b) => a + b, 0), STEPS = MAJOR.length;               // 한 옥타브 = 반음 12개 = 글자(오선 자리) 7개
const M3 = NAT[2] - NAT[0], m3 = NAT[4] - NAT[2];                                 // 장3도(C–E), 단3도(E–G)
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);                         // 주파수 공식. 이것만 쓴다
const ACC = { bb: -2, b: -1, "": 0, "#": 1, x: 2 };
const ACC_TXT = ["𝄫", "♭", "", "♯", "𝄪"], ACC_KO = ["더블플랫", "플랫", "", "샵", "더블샵"];
const QUAL = {                                                                    // 3도 쌓기 공식(아래에서 위로). M 장3도, m 단3도
  "": { stack: "Mm", ko: "장3화음" }, m: { stack: "mM", ko: "단3화음" },
  dim: { stack: "mm", ko: "감3화음" }, aug: { stack: "MM", ko: "증3화음" },
  M7: { stack: "MmM", ko: "장7화음" }, 7: { stack: "Mmm", ko: "딸림7화음" }, m7: { stack: "mMm", ko: "단7화음" },
  m7b5: { stack: "mmM", ko: "반감7화음" }, dim7: { stack: "mmm", ko: "감7화음" },
};
const INV_KO = ["기본 위치", "첫째 자리바꿈", "둘째 자리바꿈", "셋째 자리바꿈"];     // 밑음이 근음 · 3음 · 5음 · 7음일 때
const INV_HAN = ["기본위치", "제1전위", "제2전위", "제3전위"];                       // 같은 것의 한자말(교재 표기)
const degKo = (k) => (k ? 2 * k + 1 + "음" : "근음");                              // 구성음의 이름: 근음, 3음, 5음, 7음

// 음: { l 글자(0~6), a 기호(−2~2), o 옥타브 }. 글자와 기호를 따로 둔다. E♯을 F로 바꾸지 않는다
const pc = (s) => { const m = /^([A-G])(bb|b|x|#)?$/.exec(s); return m ? { l: LETTERS.indexOf(m[1]), a: ACC[m[2] || ""] } : null; };
const note = (s) => { const m = /^([A-G](?:bb|b|x|#)?)(\d)$/.exec(s), p = m && pc(m[1]); return p ? { l: p.l, a: p.a, o: +m[2] } : null; };
const midi = (n) => OCT * (n.o + 1) + NAT[n.l] + n.a;                             // 건반 번호
const pos = (n) => STEPS * n.o + n.l;                                             // 오선 자리. 기호는 자리를 바꾸지 않는다
const pcName = (p) => LETTERS[p.l] + ACC_TXT[p.a + 2];                            // 화면에 적는 이름
const pcAscii = (p) => LETTERS[p.l] + Object.keys(ACC).find((key) => ACC[key] === p.a);
const pcSay = (p) => LETTERS[p.l] + (p.a ? " " + ACC_KO[p.a + 2] : "");            // 화면 읽기에 주는 이름

// 화음: 이름에서 구성음을 만든다. 근음에서 한 글자씩 건너며 공식의 3도를 쌓는다
function chord(id) {
  const m = /^([A-G](?:bb|b|x|#)?)(.*)$/.exec(id), q = m && QUAL[m[2]];
  if (!q) return null;
  const root = pc(m[1]), tones = [root];
  let semi = NAT[root.l] + root.a;
  for (let k = 1; k <= q.stack.length; k++) {
    semi += q.stack[k - 1] === "M" ? M3 : m3;
    const l = (root.l + 2 * k) % STEPS;                                           // 3도 위의 글자: 한 글자를 건넌다
    tones.push({ l, a: ((((semi - NAT[l]) % OCT) + OCT + 6) % OCT) - 6 });         // 그 글자에 붙는 기호
  }
  return { id, sym: pcName(root) + m[2].replace("b5", "(♭5)"), ko: q.ko, root, tones, n: tones.length };
}

// 배치: 구성음마다 { k 몇째 구성음, o 옥타브 }. v1.0의 배치는 구성음이 하나씩이고 k 순서로 둔다
const noteAt = (ch, x) => ({ l: ch.tones[x.k].l, a: ch.tones[x.k].a, o: x.o });
const midiAt = (ch, x) => midi(noteAt(ch, x));
const posAt = (ch, x) => pos(noteAt(ch, x));
const voicing = (ch, s) => s.split(" ").map((t) => { const n = note(t); return { k: n ? ch.tones.findIndex((c) => c.l === n.l && c.a === n.a) : -1, o: n ? n.o : 0 }; });
const byMember = (v) => v.slice().sort((x, y) => x.k - y.k);
const isPlain = (ch, v) => v.length === ch.n && byMember(v).every((x, i) => x.k === i);   // 구성음이 빠짐없이 하나씩
const order = (ch, v) => v.map((_, i) => i).sort((i, j) => midiAt(ch, v[i]) - midiAt(ch, v[j]));   // 낮은 순서로 늘어놓은 색인
const bassIx = (ch, v) => order(ch, v)[0];                                        // 밑음 = 실제로 가장 낮은 음. 배열의 첫 원소가 아니다
const topIx = (ch, v) => order(ch, v)[v.length - 1];
const inversion = (ch, v) => v[bassIx(ch, v)].k;                                  // 자리바꿈 번호 = 밑음이 몇째 구성음인가
const move = (v, i, d) => v.map((x, j) => (j === i ? { k: x.k, o: x.o + d } : x));   // 한 음을 옥타브만 옮긴다. 글자와 기호는 그대로
const rideUp = (ch, v) => move(v, bassIx(ch, v), 1);                              // 올리기: 가장 낮은 음이 한 옥타브 위로
const rideDown = (ch, v) => move(v, topIx(ch, v), -1);                            // 내리기: 가장 높은 음이 한 옥타브 아래로
const span = (ch, v) => midiAt(ch, v[topIx(ch, v)]) - midiAt(ch, v[bassIx(ch, v)]);
const isClose = (ch, v) => span(ch, v) < OCT;                                     // 밀집 배치: 모든 음이 한 옥타브 안
const sameV = (a, b) => a.length === b.length && a.every((x) => b.some((y) => y.k === x.k && y.o === x.o));
const gaps = (ch, v) => { const o = order(ch, v); return o.slice(1).map((i, j) => posAt(ch, v[i]) - posAt(ch, v[o[j]]) + 1); };   // 이웃한 음 사이의 도수
const isStack = (ch, v) => gaps(ch, v).every((g) => g === 3);                     // 3도로만 쌓였는가
const FRAME = { lo: pos(note("C4")), hi: pos(note("C6")) };                       // 무대의 층: C4부터 C6까지 오선 자리 15개
const inFrame = (ch, v, f = FRAME) => v.every((x) => posAt(ch, x) >= f.lo && posAt(ch, x) <= f.hi);
function closeV(ch, inv, lo = FRAME.lo) {                                         // 밀집 배치: inv째 구성음을 lo 자리 이상에서 가장 낮게 놓고 구성 순서대로 쌓는다
  const v = [];
  let prev = null;
  for (let j = 0; j < ch.n; j++) {
    const k = (inv + j) % ch.n;
    let o = 0;
    while (prev === null ? posAt(ch, { k, o }) < lo : midiAt(ch, { k, o }) <= prev) o++;
    v.push({ k, o });
    prev = midiAt(ch, { k, o });
  }
  return byMember(v);
}
const vText = (ch, v, oct = true) => order(ch, v).map((i) => pcName(ch.tones[v[i].k]) + (oct ? v[i].o : "")).join(" ");   // 낮은 음부터 적는다
const vAscii = (ch, v) => order(ch, v).map((i) => pcAscii(ch.tones[v[i].k]) + v[i].o).join(" ");
const symOfInv = (ch, k) => ch.sym + (k ? "/" + pcName(ch.tones[k]) : "");        // 슬래시 왼쪽은 화음, 오른쪽은 밑음
const symbolOf = (ch, v) => symOfInv(ch, inversion(ch, v));
function slash(s) {                                                               // 심벌 읽기: 밑음이 근음인가, 다른 구성음인가(자리바꿈), 화음 밖의 음인가
  const [c, b] = s.split("/"), ch = chord(c), p = b === undefined ? null : pc(b);
  if (!ch || (b !== undefined && !p)) return null;
  const k = p ? ch.tones.findIndex((t) => t.l === p.l && t.a === p.a) : 0;
  return { ch, bass: p || ch.root, k, kind: k < 0 ? "outside" : k ? "inversion" : "root" };
}
function rootLetter(letters) {                                                    // 이름 없이 근음 찾기: 어느 글자에서 한 글자씩 건너 나머지에 모두 닿는가
  const set = [...new Set(letters)];
  return set.find((r) => set.every((l) => { const d = (l - r + STEPS) % STEPS; return d % 2 === 0 && d / 2 < set.length; }));
}
function reach(ch, v0, free, f = FRAME) {                                         // 허용된 조작으로 갈 수 있는 배치 전부와 최소 조작 수(너비 우선)
  const key = (v) => byMember(v).map((x) => x.k + "." + x.o).join(" "), seen = new Map([[key(v0), { v: v0, d: 0 }]]), q = [v0];
  while (q.length) {
    const v = q.shift(), d = seen.get(key(v)).d;
    const next = free ? v.flatMap((_, i) => [move(v, i, 1), move(v, i, -1)]) : [rideUp(ch, v), rideDown(ch, v)];
    for (const w of next) if (inFrame(ch, w, f) && !seen.has(key(w))) { seen.set(key(w), { v: w, d: d + 1 }); q.push(w); }
  }
  return [...seen.values()];
}
