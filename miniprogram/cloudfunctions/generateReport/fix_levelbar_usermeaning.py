#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""fix_levelbar_usermeaning_v2.py"""
import os

BASE = r"C:\Users\Administrator\Documents\trae_projects\demo-window-calculator\miniprogram\cloudfunctions"
DIRS = ["generateReport", "createTender"]

def read_file(p):
    with open(p, 'r', encoding='utf-8') as f: return f.read()

def write_file(p, c):
    with open(p, 'w', encoding='utf-8') as f: f.write(c)

def replace_once(content, old, new, label):
    if old not in content:
        print(f"  [ERROR] not found: {label}"); return content, False
    result = content.replace(old, new, 1)
    print(f"  [OK] {label}"); return result, True

# ── PATCH 1: ACCEPTANCE_NODES ──────────────────────────────────
OLD_NODES = """const ACCEPTANCE_NODES = {
  entry: {
    title: '【进场验收】（4条）',
    items: [
      '① 对照合同核查品牌、型号、颜色、开启方式',
      '② 玻璃3C标志（本体印刷，非贴纸）；中空玻璃无雾气',
      '③ 核对玻璃边部标签与合同约定一致，不能仅凭外观判断膜层',
      '④ 索取壁厚检测报告，如有条件要求商家现场演示拆一处压线核查'
    ]
  },
  installation: {
    title: '【安装验收】（4条）',
    items: [
      '⑤ 随机查看固定螺丝：打在实体结构上，间距约40-60cm',
      '⑥ 发泡剂全周饱满均匀，外露部分平整',
      '⑦ 密封胶一圈连续、平整无裂缝，施工条件符合说明书要求',
      '⑧ 排水孔未被胶封死，窗台外侧有向外坡度'
    ]
  },
  final: {
    title: '【竣工验收】（5条）',
    items: [
      '⑨ 打火机火焰靠近扇框交接处，无明显偏吹（简易气密自检）',
      '⑩ 花洒淋水3分钟，室内无渗水（物业允许时）',
      '⑪ 每扇窗反复开合5-10次，胶条压实，无异响卡阻',
      '⑫ 外开窗确认防坠绳/限位器安装（高层必查）',
      '⑬ 执手操作力正常，关键安全配件按合同核查'
    ]
  }
};"""

