# 门窗技术招标文件系统 - 前端升级 Phase 1 P0

## 项目身份
微信小程序，帮助业主生成门窗技术招标文件（PDF），商家扫码在线填写报价响应。

## 当前任务：SPEC-FE-P0-v1.0（前端体验升级）
只改前端，不动后端。answers 数据结构不变，云函数零修改。

## 核心约束（红线）
- 禁止修改 cloudfunctions/ 下的任何文件
- 禁止修改 formData 数据结构和字段名
- 禁止修改验证逻辑（validateCurrentStep）和提交逻辑（submit/callGenerateReport）
- 所有新页面使用公共设计规范（CSS变量+公共组件）

## P0 实施步骤

### S1：Tab导航 + 「我的」页面框架 ✅ 已完成
- app.json tabBar 4Tab + profile页面 + 8个图标

### S2：设计规范落地
创建 styles/variables.wxss：
- --color-primary: #1F4E79
- --color-primary-light: #E3F2FD
- --color-text: #333333
- --color-text-secondary: #666666
- --color-text-hint: #999999
- --color-bg: #F5F5F5
- --color-card: #FFFFFF
- --color-danger: #E53935
- --color-warning: #F9A825
- --color-success: #43A047
- --radius: 8rpx
- --shadow: 0 2rpx 12rpx rgba(0,0,0,0.06)
- --spacing-module: 40rpx
- --spacing-inner: 32rpx

创建 components/ 目录，6个公共组件：btn-primary、btn-secondary、card、empty-state、skeleton、badge

### S3：首页重设计
- Hero区（深蓝底白字）：身份「李Sir · 独立门窗技术顾问」+ 章戳「不销售·不代理」+ 承诺句「让三家商家用同一份标准报价，不懂门窗也能看出谁在偷工减料。」
- 主CTA：「开始定制我的门窗标准」深蓝底居中高96rpx
- 说明区：三步流程（①回答9个问题 ②获得招标文件 ③发给商家报价）+ 3FAQ
- 底部：历史招标文件快捷卡片（有记录时显示）

### S4：问卷分组+进度条+回退
在现有 pages/survey/ 页面上改造（不新建页面），保留全部 formData 字段和业务逻辑。

三组分组配置（对应 currentStep 0~8）：
- 第一组「房屋与诉求」：Q1(step0) Q2(step1) Q3(step2)，情境「先告诉我您的房子情况和最关心的问题」
- 第二组「环境与条件」：Q4(step3) Q5(step4) Q6(step5)，情境「再了解一下您家的环境条件」
- 第三组「窗户与安全」：Q7(step6) Q8(step7) Q9(step8)，情境「最后确认窗户类型、安全需求和预算」

进度指示：
- 顶部三段进度条（已完成=深蓝填充，当前=深蓝进度条，未开始=浅灰）
- 题号显示：「第1组 · 2/3」不显示全局序号
- 完成一组时进度条当前段填充完成，下一组情境文案淡入

底部操作栏：
- 「上一题」（次按钮，左）+「下一题」（主按钮，右）
- step=0 时不显示「上一题」
- 复用现有 prevStep() / nextStep() / nextStepWithCheck()（Q9专用）
- 回退时保留已填内容（现有逻辑已支持）

### S5：逐题交互优化
每题四层结构：①标题(36rpx加粗) ②辅助说明(26rpx灰色) ③输入区 ④操作栏

⚠️ 以下是基于实际代码的准确题目规格，字段名不可修改：

**Q1 城市（step 0）**
- 标题：「您的房子在哪个城市？」
- 辅助说明：「不同城市气候和风压差异大，直接影响窗户参数标准」
- 输入：城市下拉选择（10城）+ 区域文本输入（选填）
- 字段：formData.city, formData.district
- 选择后显示 cityHint 卡片（已有逻辑）

**Q2 楼层+使用场景（step 1）**
- 标题：「您住在几楼？窗户用在哪些房间？」
- 辅助说明：「楼层越高风压越大，不同房间对隔音隔热要求不同」
- 输入：所在楼层数字输入 + 总楼层数字输入 + 使用场景多选（卧室/客厅/阳台/书房/其他）
- 字段：formData.floor, formData.totalFloors, formData.room_type[]
- 保留高度比计算和显示（calculateHeightRatio）

**Q3 当前最困扰的问题（step 2）**
- 标题：「以下哪些问题最困扰您？」
- 辅助说明：「您的关注点会影响参数的优先级和加严方向」
- 输入：多选标签（隔音降噪/保温节能/安全防盗/采光视野/省钱经济）
- 字段：formData.painPoint[]
- 注意：这是 painPoint 驱动隔声加严的核心输入

**Q4 噪声源（step 3）**
- 标题：「您家附近有什么噪声源？」
- 辅助说明：「噪声类型和距离决定隔音等级，直接影响玻璃配置」
- 输入：噪声类型下拉（主干道/高架桥/轨道交通/安静）+ 距离下拉（20m内/20-50m/50m+/50m+有遮挡）
- 字段：formData.noise_type, formData.noise_dist
- 两个子问题都必填

**Q5 朝向与遮阳（step 4）**
- 标题：「主要窗户朝哪个方向？」
- 辅助说明：「西向/西南向窗户日晒强烈，需要考虑隔热和遮阳」
- 输入：朝向下拉（东/南/西/北/东南/西南/东北/西北，共8方位）+ 西晒遮阳开关
- 字段：formData.orientation, formData.westShading
- 当选择西/西南时，遮阳开关更重要

