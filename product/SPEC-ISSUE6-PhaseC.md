# SPEC-ISSUE6-PhaseC · 议题 6 Phase C 执行规约

> 本文件是议题 6 Phase C 的唯一执行依据。
> Claude Code 必须严格按本文件执行，任何偏离须先回到产品 Project 决策。
> 制定日期：2026-04-29 | 议题号：CORE_LOGIC.md 第十节议题 6

---

## 一、元信息

| 项 | 内容 |
|----|------|
| 议题号 | 议题 6 · 统一商家答题表 + 目标导向章节重组 |
| 立案日期 | 2026-04-29 |
| Phase B 决策完成日期 | 2026-04-29 |
| 方向 | C'（先单边后双边·分阶段） |
| 基线 commit | sprint8/a-8a · 待 Phase C 启动时 grep 确认 |
| 测试基线 | 82/82（不含 pdfkit 套件） |
| 关联议题 | 议题 3（性能层修正规则）· 字段语义须保持一致 |

---

## 二、改动目标

将文件结构从"分章陈述"重组为"目标导向 + 配置汇总表压轴"，实现产品价值闭环：

| 阶段 | 文件位置 | 用户动作 |
|------|---------|---------|
| 理解 | 第一-五章 | 读"性能目标 + 影响因素 + 红线" |
| 沟通 | 第六章 + 过渡小节 | 用配置汇总答题表与商家对话 |
| 验收 | 第七章 + 三阶段对照句 | 拿答题表去现场核对实物 |

---

## 三、改动范围清单

| 文件 | 改动类型 | 工具 | 估算行数 |
|------|---------|------|---------|
| `cloudfunctions/generateReport/documentMapper.js` | 重构 mapToSections | PowerShell 脚本 | ~600 |
| `cloudfunctions/createTender/documentMapper.js` | 同步重构（双副本） | PowerShell 脚本 | ~600 |
| `miniprogram/pages/result/result.wxml` | 章节节点重组 | PowerShell 脚本 | ~300 |
| `miniprogram/pages/result/result.wxss` | 新章节样式补充 | Claude Code | ~50 |
| `cloudfunctions/generateReport/redlineSpec.js` | R10 文本修正 | Claude Code | ~20 |
| `cloudfunctions/createTender/redlineSpec.js` | R10 同步修正 | Claude Code | ~20 |
| `tests/documentMapper.test.js` | 测试用例增补 | Claude Code | ~80 |

**Phase C 不动文件清单（边界）：**
- `cloudfunctions/generateReport/calculator-v2.js`（不扩展双输出）
- `miniprogram/pages/vendor/fill/*`（保持红线勾选结构）
- `miniprogram/pages/tender/detail/*`（保持当前展示）
- `cloudfunctions/submitVendorResponse/*`
- `cloudfunctions/getVendorResponses/*`

---

## 四、新章节结构骨架

```
【L1 摘要卡 · 免费可见】
   保持当前6格摘要 + 解锁按钮

【L2 完整版 · 付费可见】

▍ 开篇 · 你的需求画像
   字段：basicInfo / coreTension / dataSourceStatement
   字段来源：当前 chapter1 精简版

▍ 第一章 · 隔声
   1.1 你的隔声目标（数字 + 推导逻辑）
       字段：targetValue.Rw / derivationLogic.acoustic
   1.2 影响因素：玻璃 / 气密 / 窗型 / 密封工艺
       字段：factors[]
   1.3 隔声红线
       字段：redlines[] (R06/R08/R09)

▍ 第二章 · 热工
   2.1 你的热工目标（K + SHGC + 推导逻辑）
   2.2 影响因素：玻璃 / 隔热条 / 系统认证
   2.3 热工红线 (R03/R04/R05/R07)

▍ 第三章 · 抗风
   3.1 你的抗风目标（P3 + 推导逻辑）
   3.2 影响因素：型材壁厚 / 五金 / 安装节点
   3.3 抗风红线 (R01/R02/R12)

▍ 第四章 · 水密气密
   4.1 你的水密气密目标
   4.2 影响因素：胶条系统 / 排水孔 / 窗型 / 安装质量
   4.3 水密气密红线 (R10/R11)

▍ 第五章 · 安全配置（条件显示：落地窗 / 大面积玻璃 / 儿童家庭）
   5.1 你的场景为什么需要安全配置
   5.2 安全要求
   5.3 安全红线 (R13/R14 + 可选优化项)

▍ 过渡小节 · 如何使用这张配置汇总答题表
   一行业主使用说明：
   "把本表发给三个商家填好回传，就能横向对比谁在偷项、谁真正达标。"

▍ 第六章 · 配置汇总答题表
   三列表：本案要求(系统锁定) | 贵司承诺值(商家填) | 检测/证明依据
   底部：报价/工期/质保/签名 + 红线承诺确认区

▍ 第七章 · 三阶段过程把控
   7.1 下单前
       对照句："核对商家答题表 → 确认关键参数与本案要求一致"
   7.2 安装前
       对照句："对照本章清单检查到货实物
              ——玻璃钢印 / 五金品牌 / 型材系列"
   7.3 安装后
       对照句："按本报告给出的验收标准
              进行试水、试开关与目测检查"
   + 进场核查清单
   + 验收节点
```