NEW_NODES = """const ACCEPTANCE_NODES = {
  entry: {
    title: '【进场验收】（4条）',
    items: [
      { text: '① 对照合同核查品牌、型号、颜色、开启方式', reason: '合同约定与实际到场产品不符的情况较为常见，进场时是最后的核查机会，发现问题可拒绝卸货' },
      { text: '② 核查安全玻璃强制认证标识及随附证明文件；中空玻璃内无明显结露、雾化、进水现象', reason: '3C标志本体印刷是正品标志，贴纸可伪造；无雾气说明玻璃密封完好，有雾气则为批次质量问题' },
      { text: '③ 核对玻璃边部标签与合同约定一致，不能仅凭外观判断膜层', reason: 'Low-E膜层位置影响热工性能，肉眼无法区分，边部标签是唯一可核对的依据' },
      { text: '④ 索取壁厚检测报告或型式检验资料，必要时可要求进场抽样复检', reason: '壁厚是抗风压的核心参数，进场是核查的最后机会，实物核查优于纸质报告' },
    ]
  },
  installation: {
    title: '【安装验收】（4条）',
    items: [
      { text: '⑤ 固定件应牢固连接于承重基层，固定点数量和间距符合设计文件及安装规范', reason: '螺丝打在空心砖或间距过大，固定强度不足，高层强风时存在脱落风险' },
      { text: '⑥ 发泡剂全周饱满均匀，外露部分平整', reason: '发泡剂填充不均会产生局部热桥和气密薄弱点，影响保温和隔声，此时处理成本最低' },
      { text: '⑦ 密封胶一圈连续、平整无裂缝，施工条件符合说明书要求', reason: '密封胶不连续或在低温/高湿条件下施工，固化后易开裂，导致气密水密长期失效' },
      { text: '⑧ 排水孔未被胶封死，窗台外侧有向外坡度', reason: '排水孔堵塞导致积水腐蚀，坡度不对导致雨水倒流室内，此类问题竣工后处理成本极高' },
    ]
  },
  final: {
    title: '【竣工验收】（5条）',
    items: [
      { text: '⑨ 关闭所有窗扇，检查扇框四周胶条压合均匀、无明显可见缝隙；正式气密验收按合同约定检测方法执行', reason: '火焰偏吹说明存在气密缺陷，该方法简单有效，无需专业设备，可覆盖每一扇窗' },
      { text: '⑩ 花洒淋水试验（物业允许时），室内无渗水；时长按项目所在地验收指引执行', reason: '模拟降雨验证水密性，是竣工阶段最直观的水密检验，发现问题及时要求整改' },
      { text: '⑪ 每扇窗反复开合5-10次，胶条压实、无异响卡阻', reason: '开合异响或卡阻说明安装偏差，长期使用会加速五金磨损和密封老化' },
      { text: '⑫ 五金系统切换顺畅，防误操作器有效；关闭状态下锁点完整咬合', reason: '锁点咬合不完整是气密水密失效的主要原因之一，同时影响防盗安全' },
      { text: '⑬ 执手操作力正常，关键安全配件按合同核查', reason: '安全配件是本案强制要求，竣工时须逐项确认实际安装状态与合同约定一致' },
    ]
  }
};"""

# ── PATCH 2: buildAcceptanceNodes dynamic items ────────────────
R13 = '安全配件是本案强制要求，竣工时须逐项确认实际安装状态与合同约定一致'

OLD_DYN = """    // ⑫
    const idx12 = items.findIndex(x => typeof x === 'string' && x.startsWith('⑫'));
    const t12 = map['12'];
    if (t12 === null) {
      if (idx12 >= 0) items.splice(idx12, 1);
    } else if (typeof t12 === 'string') {
      if (idx12 >= 0) items[idx12] = `⑫ ${t12}`; else items.push(`⑫ ${t12}`);
    }
    // ⑬
    const idx13 = items.findIndex(x => typeof x === 'string' && x.startsWith('⑬'));
    const t13 = map['13'];
    if (typeof t13 === 'string') {
      if (idx13 >= 0) items[idx13] = `⑬ ${t13}`; else items.push(`⑬ ${t13}`);
    }"""

NEW_DYN = """    // ⑫
    const idx12 = items.findIndex(x => (typeof x === 'string' ? x : (x && x.text) || '').startsWith('⑫'));
    const t12 = map['12'];
    if (t12 === null) {
      if (idx12 >= 0) items.splice(idx12, 1);
    } else if (typeof t12 === 'string') {
      if (idx12 >= 0) items[idx12] = { text: `⑫ ${t12}`, reason: '' }; else items.push({ text: `⑫ ${t12}`, reason: '' });
    }
    // ⑬
    const idx13 = items.findIndex(x => (typeof x === 'string' ? x : (x && x.text) || '').startsWith('⑬'));
    const t13 = map['13'];
    if (typeof t13 === 'string') {
      if (idx13 >= 0) items[idx13] = { text: `⑬ ${t13}`, reason: '""" + R13 + """' }; else items.push({ text: `⑬ ${t13}`, reason: '""" + R13 + """' });
    }"""

OLD_I13 = """    const i13 = items.findIndex(x => typeof x === 'string' && x.startsWith('⑬'));
    if (i13 >= 0) {
      const baseText = String(items[i13]).replace(/^⑬\\s*/, '');"""

