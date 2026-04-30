#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Phase C-1: documentMapper.js 重构脚本
生成目标导向章节结构 + 配置汇总答题表
"""

import os
import shutil
from datetime import datetime

# 新章节结构配置
NEW_SECTIONS = [
    'summary', 'cover', 'overview',
    'chapter1', 'chapter2', 'chapter3', 'chapter4', 'chapter5',
    'transition', 'chapter6', 'chapter7', 'attachments'
]

# 红线归属映射
REDLINE_MAPPING = {
    'chapter1': ['R06', 'R08', 'R09'],
    'chapter2': ['R03', 'R04', 'R05', 'R07'],
    'chapter3': ['R01', 'R02', 'R12'],
    'chapter4': ['R10', 'R11'],
    'chapter5': ['R13', 'R14']
}

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

def generate_mapToSections():
    """生成新的 mapToSections 函数"""

    # 生成配置汇总答题表字段结构
    config_table_fields = []
    for field in CONFIG_SUMMARY_FIELDS:
        config_table_fields.append(f"""    {{
      id: '{field['id']}',
      category: '{field['category']}',
      label: '{field['label']}',
      spec_required: null,  // 运行时填充
      vendor_fillable: true,
      proof_required: '{field['proof_required']}'
    }}""")

    config_table_str = ',\n'.join(config_table_fields)

    # 新的 mapToSections 函数
    new_function = f'''
function mapToSections(resolved, answers, pdfNo) {{
  assertResolved(resolved);

  const now = new Date();
  const issueDate = `${{now.getFullYear()}}年${{String(now.getMonth() + 1).padStart(2, '0')}}月${{String(now.getDate()).padStart(2, '0')}}日`;

  const band = getHeightBand(answers.floor, answers.total_floors);
  const climateZone = answers.climateZone || resolved.climateZone || getClimateZone(answers.city);
  const normalizedAnswers = {{ ...answers, climateZone }};
  const painTag = getPainTag(answers.pain_point);
  const budgetSpec = buildBudgetSpecView(resolved, normalizedAnswers);
  const familyRisk = Array.isArray(normalizedAnswers.family_risk) ? normalizedAnswers.family_risk : [];
  const window_features = {{
    has_large_fixed: familyRisk.includes('large_fixed'),
    has_wide_slider: familyRisk.includes('wide_slider'),
    needs_whole_window_test: ['sliding', 'door_window'].includes(normalizedAnswers.window_type),
    has_family_safety: familyRisk.includes('child') || familyRisk.includes('elder')
  }};
  const safety = getSafetyItems(normalizedAnswers.family_risk, normalizedAnswers.budget_tier);

  // 计算水密气密等级
  const sealGrades = calcSealGrades({{ city: answers.city, floor: answers.floor, windowType: answers.window_type }});

  // 风险触发条件
  const isHighFloor = answers.floor > 16;
  const isHighRatio = band.ratio > 0.5;
  const hasRiskFlags = resolved.risk_flags && Object.keys(resolved.risk_flags).length > 0;
  const isRisk = hasRiskFlags || isHighFloor || isHighRatio || normalizedAnswers.isDisclaimer === true;

  const riskTrigger = {{
    highFloor: isHighFloor,
    highRatio: isHighRatio,
    budgetConflict: answers.budget_tier === 'A' && (isHighFloor || isHighRatio)
  }};

  // 安全章节触发条件
  const safetyForced = ['sliding', 'door_window'].includes(normalizedAnswers.window_type) ||
    familyRisk.includes('child') ||
    familyRisk.includes('elder') ||
    familyRisk.includes('elderly') ||
    familyRisk.includes('large_fixed') ||
    familyRisk.includes('floor_window') ||
    !!resolved.hasSafetyClause;

  const sharedRedlineChecklist = buildRedlineChecklist(normalizedAnswers, {{ ...resolved, safetyForced }});
  const needsAnalysis = build1_2(normalizedAnswers, resolved);
  const resolvedSealGrades = needsAnalysis.sealGrades || {{ airRec: 4, waterRec: 3 }};

  // 获取性能值（直接引用 resolved，不二次计算 - V9 约束）
  const Rw = getField(resolved, 'Rw');
  const K = getField(resolved, 'K');
  const SHGC = getField(resolved, 'SHGC');
  const P3 = getField(resolved, 'P3');

  // 玻璃理论 Rw 反查（基于仲裁结果）
  const glassKey = resolved.glass_key || 'GC5_12A5';
  const glassRwTheory = GLASS_LEVELS[glassKey]?.rw_max ?? null;

  // 派生字段触发逻辑
  const needsSafetyGlass = window_features.has_large_fixed || familyRisk.includes('child');
  const needsWarmEdge = ['严寒', '寒冷'].includes(getClimateLabel(climateZone)) || K <= 1.6;

  // V1 验证：章节结构白名单
  const sections = {{
    // L1 摘要卡
    summary: {{
      k_target:    K,
      rw_required: Rw,
      shgc_target: SHGC,
      p3_required: P3,
      wind_zone:   resolved.wind_zone || '',
      air_rec:     resolvedSealGrades.airRec,
      water_rec:   resolvedSealGrades.waterRec
    }},

    // 封面
    cover: {{
      pdfNo: pdfNo,
      issueDate: issueDate,
      city: normalizedAnswers.city || '未知城市',
      district: normalizedAnswers.district || '',
      climateLabel: getClimateLabel(climateZone),
      floorDesc: `第${{normalizedAnswers.floor}}层/共${{normalizedAnswers.total_floors}}层（高度比${{(band.ratio * 100).toFixed(0)}}%，${{band.label}}）`,
      painTag: painTag.text,
      isRisk: isRisk,
      hasSafety: Array.isArray(normalizedAnswers.family_risk) && (normalizedAnswers.family_risk.includes('child') || normalizedAnswers.family_risk.includes('elder')),
      degradedCity: resolved.degraded || false,
      degradedMsg: resolved.degraded ? `${{normalizedAnswers.city}}暂未精确覆盖，以下参数基于保守标准推算` : null,
      disclaimer: '本文件由李Sir门窗技术顾问系统基于用户填写信息自动生成，仅供参考，不构成正式法律合同。'
    }},

    // 开篇 · 你的需求画像
    overview: {{
      dataSourceStatement: '本报告数据来源：每项指标由三类信息共同确定——国家/行业标准基准值、您的项目信息（城市/楼层/朝向/噪声/家庭风险等）、工程经验修正（李Sir 基于工程案例的判断）。工程经验修正不等同于国标，但经得起案例追溯。',
      basicInfo: build1_1(normalizedAnswers),
      coreTension: buildAnalysisParagraph(normalizedAnswers, resolved),
      painPoint: normalizedAnswers.pain_point,
      painTag: painTag
    }},

    // 第一章 · 隔声
    chapter1: {{
      title: '隔声',
      targetValue: {{
        Rw: Rw,
        unit: 'dB'
      }},
      derivationLogic: {{
        acoustic: needsAnalysis.acoustic || null
      }},
      factors: [
        {{ name: '玻璃构造', description: '夹胶/三玻两腔配置决定理论 Rw 上限' }},
        {{ name: '气密性能', description: `气密≥${{resolvedSealGrades.airRec}}级，防止缝隙漏声` }},
        {{ name: '窗型选择', description: '平开窗密封优于推拉窗，高 Rw 场景优先平开' }},
        {{ name: '密封工艺', description: '胶条系统完整性、组角注胶工艺' }}
      ],
      redlines: (sharedRedlineChecklist.mandatory || []).filter(r =>
        ['R06', 'R08', 'R09'].includes(r.id)
      ),
      noise: normalizedAnswers.noise_type !== 'quiet' ? {{
        show: true,
        typeLabel: getNoiseLabel(normalizedAnswers.noise_type, normalizedAnswers.noise_dist).typeLabel,
        distLabel: getNoiseLabel(normalizedAnswers.noise_type, normalizedAnswers.noise_dist).distLabel,
      }} : {{ show: false }}
    }},

    // 第二章 · 热工
    chapter2: {{
      title: '热工',
      targetValue: {{
        K: K,
        SHGC: SHGC,
        unit_K: 'W/(m²·K)',
        unit_SHGC: ''
      }},
      derivationLogic: {{
        thermal: needsAnalysis.thermal || null,
        climateZone: getClimateLabel(climateZone),
        heatingType: getHeatingDesc(normalizedAnswers.heating_type)
      }},
      factors: [
        {{ name: '玻璃配置', description: `Low-E 镀膜位置、惰性气体填充` }},
        {{ name: '隔热条规格', description: getInsulationBarRequirement(K).spec || '按 K 值要求匹配' }},
        {{ name: '系统认证', description: '型材+玻璃+五金整体系统热工认证' }}
      ],
      redlines: (sharedRedlineChecklist.mandatory || []).filter(r =>
        ['R03', 'R04', 'R05', 'R07'].includes(r.id)
      )
    }},

    // 第三章 · 抗风
    chapter3: {{
      title: '抗风',
      targetValue: {{
        P3: P3,
        unit: 'kPa'
      }},
      derivationLogic: {{
        wind: {{
          zone: resolved.wind_zone || 'W?',
          floor: normalizedAnswers.floor,
          heightRatio: band.ratio
        }}
      }},
      factors: [
        {{ name: '型材壁厚', description: `主受力部位≥${{budgetSpec.profileWallThickness || 1.5}}mm` }},
        {{ name: '五金系统', description: '铰链/滑撑承重等级、防坠绳配置' }},
        {{ name: '安装节点', description: '固定件规格、间距、锚固深度' }}
      ],
      redlines: (sharedRedlineChecklist.mandatory || []).filter(r =>
        ['R01', 'R02', 'R12'].includes(r.id)
      )
    }},

    // 第四章 · 水密气密
    chapter4: {{
      title: '水密气密',
      targetValue: {{
        water: resolvedSealGrades.waterRec,
        air: resolvedSealGrades.airRec,
        unit: '级'
      }},
      derivationLogic: {{
        seal: {{
          city: normalizedAnswers.city,
          floor: normalizedAnswers.floor,
          windZone: resolved.wind_zone
        }}
      }},
      factors: [
        {{ name: '胶条系统', description: 'EPDM 或 TPE 材质，原厂配套' }},
        {{ name: '排水设计', description: '排水孔数量、位置、防风盖' }},
        {{ name: '窗型影响', description: '推拉窗水密性天然弱于平开窗' }},
        {{ name: '安装质量', description: '框墙缝隙密封、发泡剂填充质量' }}
      ],
      redlines: (sharedRedlineChecklist.mandatory || []).filter(r =>
        ['R10', 'R11'].includes(r.id)
      )
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
        needsSafetyGlass ? {{ item: '玻璃安全性', spec: '钢化+夹胶，PVB≥0.76mm' }} : null,
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
{config_table_str}
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
        F08: glassRwTheory ? `${{glassRwTheory}} dB` : '待反查',
        F09: resolved.thermal_overlay || '待反查',
        F10: needsSafetyGlass ? '钢化+夹胶' : '按规范',
        F11: needsWarmEdge ? '暖边条（推荐）' : '无特殊要求',
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
          inspectionItems: buildChapter4Data(answers, budgetSpec, resolved, riskTrigger, isRisk, sharedRedlineChecklist).inspectionChecklist || []
        }},
        {{
          name: '安装后（竣工）',
          checklist: '按本报告给出的验收标准进行试水、试开关与目测检查',
          acceptanceItems: buildAcceptanceItems(ACCEPTANCE_ITEMS_WINDOW, normalizedAnswers.window_type)
        }}
      ]
    }},

    // 附件
    attachments: {{
      photos: answers.photos || []
    }}
  }};

  // V2 验证：性能数字唯一出现
  // chapter1: 含 Rw，禁含 K/SHGC/P3
  // chapter2: 含 K + SHGC，禁含 Rw/P3
  // chapter3: 含 P3，禁含 Rw/K/SHGC
  // chapter4: 含水密+气密等级，禁含 Rw/K/SHGC/P3
  // chapter5: 禁含主线性能数字

  return sections;
}}
'''

    return new_function


def generate_full_document_mapper(original_file):
    """生成完整的 documentMapper.js 文件内容"""

    # 读取原文件开头部分（常量定义等，保留到 mapToSections 之前）
    with open(original_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # 找到 mapToSections 函数的开始行
    map_start = None
    for i, line in enumerate(lines):
        if 'function mapToSections' in line and i > 1470:
            map_start = i
            break

    if not map_start:
        raise ValueError("Could not find mapToSections function start")

    # 保留开头部分（到 mapToSections 之前）
    header = ''.join(lines[:map_start])

    # 找到 module.exports 位置（mapToSections 结束后的部分）
    exports_start = None
    for i in range(len(lines) - 1, map_start, -1):
        if 'module.exports' in lines[i]:
            exports_start = i
            break

    if not exports_start:
        raise ValueError("Could not find module.exports")

    # 保留结尾部分（module.exports 及之后）
    footer = ''.join(lines[exports_start:])

    # 生成新的 mapToSections 函数
    new_map_function = generate_mapToSections()

    # 组合完整文件
    full_content = header + new_map_function + '\n' + footer

    return full_content


def backup_and_write(file_path, content):
    """备份原文件并写入新内容"""

    # 备份
    backup_path = file_path + '.phase_c1_backup_' + datetime.now().strftime('%Y%m%d_%H%M%S')
    shutil.copy2(file_path, backup_path)
    print(f"备份已创建: {backup_path}")

    # 写入新内容
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"文件已更新: {file_path}")


def main():
    """主函数"""

    base_path = 'C:/Users/Administrator/Documents/trae_projects/demo-window-calculator/miniprogram/cloudfunctions'

    # 两个副本路径
    generate_report_dm = os.path.join(base_path, 'generateReport/documentMapper.js')
    create_tender_dm = os.path.join(base_path, 'createTender/documentMapper.js')

    print("=" * 60)
    print("Phase C-1: documentMapper.js 双副本重构")
    print("=" * 60)

    # 生成新的 documentMapper.js 内容
    print("\n1. 生成新的 mapToSections 函数...")
    new_content = generate_full_document_mapper(generate_report_dm)

    # 更新 generateReport/documentMapper.js
    print("\n2. 更新 generateReport/documentMapper.js...")
    backup_and_write(generate_report_dm, new_content)

    # 更新 createTender/documentMapper.js（同步副本）
    print("\n3. 更新 createTender/documentMapper.js...")
    backup_and_write(create_tender_dm, new_content)

    print("\n" + "=" * 60)
    print("Phase C-1 文件更新完成")
    print("=" * 60)
    print("\n请执行以下验证：")
    print("1. 运行测试: cd miniprogram/cloudfunctions/generateReport && npm test")
    print("2. 检查 V1-V6, V9 验证门")
    print("3. 确认 132/146 基线保持")


if __name__ == '__main__':
    main()
