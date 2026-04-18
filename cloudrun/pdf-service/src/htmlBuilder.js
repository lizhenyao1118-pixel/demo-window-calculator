/**
 * htmlBuilder.js
 * sections（mapToSections 输出）→ HTML 字符串（供 Puppeteer 渲染为 PDF）
 * 版本：SPEC-P P1
 *
 * C1 修复：parameterNote.block3 "不建议放宽安全配置" → "降低安全配置将导致性能不达标"
 * C2 修复：封面导览文字 "第三章确认预算" → "第三章核查采购红线"
 * C3 修复：coreTension "应在报价中说明原因" → "报价中需包含相应说明"
 */

'use strict';

// ─── 颜色常量（与 pdfBuilder-v2 保持一致）─────────────────────
const C = {
  navy:       '#1A2E6B',
  blue:       '#2E86C1',
  mid:        '#34568B',
  red:        '#C0392B',
  red_bg:     '#FDECEA',
  orange:     '#E67E22',
  orange_bg:  '#FEF9E7',
  body:       '#2C3E50',
  secondary:  '#7F8C8D',
  light:      '#95A5A6',
  border:     '#CCCCCC',
  card:       '#EEF3FF',
  stripe:     '#F7F9FC',
  green:      '#155724',
  green_bg:   '#D4EDDA',
};

// ─── 工具：HTML 转义 ───────────────────────────────────────────
function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 换行转 <br>
function nl2br(str) {
  return esc(str).replace(/\n/g, '<br>');
}

// ─── C 系列文本补丁（在 sections 数据上就地修复）────────────────
function patchSections(s) {
  // C1：parameterNote.block3
  try {
    const b3 = s.chapter1?.needsAnalysis?.parameterNote?.block3;
    if (b3) {
      s.chapter1.needsAnalysis.parameterNote.block3 = b3
        .replace('亦不建议放宽安全配置', '降低安全配置将导致性能不达标');
    }
  } catch (_) {}

  // C3：coreTension
  try {
    const ct = s.chapter1?.needsAnalysis?.coreTension;
    if (ct) {
      s.chapter1.needsAnalysis.coreTension = ct
        .replace('应在报价中说明原因', '报价中需包含相应说明');
    }
  } catch (_) {}

  // C2：cover guide 文字（硬编码在 buildCoverHTML，此处无需 patch）
}

