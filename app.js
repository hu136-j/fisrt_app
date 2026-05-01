/* ═══════════════════════════════════════════
   桌面时间记录 - Core Logic
   ═══════════════════════════════════════════ */

const TAG_COLORS = {
  '工作': '#4A90D9',
  '学习': '#7B68EE',
  '生活': '#50AA78',
  '娱乐': '#F08070'
};

const TAG_ICONS = {
  '工作': '💼',
  '学习': '📚',
  '生活': '🏠',
  '娱乐': '🎮'
};

// ── State ──────────────────────────────────────
let records = [];
let currentDate = '';
let timerRunning = false;
let timerStartTime = null;
let timerInterval = null;
let editingId = null;

// ── DOM refs ───────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const dom = {
  timerDisplay: $('#timerDisplay'),
  timerLabel: $('#timerLabel'),
  timerCircle: $('#timerCircle'),
  timerBtn: $('#timerBtn'),
  timerTag: $('#timerTag'),
  timerActivity: $('#timerActivity'),
  manualActivity: $('#manualActivity'),
  manualStart: $('#manualStart'),
  manualEnd: $('#manualEnd'),
  manualTag: $('#manualTag'),
  addManualBtn: $('#addManualBtn'),
  datePicker: $('#datePicker'),
  dateTotal: $('#dateTotal'),
  prevDay: $('#prevDay'),
  nextDay: $('#nextDay'),
  todayBtn: $('#todayBtn'),
  timeline: $('#timeline'),
  pieChart: $('#pieChart'),
  barChart: $('#barChart'),
  tagSummary: $('#tagSummary'),
  themeToggle: $('#themeToggle'),
  exportBtn: $('#exportBtn'),
  importBtn: $('#importBtn'),
  statusText: $('#statusText'),
  dataPath: $('#dataPath'),
  editModal: $('#editModal'),
  editActivity: $('#editActivity'),
  editStart: $('#editStart'),
  editEnd: $('#editEnd'),
  editTag: $('#editTag'),
  saveEditBtn: $('#saveEditBtn'),
  cancelEditBtn: $('#cancelEditBtn')
};

// ── Init ───────────────────────────────────────
async function init() {
  currentDate = getToday();
  dom.datePicker.value = currentDate;
  setDefaultTimes();

  await loadRecords();
  showDataPath();
  renderAll();
  setupEvents();

  dom.statusText.textContent = '就绪';
}

async function loadRecords() {
  try {
    const data = await window.electronAPI.loadRecords();
    records = data.records || [];
  } catch (e) {
    records = [];
    dom.statusText.textContent = '加载数据失败';
  }
}

async function saveRecords() {
  try {
    await window.electronAPI.saveRecords({ records });
  } catch (e) {
    dom.statusText.textContent = '保存数据失败';
  }
}

async function showDataPath() {
  try {
    const p = await window.electronAPI.getRecordsPath();
    dom.dataPath.textContent = '数据: ' + p;
  } catch (e) {
    // ignore
  }
}

