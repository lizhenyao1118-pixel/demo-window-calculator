#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os, sys

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'miniprogram')

def apply_patch(path, patches):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    for i, (old, new) in enumerate(patches, 1):
        if old not in content:
            print(f"PATCH {i} NOT FOUND in {os.path.basename(path)}")
            print(f"  Expected: {repr(old[:80])}")
            sys.exit(1)
        content = content.replace(old, new, 1)
        print(f"  Patch {i} OK")
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Saved: {path}\n")

# ── WXML ──────────────────────────────────────────────────────────────────────
wxml_path = os.path.join(BASE, 'pages/result/result.wxml')
wxml_patches = [
    # Patch 1: 替换六宫格 + 解锁按钮
    (
        '''  <view class="section-label">关键参数指标</view>
  <view class="param-grid">
    <view class="param-card">
      <text class="param-label">保温</text>
      <text class="param-symbol">≤</text>
      <text class="param-value">{{summary.k_target}}</text>
      <text class="param-unit">W/(m²·K) · K值</text>
    </view>
    <view class="param-card">
      <text class="param-label">隔音</text>
      <text class="param-symbol">≥</text>
      <text class="param-value">{{summary.rw_required}}</text>
      <text class="param-unit">dB · Rw值</text>
    </view>
    <view class="param-card">
      <text class="param-label">遮阳</text>
      <text class="param-symbol">≤</text>
      <text class="param-value">{{summary.shgc_target || '—'}}</text>
      <text class="param-unit">SHGC</text>
    </view>
    <view class="param-card">
      <text class="param-label">抗风压</text>
      <text class="param-symbol">≥</text>
      <text class="param-value">{{summary.p3_required}}kPa</text>
      <text class="param-unit">{{summary.wind_zone}}</text>
    </view>
    <view class="param-card">
      <text class="param-label">密封性能</text>
      <text class="param-symbol">—</text>
      <text class="param-value">气密{{summary.air_rec}}级 / 水密{{summary.water_rec}}级</text>
      <text class="param-unit">综合反映安装工艺质量</text>
    </view>
    <view class="param-card">
      <text class="param-label">安全</text>
      <text class="param-symbol">—</text>
      <text class="param-value" style="font-size:14px;">需专项核查</text>
      <text class="param-unit">查看完整报告</text>
    </view>
  </view>
  <!-- 付费按钮：未解锁时可见 -->
  <view wx:if="{{!isPaid}}" class="unlock-btn" bindtap="onUnlock">
    <text class="unlock-btn-text">限时免费获取完整招标文件</text>
    <text class="unlock-btn-sub">含技术底线 · 红线清单 · 三阶段验收标签</text>
  </view>''',
        '''  <view class="section-label">关键参数指标</view>
  <!-- 参数格第一行：保温/隔音/遮阳/抗风压 -->
  <view class="param-grid">
    <view class="param-card param-card-blue">
      <view class="param-card-header">
        <text class="param-label param-label-blue">保温</text>
        <image class="param-icon" src="/images/icon-thermal.svg" mode="aspectFit"/>
      </view>
      <view class="param-value-row">
        <text class="param-op param-op-blue">≤</text>
        <text class="param-value">{{summary.k_target}}</text>
      </view>
      <text class="param-unit param-unit-blue">W/(m²·K) · K值</text>
    </view>
    <view class="param-card param-card-purple">
      <view class="param-card-header">
        <text class="param-label param-label-purple">隔音</text>
        <image class="param-icon" src="/images/icon-acoustic.svg" mode="aspectFit"/>
      </view>
      <view class="param-value-row">
        <text class="param-op param-op-purple">≥</text>
        <text class="param-value">{{summary.rw_required}}</text>
      </view>
      <text class="param-unit param-unit-purple">dB · Rw值</text>
    </view>
    <view class="param-card param-card-amber">
      <view class="param-card-header">
        <text class="param-label param-label-amber">遮阳</text>
        <image class="param-icon" src="/images/icon-solar.svg" mode="aspectFit"/>
      </view>
      <view class="param-value-row">
        <text class="param-op param-op-amber">≤</text>
        <text class="param-value">{{summary.shgc_target || '—'}}</text>
      </view>
      <text class="param-unit param-unit-amber">SHGC</text>
    </view>
    <view class="param-card param-card-teal">
      <view class="param-card-header">
        <text class="param-label param-label-teal">抗风压</text>
        <image class="param-icon" src="/images/icon-wind.svg" mode="aspectFit"/>
      </view>
      <view class="param-value-row">
        <text class="param-op param-op-teal">≥</text>
        <text class="param-value param-value-md">{{summary.p3_required}}<text class="param-value-unit-inline">kPa</text></text>
      </view>
      <text class="param-unit param-unit-teal">{{summary.wind_zone}} 等级</text>
    </view>
  </view>
  <!-- 参数格第二行：密封性能/安全 -->
  <view class="param-grid">
    <view class="param-card param-card-gray">
      <view class="param-card-header">
        <text class="param-label param-label-gray">密封性能</text>
        <image class="param-icon" src="/images/icon-seal.svg" mode="aspectFit"/>
      </view>
      <view class="seal-values">
        <view class="seal-col">
          <text class="seal-grade">{{summary.air_rec}}级</text>
          <text class="seal-type">气密</text>
        </view>
        <view class="seal-divider"></view>
        <view class="seal-col">
          <text class="seal-grade">{{summary.water_rec}}级</text>
          <text class="seal-type">水密</text>
        </view>
      </view>
      <text class="param-unit param-unit-gray">综合反映安装工艺质量</text>
    </view>
    <view class="param-card param-card-warn">
      <view class="param-card-header">
        <text class="param-label param-label-warn">安全</text>
        <image class="param-icon" src="/images/icon-safety.svg" mode="aspectFit"/>
      </view>
      <view class="warn-value-row">
        <view class="warn-dot"></view>
        <text class="warn-value-text">需专项核查</text>
      </view>
      <text class="param-unit param-unit-warn">查看完整报告</text>
    </view>
  </view>
  <!-- 解锁按钮：未解锁时可见 -->
  <view wx:if="{{!isPaid}}" class="unlock-btn" bindtap="onUnlock">
    <view class="unlock-btn-inner">
      <view class="unlock-icon-wrap">
        <image class="unlock-icon" src="/images/icon-unlock.svg" mode="aspectFit"/>
      </view>
      <view class="unlock-text-col">
        <text class="unlock-btn-text">免费解锁完整招标文件</text>
        <view class="unlock-free-badge">
          <text class="unlock-free-text">限时免费开放</text>
        </view>
      </view>
      <view class="unlock-arrow">
        <image class="unlock-arrow-icon" src="/images/icon-arrow-right.svg" mode="aspectFit"/>
      </view>
    </view>
    <view class="unlock-divider"></view>
    <view class="unlock-items-row">
      <text class="unlock-item-label">技术底线</text>
      <view class="unlock-item-dot"></view>
      <text class="unlock-item-label">红线清单</text>
      <view class="unlock-item-dot"></view>
      <text class="unlock-item-label">三阶段验收</text>
    </view>
  </view>'''
    ),
]

