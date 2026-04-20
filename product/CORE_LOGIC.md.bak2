# 门窗诊断系统 · 核心逻辑基线
# CORE_LOGIC.md
> 本文件是系统核心逻辑的唯一权威来源。
> 所有迭代决策必须对照此文件，发现冲突时以此文件为准。
> 建立时间：2026-04-07 | 代码基线：v4.0.8 + SPEC-C01~C04 + SPEC-OUTPUT-v1.1 + SPEC-M4-3 · commit `4448ea3` · branch `sprint8/a-8a`

---

## 一、产品本质

把业主从商家剧本里的被动选购者，变成手握技术标准的真正甲方。

**"真正甲方"的准确定义：**
不是懂门窗技术，不是能和商家在专业层面辩论，不是知道所有参数的含义和背后的物理逻辑。
而是：知道自己走在正确的路上。
在采购过程中的每一个决策节点，感受到"我有依据、我没有被忽悠、我知道下一步是什么"。
这种感受不来自信息量，来自在关键时刻知道自己该说什么。

实现路径：9题生活化问题 → 技术参数计算 → 四章招标文件（三阶段过程把控工具）

护城河：需求判断的准确性（不是物理模拟的精度，不是功能的丰富性）

---

## 二、系统层级结构

```
【输入层】
  9题生活化问题（含Q1城市）
  术语锁定：「门窗需求定制」「招标文件」

【性能层】—— 诊断：你需要什么
  四条主线独立计算，输出客观可测量的性能指标
  · 隔声：Rw_required（noise_type × 距离 × 楼层）
  · 热工：K_target / SHGC（CLIMATE_SPEC，Q1城市驱动）
  · 抗风：风压等级（楼层 × 地区系数）
  · 水密气密：等级要求（动态计算）

【配置层】—— 处方：如何实现
  性能要求 → 产品选型，就高原则仲裁
  · 玻璃：resolveGlassConfig()，Math.max就高原则
  · 隔热条：getInsulationBarRequirement()，K值反推
  · 型材：壁厚由风压驱动；腔体/系统匹配性不做数据判断，转为红线条款
  · 五金/密封：档位驱动

【输出层】—— 四章招标文件（原生WXML渲染）
  第1章：性能需求诊断（来自性能层）
  第2章：采购技术底线（来自性能层，甲方要求视角，含定位声明）
  第3章：红线清单（从性能层动态生成，否定式；禁止项+安全底线双栏渲染）
  第4章：三阶段过程把控（下单前/安装前/安装后）
  输出方式：小程序原生WXML渲染（PDF路线/WebView路线已关闭）
```

---

## 三、架构原则（不得违反）

**原则1：需求侧驱动，不做供给侧模拟**
系统从性能需求出发推导配置要求，不从产品参数正向计算整窗性能。
这是招标文件工具的本质定位，不是技术局限。

**原则2：性能层是红线清单的唯一数据源**
红线清单从性能层输出动态生成，不依附档位模板。
每条红线是性能输出值的直接函数。

**原则3：可量化的精确输出，不可量化的转移给商家**
系统输出可量化指标（Rw值、K值、玻璃等级、隔热条规格）。
不可量化的专业判断（型材腔体/系统匹配性）转化为商家必须提供认证文件的红线条款。

**原则4：就高原则**
配置层多条主线冲突时，取能同时覆盖所有要求的最高规格。
升级目标取「满足性能要求的最低档位」。

**原则5：信息呈现型语言**
升级提示只呈现事实（性能差距、配置差异、成本代价）。
不含「建议」「应当」等指令性词汇。

---

## 四、升级触发机制

### 主要影响因素（触发升级提示）

| 主线 | 触发条件 | 升级输出 |
|------|---------|---------|
| 隔声 | Rw_required > 档位 glass_rw_max | 玻璃升级 + 差价 |
| 热工 | K_target > 档位 GLASS_LEVELS[glass_max_level].k_max | 玻璃 + 隔热条 + 型材认证条款 |

