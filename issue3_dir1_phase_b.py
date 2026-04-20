# -*- coding: utf-8 -*-
"""
议题 3 方向 1 · Phase B 执行脚本
====================================
范围：
  1. 新建 ruleBasisSpec.js × 2（字典定义，Phase C 再做 bullet 消费）
  2. GR + CT documentMapper.js 立场词软化
  3. GR documentMapper.js quiet 分支死代码修复（noise_type → noiseType）
  4. GR documentMapper.js chapter1 return 新增 dataSourceStatement 字段
  5. result.wxml 第一章 dataSourceStatement 区块插入
  6. result.wxss 新增样式
  7. 测试断言同步更新（4处）

不在范围：
  - calculator-v2.js corrections[].label（不改，超出呈现层边界）
  - buildParameterNote bullet 级依据标签注入（Phase C）
  - CT 侧 chapter1 dataSourceStatement（CT 无 chapter1 渲染路径）

使用方式：
    cd <项目根目录>
    python issue3_dir1_phase_b.py
"""

import sys
import os
from pathlib import Path

# ── 路径常量 ───────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent
GR_MAPPER = ROOT / 'miniprogram/cloudfunctions/generateReport/documentMapper.js'
CT_MAPPER = ROOT / 'miniprogram/cloudfunctions/createTender/documentMapper.js'
GR_RULE_BASIS = ROOT / 'miniprogram/cloudfunctions/generateReport/shared/ruleBasisSpec.js'
CT_RULE_BASIS = ROOT / 'miniprogram/cloudfunctions/createTender/shared/ruleBasisSpec.js'
RESULT_WXML = ROOT / 'miniprogram/pages/result/result.wxml'
RESULT_WXSS = ROOT / 'miniprogram/pages/result/result.wxss'
DM_TEST = ROOT / 'miniprogram/cloudfunctions/generateReport/test/unit/documentMapper.test.js'
REGRESSION = ROOT / 'miniprogram/cloudfunctions/test/v3-p2-regression.js'

# ── ruleBasisSpec.js 内容 ──────────────────────────────────────────────────
RULE_BASIS_CONTENT = """\
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
"""

# ── dataSourceStatement 文案 ───────────────────────────────────────────────
DATA_SOURCE_STMT = (
    '本报告数据来源：每项指标由三类信息共同确定——'
    '国家/行业标准基准值、您的项目信息（城市/楼层/朝向/噪声/家庭风险等）、'
    '工程经验修正（李Sir 基于工程案例的判断）。'
    '工程经验修正不等同于国标，但经得起案例追溯。'
)

# ── dataSourceStatement wxml 区块 ──────────────────────────────────────────
WXML_DATASOURCE_BLOCK = """
    <!-- 数据来源声明 -->
    <view class="datasource-note" wx:if="{{chapter1.dataSourceStatement}}">
      <text class="datasource-text">{{chapter1.dataSourceStatement}}</text>
    </view>
"""

# ── dataSourceStatement wxss 样式 ──────────────────────────────────────────
WXSS_DATASOURCE_STYLE = """
/* 数据来源声明 · 议题3方向1 Phase B */
.datasource-note {
  margin: 16rpx 0 24rpx 0;
  padding: 16rpx 20rpx;
  background: #f7f8fa;
  border-left: 4rpx solid #b0b8c8;
  border-radius: 0 8rpx 8rpx 0;
}
.datasource-text {
  font-size: 22rpx;
  color: #7a8599;
  line-height: 1.6;
  letter-spacing: 0.02em;
}
"""


# ── 补丁定义 ──────────────────────────────────────────────────────────────

def patch_str_replace(content, old_str, new_str, patch_name):
    """执行单次精确 str_replace，返回 (new_content, hit_count)"""
    count = content.count(old_str)
    if count == 0:
        return content, 0
    if count > 1:
        # 多处命中时只替换第一次，并标记警告
        return content.replace(old_str, new_str, 1), count
    return content.replace(old_str, new_str), 1


