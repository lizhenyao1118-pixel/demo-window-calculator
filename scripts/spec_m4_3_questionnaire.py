#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SPEC-M4-3: 答题表四段完整渲染
变更文件：
  1. documentMapper.js — D1: fieldGrades升级 + D2: section_redline新增
  2. result.wxml       — W1: M4-3替换为四段结构
  3. result.wxss       — 追加新增样式
前提：commit 6cc19e4 已入库
"""

import re
from pathlib import Path

ROOT   = Path("miniprogram")
MAPPER = ROOT / "cloudfunctions/generateReport/documentMapper.js"
WXML   = ROOT / "pages/result/result.wxml"
WXSS   = ROOT / "pages/result/result.wxss"

errors = []

def apply_replacement(filepath, old, new, label):
    content = filepath.read_text(encoding="utf-8")
    count = content.count(old)
    if count == 0:
        errors.append(f"[FAIL] {label}: 未找到目标字符串")
        return
    if count > 1:
        errors.append(f"[FAIL] {label}: 找到 {count} 处匹配，期望唯一匹配")
        return
    filepath.write_text(content.replace(old, new, 1), encoding="utf-8")
    print(f"[OK]   {label}")

def append_to_file(filepath, content, label):
    existing = filepath.read_text(encoding="utf-8")
    filepath.write_text(existing + "\n" + content, encoding="utf-8")
    print(f"[OK]   {label}")

# ─────────────────────────────────────────────
# D1: glassDetailSpec 从 gradeC 升至 gradeA
# ─────────────────────────────────────────────
apply_replacement(
    MAPPER,
    """        gradeA: ['windResistanceReport', 'airWaterTightnessReport', 'laminatedGlass3C', 'acousticReport'],
        gradeB: ['thermalKReport', 'shgcData', 'profileThickness', 'thermalBarSpec', 'limiterModel', 'systemCertification'],
        gradeC: ['glassDetailSpec'],""",
    """        gradeA: ['windResistanceReport', 'airWaterTightnessReport', 'laminatedGlass3C', 'acousticReport', 'glassDetailSpec'],
        gradeB: ['thermalKReport', 'shgcData', 'profileThickness', 'thermalBarSpec', 'limiterModel', 'systemCertification'],
        gradeC: [],""",
    "D1: glassDetailSpec 从 gradeC 升至 gradeA"
)

# ─────────────────────────────────────────────
# D2: section_redline 新增（插入 section3 之前）
# 用 regex 自动检测缩进，避免硬编码空格失败
# ─────────────────────────────────────────────
content = MAPPER.read_text(encoding="utf-8")
pattern = r'( +)(section3:\s*\{)'
match = re.search(pattern, content)
if not match:
    errors.append("[FAIL] D2: 未找到 section3 定位点，section_redline 未插入")
else:
    indent      = match.group(1)          # section3 的缩进
    inner       = indent + "  "           # 内层缩进
    inner2      = inner  + "  "           # 再内一层

    section_redline = (
        f"{indent}section_redline: {{\n"
        f"{inner}title: '── 第三段：红线承诺 ──────────────────────────────',\n"
        f"{inner}intro: '以下为本案技术红线，请逐项书面确认。任何一项不满足须书面说明。',\n"
        f"{inner}items: (sharedRedlineChecklist.mandatory || []).map(item => ({{\n"
        f"{inner2}displayId: item.displayId || '',\n"
        f"{inner2}text: item.text || '',\n"
        f"{inner}}})),\n"
        f"{inner}clauseNote: '本表逐项响应内容作为报价文件及合同附件；"
        f"如实际配置与本表响应不一致，视为偏离，须书面说明差异内容及原因。',\n"
        f"{indent}}},\n\n"
    )

    insert_pos  = match.start()
    new_content = content[:insert_pos] + section_redline + content[insert_pos:]
    MAPPER.write_text(new_content, encoding="utf-8")
    print("[OK]   D2: 新增 section_redline（红线承诺段）")

# ─────────────────────────────────────────────
# W1: result.wxml — M4-3 替换为四段完整结构
# ─────────────────────────────────────────────
apply_replacement(
    WXML,
    """\
    <!-- M4-3 商家答题表 -->
    <text class="section-sub-title">商家答题表</text>
    <view class="qa-form">
      <view class="qa-item"
            wx:for="{{chapter4.merchantQuestionnaire.section3.questions}}" wx:key="*this">
        <text class="qa-label">{{item}}</text>
      </view>
    </view>""",
    """\
    <!-- M4-3 商家答题表（四段完整结构） -->
    <text class="section-sub-title">商家答题表</text>
    <text class="position-statement">{{chapter4.merchantQuestionnaire.subtitle}}</text>

    <!-- 第一段：商家基本信息 -->
    <view class="qa-section">
      <text class="qa-section-title">基本信息</text>
      <view class="qa-section-body">
        <view class="qa-field-item"
              wx:for="{{chapter4.merchantQuestionnaire.section1.fields}}"
              wx:key="label">
          <text class="qa-field-label">{{item.label}}</text>
          <view wx:if="{{item.type === 'checkbox'}}" class="qa-options">
            <text class="qa-opt"
                  wx:for="{{item.options}}" wx:key="*this" wx:for-item="opt">{{opt}}</text>
          </view>
          <view wx:else class="qa-input-mock">
            <text class="qa-placeholder">{{item.placeholder}}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 第二段：技术答题表（列名列表，方案A） -->
    <view class="qa-section">
      <text class="qa-section-title">技术答题表</text>
      <text class="qa-hint">{{chapter4.merchantQuestionnaire.section2.hint}}</text>
      <view class="qa-section-body">
        <view class="qa-column-item"
              wx:for="{{chapter4.merchantQuestionnaire.section2.columns}}"
              wx:key="*this">
          <text class="qa-column-dot">·</text>
          <text class="qa-column-name">{{item}}</text>
        </view>
      </view>
      <text class="qa-note">{{chapter4.merchantQuestionnaire.section2.note}}</text>
    </view>

    <!-- 第三段：红线承诺 -->
    <view class="qa-section">
      <text class="qa-section-title">红线承诺</text>
      <text class="qa-hint">{{chapter4.merchantQuestionnaire.section_redline.intro}}</text>
      <view class="redline-confirm-list">
        <view class="redline-confirm-item"
              wx:for="{{chapter4.merchantQuestionnaire.section_redline.items}}"
              wx:key="displayId">
          <text class="redline-confirm-id">{{item.displayId}}</text>
          <text class="redline-confirm-text">{{item.text}}</text>
        </view>
      </view>
      <view class="qa-clause-wrap">
        <text class="qa-clause-text">{{chapter4.merchantQuestionnaire.section_redline.clauseNote}}</text>
      </view>
    </view>

    <!-- 第四段：施工态度问答 -->
    <view class="qa-section">
      <text class="qa-section-title">施工态度</text>
      <view class="qa-section-body">
        <view class="qa-item"
              wx:for="{{chapter4.merchantQuestionnaire.section3.questions}}"
              wx:key="*this">
          <text class="qa-label">{{item}}</text>
        </view>
      </view>
    </view>""",
    "W1: M4-3 替换为四段完整结构"
)

# ─────────────────────────────────────────────
# WXSS: 追加 SPEC-M4-3 新增样式
# ─────────────────────────────────────────────
NEW_STYLES = """
/* ===== SPEC-M4-3 新增样式 ===== */

