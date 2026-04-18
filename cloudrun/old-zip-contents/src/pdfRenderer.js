/**
 * pdfRenderer.js - Express Service Version
 * HTML 字符串 → PDF Buffer（Puppeteer-core + 系统 Chromium）
 * 版本：迁移至云托管服务
 *
 * 用法：
 *   const { renderHTMLtoPDF } = require('./pdfRenderer');
 *   const pdfBuffer = await renderHTMLtoPDF(htmlString);
 */

'use strict';

const puppeteer = require('puppeteer-core');

const TIMEOUT_MS = 60_000; // 60 秒，与 P0 确认值一致

/**
 * 将 HTML 字符串渲染为 PDF Buffer
 * @param {string} html  完整 HTML 文档字符串
 * @returns {Promise<Buffer>}  PDF 文件内容
 */
async function renderHTMLtoPDF(html) {
  let browser = null;

  try {
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ],
      defaultViewport: {
        width: 794,
        height: 1123
      },
      executablePath:  '/usr/bin/chromium',
      headless:        'new',
      timeout:         TIMEOUT_MS,
    });

    const page = await browser.newPage();

    // 注入 HTML（base64 data URL 方式，避免本地文件权限问题）
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout:   TIMEOUT_MS,
    });

    // 等待自定义字体加载完成（Google Fonts 降级容忍：超时不阻塞）
    await page.evaluateHandle('document.fonts.ready').catch(() => {});

    const pdfBuffer = await page.pdf({
      format:              'A4',
      printBackground:     true,
      margin: {
        top:    '18mm',
        bottom: '18mm',
        left:   '15mm',
        right:  '15mm',
      },
      displayHeaderFooter: true,
      headerTemplate:      '<span></span>',   // 空白 header，抑制默认标题
      footerTemplate: `
        <div style="width:100%;font-size:8pt;color:#999;
                    display:flex;justify-content:space-between;
                    padding:0 15mm;">
          <span>本文件由李Sir门窗诊断系统生成 · 仅供参考</span>
          <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
        </div>`,
      timeout: TIMEOUT_MS,
    });

    return Buffer.from(pdfBuffer);

  } finally {
    if (browser) {
      await browser.close().catch(err =>
        console.error('[pdfRenderer] browser.close 失败:', err.message)
      );
    }
  }
}

module.exports = { renderHTMLtoPDF };