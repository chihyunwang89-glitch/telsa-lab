// ==========================================
// HP Telsa Research Hub — Main App
// ==========================================

// Google Sheet CSV URL (replace with your published CSV URL)
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTGIukHgr45AqGzK0jMEX39u9wv9_b-X9k0On07ZQCqQJsUeYa5Xf-Xis3gT8OjejlMblaSKNFKxhCW/pub?output=csv';

// Fallback: local sample data
const LOCAL_CSV = 'sample-data.csv';

// State
let allData = [];
let currentMonth = null;
let currentFilter = 'all';
let cardsExpanded = false;
const MAX_CARDS_COLLAPSED = 3;

// Subtopic color map
const SUBTOPIC_COLORS = {
  '認知/行為': 'bar-cognitive',
  '產品/UX': 'bar-product',
  '工具/硬體': 'bar-tool',
  '理論框架': 'bar-theory',
  '安全/倫理': 'bar-safety',
  '產品評測': 'bar-product',
  '開發工具': 'bar-tool',
  '架構設計': 'bar-cognitive',
  '工具實作': 'bar-tool',
  '技術實作': 'bar-cognitive',
  '團隊策略': 'bar-default',
};

const TYPE_CLASSES = {
  '論文': 'type-paper',
  '產品觀察': 'type-product',
  '工具測試': 'type-tool',
};

// ==========================================
// Data Loading
// ==========================================
async function loadData() {
  try {
    const response = await fetch(SHEET_CSV_URL);
    if (!response.ok) throw new Error('Sheet fetch failed');
    const csvText = await response.text();
    parseAndRender(csvText);
  } catch (e) {
    console.warn('Google Sheet failed, trying local CSV...', e);
    try {
      const response = await fetch(LOCAL_CSV);
      const csvText = await response.text();
      parseAndRender(csvText);
    } catch (e2) {
      console.error('All data sources failed:', e2);
      document.getElementById('cardsContainer').innerHTML =
        '<p class="text-center text-hp-muted py-8">無法載入資料。請確認 Google Sheet 已發佈。</p>';
    }
  }
}

function parseAndRender(csvText) {
  const result = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  allData = result.data.filter(row => row.month && row.title);
  const months = [...new Set(allData.map(r => r.month))].sort().reverse();
  currentMonth = months[0];
  renderNav(months);
  renderMonth();
}

// ==========================================
// Navigation
// ==========================================
function renderNav(months) {
  const nav = document.getElementById('navList');
  const year = months[0]?.substring(0, 4) || '2026';
  document.getElementById('yearLabel').textContent = year;

  nav.innerHTML = months.map(m => {
    const rows = allData.filter(r => r.month === m);
    const theme = rows[0]?.theme || '';
    const monthNum = parseInt(m.split('-')[1]);
    const isActive = m === currentMonth;
    return `
      <button onclick="selectMonth('${m}')"
        class="flex flex-col px-4 py-2.5 rounded-lg text-left transition-all cursor-pointer
          ${isActive ? 'nav-active' : 'hover:bg-gray-50'}"
        data-month="${m}">
        <span class="text-base ${isActive ? 'font-extrabold text-hp-dark' : 'font-semibold text-gray-700'}">${monthNum}月</span>
        <span class="text-xs ${isActive ? 'font-semibold text-hp-accent' : 'text-hp-muted'}">${theme}</span>
      </button>`;
  }).join('');
}

function selectMonth(month) {
  currentMonth = month;
  currentFilter = 'all';
  cardsExpanded = false;
  const months = [...new Set(allData.map(r => r.month))].sort().reverse();
  renderNav(months);
  renderMonth();
  closeSidebar();
}

// ==========================================
// Render Current Month
// ==========================================
function renderMonth() {
  const rows = allData.filter(r => r.month === currentMonth);
  if (!rows.length) return;

  const first = rows[0];
  const monthNum = parseInt(currentMonth.split('-')[1]);
  const year = currentMonth.split('-')[0];

  // Hero
  document.getElementById('badgeText').textContent = `${year}年 ${monthNum}月號`;
  document.getElementById('themeTitle').textContent = first.theme || '';
  document.getElementById('themeSub').textContent = first.why_this_month || '';
  document.getElementById('curatorName').textContent = first.curator_name || '';

  // Stats
  const subtopics = [...new Set(rows.map(r => r.subtopic).filter(Boolean))];
  const insightCount = rows.filter(r => r.insight).length;
  renderStats(rows.length, subtopics.length, insightCount);

  // Filters
  const types = [...new Set(rows.map(r => r.type).filter(Boolean))];
  renderFilters(types);

  // Cards
  renderCards(rows);

  // Insights
  const mediumUrl = rows.find(r => r.medium_url)?.medium_url || '';
  renderInsights(rows, mediumUrl);

  // Subtopic Chart
  renderChart(rows);

  // Podcast
  renderPodcast(rows);
}