NEW_I13 = """    const i13 = items.findIndex(x => (typeof x === 'string' ? x : (x && x.text) || '').startsWith('⑬'));
    if (i13 >= 0) {
      const baseText = (typeof items[i13] === 'string' ? items[i13] : (items[i13] && items[i13].text) || '').replace(/^⑬\\s*/, '');"""

OLD_MRG = "        items[i13] = `⑬ ${baseText}；${extras.join('；')}`;"
NEW_MRG = "        items[i13] = { text: `⑬ ${baseText}；${extras.join('；')}`, reason: '" + R13 + "' };"

OLD_PLN = "        items[i13] = `⑬ ${baseText}`;"
NEW_PLN = "        items[i13] = { text: `⑬ ${baseText}`, reason: '" + R13 + "' };"

# ── PATCH 3a: buildNeedsTable — generateReport ─────────────────
OLD_NEEDS_GR = """  return [
    {
      dimension: '抗风压',
      value: `≥ ${getField(resolved, 'P3')} kPa`,
      basis: `${STANDARDS_MAP.wind_pressure.short} · ${resolved.wind_zone || 'W?'}风区${(heightRatio * 100).toFixed(0)}%`
    },
    {
      dimension: '隔声',
      value: `≥ ${getField(resolved, 'Rw')} dB`,
      basis: `${STANDARDS_MAP.sound_insulation.short} · ${getNoiseShortDesc(answers.noise_type, answers.noise_dist)}`
    },
    {
      dimension: '传热系数',
      value: `K≤${kText} W/(m²·K)${thermalRange ? `（参考范围${thermalRange}）` : ''}`,
      basis: `${STANDARDS_MAP.thermal.short} · ${kBasisText}`
    },
    {
      dimension: '太阳得热',
      value: `≤ ${getField(resolved, 'SHGC')}`,
      basis: `${STANDARDS_MAP.shgc.short} · ${getShgcNote(answers)}`
    },
    {
      dimension: '安全等级',
      value: safetyValue,
      basis: safetyBasis
    },
    {
      dimension: '气密性',
      value: airValue,
      basis: `${STANDARDS_MAP.wind_pressure.short} · 气密性能等级${fixedNote}`
    },
    {
      dimension: '水密性',
      value: waterValue,
      basis: `${STANDARDS_MAP.wind_pressure.short} · 水密性能等级${fixedNote}`
    }
  ];"""

NEW_NEEDS_GR = """  return [
    {
      dimension: '抗风压',
      value: `≥ ${getField(resolved, 'P3')} kPa`,
      basis: `${STANDARDS_MAP.wind_pressure.short} · ${resolved.wind_zone || 'W?'}风区${(heightRatio * 100).toFixed(0)}%`,
      levelBar: { lowValue: '1.0', lowLabel: '基础合规', highValue: '6.0', highLabel: '行业高端', midValue: getField(resolved, 'P3'), unit: 'kPa', direction: 'ascending' }
    },
    {
      dimension: '隔声',
      value: `≥ ${getField(resolved, 'Rw')} dB`,
      basis: `${STANDARDS_MAP.sound_insulation.short} · ${getNoiseShortDesc(answers.noise_type, answers.noise_dist)}`,
      levelBar: { lowValue: '30', lowLabel: '基础合规', highValue: '50', highLabel: '行业高端', midValue: getField(resolved, 'Rw'), unit: 'dB', direction: 'ascending' }
    },
    {
      dimension: '传热系数',
      value: `K≤${kText} W/(m²·K)${thermalRange ? `（参考范围${thermalRange}）` : ''}`,
      basis: `${STANDARDS_MAP.thermal.short} · ${kBasisText}`,
      levelBar: { lowValue: '3.0', lowLabel: '基础合规', highValue: '1.0', highLabel: '行业高端', midValue: kNum, unit: 'W/(m²·K)', direction: 'descending' }
    },
    {
      dimension: '太阳得热',
      value: `≤ ${getField(resolved, 'SHGC')}`,
      basis: `${STANDARDS_MAP.shgc.short} · ${getShgcNote(answers)}`,
      levelBar: { lowValue: '0.60', lowLabel: '基础合规', highValue: '0.15', highLabel: '行业高端', midValue: getField(resolved, 'SHGC'), unit: '', direction: 'descending' }
    },
    {
      dimension: '安全等级',
      value: safetyValue,
      basis: safetyBasis
    },
    {
      dimension: '气密性',
      value: airValue,
      basis: `${STANDARDS_MAP.wind_pressure.short} · 气密性能等级${fixedNote}`,
      levelBar: { lowValue: '4', lowLabel: '基础合规', highValue: '8', highLabel: '行业高端', midValue: sg.airRec, unit: '级', direction: 'ascending' }
    },
    {
      dimension: '水密性',
      value: waterValue,
      basis: `${STANDARDS_MAP.wind_pressure.short} · 水密性能等级${fixedNote}`,
      levelBar: { lowValue: '2', lowLabel: '基础合规', highValue: '6', highLabel: '行业高端', midValue: sg.waterRec, unit: '级', direction: 'ascending' }
    }
  ];"""

