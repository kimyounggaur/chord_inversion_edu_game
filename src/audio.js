// AUDIO — one context, synthesized voices, complete audio-clock reservations.
let ctx = null, master = null, wave = null, noiseBuf = null, run = null, raf = 0;
const live = new Set();
const PART = [0, 1, 0.5, 0.3, 0.16, 0.08, 0.04];
function audioSettings() {
  return typeof saveData !== "undefined" && saveData.settings ? saveData.settings : { volume: 1, muted: false };
}
function applyAudioSettings() {
  if (!master || !ctx) return;
  const settings = audioSettings();
  const volume = Number.isFinite(settings.volume) ? Math.max(0, Math.min(1, settings.volume)) : 1;
  master.gain.setValueAtTime(settings.muted ? 0 : 0.8 * volume, ctx.currentTime);
  soundState();
}
function soundState() {
  const chip = $("soundChip"), hud = $("hud"), muted = audioSettings().muted;
  const ready = !!ctx && ctx.state === "running";
  if (chip) { chip.hidden = ready && !muted; chip.disabled = !!muted; chip.textContent = muted ? "음소거 중" : "소리 켜기"; }
  if (hud) hud.classList.toggle("nosound", !ready || muted);
  if (!ready && run && !run.perf && run.advanced) stopRun(true);
}
function audio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      const context = new AC();
      const gain = context.createGain();
      gain.connect(context.destination);
      const periodic = context.createPeriodicWave(new Float32Array(PART.length), new Float32Array(PART));
      const buffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.3), context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      ctx = context; master = gain; wave = periodic; noiseBuf = buffer;
      ctx.addEventListener("statechange", soundState);
      applyAudioSettings();
    }
    if (ctx.state !== "running" && ctx.state !== "closed") {
      const resumed = ctx.resume();
      if (resumed && resumed.catch) resumed.catch(soundState);
    }
    soundState();
    return ctx.state === "closed" ? null : ctx;
  } catch (error) { return null; }
}
function keep(node) {
  live.add(node);
  node.addEventListener("ended", () => live.delete(node));
}
function silence() {
  live.forEach(node => { try { node.stop(); } catch (error) { /* Node already finished. */ } });
  live.clear();
}
function scheduleAudioEvents(context, events, t0, destination, periodicWave, onNode) {
  return events.map(event => {
    const oscillator = context.createOscillator(), gain = context.createGain();
    const start = t0 + event.at, peak = event.peak;
    oscillator.setPeriodicWave(periodicWave);
    oscillator.frequency.setValueAtTime(hz(event.midi), start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(peak, start + 0.012);
    gain.gain.setValueAtTime(peak, start + Math.max(0.02, event.dur - 0.08));
    gain.gain.linearRampToValueAtTime(0.0001, start + event.dur);
    oscillator.connect(gain); gain.connect(destination);
    oscillator.start(start); oscillator.stop(start + event.dur + 0.05);
    if (onNode) onNode(oscillator);
    return oscillator;
  });
}
function tone(mid, when, dur, peak) {
  if (!ctx) return;
  scheduleAudioEvents(ctx, [{ midi: mid, at: 0, dur, peak }], when, master, wave, keep);
}
function burst(when, dur, freq, q, peak) {
  if (!ctx) return;
  const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
  source.buffer = noiseBuf; filter.type = "bandpass"; filter.frequency.value = freq; filter.Q.value = q;
  gain.gain.setValueAtTime(peak, when); gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  source.connect(filter); filter.connect(gain); gain.connect(master);
  source.start(when); source.stop(when + dur + 0.02); keep(source);
}
function fx(kind) {
  const context = audio();
  if (!context || context.state !== "running" || audioSettings().muted) return;
  const t = context.currentTime + 0.01;
  if (kind === "good") {
    burst(t, 0.05, 2600, 5, 0.35);
    burst(t + 0.07, 0.07, 3600, 5, 0.3);
  } else burst(t, 0.12, 320, 1.2, 0.5);
}
function sound(events, lead = 0.02) {
  stopRun(false);
  const context = audio();
  if (!context || audioSettings().muted) return;
  scheduleAudioEvents(context, events, context.currentTime + lead, master, wave, keep);
}
function hear(lead = 0.12) {
  stopRun(false);
  const view = typeof currentView === "function" ? currentView() : show(App.m, App.s);
  if (!App.m || !view) return;
  const plan = planListen(App.m.ch, view.v), context = audio();
  const perf = !context || !!audioSettings().muted;
  const t0 = (perf ? performance.now() / 1000 : context.currentTime) + lead;
  if (!perf) scheduleAudioEvents(context, plan.ev, t0, master, wave, keep);
  run = { t0, p: plan, end: t0 + plan.end, perf, mark: view.lamp, ctx0: context ? context.currentTime : 0,
    p0: performance.now(), on: "", last: null, lastAt: performance.now(), advanced: false };
  setState({ playing: true });
  raf = requestAnimationFrame(frame);
}
function paint(key) {
  document.querySelectorAll("#tokens .tok").forEach(element => element.classList.toggle("is-on", key === "all" || key === element.dataset.k));
}
function clock() {
  return run && run.perf ? performance.now() / 1000 : ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
}
function frame() {
  const active = run;
  if (!active) return;
  if (!active.perf && ctx.currentTime !== active.ctx0) active.advanced = true;
  if (!active.perf && performance.now() - active.p0 > 1200 && !active.advanced) {
    const shift = performance.now() / 1000 + 0.1 - active.t0;
    active.perf = true; active.t0 += shift; active.end += shift; silence();
    soundState();
  }
  const now = clock();
  if (!active.perf) {
    if (now !== active.last) { active.last = now; active.lastAt = performance.now(); }
    else if (active.advanced && performance.now() - active.lastAt > 800) { stopRun(true); return; }
  }
  const elapsed = now - active.t0, index = Math.floor(elapsed / STEP_S);
  const key = !active.mark || elapsed < 0 || elapsed >= active.p.end - 0.1 ? ""
    : index < active.p.n ? String(active.p.ev[index].k)
    : elapsed >= active.p.n * STEP_S + 0.1 ? "all" : "";
  if (key !== active.on) { active.on = key; paint(key); }
  if (now >= active.end) { stopRun(false); return; }
  raf = requestAnimationFrame(frame);
}
function stopRun(notify = false) {
  cancelAnimationFrame(raf); raf = 0; silence();
  const previous = run;
  run = null;
  if (previous) paint("");
  if (!previous && !App.playing) return;
  const patch = { playing: false };
  if (notify && App.s) patch.s = Object.assign({}, App.s, { msg: say("warn", "소리가 멈췄어요. 소리 켜기를 누르고 다시 들어 보세요.", "sound") });
  setState(patch);
}
// AU-04 uses the same oscillator reservation path without creating an AudioContext.
function auditAudioReservation() {
  const nodes = [];
  const parameter = () => ({ setValueAtTime() {}, linearRampToValueAtTime() {} });
  const fake = {
    createOscillator() {
      const node = { midiHz: null, starts: [], stops: [], setPeriodicWave() {}, connect() {},
        frequency: { setValueAtTime(value, time) { node.midiHz = value; node.frequencyTime = time; } },
        start(time) { this.starts.push(time); }, stop(time) { this.stops.push(time); } };
      nodes.push(node); return node;
    },
    createGain() { return { gain: parameter(), connect() {} }; }
  };
  const ch = chord("C"), voices = byMember(voicing(ch, "E4 G4 C5")), plan = planListen(ch, voices);
  scheduleAudioEvents(fake, plan.ev, 10, {}, {}, () => {});
  const expectedMidi = [64, 67, 72, 64, 67, 72], expectedStart = [10, 10.5, 11, 11.6, 11.6, 11.6];
  const near = (a, b) => Math.abs(a - b) < 1e-8;
  const valid = nodes.length === 6 && nodes.every((node, index) => near(node.midiHz, hz(expectedMidi[index])) &&
    near(node.starts[0], expectedStart[index]) && near(node.frequencyTime, expectedStart[index]) &&
    near(node.stops[0], expectedStart[index] + (index < 3 ? 0.51 : 1.35)));
  nodes.forEach(node => node.stop(10.1));
  return valid && nodes.every(node => node.stops.length === 2 && node.stops[1] < node.stops[0]);
}
document.addEventListener("visibilitychange", () => { if (document.hidden && run) stopRun(true); });
