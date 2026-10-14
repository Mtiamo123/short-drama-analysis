/* ============================================================
 * 短剧编剧特征 × 传播热度 · 交互式可视化
 * 依赖：ECharts 5 (CDN) + data.js (BUILTIN_DATA / dataAdapter)
 * 说明：所有相关性均为观测性统计，非因果结论；样本 n=50。
 * ============================================================ */
'use strict';

const COLORS = { pos: '#e6533c', neg: '#2c7be5', neutral: '#5b8ff9' };

const S = {
  data: null,
  dramas: [],            // 附带 _heatGroup / _conflictBin
  filtered: [],
  selectedVid: null,
  // 单一筛选：时间(月) + 语言 + 热度分组 + 剧名搜索 + 信号词（信号词由信号词图点击触发）
  filters: { start: '', end: '', langs: ['英文', '中文'], heat: 'all', kw: '', signal: null },
  charts: {},
  sort: { key: 'rank', dir: 'asc' },
  archSort: { key: 'rank', dir: 'asc' },
};

/* ---------------- helpers ---------------- */
function fmt(x, d) {
  if (x === null || x === undefined || x === '') return '—';
  if (typeof x === 'number') {
    if (!isFinite(x)) return '—';
    return String(+x.toFixed(d === undefined ? 2 : d));
  }
  return String(x);
}
function pct(x, d) { return ((x || 0) * 100).toFixed(d === undefined ? 1 : d) + '%'; }
function fmtInt(v) { if (v === null || v === undefined || v === 0) return '—'; return Number(v).toLocaleString('en-US'); }
function quantile(arr, p) {
  const s = arr.slice().sort((a, b) => a - b);
  if (!s.length) return NaN;
  const pos = (s.length - 1) * p;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  if (lo === hi) return s[lo];
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}
function box5(arr) {
  const s = arr.slice().sort((a, b) => a - b);
  return [s[0], quantile(arr, 0.25), quantile(arr, 0.5), quantile(arr, 0.75), s[s.length - 1]];
}
function linreg(xs, ys) {
  const n = xs.length;
  if (n < 2) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; }
  const den = n * sxx - sx * sx;
  if (Math.abs(den) < 1e-12) return null;
  const b = (n * sxy - sx * sy) / den;
  const a = (sy - b * sx) / n;
  return { a, b };
}

const UNIT = {
  '情节转折密度': '次/分钟', '剪辑节奏': '次/秒', '偶然事件数': '次', '冲突密度': '次/分钟',
  '冲突事件数': '次', '偶然事件频率': '次/10分钟', '大事件频率': '次/10分钟', '主要人物数': '人',
  '语速': '词/分钟', '大事件数': '次', '情节点数量': '个', '对话密度': '占比', '叙事缺陷数量': '个',
};

function chart(id) {
  if (typeof echarts === 'undefined') return null;
  if (!S.charts[id]) {
    const el = document.getElementById(id);
    if (!el) return null;
    S.charts[id] = echarts.init(el);
  }
  return S.charts[id];
}

/* ---------------- group derivation ---------------- */
function computeGroups() {
  const ds = S.data.dramas;
  const byHeat = ds.slice().sort((a, b) => b.heat - a.heat);
  byHeat.forEach((d, i) => { d._heatGroup = i < 12 ? '高' : (i >= 38 ? '低' : '中'); });
  const byCd = ds.slice().sort((a, b) => a.conflictDensity - b.conflictDensity);
  byCd.forEach((d, i) => { d._conflictBin = i < 17 ? '低' : (i < 33 ? '中' : '高'); });
}

/* ---------------- filtering ---------------- */
function wordMatch(words, term) {
  term = (term || '').toLowerCase();
  if (!term) return true;
  return (words || []).some(w => w === term || w.indexOf(term) === 0 || term.indexOf(w) === 0);
}
function getFiltered() {
  const f = S.filters;
  return S.dramas.filter(d => {
    if (f.start && (!d.pubMonth || d.pubMonth < f.start)) return false;
    if (f.end && (!d.pubMonth || d.pubMonth > f.end)) return false;
    if (f.langs.length && f.langs.indexOf(d.lang) < 0) return false;
    if (f.heat !== 'all' && d._heatGroup !== f.heat) return false;
    if (f.kw && d.name.toLowerCase().indexOf(f.kw.toLowerCase()) < 0) return false;
    if (f.signal && !wordMatch(d.words, f.signal)) return false;
    return true;
  });
}

/* ---------------- KPI cards ---------------- */
function renderKPIs() {
  const d = S.data;
  const fc = d.featureCorr.slice().sort((a, b) => Math.abs(b.rho) - Math.abs(a.rho));
  const top = fc[0];
  const sigCount = [...d.plotTypeCorr, ...d.conflictWordCorr, ...d.majorEventCorr].filter(x => x.p !== null && x.p < 0.05).length;
  const mid = d.conflictBins.find(b => b.bin === '中');
  const cards = [
    { label: '样本量', value: '50', sub: '部 YouTube 热门短剧', tone: 'neu' },
    { label: '高热度组', value: '12', sub: '综合热度前 25%', tone: 'pos' },
    { label: '低热度组', value: '12', sub: '综合热度后 25%', tone: 'neg' },
    { label: '最强正相关', value: (top && top.rho > 0 ? '+' : '') + fmt(top.rho, 3), sub: (top ? top.feature : '') + ' ρ', tone: 'pos' },
    { label: '显著项数量', value: String(sigCount), sub: 'p < 0.05 信号词', tone: 'neu' },
    { label: '冲突密度·中档热度', value: fmt(mid ? mid.meanHeat : 0, 1), sub: '中 > 高 > 低（适度最优）', tone: 'neu' },
  ];
  renderKpiGroup('kpis', cards);
}
function renderKPIs2() {
  const d = S.data;
  const sig = [];
  [...d.conflictWordCorr, ...d.plotTypeCorr, ...d.majorEventCorr].forEach(x => {
    if (x.p !== null && x.p < 0.05) sig.push(x);
  });
  const sigText = sig.map(x => x.term).join(' · ');
  const sigP = sig.map(x => x.term + ' p=' + fmt(x.p, 3)).join('　');
  const cards = [
    { label: '最强正相关', value: '情节转折密度 +0.266', sub: 'Spearman ρ，p=0.062', tone: 'pos' },
    { label: '三个稳定正相关维度', value: '强钩子 / 侮辱冲突 / 适度冲突', sub: 'ρ≈+0.16~0.17', tone: 'pos' },
    { label: '显著项（p<0.05）', value: sigText || '—', sub: sigP || 'insult · pregnant · reveal(负)', tone: 'neu' },
    { label: '冲突密度分档排序', value: '中 33.4 > 高 32.2 > 低 27.8', sub: '支撑「适度最优」', tone: 'pos' },
  ];
  renderKpiGroup('kpis2', cards);
}
function renderKpiGroup(containerId, cards) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = cards.map(c => {
    const valueIsLong = c.value && c.value.length > 22;
    return '<div class="kpi ' + (c.tone || 'neu') + '">' +
      '<div class="k-label">' + c.label + '</div>' +
      '<div class="k-value"' + (valueIsLong ? ' style="font-size:15px"' : '') + '>' + c.value + '</div>' +
      (c.sub ? '<div class="k-sub">' + c.sub + '</div>' : '') +
      '</div>';
  }).join('');
}

