/* ═══════════════════════════════════════════
   桌面时间记录 - Core Logic
   ═══════════════════════════════════════════ */

let TAG_COLORS = {};
let TAG_ICONS = {};

let records = [];
let tags = [];
let currentDate = '';
let timerRunning = false;
let timerStartTime = null;
let timerInterval = null;
let editingId = null;
let rangeMode = false;
let rangeStart = '';
let rangeEnd = '';

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
  cancelEditBtn: $('#cancelEditBtn'),
  rangeToggle: $('#rangeToggle'),
  rangeBar: $('#rangeBar'),
  rangePickers: $('#rangePickers'),
  rangeStartPicker: $('#rangeStartPicker'),
  rangeEndPicker: $('#rangeEndPicker'),
  rangeTotal: $('#rangeTotal'),
  rangeExportBtn: $('#rangeExportBtn'),
  trendChartContainer: $('#trendChartContainer'),
  trendChart: $('#trendChart'),
  tagManagerBtn: $('#tagManagerBtn'),
  tagManagerModal: $('#tagManagerModal'),
  tagList: $('#tagList'),
  addNewTagBtn: $('#addNewTagBtn'),
  closeTagManagerBtn: $('#closeTagManagerBtn'),
  tagEditModal: $('#tagEditModal'),
  tagEditTitle: $('#tagEditTitle'),
  tagPathName: $('#tagPathName'),
  tagIcon: $('#tagIcon'),
  tagColor: $('#tagColor'),
  emojiPresets: $('#emojiPresets'),
  saveTagBtn: $('#saveTagBtn'),
  cancelTagBtn: $('#cancelTagBtn'),
  tagDeleteModal: $('#tagDeleteModal'),
  deleteTagMsg: $('#deleteTagMsg'),
  mergeOptionLabel: $('#mergeOptionLabel'),
  mergeTargetTag: $('#mergeTargetTag'),
  confirmDeleteTagBtn: $('#confirmDeleteTagBtn'),
  cancelDeleteTagBtn: $('#cancelDeleteTagBtn')
};

async function init() {
  currentDate = getToday();
  dom.datePicker.value = currentDate;
  setDefaultTimes();
  await loadTags();
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

async function loadTags() {
  try {
    tags = await window.electronAPI.loadTags();
    updateTagMaps();
    populateTagSelects();
  } catch (e) {
    console.error('Failed to load tags:', e);
  }
}

async function saveTags() {
  try {
    await window.electronAPI.saveTags(tags);
    updateTagMaps();
    populateTagSelects();
  } catch (e) {
    dom.statusText.textContent = '保存标签失败';
  }
}

function updateTagMaps() {
  TAG_COLORS = {};
  TAG_ICONS = {};
  tags.forEach(t => {
    TAG_COLORS[t.id] = t.color;
    TAG_COLORS[t.name] = t.color;
    TAG_ICONS[t.id] = t.icon;
    TAG_ICONS[t.name] = t.icon;
  });
}

function populateTagSelects() {
  const selects = [dom.timerTag, dom.manualTag, dom.editTag, dom.mergeTargetTag];
  selects.forEach(select => {
    if (!select) return;
    const val = select.value;
    select.innerHTML = '';
    tags.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `${t.icon} ${t.name}`;
      select.appendChild(opt);
    });
    if (select !== dom.mergeTargetTag) {
      const divider = document.createElement('option');
      divider.disabled = true;
      divider.textContent = '──────────';
      select.appendChild(divider);
      const addOpt = document.createElement('option');
      addOpt.value = '__ADD_NEW__';
      addOpt.textContent = '➕ 添加新标签...';
      select.appendChild(addOpt);
    }
    if (val && [...select.options].some(o => o.value === val)) {
      select.value = val;
    }
  });
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
  } catch (e) {}
}

