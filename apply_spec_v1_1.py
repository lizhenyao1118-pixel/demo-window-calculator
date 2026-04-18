#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SPEC-OUTPUT-v1.1 执行脚本
文件: miniprogram/cloudfunctions/generateReport/documentMapper.js
"""

import shutil
import sys

FILE_PATH = r"C:\Users\Administrator\Documents\trae_projects\demo-window-calculator\miniprogram\cloudfunctions\generateReport\documentMapper.js"
BAK_PATH = FILE_PATH + ".bak"

def main():
    # 1. 备份原文件
    shutil.copy2(FILE_PATH, BAK_PATH)
    print(f"[备份] 已创建: {BAK_PATH}")

    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    original_line_count = len(content.split('\n'))
    print(f"[信息] 原文件行数: {original_line_count}")

    # 变更1: buildNeedsTable - 添加 derivation 和 marketReality (分两步)
    # 步骤1a: 添加计算辅助变量 (在 const waterValue = ... 之后, return [ 之前)
    old_str_1a = '''  const waterValue = `本案目标值：≥${sg.waterRec}级`;

  return ['''

    new_str_1a = '''  const waterValue = `本案目标值：≥${sg.waterRec}级`;

  // derivation computation helpers
  const _noiseTypeLabel = NOISE_TYPE_MAP[answers.noise_type] || '噪声';
  const _distLabel = NOISE_DIST_MAP[answers.noise_dist] || '';
  const _rwBase = { main_road: 35, elevated: 38, rail: 40, quiet: 30 }[answers.noise_type] || 30;
  const _distAdj = { lt20: 3, '20to50': 0, gt50: -3, gt50_shielded: -3 }[answers.noise_dist] || 0;
  const _usageAdj = answers.noise_type === 'rail' ? 0 : (answers.pain_point === 'sound' ? 3 : 0);
  const _rwAdjParts = [];
  if (_distAdj !== 0) _rwAdjParts.push(`距离修正${_distAdj > 0 ? '+' : ''}${_distAdj}dB`);
  if (_usageAdj > 0) _rwAdjParts.push(`隔声优先加严+${_usageAdj}dB`);
  const _orientLabel = { east: '东', west: '西', south: '南', north: '北', southeast: '东南', southwest: '西南', northeast: '东北', northwest: '西北' }[answers.orientation] || answers.orientation || '';
  const _isCoastal = !!(CLIMATE_SPEC[answers.city] && CLIMATE_SPEC[answers.city].isCoastal);

  return ['''

    if old_str_1a in content:
        content = content.replace(old_str_1a, new_str_1a)
        print("变更1a (辅助变量): OK")
    else:
        print("变更1a (辅助变量): FAILED (未找到匹配)")
        sys.exit(1)

    # 步骤1b: 替换 return 数组内容
    old_str_1b = '''  return [
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
  ];'''

    new_str_1b = '''  return [
    {
      dimension: '抗风压',
      value: `≥ ${getField(resolved, 'P3')} kPa`,
      basis: `${STANDARDS_MAP.wind_pressure.short} · ${resolved.wind_zone || 'W?'}风区${(heightRatio * 100).toFixed(0)}%`,
      levelBar: { lowValue: '1.0', lowLabel: '基础合规', highValue: '6.0', highLabel: '行业高端', midValue: getField(resolved, 'P3'), unit: 'kPa', direction: 'ascending' },
      derivation: `${answers.city}属${resolved.wind_zone || 'W?'}风区，第${answers.floor}层高度比${(heightRatio * 100).toFixed(0)}%，按GB/T 7106计算，本案要求≥${getField(resolved, 'P3')}kPa`,
      marketReality: Number(getField(resolved, 'P3')) < 3.5
        ? { tag: '普遍可达', description: '市场主流系统窗均可覆盖，需索取抗风压性能检测报告（GB/T 7106）' }
        : { tag: '需主动筛选', description: '需1.5mm以上壁厚型材，须明确要求并索取截面检测报告，进场时现场核查壁厚' },
    },
    {
      dimension: '隔声',
      value: `≥ ${getField(resolved, 'Rw')} dB`,
      basis: `${STANDARDS_MAP.sound_insulation.short} · ${getNoiseShortDesc(answers.noise_type, answers.noise_dist)}`,
      levelBar: { lowValue: '30', lowLabel: '基础合规', highValue: '50', highLabel: '行业高端', midValue: getField(resolved, 'Rw'), unit: 'dB', direction: 'ascending' },
      derivation: answers.noise_type === 'quiet'
        ? `周边环境安静，基础Rw≥${_rwBase}dB${_usageAdj > 0 ? `，隔声优先加严+${_usageAdj}dB` : ''}，本案要求Rw≥${getField(resolved, 'Rw')}dB`
        : `${answers.city}${_noiseTypeLabel}${_distLabel ? '，' + _distLabel : ''}，基础Rw≥${_rwBase}dB${_rwAdjParts.length > 0 ? '，' + _rwAdjParts.join('，') : ''}，本案要求Rw≥${getField(resolved, 'Rw')}dB`,
      marketReality: (() => {
        const rw = Number(getField(resolved, 'Rw'));
        if (rw < 35) return { tag: '普遍可达', description: '市场主流系统窗可达，重点核验：索取整窗第三方声学检测报告' };
        if (rw <= 42) return { tag: '普遍可达', description: '中高端系统窗普遍可达，需明确要求夹胶中空玻璃并索取第三方声学检测报告' };
        return { tag: '需主动筛选', description: '需高规格夹胶中空玻璃配合声学密封工艺，须与商家逐项确认具体配置' };
      })(),
    },
    {
      dimension: '传热系数',
      value: `K≤${kText} W/(m²·K)${thermalRange ? `（参考范围${thermalRange}）` : ''}`,
      basis: `${STANDARDS_MAP.thermal.short} · ${kBasisText}`,
      levelBar: { lowValue: '3.0', lowLabel: '基础合规', highValue: '1.0', highLabel: '行业高端', midValue: kNum, unit: 'W/(m²·K)', direction: 'descending' },
      derivation: `${czCN}气候区，基准K≤${resolved.kBase || '2.4'}W/(m²·K)${resolved.appliedFactor && kBasisText !== czCN + '区基准' ? `，${kBasisText.replace(czCN + '区 ', '')}` : ''}，本案取K≤${kText}W/(m²·K)`,
      marketReality: (() => {
        if (kNum > 2.0) return { tag: '普遍可达', description: '断桥铝+普通Low-E中空玻璃可达，需索取整窗热工检测报告' };
        if (kNum >= 1.5) return { tag: '需主动筛选', description: '需断桥铝+高性能Low-E中空玻璃，须明确隔热条规格并索取系统窗整窗热工认证文件' };
        return { tag: '需主动筛选', description: '需被动式系统窗或三玻两腔，市场供给有限，须专项确认产品系列和认证文件' };
      })(),
    },
    {
      dimension: '太阳得热',
      value: `≤ ${getField(resolved, 'SHGC')}`,
      basis: `${STANDARDS_MAP.shgc.short} · ${getShgcNote(answers)}`,
      levelBar: { lowValue: '0.60', lowLabel: '基础合规', highValue: '0.15', highLabel: '行业高端', midValue: getField(resolved, 'SHGC'), unit: '', direction: 'descending' },
      derivation: `${_orientLabel ? _orientLabel + '向朝向，' : ''}${czCN}气候区，${getShgcNote(answers)}，本案取SHGC≤${getField(resolved, 'SHGC')}`,
      marketReality: Number(getField(resolved, 'SHGC')) > 0.35
        ? { tag: '普遍可达', description: '普通Low-E镀膜玻璃可达，需确认膜层位置并索取SHGC检测报告' }
        : { tag: '需主动筛选', description: '需高遮阳型Low-E或双Low-E镀膜，需明确要求商家提供膜层位置说明及SHGC检测数据' },
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
      levelBar: { lowValue: '4', lowLabel: '基础合规', highValue: '8', highLabel: '行业高端', midValue: sg.airRec, unit: '级', direction: 'ascending' },
      derivation: `住宅基础气密性4级${Number(answers.floor) >= 7 ? '，高层建议上调' : ''}，本案目标值≥${sg.airRec}级`,
      marketReality: { tag: '普遍可达', description: '市场主流产品均可达到，决定性因素是安装质量，须要求打胶全程留影像记录' },
    },
    {
      dimension: '水密性',
      value: waterValue,
      basis: `${STANDARDS_MAP.wind_pressure.short} · 水密性能等级${fixedNote}`,
      levelBar: { lowValue: '2', lowLabel: '基础合规', highValue: '6', highLabel: '行业高端', midValue: sg.waterRec, unit: '级', direction: 'ascending' },
      derivation: _isCoastal
        ? `${answers.city}沿海城市，水密性上调以应对台风季暴雨，本案目标值≥${sg.waterRec}级`
        : (Number(answers.floor) >= 7
          ? `第${answers.floor}层高层，水密性上调提升抗渗能力，本案目标值≥${sg.waterRec}级`
          : `基础水密性${sg.waterMin}级，本案目标值≥${sg.waterRec}级`),
      marketReality: { tag: '普遍可达', description: '市场主流产品均可达到，决定性因素是安装节点和打胶质量，须要求安装全程留影像记录' },
    }
  ];'''

    if old_str_1b in content:
        content = content.replace(old_str_1b, new_str_1b)
        print("变更1b (return数组): OK")
    else:
        print("变更1b (return数组): FAILED (未找到匹配)")
        sys.exit(1)

    # 变更2: chapter2 - 添加 responseGuide
    old_str_2 = '''      // SPEC-G2 step2: derivation placeholders (null = not implemented yet)
      acousticDerivation: null,
      thermalDerivation: null
    },'''

    new_str_2 = '''      // SPEC-G2 step2: derivation placeholders (null = not implemented yet)
      acousticDerivation: null,
      thermalDerivation: null,
      responseGuide: {
        complete: '完整回应的标志：每项均有具体数值，并附检测报告编号或出具机构名称',
        evasion:  '回避信号：某项仅有口头承诺，无检测报告编号；或以"符合国家标准"等模糊表述代替具体数值',
        reject:   '排除信号：某项明确表示无法达到本案指标，或对该项沉默不回应',
      },
    },'''

    if old_str_2 in content:
        content = content.replace(old_str_2, new_str_2)
        print("变更2 (responseGuide): OK")
    else:
        print("变更2 (responseGuide): FAILED (未找到匹配)")
        sys.exit(1)

    # 变更3a: REDLINE_USER_MEANING 常量 (在 REDLINE_REGISTRY 之前)
    old_str_3a = '''const REDLINE_REGISTRY = buildRedlineRegistry({ TERM, getTierLabel, getField });'''

    new_str_3a = '''const REDLINE_USER_MEANING = {
  'R-profile-material': '部分商家用回收铝或杂料替代原生铝，外观无法区分。杂料型材强度不足，抗风压性能无法保证。材质证明、出厂合格证和必要的进场复验资料是核验材质真伪的主要依据，外观不能作为判断依据。',
  'R-profile-thickness': '壁厚是型材抗风压的主要参数之一。商家常见说法是"我们产品质量很好"，但不提供壁厚数据。壁厚不足在极端天气下可能导致型材变形或破坏，须要求提供截面检测报告。',
  'R-profile-cert': '系统窗的热工性能取决于型材+隔热条+玻璃的整体配合。商家常见做法是非配套拼装，整窗实际K值与标称值存在偏差。完整系统认证文件是唯一可核查的依据。',
  'R-profile-thermal-bar': '非配套隔热条会导致型材热工性能失真，整窗K值可能远高于标称值。外观上无法识别，须在合同中明确约定并要求认证文件。',
  'R-thermal-bar-width': '隔热条宽度直接影响型材整体K值。宽度不足时，即使玻璃达标，整窗K值仍可能超出本案要求。须在报价中明确列出隔热条型号、宽度及与型材系统的配套关系。',
  'R-glass-type': '是否满足本案传热系数要求，应以整窗K值检测报告为准，不能仅凭"双层玻璃"判断。须要求商家明确说明玻璃配置、是否含Low-E膜及膜层位置。',
  'R-glass-thermal-cert': '这是整窗层面的性能指标，不是玻璃单独的指标。商家常只说玻璃参数而不提整窗认证，两者可能有显著差异。须要求提供整窗热工性能检测报告，而非仅凭玻璃参数推算。',
  'R-glass-system-match': '配套是系统窗热工性能的基础保障。非原厂配套隔热条可能导致热工性能偏离标称值，须在认证文件中核查型材与隔热条的配套关系。',
  'R-acoustic': '隔声是整窗系统性能，受玻璃、密封、安装综合影响。商家常见说法是"我们玻璃隔声好"，但整窗隔声量与玻璃单独指标有显著差异。第三方声学检测报告是唯一可信依据，须索取报告编号并可查。',
  'R-acoustic-seal': '接缝处理是隔声的薄弱环节。即使玻璃达标，接缝气密性不足仍会影响整窗隔声表现。须要求商家在合同中说明密封工艺，并在安装过程中留存影像。',
  'R-sealant': '结构胶与普通密封胶外观相似，但力学性能和耐久性差异极大。普通密封胶长期使用后开裂，影响气密、水密和结构安全。须要求商家提供所用密封胶的产品说明书。',
  'R-seal-grades': '气密水密等级直接影响隔声、保温和防水性能。安装节点是决定性因素，仅靠产品本身无法保证。须要求安装全程按设计图纸施工，打胶留影像记录，竣工后按合同约定的检测方式进行验收。',
  'R-wind': '高楼层风压显著高于普通住宅。型材壁厚不足或安装固定点不足，在台风或强风天气下可能导致窗框变形甚至脱落。须索取与本案风压等级对应的检测报告，并在进场时核查壁厚。',
  'R-safety-glass': '本案存在高碰撞风险部位（落地窗/儿童活动区），此类场景应采用夹层安全玻璃，碎片不脱落。商家若以"钢化玻璃同样安全"替代，须提供该部位适用的安全玻璃类型依据，否则不予接受。',
  'R15': '适老化门窗没有全国统一强制标准，商家说"适老化设计"时通常无对应检测文件可核查。可用的核验方式：①要求说明把手形式（横执杆式或下压式，不接受球形把手）；②要求把手安装高度在850-1000mm范围内；③确认是否设置门槛及过渡方式。',
};

const REDLINE_REGISTRY = buildRedlineRegistry({ TERM, getTierLabel, getField });'''

    if old_str_3a in content:
        content = content.replace(old_str_3a, new_str_3a)
        print("变更3a (REDLINE_USER_MEANING): OK")
    else:
        print("变更3a (REDLINE_USER_MEANING): FAILED (未找到匹配)")
        sys.exit(1)

    # 变更3b: buildRedlineChecklist 添加 userMeaning
    old_str_3b = '''    if (r.level === 'mandatory') mandatory.push(item);
    else recommended.push(item);'''

    new_str_3b = '''    item.userMeaning = REDLINE_USER_MEANING[r.id] || null;
    if (r.level === 'mandatory') mandatory.push(item);
    else recommended.push(item);'''

    if old_str_3b in content:
        content = content.replace(old_str_3b, new_str_3b)
        print("变更3b (userMeaning): OK")
    else:
        print("变更3b (userMeaning): FAILED (未找到匹配)")
        sys.exit(1)

    # 变更4-7: buildChapter4Data 新增字段
    old_str_4 = '''    acceptance: { title: '4.4 验收节点', nodes: buildAcceptanceNodes(family_risk, answers.window_type) },
    performanceChecks,
    redlineChecklist: sharedRedlineChecklist
  };'''

    new_str_4 = '''    acceptance: { title: '4.4 验收节点', nodes: buildAcceptanceNodes(family_risk, answers.window_type) },
    performanceChecks,
    redlineChecklist: sharedRedlineChecklist,
    actionSteps: [
      { step: 1, title: '发出文件', description: '将本文件发给 3-5 家商家', hint: '可附说明：请按第二章逐项书面回应，第三章逐项确认，并填写第四章答题表' },
      { step: 2, title: '排除不合格', description: '收到回应后，用第三章红线清单逐项核对', hint: '任何一项红线不满足，直接排除，无需解释，无需谈判' },
      { step: 3, title: '比较剩余方案', description: '用第二章技术指标表横向对比剩余商家', hint: '重点看检测报告是否完整，而不是总价高低' },
    ],
    threePhaseIntro: {
      phases: [
        { phase: 1, title: '下单前', timing: '收到商家报价、准备签合同前', action: '将本文件发给 3-5 家商家，收到回应后用第三章排除不合格方案，剩余方案用第二章横向对比', hint: '任何一项红线不满足，直接排除，无需解释，无需谈判', nextTrigger: '已选定商家，准备安排进场安装' },
        { phase: 2, title: '安装前', timing: '材料到场、工人开始安装前', action: '按进场核查清单拍摄留存，提交招标管理', hint: '安装完成后部分标签将被覆盖，此时是唯一核查窗口', nextTrigger: '安装完成，准备竣工验收' },
        { phase: 3, title: '安装后', timing: '全部窗户安装完成，施工队准备撤场前', action: '按验收清单逐项自检并记录结果，提交招标管理', hint: '发现问题须在施工队撤场前要求整改，撤场后处理成本极高', nextTrigger: '验收完成，如需专业核查可进入审计服务' },
      ],
    },
    inspectionChecklist: {
      intro: '以下照片在材料进场、安装开始前拍摄。安装完成后部分标签将被覆盖，无法补拍。照片提交至招标管理，核查实际材料与配置单是否一致。',
      mustShoot: [
        { id: 'P1', subject: '玻璃边部标签 + 包装外箱 + 出厂单', purpose: '核查品牌、型号、Low-E标注、厚度、3C编号', warning: '安装后标签被压条遮挡，无法补拍，进场即拍' },
        { id: 'P2', subject: '密封胶/结构胶未开封包装（正面全景）', purpose: '核查胶种类（结构胶 vs 普通密封胶）、品牌、批号', warning: '用完即丢，开工前必须拍，错过无法补' },
        { id: 'P3', subject: '五金包装或铭牌（执手/限位器/铰链拆包时拍）', purpose: '核查品牌型号与报价单一致', warning: '装好后型号难核查，拆包时拍' },
        { id: 'P4', subject: '材料全景 + 送货单同框', purpose: '核查到货品类、数量、品牌总体一致性', warning: '' },
      ],
      shouldShoot: [
        { id: 'P5', subject: '型材端头 + 送货单同框', purpose: '辅助核查品牌系列', caveat: '壁厚数值照片难精确读取，不以照片为准，以文件为准' },
        { id: 'P6', subject: '限位器安装完成状态（安装调试阶段拍）', purpose: '确认已安装、型号可见', caveat: '只能确认有无安装，不能核查开启角度；错过安装调试阶段后被遮挡' },
        { id: 'P7', subject: '安装节点关键部位——优先拍短视频', purpose: '打胶过程/发泡剂填充/排水孔预留留存证据', caveat: '静态照片无法判断打胶连续性，优先录短视频，尤其是转角和收头位置' },
      ],
      useDocument: [
        { id: 'F1', checkItem: '型材壁厚数值', alternative: '索要型材检测报告或截面参数书，不靠手机拍截面读数' },
        { id: 'F2', checkItem: '隔热条材质（PA66/PVC区分）', alternative: '索要材质证明或配套说明，颜色不能作为材质判断依据' },
        { id: 'F3', checkItem: '间隔条类型（暖边/铝条区分）', alternative: '索要供应商材料说明，安装后基本不可见' },
        { id: 'F4', checkItem: '执手真伪', alternative: '包装+型号+采购单三合一核对，单拍Logo价值有限' },
      ],
    },
  };'''

    if old_str_4 in content:
        content = content.replace(old_str_4, new_str_4)
        print("变更4-6 (chapter4 字段): OK")
    else:
        print("变更4-6 (chapter4 字段): FAILED (未找到匹配)")
        sys.exit(1)

    # 变更7: merchantQuestionnaire 添加 fieldGrades 和 consistencyClause
    old_str_7 = '''      signature: {
        text: '下列签名表示填写人已确认上述内容的真实性；如进入签约，本文件所列关键指标为合同技术条款的组成部分。填写人确认：__________',
        fields: []
      }
    },'''

    new_str_7 = '''      signature: {
        text: '下列签名表示填写人已确认上述内容的真实性；如进入签约，本文件所列关键指标为合同技术条款的组成部分。填写人确认：__________',
        fields: []
      },
      fieldGrades: {
        gradeA: ['windResistanceReport', 'airWaterTightnessReport', 'laminatedGlass3C', 'acousticReport'],
        gradeB: ['thermalKReport', 'shgcData', 'profileThickness', 'thermalBarSpec', 'limiterModel', 'systemCertification'],
        gradeC: ['glassDetailSpec'],
      },
      consistencyClause: '所提供报告及数据的检测配置须与本项目报价配置一致。如存在差异，须书面说明差异内容及原因。',
    },'''

    if old_str_7 in content:
        content = content.replace(old_str_7, new_str_7)
        print("变更7 (fieldGrades/consistencyClause): OK")
    else:
        print("变更7 (fieldGrades/consistencyClause): FAILED (未找到匹配)")
        sys.exit(1)

    # 写入修改后的文件
    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        f.write(content)

    new_line_count = len(content.split('\n'))
    print(f"\n[完成] 原行数: {original_line_count}, 新行数: {new_line_count}")
    print("[状态] 全部变更执行成功，无 FAILED 项")

if __name__ == '__main__':
    main()