function renderActiveFilters() {
  const f = S.filters;
  const chips = ['当前筛选 <b>' + S.filtered.length + '</b> / ' + S.dramas.length + ' 部'];
  if (f.start || f.end) chips.push('时间：<b>' + (f.start || '最早') + ' – ' + (f.end || '最新') + '</b>');
  if (f.langs.length < 2) chips.push('语言：<b>' + f.langs.join('、') + '</b>');
  if (f.heat !== 'all') chips.push('热度：<b>' + f.heat + '组</b>');
  if (f.kw) chips.push('搜索：<b>' + f.kw + '</b>');
  if (f.signal) chips.push('信号词：<b>' + f.signal + '</b>');
  const el = document.getElementById('active-filters');
  if (el) el.innerHTML = chips.map(c => '<span class="chip">' + c + '</span>').join('');

  // 顶部筛选结果横幅（醒目大数字 + 简短说明）
  const fsEl = document.getElementById('filter-status');
  if (fsEl) {
    fsEl.innerHTML = '<span class="fs-count">当前显示 <b>' + S.filtered.length + '</b> / ' + S.dramas.length + ' 部短剧</span>' +
      '<span class="fs-divider"></span>' +
      '<span class="fs-hint">变更筛选后，趋势图 · 语言对比 · 档案表与 <b>⚡ 联动</b> 散点图 · 箱线图 · 雷达图 · 明细表即时刷新</span>';
  }
}

/* ---------------- 图表 ---------------- */
function emptyOption(message) {
  return {
    title: { text: message || '暂无数据', left: 'center', top: 'middle', textStyle: { color: '#9aa3b2', fontSize: 14, fontWeight: 400 } },
  };
}

/* 图表 A：冲突密度分档热度排序 */
function renderBinRank() {
  const c = chart('c_bin_rank'); if (!c) return;
  const bins = S.data.conflictBins.slice().sort((a, b) => b.meanHeat - a.meanHeat);
  const names = bins.map(b => ({ '低': '低档', '中': '中档', '高': '高档' }[b.bin] || b.bin));
  const colors = bins.map(b => b.bin === '中' ? COLORS.pos : COLORS.neg);
  c.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => {
      const b = bins[p[0].dataIndex];
      return p[0].name + '<br/>综合热度均值：' + fmt(b.meanHeat, 1) + '<br/>中位数：' + fmt(b.medianHeat, 1) +
        '<br/>剧数：' + b.count + ' 部<br/>样本 n=50';
    }},
    grid: { left: 60, right: 80, top: 10, bottom: 30 },
    xAxis: { type: 'value', name: '综合传播热度', nameTextStyle: { fontSize: 11 } },
    yAxis: { type: 'category', data: names, axisLabel: { fontSize: 13 } },
    series: [{
      type: 'bar', data: bins.map(b => ({ value: +b.meanHeat.toFixed(1), itemStyle: { color: colors[bins.indexOf(b)] } })),
      barMaxWidth: 34,
      label: { show: true, position: 'right', formatter: p => fmt(p.value, 1), color: '#333' },
    }],
  });
  // 标注「适度最优」
  c.setOption({ graphic: [] });
}

/* 图表 B：显著信号词 p 值 */
function renderSigWords() {
  const c = chart('c_sig_words'); if (!c) return;
  const all = [...S.data.conflictWordCorr, ...S.data.plotTypeCorr, ...S.data.majorEventCorr]
    .filter(x => x.p !== null)
    .sort((a, b) => a.p - b.p);
  const top = all.slice(0, 8);
  const names = top.map(x => x.term);
  const neglog = top.map(x => -Math.log10(x.p));
  c.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => {
      const x = top[p[0].dataIndex];
      return x.term + '（' + x.dim + '）<br/>ρ = ' + (x.rho > 0 ? '+' : '') + fmt(x.rho, 3) +
        '<br/>p = ' + fmt(x.p, 4) + (x.p < 0.05 ? ' ★ 显著' : '') +
        '<br/>Pearson r = ' + fmt(x.pearson, 3) + '<br/>出现剧数 ' + x.n_dramas + ' / 有效样本 ' + x.n;
    }},
    grid: { left: 70, right: 30, top: 10, bottom: 30 },
    xAxis: { type: 'value', name: '−log10(p)', nameTextStyle: { fontSize: 11 } },
    yAxis: { type: 'category', data: names, axisLabel: { fontSize: 12 } },
    series: [{
      type: 'bar', data: top.map(x => ({ value: +neglog[top.indexOf(x)].toFixed(2), itemStyle: { color: x.rho >= 0 ? COLORS.pos : COLORS.neg } })),
      barMaxWidth: 20,
      label: { show: true, position: 'right', formatter: p => { const x = top[p.dataIndex]; return (x.rho>0?'+':'') + fmt(x.rho, 2); }, fontSize: 10 },
      markLine: { silent: true, symbol: 'none', lineStyle: { type: 'dashed', color: '#b0b7c2' }, label: { formatter: 'p=0.05', position: 'end', fontSize: 10 }, data: [{ xAxis: -Math.log10(0.05) }] },
    }],
  });
}

/* 图表 1：13 项特征 Spearman ρ 条形图 */
function renderFeatRho() {
  const c = chart('c_feat_rho'); if (!c) return;
  const rows = S.data.featureCorr.slice().sort((a, b) => Math.abs(b.rho) - Math.abs(a.rho));
  const names = rows.map((r, i) => '#' + (i + 1) + ' ' + r.feature);
  c.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => {
      const r = rows[p[0].dataIndex];
      return r.feature + '<br/>Spearman ρ = ' + (r.rho > 0 ? '+' : '') + fmt(r.rho, 3) +
        '<br/>p = ' + fmt(r.p, 3) + '<br/>Pearson r = ' + fmt(r.pearson, 3) +
        '<br/>有效样本 n = ' + r.n + '<br/>排名（按 |ρ|）：第 ' + (p[0].dataIndex + 1) + ' 位';
    }},
    grid: { left: 250, right: 60, top: 10, bottom: 30 },
    xAxis: { type: 'value', name: 'Spearman ρ', nameTextStyle: { fontSize: 11 } },
    yAxis: { type: 'category', data: names, axisLabel: { fontSize: 12 } },
    series: [{
      type: 'bar',
      data: rows.map(r => ({ value: r.rho, itemStyle: { color: r.rho >= 0 ? COLORS.pos : COLORS.neg } })),
      barMaxWidth: 18,
      label: { show: true, position: 'right', formatter: p => (p.value >= 0 ? '+' : '') + fmt(p.value, 3), fontSize: 10 },
    }],
  });
}

/* 图表 2：相关性热力图（18×18 全矩阵） */
function renderCorrHeat() {
  const c = chart('c_corr_heat'); if (!c) return;
  const { labels, matrix } = S.data.corrMatrix;
  const data = [];
  for (let i = 0; i < labels.length; i++) {
    for (let j = 0; j < labels.length; j++) {
      data.push([j, i, matrix[i][j]]);
    }
  }
  c.setOption({
    tooltip: { position: 'top', formatter: p => {
      const i = p.value[1], j = p.value[0];
      return labels[i] + ' × ' + labels[j] + '<br/>ρ = ' + fmt(p.value[2], 3);
    } },
    grid: { left: 150, right: 30, top: 20, bottom: 90 },
    xAxis: { type: 'category', data: labels, axisLabel: { rotate: 45, fontSize: 10, interval: 0 } },
    yAxis: { type: 'category', data: labels, axisLabel: { fontSize: 10 } },
    visualMap: {
      min: -1, max: 1, calculable: true, orient: 'horizontal', left: 'center', bottom: 0,
      text: ['正相关', '负相关'], textStyle: { fontSize: 10 },
      inRange: { color: [COLORS.neg, '#f2f4f8', COLORS.pos] },
    },
    series: [{
      type: 'heatmap', data, label: { show: false },
      itemStyle: { borderColor: '#fff', borderWidth: 0.5 },
      emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,.25)' } },
    }],
  });
}

