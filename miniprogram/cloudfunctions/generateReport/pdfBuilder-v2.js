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
  doc.rect(55, y, 36, 28).fill(color);
  doc.fillColor("#FFFFFF").fontSize(12).text(num, 55, y + 8, { width: 36, align: "center" });
  doc.fillColor(color).fontSize(18).text(` ${title}`, 91, y + 5);
  doc.moveTo(55, y + 30).lineTo(540, y + 30).lineWidth(1.5).stroke(color);
  doc.y = y + 40;
}

function drawSectionTitle(doc, title) {
  doc.fillColor(COLORS.brand_mid).fontSize(14).text(title, 55, doc.y);
  doc.y += 20;
}

// 各章渲染函数
function renderCover(doc, cover) {
  // 安全回退
  const city = cover.city || '未知城市';
  const climate = cover.climateLabel || '气候区待确认';
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
  
  // 主标题（移除字符间空格，避免字体缺失空格导致□）
  doc.fillColor("#FFFFFF").fontSize(24)
    .text("门窗技术招标文件", 55, 108, { width: 485, align: "center" });
  
  // 文件编号（使用半角符号，避免全角符号缺失）
  doc.fontSize(12)
    .text(`文件编号: ${pdfNo}    签发日期: ${issueDate}`, 55, 148, { width: 485, align: "center" });
  
  // 项目信息卡
  doc.roundedRect(55, 172, 485, 78, 6).fill("#FFFFFF");
  doc.fillColor(COLORS.text_body).fontSize(10.5)
    .text(`${city}${cover.district ? " " + cover.district : ""} · ${climate}`, 69, 186)
    .text(floorDesc, 69, 204);
  
  // 痛点徽章（计算宽度避免溢出）
  const painTag = cover.painTag || '综合需求';
  const badgeW = painTag.length * 10 + 20;
  doc.roundedRect(69, 224, Math.min(badgeW, 100), 20, 3).fill(COLORS.warn_orange);
  doc.fillColor("#FFFFFF").fontSize(9)
    .text(painTag, 73, 230);
  
  // 安全标记
  if (cover.hasSafety) {
    doc.roundedRect(69 + Math.min(badgeW, 100) + 8, 224, 96, 20, 3).fill(COLORS.risk_red);
    doc.fillColor("#FFFFFF").fontSize(9)
      .text("含安全专项条款", 73 + Math.min(badgeW, 100) + 8, 230);
  }
  
  // 白色内容区
  doc.rect(0, 290, 595, 552).fill("#FFFFFF");
  
  // 签发人（绝对定位，避免与页脚冲突）
  doc.fillColor(COLORS.text_body).fontSize(10.5)
    .text("签发人: 李Sir · 门窗技术顾问", 55, 780, { width: 485, align: "right" });
}

function renderChapter1(doc, c1) {
  drawChapterHeader(doc, "第一", "项目概况与需求分析", COLORS.brand_navy);
  
  drawSectionTitle(doc, "1.1 项目基本信息");
  const cardY = doc.y;
  doc.roundedRect(55, cardY, 485, 78, 6).fill(COLORS.bg_card);
  doc.fillColor(COLORS.text_body).fontSize(10.5)
    .text(`城市：${c1.city} ${c1.district || ""}`, 69, cardY + 14)
    .text(`气候区：${c1.climateLabel}`, 297, cardY + 14)
    .text(`楼层：${c1.floorDesc}`, 69, cardY + 32)
    .text(`取暖：${c1.heatingDesc}`, 297, cardY + 32)
    .text(`家庭：${c1.familyDesc}`, 69, cardY + 50);
  doc.y = cardY + 85;

  drawSectionTitle(doc, "1.2 需求分析");
  doc.fillColor(COLORS.text_body).fontSize(10.5)
    .text(c1.analysisPara, 55, doc.y, { width: 485, align: "justify", lineGap: 5 });
  doc.y += 50;

  if (c1.noise && c1.noise.show) {
    drawSectionTitle(doc, "1.3 环境评估");
    const n = c1.noise;
    doc.fillColor(COLORS.text_body).fontSize(10.5).text(`噪音源：${n.typeLabel}`, 55, doc.y + 2);
    
    const KEYS = ["lt20", "20to50", "gt50"];
    const LABELS = ["近(<20m)", "中(20-50m)", "远(>50m)"];
    const active = KEYS.indexOf(n.distKey);
    
    for (let i = 0; i < 3; i++) {
      const x = 165 + i * 84;
      doc.rect(x, doc.y, 80, 14).fill(i <= active ? COLORS.warn_orange : COLORS.border);
      doc.fillColor(i <= active ? "#FFFFFF" : COLORS.text_secondary).fontSize(9).text(LABELS[i], x + 4, doc.y + 3);
    }
    doc.fillColor(COLORS.text_secondary).fontSize(9).text(`评级：${n.levelLabel}`, 165, doc.y + 18);
    doc.y += 35;
  }
}

