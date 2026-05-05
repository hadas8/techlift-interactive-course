
let CFG = null;
let state = {
  screen: 0,
  maxUnlocked: 0,
  digits: [],
  sortSelected: null,
  sortPlaced: [],
  matchSelected: null,
  matchPairs: {},
  scenarioDone: false,
  teamApproved: false,
  completed: {}
};

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const escapeHtml = (str='') => String(str)
  .replaceAll('&','&amp;')
  .replaceAll('<','&lt;')
  .replaceAll('>','&gt;')
  .replaceAll('"','&quot;')
  .replaceAll("'","&#039;");
const nl2br = (str='') => escapeHtml(str).replace(/\n/g, '<br>');
const shuffle = (arr) => [...arr].map(v => [Math.random(), v]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
const screenById = (id) => CFG.screens.find(s => s.id === id);

async function loadConfig() {
  try {
    const res = await fetch('config.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Could not load config.json');
    CFG = await res.json();
    document.title = CFG.meta?.title || 'פעילות אינטראקטיבית';
    applyDesign();
    initState();
    render();
  } catch (err) {
    document.body.innerHTML = `
      <main class="app-shell" style="padding-top:40px;">
        <div class="screen-card">
          <h1>לא ניתן לטעון את הפעילות</h1>
          <p class="lead">הקובץ config.json לא נטען. בדקו שהוא נמצא באותה תיקייה כמו index.html.</p>
          <p class="small" style="direction:ltr;text-align:left;margin-top:14px;">${escapeHtml(err.message)}</p>
        </div>
      </main>`;
  }
}

function applyDesign() {
  const d = CFG.design || {};
  const root = document.documentElement;
  root.style.setProperty('--primary', d.primaryColor || '#1D9E75');
  root.style.setProperty('--secondary', d.secondaryColor || '#378ADD');
  root.style.setProperty('--accent', d.accentColor || '#EF9F27');
  root.style.setProperty('--bg', d.backgroundColor || '#F7F4EC');
  root.style.setProperty('--surface', d.surfaceColor || '#FFFFFF');
  root.style.setProperty('--text', d.textColor || '#1F2933');
  root.style.setProperty('--muted', d.mutedTextColor || '#5B6470');
  root.style.setProperty('--font', d.fontFamily || '"Segoe UI", Arial, sans-serif');
  root.style.setProperty('--base-font-size', (d.fontSizeBase || 16) + 'px');
  root.style.setProperty('--radius', (d.cardRadius || 22) + 'px');
}

function initState() {
  state.digits = new Array(CFG.screens.length).fill('');
  state.sortPlaced = [[],[],[]];
}

function render() {
  const app = $('#app');
  app.innerHTML = `
    <div class="topbar">
      <div class="topbar-title"><span>✨</span><span>${escapeHtml(CFG.meta.title)}</span></div>
      <div class="topbar-actions">
        ${CFG.game.showCodeBadge ? `<span class="code-badge" id="codeBadge">${codeBadgeText()}</span>` : ''}
        <button class="btn btn-ghost" id="mapBtn">${escapeHtml(CFG.game.mapButtonText || 'מפת האתגר')}</button>
      </div>
    </div>
    <div id="screens"></div>
  `;
  $('#mapBtn').addEventListener('click', showMap);

  const screens = $('#screens');
  CFG.screens.forEach((screen, i) => {
    const el = document.createElement('section');
    el.className = 'screen';
    el.id = `screen-${i}`;
    el.innerHTML = screenHtml(screen, i);
    screens.appendChild(el);
  });

  attachHandlers();
  goTo(0, true);
}

function codeBadgeText() {
  const collected = CFG.screens
    .filter(s => ['sorting','matching','scenario','teamTask'].includes(s.type))
    .map((s, idx) => state.digits[idx] || '_');
  return collected.join(' ');
}

function progressHtml(i) {
  return `<div class="progress">${CFG.screens.map((s, idx) => {
    const cls = idx < i ? 'done' : idx === i ? 'current' : isAllowed(idx) ? '' : 'locked';
    const title = isAllowed(idx) ? `מסך ${idx+1}` : 'נעול';
    return `<span class="progress-dot ${cls}" title="${title}"></span>`;
  }).join('')}</div>`;
}

function screenHtml(s, i) {
  switch (s.type) {
    case 'intro': return introHtml(s, i);
    case 'content': return contentHtml(s, i);
    case 'sorting': return sortingHtml(s, i);
    case 'matching': return matchingHtml(s, i);
    case 'scenario': return scenarioHtml(s, i);
    case 'teamTask': return teamHtml(s, i);
    case 'final': return finalHtml(s, i);
    default: return `<div class="screen-card"><h2>${escapeHtml(s.title || 'מסך')}</h2></div>`;
  }
}

function introHtml(s, i) {
  return `
    ${progressHtml(i)}
    <div class="hero-card center">
      <div class="big-icon">${escapeHtml(s.icon || '🔐')}</div>
      <h1>${escapeHtml(s.title)}</h1>
      <p class="lead">${nl2br(s.body)}</p>
      <div style="margin-top:26px;">
        <button class="btn btn-primary" data-next="${i+1}">${escapeHtml(s.button || 'המשך')}</button>
      </div>
    </div>`;
}

function contentHtml(s, i) {
  return `
    ${progressHtml(i)}
    <div class="screen-card">
      <h2>${escapeHtml(s.title)}</h2>
      <div class="info-card"><p class="body-text">${nl2br(s.body)}</p></div>
      <div class="note-card">
        <strong>${escapeHtml(s.pillsTitle || '')}</strong>
        <div class="pill-grid">
          ${(s.pills || []).map(p => `<span class="pill">✓ ${escapeHtml(p)}</span>`).join('')}
        </div>
      </div>
      <div class="info-card" style="margin-top:16px;"><p class="body-text">${nl2br(s.note)}</p></div>
      <div class="footer-nav">
        <button class="btn btn-ghost" data-map>${escapeHtml(CFG.game.mapButtonText || 'מפת האתגר')}</button>
        <button class="btn btn-primary" data-next="${i+1}">${escapeHtml(s.button || 'המשך')}</button>
      </div>
    </div>`;
}

function sortingHtml(s, i) {
  return `
    ${progressHtml(i)}
    <div class="screen-card">
      <h2>${escapeHtml(s.title)}</h2>
      <p class="body-text">${nl2br(s.instruction)}</p>
      <div class="feature-pool" id="featurePool"></div>
      <div class="sort-zones" id="sortZones">
        ${(s.categories || []).map((c, idx) => `
          <div class="sort-zone zone-${escapeHtml(c.color || '')}" data-zone="${idx}">
            <div class="sort-zone-title">${escapeHtml(c.label)}</div>
            <div id="zoneItems-${idx}"></div>
          </div>`).join('')}
      </div>
      <div class="editor-actions">
        <button class="btn btn-secondary" id="checkSort">${escapeHtml(s.checkButton || 'בדיקה')}</button>
        <button class="btn" id="resetSort">${escapeHtml(s.resetButton || 'איפוס')}</button>
      </div>
      <div class="feedback" id="sortFeedback"></div>
      ${digitHtml(s, 'sortDigit')}
      <div class="footer-nav">
        <button class="btn btn-ghost" data-map>${escapeHtml(CFG.game.mapButtonText || 'מפת האתגר')}</button>
        <button class="btn btn-primary hidden" id="sortNext" data-next="${i+1}">${escapeHtml(s.nextButton || 'המשך')}</button>
      </div>
    </div>`;
}

function matchingHtml(s, i) {
  return `
    ${progressHtml(i)}
    <div class="screen-card">
      <h2>${escapeHtml(s.title)}</h2>
      <p class="body-text">${nl2br(s.instruction)}</p>
      <div class="match-cols">
        <div><div class="col-title">${escapeHtml(s.leftTitle || '')}</div><div id="matchLeft"></div></div>
        <div><div class="col-title">${escapeHtml(s.rightTitle || '')}</div><div id="matchRight"></div></div>
      </div>
      <div class="editor-actions">
        <button class="btn btn-secondary" id="checkMatch">${escapeHtml(s.checkButton || 'בדיקה')}</button>
        <button class="btn" id="resetMatch">${escapeHtml(s.resetButton || 'איפוס')}</button>
      </div>
      <div class="feedback" id="matchFeedback"></div>
      ${digitHtml(s, 'matchDigit')}
      <div class="footer-nav">
        <button class="btn btn-ghost" data-map>${escapeHtml(CFG.game.mapButtonText || 'מפת האתגר')}</button>
        <button class="btn btn-primary hidden" id="matchNext" data-next="${i+1}">${escapeHtml(s.nextButton || 'המשך')}</button>
      </div>
    </div>`;
}

function scenarioHtml(s, i) {
  return `
    ${progressHtml(i)}
    <div class="screen-card">
      <h2>${escapeHtml(s.title)}</h2>
      <p class="body-text">${nl2br(s.body)}</p>
      <div class="info-card"><strong>${escapeHtml(s.question)}</strong></div>
      <div class="scenario-grid" id="scenarioOptions"></div>
      <div class="feedback" id="scenarioFeedback"></div>
      ${digitHtml(s, 'scenarioDigit')}
      <div class="footer-nav">
        <button class="btn btn-ghost" data-map>${escapeHtml(CFG.game.mapButtonText || 'מפת האתגר')}</button>
        <button class="btn btn-primary hidden" id="scenarioNext" data-next="${i+1}">${escapeHtml(s.nextButton || 'המשך')}</button>
      </div>
    </div>`;
}

function teamHtml(s, i) {
  return `
    ${progressHtml(i)}
    <div class="screen-card">
      <h2>${escapeHtml(s.title)}</h2>
      <p class="body-text">${nl2br(s.body)}</p>
      <div class="info-card">${nl2br(s.documentInstruction)}</div>
      <div class="note-card"><strong>${escapeHtml(s.taskTitle)}</strong></div>
      <ul class="task-list">
        ${(s.questions || []).map(q => `
          <li><div>
            <strong>${escapeHtml(q.label)}</strong>
            <textarea class="team-input" id="${escapeHtml(q.id)}" placeholder="${escapeHtml(q.placeholder || '')}"></textarea>
          </div></li>`).join('')}
      </ul>
      <div class="note-card" style="margin-top:16px;">${nl2br(s.checkpoint)}<br><br><span class="small">${nl2br(s.zoomNote)}</span></div>
      ${digitHtml(s, 'teamDigit')}
      <div class="footer-nav">
        <button class="btn btn-ghost" data-map>${escapeHtml(CFG.game.mapButtonText || 'מפת האתגר')}</button>
        <button class="btn btn-primary" id="approveTeam">${escapeHtml(s.approvalButton || 'אישור')}</button>
      </div>
    </div>`;
}

function finalHtml(s, i) {
  const submission = CFG.submission || {};
  return `
    ${progressHtml(i)}
    <div class="screen-card center">
      <h2>${escapeHtml(s.title)}</h2>
      <div id="lockSection">
        <div class="big-icon">🔒</div>
        <p class="lead">${nl2br(s.body)}</p>
        <div class="code-wrap">
          <input class="code-digit" maxlength="1" inputmode="numeric" id="code0">
          <input class="code-digit" maxlength="1" inputmode="numeric" id="code1">
          <input class="code-digit" maxlength="1" inputmode="numeric" id="code2">
          <input class="code-digit" maxlength="1" inputmode="numeric" id="code3">
        </div>
        <button class="btn btn-primary" id="unlockBtn">${escapeHtml(s.unlockButton || 'פתיחה')}</button>
        <div class="feedback" id="codeFeedback"></div>
      </div>

      <div id="successPanel" class="success-panel">
        <div class="big-icon">🎉</div>
        <h2>${nl2br(s.successTitle)}</h2>
        <p class="body-text">${nl2br(s.successBody)}</p>
        <div class="note-card">${nl2br(s.reflection)}</div>
      </div>

      ${submission.enabled ? `
        <div id="submissionPanel" class="submission-panel">
          <h3>${escapeHtml(submission.title)}</h3>
          <p class="body-text">${nl2br(submission.intro)}</p>
          <div class="field">
            <label>${escapeHtml(submission.teamNameLabel)}</label>
            <input class="text-input" id="teamName" placeholder="${escapeHtml(submission.teamNamePlaceholder)}">
          </div>
          <div class="info-card">${nl2br(submission.summaryNote)}</div>
          <button class="btn btn-primary" id="submitFormBtn">${escapeHtml(submission.button)}</button>
          <div class="feedback" id="submitFeedback"></div>
        </div>` : ''}
      <div style="margin-top:18px;">
        <button class="btn btn-secondary">${escapeHtml(s.finishButton || 'סיום')}</button>
      </div>
      <div class="footer-nav">
        <button class="btn btn-ghost" data-map>${escapeHtml(CFG.game.mapButtonText || 'מפת האתגר')}</button>
      </div>
    </div>`;
}

function digitHtml(s, id) {
  return `<div class="digit-reveal" id="${id}">
    ספרת קוד: <strong>${escapeHtml(s.digit || '')}</strong>
    <span class="reminder">${escapeHtml(CFG.game.digitReminder || '')}</span>
  </div>`;
}

function attachHandlers() {
  $$('[data-next]').forEach(btn => {
    btn.addEventListener('click', () => {
      const n = parseInt(btn.dataset.next, 10);
      unlock(n);
      goTo(n);
    });
  });
  $$('[data-map]').forEach(btn => btn.addEventListener('click', showMap));
}

function unlock(i) {
  state.maxUnlocked = Math.max(state.maxUnlocked, i);
}

function isAllowed(i) {
  return !CFG.game.lockNavigation || i <= state.maxUnlocked;
}

function goTo(i, force=false) {
  if (!force && !isAllowed(i)) {
    showToast(CFG.game.lockedMessage || 'נעול');
    return;
  }
  $$('.screen').forEach(s => s.classList.remove('active'));
  $(`#screen-${i}`).classList.add('active');
  state.screen = i;

  const screen = CFG.screens[i];
  if (screen.type === 'sorting' && !state.completed[screen.id]) initSorting(screen);
  if (screen.type === 'matching' && !state.completed[screen.id]) initMatching(screen);
  if (screen.type === 'scenario' && !state.completed[screen.id]) initScenario(screen);
  if (screen.type === 'final') initFinal(screen);

  window.scrollTo({ top: 0, behavior: 'smooth' });
  updateCodeBadge();
}

function updateCodeBadge() {
  const badge = $('#codeBadge');
  if (badge) badge.textContent = codeBadgeText();
}

function showToast(msg) {
  let t = $('#toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.style.cssText = 'position:fixed;bottom:20px;left:20px;z-index:80;background:#0f172a;color:white;padding:12px 16px;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.18);';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(t._timer);
  t._timer = setTimeout(()=>t.style.display='none', 2400);
}

function showMap() {
  let overlay = $('#mapOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'mapOverlay';
    overlay.className = 'overlay';
    overlay.innerHTML = `<div class="overlay-inner"><h3>מפת האתגר</h3><div id="mapItems"></div><button class="btn" id="closeMap">סגור</button></div>`;
    document.body.appendChild(overlay);
    $('#closeMap').addEventListener('click', () => overlay.classList.remove('show'));
  }
  const items = CFG.screens.map((s, i) => {
    const allowed = isAllowed(i);
    const digit = s.digit ? `ספרה: ${state.digits[digitIndexForType(s.type)] || '_'}` : '';
    return `<div class="map-item ${allowed ? 'allowed' : 'locked'}" data-screen="${i}">
      <span>${escapeHtml(s.icon || '')} ${escapeHtml(s.navTitle || s.title || '')}</span>
      <span class="small">${allowed ? digit : '🔒 נעול'}</span>
    </div>`;
  }).join('');
  $('#mapItems').innerHTML = items;
  $$('#mapItems .allowed').forEach(item => item.addEventListener('click', () => {
    overlay.classList.remove('show');
    goTo(parseInt(item.dataset.screen, 10));
  }));
  overlay.classList.add('show');
}

function digitIndexForType(type) {
  return {sorting:0, matching:1, scenario:2, teamTask:3}[type] ?? 0;
}

/* Sorting */
function initSorting(s) {
  state.sortSelected = null;
  state.sortPlaced = s.categories.map(()=>[]);
  $('#sortFeedback').className = 'feedback';
  $('#sortFeedback').textContent = '';
  $('#sortDigit').classList.remove('show');
  $('#sortNext').classList.add('hidden');

  const pool = $('#featurePool');
  pool.innerHTML = '';
  s.categories.forEach((_, idx) => $(`#zoneItems-${idx}`).innerHTML = '');

  shuffle(s.features.map((f, idx) => ({...f, idx}))).forEach(f => {
    const el = document.createElement('button');
    el.className = 'feature-card';
    el.textContent = f.text;
    el.dataset.idx = f.idx;
    el.type = 'button';
    el.addEventListener('click', () => {
      $$('.feature-card:not(.placed)').forEach(c => c.classList.remove('selected'));
      el.classList.add('selected');
      state.sortSelected = f.idx;
    });
    pool.appendChild(el);
  });

  $$('.sort-zone').forEach(z => {
    z.onclick = () => placeSortCard(parseInt(z.dataset.zone, 10), s);
  });
  $('#checkSort').onclick = () => checkSort(s);
  $('#resetSort').onclick = () => initSorting(s);
}

function placeSortCard(zone, s) {
  if (state.sortSelected === null) return;
  if (state.sortPlaced.flat().includes(state.sortSelected)) return;
  state.sortPlaced[zone].push(state.sortSelected);
  const card = $(`.feature-card[data-idx="${state.sortSelected}"]`);
  if (card) card.classList.add('placed');
  const item = document.createElement('div');
  item.className = 'zone-card';
  item.textContent = s.features[state.sortSelected].text;
  $(`#zoneItems-${zone}`).appendChild(item);
  state.sortSelected = null;
  $$('.feature-card').forEach(c => c.classList.remove('selected'));
}

function setFeedback(id, type, msg) {
  const el = $(id);
  el.className = `feedback ${type}`;
  el.textContent = msg;
}

function checkSort(s) {
  const total = state.sortPlaced.flat().length;
  if (total < s.features.length) return setFeedback('#sortFeedback', 'info', s.feedback.incomplete);
  let correct = 0;
  state.sortPlaced.forEach((items, zone) => items.forEach(idx => {
    if (s.features[idx].category === zone) correct++;
  }));
  if (correct === s.features.length) {
    setFeedback('#sortFeedback', 'ok', s.feedback.correct);
    $('#sortDigit').classList.add('show');
    state.digits[0] = s.digit;
    state.completed[s.id] = true;
    updateCodeBadge();
    $('#sortNext').classList.remove('hidden');
    unlock(state.screen + 1);
  } else {
    setFeedback('#sortFeedback', 'err', `${s.feedback.wrong}\n(${s.features.length - correct} שגויים)`);
  }
}

/* Matching */
function initMatching(s) {
  state.matchSelected = null;
  state.matchPairs = {};
  $('#matchFeedback').className = 'feedback';
  $('#matchDigit').classList.remove('show');
  $('#matchNext').classList.add('hidden');
  $('#matchLeft').innerHTML = '';
  $('#matchRight').innerHTML = '';

  s.left.forEach(item => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'match-item';
    el.dataset.side = 'left';
    el.dataset.id = item.id;
    el.innerHTML = `<strong>${escapeHtml(item.id)}.</strong> ${escapeHtml(item.text)}`;
    el.addEventListener('click', () => handleMatchClick('left', item.id, el));
    $('#matchLeft').appendChild(el);
  });

  shuffle(s.right).forEach(item => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'match-item';
    el.dataset.side = 'right';
    el.dataset.id = item.id;
    el.textContent = item.text;
    el.addEventListener('click', () => handleMatchClick('right', item.id, el));
    $('#matchRight').appendChild(el);
  });

  $('#checkMatch').onclick = () => checkMatch(s);
  $('#resetMatch').onclick = () => initMatching(s);
}