function setupEvents() {
  dom.timerBtn.addEventListener('click', toggleTimer);
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target === document.body) {
      e.preventDefault();
      toggleTimer();
    }
  });
  dom.addManualBtn.addEventListener('click', addManualRecord);
  dom.prevDay.addEventListener('click', () => changeDate(-1));
  dom.nextDay.addEventListener('click', () => changeDate(1));
  dom.datePicker.addEventListener('change', () => {
    currentDate = dom.datePicker.value;
    renderAll();
  });
  dom.todayBtn.addEventListener('click', goToToday);
  dom.themeToggle.addEventListener('click', toggleTheme);
  loadTheme();
  dom.exportBtn.addEventListener('click', exportCSV);
  dom.importBtn.addEventListener('click', importCSV);
  dom.saveEditBtn.addEventListener('click', saveEdit);
  dom.cancelEditBtn.addEventListener('click', closeModal);
  dom.editModal.addEventListener('click', (e) => { if (e.target === dom.editModal) closeModal(); });
  dom.tagManagerModal.addEventListener('click', (e) => { if (e.target === dom.tagManagerModal) dom.tagManagerModal.classList.add('hidden'); });
  dom.tagEditModal.addEventListener('click', (e) => { if (e.target === dom.tagEditModal) dom.tagEditModal.classList.add('hidden'); });
  dom.tagDeleteModal.addEventListener('click', (e) => { if (e.target === dom.tagDeleteModal) dom.tagDeleteModal.classList.add('hidden'); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      dom.tagManagerModal.classList.add('hidden');
      dom.tagEditModal.classList.add('hidden');
      dom.tagDeleteModal.classList.add('hidden');
    }
  });
  dom.rangeToggle.addEventListener('click', toggleRangeMode);
  dom.rangeStartPicker.addEventListener('change', onRangeDateChange);
  dom.rangeEndPicker.addEventListener('change', onRangeDateChange);
  dom.rangeExportBtn.addEventListener('click', exportRangeCSV);
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => applyRangePreset(btn.dataset.preset));
  });
  dom.tagManagerBtn.addEventListener('click', openTagManager);
  dom.closeTagManagerBtn.addEventListener('click', () => dom.tagManagerModal.classList.add('hidden'));
  dom.addNewTagBtn.addEventListener('click', () => openTagEdit());
  dom.saveTagBtn.addEventListener('click', saveTagEntry);
  dom.cancelTagBtn.addEventListener('click', () => dom.tagEditModal.classList.add('hidden'));
  dom.confirmDeleteTagBtn.addEventListener('click', confirmDeleteTag);
  dom.cancelDeleteTagBtn.addEventListener('click', () => dom.tagDeleteModal.classList.add('hidden'));
  [dom.timerTag, dom.manualTag, dom.editTag].forEach(select => {
    select.addEventListener('change', () => {
      if (select.value === '__ADD_NEW__') {
        const currentVal = select.getAttribute('data-prev-val') || (tags[0] ? tags[0].id : '');
        select.value = currentVal;
        openTagEdit();
      } else {
        select.setAttribute('data-prev-val', select.value);
      }
    });
  });
  dom.emojiPresets.addEventListener('click', (e) => {
    if (e.target.tagName === 'SPAN') {
      dom.tagIcon.value = e.target.textContent;
    }
  });
}

let editingTagId = null;
let deletingTagId = null;

function openTagManager() {
  dom.tagManagerModal.classList.remove('hidden');
  renderTagList();
}

function renderTagList() {
  dom.tagList.innerHTML = '';
  tags.forEach(t => {
    const item = document.createElement('div');
    item.className = 'tag-item';
    item.innerHTML = `
      <div class="tag-info">
        <div class="tag-color-dot" style="background: ${t.color}"></div>
        <span class="tag-item-name">${t.icon} ${t.name}</span>
      </div>
      <div class="tag-item-actions">
        <button class="btn-secondary btn-sm" data-id="${t.id}" data-action="edit">编辑</button>
        <button class="btn-danger btn-sm" data-id="${t.id}" data-action="del">删除</button>
      </div>`;
    dom.tagList.appendChild(item);
  });
  dom.tagList.querySelectorAll('button').forEach(btn => {
    const id = btn.dataset.id;
    if (btn.dataset.action === 'edit') btn.addEventListener('click', () => openTagEdit(id));
    else if (btn.dataset.action === 'del') btn.addEventListener('click', () => deleteTag(id));
  });
}