---

## 五、配置汇总答题表字段定义

26 个字段，按类别组织。每字段必须含 `id / category / label / spec_required / vendor_fillable / proof_required` 六键。

### 5.1 性能整窗值类（6 项）

| id | label | spec_required 来源 | proof_required |
|----|-------|------------------|----------------|
| F01 | 整窗 Rw | calculator-v2.Rw_required | 第三方声学检测报告编号 + 出具机构 + 检测日期 + 样窗规格 |
| F02 | 整窗 K 值 | calculator-v2.K_target | 整窗热工检测报告编号 + 出具机构 |
| F03 | 整窗 SHGC | calculator-v2.SHGC_target | 整窗热工检测报告编号 |
| F04 | 抗风压 P3 | calculator-v2.P3_required | 抗风压检测报告编号 + 适用洞口尺寸范围 |
| F05 | 气密等级 | calculator-v2.air_rec | GB/T 7106 检测报告编号 |
| F06 | 水密等级 | calculator-v2.water_rec | GB/T 7106 检测报告编号 |

### 5.2 玻璃配置类（5 项）

| id | label | spec_required 来源 | proof_required |
|----|-------|------------------|----------------|
| F07 | 玻璃配置型号 | arbitrator.glass_name | 玻璃厂家 + 品牌 |
| F08 | 玻璃理论 Rw | arbitrator.GLASS_LEVELS[glass_key].rw_max（反查） | 玻璃 Rw 检测报告 |
| F09 | Low-E 镀膜位置 | arbitrator.thermal_overlay | 玻璃产品说明书 |
| F10 | 玻璃安全性 | 派生（落地窗/儿童场景触发，要求钢化+夹胶） | 3C 标识 + 检测报告 |
| F11 | 间隔条材质 | 派生（推荐暖边条） | 材料说明书 |

**视觉相邻规约：** F08（玻璃理论 Rw）须紧邻 F01（整窗 Rw）渲染，便于业主对照差值。

### 5.3 型材配置类（4 项）

| id | label | spec_required 来源 | proof_required |
|----|-------|------------------|----------------|
| F12 | 型材品牌及系列 | 无指定（商家自报） | 系统授权书 |
| F13 | 型材合金牌号 | 6063-T5 或同等 | 材质证明书 |
| F14 | 主受力壁厚 | budget.profile（≥1.5mm） | 型材截面检测报告 |
| F15 | 隔热条规格 | getInsulationBarRequirement() | 隔热条材质证明 |

### 5.4 五金配置类（3 项）

| id | label | spec_required 来源 | proof_required |
|----|-------|------------------|----------------|
| F16 | 五金品牌 | 无指定（商家自报） | 五金合格证 |
| F17 | 五金系列/型号 | 无指定（商家自报） | 五金合格证 |
| F18 | 五金保修年限 | ≥5 年 | 厂家保修承诺 |

### 5.5 密封与安装类（4 项）

| id | label | spec_required 来源 | proof_required |
|----|-------|------------------|----------------|
| F19 | 胶条材质 | EPDM 或 TPE | 胶条说明书 |
| F20 | 耐候密封胶品牌 | 无指定（商家自报） | 产品说明书 |
| F21 | 发泡剂品牌 | 无指定（商家自报） | 产品说明书 |
| F22 | 固定件间距承诺 | budget.installation | 安装方案文件 |

### 5.6 商务字段类（4 项）