function handleMatchClick(side, id, el) {
  if (el.classList.contains('paired')) return;
  if (!state.matchSelected || state.matchSelected.side === side) {
    $$('.match-item:not(.paired)').forEach(m => m.classList.remove('selected'));
    el.classList.add('selected');
    state.matchSelected = { side, id, el };
    return;
  }
  const leftId = side === 'left' ? id : state.matchSelected.id;
  const rightId = side === 'right' ? id : state.matchSelected.id;
  state.matchPairs[leftId] = rightId;
  el.classList.add('paired');
  state.matchSelected.el.classList.add('paired');
  $$('.match-item').forEach(m => m.classList.remove('selected'));
  state.matchSelected = null;
}

function checkMatch(s) {
  if (Object.keys(state.matchPairs).length < s.left.length) return setFeedback('#matchFeedback', 'info', s.feedback.incomplete);
  const ok = Object.entries(s.correctPairs).every(([k,v]) => state.matchPairs[k] === v);
  if (ok) {
    setFeedback('#matchFeedback', 'ok', s.feedback.correct);
    $('#matchDigit').classList.add('show');
    state.digits[1] = s.digit;
    state.completed[s.id] = true;
    updateCodeBadge();
    $('#matchNext').classList.remove('hidden');
    unlock(state.screen + 1);
  } else {
    setFeedback('#matchFeedback', 'err', s.feedback.wrong);
    state.matchPairs = {};
    $$('.match-item').forEach(m => m.classList.remove('paired','selected'));
  }
}

