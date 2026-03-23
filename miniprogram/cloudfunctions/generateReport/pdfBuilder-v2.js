const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// 模块级缓存变量
let _fontBuffer = null;

/**
 * 获取字体文件 Buffer（三级回退策略）
 * 1. 思源黑体（最佳）
 * 2. 原完整字体 font.otf（保底无乱码）
 * 3. 子集字体（最后手段，可能乱码）
 */
function getFontBuffer() {
  if (!_fontBuffer) {
    // 定义三个优先级路径（使用绝对路径，避免云函数运行时路径问题）
    const sourceHanPath = path.join(__dirname, 'SourceHanSansCN-Regular.otf');
    const fullFontPath = path.join(__dirname, 'font.otf');
    const subsetFontPath = path.join(__dirname, 'font-subset.otf');
    
    try {
      // 优先级1：思源黑体（Noto Sans CJK）
      if (fs.existsSync(sourceHanPath)) {
        _fontBuffer = fs.readFileSync(sourceHanPath);
        console.log('[Font] 思源黑体', (_fontBuffer.length / 1024 / 1024).toFixed(2) + 'MB');
      } 
      // 优先级2：原完整字体（16MB，无乱码但体积大）
      else if (fs.existsSync(fullFontPath)) {
        _fontBuffer = fs.readFileSync(fullFontPath);
        console.log('[Font] 完整字体', (_fontBuffer.length / 1024).toFixed(1) + 'KB');
      } 
      // 优先级3：子集字体（警告：可能有乱码）
      else if (fs.existsSync(subsetFontPath)) {
        _fontBuffer = fs.readFileSync(subsetFontPath);
        console.warn('[Font] 子集字体', (_fontBuffer.length / 1024).toFixed(1) + 'KB - 可能出现乱码');
      } 
      // 无可用字体
      else {
        throw new Error('找不到任何可用字体文件（尝试查找: SourceHanSansCN-Regular.otf, font.otf, font-subset.otf）');
      }
    } catch (error) {
      console.error('[Font] 字体加载失败:', error.message);
      throw new Error('PDF字体加载失败: ' + error.message);
    }
  }
  
  return _fontBuffer;
}

// ... 其余代码保持不变 ...

// 颜色系统
const COLORS = {
  brand_navy: "#1A2E6B", brand_blue: "#2E86C1", brand_mid: "#34568B",
  risk_red: "#C0392B", risk_red_bg: "#FDECEA", risk_red_lt: "#FADBD8",
  safe_green: "#155724", safe_green_bg: "#D4EDDA",
  warn_orange: "#E67E22", warn_orange_bg: "#FEF9E7",
  text_body: "#2C3E50", text_secondary: "#7F8C8D", text_light: "#95A5A6",
  border: "#CCCCCC", bg_card: "#EEF3FF", bg_stripe: "#F7F9FC",
  tier_A: "#AED6F1", tier_B: "#2E86C1", tier_C: "#1A5276", tier_D: "#1A2E6B", tier_inactive: "#BDC3C7"
};

// 辅助函数
function drawChapterHeader(doc, num, title, color) {
  if (842 - doc.y < 140) doc.addPage();
  const y = doc.y;
  const chapterLabel = (typeof num === 'string' && num.startsWith('第') && !num.includes('章')) ? `${num}章` : num;
  const badgeText = typeof chapterLabel === 'string' ? chapterLabel.replace('第', '').replace('章', '').slice(0, 1) : String(chapterLabel);
  doc.rect(55, y, 36, 28).fill(color);
  doc.fillColor("#FFFFFF").fontSize(12).text(badgeText, 55, y + 8, { width: 36, align: "center" });
  doc.fillColor(color).fontSize(18).text(` ${chapterLabel} ${title}`, 91, y + 5);
  doc.moveTo(55, y + 30).lineTo(540, y + 30).lineWidth(1.5).stroke(color);
  doc.y = y + 40;
}

function drawSectionTitle(doc, title) {
  doc.fillColor(COLORS.brand_mid).fontSize(14).text(title, 55, doc.y);
  doc.y += 20;
}

function renderRedLines(doc, redLines) {
  const rl = redLines || {};
  const forbidden = Array.isArray(rl.forbidden) ? rl.forbidden : [];
  const safetyItems = Array.isArray(rl.safetyItems) ? rl.safetyItems : [];
  const conflictNotes = Array.isArray(rl.conflictNotes) ? rl.conflictNotes : [];

  const boxY = doc.y;
  const linesCount = forbidden.length + safetyItems.length + conflictNotes.length;
  const boxH = 18 + linesCount * 17 + (safetyItems.length > 0 ? 20 : 0) + (conflictNotes.length > 0 ? 16 : 0) + 10;

  doc.rect(55, boxY, 5, boxH).fill(COLORS.risk_red);
  doc.rect(60, boxY, 480, boxH).fill(COLORS.risk_red_bg);

  let y = boxY + 10;
  const X = 69;

  doc.fillColor(COLORS.risk_red).fontSize(14)
    .text("明确禁止项（违反即视为方案不合格）", X, y);
  y += 18;

  forbidden.forEach((item) => {
    doc.fillColor(COLORS.risk_red).fontSize(11)
      .text("✗ ", X, y, { continued: true });
    doc.fillColor(COLORS.text_body).fontSize(11)
      .text(String(item || ""), { width: 458 });
    y += 16;
  });

  if (safetyItems.length > 0) {
    y += 6;
    doc.fillColor(COLORS.risk_red).fontSize(11)
      .text("◆ 安全专项条款", X, y);
    y += 16;

    safetyItems.forEach((item) => {
      doc.fillColor(COLORS.risk_red).fontSize(11)
        .text("◆ ", X, y, { continued: true });
      doc.fillColor(COLORS.text_body).fontSize(11)
        .text(String(item || ""), { width: 458 });
      y += 16;
    });
  }

  if (rl.safetyBudgetWarning) {
    doc.fillColor(COLORS.warn_orange).fontSize(10)
      .text(String(rl.safetyBudgetWarning), X, y, { width: 458 });
    y += 14;
  }

  if (conflictNotes.length > 0) {
    conflictNotes.forEach((note) => {
      doc.fillColor(COLORS.warn_orange).fontSize(10)
        .text(`! ${String(note || "")}`, X, y, { width: 458 });
      y += 14;
    });
  }

  doc.y = boxY + boxH + 18;
}

