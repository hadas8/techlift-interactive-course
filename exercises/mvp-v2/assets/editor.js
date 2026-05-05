
let CFG = null;
let activeTab = 'design';

const tabs = [
  ['design', '🎨 עיצוב'],
  ['game', '🔐 משחק וקוד'],
  ['screens', '🖥️ מסכים כלליים'],
  ['sorting', '🃏 מיון פיצ׳רים'],
  ['matching', '🔗 התאמה'],
  ['scenario', '🤔 תרחיש'],
  ['team', '✏️ משימת צוות'],
  ['final', '🏁 סיום'],
  ['submission', '📋 הגשה'],
  ['raw', '🧩 JSON מלא']
];

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const esc = (str='') => String(str)
  .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
  .replaceAll('"','&quot;').replaceAll("'","&#039;");

function getPath(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}
function setPath(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  keys.slice(0, -1).forEach(k => cur = cur[k]);
  cur[keys.at(-1)] = value;
}

async function loadConfig() {
  const res = await fetch('config.json', { cache: 'no-store' });
  CFG = await res.json();
  renderEditor();
}

function renderEditor() {
  renderTabs();
  renderPanels();
  attachGlobalActions();
}

function renderTabs() {
  $('#tabs').innerHTML = tabs.map(([id, label]) =>
    `<button class="tab-btn ${id === activeTab ? 'active' : ''}" data-tab="${id}">${label}</button>`
  ).join('');
  $$('.tab-btn').forEach(btn => btn.onclick = () => {
    activeTab = btn.dataset.tab;
    renderEditor();
  });
}

function panel(id, title, html) {
  return `<section class="editor-panel ${id === activeTab ? 'active' : ''}" id="panel-${id}">
    <h2 style="font-size:26px;margin-bottom:14px;">${title}</h2>
    ${html}
  </section>`;
}

function field(label, path, type='text', opts={}) {
  const val = getPath(CFG, path);
  const kind = opts.kind || (type === 'number' ? 'number' : 'string');
  if (type === 'textarea') {
    return `<div class="field">
      <label>${esc(label)}</label>
      <textarea class="text-area" data-path="${path}" data-kind="${kind}">${esc(val ?? '')}</textarea>
    </div>`;
  }
  if (type === 'checkbox') {
    return `<div class="field">
      <label><input type="checkbox" data-path="${path}" data-kind="boolean" ${val ? 'checked' : ''}> ${esc(label)}</label>
    </div>`;
  }
  if (type === 'select') {
    return `<div class="field">
      <label>${esc(label)}</label>
      <select data-path="${path}" data-kind="${kind}">
        ${(opts.options || []).map(o => `<option value="${esc(o.value)}" ${String(val)===String(o.value)?'selected':''}>${esc(o.label)}</option>`).join('')}
      </select>
    </div>`;
  }
  return `<div class="field">
    <label>${esc(label)}</label>
    <input class="text-input" type="${type}" data-path="${path}" data-kind="${kind}" value="${esc(val ?? '')}">
  </div>`;
}

function renderPanels() {
  $('#panels').innerHTML = [
    panel('design', 'עיצוב', designPanel()),
    panel('game', 'משחק וקוד', gamePanel()),
    panel('screens', 'מסכים כלליים', screensPanel()),
    panel('sorting', 'מיון פיצ׳רים', sortingPanel()),
    panel('matching', 'התאמה', matchingPanel()),
    panel('scenario', 'תרחיש החלטה', scenarioPanel()),
    panel('team', 'משימת צוות', teamPanel()),
    panel('final', 'סיום והגשה', finalPanel()),
    panel('submission', 'Google Form והגשה', submissionPanel()),
    panel('raw', 'JSON מלא', rawPanel())
  ].join('');

  $('#panels').addEventListener('input', handleInput);
  $('#panels').addEventListener('change', handleInput);
  attachPanelButtons();
}

