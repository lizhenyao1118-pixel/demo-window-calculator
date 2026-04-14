# Snapshot Schema v1.1
# 门窗诊断系统 · 数据层与渲染层字段契约

> 本文档是 documentMapper.js 输出结构与 result.wxml 消费结构的唯一权威契约。
> 任何字段变更必须同步更新本文档。
> 建立时间：2026-04-13 | 更新时间：2026-04-14
> 对应设计文档：OUTPUT_LAYER_DESIGN_v1.1.md
>
> **v1.1 变更摘要（对照 v1.0）：**
> 1. chapter3.redlineChecklist.mandatory[].userMeaning：
>    状态从 🔲新增 → ⚠️数据层保留，渲染层第三章不消费（Q&A内容库预留字段）
> 2. chapter4 新增：threePhaseIntro（三阶段框架说明）
> 3. chapter4 新增：inspectionChecklist（进场核查拍摄清单）
> 4. chapter4.merchantQuestionnaire：新增字段分级注记和一致性承诺条款字段
> 5. 渲染层消费说明：同步更新 M3-2 和 M4 映射

---

## 字段状态标注说明

- ✅ 已存在，可直接使用
- ⚠️ 已存在，需修改或扩展
- 🔲 新增字段，需在 documentMapper.js 中实现
- ❌ 已存在但需删除或替换
- 📦 数据层保留，渲染层不消费（供后续功能使用）

---

## 变更摘要（执行前必读）

| 优先级 | 变更类型 | 位置 | 说明 |
|--------|---------|------|------|
| P0 | 🔲 新增（最大变更） | chapter1.needsAnalysis.needsTable[].derivation | 每个参数的推导说明文本 |
| P0 | 🔲 新增（最大变更） | chapter1.needsAnalysis.needsTable[].levelBar | 等级区间三点值 |
| P0 | 🔲 新增（最大变更） | chapter1.needsAnalysis.needsTable[].marketReality | 市场现实标签+说明 |
| P1 | ⚠️ 修改 | chapter1.needsAnalysis.coreTension | 改为生活语言声明，移除指令性表述 |
| P1 | 🔲 新增 | chapter2.responseGuide | 商家回应识别提示（3条） |
| P1 | 📦 状态变更 | chapter3.redlineChecklist.mandatory[].userMeaning | 数据层保留，渲染层第三章不消费 |
| P1 | 🔲 新增 | chapter4.threePhaseIntro | 三阶段框架说明（M4-1） |
| P1 | 🔲 新增 | chapter4.inspectionChecklist | 进场核查拍摄清单（M4-4） |
| P1 | ⚠️ 扩展 | chapter4.merchantQuestionnaire | 新增字段分级和一致性承诺条款 |
| P2 | 🔲 新增 | chapter4.acceptance.nodes[].items[].reason | 每条验收项的"为什么" |
| 确认 | ✅ 已存在 | chapter4.risks.items[] | 场景化风险卡已有完整结构 |
| 确认 | ✅ 已存在 | chapter4.l2_entry | 专业审计入口已存在 |
| 确认 | ✅ 已存在 | chapter3.conflictAlert.hasNoConflict | 上次会话已修复 |

---

## 完整 Schema 定义

### 顶层结构

```
snapshot
  ├── summary          # L1摘要卡（不变）
  ├── cover            # 封面（不变）
  ├── chapter1         # 性能需求诊断（有扩展）
  ├── chapter2         # 采购技术底线（有新增）
  ├── chapter3         # 红线清单（userMeaning状态变更）
  ├── chapter4         # 三阶段过程把控（有新增）
  └── attachments      # 附件（不变）
```

---

### summary（L1摘要卡）✅ 不变

```javascript
summary: {
  k_target:    string,  // 传热系数，如 "2.2"
  rw_required: string,  // 隔声量，如 "41"
  shgc_target: string,  // 太阳得热，如 "0.35"
  p3_required: string,  // 风压值，如 "4.09"
  wind_zone:   string,  // 风区，如 "W4"
  air_rec:     string,  // 气密性推荐等级，如 "6"
  water_rec:   string,  // 水密性推荐等级，如 "6"
}
```

---

### cover（封面）✅ 不变

```javascript
cover: {
  pdfNo:        string,
  issueDate:    string,
  city:         string,
  district:     string,
  climateLabel: string,
  floorDesc:    string,
  painTag:      string,
  isRisk:       boolean,
  hasSafety:    boolean,
  degradedCity: boolean,
  degradedMsg:  string,
  disclaimer:   string,
}
```

---

### chapter1（性能需求诊断）

#### chapter1.basicInfo ✅ 不变

