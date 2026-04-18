#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fix generateReport - 第二次修复
完全移除 PDF 生成逻辑
"""

import os

def main():
    print("[INFO] 第二次修复 generateReport 云函数...")

    path = 'miniprogram/cloudfunctions/generateReport/index.js'
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()

    # 1. 删除整个 PDF 生成代码块
    pdf_block_start = "    // 4. 生成PDF（Phase 1：使用新的 buildPDF）"
    pdf_block_end = "    // 7. 写入数据库（保留原有逻辑）"

    start_pos = text.find(pdf_block_start)
    if start_pos > 0:
        # 找到这个块的结束位置
        end_pos = text.find(pdf_block_end, start_pos)
        if end_pos > start_pos:
            # 包括这个结束行
            end_pos = text.find('\n', end_pos) + 1

            # 删除整个块
            text = text[:start_pos] + "    // 4. 写入数据库（PDF由 generatePDF 云函数生成）\n" + text[end_pos:]
            print("[SUCCESS] 删除完整 PDF 生成代码块")

    # 2. 删除 tempPath 相关的所有引用
    # 删除 tempPath 声明
    if 'const tempPath = `/tmp/${fileName}`;' in text:
        text = text.replace('const tempPath = `/tmp/${fileName}`;', '// tempPath 已移除，PDF 由 generatePDF 生成', 1)
        print("[SUCCESS] 删除 tempPath 声明")

    # 3. 删除 fs 相关的所有代码
    # 删除 fs require
    if 'const fs = require(' in text:
        # 找到 fs require 并删除
        fs_pos = text.find('const fs = require(\'fs\');')
        if fs_pos > 0:
            # 找到这行的结束
            line_end = text.find('\n', fs_pos) + 1
            text = text[:fs_pos] + text[line_end:]
            print("[SUCCESS] 删除 fs require")

    # 4. 移除所有 PDF 验证相关代码
    if 'const stats = fs.statSync(tempPath);' in text:
        # 删除 stats 相关代码
        stats_block = """    const stats = fs.statSync(tempPath);
    console.log('[Cloud] 文件大小:', stats.size, 'bytes');

    if (stats.size < 1000) {
      throw new Error(`PDF文件生成异常，大小仅${stats.size}字节`);
    }

    const fileContent = fs.readFileSync(tempPath);"""

        if stats_block in text:
            text = text.replace(stats_block, '// PDF 验证已移除', 1)
            print("[SUCCESS] 删除 PDF 验证代码")

    # 5. 移除 uploadRes 相关代码
    if 'const uploadRes = await cloud.uploadFile(' in text:
        upload_block = """    const uploadRes = await cloud.uploadFile({
      cloudPath: `reports/${fileName}`,
      fileContent: fileContent,
    });

    console.log('[Cloud] 上传成功：', uploadRes.fileID);"""

        if upload_block in text:
            text = text.replace(upload_block, '// PDF 上传已移除', 1)
            print("[SUCCESS] 删除 PDF 上传代码")

    # 6. 检查并确保 buildPDF 没有被调用
    if 'await buildPDF(' in text:
        print("[WARNING] 仍然存在 buildPDF 调用，需要手动检查")

    # 保存文件
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)

    print("[SUCCESS] generateReport/index.js 修复完成")

    # 验证删除结果
    with open(path, 'r', encoding='utf-8') as f:
        final_text = f.read()

    # 检查是否还有残留
    remaining = []
    if 'buildPDF' in final_text:
        remaining.append('buildPDF')
    if 'fs.stat' in final_text:
        remaining.append('fs.stat')
    if 'uploadRes' in final_text:
        remaining.append('uploadRes')
    if 'tempPath' in final_text:
        remaining.append('tempPath')

    if remaining:
        print(f"[WARNING] 仍然残留的代码: {', '.join(remaining)}")
    else:
        print("[SUCCESS] 所有 PDF 相关代码已完全移除")

    print("\n[NOTE] 后续步骤：")
    print("1. 重新部署 generateReport 云函数")
    print("2. 测试 PDF 生成流程")

if __name__ == "__main__":
    main()