function openTagEdit(id = null) {
  editingTagId = id;
  if (id) {
    const t = tags.find(tag => tag.id === id);
    dom.tagEditTitle.textContent = '🏷️ 编辑标签';
    dom.tagPathName.value = t.name;
    dom.tagIcon.value = t.icon;
    dom.tagColor.value = t.color;
  } else {
    dom.tagEditTitle.textContent = '🏷️ 新建标签';
    dom.tagPathName.value = '';
    dom.tagIcon.value = '🏷️';
    dom.tagColor.value = '#4A90D9';
  }
  dom.tagEditModal.classList.remove('hidden');
  setTimeout(() => dom.tagPathName.focus(), 50);
}

async function saveTagEntry() {
  const name = dom.tagPathName.value.trim();
  const icon = dom.tagIcon.value.trim() || '🏷️';
  const color = dom.tagColor.value;
  if (!name) { alert('请输入标签名称'); return; }
  if (editingTagId) {
    const t = tags.find(tag => tag.id === editingTagId);
    t.name = name; t.icon = icon; t.color = color;
  } else {
    tags.push({ id: 't' + Date.now(), name, icon, color, createdAt: new Date().toISOString() });
  }
  await saveTags();
  dom.tagEditModal.classList.add('hidden');
  renderTagList();
  renderAll();
}

function deleteTag(id) {
  const t = tags.find(tag => tag.id === id);
  const count = records.filter(r => r.tag === id || r.tag === t.name).length;
  if (count > 0) {
    deletingTagId = id;
    dom.deleteTagMsg.textContent = `标签「${t.icon} ${t.name}」下有 ${count} 条记录，请选择处理方式：`;
    const otherTags = tags.filter(tag => tag.id !== id);
    dom.mergeOptionLabel.style.display = otherTags.length === 0 ? 'none' : 'block';
    dom.tagDeleteModal.classList.remove('hidden');
  } else {
    if (confirm(`确定删除标签「${t.icon} ${t.name}」吗？`)) {
      tags = tags.filter(tag => tag.id !== id);
      saveTags().then(() => { renderTagList(); renderAll(); });
    }
  }
}

async function confirmDeleteTag() {
  const action = document.querySelector('input[name="deleteAction"]:checked').value;
  const targetId = dom.mergeTargetTag.value;
  const oldTag = tags.find(t => t.id === deletingTagId);
  records.forEach(r => {
    if (r.tag === deletingTagId || r.tag === oldTag.name) {
      r.tag = action === 'merge' ? targetId : '';
    }
  });
  tags = tags.filter(t => t.id !== deletingTagId);
  await saveTags(); await saveRecords();
  dom.tagDeleteModal.classList.add('hidden');
  renderTagList(); renderAll();
}

function toggleTimer() { if (timerRunning) stopTimer(); else startTimer(); }

function startTimer() {
  timerRunning = true; timerStartTime = Date.now();
  dom.timerBtn.textContent = '⏹ 停止计时'; dom.timerBtn.classList.add('danger');
  dom.timerLabel.textContent = '计时中...'; dom.timerCircle.classList.add('running');
  dom.statusText.textContent = '正在计时...';
  timerInterval = setInterval(updateTimerDisplay, 200);
  updateTimerDisplay();
}