function renderChapter2(doc, c2) {
  drawChapterHeader(doc, "第二", "技术参数与性能指标", COLORS.brand_navy);
  
  drawSectionTitle(doc, "2.1-2.3 性能指标（三项硬性门槛）");
  const cardW = (485 - 20) / 3;
  const cardH = 88;
  const startY = doc.y;
  const metrics = c2.metrics || [];
  
  metrics.forEach((m, i) => {
    const x = 55 + i * (cardW + 10);
    const bg = m.isCore ? COLORS.warn_orange_bg : COLORS.bg_card;
    doc.roundedRect(x, startY, cardW, cardH, 5).fill(bg);
    
    if (m.isCore) {
      doc.rect(x, startY, 4, cardH).fill(COLORS.warn_orange);
      doc.fillColor(COLORS.warn_orange).fontSize(9).text("★ 核心指标", x + 8, startY + 5);
    }
    
    const tx = x + (m.isCore ? 8 : 10);
    const ty = m.isCore ? startY + 20 : startY + 10;
    
    doc.fillColor(COLORS.text_secondary).fontSize(9).text(m.name, tx, ty);
    doc.fillColor(COLORS.brand_navy).fontSize(22).text(m.value, tx, ty + 13);
    doc.fillColor(COLORS.text_secondary).fontSize(11).text(m.unit, x + cardW - 35, ty + 15);
    doc.fillColor(COLORS.text_secondary).fontSize(9).text(m.level, tx, ty + 44);
    doc.fillColor(COLORS.text_light).fontSize(8).text(m.std, tx, ty + 58);
  });
  doc.y = startY + cardH + 25;

  // 产品红线
  drawSectionTitle(doc, "2.4 产品红线");
  const rl = c2.redLines || { forbidden: [], safetyItems: [] };
  const forbidden = rl.forbidden || [];
  const safetyItems = rl.safetyItems || [];
  const boxH = 20 + forbidden.length * 16 + (safetyItems.length > 0 ? 40 : 0) + 10;
  
  doc.rect(55, doc.y, 5, boxH).fill(COLORS.risk_red);
  doc.rect(60, doc.y, 480, boxH).fill(COLORS.risk_red_bg);
  
  let ry = doc.y + 10;
  doc.fillColor(COLORS.risk_red).fontSize(12).text("明确禁止项", 70, ry);
  ry += 18;
  
  forbidden.forEach(item => {
    doc.fillColor(COLORS.text_body).fontSize(10.5).text(`✗ ${item}`, 76, ry);
    ry += 16;
  });
  
  if (safetyItems.length > 0) {
    ry += 6;
    doc.fillColor(COLORS.risk_red).fontSize(9).text("◆ 安全专项条款", 70, ry);
    ry += 16;
    safetyItems.forEach(item => {
      doc.fillColor(COLORS.text_body).fontSize(10.5).text(`🛡 ${item}`, 76, ry);
      ry += 16;
    });
  }
  
  if (rl.safetyBudgetWarning) {
    doc.fillColor(COLORS.warn_orange).fontSize(9).text(rl.safetyBudgetWarning, 76, ry);
  }
  
  doc.y += boxH + 15;

  // 配置表
  const spec = c2.budgetSpec || { label: "舒适型 B档", profile: "", glass: "", hardware: "", seal: "" };
  drawSectionTitle(doc, `2.5 推荐配置参考（${spec.label}）`);
  
  const rows = [
    ["型材", spec.profile || "断桥铝，壁厚≥1.6mm"],
    ["玻璃", spec.glass || "5Low-E+12Ar+5 中空充氩气"],
    ["五金", spec.hardware || "多点锁传动，铰链负载≥80kg"],
    ["密封", spec.seal || "EPDM三元乙丙胶条，2道密封"]
  ];
  
  rows.forEach(([label, value], i) => {
    const y = doc.y + i * 22;
    const bg = i % 2 === 0 ? COLORS.bg_card : "#FFFFFF";
    doc.rect(55, y, 68, 22).fill(COLORS.brand_navy);
    doc.rect(123, y, 417, 22).fill(bg);
    doc.fillColor("#FFFFFF").fontSize(9.5).text(label, 63, y + 7);
    doc.fillColor(COLORS.text_body).fontSize(10.5).text(value, 133, y + 6);
  });
  doc.y += rows.length * 22 + 20;
}