| id | label | spec_required 来源 | proof_required |
|----|-------|------------------|----------------|
| F23 | 含税单价 | 无指定（商家自报） | — |
| F24 | 工期 | 无指定（商家自报） | — |
| F25 | 质保年限 | ≥5 年 | 质保协议 |
| F26 | 公司名称 + 签名 | 无指定（商家自报） | — |

---

## 六、红线归属映射表

| 章节 | 红线 id | 数量 |
|------|---------|------|
| chapter1（隔声） | R06, R08, R09 | 3 |
| chapter2（热工） | R03, R04, R05, R07 | 4 |
| chapter3（抗风） | R01, R02, R12 | 3 |
| chapter4（水密气密） | R10, R11 | 2 |
| chapter5（安全） | R13, R14, +可选优化项 | ≥2 |
| **合计** | | **16** |

**约束：**
- 每条红线只在一个章节出现
- chapter6 答题表底部"红线承诺确认区"引用 sharedRedlineChecklist 全集，不重复定义文本
- chapter5 可选优化项保持当前 documentMapper 触发逻辑

---

## 七、字段映射规约

### 7.1 性能数字字段（与议题 3 强绑定）

documentMapper 必须**直接消费** calculator-v2.js 输出字段，不得新建同义词字段：

| documentMapper 字段 | 必须等于 |
|--------------------|---------|
| chapter1.targetValue.Rw | reportSnapshot.summary.rw_required |
| chapter2.targetValue.K | reportSnapshot.summary.k_target |
| chapter2.targetValue.SHGC | reportSnapshot.summary.shgc_target |
| chapter3.targetValue.P3 | reportSnapshot.summary.p3_required |
| chapter4.targetValue.water | reportSnapshot.summary.water_rec |
| chapter4.targetValue.air | reportSnapshot.summary.air_rec |

### 7.2 玻璃理论 Rw 反查规约

```javascript
// chapter6 表 F08 玻璃理论 Rw 字段填充逻辑
const glassKey = arbitrator_output.glass_key;
const glassRwTheory = GLASS_LEVELS[glassKey]?.rw_max ?? null;
// 若 glassKey 不在 GLASS_LEVELS 中，spec_required 渲染为"待反查"
```

### 7.3 派生字段触发逻辑

| 字段 | 触发条件 | 推荐值 |
|------|---------|--------|
| F10 玻璃安全性 | window_features.has_large_fixed === true 或 family_has_children === true | 钢化 + 夹胶 + PVB ≥0.76mm |
| F11 间隔条材质 | climate.zone ∈ {严寒, 寒冷} 或 K_target ≤ 1.6 | 暖边条 |

### 7.4 R10 修正规约

**当前文本（错误）：**
```
禁止普通密封胶代替结构胶（须采用中性硅酮结构胶）
```

**修正后文本：**
```
洞口四周耐候密封胶须连续无断开，胶条系统须为型材原厂配套。
```

**userMeaning 修正：**
```
密封胶（防水/气密用）和结构胶（承重粘结用）是两类不同材料。门窗安装中，
洞口四周用耐候密封胶做连续封闭，框扇之间靠原厂胶条系统密封。
要求商家书面承诺胶条系统型号 + 耐候胶品牌，避免用低耐久材料替代。
```

---

## 八、只读验证门 V1–V9

### V1 · 章节结构完整性

**断言：** sections 数组必须等于以下白名单（顺序固定）：

```
['summary', 'cover', 'overview', 
 'chapter1', 'chapter2', 'chapter3', 'chapter4', 'chapter5',
 'transition', 'chapter6', 'chapter7', 'attachments']
```

**验证：** `sections.map(s => s.id)` 与白名单深度相等
**失败处理：** Claude Code 立即停机，回报缺失或多余 id

---

### V2 · 性能数字唯一出现

**断言：** 同一性能数字在 chapter1-chapter5 中只能出现一次：

```
chapter1（隔声）：含 Rw，禁含 K/SHGC/P3
chapter2（热工）：含 K + SHGC，禁含 Rw/P3
chapter3（抗风）：含 P3，禁含 Rw/K/SHGC
chapter4（水密气密）：含水密+气密等级，禁含 Rw/K/SHGC/P3
chapter5（安全）：禁含主线性能数字
```

**例外：** chapter6 配置汇总答题表允许全量数字（设计如此）