function stopTimer() {
  timerRunning = false; clearInterval(timerInterval); timerInterval = null;
  const elapsed = Date.now() - timerStartTime;
  const record = {
    id: generateId(), activity: dom.timerActivity.value.trim() || '未命名活动',
    startTime: new Date(timerStartTime).toISOString(), endTime: new Date().toISOString(),
    duration: elapsed, tag: dom.timerTag.value, date: toDateStr(new Date(timerStartTime)),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
  records.push(record); saveRecords(); resetTimerUI(); renderAll();
  dom.statusText.textContent = '已保存记录: ' + record.activity;
}

function resetTimerUI() {
  dom.timerDisplay.textContent = '00:00:00'; dom.timerLabel.textContent = '准备开始';
  dom.timerCircle.classList.remove('running'); dom.timerBtn.textContent = '▶ 开始计时';
  dom.timerBtn.classList.remove('danger');
}

function updateTimerDisplay() {
  const elapsed = Date.now() - timerStartTime;
  dom.timerDisplay.textContent = formatDurationHMS(elapsed);
  document.title = formatDurationHMS(elapsed) + ' - 桌面时间记录';
}

function addManualRecord() {
  const activity = dom.manualActivity.value.trim();
  const startStr = dom.manualStart.value; const endStr = dom.manualEnd.value;
  if (!startStr || !endStr) { dom.statusText.textContent = '请选择开始和结束时间'; return; }
  const startTime = new Date(startStr); const endTime = new Date(endStr);
  if (endTime <= startTime) { dom.statusText.textContent = '结束时间必须晚于开始时间'; return; }
  
  // 活动内容可选，若为空则显示为标签名称
  const finalActivity = activity || getTagName(dom.manualTag.value);

  const record = {
    id: generateId(), activity: finalActivity, startTime: startTime.toISOString(), endTime: endTime.toISOString(),
    duration: endTime - startTime, tag: dom.manualTag.value, date: toDateStr(startTime),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
  records.push(record); saveRecords(); dom.manualActivity.value = ''; setDefaultTimes(); renderAll();
  dom.statusText.textContent = '已添加记录: ' + finalActivity;
}

function setDefaultTimes() {
  const now = new Date(); const hourAgo = new Date(now.getTime() - 3600000);
  dom.manualStart.value = toLocalDatetimeStr(hourAgo); dom.manualEnd.value = toLocalDatetimeStr(now);
}

function openEditModal(id) {
  const r = records.find(rec => rec.id === id); if (!r) return;
  editingId = id; dom.editActivity.value = r.activity;
  dom.editStart.value = toLocalDatetimeStr(new Date(r.startTime));
  dom.editEnd.value = toLocalDatetimeStr(new Date(r.endTime));
  let tagVal = r.tag;
  if (!tags.some(t => t.id === tagVal)) {
    const found = tags.find(t => t.name === tagVal); if (found) tagVal = found.id;
  }
  dom.editTag.value = tagVal;
  dom.editModal.classList.remove('hidden'); dom.editActivity.focus();
}

function closeModal() { editingId = null; dom.editModal.classList.add('hidden'); }

function saveEdit() {
  if (!editingId) return; const r = records.find(rec => rec.id === editingId); if (!r) return;
  const startTime = new Date(dom.editStart.value); const endTime = new Date(dom.editEnd.value);
  if (endTime <= startTime) { dom.statusText.textContent = '结束时间必须晚于开始时间'; return; }
  r.activity = dom.editActivity.value.trim() || r.activity;
  r.startTime = startTime.toISOString(); r.endTime = endTime.toISOString();
  r.duration = endTime - startTime; r.tag = dom.editTag.value;
  r.date = toDateStr(startTime); r.updatedAt = new Date().toISOString();
  saveRecords(); closeModal(); renderAll(); dom.statusText.textContent = '已更新记录';
}

function deleteRecord(id) {
  if (!confirm('确定删除这条记录吗？此操作不可恢复。')) return;
  records = records.filter(r => r.id !== id); saveRecords(); renderAll();
  dom.statusText.textContent = '已删除记录';
}

function renderAll() {
  if (rangeMode && rangeStart && rangeEnd) {
    const rangeRecords = getRangeRecords(rangeStart, rangeEnd);
    renderTimelineForRange(rangeRecords); renderStatsForRange(rangeRecords);
    renderDailyTrendChart(rangeRecords); updateRangeUI(rangeRecords); updateDateUI();
  } else {
    const dayRecords = getDayRecords(currentDate);
    renderTimeline(dayRecords); renderStats(dayRecords); updateDateUI();
  }
}

function getDayRecords(dateStr) { return records.filter(r => r.date === dateStr).sort((a, b) => new Date(a.startTime) - new Date(b.startTime)); }

function renderTimeline(dayRecords) {
  if (dayRecords.length === 0) { dom.timeline.innerHTML = '<div class="empty-state">今天还没有记录</div>'; return; }
  let html = '';
  for (const r of dayRecords) {
    const start = new Date(r.startTime); const end = new Date(r.endTime);
    const tagColor = getTagColor(r.tag); const tagName = getTagName(r.tag); const tagIcon = getTagIcon(r.tag);
    html += `<div class="timeline-item" style="border-left-color: ${tagColor}">
      <span class="timeline-time">${formatTime(start)} - ${formatTime(end)}</span>
      <div class="timeline-info">
        <span class="timeline-activity">${escHtml(r.activity)}</span>
        <span class="timeline-tag" style="background: ${tagColor}22; color: ${tagColor}">${tagIcon} ${tagName}</span>
      </div>
      <span class="timeline-duration">${formatDuration(r.duration)}</span>
      <div class="timeline-actions"><button class="btn-sm" data-edit="${r.id}">编辑</button><button class="btn-sm danger" data-del="${r.id}">删除</button></div>
    </div>`;
  }
  dom.timeline.innerHTML = html;
  dom.timeline.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => openEditModal(btn.dataset.edit)));
  dom.timeline.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', () => deleteRecord(btn.dataset.del)));
}