def apply_patches(content, patches):
    """批量应用补丁列表，返回 (new_content, report)"""
    report = []
    for name, old_str, new_str in patches:
        count_before = content.count(old_str)
        if count_before == 0:
            report.append((name, '未命中', 0))
        else:
            content = content.replace(old_str, new_str, 1)
            report.append((name, 'OK' if count_before == 1 else f'警告:命中{count_before}处,仅替换第一处', count_before))
    return content, report


# ════════════════════════════════════════════════════════════════════════════
# PATCH GROUP A · GR documentMapper.js
# ════════════════════════════════════════════════════════════════════════════

GR_PATCHES = [

    # A-1 getThermalModifier 立场词（L486-487）
    (
        'A-1 getThermalModifier 西向隔热加严',
        "  if (isWest && formData.west_shading === false) return '西向隔热加严';",
        "  if (isWest && formData.west_shading === false) return '西向隔热修正';",
    ),
    (
        'A-2 getThermalModifier 无供暖保温加严',
        "  if (formData.heating_type === 'none') return '无供暖保温加严';",
        "  if (formData.heating_type === 'none') return '无供暖保温修正';",
    ),

    # A-3 buildNeedsTable kBasisText 立场词（L529-533）
    (
        'A-3 kBasisText 自采暖保温加严',
        "    if (answers.heating_type === 'self') kBasisText = `${czCN}区 自采暖保温加严`;",
        "    if (answers.heating_type === 'self') kBasisText = `${czCN}区 自采暖保温修正`;",
    ),
    (
        'A-4 kBasisText 西向隔热加严',
        "    kBasisText = `${czCN}区 西向隔热加严`;",
        "    kBasisText = `${czCN}区 西向隔热修正`;",
    ),
    (
        'A-5 kBasisText 落地窗隔热加严',
        "    kBasisText = `${czCN}区 落地窗隔热加严`;",
        "    kBasisText = `${czCN}区 落地窗隔热修正`;",
    ),

    # A-6 needsTable derivation 立场词（L549）
    (
        'A-6 needsTable derivation 隔声优先加严',
        "  if (_usageAdj > 0) _rwAdjParts.push(`隔声优先加严+${_usageAdj}dB`);",
        "  if (_usageAdj > 0) _rwAdjParts.push(`隔声优先修正+${_usageAdj}dB`);",
    ),

    # A-7 needsTable derivation quiet 分支立场词（L570）
    (
        'A-7 needsTable derivation quiet 隔声优先加严',
        "        ? `周边环境安静，基础Rw≥${_rwBase}dB${_usageAdj > 0 ? `，隔声优先加严+${_usageAdj}dB` : ''}，本案要求Rw≥${getField(resolved, 'Rw')}dB`",
        "        ? `周边环境安静，基础Rw≥${_rwBase}dB${_usageAdj > 0 ? `，隔声优先修正+${_usageAdj}dB` : ''}，本案要求Rw≥${getField(resolved, 'Rw')}dB`",
    ),

    # A-8 buildParameterNote usageExplain 立场词（L655-656）
    (
        'A-8 buildParameterNote usageExplain rail分支',
        "    ? '隔声降噪诉求加严 0（轨道噪声已按最严基准计）'\n    : `隔声降噪诉求加严 ${usageAdjText}`;",
        "    ? '隔声降噪诉求修正 0（轨道噪声已按最严基准计）'\n    : `隔声降噪诉求修正 ${usageAdjText}`;",
    ),

    # A-9 buildParameterNote quiet 分支死代码修复 + 立场词（L657-663）
    # 修复 inputs.noise_type → inputs.noiseType，删除"加严修正"立场词
    (
        'A-9 buildParameterNote quiet分支死代码修复+立场词',
        "  if (inputs.noise_type === 'quiet') {\n"
        "  const quietUsageNote = soundInsulation.usageAdj > 0\n"
        "    ? `；因您将隔声降噪列为核心诉求，加严修正+${soundInsulation.usageAdj}`\n"
        "    : '';\n"
        "  lines.push(`② **隔声**：噪声环境评估为安静（夜间本底噪声约35–40dB），隔声基准取${soundInsulation.baseRw} dB，无距离修正${quietUsageNote}，最终 ≥${soundInsulation.value} dB。依据：GB 50118 · 安静环境基础隔声标准。`);\n"
        "} else {\n"
        "  lines.push(`② **隔声**：${noiseText}，基础 Rw≥${soundInsulation.baseRw} dB，距离修正 ${distAdjText}，${usageExplain}，最终 ≥${soundInsulation.value} dB。依据：GB 50118 + HJ 2055 · 轨道交通中距离声学计算推导值。`);\n"
        "}",
        "  if (inputs.noiseType === 'quiet') {\n"
        "    const quietUsageNote = soundInsulation.usageAdj > 0\n"
        "      ? `，睡眠场景修正+${soundInsulation.usageAdj}dB（工程经验）`\n"
        "      : '';\n"
        "    lines.push(`② **隔声**：噪声环境安静（夜间本底噪声约35–40dB），隔声基准 Rw≥${soundInsulation.baseRw} dB（GB 50118），无距离修正${quietUsageNote}，最终 ≥${soundInsulation.value} dB。依据：GB 50118 · 安静环境基础隔声标准。`);\n"
        "  } else {\n"
        "    lines.push(`② **隔声**：${noiseText}，基础 Rw≥${soundInsulation.baseRw} dB（工程经验），距离修正 ${distAdjText}（工程经验），${usageExplain}，最终 ≥${soundInsulation.value} dB。依据：GB 50118 + HJ 2055 · 轨道交通中距离声学计算推导值。`);\n"
        "  }",
    ),

    # A-10 buildAcceptanceSection note 立场词（L1622）
    (
        'A-10 buildAcceptanceSection note 睡眠场景加严',
        "normalizedAnswers.pain_point === 'sound' ? '，睡眠场景加严' : ''",
        "normalizedAnswers.pain_point === 'sound' ? '，睡眠场景修正' : ''",
    ),
]

