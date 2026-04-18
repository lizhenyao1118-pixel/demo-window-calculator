# 内容定稿文档 v1.1
# 门窗诊断系统 · documentMapper 文本内容定义

> 本文档定义所有需写入 documentMapper.js 的文本内容。
> 分为"固定内容"（直接写入）和"模板内容"（变量替换生成）。
> Claude Code 执行时照此文档实现，不得自行发挥。
> 建立时间：2026-04-13 | 更新时间：2026-04-14
>
> **v1.1 变更摘要（对照 v1.0）：**
> 1. 第四节 userMeaning：目的地从"第三章渲染"改为"首页Q&A内容库"，数据层仍写入
> 2. 新增第八节：chapter4.threePhaseIntro 三阶段框架固定文本
> 3. 新增第九节：chapter4.inspectionChecklist 进场核查拍摄清单固定内容
> 4. 新增第十节：chapter4.merchantQuestionnaire 新增字段内容

---

## 一、chapter2.responseGuide（固定内容）✅ 不变

```javascript
responseGuide: {
  complete: "完整回应的标志：每项均有具体数值，并附检测报告编号或出具机构名称",
  evasion:  "回避信号：某项仅有口头承诺，无检测报告编号；或以"符合国家标准"等模糊表述代替具体数值",
  reject:   "排除信号：某项明确表示无法达到本案指标，或对该项沉默不回应",
}
```

---

## 二、chapter4.actionSteps（固定内容）✅ 不变

```javascript
actionSteps: [
  {
    step: 1,
    title: "发出文件",
    description: "将本文件发给 3-5 家商家",
    hint: "可附说明：请按第二章逐项书面回应，第三章逐项确认，并填写第四章答题表",
  },
  {
    step: 2,
    title: "排除不合格",
    description: "收到回应后，用第三章红线清单逐项核对",
    hint: "任何一项红线不满足，直接排除，无需解释，无需谈判",
  },
  {
    step: 3,
    title: "比较剩余方案",
    description: "用第二章技术指标表横向对比剩余商家",
    hint: "重点看检测报告是否完整，而不是总价高低",
  },
]
```

---

## 三、needsTable 参数三层内容定义

### 3.1 levelBar 固定区间值（✅ 不变）

```javascript
LEVEL_BAR_CONFIG = {
  rw: {
    lowValue: "30", lowLabel: "基础合规",
    highValue: "50", highLabel: "行业高端",
    unit: "dB",
    direction: "ascending",
  },
  k: {
    lowValue: "3.0", lowLabel: "基础合规",
    highValue: "1.0", highLabel: "行业高端",
    unit: "W/(m²·K)",
    direction: "descending",
  },
  shgc: {
    lowValue: "0.60", lowLabel: "基础合规",
    highValue: "0.15", highLabel: "行业高端",
    unit: "",
    direction: "descending",
  },
  wind: {
    lowValue: "1.0", lowLabel: "基础合规",
    highValue: "6.0", highLabel: "行业高端",
    unit: "kPa",
    direction: "ascending",
  },
  airTightness: {
    lowValue: "4", lowLabel: "基础合规",
    highValue: "8", highLabel: "行业高端",
    unit: "级",
    direction: "ascending",
  },
  waterTightness: {
    lowValue: "2", lowLabel: "基础合规",
    highValue: "6", highLabel: "行业高端",
    unit: "级",
    direction: "ascending",
  },
}
```

> **渲染层位置计算公式：**
> - ascending（Rw/风压/气密/水密）：`position = (mid - low) / (high - low) * 100%`
> - descending（K/SHGC）：`position = (low - mid) / (low - high) * 100%`

---

### 3.2 derivation 推导说明模板（✅ 不变）

