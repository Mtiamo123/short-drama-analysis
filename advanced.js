/* ============================================================
 * 短剧分析报告 1.7 · 新增板块渲染层
 * 依赖：ECharts 5（CDN 或本地）+ index.html 中的新模块容器
 * 数据：内嵌（与 summary/*.csv 一致），离线可用
 * 说明：观测性统计，非因果结论；样本 n=50
 * ============================================================ */
'use strict';

(function () {
  var POS = '#e6533c', NEG = '#2c7be5', MID = '#5b8ff9';

  /* ---------------- 内嵌数据 ---------------- */
  // t-SNE/PCA 二维坐标：rank, 剧名, 热度, tsne_x, tsne_y, pca_x, pca_y
  var LATENT = [
    [6, "The Underdogs’ Elite Disciple", 60.909, -10.992482, -11.499481, 0.24080697, -0.01270369],
    [1, "From Fat Bride to Mafia Queen", 59.945, 9.7072, -3.245589, -0.16422552, 0.4291734],
    [3, "爱意已微凉", 50.603, -5.3855953, -1.3056115, -0.03053031, 0.028993146],
    [49, "boys over flowers", 50.241, -2.9260619, 9.88749, -0.17125382, -0.13455033],
    [15, "The Gossip in My Head Is No Secret", 47.781, 19.371408, 5.4304333, -0.07205126, 0.0315816],
    [24, "I Foresee My Family’s Doom", 47.083, -19.47211, 1.3827118, 0.34020802, -0.075600035],
    [2, "Wrong Marriage Endless Love ＆ Spoiling", 46.6, 0.76059246, -15.167231, -0.13062565, 0.26442036],
    [20, "Wait, My Abandoned Wife Is the Billionaire's Girl?", 46.233, -1.8824494, 22.891026, -0.114576556, -0.22590217],
    [7, "Faking It with the Hockey Captain", 45.981, -0.47836226, 11.010089, -0.12163139, -0.19519459],
    [4, "Reclaiming Her World", 43.826, 19.1507, -7.3464084, -0.051563982, 0.38556612],
    [22, "The Queen, The Quints & His Regret", 42.781, 1.1702054, 22.577465, -0.15766464, -0.28579944],
    [13, "After Divorce, My Ex-Wife Became a Billionaire", 42.144, 16.633802, -7.3812213, -0.1386282, 0.36330363],
    [21, "One Night, One Son, One Secret", 41.719, -15.050086, -6.3367534, 0.21551639, 0.0020717634],
    [34, "Married to My Ruthless Tycoon", 41.536, 17.600487, 15.048395, -0.013433013, 0.0042013386],
    [25, "True Luna", 38.707, 13.028195, 8.780199, -0.07315758, -0.3974657],
    [12, "The Baby He Never Knew", 37.962, -9.047203, -1.7618713, 0.13786487, 0.12014712],
    [8, "A Heart Lost to Desire", 37.678, 6.9959917, 20.599405, -0.17087698, -0.31656376],
    [5, "He Married The Wrong Woman", 37.316, -0.64886403, -2.7222478, -0.07646996, 0.05994219],
    [26, "Spring for You", 37.087, 0.9159909, 1.5497354, 0.046325997, -0.13675709],
    [44, "The Billionaire Check-in System", 36.186, 23.438122, -3.143723, 0.014499768, 0.30535367],
    [11, "Grab Your Love", 35.853, -9.380011, -13.272178, 0.36737165, 0.08211319],
    [27, "Dumped at Registry, I Married a Heiress", 35.015, -2.242508, -10.110111, 0.23003522, 0.51592493],
    [37, "New Life, New Mate", 31.8, 11.540296, 11.2257395, -0.18917082, -0.3880671],
    [14, "See You Never, My Dear Ex!", 31.101, 19.433182, -1.6375695, -0.08110357, 0.35476202],
    [9, "The CEO's Fake Wife", 30.032, 4.398392, -11.946626, -0.016861573, 0.12849902],
    [19, "Too Late, My Rejected Mate", 29.169, 12.889454, 14.89545, -0.19880441, -0.31977615],
    [10, "accidentally brought a CEO home", 27.47, 17.705738, 0.045808386, -0.10736493, 0.21323152],
    [16, "You Bullied the Wrong Woman", 27.27, 10.621013, -12.129505, -0.23159565, 0.082361266],
    [31, "Shotgun Wedding with My Boss", 27.1, 10.936335, -14.778007, -0.25857568, 0.0082814],
    [41, "The Real Heiress’s Revenge", 26.393, -5.7450213, 19.074013, -0.05064984, -0.23251335],
    [33, "When Fog Falls, Love Fades", 26.352, -0.6874829, 18.160946, -0.028043592, -0.3015321],
    [32, "You Fired A Genius Surgeon", 24.288, -1.7063566, 25.585028, -0.109423846, -0.13217656],
    [17, "新婚有瘾", 24.282, 3.748721, -6.542005, -0.19093046, 0.22659245],
    [29, "Beggar's Promise, Heiress's Fate", 23.903, 5.781001, 10.289181, 0.010408951, -0.09448228],
    [38, "偷尝半口甜", 23.747, -23.40088, 1.8316005, 0.74959165, -0.18217877],
    [23, "From His Tutor to His Darling", 23.213, 5.019549, 13.044207, -0.06813507, -0.25245258],
    [30, "My Poor Billionaire Wife", 21.937, 10.054038, -8.422261, -0.29013065, 0.21663842],
    [46, "Mafia Don’s Contract Bride", 20.142, 6.3572364, -5.1384273, -0.21315566, 0.1742921],
    [48, "刺骨春夜：他的心尖寵老婆太甜！", 19.196, -13.02613, -3.521703, 0.20883025, 0.048332375],
    [18, "Wrong Table, Right Love", 18.775, -27.175926, 0.7239798, 0.7309304, -0.019683946],
    [50, "The Mafia's Stolen Bride: Twin Switch", 17.909, 22.960426, 10.843133, -0.008003407, 0.004940486],
    [42, "暖心大叔療癒隱婚", 16.974, -26.292614, 2.9485455, 0.70319587, -0.09158519],
    [35, "Cheer Up, Baby!", 15.499, 3.1789641, 15.776075, -0.10390308, -0.33063143],
    [39, "The Billionaire’s Beggar Test", 15.332, -11.457037, -5.5573072, 0.12188088, 0.13376282],
    [40, "The Playboy Who Only Vows to Her", 13.048, 1.9753135, -9.403394, -0.12645988, 0.31057486],
    [28, "Kissing the Wrong Brother", 12.782, 11.61708, 22.857803, -0.1661516, -0.1373346],
    [43, "Reborn Heiress: Total Takeover", 12.212, 18.104063, 8.392282, -0.043564994, -0.16623634],
    [36, "The Eighth Year of Secretly Loving Mr. He", 11.649, 1.7902651, -1.9362975, -0.116648756, 0.14398612],
    [47, "Nero: Made Men", 11.46, 7.7084637, 15.009792, -0.23469241, -0.23001817],
    [45, "When Love Fades Away", 8.861, -16.042831, 0.76741827, 0.20259166, 0.020158196]
  ];

  // 稳健性检验：三种方式两两 Spearman
  var ROBUSTNESS = [
    { a: '复合加权 vs 纯播放量', rho: 0.6449, p: '4.3e-07' },
    { a: '复合加权 vs 熵值法', rho: 0.8167, p: '4.8e-13' },
    { a: '纯播放量 vs 熵值法', rho: 0.5436, p: '4.5e-05' }
  ];

  // 有效分析：p<0.10 的少数显著信号（按 p 升序）
  var SIG = [
    { f: '情感价值感知评分', rho: 0.356, p: 0.011, s: 1 },
    { f: 'insult（侮辱）', rho: 0.343, p: 0.015, s: 1 },
    { f: 'pregnant（生子）', rho: 0.304, p: 0.032, s: 1 },
    { f: '情感共同体构建评分', rho: 0.286, p: 0.044, s: 1 },
    { f: 'reveal（揭露/被揭穿）', rho: -0.293, p: 0.039, s: 1 },
    { f: 'lying（说谎）', rho: 0.276, p: 0.052, s: 0 },
    { f: 'cheat（背叛）', rho: 0.276, p: 0.052, s: 0 },
    { f: 'hate（憎恨）', rho: 0.269, p: 0.059, s: 0 },
    { f: '情节转折密度', rho: 0.266, p: 0.062, s: 0 },
    { f: 'shut up（呵斥）', rho: 0.252, p: 0.078, s: 0 },
    { f: "it's over（关系结束）", rho: -0.250, p: 0.081, s: 0 }
  ];

  // 随机森林 vs XGBoost 特征重要性（排序后取前 10）
  var RFXGB = [
    { f: '情感价值感知评分', rf: 0.3214, xgb: 0.1895, rfR: 1, xgbR: 1 },
    { f: '情节转折密度', rf: 0.1287, xgb: 0.0900, rfR: 2, xgbR: 5 },
    { f: '剪辑节奏', rf: 0.0967, xgb: 0.1170, rfR: 3, xgbR: 3 },
    { f: '情感共同体构建评分', rf: 0.0903, xgb: 0.0751, rfR: 4, xgbR: 6 },
    { f: '大事件频率', rf: 0.0723, xgb: 0.0918, rfR: 5, xgbR: 4 },
    { f: '冲突密度', rf: 0.0662, xgb: 0.0380, rfR: 6, xgbR: 11 },
    { f: '偶然事件频率', rf: 0.0658, xgb: 0.0537, rfR: 7, xgbR: 8 },
    { f: '对话密度', rf: 0.0473, xgb: 0.1202, rfR: 8, xgbR: 2 },
    { f: '冲突事件数', rf: 0.0308, xgb: 0.0490, rfR: 9, xgbR: 9 },
    { f: '偶然事件数', rf: 0.0256, xgb: 0.0252, rfR: 10, xgbR: 13 }
  ];

  // 互斥维度（1.5 修正）：正例 R2/R7/R22，反例 R18/R42/R45
  var VALID_DIMS = [
    { rank: 2, g: 'pos', name: 'Wrong Marriage Endless Love ＆ Spoiling', A: 4.5328, B: 5.4871, C: 4.0557 },
    { rank: 7, g: 'pos', name: 'Faking It with the Hockey Captain', A: 4.3674, B: 4.1594, C: 3.6395 },
    { rank: 22, g: 'pos', name: 'The Queen, The Quints & His Regret', A: 3.5629, B: 4.6880, C: 3.8754 },
    { rank: 18, g: 'neg', name: 'Wrong Table, Right Love', A: 0.0, B: 0.0, C: 0.0 },
    { rank: 42, g: 'neg', name: '暖心大叔療癒隱婚', A: 0.0, B: 0.0, C: 0.0 },
    { rank: 45, g: 'neg', name: 'When Love Fades Away', A: 0.0074, B: 0.0, C: 0.0 }
  ];

  // 评论关键词对比（每万词频次：热播组 vs 冷剧组）
  var KEYWORDS = [
    { k: '剧情·故事', h: 189.21, c: 152.33, r: 1.24 },
    { k: '结局·结尾', h: 39.98, c: 28.12, r: 1.42 },
    { k: '反转·转折', h: 9.57, c: 0.0, r: null },
    { k: '编剧·剧本', h: 10.7, c: 9.37, r: 1.14 },
    { k: '逻辑', h: 1.69, c: 2.34, r: 0.72 },
    { k: '角色·人物', h: 42.8, c: 203.89, r: 0.21 },
    { k: '无聊', h: 0.56, c: 4.69, r: 0.12 },
    { k: '喜爱·发糖', h: 271.99, c: 182.8, r: 1.49 },
    { k: '厌恶·恨', h: 16.89, c: 23.44, r: 0.72 },
    { k: '演员·演技', h: 92.35, c: 51.56, r: 1.79 }
  ];

  /* ---------------- helpers ---------------- */
  function $(id) { return document.getElementById(id); }
  function chart(id) {
    if (typeof echarts === 'undefined') return null;
    var el = $(id);
    if (!el) return null;
    var c = echarts.getInstanceByDom(el);
    if (!c) c = echarts.init(el);
    return c;
  }
  function fmt(x, d) {
    if (x === null || x === undefined) return '—';
    if (typeof x === 'number') return isFinite(x) ? (+x.toFixed(d == null ? 2 : d)).toString() : '—';
    return String(x);
  }
  function waitEcharts(timeoutMs) {
    return new Promise(function (resolve) {
      if (typeof echarts !== 'undefined') { resolve(true); return; }
      var start = Date.now();
      var t = setInterval(function () {
        if (typeof echarts !== 'undefined') { clearInterval(t); resolve(true); return; }
        if (Date.now() - start >= timeoutMs) { clearInterval(t); resolve(false); }
      }, 200);
    });
  }

  /* ---------------- 稳健性检验 ---------------- */
  function renderRobustness() {
    var c = chart('c_robust'); if (!c) return;
    var rows = ROBUSTNESS.slice().sort(function (a, b) { return b.rho - a.rho; });
    c.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: function (p) {
        var d = rows[p[0].dataIndex];
        return d.a + '<br/>Spearman ρ = ' + fmt(d.rho, 3) + '<br/>p = ' + d.p;
      } },
      grid: { left: 30, right: 30, top: 30, bottom: 70 },
      xAxis: { type: 'category', data: rows.map(function (r) { return r.a; }), axisLabel: { fontSize: 11, interval: 0 } },
      yAxis: { type: 'value', min: 0.4, max: 0.9, name: 'Spearman ρ' },
      series: [{
        type: 'bar', barMaxWidth: 60,
        data: rows.map(function (r) { return { value: +r.rho.toFixed(3), itemStyle: { color: MID, borderRadius: [6, 6, 0, 0] } }; }),
        label: { show: true, position: 'top', fontSize: 12, fontWeight: 700, formatter: function (p) { return rows[p.dataIndex].rho.toFixed(3); } },
        markLine: { silent: true, symbol: 'none', lineStyle: { color: '#c7d0df', type: 'dashed' }, data: [{ yAxis: 0.5, label: { formatter: '中等相关分界 ρ=0.5', color: '#7a8494', fontSize: 10 } }] }
      }]
    });
  }

  /* ---------------- 有效分析：p<0.10 信号 ---------------- */
  function renderSigSignals() {
    var c = chart('c_sig_full'); if (!c) return;
    var rows = SIG.slice().sort(function (a, b) { return a.rho - b.rho; });
    c.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: function (p) {
        var d = rows[p[0].dataIndex];
        return '<b>' + d.f + '</b><br/>Spearman ρ = ' + (d.rho > 0 ? '+' : '') + d.rho + '<br/>p = ' + d.p +
          (d.s ? '（<span style="color:#e6533c">显著 p&lt;0.05</span>）' : '（边缘显著 0.05≤p&lt;0.10）');
      } },
      grid: { left: 150, right: 40, top: 10, bottom: 30 },
      xAxis: { type: 'value', min: -0.4, max: 0.4, name: 'Spearman ρ', splitLine: { lineStyle: { type: 'dashed', color: '#eef0f5' } } },
      yAxis: { type: 'category', data: rows.map(function (r) { return r.f; }), axisLabel: { fontSize: 11 } },
      series: [{
        type: 'bar', barMaxWidth: 16,
        data: rows.map(function (r) {
          return { value: r.rho, itemStyle: { color: r.rho >= 0 ? POS : NEG, opacity: r.s ? 1 : 0.55, borderRadius: [0, 3, 3, 0] } };
        }),
        label: { show: true, position: 'right', fontSize: 10, color: '#7a8494', formatter: function (p) { var d = rows[p.dataIndex]; return (d.rho > 0 ? '+' : '') + d.rho.toFixed(2) + ' · p=' + d.p; } },
        markLine: { silent: true, symbol: 'none', lineStyle: { color: '#c7d0df', type: 'dashed' }, data: [{ xAxis: 0, label: { show: false } }] }
      }]
    });
  }

  /* ---------------- 随机森林 vs XGBoost ---------------- */
  function renderRfXgb() {
    var c = chart('c_rfxgb'); if (!c) return;
    var rows = RFXGB.slice().sort(function (a, b) { return b.rf - a.rf; });
    var names = rows.map(function (r) { return r.f; });
    c.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: function (p) {
        var d = rows[p[0].dataIndex];
        return '<b>' + d.f + '</b><br/>随机森林重要性 ' + fmt(d.rf, 3) + '（排名 RF#' + d.rfR + '）<br/>XGBoost重要性 ' + fmt(d.xgb, 3) + '（排名 XGB#' + d.xgbR + '）';
      } },
      legend: { data: ['随机森林', 'XGBoost'], top: 0 },
      grid: { left: 150, right: 40, top: 34, bottom: 30 },
      xAxis: { type: 'value', name: '特征重要性' },
      yAxis: { type: 'category', data: names, axisLabel: { fontSize: 11 } },
      series: [
        { name: '随机森林', type: 'bar', barMaxWidth: 10, data: rows.map(function (r) { return { value: +r.rf.toFixed(4), itemStyle: { color: MID } }; }) },
        { name: 'XGBoost', type: 'bar', barMaxWidth: 10, data: rows.map(function (r) { return { value: +r.xgb.toFixed(4), itemStyle: { color: '#8fb1f0' } }; }) }
      ]
    });
  }

  /* ---------------- 互斥维度：分组柱状图 ---------------- */
  function renderValidDimsBar() {
    var c = chart('c_valid_bar'); if (!c) return;
    var dims = ['A 情感关系转折钩子', 'B 负面言语冲突', 'C 悬疑动作冲突'];
    var pos = VALID_DIMS.filter(function (d) { return d.g === 'pos'; });
    var neg = VALID_DIMS.filter(function (d) { return d.g === 'neg'; });
    function series(name, arr, color, dimmed) {
      return {
        name: name, type: 'bar', barMaxWidth: 16,
        data: [
          arr.map(function (d) { return d.A; }),
          arr.map(function (d) { return d.B; }),
          arr.map(function (d) { return d.C; })
        ].flat(),
        itemStyle: { color: color, opacity: dimmed ? 0.4 : 1 }
      };
    }
    var ds = [];
    ds.push(series('R2 正例', [pos[0]], POS, false));
    ds.push(series('R7 正例', [pos[1]], POS, false));
    ds.push(series('R22 正例', [pos[2]], POS, false));
    ds.push(series('R18 反例', [neg[0]], NEG, false));
    ds.push(series('R42 反例', [neg[1]], NEG, false));
    ds.push(series('R45 反例', [neg[2]], NEG, false));
    c.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ds.map(function (s) { return s.name; }), top: 0, textStyle: { fontSize: 10 } },
      grid: { left: 40, right: 20, top: 40, bottom: 30 },
      xAxis: { type: 'category', data: dims, axisLabel: { fontSize: 10, interval: 0 } },
      yAxis: { type: 'value', name: '密度值' },
      series: ds
    });
  }

  /* ---------------- 互斥维度：平行坐标 ---------------- */
  function renderValidDimsParallel() {
    var c = chart('c_valid_parallel'); if (!c) return;
    var dimNames = ['A 情感转折钩子', 'B 负面言语冲突', 'C 悬疑动作冲突'];
    c.setOption({
      tooltip: { trigger: 'item', formatter: function (p) {
        var d = VALID_DIMS[p.dataIndex];
        return '<b>' + ('R' + d.rank + ' ' + d.name) + '</b>（' + (d.g === 'pos' ? '正例' : '反例') + '）<br/>A=' + fmt(d.A, 2) + '<br/>B=' + fmt(d.B, 2) + '<br/>C=' + fmt(d.C, 2);
      } },
      legend: { data: ['正例（高热度）', '反例（低热度）'], top: 0 },
      parallelAxis: [
        { dim: 0, name: dimNames[0], nameTextStyle: { fontSize: 10 } },
        { dim: 1, name: dimNames[1], nameTextStyle: { fontSize: 10 } },
        { dim: 2, name: dimNames[2], nameTextStyle: { fontSize: 10 } }
      ],
      parallel: { left: 40, right: 40, top: 46, bottom: 20 },
      series: [{
        type: 'parallel', lineStyle: { width: 2, opacity: 0.9 },
        data: VALID_DIMS.map(function (d) { return { value: [d.A, d.B, d.C], lineStyle: { color: d.g === 'pos' ? POS : NEG } }; })
      }]
    });
  }

  /* ---------------- 评论关键词对比 ---------------- */
  function renderKeywords() {
    var el = $('tbl_keywords'); if (!el) return;
    var rows = KEYWORDS.slice().sort(function (a, b) { return (b.r == null ? 0 : b.r) - (a.r == null ? 0 : a.r); });
    var maxH = Math.max.apply(null, KEYWORDS.map(function (k) { return Math.max(k.h, k.c); }));
    var html = '<thead><tr><th>概念</th><th>热播组/万词</th><th>冷剧组/万词</th><th>热/冷比</th><th>对比</th></tr></thead><tbody>';
    html += rows.map(function (r) {
      var ratio = r.r == null ? '—（冷组为 0）' : r.r.toFixed(2) + '×';
      var ratioCls = r.r == null ? '' : (r.r >= 1.2 ? ' style="color:' + POS + ';font-weight:700"' : (r.r <= 0.5 ? ' style="color:' + NEG + ';font-weight:700"' : ''));
      return '<tr>' +
        '<td class="name">' + r.k + '</td>' +
        '<td class="num">' + r.h.toFixed(1) + '</td>' +
        '<td class="num">' + r.c.toFixed(1) + '</td>' +
        '<td class="num" ' + ratioCls + '>' + ratio + '</td>' +
        '<td class="bar-cell"><div class="bar"><span style="width:' + (r.h / maxH * 100).toFixed(1) + '%;background:' + POS + '"></span></div><div class="bar" style="margin-top:2px"><span style="width:' + (r.c / maxH * 100).toFixed(1) + '%;background:' + NEG + '"></span></div></td>' +
        '</tr>';
    }).join('');
    html += '</tbody>';
    el.innerHTML = html;
  }

  /* ---------------- 高维语义空间：t-SNE / PCA 散点 ---------------- */
  var LATENT_MODE = 'tsne';
  function renderLatent() {
    var c = chart('c_latent'); if (!c) return;
    var isTsne = LATENT_MODE === 'tsne';
    var xi = isTsne ? 3 : 5, yi = isTsne ? 4 : 6;
    var data = LATENT.map(function (r) { return { rank: r[0], name: r[1], heat: r[2], v: [r[xi], r[yi], r[2]] }; });
    var heats = LATENT.map(function (r) { return r[2]; });
    var mn = Math.min.apply(null, heats), mx = Math.max.apply(null, heats);
    c.setOption({
      visualMap: {
        min: mn, max: mx, calculable: true, orient: 'vertical', right: 8, top: 40,
        dimension: 2, text: ['热度高', '热度低'], textStyle: { fontSize: 10 },
        inRange: { color: [NEG, '#8fb1f0', '#f3c25d', POS] }
      },
      tooltip: { trigger: 'item', formatter: function (p) {
        var d = data[p.dataIndex];
        return '<b>' + d.name + '</b><br/>排名 #' + d.rank + ' · 综合传播热度 ' + d.heat.toFixed(1) +
          '<br/>' + (isTsne ? 't-SNE' : 'PCA') + ' 坐标 (' + d.v[0].toFixed(2) + ', ' + d.v[1].toFixed(2) + ')';
      } },
      grid: { left: 50, right: 70, top: 30, bottom: 55 },
      xAxis: { type: 'value', name: (isTsne ? 't-SNE' : 'PCA') + ' 维度 1', nameLocation: 'middle', nameGap: 30, splitLine: { lineStyle: { color: '#eef0f5' } }, scale: true },
      yAxis: { type: 'value', name: (isTsne ? 't-SNE' : 'PCA') + ' 维度 2', nameLocation: 'middle', nameGap: 40, splitLine: { lineStyle: { color: '#eef0f5' } }, scale: true },
      series: [{
        type: 'scatter', data: data.map(function (d) { return d.v; }), symbolSize: 12,
        itemStyle: { borderColor: '#fff', borderWidth: 0.6 }
      }]
    }, true);
  }
  function bindLatentToggle() {
    var btns = document.querySelectorAll('[data-latent-mode]');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        LATENT_MODE = b.getAttribute('data-latent-mode');
        btns.forEach(function (x) { x.classList.toggle('active', x === b); });
        renderLatent();
      });
    });
  }

  /* ---------------- 图片灯箱 ---------------- */
  function bindLightbox() {
    var lb = $('lb-overlay'); if (!lb) return;
    var img = $('lb-img'), cap = $('lb-cap');
    document.querySelectorAll('[data-lightbox]').forEach(function (fig) {
      fig.addEventListener('click', function () {
        var i = fig.querySelector('img');
        if (!i) return;
        img.src = i.src;
        cap.textContent = i.getAttribute('alt') || '';
        lb.hidden = false;
        document.body.style.overflow = 'hidden';
      });
    });
    function close() { lb.hidden = true; document.body.style.overflow = ''; }
    $('lb-close').addEventListener('click', close);
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !lb.hidden) close(); });
  }

  /* ---------------- 入口 ---------------- */
  async function init() {
    renderKeywords();
    bindLatentToggle();
    bindLightbox();
    var ok = await waitEcharts(15000);
    if (!ok) {
      console.warn('[advanced] ECharts 未加载，语义空间/稳健性等图表无法渲染');
      return;
    }
    renderRobustness();
    renderSigSignals();
    renderRfXgb();
    renderValidDimsBar();
    renderValidDimsParallel();
    renderLatent();
    window.addEventListener('resize', function () {
      ['c_robust', 'c_sig_full', 'c_rfxgb', 'c_valid_bar', 'c_valid_parallel', 'c_latent'].forEach(function (id) {
        var c = chart(id); if (c) c.resize();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();