```javascript
basicInfo: {
  city:         string,
  district:     string,
  climateLabel: string,
  floorDesc:    string,
  roomType:     string,
  windowType:   string,
  orientation:  string,
  heatingType:  string,
  familyDesc:   string,
  painPoint:    string,
  noiseEnv:     string,
}
```

#### chapter1.needsAnalysis（重点扩展区）

```javascript
needsAnalysis: {

  // ⚠️ 修改：needsTable 每项扩展三个新字段
  needsTable: [
    {
      dimension:     string,  // ✅ 维度名，如 "隔声"
      value:         string,  // ✅ 参数值，如 "≥ 41 dB"
      basis:         string,  // ✅ 标准依据

      // 🔲 新增：推导说明（生活语言）
      derivation:    string,

      // 🔲 新增：等级区间（三点值，用于可视化刻度条）
      levelBar: {
        lowValue:   string,
        lowLabel:   string,
        midValue:   string,
        midLabel:   string,
        highValue:  string,
        highLabel:  string,
        unit:       string,
      },

      // 🔲 新增：市场现实
      marketReality: {
        tag:         "普遍可达" | "需主动筛选",
        description: string,
      },
    }
  ],

  // ⚠️ 修改：改为生活语言的声明式陈述，移除所有指令性表述
  coreTension:  string,

  // ✅ 不变
  budgetFitnessNote: {
    type: string,
    text: string,
  },

  // ✅ 不变
  sealGrades: {
    airRec:   number,
    airMin:   number,
    airGap:   number,
    waterRec: number,
    waterMin: number,
    waterGap: number,
    isFixed:  boolean,
  },

  // ✅ 不变
  parameterNote: {
    block1: string,
    block2: string,
    block3: string,
  },
}
```

#### chapter1 其余字段 ✅ 不变

```javascript
city:          string,
district:      string,
climateLabel:  string,
windZone:      string,
floorDesc:     string,
heatingDesc:   string,
familyDesc:    string,
analysisPara:  string,
noise: {
  show:       boolean,
  typeLabel:  string,
  distKey:    string,
  distLabel:  string,
  levelLabel: string,
  blocks: [{ type, condition, text }],
},
useNewStructure: boolean,
```

---

### chapter2（采购技术底线）

```javascript
chapter2: {

  // ✅ 不变
  positionStatement: string,
  painPoint:         string,

  // ✅ 不变
  metrics: [
    {
      name:   string,
      value:  string,
      unit:   string,
      std:    string,
      level:  string,
      note:   string,
      isCore: boolean,
    }
  ],

  // ✅ 不变
  acousticDerivation: string,
  thermalDerivation:  string,

  // 🔲 新增：商家回应识别提示
  responseGuide: {
    complete: string,
    evasion:  string,
    reject:   string,
  },
}
```

---

### chapter3（红线清单）

```javascript
chapter3: {

  // ✅ 不变
  title:      string,
  sourceNote: string,

  redlineChecklist: {

    // v1.1 变更：userMeaning 字段状态从 🔲新增 → 📦数据层保留，渲染层不消费
    mandatory: [
      {
        id:          string,   // ✅
        displayId:   string,   // ✅
        level:       string,   // ✅
        title:       string,   // ✅
        text:        string,   // ✅ 技术表述（渲染层消费此字段）
        trigger:     string,   // ✅
        standard:    string,   // ✅
        _sealGrades: object,   // ✅
        reason:      string,   // ✅

        // 📦 数据层保留，渲染层第三章不消费
        // 原因：解释文字迁移至首页Q&A（MVP方式B）
        // 后续升级路径：方式A——红线旁"？"图标直达对应Q&A条目
        userMeaning: string,
      }
    ],

    recommended: [
      {
        // 同 mandatory 结构
        // userMeaning 同样为 📦 数据层保留，渲染层不消费
      }
    ],
  },

  // ✅ 不变
  forbidden:    array,
  safetyItems:  array,
  safetyBudgetWarning: string,

  // ✅ 已修复（上次会话）
  conflictAlert: {
    title:          string,
    items:          array,
    noConflictText: string,
    hasNoConflict:  boolean,
    severity:       string,
    cost_estimate:  string | null,
  },

  // ✅ 不变
  is_dual_tier: boolean,
  dualTierSpecs: [
    {
      label:          string,
      profile:        string,
      hardware:       string,
      priceRange:     string,
      upgradeReasons: array,
    }
  ],
}
```

---

### chapter4（三阶段过程把控）

> v1.1 章节定位更新：从"下一步行动"改为"三阶段过程把控"。
> 新增 threePhaseIntro 和 inspectionChecklist 两个字段。
> merchantQuestionnaire 扩展字段分级和一致性承诺。