/* Scenario */
function initScenario(s) {
  state.scenarioDone = false;
  $('#scenarioFeedback').className = 'feedback';
  $('#scenarioDigit').classList.remove('show');
  $('#scenarioNext').classList.add('hidden');
  $('#scenarioOptions').innerHTML = '';
  shuffle(s.options).forEach(opt => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'scenario-card';
    el.innerHTML = `<div class="scenario-label">אפשרות ${escapeHtml(opt.id)}</div>${escapeHtml(opt.text)}`;
    el.addEventListener('click', () => {
      if (state.scenarioDone) return;
      if (opt.correct) {
        el.classList.add('correct');
        setFeedback('#scenarioFeedback', 'ok', s.feedback.correct);
        $('#scenarioDigit').classList.add('show');
        state.digits[2] = s.digit;
        state.completed[s.id] = true;
        updateCodeBadge();
        $('#scenarioNext').classList.remove('hidden');
        unlock(state.screen + 1);
        state.scenarioDone = true;
        $$('.scenario-card').forEach(c => { if (c !== el) c.style.opacity = '.48'; });
      } else {
        el.classList.add('wrong');
        setFeedback('#scenarioFeedback', 'err', s.feedback.wrong);
        setTimeout(() => { el.classList.remove('wrong'); el.style.opacity = '.45'; el.disabled = true; }, 1500);
      }
    });
    $('#scenarioOptions').appendChild(el);
  });
}

