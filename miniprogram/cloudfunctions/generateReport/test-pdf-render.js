/**
 * 本地PDF生成测试脚本
 * 用于验证修改后的布局效果
 * 测试场景：广州·第33层·隔声优先·含安全专项
 */

const fs = require('fs');
const path = require('path');
const { buildDocument } = require('./index');

async function testPdfGeneration() {
  try {
    // 测试数据：广州·第33层·隔声优先·含安全专项（小孩）
    const assessmentData = {
      // 基本信息
      city: '广州',
      floor: 33,
      total_floors: 35,
      window_type: 'sliding',
      pain_points: ['sound'],
      family_risk: ['child'],
      budget_tier: 'B',

      // 参数
      building_type: 'residential',
      orientation: 'south',
      noise_level: 'moderate',
      climate_zone: 'hot_humid',

      // 其他必要字段
      opening_frequency: 'often',
      maintenance_concern: 'easy_clean',
      decoration_style: 'modern'
    };

    console.log('📄 开始生成PDF...');
    console.log('参数：', {
      城市: assessmentData.city,
      楼层: `${assessmentData.floor}/${assessmentData.total_floors}`,
      窗型: assessmentData.window_type,
      优先目标: assessmentData.pain_points,
      家庭风险: assessmentData.family_risk,
      预算档位: assessmentData.budget_tier
    });

    // 调用 buildDocument（对应云函数的核心逻辑）
    const result = await buildDocument(assessmentData);

    if (result.fileID) {
      console.log('✅ PDF生成成功！');
      console.log('文件ID:', result.fileID);

      // 如果有二进制内容，保存到本地
      if (result.pdfBuffer) {
        const outputPath = path.join(__dirname, 'test-output-guangzhou-33f.pdf');
        fs.writeFileSync(outputPath, result.pdfBuffer);
        console.log('📁 已保存到:', outputPath);
        console.log('📊 文件大小:', (result.pdfBuffer.length / 1024).toFixed(2), 'KB');
      }
    } else {
      console.error('❌ PDF生成失败：', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ 错误：', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行测试
testPdfGeneration();