**验证：** 各章 narrative 字段做正则匹配（如 `/Rw\s*[≥>=]\s*\d+\s*dB/`）
**失败处理：** 列出违反章节 + 命中字符串，停机

---

### V3 · 答题表字段完整性

**断言：**
- chapter6.configSummaryTable 必须含且仅含 26 个字段
- 每字段必须含 6 键：id, category, label, spec_required, vendor_fillable, proof_required
- category 分布精确为：performance:6 / glass:5 / profile:4 / hardware:3 / sealing:4 / commercial:4

**验证：** 字段数量、键完整性、分类分布逐项断言
**失败处理：** 列出缺失/多余/异常字段 id，停机

---

### V4 · 红线归属一致性

**断言：**
- 每条红线只在一个章节出现
- 红线总数 = 16
- chapter1-5 红线 id 集合两两交集为空集，并集 = 16 条全集

**验证：** 提取每章红线 id，做集合运算
**失败处理：** 列出重复或缺失的红线 id，停机

---

### V5 · 议题 3 字段语义一致性

**断言：** documentMapper 不得新建性能数字字段名，必须直接引用 reportSnapshot.summary.* 已有字段

**禁止字段名（同义词）：**
- Rw_target / rw_value / RwRequired
- K_value / k_required / K_required
- p3_target / P3_value
- (任何与 calculator-v2 输出字段不一致的同义词)

**验证：** grep documentMapper.js 中所有性能数字引用，与 calculator-v2 输出字段做交集比对
**失败处理：** 列出不一致字段引用，停机

---

### V6 · 历史 reportSnapshot 兼容性

**断言：** 当输入 reportSnapshot 缺失新字段时，mapToSections 不得抛错

**测试用例：** 单元测试构造一份"旧 schema reportSnapshot"（无 windowTypeLimit / glassRwTheory / spacerBarMaterial / hardwareBrand），跑通 mapToSections，断言：
- 无 throw
- sections.length 正确（含 chapter5 条件渲染逻辑）
- 缺失字段对应位置渲染为 "待反查" / "未指定" / "无指定"

**失败处理：** 列出抛错路径，停机

---

### V7 · 渲染层节点完整性

**断言：** result.wxml 顶层 view 节点严格对应 sections 输出

```
必须存在的节点（按顺序）：
- 摘要卡区（始终可见）
- chapters-wrap (wx:if="{{isPaid}}")
  ├── overview-block
  ├── chapter1-block
  ├── chapter2-block
  ├── chapter3-block
  ├── chapter4-block
  ├── chapter5-block (wx:if 安全条件)
  ├── transition-block
  ├── chapter6-block (含配置汇总表)
  └── chapter7-block (含三阶段对照句)
```

**验证：** view 完整 wxml，确认上述节点全部存在且层级正确
**失败处理：** 列出缺失或多余节点，停机

---

### V8 · 测试套件不退化

**断言：** Phase C 改动后，npm test 通过数 ≥ 82/82
- pdfkit 失败套件状态不变（不在本期处理范围）
- 新增章节带来的新测试须同步增加用例

**验证：** Claude Code 执行 npm test，比对前后通过数
**失败处理：** 任何测试退化立即回滚改动并停机

---

### V9 · 数据来源不变性（与议题 3 强绑定）

**断言：** chapter1-chapter5 的所有性能数字字段，必须直接来自 reportSnapshot.summary，不得在 documentMapper 内做二次计算或修正

**禁止动作：**
- 在 documentMapper 内对 Rw / K / SHGC / P3 / air_rec / water_rec 做任何修正、加减、舍入
- 在 documentMapper 内引入新的工程经验值参与计算
- 在 documentMapper 内做"如果某条件，则用别的值替代"的临时修正逻辑

**允许动作：**
- 直接读取 reportSnapshot.summary 字段
- 字符串拼接和格式化（如 "Rw ≥ 38 dB"）
- 反查 GLASS_LEVELS 等静态字典获取派生字段（如玻璃理论 Rw）

**验证：** grep documentMapper.js 中所有性能数字字段的引用，确认仅来自 reportSnapshot.summary 直接读取或静态字典反查
**失败处理：** 列出违规计算路径，停机

---

## 九、执行顺序与工具分工

### Phase C-1 · documentMapper 双副本重构（PowerShell 脚本）

**工具：** PowerShell + Python 脚本（改动 ~600 行 × 2 副本，跨文件依赖）

