const PDFDocument = require('pdfkit');
const fs = require('fs');

// 免责声明段落
const DISCLAIMER_PARAGRAPHS = [
  '本招标文件由"不卖窗的李sir·门窗诊断系统"依据您填写的信息自动生成，仅供采购沟通与技术参考使用，不构成任何法律合同或承诺。',
  '文中提及的标准条文引用、性能参数建议及预算区间，均基于生成时的现行规范和一般工程经验，不保证在任何时间、任何项目情形下均完全适用；如有差异，应以实际勘察及具有相应资质的专业机构意见为准。',
  '本系统不代表任何品牌或商家利益，亦不参与具体采购、报价或施工，对商家报价及施工质量不承担保证或连带责任。',
  '如需进一步了解本文件所涉技术内容，可通过"不卖窗的李sir"官方渠道咨询。'
];

let fontBuffer = null;
function getFontBuffer() {
  if (!fontBuffer) {
    fontBuffer = fs.readFileSync('./font-subset.otf'); // 使用126KB子集字体
  }
  return fontBuffer;
}

async function buildPDF(sections, outputPath, pdfNo) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 55, info: {
        Title: `门窗技术招标文件 ${pdfNo}`,
        Author: '李Sir·门窗技术顾问'
      }});

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // 页面尺寸与边距常量
      const marginLeft = 55;
      const marginRight = 55;
      const pageWidth = 612;

      doc.registerFont('SourceHanSans', getFontBuffer());
      doc.font('SourceHanSans');
      
      // 封面
      renderCover(doc, sections.cover, pdfNo);
      
      // 四章内容
      doc.addPage(); renderChapter1(doc, sections.chapter1);
      doc.addPage(); renderChapter2(doc, sections.chapter2);
      doc.addPage(); renderChapter3(doc, sections.chapter3);
      doc.addPage(); renderChapter4(doc, sections.chapter4);
      
      if (sections.attachments?.photos?.length > 0) {
        doc.addPage(); renderAttachments(doc, sections.attachments);
      }

      drawDisclaimerSection(doc, marginLeft, marginRight, pageWidth);

      addFootersToAllPages(doc);

      doc.end();
      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    } catch (err) { reject(err); }
  });
}

function renderCover(doc, cover, pdfNo) {
  doc.fontSize(24).fillColor('#1A2E6B').text('门窗系统技术招标文件', 50, 100);
  doc.fontSize(14).fillColor('#666666').text(`编号：${pdfNo}`, 50, 140);
  doc.fontSize(12).text(`生成日期：${new Date().toLocaleDateString('zh-CN')}`, 50, 160);
  
  if (cover.city) {
    doc.rect(50, 200, 120, 30).fill('#EEF3FF');
    doc.fillColor('#1A2E6B').fontSize(11).text(cover.city, 60, 208);
  }
  if (cover.degraded) {
    doc.rect(50, 250, 450, 40).fill('#FEE2E2');
    doc.fillColor('#DC2626').fontSize(10).text(`⚠️ ${cover.degraded_msg}`, 60, 260);
  }
}

function renderChapter1(doc, ch) {
  doc.fontSize(18).fillColor('#1A2E6B').text('第一章 项目概况与需求分析', 0, 50);
  doc.moveDown();
  
  doc.fontSize(14).fillColor('#000000').text('1.1 项目基本信息');
  doc.fontSize(11).fillColor('#333333');
  doc.text(`城市：${ch.city || '未填写'} | 气候区：${ch.climate_zone || '未知'}`);
  doc.text(`楼层：第${ch.floor || '?'}层 / 共${ch.total_floors || '?'}层`);
  
  if (ch.pain_point) {
    doc.moveDown();
    const labels = { sound: '隔声优先', heat: '隔热优先', wind: '防风防水', safety: '安全防护' };
    doc.rect(doc.x, doc.y, 80, 20).fill('#FED7AA');
    doc.fillColor('#9A3412').fontSize(10).text(labels[ch.pain_point], doc.x + 5, doc.y - 15);
  }
}

