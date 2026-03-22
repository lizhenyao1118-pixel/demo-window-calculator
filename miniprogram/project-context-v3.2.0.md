**【项目背景文档 v3.2.0】门窗技术招标文件系统**

**文档版本**：v3.2.0  
**生成日期**：2026-03-21  
**有效期**：至 Sprint 5 启动或架构变更  
**Git 状态**：`main` @ `[新commit]` (tag: v3.2.0)

---

## 1. 项目指纹（30秒定位）

| 维度 | 内容 |
|------|------|
| **项目阶段** | **V3.2 Sprint 4 完成** → PDF第一章重构完成，已部署生产环境 |
| **核心交付物** | 微信小程序（9题问卷，Q2扩展）+ 云函数（PDF生成V3.2）+ A/B实验框架（6+2桶） |
| **技术基线** | 9题问卷 → 统一仲裁器 → 四章PDF（唯一声音原则）→ **1.1信息补全+1.2双层结构** |
| **当前阻塞** | **无**，等待 Sprint 5 启动决策 |
| **关键风险** | 已解决：room_type合并进Q2、STANDARDS_MAP维护、新旧结构兼容 |

---

## 2. 技术资产清单（精准定位）

### 2.1 核心代码文件（云函数）
cloudfunctions/generateReport/  
├── index.js                 # 入口，HTTP触发，已适配room_type/pain_points透传  
├── calculator-v2.js         # Rw/K/SHGC计算，heatingType修正系数  
├── arbitrator.js            # V3统一仲裁器  
├── documentMapper.js        # V3.2：STANDARDS_MAP + Chapter1双层结构（build1_1/build1_2）  
├── pdfBuilder-v2.js         # V3.2：renderChapter1重构（1.1补全+1.2五维表格+兼容逻辑）  
├── shared/                  # 云函数内共享  
│   ├── budgetSpec.js        # 价格区间+壁厚标准  
│   └── thermalSpec.js       # 隔热条宽度（K_target驱动）  
└── config.json              # 云开发环境配置  
cloudfunctions/trackEvent/   # 埋点系统  
cloudfunctions/getExperimentStats/  # A/B监控  

### 2.2 前端关键文件
pages/survey/  
├── survey.js                # V3.2：Q2扩展（floor/totalFloors + room_type[]），*SelectedMap模式  
├── survey.wxml              # 9题框架，Q2同屏采集楼层+使用场景  
└── survey.wxss              # 选中态样式  
utils/  
├── hash.js                  # Layer1(6桶)+Layer2(2桶)分组  
└── track.js                 # 埋点SDK  

### 2.3 关键配置值（当前状态）

| 配置项 | 值 | 说明 |
|--------|-----|------|
| **问卷题目数** | **9题** | V3.2定稿（Q2扩展为"项目基本信息页"，含楼层+room_type） |
| **Q2结构** | 楼层(floor/totalFloors) + 使用场景(room_type[]) | Sprint4新增，同屏采集，不新增step索引 |
| **PDF第一章** | 1.1节补全7字段 + 1.2节双层结构（五维表格+核心矛盾叙述） | v3.2.0重构 |
| **标准文号维护** | STANDARDS_MAP集中配置（6项） | 禁止硬编码，依据列自动拼接"文号·说明" |
| **room_type** | display_only，不参与仲裁 | 仅用于PDF1.1节渲染，顿号连接多选值 |
| **heatingType修正** | central:0 / self:-0.2 / none:+0.2 | 自采暖下限0.8 |
| **整窗测试触发** | window_type=sliding/door_window | PDF第二章2.4/1.2表格安全行强制标注 |
| **SHGC标准文号** | GB/T 2680-2021 | 强制校正（非GB/T 8478） |
| **Git标签** | `v3.2.0` | Sprint4完成标记 |
| **云环境ID** | `cloud1-7grn8mcy176fcc2b` | 所有CLI命令需指定 |

---

## 3. 架构决策（V3.2核心设计）

### 3.1 问卷结构（9题定稿，Q2扩展）