# ── PATCH 3b: buildNeedsTable — createTender ──────────────────
OLD_NEEDS_CT = """  return [
    {
      dimension: '抗风压',
      value: `≥ ${getField(resolved, 'P3')} kPa`,
      basis: `${STANDARDS_MAP.wind_pressure.short} · ${resolved.wind_zone || 'W?'}风区${(heightRatio * 100).toFixed(0)}%`
    },
    {
      dimension: '隔声',
      value: `≥ ${getField(resolved, 'Rw')} dB`,
      basis: `${STANDARDS_MAP.sound_insulation.short} · ${getNoiseShortDesc(answers.noise_type, answers.noise_dist)}`
    },
    {
      dimension: '传热系数',
      value: `K≤${kText} W/(m²·K)${thermalRange ? `（推荐范围${thermalRange}）` : ''}`,
      basis: `${STANDARDS_MAP.thermal.short} · ${kBasisText}`
    },
    {
      dimension: '太阳得热',
      value: `≤ ${getField(resolved, 'SHGC')}`,
      basis: `${STANDARDS_MAP.shgc.short} · ${getShgcNote(answers)}`
    },
    {
      dimension: '安全等级',
      value: safetyValue,
      basis: safetyBasis
    },
    {
      dimension: '气密性',
      value: airValue,
      basis: `${STANDARDS_MAP.wind_pressure.short} · 气密性能等级${fixedNote}`
    },
    {
      dimension: '水密性',
      value: waterValue,
      basis: `${STANDARDS_MAP.wind_pressure.short} · 水密性能等级${fixedNote}`
    }
  ];"""