// ==========================================
// Stats Row
// ==========================================
function renderStats(total, subtopicCount, insightCount) {
  document.getElementById('statsRow').innerHTML = `
    <div class="bg-white rounded-xl border border-hp-border p-3 flex items-center gap-3">
      <div class="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
        <svg class="w-5 h-5 text-hp-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
      </div>
      <div class="flex items-end gap-1.5">
        <span class="text-3xl lg:text-4xl font-black font-mono text-hp-dark">${total}</span>
        <span class="text-sm font-bold text-hp-dark pb-1">研究素材</span>
      </div>
    </div>
    <div class="bg-white rounded-xl border border-hp-border p-3 flex items-center gap-3">
      <div class="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
        <svg class="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
      </div>
      <div class="flex items-end gap-1.5">
        <span class="text-3xl lg:text-4xl font-black font-mono text-hp-dark">${subtopicCount}</span>
        <span class="text-sm font-bold text-hp-dark pb-1">子主題</span>
      </div>
    </div>
    <div class="bg-white rounded-xl border border-hp-border p-3 flex items-center gap-3">
      <div class="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
        <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
      </div>
      <div class="flex items-end gap-1.5">
        <span class="text-3xl lg:text-4xl font-black font-mono text-hp-dark">${insightCount}</span>
        <span class="text-sm font-bold text-hp-dark pb-1">核心洞察</span>
      </div>
    </div>`;
}

// ==========================================
// Filters
// ==========================================
function renderFilters(types) {
  const row = document.getElementById('filterRow');
  row.innerHTML = `
    <button onclick="setFilter('all')" class="px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${currentFilter === 'all' ? 'filter-active' : 'filter-inactive'}">全部</button>
    ${types.map(t => `
      <button onclick="setFilter('${t}')" class="px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${currentFilter === t ? 'filter-active' : 'filter-inactive'}">${t}</button>
    `).join('')}`;
}

function setFilter(type) {
  currentFilter = type;
  cardsExpanded = false;
  const rows = allData.filter(r => r.month === currentMonth);
  const types = [...new Set(rows.map(r => r.type).filter(Boolean))];
  renderFilters(types);
  renderCards(rows);
}