// ── Events ─────────────────────────────────────
function setupEvents() {
  // Timer
  dom.timerBtn.addEventListener('click', toggleTimer);

  // Space key for timer
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target === document.body) {
      e.preventDefault();
      toggleTimer();
    }
  });

  // Manual add
  dom.addManualBtn.addEventListener('click', addManualRecord);

  // Date nav
  dom.prevDay.addEventListener('click', () => changeDate(-1));
  dom.nextDay.addEventListener('click', () => changeDate(1));
  dom.datePicker.addEventListener('change', () => {
    currentDate = dom.datePicker.value;
    renderAll();
  });
  dom.todayBtn.addEventListener('click', goToToday);

  // Theme
  dom.themeToggle.addEventListener('click', toggleTheme);
  loadTheme();

  // Export / Import
  dom.exportBtn.addEventListener('click', exportCSV);
  dom.importBtn.addEventListener('click', importCSV);

  // Edit modal
  dom.saveEditBtn.addEventListener('click', saveEdit);
  dom.cancelEditBtn.addEventListener('click', closeModal);
  dom.editModal.addEventListener('click', (e) => {
    if (e.target === dom.editModal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

// ── Timer ──────────────────────────────────────
function toggleTimer() {
  if (timerRunning) {
    stopTimer();
  } else {
    startTimer();
  }
}

function startTimer() {
  timerRunning = true;
  timerStartTime = Date.now();
  dom.timerBtn.textContent = '⏹ 停止计时';
  dom.timerBtn.classList.add('danger');
  dom.timerLabel.textContent = '计时中...';
  dom.timerCircle.classList.add('running');
  dom.statusText.textContent = '正在计时...';

  timerInterval = setInterval(updateTimerDisplay, 200);
  updateTimerDisplay();
}

function stopTimer() {
  timerRunning = false;
  clearInterval(timerInterval);
  timerInterval = null;

  const elapsed = Date.now() - timerStartTime;
  const startISO = new Date(timerStartTime).toISOString();
  const endISO = new Date().toISOString();

  const record = {
    id: generateId(),
    activity: dom.timerActivity.value.trim() || '未命名活动',
    startTime: startISO,
    endTime: endISO,
    duration: elapsed,
    tag: dom.timerTag.value,
    date: toDateStr(new Date(timerStartTime)),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  records.push(record);
  saveRecords();
  resetTimerUI();
  renderAll();
  dom.statusText.textContent = '已保存记录: ' + record.activity;
}

function resetTimerUI() {
  dom.timerDisplay.textContent = '00:00:00';
  dom.timerLabel.textContent = '准备开始';
  dom.timerCircle.classList.remove('running');
  dom.timerBtn.textContent = '▶ 开始计时';
  dom.timerBtn.classList.remove('danger');
}

function updateTimerDisplay() {
  const elapsed = Date.now() - timerStartTime;
  dom.timerDisplay.textContent = formatDurationHMS(elapsed);
  // Update title
  document.title = formatDurationHMS(elapsed) + ' - 桌面时间记录';
}

// ── Manual Entry ───────────────────────────────
function addManualRecord() {
  const activity = dom.manualActivity.value.trim();
  if (!activity) {
    dom.statusText.textContent = '请输入活动内容';
    dom.manualActivity.focus();
    return;
  }

  const startStr = dom.manualStart.value;
  const endStr = dom.manualEnd.value;
  if (!startStr || !endStr) {
    dom.statusText.textContent = '请选择开始和结束时间';
    return;
  }

  const startTime = new Date(startStr);
  const endTime = new Date(endStr);

  if (endTime <= startTime) {
    dom.statusText.textContent = '结束时间必须晚于开始时间';
    return;
  }

  const record = {
    id: generateId(),
    activity: activity,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    duration: endTime - startTime,
    tag: dom.manualTag.value,
    date: toDateStr(startTime),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  records.push(record);
  saveRecords();

  dom.manualActivity.value = '';
  setDefaultTimes();
  renderAll();
  dom.statusText.textContent = '已添加记录: ' + record.activity;
}

function setDefaultTimes() {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 3600000);
  dom.manualStart.value = toLocalDatetimeStr(hourAgo);
  dom.manualEnd.value = toLocalDatetimeStr(now);
}

// ── Edit / Delete ──────────────────────────────
function openEditModal(id) {
  const r = records.find(rec => rec.id === id);
  if (!r) return;

  editingId = id;
  dom.editActivity.value = r.activity;
  dom.editStart.value = toLocalDatetimeStr(new Date(r.startTime));
  dom.editEnd.value = toLocalDatetimeStr(new Date(r.endTime));
  dom.editTag.value = r.tag;
  dom.editModal.classList.remove('hidden');
  dom.editActivity.focus();
}

function closeModal() {
  editingId = null;
  dom.editModal.classList.add('hidden');
}

function saveEdit() {
  if (!editingId) return;

  const r = records.find(rec => rec.id === editingId);
  if (!r) return;

  const startTime = new Date(dom.editStart.value);
  const endTime = new Date(dom.editEnd.value);

  if (endTime <= startTime) {
    dom.statusText.textContent = '结束时间必须晚于开始时间';
    return;
  }

  r.activity = dom.editActivity.value.trim() || r.activity;
  r.startTime = startTime.toISOString();
  r.endTime = endTime.toISOString();
  r.duration = endTime - startTime;
  r.tag = dom.editTag.value;
  r.date = toDateStr(startTime);
  r.updatedAt = new Date().toISOString();

  saveRecords();
  closeModal();
  renderAll();
  dom.statusText.textContent = '已更新记录';
}

function deleteRecord(id) {
  if (!confirm('确定删除这条记录吗？此操作不可恢复。')) return;

  records = records.filter(r => r.id !== id);
  saveRecords();
  renderAll();
  dom.statusText.textContent = '已删除记录';
}

// ── Render ─────────────────────────────────────
function renderAll() {
  const dayRecords = getDayRecords(currentDate);
  renderTimeline(dayRecords);
  renderStats(dayRecords);
  updateDateUI();
}

function getDayRecords(dateStr) {
  return records
    .filter(r => r.date === dateStr)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
}

function renderTimeline(dayRecords) {
  if (dayRecords.length === 0) {
    dom.timeline.innerHTML = '<div class="empty-state">今天还没有记录<br>点击左侧 ▶ 开始计时 或填写手动录入</div>';
    return;
  }

  let html = '';
  for (const r of dayRecords) {
    const start = new Date(r.startTime);
    const end = new Date(r.endTime);
    const timeStr = formatTime(start) + ' - ' + formatTime(end);
    const durStr = formatDuration(r.duration);

    html += `
      <div class="timeline-item tag-${r.tag}">
        <span class="timeline-time">${timeStr}</span>
        <div class="timeline-info">
          <span class="timeline-activity">${escHtml(r.activity)}</span>
          <span class="timeline-tag tag-badge-${r.tag}">${TAG_ICONS[r.tag]} ${r.tag}</span>
        </div>
        <span class="timeline-duration">${durStr}</span>
        <div class="timeline-actions">
          <button class="btn-sm" data-edit="${r.id}">编辑</button>
          <button class="btn-sm danger" data-del="${r.id}">删除</button>
        </div>
      </div>`;
  }

  dom.timeline.innerHTML = html;

  // Bind edit buttons
  dom.timeline.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.edit));
  });
  dom.timeline.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => deleteRecord(btn.dataset.del));
  });
}

