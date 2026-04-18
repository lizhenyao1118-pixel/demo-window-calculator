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
        '--disable-gpu',
        '--enable-features=LayoutNG'
      ],
      defaultViewport: null,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/local/bin/chromium',
      headless:        'new',
      timeout:         TIMEOUT_MS,
    });

    const page = await browser.newPage();

    await page.emulateMediaType('print');   // 新增

    // 注入打印兼容 CSS（直接插入 HTML，比 addStyleTag 更可靠）
    const printCompatCSS = `
  <style id="print-compat">
    .redline-row { display: table !important; width: 100%; }
    .redline-icon { display: table-cell !important; width: 22px; vertical-align: top; padding-top: 6px; }
    .redline-text { display: table-cell !important; vertical-align: top; padding: 6px 8px; }
    .chapter-grid { display: block !important; overflow: hidden; }
    .chapter-card { float: left !important; width: 48% !important; margin-right: 2%; margin-bottom: 8px; box-sizing: border-box; }
    .chapter-card:nth-child(even) { margin-right: 0; }
    .info-row { display: table !important; width: 100%; }
    .info-col { display: table-cell !important; width: 50%; }
    .metric-meta { display: block !important; }
    .metric-meta span { display: inline !important; margin-right: 20px; }
    .l2-entry { display: table !important; width: 100%; }
    .l2-text { display: table-cell !important; vertical-align: middle; }
    .l2-btn { display: table-cell !important; vertical-align: middle; width: 100px; text-align: center; }
    @font-face { font-family: 'Noto Sans SC'; font-weight: 400; src: local('Noto Sans CJK SC'), local('NotoSansCJKsc-Regular'); }
    @font-face { font-family: 'Noto Sans SC'; font-weight: 500; src: local('Noto Sans CJK SC Medium'), local('NotoSansCJKsc-Medium'); }
    @font-face { font-family: 'Noto Sans SC'; font-weight: 700; src: local('Noto Sans CJK SC Bold'), local('NotoSansCJKsc-Bold'); }
  </style>`;

    const injectedHtml = html.replace('</head>', printCompatCSS + '</head>');

    await page.setContent(injectedHtml, {
      waitUntil: 'domcontentloaded',
      timeout:   TIMEOUT_MS,
    });

    const pdfBuffer = await page.pdf({
      format:              'A4',
      printBackground:     true,
      margin: {
        top:    '18mm',
        bottom: '18mm',
        left:   '15mm',
        right:  '15mm',
      },
      displayHeaderFooter: false,   // 临时禁用，验证页数根因
      // headerTemplate:      '<span></span>',
      // footerTemplate: `
      //   <div style="width:100%;font-size:8pt;color:#999;
      //               display:flex;justify-content:space-between;
      //               padding:0 15mm;">
      //     <span>本文件由李Sir门窗诊断系统生成 · 仅供参考</span>
      //     <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
      //   </div>`,
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