```javascript
DERIVATION_TEMPLATE = {
  rw: `${city}${noiseTypeLabel}，${distLabel}，基础Rw≥${baseRw}dB，${adjustmentDesc}，本案要求Rw≥${finalRw}dB`,
  k: `${climateLabel}气候区，基准K≤${baseK}W/(m²·K)，${orientationNote}，本案取K≤${finalK}W/(m²·K)`,
  shgc: `${orientation}向朝向，${climateLabel}夏季太阳辐射强，遮阳需求高，本案取SHGC≤${shgcValue}`,
  wind: `${city}属${windZone}风区，第${floor}层高度比${heightRatioPct}%，按GB/T 7106计算，风压等级P${windLevel}，本案要求≥${windValue}kPa`,
  airTightness: `住宅基础气密性4级，${airReason}，本案目标值≥${airRecGrade}级`,
  waterTightness: `${waterReason}，本案目标值≥${waterRecGrade}级`,
}
```

---

### 3.3 marketReality 市场现实（✅ 不变）

```javascript
marketReality_rw: (rwValue) => {
  if (rwValue < 35) return {
    tag: "普遍可达",
    description: "市场主流系统窗可达，重点核验：索取整窗第三方声学检测报告"
  }
  if (rwValue <= 42) return {
    tag: "普遍可达",
    description: "中高端系统窗普遍可达，需明确要求夹胶中空玻璃并索取第三方声学检测报告"
  }
  return {
    tag: "需主动筛选",
    description: "需高规格夹胶中空玻璃配合声学密封工艺，须与商家逐项确认具体配置"
  }
},

marketReality_k: (kValue) => {
  if (kValue > 2.0) return {
    tag: "普遍可达",
    description: "断桥铝+普通Low-E中空玻璃可达，需索取整窗热工检测报告"
  }
  if (kValue >= 1.5) return {
    tag: "需主动筛选",
    description: "需断桥铝+高性能Low-E中空玻璃，须明确隔热条规格并索取系统窗整窗热工认证文件"
  }
  return {
    tag: "需主动筛选",
    description: "需被动式系统窗或三玻两腔，市场供给有限，须专项确认产品系列和认证文件"
  }
},

marketReality_shgc: (shgcValue) => {
  if (shgcValue > 0.35) return {
    tag: "普遍可达",
    description: "普通Low-E镀膜玻璃可达，需确认膜层位置并索取SHGC检测报告"
  }
  return {
    tag: "需主动筛选",
    description: "需高遮阳型Low-E或双Low-E镀膜，需明确要求商家提供膜层位置说明及SHGC检测数据"
  }
},

marketReality_wind: (windValue) => {
  if (windValue < 3.5) return {
    tag: "普遍可达",
    description: "市场主流系统窗均可覆盖，需索取抗风压性能检测报告（GB/T 7106）"
  }
  return {
    tag: "需主动筛选",
    description: "需1.5mm以上壁厚型材，须明确要求并索取截面检测报告，进场时现场核查壁厚"
  }
},

marketReality_airTightness: () => ({
  tag: "普遍可达",
  description: "市场主流产品均可达到，决定性因素是安装质量，须要求打胶全程留影像记录"
}),

marketReality_waterTightness: () => ({
  tag: "普遍可达",
  description: "市场主流产品均可达到，决定性因素是安装节点和打胶质量，须要求安装全程留影像记录"
}),
```

---

## 四、chapter3.redlineChecklist.mandatory[].userMeaning

> **v1.1 目的地变更：**
> 以下 userMeaning 内容，数据层仍写入 snapshot（字段保留），
> 但渲染层第三章不消费此字段。
> 内容归宿：首页 Q&A 内容库（MVP 方式B：独立维护，不做红线关联跳转）。
> 后续升级路径：方式A——红线旁"？"图标直达对应Q&A条目。
>
> Claude Code 执行时：写入 documentMapper 的 userMeaning 字段逻辑保持不变；
> 渲染层 result.wxml 第三章部分，不渲染 userMeaning 字段。