// 各章渲染函数
function renderCover(doc, cover) {
  // 安全回退
  const city = cover.city || '未知城市';
  const climate = cover.climateLabel || '气候区未识别';
  const floorDesc = cover.floorDesc || '楼层信息待填';
  const pdfNo = cover.pdfNo || 'LSA-00000000-0000';
  const issueDate = cover.issueDate || new Date().toISOString().slice(0,10).replace(/-/g,'/');
  
  // 深蓝背景
  doc.rect(0, 0, 595, 290).fill(COLORS.brand_navy);
  
  // 降级警告（如果有）
  if (cover.degradedMsg) {
    doc.rect(0, 0, 595, 28).fill(COLORS.risk_red);
    doc.fillColor("#FFFFFF").fontSize(9)
      .text(cover.degradedMsg, 55, 8, { width: 485, align: "center" });
  }
  
  // 主标题
  doc.fillColor("#FFFFFF").fontSize(24)
    .text("门 窗 技 术 招 标 文 件", 55, 96, { width: 485, align: "center" });
  
  // 文件编号
  doc.fontSize(12)
    .text(`文件编号：${pdfNo}　　签发日期：${issueDate}`, 55, 134, { width: 485, align: "center" });
  
  // 项目信息卡
  doc.roundedRect(55, 156, 485, 98, 6).fill("#FFFFFF");
  doc.fillColor(COLORS.brand_navy).fontSize(10.5)
    .text(`${city}${cover.district ? " " + cover.district : ""} · ${climate}`, 69, 170)
    .text(floorDesc, 69, 188);
  
  // 痛点徽章（计算宽度避免溢出）
  const painTag = cover.painTag || '综合需求';
  const badgeW = painTag.length * 10 + 20;
  doc.roundedRect(69, 208, Math.min(badgeW, 100), 20, 3).fill(COLORS.warn_orange);
  doc.fillColor("#FFFFFF").fontSize(9)
    .text(painTag, 73, 214);
  
  // 安全标记
  if (cover.hasSafety) {
    doc.roundedRect(69 + Math.min(badgeW, 100) + 8, 208, 96, 20, 3).fill(COLORS.risk_red);
    doc.fillColor("#FFFFFF").fontSize(9)
      .text("含安全专项条款", 73 + Math.min(badgeW, 100) + 8, 214);
  }
  
  // 白色内容区
  doc.rect(0, 290, 595, 552).fill("#FFFFFF");
  
  // 签发人
  doc.fillColor("#FFFFFF").fontSize(10.5)
    .text("签发人：李Sir · 门窗技术顾问", 55, 278, { width: 485, align: "right" });
}