function renderChapter3(doc, c3) {
  drawChapterHeader(doc, "第三", "产品配置与预算方案", COLORS.brand_navy);
  
  const spec = c3.budgetSpec || { label: "舒适型 B档" };
  drawSectionTitle(doc, `3.1 推荐配置方案（${spec.label}）`);
  
  // 配置表（复用第二章数据）
  const rows = [
    ["型材", spec.profile || "断桥铝，壁厚≥1.6mm"],
    ["玻璃", spec.glass || "5Low-E+12Ar+5"],
    ["五金", spec.hardware || "多点锁传动"],
    ["密封", spec.seal || "EPDM胶条，2道密封"]
  ];
  
  rows.forEach(([label, value], i) => {
    const y = doc.y + i * 22;
    doc.rect(55, y, 68, 22).fill(COLORS.brand_navy);
    doc.rect(123, y, 417, 22).fill(i % 2 === 0 ? COLORS.bg_card : "#FFFFFF");
    doc.fillColor("#FFFFFF").fontSize(9.5).text(label, 63, y + 7);
    doc.fillColor(COLORS.text_body).fontSize(10.5).text(value, 133, y + 6);
  });
  doc.y += rows.length * 22 + 25;

  // 价格横条图
  drawSectionTitle(doc, "3.2 预算档位对比");
  const tiers = c3.tiers || [
    { key: "A", label: "经济实用 A档", priceRange: "600-800元/㎡", barRatio: 0.35 },
    { key: "B", label: "舒适均衡 B档", priceRange: "800-1200元/㎡", barRatio: 0.55 },
    { key: "C", label: "品质进阶 C档", priceRange: "1200-1800元/㎡", barRatio: 0.75 },
    { key: "D", label: "定制高端 D档", priceRange: "1800+元/㎡", barRatio: 1.0 }
  ];
  const currentTier = c3.currentTier || "B";
  
  const barMaxW = 280;
  let y = doc.y;
  
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
    
    y += 24;
  });
  
  doc.fillColor(COLORS.text_light).fontSize(9)
    .text("* 价格为市场参考值（元/㎡），差异>30%时谨慎选择最低价", 55, y + 5);
  doc.y = y + 25;

  // 可选升级项
  drawSectionTitle(doc, "3.3 可选升级项");
  doc.fillColor(COLORS.text_secondary).fontSize(10)
    .text("以下升级项未包含在当前标准中，如需评估哪项性价比最高，可咨询李Sir →", 55, doc.y, { width: 485 });
  doc.y += 25;
  
  const upgrades = c3.upgrades || [
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
  doc.y += 78;
}