```javascript
REDLINE_USER_MEANING = {

  "R-profile-material": {
    userMeaning: "部分商家用回收铝或杂料替代原生铝，外观无法区分。杂料型材强度不足，抗风压性能无法保证。材质证明、出厂合格证和必要的进场复验资料是核验材质真伪的主要依据，外观不能作为判断依据。"
  },

  "R-profile-thickness": {
    userMeaning: "壁厚是型材抗风压的主要参数之一。商家常见说法是"我们产品质量很好"，但不提供壁厚数据。壁厚不足在极端天气下可能导致型材变形或破坏，须要求提供截面检测报告。"
  },

  "R-profile-cert": {
    userMeaning: "系统窗的热工性能取决于型材+隔热条+玻璃的整体配合。商家常见做法是非配套拼装，整窗实际K值与标称值存在偏差。完整系统认证文件是唯一可核查的依据。"
  },

  "R-profile-thermal-bar": {
    userMeaning: "非配套隔热条会导致型材热工性能失真，整窗K值可能远高于标称值。外观上无法识别，须在合同中明确约定并要求认证文件。"
  },

  "R-thermal-bar-width": {
    userMeaning: "隔热条宽度直接影响型材整体K值。宽度不足时，即使玻璃达标，整窗K值仍可能超出本案要求。须在报价中明确列出隔热条型号、宽度及与型材系统的配套关系。"
  },

  "R-glass-type": {
    userMeaning: "是否满足本案传热系数要求，应以整窗K值检测报告为准，不能仅凭"双层玻璃"判断。须要求商家明确说明玻璃配置、是否含Low-E膜及膜层位置。"
  },

  "R-glass-thermal-cert": {
    userMeaning: "这是整窗层面的性能指标，不是玻璃单独的指标。商家常只说玻璃参数而不提整窗认证，两者可能有显著差异。须要求提供整窗热工性能检测报告，而非仅凭玻璃参数推算。"
  },

  "R-glass-system-match": {
    userMeaning: "配套是系统窗热工性能的基础保障。非原厂配套隔热条可能导致热工性能偏离标称值，须在认证文件中核查型材与隔热条的配套关系。"
  },

  "R-acoustic": {
    userMeaning: "隔声是整窗系统性能，受玻璃、密封、安装综合影响。商家常见说法是"我们玻璃隔声好"，但整窗隔声量与玻璃单独指标有显著差异。第三方声学检测报告是唯一可信依据，须索取报告编号并可查。"
  },

  "R-acoustic-seal": {
    userMeaning: "接缝处理是隔声的薄弱环节。即使玻璃达标，接缝气密性不足仍会影响整窗隔声表现。须要求商家在合同中说明密封工艺，并在安装过程中留存影像。"
  },

  "R-sealant": {
    userMeaning: "结构胶与普通密封胶外观相似，但力学性能和耐久性差异极大。普通密封胶长期使用后开裂，影响气密、水密和结构安全。须要求商家提供所用密封胶的产品说明书。"
  },

  "R-seal-grades": {
    userMeaning: "气密水密等级直接影响隔声、保温和防水性能。安装节点是决定性因素，仅靠产品本身无法保证。须要求安装全程按设计图纸施工，打胶留影像记录，竣工后按合同约定的检测方式进行验收。"
  },

  "R-wind": {
    userMeaning: "高楼层风压显著高于普通住宅。型材壁厚不足或安装固定点不足，在台风或强风天气下可能导致窗框变形甚至脱落。须索取与本案风压等级对应的检测报告，并在进场时核查壁厚。"
  },

  "R-safety-glass": {
    userMeaning: "本案存在高碰撞风险部位（落地窗/儿童活动区），此类场景应采用夹层安全玻璃，碎片不脱落。商家若以"钢化玻璃同样安全"替代，须提供该部位适用的安全玻璃类型依据，否则不予接受。"
  },

  "R15": {
    userMeaning: "适老化门窗没有全国统一强制标准，商家说"适老化设计"时通常无对应检测文件可核查。可用的核验方式：①要求说明把手形式（横执杆式或下压式，不接受球形把手）；②要求把手安装高度在850-1000mm范围内；③确认是否设置门槛及过渡方式。执手操作力≤25N是适老化标准中的常见数值，可在合同中约定，但目前无专项检测报告可索取。"
  },
}
```

---

## 五、chapter4.acceptance 验收项文本（✅ 不变）

### 进场验收（4条）