# GR chapter1 dataSourceStatement 字段新增
GR_CHAPTER1_DATASOURCE_PATCH = (
    'A-11 chapter1 return 新增 dataSourceStatement',
    "    chapter1: {\n"
    "      basicInfo: build1_1(normalizedAnswers),",
    "    chapter1: {\n"
    f"      dataSourceStatement: '{DATA_SOURCE_STMT}',\n"
    "      basicInfo: build1_1(normalizedAnswers),",
)


# ════════════════════════════════════════════════════════════════════════════
# PATCH GROUP B · CT documentMapper.js
# ════════════════════════════════════════════════════════════════════════════

CT_PATCHES = [

    # B-1 getThermalModifier 立场词（CT L433-434）
    (
        'B-1 getThermalModifier 西向隔热加严',
        "  if (isWest && formData.west_shading === false) return '西向隔热加严';",
        "  if (isWest && formData.west_shading === false) return '西向隔热修正';",
    ),
    (
        'B-2 getThermalModifier 无供暖保温加严',
        "  if (formData.heating_type === 'none') return '无供暖保温加严';",
        "  if (formData.heating_type === 'none') return '无供暖保温修正';",
    ),

    # B-3 kBasisText 立场词（CT L476-480，与 GR 相同文本）
    (
        'B-3 kBasisText 自采暖保温加严',
        "    if (answers.heating_type === 'self') kBasisText = `${czCN}区 自采暖保温加严`;",
        "    if (answers.heating_type === 'self') kBasisText = `${czCN}区 自采暖保温修正`;",
    ),
    (
        'B-4 kBasisText 西向隔热加严',
        "    kBasisText = `${czCN}区 西向隔热加严`;",
        "    kBasisText = `${czCN}区 西向隔热修正`;",
    ),
    (
        'B-5 kBasisText 落地窗隔热加严',
        "    kBasisText = `${czCN}区 落地窗隔热加严`;",
        "    kBasisText = `${czCN}区 落地窗隔热修正`;",
    ),

    # B-6 buildParameterNote usageExplain 立场词（CT L562-563）
    (
        'B-6 buildParameterNote usageExplain',
        "    ? '隔声降噪诉求加严 0（轨道噪声已按最严基准计）'\n    : `隔声降噪诉求加严 ${usageAdjText}`;",
        "    ? '隔声降噪诉求修正 0（轨道噪声已按最严基准计）'\n    : `隔声降噪诉求修正 ${usageAdjText}`;",
    ),

    # B-7 buildAcceptanceSection note 立场词（CT L1406）
    (
        'B-7 buildAcceptanceSection note 睡眠场景加严',
        "normalizedAnswers.pain_point === 'sound' ? '，睡眠场景加严' : ''",
        "normalizedAnswers.pain_point === 'sound' ? '，睡眠场景修正' : ''",
    ),
]


