#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os, sys

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'miniprogram')

def apply_patch(path, patches):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    for i, (old, new) in enumerate(patches, 1):
        if old not in content:
            print(f"PATCH {i} NOT FOUND in {path}")
            sys.exit(1)
        content = content.replace(old, new, 1)
        print(f"  Patch {i} OK")
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Saved: {path}")

wxml_path = os.path.join(BASE, 'pages/index/index.wxml')
wxml_patches = [
    (
        '''  <!-- Hero区：深蓝底白字 -->
  <view class="hero-section">
    <view class="page-title">门窗诊断与标准</view>
    <view class="identity">
      <text class="expert-name">李Sir</text>
      <text class="expert-role"> · 独立门窗技术顾问</text>
    </view>
    <view class="stamp">不销售 · 不代理</view>
    <view class="promise">依据国家建筑门窗标准，将生活诉求转化为可量化的技术采购标准</view>
    <view class="promise-secondary">用数据选窗，不凭感觉、不靠话术</view>
  </view>''',
        '''  <!-- Hero区：深蓝底白字 -->
  <view class="hero-section">
    <view class="badge">
      <view class="badge-dot"></view>
      <text class="badge-text">不销售 · 不代理</text>
    </view>
    <view class="page-title">门窗诊断与标准</view>
    <view class="identity">
      <text class="expert-name">李Sir</text>
      <text class="expert-role"> · 独立门窗技术顾问</text>
    </view>
    <view class="hero-divider"></view>
    <view class="promise">依据国家建筑门窗标准，将生活诉求转化为可量化的技术采购标准</view>
    <view class="stat-strip">
      <view class="stat-item">
        <text class="stat-num">9</text>
        <text class="stat-label">题问卷</text>
      </view>
      <view class="stat-sep"></view>
      <view class="stat-item">
        <text class="stat-num">4</text>
        <text class="stat-label">章文件</text>
      </view>
      <view class="stat-sep"></view>
      <view class="stat-item">
        <text class="stat-num stat-num-sm">国标</text>
        <text class="stat-label">依据</text>
      </view>
    </view>
  </view>'''
    ),
    (
        '''  <!-- 主CTA -->
  <view class="cta-section">
    <view class="cta-card">
      <button class="btn-primary" bindtap="startAssessment">开始定制我的门窗标准</button>
    </view>
    <view class="trust-anchor">基于1000+户实际案例提炼的判断标准</view>
  </view>''',
        '''  <!-- 主CTA -->
  <view class="cta-section">
    <view class="cta-card">
      <button class="btn-primary" bindtap="startAssessment">开始定制我的门窗标准</button>
      <view class="deliverable-tags">
        <text class="deliverable-tag">性能诊断</text>
        <text class="deliverable-tag">红线清单</text>
        <text class="deliverable-tag">验收清单</text>
      </view>
      <view class="trust-anchor">基于1000+户实际案例提炼的判断标准</view>
    </view>
  </view>'''
    ),
    (
        '      <view class="step-title">使用流程</view>',
        '      <view class="step-label">使用流程</view>'
    ),
]