function designPanel() {
  return `
    <div class="form-grid">
      ${field('צבע ראשי', 'design.primaryColor', 'color')}
      ${field('צבע משני', 'design.secondaryColor', 'color')}
      ${field('צבע הדגשה', 'design.accentColor', 'color')}
      ${field('צבע רקע', 'design.backgroundColor', 'color')}
      ${field('צבע כרטיסים', 'design.surfaceColor', 'color')}
      ${field('צבע טקסט', 'design.textColor', 'color')}
      ${field('צבע טקסט משני', 'design.mutedTextColor', 'color')}
      ${field('גודל פונט בסיסי', 'design.fontSizeBase', 'number', {kind:'number'})}
      ${field('עיגול פינות לכרטיסים', 'design.cardRadius', 'number', {kind:'number'})}
      ${field('גופן', 'design.fontFamily', 'select', {options:[
        {value:'"Segoe UI", Arial, sans-serif', label:'Segoe UI'},
        {value:'Arial, sans-serif', label:'Arial'},
        {value:'Tahoma, sans-serif', label:'Tahoma'},
        {value:'"Noto Sans Hebrew", "Segoe UI", Arial, sans-serif', label:'Noto/Segoe Hebrew'}
      ]})}
    </div>`;
}

function gamePanel() {
  return `
    <div class="form-grid">
      ${field('כותרת פעילות', 'meta.title')}
      ${field('כותרת משנה', 'meta.subtitle')}
      ${field('קוד סופי', 'game.finalCode')}
      ${field('טקסט כפתור מפת האתגר', 'game.mapButtonText')}
    </div>
    ${field('נעילת שלבים לפי סדר', 'game.lockNavigation', 'checkbox')}
    ${field('הצגת קוד שנאסף בסרגל העליון', 'game.showCodeBadge', 'checkbox')}
    ${field('הודעה כששלב נעול', 'game.lockedMessage', 'textarea')}
    ${field('תזכורת כתיבת ספרה', 'game.digitReminder', 'textarea')}`;
}

function screensPanel() {
  const generic = CFG.screens.filter(s => ['intro','content'].includes(s.type));
  return generic.map((s, idx) => {
    const i = CFG.screens.indexOf(s);
    return `<div class="item-editor">
      <h3>${esc(s.icon || '')} מסך ${i+1}: ${esc(s.navTitle || s.title)}</h3>
      <div class="form-grid">
        ${field('שם במפת האתגר', `screens.${i}.navTitle`)}
        ${field('אייקון', `screens.${i}.icon`)}
        ${field('כותרת', `screens.${i}.title`)}
        ${field('טקסט כפתור', `screens.${i}.button`)}
      </div>
      ${field('טקסט מרכזי', `screens.${i}.body`, 'textarea')}
      ${s.type === 'content' ? `
        ${field('כותרת רשימת MVP', `screens.${i}.pillsTitle`)}
        ${arraySimpleEditor(`screens.${i}.pills`, 'עקרונות MVP')}
        ${field('הערה/הנחיה', `screens.${i}.note`, 'textarea')}
      ` : ''}
    </div>`;
  }).join('');
}

function sortingPanel() {
  const i = CFG.screens.findIndex(s => s.type === 'sorting');
  const s = CFG.screens[i];
  return `
    <div class="item-editor">
      <div class="form-grid">
        ${field('שם במפת האתגר', `screens.${i}.navTitle`)}
        ${field('אייקון', `screens.${i}.icon`)}
        ${field('כותרת', `screens.${i}.title`)}
        ${field('ספרת קוד', `screens.${i}.digit`)}
        ${field('כפתור בדיקה', `screens.${i}.checkButton`)}
        ${field('כפתור איפוס', `screens.${i}.resetButton`)}
        ${field('כפתור המשך', `screens.${i}.nextButton`)}
      </div>
      ${field('הנחיה', `screens.${i}.instruction`, 'textarea')}
      <h3>קטגוריות</h3>
      ${(s.categories || []).map((c, ci) => `<div class="item-editor">
        ${field(`קטגוריה ${ci+1}`, `screens.${i}.categories.${ci}.label`)}
        ${field(`צבע קטגוריה ${ci+1}`, `screens.${i}.categories.${ci}.color`, 'select', {options:[
          {value:'green', label:'ירוק'},
          {value:'blue', label:'כחול'},
          {value:'red', label:'אדום'},
          {value:'', label:'רגיל'}
        ]})}
      </div>`).join('')}
      <h3>כרטיסיות פיצ׳רים</h3>
      <div id="featuresEditor">
        ${(s.features || []).map((f, fi) => featureEditor(i, fi, s)).join('')}
      </div>
      <button class="btn" data-action="addFeature" data-screen="${i}">הוספת פיצ׳ר</button>
      <h3>פידבקים</h3>
      ${field('טרם הושלם', `screens.${i}.feedback.incomplete`, 'textarea')}
      ${field('הצלחה', `screens.${i}.feedback.correct`, 'textarea')}
      ${field('טעות', `screens.${i}.feedback.wrong`, 'textarea')}
    </div>`;
}

