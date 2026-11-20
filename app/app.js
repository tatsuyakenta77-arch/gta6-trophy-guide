// Leonida Nights — GTA VI trophy tracker: loads app/data/trophies.json, renders the
// 55-trophy checklist, saves earned ticks in localStorage, exports/imports them,
// filters by kind/grade/search, and hides story spoilers until a trophy is earned.
const EARNED_KEY = 'leonida-nights-earned-v1';
const SPOILER_KEY = 'leonida-nights-spoiler-v1';
const KIND_LABELS = {
  all: 'All kinds', story: 'Story', missable: 'Missable', collectibles: 'Collectibles',
  activities: 'Activities', robberies: 'Robberies', exploration: 'Exploration',
  money: 'Money', side: 'Side quests', misc: 'One-offs', online: 'Online',
};
const GRADE_LABELS = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };

const listEl = document.getElementById('list');
const detailEl = document.getElementById('detail');
const emptyMsg = document.getElementById('emptyMsg');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('grade');
const spoilerEl = document.getElementById('spoiler');
const earnedOnlyEl = document.getElementById('earnedOnly');
const hideEarnedEl = document.getElementById('hideEarned');
const kindChipsEl = document.getElementById('kindChips');

let trophies = [];
let earned = new Set(loadEarned());
let selectedId = null;
let kindFilter = 'all';

function loadEarned() {
  try {
    const parsed = JSON.parse(localStorage.getItem(EARNED_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'string') : [];
  } catch { return []; }
}
function saveEarned() {
  localStorage.setItem(EARNED_KEY, JSON.stringify([...earned]));
}
function isStory(t) { return t.kind === 'story'; }
function isHiddenBySpoiler(t) {
  return spoilerEl.checked && isStory(t) && !earned.has(t.name);
}
function trophyMatches(t) {
  if (kindFilter === 'missable' && !t.missable) return false;
  if (kindFilter === 'online') return false; // GTA VI has 0 online trophies.
  if (kindFilter !== 'all' && kindFilter !== 'missable' && t.kind !== kindFilter) return false;
  if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
  if (earnedOnlyEl.checked && !earned.has(t.name)) return false;
  if (hideEarnedEl.checked && earned.has(t.name)) return false;
  const q = searchEl.value.trim().toLowerCase();
  if (q && !(`${t.name} ${t.description} ${t.guide}`.toLowerCase().includes(q))) return false;
  return true;
}
function gradeBadge(t) {
  const span = document.createElement('span');
  span.className = `badge ${t.grade}`;
  span.textContent = GRADE_LABELS[t.grade] ?? t.grade;
  return span;
}
function kindTag(t) {
  const span = document.createElement('span');
  span.className = 'tag';
  span.textContent = KIND_LABELS[t.kind] ?? t.kind;
  return span;
}
function renderFacts() {
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of trophies) counts[t.grade] = (counts[t.grade] ?? 0) + 1;
  const factsEl = document.getElementById('facts');
  factsEl.replaceChildren();
  const facts = [
    ['55', 'trophies'],
    [`${counts.platinum} platinum · ${counts.gold} gold · ${counts.silver} silver · ${counts.bronze} bronze`, ''],
    ['0', 'online trophies'],
    ['28', 'hidden until earned'],
    ['~200 h', 'to platinum (PowerPyx)'],
    ['1', 'potentially missable'],
    ['1', 'playthrough'],
  ];
  for (const [b, label] of facts) {
    const s = document.createElement('span');
    s.innerHTML = '';
    const strong = document.createElement('b');
    strong.textContent = b;
    s.append(strong);
    if (label) s.append(` ${label}`);
    factsEl.append(s);
  }
}
function renderProgress() {
  const total = trophies.length || 55;
  const pct = Math.round((earned.size / total) * 100);
  document.getElementById('progressFill').style.width = `${pct}%`;
  document.getElementById('progressText').textContent =
    `${earned.size} of ${total} earned — ${pct}%` +
    (earned.size === total && total > 0 ? ' — Platinum! Vice Got a Price!' : '');
}
function renderChips() {
  kindChipsEl.replaceChildren();
  for (const [value, label] of Object.entries(KIND_LABELS)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    if (value === kindFilter) btn.classList.add('active');
    btn.addEventListener('click', () => { kindFilter = value; renderChips(); renderList(); });
    kindChipsEl.append(btn);
  }
}
function renderList() {
  listEl.replaceChildren();
  let shown = 0;
  for (const t of trophies) {
    if (!trophyMatches(t)) continue;
    shown += 1;
    const li = document.createElement('li');
    if (earned.has(t.name)) li.classList.add('earned');
    if (t.id === selectedId) li.classList.add('selected');
    const row = document.createElement('div');
    row.className = 'trow';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.name);
    box.setAttribute('aria-label', `Mark ${t.name} as earned`);
    box.addEventListener('change', (event) => {
      event.stopPropagation();
      if (box.checked) earned.add(t.name); else earned.delete(t.name);
      saveEarned();
      renderProgress();
      renderList();
      renderDetail(t);
    });
    const body = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'tname';
    const desc = document.createElement('div');
    desc.className = 'tdesc';
    if (isHiddenBySpoiler(t)) {
      name.textContent = '🔒 Hidden story trophy — earn it to reveal';
      name.classList.add('spoiler-hidden');
      desc.textContent = 'Spoiler mode is on. Tick it off once you have earned it in-game.';
    } else {
      name.textContent = t.name;
      desc.textContent = t.description;
    }
    const meta = document.createElement('div');
    meta.className = 'tmeta';
    meta.append(gradeBadge(t), kindTag(t));
    if (t.hidden) {
      const h = document.createElement('span');
      h.className = 'tag hidden';
      h.textContent = 'Hidden';
      meta.append(h);
    }
    if (t.missable) {
      const m = document.createElement('span');
      m.className = 'tag missable';
      m.textContent = '⚠ Missable';
      meta.append(m);
    }
    const stage = document.createElement('span');
    stage.className = 'tag';
    stage.textContent = `Roadmap step ${t.roadmap}`;
    meta.append(stage);
    body.append(name, desc, meta);
    row.append(box, body);
    li.append(row);
    li.addEventListener('click', () => { selectedId = t.id; renderList(); renderDetail(t); });
    listEl.append(li);
  }
  emptyMsg.hidden = shown > 0;
  if (kindFilter === 'online') {
    emptyMsg.hidden = false;
    emptyMsg.innerHTML = '';
    const p = document.createElement('p');
    p.textContent = 'There are no online trophies in GTA VI — every one of the 55 is single-player (PowerPyx: 0 online trophies). Nothing to filter here; pick another kind.';
    emptyMsg.append(p);
  }
}
function renderDetail(t) {
  detailEl.replaceChildren();
  if (!t) {
    const h = document.createElement('h2');
    h.textContent = 'Pick a trophy';
    const p = document.createElement('p');
    p.textContent = 'Click any trophy in the list to open its full guide here — what to do, where and how, when it can be missed, and the sources each fact comes from.';
    detailEl.append(h, p);
    return;
  }
  const h = document.createElement('h2');
  h.textContent = isHiddenBySpoiler(t) ? '🔒 Hidden story trophy' : t.name;
  const official = document.createElement('p');
  official.className = 'official';
  official.textContent = isHiddenBySpoiler(t)
    ? 'Official name and description hidden by spoiler mode until earned.'
    : `Official: “${t.description}” — ${GRADE_LABELS[t.grade] ?? t.grade}${t.hidden ? ' · Hidden on PlayStation until earned' : ''}`;
  detailEl.append(h, official);
  if (t.missable) {
    const warn = document.createElement('p');
    warn.className = 'warn';
    warn.textContent = '⚠ Missable — read the Missables tab before Chapter 1 ends.';
    detailEl.append(warn);
  }
  const gh = document.createElement('h3');
  gh.textContent = 'Guide';
  const gp = document.createElement('p');
  gp.textContent = t.guide;
  detailEl.append(gh, gp);
  const sh = document.createElement('h3');
  sh.textContent = 'Sources';
  const ul = document.createElement('ul');
  ul.className = 'sources';
  for (const s of t.sources ?? []) {
    const li = document.createElement('li');
    if (s.url) {
      const a = document.createElement('a');
      a.href = s.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = s.name;
      li.append(a);
    } else {
      li.textContent = `${s.name} (trophy list — name, description and grade)`;
    }
    ul.append(li);
  }
  detailEl.append(sh, ul);
  const note = document.createElement('p');
  note.textContent = `Kind: ${KIND_LABELS[t.kind] ?? t.kind} · Roadmap step ${t.roadmap} · ${earned.has(t.name) ? 'Earned ✓' : 'Not earned yet'}`;
  detailEl.append(note);
}
function exportProgress() {
  const blob = new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...earned].sort() }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}