function renderStats(dayRecords) {
  const tagMap = {};
  for (const r of dayRecords) { if (!tagMap[r.tag]) tagMap[r.tag] = 0; tagMap[r.tag] += r.duration; }
  const tagData = Object.entries(tagMap).map(([tag, ms]) => ({ tag, minutes: Math.round(ms / 60000), hours: ms / 3600000 }));
  tagData.sort((a, b) => b.minutes - a.minutes);
  drawPieChart(dom.pieChart, tagData); drawBarChart(dom.barChart, tagData); renderTagSummary(tagData);
}

function renderTagSummary(tagData) {
  const totalMin = tagData.reduce((s, d) => s + d.minutes, 0);
  if (tagData.length === 0) { dom.tagSummary.innerHTML = '暂无数据'; return; }
  let html = '';
  for (const d of tagData) {
    const pct = totalMin > 0 ? Math.round(d.minutes / totalMin * 100) : 0;
    const color = getTagColor(d.tag); const name = getTagName(d.tag); const icon = getTagIcon(d.tag);
    html += `<div class="tag-summary-item"><span class="tag-dot" style="background:${color}"></span><span>${icon} ${name}</span><span class="tag-summary-value">${d.hours.toFixed(1)}h (${pct}%)</span></div>`;
  }
  dom.tagSummary.innerHTML = html;
}

function updateDateUI() {
  const dayRecords = getDayRecords(currentDate); const totalMs = dayRecords.reduce((s, r) => s + r.duration, 0);
  dom.dateTotal.textContent = `总计 ${(totalMs / 3600000).toFixed(1)} 小时 | ${dayRecords.length} 条记录`;
  dom.nextDay.style.visibility = currentDate < getToday() ? 'visible' : 'hidden';
}

function setupCanvas(canvas, w, h) {
  const dpr = window.devicePixelRatio || 1; canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr); return ctx;
}

function drawPieChart(canvas, tagData) {
  const ctx = setupCanvas(canvas, 250, 250); const cx = 125, cy = 125, radius = 100, innerRadius = 60;
  const total = tagData.reduce((s, d) => s + d.minutes, 0); ctx.clearRect(0, 0, 250, 250);
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text').trim();
  if (total === 0) {
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fillStyle = '#D0D0D8'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--card-bg').trim() || '#FFF'; ctx.fill();
    ctx.fillStyle = textColor; ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('暂无数据', cx, cy); return;
  }
  let startAngle = -Math.PI / 2;
  for (const d of tagData) {
    const sliceAngle = (d.minutes / total) * Math.PI * 2;
    ctx.beginPath(); ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
    ctx.arc(cx, cy, innerRadius, startAngle + sliceAngle, startAngle, true); ctx.closePath();
    ctx.fillStyle = getTagColor(d.tag); ctx.fill();
    const pct = Math.round(d.minutes / total * 100);
    if (pct >= 8) {
      const midAngle = startAngle + sliceAngle / 2; const labelR = (radius + innerRadius) / 2;
      const lx = cx + Math.cos(midAngle) * labelR; const ly = cy + Math.sin(midAngle) * labelR;
      ctx.fillStyle = '#FFF'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(pct + '%', lx, ly);
    }
    startAngle += sliceAngle;
  }
}

