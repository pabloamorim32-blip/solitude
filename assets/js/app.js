/* Entre margens — lógica do diário. Tudo roda no navegador; nada é enviado a servidores. */
(function () {
  'use strict';

  const { DAYS, DAILY_GOALS, PRACTICES, WEEK_LABELS, WEEK_FOCI, PREP, MAINT } = window.EM_DATA;

  const STORAGE_KEY = 'entre-margens-diario-v1';
  const EXPORT_FORMAT = 'entre-margens-v1';
  const VIEWS = ['home', 'journey', 'practices', 'reviews', 'ideas'];
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const MAX_TEXT = 20000;
  const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

  const ENTRY_TEXT_FIELDS = ['dayIntention', 'dayJournal', 'activity', 'motivation', 'solitudeMode', 'dayLoad',
    'protocolUsed', 'automatic', 'deliberate', 'disturbance', 'dayValue', 'functioning', 'freeNote'];
  const ENTRY_MINUTE_FIELDS = ['screenTotalMinutes', 'socialMinutes', 'minutes'];
  const SCORE_FIELDS = ['autonomy', 'comfort', 'contactUrgency', 'socialFrustration', 'reactivity', 'pleasure'];
  const SCORE_LABELS = {
    autonomy: 'Autonomia da escolha',
    comfort: 'Conforto na solitude',
    contactUrgency: 'Vontade urgente de contato',
    socialFrustration: 'Frustração por não socializar',
    reactivity: 'Reatividade emocional',
    pleasure: 'Prazer geral no dia'
  };
  const REVIEW_GROUP = /^(week[1-4]|monthly)$/;

  const $ = (id) => document.getElementById(id);

  /* ---------- utilidades de DOM ---------- */
  function el(tag, props, ...children) {
    const node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach((key) => {
        const value = props[key];
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = value;
        else if (key === 'dataset') Object.assign(node.dataset, value);
        else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
        else node.setAttribute(key, value);
      });
    }
    children.flat().forEach((child) => {
      if (child === null || child === undefined || child === false) return;
      node.append(child.nodeType ? child : document.createTextNode(String(child)));
    });
    return node;
  }
  function icon(id) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'inline-icon');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#' + id);
    svg.appendChild(use);
    return svg;
  }
  function prefersReducedMotion() {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function smooth() { return prefersReducedMotion() ? 'auto' : 'smooth'; }

  /* ---------- datas ---------- */
  function localDateString(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }
  function dateFromString(value) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d, 12);
  }
  function isDateString(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && localDateString(dateFromString(value)) === value;
  }
  function shiftDate(value, amount) {
    const date = dateFromString(value);
    date.setDate(date.getDate() + amount);
    return localDateString(date);
  }
  function dayDifference(a, b) {
    return Math.round((dateFromString(a).getTime() - dateFromString(b).getTime()) / 86400000);
  }
  function prettyDate(value, options) {
    return dateFromString(value).toLocaleDateString('pt-BR', options || { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  function todayString() { return localDateString(new Date()); }

  /* ---------- estado e armazenamento ---------- */
  function sanitizeEntry(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const entry = {};
    ENTRY_TEXT_FIELDS.forEach((key) => {
      const value = raw[key];
      if (typeof value === 'string' && value.trim() !== '') entry[key] = value.slice(0, MAX_TEXT);
    });
    ENTRY_MINUTE_FIELDS.forEach((key) => {
      const value = raw[key];
      if (value === '' || value === null || value === undefined) return;
      const number = Number(value);
      if (Number.isFinite(number)) entry[key] = String(Math.min(1440, Math.max(0, Math.round(number))));
    });
    SCORE_FIELDS.forEach((key) => {
      const value = raw[key];
      if (value === '' || value === null || value === undefined) return;
      const number = Number(value);
      if (Number.isInteger(number) && number >= 0 && number <= 10) entry[key] = number;
    });
    if (Object.keys(entry).length === 0) return null;
    if (typeof raw.updatedAt === 'string' && !Number.isNaN(Date.parse(raw.updatedAt))) entry.updatedAt = raw.updatedAt;
    return entry;
  }
  function sanitizeReviews(raw) {
    const clean = {};
    if (!raw || typeof raw !== 'object') return clean;
    Object.keys(raw).forEach((group) => {
      if (!REVIEW_GROUP.test(group) || !raw[group] || typeof raw[group] !== 'object') return;
      Object.keys(raw[group]).forEach((q) => {
        const value = raw[group][q];
        if (/^[0-4]$/.test(q) && typeof value === 'string' && value.trim() !== '') {
          if (!clean[group]) clean[group] = {};
          clean[group][q] = value.slice(0, MAX_TEXT);
        }
      });
    });
    return clean;
  }
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const entries = {};
      if (parsed && parsed.entries && typeof parsed.entries === 'object') {
        Object.keys(parsed.entries).forEach((date) => {
          if (!isDateString(date)) return;
          const entry = sanitizeEntry(parsed.entries[date]);
          if (entry) entries[date] = entry;
        });
      }
      return {
        startDate: isDateString(parsed && parsed.startDate) ? parsed.startDate : '',
        entries,
        reviews: sanitizeReviews(parsed && parsed.reviews)
      };
    } catch (error) {
      return { startDate: '', entries: {}, reviews: {} };
    }
  }

  let state = loadState();
  let activeDate = todayString();
  let currentGoalSuggestion = '';
  let saveTimer;
  let toastTimer;
  let dirty = false;

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      showToast('Não foi possível salvar. Confira o espaço disponível no navegador.');
      return false;
    }
  }
  function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }

  /* ---------- navegação ---------- */
  function setView(name, options) {
    const opts = options || {};
    if (!VIEWS.includes(name)) name = 'home';
    if (name === 'journey') { renderJourney(); renderStartControls(); }
    if (name === 'reviews') renderScaleOverview();
    document.querySelectorAll('.view').forEach((view) => { view.hidden = view.id !== 'view-' + name; });
    document.querySelectorAll('[data-view]').forEach((button) => {
      if (button.dataset.view === name) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    if (!opts.fromHash) {
      try { history.replaceState(null, '', '#' + name); } catch (error) { /* ambiente restrito */ }
    }
    window.scrollTo({ top: 0, behavior: smooth() });
    if (!opts.silent) {
      const heading = document.querySelector('#view-' + name + ' h1, #view-' + name + ' h2');
      if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
    }
  }

  /* ---------- ciclo de 28 dias ---------- */
  function journeyDay(value) {
    const date = value || activeDate;
    return state.startDate ? dayDifference(date, state.startDate) + 1 : 0;
  }
  function currentSession() {
    const n = journeyDay();
    if (n >= 1 && n <= 28) {
      return Object.assign({ n, inJourney: true, dayLabel: 'Dia ' + n + ' / 28', formLabel: 'Dia ' + n + ' / 28', goal: DAILY_GOALS[n - 1] }, DAYS[n - 1]);
    }
    if (n > 28) return Object.assign({ n, inJourney: false, dayLabel: 'manutenção', formLabel: 'Continuidade' }, MAINT);
    return Object.assign({ n, inJourney: false, dayLabel: 'preparação', formLabel: 'Preparação' }, PREP);
  }
  function refreshAll() {
    renderToday();
    renderJourney();
    renderStartControls();
  }
  function setupStart() {
    if (state.startDate) return;
    state.startDate = activeDate;
    persist();
    refreshAll();
    showToast('Ciclo iniciado. Ajuste o ritmo quando precisar.');
  }
  function renderJourneyInfo() {
    const current = journeyDay();
    const status = $('journeyStatus');
    const dateLabel = $('journeyDateLabel');
    const startNote = $('startNote');
    const startButton = $('startJourney');
    const fill = $('progressFill');
    const bar = $('progressBar');
    const caption = $('progressCaption');
    function progress(percent, now, text) {
      fill.style.width = percent + '%';
      bar.setAttribute('aria-valuenow', String(now));
      bar.setAttribute('aria-valuetext', text);
    }
    if (!state.startDate) {
      status.textContent = 'Preparação';
      dateLabel.textContent = 'seu ritmo, suas escolhas';
      startNote.textContent = 'O ciclo começa quando fizer sentido. Não há sequência perfeita a manter; pausas e ajustes fazem parte.';
      startButton.hidden = false;
      startButton.textContent = activeDate === todayString()
        ? 'Começar o ciclo hoje'
        : 'Começar o ciclo em ' + prettyDate(activeDate, { day: 'numeric', month: 'long' });
      caption.textContent = '28 dias de aprendizagem';
      progress(0, 0, 'ciclo ainda não iniciado');
    } else if (current < 1) {
      status.textContent = 'Antes do início';
      dateLabel.textContent = 'início em ' + prettyDate(state.startDate, { day: 'numeric', month: 'short' });
      startNote.textContent = 'A data de início já está definida. Você pode registrar este dia sem antecipar as práticas.';
      startButton.hidden = true;
      caption.textContent = 'preparação';
      progress(0, 0, 'antes do início do ciclo');
    } else if (current <= 28) {
      status.textContent = 'Dia ' + current + ' / 28';
      dateLabel.textContent = 'ciclo inicial';
      startNote.textContent = 'Uma prática por vez. Se precisar pausar, retome sem compensar dias.';
      startButton.hidden = true;
      caption.textContent = 'aprendizagem em andamento';
      progress(Math.min(100, (current / 28) * 100), current, 'dia ' + current + ' de 28');
    } else {
      status.textContent = 'Continuidade';
      dateLabel.textContent = 'depois do ciclo inicial';
      startNote.textContent = 'Os 28 dias são uma etapa de aprendizagem; as práticas podem continuar, mudar ou terminar.';
      startButton.hidden = true;
      caption.textContent = 'fase de manutenção';
      progress(100, 28, 'ciclo inicial concluído');
    }
    const count = Object.keys(state.entries).length;
    $('entryCount').textContent = count + ' ' + (count === 1 ? 'registro' : 'registros');
    $('topDate').textContent = prettyDate(activeDate);
  }
  function renderStartControls() {
    const input = $('startDateInput');
    if (!input) return;
    input.value = state.startDate || activeDate;
    $('startCardText').textContent = state.startDate
      ? 'O Dia 1 foi em ' + prettyDate(state.startDate, { day: 'numeric', month: 'long', year: 'numeric' }) + '. Você pode corrigir a data sem perder registros.'
      : 'O ciclo ainda não começou. Escolha o dia que será o Dia 1, ou comece pelo botão da tela inicial.';
    $('saveStartDate').textContent = state.startDate ? 'Atualizar data' : 'Começar nesta data';
    $('resetStart').hidden = !state.startDate;
  }

  /* ---------- tela, redes e painéis ---------- */
  function formatScreenMinutes(value) {
    const minutes = Math.max(0, Math.round(Number(value) || 0));
    return Math.floor(minutes / 60) + 'h ' + String(minutes % 60).padStart(2, '0') + 'm';
  }
  function hasValue(value) {
    return value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value));
  }
  function renderScreenMonitor() {
    const days = Array.from({ length: 7 }, (_, index) => shiftDate(activeDate, index - 6));
    const rows = days.map((date) => ({ date, entry: state.entries[date] || {} }));
    const scaleMax = Math.max(60, ...rows.map((r) => Math.max(Number(r.entry.screenTotalMinutes) || 0, Number(r.entry.socialMinutes) || 0)));
    const totalRows = rows.filter((row) => hasValue(row.entry.screenTotalMinutes));
    const socialRows = rows.filter((row) => hasValue(row.entry.socialMinutes));
    const average = (list, key) => list.length ? Math.round(list.reduce((sum, row) => sum + Number(row.entry[key]), 0) / list.length) : null;
    const totalAverage = average(totalRows, 'screenTotalMinutes');
    const socialAverage = average(socialRows, 'socialMinutes');
    $('screenAverageTotal').textContent = totalAverage === null ? '—' : formatScreenMinutes(totalAverage);
    $('screenAverageSocial').textContent = socialAverage === null ? '—' : formatScreenMinutes(socialAverage);
    $('screenCount').textContent = String(rows.filter((row) => hasValue(row.entry.screenTotalMinutes) || hasValue(row.entry.socialMinutes)).length);
    const chart = $('screenChart');
    chart.replaceChildren();
    if (!totalRows.length && !socialRows.length) {
      chart.appendChild(el('div', { class: 'screen-empty', text: 'Quando você registrar minutos no diário, o panorama aparecerá aqui.' }));
      return;
    }
    rows.forEach(({ date, entry }) => {
      const dayLabel = dateFromString(date).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }).replace('.', '');
      const row = el('div', { class: 'screen-row' }, el('span', { class: 'screen-day', text: dayLabel }));
      [['Tela total', 'screenTotalMinutes', 'total'], ['Redes sociais', 'socialMinutes', 'social']].forEach(([name, key, type]) => {
        const present = hasValue(entry[key]);
        const width = present ? Math.min(100, Math.max(0, Number(entry[key]) / scaleMax * 100)) : 0;
        const bar = el('span');
        bar.style.width = width + '%';
        row.appendChild(el('div', { class: 'screen-metric ' + type },
          el('div', { class: 'screen-metric-top' }, el('span', { text: name }), el('strong', { text: present ? formatScreenMinutes(entry[key]) : '—' })),
          el('div', { class: 'screen-track', 'aria-hidden': 'true' }, bar)));
      });
      row.setAttribute('aria-label', dayLabel + ': tela ' + (hasValue(entry.screenTotalMinutes) ? formatScreenMinutes(entry.screenTotalMinutes) : 'sem registro') +
        '; redes sociais ' + (hasValue(entry.socialMinutes) ? formatScreenMinutes(entry.socialMinutes) : 'sem registro'));
      chart.appendChild(row);
    });
  }
  function checkScreenFields() {
    const total = $('screenTotalMinutes').value;
    const social = $('socialMinutes').value;
    const warn = $('screenWarning');
    warn.textContent = (total !== '' && social !== '' && Number(social) > Number(total))
      ? 'As redes sociais contam dentro do total de tela. Vale conferir se os minutos estão certos — o registro continua sendo salvo.'
      : '';
  }
  function renderScaleOverview() {
    const host = $('scaleOverview');
    if (!host) return;
    host.replaceChildren();
    const today = todayString();
    const recentFrom = shiftDate(today, -6);
    const previousFrom = shiftDate(today, -13);
    const previousTo = shiftDate(today, -7);
    function stats(key, from, to) {
      const values = Object.keys(state.entries)
        .filter((date) => date >= from && date <= to && hasValue(state.entries[date][key]))
        .map((date) => Number(state.entries[date][key]));
      return { n: values.length, mean: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null };
    }
    const format = (s) => s.n ? (Math.round(s.mean * 10) / 10).toLocaleString('pt-BR') + ' (' + s.n + (s.n === 1 ? ' dia)' : ' dias)') : '—';
    const rows = SCORE_FIELDS.map((key) => ({ key, recent: stats(key, recentFrom, today), previous: stats(key, previousFrom, previousTo) }));
    if (rows.every((r) => !r.recent.n && !r.previous.n)) {
      host.appendChild(el('div', { class: 'screen-empty', text: 'Quando você preencher as escalas no diário, as médias aparecerão aqui.' }));
      return;
    }
    const table = el('table', { class: 'scale-table' },
      el('caption', { class: 'sr-only', text: 'Médias das escalas informais nos últimos sete dias e nos sete dias anteriores' }),
      el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Escala' }), el('th', { scope: 'col', text: 'Últimos 7 dias' }), el('th', { scope: 'col', text: '7 dias anteriores' }))),
      el('tbody', null, rows.map((r) => el('tr', null, el('td', { text: SCORE_LABELS[r.key] }), el('td', { text: format(r.recent) }), el('td', { text: format(r.previous) })))));
    host.appendChild(el('div', { class: 'table-scroll' }, table));
  }

  /* ---------- hoje / formulário ---------- */
  function renderToday() {
    const session = currentSession();
    $('todayDayLabel').textContent = session.dayLabel;
    $('todayFocus').textContent = session.focus;
    $('todayTitle').textContent = session.title;
    $('todayDescription').textContent = session.text;
    $('todayMicro').textContent = session.tip;
    $('todayDayLabelForm').textContent = session.formLabel;
    currentGoalSuggestion = session.goal;
    $('goalSuggestion').textContent = currentGoalSuggestion;
    const dateInput = $('entryDate');
    dateInput.value = activeDate;
    dateInput.setAttribute('aria-label', 'Data do registro: ' + prettyDate(activeDate));
    hydrateEntry();
    renderJourneyInfo();
    renderScreenMonitor();
  }
  function renderScales() {
    document.querySelectorAll('.number-scale').forEach((scale) => {
      const name = SCORE_LABELS[scale.dataset.metric];
      scale.setAttribute('role', 'group');
      for (let value = 0; value <= 10; value++) {
        scale.appendChild(el('button', {
          type: 'button', 'aria-pressed': 'false', 'aria-label': name + ': ' + value + ' de 10',
          dataset: { scoreValue: String(value) }, text: String(value)
        }));
      }
    });
  }
  function hydrateEntry() {
    const entry = state.entries[activeDate] || {};
    ENTRY_TEXT_FIELDS.concat(ENTRY_MINUTE_FIELDS).forEach((id) => {
      const node = $(id);
      if (node) node.value = entry[id] !== undefined ? entry[id] : '';
    });
    SCORE_FIELDS.forEach((id) => {
      const scale = document.querySelector('[data-metric="' + id + '"]');
      const out = $(id + 'Out');
      const has = entry[id] !== undefined && entry[id] !== '';
      scale.querySelectorAll('[data-score-value]').forEach((button) => {
        button.setAttribute('aria-pressed', has && Number(button.dataset.scoreValue) === Number(entry[id]) ? 'true' : 'false');
      });
      out.textContent = has ? entry[id] + '/10' : '—';
    });
    $('saveState').textContent = Object.keys(entry).length ? 'Registro salvo neste navegador.' : 'Este registro ainda não foi salvo.';
    checkScreenFields();
    dirty = false;
  }
  function captureEntry() {
    const raw = {};
    ENTRY_TEXT_FIELDS.concat(ENTRY_MINUTE_FIELDS).forEach((id) => {
      const node = $(id);
      if (node && node.value !== '') raw[id] = node.value;
    });
    SCORE_FIELDS.forEach((id) => {
      const selected = document.querySelector('[data-metric="' + id + '"] [aria-pressed="true"]');
      if (selected) raw[id] = Number(selected.dataset.scoreValue);
    });
    return sanitizeEntry(raw) || {};
  }
  function saveEntry(showMessage) {
    clearTimeout(saveTimer);
    dirty = false;
    const entry = captureEntry();
    const status = $('saveState');
    if (Object.keys(entry).length === 0) {
      if (state.entries[activeDate]) {
        delete state.entries[activeDate];
        persist();
        renderJourneyInfo();
        renderScreenMonitor();
      }
      status.textContent = 'Este registro ainda não foi salvo.';
      return;
    }
    entry.updatedAt = new Date().toISOString();
    state.entries[activeDate] = entry;
    const ok = persist();
    status.textContent = ok
      ? 'Salvo neste navegador · ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : 'Não foi possível salvar neste navegador.';
    renderJourneyInfo();
    renderScreenMonitor();
    if (showMessage && ok) showToast('Registro salvo neste navegador.');
  }
  function scheduleSave() {
    dirty = true;
    $('saveState').textContent = 'Salvando…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveEntry(false), 350);
  }
  function flushSave() { if (dirty) saveEntry(false); }
  function setActiveDate(value) {
    if (!isDateString(value)) return;
    flushSave();
    activeDate = value;
    renderToday();
    renderStartControls();
  }

  /* ---------- jornada ---------- */
  function openDayGoal(number) {
    if (!state.startDate) {
      const when = prettyDate(activeDate, { day: 'numeric', month: 'long' });
      if (!window.confirm('O ciclo ainda não começou. Iniciar o Dia 1 em ' + when + ' e abrir a meta do Dia ' + number + '?')) return;
      state.startDate = activeDate;
      persist();
    }
    setActiveDate(shiftDate(state.startDate, number - 1));
    renderJourney();
    setView('home');
    const goalField = $('dayIntention');
    goalField.focus({ preventScroll: true });
    goalField.scrollIntoView({ behavior: smooth(), block: 'center' });
  }
  function renderJourney() {
    const container = $('journeyList');
    container.replaceChildren();
    for (let week = 1; week <= 4; week++) {
      const list = el('div', { class: 'day-list' });
      DAYS.forEach((day, index) => {
        if (day.week !== week) return;
        const number = index + 1;
        const thisDate = state.startDate ? shiftDate(state.startDate, index) : null;
        const savedGoal = thisDate && state.entries[thisDate] ? state.entries[thisDate].dayIntention : '';
        const item = el('article', { class: 'day-item' + (journeyDay() === number ? ' is-current' : '') },
          el('div', { class: 'day-item-top' },
            el('div', { class: 'day-num', text: 'Dia ' + number }),
            el('div', { class: 'day-item-copy' }, el('strong', { text: day.focus }), el('p', { text: day.text })),
            el('button', { class: 'day-open', type: 'button', 'aria-label': 'Definir meta do dia ' + number, onclick: () => openDayGoal(number), text: 'Definir meta' })),
          el('div', { class: 'day-goal-line' },
            el('span', { class: 'day-goal-label' }, icon('icon-target'), ' Meta do dia'),
            el('p', { text: savedGoal || DAILY_GOALS[index] })));
        if (journeyDay() === number) item.setAttribute('aria-current', 'step');
        list.appendChild(item);
      });
      container.appendChild(el('div', { class: 'week-block' },
        el('div', { class: 'week-title' }, el('h3', { text: 'Semana ' + week + ' · ' + WEEK_LABELS[week - 1] }), el('p', { text: WEEK_FOCI[week - 1] })),
        list));
    }
  }

  /* ---------- práticas ---------- */
  function renderPractices() {
    const container = $('protocolGrid');
    container.replaceChildren();
    PRACTICES.forEach((p) => {
      container.appendChild(el('article', { class: 'protocol' },
        el('div', { class: 'protocol-head' }, el('span', { class: 'protocol-letter', text: p.letter }), el('h3', { text: p.title })),
        el('p', null, el('strong', { text: p.duration + '.' }), ' ' + p.text),
        el('details', null,
          el('summary', { text: 'Ver o passo a passo' }),
          el('ul', null, p.steps.map((step) => el('li', { text: step }))),
          el('p', { class: 'basis', text: p.basis })),
        el('button', { class: 'protocol-use', type: 'button', onclick: () => usePractice(p.letter), text: 'Levar esta prática ao diário →' })));
    });
  }
  function usePractice(letter) {
    const select = $('protocolUsed');
    const option = Array.from(select.options).find((item) => item.textContent.startsWith(letter + ' ·'));
    if (option) select.value = option.value;
    document.querySelector('.extras').open = true;
    setView('home', { silent: true });
    scheduleSave();
    $('entrySection').scrollIntoView({ behavior: smooth(), block: 'start' });
    showToast('Prática adicionada ao registro de hoje.');
  }
  function drawPractice() {
    const item = PRACTICES[Math.floor(Math.random() * PRACTICES.length)];
    const card = $('drawnCard');
    card.replaceChildren(
      el('strong', { text: 'Carta ' + item.letter + ' · ' + item.title }), el('br'),
      item.text + ' ', el('span', { class: 'muted', text: item.duration + '.' }), el('br'),
      el('button', { class: 'protocol-use', type: 'button', onclick: () => usePractice(item.letter), text: 'Levar esta ideia ao diário →' }));
    card.classList.add('visible');
  }

  /* ---------- revisões ---------- */
  function renderReviews() {
    const container = $('weeklyReviews');
    container.replaceChildren();
    const questions = [
      'O que foi escolhido livremente e o que foi feito por obrigação interna?',
      'Quando senti desconforto, consegui retomar uma atividade sem resolver tudo antes?',
      'O que vale a pena manter, simplificar ou abandonar na próxima semana?'
    ];
    for (let week = 1; week <= 4; week++) {
      const body = el('div', { class: 'review-body' }, el('p', { class: 'small muted', text: WEEK_FOCI[week - 1] }));
      questions.forEach((question, index) => {
        const id = 'week-' + week + '-' + index;
        body.appendChild(el('div', { class: 'field' },
          el('label', { for: id, text: question }),
          el('textarea', { id, dataset: { review: 'week' + week, q: String(index) } })));
      });
      container.appendChild(el('article', { class: 'review-card' },
        el('details', null,
          el('summary', null, el('strong', { text: 'Semana ' + week + ' · ' + WEEK_LABELS[week - 1] }), el('span', { text: 'revisão breve' })),
          body)));
    }
    document.querySelectorAll('[data-review]').forEach((field) => {
      const group = state.reviews[field.dataset.review];
      field.value = (group && group[field.dataset.q]) || '';
    });
  }
  function saveReviewField(field) {
    const group = field.dataset.review;
    const q = field.dataset.q;
    if (!state.reviews[group]) state.reviews[group] = {};
    if (field.value.trim()) state.reviews[group][q] = field.value.slice(0, MAX_TEXT);
    else delete state.reviews[group][q];
    if (Object.keys(state.reviews[group]).length === 0) delete state.reviews[group];
    const ok = persist();
    $('reviewSaveState').textContent = ok ? 'Revisão salva neste navegador.' : 'Não foi possível salvar a revisão.';
  }

  /* ---------- exportar / importar ---------- */
  function download(text, filename, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = el('a', { href: url, download: filename });
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportData() {
    flushSave();
    const payload = { format: EXPORT_FORMAT, exportedAt: new Date().toISOString(), startDate: state.startDate, entries: state.entries, reviews: state.reviews };
    download(JSON.stringify(payload, null, 2), 'entre-margens-' + todayString() + '.json', 'application/json');
    showToast('Cópia dos dados baixada.');
  }
  function csvCell(value) {
    let text = value === undefined || value === null ? '' : String(value);
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text; // evita interpretação como fórmula em planilhas
    return /[";\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }
  function exportCsv() {
    flushSave();
    const columns = [['date', 'Data']]
      .concat(SCORE_FIELDS.map((key) => [key, SCORE_LABELS[key] + ' (0-10)']))
      .concat([['screenTotalMinutes', 'Tela total (min)'], ['socialMinutes', 'Redes sociais (min)'], ['minutes', 'Tempo da atividade (min)'],
        ['motivation', 'Motivo'], ['solitudeMode', 'Como foi estar só'], ['dayLoad', 'Peso do dia'], ['protocolUsed', 'Prática usada'], ['functioning', 'Compromissos']]);
    const lines = [columns.map((c) => csvCell(c[1])).join(';')];
    Object.keys(state.entries).sort().forEach((date) => {
      const entry = state.entries[date];
      lines.push(columns.map(([key]) => csvCell(key === 'date' ? date : entry[key])).join(';'));
    });
    download('\uFEFF' + lines.join('\r\n'), 'entre-margens-' + todayString() + '.csv', 'text/csv;charset=utf-8');
    showToast('Planilha baixada (sem os textos do diário).');
  }
  function mergeImported(data) {
    const result = { added: 0, updated: 0, kept: 0, reviews: 0, conflicts: 0 };
    Object.keys(data.entries).forEach((date) => {
      if (!isDateString(date)) return;
      const incoming = sanitizeEntry(data.entries[date]);
      if (!incoming) return;
      const current = state.entries[date];
      if (!current) { state.entries[date] = incoming; result.added++; return; }
      const incomingTime = Date.parse(incoming.updatedAt || '') || 0;
      const currentTime = Date.parse(current.updatedAt || '') || 0;
      if (incomingTime > currentTime) { state.entries[date] = incoming; result.updated++; } else { result.kept++; }
    });
    const reviews = sanitizeReviews(data.reviews);
    Object.keys(reviews).forEach((group) => {
      Object.keys(reviews[group]).forEach((q) => {
        const current = state.reviews[group] && state.reviews[group][q];
        if (!current) {
          if (!state.reviews[group]) state.reviews[group] = {};
          state.reviews[group][q] = reviews[group][q];
          result.reviews++;
        } else if (current !== reviews[group][q]) {
          result.conflicts++;
        }
      });
    });
    if (!state.startDate && isDateString(data.startDate)) state.startDate = data.startDate;
    return result;
  }
  function importData(file) {
    if (file.size > MAX_IMPORT_BYTES) { showToast('Esse arquivo é grande demais para ser uma cópia do diário.'); return; }
    const reader = new FileReader();
    reader.onerror = () => showToast('Não consegui abrir esse arquivo.');
    reader.onload = () => {
      let data;
      try { data = JSON.parse(reader.result); } catch (error) { data = null; }
      if (!data || typeof data !== 'object' || !data.entries || typeof data.entries !== 'object') {
        showToast('Não consegui ler esse arquivo de diário.');
        return;
      }
      if (!window.confirm('Importar e mesclar este arquivo com os registros que já estão neste navegador? Quando o mesmo dia existir nos dois, vale o registro editado por último.')) return;
      flushSave();
      const result = mergeImported(data);
      persist();
      refreshAll();
      renderReviews();
      renderScaleOverview();
      let message = 'Importado: ' + result.added + ' novos, ' + result.updated + ' atualizados, ' + result.kept + ' mantidos.';
      if (result.conflicts) message += ' ' + result.conflicts + ' resposta(s) de revisão já existiam e foram mantidas.';
      showToast(message);
    };
    reader.readAsText(file);
  }

  /* ---------- IA (somente texto preparado para copiar) ---------- */
  function prepareAI() {
    flushSave();
    const entry = captureEntry();
    const labels = Object.assign({
      dayIntention: 'Meta do dia', dayJournal: 'Diário', screenTotalMinutes: 'Tela total (min)', socialMinutes: 'Redes sociais (min)',
      activity: 'Atividade', minutes: 'Tempo (min)', motivation: 'Motivo', solitudeMode: 'Como foi estar só', dayLoad: 'Peso do dia',
      protocolUsed: 'Prática usada', automatic: 'Impulso automático', deliberate: 'Escolha deliberada', disturbance: 'Perturbação',
      dayValue: 'O que teve valor', functioning: 'Compromissos', freeNote: 'Nota'
    }, SCORE_LABELS);
    const lines = ['Data: ' + prettyDate(activeDate, { day: 'numeric', month: 'long', year: 'numeric' })];
    Object.keys(entry).forEach((key) => {
      if (labels[key]) lines.push(labels[key] + ': ' + entry[key] + (SCORE_FIELDS.includes(key) ? '/10' : ''));
    });
    if (lines.length === 1) { showToast('Escreva algo no registro antes de preparar a análise.'); return; }
    const prompt = [
      'Leia este registro de diário com cuidado e responda em português, em até 250 palavras. Não faça diagnóstico, não conclua nada sobre minha personalidade a partir de um único dia e não trate solitude, pouca interação ou emoções como metas ou falhas.',
      'Responda assim: (1) um fato ou sentimento que aparece, sem julgamento; (2) uma escolha ou valor que você nota no texto; (3) um ponto que vale explorar com curiosidade; (4) uma pergunta aberta para eu continuar pensando.',
      'Se o texto expressar desejo pessoal de morrer ou risco imediato, priorize me incentivar a procurar apoio humano e ajuda urgente (no Brasil: CVV 188; SAMU 192 em emergência).',
      '',
      'Registro do dia:'
    ].concat(lines).join('\n');
    $('aiPrompt').value = prompt;
    $('aiCopyState').textContent = 'Depois de copiar, abra a IA que preferir e cole o prompt. O texto só sai do navegador quando você o cola em outro serviço.';
    $('aiConsent').checked = false;
    $('runAI').disabled = true;
    $('aiResult').hidden = true;
    const dialog = $('aiDialog');
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
  }
  async function copyPrompt() {
    const field = $('aiPrompt');
    const status = $('aiCopyState');
    try {
      await navigator.clipboard.writeText(field.value);
      status.textContent = 'Prompt copiado. Abra a IA que preferir e cole no campo de mensagem.';
      showToast('Prompt copiado.');
    } catch (error) {
      field.focus();
      field.select();
      let copied = false;
      try { copied = document.execCommand('copy'); } catch (e) { copied = false; }
      status.textContent = copied ? 'Prompt copiado. Abra a IA que preferir e cole no campo de mensagem.' : 'Selecione o texto acima e copie manualmente antes de abrir a IA.';
      showToast(copied ? 'Prompt copiado.' : 'Selecione o texto e copie manualmente.');
    }
  }

  async function runAI() {
    const button = $('runAI');
    const result = $('aiResult');
    button.disabled = true;
    result.hidden = false;
    result.textContent = 'Analisando…';
    try {
      const headers = { 'Content-Type': 'application/json' };
      const code = $('aiCode').value;
      if (code) headers['x-access-code'] = code;
      const response = await fetch('/api/analisar', { method: 'POST', headers, body: JSON.stringify({ prompt: $('aiPrompt').value }) });
      if (response.status === 401) {
        $('aiCodeField').hidden = false;
        result.textContent = 'Informe o código de acesso e tente de novo.';
      } else if (response.status === 404 || response.status === 503) {
        result.textContent = 'A análise integrada não está configurada neste site. Use “Copiar prompt” e cole na IA que preferir.';
      } else if (!response.ok) {
        result.textContent = 'Não consegui obter a análise agora. Tente de novo em instantes ou use “Copiar prompt”.';
      } else {
        const data = await response.json();
        result.textContent = typeof data.text === 'string' ? data.text : 'Resposta vazia.';
      }
    } catch (error) {
      result.textContent = 'Sem conexão com o serviço de análise. Use “Copiar prompt” se preferir.';
    }
    button.disabled = !$('aiConsent').checked;
  }

  /* ---------- busca de livros ---------- */
  function normalize(text) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  }
  function filterBooks(rawQuery) {
    const query = normalize(rawQuery.trim());
    let visible = 0;
    document.querySelectorAll('[data-book]').forEach((book) => {
      const match = normalize(book.textContent).includes(query);
      book.hidden = !match;
      if (match) visible++;
    });
    $('bookCount').textContent = visible + ' ' + (visible === 1 ? 'livro' : 'livros');
    $('bookEmpty').hidden = visible !== 0;
  }

  /* ---------- eventos ---------- */
  document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
  document.querySelectorAll('[data-scroll-entry]').forEach((button) => button.addEventListener('click', () => $('entrySection').scrollIntoView({ behavior: smooth(), block: 'start' })));
  document.querySelector('[data-go-home]').addEventListener('click', () => setView('home'));
  $('startJourney').addEventListener('click', setupStart);
  $('saveStartDate').addEventListener('click', () => {
    const value = $('startDateInput').value;
    if (!isDateString(value)) { showToast('Escolha uma data válida.'); return; }
    state.startDate = value;
    persist();
    refreshAll();
    showToast('Data de início atualizada. Seus registros foram mantidos.');
  });
  $('resetStart').addEventListener('click', () => {
    if (!window.confirm('Reiniciar o ciclo? Registros e revisões continuam salvos; apenas a data de início será removida.')) return;
    state.startDate = '';
    persist();
    refreshAll();
    showToast('Ciclo reiniciado. Escolha uma nova data quando quiser.');
  });

  $('entryDate').addEventListener('change', (event) => {
    if (!isDateString(event.target.value)) { event.target.value = activeDate; return; }
    setActiveDate(event.target.value);
  });
  $('prevDate').addEventListener('click', () => setActiveDate(shiftDate(activeDate, -1)));
  $('nextDate').addEventListener('click', () => setActiveDate(shiftDate(activeDate, 1)));
  $('todayDate').addEventListener('click', () => setActiveDate(todayString()));

  const form = $('dailyForm');
  form.addEventListener('input', () => { checkScreenFields(); scheduleSave(); });
  form.addEventListener('change', scheduleSave);
  form.addEventListener('click', (event) => {
    const button = event.target.closest('[data-score-value]');
    if (!button) return;
    const scale = button.closest('.number-scale');
    const wasOn = button.getAttribute('aria-pressed') === 'true';
    scale.querySelectorAll('[data-score-value]').forEach((item) => item.setAttribute('aria-pressed', item === button && !wasOn ? 'true' : 'false'));
    $(scale.dataset.metric + 'Out').textContent = wasOn ? '—' : button.dataset.scoreValue + '/10';
    scheduleSave();
  });
  form.addEventListener('submit', (event) => { event.preventDefault(); saveEntry(true); });
  $('clearDate').addEventListener('click', () => {
    if (!state.entries[activeDate]) { hydrateEntry(); return; }
    if (window.confirm('Apagar o registro de ' + prettyDate(activeDate) + '?')) {
      delete state.entries[activeDate];
      persist();
      hydrateEntry();
      renderJourneyInfo();
      renderScreenMonitor();
      renderJourney();
      showToast('Registro deste dia apagado.');
    }
  });
  $('useSuggestion').addEventListener('click', () => {
    $('dayIntention').value = currentGoalSuggestion;
    scheduleSave();
    showToast('Meta deste dia adicionada ao diário.');
  });

  document.addEventListener('input', (event) => {
    const field = event.target.closest && event.target.closest('[data-review]');
    if (field) saveReviewField(field);
  });
  window.addEventListener('pagehide', flushSave);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave(); });

  $('exportButton').addEventListener('click', exportData);
  $('exportButtonReview').addEventListener('click', exportData);
  $('exportCsv').addEventListener('click', exportCsv);
  $('importButton').addEventListener('click', () => $('importFile').click());
  $('importButtonReview').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', (event) => {
    if (event.target.files && event.target.files[0]) importData(event.target.files[0]);
    event.target.value = '';
  });
  $('printButton').addEventListener('click', () => window.print());
  $('clearAll').addEventListener('click', () => {
    if (!window.confirm('Apagar registros, metas diárias e revisões salvos neste navegador? Esta ação não pode ser desfeita. Baixe uma cópia antes, se quiser guardar.')) return;
    clearTimeout(saveTimer);
    dirty = false;
    state = { startDate: '', entries: {}, reviews: {} };
    persist();
    refreshAll();
    renderReviews();
    renderScaleOverview();
    showToast('Dados locais apagados.');
  });

  $('drawPractice').addEventListener('click', drawPractice);
  $('prepareAI').addEventListener('click', prepareAI);
  $('closeAI').addEventListener('click', () => $('aiDialog').close());
  $('aiDialog').addEventListener('click', (event) => { if (event.target === event.currentTarget) event.currentTarget.close(); });
  $('copyAI').addEventListener('click', copyPrompt);
  $('aiConsent').addEventListener('change', (event) => { $('runAI').disabled = !event.target.checked; });
  $('runAI').addEventListener('click', runAI);
  $('bookSearch').addEventListener('input', (event) => filterBooks(event.target.value));

  window.addEventListener('hashchange', () => {
    const name = location.hash.slice(1);
    if (VIEWS.includes(name)) setView(name, { fromHash: true });
  });

  /* ---------- início ---------- */
  renderScales();
  renderPractices();
  renderReviews();
  renderJourney();
  renderStartControls();
  renderToday();
  renderScaleOverview();
  const initialView = location.hash.slice(1);
  if (VIEWS.includes(initialView) && initialView !== 'home') setView(initialView, { fromHash: true, silent: true });

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { /* offline opcional */ }); });
  }
})();
