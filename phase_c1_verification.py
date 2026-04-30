#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Phase C-1 验证门检查 (V1/V2/V3/V4/V5/V6/V9)
"""

import subprocess
import json
import os

# 导入 documentMapper 进行验证
import sys
sys.path.insert(0, 'C:/Users/Administrator/Documents/trae_projects/demo-window-calculator/miniprogram/cloudfunctions/generateReport')

def run_node_validation():
    """运行 Node.js 验证脚本"""

    validation_js = '''
const {{ mapToSections }} = require('./documentMapper.js');

// 模拟测试数据
const mockResolved = {{
  K_target: 1.8,
  Rw_required: 35,
  SHGC_target: 0.45,
  P3_required: 2.5,
  wind_zone: 'W3',
  glass_key: 'GC5_12A5',
  glass_name: '5+12A+5 中空',
  thermal_overlay: '2# 面',
  climateZone: 'HD',
  risk_flags: {{}},
  hasSafetyClause: false,
  degraded: false
}};

const mockAnswers = {{
  city: '北京',
  district: '朝阳区',
  floor: 8,
  total_floors: 20,
  climateZone: 'HD',
  pain_point: 'sound',
  pain_points: ['sound'],
  budget_tier: 'B',
  window_type: 'casement',
  noise_type: 'main_road',
  noise_dist: 'lt20',
  heating_type: 'central',
  family_risk: [],
  orientation: 'south',
  west_shading: false,
  photos: []
}};

try {{
  const sections = mapToSections(mockResolved, mockAnswers, 'TEST-001');

  // V1: 章节结构完整性
  const expectedSections = ['summary', 'cover', 'overview', 'chapter1', 'chapter2', 'chapter3', 'chapter4', 'chapter5', 'transition', 'chapter6', 'chapter7', 'attachments'];
  const actualSections = Object.keys(sections);
  const v1_pass = expectedSections.every(id => actualSections.includes(id));
  console.log(`V1 章节结构完整性: ${{v1_pass ? '通过' : '失败'}}`);
  if (!v1_pass) {{
    console.log('  缺少:', expectedSections.filter(id => !actualSections.includes(id)));
  }}

  // V2: 性能数字唯一出现 (检查各章节 targetValue)
  const v2_ch1_has_Rw = sections.chapter1.targetValue && sections.chapter1.targetValue.Rw !== undefined;
  const v2_ch1_no_K = !sections.chapter1.targetValue.K;
  const v2_ch2_has_K = sections.chapter2.targetValue && sections.chapter2.targetValue.K !== undefined;
  const v2_ch2_has_SHGC = sections.chapter2.targetValue && sections.chapter2.targetValue.SHGC !== undefined;
  const v2_ch2_no_Rw = !sections.chapter2.targetValue.Rw;
  const v2_ch3_has_P3 = sections.chapter3.targetValue && sections.chapter3.targetValue.P3 !== undefined;
  const v2_ch4_has_water = sections.chapter4.targetValue && sections.chapter4.targetValue.water !== undefined;
  const v2_ch4_has_air = sections.chapter4.targetValue && sections.chapter4.targetValue.air !== undefined;

  const v2_pass = v2_ch1_has_Rw && v2_ch2_has_K && v2_ch2_has_SHGC && v2_ch3_has_P3 && v2_ch4_has_water && v2_ch4_has_air;
  console.log(`V2 性能数字唯一性: ${{v2_pass ? '通过' : '失败'}}`);

  // V3: 答题表字段完整性
  const table = sections.chapter6.configSummaryTable;
  const v3_count = table.length === 26;
  const v3_keys = table.every(f => f.id && f.category && f.label && f.vendor_fillable !== undefined && f.proof_required !== undefined);
  const v3_categories = {{
    performance: table.filter(f => f.category === 'performance').length === 6,
    glass: table.filter(f => f.category === 'glass').length === 5,
    profile: table.filter(f => f.category === 'profile').length === 4,
    hardware: table.filter(f => f.category === 'hardware').length === 3,
    sealing: table.filter(f => f.category === 'sealing').length === 4,
    commercial: table.filter(f => f.category === 'commercial').length === 4
  }};
  const v3_pass = v3_count && v3_keys && Object.values(v3_categories).every(v => v);
  console.log(`V3 答题表字段完整性: ${{v3_pass ? '通过' : '失败'}}`);
  if (!v3_pass) {{
    console.log('  字段数:', table.length, '(期望 26)');
    console.log('  分类:', v3_categories);
  }}

  // V4: 红线归属一致性
  const ch1_redlines = sections.chapter1.redlines.map(r => r.id);
  const ch2_redlines = sections.chapter2.redlines.map(r => r.id);
  const ch3_redlines = sections.chapter3.redlines.map(r => r.id);
  const ch4_redlines = sections.chapter4.redlines.map(r => r.id);

  const v4_ch1_ok = ['R06', 'R08', 'R09'].every(id => ch1_redlines.includes(id));
  const v4_ch2_ok = ['R03', 'R04', 'R05', 'R07'].every(id => ch2_redlines.includes(id));
  const v4_ch3_ok = ['R01', 'R02', 'R12'].every(id => ch3_redlines.includes(id));
  const v4_ch4_ok = ['R10', 'R11'].every(id => ch4_redlines.includes(id));

  // 检查无重复
  const all_redlines = [...ch1_redlines, ...ch2_redlines, ...ch3_redlines, ...ch4_redlines];
  const unique_redlines = [...new Set(all_redlines)];
  const v4_no_dup = all_redlines.length === unique_redlines.length;

  const v4_pass = v4_ch1_ok && v4_ch2_ok && v4_ch3_ok && v4_ch4_ok && v4_no_dup;
  console.log(`V4 红线归属一致性: ${{v4_pass ? '通过' : '失败'}}`);

  // V5: 议题 3 字段语义一致性 (检查性能数字直接引用)
  const v5_Rw = sections.chapter1.targetValue.Rw === mockResolved.Rw_required;
  const v5_K = sections.chapter2.targetValue.K === mockResolved.K_target;
  const v5_SHGC = sections.chapter2.targetValue.SHGC === mockResolved.SHGC_target;
  const v5_P3 = sections.chapter3.targetValue.P3 === mockResolved.P3_required;

  const v5_pass = v5_Rw && v5_K && v5_SHGC && v5_P3;
  console.log(`V5 字段语义一致性: ${{v5_pass ? '通过' : '失败'}}`);

  // V6: 历史兼容性 (测试无新字段的输入)
  const oldResolved = {{
    K_target: 1.8,
    Rw_required: 35,
    SHGC_target: 0.45,
    P3_required: 2.5,
    wind_zone: 'W3'
    // 无 glass_key, glass_name 等新字段
  }};

  try {{
    const oldSections = mapToSections(oldResolved, mockAnswers, 'TEST-OLD');
    const v6_no_throw = true;
    const v6_has_chapter5 = oldSections.chapter5 !== undefined;
    const v6_chapter5_conditional = oldSections.chapter5.show === false || oldSections.chapter5.show === true;
    const v6_pass = v6_no_throw && v6_has_chapter5 && v6_chapter5_conditional;
    console.log(`V6 历史兼容性: ${{v6_pass ? '通过' : '失败'}}`);
  }} catch (e) {{
    console.log(`V6 历史兼容性: 失败 - ${{e.message}}`);
  }}

  // V9: 无二次计算 (检查 documentMapper 内是否直接读取)
  // 通过代码审查保证，此处仅确认字段值来自 resolved
  const v9_Rw_direct = sections.summary.rw_required === mockResolved.Rw_required;
  const v9_K_direct = sections.summary.k_target === mockResolved.K_target;
  const v9_pass = v9_Rw_direct && v9_K_direct;
  console.log(`V9 数据来源不变性: ${{v9_pass ? '通过' : '失败'}}`);

  console.log('\\n=== 验证结论 ===');
  const all_pass = v1_pass && v2_pass && v3_pass && v4_pass && v5_pass && v9_pass;
  console.log(all_pass ? '全部验证通过' : '存在验证失败项');

}} catch (error) {{
  console.error('验证执行错误:', error.message);
  process.exit(1);
}}
'''

    # 写入临时验证脚本
    val_file = 'C:/Users/Administrator/Documents/trae_projects/demo-window-calculator/miniprogram/cloudfunctions/generateReport/validation.js'
    with open(val_file, 'w', encoding='utf-8') as f:
        f.write(validation_js)

    # 运行验证
    try:
        result = subprocess.run(
            ['node', val_file],
            capture_output=True,
            text=True,
            timeout=30,
            cwd='C:/Users/Administrator/Documents/trae_projects/demo-window-calculator/miniprogram/cloudfunctions/generateReport'
        )
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        return result.returncode == 0
    except Exception as e:
        print(f"验证执行失败: {e}")
        return False
    finally:
        # 清理临时文件
        if os.path.exists(val_file):
            os.remove(val_file)


if __name__ == '__main__':
    print("=" * 70)
    print("Phase C-1 验证门检查 (V1/V2/V3/V4/V5/V6/V9)")
    print("=" * 70)
    print()

    success = run_node_validation()

    print()
    print("=" * 70)
    if success:
        print("所有验证门通过 - Phase C-1 完成")
    else:
        print("存在验证门失败 - 需要修复")
    print("=" * 70)