```javascript
{
  title: "进场验收",
  items: [
    {
      text:   "对照合同核查品牌、型号、颜色、开启方式",
      reason: "合同约定与实际到场产品不符的情况较为常见，进场时是最后的核查机会，发现问题可拒绝卸货",
    },
    {
      text:   "核查安全玻璃强制认证标识及随附证明文件；中空玻璃内无明显结露、雾化、进水现象",
      reason: "3C标志本体印刷是正品标志，贴纸可伪造；无雾气说明玻璃密封完好，有雾气则为批次质量问题",
    },
    {
      text:   "核对玻璃边部标签与合同约定一致，不能仅凭外观判断膜层",
      reason: "Low-E膜层位置影响热工性能，肉眼无法区分，边部标签是唯一可核对的依据",
    },
    {
      text:   "索取壁厚检测报告或型式检验资料，必要时可要求进场抽样复检",
      reason: "壁厚是抗风压的核心参数，进场是核查的最后机会，实物核查优于纸质报告",
    },
  ],
},
```

### 安装验收（4条）

```javascript
{
  title: "安装验收",
  items: [
    {
      text:   "固定件应牢固连接于承重基层，固定点数量和间距符合设计文件及安装规范",
      reason: "螺丝打在空心砖或间距过大，固定强度不足，高层强风时存在脱落风险",
    },
    {
      text:   "发泡剂全周饱满均匀，外露部分平整",
      reason: "发泡剂填充不均会产生局部热桥和气密薄弱点，影响保温和隔声，此时处理成本最低",
    },
    {
      text:   "密封胶一圈连续、平整无裂缝，施工条件符合说明书要求",
      reason: "密封胶不连续或在低温/高湿条件下施工，固化后易开裂，导致气密水密长期失效",
    },
    {
      text:   "排水孔未被胶封死，窗台外侧有向外坡度",
      reason: "排水孔堵塞导致积水腐蚀，坡度不对导致雨水倒流室内，此类问题竣工后处理成本极高",
    },
  ],
},
```

### 竣工验收（5条）

```javascript
{
  title: "竣工验收",
  items: [
    {
      text:   "关闭所有窗扇，检查扇框四周胶条压合均匀、无明显可见缝隙；正式气密验收按合同约定检测方法执行",
      reason: "火焰偏吹说明存在气密缺陷，该方法简单有效，无需专业设备，可覆盖每一扇窗",
    },
    {
      text:   "花洒淋水试验（物业允许时），室内无渗水；时长按项目所在地验收指引执行",
      reason: "模拟降雨验证水密性，是竣工阶段最直观的水密检验，发现问题及时要求整改",
    },
    {
      text:   "每扇窗反复开合5-10次，胶条压实、无异响卡阻",
      reason: "开合异响或卡阻说明安装偏差，长期使用会加速五金磨损和密封老化",
    },
    {
      text:   "五金系统切换顺畅，防误操作器有效；关闭状态下锁点完整咬合",
      reason: "锁点咬合不完整是气密水密失效的主要原因之一，同时影响防盗安全",
    },
    {
      text:   "[动态生成，由 buildAcceptanceNodes 函数根据用户情况输出]",
      reason: "安全配件是本案强制要求，竣工时须逐项确认实际安装状态与合同约定一致",
    },
  ],
},
```

---

## 六、chapter1.needsAnalysis.coreTension 改写规则（✅ 不变）

```javascript
CORE_TENSION_TEMPLATE = {
  acoustic: `您所处环境的噪声水平，意味着关窗后室内仍可能达到持续开着电视的背景音量。
本次采购的核心目标是：让关窗后室内安静到可以安睡、正常交谈，不再被室外车流声干扰。`,

  thermal_cooling: `您的${orientation}向朝向加上${climateLabel}气候，意味着夏季空调负荷显著高于同楼层其他朝向。
本次采购的核心目标是：通过门窗热工性能，减少夏季太阳辐射得热，降低制冷能耗。`,

  thermal_heating: `${climateLabel}气候区的冬季，门窗是建筑外壳热损失最大的部位。
本次采购的核心目标是：达到当地节能标准要求的传热系数，减少冬季采暖热损失。`,

  safety: `本案存在儿童家庭和落地窗/低窗台场景，安全配置为法规强制要求。