/* 散点图工厂（冲突密度 / 情节转折密度 / 大事件频率） */
function renderScatter(id, xKey, xLabel, xDec) {
  const c = chart(id); if (!c) return;
  const ds = S.filtered;
  if (!ds.length) { c.setOption(emptyOption('暂无数据'), true); return; }
  const pts = ds.filter(d => d[xKey] !== null && d[xKey] !== undefined && d.heat !== null);
  const xs = pts.map(d => d[xKey]);
  const ys = pts.map(d => d.heat);
  const lr = linreg(xs, ys);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const trend = lr ? [[minX, lr.a + lr.b * minX], [maxX, lr.a + lr.b * maxX]] : [];
  c.setOption({
    tooltip: { trigger: 'item', formatter: p => {
      const d = pts[p.dataIndex];
      return '<b>' + d.name + '</b>（排名 ' + d.rank + '）<br/>' + xLabel + '：' + fmt(d[xKey], xDec) +
        '<br/>综合热度：' + fmt(d.heat, 1) + '<br/>热度分组：' + d._heatGroup +
        '<br/>点击高亮剧集明细';
    }},
    grid: { left: 55, right: 24, top: 20, bottom: 45 },
    xAxis: { type: 'value', name: xLabel, nameTextStyle: { fontSize: 11 }, scale: true },
    yAxis: { type: 'value', name: '综合传播热度', nameTextStyle: { fontSize: 11 } },
    series: [
      {
        type: 'scatter', name: '剧集',
        data: pts.map(d => {
          const sel = S.selectedVid === d.vid;
          return { value: [d[xKey], d.heat], vid: d.vid, symbolSize: sel ? 16 : 9,
            itemStyle: { color: d._heatGroup === '高' ? COLORS.pos : (d._heatGroup === '低' ? COLORS.neg : COLORS.neutral), borderColor: sel ? '#20252f' : 'transparent', borderWidth: sel ? 2 : 0 } };
        }),
      },
      trend.length ? { type: 'line', name: '线性趋势', data: trend, symbol: 'none', lineStyle: { color: '#888', type: 'dashed' }, silent: true } : null,
    ].filter(Boolean),
  });
  c.off('click');
  c.on('click', p => {
    if (p.seriesType === 'scatter' && p.data && p.data.vid) { selectDrama(p.data.vid, 'scatter'); openDetail(p.data.vid); }
  });
}

/* 图表 6：题材母题占比并排柱 */
function renderThemeShare() {
  const c = chart('c_theme_share'); if (!c) return;
  const rows = S.data.highLowShare.filter(r => !r.category.startsWith('结构_'));
  const names = rows.map(r => r.category);
  c.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => {
      const r = rows[p[0].dataIndex];
      return r.category + '<br/>高组占比：' + pct(r.high) + '<br/>低组占比：' + pct(r.low) +
        '<br/>占比差：' + (r.diff >= 0 ? '+' : '') + pct(r.diff, 1) + 'pp<br/>（高组 12 部 / 低组 12 部）';
    }},
    legend: { data: ['高热度组', '低热度组'], top: 0 },
    grid: { left: 50, right: 20, top: 36, bottom: 30 },
    xAxis: { type: 'category', data: names },
    yAxis: { type: 'value', name: '占比', max: 1.1, axisLabel: { formatter: v => (v * 100) + '%' } },
    series: [
      { name: '高热度组', type: 'bar', data: rows.map(r => ({ value: r.high, itemStyle: { color: COLORS.pos } })), barMaxWidth: 24 },
      { name: '低热度组', type: 'bar', data: rows.map(r => ({ value: r.low, itemStyle: { color: COLORS.neg } })), barMaxWidth: 24,
        label: { show: true, position: 'top', formatter: p => { const r = rows[p.dataIndex]; return (r.diff >= 0 ? '+' : '') + pct(r.diff, 1) + 'pp'; }, fontSize: 10, color: '#555' } },
    ],
  });
}

/* 图表 7：叙事结构占比并排柱 */
function renderStructShare() {
  const c = chart('c_struct_share'); if (!c) return;
  const rows = S.data.highLowShare.filter(r => r.category.startsWith('结构_'));
  const names = rows.map(r => r.category.replace('结构_', ''));
  c.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => {
      const r = rows[p[0].dataIndex];
      return names[p[0].dataIndex] + '<br/>高组占比：' + pct(r.high) + '<br/>低组占比：' + pct(r.low) +
        '<br/>占比差：' + (r.diff >= 0 ? '+' : '') + pct(r.diff, 1) + 'pp<br/>（高组 12 部 / 低组 12 部）';
    }},
    legend: { data: ['高热度组', '低热度组'], top: 0 },
    grid: { left: 50, right: 20, top: 36, bottom: 30 },
    xAxis: { type: 'category', data: names },
    yAxis: { type: 'value', name: '占比', max: 1.1, axisLabel: { formatter: v => (v * 100) + '%' } },
    series: [
      { name: '高热度组', type: 'bar', data: rows.map(r => ({ value: r.high, itemStyle: { color: COLORS.pos } })), barMaxWidth: 42 },
      { name: '低热度组', type: 'bar', data: rows.map(r => ({ value: r.low, itemStyle: { color: COLORS.neg } })), barMaxWidth: 42,
        label: { show: true, position: 'top', formatter: p => { const r = rows[p.dataIndex]; return (r.diff >= 0 ? '+' : '') + pct(r.diff, 1) + 'pp'; }, fontSize: 10, color: '#555' } },
    ],
  });
}

/* 图表 8：关键数值均值差异（高−低）水平发散条 */
function renderNumMean() {
  const c = chart('c_num_mean'); if (!c) return;
  const wanted = ['冲突事件数', '情节转折密度', '冲突密度', '偶然事件数', '剪辑节奏', '语速', '大事件频率'];
  const rows = wanted.map(w => S.data.highLowMeans.find(r => r.feature.indexOf(w) >= 0)).filter(Boolean);
  const names = rows.map(r => r.feature);
  c.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => {
      const r = rows[p[0].dataIndex];
      return r.feature + '<br/>高组均值：' + fmt(r.high, 3) + '<br/>低组均值：' + fmt(r.low, 3) +
        '<br/>均值差（高−低）：' + (r.diff >= 0 ? '+' : '') + fmt(r.diff, 3) + '<br/>单位：' + (UNIT[r.feature.replace(/\([^)]*\)/g, '').trim()] || '') + '<br/>（高组 12 / 低组 12）';
    }},
    grid: { left: 190, right: 120, top: 10, bottom: 30 },
    xAxis: { type: 'value', name: '均值差（高组 − 低组）', nameTextStyle: { fontSize: 11 } },
    yAxis: { type: 'category', data: names.map(n => n.replace(/\([^)]*\)/g, '').trim()), axisLabel: { fontSize: 12 } },
    series: [{
      type: 'bar',
      data: rows.map(r => ({ value: r.diff, itemStyle: { color: r.diff >= 0 ? COLORS.pos : COLORS.neg } })),
      barMaxWidth: 20,
      label: { show: true, position: 'right', formatter: p => { const r = rows[p.dataIndex]; return (r.diff>=0?'+':'') + fmt(r.diff, 2); }, fontSize: 10 },
      markLine: { silent: true, symbol: 'none', lineStyle: { color: '#bbb' }, data: [{ xAxis: 0 }] },
    }],
  });
}

