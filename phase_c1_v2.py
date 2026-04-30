#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Phase C-1 v2: documentMapper.js 渐进式重构
保持向后兼容 + 添加新章节结构
"""

import os
import shutil
from datetime import datetime

# 配置汇总答题表 26 字段定义
CONFIG_SUMMARY_FIELDS = [
    # 性能整窗值类（6 项）
    {'id': 'F01', 'category': 'performance', 'label': '整窗 Rw', 'proof_required': '第三方声学检测报告编号 + 出具机构 + 检测日期 + 样窗规格'},
    {'id': 'F02', 'category': 'performance', 'label': '整窗 K 值', 'proof_required': '整窗热工检测报告编号 + 出具机构'},
    {'id': 'F03', 'category': 'performance', 'label': '整窗 SHGC', 'proof_required': '整窗热工检测报告编号'},
    {'id': 'F04', 'category': 'performance', 'label': '抗风压 P3', 'proof_required': '抗风压检测报告编号 + 适用洞口尺寸范围'},
    {'id': 'F05', 'category': 'performance', 'label': '气密等级', 'proof_required': 'GB/T 7106 检测报告编号'},
    {'id': 'F06', 'category': 'performance', 'label': '水密等级', 'proof_required': 'GB/T 7106 检测报告编号'},

    # 玻璃配置类（5 项）
    {'id': 'F07', 'category': 'glass', 'label': '玻璃配置型号', 'proof_required': '玻璃厂家 + 品牌'},
    {'id': 'F08', 'category': 'glass', 'label': '玻璃理论 Rw', 'proof_required': '玻璃 Rw 检测报告'},
    {'id': 'F09', 'category': 'glass', 'label': 'Low-E 镀膜位置', 'proof_required': '玻璃产品说明书'},
    {'id': 'F10', 'category': 'glass', 'label': '玻璃安全性', 'proof_required': '3C 标识 + 检测报告'},
    {'id': 'F11', 'category': 'glass', 'label': '间隔条材质', 'proof_required': '材料说明书'},

    # 型材配置类（4 项）
    {'id': 'F12', 'category': 'profile', 'label': '型材品牌及系列', 'proof_required': '系统授权书'},
    {'id': 'F13', 'category': 'profile', 'label': '型材合金牌号', 'proof_required': '材质证明书'},
    {'id': 'F14', 'category': 'profile', 'label': '主受力壁厚', 'proof_required': '型材截面检测报告'},
    {'id': 'F15', 'category': 'profile', 'label': '隔热条规格', 'proof_required': '隔热条材质证明'},

    # 五金配置类（3 项）
    {'id': 'F16', 'category': 'hardware', 'label': '五金品牌', 'proof_required': '五金合格证'},
    {'id': 'F17', 'category': 'hardware', 'label': '五金系列/型号', 'proof_required': '五金合格证'},
    {'id': 'F18', 'category': 'hardware', 'label': '五金保修年限', 'proof_required': '厂家保修承诺'},

    # 密封与安装类（4 项）
    {'id': 'F19', 'category': 'sealing', 'label': '胶条材质', 'proof_required': '胶条说明书'},
    {'id': 'F20', 'category': 'sealing', 'label': '耐候密封胶品牌', 'proof_required': '产品说明书'},
    {'id': 'F21', 'category': 'sealing', 'label': '发泡剂品牌', 'proof_required': '产品说明书'},
    {'id': 'F22', 'category': 'sealing', 'label': '固定件间距承诺', 'proof_required': '安装方案文件'},

    # 商务字段类（4 项）
    {'id': 'F23', 'category': 'commercial', 'label': '含税单价', 'proof_required': ''},
    {'id': 'F24', 'category': 'commercial', 'label': '工期', 'proof_required': ''},
    {'id': 'F25', 'category': 'commercial', 'label': '质保年限', 'proof_required': '质保协议'},
    {'id': 'F26', 'category': 'commercial', 'label': '公司名称 + 签名', 'proof_required': ''}
]


def generate_new_sections_fragment():
    """生成新章节结构的代码片段（将被插入到 return 语句中）"""

    # 配置汇总答题表字段 JSON
    config_fields_json = ',\n        '.join([
            f"""{{ id: '{f['id']}, category: '{f['category']}', label: '{f['label']}', vendor_fillable: true, proof_required: '{f['proof_required']}' }}"""
            for f in CONFIG_SUMMARY_FIELDS
        ])

    return f'''
    // ==================== Phase C: 新章节结构 ====================

    // 开篇 · 你的需求画像
    overview: {{
      dataSourceStatement: '本报告数据来源：每项指标由三类信息共同确定——国家/行业标准基准值、您的项目信息（城市/楼层/朝向/噪声/家庭风险等）、工程经验修正（李Sir 基于工程案例的判断）。工程经验修正不等同于国标，但经得起案例追溯。',
      basicInfo: build1_1(normalizedAnswers),
      coreTension: buildAnalysisParagraph(normalizedAnswers, resolved),
      painPoint: normalizedAnswers.pain_point,
      painTag: painTag
    }},

    // 第五章 · 安全配置（条件显示）
    chapter5: safetyForced ? {{
      title: '安全配置',
      show: true,
      triggers: {{
        has_large_fixed: window_features.has_large_fixed,
        has_children: familyRisk.includes('child'),
        window_type: normalizedAnswers.window_type
      }},
      requirements: [
        (window_features.has_large_fixed || familyRisk.includes('child')) ? {{ item: '玻璃安全性', spec: '钢化+夹胶，PVB≥0.76mm' }} : null,
        normalizedAnswers.window_type === 'sliding' ? {{ item: '推拉窗限位', spec: '儿童安全锁+限位器' }} : null,
        {{ item: '防坠装置', spec: '外开窗配防坠绳，承重≥75kg' }}
      ].filter(Boolean),
      redlines: (sharedRedlineChecklist.mandatory || []).filter(r =>
        ['R13', 'R14'].includes(r.id)
      ),
      optionalUpgrades: safety.items || []
    }} : {{ show: false }},

    // 过渡小节
    transition: {{
      title: '如何使用这张配置汇总答题表',
      guideText: '把本表发给三个商家填好回传，就能横向对比谁在偷项、谁真正达标。'
    }},

    // 第六章 · 配置汇总答题表
    chapter6: {{
      title: '配置汇总答题表',
      intro: '以下 26 项为商家必须回应的技术参数。逐项对比，差距一目了然。',
      configSummaryTable: [
        {config_fields_json}
      ],
      // 填充 spec_required 值（运行时绑定）
      specValues: {{
        F01: Rw ? `Rw ≥ ${{Rw}} dB` : '待反查',
        F02: K ? `K ≤ ${{K}} W/(m²·K)` : '待反查',
        F03: SHGC ? `SHGC ≤ ${{SHGC}}` : '待反查',
        F04: P3 ? `P3 ≥ ${{P3}} kPa` : '待反查',
        F05: `≥${{resolvedSealGrades.airRec}}级`,
        F06: `≥${{resolvedSealGrades.waterRec}}级`,
        F07: resolved.glass_name || '待反查',
        F08: (GLASS_LEVELS[resolved.glass_key]?.rw_max ?? null) ? `${{GLASS_LEVELS[resolved.glass_key]?.rw_max}} dB` : '待反查',
        F09: resolved.thermal_overlay || '待反查',
        F10: (window_features.has_large_fixed || familyRisk.includes('child')) ? '钢化+夹胶' : '按规范',
        F11: (['严寒', '寒冷'].includes(getClimateLabel(climateZone)) || K <= 1.6) ? '暖边条（推荐）' : '无特殊要求',
        F12: '无指定（商家自报）',
        F13: '6063-T5 或同等',
        F14: `≥${{budgetSpec.profileWallThickness || 1.5}}mm`,
        F15: getInsulationBarRequirement(K).spec || '按 K 值匹配',
        F16: '无指定（商家自报）',
        F17: '无指定（商家自报）',
        F18: '≥5 年',
        F19: 'EPDM 或 TPE',
        F20: '无指定（商家自报）',
        F21: '无指定（商家自报）',
        F22: budgetSpec.installation || '按规范',
        F23: '（商家填写）',
        F24: '（商家填写）',
        F25: '≥5 年',
        F26: '（商家签字）'
      }},
      redlineConfirm: {{
        title: '红线承诺确认',
        text: '以上配置满足本案全部红线要求',
        checklist: sharedRedlineChecklist.mandatory || []
      }}
    }},

    // 第七章 · 三阶段过程把控
    chapter7: {{
      title: '三阶段过程把控',
      phases: [
        {{
          name: '下单前',
          checklist: '核对商家答题表 → 确认关键参数与本案要求一致',
          keyItems: ['玻璃配置型号(F07)', '型材壁厚(F14)', '隔热条规格(F15)', '五金品牌(F16)']
        }},
        {{
          name: '安装前（进场）',
          checklist: '对照本章清单检查到货实物——玻璃钢印 / 五金品牌 / 型材系列',
          inspectionItems: (buildChapter4Data(answers, budgetSpec, resolved, riskTrigger, isRisk, sharedRedlineChecklist).inspectionChecklist) || []
        }},
        {{
          name: '安装后（竣工）',
          checklist: '按本报告给出的验收标准进行试水、试开关与目测检查',
          acceptanceItems: buildAcceptanceItems(ACCEPTANCE_ITEMS_WINDOW, normalizedAnswers.window_type)
        }}
      ]
    }},

    // ==================== 保留章节（向后兼容） ====================
'''