# ════════════════════════════════════════════════════════════════════════════
# PATCH GROUP C · result.wxml
# ════════════════════════════════════════════════════════════════════════════

WXML_PATCHES = [
    (
        'C-1 result.wxml 第一章 dataSourceStatement 区块插入',
        "      <text class=\"chapter-title\">性能需求诊断</text>\n"
        "    </view>\n"
        "\n"
        "    <!-- M1-1 项目身份信息 -->",
        "      <text class=\"chapter-title\">性能需求诊断</text>\n"
        "    </view>\n"
        + WXML_DATASOURCE_BLOCK
        + "    <!-- M1-1 项目身份信息 -->",
    ),
]


# ════════════════════════════════════════════════════════════════════════════
# PATCH GROUP D · 测试断言同步更新
# ════════════════════════════════════════════════════════════════════════════

DM_TEST_PATCHES = [
    (
        'D-1 documentMapper.test DM29 西向隔热加严断言',
        "    expect(String(kRow.basis || '')).toContain('西向隔热加严');",
        "    expect(String(kRow.basis || '')).toContain('西向隔热修正');",
    ),
    (
        'D-2 documentMapper.test DM-502 隔声降噪诉求加严断言',
        "    expect(pdfContent).toContain('隔声降噪诉求加严');",
        "    expect(pdfContent).toContain('隔声降噪诉求修正');",
    ),
]

REGRESSION_PATCHES = [
    (
        'D-3 v3-p2-regression T-K2 西向隔热加严断言',
        "if (!String(kRow.basis || '').includes('西向隔热加严')) throw new Error('T-K2 basis mismatch');",
        "if (!String(kRow.basis || '').includes('西向隔热修正')) throw new Error('T-K2 basis mismatch');",
    ),
    (
        'D-4 v3-p2-regression T-K3 落地窗隔热加严断言',
        "if (!String(kRow.basis || '').includes('落地窗隔热加严')) throw new Error('T-K3 basis mismatch');",
        "if (!String(kRow.basis || '').includes('落地窗隔热修正')) throw new Error('T-K3 basis mismatch');",
    ),
]


# ════════════════════════════════════════════════════════════════════════════
# 主流程
# ════════════════════════════════════════════════════════════════════════════

def check_paths():
    """Phase 0：验证所有文件存在"""
    required = [GR_MAPPER, CT_MAPPER, RESULT_WXML, RESULT_WXSS, DM_TEST, REGRESSION]
    missing = [str(p) for p in required if not p.exists()]
    if missing:
        print('【错误】以下文件不存在：')
        for m in missing:
            print(f'  {m}')
        return False
    # ruleBasisSpec 不应已存在
    for rb in [GR_RULE_BASIS, CT_RULE_BASIS]:
        if rb.exists():
            print(f'[H7 TRIGGERED] ruleBasisSpec.js already exists: {rb}')
            print('File should not exist, stopping execution.')
            return False
    return True


def write_rule_basis():
    """新建 ruleBasisSpec.js × 2"""
    report = []
    for path in [GR_RULE_BASIS, CT_RULE_BASIS]:
        path.write_text(RULE_BASIS_CONTENT, encoding='utf-8')
        report.append((f'新建 {path.relative_to(ROOT)}', 'OK', 1))
    return report


def patch_file(path, patches, extra_patches=None):
    """读取文件，应用补丁列表，写回"""
    content = path.read_text(encoding='utf-8')
    backup = path.with_suffix(path.suffix + '.bak_phase_b')
    backup.write_text(content, encoding='utf-8')

    all_patches = list(patches)
    if extra_patches:
        all_patches.append(extra_patches)

    content, report = apply_patches(content, all_patches)
    path.write_text(content, encoding='utf-8')
    return report