// ═══════════════════════════════════════════════════════════════
// CSS 样式表
// ═══════════════════════════════════════════════════════════════
function buildCSS() {
  return `
    /* 移除 Google Fonts，使用系统字体栈 */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* WebView 响应式容器 */
    body {
      font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
      font-size: 14px;  /* 原 10pt → 14px */
      color: ${C.body};
      line-height: 1.6;  /* 略微增加行高 */
      background: #f5f5f5;  /* 浅灰背景，白色卡片 */
      padding: 8px;
    }

    /* 主容器 - 模拟 A4 宽度但响应式 */
    .page-break { 
      max-width: 800px; 
      width: 100%;
      margin: 0 auto;
      background: #fff;
      padding: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .page-break:first-child {
      margin-top: 8px;
    }
    .no-break   { 
      /* page-break-inside: avoid; 保留用于 PDF 生成 */  /* 保留用于 PDF 生成 */
    }

    /* ── 封面 ── */
    .cover-header {
      background: ${C.navy};
      color: #fff;
      padding: 36px 28px 28px;
      margin: 0;
    }
    .cover-header h1 {
      font-size: 22pt;
      letter-spacing: 6px;
      text-align: center;
      margin-bottom: 10px;
    }
    .cover-meta {
      font-size: 9pt;
      text-align: center;
      opacity: 0.85;
    }
    .cover-info-card {
      background: #fff;
      border-radius: 6px;
      padding: 14px 16px;
      margin: 14px 0 10px;
      color: ${C.navy};
      font-size: 9.5pt;
    }
    .cover-info-card p { margin: 3px 0; }
    .badge {
      display: inline-block;
      border-radius: 3px;
      padding: 2px 8px;
      font-size: 8.5pt;
      color: #fff;
      margin-right: 6px;
    }
    .badge-orange { background: ${C.orange}; }
    .badge-red    { background: ${C.red}; }
    .cover-body {
      padding: 16px 0 0;
      font-size: 9.5pt;
      color: ${C.body};
    }
    .cover-intro {
      margin-bottom: 12px;
      line-height: 1.7;
    }
    .guide-box {
      background: #F0F7FF;
      border: 1px solid ${C.border};
      border-radius: 6px;
      padding: 10px 14px;
      font-size: 9pt;
      line-height: 1.8;
      margin-bottom: 14px;
    }
    .chapter-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 8px;
    }
    .chapter-card {
      background: #F5F7FA;
      border-radius: 5px;
      padding: 10px 12px;
    }
    .chapter-card .ch-num {
      font-size: 18pt;
      font-weight: 700;
      color: ${C.navy};
      line-height: 1;
    }
    .chapter-card .ch-title {
      font-size: 9.5pt;
      font-weight: 500;
      color: ${C.body};
      margin-top: 2px;
    }
    .chapter-card .ch-desc {
      font-size: 8pt;
      color: #999;
      margin-top: 2px;
    }
    .cover-brand {
      margin-top: 16px;
      font-size: 7.5pt;
      color: #bbb;
      text-align: center;
    }
    .cover-author {
      font-size: 9.5pt;
      color: rgba(255,255,255,0.8);
      text-align: right;
      padding: 8px 28px 0;
      background: ${C.navy};
      margin: 0;
    }

    /* ── 章节通用 ── */
    .chapter-header {
      display: flex;
      align-items: center;
      margin-bottom: 14px;
      /* page-break-inside: avoid; 保留用于 PDF 生成 */
    }
    .ch-badge {
      width: 32px;
      height: 26px;
      background: ${C.navy};
      color: #fff;
      font-size: 11pt;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-right: 8px;
    }
    .ch-title-text {
      font-size: 16pt;
      color: ${C.navy};
      font-weight: 700;
    }
    .ch-underline {
      border-bottom: 1.5px solid ${C.navy};
      margin-bottom: 16px;
    }

    .section-title {
      font-size: 12pt;
      color: ${C.mid};
      font-weight: 600;
      margin: 14px 0 8px;
      /* page-break-after: avoid; 保留用于 PDF 生成 */
    }

    /* ── 信息卡 ── */
    .info-card {
      background: ${C.card};
      border-radius: 6px;
      padding: 14px 16px;
      margin-bottom: 12px;
    }
    .info-row {
      display: flex;
      gap: 0;
      margin-bottom: 4px;
      font-size: 9.5pt;
    }
    .info-col { flex: 1; }

    /* ── 表格 ── */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      margin-bottom: 12px;
    }
    .data-table th {
      background: ${C.navy};
      color: #fff;
      padding: 6px 6px;
      text-align: center;
      font-weight: 500;
    }
    .data-table td {
      padding: 6px 6px;
      border: 1px solid ${C.border};
      vertical-align: top;
    }
    .data-table tr:nth-child(even) td { background: ${C.card}; }
    .data-table tr:nth-child(odd)  td { background: #fff; }
    .data-table .dim-col { text-align: center; font-weight: 500; }
    .data-table .basis-col { color: ${C.secondary}; font-size: 8.5pt; }

    /* ── 参数说明块 ── */
    .param-note {
      font-size: 9pt;
      color: ${C.body};
      margin-bottom: 8px;
      line-height: 1.7;
    }
    .param-note-lines {
      font-size: 8.5pt;
      color: ${C.secondary};
      line-height: 1.7;
      margin-bottom: 6px;
    }
    .param-note-em {
      background: #FEF9E7;
      border: 1px solid ${C.border};
      border-radius: 3px;
      padding: 6px 8px;
      font-size: 8.5pt;
      color: #8A6D3B;
      margin-bottom: 12px;
    }

    /* ── 预算适配警告 ── */
    .budget-warn {
      background: #FFF8E1;
      border: 1px solid #E0C36A;
      border-radius: 4px;
      padding: 10px 12px;
      font-size: 9.5pt;
      margin: 10px 0;
    }
    .budget-warn-title {
      font-weight: 600;
      margin-bottom: 4px;
      color: ${C.body};
    }

    /* ── 指标块（第二章）── */
    .metric-block {
      background: ${C.card};
      border-radius: 6px;
      padding: 14px 16px;
      margin-bottom: 14px;
      /* page-break-inside: avoid; 保留用于 PDF 生成 */
    }
    .metric-std  { font-size: 8.5pt; color: ${C.secondary}; margin-bottom: 4px; }
    .metric-val  { font-size: 20pt; font-weight: 700; color: ${C.navy}; }
    .metric-unit { font-size: 10pt; color: ${C.secondary}; margin-left: 4px; }
    .metric-meta { font-size: 9pt; color: ${C.secondary}; margin-top: 4px; display: flex; gap: 20px; }
    .metric-note { font-size: 8.5pt; color: ${C.light}; }
    .priority-hint {
      font-size: 8.5pt;
      color: ${C.orange};
      margin-bottom: 6px;
    }

    /* ── 红线清单 ── */
    .redline-row {
      display: flex;
      align-items: flex-start;
      padding: 6px 8px;
      font-size: 9.5pt;
      border-bottom: 1px solid #f0f0f0;
    }
    .redline-row:nth-child(even) { background: ${C.card}; }
    .redline-row:nth-child(odd)  { background: #fff; }
    .redline-icon { font-size: 10pt; min-width: 22px; font-weight: 700; }
    .redline-icon.forbidden { color: ${C.red}; }
    .redline-icon.safety    { color: ${C.orange}; }
    .redline-text { flex: 1; }

    .safety-budget-warn {
      background: #FEF9E7;
      border-left: 3px solid ${C.orange};
      padding: 8px 12px;
      font-size: 9pt;
      color: ${C.orange};
      margin: 8px 0;
    }

    /* ── 冲突/升级提示 ── */
    .conflict-box {
      border-left: 5px solid ${C.red};
      background: ${C.red_bg};
      padding: 10px 12px;
      margin: 10px 0;
      font-size: 9.5pt;
      /* page-break-inside: avoid; 保留用于 PDF 生成 */
    }
    .conflict-box h4 { color: ${C.red}; margin-bottom: 4px; font-size: 10pt; }

    /* ── 第四章：答题表 ── */
    .questionnaire-header {
      background: ${C.mid};
      color: #fff;
      font-size: 9.5pt;
      font-weight: 600;
      padding: 6px 10px;
      margin: 10px 0 6px;
    }
    .q-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
      margin-bottom: 8px;
    }
    .q-table th {
      background: ${C.navy};
      color: #fff;
      padding: 5px 4px;
      text-align: center;
      font-weight: 400;
    }
    .q-table td {
      border: 1px solid ${C.border};
      padding: 7px 4px;
      height: 26px;
    }
    .q-table td.label-col { background: #F2F2F2; }

    /* ── 红线承诺（第四章）── */
    .redline-commit {
      margin: 10px 0;
      font-size: 9pt;
    }
    .redline-commit-title {
      font-size: 9.5pt;
      font-weight: 600;
      color: ${C.mid};
      margin-bottom: 8px;
      padding-bottom: 3px;
      border-bottom: 1px solid ${C.border};
    }
    .commit-item {
      border-left: 3px solid ${C.red};
      padding: 5px 8px;
      margin-bottom: 8px;
      /* page-break-inside: avoid; 保留用于 PDF 生成 */
    }
    .commit-item-rec {
      border-left: 3px solid ${C.mid};
    }
    .commit-text { font-size: 9pt; color: ${C.body}; }
    .commit-confirm { font-size: 8pt; color: ${C.secondary}; margin-top: 3px; }

    /* ── 风险提示 ── */
    .risk-box {
      border-left: 5px solid ${C.red};
      background: ${C.red_bg};
      padding: 10px 14px;
      margin: 10px 0;
      /* page-break-inside: avoid; 保留用于 PDF 生成 */
    }
    .risk-title { color: ${C.red}; font-size: 10.5pt; font-weight: 700; margin-bottom: 4px; }
    .risk-desc  { font-size: 9pt; color: ${C.body}; margin-bottom: 6px; }
    .risk-suggest { font-size: 9pt; color: ${C.mid}; }

    /* ── 验收节点 ── */
    .acceptance-node { margin-bottom: 10px; }
    .acceptance-node-title {
      font-size: 10pt;
      font-weight: 600;
      color: ${C.mid};
      margin-bottom: 6px;
    }
    .acceptance-item {
      font-size: 9pt;
      color: ${C.body};
      padding: 3px 0 3px 14px;
      line-height: 1.5;
    }

    /* ── L2 入口 ── */
    .l2-entry {
      padding: 10px 14px;
      margin: 12px 0;
      display: flex;
      align-items: center;
      gap: 10px;
      /* page-break-inside: avoid; 保留用于 PDF 生成 */
    }
    .l2-entry.risk  { background: ${C.red_bg}; }
    .l2-entry.safe  { background: ${C.green_bg}; }
    .l2-text  { flex: 1; font-size: 9pt; }
    .l2-btn {
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 9pt;
      color: #fff;
      white-space: nowrap;
    }
    .l2-btn.risk { background: ${C.red}; }
    .l2-btn.safe { background: ${C.green}; }

    /* ── 免责声明 ── */
    .disclaimer-section {
      border-top: 1px solid ${C.border};
      margin-top: 20px;
      padding-top: 10px;
      font-size: 7.5pt;
      color: #888;
      line-height: 1.6;
    }
    .disclaimer-title { font-weight: 600; margin-bottom: 4px; }
    .disclaimer-p { margin-bottom: 4px; }

  `;
}