/* Team */
document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'approveTeam') {
    const s = CFG.screens[state.screen];
    $('#teamDigit').classList.add('show');
    state.digits[3] = s.digit;
    state.completed[s.id] = true;
    updateCodeBadge();
    e.target.textContent = s.finalButton || 'המשך';
    e.target.onclick = () => {
      unlock(state.screen + 1);
      goTo(state.screen + 1);
    };
  }
});

/* Final */
function initFinal(s) {
  const inputs = $$('.code-digit');
  inputs.forEach((input, i) => {
    input.value = '';
    input.oninput = () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 1);
      if (input.value && inputs[i+1]) inputs[i+1].focus();
    };
  });
  $('#unlockBtn').onclick = () => checkFinalCode(s);
  const submitBtn = $('#submitFormBtn');
  if (submitBtn) submitBtn.onclick = submitToForm;
}

function checkFinalCode(s) {
  const entered = $$('.code-digit').map(i => i.value).join('');
  if (entered === CFG.game.finalCode) {
    $('#lockSection').style.display = 'none';
    $('#successPanel').classList.add('show');
    const sub = $('#submissionPanel');
    if (sub) sub.classList.add('show');
  } else {
    setFeedback('#codeFeedback', 'err', s.wrongCode || 'הקוד שגוי.');
  }
}