function renderChapter1(doc, c1) {
  drawChapterHeader(doc, "第一", "项目概况与需求分析", COLORS.brand_navy);
  
  drawSectionTitle(doc, "1.1 项目基本信息");
  const basicInfo = c1.basicInfo || c1;
  const hasNewStructure = !!c1.basicInfo;
  const cardY = doc.y;
  const baseHeight = 78;
  const extraHeight =
    (hasNewStructure && basicInfo.roomType ? 18 : 0) +
    (hasNewStructure && basicInfo.painPoint ? 18 : 0) +
    (hasNewStructure && basicInfo.noiseEnv ? 18 : 0);
  doc.roundedRect(55, cardY, 485, baseHeight + extraHeight, 6).fill(COLORS.bg_card);
  
  let textY = cardY + 14;
  const leftX = 69;
  const rightX = 297;
  
  doc.fillColor(COLORS.text_body).fontSize(10.5)
    .text(`城市：${basicInfo.city || ''} ${basicInfo.district || ""}`, leftX, textY)
    .text(`气候区：${basicInfo.climateLabel || c1.climateLabel || ''}`, rightX, textY);
  textY += 18;
  
  doc.fillColor(COLORS.text_body).fontSize(10.5)
    .text(`楼层：${basicInfo.floorDesc || c1.floorDesc || ''}`, leftX, textY);
  textY += 18;
  
  if (hasNewStructure && basicInfo.roomType) {
    doc.fillColor(COLORS.text_body).fontSize(10.5)
      .text(`使用场景：${basicInfo.roomType}`, leftX, textY);
    textY += 18;
  }
  
  doc.fillColor(COLORS.text_body).fontSize(10.5)
    .text(`窗型：${basicInfo.windowType || ''}`, leftX, textY)
    .text(`朝向：${basicInfo.orientation || ''}`, rightX, textY);
  textY += 18;
  
  doc.fillColor(COLORS.text_body).fontSize(10.5)
    .text(`供暖方式：${basicInfo.heatingType || c1.heatingDesc || ''}`, leftX, textY)
    .text(`家庭：${basicInfo.familyDesc || c1.familyDesc || ''}`, rightX, textY);
  textY += 18;

  if (hasNewStructure && basicInfo.painPoint) {
    doc.fillColor(COLORS.text_body).fontSize(10.5)
      .text(`核心诉求：${basicInfo.painPoint}`, leftX, textY);
    textY += 18;
  }

  if (hasNewStructure && basicInfo.noiseEnv) {
    doc.fillColor(COLORS.text_body).fontSize(10.5)
      .text(`噪音环境：${basicInfo.noiseEnv}`, leftX, textY);
  }
  
  doc.y = cardY + baseHeight + extraHeight + 10;

  drawSectionTitle(doc, "1.2 需求分析");
  if (c1.needsAnalysis && c1.needsAnalysis.needsTable) {
    const rows = Array.isArray(c1.needsAnalysis.needsTable) ? c1.needsAnalysis.needsTable : [];
    const tableTop = doc.y;
    const colWidths = [90, 110, 285];
    const rowHeight = 28;
    const tableWidth = 485;
    const startX = 55;
    
    if (842 - tableTop < (rowHeight * (rows.length + 2) + 70)) doc.addPage();
    const top = doc.y;
    
    doc.rect(startX, top, tableWidth, rowHeight).fill(COLORS.brand_navy);
    const headers = ['性能维度', '参数值', '依据（标准文号 · 场景说明）'];
    let colX = startX;
    headers.forEach((h, i) => {
      doc.fillColor("#FFFFFF").fontSize(9.5)
        .text(h, colX + 5, top + 8, { width: colWidths[i] - 10, align: "center" });
      colX += colWidths[i];
    });
    
    rows.forEach((row, rowIdx) => {
      const y = top + rowHeight + (rowIdx * rowHeight);
      const bgColor = rowIdx % 2 === 0 ? COLORS.bg_card : "#FFFFFF";
      doc.rect(startX, y, tableWidth, rowHeight).fill(bgColor).stroke(COLORS.border);
      
      const values = [row.dimension, row.value, row.basis];
      colX = startX;
      values.forEach((val, colIdx) => {
        const textColor = colIdx === 2 ? COLORS.text_secondary : COLORS.text_body;
        const fontSize = colIdx === 2 ? 9 : 10;
        doc.fillColor(textColor).fontSize(fontSize)
          .text(String(val || ""), colX + 5, y + 8, {
            width: colWidths[colIdx] - 10,
            align: colIdx === 0 ? "center" : "left"
          });
        colX += colWidths[colIdx];
      });
    });
    
    doc.y = top + rowHeight + (rows.length * rowHeight) + 15;

    if (c1.needsAnalysis.disclaimer && c1.needsAnalysis.disclaimer.type === 'disclaimer') {
      const note = c1.needsAnalysis.disclaimer;
      const text = String(note.text || '');
      const barX = 55;
      const barW = 3;
      const padding = 8;
      const textX = barX + barW + padding;
      const width = 485 - barW - padding;
      const y0 = doc.y;

      doc.fontSize(9).fillColor('#666666');
      const h = doc.heightOfString(text, { width: width, lineGap: 2 });
      doc.rect(barX, y0 + 1, barW, h + 4).fill(COLORS.brand_blue);
      doc.text(text, textX, y0, { width: width, align: 'left', lineGap: 2 });
      doc.fillColor(COLORS.text_body);
      doc.y = y0 + h + 12;
    }
    
    const tensionText = c1.needsAnalysis.coreTension || '';
    if (tensionText) {
      if (842 - doc.y < 120) doc.addPage();
      doc.fillColor(COLORS.text_body).fontSize(10.5)
        .text(tensionText, 55, doc.y, { width: 485, align: "justify", lineGap: 6 });
      doc.y += 35;
    }

    if (c1.needsAnalysis.budgetFitnessNote && c1.needsAnalysis.budgetFitnessNote.type === 'budget_fitness_warning') {
      const note = c1.needsAnalysis.budgetFitnessNote;
      const titleText = '预算适配性提示';
      const bodyText = String(note.text || '');
      const boxX = 55;
      const boxW = 485;
      const padding = { top: 8, bottom: 8, left: 12, right: 12 };
      const titleSize = 10;
      const bodySize = 10;
      const titleW = boxW - padding.left - padding.right;
      const bodyW = boxW - padding.left - padding.right;
      const y0 = doc.y + 6;

      doc.fontSize(titleSize);
      const titleH = doc.heightOfString(titleText, { width: titleW });
      doc.fontSize(bodySize);
      const bodyH = doc.heightOfString(bodyText, { width: bodyW, lineGap: 2 });
      const boxH = padding.top + titleH + 4 + bodyH + padding.bottom;

      if (842 - doc.y < boxH + 40) doc.addPage();
      const y = doc.y + 6;
      doc.rect(boxX, y, boxW, boxH).fill('#FFF8E1');
      doc.rect(boxX, y, boxW, boxH).lineWidth(1).strokeColor('#E0C36A').stroke();

      doc.fillColor(COLORS.text_body).fontSize(titleSize).text(titleText, boxX + padding.left, y + padding.top, { width: titleW });
      doc.fillColor(COLORS.text_body).fontSize(bodySize).text(bodyText, boxX + padding.left, y + padding.top + titleH + 4, { width: bodyW, align: 'left', lineGap: 2 });
      doc.fillColor(COLORS.text_body);
      doc.y = y + boxH + 18;
    }
  } else {
    doc.fillColor(COLORS.text_body).fontSize(10.5)
      .text(c1.analysisPara || '', 55, doc.y, { width: 485, align: "justify", lineGap: 5 });
    doc.y += 50;
    
    if (c1.noise && c1.noise.show) {
      drawSectionTitle(doc, "1.3 环境评估");
      const n = c1.noise;
      doc.fillColor(COLORS.text_body).fontSize(10.5).text(`噪音源：${n.typeLabel}｜距离：${n.distLabel}`, 55, doc.y);
      
      const KEYS = ["lt20", "20to50", "gt50"];
      const LABELS = ["近(<20m)", "中(20-50m)", "远(>50m)"];
      const active = KEYS.indexOf(n.distKey);
      const barY = doc.y + 18;
      const gutter = 10;
      const segW = (485 - gutter * 2) / 3;
      
      for (let i = 0; i < 3; i++) {
        const x = 55 + i * (segW + gutter);
        doc.rect(x, barY, segW, 16).fill(i <= active ? COLORS.warn_orange : COLORS.border);
        doc.fillColor(i <= active ? "#FFFFFF" : COLORS.text_secondary).fontSize(9)
          .text(LABELS[i], x + 8, barY + 4, { width: segW - 16, align: "center" });
      }
      
      doc.fillColor(COLORS.text_secondary).fontSize(9)
        .text(`评级：${n.levelLabel}`, 55, barY + 20);
      doc.y = barY + 40;
      
      if (Array.isArray(n.blocks) && n.blocks.length > 0) {
        n.blocks.forEach((b) => {
          if (!b || !b.text) return;
          if (b.type === 'safety_alert' && b.condition !== true) return;
          
          const isAlert = b.type === 'safety_alert';
          const color = isAlert ? COLORS.risk_red : COLORS.text_secondary;
          doc.fillColor(color).fontSize(10).text(b.text, 55, doc.y, { width: 485 });
          doc.y += isAlert ? 28 : 18;
        });
      }
    }
  }
}

