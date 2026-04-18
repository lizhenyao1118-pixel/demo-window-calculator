const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new'
  });
  const page = await browser.newPage();

  const htmlPath = path.resolve('./miniprogram/cloudfunctions/generatePDF/smoke-output.html');
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });

  await page.pdf({
    path: './smoke-puppeteer-local.pdf',
    format: 'A4',
    printBackground: true,
    margin: { top: '18mm', bottom: '18mm', left: '15mm', right: '15mm' }
  });

  await browser.close();
  console.log('完成，输出：smoke-puppeteer-local.pdf');
})();