function featureEditor(screenIndex, fi, s) {
  return `<div class="item-editor">
    <div class="form-grid">
      ${field(`פיצ׳ר ${fi+1}`, `screens.${screenIndex}.features.${fi}.text`)}
      ${field('קטגוריה נכונה', `screens.${screenIndex}.features.${fi}.category`, 'select', {kind:'number', options:(s.categories||[]).map((c, idx)=>({value:String(idx),label:c.label}))})}
    </div>
    <button class="btn btn-danger" data-action="removeFeature" data-screen="${screenIndex}" data-index="${fi}">מחיקת פיצ׳ר</button>
  </div>`;
}

function matchingPanel() {
  const i = CFG.screens.findIndex(s => s.type === 'matching');
  const s = CFG.screens[i];
  return `
    <div class="item-editor">
      <div class="form-grid">
        ${field('שם במפת האתגר', `screens.${i}.navTitle`)}
        ${field('אייקון', `screens.${i}.icon`)}
        ${field('כותרת', `screens.${i}.title`)}
        ${field('ספרת קוד', `screens.${i}.digit`)}
        ${field('כותרת צד ימין', `screens.${i}.leftTitle`)}
        ${field('כותרת צד שמאל', `screens.${i}.rightTitle`)}
        ${field('כפתור בדיקה', `screens.${i}.checkButton`)}
        ${field('כפתור איפוס', `screens.${i}.resetButton`)}
        ${field('כפתור המשך', `screens.${i}.nextButton`)}
      </div>
      ${field('הנחיה', `screens.${i}.instruction`, 'textarea')}

      <h3>גרסאות אתר</h3>
      ${(s.left || []).map((item, idx)=>`
        <div class="item-editor">
          <div class="form-grid">
            ${field(`מזהה ${idx+1}`, `screens.${i}.left.${idx}.id`)}
            ${field(`טקסט ${idx+1}`, `screens.${i}.left.${idx}.text`)}
            ${field('התאמה נכונה', `screens.${i}.correctPairs.${item.id}`, 'select', {options:(s.right||[]).map(r=>({value:r.id,label:`${r.id} — ${r.text}`}))})}
          </div>
        </div>`).join('')}

      <h3>אבחונים</h3>
      ${(s.right || []).map((item, idx)=>`
        <div class="item-editor">
          <div class="form-grid">
            ${field(`מזהה ${idx+1}`, `screens.${i}.right.${idx}.id`)}
            ${field(`טקסט ${idx+1}`, `screens.${i}.right.${idx}.text`)}
          </div>
        </div>`).join('')}

      <h3>פידבקים</h3>
      ${field('טרם הושלם', `screens.${i}.feedback.incomplete`, 'textarea')}
      ${field('הצלחה', `screens.${i}.feedback.correct`, 'textarea')}
      ${field('טעות', `screens.${i}.feedback.wrong`, 'textarea')}
    </div>`;
}