/* 图表 9：三维度 +% 变化 */
function renderThreeDimPct() {
  const c = chart('c_threedim_mean'); if (!c) return;
  const dims = S.data.threeDims;
  const names = dims.map(d => d.dim);
  const chg = dims.map(d => (d.highMean - d.lowMean) / d.lowMean * 100);
  c.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => {
      const d = dims[p[0].dataIndex];
      return d.dim + '<br/>高组均值：' + fmt(d.highMean, 2) + ' ' + d.unit + '<br/>低组均值：' + fmt(d.lowMean, 2) + ' ' + d.unit +
        '<br/>变化：+' + fmt((d.highMean - d.lowMean) / d.lowMean * 100, 0) + '%' +
        '<br/>高组中位：' + fmt(d.highMedian, 2) + ' / 低组中位：' + fmt(d.lowMedian, 2) +
        '<br/>Spearman ρ=' + (d.rho>0?'+':'') + d.rho + '，p=' + d.p + '；Mann-Whitney p=' + d.mwP;
    }},
    grid: { left: 190, right: 70, top: 10, bottom: 30 },
    xAxis: { type: 'value', name: '高组相对低组变化 (%)', nameTextStyle: { fontSize: 11 } },
    yAxis: { type: 'category', data: names, axisLabel: { fontSize: 12 } },
    series: [{
      type: 'bar',
      data: chg.map(v => ({ value: +v.toFixed(1), itemStyle: { color: COLORS.pos } })),
      barMaxWidth: 26,
      label: { show: true, position: 'right', formatter: p => '+' + fmt(p.value, 0) + '%', fontSize: 11, fontWeight: 700 },
    }],
  });
}

/* 图表 10-12：信号词 ρ 条形图（正负） */
function renderWordChart(id, rows, sigTerm, topN) {
  const c = chart(id); if (!c) return;
  const sorted = rows.slice().sort((a, b) => Math.abs(b.rho) - Math.abs(a.rho)).slice(0, topN)
    .sort((a, b) => b.rho - a.rho);
  const names = sorted.map(r => r.term);
  c.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => {
      const r = sorted[p[0].dataIndex];
      return r.term + '（' + r.dim + '）<br/>Spearman ρ = ' + (r.rho > 0 ? '+' : '') + fmt(r.rho, 3) +
        '<br/>p = ' + fmt(r.p, 3) + (r.p < 0.05 ? ' ★ 显著' : '') +
        '<br/>Pearson r = ' + fmt(r.pearson, 3) +
        '<br/>出现剧数 ' + r.n_dramas + ' / 样本 n=' + r.n +
        '<br/>高组均值 ' + fmt(r.highMean, 3) + ' / 低组 ' + fmt(r.lowMean, 3) +
        '<br/><i>点击筛选含该词剧集</i>';
    }},
    grid: { left: 90, right: 40, top: 10, bottom: 30 },
    xAxis: { type: 'value', name: 'Spearman ρ', nameTextStyle: { fontSize: 10 } },
    yAxis: { type: 'category', data: names, axisLabel: { fontSize: 11 } },
    series: [{
      type: 'bar',
      data: sorted.map(r => ({
        value: r.rho,
        itemStyle: { color: r.rho >= 0 ? COLORS.pos : COLORS.neg, borderColor: (r.term === sigTerm ? '#111' : 'transparent'), borderWidth: r.term === sigTerm ? 1.5 : 0 },
      })),
      barMaxWidth: 14,
      label: { show: true, position: 'right', formatter: p => { const r = sorted[p.dataIndex]; return (r.p < 0.05 ? '★ ' : '') + (r.rho>=0?'+':'') + fmt(r.rho, 2); }, fontSize: 9 },
    }],
  });
  c.off('click');
  c.on('click', p => {
    if (p.seriesType !== 'bar' || p.name === undefined) return;
    const term = sorted[p.dataIndex].term;
    setSignalFilter(term);
  });
}

/* 图表 13：冲突密度分档热度 */
function renderBinHeat() {
  const c = chart('c_bin_heat'); if (!c) return;
  const bins = S.data.conflictBins;
  const order = ['低', '中', '高'];
  const names = order.map(o => ({ '低': '低档', '中': '中档', '高': '高档' }[o]));
  c.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => {
      const b = bins[p[0].dataIndex];
      return names[p[0].dataIndex] + '<br/>冲突密度均值：' + fmt(b.meanDensity, 2) + ' 次/分钟<br/>综合热度均值：' + fmt(b.meanHeat, 1) +
        '<br/>中位数：' + fmt(b.medianHeat, 1) + '<br/>剧数：' + b.count + ' 部';
    }},
    grid: { left: 50, right: 30, top: 30, bottom: 30 },
    xAxis: { type: 'category', data: names },
    yAxis: { type: 'value', name: '综合热度均值', min: 0 },
    series: [{
      type: 'bar',
      data: bins.map(b => ({ value: +b.meanHeat.toFixed(1), itemStyle: { color: b.bin === '中' ? COLORS.pos : (b.bin === '高' ? COLORS.neutral : COLORS.neg) } })),
      barMaxWidth: 54,
      label: { show: true, position: 'top', formatter: p => fmt(p.value, 1), fontWeight: 700 },
      markLine: { silent: true, symbol: 'none', lineStyle: { type: 'dashed', color: COLORS.neg }, label: { formatter: '低 27.8', position: 'start', fontSize: 10 } },
    }],
    graphic: [{
      type: 'text', left: 'center', top: 2,
      style: { text: '中档 33.4 · 适度最优', fill: COLORS.pos, fontSize: 12, fontWeight: 700 },
    }],
  });
}

/* 箱线图工厂（附剧集散点，点击可跳详情） */
function renderBoxplot(id, groupKey, valueKey, valueName, valueDec) {
  const c = chart(id); if (!c) return;
  const ds = S.filtered;
  const groups = ['契约婚姻', '身份错位', '豪门CEO', '复仇逆袭', '重生穿越', '其他'];
  const labels = [];
  const boxes = [];
  const counts = [];
  groups.forEach(g => {
    const arr = ds.filter(d => d[groupKey] === g && d[valueKey] !== null).map(d => d[valueKey]);
    if (arr.length) { labels.push(g); boxes.push(box5(arr)); counts.push(arr.length); }
  });
  const scatterData = [];
  labels.forEach((g, li) => {
    ds.filter(d => d[groupKey] === g && d[valueKey] !== null).forEach(d => {
      scatterData.push({ value: [li, d[valueKey]], vid: d.vid, name: d.name, rank: d.rank });
    });
  });
  if (!boxes.length) { c.setOption(emptyOption('暂无数据'), true); return; }
  c.setOption({
    tooltip: { trigger: 'item', formatter: p => {
      if (p.seriesType === 'scatter') {
        return '<b>' + p.data.name + '</b>（排名 ' + p.data.rank + '）<br/>' + valueName + '：' + fmt(p.data.value[1], valueDec) + '<br/><i>点击查看详情</i>';
      }
      const b = boxes[p.dataIndex];
      return labels[p.dataIndex] + '<br/>样本 n=' + counts[p.dataIndex] + '<br/>最小值 ' + fmt(b[0], valueDec) + '<br/>Q1 ' + fmt(b[1], valueDec) +
        '<br/>中位数 ' + fmt(b[2], valueDec) + '<br/>Q3 ' + fmt(b[3], valueDec) + '<br/>最大值 ' + fmt(b[4], valueDec) +
        '<br/>单位：' + valueName;
    }},
    grid: { left: 55, right: 20, top: 20, bottom: 40 },
    xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', name: valueName, nameTextStyle: { fontSize: 11 }, scale: true },
    series: [
      {
        type: 'boxplot', data: boxes,
        itemStyle: { color: '#fff', borderColor: COLORS.neutral, borderWidth: 1.6 },
        boxWidth: [10, 20],
      },
      {
        type: 'scatter', name: '剧集', data: scatterData,
        symbolSize: 8, itemStyle: { color: COLORS.neutral, opacity: 0.5 }, z: 3,
      },
    ],
  });
  c.off('click');
  c.on('click', p => {
    if (p.seriesType === 'scatter' && p.data && p.data.vid) { selectDrama(p.data.vid, 'boxplot'); openDetail(p.data.vid); }
  });
}