wxss_path = os.path.join(BASE, 'pages/index/index.wxss')
wxss_patches = [
    (
        '''.page-title {
  font-size: 44rpx;
  font-weight: bold;
  margin-bottom: 24rpx;
}''',
        '''.page-title {
  font-size: 60rpx;
  font-weight: 600;
  letter-spacing: -1rpx;
  line-height: 1.2;
  margin-bottom: 16rpx;
}'''
    ),
    (
        '''.identity {
  font-size: 36rpx;
  font-weight: bold;
  margin-bottom: 24rpx;
}

.expert-name {
  font-size: 40rpx;
  font-weight: bold;
}

.expert-role {
  font-weight: normal;
  opacity: 0.9;
}''',
        '''.identity {
  font-size: 26rpx;
  font-weight: 400;
  opacity: 0.55;
  letter-spacing: 0.5rpx;
  margin-bottom: 0;
}

.expert-name {
  font-size: 26rpx;
  font-weight: 500;
}

.expert-role {
  font-weight: 400;
}'''
    ),
    (
        '''.stamp {
  display: inline-block;
  border: 2rpx solid rgba(255, 255, 255, 0.4);
  padding: 8rpx 24rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
  font-weight: bold;
  margin-bottom: 24rpx;
  letter-spacing: 4rpx;
}''',
        '''.badge {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  background: rgba(196, 149, 42, 0.13);
  border: 1rpx solid rgba(196, 149, 42, 0.32);
  border-radius: 100rpx;
  padding: 10rpx 28rpx;
  margin-bottom: 40rpx;
}

.badge-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #C4952A;
  margin-right: 14rpx;
  flex-shrink: 0;
}

.badge-text {
  color: #D4A83A;
  font-size: 24rpx;
  letter-spacing: 2rpx;
  font-weight: 500;
}'''
    ),
    (
        '''.promise {
  font-size: 28rpx;
  line-height: 1.6;
  opacity: 0.95;
}

.promise-secondary {
  font-size: 26rpx;
  line-height: 1.5;
  opacity: 0.85;
  margin-top: 24rpx;
}''',
        '''.promise {
  font-size: 28rpx;
  line-height: 1.75;
  opacity: 0.88;
}

.hero-divider {
  width: 56rpx;
  height: 2rpx;
  background: rgba(255, 255, 255, 0.16);
  border-radius: 2rpx;
  margin: 28rpx auto;
}

.stat-strip {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  margin-top: 40rpx;
  padding-top: 36rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.1);
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-num {
  color: #FFFFFF;
  font-size: 40rpx;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -1rpx;
}

.stat-num-sm {
  font-size: 28rpx;
  letter-spacing: 1rpx;
}

.stat-label {
  color: rgba(255, 255, 255, 0.4);
  font-size: 22rpx;
  margin-top: 10rpx;
  letter-spacing: 1rpx;
}

.stat-sep {
  width: 1rpx;
  height: 56rpx;
  background: rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}'''
    ),
    (
        '''.btn-primary:active {
  opacity: 0.8;
}

.trust-anchor {''',
        '''.btn-primary:active {
  opacity: 0.8;
}

.deliverable-tags {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 16rpx;
  margin: 28rpx 0 20rpx;
}

.deliverable-tag {
  background: #EEF2F8;
  color: #1B3A6B;
  font-size: 24rpx;
  padding: 10rpx 24rpx;
  border-radius: 100rpx;
  font-weight: 500;
  letter-spacing: 0.4rpx;
}

.trust-anchor {'''
    ),
    (
        '''.trust-anchor {
  font-size: 24rpx;
  line-height: 1.4;
  opacity: 0.6;
  text-align: center;
  margin-top: 20rpx;
  color: #666666;
}''',
        '''.trust-anchor {
  font-size: 22rpx;
  line-height: 1.5;
  text-align: center;
  color: #BCC4CE;
}'''
    ),
    (
        '''.step-number {
  width: 48rpx;
  height: 48rpx;
  background: #1B3F72;
  color: #FFFFFF;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 600;
  flex-shrink: 0;
}''',
        '''.step-number {
  width: 56rpx;
  height: 56rpx;
  background: transparent;
  border: 2rpx solid #1B3A6B;
  color: #1B3A6B;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 600;
  flex-shrink: 0;
}'''
    ),
    (
        '''.step-item::after {
  content: "";
  position: absolute;
  left: 24rpx;
  top: 72rpx;
  bottom: 0;
  width: 1rpx;
  background: rgba(27, 63, 114, 0.2);
}''',
        '''.step-item::after {
  content: "";
  position: absolute;
  left: 27rpx;
  top: 76rpx;
  bottom: 0;
  width: 1rpx;
  background: rgba(27, 63, 114, 0.15);
}'''
    ),
    (
        '''.step-title {
  font-size: 32rpx;
  font-weight: bold;
  color: var(--color-text);
  margin-bottom: 24rpx;
}''',
        '''.step-title {
  font-size: 32rpx;
  font-weight: bold;
  color: var(--color-text);
  margin-bottom: 24rpx;
}

.step-label {
  font-size: 22rpx;
  font-weight: 500;
  color: #B0B8C4;
  letter-spacing: 3rpx;
  text-transform: uppercase;
  margin-bottom: 40rpx;
}'''
    ),
]

print("Patching WXML...")
apply_patch(wxml_path, wxml_patches)
print("Patching WXSS...")
apply_patch(wxss_path, wxss_patches)
print("\nAll patches complete. Run npm test.")