def modify_mapToSections(original_content):
    """修改 mapToSections 函数，添加新章节同时保持向后兼容"""

    # 在 return {{ 之后插入新章节
    # 找到 return { 的位置（在 summary 之前）

    new_sections = generate_new_sections_fragment()

    # 策略：在 "summary:" 之前插入新章节
    modified = original_content.replace(
        '    // ==================== 保留章节（向后兼容） ====================\n',
        ''
    )

    # 在 summary: { 之前插入新章节
    modified = modified.replace(
        '    summary: {',
        new_sections + '    summary: {'
    )

    return modified


def main():
    """主函数"""

    base_path = 'C:/Users/Administrator/Documents/trae_projects/demo-window-calculator/miniprogram/cloudfunctions'

    # 两个副本路径
    generate_report_dm = os.path.join(base_path, 'generateReport/documentMapper.js')
    create_tender_dm = os.path.join(base_path, 'createTender/documentMapper.js')

    print("=" * 60)
    print("Phase C-1 v2: documentMapper.js 渐进式重构")
    print("=" * 60)

    # 读取当前（已恢复）的 documentMapper.js
    print("\n1. 读取当前 documentMapper.js...")
    with open(generate_report_dm, 'r', encoding='utf-8') as f:
        original_content = f.read()

    # 修改内容
    print("2. 添加新章节结构（保持向后兼容）...")
    modified_content = modify_mapToSections(original_content)

    # 备份并写入 generateReport
    print("3. 更新 generateReport/documentMapper.js...")
    backup_path = generate_report_dm + '.phase_c1_v2_backup_' + datetime.now().strftime('%Y%m%d_%H%M%S')
    shutil.copy2(generate_report_dm, backup_path)
    print(f"   备份: {backup_path}")

    with open(generate_report_dm, 'w', encoding='utf-8') as f:
        f.write(modified_content)
    print(f"   已更新")

    # 备份并写入 createTender
    print("4. 更新 createTender/documentMapper.js...")
    backup_path2 = create_tender_dm + '.phase_c1_v2_backup_' + datetime.now().strftime('%Y%m%d_%H%M%S')
    shutil.copy2(create_tender_dm, backup_path2)
    print(f"   备份: {backup_path2}")

    with open(create_tender_dm, 'w', encoding='utf-8') as f:
        f.write(modified_content)
    print(f"   已更新")

    print("\n" + "=" * 60)
    print("Phase C-1 v2 完成")
    print("=" * 60)


if __name__ == '__main__':
    main()