/* 三维度排序表 */
function renderThreeDimTable() {
  const dims = S.data.threeDims;
  const head = ['维度', 'Spearman ρ', 'p', '高组中位', '低组中位', '均值差', '变化', 'Mann-Whitney p'];
  const rows = dims.map(d => {
    const chg = (d.highMean - d.lowMean) / d.lowMean * 100;
    return [
      d.dim, (d.rho > 0 ? '+' : '') + d.rho, fmt(d.p, 3),
      fmt(d.highMedian, d.unit === '次/分钟' ? 3 : 2), fmt(d.lowMedian, d.unit === '次/分钟' ? 3 : 2),
      '+' + fmt(d.highMean - d.lowMean, 2) + ' ' + d.unit, '+' + Math.round(chg) + '%', fmt(d.mwP, 3),
    ];
  });
  const el = document.getElementById('tbl_threedim');
  el.innerHTML = '<thead><tr>' + head.map(h => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' +
    rows.map(r => '<tr>' + r.map((c, i) => '<td class="' + (i === 0 ? 'name' : 'num') + '"' + (i === 1 && r[1].charAt(0) === '+' ? ' style="color:' + COLORS.pos + '"' : '') + '>' + c + '</td>').join('') + '</tr>').join('') +
    '</tbody>';
}

/* 图表 16：三维度高/低组均值并排柱 */
function renderThreeDimBar() {
  const c = chart('c_threedim_bar'); if (!c) return;
  const dims = S.data.threeDims;
  c.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => {
      const d = dims[p[0].dataIndex];
      return d.dim + '<br/>高组均值：' + fmt(d.highMean, 2) + ' ' + d.unit + '<br/>低组均值：' + fmt(d.lowMean, 2) + ' ' + d.unit +
        '<br/>变化：+' + fmt((d.highMean - d.lowMean) / d.lowMean * 100, 0) + '%<br/>ρ=' + (d.rho>0?'+':'') + d.rho + '，p=' + d.p;
    }},
    legend: { data: ['高热度组', '低热度组'], top: 0 },
    grid: { left: 55, right: 20, top: 36, bottom: 42 },
    xAxis: { type: 'category', data: dims.map(d => d.dim), axisLabel: { interval: 0, fontSize: 11 } },
    yAxis: { type: 'value', name: '均值' },
    series: [
      { name: '高热度组', type: 'bar', data: dims.map(d => ({ value: +d.highMean.toFixed(3), itemStyle: { color: COLORS.pos } })), barMaxWidth: 30,
        label: { show: true, position: 'top', fontSize: 10 } },
      { name: '低热度组', type: 'bar', data: dims.map(d => ({ value: +d.lowMean.toFixed(3), itemStyle: { color: COLORS.neg } })), barMaxWidth: 30,
        label: { show: true, position: 'top', formatter: p => { const d = dims[p.dataIndex]; return '+' + Math.round((d.highMean - d.lowMean) / d.lowMean * 100) + '%'; }, fontSize: 10, color: '#555' } },
    ],
  });
}

/* 图表 17：正反例雷达图（min-max 归一 0–100） */
function radarRanges() {
  const keys = ['conflictDensity', 'hookDensity', 'insultDensity'];
  const r = {};
  keys.forEach(k => {
    let mn = Infinity, mx = -Infinity;
    S.dramas.forEach(d => { const v = d[k]; if (v != null) { mn = Math.min(mn, v); mx = Math.max(mx, v); } });
    r[k] = [mn, mx];
  });
  return r;
}
function renderRadar() {
  const c = chart('c_radar'); if (!c) return;
  const rr = radarRanges();
  const norm = (k, v) => { const [mn, mx] = rr[k]; return mx === mn ? 50 : (v - mn) / (mx - mn) * 100; };
  const ex = S.data.examples;
  const make = (d, color, dimmed) => ({
    value: [norm('conflictDensity', d.conflictDensity), norm('hookDensity', d.hookDensity), norm('insultDensity', d.insultDensity)],
    name: d.label,
    lineStyle: { color: color, width: dimmed ? 1 : 2, opacity: dimmed ? 0.15 : 1 },
    itemStyle: { color: color },
    areaStyle: { color: color, opacity: dimmed ? 0.03 : 0.12 },
  });
  const sel = S.selectedVid;
  const mkSeries = d => {
    const dv = S.dramas.find(x => x.rank === d.rank);
    const dimmed = !!(sel && dv && dv.vid !== sel);
    return make(d, ex.positive.includes(d) ? COLORS.pos : COLORS.neg, dimmed);
  };
  c.setOption({
    tooltip: { trigger: 'item', formatter: p => {
      const d = ex.positive.concat(ex.negative)[p.dataIndex];
      return '<b>' + d.name + '</b><br/>冲突密度：' + fmt(d.conflictDensity, 2) + '<br/>强钩子事件密度：' + fmt(d.hookDensity, 2) +
        '<br/>侮辱/谎言/憎恨冲突密度：' + fmt(d.insultDensity, 2) + '<br/>综合热度：' + fmt(d.heat, 1);
    }},
    legend: { data: ['正面例子', '反面例子'], bottom: 0 },
    radar: {
      indicator: [
        { name: '冲突密度', max: 100 },
        { name: '强钩子事件密度', max: 100 },
        { name: '侮辱冲突密度', max: 100 },
      ],
      radius: '62%', splitNumber: 4,
    },
    series: [{
      type: 'radar',
      data: [
        ...ex.positive.map(d => mkSeries(d)),
        ...ex.negative.map(d => mkSeries(d)),
      ],
    }],
  });
  c.off('click');
  c.on('click', p => {
    const d = ex.positive.concat(ex.negative)[p.dataIndex];
    if (!d) return;
    const vid = d.vid || (S.dramas.find(x => x.rank === d.rank) && S.dramas.find(x => x.rank === d.rank).vid);
    if (vid) { selectDrama(vid, 'radar'); openDetail(vid); }
  });
}