.qa-section {
  margin-bottom: 10px;
  background: #fff;
  border: 0.5px solid rgba(0,0,0,0.08);
  border-radius: 8px;
  overflow: hidden;
}
.qa-section-title {
  font-size: 11px;
  font-weight: 500;
  color: #555;
  background: #f5f5f0;
  padding: 6px 14px;
  display: block;
}
.qa-section-body {
  padding: 0 14px;
}
.qa-hint {
  font-size: 11px;
  color: #999;
  line-height: 1.6;
  padding: 8px 14px;
  display: block;
  border-bottom: 0.5px solid rgba(0,0,0,0.04);
}
.qa-field-item {
  padding: 10px 0;
  border-bottom: 0.5px solid rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
}
.qa-field-item:last-child { border-bottom: none; }
.qa-field-label {
  font-size: 11px;
  color: #888;
  margin-bottom: 6px;
}
.qa-column-item {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  padding: 6px 0;
  border-bottom: 0.5px solid rgba(0,0,0,0.04);
  gap: 8px;
}
.qa-column-item:last-child { border-bottom: none; }
.qa-column-dot {
  font-size: 12px;
  color: #bbb;
  flex-shrink: 0;
  margin-top: 1px;
}
.qa-column-name {
  font-size: 12px;
  color: #1a1a1a;
  line-height: 1.6;
  flex: 1;
}
.qa-note {
  font-size: 11px;
  color: #e65100;
  line-height: 1.6;
  padding: 8px 14px;
  display: block;
  background: #fff8f0;
}
.redline-confirm-list {
  padding: 0 14px;
}
.redline-confirm-item {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  padding: 10px 0;
  border-bottom: 0.5px solid rgba(0,0,0,0.05);
  gap: 8px;
}
.redline-confirm-item:last-child { border-bottom: none; }
.redline-confirm-id {
  font-size: 10px;
  color: #fff;
  background: #e05252;
  padding: 1px 6px;
  border-radius: 3px;
  flex-shrink: 0;
  margin-top: 2px;
}
.redline-confirm-text {
  font-size: 12px;
  color: #1a1a1a;
  line-height: 1.6;
  flex: 1;
}
.qa-clause-wrap {
  background: #fffbf0;
  border-top: 0.5px solid #f0c060;
  padding: 10px 14px;
}
.qa-clause-text {
  font-size: 11px;
  color: #a06000;
  line-height: 1.7;
}
"""

append_to_file(WXSS, NEW_STYLES, "WXSS: 追加 SPEC-M4-3 新增样式")

# ─────────────────────────────────────────────
# 结果汇总
# ─────────────────────────────────────────────
print()
if errors:
    print("═══ 执行失败，以下变更未完成 ═══")
    for e in errors:
        print(e)
    print("\n请将错误信息完整粘贴给产品对话，不要自行修改。")
else:
    print("═══ SPEC-M4-3 全部变更执行成功 ═══")
    print("验收清单：")
    print("  1. 微信开发者工具重新编译，确认无报错")
    print("  2. 答题表显示四段：基本信息 / 技术答题表 / 红线承诺 / 施工态度")
    print("  3. 红线承诺段：每条显示 displayId + 技术表述")
    print("  4. 红线承诺段底部：显示橙色承诺条款文本框")
    print("  5. 技术答题表：显示列名列表（8项），底部有橙色 note")
    print("  6. 基本信息：5个字段，'是否授权'显示选项")