// ═══════════════════════════════════════════════════════════════
// 封面
// ═══════════════════════════════════════════════════════════════
function buildCoverHTML(cover) {
  const city = esc(cover.city || '未知城市');
  const district = cover.district ? ' ' + esc(cover.district) : '';
  const climate = esc(cover.climateLabel || '');
  const floorDesc = esc(cover.floorDesc || '');
  const pdfNo = esc(cover.pdfNo || 'LSA-00000000-0000');
  const issueDate = esc(cover.issueDate || '');
  const painTag = esc(cover.painTag || '综合需求');

  const degradedBanner = cover.degradedMsg
    ? `<div style="background:${C.red};color:#fff;padding:5px 28px;font-size:8.5pt;text-align:center">${esc(cover.degradedMsg)}</div>`
    : '';

  const safetyBadge = cover.hasSafety
    ? `<span class="badge badge-red">含安全专项条款</span>`
    : '';

  // C2 修复：第三章确认预算 → 第三章核查采购红线
  const guideText = `📋 业主：第一章了解需求转化逻辑；第三章核查采购红线；第四章直接发给商家。\n🏭 商家：请重点阅读第二章技术指标，并完整填写第四章答题表后回传业主。`;

  return `
    <div class="cover-header">
      ${degradedBanner}
      <h1>门 窗 技 术 招 标 文 件</h1>
      <p class="cover-meta">文件编号：${pdfNo}　　签发日期：${issueDate}</p>
      <div class="cover-info-card">
        <p>${city}${district} · ${climate}</p>
        <p>${floorDesc}</p>
        <div style="margin-top:8px">
          <span class="badge badge-orange">${painTag}</span>
          ${safetyBadge}
        </div>
      </div>
      <div class="cover-author">李Sir · 独立门窗技术顾问（不销售、不代理）</div>
    </div>

    <div class="cover-body">
      <p class="cover-intro">
        本文件基于您的实际需求，将生活诉求转化为可量化的技术采购标准——帮您用数据选窗，不凭感觉、不靠话术。
      </p>
      <div class="guide-box">${nl2br(guideText)}</div>

      <div class="chapter-grid">
        <div class="chapter-card">
          <div class="ch-num">01</div>
          <div class="ch-title">性能需求诊断</div>
          <div class="ch-desc">生活诉求转化为可量化技术参数</div>
        </div>
        <div class="chapter-card">
          <div class="ch-num">02</div>
          <div class="ch-title">采购技术底线</div>
          <div class="ch-desc">甲方视角的最低性能验收要求</div>
        </div>
        <div class="chapter-card">
          <div class="ch-num">03</div>
          <div class="ch-title">红线禁止清单</div>
          <div class="ch-desc">不合格配置与材料一票否决项</div>
        </div>
        <div class="chapter-card">
          <div class="ch-num">04</div>
          <div class="ch-title">配置推导 · 答题表</div>
          <div class="ch-desc">商家报价填写与现场验收节点</div>
        </div>
      </div>

      <p class="cover-brand">本文件由李Sir门窗诊断系统生成 · 技术参数基于国家标准及气候数据库</p>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// 第一章
// ═══════════════════════════════════════════════════════════════
function buildChapter1HTML(c1) {
  const bi = c1.basicInfo || {};

  // 1.1 基本信息
  const roomTypeRow = bi.roomType
    ? `<div class="info-row"><div class="info-col">使用场景：${esc(bi.roomType)}</div></div>`
    : '';
  const painRow = bi.painPoint
    ? `<div class="info-row"><div class="info-col">核心诉求：${esc(bi.painPoint)}</div></div>`
    : '';
  const noiseRow = bi.noiseEnv
    ? `<div class="info-row"><div class="info-col">噪音环境：${esc(bi.noiseEnv)}</div></div>`
    : '';

  // 1.2 需求表
  const na = c1.needsAnalysis || {};
  let tableHTML = '';
  if (Array.isArray(na.needsTable) && na.needsTable.length > 0) {
    const rows = na.needsTable.map((r, i) => `
      <tr>
        <td class="dim-col">${esc(r.dimension)}</td>
        <td>${esc(r.value)}</td>
        <td class="basis-col">${esc(r.basis)}</td>
      </tr>`).join('');
    tableHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:16%">性能维度</th>
            <th style="width:30%">参数值</th>
            <th>依据（标准文号 · 场景说明）</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  // 参数说明脚注
  let paramNoteHTML = '';
  if (na.parameterNote) {
    const pn = na.parameterNote;
    // block3 已经在 patchSections 修复
    const b3 = String(pn.block3 || '');
    const b2lines = String(pn.block2 || '').split('\n').filter(Boolean).map(ln => {
      // 去掉 **bold** markdown
      return ln.replace(/\*\*(.+?)\*\*/g, '$1');
    });
    paramNoteHTML = `
      <p class="param-note">${esc(pn.block1 || '')}</p>
      <div class="param-note-lines">${b2lines.map(l => `<div>${esc(l)}</div>`).join('')}</div>
      ${b3 ? `<div class="param-note-em">${esc(b3)}</div>` : ''}
    `;
  }

  // 固定窗注
  let fixedNote = '';
  if (na.sealGrades && na.sealGrades.isFixed) {
    fixedNote = `<p style="font-size:8.5pt;color:${C.secondary};margin-bottom:8px">注：固定窗因无可开启部件，密封性能天然更高，可按更高一档理解（气密、水密推荐值已+1级）</p>`;
  }

  // 核心矛盾
  const tension = String(na.coreTension || '');
  const tensionHTML = tension
    ? `<p style="font-size:9.5pt;line-height:1.7;margin:8px 0 12px">${esc(tension)}</p>`
    : '';

  // 预算适配警告
  let budgetWarnHTML = '';
  if (na.budgetFitnessNote && na.budgetFitnessNote.type === 'budget_fitness_warning') {
    budgetWarnHTML = `
      <div class="budget-warn">
        <div class="budget-warn-title">预算适配性提示</div>
        <div>${esc(na.budgetFitnessNote.text || '')}</div>
      </div>`;
  }

  return `
    <div class="chapter-header no-break">
      <div class="ch-badge">一</div>
      <div class="ch-title-text">第一章 项目概况与需求分析</div>
    </div>
    <div class="ch-underline"></div>

    <div class="section-title">1.1 项目基本信息</div>
    <div class="info-card">
      <div class="info-row">
        <div class="info-col">城市：${esc(bi.city || '')} ${esc(bi.district || '')}</div>
        <div class="info-col">气候区：${esc(bi.climateLabel || c1.climateLabel || '')}</div>
      </div>
      <div class="info-row">
        <div class="info-col">楼层：${esc(bi.floorDesc || c1.floorDesc || '')}</div>
      </div>
      ${roomTypeRow}
      <div class="info-row">
        <div class="info-col">窗型：${esc(bi.windowType || '')}</div>
        <div class="info-col">朝向：${esc(bi.orientation || '')}</div>
      </div>
      <div class="info-row">
        <div class="info-col">供暖方式：${esc(bi.heatingType || c1.heatingDesc || '')}</div>
        <div class="info-col">家庭：${esc(bi.familyDesc || c1.familyDesc || '')}</div>
      </div>
      ${painRow}
      ${noiseRow}
    </div>

    <div class="section-title">1.2 需求分析</div>
    ${tableHTML}
    ${fixedNote}
    ${paramNoteHTML}
    ${tensionHTML}
    ${budgetWarnHTML}
  `;
}

// ═══════════════════════════════════════════════════════════════
// 第二章
// ═══════════════════════════════════════════════════════════════
function buildChapter2HTML(c2) {
  const metrics = c2.metrics || [];
  const mP3     = metrics[0] || {};
  const mCore   = metrics[1] || {};
  const mTherm  = metrics[2] || {};

  function metricBlock(m) {
    if (!m || !m.name) return '';
    const rawVal = String(m.value || '');
    const lines = rawVal.split('\n');
    const valHTML = lines.map((l, i) =>
      i === 0
        ? `<span class="metric-val">${esc(l)}</span><span class="metric-unit">${esc(m.unit || '')}</span>`
        : `<div style="font-size:13pt;font-weight:700;color:${C.navy};margin-top:4px">${esc(l)}</div>`
    ).join('');

    return `
      <div class="metric-block no-break">
        <div class="metric-std">${esc(m.std || '')}</div>
        <div>${valHTML}</div>
        <div class="metric-meta">
          ${m.level ? `<span>${esc(m.level)}</span>` : ''}
          ${m.note  ? `<span class="metric-note">${esc(m.note)}</span>` : ''}
        </div>
      </div>`;
  }

  const painPointLabelMap = {
    sound: '隔声优先', heat: '隔热优先', wind: '抗风优先',
    safety: '安全防护优先', price: '性价比优先', view: '采光视野优先', vent: '通风优先'
  };
  const priorityLabel = painPointLabelMap[c2.painPoint] || '性能优先';

  return `
    <div class="chapter-header no-break">
      <div class="ch-badge">二</div>
      <div class="ch-title-text">第二章 技术参数与性能指标</div>
    </div>
    <div class="ch-underline"></div>

    ${c2.positionStatement
      ? `<p style="font-size:9pt;color:${C.secondary};margin-bottom:12px">${esc(c2.positionStatement)}</p>`
      : ''}

    <div class="section-title">2.1 抗风压性能</div>
    ${metricBlock(mP3)}

    <div class="section-title">2.2 核心指标</div>
    <p class="priority-hint">★ 基于您选择的${esc(priorityLabel)}目标，这是商家方案必须重点回应的指标</p>
    ${metricBlock(mCore)}

    <div class="section-title">2.3 热工性能</div>
    <p style="font-size:8.5pt;color:${C.secondary};margin-bottom:6px">K值（传热系数）越低越保温；SHGC（太阳得热系数）越低越隔热，夏季尤为重要。</p>
    ${metricBlock(mTherm)}
  `;
}

// ═══════════════════════════════════════════════════════════════
// 第三章
// ═══════════════════════════════════════════════════════════════
function buildChapter3HTML(c3) {
  const forbidden    = Array.isArray(c3.forbidden)    ? c3.forbidden    : [];
  const safetyItems  = Array.isArray(c3.safetyItems)  ? c3.safetyItems  : [];

  const forbiddenHTML = forbidden.length > 0
    ? `
      <div class="section-title">3.1 禁止项（方案必须全部满足）</div>
      <div>
        ${forbidden.map((item, i) => `
          <div class="redline-row">
            <div class="redline-icon forbidden">✕</div>
            <div class="redline-text">${esc(String(item))}</div>
          </div>`).join('')}
      </div>
      <div style="height:12px"></div>`
    : '';

  const safetyHTML = safetyItems.length > 0
    ? `
      <div class="section-title">3.2 安全底线（有老幼家庭必须满足）</div>
      <div>
        ${safetyItems.map((item) => `
          <div class="redline-row">
            <div class="redline-icon safety">⚠</div>
            <div class="redline-text">${esc(String(item))}</div>
          </div>`).join('')}
      </div>
      ${c3.safetyBudgetWarning
        ? `<div class="safety-budget-warn">${esc(c3.safetyBudgetWarning)}</div>`
        : ''}
      <div style="height:12px"></div>`
    : '';

  return `
    <div class="chapter-header no-break">
      <div class="ch-badge">三</div>
      <div class="ch-title-text">第三章 本案采购红线清单</div>
    </div>
    <div class="ch-underline"></div>

    ${c3.sourceNote
      ? `<p style="font-size:8.5pt;color:${C.secondary};margin-bottom:12px">${esc(c3.sourceNote)}</p>`
      : ''}
    ${forbiddenHTML}
    ${safetyHTML}
  `;
}

// ═══════════════════════════════════════════════════════════════
// 第四章 - 子块
// ═══════════════════════════════════════════════════════════════

function buildRedlineCommitHTML(checklist) {
  if (!checklist) return '';
  const mandatory    = Array.isArray(checklist.mandatory)    ? checklist.mandatory    : [];
  const recommended  = Array.isArray(checklist.recommended)  ? checklist.recommended  : [];
  if (mandatory.length === 0 && recommended.length === 0) return '';

  const mandatoryHTML = mandatory.map(item => {
    const id   = esc(item.displayId || item.id || '');
    const text = esc(item.text || '');
    return `
      <div class="commit-item no-break">
        <div class="commit-text">□ ${id} ${text}</div>
        <div class="commit-confirm">　商家确认：□ 满足　□ 不满足（请说明原因：__________）</div>
      </div>`;
  }).join('');

  const recommendedHTML = recommended.length > 0 ? `
    <div style="font-size:9.5pt;font-weight:600;color:${C.mid};margin:8px 0 6px">推荐红线（建议满足，不强制）</div>
    ${recommended.map(item => {
      const id   = esc(item.displayId || item.id || '');
      const text = esc(item.text || '');
      return `
        <div class="commit-item commit-item-rec no-break">
          <div class="commit-text">□ ${id} ${text}</div>
          <div class="commit-confirm">　商家确认：□ 知悉并同意　□ 不适用</div>
        </div>`;
    }).join('')}` : '';

  return `
    <div class="redline-commit">
      <div class="redline-commit-title">── 第三段：红线承诺（必填）──</div>
      <p style="font-size:9pt;color:${C.red};margin-bottom:8px">⚠ 强制红线（以下任一项未满足，方案原则上不建议采用）</p>
      ${mandatoryHTML}
      ${recommendedHTML}
      <p style="font-size:9.5pt;margin-top:8px">商家综合确认：□ 以上强制红线全部满足　□ 部分不满足（详见上方说明）</p>
    </div>`;
}

function buildChapter4HTML(c4) {
  const isRisk = !!c4.isRisk;

  // 使用说明
  const introHTML = (c4.intro && Array.isArray(c4.intro.items) && c4.intro.items.length > 0)
    ? `
      <div class="section-title">${esc(c4.intro.title || '使用说明')}</div>
      ${c4.intro.items.map(line => `<p style="font-size:9.5pt;margin-bottom:4px">${esc(line)}</p>`).join('')}
      <div style="height:8px"></div>`
    : '';

  // 给商家的说明
  const noticeHTML = c4.merchantNotice
    ? `
      <div class="section-title">4.1 给商家的说明</div>
      ${c4.merchantNotice.content
        ? `<p style="font-size:9.5pt;margin-bottom:8px">${esc(c4.merchantNotice.content)}</p>`
        : ''}
      ${c4.merchantNotice.deadline
        ? `<p style="font-size:9pt;color:${C.secondary};margin-bottom:8px">${esc(c4.merchantNotice.deadline)}</p>`
        : ''}`
    : '';

  // 答题表
  const mq = c4.merchantQuestionnaire || {};
  const section1HTML = (mq.section1 && Array.isArray(mq.section1.fields))
    ? `
      <div class="questionnaire-header">${esc(mq.section1.title || '')}</div>
      ${mq.section1.fields.map(f => {
        if (f.type === 'checkbox') {
          const opts = Array.isArray(f.options) ? f.options.join(' / ') : '';
          return `<p style="font-size:9pt;margin-bottom:4px">${esc(f.label)}：□ ${esc(opts)}</p>`;
        }
        return `<p style="font-size:9pt;margin-bottom:4px">${esc(f.label)}（${esc(f.placeholder || '')}）：________________________</p>`;
      }).join('')}
      <div style="height:8px"></div>`
    : '';

  const qCols = [
    { h: '品牌及系列',      w: '17%' },
    { h: '型材壁厚(mm)',    w: '12%' },
    { h: '玻璃配置',        w: '16%' },
    { h: '检测报告编号',    w: '16%' },
    { h: '含税报价(元/㎡)', w: '12%' },
    { h: '工期(天)',        w: '8%'  },
    { h: '质保(年)',        w: '8%'  },
    { h: '签名确认',        w: '11%' },
  ];

  const section2HTML = (mq.section2)
    ? `
      <div class="questionnaire-header">${esc(mq.section2.title || '')}</div>
      ${mq.section2.hint
        ? `<p style="font-size:8.5pt;color:${C.secondary};margin-bottom:6px">${esc(mq.section2.hint)}</p>`
        : ''}
      <table class="q-table">
        <thead>
          <tr>${qCols.map(c => `<th style="width:${c.w}">${esc(c.h)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${[0,1,2,3].map(i => `
            <tr>
              <td class="label-col" style="text-align:center;color:${C.light};font-size:8pt">请填写</td>
              ${qCols.slice(1).map(() => '<td></td>').join('')}
            </tr>`).join('')}
        </tbody>
      </table>
      ${mq.section2.note
        ? `<p style="font-size:8pt;color:${C.light};margin-bottom:6px">${esc(mq.section2.note)}</p>`
        : ''}`
    : '';

  const section3HTML = (mq.section3 && Array.isArray(mq.section3.questions))
    ? `
      <div class="questionnaire-header">${esc(mq.section3.title || '')}</div>
      ${mq.section3.questions.map(q => `
        <p style="font-size:9pt;margin-bottom:8px">${esc(q)}</p>
        <div style="height:16px"></div>`).join('')}`
    : '';

  const signatureHTML = (mq.signature && mq.signature.text)
    ? `<p style="font-size:9pt;color:${C.secondary};margin-top:8px">${esc(mq.signature.text)}</p>`
    : '';

  const mqHTML = mq.title
    ? `
      <div class="section-title">${esc(mq.title)}</div>
      ${mq.subtitle
        ? `<p style="font-size:9pt;color:${C.secondary};margin-bottom:8px">${esc(mq.subtitle)}</p>`
        : ''}
      ${section1HTML}
      ${section2HTML}
      ${buildRedlineCommitHTML(c4.redlineChecklist)}
      ${section3HTML}
      ${signatureHTML}`
    : '';

  // L2 入口
  const l2 = c4.l2_entry || {};
  const l2HTML = l2.action
    ? `
      <div class="l2-entry ${isRisk ? 'risk' : 'safe'}">
        <div class="l2-text" style="color:${isRisk ? C.red : C.green}">
          ${esc(isRisk ? (l2.risk_text || '') : (l2.normal_text || ''))}
        </div>
        <div class="l2-btn ${isRisk ? 'risk' : 'safe'}">${esc(l2.action)}</div>
      </div>`
    : '';

  // 风险提示
  const risksHTML = (c4.risks && Array.isArray(c4.risks.items) && c4.risks.items.length > 0)
    ? `
      <div class="section-title">${esc(c4.risks.title || '4.3 风险提示')}</div>
      ${c4.risks.items.map(r => `
        <div class="risk-box no-break">
          <div class="risk-title">⚠️ ${esc(r.title || '')}</div>
          <div class="risk-desc">${esc(String(r.desc || ''))}</div>
          <div class="risk-suggest">→ ${esc(r.suggest || '')}${r.question ? `\n→ 要问商家的问题：${esc(r.question)}` : ''}</div>
        </div>`).join('')}`
    : '';

  // 验收节点
  const acceptHTML = (c4.acceptance && Array.isArray(c4.acceptance.nodes) && c4.acceptance.nodes.length > 0)
    ? `
      <div class="section-title">${esc(c4.acceptance.title || '4.4 验收节点')}</div>
      ${c4.acceptance.nodes.map(node => {
        const nodeTitle = node.title || (node.stage ? `【${node.stage}】` : '【验收节点】');
        const items = Array.isArray(node.items) ? node.items : [];
        return `
          <div class="acceptance-node no-break">
            <div class="acceptance-node-title">${esc(nodeTitle)}</div>
            ${items.map(item => `<div class="acceptance-item">· ${esc(String(item))}</div>`).join('')}
          </div>`;
      }).join('')}`
    : '';

  // 性能验收
  const perfChecks = Array.isArray(c4.performanceChecks) ? c4.performanceChecks : [];
  const perfHTML = perfChecks.length > 0
    ? `
      <div style="font-size:10pt;font-weight:600;color:${C.mid};margin:10px 0 6px">【性能验收】</div>
      ${perfChecks.map(item => `
        <p style="font-size:9pt;margin-bottom:6px"> · ${esc(item.num || '')} ${esc(item.text || '')}</p>`).join('')}`
    : '';

  return `
    <div class="chapter-header no-break">
      <div class="ch-badge">四</div>
      <div class="ch-title-text">第四章 ${esc(c4.title || '下一步怎么用')}</div>
    </div>
    <div class="ch-underline"></div>

    ${c4.subtitle
      ? `<p style="font-size:9pt;color:${C.secondary};margin-bottom:12px">${esc(c4.subtitle)}</p>`
      : ''}
    ${introHTML}
    ${noticeHTML}
    ${mqHTML}
    ${l2HTML}
    ${risksHTML}
    ${acceptHTML}
    ${perfHTML}
  `;
}

// ═══════════════════════════════════════════════════════════════
// 免责声明
// ═══════════════════════════════════════════════════════════════
const DISCLAIMER_PARAGRAPHS = [
  '本招标文件由"不卖窗的李sir·门窗诊断系统"依据您填写的信息自动生成，仅供采购沟通与技术参考使用，不构成任何法律合同或承诺。',
  '文中提及的标准条文引用、性能参数建议及预算区间，均基于生成时的现行规范和一般工程经验，不保证在任何时间、任何项目情形下均完全适用；如有差异，应以实际勘察及具有相应资质的专业机构意见为准。',
  '本系统不代表任何品牌或商家利益，亦不参与具体采购、报价或施工，对商家报价及施工质量不承担保证或连带责任。',
  '如需进一步了解本文件所涉技术内容，可通过"不卖窗的李sir"官方渠道咨询。'
];

function buildDisclaimerHTML() {
  return `
    <div class="disclaimer-section">
      <div class="disclaimer-title">【免责声明】</div>
      ${DISCLAIMER_PARAGRAPHS.map(p => `<p class="disclaimer-p">${esc(p)}</p>`).join('')}
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// 主入口
// ═══════════════════════════════════════════════════════════════

/**
 * buildHTML(sections) → HTML string
 * @param {Object} sections  mapToSections() 的输出
 * @returns {string}         完整 HTML，供 Puppeteer 渲染
 */
function buildHTML(sections) {
  // 深拷贝，避免修改原始数据
  const s = JSON.parse(JSON.stringify(sections));
  patchSections(s);

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>门窗技术招标文件</title>
  <style>${buildCSS()}</style>
</head>
<body>

  <!-- 封面 -->
  <div>
    ${buildCoverHTML(s.cover || {})}
  </div>

  <!-- 第一章 -->
  <div class="page-break">
    ${buildChapter1HTML(s.chapter1 || {})}
  </div>

  <!-- 第二章 -->
  <div class="page-break">
    ${buildChapter2HTML(s.chapter2 || {})}
  </div>

  <!-- 第三章 -->
  <div class="page-break">
    ${buildChapter3HTML(s.chapter3 || {})}
  </div>

  <!-- 第四章 -->
  <div class="page-break">
    ${buildChapter4HTML(s.chapter4 || {})}
  </div>

  <!-- 免责声明 -->
  ${buildDisclaimerHTML()}

</body>
</html>`;

  return html;
}

module.exports = { buildHTML };