function renderChapter4(doc, c4) {
  const isRisk = c4.isRisk;
  const color = isRisk ? COLORS.risk_red : COLORS.safe_green;
  const title = isRisk ? "风险提示与专家建议" : "验收节点与优化建议";
  
  drawChapterHeader(doc, "第四", title, color);
  
  // 风险提示或优化建议
  if (isRisk && c4.risks && c4.risks.length > 0) {
    drawSectionTitle(doc, "风险提示（须重点关注）");
    c4.risks.forEach(risk => {
      const boxH = 65;
      doc.rect(55, doc.y, 5, boxH).fill(COLORS.risk_red);
      doc.rect(60, doc.y, 480, boxH).fill(COLORS.risk_red_bg);
      
      doc.fillColor(COLORS.risk_red).fontSize(12).text(`⚠️ ${risk.title}`, 70, doc.y + 8);
      doc.fillColor(COLORS.text_body).fontSize(10).text(risk.desc, 70, doc.y + 26, { width: 460 });
      doc.fillColor(COLORS.brand_mid).fontSize(10).text(`→ ${risk.suggest}`, 70, doc.y + 44, { width: 460 });
      doc.y += boxH + 10;
    });
  } else if (c4.optimizations && c4.optimizations.length > 0) {
    drawSectionTitle(doc, "优化建议");
    c4.optimizations.forEach(opt => {
      doc.fillColor(COLORS.safe_green).fontSize(11).text(`💡 ${opt.title}`, 55, doc.y);
      doc.fillColor(COLORS.text_body).fontSize(10).text(opt.desc, 55, doc.y + 15, { width: 485 });
      doc.y += 35;
    });
  }
  
  // 验收节点
  drawSectionTitle(doc, "验收节点");
  const nodes = c4.acceptanceNodes || [
    { stage: "进场验收", items: ["核查铭牌型号", "索取检测报告", "核查玻璃配置"] },
    { stage: "安装验收", items: ["发泡剂填充", "打胶宽度≥8mm"] },
    { stage: "竣工验收", items: ["烟雾笔气密检测", "淋水测试3分钟"] }
  ];
  
  nodes.forEach(node => {
    doc.fillColor(COLORS.brand_mid).fontSize(11).text(`【${node.stage}】`, 55, doc.y);
    doc.y += 15;
    node.items.forEach(item => {
      doc.fillColor(COLORS.text_body).fontSize(10).text(` · ${item}`, 65, doc.y);
      doc.y += 12;
    });
    doc.y += 5;
  });
  
  // L2 转化植入
  const bg = isRisk ? COLORS.risk_red_lt : COLORS.safe_green_bg;
  const fg = isRisk ? COLORS.risk_red : COLORS.safe_green;
  const bY = doc.y;
  doc.rect(55, bY, 485, 42).fill(bg);
  
  const mainText = isRisk 
    ? "如需李Sir评审商家响应方案是否真正满足以上标准（商家很会说，不一定能做到）→"
    : "您的方案已达基本标准，如需李Sir优化方案性价比 →";
  
  doc.fillColor(fg).fontSize(10).text(mainText, 67, bY + 10, { width: 380 });
  doc.roundedRect(442, bY + 9, 86, 24, 4).fill(fg);
  doc.fillColor("#FFFFFF").fontSize(10).text("预约深度审计 →", 448, bY + 15);
  doc.y = bY + 52;
  
  // 商家响应表
  if (842 - doc.y < 200) doc.addPage();
  drawSectionTitle(doc, "商家响应要求");
  doc.fillColor(COLORS.text_body).fontSize(10)
    .text(`${c4.deadlineText || "请于14个工作日内"}将本表填写完整后返回业主，作为正式报价响应凭证。`, 55, doc.y);
  doc.y += 20;
  
  // 表格
  const cols = [
    { h: "品牌及系列", w: 82 }, { h: "型材壁厚(mm)", w: 60 }, { h: "玻璃配置", w: 80 },
    { h: "检测报告编号", w: 82 }, { h: "含税报价(元)", w: 58 }, { h: "工期(天)", w: 38 },
    { h: "质保(年)", w: 38 }, { h: "签字盖章", w: 47 }
  ];
  
  const rowH = 28;
  const tableY = doc.y;
  
  // 表头
  let x = 55;
  cols.forEach(col => {
    doc.rect(x, tableY, col.w, 22).fill(COLORS.brand_navy);
    doc.fillColor("#FFFFFF").fontSize(9).text(col.h, x + 5, tableY + 6, { width: col.w - 10 });
    x += col.w;
  });
  
  // 数据行（4行）
  for (let row = 0; row < 4; row++) {
    const y = tableY + 22 + row * rowH;
    x = 55;
    cols.forEach(col => {
      const bg = row % 2 === 0 ? "#F7F9FC" : "#FFFFFF";
      doc.rect(x, y, col.w, rowH).fill(bg).stroke(COLORS.border);
      // 底部虚线（除签章列）
      if (col.h !== "签字盖章") {
        doc.moveTo(x + 5, y + rowH - 6).lineTo(x + col.w - 5, y + rowH - 6)
          .dash(2, { space: 3 }).lineWidth(0.4).stroke("#CCCCCC");
        doc.undash();
      }
      x += col.w;
    });
  }
  
  doc.fillColor(COLORS.text_light).fontSize(9)
    .text("请商家填写完整后加盖公章或签字，扫描/拍照发送业主。", 55, tableY + 22 + 4 * rowH + 8);
  doc.y += 30;
}

function renderAttachments(doc, attachments) {
  if (!attachments || !attachments.photos || attachments.photos.length === 0) return;
  doc.addPage();
  drawChapterHeader(doc, "附件", "现场照片", COLORS.brand_navy);
  
  // 2x2 网格占位
  doc.fillColor(COLORS.text_secondary).fontSize(10)
    .text(`共 ${attachments.photos.length} 张照片（照片将在实现后显示）`, 55, doc.y);
}

function renderWatermark(doc, isRisk) {
  const text = isRisk ? "RISK" : "STANDARD";
  const color = isRisk ? COLORS.risk_red : COLORS.safe_green;
  const range = doc.bufferedPageRange();
  
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.save();
    doc.rotate(45, { origin: [297, 421] });
    doc.fillColor(color, 0.08).fontSize(60).text(text, 40, 360);
    doc.restore();
  }
}

function addFooters(doc, disclaimer) {
  const range = doc.bufferedPageRange();
  const shortDisc = (disclaimer || "").slice(0, 55) + "...";
  
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.moveTo(55, 790).lineTo(540, 790).stroke(COLORS.border);
    doc.fillColor(COLORS.text_light).fontSize(8).text(shortDisc, 55, 798);
    doc.fillColor(COLORS.text_secondary).fontSize(8).text(`${i + 1} / ${range.count}`, 502, 798);
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
      
      renderWatermark(doc, sections.cover.isRisk);
      addFooters(doc, sections.cover.disclaimer);
      
      doc.end();
      
      stream.on('finish', () => resolve());
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { buildPDF };
