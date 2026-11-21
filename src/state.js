// ═══ 4 STATE + STORAGE ═══ v1 saves and one state transition point.
const $ = (id) => document.getElementById(id);
const SAVE_KEY = "ces_save_v1";
function defaultSave() {
  return {
    version: 1,
    settings: { volume: 1, muted: false, bassWord: "밑음", invWord: "자리바꿈", motion: "system", soundChecked: false },
    days: {}, cards: [], scenes: [], causes: {}, stats: { jobs: 0, full: 0, pads: 0 }, active: null,
  };
}
const copyData = (value) => JSON.parse(JSON.stringify(value));
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isCount = (value) => Number.isInteger(value) && value >= 0;
function normalizeSave(raw) {
  if (!isRecord(raw) || raw.version !== 1) throw new Error("지원하지 않는 저장 형식");
  for (const key of ["settings", "days", "causes", "stats"]) if (raw[key] !== undefined && !isRecord(raw[key])) throw new Error("손상된 저장 항목");
  for (const key of ["cards", "scenes"]) if (raw[key] !== undefined && (!Array.isArray(raw[key]) || raw[key].some((x) => typeof x !== "string"))) throw new Error("손상된 목록");
  const value = defaultSave();
  value.settings = Object.assign(value.settings, raw.settings || {});
  const settings = value.settings;
  if (typeof settings.volume !== "number" || !Number.isFinite(settings.volume)) throw new Error("손상된 음량");
  settings.volume = Math.max(0, Math.min(1, settings.volume));
  if (!["밑음", "베이스"].includes(settings.bassWord) || !["자리바꿈", "전위"].includes(settings.invWord) || !["system", "reduced", "full"].includes(settings.motion)) throw new Error("손상된 설정");
  if (typeof settings.muted !== "boolean" || typeof settings.soundChecked !== "boolean") throw new Error("손상된 설정 값");
  for (const [id, day] of Object.entries(raw.days || {})) {
    if (!/^d[0-7]$/.test(id) || !isRecord(day)) throw new Error("손상된 운행일");
    const stored = Object.assign({ passed: false, stamp: 0, runs: 0, best: 0 }, day);
    if (typeof stored.passed !== "boolean" || ![0, 1, 2].includes(stored.stamp) || !isCount(stored.runs) || !isCount(stored.best) || stored.best > DAYS[+id[1]].jobs.length) throw new Error("손상된 운행일 기록");
    value.days[id] = stored;
  }
  value.cards = [...new Set(raw.cards || [])];
  value.scenes = [...new Set(raw.scenes || [])];
  for (const [code, count] of Object.entries(raw.causes || {})) {
    if (!isCount(count)) throw new Error("손상된 까닭 기록");
    value.causes[code] = count;
  }
  value.stats = Object.assign(value.stats, raw.stats || {});
  if (Object.values(value.stats).some((n) => !isCount(n))) throw new Error("손상된 통계");
  if (raw.active !== undefined && raw.active !== null) {
    const active = raw.active, day = DAYS.find((d) => d.id === active.day);
    if (!isRecord(active) || !day || !isCount(active.idx) || active.idx >= day.jobs.length || !Array.isArray(active.results) || active.results.length > day.jobs.length || active.results.some((r) => !["full", "half"].includes(r))) throw new Error("손상된 이어하기");
    const phase = active.phase || "original", review = active.review || [], reviewPos = active.reviewPos || 0;
    if (!["original", "review"].includes(phase) || !Array.isArray(review) || review.some((i) => !isCount(i) || i >= day.jobs.length - 1) || !isCount(reviewPos) || reviewPos > review.length) throw new Error("손상된 복습 위치");
    value.active = Object.assign({}, active, { phase, review, reviewPos, newCards: Array.isArray(active.newCards) ? active.newCards.filter((x) => typeof x === "string") : [] });
  }
  return value;
}
function createSaveStore(storage) {
  let memory = null;
  const store = {
    available: !!storage,
    defaults: defaultSave,
    load() {
      let raw = memory;
      if (store.available) {
        try { raw = storage.getItem(SAVE_KEY); }
        catch (error) { store.available = false; }
      }
      if (!raw) return defaultSave();
      try { return normalizeSave(JSON.parse(raw)); }
      catch (error) {
        if (store.available) {
          try { storage.setItem(SAVE_KEY + "_backup", raw); }
          catch (backupError) { store.available = false; }
        }
        memory = JSON.stringify(defaultSave());
        if (store.available) {
          try { storage.setItem(SAVE_KEY, memory); }
          catch (writeError) { store.available = false; }
        }
        return defaultSave();
      }
    },
    save(value) {
      memory = JSON.stringify(value);
      if (store.available) {
        try { storage.setItem(SAVE_KEY, memory); }
        catch (error) { store.available = false; }
      }
      return value;
    },
    reset() { return store.save(defaultSave()); },
  };
  return store;
}
let browserStorage = null;
try { browserStorage = window.localStorage; } catch (error) { /* In-memory sessions remain available. */ }
const Store = createSaveStore(browserStorage);
let saveData = Store.load();
const App = {
  day: DAYS[0], idx: 0, m: null, s: null, results: [], screen: "title", playing: false,
  session: null, sceneId: null, sceneFrame: 0, sceneReturn: "book", closeData: null, newCards: [],
};
function setState(patch) { Object.assign(App, patch); render(); }
function setFlow(patch) {
  if (!patch) return;
  let session = App.session;
  if (session && App.screen === "run" && patch.msg && patch.msg.tone === "bad" && patch.msg.code !== "mend") {
    const code = patch.msg.code;
    session = Object.assign({}, session, { pendingCauses: Object.assign({}, session.pendingCauses, { [code]: (session.pendingCauses[code] || 0) + 1 }) });
  }
  setState({ s: Object.assign({}, App.s, patch), session });
}
function stopCurrentAudio() { if (typeof stopRun === "function") stopRun(false); }
function freshSession() { return { phase: "original", review: [], reviewPos: 0, newCards: [], pendingCauses: {}, pendingPads: 0 }; }
function storedSession(active) {
  return Object.assign(freshSession(), { phase: active.phase || "original", review: active.review || [], reviewPos: active.reviewPos || 0, newCards: active.newCards || [] });
}
function writeActive(day, idx, results, session, scene) {
  saveData.active = {
    day: day.id, idx, results: results.map((r) => typeof r === "string" ? r : r.r), phase: session.phase,
    review: session.review.slice(), reviewPos: session.reviewPos, newCards: session.newCards.slice(), scene: scene || null,
  };
  Store.save(saveData);
}
function openJob(day, idx, results, session) {
  stopCurrentAudio();
  const m = build(day.jobs[idx], day);
  setState({ day, idx, m, s: F.start(m), results: results || App.results, session: session || App.session || freshSession(), screen: "run", playing: false, sceneId: null });
}
function isDayUnlocked(id) {
  const n = DAYS.findIndex((d) => d.id === id);
  return n === 0 || n > 0 && !!(saveData.days[DAYS[n - 1].id] && saveData.days[DAYS[n - 1].id].passed);
}
const SCENE_AFTER = { "d0-03": "S1", "d1-02": "S2", "d2-01": "S3", "d2-04": "S4", "d7-01": "S8" };
const SCENE_BEFORE = { d4: "S5", d5: "S6", d6: "S7" };
const SCENE_CARDS = { S1: ["bass", "height"], S2: ["root", "constant"], S4: ["cycle"], S6: ["slash"], S7: ["upper"], S8: ["gap"] };
function addCards(ids, session) {
  const newCards = session.newCards.slice();
  for (const id of ids) if (!saveData.cards.includes(id)) { saveData.cards.push(id); newCards.push(id); }
  return Object.assign({}, session, { newCards });
}
function startDay(id) {
  const day = DAYS.find((d) => d.id === id);
  if (!day || !isDayUnlocked(id)) return false;
  setState({ debug: false });
  const session = freshSession(), scene = SCENE_BEFORE[id];
  writeActive(day, 0, [], session, scene && !saveData.scenes.includes(scene) ? scene : null);
  openJob(day, 0, [], session);
  if (saveData.active.scene) showScene(saveData.active.scene, "run");
  if (id === "d0" && !saveData.settings.soundChecked) {
    setState({ soundCheck: true });
    if (typeof sound === "function") sound([{ at: 0, dur: .7, midi: 60, peak: .34 }]);
  }
  return true;
}
function resumeDay() {
  setState({ debug: false });
  const active = saveData.active;
  if (!active) return goScreen("map");
  const day = DAYS.find((d) => d.id === active.day);
  const results = active.results.map((r, i) => ({ id: day.jobs[i].id, tag: ASK_KO[day.jobs[i].ask], r }));
  openJob(day, active.idx, results, storedSession(active));
  if (active.scene) showScene(active.scene, "run");
}
function goScreen(screen) {
  stopCurrentAudio();
  setState({ screen, playing: false, confirmReset: false });
}
function showScene(id, returnScreen = "book") {
  stopCurrentAudio();
  setState({ screen: "scene", sceneId: id, sceneFrame: 0, sceneReturn: returnScreen, playing: false });
}
function sceneContinue() {
  if (App.screen !== "scene") return;
  const session = App.session || freshSession();
  const updated = App.sceneReturn === "run" ? addCards(SCENE_CARDS[App.sceneId] || [], session) : session;
  if (App.sceneReturn === "run") {
    if (!saveData.scenes.includes(App.sceneId)) saveData.scenes.push(App.sceneId);
    writeActive(App.day, App.idx, App.results, updated, null);
    openJob(App.day, App.idx, App.results, updated);
  } else goScreen(App.sceneReturn || "book");
}
const continueScene = sceneContinue;
function recordPad() {
  if (App.screen !== "run" || !App.session) return;
  setState({ session: Object.assign({}, App.session, { pendingPads: App.session.pendingPads + 1 }) });
}
function commitRunStats(result, session) {
  for (const [code, count] of Object.entries(session.pendingCauses)) saveData.causes[code] = (saveData.causes[code] || 0) + count;
  saveData.stats.pads += session.pendingPads;
  if (session.phase === "original") {
    saveData.stats.jobs++;
    if (result === "full") saveData.stats.full++;
  }
  return Object.assign({}, session, { pendingCauses: {}, pendingPads: 0 });
}
function finishDay(results, session) {
  const full = results.filter((r) => r.r === "full").length, total = App.day.jobs.length;
  const passed = full >= Math.ceil(total * 0.8), stamp = full === total ? 2 : passed ? 1 : 0;
  const previous = saveData.days[App.day.id] || { passed: false, stamp: 0, runs: 0, best: 0 };
  saveData.days[App.day.id] = { passed: previous.passed || passed, stamp: Math.max(previous.stamp, stamp), runs: previous.runs + 1, best: Math.max(previous.best, full) };
  const closeData = { day: App.day.id, full, total, passed, stamp, newCards: session.newCards.slice(), results };
  saveData.lastClose = closeData;
  saveData.active = null;
  Store.save(saveData);
  stopCurrentAudio();
  setState({ results, session, closeData, newCards: session.newCards.slice(), screen: "close", playing: false });
}
function nextJob() {
  if (App.screen !== "run" || !App.m || App.m.steps[App.s.step].kind !== "listen") return;
  const day = App.day, currentIndex = App.idx, result = F.result(App.s);
  if (App.debug) {
    const results = App.results.concat([{ id: App.m.id, tag: App.m.tag, r: result }]);
    if (currentIndex + 1 < day.jobs.length) openJob(day, currentIndex + 1, results, freshSession());
    else {
      stopCurrentAudio();
      setState({ results, screen: "close", playing: false, closeData: null });
    }
    return;
  }
  let session = commitRunStats(result, App.session || freshSession()), results = App.results.slice();
  if (session.phase === "original") {
    results.push({ id: App.m.id, tag: App.m.tag, r: result });
    if (result === "full" && ["make", "name"].includes(App.m.ask) && !App.m.plain) session = addCards(["inv" + inversion(App.m.ch, App.s.v)], session);
  }
  if (session.phase === "original" && currentIndex === day.jobs.length - 1) return finishDay(results, session);
  let nextIndex = currentIndex + 1;
  if (session.phase === "review") {
    const reviewPos = session.reviewPos + 1;
    session = Object.assign({}, session, { reviewPos });
    if (reviewPos < session.review.length) nextIndex = session.review[reviewPos];
    else { nextIndex = day.jobs.length - 1; session = Object.assign({}, session, { phase: "original" }); }
  } else if (nextIndex === day.jobs.length - 1) {
    const review = results.map((r, i) => r.r === "half" ? i : -1).filter((i) => i >= 0);
    if (review.length) { session = Object.assign({}, session, { phase: "review", review, reviewPos: 0 }); nextIndex = review[0]; }
  }
  const scene = session.phase === "original" && SCENE_AFTER[day.jobs[currentIndex].id];
  const pendingScene = scene && !saveData.scenes.includes(scene) ? scene : null;
  writeActive(day, nextIndex, results, session, pendingScene);
  openJob(day, nextIndex, results, session);
  if (pendingScene) showScene(pendingScene, "run");
}