```javascript
chapter4: {

  // ✅ 不变（配置层数据）
  configSummary: { ... },

  // ✅ 不变
  title:    string,
  subtitle: string,

  // ✅ 不变
  intro: {
    title: string,
    items: array,
  },

  // ✅ 不变
  merchantNotice: {
    title:   string,
    content: string,
    deadline: string,
  },

  // ✅ 已存在（v1.0新增，保持不变）
  actionSteps: [
    {
      step:        number,
      title:       string,
      description: string,
      hint:        string,
    }
  ],

  // 🔲 新增：三阶段框架说明（M4-1，渲染层最显眼位置）
  // 说明：将整个采购过程浓缩为三个时间节点，每个节点一件事
  threePhaseIntro: {
    phases: [
      {
        phase:       number,   // 1 / 2 / 3
        title:       string,   // 如 "下单前"
        timing:      string,   // 时机说明，如 "收到商家报价时"
        action:      string,   // 这个阶段做什么（一句话）
        hint:        string,   // 补充说明
        nextTrigger: string,   // 进入下一阶段的条件
      }
    ],
  },
  // 固定内容，documentMapper 直接写入：
  // phase 1: 下单前 — 发文件、筛商家、收配置单
  // phase 2: 安装前 — 材料进场时按清单拍摄
  // phase 3: 安装后 — 竣工验收自检并提交

  // ✅ 已存在，结构完整
  risks: {
    title: string,
    items: [
      {
        title:    string,
        desc:     string,
        suggest:  string,
        question: string,
        fullText: string,
      }
    ],
  },

  // ✅ 已存在
  l2_entry: {
    variant:     string,
    risk_text:   string,
    normal_text: string,
    action:      string,
  },

  // ⚠️ 扩展：新增字段分级注记和一致性承诺条款
  merchantQuestionnaire: {
    // 现有结构保持不变，新增以下字段：

    // 🔲 新增：字段分级注记（A/B/C，供渲染层展示字段重要性）
    fieldGrades: {
      // A级：市场惯例可得，商家无正当理由拒绝即为排除信号
      gradeA: string[],   // 字段key列表
      // B级：部分场景可得，缺失须说明原因
      gradeB: string[],   // 字段key列表
      // C级：书面明细类，不要求单独报告
      gradeC: string[],   // 字段key列表
    },

    // 🔲 新增：配置一致性承诺条款（固定文本）
    consistencyClause: string,
    // 固定内容：
    // "所提供报告及数据的检测配置须与本项目报价配置一致。
    //  如存在差异，须书面说明差异内容及原因。"

    // ✅ 已完成（2026-04-15 SPEC-M4-3）：红线承诺段
    // 数据源：sharedRedlineChecklist.mandatory（与chapter3同一引用，无冗余）
    section_redline: {
      title:       string,   // 固定："── 第三段：红线承诺"
      intro:       string,   // 固定：说明逐项书面确认要求
      items: [
        {
          displayId: string,   // 如 "R01"，来自 mandatory[].displayId
          text:      string,   // 技术表述，来自 mandatory[].text
        }
      ],
      clauseNote:  string,   // 固定：合同附件声明，偏离须书面说明
    },

    // 注：fieldGrades.gradeA 已于 2026-04-15 新增 glassDetailSpec（从gradeC升级）
  },

  // 🔲 新增：进场核查拍摄清单（M4-4）
  // 说明：阶段二的执行工具，材料进场安装前用户按此清单拍摄
  inspectionChecklist: {
    intro: string,   // 向用户显示的说明文字
    mustShoot: [     // 必须拍（价值高，时间窗口不可错过）
      {
        id:      string,   // 如 "P1"
        subject: string,   // 拍摄对象
        purpose: string,   // 核查目的
        warning: string,   // 时机警示（如有）
      }
    ],
    shouldShoot: [   // 尽量拍（有价值，存在局限）
      {
        id:        string,
        subject:   string,
        purpose:   string,
        caveat:    string,   // 局限说明
      }
    ],
    useDocument: [   // 不靠照片，靠文件
      {
        id:          string,
        checkItem:   string,
        alternative: string,   // 替代核查方式
      }
    ],
  },

  // ⚠️ 结构转换：items[] 从 string[] 改为 object[]（v1.0既有要求，保持）
  acceptance: {
    title: string,
    nodes: [
      {
        title: string,
        items: [
          {
            text:   string,
            reason: string,  // 🔲 新增：为什么要查这一项
          }
        ],
      }
    ],
  },

  // ✅ 不变
  performanceChecks: array,
  redlineChecklist:  object,
  isRisk:            boolean,
  riskTrigger: {
    highFloor:      boolean,
    highRatio:      boolean,
    budgetConflict: boolean,
  },
}
```

---

