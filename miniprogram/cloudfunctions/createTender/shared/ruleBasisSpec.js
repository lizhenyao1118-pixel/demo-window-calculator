'use strict';
/**
 * ruleBasisSpec.js — 规则依据字典
 * =====================================
 * 每条性能修正规则的来源标注，供 buildParameterNote 及后续 Phase C 依据标签注入使用。
 * basis 三类：
 *   'national_standard'   — 国标 / 行业标准有明确条文
 *   'empirical_rule'      — 李Sir 工程案例经验规则
 *   'pending_verification'— 规则存在但依据未完整核实
 *
 * 与 redlineSpec.js 同构，无 require 依赖。
 * 建立时间：2026-04-20 | 议题 3 方向 1 Phase B
 */

const RULE_BASIS = {

  // ── 隔声主线 ─────────────────────────────────────────────────────────────
  'Rw.base.main_road': {
    basis: 'empirical_rule',
    note: '主干道噪声场景起点值 35dB，工程案例留档；高于 GB 50118 Rw≥30 下限'
  },
  'Rw.base.elevated': {
    basis: 'empirical_rule',
    note: '高架噪声场景起点值 38dB，工程案例留档'
  },
  'Rw.base.rail': {
    basis: 'empirical_rule',
    note: '轨道噪声场景起点值 40dB，工程案例留档'
  },
  'Rw.base.quiet': {
    basis: 'national_standard',
    source: 'GB 50118',
    note: '安静环境基础隔声标准'
  },
  'Rw.dist.lt20': {
    basis: 'empirical_rule',
    note: '近距离噪声源修正 +3dB，工程案例留档；非 ISO 9613 严格声学推导'
  },
  'Rw.dist.20to50': {
    basis: 'empirical_rule',
    note: '中距离，修正为 0'
  },
  'Rw.dist.gt50': {
    basis: 'empirical_rule',
    note: '远距离噪声源修正 -3dB，工程案例留档'
  },
  'Rw.dist.gt50_shielded': {
    basis: 'empirical_rule',
    note: '远距离有遮挡，修正同 gt50'
  },
  'Rw.usage.sleep': {
    basis: 'empirical_rule',
    note: '睡眠场景修正 +3dB，工程案例留档；业界也常用升档玻璃配置替代'
  },

  // ── 热工主线 ─────────────────────────────────────────────────────────────
  'K.base': {
    basis: 'national_standard',
    source: 'GB 50189 / JGJ 26',
    note: '各气候区传热系数基准值，公共建筑 / 居住建筑节能标准'
  },
  'K.adj.heating_self': {
    basis: 'empirical_rule',
    note: '自采暖场景修正 -0.2 W/(m²·K)，工程案例留档；在多数气候区等效于 kMin'
  },
  'K.adj.west_sun': {
    basis: 'empirical_rule',
    note: '西晒修正 -0.1 W/(m²·K)，工程案例留档'
  },
  'K.adj.big_window': {
    basis: 'empirical_rule',
    note: '落地窗热工修正 -0.2 W/(m²·K)，工程案例留档'
  },

  // ── 抗风主线 ─────────────────────────────────────────────────────────────
  'P3.zone_mapping': {
    basis: 'national_standard',
    source: 'GB/T 7106',
    note: '风压等级按城市风区 + 楼层高度比查表'
  },

  // ── 水密气密主线 ─────────────────────────────────────────────────────────
  'seal.air.base': {
    basis: 'national_standard',
    source: 'GB/T 7106',
    note: '气密性能等级基础值，居住建筑推荐 4 级以上'
  },
  'seal.water.base': {
    basis: 'national_standard',
    source: 'GB/T 7106',
    note: '水密性能等级基础值'
  },
  'seal.coastal_upgrade': {
    basis: 'empirical_rule',
    note: '沿海 / 台风风险城市水密等级上调，工程案例留档'
  },
  'seal.highfloor_upgrade': {
    basis: 'empirical_rule',
    note: '高层（≥7F）气密 / 水密等级上调，工程案例留档'
  },
};

module.exports = { RULE_BASIS };