// ==========================================
// Research Cards
// ==========================================
function renderCards(rows) {
  let filtered = currentFilter === 'all' ? rows : rows.filter(r => r.type === currentFilter);
  const total = filtered.length;
  const showAll = cardsExpanded || total <= MAX_CARDS_COLLAPSED;
  const visible = showAll ? filtered : filtered.slice(0, MAX_CARDS_COLLAPSED);

  document.getElementById('materialCount').textContent = `共 ${total} 篇`;

  const container = document.getElementById('cardsContainer');
  container.innerHTML = visible.map(row => {
    const typeClass = TYPE_CLASSES[row.type] || 'subtopic-tag';
    const stars = renderStars(parseInt(row.rating) || 0);
    return `
      <div class="bg-white rounded-lg border border-hp-border p-4 space-y-2 card-hover transition-shadow cursor-default">
        <div class="flex items-center justify-between">
          <div class="flex gap-2">
            <span class="px-2.5 py-0.5 rounded text-xs font-semibold ${typeClass}">${row.type || ''}</span>
            <span class="px-2.5 py-0.5 rounded text-xs font-medium subtopic-tag">${row.subtopic || ''}</span>
          </div>
          <span class="text-sm">${stars}</span>
        </div>
        <h4 class="text-base font-bold text-hp-dark">${row.title || ''}</h4>
        <p class="text-sm text-hp-sub leading-relaxed">${row.summary || ''}</p>
        <div class="flex gap-2">
          ${row.source_url ? `<a href="${row.source_url}" target="_blank" rel="noopener" class="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-hp-blue text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            原始來源</a>` : ''}
        </div>
      </div>`;
  }).join('');

  // Expand button
  const btn = document.getElementById('expandCardsBtn');
  if (total > MAX_CARDS_COLLAPSED) {
    btn.classList.remove('hidden');
    document.getElementById('expandText').textContent = showAll
      ? '收合素材'
      : `展開更多素材（共 ${total} 篇）`;
    document.getElementById('expandIcon').style.transform = showAll ? 'rotate(180deg)' : '';
  } else {
    btn.classList.add('hidden');
  }
}

function toggleCards() {
  cardsExpanded = !cardsExpanded;
  const rows = allData.filter(r => r.month === currentMonth);
  renderCards(rows);
}

function renderStars(n) {
  let s = '';
  for (let i = 1; i <= 5; i++) {
    s += i <= n ? '<span class="star">&#9733;</span>' : '<span class="star-empty">&#9733;</span>';
  }
  return s;
}

// ==========================================
// Insights
// ==========================================
function renderInsights(rows, mediumUrl) {
  const insights = rows.filter(r => r.insight);
  const container = document.getElementById('insightsContainer');

  if (!insights.length) {
    container.innerHTML = '<p class="text-sm text-hp-muted">本月暫無核心洞察</p>';
    return;
  }

  container.innerHTML = insights.map(row => `
    <div class="insight-card rounded-lg p-3 space-y-2">
      <p class="text-sm font-semibold text-hp-dark leading-relaxed">「${row.insight}」</p>
      <p class="text-xs text-hp-muted">— ${row.title}</p>
    </div>
  `).join('') + (mediumUrl ? `
    <a href="${mediumUrl}" target="_blank" rel="noopener"
      class="inline-flex items-center justify-center gap-1 px-4 py-1.5 rounded-lg bg-[#1A8917] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer">
      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zm7.42 0c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/></svg>
      Medium 筆記
    </a>` : '');
}

// ==========================================
// Subtopic Chart
// ==========================================
function renderChart(rows) {
  const counts = {};
  rows.forEach(r => {
    if (r.subtopic) counts[r.subtopic] = (counts[r.subtopic] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] || 1;

  document.getElementById('chartContainer').innerHTML = sorted.map(([name, count]) => {
    const colorClass = SUBTOPIC_COLORS[name] || 'bar-default';
    const width = Math.round((count / max) * 100);
    return `
      <div class="space-y-1">
        <div class="flex justify-between text-xs">
          <span class="font-semibold text-hp-dark">${name}</span>
          <span class="text-hp-muted">${count} 篇</span>
        </div>
        <div class="w-full h-1.5 rounded-full bg-gray-100">
          <div class="h-1.5 rounded-full ${colorClass}" style="width:${width}%"></div>
        </div>
      </div>`;
  }).join('');
}

// ==========================================
// Podcast
// ==========================================
function renderPodcast(rows) {
  const pod = rows.find(r => r.podcast_title);
  const section = document.getElementById('podcastSection');
  const card = document.getElementById('podcastCard');

  if (!pod || !pod.podcast_title) {
    section.classList.add('hidden');
    return;
  }
  section.classList.remove('hidden');

  const buttons = [
    pod.podcast_spotify ? `<a href="${pod.podcast_spotify}" target="_blank" class="px-2 py-1 rounded bg-gray-200 text-gray-700 text-[10px] font-semibold hover:bg-gray-300 transition-colors cursor-pointer">Spotify</a>` : '',
    pod.podcast_apple ? `<a href="${pod.podcast_apple}" target="_blank" class="px-2 py-1 rounded bg-gray-200 text-gray-700 text-[10px] font-semibold hover:bg-gray-300 transition-colors cursor-pointer">Apple</a>` : '',
    pod.podcast_youtube ? `<a href="${pod.podcast_youtube}" target="_blank" class="px-2 py-1 rounded bg-gray-200 text-gray-700 text-[10px] font-semibold hover:bg-gray-300 transition-colors cursor-pointer">YouTube</a>` : '',
  ].filter(Boolean).join('');

  card.innerHTML = `
    <div class="w-[100px] shrink-0 flex flex-col items-center justify-center gap-1" style="background: linear-gradient(135deg, #667EEA, #764BA2);">
      <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
        <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      </div>
      <span class="text-[10px] font-bold text-white tracking-wider font-mono">${pod.podcast_ep || ''}</span>
    </div>
    <div class="flex-1 p-3 space-y-2">
      <h4 class="text-sm font-bold text-hp-dark leading-snug">${pod.podcast_title}</h4>
      <p class="text-xs text-hp-muted leading-relaxed line-clamp-2">${pod.podcast_desc || ''}</p>
      <div class="flex gap-1.5">${buttons}</div>
    </div>`;
}

// ==========================================
// Mobile Sidebar
// ==========================================
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.add('hidden');
}

document.getElementById('menuBtn')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('overlay').classList.remove('hidden');
});

// ==========================================
// Init
// ==========================================
loadData();
