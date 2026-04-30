#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Phase C-1 Final: documentMapper.js 完整重构
生成符合 SPEC-ISSUE6-PhaseC 的新 mapToSections 函数
"""

import os
import shutil
import subprocess
from datetime import datetime


def generate_mapToSections():
    """生成完整的 mapToSections 函数代码"""

    return '''function mapToSections(resolved, answers, pdfNo) {
  assertResolved(resolved);

  const now = new Date();
  const issueDate = `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日`;

  const band = getHeightBand(answers.floor, answers.total_floors);
  const climateZone = answers.climateZone || resolved.climateZone || getClimateZone(answers.city);
  const normalizedAnswers = { ...answers, climateZone };
  const painTag = getPainTag(answers.pain_point);
  const budgetSpec = buildBudgetSpecView(resolved, normalizedAnswers);
  const familyRisk = Array.isArray(normalizedAnswers.family_risk) ? normalizedAnswers.family_risk : [];
  const window_features = {
    has_large_fixed: familyRisk.includes('large_fixed'),
    has_wide_slider: familyRisk.includes('wide_slider'),
    needs_whole_window_test: ['sliding', 'door_window'].includes(normalizedAnswers.window_type),
    has_family_safety: familyRisk.includes('child') || familyRisk.includes('elder')
  };
  const safety = getSafetyItems(normalizedAnswers.family_risk, normalizedAnswers.budget_tier);

  // 计算水密气密等级
  const sealGrades = calcSealGrades({ city: answers.city, floor: answers.floor, windowType: answers.window_type });

  // 风险触发条件
  const isHighFloor = answers.floor > 16;
  const isHighRatio = band.ratio > 0.5;
  const hasRiskFlags = resolved.risk_flags && Object.keys(resolved.risk_flags).length > 0;
  const isRisk = hasRiskFlags || isHighFloor || isHighRatio || normalizedAnswers.isDisclaimer === true;

  const riskTrigger = {
    highFloor: isHighFloor,
    highRatio: isHighRatio,
    budgetConflict: answers.budget_tier === 'A' && (isHighFloor || isHighRatio)
  };

  const safetyForced = ['sliding', 'door_window'].includes(normalizedAnswers.window_type) ||
    familyRisk.includes('child') ||
    familyRisk.includes('elder') ||
    familyRisk.includes('elderly') ||
    familyRisk.includes('large_fixed') ||
    familyRisk.includes('floor_window') ||
    !!resolved.hasSafetyClause;

  const sharedRedlineChecklist = buildRedlineChecklist(normalizedAnswers, { ...resolved, safetyForced });
  const needsAnalysis = build1_2(normalizedAnswers, resolved);
  const resolvedSealGrades = needsAnalysis.sealGrades || { airRec: 4, waterRec: 3 };

  // 性能数字字段 - 直接引用 resolved，不二次计算（V9 约束）
  const Rw = getField(resolved, 'Rw');
  const K = getField(resolved, 'K');
  const SHGC = getField(resolved, 'SHGC');
  const P3 = getField(resolved, 'P3');

  // 玻璃理论 Rw 反查
  const glassKey = resolved.glass_key || 'GC5_12A5';
  const glassRwTheory = GLASS_LEVELS[glassKey]?.rw_max ?? null;

  // 派生字段触发逻辑
  const needsSafetyGlass = window_features.has_large_fixed || familyRisk.includes('child');
  const climateLabel = getClimateLabel(climateZone);
  const needsWarmEdge = climateLabel.includes('严寒') || climateLabel.includes('寒冷') || K <= 1.6;

  // ===== SECTIONS 返回对象 =====
  const sections = {
    // L1 摘要卡
    summary: {
      k_target:    K,
      rw_required: Rw,
      shgc_target: SHGC,
      p3_required: P3,
      wind_zone:   resolved.wind_zone || '',
      air_rec:     resolvedSealGrades.airRec,
      water_rec:   resolvedSealGrades.waterRec
    },

    // 封面
    cover: {
      pdfNo: pdfNo,
      issueDate: issueDate,
      city: normalizedAnswers.city || '未知城市',
      district: normalizedAnswers.district || '',
      climateLabel: climateLabel,
      floorDesc: `第${normalizedAnswers.floor}层/共${normalizedAnswers.total_floors}层（高度比${(band.ratio * 100).toFixed(0)}%，${band.label}）`,
      painTag: painTag.text,
      isRisk: isRisk,
      hasSafety: Array.isArray(normalizedAnswers.family_risk) && (normalizedAnswers.family_risk.includes('child') || normalizedAnswers.family_risk.includes('elder')),
      degradedCity: resolved.degraded || false,
      degradedMsg: resolved.degraded ? `${normalizedAnswers.city}暂未精确覆盖，以下参数基于保守标准推算` : null,
      disclaimer: '本文件由李Sir门窗技术顾问系统基于用户填写信息自动生成，仅供参考，不构成正式法律合同。'
    },

    // 开篇 · 你的需求画像
    overview: {
      dataSourceStatement: '本报告数据来源：每项指标由三类信息共同确定——国家/行业标准基准值、您的项目信息（城市/楼层/朝向/噪声/家庭风险等）、工程经验修正（李Sir 基于工程案例的判断）。工程经验修正不等同于国标，但经得起案例追溯。',
      basicInfo: build1_1(normalizedAnswers),
      coreTension: buildAnalysisParagraph(normalizedAnswers, resolved),
      painPoint: normalizedAnswers.pain_point,
      painTag: painTag
    },

    // 第一章 · 隔声
    chapter1: {
      title: '隔声',
      targetValue: {
        Rw: Rw,
        unit: 'dB'
      },
      derivationLogic: {
        acoustic: needsAnalysis.acoustic || null
      },
      factors: [
        { name: '玻璃构造', description: '夹胶/三玻两腔配置决定理论 Rw 上限' },
        { name: '气密性能', description: `气密>=${resolvedSealGrades.airRec}级，防止缝隙漏声` },
        { name: '窗型选择', description: '平开窗密封优于推拉窗，高 Rw 场景优先平开' },
        { name: '密封工艺', description: '胶条系统完整性、组角注胶工艺' }
      ],
      redlines: (sharedRedlineChecklist.mandatory || []).filter(r =>
        ['R06', 'R08', 'R09'].includes(r.id)
      ),
      noise: normalizedAnswers.noise_type !== 'quiet' ? {
        show: true,
        typeLabel: getNoiseLabel(normalizedAnswers.noise_type, normalizedAnswers.noise_dist).typeLabel,
        distLabel: getNoiseLabel(normalizedAnswers.noise_type, normalizedAnswers.noise_dist).distLabel,
      } : { show: false },
      // 保留原有字段（向后兼容）
      dataSourceStatement: '本报告数据来源：每项指标由三类信息共同确定——国家/行业标准基准值、您的项目信息（城市/楼层/朝向/噪声/家庭风险等）、工程经验修正（李Sir 基于工程案例的判断）。工程经验修正不等同于国标，但经得起案例追溯。',
      basicInfo: build1_1(normalizedAnswers),
      needsAnalysis: needsAnalysis,
      city: normalizedAnswers.city,
      district: normalizedAnswers.district || '',
      climateLabel: climateLabel,
      windZone: resolved.wind_zone || 'W?',
      floorDesc: `第${normalizedAnswers.floor}层/共${normalizedAnswers.total_floors}层（高度比${(band.ratio * 100).toFixed(0)}%，${band.label}）`,
      heatingDesc: getHeatingDesc(normalizedAnswers.heating_type),
      familyDesc: getFamilyDesc(normalizedAnswers.family_risk),
      analysisPara: buildAnalysisParagraph(normalizedAnswers, resolved),
      useNewStructure: true
    },

    // 第二章 · 热工
    chapter2: {
      title: '热工',
      targetValue: {
        K: K,
        SHGC: SHGC,
        unit_K: 'W/(m2.K)',
        unit_SHGC: ''
      },
      derivationLogic: {
        thermal: needsAnalysis.thermal || null,
        climateZone: climateLabel,
        heatingType: getHeatingDesc(normalizedAnswers.heating_type)
      },
      factors: [
        { name: '玻璃配置', description: 'Low-E 镀膜位置、惰性气体填充' },
        { name: '隔热条规格', description: getInsulationBarRequirement(K).spec || '按 K 值要求匹配' },
        { name: '系统认证', description: '型材+玻璃+五金整体系统热工认证' }
      ],
      redlines: (sharedRedlineChecklist.mandatory || []).filter(r =>
        ['R03', 'R04', 'R05', 'R07'].includes(r.id)
      ),
      // 保留原有字段（向后兼容）
      positionStatement: '以下参数来自第一章的诊断结果，是本案的采购技术底线。商家方案须逐项回应，不达标项须书面说明。',
      painPoint: normalizedAnswers.pain_point,
      metrics: [
        {
          name: '抗风压性能',
          value: ` ${P3}`,
          unit: 'kPa',
          std: STANDARDS_MAP.wind_pressure.code,
          level: (P3 >= 3.0 ? '高等级' : '标准等级'),
          note: `${normalizedAnswers.city}${resolved.wind_zone || 'W?'}风区，第${normalizedAnswers.floor}层`,
          isCore: painTag.coreMetric === 'P3'
        },
        {
          name: '计权隔声量',
          value: ` ${Rw}`,
          unit: 'dB',
          std: STANDARDS_MAP.sound_insulation.code,
          level: (Rw >= 35 ? '高隔声' : '标准隔声'),
          note: `${getNoiseLabel(normalizedAnswers.noise_type, normalizedAnswers.noise_dist).typeLabel}环境${normalizedAnswers.pain_point === 'sound' ? '，睡眠场景加严' : ''}`,
          isCore: painTag.coreMetric === 'Rw'
        },
        {
          name: '热工性能',
          value: `K<=${K} W/(m2K)\\nSHGC<=${SHGC}`,
          unit: '',
          std: STANDARDS_MAP.thermal.code,
          level: climateLabel,
          note: `${getClimateName(climateZone)}区 ${getThermalModifier(normalizedAnswers)}`,
          isCore: painTag.coreMetric === 'SHGC'
        }
      ],
      acousticDerivation: null,
      thermalDerivation: null,
      responseGuide: {
        complete: '完整回应的标志：每项均有具体数值，并附检测报告编号或出具机构名称',
        evasion:  '回避信号：某项仅有口头承诺，无检测报告编号；或以"符合国家标准"等模糊表述代替具体数值',
        reject:   '排除信号：某项明确表示无法达到本案指标，或对该项沉默不回应',
      }
    },

    // 第三章 · 抗风
    chapter3: {
      title: '抗风',
      targetValue: {
        P3: P3,
        unit: 'kPa'
      },
      derivationLogic: {
        wind: {
          zone: resolved.wind_zone || 'W?',
          floor: normalizedAnswers.floor,
          heightRatio: band.ratio
        }
      },
      factors: [
        { name: '型材壁厚', description: `主受力部位>=${budgetSpec.profileWallThickness || 1.5}mm` },
        { name: '五金系统', description: '铰链/滑撑承重等级、防坠绳配置' },
        { name: '安装节点', description: '固定件规格、间距、锚固深度' }
      ],
      redlines: (sharedRedlineChecklist.mandatory || []).filter(r =>
        ['R01', 'R02', 'R12'].includes(r.id)
      ),
      // 保留原有字段（向后兼容）
      sourceNote: '以下红线由第一章性能诊断结果动态生成，每条对应一项可量化指标。低于任一项即视为方案不合格。',
      redlineChecklist: sharedRedlineChecklist,
      forbidden: getForbiddenItems(normalizedAnswers.budget_tier, K, window_features, Rw),
      safetyItems: safety.items,
      safetyBudgetWarning: safety.budgetWarning,
      conflictAlert: buildChapter3ConflictAlert(budgetSpec, resolved),
      is_dual_tier: budgetSpec.is_dual_tier || false,
      dualTierSpecs: (budgetSpec.is_dual_tier && Array.isArray(budgetSpec.recommendedConfig))
        ? budgetSpec.recommendedConfig.map(c => ({
            label: c.label || '',
            profile: c.spec && c.spec.profile
              ? ('壁厚>=' + c.spec.profile.min_wall_thickness + 'mm') : '',
            hardware: c.spec && c.spec.hardware
              ? ('铰链>=' + c.spec.hardware.min_load_kg + 'kg') : '',
            priceRange: c.spec && c.spec.price_range ? c.spec.price_range : '',
            upgradeReasons: Array.isArray(c.upgradeReasons) ? c.upgradeReasons : []
          }))
        : []
    },

    // 第四章 · 水密气密
    chapter4: {
      title: '水密气密',
      targetValue: {
        water: resolvedSealGrades.waterRec,
        air: resolvedSealGrades.airRec,
        unit: '级'
      },
      derivationLogic: {
        seal: {
          city: normalizedAnswers.city,
          floor: normalizedAnswers.floor,
          windZone: resolved.wind_zone
        }
      },
      factors: [
        { name: '胶条系统', description: 'EPDM 或 TPE 材质，原厂配套' },
        { name: '排水设计', description: '排水孔数量、位置、防风盖' },
        { name: '窗型影响', description: '推拉窗水密性天然弱于平开窗' },
        { name: '安装质量', description: '框墙缝隙密封、发泡剂填充质量' }
      ],
      redlines: (sharedRedlineChecklist.mandatory || []).filter(r =>
        ['R10', 'R11'].includes(r.id)
      ),
      // 保留原有字段（向后兼容）
      configSummary: {
        spec: { ...budgetSpec, label: getTierLabel(String(answers.budget_tier || 'B').toUpperCase()) },
        conflictAlert: buildChapter3ConflictAlert(budgetSpec, resolved),
        upgradeOptions: getUpgrades(normalizedAnswers, resolved)
      },
      ...buildChapter4Data(answers, budgetSpec, resolved, riskTrigger, isRisk, sharedRedlineChecklist),
      isRisk: isRisk,
      riskTrigger: riskTrigger
    },

    // 第五章 · 安全配置（条件显示）
    chapter5: safetyForced ? {
      title: '安全配置',
      show: true,
      triggers: {
        has_large_fixed: window_features.has_large_fixed,
        has_children: familyRisk.includes('child'),
        window_type: normalizedAnswers.window_type
      },
      requirements: [
        needsSafetyGlass ? { item: '玻璃安全性', spec: '钢化+夹胶，PVB>=0.76mm' } : null,
        normalizedAnswers.window_type === 'sliding' ? { item: '推拉窗限位', spec: '儿童安全锁+限位器' } : null,
        { item: '防坠装置', spec: '外开窗配防坠绳，承重>=75kg' }
      ].filter(Boolean),
      redlines: (sharedRedlineChecklist.mandatory || []).filter(r =>
        ['R13', 'R14'].includes(r.id)
      ),
      optionalUpgrades: safety.items || []
    } : { show: false },

    // 过渡小节
    transition: {
      title: '如何使用这张配置汇总答题表',
      guideText: '把本表发给三个商家填好回传，就能横向对比谁在偷项、谁真正达标。'
    },

    // 第六章 · 配置汇总答题表
    chapter6: {
      title: '配置汇总答题表',
      intro: '以下 26 项为商家必须回应的技术参数。逐项对比，差距一目了然。',
      configSummaryTable: [
        { id: 'F01', category: 'performance', label: '整窗 Rw', vendor_fillable: true, proof_required: '第三方声学检测报告编号 + 出具机构 + 检测日期 + 样窗规格' },
        { id: 'F02', category: 'performance', label: '整窗 K 值', vendor_fillable: true, proof_required: '整窗热工检测报告编号 + 出具机构' },
        { id: 'F03', category: 'performance', label: '整窗 SHGC', vendor_fillable: true, proof_required: '整窗热工检测报告编号' },
        { id: 'F04', category: 'performance', label: '抗风压 P3', vendor_fillable: true, proof_required: '抗风压检测报告编号 + 适用洞口尺寸范围' },
        { id: 'F05', category: 'performance', label: '气密等级', vendor_fillable: true, proof_required: 'GB/T 7106 检测报告编号' },
        { id: 'F06', category: 'performance', label: '水密等级', vendor_fillable: true, proof_required: 'GB/T 7106 检测报告编号' },
        { id: 'F07', category: 'glass', label: '玻璃配置型号', vendor_fillable: true, proof_required: '玻璃厂家 + 品牌' },
        { id: 'F08', category: 'glass', label: '玻璃理论 Rw', vendor_fillable: true, proof_required: '玻璃 Rw 检测报告' },
        { id: 'F09', category: 'glass', label: 'Low-E 镀膜位置', vendor_fillable: true, proof_required: '玻璃产品说明书' },
        { id: 'F10', category: 'glass', label: '玻璃安全性', vendor_fillable: true, proof_required: '3C 标识 + 检测报告' },
        { id: 'F11', category: 'glass', label: '间隔条材质', vendor_fillable: true, proof_required: '材料说明书' },
        { id: 'F12', category: 'profile', label: '型材品牌及系列', vendor_fillable: true, proof_required: '系统授权书' },
        { id: 'F13', category: 'profile', label: '型材合金牌号', vendor_fillable: true, proof_required: '材质证明书' },
        { id: 'F14', category: 'profile', label: '主受力壁厚', vendor_fillable: true, proof_required: '型材截面检测报告' },
        { id: 'F15', category: 'profile', label: '隔热条规格', vendor_fillable: true, proof_required: '隔热条材质证明' },
        { id: 'F16', category: 'hardware', label: '五金品牌', vendor_fillable: true, proof_required: '五金合格证' },
        { id: 'F17', category: 'hardware', label: '五金系列/型号', vendor_fillable: true, proof_required: '五金合格证' },
        { id: 'F18', category: 'hardware', label: '五金保修年限', vendor_fillable: true, proof_required: '厂家保修承诺' },
        { id: 'F19', category: 'sealing', label: '胶条材质', vendor_fillable: true, proof_required: '胶条说明书' },
        { id: 'F20', category: 'sealing', label: '耐候密封胶品牌', vendor_fillable: true, proof_required: '产品说明书' },
        { id: 'F21', category: 'sealing', label: '发泡剂品牌', vendor_fillable: true, proof_required: '产品说明书' },
        { id: 'F22', category: 'sealing', label: '固定件间距承诺', vendor_fillable: true, proof_required: '安装方案文件' },
        { id: 'F23', category: 'commercial', label: '含税单价', vendor_fillable: true, proof_required: '' },
        { id: 'F24', category: 'commercial', label: '工期', vendor_fillable: true, proof_required: '' },
        { id: 'F25', category: 'commercial', label: '质保年限', vendor_fillable: true, proof_required: '质保协议' },
        { id: 'F26', category: 'commercial', label: '公司名称 + 签名', vendor_fillable: true, proof_required: '' }
      ],
      specValues: {
        F01: Rw ? `Rw >= ${Rw} dB` : '待反查',
        F02: K ? `K <= ${K} W/(m2.K)` : '待反查',
        F03: SHGC ? `SHGC <= ${SHGC}` : '待反查',
        F04: P3 ? `P3 >= ${P3} kPa` : '待反查',
        F05: `>=${resolvedSealGrades.airRec}级`,
        F06: `>=${resolvedSealGrades.waterRec}级`,
        F07: resolved.glass_name || '待反查',
        F08: glassRwTheory ? `${glassRwTheory} dB` : '待反查',
        F09: resolved.thermal_overlay || '待反查',
        F10: needsSafetyGlass ? '钢化+夹胶' : '按规范',
        F11: needsWarmEdge ? '暖边条（推荐）' : '无特殊要求',
        F12: '无指定（商家自报）',
        F13: '6063-T5 或同等',
        F14: `>=${budgetSpec.profileWallThickness || 1.5}mm`,
        F15: getInsulationBarRequirement(K).spec || '按 K 值匹配',
        F16: '无指定（商家自报）',
        F17: '无指定（商家自报）',
        F18: '>=5 年',
        F19: 'EPDM 或 TPE',
        F20: '无指定（商家自报）',
        F21: '无指定（商家自报）',
        F22: budgetSpec.installation || '按规范',
        F23: '（商家填写）',
        F24: '（商家填写）',
        F25: '>=5 年',
        F26: '（商家签字）'
      },
      redlineConfirm: {
        title: '红线承诺确认',
        text: '以上配置满足本案全部红线要求',
        checklist: sharedRedlineChecklist.mandatory || []
      }
    },

    // 第七章 · 三阶段过程把控
    chapter7: {
      title: '三阶段过程把控',
      phases: [
        {
          name: '下单前',
          checklist: '核对商家答题表 -> 确认关键参数与本案要求一致',
          keyItems: ['玻璃配置型号(F07)', '型材壁厚(F14)', '隔热条规格(F15)', '五金品牌(F16)']
        },
        {
          name: '安装前（进场）',
          checklist: '对照本章清单检查到货实物——玻璃钢印 / 五金品牌 / 型材系列',
          inspectionItems: (buildChapter4Data(answers, budgetSpec, resolved, riskTrigger, isRisk, sharedRedlineChecklist).inspectionChecklist) || []
        },
        {
          name: '安装后（竣工）',
          checklist: '按本报告给出的验收标准进行试水、试开关与目测检查',
          acceptanceItems: buildAcceptanceItems(ACCEPTANCE_ITEMS_WINDOW, normalizedAnswers.window_type)
        }
      ]
    },

    // 附件
    attachments: {
      photos: answers.photos || []
    }
  };

  return sections;
}
'''


def generate_full_file(original_file):
    """生成完整的 documentMapper.js 文件"""

    with open(original_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # 找到 mapToSections 函数的开始行
    map_start = None
    for i, line in enumerate(lines):
        if 'function mapToSections' in line:
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

    # 新的 mapToSections 函数
    new_map_function = generate_mapToSections()

    # 组合完整文件
    full_content = header + new_map_function + '\n' + footer

    return full_content


def verify_syntax(file_path):
    """使用 node --check 验证 JS 语法"""
    try:
        result = subprocess.run(
            ['node', '--check', file_path],
            capture_output=True,
            text=True,
            timeout=30
        )
        return result.returncode == 0, result.stderr
    except Exception as e:
        return False, str(e)


def main():
    """主函数"""

    base_path = 'C:/Users/Administrator/Documents/trae_projects/demo-window-calculator/miniprogram/cloudfunctions'

    generate_report_dm = os.path.join(base_path, 'generateReport/documentMapper.js')
    create_tender_dm = os.path.join(base_path, 'createTender/documentMapper.js')

    print("=" * 70)
    print("Phase C-1 Final: documentMapper.js 完整重构")
    print("=" * 70)

    # 生成新的 documentMapper.js 内容
    print("\n1. 生成新的 mapToSections 函数...")
    try:
        new_content = generate_full_file(generate_report_dm)
        print("   生成成功")
    except Exception as e:
        print(f"   生成失败: {e}")
        return False

    # 备份原文件
    print("\n2. 备份原文件...")
    backup_path = generate_report_dm + '.phase_c1_backup_' + datetime.now().strftime('%Y%m%d_%H%M%S')
    shutil.copy2(generate_report_dm, backup_path)
    print(f"   备份: {backup_path}")

    # 写入原文件并验证语法
    print("\n3. 写入新内容并语法验证 (node --check)...")
    with open(generate_report_dm, 'w', encoding='utf-8') as f:
        f.write(new_content)

    is_valid, error_msg = verify_syntax(generate_report_dm)

    if not is_valid:
        print(f"   语法验证失败!")
        print(f"   错误: {error_msg}")
        # 回滚
        shutil.copy2(backup_path, generate_report_dm)
        print("   已回滚到原文件")
        return False

    print("   语法验证通过")

    # 更新 createTender
    print("\n4. 更新 createTender/documentMapper.js...")
    backup_path2 = create_tender_dm + '.phase_c1_backup_' + datetime.now().strftime('%Y%m%d_%H%M%S')
    shutil.copy2(create_tender_dm, backup_path2)
    print(f"   备份: {backup_path2}")

    with open(create_tender_dm, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"   已更新")

    print("\n" + "=" * 70)
    print("Phase C-1 文件更新完成")
    print("=" * 70)

    return True


if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)