function renderChapter2(doc, c2) {
  drawChapterHeader(doc, "第二", "技术参数与性能指标", COLORS.brand_navy);
  
  const metrics = c2.metrics || [];
  const mP3 = metrics[0];
  const mCore = metrics[1];
  const mThermal = metrics[2];

  const renderMetricBlock = (m, y0) => {
    if (!m) return y0;
    const rawValue = String(m.value || "");
    const lines = rawValue.split('\n');
    const isMultiLine = lines.length > 1;
    const blockH = isMultiLine ? 98 : 78;

    doc.roundedRect(55, y0, 485, blockH, 6).fill(COLORS.bg_card);
    doc.fillColor(COLORS.text_secondary).fontSize(10).text(m.std || "", 69, y0 + 14);
    doc.fillColor(COLORS.brand_navy).fontSize(24).text(lines[0] || "", 69, y0 + 30);
    doc.fillColor(COLORS.text_secondary).fontSize(11).text(m.unit || "", 210, y0 + 38);

    if (isMultiLine) {
      doc.fillColor(COLORS.brand_navy).fontSize(14).text(lines.slice(1).join('\n'), 69, y0 + 58, { width: 250 });
    }

    const metaY = isMultiLine ? (y0 + 80) : (y0 + 56);
    if (m.level) doc.fillColor(COLORS.text_secondary).fontSize(10).text(m.level, 69, metaY);
    if (m.note) doc.fillColor(COLORS.text_light).fontSize(9).text(m.note, 280, metaY, { width: 250 });
    return y0 + blockH + 14;
  };

  drawSectionTitle(doc, "2.1 抗风压性能");
  doc.y = renderMetricBlock(mP3, doc.y);

  drawSectionTitle(doc, "2.2 核心指标");
  doc.fillColor("#E67E22").fontSize(9).text("★ 基于您选择的隔声优先目标，这是商家方案必须重点回应的指标", 55, doc.y, { width: 485 });
  doc.y += 16;
  doc.y = renderMetricBlock(mCore, doc.y);

  drawSectionTitle(doc, "2.3 热工性能");
  doc.fillColor(COLORS.text_secondary).fontSize(9).text("K值（传热系数）越低越保温；SHGC（太阳得热系数）越低越隔热，夏季尤为重要。", 55, doc.y, { width: 485 });
  doc.y += 16;
  doc.y = renderMetricBlock(mThermal, doc.y);

  // 产品红线
  drawSectionTitle(doc, "2.4 产品红线");
  renderRedLines(doc, c2.redLines);
  doc.y += 18;
}