多条件同时触发：合并呈现为单一升级区块，列出所有不足项。

### 基础标准要求（写入红线，不触发升级提示）

| 主线 | 呈现方式 |
|------|---------|
| 抗风 | 风压等级 + 型材壁厚要求 |
| 水密气密 | 等级 + 第三方检测报告 + 安装节点过程控制 |

### 升级提示格式

```
您的选择（X档）在以下方面存在不足：
· 隔声：环境需求 Rw≥X，X档上限 Rw≤Y（差距Z dB）
· 热工：本案要求 K≤X，X档玻璃能力 K≤Y（差距Z）

满足本案性能要求的最低配置：[档位]
配置变化：玻璃 XX→XX，隔热条 Xmm→Xmm
成本影响：约+X元/㎡
```

---

## 五、红线清单统一格式

性能等级（硬指标）+ 第三方检测报告（验收抓手）+ 过程控制要求（辅助条款）

| 主线 | 性能指标 | 检测依据 | 过程控制 |
|------|---------|---------|---------|
| 隔声 | Rw ≥ X dB | 第三方声学检测报告 | 密封节点规程 |
| 热工 | K ≤ X，SHGC ≤ X | 能效/热工检测报告 | 隔热条安装规程 |
| 抗风 | 风压等级 ≥ X | 抗风压性能检测报告 | 型材壁厚进场验收 |
| 水密气密 | 水密 ≥ X级，气密 ≥ X级 | 第三方检测报告 | 安装节点 + 打胶规程 |
| 型材系统 | （不做等级判断） | 完整系统窗热工认证文件 | 不接受非配套隔热条拼装 |

---

## 五A、文件依赖地图（改动影响范围速查）

| 改动文件 | 直接影响 | 需同步检查 |
|---------|---------|---------|
| `calculator-v2.js` | 所有性能参数计算结果 | `documentMapper.js` 的输入值 |
| `arbitrator.js` | 配置层仲裁结果 | `documentMapper.js` 的配置字段 |
| `documentMapper.js` | reportSnapshot 全部字段 | `result.wxml` 所有数据绑定 |
| `index.js` | 云函数入口、snapshot 写入完整性 | summary 字段是否包含在 return 里 |
| `result.wxml` / `result.wxss` | 输出层视觉渲染 | L1摘要卡 + L2四章显示逻辑 |
| `result.js` | 页面数据加载、isPaid 状态 | Storage 读取路径、onUnlock 逻辑 |

**使用规则：** 写 SPEC 验证门时，以此表确认改动的下游影响范围，逐项列入「需同步检查」的验证项。

---

## 五B、功能状态全景表

> 维护规则：功能状态变更时同步更新，与 commit 绑定。

### 用户侧页面

| 功能 | 路由 | 状态 | 备注 |
|------|------|------|------|
| 首页 | pages/index/index | ✅ 已实现 | 草稿检测、历史记录、导航入口 |
| 底部导航栏 | — | 🔲 待开发 | 招标文件 / 招标管理 / 我的 三个入口 |
| 问卷定制 | pages/survey/survey | ✅ 已实现 | 10步问卷、分组进度、草稿保存 |
| 重新开始 | pages/question/question | 🔧 待完善 | 当前仅跳转首页，未清除草稿/重置状态 |
| 生成等待页 | pages/generate-loading/generate-loading | ✅ 已实现 | 调用 generateReport、Storage 持久化 |
| 结果详情页 | pages/result/result | ✅ 已实现 | WXML渲染，L1摘要卡+L2四章，isPaid控制 |
| 历史记录 | pages/history/history | ✅ 已实现 | 调用 getReportList |
| 个人中心 | pages/profile/index | 🔧 待完善 | 菜单结构已有，子页面待开发 |
| 使用指南 | — | 🔲 待开发 | 个人中心子项 |
| 常见问题 | — | 🔲 待开发 | 个人中心子项 |
| 关于我们 | — | 🔲 待开发 | 个人中心子项 |
| 私信咨询入口 | — | 🔲 待开发 | 面向用户的咨询触点 |
| 结果摘要页 | pages/result-summary/result-summary | ❌ 已废弃 | 保留仅供 git 历史参考 |