async function importProgress(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const names = Array.isArray(parsed) ? parsed : parsed.earned;
  if (!Array.isArray(names)) throw new Error('Not a progress file');
  const known = new Set(trophies.map((t) => t.name));
  earned = new Set(names.filter((n) => typeof n === 'string' && known.has(n)));
  saveEarned();
  renderProgress();
  renderList();
  renderDetail(trophies.find((t) => t.id === selectedId) ?? null);
}
function wireTabs() {
  for (const btn of document.querySelectorAll('nav.tabs button')) {
    btn.addEventListener('click', () => {
      for (const b of document.querySelectorAll('nav.tabs button')) b.classList.remove('active');
      btn.classList.add('active');
      for (const s of document.querySelectorAll('section.view')) s.classList.remove('active');
      document.getElementById(`view-${btn.dataset.view}`).classList.add('active');
    });
  }
}
async function initTracker() {
  const doc = await (await fetch('data/trophies.json')).json();
  trophies = doc.trophies;
  spoilerEl.checked = localStorage.getItem(SPOILER_KEY) === '1';
  spoilerEl.addEventListener('change', () => {
    localStorage.setItem(SPOILER_KEY, spoilerEl.checked ? '1' : '0');
    renderList();
    renderDetail(trophies.find((t) => t.id === selectedId) ?? null);
  });
  searchEl.addEventListener('input', renderList);
  gradeEl.addEventListener('change', renderList);
  earnedOnlyEl.addEventListener('change', renderList);
  hideEarnedEl.addEventListener('change', renderList);
  document.getElementById('export').addEventListener('click', exportProgress);
  document.getElementById('import').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try { await importProgress(file); } catch { alert('That file is not a valid progress export.'); }
    e.target.value = '';
  });
  document.getElementById('reset').addEventListener('click', () => {
    if (!confirm('Clear all earned ticks?')) return;
    earned = new Set();
    saveEarned();
    renderProgress();
    renderList();
  });
  wireTabs();
  renderFacts();
  renderChips();
  renderProgress();
  renderList();
  renderDetail(null);
}
initTracker();