function renderStats(dayRecords) {
  const tagMap = {};
  for (const r of dayRecords) {
    if (!tagMap[r.tag]) tagMap[r.tag] = 0;
    tagMap[r.tag] += r.duration;
  }

  const tagData = Object.entries(tagMap).map(([tag, ms]) => ({
    tag,
    minutes: Math.round(ms / 60000),
    hours: ms / 3600000
  }));

  tagData.sort((a, b) => b.minutes - a.minutes);

  drawPieChart(dom.pieChart, tagData);
  drawBarChart(dom.barChart, tagData);
  renderTagSummary(tagData);
}

function renderTagSummary(tagData) {
  const totalMin = tagData.reduce((s, d) => s + d.minutes, 0);

  if (tagData.length === 0) {
    dom.tagSummary.innerHTML = '<span style="color:var(--text-muted)">暂无统计数据</span>';
    return;
  }

  let html = '';
  for (const d of tagData) {
    const pct = totalMin > 0 ? Math.round(d.minutes / totalMin * 100) : 0;
    html += `
      <div class="tag-summary-item">
        <span class="tag-dot" style="background:${TAG_COLORS[d.tag]}"></span>
        <span>${TAG_ICONS[d.tag]} ${d.tag}</span>
        <span class="tag-summary-value">${d.hours.toFixed(1)}h (${pct}%)</span>
      </div>`;
  }

  dom.tagSummary.innerHTML = html;
}

function updateDateUI() {
  const dayRecords = getDayRecords(currentDate);
  const totalMs = dayRecords.reduce((s, r) => s + r.duration, 0);
  const totalH = (totalMs / 3600000).toFixed(1);
  dom.dateTotal.textContent = `总计 ${totalH} 小时 | ${dayRecords.length} 条记录`;

  const today = getToday();
  dom.nextDay.style.visibility = currentDate < today ? 'visible' : 'hidden';
}

// ── Charts (Pure Canvas) ───────────────────────
function setupCanvas(canvas, w, h) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return ctx;
}