### 商家侧页面

| 功能 | 路由 | 状态 | 备注 |
|------|------|------|------|
| 供应商填写 | pages/vendor/fill | ✅ 已实现 | 加载招标信息、表单填写、草稿自动保存 |
| 供应商确认 | pages/vendor/confirm | ✅ 已实现 | 确认数据、调用 submitVendorResponse |
| 供应商成功 | pages/vendor/success | ✅ 已实现 | 返回首页 |
| 招标列表 | pages/tender/list | ✅ 已实现 | 调用 getTenderList |
| 招标详情 | pages/tender/detail | ✅ 已实现 | 调用 getVendorResponses、展示响应 |

### 云函数

| 云函数 | 状态 | 备注 |
|--------|------|------|
| `generateReport` | ✅ 活跃 | 核心函数，生产主路径 |
| `createTender` | ✅ 活跃 | 创建招标 |
| `getTenderList` | ✅ 活跃 | 获取招标列表 |
| `getTenderForVendor` | ✅ 活跃 | 获取供应商招标信息 |
| `getVendorResponses` | ✅ 活跃 | 获取供应商响应 |
| `submitVendorResponse` | ✅ 活跃 | 提交供应商响应 |
| `getReportList` | ✅ 活跃 | 获取报告列表 |
| `getOpenId` | ✅ 活跃 | 获取 OpenID |
| `saveDraft` | ✅ 活跃 | 保存草稿 |
| `trackEvent` | ✅ 活跃 | 事件埋点 |
| `calculateWindow` | ✅ 活跃 | 调用方：pages/question/question.js |
| `getExperimentStats` | ❌ 废弃 | 无调用方 |
| `generatePDF` | ❌ 废弃 | PDF路线已关闭，不得重开 |
| `benchmark-pdf` | ❌ 废弃 | PDF测试函数 |
| `cleanupOldPDFs` | ❌ 废弃 | 依附PDF路线 |
| `pdfSpike` | ❌ 废弃 | PDF测试函数 |
| `test` | ❌ 废弃 | 临时测试函数 |

### 待清理技术债

| 项目 | 位置 | 优先级 |
|------|------|--------|
| PDF残留代码 | result.js `downloadPDF()` / `previewPDF()` / `fileID` | 🟡 确认无调用后清理 |
| 废弃云函数 | 见上表❌条目 | 🟡 确认无调用后删除 |
| 生产日志清理 | generateReport/index.js `[Cloud]` 前缀 console.log（128/131/137/141-144/241-242行） | 🟡 推广引流后处理 |

---

## 六、已确认废弃项

| 废弃项 | 原因 | 替代方案 |
|--------|------|---------|
| BUDGET_TIER_GLASS_BASE | 档位倒置，数据错乱 | GLASS_LEVELS 级差驱动（SPEC-02） |
| getRwRequired() fallback | 死代码（已删除，commit 915db5b）| calculator-v2.js为唯一Rw数据源 |
| 档位模板式红线生成 | 导致条款错配 | 性能层动态生成 |
| 冲突提示指令型语言 | 违反原则5 | 已改为信息呈现型陈述（SPEC-01） |
| Rw边界修复（技术债标注） | v3.9.4已落地，v3.9.9代码验证完成 | 无需操作，已关闭 |
| estimateCostDelta(glassKey, tier) | tier 参数语义错误 | 改为 (perf_glass_key, glass_key)（SPEC-03/04） |
| result-summary 页面 | 已由 result 页 L1 摘要卡替代，文件保留供 git 历史参考 | result 页原生渲染 |
| generatePDF 云函数（PDF路线） | @sparticuz/chromium 从 GitHub 拉取二进制，微信云函数网络不通 | 原生渲染 |
| 云托管PDF路线（Puppeteer） | 腾讯云构建环境无法拉取外部Docker镜像，卡死（2026-04验证） | 原生渲染 |
| WebView HTML路线 | 微信平台业务域名限制，云存储URL无法作为web-view src，卡死（2026-04验证） | 原生渲染 |
| 第三章 userMeaning 渲染层输出 | 解释文字与"在关键时刻知道该说什么"设计目标相悖 | 迁移至首页Q&A（MVP方式B）；数据层字段保留 |

