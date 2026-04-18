const cloud = require('wx-server-sdk');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async () => {
  const html = `
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'PingFang SC', 'Microsoft YaHei',
                       'Noto Sans SC', sans-serif;
          padding: 40px;
          color: #333;
        }
        h1 { font-size: 24px; margin-bottom: 16px; }
        p  { font-size: 14px; line-height: 1.8; }
      </style>
    </head>
    <body>
      <h1>门窗诊断系统 · Puppeteer渲染测试</h1>
      <p>隔声性能：环境噪声等级 Rw ≥ 35 dB</p>
      <p>热工性能：传热系数 K ≤ 1.8 W/(m²·K)</p>
      <p>抗风压：风压等级 ≥ 4级</p>
      <p>水密气密：水密 ≥ 3级，气密 ≥ 6级</p>
    </body>
    </html>
  `;

  let browser;
  const startTime = Date.now();

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', bottom: '20mm',
                left: '15mm', right: '15mm' },
      printBackground: true,
    });

    const elapsed = Date.now() - startTime;

    const uploadResult = await cloud.uploadFile({
      cloudPath: `spike-test/test-${Date.now()}.pdf`,
      fileContent: pdfBuffer,
    });

    return {
      success: true,
      fileID: uploadResult.fileID,
      elapsedMs: elapsed,
      pdfSize: pdfBuffer.length,
    };

  } catch (err) {
    return {
      success: false,
      error: err.message,
      elapsedMs: Date.now() - startTime,
    };
  } finally {
    if (browser) await browser.close();
  }
};
