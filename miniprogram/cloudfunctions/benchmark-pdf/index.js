const cloud = require('wx-server-sdk');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

cloud.init();

exports.main = async (event, context) => {
  const startTime = Date.now();
  const marks = {};
  
  try {
    // 阶段1：初始化
    marks.init = Date.now() - startTime;
    
    const doc = new PDFDocument({ margin: 50 });
    
    // 阶段2：字体加载（测试点）- 暂时使用默认字体
    const fontStart = Date.now();
    // 后续替换为思源黑体：doc.registerFont('SourceHanSans', fontPath);
    marks.fontLoad = Date.now() - fontStart;
    
    // 阶段3：内容生成（模拟真实招标文件4章）
    const contentStart = Date.now();
    
    // 封面
    doc.fontSize(20).text('技术招标文件', 100, 100);
    doc.fontSize(12).text(`编号：LSA-${Date.now()}`);
    doc.fontSize(12).text('测试场景：深圳40层+台风区+极限参数');
    
    // 模拟4章内容（大量文本）
    for (let i = 1; i <= 4; i++) {
      doc.addPage();
      doc.fontSize(16).text(`第${i}章 测试内容`);
      doc.fontSize(12).text('GB/T 8478-2020 标准测试文本'.repeat(200));
      doc.text(`P3: 4.5 kPa, Rw: 38 dB, K: 1.8, SHGC: 0.35`.repeat(50));
    }
    
    marks.contentGen = Date.now() - contentStart;
    // 阶段4：模拟照片附件（暂时注释，先测试文本性能）
    // const photoStart = Date.now();
    // for (let i = 0; i < 3; i++) {
    //   const mockPhoto = Buffer.alloc(500 * 1024);
    //   doc.image(mockPhoto, { width: 400 });
    //   if (i < 2) doc.addPage();
    // }
    // marks.photoGen = Date.now() - photoStart;
    marks.photoGen = 0; // 标记为0
    
    // 阶段5：文件写入/tmp（磁盘IO测试）
    const writeStart = Date.now();
    const outputPath = `/tmp/benchmark-${Date.now()}.pdf`;
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);
    doc.end();
    
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
    marks.fileWrite = Date.now() - writeStart;
    
    // 阶段6：上传云存储（网络IO测试）
    const uploadStart = Date.now();
    const fileContent = fs.createReadStream(outputPath);
    const uploadRes = await cloud.uploadFile({
      cloudPath: `benchmark/test-${Date.now()}.pdf`,
      fileContent: fileContent,
    });
    marks.upload = Date.now() - uploadStart;
    
    // 清理临时文件
    fs.unlinkSync(outputPath);
    
    const totalDuration = Date.now() - startTime;
    
    // 获取内存使用
    const memUsage = process.memoryUsage();
    
    return {
      success: true,
      totalDuration,
      marks: {
        init: marks.init,
        fontLoad: marks.fontLoad,
        contentGen: marks.contentGen,
        photoGen: marks.photoGen,
        fileWrite: marks.fileWrite,
        upload: marks.upload
      },
      fileSize: '约2MB（模拟）',
      verdict: totalDuration < 45000 ? 'SYNC_PASS（建议同步）' : 
               totalDuration < 60000 ? 'SYNC_WARNING（建议照片降级）' : 
               'ASYNC_REQUIRED（必须异步）',
      memory: {
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`,
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`
      },
      timestamp: new Date().toISOString()
    };
    
  } catch (err) {
    console.error('Benchmark failed:', err);
    return {
      success: false,
      error: err.message,
      stack: err.stack,
      duration: Date.now() - startTime
    };
  }
};