---

## 七、系统能力边界（不在职责范围内）

- 整窗K值正向物理计算
- 型材腔体设计和系统匹配性判断
- 安装工艺质量验证
- 商家报价合理性判断

以上均通过「商家必须提供证明文件」的红线条款处理。

---

## 八、待执行迭代项

### 下一版本（待定）

| 项目 | 状态 | 备注 |
|------|------|------|
| Rw边界修复 | ✅ 已关闭 | v3.9.4落地，v3.9.9验证（146/146） |
| 定价决策（L2） | 🔲 待产品验证 | 需种子用户数据支撑 |
| 小红书→小程序转化漏斗 | 🔲 待建立 | 引流后跨平台损耗未量化 |
| SPEC-E | ✅ 已完成 | pdfBuilder-v2.js 渲染层重构 |
| 输出层架构重构（SPEC-C01~C04） | ✅ 已完成 | commit 66a17a5 · 146/146 |
| v1.1-P1 | documentMapper.js | needsTable三层扩展、responseGuide、userMeaning、threePhaseIntro、inspectionChecklist、fieldGrades、consistencyClause、acceptance.reason | ✅ 已完成 commit db56601 |
| v1.1-P2 | result.wxml/wxss | threePhaseIntro(M4-1)、inspectionChecklist(M4-4)、userMeaning清除、标题字段驱动 | ✅ 已完成 commit 6cc19e4 |
| M4-3 | documentMapper.js + result.wxml/wxss | 答题表四段完整渲染、section_redline动态生成、glassDetailSpec升级A级 | ✅ 已完成 commit b0b540a |
| 水密性 levelBar 溢出修复 | ✅ 已关闭 | 代码侧 Math.min(95,pos) 早已存在，条目登记过时；下限 5→0 越权改动已回滚（commit 1411bad） |
| 清除 DEBUG log（index.js 331-332行） | ✅ 已关闭 | 行号漂移，331-332 为 snapshot.summary 生产代码，全文无 DEBUG 字串 |
| 部署 generateReport | 🔲 待执行 | 前置：NTP时间同步检查 |
| 首页 Q&A 内容库建立 | 🔲 待执行 | 消费 userMeaning 内容；MVP方式B，独立维护不做关联跳转 |
| 进场核查拍摄清单渲染实现 | 🔲 待执行 | M4-4，基于 CONTENT_DEFINITION_v1.1.md 第九节 |
| B02 导航栏术语统一 | ✅ 已完成 | commit 60a56a2；survey.json navigationBarTitleText |
| B01 K值提示呈现层兜底 | ✅ 已完成 | commit 60a56a2；selfK==kMin 显示单点；规则层见第十节议题1 |
| 水密性 levelBar 下限回滚 | ✅ 已完成 | commit 1411bad；越权改动 5→0 还原 |

---

## 九、活跃决策日志

> 每次会话结束强制更新，与 commit/push 同级。
> 超过10条时，将最早条目移入「历史归档」。
> 此区块记录的决策优先于文件其他章节的旧有描述。

### 活跃条目