function submitToForm() {
  const sub = CFG.submission || {};
  const team = $('#teamName')?.value.trim() || '';
  if (!team) {
    setFeedback('#submitFeedback', 'err', sub.missingTeamName || 'חסר שם צוות');
    return;
  }
  const vals = {};
  const teamScreen = CFG.screens.find(s => s.type === 'teamTask');
  (teamScreen.questions || []).forEach(q => vals[q.id] = $(`#${q.id}`)?.value.trim() || '');
  if (sub.prefillUrl && sub.prefillUrl.length > 10) {
    let url = sub.prefillUrl;
    const tokens = sub.placeholderTokens || {};
    url = url.replaceAll(tokens.team || '{team}', encodeURIComponent(team));
    Object.entries(vals).forEach(([k,v]) => {
      url = url.replaceAll(tokens[k] || `{${k}}`, encodeURIComponent(v));
    });
    window.open(url, '_blank');
    setFeedback('#submitFeedback', 'ok', sub.openedMessage || 'הטופס נפתח.');
  } else {
    const summary = [
      `צוות: ${team}`,
      ...Object.entries(vals).map(([k,v], idx) => `${idx+1}. ${v}`)
    ].join('\n');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(summary).then(() => {
        setFeedback('#submitFeedback', 'info', sub.noFormFallback || 'הועתק ללוח.');
      }).catch(() => setFeedback('#submitFeedback', 'info', summary));
    } else {
      setFeedback('#submitFeedback', 'info', summary);
    }
  }
}

loadConfig();
