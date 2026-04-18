#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SPEC-OUTPUT-v1.1 Phase 2
变更文件：
  1. documentMapper.js  — chapter4.title 值更新（1处）
  2. result.wxml        — W1~W5 共5处变更
  3. result.wxss        — 追加 Phase 2 新增样式

执行前提：commit db56601 已入库（Phase 1 完成）
"""

import re
from pathlib import Path

ROOT = Path("miniprogram")
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
# documentMapper.js — D1: chapter4.title 更新
# ─────────────────────────────────────────────
apply_replacement(
    MAPPER,
    "title: '下一步怎么用：问商家什么 & 怎么验收'",
    "title: '三阶段过程把控'",
    "D1: chapter4.title 改为三阶段过程把控"
)

# ─────────────────────────────────────────────
# result.wxml — W1: 删除 mandatory userMeaning 渲染
# ─────────────────────────────────────────────
apply_replacement(
    WXML,
    """\
      <view class="redline-item" wx:for="{{chapter3.redlineChecklist.mandatory}}" wx:key="index">
        <view class="redline-dot"></view>
        <view class="redline-content">
          <text class="redline-title">{{item.text}}</text>
          <text wx:if="{{item.userMeaning}}" class="redline-meaning">{{item.userMeaning}}</text>
        </view>
      </view>""",
    """\
      <view class="redline-item" wx:for="{{chapter3.redlineChecklist.mandatory}}" wx:key="index">
        <view class="redline-dot"></view>
        <view class="redline-content">
          <text class="redline-title">{{item.text}}</text>
        </view>
      </view>""",
    "W1: 删除 mandatory userMeaning 渲染"
)

# ─────────────────────────────────────────────
# result.wxml — W2: 删除 recommended userMeaning 渲染
# ─────────────────────────────────────────────
apply_replacement(
    WXML,
    """\
      <view class="redline-item" wx:for="{{chapter3.redlineChecklist.recommended}}" wx:key="index">
        <view class="redline-dot redline-dot-gray"></view>
        <view class="redline-content">
          <text class="redline-title">{{item.text}}</text>
          <text wx:if="{{item.userMeaning}}" class="redline-meaning">{{item.userMeaning}}</text>
        </view>
      </view>""",
    """\
      <view class="redline-item" wx:for="{{chapter3.redlineChecklist.recommended}}" wx:key="index">
        <view class="redline-dot redline-dot-gray"></view>
        <view class="redline-content">
          <text class="redline-title">{{item.text}}</text>
        </view>
      </view>""",
    "W2: 删除 recommended userMeaning 渲染"
)

# ─────────────────────────────────────────────
# result.wxml — W3: 第四章标题改为字段驱动
# ─────────────────────────────────────────────
apply_replacement(
    WXML,
    """\
      <text class="chapter-title">下一步行动</text>""",
    """\
      <text class="chapter-title">{{chapter4.title}}</text>""",
    "W3: 第四章标题改为字段驱动"
)

# ─────────────────────────────────────────────
# result.wxml — W4: M4-1 action-steps → threePhaseIntro
# ─────────────────────────────────────────────
apply_replacement(
    WXML,
    """\
    <!-- M4-1 行动主线三步（最显眼位置） -->
    <view class="action-steps">
      <view class="action-step" wx:for="{{chapter4.actionSteps}}" wx:key="step">
        <view class="action-step-num">
          <text class="action-num-text">{{item.step}}</text>
        </view>
        <view class="action-step-body">
          <text class="action-step-title">{{item.title}}</text>
          <text class="action-step-desc">{{item.description}}</text>
          <text wx:if="{{item.hint}}" class="action-step-hint">{{item.hint}}</text>
        </view>
      </view>
    </view>""",
    """\
    <!-- M4-1 三阶段过程框架 -->
    <view class="three-phase-wrap">
      <view class="three-phase-card" wx:for="{{chapter4.threePhaseIntro.phases}}" wx:key="phase">
        <view class="phase-header">
          <view class="phase-num-badge">
            <text class="phase-num-text">{{item.phase}}</text>
          </view>
          <view class="phase-header-body">
            <text class="phase-title">{{item.title}}</text>
            <text class="phase-timing">{{item.timing}}</text>
          </view>
        </view>
        <text class="phase-action">{{item.action}}</text>
        <text wx:if="{{item.hint}}" class="phase-hint">{{item.hint}}</text>
        <view wx:if="{{item.nextTrigger}}" class="phase-trigger-wrap">
          <text class="phase-trigger">→ {{item.nextTrigger}}</text>
        </view>
      </view>
    </view>""",
    "W4: M4-1 替换为 threePhaseIntro"
)

# ─────────────────────────────────────────────
# result.wxml — W5: M4-3 增加 consistencyClause + 新增 M4-4 inspectionChecklist
# ─────────────────────────────────────────────
apply_replacement(
    WXML,
    """\
    <!-- M4-4 验收节点 -->
    <text class="section-sub-title">验收节点</text>""",
    """\
    <!-- M4-3 底部：一致性承诺条款 -->
    <view wx:if="{{chapter4.merchantQuestionnaire.consistencyClause}}" class="consistency-clause-wrap">
      <text class="consistency-clause-text">{{chapter4.merchantQuestionnaire.consistencyClause}}</text>
    </view>

    <!-- M4-4 进场核查拍摄清单 -->
    <view wx:if="{{chapter4.inspectionChecklist}}">
      <text class="section-sub-title">进场核查清单</text>
      <text class="chapter-intro">{{chapter4.inspectionChecklist.intro}}</text>

      <!-- 必须拍 -->
      <view class="ic-section">
        <text class="ic-section-label">必须拍</text>
        <view class="ic-list">
          <view class="ic-item" wx:for="{{chapter4.inspectionChecklist.mustShoot}}" wx:key="id">
            <view class="ic-item-header">
              <text class="ic-id">{{item.id}}</text>
              <text class="ic-subject">{{item.subject}}</text>
            </view>
            <text class="ic-purpose">{{item.purpose}}</text>
            <text wx:if="{{item.warning}}" class="ic-warning">⚠ {{item.warning}}</text>
          </view>
        </view>
      </view>

      <!-- 尽量拍 -->
      <view class="ic-section">
        <text class="ic-section-label">建议拍</text>
        <view class="ic-list">
          <view class="ic-item" wx:for="{{chapter4.inspectionChecklist.shouldShoot}}" wx:key="id">
            <view class="ic-item-header">
              <text class="ic-id">{{item.id}}</text>
              <text class="ic-subject">{{item.subject}}</text>
            </view>
            <text class="ic-purpose">{{item.purpose}}</text>
            <text wx:if="{{item.caveat}}" class="ic-caveat">{{item.caveat}}</text>
          </view>
        </view>
      </view>

      <!-- 靠文件 -->
      <view class="ic-section">
        <text class="ic-section-label">靠文件核查</text>
        <view class="ic-list">
          <view class="ic-item" wx:for="{{chapter4.inspectionChecklist.useDocument}}" wx:key="id">
            <view class="ic-item-header">
              <text class="ic-id">{{item.id}}</text>
              <text class="ic-subject">{{item.checkItem}}</text>
            </view>
            <text class="ic-alt">核查方式：{{item.alternative}}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- M4-5 验收节点 -->
    <text class="section-sub-title">验收节点</text>""",
    "W5: 新增 consistencyClause + inspectionChecklist（M4-4）"
)

# ─────────────────────────────────────────────
# result.wxss — 追加 Phase 2 新增样式
# ─────────────────────────────────────────────
NEW_STYLES = """
/* ===== Phase 2 新增样式 ===== */