| 日期 | 类型 | 决策内容 | 约束／原因 |
|------|------|---------|-----------|
| 2026-04-13 | ❌ 关闭 | 遮罩付费墙方案 | 已改为 wx:if 条件渲染，不得重开 |
| 2026-04-13 | ⚠️ 待执行 | 清除DEBUG log（index.js 331-332行） | 只删两行，不改周边逻辑，完成标准：部署后生产日志无输出 |
| 2026-04-14 | ✅ 确认 | 第三章 userMeaning 迁移至首页Q&A | MVP方式B：独立维护，不做红线关联跳转；渲染层第三章不消费；数据层字段保留；后续升级方向：方式A（"？"图标直达） |
| 2026-04-14 | ✅ 确认 | 第四章重构：三阶段过程把控 | 过程把控>文件收集；三节点：下单前/安装前（进场）/安装后（竣工）；报告是预期结果证明，不是交付确定性来源 |
| 2026-04-14 | ✅ 确认 | 产品分层价值阶梯（L1/L2/L3）及L3介入模型 | L3三节点：设计审查（远程看配置单）/ 进场核查（用户拍+李Sir判断）/ 竣工验收（用户自检提交+李Sir结论） |
| 2026-04-14 | ✅ 确认 | 答题表字段A/B/C可获取性分级 + 配置一致性承诺条款 | 基于Perplexity中国大陆门窗市场审查；A级直接要求/B级缺失须说明/一致性条款覆盖全部字段 |
| 2026-04-14 | ✅ 确认 | 进场核查拍摄清单三层分级 | 必须拍/尽量拍/不靠照片靠文件；基于Perplexity可操作性审查；拍"能证明身份的证据"，不拍"需要专业判断的细节" |
| 2026-04-14 | ✅ 完成 | 输出层三文档升版v1.1 | OUTPUT_LAYER_DESIGN / SNAPSHOT_SCHEMA / CONTENT_DEFINITION 均已更新；基线 commit 66a17a5 |
| 2026-04-19 | ✅ 完成 | 推广引流前技术债清扫 | commit 60a56a2；B02 术语统一 + B01 呈现层兜底；水密性/DEBUG 两项过时条目关闭 |
| 2026-04-19 | ✅ 完成 | 水密性 levelBar 下限回滚 | commit 1411bad；Claude Code 越权改动（5→0）还原，流程规范见 PRODUCT_CLAUDE.md H7 |
| 2026-04-19 | 📋 登记 | 架构级待办入库标准建立 | 四条特征：跨≥2文件管道/H3字段语义/需前置验证/触碰核心原则；见第十节 |
| 2026-04-19 | 📋 登记 | 自采暖 K 值规则层重写 | 见第十节架构级待办议题1；推广引流后第一迭代 |
| 2026-04-19 | 📋 登记 | Claude Code H7 规范升级 | SPEC 前提不成立必须停机；不得自主另选修改点；PRODUCT_CLAUDE.md 已更新 |

### 历史归档

| 日期 | 类型 | 决策内容 | 约束／原因 |
|------|------|---------|-----------|
| 2026-04-13 | ✅ 确认 | L1摘要卡6格字段名全小写 | summary字段在index.js return里，documentMapper字段名须保持小写 |
| 2026-04-13 | ✅ 确认 | 四章内容 wx:if="{{isPaid}}" 条件渲染 | 不得改回遮罩方案 |
| 2026-04-13 | ✅ 确认 | buildCoreTension 按 pain_point 场景化重写 | 参考 buildAnalysisParagraph 分支结构；不使用 pain_points[0]；commit 698f06a |
| 2026-04-13 | ✅ 完成 | 输出层重构 Phase 1（Steps 1–7）+ Phase 2（Step 8）全部完成 | documentMapper.js 双文件同步；146/146；commit 698f06a |
| 2026-04-15 | ✅ 完成 | SPEC-OUTPUT-v1.1 Phase1 documentMapper 字段扩展 | commit db56601；needsTable derivation/levelBar/marketReality、responseGuide、userMeaning、actionSteps/threePhaseIntro/inspectionChecklist、fieldGrades/consistencyClause、acceptance.reason |
| 2026-04-15 | ✅ 完成 | SPEC-OUTPUT-v1.1 Phase2 渲染层重构 | commit 6cc19e4；threePhaseIntro替换actionSteps(M4-1)、inspectionChecklist新增(M4-4)、userMeaning渲染层清除、章节标题字段驱动 |
| 2026-04-15 | ✅ 完成 | SPEC-M4-3 答题表四段完整渲染 | commit b0b540a；section_redline从sharedRedlineChecklist.mandatory动态生成；glassDetailSpec从gradeC升至gradeA；冗余consistency-clause-wrap已删除(4448ea3) |
| 2026-04-15 | ✅ 确认 | section_redline 红线承诺段格式 | 逐项displayId+text+逐项打勾；clauseNote作为合同附件声明；数据源=chapter3同一批红线，无冗余 |