**步骤：**
1. PowerShell 备份当前两份 documentMapper.js（git stash 或副本备份）
2. Python 脚本生成新 mapToSections 函数（基于本 SPEC 章节结构 + 字段映射规约）
3. 替换两份 documentMapper.js（generateReport / createTender）
4. 触发 V1, V2, V3, V4, V5, V9 验证门
5. 触发 V6 兼容性验证

**约束：** 任一验证门失败 → 立即回滚 + 停机

---

### Phase C-2 · result.wxml 章节节点重组（PowerShell 脚本）

**工具：** PowerShell here-doc 脚本

**步骤：**
1. 备份当前 result.wxml
2. 按章节骨架生成新 wxml 节点结构
3. 触发 V7 渲染层节点完整性验证

---

### Phase C-3 · 样式与红线修正（Claude Code）

**工具：** Claude Code str_replace（单文件、小改动）

**步骤：**
1. result.wxss 增补新章节样式（~50 行）
2. 两份 redlineSpec.js 修正 R10 文本和 userMeaning（~20 行 × 2 副本）

---

### Phase C-4 · 测试用例增补（Claude Code）

**工具：** Claude Code str_replace

**步骤：**
1. tests/documentMapper.test.js 新增章节结构断言用例
2. 新增 V6 兼容性测试用例（旧 schema reportSnapshot）
3. 触发 V8 测试不退化验证
4. 跑全量测试 → 期望 ≥ 82/82

---

### Phase C-5 · 部署与真机验证

**步骤：**
1. 部署 generateReport：
   ```
   cd C:\Users\Administrator\Documents\trae_projects\demo-window-calculator\miniprogram
   tcb fn deploy generateReport --dir cloudfunctions/generateReport --force
   ```
2. 部署 createTender（如有改动）
3. 真机冒烟测试（4 场景，下文清单）
4. 通过后 → CORE_LOGIC.md 议题 6 关闭

---

## 十、完成标准

### 测试维度
- [ ] V1-V9 全部通过
- [ ] npm test ≥ 82/82
- [ ] 新增章节测试用例 ≥ 5 条

### 真机冒烟用例（必跑）
- [ ] 用例 1：上海 12F 主干道近距离卧室（典型隔声主导场景）
- [ ] 用例 2：北京 8F 普通环境（典型热工主导场景）
- [ ] 用例 3：深圳 25F 沿海高层（抗风+水密叠加场景）
- [ ] 用例 4：成都 3F 安静环境带儿童（安全章节触发场景）

### 视觉验证维度
- [ ] L1 摘要卡视觉无变化（不在本期改动范围）
- [ ] 第一-五章结构清晰，性能数字仅在对应章节出现
- [ ] 第六章配置汇总表 F08 与 F01 视觉相邻
- [ ] 第七章三阶段对照句正确显示
- [ ] R10 红线文本修正后正确显示

### CORE_LOGIC.md 更新
- [ ] 议题 6 状态从"待执行"改为"✅ 已完成"
- [ ] 活跃决策日志新增 Phase C 完成条目
- [ ] 第八节"待执行迭代项"中议题 6 相关条目关闭

---

## 十一、严格约束

1. **不得跳过任何验证门**——验证门是 SPEC 不可分割的一部分
2. **不得在 Phase C 阶段修改议题 6 决策**——如发现 SPEC 缺陷，停机回到产品 Project 决策
3. **不得越过本 SPEC 改动范围清单**——calculator-v2 / vendor/fill / tender/detail 不动
4. **不得在 documentMapper 内做性能数字二次计算**——V9 是硬约束
5. **触发 H1-H7 任一条件立即停机**——不得自主判断"小改动可继续"

---

## 十二、Phase C 完成后的下一步

议题 6 关闭后，可选下一步方向：

- 推广引流后第一波用户反馈进入 FEEDBACK_DB
- 议题 4（规则白皮书飞轮）按反馈分类路由
- 议题 3（性能层修正规则）子案例 A/B/C/D/E 联动决策
- 议题 6 触发方向 B'（双边闭环）的条件评估

具体启动顺序由产品 Project 在新会话中决策。

---

*本 SPEC 由议题 6 Phase B 决策固化生成。*
*所有改动须经 V1-V9 验证门后方可提交。*
*Phase C 执行过程中如发现 SPEC 缺陷，立即停机回到产品 Project 决策，不得自主调整。*
```