| 题号 | 字段 | 类型 | 必填 | 变更要点 |
|------|------|------|------|----------|
| Q1 | city/district | 选择 | 是 | 城市列表（中文编码已修复） |
| **Q2** | **floor/total_floors + room_type[]** | **数字+多选** | **是** | **Sprint4扩展：同屏采集楼层+使用场景（5选项），维持9题结构** |
| Q3 | painPoint[] | 多选 | 是 | 5选项（sound/thermal/security/view/economy） |
| Q4 | noise_type/noise_dist | 选择 | 是 | 遮挡合并为`gt50_shielded` |
| Q5 | orientation/westShading | 选择/布尔 | 是 | 西晒影响SHGC |
| Q6 | heatingType | 选择 | 是 | 集中/自采/无，K_target修正系数 |
| Q7 | window_type | 选择 | 是 | 5选项，sliding/door_window触发整窗测试 |
| Q8 | family_risk[] | 多选 | 是 | 4风险选项，至少1项 |
| Q9 | budgetTier | 选择 | 是 | A/B/C/D档位，28层+A档触发冲突警示 |

**删除字段**：`priority`、`timeline`（无下游消费）  
**新增字段**：`room_type[]`（Q2, display_only）

### 3.2 PDF第一章双层结构（V3.2重构）
第一章：项目概况与需求分析  
├─ 1.1 项目基本信息（补全版）★  
│   ├─ 城市/城区（Q1）  
│   ├─ 楼层/高度比（Q2）  
│   ├─ 使用场景（Q2新增room_type[]）★  
│   ├─ 窗型（Q7）  
│   ├─ 朝向/西晒（Q5）  
│   ├─ 供暖方式（Q6）★  
│   └─ 家庭风险（Q8）  
│  
└─ 1.2 需求分析（双层结构）★  
├─ 第一层：五维参数表格 ★  
│   ├─ 抗风压（GB/T 7106·风区高度比）  
│   ├─ 隔声（GB/T 8485·噪音场景）  
│   ├─ 传热系数（GB/T 8484·气候区+供暖修正）  
│   ├─ 太阳得热（GB/T 2680·朝向/西晒）★  
│   └─ 安全等级（GB 15763.3·窗型+家庭风险）★  
└─ 第二层：核心矛盾叙述（3句精简）★  
├─ 第1句：场景定性（painPoint主语）  
├─ 第2句：核心矛盾（仅高冲突时输出）  
└─ 第3句：行动导向（固定文案）  

**旧版兼容**：`useNewStructure`标记，旧数据自动降级渲染原`analysisPara+1.3节`

### 3.3 STANDARDS_MAP配置规范

```javascript
// documentMapper.js 顶部集中维护
const STANDARDS_MAP = {
  wind_pressure: { code: 'GB/T 7106-2019', short: 'GB/T 7106' },
  sound_insulation: { code: 'GB/T 8485-2008', short: 'GB/T 8485' },
  thermal: { code: 'GB/T 8484-2020', short: 'GB/T 8484' },
  shgc: { code: 'GB/T 2680-2021', short: 'GB/T 2680' }, // ⚠️ 非GB/T 8478
  safety_glass: { code: 'GB 15763.3-2009', short: 'GB 15763.3' },
  product_spec: { code: 'GB/T 8478-2020', short: 'GB/T 8478' } // 仅第二章页眉
};
依据列格式："标准文号 · 中文说明"（中点分隔，中文说明≤18字）
```

## 4. Sprint 4 归档（PDF第一章重构）

4.1 变更摘要  
目标：解决1.1节信息汇总缺失、1.2节需求翻译过度依赖painPoint、叙述过长问题  
方案：1.1节补全7字段（新增room_type/window_type/orientation/heatingType）；1.2节改为双层结构（五维参数表格+3句核心矛盾叙述）  
关键决策：  
room_type合并进Q2（不新增题号，维持9题结构）  
STANDARDS_MAP集中维护标准文号（后续年份更新只改此处）  
SHGC强制使用GB/T 2680（玻璃光学性能测定），GB/T 8478仅用于第二章页眉  

4.2 影响文件  

