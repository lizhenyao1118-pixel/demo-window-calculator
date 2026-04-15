#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SPEC-REVIEW Phase 1 修复脚本
FIX-1①②③: documentMapper.js
FIX-2①②: result.wxml
"""

import re

def fix_documentMapper():
    filepath = 'cloudfunctions/generateReport/documentMapper.js'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # FIX-1①: mandatory map() 添加 groupTitle
    old_mandatory = """items: (sharedRedlineChecklist.mandatory || []).map(item => ({
          displayId: item.displayId || '',
          text: item.text || '',
        })),"""

    new_mandatory = """items: (() => {
          let lastGroup = null;
          return (sharedRedlineChecklist.mandatory || []).map(item => {
            const isNewGroup = item.group !== lastGroup;
            lastGroup = item.group;
            return {
              displayId: item.displayId || '',
              text: item.text || '',
              groupTitle: isNewGroup ? (item.group || null) : null,
            };
          });
        })(),"""

    assert old_mandatory in content, "FIX-1①: mandatory map() 未找到匹配"
    content = content.replace(old_mandatory, new_mandatory)
    print("[OK] FIX-1①: mandatory map() 已添加 groupTitle")

    # FIX-1②: 删除 chapter3 中的 recommended 字段
    # chapter3.redlineChecklist 返回的是 buildRedlineChecklist 的结果
    # 需要修改 buildRedlineChecklist 函数，只返回 mandatory
    old_return = "return { mandatory, recommended };"
    new_return = "return { mandatory };  // SPEC-REVIEW-v1.0: 移除 recommended，只保留 mandatory"

    assert old_return in content, "FIX-1②: return { mandatory, recommended } 未找到匹配"
    content = content.replace(old_return, new_return)
    print("[OK] FIX-1②: buildRedlineChecklist 已移除 recommended 返回")

    # FIX-1③: getSafetyItems() 追加 R15/R16
    old_return_safety = """return { items, budgetWarning };"""
    new_return_safety = """// SPEC-REVIEW-v1.0: 追加适老化可选项（R15/R16）
  if (hasElder) {
    items.push('执手操作力≤25N');
    items.push('门槛高度≤15mm');
  }

  return { items, budgetWarning };"""

    # 需要定位 getSafetyItems 函数内的 return 语句
    pattern = r"(function getSafetyItems\(familyRisk, budgetTier\) \{[\s\S]*?)(\n  return \{ items, budgetWarning \};\n\})"
    match = re.search(pattern, content)
    assert match, "FIX-1③: getSafetyItems 函数未找到匹配"

    # 替换 return 语句
    func_content = match.group(1)
    old_ret = "\n  return { items, budgetWarning };\n}"
    new_ret = new_return_safety + "\n}"
    assert old_ret in match.group(0), "FIX-1③: return 语句格式不匹配"

    new_func = func_content + new_ret
    content = content.replace(match.group(0), new_func)
    print("[OK] FIX-1③: getSafetyItems() 已追加 R15/R16")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"[OK] {filepath} 保存完成")


def fix_result_wxml():
    filepath = 'pages/result/result.wxml'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # FIX-2①: mandatory 循环内添加分组标题和R编号
    old_mandatory_loop = """<view class="redline-item" wx:for="{{chapter3.redlineChecklist.mandatory}}" wx:key="index">
        <view class="redline-dot"></view>
        <view class="redline-content">
          <text class="redline-title">{{item.text}}</text>
        </view>
      </view>"""

    new_mandatory_loop = """<view class="redline-item" wx:for="{{chapter3.redlineChecklist.mandatory}}" wx:key="index">
        <view class="redline-dot"></view>
        <view class="redline-content">
          <text wx:if="{{item.groupTitle}}" class="group-title">{{item.groupTitle}}</text>
          <text class="item-id">{{item.displayId}}</text>
          <text class="redline-title">{{item.text}}</text>
        </view>
      </view>"""

    assert old_mandatory_loop in content, "FIX-2①: mandatory 循环未找到匹配"
    content = content.replace(old_mandatory_loop, new_mandatory_loop)
    print("[OK] FIX-2①: mandatory 循环已添加 groupTitle 和 displayId")

    # FIX-2②: 删除 recommended 循环块
    old_recommended_block = """<view class="redline-item" wx:for="{{chapter3.redlineChecklist.recommended}}" wx:key="index">
        <view class="redline-dot redline-dot-gray"></view>
        <view class="redline-content">
          <text class="redline-title">{{item.text}}</text>
        </view>
      </view>"""

    assert old_recommended_block in content, "FIX-2②: recommended 循环块未找到匹配"
    content = content.replace(old_recommended_block, '')
    print("[OK] FIX-2②: recommended 循环块已删除")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"[OK] {filepath} 保存完成")


if __name__ == '__main__':
    print("=== SPEC-REVIEW Phase 1 修复开始 ===\n")
    fix_documentMapper()
    print()
    fix_result_wxml()
    print("\n=== 全部修复完成 ===")