def patch_wxml(path):
    """wxml 文件补丁"""
    content = path.read_text(encoding='utf-8')
    backup = path.with_suffix(path.suffix + '.bak_phase_b')
    backup.write_text(content, encoding='utf-8')
    content, report = apply_patches(content, WXML_PATCHES)
    path.write_text(content, encoding='utf-8')
    return report


def patch_wxss(path):
    """wxss 追加样式"""
    content = path.read_text(encoding='utf-8')
    backup = path.with_suffix(path.suffix + '.bak_phase_b')
    backup.write_text(content, encoding='utf-8')
    # 追加到文件末尾
    if '.datasource-note' in content:
        return [('E-1 result.wxss datasource 样式', '已存在，跳过', 0)]
    content += WXSS_DATASOURCE_STYLE
    path.write_text(content, encoding='utf-8')
    return [('E-1 result.wxss datasource 样式', 'OK', 1)]


def print_report(title, report):
    print(f'\n── {title}')
    all_ok = True
    for name, status, count in report:
        icon = '[OK]' if status == 'OK' else ('[WARN]' if '警告' in status else '[FAIL]')
        print(f'  {icon}  {status:12s}  {name}')
        if status not in ('OK', '已存在，跳过'):
            all_ok = False
    return all_ok


def verify_立场词零残留():
    """验证 documentMapper 中立场词已清零（限已知词表）"""
    import re
    pattern = re.compile(r'加严(?!修正)(?!前)(?!后)(?!结果)')  # 排除"加严修正"以外的"加严"
    残留 = []
    for path in [GR_MAPPER, CT_MAPPER]:
        content = path.read_text(encoding='utf-8')
        for i, line in enumerate(content.splitlines(), 1):
            if pattern.search(line) and '//' not in line[:line.find('加严') if '加严' in line else 0]:
                残留.append(f'  {path.relative_to(ROOT)}:{i}: {line.strip()[:80]}')
    if 残留:
        print('\n[WARN] 立场词残留检查（非注释行）：')
        for r in 残留:
            print(r)
    else:
        print('\n[OK] 立场词零残留验证通过')
    return len(残留) == 0


def main():
    print('=' * 66)
    print('Issue 3 Dir 1 Phase B Execution Report')
    print('=' * 66)

    # Phase 0
    print('\n[Phase 0] File path validation...')
    if not check_paths():
        sys.exit(1)
    print('  [OK] All file paths validated')

    all_ok = True

    # Group E：新建 ruleBasisSpec.js
    r = write_rule_basis()
    all_ok &= print_report('Group E · ruleBasisSpec.js × 2 新建', r)

    # Group A：GR documentMapper.js
    r = patch_file(GR_MAPPER, GR_PATCHES, GR_CHAPTER1_DATASOURCE_PATCH)
    all_ok &= print_report('Group A · GR documentMapper.js', r)

    # Group B：CT documentMapper.js
    r = patch_file(CT_MAPPER, CT_PATCHES)
    all_ok &= print_report('Group B · CT documentMapper.js', r)

    # Group C：result.wxml
    r = patch_wxml(RESULT_WXML)
    all_ok &= print_report('Group C · result.wxml', r)

    # Group E：result.wxss
    r = patch_wxss(RESULT_WXSS)
    all_ok &= print_report('Group E · result.wxss', r)

    # Group D：测试断言
    r = patch_file(DM_TEST, DM_TEST_PATCHES)
    all_ok &= print_report('Group D1 · documentMapper.test.js', r)
    r = patch_file(REGRESSION, REGRESSION_PATCHES)
    all_ok &= print_report('Group D2 · v3-p2-regression.js', r)

    # 立场词零残留验证
    verify_立场词零残留()

    print('\n' + '=' * 66)
    if all_ok:
        print('[OK] Phase B all patches applied, backup files saved as *.bak_phase_b')
        print('     Run tests: cd miniprogram/cloudfunctions/generateReport && npm test')
    else:
        print('[FAIL] Some patches missed, check report above before commit.')
    print('=' * 66)


if __name__ == '__main__':
    main()