function drawBarChart(canvas, tagData) {
  const ctx = setupCanvas(canvas, 400, 200); const w = 400, h = 200;
  
  // 动态计算左侧边距以适配长标签名
  ctx.font = '12px sans-serif';
  let maxLabelW = 0;
  tagData.forEach(d => {
    const label = getTagIcon(d.tag) + ' ' + getTagName(d.tag);
    maxLabelW = Math.max(maxLabelW, ctx.measureText(label).width);
  });
  const padLeft = Math.min(Math.max(maxLabelW + 15, 60), 160);

  const pad = { top: 16, right: 50, bottom: 16, left: padLeft }; 
  const chartW = w - pad.left - pad.right; const chartH = h - pad.top - pad.bottom;
  ctx.clearRect(0, 0, w, h); const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text').trim();
  if (tagData.length === 0) { ctx.fillStyle = textColor; ctx.textAlign = 'center'; ctx.fillText('暂无数据', w / 2, h / 2); return; }
  const maxHours = Math.max(...tagData.map(d => d.hours), 0.1); const barCount = tagData.length; const barGap = 8;
  const barH = Math.min((chartH - barGap * (barCount - 1)) / barCount, 30);
  tagData.forEach((d, i) => {
    const y = pad.top + i * (barH + barGap); const barW = (d.hours / maxHours) * chartW;
    ctx.fillStyle = textColor; ctx.font = '12px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(getTagIcon(d.tag) + ' ' + getTagName(d.tag), pad.left - 8, y + barH / 2);
    ctx.fillStyle = 'rgba(128,128,160,0.1)'; ctx.fillRect(pad.left, y, chartW, barH);
    ctx.fillStyle = getTagColor(d.tag); ctx.fillRect(pad.left, y, barW, barH);
    ctx.fillStyle = textColor; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(d.hours.toFixed(1) + 'h', pad.left + barW + 6, y + barH / 2);
  });
}

function getTagName(tagId) { const t = tags.find(t => t.id === tagId); return t ? t.name : (tagId || '无标签'); }
function getTagIcon(tagId) { return TAG_ICONS[tagId] || '🏷️'; }
function getTagColor(tagId) { return TAG_COLORS[tagId] || '#999'; }

function toggleTheme() {
  const html = document.documentElement; const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark'; html.setAttribute('data-theme', next);
  dom.themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('timetracker-theme', next); renderAll();
}