NEW_NEEDS_CT = """  return [
    {
      dimension: '抗风压',
      value: `≥ ${getField(resolved, 'P3')} kPa`,
      basis: `${STANDARDS_MAP.wind_pressure.short} · ${resolved.wind_zone || 'W?'}风区${(heightRatio * 100).toFixed(0)}%`,
      levelBar: { lowValue: '1.0', lowLabel: '基础合规', highValue: '6.0', highLabel: '行业高端', midValue: getField(resolved, 'P3'), unit: 'kPa', direction: 'ascending' }
    },
    {
      dimension: '隔声',
      value: `≥ ${getField(resolved, 'Rw')} dB`,
      basis: `${STANDARDS_MAP.sound_insulation.short} · ${getNoiseShortDesc(answers.noise_type, answers.noise_dist)}`,
      levelBar: { lowValue: '30', lowLabel: '基础合规', highValue: '50', highLabel: '行业高端', midValue: getField(resolved, 'Rw'), unit: 'dB', direction: 'ascending' }
    },
    {
      dimension: '传热系数',
      value: `K≤${kText} W/(m²·K)${thermalRange ? `（推荐范围${thermalRange}）` : ''}`,
      basis: `${STANDARDS_MAP.thermal.short} · ${kBasisText}`,
      levelBar: { lowValue: '3.0', lowLabel: '基础合规', highValue: '1.0', highLabel: '行业高端', midValue: kNum, unit: 'W/(m²·K)', direction: 'descending' }
    },
    {
      dimension: '太阳得热',
      value: `≤ ${getField(resolved, 'SHGC')}`,
      basis: `${STANDARDS_MAP.shgc.short} · ${getShgcNote(answers)}`,
      levelBar: { lowValue: '0.60', lowLabel: '基础合规', highValue: '0.15', highLabel: '行业高端', midValue: getField(resolved, 'SHGC'), unit: '', direction: 'descending' }
    },
    {
      dimension: '安全等级',
      value: safetyValue,
      basis: safetyBasis
    },
    {
      dimension: '气密性',
      value: airValue,
      basis: `${STANDARDS_MAP.wind_pressure.short} · 气密性能等级${fixedNote}`,
      levelBar: { lowValue: '4', lowLabel: '基础合规', highValue: '8', highLabel: '行业高端', midValue: sg.airRec, unit: '级', direction: 'ascending' }
    },
    {
      dimension: '水密性',
      value: waterValue,
      basis: `${STANDARDS_MAP.wind_pressure.short} · 水密性能等级${fixedNote}`,
      levelBar: { lowValue: '2', lowLabel: '基础合规', highValue: '6', highLabel: '行业高端', midValue: sg.waterRec, unit: '级', direction: 'ascending' }
    }
  ];"""

# ── PATCH 4: redlineSpec.js ────────────────────────────────────
OLD_REDLINE = """function buildRedlineRegistry({ TERM, getTierLabel, getField }) {
  return [
    // 型材系统主线
    { id: 'R01', text: '型材系统：须采用原生铝型材，并提供材质检验证明；如采用其他材质，应说明理由并提供检测依据', level: 'mandatory', softened: false, trigger: () => true },
    { id: 'R02', text: (a, r) => `型材系统：主受力壁厚≥1.5mm（当前风压要求P3≥${getField(r, 'P3')}kPa），须提供截面检测报告`, level: 'mandatory', softened: false, trigger: () => true },
    { id: 'R03', text: '型材系统：须提供完整系统窗热工认证文件（含型材+隔热条+玻璃组合认证）', level: 'mandatory', softened: false, trigger: () => true },
    { id: 'R04', text: '型材系统：禁止非配套隔热条拼装，不接受与型材品牌不一致的隔热条', level: 'mandatory', softened: false, trigger: () => true },
    { id: 'R05', text: (a, r) => `型材系统：断桥铝隔热条宽度≥28mm（当前热工要求K≤${getField(r, 'K')}），禁止仿断桥产品`, level: 'mandatory', softened: false, trigger: () => true },

    // 玻璃/热工主线
    { id: 'R06', text: '热工性能：禁止单玻或无Low-E膜的普通中空玻璃', level: 'mandatory', softened: false, trigger: () => true },
    { id: 'R07', text: (a, r) => `热工性能：整窗传热系数K≤${getField(r, 'K')}，太阳得热系数SHGC≤${getField(r, 'SHGC')}，须提供能效/热工检测报告`, level: 'mandatory', softened: false, trigger: () => true },
    { id: 'R08', text: '热工性能：隔热条须与型材系统配套，禁止非原厂隔热条替换', level: 'mandatory', softened: false, trigger: () => true },

    // 隔声主线
    { id: 'R09', text: (a, r) => `隔声性能：整窗隔声量Rw≥${getField(r, 'Rw')}dB，须提供第三方声学检测报告（GB/T 8485）`, level: 'mandatory', softened: false, trigger: (a, r) => !!(r && (r.Rw_required || r.Rw)) },
    { id: 'R10', text: '隔声性能：玻璃与窗框接缝须采用声学密封规程，禁止普通密封胶代替声学密封胶', level: 'mandatory', softened: false, trigger: (a, r) => !!(r && (r.Rw_required || r.Rw)) },

    // 密封/结构主线
    { id: 'R11', text: '密封结构：禁止普通密封胶代替结构胶（须采用中性硅酮结构胶）', level: 'mandatory', softened: false, trigger: () => true },
    { id: 'R12', text: '', level: 'mandatory', softened: false, trigger: () => true },

    // 抗风主线
    { id: 'R13', text: (a, r) => `抗风性能：抗风压性能等级≥${r.wind_pressure_level || '待定'}级（P3≥${getField(r, 'P3')}kPa），须提供抗风压性能检测报告（GB/T 7106）`, level: 'mandatory', softened: false, trigger: (a, r) => !!(r && (r.P3_required || r.P3 || r.wind_pressure_level)) },

    // 安全主线
    { id: 'R14', text: '安全玻璃：夹胶构造强制（落地窗/大面积玻璃/有儿童家庭法规要求）', level: 'mandatory', softened: false, trigger: (a, r) => !!(r && r.safetyForced) },
    { id: 'R15', text: '适老化：执手操作力≤25N，门槛高度≤15mm', level: 'mandatory', softened: false, trigger: (a) => {
      const fr = Array.isArray(a.family_risk) ? a.family_risk : [];
      return fr.includes('elderly') || fr.includes('elder');
    } }
  ];
}"""

