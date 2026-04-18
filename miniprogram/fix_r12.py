#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re

def fix_documentMapper():
    filepath = 'cloudfunctions/generateReport/documentMapper.js'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # FIX-1: 删除 R12 覆盖逻辑
    old_block = """    // R12: 水密气密性能（原 R06）
    if (r.id === 'R12') {
      const desc = `水密气密性能：水密≥${sealGrades.waterRec}级，气密≥${sealGrades.airRec}级（GB/T 7106）。安装节点须按设计图纸施工，打胶须全程留影像记录`;
      item.text = desc;
      item._sealGrades = sealGrades;
    }
"""

    assert old_block in content, "R12覆盖逻辑未找到"
    content = content.replace(old_block, '')
    print("[OK] FIX-1: documentMapper.js R12覆盖逻辑已删除")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"[OK] {filepath} 保存完成")

def fix_test():
    filepath = 'cloudfunctions/generateReport/test/unit/documentMapper.test.js'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # FIX-2: 删除 DM-28 测试
    old_test = """  test('DM-28: R12新增结构化_sealGrades字段', () => {
    const answers = { city: 'shenzhen', floor: 15, window_type: 'casement', family_risk: [] };
    const checklist = buildRedlineChecklist(answers, { safetyForced: false });
    const r12 = (checklist.mandatory || []).find(r => r.id === 'R12') || {};
    expect(r12._sealGrades).toBeTruthy();
    expect(r12._sealGrades.airRec).toBe(6);
    expect(r12._sealGrades.waterRec).toBe(6);
  });

"""

    assert old_test in content, "DM-28测试未找到"
    content = content.replace(old_test, '')
    print("[OK] FIX-2: DM-28测试已删除")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"[OK] {filepath} 保存完成")

if __name__ == '__main__':
    print("=== 删除 R12 错误覆盖逻辑 ===\n")
    fix_documentMapper()
    print()
    fix_test()
    print("\n=== 全部修复完成 ===")