| 文件 | 改动类型 | 具体内容 |
|------|----------|----------|
| survey.js | 扩展Q2 | 新增room_type[]多选字段（5选项），roomTypeSelectedMap状态管理，草稿恢复/重置逻辑 |
| survey.wxml | 扩展Q2页面 | 同屏渲染楼层输入+使用场景多选（checkbox-group） |
| documentMapper.js | 新增常量+重构 | STANDARDS_MAP（6项），build1_1/build1_2，五维表格/核心矛盾叙述函数 |
| pdfBuilder-v2.js | 重构渲染 | renderChapter1：1.1节补全字段+1.2节双层结构，新旧兼容逻辑 |
| index.js | 适配透传 | room_type/pain_points字段透传至documentMapper |

4.3 验收结果  
回归测试：原有5场景通过（v3-p2-regression.js）  
新增场景：S-C1~S-C5通过（验证room_type渲染、整窗测试标注、SHGC西晒校正、冲突叙述逻辑）  
PDF样本：v3-hotfix-sample.pdf生成成功，人工审查1.1/1.2节格式符合预期  

## 5. AI协作模式规范（v1.2）

5.1 决策链（单向流）  
Kimi / Trae（起草/实现）  
        ↓  
   Claude（审查/仲裁）  
        ↓  
    李Sir（最终决策）  

5.2 标准协作流程  
功能设计：李Sir提出 → Kimi起草 → Claude审查 → 李Sir决策 → Trae实现  
Sprint执行：Kimi转译规格 → Trae实现 → Kimi验收 → Claude审查（必要时）→ 李Sir场景验收  

## 6. 快速命令参考

```bash
# 部署云函数（生产环境）
wx cloud functions deploy --name generateReport --env cloud1-7grn8mcy176fcc2b

# 运行回归测试（5场景+Sprint4场景）
node miniprogram/cloudfunctions/test/v3-p2-regression.js

# 检查Git状态
git log --oneline --graph -n 10
git status

# 查看当前版本
git describe --tags
```

## 7. 检查清单（新对话恢复后确认）

- [ ] 已理解项目阶段：V3.2 Sprint4完成，9题结构定稿（Q2扩展），PDF第一章双层结构
- [ ] 已掌握Git状态：main分支，tag v3.2.0，Sprint4已完成
- [ ] 已确认技术资产：room_type（display_only）、STANDARDS_MAP、五维表格、核心矛盾叙述
- [ ] 已明确下一步：等待Sprint5启动决策（数据看板/商家端/技术债务清理）

## 8. 活跃阻塞（需用户决策）

□ 选项A：启动Sprint 5（待规划：数据看板/商家端/水密气密纳入）  
□ 选项B：技术债务清理（单元测试补充/文档更新/性能优化）  
□ 选项C：生产环境监控（A/B实验结果分析，Layer3实验设计）  

## 变更日志  
v3.2.0 (2026-03-21)：Sprint4 PDF第一章重构完成。新增room_type字段（Q2, display_only），STANDARDS_MAP集中维护6项标准文号，1.1节信息补全（7字段），1.2节双层结构（五维表格+3句核心矛盾叙述），新旧结构兼容，回归测试通过。  
v3.1.3-rev1 (2026-03-21)：恢复AI协作模式完整章节，补全检查清单，草稿恢复逻辑修复。  
v3.1.3 (2026-03-21)：草稿恢复逻辑修复（restartSurvey/restoreDraft），WXML语法修正（*SelectedMap模式）。  
v3.1.0 (2026-03-20)：V3.1字段对齐-window_type新增（Q7）、heatingType修正系数（Q6）、清理priority/timeline，9题结构定稿。  

## 使用说明
将此文档保存为project-context-v3.2.0.md，每次开启新对话时上传，AI助手将基于此文档恢复上下文。  

## 执行后确认清单  
- [ ] git log --oneline -3 显示 v3.2.0 tag 已打上  
- [ ] git tag -l 列出 v3.2.0  
- [ ] 仓库根目录存在 `project-context-v3.2.0.md`  
- [ ] 文件内容包含 Sprint 4 归档章节和 v3.2.0 版本标记  
- [ ] 下次对话上传最新版 project-context-v3.2.0.md  

执行完成后，Sprint 4 正式关闭，等待 Sprint 5 启动决策。
