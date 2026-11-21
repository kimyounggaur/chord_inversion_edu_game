// ═══ 11 BOOT ═══ 제품 진입점 and development hashes.
function boot() {
  const hash = location.hash.slice(1);
  const match = /^(d[0-7]|sp)(?:-(\d+))?$/.exec(hash);
  if (match) {
    const day = match[1] === "sp" ? SPIKE : DAYS.find(d => d.id === match[1]);
    const index = Math.min(day.jobs.length, Math.max(1, +(match[2] || 1))) - 1;
    setState({ debug: true, closeData: null });
    openJob(day, index, [], freshSession());
  } else if (hash === "test") goScreen("test");
  else if (hash === "lab") enterLab();
  else goScreen("title");
}
setupInput();
setupScreenInputs();
const firstModel = build(DAYS[0].jobs[0], DAYS[0]);
setState({ m: firstModel, s: F.start(firstModel) });
window.__tests = selfTest();
boot();
window.addEventListener("hashchange", boot);
window.__spike = {
  App, F, build, show, setState, openJob, layout: () => G, DAYS, SPIKE,
  Store, startDay, resumeDay, nextJob, goScreen, enterLab, currentView,
  get saveData() { return saveData; }
};
window.addEventListener("error", event => {
  console.error(event.message);
  if ($("screenPanel")) {
    stopRun(false);
    $("screenPanel").hidden = false;
    $("screenPanel").innerHTML = '<h1>문제가 생겼어요</h1><p>다시 열어 이어서 해 보세요.</p><button type="button" onclick="location.reload()">새로고침</button>';
  }
}, { once: true });