NEW_REDLINE = """function buildRedlineRegistry({ TERM, getTierLabel, getField }) {
  return [
    // 型材系统主线
    { id: 'R01', text: '型材系统：须采用原生铝型材，并提供材质检验证明；如采用其他材质，应说明理由并提供检测依据', level: 'mandatory', softened: false, trigger: () => true, userMeaning: '部分商家用回收铝或杂料替代原生铝，外观无法区分。杂料型材强度不足，抗风压性能无法保证。材质证明、出厂合格证和必要的进场复验资料是核验材质真伪的主要依据，外观不能作为判断依据。' },
    { id: 'R02', text: (a, r) => `型材系统：主受力壁厚≥1.5mm（当前风压要求P3≥${getField(r, 'P3')}kPa），须提供截面检测报告`, level: 'mandatory', softened: false, trigger: () => true, userMeaning: '壁厚是型材抗风压的主要参数之一。商家常见说法是"我们产品质量很好"，但不提供壁厚数据。壁厚不足在极端天气下可能导致型材变形或破坏，须要求提供截面检测报告。' },
    { id: 'R03', text: '型材系统：须提供完整系统窗热工认证文件（含型材+隔热条+玻璃组合认证）', level: 'mandatory', softened: false, trigger: () => true, userMeaning: '系统窗的热工性能取决于型材+隔热条+玻璃的整体配合。商家常见做法是非配套拼装，整窗实际K值与标称值存在偏差。完整系统认证文件是唯一可核查的依据。' },
    { id: 'R04', text: '型材系统：禁止非配套隔热条拼装，不接受与型材品牌不一致的隔热条', level: 'mandatory', softened: false, trigger: () => true, userMeaning: '非配套隔热条会导致型材热工性能失真，整窗K值可能远高于标称值。外观上无法识别，须在合同中明确约定并要求认证文件。' },
    { id: 'R05', text: (a, r) => `型材系统：断桥铝隔热条宽度≥28mm（当前热工要求K≤${getField(r, 'K')}），禁止仿断桥产品`, level: 'mandatory', softened: false, trigger: () => true, userMeaning: '隔热条宽度直接影响型材整体K值。宽度不足时，即使玻璃达标，整窗K值仍可能超出本案要求。须在报价中明确列出隔热条型号、宽度及与型材系统的配套关系。' },

    // 玻璃/热工主线
    { id: 'R06', text: '热工性能：禁止单玻或无Low-E膜的普通中空玻璃', level: 'mandatory', softened: false, trigger: () => true, userMeaning: '是否满足本案传热系数要求，应以整窗K值检测报告为准，不能仅凭"双层玻璃"判断。须要求商家明确说明玻璃配置、是否含Low-E膜及膜层位置。' },
    { id: 'R07', text: (a, r) => `热工性能：整窗传热系数K≤${getField(r, 'K')}，太阳得热系数SHGC≤${getField(r, 'SHGC')}，须提供能效/热工检测报告`, level: 'mandatory', softened: false, trigger: () => true, userMeaning: '这是整窗层面的性能指标，不是玻璃单独的指标。商家常只说玻璃参数而不提整窗认证，两者可能有显著差异。须要求提供整窗热工性能检测报告，而非仅凭玻璃参数推算。' },
    { id: 'R08', text: '热工性能：隔热条须与型材系统配套，禁止非原厂隔热条替换', level: 'mandatory', softened: false, trigger: () => true, userMeaning: '配套是系统窗热工性能的基础保障。非原厂配套隔热条可能导致热工性能偏离标称值，须在认证文件中核查型材与隔热条的配套关系。' },

    // 隔声主线
    { id: 'R09', text: (a, r) => `隔声性能：整窗隔声量Rw≥${getField(r, 'Rw')}dB，须提供第三方声学检测报告（GB/T 8485）`, level: 'mandatory', softened: false, trigger: (a, r) => !!(r && (r.Rw_required || r.Rw)), userMeaning: '隔声是整窗系统性能，受玻璃、密封、安装综合影响。商家常见说法是"我们玻璃隔声好"，但整窗隔声量与玻璃单独指标有显著差异。第三方声学检测报告是唯一可信依据，须索取报告编号并可查。' },
    { id: 'R10', text: '隔声性能：玻璃与窗框接缝须采用声学密封规程，禁止普通密封胶代替声学密封胶', level: 'mandatory', softened: false, trigger: (a, r) => !!(r && (r.Rw_required || r.Rw)), userMeaning: '接缝处理是隔声的薄弱环节。即使玻璃达标，接缝气密性不足仍会影响整窗隔声表现。须要求商家在合同中说明密封工艺，并在安装过程中留存影像。' },

    // 密封/结构主线
    { id: 'R11', text: '密封结构：禁止普通密封胶代替结构胶（须采用中性硅酮结构胶）', level: 'mandatory', softened: false, trigger: () => true, userMeaning: '结构胶与普通密封胶外观相似，但力学性能和耐久性差异极大。普通密封胶长期使用后开裂，影响气密、水密和结构安全。须要求商家提供所用密封胶的产品说明书。' },
    { id: 'R12', text: '', level: 'mandatory', softened: false, trigger: () => true, userMeaning: '' },

    // 抗风主线
    { id: 'R13', text: (a, r) => `抗风性能：抗风压性能等级≥${r.wind_pressure_level || '待定'}级（P3≥${getField(r, 'P3')}kPa），须提供抗风压性能检测报告（GB/T 7106）`, level: 'mandatory', softened: false, trigger: (a, r) => !!(r && (r.P3_required || r.P3 || r.wind_pressure_level)), userMeaning: '高楼层风压显著高于普通住宅。型材壁厚不足或安装固定点不足，在台风或强风天气下可能导致窗框变形甚至脱落。须索取与本案风压等级对应的检测报告，并在进场时核查壁厚。' },

    // 安全主线
    { id: 'R14', text: '安全玻璃：夹胶构造强制（落地窗/大面积玻璃/有儿童家庭法规要求）', level: 'mandatory', softened: false, trigger: (a, r) => !!(r && r.safetyForced), userMeaning: '本案存在高碰撞风险部位（落地窗/儿童活动区），此类场景应采用夹层安全玻璃，碎片不脱落。商家若以"钢化玻璃同样安全"替代，须提供该部位适用的安全玻璃类型依据，否则不予接受。' },
    { id: 'R15', text: '适老化：执手操作力≤25N，门槛高度≤15mm', level: 'mandatory', softened: false, trigger: (a) => {
      const fr = Array.isArray(a.family_risk) ? a.family_risk : [];
      return fr.includes('elderly') || fr.includes('elder');
    }, userMeaning: '适老化门窗没有全国统一强制标准，商家说"适老化设计"时通常无对应检测文件可核查。可用的核验方式：①要求说明把手形式（横执杆式或下压式，不接受球形把手）；②要求把手安装高度在850-1000mm范围内；③确认是否设置门槛及过渡方式。执手操作力≤25N是适老化标准中的常见数值，可在合同中约定，但目前无专项检测报告可索取。' }
  ];
}"""