**Q6 冬季取暖方式（step 5）**
- 标题：「您家冬天怎么取暖？」
- 辅助说明：「取暖方式影响窗户保温要求，有供暖的房子K值标准会更严格」
- 输入：下拉选择（集中供暖/自采暖/无供暖）
- 字段：formData.heatingType
- 这是 K值修正因子 heating(-0.2) 的触发条件

**Q7 窗型（step 6）**
- 标题：「您想用哪种窗户？」
- 辅助说明：「不确定也没关系，不同窗型在隔音、通风、密封性上各有优劣」
- 输入：卡片单选（平开窗/推拉窗·门/固定窗/内开内倒/门联窗）
- 字段：formData.window_type

**Q8 家庭与窗型风险（step 7）**
- 标题：「您家有以下情况吗？」
- 辅助说明：「这些信息关系到玻璃安全等级，涉及国标强制要求」
- 输入：多选（有10岁以下儿童 / 有行动不便老人 / 有落地窗或整面玻璃墙 / 有宽推拉阳台门）
- 字段：formData.family_risk[]
- child+large_fixed 触发安全玻璃强制（V-07一票否决）

**Q9 预算（step 8）**
- 标题：「您的预算大概在什么范围？」
- 辅助说明：「预算影响型材档次和玻璃配置的推荐方案」
- 输入：下拉四档（A经济600-900 / B舒适900-1400 / C品质1400-2000 / D定制2000+）
- 字段：formData.budgetTier
- 保留冲突预警逻辑（高层+A档→弹窗提示）
- Q9的「下一题」使用 nextStepWithCheck() 而非普通 nextStep()

### S6：确认页+生成等待页
确认页展示关键信息（从 formData 取值）：
- 城市：formData.city
- 楼层：formData.floor + "/" + formData.totalFloors
- 最关心：formData.painPoint 的第一项标签
- 窗型：formData.window_type 的标签
- 预算：budgetTier 的标签

「确认无误，生成招标文件」→ 调用现有 submit() 逻辑
「返回修改」→ 返回问卷页

等待页：
- 替换现有 wx.showLoading 为全屏自定义等待页
- 圆形进度环 CSS动画 + 「正在根据您的需求生成专属招标文件...预计5~10秒」
- 完成后跳转结果摘要页（而非直接跳 result 页）

### S7：结果摘要页
新建 pages/result-summary/ 页面，在 submit 成功后先跳转到这里。

标题「您的门窗标准已生成」+ 勾选图标

三张参数卡片横排（数据从云函数返回的 res.result 中提取）：
- 隔声指标：Rw ≥ {X} dB
- 保温指标：K值 ≤ {X}
- 安全等级：「强制夹胶」或「常规」

反向映射区「这些标准是怎么来的」（最多3条，只展示加严条目）：
- painPoint含sound + 噪声加严 →「您关注隔音降噪，且{噪声类型}距离较近，建议Rw≥{X}dB」
- 朝向西/西南 + westShading=false →「您家窗户{方向}且无遮阳，建议SHGC≤{X}」
- heatingType为集中供暖/自采暖 →「您家采用{取暖方式}，K值加严到{X}」
- family_risk含child+large_fixed →「您家有儿童且有落地窗，国标强制夹胶安全玻璃」
- 高层/沿海 →「您家在{条件}，气密性加严至{X}级」
- 无命中 →「您的需求场景较为常规，参数均采用基准值。」

两个CTA：
- 「查看我的招标文件」→ 跳转现有 result 页面查看PDF
- 「发给商家报价」→ 分享功能

### S8：措辞替换
全局替换：
- 开始填写问卷 → 开始定制我的门窗标准
- 问卷 → 门窗需求定制
- 生成报告 → 生成招标文件
- 查看报告 → 查看我的招标文件
- 分享 → 发给商家报价
- 我的报告 → 我的招标文件
- 报告（Tab名）→ 招标文件

## formData 字段完整清单（禁止修改）
```
formData: {
  city: '',              // Q1 城市
  district: '',          // Q1 区域（选填）
  floor: null,           // Q2 所在楼层
  totalFloors: null,     // Q2 总楼层
  room_type: [],         // Q2 使用场景（多选）
  painPoint: [],         // Q3 困扰问题（多选）
  noise_type: '',        // Q4 噪声类型
  noise_dist: '',        // Q4 噪声距离
  noise_type_label: '',  // Q4 噪声类型标签
  noise_dist_label: '',  // Q4 噪声距离标签
  orientation: '',       // Q5 朝向
  westShading: false,    // Q5 西晒遮阳
  heatingType: '',       // Q6 取暖方式
  window_type: '',       // Q7 窗型
  family_risk: [],       // Q8 家庭风险（多选）
  budgetTier: '',        // Q9 预算档位
}
```

## 验收标准（13项）
- FE-01：Tab导航4Tab切换正常 ✅ 已完成
- FE-02：首页Hero+承诺句+CTA+说明区+历史快捷
- FE-03：问卷三组情境文案+组间过渡
- FE-04：分段进度条+组内题号联动
- FE-05：逐题四层结构+9题辅助文案（与实际题目一致）
- FE-06：回退修改（上一题可用+保留已填内容）
- FE-07：确认页关键信息+确认/修改按钮
- FE-08：生成等待（自定义全屏等待替代wx.showLoading）
- FE-09：结果摘要（参数卡片+反向映射+两个CTA）
- FE-10：措辞体系全局统一
- FE-11：设计规范（CSS变量+公共组件）
- FE-12：「我的」页面框架+占位+即将上线标记 ✅ 已完成
- FE-13：后端零影响（formData字段不变，云函数不改）