/* ---------------- 明细表 ---------------- */
const TABLE_KEYS = [
  { key: 'rank', label: '排名' },
  { key: 'name', label: '剧名' },
  { key: 'heat', label: '综合热度', dec: 1 },
  { key: 'heatGroup', label: '热度分组' },
  { key: 'theme', label: '题材母题' },
  { key: 'structure', label: '叙事结构' },
  { key: 'conflictDensity', label: '冲突密度', dec: 2 },
  { key: 'conflictBin', label: '冲突分档' },
  { key: 'hookDensity', label: '强钩子密度', dec: 2 },
  { key: 'insultDensity', label: '侮辱冲突密度', dec: 2 },
  { key: 'twistDensity', label: '情节转折密度', dec: 2 },
  { key: 'speechRate', label: '语速', dec: 0 },
  { key: 'majorFreq', label: '大事件频率', dec: 2 },
];
const SORT_ACCESSOR = {
  rank: d => d.rank, name: d => d.name, heat: d => d.heat,
  heatGroup: d => ({ '高': 3, '中': 2, '低': 1 }[d._heatGroup]),
  theme: d => d.theme, structure: d => d.structure,
  conflictDensity: d => d.conflictDensity, conflictBin: d => ({ '高': 3, '中': 2, '低': 1 }[d._conflictBin]),
  hookDensity: d => d.hookDensity, insultDensity: d => d.insultDensity,
  twistDensity: d => d.twistDensity, speechRate: d => d.speechRate, majorFreq: d => d.majorFreq,
};
function renderTable() {
  const list = S.filtered.slice().sort((a, b) => {
    const va = SORT_ACCESSOR[S.sort.key](a), vb = SORT_ACCESSOR[S.sort.key](b);
    if (va < vb) return S.sort.dir === 'asc' ? -1 : 1;
    if (va > vb) return S.sort.dir === 'asc' ? 1 : -1;
    return 0;
  });
  const head = TABLE_KEYS.map(k => {
    const active = S.sort.key === k.key;
    return '<th data-key="' + k.key + '" class="' + (active ? (S.sort.dir === 'asc' ? 'sort-asc' : 'sort-desc') : '') + '">' + k.label + '</th>';
  }).join('');
  const cell = (k, d) => {
    switch (k.key) {
      case 'name': return '<td class="name">' + d.name + '</td>';
      case 'rank': return '<td class="num">' + d.rank + '</td>';
      case 'heatGroup': return '<td><span class="badge ' + (d._heatGroup === '高' ? 'h' : (d._heatGroup === '低' ? 'l' : 'm')) + '">' + d._heatGroup + '</span></td>';
      case 'conflictBin': return '<td><span class="badge ' + (d._conflictBin === '高' ? 'h' : (d._conflictBin === '低' ? 'l' : 'm')) + '">' + d._conflictBin + '</span></td>';
      case 'theme':
      case 'structure': return '<td>' + d[k.key] + '</td>';
      default: return '<td class="num">' + fmt(d[k.key], k.dec) + '</td>';
    }
  };
  const body = list.map(d => '<tr data-vid="' + d.vid + '" class="' + (d.vid === S.selectedVid ? 'selected' : '') + '">' +
    TABLE_KEYS.map(k => cell(k, d)).join('') + '</tr>').join('') || '<tr><td colspan="' + TABLE_KEYS.length + '" style="text-align:center;color:#9aa3b2">暂无数据</td></tr>';
  document.getElementById('tbl_main').innerHTML = '<thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody>';
  document.getElementById('tbl-count').textContent = '显示 ' + list.length + ' / 50 部';
}