# ── Main ───────────────────────────────────────────────────────
def patch_gr(path):
    print(f"\n[generateReport/documentMapper.js]")
    c = read_file(path)
    ok = True
    c, r = replace_once(c, OLD_NODES,    NEW_NODES,    "ACCEPTANCE_NODES"); ok = ok and r
    c, r = replace_once(c, OLD_DYN,      NEW_DYN,      "dynamic ⑫⑬");      ok = ok and r
    c, r = replace_once(c, OLD_I13,      NEW_I13,      "i13 findIndex");    ok = ok and r
    c, r = replace_once(c, OLD_MRG,      NEW_MRG,      "i13 merge");        ok = ok and r
    c, r = replace_once(c, OLD_PLN,      NEW_PLN,      "i13 plain");        ok = ok and r
    c, r = replace_once(c, OLD_NEEDS_GR, NEW_NEEDS_GR, "buildNeedsTable");  ok = ok and r
    if ok: write_file(path, c); print("  → Saved")
    else:  print("  → ABORTED")
    return ok

def patch_ct(path):
    print(f"\n[createTender/documentMapper.js]")
    c = read_file(path)
    ok = True
    c, r = replace_once(c, OLD_NODES,    NEW_NODES,    "ACCEPTANCE_NODES"); ok = ok and r
    c, r = replace_once(c, OLD_DYN,      NEW_DYN,      "dynamic ⑫⑬");      ok = ok and r
    c, r = replace_once(c, OLD_I13,      NEW_I13,      "i13 findIndex");    ok = ok and r
    c, r = replace_once(c, OLD_MRG,      NEW_MRG,      "i13 merge");        ok = ok and r
    c, r = replace_once(c, OLD_PLN,      NEW_PLN,      "i13 plain");        ok = ok and r
    c, r = replace_once(c, OLD_NEEDS_CT, NEW_NEEDS_CT, "buildNeedsTable");  ok = ok and r
    if ok: write_file(path, c); print("  → Saved")
    else:  print("  → ABORTED")
    return ok

def patch_redline(path):
    print(f"\n[redlineSpec.js] {path}")
    if not os.path.exists(path):
        print("  → SKIP"); return True
    c = read_file(path)
    c, r = replace_once(c, OLD_REDLINE, NEW_REDLINE, "buildRedlineRegistry")
    if r: write_file(path, c); print("  → Saved")
    else: print("  → ABORTED")
    return r

all_ok = True
all_ok = patch_gr(os.path.join(BASE, "generateReport", "documentMapper.js")) and all_ok
all_ok = patch_ct(os.path.join(BASE, "createTender",   "documentMapper.js")) and all_ok
all_ok = patch_redline(os.path.join(BASE, "generateReport", "shared", "redlineSpec.js")) and all_ok
all_ok = patch_redline(os.path.join(BASE, "createTender",   "shared", "redlineSpec.js")) and all_ok

print("\n✅ All patches OK — run npm test" if all_ok else "\n❌ Patch failed — check errors above")