function renderChapter3(doc, c3) {
  drawChapterHeader(doc, "第三", "产品配置与预算方案", COLORS.brand_navy);
  
  const spec = (c3.recommendedConfig && c3.recommendedConfig.spec) || { label: "舒适型 B档" };
  drawSectionTitle(doc, `3.1 推荐配置方案（${spec.label}）`);
  
  // 配置表（复用第二章数据）
  const glassValue = (spec.glass || "5Low-E+12Ar+5") + (spec.glass_reason ? `\n（来源：${spec.glass_reason}）` : "");
  const rows = [
    { label: "型材", value: spec.profile || "断桥铝，壁厚≥1.6mm", h: 22 },
    { label: "玻璃", value: glassValue, h: spec.glass_reason ? 44 : 22 },
    { label: "五金", value: spec.hardware || "多点锁传动", h: 22 },
    { label: "密封", value: spec.seal || "EPDM胶条，2道密封", h: 22 }
  ];

  let yRow = doc.y;
  rows.forEach((row, i) => {
    doc.rect(55, yRow, 68, row.h).fill(COLORS.brand_navy);
    doc.rect(123, yRow, 417, row.h).fill(i % 2 === 0 ? COLORS.bg_card : "#FFFFFF");
    doc.fillColor("#FFFFFF").fontSize(9.5).text(row.label, 63, yRow + 7);
    doc.fillColor(COLORS.text_body).fontSize(10.5).text(row.value, 133, yRow + 6, { width: 400 });
    yRow += row.h;
  });
  doc.y = yRow + 25;

  // 价格横条图
  drawSectionTitle(doc, "3.2 预算档位对比");
  const tiers = (c3.budgetComparison && c3.budgetComparison.tiers) || [
    { key: "A", label: "经济实用 A档", priceRange: "600-800元/㎡", barRatio: 0.35 },
    { key: "B", label: "舒适均衡 B档", priceRange: "800-1200元/㎡", barRatio: 0.55 },
    { key: "C", label: "品质进阶 C档", priceRange: "1200-1800元/㎡", barRatio: 0.75 },
    { key: "D", label: "定制高端 D档", priceRange: "1800+元/㎡", barRatio: 1.0 }
  ];
  const currentTier = (c3.budgetComparison && c3.budgetComparison.currentTier) || "B";
  
  const barMaxW = 280;
  let y = doc.y;

  const tierDesc = {
    A: '基本满足常规隔声；热工中等',
    B: '较好满足主干道隔声；Low-E 热工',
    C: '舒适满足高架/轨道隔声；系统窗热工',
    D: '从容满足各类指标；被动式水准'
  };
  
  tiers.forEach(tier => {
    const isCur = tier.key === currentTier;
    const barW = Math.round(barMaxW * (tier.barRatio || 0.5));
    
    // 标签
    doc.fillColor(isCur ? COLORS.brand_blue : COLORS.text_secondary).fontSize(10)
      .text(tier.label, 55, y + 4);
    
    // 灰色底座
    doc.rect(135, y, barMaxW, 16).fill("#EEEEEE");
    
    // 档位条
    const fillColor = isCur ? COLORS.brand_blue : (COLORS[`tier_${tier.key}`] || COLORS.tier_inactive);
    doc.rect(135, y, barW, 16).fill(fillColor, isCur ? 1.0 : 0.6);
    
    if (isCur) {
      doc.rect(135, y, barW, 16).stroke(COLORS.brand_navy);
      doc.fillColor("#FFFFFF").fontSize(9).text("▶ 当前选择", 141, y + 4);
    }
    
    // 价格
    doc.fillColor(isCur ? COLORS.brand_navy : COLORS.text_secondary).fontSize(9)
      .text(tier.priceRange, 425, y + 4);
    if (tierDesc[tier.key]) {
      doc.fillColor(COLORS.text_light).fontSize(8).text(tierDesc[tier.key], 425, y + 16, { width: 120 });
    }
    
    y += 32;
  });
  
  doc.fillColor(COLORS.text_light).fontSize(9)
    .text("* 价格为市场参考值（元/㎡），差异>30%时谨慎选择最低价", 55, y + 5);
  doc.y = y + 25;

  if (c3.conflictAlert) {
    drawSectionTitle(doc, `3.3 ${c3.conflictAlert.title || "配置兼容性检查"}`);

    const hasItems = Array.isArray(c3.conflictAlert.items) && c3.conflictAlert.items.length > 0;
    if (hasItems) {
      const severity = c3.conflictAlert.severity || 'warning';
      const leftColor = severity === 'error' ? COLORS.risk_red : severity === 'warning' ? "#E67E22" : COLORS.safe_green;
      const bgColor = severity === 'error' ? COLORS.risk_red_bg : severity === 'warning' ? "#FEF9E7" : COLORS.safe_green_bg;

      const itemLines = (c3.conflictAlert.items || []).length;
      const extraH = c3.conflictAlert.cost_estimate ? 16 : 0;
      const boxH = 18 + itemLines * 14 + extraH + 12;

      doc.rect(55, doc.y, 5, boxH).fill(leftColor);
      doc.rect(60, doc.y, 480, boxH).fill(bgColor);

      let yy = doc.y + 10;
      const alertTitle = severity === 'warning' ? `⚠️ ${c3.conflictAlert.title || "配置升级提醒"}` : (c3.conflictAlert.title || "配置升级提醒");
      doc.fillColor(leftColor).fontSize(12).text(alertTitle, 70, yy);
      yy += 18;

      (c3.conflictAlert.items || []).forEach((item) => {
        doc.fillColor(COLORS.text_body).fontSize(10).text(`· ${item}`, 70, yy, { width: 460 });
        yy += 14;
      });

      if (c3.conflictAlert.cost_estimate) {
        yy += 2;
        doc.fillColor(leftColor).fontSize(10).text(c3.conflictAlert.cost_estimate, 70, yy, { width: 460 });
        yy += 14;
      }

      doc.y = doc.y + boxH + 12;
    } else if (c3.conflictAlert.noConflictText) {
      const text = String(c3.conflictAlert.noConflictText || '');
      const boxH = 44;
      doc.rect(55, doc.y, 5, boxH).fill(COLORS.safe_green);
      doc.rect(60, doc.y, 480, boxH).fill(COLORS.safe_green_bg);
      doc.fillColor(COLORS.safe_green).fontSize(12).text("✓ 配置兼容性检查", 70, doc.y + 10);
      doc.fillColor(COLORS.text_body).fontSize(10).text(text, 70, doc.y + 26, { width: 460 });
      doc.y = doc.y + boxH + 12;
    }
  }

  // 可选升级项
  drawSectionTitle(doc, "3.4 可选升级项");
  doc.y += 6;
  
  const upgrades = (c3.upgradeOptions && c3.upgradeOptions.items) || [
    { name: "隔音升级+", desc: "Rw基础上+5dB，需三玻两腔", costHint: "+约180元/㎡", stars: 4 },
    { name: "热工升级+", desc: "K值降0.3，需注胶式断桥", costHint: "+约120元/㎡", stars: 3 },
    { name: "安全升级+", desc: "夹胶玻璃+儿童限位器", costHint: "+约80元/㎡", stars: 5 }
  ];
  
  const cardW = (485 - 16) / 3;
  upgrades.forEach((u, i) => {
    const x = 55 + i * (cardW + 8);
    doc.roundedRect(x, doc.y, cardW, 68, 4).stroke(COLORS.brand_blue);
    doc.fillColor(COLORS.brand_navy).fontSize(12).text(u.name, x + 8, doc.y + 8);
    doc.fillColor(COLORS.text_body).fontSize(9).text(u.desc, x + 8, doc.y + 24, { width: cardW - 16 });
    doc.fillColor(COLORS.warn_orange).fontSize(9.5).text(u.costHint, x + 8, doc.y + 48);
    
    const stars = "★".repeat(u.stars || 3) + "☆".repeat(5 - (u.stars || 3));
    doc.fillColor(COLORS.warn_orange).fontSize(9).text(stars, x + cardW - 50, doc.y + 50);
  });
  doc.y += 72;

  if (c3.upgradeOptions && c3.upgradeOptions.l2_entry && c3.upgradeOptions.l2_entry.action) {
    const bg = COLORS.bg_card;
    const fg = COLORS.brand_blue;
    const bY = doc.y;
    doc.rect(55, bY, 485, 42).fill(bg);
    doc.fillColor(fg).fontSize(10).text(c3.upgradeOptions.l2_entry.text || "", 67, bY + 10, { width: 360 });
    doc.roundedRect(442, bY + 9, 86, 24, 4).stroke(fg);
    doc.fillColor(fg).fontSize(10).text(c3.upgradeOptions.l2_entry.action, 460, bY + 15);
    doc.y = bY + 52;
  }
}