function loadTheme() {
  const theme = localStorage.getItem('timetracker-theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  dom.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function changeDate(delta) {
  const d = new Date(currentDate + 'T00:00:00'); d.setDate(d.getDate() + delta);
  currentDate = toDateStr(d); dom.datePicker.value = currentDate; renderAll();
}

function goToToday() { currentDate = getToday(); dom.datePicker.value = currentDate; renderAll(); }
function getToday() { return toDateStr(new Date()); }
function toDateStr(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function formatTime(d) { return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
function formatDuration(ms) { const m = Math.round(ms / 60000); return m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : m + 'm'; }
function formatDurationHMS(ms) {
  const h = Math.floor(ms / 3600000); const m = Math.floor((ms % 3600000) / 60000); const s = Math.floor((ms % 60000) / 1000);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
function formatLocal(d) { const pad = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
function toLocalDatetimeStr(d) { const pad = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
function generateId() { return Date.now().toString(36) + Math.random().toString(36).substring(2, 11); }
function escHtml(str) { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }

function toggleRangeMode() {
  rangeMode = !rangeMode;
  if (rangeMode) {
    if (!rangeStart) { rangeStart = currentDate; rangeEnd = currentDate; }
    dom.rangeStartPicker.value = rangeStart; dom.rangeEndPicker.value = rangeEnd;
    dom.rangeBar.classList.remove('hidden'); dom.rangePickers.style.display = 'flex';
    dom.rangeTotal.style.display = ''; dom.rangeExportBtn.style.display = ''; dom.rangeToggle.textContent = '📅 关闭范围';
  } else {
    dom.rangePickers.style.display = 'none'; dom.rangeTotal.style.display = 'none';
    dom.rangeExportBtn.style.display = 'none'; dom.trendChartContainer.classList.add('hidden'); dom.rangeToggle.textContent = '📅 时间范围';
  }
  renderAll();
}

function onRangeDateChange() { rangeStart = dom.rangeStartPicker.value; rangeEnd = dom.rangeEndPicker.value; renderAll(); }
function applyRangePreset(preset) {
  const today = new Date();
  if (preset === 'today') { rangeStart = rangeEnd = getToday(); }
  else if (preset === 'week') { rangeStart = toDateStr(getMonday(today)); rangeEnd = toDateStr(getSunday(today)); }
  else if (preset === 'month') { rangeStart = toDateStr(new Date(today.getFullYear(), today.getMonth(), 1)); rangeEnd = toDateStr(new Date(today.getFullYear(), today.getMonth() + 1, 0)); }
  else if (preset === 'last7') { rangeEnd = getToday(); rangeStart = toDateStr(new Date(today.getTime() - 6 * 86400000)); }
  else if (preset === 'last30') { rangeEnd = getToday(); rangeStart = toDateStr(new Date(today.getTime() - 29 * 86400000)); }
  dom.rangeStartPicker.value = rangeStart; dom.rangeEndPicker.value = rangeEnd; renderAll();
}
function getMonday(d) { const date = new Date(d); const day = date.getDay(); const diff = day === 0 ? -6 : 1 - day; date.setDate(date.getDate() + diff); return date; }
function getSunday(d) { const date = new Date(d); const day = date.getDay(); const diff = day === 0 ? 0 : 7 - day; date.setDate(date.getDate() + diff); return date; }

function getRangeRecords(startStr, endStr) {
  const start = new Date(startStr + 'T00:00:00'); const end = new Date(endStr + 'T23:59:59.999');
  return records.filter(r => { const d = new Date(r.startTime); return d >= start && d <= end; }).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
}

function updateRangeUI(rangeRecords) {
  const totalMs = rangeRecords.reduce((s, r) => s + r.duration, 0);
  const days = countDaysInRange(rangeStart, rangeEnd);
  dom.rangeTotal.textContent = `范围共 ${(totalMs / 3600000).toFixed(1)}h | ${rangeRecords.length} 条 | 日均 ${(totalMs / 3600000 / (days || 1)).toFixed(1)}h`;
}

function renderTimelineForRange(rangeRecords) {
  if (rangeRecords.length === 0) { dom.timeline.innerHTML = '暂无记录'; return; }
  const groups = {}; rangeRecords.forEach(r => { if (!groups[r.date]) groups[r.date] = []; groups[r.date].push(r); });
  let html = '';
  Object.keys(groups).sort().forEach(date => {
    html += `<div class="timeline-date-group"><div class="timeline-date-header">📅 ${date}</div>`;
    groups[date].forEach(r => {
      const tagColor = getTagColor(r.tag);
      html += `<div class="timeline-item" style="border-left-color: ${tagColor}"><span>${formatTime(new Date(r.startTime))}</span><div class="timeline-info"><span>${escHtml(r.activity)}</span><span class="timeline-tag" style="background:${tagColor}22; color:${tagColor}">${getTagIcon(r.tag)} ${getTagName(r.tag)}</span></div><span>${formatDuration(r.duration)}</span><div class="timeline-actions"><button class="btn-sm" data-edit="${r.id}">编辑</button></div></div>`;
    });
    html += '</div>';
  });
  dom.timeline.innerHTML = html;
  dom.timeline.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => openEditModal(btn.dataset.edit)));
}

function renderStatsForRange(rangeRecords) {
  const tagMap = {}; rangeRecords.forEach(r => { if (!tagMap[r.tag]) tagMap[r.tag] = 0; tagMap[r.tag] += r.duration; });
  const days = countDaysInRange(rangeStart, rangeEnd);
  const tagData = Object.entries(tagMap).map(([tag, ms]) => ({ tag, minutes: Math.round(ms / 60000), hours: ms / 3600000, avgPerDay: ms / 3600000 / (days || 1) }));
  tagData.sort((a, b) => b.minutes - a.minutes); drawPieChart(dom.pieChart, tagData); drawBarChart(dom.barChart, tagData); renderTagSummaryForRange(tagData);
}

function renderTagSummaryForRange(tagData) {
  const totalMin = tagData.reduce((s, d) => s + d.minutes, 0);
  let html = ''; tagData.forEach(d => {
    const pct = totalMin > 0 ? Math.round(d.minutes / totalMin * 100) : 0;
    const color = getTagColor(d.tag);
    html += `<div class="tag-summary-item"><span class="tag-dot" style="background:${color}"></span><span>${getTagIcon(d.tag)} ${getTagName(d.tag)}</span><span class="tag-summary-value">${d.hours.toFixed(1)}h (${pct}%)</span></div>`;
  });
  dom.tagSummary.innerHTML = html;
}

function renderDailyTrendChart(rangeRecords) {
  dom.trendChartContainer.classList.remove('hidden');
  const canvas = dom.trendChart; const w = 800, h = 250; const ctx = setupCanvas(canvas, w, h);
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text').trim();
  const textSec = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
  const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border').trim();
  ctx.clearRect(0, 0, w, h);
  const days = buildDateArray(rangeStart, rangeEnd);
  const dailyData = days.map(dateStr => {
    const dayRecs = rangeRecords.filter(r => r.date === dateStr);
    const tagMap = {}; dayRecs.forEach(r => { if (!tagMap[r.tag]) tagMap[r.tag] = 0; tagMap[r.tag] += r.duration; });
    return { date: dateStr, totalMs: dayRecs.reduce((s, r) => s + r.duration, 0), tagMap };
  });
  if (dailyData.length === 0) return;
  const pad = { top: 30, right: 40, bottom: 40, left: 48 }; const chartW = w - pad.left - pad.right; const chartH = h - pad.top - pad.bottom;
  const barCount = dailyData.length; const barWidth = Math.max(Math.min(chartW / barCount - 4, 40), 6); const barGap = (chartW - barWidth * barCount) / (barCount + 1);
  const maxTotalH = Math.max(...dailyData.map(d => d.totalMs / 3600000), 0.5); const yMax = Math.ceil(maxTotalH * 1.2 / 0.5) * 0.5 || 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (chartH / 4) * i; const val = yMax - (yMax / 4) * i;
    ctx.fillStyle = textSec; ctx.font = '10px sans-serif'; ctx.textAlign = 'right'; ctx.fillText(val.toFixed(1) + 'h', pad.left - 6, y + 4);
    ctx.strokeStyle = gridColor; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y); ctx.stroke();
  }
  const activeTagIds = new Set(rangeRecords.map(r => r.tag)); const tagOrder = tags.map(t => t.id).filter(id => activeTagIds.has(id));
  activeTagIds.forEach(id => { if (!tagOrder.includes(id)) tagOrder.push(id); });
  dailyData.forEach((d, i) => {
    const x = pad.left + barGap + i * (barWidth + barGap); let stackY = pad.top + chartH;
    tagOrder.forEach(tag => {
      const ms = d.tagMap[tag] || 0; if (ms > 0) {
        const segH = (ms / 3600000 / yMax) * chartH; ctx.fillStyle = getTagColor(tag);
        ctx.fillRect(x, stackY - segH, barWidth, segH); stackY -= segH;
      }
    });
    if (barCount <= 15 || i % Math.max(1, Math.floor(barCount / 8)) === 0) {
      const parts = d.date.split('-'); ctx.fillStyle = textSec; ctx.textAlign = 'center'; ctx.fillText(parts[1] + '/' + parts[2], x + barWidth / 2, pad.top + chartH + 15);
    }
  });
}

function buildDateArray(startStr, endStr) {
  const dates = []; let curr = new Date(startStr + 'T00:00:00'); const end = new Date(endStr + 'T00:00:00');
  while (curr <= end) { dates.push(toDateStr(curr)); curr.setDate(curr.getDate() + 1); }
  return dates;
}

function countDaysInRange(startStr, endStr) {
  const start = new Date(startStr + 'T00:00:00'); const end = new Date(endStr + 'T00:00:00');
  return Math.round((end - start) / 86400000) + 1;
}

async function exportCSV() {
  let csv = '活动,标签,开始时间,结束时间,耗时(分钟),日期\n';
  records.forEach(r => { csv += `"${r.activity}","${getTagName(r.tag)}","${formatLocal(new Date(r.startTime))}","${formatLocal(new Date(r.endTime))}",${Math.round(r.duration/60000)},"${r.date}"\n`; });
  const result = await window.electronAPI.exportCSV(csv);
  dom.statusText.textContent = result.success ? '已导出' : '已取消';
}

async function exportRangeCSV() { exportCSV(); }
async function importCSV() { const result = await window.electronAPI.importCSV(); if (result.success) { renderAll(); } }

init();