## 实现顺序建议（给 documentMapper.js 重构）

### 阶段1：新增字段（不破坏现有结构）

按以下顺序逐一添加，每次添加后验证 snapshot 输出：

1. `chapter1.needsAnalysis.needsTable[].derivation`
2. `chapter1.needsAnalysis.needsTable[].levelBar`
3. `chapter1.needsAnalysis.needsTable[].marketReality`
4. `chapter2.responseGuide`
5. `chapter3.redlineChecklist.mandatory[].userMeaning`
   **注意：写入数据层，渲染层第三章不消费此字段**
6. `chapter4.actionSteps[]`（v1.0已要求）
7. `chapter4.threePhaseIntro`（v1.1新增）
8. `chapter4.inspectionChecklist`（v1.1新增）
9. `chapter4.merchantQuestionnaire.fieldGrades`（v1.1新增）
10. `chapter4.merchantQuestionnaire.consistencyClause`（v1.1新增）
11. `chapter4.acceptance.nodes[].items[].reason`

### 阶段2：修改现有字段

12. `chapter1.needsAnalysis.coreTension`
    改为生活语言声明式陈述，原则5：移除所有指令性表述

---

## 验收检查清单（阶段1完成后）

执行方式：在 generateReport 中临时添加 snapshot 输出，取真实 JSON 逐项检查：

- [ ] needsTable 每项包含 derivation / levelBar / marketReality
- [ ] levelBar 的 midValue 与 value 数值一致
- [ ] marketReality.tag 只有 "普遍可达" 或 "需主动筛选" 两种值
- [ ] chapter2.responseGuide 存在且有 complete / evasion / reject 三个字段
- [ ] chapter3 每条 mandatory 有 userMeaning 字段（数据层存在即可，渲染层不消费）
- [ ] chapter4.threePhaseIntro 有三个 phase 对象
- [ ] chapter4.inspectionChecklist 有 mustShoot / shouldShoot / useDocument 三组
- [ ] chapter4.merchantQuestionnaire 有 consistencyClause 字段且非空
- [ ] chapter4.actionSteps 有三项，step 为 1/2/3
- [ ] chapter4.acceptance 每条 item 有 reason 字段且非空
- [ ] chapter3.conflictAlert 无冲突时 hasNoConflict=true 且 noConflictText 非空

---

## 渲染层消费说明（给 result.wxml 重写）

### 字段消费原则

1. 所有条件显示模块，必须使用 boolean 字段控制（不在 WXML 做复杂表达式）
2. 所有数组渲染，数组为空时必须有 fallback 内容（不允许空白区块）
3. levelBar 的可视化刻度条，midValue 位置用百分比计算：
   - ascending（Rw/风压/气密/水密）：`position = (mid - low) / (high - low) * 100%`
   - descending（K/SHGC）：`position = (low - mid) / (low - high) * 100%`

### 关键渲染映射

| 设计模块 | 数据字段 | 渲染形式 |
|---------|---------|---------|
| M1-1 项目身份 | chapter1.basicInfo | 双列信息格 |
| M1-2 核心诉求声明 | chapter1.needsAnalysis.coreTension | 突出文本块 |
| M1-3 参数三层 | needsTable[].derivation/levelBar/marketReality | 参数卡片 |
| M1-4 强制条款 | chapter1.needsAnalysis.budgetFitnessNote | 条件显示警示块 |
| M2-1 定位说明 | chapter2.positionStatement | 引导文 |
| M2-2 指标表 | chapter2.metrics[] | 三列表格 |
| M2-3 回应提示 | chapter2.responseGuide | 三条提示列表 |
| M3-2 红线清单 | redlineChecklist.mandatory[].text | 编号+技术表述（不渲染userMeaning） |
| M3-4 兼容性 | chapter3.conflictAlert.hasNoConflict | 条件文本块 |
| M4-1 三阶段框架 | chapter4.threePhaseIntro | 三阶段卡片，最显眼 |
| M4-2 风险卡 | chapter4.risks.items[] | 场景卡片 |
| M4-3 答题表 | chapter4.merchantQuestionnaire（含新增字段） | 表单结构 |
| M4-4 进场核查清单 | chapter4.inspectionChecklist | 三层分级列表 |
| M4-5 验收节点 | chapter4.acceptance（含 reason） | 三阶段列表 |
| M4-6 审计入口 | chapter4.l2_entry | 按钮/链接 |

---

*本文档由产品决策对话生成，修改须经李Sir确认后方可更新。*
*建立时间：2026-04-13 | 更新时间：2026-04-14 | 对应代码基线：v4.0.8 commit 66a17a5*
*配套文档：OUTPUT_LAYER_DESIGN_v1.1.md*