function renderPerformanceChecks(doc, checks) {
  if (!Array.isArray(checks) || checks.length === 0) return;
  if (842 - doc.y < 120) doc.addPage();

  doc.fillColor(COLORS.brand_mid).fontSize(11).text("【性能验收】", 55, doc.y);
  doc.y += 14;

  checks.forEach((item) => {
    const num = item.num ? String(item.num) : "";
    const text = item.text ? String(item.text) : "";
    const line = ` · ${num} ${text}`.trimEnd();
    const h = doc.heightOfString(line, { width: 485, lineGap: 2 });
    doc.fillColor(COLORS.text_body).fontSize(10).text(line, 55, doc.y, { width: 485, align: 'left', lineGap: 2 });
    doc.y += h + 6;
  });
  doc.y += 6;
}

function renderRedlineChecklist(doc, checklist) {
  if (!checklist) return;
  const mandatory = Array.isArray(checklist.mandatory) ? checklist.mandatory : [];
  const recommended = Array.isArray(checklist.recommended) ? checklist.recommended : [];
  if (mandatory.length === 0 && recommended.length === 0) return;

  if (842 - doc.y < 180) doc.addPage();
  doc.fillColor(COLORS.brand_mid).fontSize(11).text("── 第三段：红线承诺（必填）──", 55, doc.y);
  doc.y += 16;

  if (mandatory.length > 0) {
    doc.fillColor(COLORS.risk_red).fontSize(10.5).text("⚠️ 强制红线（以下任一项未满足，方案即视为不合格）", 55, doc.y, { width: 485 });
    doc.y += 16;

    mandatory.forEach((item) => {
      const id = item.id ? String(item.id) : "";
      const text = item.text ? String(item.text) : "";
      const line1 = `□ ${id} ${text}`.trimEnd();
      const confirmLine = "    商家确认：□ 满足  □ 不满足（请说明原因：__________）";

      const h1 = doc.heightOfString(line1, { width: 485, lineGap: 2 });
      const h2 = doc.heightOfString(confirmLine, { width: 485, lineGap: 2 });
      const barH = Math.max(12, Math.min(h1, 40));
      doc.rect(51, doc.y + 1, 3, barH + 2).fill(COLORS.risk_red);
      doc.fillColor(COLORS.text_body).fontSize(10).text(line1, 55, doc.y, { width: 485, lineGap: 2 });
      doc.y += h1 + 2;
      doc.fillColor(COLORS.text_secondary).fontSize(9).text(confirmLine, 55, doc.y, { width: 485, lineGap: 2 });
      doc.y += h2 + 10;

      if (842 - doc.y < 80) doc.addPage();
    });
  }

  if (recommended.length > 0) {
    if (842 - doc.y < 120) doc.addPage();
    doc.fillColor(COLORS.brand_mid).fontSize(10.5).text("推荐红线（建议满足，不强制）", 55, doc.y, { width: 485 });
    doc.y += 14;

    recommended.forEach((item) => {
      const id = item.id ? String(item.id) : "";
      const text = item.text ? String(item.text) : "";
      const line1 = `□ ${id} ${text}`.trimEnd();
      const confirmLine = "    商家确认：□ 知悉并同意  □ 不适用";

      const h1 = doc.heightOfString(line1, { width: 485, lineGap: 2 });
      const h2 = doc.heightOfString(confirmLine, { width: 485, lineGap: 2 });
      doc.fillColor(COLORS.text_body).fontSize(10).text(line1, 55, doc.y, { width: 485, lineGap: 2 });
      doc.y += h1 + 2;
      doc.fillColor(COLORS.text_secondary).fontSize(9).text(confirmLine, 55, doc.y, { width: 485, lineGap: 2 });
      doc.y += h2 + 8;

      if (842 - doc.y < 60) doc.addPage();
    });
  }

  if (842 - doc.y < 60) doc.addPage();
  doc.fillColor(COLORS.text_body).fontSize(10.5).text("商家综合确认：□ 以上强制红线全部满足  □ 部分不满足（详见上方说明）", 55, doc.y, { width: 485 });
  doc.y += 20;
}

