#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fix generateReport - 第三次修复
清理剩余的 tempPath 引用
"""

import os

def main():
    print("[INFO] 第三次清理 generateReport 云函数...")

    path = 'miniprogram/cloudfunctions/generateReport/index.js'
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()

    # 1. 删除注释中的 tempPath 引用
    if '// tempPath 已移除，PDF 由 generatePDF 生成' in text:
        text = text.replace('// tempPath 已移除，PDF 由 generatePDF 生成', '', 1)
        print("[SUCCESS] 删除 tempPath 注释")

    # 2. 检查是否还有其他 tempPath 引用
    if 'tempPath' in text:
        print("[WARNING] 仍然存在 tempPath 引用，需要手动检查")

    # 保存文件
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)

    print("[SUCCESS] generateReport/index.js 清理完成")

    # 最终验证
    with open(path, 'r', encoding='utf-8') as f:
        final_text = f.read()

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
        print("[SUCCESS] 所有 PDF 相关代码已完全清理")

    print("\n[NOTE] 后续步骤：")
    print("1. 重新部署 generateReport 云函数")
    print("2. 测试 PDF 生成流程")

if __name__ == "__main__":
    main()