# ── WXSS ──────────────────────────────────────────────────────────────────────
wxss_path = os.path.join(BASE, 'pages/result/result.wxss')
wxss_patches = [
    # Patch 1: 替换 param-grid / param-card / param-label / param-symbol / param-value / param-unit
    (
        '''.param-grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
}
.param-card {
  width: calc(50% - 4px);
  background: #f0f0ec;
  border-radius: 8px;
  padding: 12px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}
.param-label { font-size: 11px; color: #666; margin-bottom: 4px; }
.param-symbol {
  font-size: 16px;
  color: #999;
  text-align: center;
}
.param-value { font-size: 28px; font-weight: 500; color: #1a1a1a; line-height: 1.1; }
.param-unit { font-size: 11px; color: #999; margin-top: 2px; }''',
        '''.param-grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
}
.param-card {
  width: calc(50% - 5px);
  border-radius: 14px;
  padding: 14px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}
.param-card-blue  { background: rgba(59,130,246,0.07); }
.param-card-purple{ background: rgba(139,92,246,0.07); }
.param-card-amber { background: rgba(245,158,11,0.07); }
.param-card-teal  { background: rgba(20,184,166,0.07); }
.param-card-gray  { background: rgba(107,114,128,0.07); }
.param-card-warn  { background: rgba(196,149,42,0.10); border: 1rpx solid rgba(196,149,42,0.20); }
.param-card-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.param-icon { width: 18px; height: 18px; }
.param-label { font-size: 11px; font-weight: 500; letter-spacing: 0.5px; }
.param-label-blue   { color: #3B82F6; }
.param-label-purple { color: #8B5CF6; }
.param-label-amber  { color: #D97706; }
.param-label-teal   { color: #0D9488; }
.param-label-gray   { color: #6B7280; }
.param-label-warn   { color: #C4952A; }
.param-value-row {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  gap: 4px;
  margin-bottom: 6px;
}
.param-op {
  font-size: 14px;
  font-weight: 500;
  opacity: 0.45;
  line-height: 1;
  padding-bottom: 4px;
}
.param-op-blue   { color: #3B82F6; }
.param-op-purple { color: #8B5CF6; }
.param-op-amber  { color: #D97706; }
.param-op-teal   { color: #0D9488; }
.param-value {
  font-size: 34px;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1;
  letter-spacing: -1px;
}
.param-value-md {
  font-size: 26px;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1;
  letter-spacing: -0.5px;
}
.param-value-unit-inline {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  opacity: 0.6;
}
.param-unit { font-size: 11px; margin-top: 2px; opacity: 0.55; }
.param-unit-blue   { color: #3B82F6; }
.param-unit-purple { color: #8B5CF6; }
.param-unit-amber  { color: #D97706; }
.param-unit-teal   { color: #0D9488; }
.param-unit-gray   { color: #6B7280; }
.param-unit-warn   { color: #C4952A; }
.seal-values {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  margin: 6px 0;
}
.seal-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
}
.seal-grade {
  font-size: 22px;
  font-weight: 600;
  color: #1a1a1a;
  letter-spacing: -0.3px;
  line-height: 1;
}
.seal-type {
  font-size: 11px;
  color: #A8B0BC;
  margin-top: 3px;
}
.seal-divider {
  width: 1px;
  height: 32px;
  background: rgba(107,114,128,0.15);
  flex-shrink: 0;
}
.warn-value-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 7px;
  margin: 6px 0;
}
.warn-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #C4952A;
  flex-shrink: 0;
}
.warn-value-text {
  font-size: 16px;
  font-weight: 600;
  color: #8B6A1A;
  line-height: 1.3;
}'''
    ),
    # Patch 2: 替换 unlock-btn 样式
    (
        '''.unlock-btn {
  background: #1B3F72;
  border-radius: 10px;
  padding: 16px;
  margin: 20px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.unlock-btn-text {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
}
.unlock-btn-sub {
  font-size: 11px;
  color: rgba(255,255,255,0.85);
}''',
        '''.unlock-btn {
  background: #1B3A6B;
  border-radius: 16px;
  padding: 20px;
  margin: 12px 0;
  display: flex;
  flex-direction: column;
}
.unlock-btn-inner {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 14px;
}
.unlock-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255,255,255,0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.unlock-icon { width: 24px; height: 24px; }
.unlock-text-col {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.unlock-btn-text {
  font-size: 17px;
  font-weight: 500;
  color: #fff;
  letter-spacing: 0.2px;
  line-height: 1.3;
}
.unlock-free-badge {
  display: inline-flex;
  background: rgba(212,168,58,0.20);
  border: 1px solid rgba(212,168,58,0.35);
  border-radius: 100px;
  padding: 2px 10px;
  margin-top: 6px;
  align-self: flex-start;
}
.unlock-free-text {
  color: #D4A83A;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.5px;
}
.unlock-arrow {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255,255,255,0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.unlock-arrow-icon { width: 14px; height: 14px; }
.unlock-divider {
  height: 1px;
  background: rgba(255,255,255,0.10);
  margin: 16px 0 14px;
}
.unlock-items-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}
.unlock-item-label {
  color: rgba(255,255,255,0.50);
  font-size: 11px;
  letter-spacing: 0.3px;
  flex: 1;
  text-align: center;
}
.unlock-item-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(255,255,255,0.20);
  flex-shrink: 0;
}'''
    ),
]

print("Patching WXML...")
apply_patch(wxml_path, wxml_patches)
print("Patching WXSS...")
apply_patch(wxss_path, wxss_patches)
print("\nAll patches complete.")
print("Next: create SVG icons, then npm test")
