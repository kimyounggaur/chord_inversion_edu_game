// ═══ SCREENS ═══ 지도와 발견 장면은 운행의 같은 이론 엔진을 사용한다.
const SCENE_DATA = [
  { id: 'S1', title: '높이로 정해요', chord: 'C', frames: ['E4 G4 C5', 'E4 G4 C5'], labels: ['섞인 줄', '높이 순서'], row: [2, 0, 1], text: '줄 선 순서가 아니라 높이로 정해요. 가장 낮은 음을 밑음(Bass)이라고 불러요.' },
  { id: 'S2', title: '근음은 이름표', chord: 'C', frames: ['C4 E4 G4', 'E4 G4 C5'], text: 'C가 어디에 서도 이 화음의 근음은 C예요. 근음은 이름표, 밑음은 자리예요.' },
  { id: 'S3', title: '세 음, 세 자리', chord: 'C', frames: ['C4 E4 G4', 'E4 G4 C5', 'G4 C5 E5'], text: '밑음이 근음이면 기본 위치, 3음이면 첫째 자리바꿈, 5음이면 둘째 자리바꿈이에요.' },
  { id: 'S4', title: '한 바퀴를 돌면', chord: 'C', frames: ['C4 E4 G4', 'E4 G4 C5', 'G4 C5 E5', 'C5 E5 G5'], text: '세 번 올리면 처음 모양으로 돌아와요. 모두 한 옥타브 위에 있을 뿐, 다시 기본 위치예요.' },
  { id: 'S5', title: '7화음의 네 자리', chord: 'CM7', frames: ['C4 E4 G4 B4', 'E4 G4 B4 C5', 'G4 B4 C5 E5', 'B4 C5 E5 G5'], text: '음이 넷이면 자리도 넷이에요. 7음이 밑음이면 셋째 자리바꿈이에요.' },
  { id: 'S6', title: '슬래시 이름표', chord: 'C', frames: ['E4 G4 C5'], text: 'C/E는 “C 화음, 밑음은 E”예요. 슬래시 왼쪽이 화음, 오른쪽이 밑음이에요.' },
  { id: 'S7', title: '윗음이 움직여도', chord: 'C', frames: ['E4 G4 C5', 'E4 C5 G5'], text: '윗음을 아무리 옮겨도 밑음이 그대로면 자리바꿈도 그대로예요.' },
  { id: 'S8', title: '틈 위의 근음', chord: 'F', frames: ['A4 C5 F5', 'F4 A4 C5'], text: '3도씩 고르게 쌓이면 맨 아래가 근음이에요. 틈이 있으면 틈 바로 위가 근음이에요.' }
];
const CARD_DATA = [
  { id: 'bass', type: '낱말', title: '밑음(Bass)', text: '지금 가장 낮게 울리는 음이에요. 베이스라고도 해요. 책에 따라 “밑음”을 근음의 뜻으로 쓰기도 해요.', scene: 'S1', chord: 'C', notes: 'E4 G4 C5' },
  { id: 'root', type: '낱말', title: '근음(Root)', text: '화음의 이름을 정하는 음이에요. 3도로 쌓으면 맨 아래에 와요.', scene: 'S2', chord: 'C', notes: 'C4 E4 G4' },
  { id: 'slash', type: '낱말', title: '슬래시 이름표', text: '슬래시 왼쪽은 화음, 오른쪽은 밑음이에요. C/E는 C 화음의 밑음이 E라는 뜻이에요.', scene: 'S6', chord: 'C', notes: 'E4 G4 C5' },
  { id: 'inv0', type: '자리', title: '기본 위치', text: '근음이 밑음이에요. 기본위치라고도 해요.', chord: 'C', notes: 'C4 E4 G4' },
  { id: 'inv1', type: '자리', title: '첫째 자리바꿈', text: '3음이 밑음이에요. 제1전위라고도 해요.', chord: 'C', notes: 'E4 G4 C5' },
  { id: 'inv2', type: '자리', title: '둘째 자리바꿈', text: '5음이 밑음이에요. 제2전위라고도 해요.', chord: 'C', notes: 'G4 C5 E5' },
  { id: 'inv3', type: '자리', title: '셋째 자리바꿈', text: '7음이 밑음이에요. 제3전위라고도 해요. 7화음에만 있어요.', chord: 'CM7', notes: 'B4 C5 E5 G5' },
  { id: 'height', type: '규칙', title: '높이로 정해요', text: '줄을 선 순서보다 높이를 살펴봐요. 가장 낮은 음이 밑음이에요.', scene: 'S1', chord: 'C', notes: 'E4 G4 C5' },
  { id: 'constant', type: '규칙', title: '근음은 그대로', text: '음을 어떻게 옮겨도 화음의 근음은 바뀌지 않아요.', scene: 'S2', chord: 'C', notes: 'E4 G4 C5' },
  { id: 'cycle', type: '규칙', title: '한 바퀴', text: '구성음 수만큼 올리면 처음 모양이에요. 음은 모두 한 옥타브 높아졌어요.', scene: 'S4', chord: 'C', notes: 'C5 E5 G5' },
  { id: 'upper', type: '규칙', title: '윗음은 상관없어요', text: '윗음이 움직여도 밑음이 그대로면 자리바꿈도 그대로예요.', scene: 'S7', chord: 'C', notes: 'E4 C5 G5' },
  { id: 'gap', type: '규칙', title: '틈 위가 근음', text: '3도로 고르게 쌓이면 맨 아래, 밀집 배치에 틈이 있으면 틈 바로 위가 근음이에요.', scene: 'S8', chord: 'F', notes: 'A4 C5 F5' }
];
const CAUSE_LABELS = { order: '맨 앞 음을 골랐어요', root: '근음을 밑음으로 골랐어요', top: '가장 높은 음으로 정했어요', higher: '더 낮은 음을 놓쳤어요', bass: '밑음을 다시 살펴봐요', member: '구성음과 근음을 헷갈렸어요', stack: '3도 쌓기를 다시 살펴봐요', still: '아직 음을 옮기지 않았어요', floor: '밑음의 층이 바뀌었어요', sym: '심벌과 밑음을 견주어 봐요', inv: '자리의 이름을 견주어 봐요', ord: '자리를 한 칸 밀려 셌어요', shape: '윗음 이동을 자리바꿈으로 봤어요', swap: '슬래시 좌우를 바꿨어요', newroot: '밑음을 새 근음으로 적었어요', noslash: '슬래시가 빠졌어요', slash: '기본 위치에 슬래시를 붙였어요', both: '두 곳을 함께 살펴봐요', one: '틀린 한 곳을 찾아봐요', chordok: '화음 이름은 맞아요', bassok: '밑음은 맞아요' };
function screenEscape(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }
function screenWords(value) {
  const usageNote = '책에 따라 “밑음”을 근음의 뜻으로 쓰기도 해요.';
  const text = String(value).replace(usageNote, '__BASS_USAGE_NOTE__');
  return translateWords(text).replace('__BASS_USAGE_NOTE__', usageNote);
}
function screenButton(label, action, attrs = '', style = '') { return `<button type="button" data-action="${action}" ${attrs} class="screen-button ${style}">${musicHTML(screenWords(label))}</button>`; }
function screenHeader(title, back = 'map', sub = '') { return `<div class="screen-heading">${screenButton('뒤로', 'nav', `data-screen="${back}"`, 'back-button')}<div><h1>${musicHTML(screenWords(title))}</h1>${sub ? `<p>${screenEscape(sub)}</p>` : ''}</div></div>`; }
function stationArt() {
  return `<svg class="station-art" viewBox="0 0 600 350" role="img" aria-label="근음 C를 태우고 위층으로 올라가는 에스컬레이터"><defs><linearGradient id="stationLight" x2="0" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#dcedf4"/></linearGradient><pattern id="stationGrid" width="38" height="38" patternUnits="userSpaceOnUse"><path d="M38 0H0V38" fill="none" stroke="#c7d2da" stroke-width=".8"/></pattern></defs><path d="M45 60 300 10l255 50v240H45Z" fill="url(#stationLight)" stroke="#c7d2da" stroke-width="2"/><path d="M45 60h510v240H45z" fill="url(#stationGrid)"/><path d="M45 155h510M45 250h510" stroke="#a5b9c6" stroke-width="5"/><path d="m115 253 250-158h95v26h-83L129 280H70v-27Z" fill="#17627e"/><path d="m117 244 249-158h94" fill="none" stroke="#17627e" stroke-width="6" stroke-linecap="round"/><path d="m130 258 240-151" fill="none" stroke="#bfe3f2" stroke-width="13" stroke-dasharray="4 10"/><rect x="310" y="50" width="73" height="51" rx="11" fill="#ffd35c" stroke="#8a5a00" stroke-width="2.5"/><text x="347" y="72" text-anchor="middle" fill="#1a2630" font-family="system-ui" font-size="23" font-weight="800">C</text><text x="347" y="91" text-anchor="middle" fill="#1a2630" font-family="system-ui" font-size="12" font-weight="700">근음</text><circle cx="178" cy="225" r="26" fill="#bfe3f2" stroke="#17627e" stroke-width="2.5"/><text x="178" y="233" text-anchor="middle" fill="#1a2630" font-family="system-ui" font-size="23" font-weight="800">E</text><circle cx="248" cy="182" r="26" fill="#cdeccf" stroke="#256f43" stroke-width="2.5"/><text x="248" y="190" text-anchor="middle" fill="#1a2630" font-family="system-ui" font-size="23" font-weight="800">G</text><rect x="121" y="287" width="84" height="27" rx="13" fill="#1a2630"/><text x="163" y="306" text-anchor="middle" fill="white" font-family="system-ui" font-size="13" font-weight="700">${screenEscape(screenWords('밑음 자리'))}</text><path d="M76 322h448" stroke="#9bafbd" stroke-width="2"/><path d="M480 80h36v45h-36zM480 175h36v45h-36z" fill="#fff" stroke="#b7cbd6" stroke-width="2"/></svg>`;
}
function miniStage(chordId, notes, columnOrder = null) {
  const ch = chord(chordId), v = byMember(voicing(ch, notes)), low = bassIx(ch, v), sorted = order(ch, v), columns = columnOrder || sorted;
  const W = 440, H = 210, y = p => 25 + (42 - p) * 9.5;
  let h = `<svg class="mini-stage" viewBox="0 0 ${W} ${H}" role="img" aria-label="${screenEscape(vText(ch, v))}. ${screenEscape(screenWords(symbolOf(ch, v)))}">`;
  for (let p = 30; p <= 38; p += 2) h += `<path d="M16 ${y(p)}H424" stroke="#b5c1ca" stroke-width="1"/>`;
  v.forEach((voice, k) => {
    const x = 64 + columns.indexOf(k) * (310 / Math.max(1, ch.n - 1)), cy = y(posAt(ch, voice));
    const colors = ['#ffd35c', '#bfe3f2', '#cdeccf', '#e3d3f4'];
    h += k === 0 ? `<rect x="${x-25}" y="${cy-21}" width="50" height="42" rx="8" fill="${colors[k]}" stroke="#8a5a00" stroke-width="2"/>` : `<ellipse cx="${x}" cy="${cy}" rx="25" ry="21" fill="${colors[k]}" stroke="#4b5b68" stroke-width="2"/>`;
    const pitch = ch.tones[k], letterX = pitch.a ? x - 5 : x;
    h += `<text x="${letterX}" y="${cy+1}" text-anchor="middle" font-size="17" font-weight="800" fill="#1a2630">${LETTERS[pitch.l]}</text>${drawAccidental(pitch.a, x + 2, cy - 5, 6)}<text x="${x}" y="${cy+15}" text-anchor="middle" font-size="12" font-weight="600" fill="#1a2630">${degKo(k)}</text>`;
  });
  const bassPitch = ch.tones[v[low].k];
  h += `<rect x="24" y="183" width="80" height="21" rx="10" fill="#1a2630"/><text x="60" y="198" text-anchor="middle" fill="#fff" font-size="12" font-weight="700">${screenEscape(screenWords('밑음'))} ${LETTERS[bassPitch.l]}</text><g style="color:white">${drawAccidental(bassPitch.a, 83, 193, 4.5)}</g></svg>`;
  return h;
}
function renderTitleScreen() {
  const active = saveData.active;
  return `<div class="title-screen"><div class="title-brand"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span><p>음을 옮기며 배우는 음악이론</p></div><h1>화음<br>에스컬레이터</h1><p class="title-lead">근음은 이름표,<br>${screenEscape(screenWords('밑음은 자리예요.'))}</p>${stationArt()}<div class="title-actions">${screenButton('운행 시작', 'nav', 'data-screen="map"', 'primary')}${active ? screenButton('이어서 운행', 'resume', '', 'secondary') : ''}<div class="title-links">${screenButton('도감', 'nav', 'data-screen="book"')}${screenButton('자유 실험실', 'lab')}${screenButton('설정', 'nav', 'data-screen="settings"')}</div></div></div>`;
}
function renderMapScreen() {
  return screenHeader('운행일 지도', 'title', '한 번에 풀면 ●, 도움을 받으면 ◐') + `<div class="map-list">${DAYS.map((day, i) => {
    const record = saveData.days[day.id] || { passed: false, stamp: 0, best: 0 }, unlocked = i === 0 || saveData.days[DAYS[i-1].id]?.passed;
    return `<button type="button" class="day-stop ${record.passed ? 'passed' : ''}" data-action="day" data-day="${day.id}" ${unlocked ? '' : 'disabled'}><span class="day-number">${i}단</span><span class="day-copy"><strong>${musicHTML(screenWords(day.name))}</strong><span>${unlocked ? `${day.jobs.length}개 운행 · ${record.runs ? `최고 ● ${record.best}/${day.jobs.length}` : '처음 만나는 운행'}` : `${i-1}단을 통과하면 열려요`}</span></span><span class="day-stamp">${record.stamp === 2 ? '한 번에<br>도장' : record.stamp === 1 ? '도장' : unlocked ? '운행' : '잠김'}</span></button>`;
  }).join('')}</div><div class="screen-footer">${screenButton('기록 보기', 'nav', 'data-screen="log"')}${saveData.active ? screenButton('이어서 운행', 'resume') : ''}</div>`;
}
function renderCloseScreen() {
  const count = App.results.length, full = App.results.filter(x => x.r === 'full').length, passed = full >= Math.ceil(count * .8);
  const completionText = App.debug ? '개발용 운행을 확인했어요.' : passed ? (App.day.id === 'd7' ? '여덟 운행일을 모두 마쳤어요.' : '다음 운행일이 열렸어요.') : `● ${Math.ceil(count * .8)}개면 통과해요.`;
  return screenHeader(`${App.day.name} 마감`, 'map') + `<div class="closing-summary"><span class="stamp-art ${passed ? '' : 'pending'}">${full === count ? '한 번에<br>도장' : passed ? '운행<br>도장' : '다시<br>운행'}</span><div><p>한 번에 풀어낸 운행</p><strong>${full}<small> / ${count}</small></strong><p>${completionText}</p></div></div><ol class="result-list">${App.results.map(r => `<li><span class="result-dot ${r.r}">${r.r === 'full' ? '●' : '◐'}</span><span>${musicHTML(screenWords(r.tag || r.id))}</span></li>`).join('')}</ol>${App.newCards?.length ? `<section class="new-cards"><h2>오늘 얻은 카드</h2><p>${App.newCards.map(id => CARD_DATA.find(c => c.id === id)?.title || id).map(t => musicHTML(screenWords(t))).join(' · ')}</p></section>` : ''}<div class="screen-footer">${screenButton('다시 운행', 'day', `data-day="${App.day.id}"`, 'primary')}${screenButton('지도로', 'nav', 'data-screen="map"')}</div><p class="test-caption">자가검사 ${window.__tests?.pass || 0}/${window.__tests?.total || 46}</p>`;
}
function renderSceneScreen() {
  const scene = SCENE_DATA.find(x => x.id === (App.sceneId || App.scene)) || SCENE_DATA[0], frame = (App.sceneFrame || 0) % scene.frames.length;
  return screenHeader(scene.title, App.sceneReturn || 'book', '발견 장면') + `<div class="discovery-visual">${miniStage(scene.chord, scene.frames[frame], scene.id === 'S1' && frame === 0 ? scene.row : null)}<div class="diagram-symbol">${musicHTML(symbolOf(chord(scene.chord), byMember(voicing(chord(scene.chord), scene.frames[frame]))))}</div></div><p class="discovery-text">${musicHTML(screenWords(scene.text))}</p><div class="scene-pages" role="group" aria-label="배치 비교">${scene.frames.map((_, i) => screenButton(scene.labels?.[i] || `${i+1}번째 배치`, 'scene-frame', `data-frame="${i}" aria-pressed="${i===frame}"`, i===frame?'selected':'')).join('')}</div><div class="screen-footer">${screenButton('들어 보기', 'scene-hear')}${screenButton('알겠어요', 'scene-next', '', 'primary')}</div>`;
}
function renderBookScreen() {
  const unlocked = new Set(saveData.cards), selected = CARD_DATA.find(c => c.id === App.bookCard && unlocked.has(c.id));
  return screenHeader('자리 도감', 'title', `모은 카드 ${unlocked.size} / 12`) + (selected ? `<article class="card-detail"><span class="eyebrow">${selected.type} 카드</span><h2>${musicHTML(screenWords(selected.title))}</h2>${miniStage(selected.chord, selected.notes)}<p>${musicHTML(screenWords(selected.text))}</p>${screenButton('들어 보기', 'card-hear', `data-card="${selected.id}"`)}</article>` : '') + `<div class="book-grid">${CARD_DATA.map(c => `<button type="button" class="book-card ${unlocked.has(c.id) ? '' : 'locked'}" data-action="card" data-card="${c.id}" ${unlocked.has(c.id)?'':'disabled'}><span>${c.type}</span><strong>${musicHTML(screenWords(c.title))}</strong><small>${unlocked.has(c.id)?'카드 펼치기':'운행하며 모아요'}</small></button>`).join('')}</div><h2 class="sub-heading">발견 장면 다시 보기</h2><div class="scene-list">${SCENE_DATA.map(s => screenButton(s.title,'scene',`data-scene="${s.id}" ${saveData.scenes.includes(s.id)?'':'disabled'}`)).join('')}</div>`;
}
function renderLogScreen() {
  const causes = Object.entries(saveData.causes).sort((a,b) => b[1]-a[1]).slice(0,3);
  return screenHeader('운행 기록', 'map') + `<div class="stat-grid"><div><strong>${saveData.stats.jobs}</strong><span>완료한 운행</span></div><div><strong>${saveData.stats.full}</strong><span>한 번에 ●</span></div><div><strong>${saveData.stats.pads}</strong><span>두 손 패드</span></div></div><h2 class="sub-heading">다시 살펴볼 것</h2>${causes.length ? `<ul class="cause-list">${causes.map(([id,n])=>`<li>${screenEscape(screenWords(CAUSE_LABELS[id]||id))}<b>${n}번</b></li>`).join('')}</ul>` : '<p class="empty-note">운행 중 살펴본 까닭이 여기에 쌓여요.</p>'}<h2 class="sub-heading">운행일별 최고 기록</h2><div class="history-list">${DAYS.map(d=>`<div><span>${musicHTML(screenWords(d.name))}</span><strong>${saveData.days[d.id]?.best||0} / ${d.jobs.length}</strong></div>`).join('')}</div>`;
}
function renderSettingsScreen() {
  const s=saveData.settings;
  return screenHeader('설정','title')+`<div class="settings-list"><label><span>소리 크기</span><input data-setting="volume" type="range" min="0" max="1" step="0.05" value="${s.volume}" aria-label="소리 크기"></label><label><span>음소거</span><input data-setting="muted" type="checkbox" ${s.muted?'checked':''}></label><label><span>가장 낮은 음의 말</span><select data-setting="bassWord"><option value="밑음" ${s.bassWord==='밑음'?'selected':''}>밑음(Bass)</option><option value="베이스" ${s.bassWord==='베이스'?'selected':''}>베이스(Bass)</option></select></label><label><span>자리의 말</span><select data-setting="invWord"><option value="자리바꿈" ${s.invWord==='자리바꿈'?'selected':''}>자리바꿈</option><option value="전위" ${s.invWord==='전위'?'selected':''}>전위</option></select></label><label><span>움직임</span><select data-setting="motion"><option value="system" ${s.motion==='system'?'selected':''}>기기 설정 따르기</option><option value="reduced" ${s.motion==='reduced'?'selected':''}>동작 줄이기</option><option value="full" ${s.motion==='full'?'selected':''}>모두 보기</option></select></label></div><div class="settings-actions">${screenButton('튜토리얼 다시 보기','tutorial')}${screenButton(`자가검사 ${window.__tests?.pass||0}/${window.__tests?.total||46}`,'nav','data-screen="test"')}</div>${typeof Store!=='undefined' && Store.available===false ? '<p class="storage-note" role="status">이 기기에서는 기록이 저장되지 않아요</p>':''}<section class="reset-area"><h2>운행 기록 초기화</h2><p>모은 카드와 도장, 설정을 처음으로 돌려요.</p>${screenButton(App.confirmReset?'정말 초기화하기':'데이터 초기화','reset','', 'danger')}${App.confirmReset?screenButton('취소','reset-cancel'):''}</section>`;
}
function renderTestScreen() {
  const t=window.__tests||{pass:0,total:46,fails:[]};
  return screenHeader('자가검사','settings')+`<div class="test-summary"><strong>${t.pass} / ${t.total}</strong><p>${t.fails.length?'확인이 필요한 항목이 있어요.':'현재 검사가 모두 통과했어요.'}</p></div><div class="screen-footer"><button id="uiAuditButton" type="button" class="screen-button" onclick="startUiAudit(this)">화면 조작 검사</button></div><pre id="uiAuditResults" style="white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.6 system-ui" role="status"></pre><ul class="test-results">${(t.items||t.results||t.fails.map(name=>({name,pass:false}))).map(x=>`<li>${x.pass===false?'확인 필요':'통과'} · ${screenEscape(x.name||x.id||x)}</li>`).join('')}</ul>`;
}
function renderScreens() {
  const renderers={title:renderTitleScreen,map:renderMapScreen,close:renderCloseScreen,scene:renderSceneScreen,book:renderBookScreen,log:renderLogScreen,settings:renderSettingsScreen,test:renderTestScreen};
  const panel=document.getElementById('screenPanel');
  if (!panel) return;
  const key=App.screen;
  if (key==='run'||key==='lab') {panel.hidden=true;return;}
  panel.hidden=false;
  panel.innerHTML=(renderers[key]||renderTitleScreen)();
  panel.className=`screen-panel screen-${key}`;
}
function setupScreenInputs() {
  const panel=document.getElementById('screenPanel');
  panel.addEventListener('click',event=>{
    const button=event.target.closest('button[data-action]');if(!button||button.disabled)return;
    const d=button.dataset;
    if(d.action==='nav') { if(App.screen==='scene' && App.sceneReturn==='run') sceneContinue(); else goScreen(d.screen); }
    else if(d.action==='day') startDay(d.day);
    else if(d.action==='resume') resumeDay();
    else if(d.action==='lab') enterLab();
    else if(d.action==='scene') showScene(d.scene,'book');
    else if(d.action==='scene-frame') setState({sceneFrame:+d.frame});
    else if(d.action==='scene-next') sceneContinue();
    else if(d.action==='scene-hear') {
      const scene=SCENE_DATA.find(x=>x.id===(App.sceneId||App.scene))||SCENE_DATA[0],ch=chord(scene.chord),v=byMember(voicing(ch,scene.frames[(App.sceneFrame||0)%scene.frames.length]));sound(planListen(ch,v).ev,.12);
    }
    else if(d.action==='card') setState({bookCard:d.card});
    else if(d.action==='card-hear') {const card=CARD_DATA.find(x=>x.id===d.card),ch=chord(card.chord);sound(planListen(ch,byMember(voicing(ch,card.notes))).ev,.12);}
    else if(d.action==='reset') {if(App.confirmReset)resetProgress();else setState({confirmReset:true});}
    else if(d.action==='reset-cancel')setState({confirmReset:false});
    else if(d.action==='tutorial'){setSetting('soundChecked',false);startDay('d0');}
  });
  panel.addEventListener('change',event=>{
    const field=event.target,key=field.dataset.setting;if(!key)return;
    setSetting(key,field.type==='checkbox'?field.checked:field.type==='range'?+field.value:field.value);
  });
}