/* ---------------- selection & linking ---------------- */
function selectDrama(vid, from) {
  S.selectedVid = (S.selectedVid === vid && from === 'table') ? null : vid;
  renderScatter('c_conflict_scatter', 'conflictDensity', '冲突密度(次/分钟)', 2);
  renderScatter('c_twist_scatter', 'twistDensity', '情节转折密度(次/分钟)', 2);
  renderScatter('c_major_scatter', 'majorFreq', '大事件频率(次/10分钟)', 2);
  renderRadar();
  renderTable();
  const row = document.querySelector('#tbl_main tbody tr.selected');
  if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function setSignalFilter(term) {
  if (S.filters.signal === term) { S.filters.signal = null; }
  else { S.filters.signal = term; }
  applyFilters();
}

/* ---------------- 详情弹窗 ---------------- */
function formatViews(v) {
  if (v === null || v === undefined) return '—';
  if (v >= 1e8) return (v / 1e8).toFixed(2) + ' 亿';
  if (v >= 1e4) return (v / 1e4).toFixed(1) + ' 万';
  return String(v);
}
function formatRate(x) { return (x === null || x === undefined) ? '—' : (x * 100).toFixed(2) + '%'; }

const DETAIL_GROUPS = [
  { title: '基本信息', items: [
    { k: '综合传播热度', fn: d => fmt(d.heat, 1), cls: d => d._heatGroup === '高' ? 'dv-pos' : (d._heatGroup === '低' ? 'dv-neg' : '') },
    { k: '热度分组', fn: d => d._heatGroup },
    { k: '排名', fn: d => d.rank },
    { k: '频道', fn: d => d.channel || '—' },
    { k: '语言', fn: d => d.lang || '—' },
    { k: '发布时间', fn: d => d.pubDate || '—' },
    { k: '片长', fn: d => d.duration },
    { k: '视频 ID', fn: d => d.vid },
  ]},
  { title: '传播热度', items: [
    { k: '播放量', fn: d => formatViews(d.views) },
    { k: '点赞数', fn: d => fmtInt(d.likes) },
    { k: '评论数', fn: d => fmtInt(d.comments) },
    { k: '点赞率', fn: d => formatRate(d.likeRate) },
    { k: '评论率', fn: d => formatRate(d.commentRate) },
    { k: 'Google Trends 热度', fn: d => fmt(d.trend, 4) },
  ]},
  { title: '题材与结构', items: [
    { k: '题材母题', fn: d => d.theme },
    { k: '叙事结构', fn: d => d.structure },
    { k: '冲突密度分档', fn: d => d._conflictBin },
  ]},
  { title: '关键编剧特征', items: [
    { k: '冲突密度', fn: d => fmt(d.conflictDensity, 3) + ' 次/分钟' },
    { k: '冲突事件数', fn: d => d.conflictEvents + ' 次' },
    { k: '情节转折密度', fn: d => fmt(d.twistDensity, 2) + ' 次/分钟' },
    { k: '强钩子事件密度', fn: d => fmt(d.hookDensity, 2) + ' 次/10分钟' },
    { k: '侮辱/谎言/憎恨冲突密度', fn: d => fmt(d.insultDensity, 2) + ' 次/10分钟' },
    { k: '语速', fn: d => d.speechRate + ' 词/分钟' },
    { k: '大事件频率', fn: d => fmt(d.majorFreq, 2) + ' 次/10分钟' },
    { k: '剪辑节奏', fn: d => fmt(d.cutFreq, 2) + ' 次/秒' },
    { k: '主要人物数', fn: d => d.mainChars + ' 人' },
    { k: '对话密度', fn: d => pct(d.dialogue, 1) },
    { k: '偶然事件频率', fn: d => fmt(d.chanceFreq, 3) + ' 次/10分钟' },
    { k: '叙事缺陷数量', fn: d => d.flaws + ' 个' },
  ]},
];

function buildDetail(d) {
  const yt = d.vid ? ('https://www.youtube.com/watch?v=' + encodeURIComponent(d.vid)) : null;
  const groups = DETAIL_GROUPS.map(g => {
    const items = g.items.map(it => {
      const val = it.fn(d);
      const cls = (it.cls && it.cls(d)) || '';
      return '<div class="detail-item"><span class="dk">' + it.k + '</span><span class="dv ' + cls + '">' + val + '</span></div>';
    }).join('');
    return '<div class="detail-section"><h4>' + g.title + '</h4><div class="detail-grid">' + items + '</div></div>';
  }).join('');
  const tags = (d.words && d.words.length)
    ? '<div class="detail-section"><h4>命中信号词（启发式词库）</h4><div class="detail-tags">' + d.words.map(w => '<span class="tag">' + w + '</span>').join('') + '</div></div>'
    : '';
  const ytBtn = yt
    ? '<a class="btn-yt" href="' + yt + '" target="_blank" rel="noopener">▶ 去 YouTube 看原片</a>'
    : '';
  return '<div class="detail-hero"><span class="dh-title">' + d.name + '</span><span class="dh-rank">R' + d.rank + ' · ' + d.theme + ' · ' + d.structure + '</span></div>' +
    '<div class="detail-actions">' + ytBtn + '<button class="btn-close-detail" data-close-detail>关闭</button></div>' +
    groups + tags;
}

function openDetail(vid) {
  const d = S.dramas.find(x => x.vid === vid);
  if (!d) return;
  document.getElementById('detail-title').textContent = d.name;
  document.getElementById('detail-body').innerHTML = buildDetail(d);
  document.getElementById('detail-modal').hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeDetail() {
  document.getElementById('detail-modal').hidden = true;
  document.body.style.overflow = '';
}

/* ---------------- 时空分布与剧集档案 ---------------- */
function getMonths() {
  const ms = new Set();
  S.dramas.forEach(d => { if (d.pubMonth) ms.add(d.pubMonth); });
  return [...ms].sort();
}
function setupFilter() {
  const months = getMonths();
  const startEl = document.getElementById('f-month-start');
  const endEl = document.getElementById('f-month-end');
  if (!startEl || !endEl || !months.length) return;
  startEl.innerHTML = months.map(m => '<option value="' + m + '">' + m + '</option>').join('');
  endEl.innerHTML = months.map(m => '<option value="' + m + '">' + m + '</option>').join('');
  S.filters.start = months[0];
  S.filters.end = months[months.length - 1];
  startEl.value = S.filters.start;
  endEl.value = S.filters.end;
}
function renderTimeTrend() {
  const c = chart('c_time_trend'); if (!c) return;
  const data = getFiltered();
  const months = getMonths().filter(m => m >= S.filters.start && m <= S.filters.end);
  const grp = ['高', '中', '低'];
  const colors = { '高': COLORS.pos, '中': COLORS.neutral, '低': COLORS.neg };
  const series = grp.map(g => ({
    name: g + '热度', type: 'line', smooth: true,
    data: months.map(m => data.filter(d => d.pubMonth === m && d._heatGroup === g).length),
    itemStyle: { color: colors[g] }, symbolSize: 6,
  }));
  c.setOption({
    tooltip: { trigger: 'axis', formatter: p => {
      let html = p[0].name, tot = 0;
      p.forEach(pp => { tot += pp.value; html += '<br/>' + pp.marker + pp.seriesName + '：' + pp.value + ' 部'; });
      return html + '<br/>合计：' + tot + ' 部';
    }},
    legend: { data: series.map(s => s.name), top: 0 },
    grid: { left: 42, right: 20, top: 40, bottom: 46 },
    xAxis: { type: 'category', data: months, name: '发布时间(月)', nameLocation: 'middle', nameGap: 30, axisLabel: { rotate: 45, fontSize: 11 } },
    yAxis: { type: 'value', name: '剧集数', minInterval: 1 },
    series,
  });
}
function renderLangCompare() {
  const c = chart('c_lang_compare'); if (!c) return;
  const data = getFiltered();
  const langs = ['英文', '中文'];
  const sub = l => data.filter(d => d.lang === l);
  const mean = (arr, key) => arr.length ? arr.reduce((s, d) => s + d[key], 0) / arr.length : 0;
  const heatAvg = langs.map(l => +mean(sub(l), 'heat').toFixed(1));
  const likesAvg = langs.map(l => Math.round(mean(sub(l), 'likes')));
  const counts = langs.map(l => sub(l).length);
  c.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => {
      const i = p[0].dataIndex;
      return langs[i] + '（' + counts[i] + ' 部）<br/>平均综合热度：' + fmt(heatAvg[i], 1) +
        '<br/>平均点赞数：' + fmtInt(likesAvg[i]) + '<br/><i>点击柱子筛选该语言</i>';
    }},
    legend: { data: ['平均综合热度', '平均点赞数'], top: 0 },
    grid: { left: 46, right: 52, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: langs },
    yAxis: [
      { type: 'value', name: '平均综合热度' },
      { type: 'value', name: '平均点赞数', axisLabel: { formatter: v => v >= 1e4 ? (v / 1e4) + '万' : v } },
    ],
    series: [
      { name: '平均综合热度', type: 'bar', data: heatAvg, itemStyle: { color: COLORS.pos }, barMaxWidth: 46, label: { show: true, position: 'top', formatter: p => fmt(p.value, 1) } },
      { name: '平均点赞数', type: 'bar', yAxisIndex: 1, data: likesAvg, itemStyle: { color: COLORS.neutral }, barMaxWidth: 46, label: { show: true, position: 'top', formatter: p => fmtInt(p.value) } },
    ],
  });
  c.off('click');
  c.on('click', p => {
    if (p.seriesType !== 'bar') return;
    const lang = p.name;
    if (S.filters.langs.length === 1 && S.filters.langs[0] === lang) {
      S.filters.langs = ['英文', '中文'];
    } else {
      S.filters.langs = [lang];
    }
    document.querySelectorAll('.f-lang').forEach(cb => { cb.checked = S.filters.langs.indexOf(cb.value) >= 0; });
    applyFilters();
  });
}
const ARCHIVE_KEYS = [
  { key: 'rank', label: '排名' },
  { key: 'name', label: '剧名' },
  { key: 'channel', label: '频道' },
  { key: 'lang', label: '语言' },
  { key: 'pubDate', label: '发布时间' },
  { key: 'likes', label: '点赞数' },
  { key: 'comments', label: '评论数' },
  { key: 'heat', label: '综合热度' },
  { key: 'heatGroup', label: '热度分组' },
];
const ARCHIVE_SORT = {
  rank: d => d.rank, name: d => d.name, channel: d => d.channel || '',
  lang: d => d.lang || '', pubDate: d => d.pubDate || '',
  likes: d => d.likes || 0, comments: d => d.comments || 0,
  heat: d => d.heat, heatGroup: d => ({ '高': 3, '中': 2, '低': 1 }[d._heatGroup]),
};
function renderArchiveTable() {
  const el = document.getElementById('tbl_archive'); if (!el) return;
  const list = getFiltered().slice().sort((a, b) => {
    const va = ARCHIVE_SORT[S.archSort.key](a), vb = ARCHIVE_SORT[S.archSort.key](b);
    if (va < vb) return S.archSort.dir === 'asc' ? -1 : 1;
    if (va > vb) return S.archSort.dir === 'asc' ? 1 : -1;
    return 0;
  });
  const head = ARCHIVE_KEYS.map(k => {
    const active = S.archSort.key === k.key;
    return '<th data-key="' + k.key + '" class="' + (active ? (S.archSort.dir === 'asc' ? 'sort-asc' : 'sort-desc') : '') + '">' + k.label + '</th>';
  }).join('');
  const cell = (k, d) => {
    switch (k.key) {
      case 'name': return '<td class="name">' + d.name + '</td>';
      case 'rank': return '<td class="num">' + d.rank + '</td>';
      case 'heatGroup': return '<td><span class="badge ' + (d._heatGroup === '高' ? 'h' : (d._heatGroup === '低' ? 'l' : 'm')) + '">' + d._heatGroup + '</span></td>';
      case 'likes': return '<td class="num">' + fmtInt(d.likes) + '</td>';
      case 'comments': return '<td class="num">' + fmtInt(d.comments) + '</td>';
      case 'heat': return '<td class="num">' + fmt(d.heat, 1) + '</td>';
      default: return '<td>' + (d[k.key] || '—') + '</td>';
    }
  };
  const body = list.map(d => '<tr data-vid="' + d.vid + '">' + ARCHIVE_KEYS.map(k => cell(k, d)).join('') + '</tr>').join('') ||
    '<tr><td colspan="' + ARCHIVE_KEYS.length + '" style="text-align:center;color:#9aa3b2">暂无数据</td></tr>';
  el.innerHTML = '<thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody>';
  const countEl = document.getElementById('arch-count');
  if (countEl) countEl.textContent = '显示 ' + list.length + ' / ' + S.dramas.length + ' 部';
}
function renderArchiveModule() {
  renderTimeTrend();
  renderLangCompare();
  renderArchiveTable();
}
function bindFilterControls() {
  const apply = () => { applyFilters(); };
  ['f-month-start', 'f-month-end', 'f-heat'].forEach(id => document.getElementById(id).addEventListener('change', apply));
  document.querySelectorAll('.f-lang').forEach(c => c.addEventListener('change', apply));
  document.getElementById('f-kw').addEventListener('input', apply);
  document.getElementById('f-apply').addEventListener('click', apply);
  document.getElementById('f-reset').addEventListener('click', resetFilters);
  document.getElementById('tbl_archive').addEventListener('click', e => {
    const th = e.target.closest('th'); const tr = e.target.closest('tr[data-vid]');
    if (th && th.dataset.key) {
      const key = th.dataset.key;
      if (S.archSort.key === key) S.archSort.dir = (S.archSort.dir === 'asc' ? 'desc' : 'asc');
      else { S.archSort.key = key; S.archSort.dir = 'asc'; }
      renderArchiveTable();
    } else if (tr) {
      openDetail(tr.dataset.vid);
    }
  });
}