---

## 十、架构级待办

> 非技术债清扫可完成的议题。本段登记的议题须走完整 SPEC 设计 + 可行性前置验证流程，不得在一次会话内边讨论边执行。
> 每次会话触及此段议题时，必须先切换产品审查官视角做方向校准。

### 入库标准

议题满足以下任一特征即入库：
1. 改动需跨 ≥2 个文件的数据管道
2. 涉及字段语义变更（H3）
3. 需要前置可行性验证才能进入 SPEC 设计
4. 影响核心产品原则中「不得违反」条款

登记内容必需：问题描述 · 当前处置 · 候选方向 · 影响范围 · 决策前必需数据 · 约束条件。

---

### 议题 1：自采暖 K 值加严规则重写

**登记日期：** 2026-04-19
**触发入库标准：** 2（H3 字段语义）+ 4（触碰原则 5：信息呈现型语言）

**问题描述：**
当前规则 `selfK = kBase - 0.2` 在 CLIMATE_SPEC 十个城市中有 9 个退化为点值（`selfK === kMin`），仅沈阳（严寒区 kMin=1.5）维持区间。字面"加严"实际数值等于 kMin（集中供暖区间下沿），用户细看会发现"加严"是文字游戏，违反产品核心价值主张「我没有被忽悠」。

**当前处置：**
2026-04-19 呈现层兜底（B01，commit `60a56a2`）—— `selfK==kMin` 时显示单点值，消除字面矛盾。规则层未重写。

**候选方向：**

- 方向 1（如实表达）：承认规则等效于"目标值 = kMin"，呈现层表述为"自采暖目标 ≤ kMin"，放弃"自采暖更严"的差异化定位。
- 方向 2（规则重写）：重新定义加严规则使之真正严于集中供暖（如 `selfK = kMin - 0.1`），需验证 K < kMin 的工程意义与成本可行性。
- 方向 3（取消加严）：自采暖 K 值不单独处理，差异化改走其它维度（如玻璃档位下移、型材档位提升）。
- 方向 4（延后决策）：推广后收集种子用户实际 K 值反馈（用户是否关注到"加严"这个措辞、是否理解差异、是否影响选择），基于真实数据再决策。

**影响范围（跨文件）：**
- `survey.js updateHeatingKTips()` 文案
- `calculator-v2.js` K_target 计算
- `arbitrator.js` 玻璃/隔热条仲裁
- `documentMapper.js` 第一、二章 K 值写入
- `redlineSpec.js` 热工红线阈值

**决策前必需数据：**
- 自采暖 K 值加严规则的原始依据（工程经验 / 国标 / 临时起笔）
- 方向 2 若选：K < kMin 在主流气候区的工程依据、成本爬升曲线、用户预算承受度
- 方向 3 若选：自采暖差异化走哪个维度、配置层仲裁如何改
- 方向 4 若选：种子用户反馈收集口径（如何问才能得到有效答案）

**约束条件：**
- 不得在推广引流前改动
- 重写前须完整 SPEC，含只读验证门（K_target 在全部下游的字段路径）
- 必须覆盖五个文件的字段语义一致性
- 若选方向 2/3，必须走完 PRODUCT_CLAUDE.md 第五节「架构级方案选择」流程

---

*本文件由产品决策对话生成，修改须经李Sir确认后方可更新。*
