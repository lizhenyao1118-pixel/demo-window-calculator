const pdf = require('pdf-parse');
const fs = require('fs');

const pdfPath = './full-case-v408.pdf';
const dataBuffer = fs.readFileSync(pdfPath);

pdf(dataBuffer).then(data => {
  const text = data.text;
  const pages = text.split(/\f/); // Form feed character separates pages
  
  console.log('=== PDF 文本提取 ===');
  console.log('总页数:', pages.length);
  console.log('');
  
  // 第1页 - 封面
  console.log('=== 第1页（封面）===');
  const page1 = pages[0] || '';
  const has4Chapters = page1.includes('本文件共4章');
  const has4ChaptersOld = page1.includes('本文件共四章');
  console.log('包含"本文件共4章":', has4Chapters ? '✓ YES' : '✗ NO');
  console.log('包含"本文件共四章"（旧版）:', has4ChaptersOld ? '✗ YES (错误!)' : '✓ NO (正确)');
  console.log('');
  
  // 查找第三章相关内容
  console.log('=== 第三章相关内容 ===');
  for (let i = 0; i < Math.min(pages.length, 6); i++) {
    const page = pages[i] || '';
    if (page.includes('第三') && page.includes('本案采购红线清单')) {
      console.log(`第${i+1}页包含第三章标题`);
      const has31 = page.includes('3.1') || page.includes('3.1 禁止项');
      console.log('  同页包含3.1节:', has31 ? '✓ YES' : '✗ NO (可能跨页)');
    }
  }
  console.log('');
  
  // 检查风险提示措辞
  console.log('=== 风险提示措辞检查 ===');
  const fullText = text;
  const badPhrases = [
    '建议预约李Sir到场监督竣工验收',
    '建议升至',
    '或预约李Sir审核',
    '或增加型材壁厚'
  ];
  const goodPhrases = [
    '限位器与夹胶玻璃需第三方到场核验，不可自验',
    '可覆盖该配置要求',
    '加厚型材可提升安全余量'
  ];
  
  console.log('应删除的旧措辞:');
  badPhrases.forEach(phrase => {
    const found = fullText.includes(phrase);
    console.log(`  "${phrase}": ${found ? '✗ 仍存在!' : '✓ 已删除'}`);
  });
  
  console.log('\n应存在的新措辞:');
  goodPhrases.forEach(phrase => {
    const found = fullText.includes(phrase);
    console.log(`  "${phrase}": ${found ? '✓ 已添加' : '✗ 未找到'}`);
  });
  
}).catch(err => {
  console.error('Error:', err);
});