function renderChapter4(doc, c4) {
  const isRisk = !!c4.isRisk;
  const title = c4.title || "下一步怎么用：问商家什么 & 怎么验收";
  const color = COLORS.brand_navy;
  drawChapterHeader(doc, "第四", title, color);

  if (c4.subtitle) {
    doc.fillColor(COLORS.text_secondary).fontSize(10).text(c4.subtitle, 55, doc.y, { width: 485 });
    doc.y += 18;
  }

  if (c4.intro && c4.intro.items && c4.intro.items.length > 0) {
    drawSectionTitle(doc, c4.intro.title || "使用说明");
    c4.intro.items.forEach((line) => {
      doc.fillColor(COLORS.text_body).fontSize(10).text(line, 55, doc.y, { width: 485 });
      doc.y += 14;
    });
    doc.y += 6;
  }

  if (c4.merchantNotice) {
    drawSectionTitle(doc, c4.merchantNotice.title || "4.1 给商家的说明");
    if (c4.merchantNotice.content) {
      doc.fillColor(COLORS.text_body).fontSize(10).text(c4.merchantNotice.content, 55, doc.y, { width: 485 });
      doc.y += 30;
    }
    if (c4.merchantNotice.deadline) {
      doc.fillColor(COLORS.text_secondary).fontSize(10).text(c4.merchantNotice.deadline, 55, doc.y, { width: 485 });
      doc.y += 18;
    }
  }

  if (c4.acceptance && c4.acceptance.nodes && c4.acceptance.nodes.length > 0) {
    drawSectionTitle(doc, c4.acceptance.title || "4.4 验收节点");
    const nodes = c4.acceptance.nodes;
    nodes.forEach((node) => {
      const nodeTitle = node.title || (node.stage ? `【${node.stage}】` : "【验收节点】");
      doc.fillColor(COLORS.brand_mid).fontSize(11).text(nodeTitle, 55, doc.y);
      doc.y += 15;
      (node.items || []).forEach((item) => {
        doc.fillColor(COLORS.text_body).fontSize(10).text(` · ${item}`, 65, doc.y, { width: 475 });
        doc.y += 12;
      });
      doc.y += 5;
      if (842 - doc.y < 80) doc.addPage();
    });
    doc.y += 6;
  }

  renderPerformanceChecks(doc, c4.performanceChecks);

  const mq = c4.merchantQuestionnaire || {};
  if (mq.title) {
    drawSectionTitle(doc, mq.title);
    if (mq.subtitle) {
      doc.fillColor(COLORS.text_secondary).fontSize(10).text(mq.subtitle, 55, doc.y, { width: 485 });
      doc.y += 18;
    }

    if (mq.section1 && mq.section1.title) {
      doc.fillColor(COLORS.brand_mid).fontSize(11).text(mq.section1.title, 55, doc.y);
      doc.y += 16;
      const fields = Array.isArray(mq.section1.fields) ? mq.section1.fields : [];
      fields.forEach((f) => {
        if (f.type === 'checkbox') {
          const opts = Array.isArray(f.options) ? f.options.join(' / ') : '';
          doc.fillColor(COLORS.text_body).fontSize(10).text(`${f.label}：□ ${opts}`, 55, doc.y, { width: 485 });
        } else {
          doc.fillColor(COLORS.text_body).fontSize(10).text(`${f.label}（${f.placeholder || ""}）：________________________`, 55, doc.y, { width: 485 });
        }
        doc.y += 14;
      });
      doc.y += 6;
    }

    if (mq.section2 && mq.section2.title) {
      if (842 - doc.y < 220) doc.addPage();
      doc.fillColor(COLORS.brand_mid).fontSize(11).text(mq.section2.title, 55, doc.y);
      doc.y += 14;
      if (mq.section2.hint) {
        doc.fillColor(COLORS.text_secondary).fontSize(10).text(mq.section2.hint, 55, doc.y, { width: 485 });
        doc.y += 14;
      }

      const columns = Array.isArray(mq.section2.columns) ? mq.section2.columns : [];
      const cols = [
        { h: columns[0] || "品牌及系列", w: 86 },
        { h: columns[1] || "型材壁厚(mm)", w: 60 },
        { h: columns[2] || "玻璃配置", w: 82 },
        { h: columns[3] || "检测报告编号", w: 80 },
        { h: columns[4] || "含税报价(元/㎡)", w: 58 },
        { h: columns[5] || "工期(天)", w: 38 },
        { h: columns[6] || "质保(年)", w: 38 },
        { h: columns[7] || "签名确认", w: 43 }
      ];

      const rowH = 28;
      const tableY = doc.y;

      let x = 55;
      cols.forEach((col) => {
        doc.rect(x, tableY, col.w, 22).fill(COLORS.brand_navy);
        doc.fillColor("#FFFFFF").fontSize(9).text(col.h, x + 4, tableY + 6, { width: col.w - 8, align: "center" });
        x += col.w;
      });

      for (let row = 0; row < 4; row++) {
        const y = tableY + 22 + row * rowH;
        x = 55;
        cols.forEach((col, idx) => {
          const bg = idx === 0 ? "#F2F2F2" : (row % 2 === 0 ? "#F7F9FC" : "#FFFFFF");
          doc.rect(x, y, col.w, rowH).fill(bg).stroke(COLORS.border);

          if (idx === 0) {
            doc.fillColor(COLORS.text_light).fontSize(9).text("请填写", x + 4, y + 9, { width: col.w - 8, align: "center" });
          } else {
            doc.moveTo(x + 5, y + rowH - 6).lineTo(x + col.w - 5, y + rowH - 6)
              .dash(2, { space: 3 }).lineWidth(0.4).stroke("#CCCCCC");
            doc.undash().lineWidth(1);
          }

          x += col.w;
        });
      }

      doc.y = tableY + 22 + 4 * rowH + 8;
      if (mq.section2.note) {
        doc.fillColor(COLORS.text_light).fontSize(9).text(mq.section2.note, 55, doc.y, { width: 485 });
        doc.y += 16;
      } else {
        doc.y += 6;
      }
    }

    renderRedlineChecklist(doc, c4.redlineChecklist);

    if (mq.section3 && mq.section3.title) {
      if (842 - doc.y < 140) doc.addPage();
      doc.fillColor(COLORS.brand_mid).fontSize(11).text(mq.section3.title, 55, doc.y);
      doc.y += 16;
      const qs = Array.isArray(mq.section3.questions) ? mq.section3.questions : [];
      qs.forEach((q) => {
        doc.fillColor(COLORS.text_body).fontSize(10).text(q, 55, doc.y, { width: 485 });
        doc.y += 24;
      });
      doc.y += 6;
    }

    if (mq.signature && mq.signature.text) {
      doc.fillColor(COLORS.text_secondary).fontSize(10).text(mq.signature.text, 55, doc.y, { width: 485 });
      doc.y += 16;
      const fields = Array.isArray(mq.signature.fields) ? mq.signature.fields : [];
      fields.forEach((f) => {
        doc.fillColor(COLORS.text_body).fontSize(10).text(`${f}：________________________`, 55, doc.y, { width: 485 });
        doc.y += 14;
      });
      doc.y += 8;
    }
  }

  if (c4.l2_entry && c4.l2_entry.action) {
    const bg = isRisk ? COLORS.risk_red_lt : COLORS.safe_green_bg;
    const fg = isRisk ? COLORS.risk_red : COLORS.safe_green;
    const bY = doc.y;
    doc.rect(55, bY, 485, 42).fill(bg);

    const mainText = isRisk ? c4.l2_entry.risk_text : c4.l2_entry.normal_text;
    doc.fillColor(fg).fontSize(10).text(mainText, 67, bY + 10, { width: 380 });
    doc.roundedRect(442, bY + 9, 86, 24, 4).fill(fg);
    doc.fillColor("#FFFFFF").fontSize(10).text(c4.l2_entry.action, 448, bY + 15);
    doc.y = bY + 52;
  }

  if (c4.risks && c4.risks.items && c4.risks.items.length > 0) {
    drawSectionTitle(doc, c4.risks.title || "4.3 风险提示");
    c4.risks.items.forEach((risk) => {
      const boxH = risk.question ? 86 : 65;
      doc.rect(55, doc.y, 5, boxH).fill(COLORS.risk_red);
      doc.rect(60, doc.y, 480, boxH).fill(COLORS.risk_red_bg);
      doc.fillColor(COLORS.risk_red).fontSize(12).text(`⚠️ ${risk.title}`, 70, doc.y + 8);
      doc.fillColor(COLORS.text_body).fontSize(10).text(risk.desc, 70, doc.y + 26, { width: 460 });
      const suggestLine = `→ ${risk.suggest}` + (risk.question ? `\n→ 要问商家的问题：${risk.question}` : "");
      doc.fillColor(COLORS.brand_mid).fontSize(10).text(suggestLine, 70, doc.y + 44, { width: 460 });
      doc.y += boxH + 10;
    });
  }
}