function scenarioPanel() {
  const i = CFG.screens.findIndex(s => s.type === 'scenario');
  const s = CFG.screens[i];
  return `
    <div class="item-editor">
      <div class="form-grid">
        ${field('שם במפת האתגר', `screens.${i}.navTitle`)}
        ${field('אייקון', `screens.${i}.icon`)}
        ${field('כותרת', `screens.${i}.title`)}
        ${field('ספרת קוד', `screens.${i}.digit`)}
        ${field('כפתור המשך', `screens.${i}.nextButton`)}
      </div>
      ${field('טקסט פתיחה', `screens.${i}.body`, 'textarea')}
      ${field('שאלה', `screens.${i}.question`, 'textarea')}

      <h3>אפשרויות</h3>
      ${(s.options || []).map((opt, oi)=>`
        <div class="item-editor">
          <div class="form-grid">
            ${field(`אות אפשרות ${oi+1}`, `screens.${i}.options.${oi}.id`)}
            ${field(`טקסט אפשרות ${oi+1}`, `screens.${i}.options.${oi}.text`)}
          </div>
          ${field('זו התשובה הנכונה', `screens.${i}.options.${oi}.correct`, 'checkbox')}
        </div>`).join('')}

      <h3>פידבקים</h3>
      ${field('הצלחה', `screens.${i}.feedback.correct`, 'textarea')}
      ${field('טעות', `screens.${i}.feedback.wrong`, 'textarea')}
    </div>`;
}

function teamPanel() {
  const i = CFG.screens.findIndex(s => s.type === 'teamTask');
  const s = CFG.screens[i];
  return `
    <div class="item-editor">
      <div class="form-grid">
        ${field('שם במפת האתגר', `screens.${i}.navTitle`)}
        ${field('אייקון', `screens.${i}.icon`)}
        ${field('כותרת', `screens.${i}.title`)}
        ${field('ספרת קוד', `screens.${i}.digit`)}
        ${field('כפתור אישור', `screens.${i}.approvalButton`)}
        ${field('כפתור המשך אחרי אישור', `screens.${i}.finalButton`)}
      </div>
      ${field('טקסט פתיחה', `screens.${i}.body`, 'textarea')}
      ${field('הנחיה לפתיחת מסמך', `screens.${i}.documentInstruction`, 'textarea')}
      ${field('כותרת המשימה', `screens.${i}.taskTitle`)}
      <h3>שאלות פתוחות</h3>
      ${(s.questions || []).map((q, qi)=>`
        <div class="item-editor">
          <div class="form-grid">
            ${field(`מזהה שאלה ${qi+1}`, `screens.${i}.questions.${qi}.id`)}
            ${field(`שאלה ${qi+1}`, `screens.${i}.questions.${qi}.label`)}
            ${field(`Placeholder ${qi+1}`, `screens.${i}.questions.${qi}.placeholder`)}
          </div>
        </div>`).join('')}
      ${field('Checkpoint', `screens.${i}.checkpoint`, 'textarea')}
      ${field('הערת זום', `screens.${i}.zoomNote`, 'textarea')}
    </div>`;
}

function finalPanel() {
  const i = CFG.screens.findIndex(s => s.type === 'final');
  return `
    <div class="item-editor">
      <div class="form-grid">
        ${field('שם במפת האתגר', `screens.${i}.navTitle`)}
        ${field('אייקון', `screens.${i}.icon`)}
        ${field('כותרת', `screens.${i}.title`)}
        ${field('כפתור פתיחה', `screens.${i}.unlockButton`)}
        ${field('כפתור סיום', `screens.${i}.finishButton`)}
      </div>
      ${field('טקסט לפני הקוד', `screens.${i}.body`, 'textarea')}
      ${field('הודעת קוד שגוי', `screens.${i}.wrongCode`, 'textarea')}
      ${field('כותרת הצלחה', `screens.${i}.successTitle`, 'textarea')}
      ${field('טקסט הצלחה', `screens.${i}.successBody`, 'textarea')}
      ${field('רפלקציה', `screens.${i}.reflection`, 'textarea')}
    </div>`;
}