function drawPieChart(canvas, tagData) {
  const ctx = setupCanvas(canvas, 250, 250);
  const cx = 125, cy = 125, radius = 100, innerRadius = 60;
  const total = tagData.reduce((s, d) => s + d.minutes, 0);

  // Clear
  ctx.clearRect(0, 0, 250, 250);

  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text').trim();

  if (total === 0 || tagData.length === 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#D0D0D8';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    const cardBg = getComputedStyle(document.documentElement).getPropertyValue('--card-bg').trim();
    ctx.fillStyle = cardBg || '#FFFFFF';
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('暂无数据', cx, cy);
    return;
  }

  let startAngle = -Math.PI / 2;

  for (const d of tagData) {
    const sliceAngle = (d.minutes / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
    ctx.arc(cx, cy, innerRadius, startAngle + sliceAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = TAG_COLORS[d.tag];
    ctx.fill();

    // Percentage label on slice
    const pct = Math.round(d.minutes / total * 100);
    if (pct >= 8) {
      const midAngle = startAngle + sliceAngle / 2;
      const labelR = (radius + innerRadius) / 2;
      const lx = cx + Math.cos(midAngle) * labelR;
      const ly = cy + Math.sin(midAngle) * labelR;
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pct + '%', lx, ly);
    }

    startAngle += sliceAngle;
  }

  // Center text
  const totalH = (total / 60).toFixed(1);
  ctx.fillStyle = textColor;
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(totalH + 'h', cx, cy - 8);
  ctx.font = '11px sans-serif';
  const textSec = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
  ctx.fillStyle = textSec;
  ctx.fillText('总计', cx, cy + 12);
}

function drawBarChart(canvas, tagData) {
  const ctx = setupCanvas(canvas, 400, 200);
  const w = 400, h = 200;
  const pad = { top: 16, right: 50, bottom: 16, left: 50 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;

  ctx.clearRect(0, 0, w, h);

  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text').trim();
  const textSec = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();

  if (tagData.length === 0) {
    ctx.fillStyle = textSec;
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('暂无数据', w / 2, h / 2);
    return;
  }

  const maxHours = Math.max(...tagData.map(d => d.hours), 0.1);
  const barCount = tagData.length;
  const barGap = 8;
  const barH = Math.min((chartH - barGap * (barCount - 1)) / barCount, 30);

  tagData.forEach((d, i) => {
    const y = pad.top + i * (barH + barGap);
    const barW = Math.max((d.hours / maxHours) * chartW, d.hours > 0 ? 4 : 0);

    // Tag label
    ctx.fillStyle = textColor;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(TAG_ICONS[d.tag] + ' ' + d.tag, pad.left - 8, y + barH / 2);

    // Bar background
    ctx.fillStyle = 'rgba(128,128,160,0.1)';
    ctx.beginPath();
    roundRect(ctx, pad.left, y, chartW, barH, 4);
    ctx.fill();

    // Bar fill
    if (barW > 0) {
      ctx.fillStyle = TAG_COLORS[d.tag];
      ctx.beginPath();
      roundRect(ctx, pad.left, y, barW, barH, 4);
      ctx.fill();
    }

    // Value label
    ctx.fillStyle = textColor;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(d.hours.toFixed(1) + 'h', pad.left + barW + 6, y + barH / 2);
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ── CSV Export / Import ────────────────────────
async function exportCSV() {
  if (records.length === 0) {
    dom.statusText.textContent = '没有记录可导出';
    return;
  }

  let csv = '活动,标签,开始时间,结束时间,耗时(分钟),日期\n';
  for (const r of records) {
    const durMin = Math.round(r.duration / 60000);
    const start = formatLocal(new Date(r.startTime));
    const end = formatLocal(new Date(r.endTime));
    csv += `"${r.activity}","${r.tag}","${start}","${end}",${durMin},"${r.date}"\n`;
  }

  const result = await window.electronAPI.exportCSV(csv);
  if (result.success) {
    dom.statusText.textContent = '已导出到: ' + result.path;
  } else {
    dom.statusText.textContent = '导出已取消';
  }
}

async function importCSV() {
  const result = await window.electronAPI.importCSV();
  if (!result.success) {
    if (result.error) dom.statusText.textContent = result.error;
    return;
  }

  const lines = result.content.split('\n').filter(l => l.trim());
  if (lines.length < 2) {
    dom.statusText.textContent = 'CSV文件格式不正确';
    return;
  }

  let imported = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length >= 6) {
      const startTime = new Date(cols[2]);
      const endTime = new Date(cols[3]);
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) continue;

      const duration = endTime - startTime;
      if (duration <= 0) continue;

      records.push({
        id: generateId(),
        activity: cols[0] || '未命名',
        tag: ['工作', '学习', '生活', '娱乐'].includes(cols[1]) ? cols[1] : '生活',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: duration,
        date: cols[5] || toDateStr(startTime),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      imported++;
    }
  }

  await saveRecords();
  renderAll();
  dom.statusText.textContent = `成功导入 ${imported} 条记录`;
}

// ── Theme ──────────────────────────────────────
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  dom.themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
  try { localStorage.setItem('timetracker-theme', next); } catch(e) {}

  // Redraw charts for new theme
  const dayRecords = getDayRecords(currentDate);
  renderStats(dayRecords);
}

function loadTheme() {
  let theme = 'light';
  try { theme = localStorage.getItem('timetracker-theme') || 'light'; } catch(e) {}
  document.documentElement.setAttribute('data-theme', theme);
  dom.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ── Date Navigation ────────────────────────────
function changeDate(delta) {
  const d = new Date(currentDate + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  currentDate = toDateStr(d);
  dom.datePicker.value = currentDate;
  renderAll();
}

function goToToday() {
  currentDate = getToday();
  dom.datePicker.value = currentDate;
  renderAll();
}

// ── Utilities ──────────────────────────────────
function getToday() {
  return toDateStr(new Date());
}

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTime(d) {
  return String(d.getHours()).padStart(2, '0') + ':' +
         String(d.getMinutes()).padStart(2, '0');
}

function formatDuration(ms) {
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return h + 'h ' + m + 'm';
  return m + 'm';
}

function formatDurationHMS(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return String(h).padStart(2, '0') + ':' +
         String(m).padStart(2, '0') + ':' +
         String(s).padStart(2, '0');
}

function formatLocal(d) {
  const pad = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
         ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function toLocalDatetimeStr(d) {
  const pad = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
         'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ── Start ──────────────────────────────────────
init();