安全配置不随预算档位调整，相关成本需在选择预算档位时一并考虑。`,

  combined: `本案涉及${painPointDesc}等多项技术约束，各项要求均来自您的具体居住情况和当地标准。
以下参数表为本案各项技术底线，商家方案须逐项满足。`,
}
```

---

## 七、实现注意事项（✅ 不变）

### 关于 coreTension 改写实现方式

| answers.pain_point 值 | 对应模板 |
|----------------------|---------|
| `'sound'` | acoustic 模板 |
| `'heat'` | thermal_cooling 或 thermal_heating（按气候区判断） |
| `'wind'` | combined 模板 |
| `'safety'` | safety 模板 |
| default | combined 模板 |

### 关于 userMeaning 与 redline 的对应关系
documentMapper 中生成各红线条目时，按条目的 trigger 或 id 字段
匹配上方 REDLINE_USER_MEANING 常量，写入对应 userMeaning。
如有本文档未覆盖的红线条目，Claude Code 须标注并等待人工确认，不得自行填写。

**v1.1 补充：** userMeaning 写入数据层后，result.wxml 第三章渲染逻辑
不得消费此字段（即不在第三章界面显示）。

---

## 八、chapter4.threePhaseIntro 三阶段框架文本（新增）

```javascript
threePhaseIntro: {
  phases: [
    {
      phase:       1,
      title:       "下单前",
      timing:      "收到商家报价、准备签合同前",
      action:      "将本文件发给 3-5 家商家，收到回应后用第三章排除不合格方案，剩余方案用第二章横向对比",
      hint:        "任何一项红线不满足，直接排除，无需解释，无需谈判",
      nextTrigger: "已选定商家，准备安排进场安装",
    },
    {
      phase:       2,
      title:       "安装前",
      timing:      "材料到场、工人开始安装前",
      action:      "按进场核查清单拍摄留存，提交招标管理",
      hint:        "安装完成后部分标签将被覆盖，此时是唯一核查窗口",
      nextTrigger: "安装完成，准备竣工验收",
    },
    {
      phase:       3,
      title:       "安装后",
      timing:      "全部窗户安装完成，施工队准备撤场前",
      action:      "按验收清单逐项自检并记录结果，提交招标管理",
      hint:        "发现问题须在施工队撤场前要求整改，撤场后处理成本极高",
      nextTrigger: "验收完成，如需专业核查可进入审计服务",
    },
  ],
},
```

---

## 九、chapter4.inspectionChecklist 进场核查拍摄清单文本（新增）

> 说明：内容基于 Perplexity 市场可操作性审查结论（2026-04-14）。
> 分级原则：越接近"标签/包装/送货单同框"越有效；越依赖截面/材质识别越容易误判。
> 专业判断留给 L3——李Sir看用户提交照片做核查，用户只负责拍"能证明身份的证据"。