function renderAttachments(doc, attachments) {
  if (!attachments || !attachments.photos || attachments.photos.length === 0) return;
  doc.addPage();
  drawChapterHeader(doc, "附件", "现场照片", COLORS.brand_navy);
  
  // 2x2 网格占位
  doc.fillColor(COLORS.text_secondary).fontSize(10)
    .text(`共 ${attachments.photos.length} 张照片（照片将在实现后显示）`, 55, doc.y);
}

function addFooters(doc, disclaimer) {
  const range = doc.bufferedPageRange();
  const dateText = new Date().toLocaleString('zh-CN', { hour12: false });
  const footerText = {
    short: (d) => `本文件由李Sir门窗技术顾问系统自动生成，仅供参考。生成时间：${d}`,
    full: (d) => [
      '以上价格区间基于一线城市市场水平，二三线城市实际采购成本可能降低15-25%。',
      '玻璃配置推荐基于声学/热工/安全三维约束自动计算，商家可提供等效替代方案并附检测报告。',
      `本文件生成时间：${d} 本文件由李Sir门窗技术顾问系统基于用户填写信息自动生成，仅供参考，不构成正式法律合同。`
    ]
  };
  
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    const isLast = (i === range.count - 1);
    doc.moveTo(55, 782).lineTo(540, 782).stroke(COLORS.border);

    if (isLast) {
      const lines = footerText.full(dateText);
      doc.fillColor(COLORS.text_light).fontSize(7).text(lines[0], 55, 788, { width: 420 });
      doc.fillColor(COLORS.text_light).fontSize(7).text(lines[1], 55, 798, { width: 420 });
      doc.fillColor(COLORS.text_light).fontSize(7).text(lines[2], 55, 808, { width: 420 });
    } else {
      doc.fillColor(COLORS.text_light).fontSize(7).text(footerText.short(dateText), 55, 804, { width: 420 });
    }

    doc.fillColor(COLORS.text_secondary).fontSize(8).text(`${i + 1} / ${range.count}`, 502, 804);
  }
}

async function buildPDF(sections, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true });
      const stream = fs.createWriteStream(outputPath);
      
      stream.on('error', reject);
      doc.pipe(stream);
      
      doc.registerFont("SourceHanSans", getFontBuffer());
      doc.font("SourceHanSans").fillColor(COLORS.text_body);
      
      renderCover(doc, sections.cover);
      doc.addPage(); renderChapter1(doc, sections.chapter1);
      doc.addPage(); renderChapter2(doc, sections.chapter2);
      doc.addPage(); renderChapter3(doc, sections.chapter3);
      doc.addPage(); renderChapter4(doc, sections.chapter4);
      
      if (sections.attachments && sections.attachments.photos && sections.attachments.photos.length > 0) {
        renderAttachments(doc, sections.attachments);
      }
      
      addFooters(doc, sections.cover.disclaimer);
      
      doc.end();
      
      stream.on('finish', () => resolve());
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { buildPDF };
