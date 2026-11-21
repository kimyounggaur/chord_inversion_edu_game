// ═══ 7 INPUT ═══ 입력은 순수 흐름 함수를 호출하고 한 번만 확정한다.
let labMasks = { roles: false, lamp: false, plate: false };
function currentView() {
  const view = show(App.m, App.s);
  if (App.screen !== "lab") return view;
  return Object.assign({}, view, {
    roles: !labMasks.roles, lamp: !labMasks.lamp,
    plate: labMasks.plate ? "?" : symbolOf(App.m.ch, App.s.v), sub: labMasks.plate ? "" : App.m.ch.ko,
    canRide: true, canTap: true, esc: true, rider: App.s.sel
  });
}
function onTap(k) {
  if (!["run", "lab"].includes(App.screen)) return;
  const { m, s } = App;
  const patch = F.tap(m, s, k);
  if (!patch) return;
  setFlow(patch);
  sound([{ at: 0, dur: .34, midi: midiAt(m.ch, App.s.v[k]), peak: .30 }]);
}
function onRide(direction) {
  if (!["run", "lab"].includes(App.screen)) return;
  const patch = F.ride(App.m, App.s, direction);
  if (!patch) return;
  setFlow(patch);
  if (patch.last) sound(planRide(App.m.ch, patch.last));
}
function onChip(id) {
  if (App.screen !== "run") return;
  const { m, s } = App;
  if (m.steps[s.step].kind === "pick") onTap(id);
  else setFlow(F.pick(m, s, id));
}
function onOk() {
  if (App.screen !== "run") return;
  const { m, s } = App, patch = F.confirm(m, s);
  if (patch.done) return nextJob();
  setFlow(patch);
  if (App.s.step !== s.step) {
    if (m.steps[App.s.step].kind === "listen") hear(.24);
    fx("good");
  } else if (patch.msg && patch.msg.tone === "bad") fx("bad");
}
function setSetting(key, value) {
  if (!Object.hasOwn(saveData.settings, key)) return;
  saveData.settings[key] = value;
  Store.save(saveData);
  applyAudioSettings();
  if (App.m && App.screen === "run") {
    const seed = App.day.jobs[App.idx];
    const model = build(seed, App.day);
    setState({ m: model, s: Object.assign({}, App.s, { msg: say("", prompt(model, App.s.step, App.s.v)) }) });
  } else render();
}
function resetProgress() {
  stopRun(false);
  saveData = Store.reset();
  setState({ screen: "title", session: null, results: [], closeData: null, sceneId: null, confirmReset: false, soundCheck: false });
}
function makeLabChord(id) {
  stopRun(false);
  const ch = chord(id);
  if (!ch || ch.tones.some(t => Math.abs(t.a) > 2)) return false;
  const v = closeV(ch, 0);
  if (!v) return false;
  const seed = { id: "lab-" + id, ask: "make", chord: id, from: vAscii(ch, v), to: "keep", free: true, help: true };
  const m = build(seed, { free: true });
  m.text = "음을 고르고 올리기나 내리기로 옮겨 보세요.";
  setState({ m, s: F.start(m), screen: "lab", playing: false });
  return true;
}
function enterLab() {
  stopRun(false);
  labMasks = { roles: false, lamp: false, plate: false };
  makeLabChord("C");
}
function renderLabControls() {
  $("askTag").textContent = "자유 실험실";
  $("askText").textContent = "자유롭게 옮겨 보세요.";
  $("dayName").textContent = "자유 실험실";
  $("dots").hidden = true;
  $("readout").innerHTML = musicHTML(translateWords(summary(App.m, App.s.v)));
  $("padBass").hidden = $("padUpper").hidden = false;
  $("chips").hidden = true;
  $("btnOk").hidden = true;
  $("btnHear").style.flex = "1";
  $("btnReset").hidden = false;
  const selected = App.m.ch.id;
  const letters = [...LETTERS].map(l => '<option value="' + l + '"' + (pc(selected.replace(/(?:M7|m7|7|m)$/, "")).l === LETTERS.indexOf(l) ? " selected" : "") + '>' + l + "</option>").join("");
  const rootNote = App.m.ch.root;
  const qualities = [["", "장3화음"], ["m", "단3화음"], ["M7", "장7화음"], ["7", "딸림7화음"], ["m7", "단7화음"]];
  const q = selected.slice(pcAscii(rootNote).length);
  const key = selected + JSON.stringify(labMasks);
  if ($("labPanel").dataset.key === key) return;
  $("labPanel").dataset.key = key;
  $("labPanel").innerHTML = '<button id="closeLabOptions" type="button">설정 닫기</button><label>근음 <select id="labRoot" aria-label="실험실 근음">' + letters + '</select></label>' +
    '<label>기호 <select id="labAcc" aria-label="실험실 기호">' + [[-1, "플랫"], [0, "제자리"], [1, "샵"]].map(([a, text]) => '<option value="' + a + '"' + (a === rootNote.a ? " selected" : "") + ">" + text + "</option>").join("") + '</select></label>' +
    '<label>화음 <select id="labQuality" aria-label="실험실 화음 성질">' + qualities.map(([k, text]) => '<option value="' + k + '"' + (q === k ? " selected" : "") + ">" + text + "</option>").join("") + "</select></label>" +
    '<div class="labMasks">' + [["roles", "구성음 이름"], ["lamp", WORDS.bass + " 자리"], ["plate", "이름표"]].map(([key, name]) => '<button type="button" data-mask="' + key + '" aria-pressed="' + labMasks[key] + '">' + name + (labMasks[key] ? " 보이기" : " 가리기") + "</button>").join("") + "</div>";
}
function updateLabChord() {
  const root = $("labRoot").value, a = +$("labAcc").value, quality = $("labQuality").value;
  const id = root + (a < 0 ? "b" : a > 0 ? "#" : "") + quality;
  if (!makeLabChord(id)) $("readout").textContent = "이 화음은 무대에 놓기 어려워요. 다른 근음을 골라 주세요.";
}
function renderTutorial() {
  const box = $("tutorial");
  box.hidden = true;
  if (App.screen !== "run") return;
  const cues = {
    "d0-01": App.s.sel === null ? "음 하나를 눌러 골라 보세요." : "이제 확정을 눌러요.",
    "d0-05": "올리기를 누르면 가장 낮은 음이 타요.",
    "d2-04": "내리기는 가장 높은 음을 내려요.",
    "d6-03": "먼저 옮길 음을 누른 뒤 올려 보세요."
  };
  if (cues[App.m.id] && App.s.step === 0 && (!App.s.moved || App.m.id === "d0-01")) {
    box.textContent = cues[App.m.id]; box.hidden = false;
  }
}
function render() {
  const play = ["run", "lab"].includes(App.screen);
  const reduced = saveData.settings.motion === "reduced" || (saveData.settings.motion === "system" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  document.documentElement.dataset.motion = reduced ? "reduced" : "full";
  $("app").classList.toggle("narrow", window.innerHeight < 620);
  $("app").classList.toggle("inLab", App.screen === "lab");
  const checkingSound = App.screen === "run" && App.soundCheck;
  $("soundCheck").hidden = !checkingSound;
  for (const child of $("app").children) if (child.id !== "soundCheck") child.inert = !!checkingSound;
  $("screenPanel").hidden = play;
  $("labPanel").hidden = App.screen !== "lab" || !App.labOptions;
  $("labOptionsBtn").hidden = App.screen !== "lab";
  $("plate").hidden = false;
  for (const id of ["card", "stage", "readout", "controls"]) $(id).hidden = !play;
  $("hud").hidden = !play;
  $("rotateNotice").hidden = !play || window.innerHeight >= 545;
  if (play && App.m) {
    $("dots").hidden = false;
    $("btnOk").hidden = false;
    $("btnHear").style.flex = "";
    renderRun();
    if (App.screen === "lab") renderLabControls();
    soundState();
  } else renderScreens();
  renderTutorial();
  if (checkingSound && !$("soundCheck").contains(document.activeElement)) $("soundCheck").querySelector("button").focus();
}
function setupInput() {
  $("soundCheck").addEventListener("click", event => {
    const button = event.target.closest("[data-sound-check]");
    if (!button) return;
    saveData.settings.soundChecked = true;
    Store.save(saveData);
    setState({ soundCheck: false });
    if (button.dataset.soundCheck === "no") setFlow({ msg: say("warn", "소리 켜기를 누르거나 소리 없이 계속해도 돼요.", "sound") });
    $("btnHear").focus();
  });
  $("tokens").addEventListener("click", e => {
    const node = e.target.closest(".tok");
    if (node && !node.disabled) onTap(+node.dataset.k);
  });
  $("chips").addEventListener("click", e => {
    const node = e.target.closest(".chip");
    if (node && !node.disabled) onChip(+node.dataset.id);
  });
  $("btnUp").addEventListener("click", () => onRide(1));
  $("btnDown").addEventListener("click", () => onRide(-1));
  $("btnReset").addEventListener("click", () => setFlow(F.reset(App.m, App.s)));
  $("btnA").addEventListener("click", () => setFlow(F.flip(App.m, App.s, 0)));
  $("btnB").addEventListener("click", () => setFlow(F.flip(App.m, App.s, 1)));
  $("btnHear").addEventListener("click", () => hear());
  $("btnOk").addEventListener("click", onOk);
  $("padBass").addEventListener("click", () => { recordPad(); sound(planPad(App.m.ch, currentView().v, false)); });
  $("padUpper").addEventListener("click", () => { recordPad(); sound(planPad(App.m.ch, currentView().v, true)); });
  $("homeBtn").addEventListener("click", () => goScreen("map"));
  $("soundChip").addEventListener("click", () => { audio(); soundState(); });
  $("labOptionsBtn").addEventListener("click", () => setState({ labOptions: !App.labOptions }));
  $("labPanel").addEventListener("change", updateLabChord);
  $("labPanel").addEventListener("click", e => {
    if (e.target.closest("#closeLabOptions")) { setState({ labOptions: false }); return; }
    const node = e.target.closest("[data-mask]");
    if (!node) return;
    labMasks[node.dataset.mask] = !labMasks[node.dataset.mask];
    render();
  });
  window.addEventListener("keydown", e => {
    if (e.target.closest?.("input,select,textarea,[contenteditable=true]")) return;
    if (!["run", "lab"].includes(App.screen) || !["ArrowUp", "ArrowDown"].includes(e.key) || !currentView().canRide) return;
    e.preventDefault(); onRide(e.key === "ArrowUp" ? 1 : -1);
  });
  ["click", "touchstart", "keydown"].forEach(type => window.addEventListener(type, () => { audio(); soundState(); }, { capture: true, passive: true }));
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { G = null; render(); }, 60);
  });
  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", render);
}