function submissionPanel() {
  return `
    ${field('הפעלת אזור הגשה', 'submission.enabled', 'checkbox')}
    <div class="form-grid">
      ${field('כותרת אזור הגשה', 'submission.title')}
      ${field('Label לשם צוות', 'submission.teamNameLabel')}
      ${field('Placeholder לשם צוות', 'submission.teamNamePlaceholder')}
      ${field('טקסט כפתור שליחה', 'submission.button')}
    </div>
    ${field('הסבר הגשה', 'submission.intro', 'textarea')}
    ${field('הערת סיכום תשובות', 'submission.summaryNote', 'textarea')}
    ${field('הודעה כשחסר שם צוות', 'submission.missingTeamName', 'textarea')}
    ${field('הודעה כשאין Google Form', 'submission.noFormFallback', 'textarea')}
    ${field('הודעה אחרי פתיחת Google Form', 'submission.openedMessage', 'textarea')}
    <div class="item-editor">
      <h3>Google Form prefill URL</h3>
      ${field('כתובת prefill', 'submission.prefillUrl', 'textarea')}
      <p class="small">הכתובת יכולה לכלול את הטוקנים: <code>{team}</code>, <code>{ans1}</code>, <code>{ans2}</code>, <code>{ans3}</code>, <code>{ans4}</code>.</p>
    </div>`;
}

function rawPanel() {
  return `
    <p class="body-text">אפשר לערוך כאן ידנית רק אם צריך. אחרי עדכון ידני לחצו “עדכון מה־JSON”.</p>
    <textarea class="text-area" id="rawJson" style="min-height:420px;direction:ltr;text-align:left;font-family:Consolas,monospace;">${esc(JSON.stringify(CFG, null, 2))}</textarea>
    <div class="editor-actions">
      <button class="btn btn-secondary" id="applyRaw">עדכון מה־JSON</button>
    </div>`;
}

function arraySimpleEditor(path, label) {
  const arr = getPath(CFG, path) || [];
  return `<div class="item-editor">
    <h3>${esc(label)}</h3>
    ${arr.map((v, i)=>`
      <div class="field">
        <label>פריט ${i+1}</label>
        <input class="text-input" data-path="${path}.${i}" value="${esc(v)}">
      </div>`).join('')}
  </div>`;
}

function handleInput(e) {
  const el = e.target;
  const path = el.dataset?.path;
  if (!path) return;
  let value;
  if (el.dataset.kind === 'boolean') value = el.checked;
  else if (el.dataset.kind === 'number') value = Number(el.value);
  else value = el.value;
  setPath(CFG, path, value);
}

function attachPanelButtons() {
  $$('[data-action="addFeature"]').forEach(btn => btn.onclick = () => {
    const screenIndex = Number(btn.dataset.screen);
    CFG.screens[screenIndex].features.push({text:'פיצ׳ר חדש', category:0});
    renderEditor();
  });
  $$('[data-action="removeFeature"]').forEach(btn => btn.onclick = () => {
    const screenIndex = Number(btn.dataset.screen);
    const index = Number(btn.dataset.index);
    CFG.screens[screenIndex].features.splice(index, 1);
    renderEditor();
  });
  const raw = $('#applyRaw');
  if (raw) raw.onclick = () => {
    try {
      CFG = JSON.parse($('#rawJson').value);
      activeTab = 'design';
      renderEditor();
      alert('ה־JSON עודכן בהצלחה.');
    } catch (err) {
      alert('יש שגיאה ב־JSON: ' + err.message);
    }
  };
}

function attachGlobalActions() {
  $('#downloadConfig').onclick = downloadConfig;
  $('#copyConfig').onclick = async () => {
    await navigator.clipboard.writeText(JSON.stringify(CFG, null, 2));
    alert('ה־JSON הועתק ללוח.');
  };
  $('#importConfig').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      CFG = JSON.parse(await file.text());
      renderEditor();
      alert('הקובץ נטען בהצלחה.');
    } catch (err) {
      alert('לא ניתן לקרוא את הקובץ: ' + err.message);
    }
  };
}

function downloadConfig() {
  const blob = new Blob([JSON.stringify(CFG, null, 2)], {type:'application/json;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'config.json';
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(a.href);
  a.remove();
}

loadConfig().catch(err => {
  document.body.innerHTML = `<main class="editor-shell"><div class="editor-header"><h1>שגיאה בטעינת config.json</h1><p>${esc(err.message)}</p></div></main>`;
});
