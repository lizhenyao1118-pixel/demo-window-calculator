/**
 * 本地PDF生成测试脚本（无需云函数）
 * 用于验证修改后的renderRedLines()布局效果
 * 测试场景：广州·第33层·隔声优先·含安全专项（小孩）
 */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { mapToSections } = require('./documentMapper');
const { buildPDF } = require('./pdfBuilder-v2');
const { calculateAll, calcSealGrades } = require('./calculator-v2');

async function testLocalPdfGeneration() {
  try {
    console.log('🚀 开始本地PDF生成测试...\n');

    // 测试数据：广州·第33层·隔声优先·含安全专项（小孩）
    const answers = {
      city: '广州',
      floor: 33,
      total_floors: 35,
      window_type: 'sliding',
      pain_point: 'sound',           // 隔声优先
      pain_points: ['sound'],
      family_risk: ['child'],         // 含安全专项（有小孩）
      budget_tier: 'B',
      building_type: 'residential',
      orientation: 'south',
      noise_level: 'main_road',
      climate_zone: 'hot_humid',
      opening_frequency: 'often',
      maintenance_concern: 'easy_clean',
      decoration_style: 'modern'
    };

    console.log('📋 测试参数：');
    console.log('  城市:', answers.city);
    console.log('  楼层:', `${answers.floor}/${answers.total_floors}`);
    console.log('  窗型:', answers.window_type);
    console.log('  隔声优先:', answers.pain_point);
    console.log('  家庭风险:', answers.family_risk.join(', '));
    console.log('  预算档位:', answers.budget_tier);
    console.log('');

    // 第一步：计算所有性能指标
    console.log('⚙️  第1步：计算性能指标...');
    const computed = calculateAll(answers);
    console.log('✅ 计算完成');
    console.log('  K_target:', computed.K_target, 'W/(m²·K)');
    console.log('  Rw_required:', computed.Rw_required, 'dB');
    console.log('  wind_zone:', computed.wind_zone);
    console.log('');

    // 第二步：生成气密水密等级
    console.log('⚙️  第2步：生成气密水密等级...');
    const sealGrades = calcSealGrades({
      city: answers.city,
      floor: answers.floor,
      windowType: answers.window_type
    });
    console.log('✅ 等级生成完成');
    console.log('  气密推荐:', sealGrades.airRec, '级');
    console.log('  水密推荐:', sealGrades.waterRec, '级');
    console.log('');

    // 第三步：构建文档结构
    console.log('⚙️  第3步：构建文档结构...');

    // computed已经包含了所有需要的计算值，直接传入
    const pdfNo = `LSA-${Date.now()}`;

    const sections = mapToSections(computed, answers, pdfNo);
    console.log('✅ 文档结构完成');
    console.log('  包含章节:', Object.keys(sections).join(', '));
    console.log('');

    // 第四步：生成PDF
    console.log('⚙️  第4步：生成PDF...');
    const pdfFileName = 'test-output-guangzhou-33f.pdf';
    const pdfPath = path.join(__dirname, pdfFileName);

    // buildPDF 签名: async function buildPDF(sections, outputPath, opts)
    await buildPDF(sections, pdfPath);

    const stats = fs.statSync(pdfPath);
    console.log('✅ PDF生成成功！');
    console.log('  文件:', pdfPath);
    console.log('  大小:', (stats.size / 1024).toFixed(2), 'KB');
    console.log('');

    console.log('🎉 测试完成！');
    console.log('');
    console.log('📸 验证步骤：');
    console.log('  1. 用PDF阅读器打开文件');
    console.log('  2. 翻到第5页（chapter2末尾，2.4产品红线）');
    console.log('  3. 检查禁止项、安全项的间距和叠压情况');
    console.log('  4. 确认修改前后的差异');
    console.log('');

  } catch (error) {
    console.error('❌ 错误：', error.message);
    console.error('堆栈：', error.stack);
    process.exit(1);
  }
}

// 运行测试
testLocalPdfGeneration().catch(err => {
  console.error('致命错误：', err);
  process.exit(1);
});