function renderChapter2(doc, ch) {
  doc.fontSize(18).fillColor('#1A2E6B').text('第二章 技术参数与性能指标', 0, 50);
  doc.moveDown();
  
  doc.fontSize(14).text('2.1 抗风压性能');
  doc.fontSize(20).fillColor('#2E86C1').text(`${ch.P3 || '0.0'} kPa`, 100, doc.y);
  
  doc.moveDown();
  doc.fontSize(14).fillColor('#000000').text('2.2 隔声性能');
  doc.fontSize(20).fillColor(ch.priority === 'sound' ? '#D97706' : '#2E86C1').text(`${ch.Rw || '0'} dB`);
  if (ch.priority === 'sound') doc.fontSize(10).fillColor('#D97706').text('★ 核心指标');
  
  doc.moveDown();
  doc.fontSize(14).fillColor('#000000').text('2.3 热工性能');
  doc.fontSize(11).fillColor('#333333');
  doc.text(`K ≤ ${ch.K || '0.0'} W/(㎡·K) | SHGC ≤ ${ch.SHGC || '0.00'}`);
  if (ch.shgc_note) doc.fontSize(10).fillColor('#DC2626').text(ch.shgc_note);
  
  if (ch.conflict_notes?.length > 0) {
    doc.moveDown();
    doc.rect(doc.x, doc.y, 450, ch.conflict_notes.length * 20 + 10).fill('#FEF3C7');
    ch.conflict_notes.forEach((note, idx) => {
      doc.fillColor('#92400E').fontSize(10).text(`⚠️ ${note}`, doc.x + 5, doc.y - (ch.conflict_notes.length - idx) * 15);
    });
  }
}

function renderChapter3(doc, ch) {
  doc.fontSize(18).fillColor('#1A2E6B').text('第三章 产品配置与预算方案', 0, 50);
  doc.moveDown();
  
  const spec = ch.budget_spec || {};
  doc.fontSize(14).text(`3.1 ${spec.label || '舒适型'}配置方案`);
  doc.fontSize(11);
  doc.text(`型材：${spec.frame || ''}`);
  doc.text(`玻璃：${spec.glass || ''}`);
  doc.text(`价格区间：${spec.price || ''} 元/㎡`);
}

function renderChapter4(doc, ch) {
  doc.fontSize(18).fillColor('#1A2E6B').text('第四章 风险提示与验收节点', 0, 50);
  doc.moveDown();
  
  if (ch.is_risk) {
    doc.save().rotate(-45, { origin: [297, 421] });
    doc.restore();
    
    doc.fontSize(14).fillColor('#DC2626').text('风险提示');
    doc.fontSize(11).text('您的配置存在潜在风险，建议人工复核');
  } else {
    doc.fontSize(14).fillColor('#15803D').text('专家建议');
    doc.fontSize(11).text('您的方案已达基本标准，如需验证商家执行是否达标，可咨询李Sir');
  }
  
  doc.moveDown();
  doc.fontSize(14).text('4.1 商家响应要求');
  doc.fontSize(11).text(`请于${ch.deadline_text || '15个工作日'}内提交响应表`);
}

function renderAttachments(doc, attachments) {
  doc.fontSize(18).fillColor('#1A2E6B').text('附件：现场照片', 0, 50);
  doc.fontSize(11).text('照片列表占位（实际需下载图片后嵌入）');
}

function drawDisclaimerSection(doc, marginLeft, marginRight, pageWidth) {
  doc.moveDown(1.5);
  const y = doc.y;
  doc.moveTo(marginLeft, y)
     .lineTo(pageWidth - marginRight, y)
     .strokeColor('#CCCCCC')
     .lineWidth(0.5)
     .stroke();
  doc.moveDown(0.5);
  doc.font('SourceHanSans').fontSize(8).fillColor('#888888').text('【免责声明】');
  doc.moveDown(0.3);
  doc.font('SourceHanSans').fontSize(7.5);
  DISCLAIMER_PARAGRAPHS.forEach(p => {
    doc.text(p, { lineGap: 4 });
    doc.moveDown(0.3);
  });
}

function addFootersToAllPages(doc) {
  const pages = doc.bufferedPageRange();
  for (let i = pages.start; i < pages.start + pages.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).fillColor('#999999');
    doc.text('本文件由李Sir门窗技术顾问系统基于用户填写信息自动生成，仅供参考，不构成法律文书。', 50, 750, { width: 500, align: 'center' });
  }
}

module.exports = { buildPDF };
