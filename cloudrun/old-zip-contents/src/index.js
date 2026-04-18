/**
 * index.js - Express 入口
 * 微信云托管 PDF 生成服务
 * 版本：迁移自云函数
 */

'use strict';

const express = require('express');
const cloud = require('wx-server-sdk');
const { mapToSections } = require('./documentMapper');
const { buildHTML } = require('./htmlBuilder');
const { renderHTMLtoPDF } = require('./pdfRenderer');

const envId = process.env.CBR_ENV_ID || process.env.ENV_ID;
if (!envId) {
  console.error('[pdf-service] 未检测到云托管环境变量 CBR_ENV_ID，数据库访问可能失败');
}
cloud.init({ env: envId });

const app = express();
const port = process.env.PORT || 3000;

// 中间件
app.use(express.json());

// ─── 辅助：从 assessments 读取答题数据 ─────────────────────────
async function fetchAnswerDoc(db, answerId) {
  const { data } = await db.collection('assessments').doc(answerId).get();
  if (!data) throw new Error(`assessments/${answerId} 不存在`);
  return data;
}

// ─── 辅助：生成文件名 ───────────────────────────────────────────
function buildFileName(answerId) {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return `reports/${ymd}_${answerId}.pdf`;
}

// ─── 主路由 ────────────────────────────────────────────────────
app.post('/generate-pdf', async (req, res) => {
  const t0 = Date.now();

  const { answerId, pdfNo } = req.body;
  if (!answerId) {
    return res.status(400).json({
      success: false,
      error: 'answerId 必填',
      timestamp: new Date().toISOString()
    });
  }

  const db = cloud.database();

  try {
    // 1. 读取答题记录
    console.log('[PDF Service] 读取答题记录:', answerId);
    const doc = await fetchAnswerDoc(db, answerId);

    const answers  = doc.answers  || doc.formData || doc;   // 兼容直接存 answers 字段或整文档
    const resolved = doc.resolved || doc.calculatedParams || {};
    const finalPdfNo = pdfNo || doc.pdfNo || `LSA-${Date.now()}`;

    // 2. sections 映射
    console.log('[PDF Service] 映射 sections...');
    const sections = mapToSections(resolved, answers, finalPdfNo);

    // 3. 构建 HTML
    console.log('[PDF Service] 构建 HTML...');
    const html = buildHTML(sections);
    console.log('[PDF Service] HTML 长度:', html.length);

    // 4. Puppeteer 渲染 PDF
    console.log('[PDF Service] 渲染 PDF...');
    const pdfBuffer = await renderHTMLtoPDF(html);
    console.log('[PDF Service] PDF 大小:', (pdfBuffer.length / 1024).toFixed(1), 'KB');

    // 5. 上传云存储
    const fileName = buildFileName(answerId);
    console.log('[PDF Service] 上传至:', fileName);
    const uploadResult = await cloud.uploadFile({
      cloudPath: fileName,
      fileContent: pdfBuffer,
    });
    const fileID = uploadResult.fileID;

    // 6. 回写 fileID 到 assessments（可选，方便前端下次直接取）
    try {
      await db.collection('assessments').doc(answerId).update({
        data: {
          pdfFileID:   fileID,
          pdfGeneratedAt: db.serverDate(),
        },
      });
    } catch (writeErr) {
      // 回写失败不阻断主流程
      console.warn('[PDF Service] 回写 fileID 失败（非致命）:', writeErr.message);
    }

    const elapsed = Date.now() - t0;
    console.log(`[PDF Service] 完成，耗时 ${elapsed}ms`);

    // 返回成功响应
    res.json({
      success: true,
      fileID: fileID,
      elapsed: elapsed,
      timestamp: new Date().toISOString(),
      service: 'cloudrun-pdf-service'
    });

  } catch (err) {
    console.error('[PDF Service] 错误:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      timestamp: new Date().toISOString(),
      service: 'cloudrun-pdf-service'
    });
  }
});

// ─── 健康检查 ─────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'pdf-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ─── 错误处理 ─────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Express Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// 启动服务器
app.listen(port, () => {
  console.log(`🚀 PDF Service 运行在端口 ${port}`);
  console.log(`📄 健康检查: http://localhost:${port}/health`);
  console.log(`📄 PDF 生成: POST http://localhost:${port}/generate-pdf`);
});

module.exports = app;