/* ---------------- filter UI ---------------- */
function readFilterUI() {
  const f = S.filters;
  let s = document.getElementById('f-month-start').value;
  let e = document.getElementById('f-month-end').value;
  if (s && e && s > e) {
    const t = s; s = e; e = t;
    document.getElementById('f-month-start').value = s;
    document.getElementById('f-month-end').value = e;
  }
  f.start = s; f.end = e;
  const langs = [...document.querySelectorAll('.f-lang:checked')].map(c => c.value);
  f.langs = langs.length ? langs : ['英文', '中文'];
  f.heat = document.getElementById('f-heat').value;
  f.kw = document.getElementById('f-kw').value.trim();
}
function resetFilters() {
  setupFilter();
  S.filters.heat = 'all';
  S.filters.kw = '';
  S.filters.signal = null;
  document.getElementById('f-heat').value = 'all';
  document.getElementById('f-kw').value = '';
  document.querySelectorAll('.f-lang').forEach(c => { c.checked = true; });
  applyFilters();
}
function applyFilters() {
  readFilterUI();
  S.filtered = getFiltered();
  renderLinkedData();
}

/* ---------------- render orchestrator ---------------- */
function renderAllStatic() {
  renderKPIs2();
  renderBinRank();
  renderSigWords();
  renderFeatRho();
  renderCorrHeat();
  renderThemeShare();
  renderStructShare();
  renderNumMean();
  renderThreeDimPct();
  renderWordChart('c_plot_words', S.data.plotTypeCorr, 'pregnant', 20);
  renderWordChart('c_conflict_words', S.data.conflictWordCorr, 'insult', 20);
  renderWordChart('c_major_words', S.data.majorEventCorr, 'reveal', 20);
  renderBinHeat();
  renderThreeDimTable();
  renderThreeDimBar();
}
function renderLinkedData() {
  renderKPIs();
  renderActiveFilters();
  renderScatter('c_conflict_scatter', 'conflictDensity', '冲突密度(次/分钟)', 2);
  renderScatter('c_twist_scatter', 'twistDensity', '情节转折密度(次/分钟)', 2);
  renderScatter('c_major_scatter', 'majorFreq', '大事件频率(次/10分钟)', 2);
  renderBoxplot('c_conflict_box', 'theme', 'conflictDensity', '次/分钟', 2);
  renderBoxplot('c_theme_heat_box', 'theme', 'heat', '综合传播热度', 1);
  renderRadar();
  renderTable();
  renderArchiveModule();
}

/* ---------------- nav ---------------- */
function buildNav() {
  const items = [
    ['m1', '筛选与档案'], ['m2', '核心结论'], ['m3', '特征相关性'], ['m4', '高/低组对比'],
    ['m5', '信号词'], ['m6', '冲突密度'], ['m7', '三维度'], ['m8', '明细表'], ['m9', '口径与局限'],
  ];
  document.getElementById('nav').innerHTML = items.map(it => '<a href="#' + it[0] + '">' + it[1] + '</a>').join('');
}

/* ---------------- init ---------------- */
function waitEcharts(timeoutMs) {
  return new Promise(resolve => {
    if (typeof echarts !== 'undefined') { resolve(true); return; }
    const start = Date.now();
    const timer = setInterval(() => {
      if (typeof echarts !== 'undefined') { clearInterval(timer); resolve(true); return; }
      if (Date.now() - start >= timeoutMs) { clearInterval(timer); resolve(false); }
    }, 200);
  });
}

async function init() {
  buildNav();
  bindControls();

  S.data = await dataAdapter.load();
  S.dramas = S.data.dramas;
  computeGroups();
  setupFilter();          // 填充时间下拉并设置全范围
  S.filtered = getFiltered();

  document.getElementById('ds-src').textContent = (dataAdapter.source === 'real' ? '真实数据（data/*.csv）' : '内置示例数据');
  console.log('[data] 当前使用：' + (dataAdapter.source === 'real' ? '真实数据' : '内置示例数据') +
    '，样本 n=' + S.dramas.length);

  // 先渲染不依赖 ECharts 的部分（指标卡、明细表、档案表），保证图表库缺失时页面也不空白
  renderKPIs();
  renderKPIs2();
  renderActiveFilters();
  renderThreeDimTable();
  renderTable();
  renderArchiveTable();

  bindFilterControls();

  const ok = await waitEcharts(15000);
  if (ok) {
    renderAllStatic();
    renderLinkedData();
    window.addEventListener('resize', () => { Object.keys(S.charts).forEach(id => S.charts[id] && S.charts[id].resize()); });
  } else {
    const msg = 'ECharts 加载失败：请确认 echarts.min.js 与 index.html 在同一目录，或联网后刷新。';
    document.body.insertAdjacentHTML('afterbegin', '<div style="background:#fdece9;color:#a13324;padding:12px 20px;font-size:14px;">' + msg + '</div>');
    console.warn(msg);
  }
}

function bindControls() {
  // 明细表：表头排序 + 行点击联动高亮
  document.getElementById('tbl_main').addEventListener('click', e => {
    const th = e.target.closest('th'); const tr = e.target.closest('tr[data-vid]');
    if (th && th.dataset.key) {
      const key = th.dataset.key;
      if (S.sort.key === key) S.sort.dir = (S.sort.dir === 'asc' ? 'desc' : 'asc');
      else S.sort = { key, dir: 'asc' };
      renderTable();
    } else if (tr) {
      selectDrama(tr.dataset.vid, 'table');
      openDetail(tr.dataset.vid);
    }
  });

  // 详情弹窗关闭：× 按钮 / 点击遮罩 / 弹窗内「关闭」按钮 / ESC
  document.getElementById('detail-close').addEventListener('click', closeDetail);
  document.getElementById('detail-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('detail-modal') || e.target.closest('[data-close-detail]')) closeDetail();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDetail(); });
}

document.addEventListener('DOMContentLoaded', init);