```javascript
inspectionChecklist: {
  intro: "以下照片在材料进场、安装开始前拍摄。安装完成后部分标签将被覆盖，无法补拍。照片提交至招标管理，核查实际材料与配置单是否一致。",

  mustShoot: [
    {
      id:      "P1",
      subject: "玻璃边部标签 + 包装外箱 + 出厂单",
      purpose: "核查品牌、型号、Low-E标注、厚度、3C编号",
      warning: "安装后标签被压条遮挡，无法补拍，进场即拍",
    },
    {
      id:      "P2",
      subject: "密封胶/结构胶未开封包装（正面全景）",
      purpose: "核查胶种类（结构胶 vs 普通密封胶）、品牌、批号",
      warning: "用完即丢，开工前必须拍，错过无法补",
    },
    {
      id:      "P3",
      subject: "五金包装或铭牌（执手/限位器/铰链拆包时拍）",
      purpose: "核查品牌型号与报价单一致",
      warning: "装好后型号难核查，拆包时拍",
    },
    {
      id:      "P4",
      subject: "材料全景 + 送货单同框",
      purpose: "核查到货品类、数量、品牌总体一致性",
      warning: "",
    },
  ],

  shouldShoot: [
    {
      id:      "P5",
      subject: "型材端头 + 送货单同框",
      purpose: "辅助核查品牌系列",
      caveat:  "壁厚数值照片难精确读取，不以照片为准，以文件为准",
    },
    {
      id:      "P6",
      subject: "限位器安装完成状态（安装调试阶段拍）",
      purpose: "确认已安装、型号可见",
      caveat:  "只能确认有无安装，不能核查开启角度；错过安装调试阶段后被遮挡",
    },
    {
      id:      "P7",
      subject: "安装节点关键部位——优先拍短视频",
      purpose: "打胶过程/发泡剂填充/排水孔预留留存证据",
      caveat:  "静态照片无法判断打胶连续性，优先录短视频，尤其是转角和收头位置",
    },
  ],

  useDocument: [
    {
      id:          "F1",
      checkItem:   "型材壁厚数值",
      alternative: "索要型材检测报告或截面参数书，不靠手机拍截面读数",
    },
    {
      id:          "F2",
      checkItem:   "隔热条材质（PA66/PVC区分）",
      alternative: "索要材质证明或配套说明，颜色不能作为材质判断依据",
    },
    {
      id:          "F3",
      checkItem:   "间隔条类型（暖边/铝条区分）",
      alternative: "索要供应商材料说明，安装后基本不可见",
    },
    {
      id:          "F4",
      checkItem:   "执手真伪",
      alternative: "包装+型号+采购单三合一核对，单拍Logo价值有限",
    },
  ],
},
```

---

## 十、chapter4.merchantQuestionnaire 新增字段内容（新增）

```javascript
// 字段可获取性分级（基于 Perplexity 中国大陆门窗市场审查结论，2026-04-14）
fieldGrades: {
  gradeA: [
    // 市场惯例可得，商家无正当理由拒绝即为排除信号
    "windResistanceReport",    // 抗风压性能检测报告编号
    "airWaterTightnessReport", // 气密/水密检测报告编号
    "laminatedGlass3C",        // 夹胶玻璃3C认证证书编号
    "acousticReport",          // 整窗Rw检测报告编号（系统窗/工程窗场景）
  ],
  gradeB: [
    // 部分场景可得，缺失须说明原因，缺失本身是审计信息
    "thermalKReport",          // 整窗K值检测报告编号
    "shgcData",                // SHGC数据来源
    "profileThickness",        // 型材主受力壁厚承诺值
    "thermalBarSpec",          // 隔热条品牌+宽度规格
    "limiterModel",            // 限位器型号
    "systemCertification",     // 型材与隔热条配套认证
  ],
  gradeC: [
    // 书面明细类，不要求单独报告，商家能否写清楚本身是筛选依据
    "glassDetailSpec",         // 玻璃配置明细（品牌/型号/Low-E层位/中空厚度）
  ],
},

// 配置一致性承诺条款（固定文本，每份答题表必含）
consistencyClause: "所提供报告及数据的检测配置须与本项目报价配置一致。如存在差异，须书面说明差异内容及原因。",
```

---

## 十一、实现注意事项补充（v1.1新增）

### 关于 threePhaseIntro 实现
- 固定内容，documentMapper 直接写入，不依赖计算层
- 渲染层 M4-1：三阶段框架卡片，视觉最突出，放在第四章开头

### 关于 inspectionChecklist 实现
- 固定内容，documentMapper 直接写入
- 渲染层 M4-4：三层分级列表（必须拍/尽量拍/不靠照片靠文件）
- 必须拍的时机警示（warning 字段）用醒目色标注

### 关于 merchantQuestionnaire 新增字段
- fieldGrades：供渲染层展示字段重要性标识（A级必填，B级尽量填）
- consistencyClause：渲染在红线承诺区块末尾，独立一行，加粗显示

---

*本文档由产品决策对话生成，修改须经李Sir确认后方可更新。*
*建立时间：2026-04-13 | 更新时间：2026-04-14*
*配套文档：OUTPUT_LAYER_DESIGN_v1.1.md · SNAPSHOT_SCHEMA_v1.1.md*