/* M4-1 三阶段框架 */
.three-phase-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}
.three-phase-card {
  background: #fff;
  border: 0.5px solid rgba(59,107,201,0.2);
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
}
.phase-header {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
}
.phase-num-badge {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #3b6bc9;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.phase-num-text {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}
.phase-header-body {
  display: flex;
  flex-direction: column;
  flex: 1;
}
.phase-title {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  margin-bottom: 2px;
}
.phase-timing {
  font-size: 11px;
  color: #999;
}
.phase-action {
  font-size: 13px;
  color: #333;
  line-height: 1.7;
}
.phase-hint {
  font-size: 11px;
  color: #999;
  line-height: 1.6;
  margin-top: 6px;
}
.phase-trigger-wrap {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 0.5px solid rgba(0,0,0,0.05);
}
.phase-trigger {
  font-size: 11px;
  color: #3b6bc9;
}

/* M4-3 一致性承诺条款 */
.consistency-clause-wrap {
  background: #f5f8ff;
  border: 0.5px solid rgba(59,107,201,0.2);
  border-radius: 8px;
  padding: 12px 14px;
  margin-top: 10px;
}
.consistency-clause-text {
  font-size: 11px;
  color: #4a5a80;
  line-height: 1.7;
}

/* M4-4 进场核查清单 */
.ic-section {
  background: #fff;
  border: 0.5px solid rgba(0,0,0,0.08);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 8px;
}
.ic-section-label {
  font-size: 11px;
  font-weight: 500;
  color: #555;
  background: #f5f5f0;
  padding: 6px 14px;
  display: block;
}
.ic-list {
  padding: 0 14px;
}
.ic-item {
  padding: 10px 0;
  border-bottom: 0.5px solid rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
}
.ic-item:last-child { border-bottom: none; }
.ic-item-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  margin-bottom: 3px;
}
.ic-id {
  font-size: 10px;
  color: #fff;
  background: #3b6bc9;
  padding: 1px 6px;
  border-radius: 3px;
  flex-shrink: 0;
}
.ic-subject { font-size: 13px; font-weight: 500; color: #1a1a1a; }
.ic-purpose { font-size: 11px; color: #888; line-height: 1.6; }
.ic-warning { font-size: 11px; color: #e65100; margin-top: 4px; line-height: 1.5; }
.ic-caveat { font-size: 11px; color: #999; margin-top: 4px; font-style: italic; line-height: 1.5; }
.ic-alt { font-size: 11px; color: #3b6bc9; margin-top: 3px; line-height: 1.5; }
"""

append_to_file(WXSS, NEW_STYLES, "WXSS: 追加 Phase 2 新增样式")

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
    print("═══ Phase 2 全部变更执行成功 ═══")
    print("请执行验收检查：")
    print("  1. 微信开发者工具重新编译，确认四章正常渲染")
    print("  2. 第三章红线清单：确认 userMeaning 不再显示")
    print("  3. 第四章标题：确认显示'三阶段过程把控'")
    print("  4. M4-1：确认显示三阶段卡片（下单前/安装前/安装后）")
    print("  5. M4-4：确认显示进场核查清单（三分组）")
    print("  6. 商家答题表底部：确认显示一致性承诺条款")
