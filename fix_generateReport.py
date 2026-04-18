#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fix generateReport to remove PDF generation logic
针对 demo-window-calculator 项目的特定修复
"""

import os

def main():
    print("[INFO] 修复 generateReport 云函数...")

    path = 'miniprogram/cloudfunctions/generateReport/index.js'
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()

    # 1. 删除 buildPDF require（如果还存在）
    old_require = "// const { buildPDF } = require('./pdfBuilder');\n"
    if old_require in text:
        text = text.replace(old_require, '', 1)
        print("[SUCCESS] 删除 buildPDF require")

    # 2. 添加 fs require（如果代码中使用但没有引入）
    if 'fs.statSync(' in text and 'const fs = require(' not in text:
        # 找到第一个 require 位置后插入 fs require
        insert_pos = text.find('const cloud = require')
        if insert_pos > 0:
            fs_require = "\nconst fs = require('fs');\n"
            text = text[:insert_pos] + fs_require + text[insert_pos:]
            print("[SUCCESS] 添加 fs require")

    # 3. 删除 PDF 生成相关代码块
    old_pdf_block = """    // 4. 生成PDF（Phase 1：使用新的 buildPDF）
    console.log('[Cloud] 开始生成 PDF（Phase 1 新引擎）...');
    console.log('[Cloud] PDF小程序码透传参数：', { tenderId, hasQrCodeBuffer: !!qrCodeBuffer });
    await buildPDF(sections, tempPath, { tenderId, qrCodeBuffer });

    // 5. 验证文件（保留原有逻辑）
    const stats = fs.statSync(tempPath);
    console.log('[Cloud] 文件大小:', stats.size, 'bytes');

    if (stats.size < 1000) {
      throw new Error(`PDF文件生成异常，大小仅${stats.size}字节`);
    }

    // 6. 上传到云存储（保留原有逻辑）
    const fileContent = fs.readFileSync(tempPath);
    const uploadRes = await cloud.uploadFile({
      cloudPath: `reports/${fileName}`,
      fileContent: fileContent,
    });

    console.log('[Cloud] 上传成功：', uploadRes.fileID);

    // 7. 写入数据库（保留原有逻辑）"""

    new_code = "    // 4. 写入数据库（PDF由 generatePDF 云函数生成）"

    if old_pdf_block in text:
        text = text.replace(old_pdf_block, new_code, 1)
        print("[SUCCESS] 删除 PDF 生成代码块")

    # 4. 删除所有 tempPath 相关代码
    # 删除 tempPath 声明
    if 'const tempPath = `/tmp/${fileName}`;' in text:
        text = text.replace('const tempPath = `/tmp/${fileName}`;', '// tempPath 已移除，PDF 由 generatePDF 生成', 1)
        print("[SUCCESS] 删除 tempPath 声明")

    # 5. 更新返回值，移除文件相关信息
    # 查找返回对象
    import re

    # 移除 fileSize 相关代码
    text = re.sub(r'fileSize:\s*stats\.size,', 'fileSize: 0,', text)

    # 确保返回值中没有 fileID
    if 'fileID: uploadRes.fileID,' in text:
        text = text.replace('fileID: uploadRes.fileID,', 'fileID: null,  // PDF 由 generatePDF 云函数生成')
        print("[SUCCESS] 更新 fileID 为 null")

    # 保存文件
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)

    print("[SUCCESS] generateReport/index.js 修复完成")
    print("\n[NOTE] 后续步骤：")
    print("1. 重新部署 generateReport 云函数")
    print("2. 测试 PDF 生成流程")

if __name__ == "__main__":
    main()